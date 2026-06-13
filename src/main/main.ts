import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron';
import type { OpenDialogOptions } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import type { AppSettings, CreateTaskInput, SystemQuickAction, Task, TelegramConfigInput } from '../shared/types';
import { registerTaskIpcHandlers } from './ipc/tasks';
import { getDatabase, getStoragePaths, initializeDatabase } from './storage/database';
import { createTask, listAppData } from './storage/repositories';
import {
  configureTelegramBotRuntime,
  disconnectTelegramBot,
  getTelegramBotStatus,
  notifyTelegramDeadline,
  restartTelegramBot,
  stopTelegramBot,
  testTelegramBotConnection,
  updateTelegramBotConfig,
} from './telegram/bot';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

if (started) {
  app.quit();
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let notificationInterval: NodeJS.Timeout | undefined;
let backupInterval: NodeJS.Timeout | undefined;
const notifiedKeys = new Set<string>();
const PROJECT_REPOSITORY_URL = 'https://github.com/soc1almemory/afterlight';

const systemCopy = {
  ru: {
    addTask: 'Добавить задачу',
    appName: 'Afterlight',
    cancel: 'Отмена',
    closeQuestion: 'Закрыть Afterlight?',
    deadline: 'Скоро дедлайн: {title}',
    exit: 'Выйти',
    open: 'Открыть Afterlight',
    openToday: 'Открыть Сегодня',
    openWeek: 'Открыть Неделю',
    overdue: 'Просроченных задач: {count}',
    todayRefresh: 'Список “Сегодня” скоро обновится.',
  },
  en: {
    addTask: 'Add task',
    appName: 'Afterlight',
    cancel: 'Cancel',
    closeQuestion: 'Close Afterlight?',
    deadline: 'Deadline soon: {title}',
    exit: 'Exit',
    open: 'Open Afterlight',
    openToday: 'Open Today',
    openWeek: 'Open Week',
    overdue: 'Overdue tasks: {count}',
    todayRefresh: 'The Today list will refresh soon.',
  },
} as const;

const assetPath = (...segments: string[]) => path.join(__dirname, '../../assets', ...segments);

const getIconPath = () => {
  const pngPath = assetPath('logo-main.png');
  return fs.existsSync(pngPath) ? pngPath : assetPath('afterlight-icon.svg');
};

const getCurrentSettings = (): AppSettings => listAppData().settings;

registerTaskIpcHandlers({
  onSettingsUpdated: () => applySystemSettings(),
});

configureTelegramBotRuntime({
  onDataChanged: () => mainWindow?.webContents.send('system:data-changed'),
  onQuickAction: (action) => sendQuickAction(action),
});

const createWindow = async () => {
  await initializeDatabase();
  const settings = getCurrentSettings();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#fafafa',
    icon: getIconPath(),
    show: !settings.launchMinimized,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true,
    },
  });

  attachWindowEvents();
  applyWindowState(settings);
  openDevToolsInDevelopment();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  if (!settings.launchMinimized) {
    mainWindow.show();
  }

  applySystemSettings();
  void restartTelegramBot();
};

app.whenReady().then(createWindow);

app.on('second-instance', () => {
  showMainWindow();
  openDevToolsInDevelopment();
});

app.on('before-quit', () => {
  isQuitting = true;
  stopTelegramBot();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
    return;
  }

  showMainWindow();
});

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) return;

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return;
  }

  mainWindow.maximize();
});

