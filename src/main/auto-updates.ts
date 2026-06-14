import { app, autoUpdater, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppUpdateStatus, AppUpdateStatusKind } from '../shared/types';

const UPDATE_REPOSITORY = 'soc1almemory/afterlight';
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_UPDATE_CHECK_DELAY_MS = 15_000;
const PENDING_UPDATE_STATUS_FILE = 'pending-update.json';

let updateStatus: AppUpdateStatus = {
  currentVersion: app.getVersion(),
  status: 'idle',
};
let updateCheckInterval: NodeJS.Timeout | undefined;
let hasConfiguredAutoUpdater = false;
let isCheckingForUpdates = false;

export const getUpdateStatus = () => updateStatus;

export const configureAutoUpdates = (getMainWindow: () => BrowserWindow | null) => {
  if (hasConfiguredAutoUpdater) {
    return;
  }

  hasConfiguredAutoUpdater = true;

  if (!app.isPackaged || process.platform !== 'win32') {
    updateStatus = {
      currentVersion: app.getVersion(),
      status: 'unsupported',
    };
    return;
  }

  loadPendingUpdateStatus();

  const updateFeedUrl = `https://update.electronjs.org/${UPDATE_REPOSITORY}/${process.platform}-${process.arch}/${app.getVersion()}`;
  autoUpdater.setFeedURL({ url: updateFeedUrl });

  const publishStatus = (status: Omit<AppUpdateStatus, 'currentVersion'>) => {
    updateStatus = {
      currentVersion: app.getVersion(),
      ...status,
    };
    getMainWindow()?.webContents.send('updates:status', updateStatus);
  };

  autoUpdater.on('checking-for-update', () => {
    isCheckingForUpdates = true;
    publishStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', () => {
    publishStatus({ status: 'available' });
  });

  autoUpdater.on('update-not-available', () => {
    isCheckingForUpdates = false;
    clearPendingUpdateStatus();
    publishStatus({ status: 'not-available' });
  });

  autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName, _releaseDate, updateUrl) => {
    isCheckingForUpdates = false;
    const downloadedStatus = {
      releaseName,
      status: 'downloaded',
      updateUrl,
    } as const;
    savePendingUpdateStatus(downloadedStatus);
    publishStatus(downloadedStatus);
  });

  autoUpdater.on('error', (error) => {
    isCheckingForUpdates = false;
    publishStatus({
      error: error.message,
      status: 'error',
    });
  });

  const scheduleCheck = () => {
    void checkForUpdates();
  };

  setTimeout(scheduleCheck, INITIAL_UPDATE_CHECK_DELAY_MS);
  updateCheckInterval = setInterval(scheduleCheck, UPDATE_CHECK_INTERVAL_MS);
};

const getPendingUpdateStatusPath = () => path.join(app.getPath('userData'), PENDING_UPDATE_STATUS_FILE);

const loadPendingUpdateStatus = () => {
  try {
    const raw = fs.readFileSync(getPendingUpdateStatusPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppUpdateStatus>;

    if (parsed.status !== 'downloaded' || parsed.currentVersion !== app.getVersion()) {
      clearPendingUpdateStatus();
      return;
    }

    updateStatus = {
      currentVersion: app.getVersion(),
      releaseName: parsed.releaseName,
      status: 'downloaded',
      updateUrl: parsed.updateUrl,
    };
  } catch {
    // No persisted downloaded update yet.
  }
};

const savePendingUpdateStatus = (status: Omit<AppUpdateStatus, 'currentVersion'>) => {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(
      getPendingUpdateStatusPath(),
      JSON.stringify(
        {
          currentVersion: app.getVersion(),
          ...status,
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch {
    // A failed reminder write should not break the updater flow.
  }
};

const clearPendingUpdateStatus = () => {
  try {
    fs.rmSync(getPendingUpdateStatusPath(), { force: true });
  } catch {
    // Nothing to clear.
  }
};

export const stopAutoUpdateChecks = () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = undefined;
  }
};

export const checkForUpdates = async () => {
  if (!app.isPackaged || process.platform !== 'win32') {
    updateStatus = {
      currentVersion: app.getVersion(),
      status: 'unsupported',
    };
    return updateStatus;
  }

  if (updateStatus.status === 'downloaded') {
    return updateStatus;
  }

  if (isCheckingForUpdates) {
    return updateStatus;
  }

  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    updateStatus = {
      currentVersion: app.getVersion(),
      error: error instanceof Error ? error.message : 'Unable to check for updates.',
      status: 'error',
    };
  }

  return updateStatus;
};

export const installDownloadedUpdate = () => {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.quitAndInstall();
};

export const simulateUpdateStatus = (status: Extract<AppUpdateStatusKind, 'available' | 'downloaded'>) => {
  if (app.isPackaged) {
    return updateStatus;
  }

  updateStatus = {
    currentVersion: app.getVersion(),
    releaseName: status === 'downloaded' ? 'Afterlight v0.2.2-dev' : undefined,
    status,
  };

  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('updates:status', updateStatus);
  });

  return updateStatus;
};