ipcMain.handle('window:set-fullscreen', (_event, value: boolean) => {
  mainWindow?.setFullScreen(value);
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('system:export-json', () => exportTasksJson());
ipcMain.handle('system:export-csv', () => exportTasksCsv());
ipcMain.handle('system:import-json', () => importTasksJson());
ipcMain.handle('system:open-data-folder', () => shell.openPath(getStoragePaths().storageDir));
ipcMain.handle('system:open-database', () => {
  shell.showItemInFolder(getStoragePaths().databasePath);
});
ipcMain.handle('system:open-project-repository', () => shell.openExternal(PROJECT_REPOSITORY_URL));
ipcMain.handle('system:create-backup', () => createDatabaseBackup());
ipcMain.handle('telegram:status', () => getTelegramBotStatus());
ipcMain.handle('telegram:configure', (_event, input: TelegramConfigInput) => updateTelegramBotConfig(input));
ipcMain.handle('telegram:test', (_event, token?: string) => testTelegramBotConnection(token));
ipcMain.handle('telegram:disconnect', () => disconnectTelegramBot());

const attachWindowEvents = () => {
  if (!mainWindow) return;

  mainWindow.on('close', async (event) => {
    if (isQuitting) {
      return;
    }

    const settings = getCurrentSettings();

    if (settings.closeBehavior === 'tray' || settings.minimizeToTrayOnClose) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }

    if (settings.closeBehavior === 'ask' || settings.confirmExit) {
      event.preventDefault();
      const copy = systemCopy[settings.language];
      const result = await dialog.showMessageBox(mainWindow!, {
        buttons: [copy.cancel, copy.exit],
        cancelId: 0,
        defaultId: 0,
        message: copy.closeQuestion,
        type: 'question',
      });

      if (result.response === 1) {
        isQuitting = true;
        mainWindow?.close();
      }

      return;
    }

    isQuitting = true;
  });
};

const applySystemSettings = () => {
  const settings = getCurrentSettings();
  app.setLoginItemSettings({
    openAtLogin: settings.launchWithWindows,
    openAsHidden: settings.launchMinimized,
  });

  if (settings.trayEnabled || settings.minimizeToTrayOnClose || settings.closeBehavior === 'tray') {
    ensureTray();
  } else {
    tray?.destroy();
    tray = null;
  }

  scheduleNotifications(settings);
  scheduleBackups(settings);
};

const applyWindowState = (settings: AppSettings) => {
  if (!mainWindow) return;

  if (settings.restoreWindowState === 'fullscreen' || settings.openMode === 'fullscreen') {
    mainWindow.setFullScreen(true);
    return;
  }

  if (settings.restoreWindowState === 'maximized') {
    mainWindow.maximize();
  }
};

const ensureTray = () => {
  if (tray) {
    updateTrayMenu();
    return;
  }

  const image = nativeImage.createFromPath(getIconPath());
  tray = new Tray(image.isEmpty() ? getIconPath() : image);
  tray.setToolTip('Afterlight');
  tray.on('double-click', showMainWindow);
  updateTrayMenu();
};

const updateTrayMenu = () => {
  if (!tray) return;

  const copy = systemCopy[getCurrentSettings().language];
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: copy.open, click: () => sendQuickAction('open') },
      { label: copy.addTask, click: () => sendQuickAction('add-task') },
      { label: copy.openToday, click: () => sendQuickAction('today') },
      { label: copy.openWeek, click: () => sendQuickAction('week') },
      { type: 'separator' },
      {
        label: copy.exit,
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
};

const showMainWindow = () => {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
};

const isDevelopment = !app.isPackaged;

const openDevToolsInDevelopment = () => {
  if (!isDevelopment || !mainWindow) {
    return;
  }

  const openDevTools = () => {
    if (!mainWindow || mainWindow.webContents.isDevToolsOpened()) {
      return;
    }

    mainWindow.webContents.openDevTools({ activate: true, mode: 'detach' });
  };

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', openDevTools);
  } else {
    openDevTools();
  }

  setTimeout(openDevTools, 1000);
};

const sendQuickAction = (action: SystemQuickAction) => {
  showMainWindow();
  mainWindow?.webContents.send('system:quick-action', action);
};

const scheduleNotifications = (settings: AppSettings) => {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = undefined;
  }

  if (!settings.notifyDeadlines && !settings.notifyBeforeTodayRefresh && !settings.notifyOverdue) {
    return;
  }

  const tick = () => runNotificationSweep(settings);
  tick();
  notificationInterval = setInterval(tick, 60_000);
};

const runNotificationSweep = (settings: AppSettings) => {
  const copy = systemCopy[settings.language];
  const tasks = listAppData().tasks;
  const now = new Date();
  const supportsNotifications = Notification.isSupported();

  if (settings.notifyDeadlines) {
    const leadMinutes = Math.max(1, settings.deadlineNotifyBeforeMinutes);
    const leadMs = leadMinutes * 60_000;

    tasks.filter(isActiveTaskWithDeadlineTime).forEach((task) => {
      const deadline = getTaskDeadline(task);
      if (!deadline) return;

      const msLeft = deadline.getTime() - now.getTime();
      if (msLeft < 0 || msLeft > leadMs) return;

      const reminderKey = `deadline:${task.id}:${task.dueDate}:${task.dueLabel}:${leadMinutes}`;
      if (supportsNotifications) {
        notifyOnce(`windows:${reminderKey}`, copy.appName, copy.deadline.replace('{title}', task.title));
      }

      const telegramStatus = getTelegramBotStatus();
      const telegramKey = `telegram:${reminderKey}`;
      if (telegramStatus.enabled && telegramStatus.hasToken && telegramStatus.chatId && rememberOnce(telegramKey)) {
        void notifyTelegramDeadline(task, leadMinutes).then((wasSent) => {
          if (!wasSent) {
            notifiedKeys.delete(telegramKey);
          }
        });
      }
    });
  }

  if (settings.notifyOverdue && supportsNotifications) {
    const intervalMinutes = Math.max(5, settings.overdueNotifyEveryMinutes);
    const intervalBucket = Math.floor(now.getTime() / (intervalMinutes * 60_000));
    const overdueTasks = tasks.filter((task) => isOverdueTask(task, now));
    if (overdueTasks.length > 0) {
      notifyOnce(`overdue:${intervalBucket}`, copy.appName, copy.overdue.replace('{count}', String(overdueTasks.length)));
    }
  }

  if (settings.notifyBeforeTodayRefresh && supportsNotifications) {
    const refresh = getNextRefresh(settings.todayRefreshTime);
    const minutesLeft = Math.round((refresh.getTime() - now.getTime()) / 60_000);
    if (minutesLeft >= 0 && minutesLeft <= settings.todayRefreshNotifyBeforeMinutes) {
      notifyOnce(`today-refresh:${toDateKey(refresh)}:${settings.todayRefreshTime}:${settings.todayRefreshNotifyBeforeMinutes}`, copy.appName, copy.todayRefresh);
    }
  }
};

const scheduleBackups = (settings: AppSettings) => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = undefined;
  }

  if (!settings.autoBackupEnabled) {
    return;
  }

  backupInterval = setInterval(() => {
    void createDatabaseBackup();
  }, settings.autoBackupIntervalHours * 60 * 60 * 1000);
};

const notifyOnce = (key: string, title: string, body: string) => {
  if (!rememberOnce(key)) {
    return;
  }

  new Notification({ title, body, icon: getIconPath() }).show();
};

const rememberOnce = (key: string) => {
  if (notifiedKeys.has(key)) {
    return false;
  }

  notifiedKeys.add(key);
  return true;
};

const exportTasksJson = async () => {
  const options = {
    defaultPath: 'afterlight-tasks.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  };
  const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return undefined;
  }

  fs.writeFileSync(result.filePath, JSON.stringify(listAppData().tasks, null, 2), 'utf8');
  return result.filePath;
};

const exportTasksCsv = async () => {
  const options = {
    defaultPath: 'afterlight-tasks.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  };
  const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return undefined;
  }

  fs.writeFileSync(result.filePath, tasksToCsv(listAppData().tasks), 'utf8');
  return result.filePath;
};

const importTasksJson = async () => {
  const options: OpenDialogOptions = {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);

  if (result.canceled || !result.filePaths[0]) {
    return 0;
  }

  const raw = fs.readFileSync(result.filePaths[0], 'utf8');
  const parsed = JSON.parse(raw) as Array<Partial<CreateTaskInput>>;
  let count = 0;

  parsed.forEach((item) => {
    if (!item.title?.trim()) {
      return;
    }

    createTask({
      title: item.title,
      description: item.description,
      dueDate: item.dueDate,
      dueLabel: item.dueLabel,
      priority: item.priority,
      scope: item.scope ?? 'inbox',
      categoryId: item.categoryId,
    });
    count += 1;
  });

  mainWindow?.webContents.send('system:data-changed');
  return count;
};

const createDatabaseBackup = async () => {
  const { backupDir } = getStoragePaths();
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `afterlight-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
  await getDatabase().backup(backupPath);
  return backupPath;
};

const tasksToCsv = (tasks: Task[]) => {
  const rows = [
    ['id', 'title', 'description', 'dueDate', 'dueTime', 'priority', 'status', 'scope', 'categoryId'],
    ...tasks.map((task) => [
      task.id,
      task.title,
      task.description ?? '',
      task.dueDate ?? '',
      task.dueLabel ?? '',
      String(task.priority),
      task.status,
      task.scope,
      task.categoryId ?? '',
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const isActiveTaskWithDeadlineTime = (task: Task) => task.status === 'active' && Boolean(task.dueDate && task.dueLabel);

const isOverdueTask = (task: Task, now: Date) => {
  if (task.status !== 'active' || !task.dueDate) {
    return false;
  }

  if (task.dueDate < getTodayDate()) {
    return true;
  }

  const deadline = getTaskDeadline(task);
  return Boolean(deadline && deadline.getTime() < now.getTime());
};

const getTaskDeadline = (task: Task) => {
  if (!task.dueDate || !task.dueLabel) {
    return undefined;
  }

  const deadline = new Date(`${task.dueDate}T${task.dueLabel}:00`);
  return Number.isNaN(deadline.getTime()) ? undefined : deadline;
};

const getNextRefresh = (refreshTime: string) => {
  const [hours, minutes] = refreshTime.split(':').map((part) => Number.parseInt(part, 10));
  const nextRefresh = new Date();
  nextRefresh.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

  if (nextRefresh.getTime() <= Date.now()) {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  }

  return nextRefresh;
};

const getTodayDate = () => {
  const date = new Date();
  return toDateKey(date);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
