import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import appVersion from '../../shared/app-version.json';
import type { TelegramBotMode, TelegramBotStatus, UpdateSettingsInput } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SettingsDialogProps {
  initialPage?: SettingsPage;
  isOpen: boolean;
  onClose: () => void;
  onPageChange?: (page: SettingsPage) => void;
}

export type SettingsPage = 'account' | 'main' | 'language' | 'theme' | 'sidebar' | 'notifications' | 'telegram' | 'backups';

const settingsItems: Array<{ id: SettingsPage; icon: string }> = [
  { id: 'account', icon: 'settings-account-icon.svg' },
  { id: 'main', icon: 'settings-main-icon.svg' },
  { id: 'language', icon: 'settings-language-icon.svg' },
  { id: 'theme', icon: 'settigns-theme-icon.svg' },
  { id: 'sidebar', icon: 'settigns-sidebar-icon.svg' },
  { id: 'notifications', icon: 'settings-notifications-icon.svg' },
  { id: 'telegram', icon: 'settigns-telegram-icon.svg' },
  { id: 'backups', icon: 'settigns-copies-icon.svg' },
];

const settingsCopy = {
  ru: {
    title: 'Настройки',
    reset: 'Сбросить',
    resetConfirm: 'Сбросить раздел “{title}” до значений по умолчанию?',
    close: 'Закрыть настройки',
    nav: {
      account: 'Аккаунт',
      main: 'Основное',
      language: 'Язык',
      theme: 'Тема',
      sidebar: 'Боковая панель',
      notifications: 'Уведомления',
      telegram: 'Интеграция Telegram',
      backups: 'Резервные копии',
    },
    account: {
      profile: 'Профиль',
      upload: 'Загрузить фото',
      deleteAvatar: 'Удалить аватар',
      name: 'Введите имя',
      workspace: 'Название пространства',
      security: 'Безопасность',
      email: 'Email',
      save: 'Сохранить изменения',
      deleteTitle: 'Удаление профиля',
      deleteDescription: 'Сбросить профиль и все данные текущего рабочего пространства.',
      deleteAction: 'Удалить профиль',
      confirmTitle: 'Подтвердите удаление профиля',
      confirmDescription: 'Профиль, задачи, категории и заметки текущего рабочего пространства будут сброшены.',
      saved: 'Изменения сохранены',
      cancel: 'Отмена',
      confirm: 'Подтвердить',
    },
    main: {
      launch: 'Запуск и восстановление',
      startSection: 'Стартовый раздел',
      inbox: 'Входящие',
      today: 'Сегодня',
      week: 'Неделя',
      last: 'Последний открытый',
      restoreTabs: 'Восстанавливать открытые вкладки после запуска',
      windowState: 'Открывать последнее состояние окна',
      normal: 'Обычный',
      maximized: 'Развернутый',
      fullscreen: 'Полноэкранный',
      launchWithWindows: 'Запускать Afterlight вместе с Windows',
      launchMinimized: 'Запускать свернутым',
      closeBehavior: 'Поведение при закрытии',
      closeButton: 'Кнопка закрытия',
      ask: 'Спрашивать перед выходом',
      exit: 'Закрывать приложение полностью',
      tray: 'Сворачивать в трей',
      confirmExit: 'Дополнительно спрашивать перед выходом',
      trayEnabled: 'Показывать иконку Afterlight в системном трее',
      todayPage: 'Страница «Сегодня»',
      refreshTime: 'Время ежедневного обновления списка',
      overdueFirst: 'Показывать просроченные задачи сверху',
      includeTodayDue: 'Автоматически добавлять задачи с сегодняшней датой в «Сегодня»',
      tasks: 'Задачи',
      taskSort: 'Сортировка задач',
      byDate: 'По дате',
      byPriority: 'По приоритету',
      manual: 'Вручную',
      byCreated: 'По созданию',
      completedLast: 'Перемещать выполненные задачи вниз',
      confirmTaskDelete: 'Подтверждать удаление задач',
      weekPage: 'Неделя',
      weekOrder: 'Порядок дней',
      mondayFirst: 'Понедельник всегда сверху',
      todayFirst: 'Сегодняшний день сверху',
      showNoDate: 'Показывать «Входящие» без даты в «Неделе»',
      highlightToday: 'Подсвечивать текущий день',
      categories: 'Категории',
      categorySort: 'Сортировка категорий',
      alphabetically: 'По алфавиту',
      categoryCounts: 'Показывать счётчики задач у категорий',
      countCompleted: 'Считать выполненные задачи в счётчиках',
      confirmCategoryDelete: 'Подтверждать удаление категории',
      notes: 'Заметки',
      notesLimit: 'Лимит строк заметок',
      interface: 'Интерфейс',
      sidebarCounts: 'Показывать счётчики в боковой панели',
      mediumCounter: 'Жёлтый счётчик от',
      highCounter: 'Тёмно-жёлтый от',
      criticalCounter: 'Красный от',
      tabBar: 'Включить панель вкладок',
      lastModified: 'Показывать время последнего изменения',
      autosave: 'Автосохранение',
      notesAutosave: 'Интервал автосохранения заметок, сек.',
    },
    language: {
      title: 'Язык интерфейса',
      label: 'Язык',
      hint: 'Выбранный язык применяется к основным экранам, настройкам и системным всплывающим окнам.',
    },
    theme: {
      title: 'Оформление',
      label: 'Тема',
      light: 'Светлая',
      dark: 'Тёмная',
    },
    sidebar: {
      title: 'Боковая панель',
      autoCollapse: 'Автоматически сворачивать боковую панель, когда курсор в рабочей области',
      sidebarCounts: 'Показывать счётчики в боковой панели',
      categoryCounts: 'Показывать счётчики задач у категорий',
    },
    notifications: {
      title: 'Уведомления',
      deadlines: 'Уведомлять о задачах с дедлайном',
      deadlineLead: 'За сколько минут до дедлайна уведомлять Windows и Telegram',
      todayRefresh: 'Уведомлять перед обновлением страницы «Сегодня»',
      todayRefreshLead: 'За сколько минут до обновления «Сегодня» уведомлять Windows',
      overdue: 'Уведомлять о просроченных задачах',
      overdueInterval: 'Интервал повторных уведомлений о просроченных задачах, мин.',
    },
    backups: {
      files: 'Файловая интеграция',
      exportJson: 'Экспорт задач в JSON',
      exportCsv: 'Экспорт задач в CSV',
      importJson: 'Импорт задач из JSON',
      openData: 'Открыть папку данных',
      openDatabase: 'Открыть базу данных',
      createBackup: 'Создать резервную копию',
      auto: 'Автоматические резервные копии',
      autoBackup: 'Автоматически создавать резервные копии SQLite',
      interval: 'Интервал, часов',
      jsonExported: 'JSON экспортирован',
      csvExported: 'CSV экспортирован',
      jsonImported: 'JSON импортирован',
      dataOpened: 'Папка данных открыта',
      databaseOpened: 'База данных открыта',
      backupCreated: 'Резервная копия создана',
      failed: 'Не удалось выполнить действие.',
    },
    telegram: {
      title: 'Интеграция Telegram',
      description: 'Локальный бот работает только пока Afterlight запущен. Получите токен из BotFather. Затем отправьте боту команду с кодом ниже для привязки.',
      serverDescription: 'Серверный бот работает независимо от окна Afterlight. Бот: @afterlight_task_bot.',
      mode: 'Режим бота',
      customMode: 'Свой токен',
      afterlightMode: 'Afterlight Bot',
      token: 'Токен бота',
      tokenPlaceholder: 'Вставьте новый токен из BotFather',
      enabled: 'Включить локального Telegram-бота',
      serverEnabled: 'Включить серверного Afterlight Bot',
      save: 'Сохранить и запустить',
      saveServer: 'Сохранить и запустить',
      check: 'Проверить подключение',
      disconnect: 'Отключить',
      resetSessions: 'Сбросить сессии',
      sessionsReset: 'Сессии Telegram сброшены',
      status: 'Статус',
      errors: {
        botConflict: 'Бот уже запущен в другом экземпляре Afterlight или другим процессом. Закройте лишний процесс и попробуйте снова.',
        cleanupFailed: 'Не удалось очистить старые сообщения Telegram.',
        connectionFailed: 'Не удалось подключиться к Telegram. Повторная попытка будет выполнена автоматически.',
        forbidden: 'Telegram запретил доступ к чату. Откройте чат с ботом и запустите его снова.',
        rateLimited: 'Telegram временно ограничил запросы. Подождите немного и попробуйте снова.',
        serverNotRunning: 'Afterlight Bot server не запущен.',
        tokenMissing: 'Токен Telegram-бота не настроен.',
        unauthorized: 'Telegram не принял токен бота. Проверьте токен в настройках.',
      },
      serverMode: 'серверный режим',
      running: 'бот запущен',
      stopped: 'бот остановлен',
      tokenSaved: 'токен сохранён',
      tokenMissing: 'токен не сохранён',
      chat: 'chat_id',
      chats: 'чаты',
      bot: 'бот',
      linkCode: 'код привязки',
      linkCommand: (code: string) => `отправьте боту: /start`,
      noConnection: 'Подключение отсутствует',
      saved: 'Настройки Telegram сохранены',
      tested: '✅ Подключено',
      disconnected: 'Telegram отключён',
      failed: 'Не удалось выполнить действие.',
    },
  },
  en: {
    title: 'Settings',
    reset: 'Reset',
    resetConfirm: 'Reset “{title}” to defaults?',
    close: 'Close settings',
    nav: {
      account: 'Account',
      main: 'General',
      language: 'Language',
      theme: 'Theme',
      sidebar: 'Sidebar',
      notifications: 'Notifications',
      telegram: 'Telegram integration',
      backups: 'Backups',
    },
    account: {
      profile: 'Profile',
      upload: 'Upload photo',
      deleteAvatar: 'Remove avatar',
      name: 'Display name',
      workspace: 'Workspace name',
      security: 'Security',
      email: 'Email',
      save: 'Save changes',
      deleteTitle: 'Profile deletion',
      deleteDescription: 'Reset the profile and all data in the current workspace.',
      deleteAction: 'Delete profile',
      confirmTitle: 'Confirm profile deletion',
      confirmDescription: 'The profile, tasks, categories, and notes in the current workspace will be reset.',
      saved: 'Changes saved',
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
    main: {
      launch: 'Launch and restore',
      startSection: 'Start section',
      inbox: 'Inbox',
      today: 'Today',
      week: 'Week',
      last: 'Last opened',
      restoreTabs: 'Restore open tabs after launch',
      windowState: 'Open last window state',
      normal: 'Normal',
      maximized: 'Maximized',
      fullscreen: 'Fullscreen',
      launchWithWindows: 'Launch Afterlight with Windows',
      launchMinimized: 'Launch minimized',
      closeBehavior: 'Close behavior',
      closeButton: 'Close button',
      ask: 'Ask before exit',
      exit: 'Exit the app completely',
      tray: 'Minimize to tray',
      confirmExit: 'Also ask before exit',
      trayEnabled: 'Show Afterlight icon in the system tray',
      todayPage: 'Today page',
      refreshTime: 'Daily list refresh time',
      overdueFirst: 'Show overdue tasks first',
      includeTodayDue: 'Automatically add tasks with today’s date to Today',
      tasks: 'Tasks',
      taskSort: 'Task sorting',
      byDate: 'By date',
      byPriority: 'By priority',
      manual: 'Manual',
      byCreated: 'By creation',
      completedLast: 'Move completed tasks to the bottom',
      confirmTaskDelete: 'Confirm task deletion',
      weekPage: 'Week',
      weekOrder: 'Day order',
      mondayFirst: 'Monday always first',
      todayFirst: 'Today always first',
      showNoDate: 'Show no-date Inbox in Week',
      highlightToday: 'Highlight current day',
      categories: 'Categories',
      categorySort: 'Category sorting',
      alphabetically: 'Alphabetically',
      categoryCounts: 'Show task counters for categories',
      countCompleted: 'Count completed tasks in counters',
      confirmCategoryDelete: 'Confirm category deletion',
      notes: 'Notes',
      notesLimit: 'Note line limit',
      interface: 'Interface',
      sidebarCounts: 'Show counters in the sidebar',
      mediumCounter: 'Yellow counter from',
      highCounter: 'Dark yellow from',
      criticalCounter: 'Red counter from',
      tabBar: 'Enable tab bar',
      lastModified: 'Show last modified time',
      autosave: 'Autosave',
      notesAutosave: 'Note autosave interval, sec.',
    },
    language: {
      title: 'Interface language',
      label: 'Language',
      hint: 'The selected language is applied to core screens, settings, and system popups.',
    },
    theme: {
      title: 'Appearance',
      label: 'Theme',
      light: 'Light',
      dark: 'Dark',
    },
    sidebar: {
      title: 'Sidebar',
      autoCollapse: 'Automatically collapse the sidebar when the cursor is in the workspace',
      sidebarCounts: 'Show counters in the sidebar',
      categoryCounts: 'Show task counters for categories',
    },
    notifications: {
      title: 'Notifications',
      deadlines: 'Notify about tasks with deadlines',
      deadlineLead: 'Minutes before deadline for Windows and Telegram notifications',
      todayRefresh: 'Notify before the Today page refreshes',
      todayRefreshLead: 'Minutes before Today refresh for Windows notifications',
      overdue: 'Notify about overdue tasks',
      overdueInterval: 'Repeat overdue notifications every, min.',
    },
    backups: {
      files: 'File integration',
      exportJson: 'Export tasks to JSON',
      exportCsv: 'Export tasks to CSV',
      importJson: 'Import tasks from JSON',
      openData: 'Open data folder',
      openDatabase: 'Open database',
      createBackup: 'Create backup',
      auto: 'Automatic backups',
      autoBackup: 'Automatically create SQLite backups',
      interval: 'Interval, hours',
      jsonExported: 'JSON exported',
      csvExported: 'CSV exported',
      jsonImported: 'JSON imported',
      dataOpened: 'Data folder opened',
      databaseOpened: 'Database opened',
      backupCreated: 'Backup created',
      failed: 'Could not complete the action.',
    },
    telegram: {
      title: 'Telegram integration',
      description: 'The local bot only works while Afterlight is running. Get a token from BotFather. Then send the bot the command with the code below to link it.',
      serverDescription: 'The server bot works independently from the Afterlight window. Bot: @afterlight_task_bot.',
      mode: 'Bot mode',
      customMode: 'Own token',
      afterlightMode: 'Afterlight Bot',
      token: 'Bot token',
      tokenPlaceholder: 'Paste a new token from BotFather',
      enabled: 'Enable local Telegram bot',
      serverEnabled: 'Enable server Afterlight Bot',
      save: 'Save and start',
      saveServer: 'Save and start',
      check: 'Check connection',
      disconnect: 'Disconnect',
      resetSessions: 'Reset sessions',
      sessionsReset: 'Telegram sessions reset',
      status: 'Status',
      errors: {
        botConflict: 'The bot is already running in another Afterlight instance or process. Close the duplicate process and try again.',
        cleanupFailed: 'Could not clean up old Telegram messages.',
        connectionFailed: 'Could not connect to Telegram. The app will retry automatically.',
        forbidden: 'Telegram denied access to the chat. Open the bot chat and start it again.',
        rateLimited: 'Telegram temporarily limited requests. Wait a bit and try again.',
        serverNotRunning: 'Afterlight Bot server is not running.',
        tokenMissing: 'Telegram bot token is not configured.',
        unauthorized: 'Telegram rejected the bot token. Check the token in settings.',
      },
      serverMode: 'server mode',
      running: 'bot is running',
      stopped: 'bot is stopped',
      tokenSaved: 'token saved',
      tokenMissing: 'token not saved',
      chat: 'chat_id',
      chats: 'chats',
      bot: 'bot',
      linkCode: 'pairing code',
      linkCommand: (code: string) => `send to the bot: /start`,
      noConnection: 'No connection',
      saved: 'Telegram settings saved',
      tested: '✅ Connected',
      disconnected: 'Telegram disconnected',
      failed: 'Could not complete the action.',
    },
  },
} as const;

const useSettingsCopy = () => {
  const language = useTaskStore((state) => state.settings.language);
  return settingsCopy[language];
};

type TelegramSettingsCopy = ReturnType<typeof useSettingsCopy>['telegram'];

const localizeTelegramStatusMessage = (message: string | undefined, copy: TelegramSettingsCopy) => {
  if (!message) {
    return undefined;
  }

  const normalizedMessage = message.toLocaleLowerCase();

  if (message === 'Afterlight Bot server is not running.') {
    return copy.errors.serverNotRunning;
  }

  if (message === 'Telegram token is not configured.') {
    return copy.errors.tokenMissing;
  }

  if (message === 'Telegram connection failed. Retrying...' || message === 'fetch failed') {
    return copy.errors.connectionFailed;
  }

  if (message.includes('Conflict: terminated by other getUpdates request') || message.includes('already running in another Afterlight')) {
    return copy.errors.botConflict;
  }

  if (normalizedMessage.includes('too many requests') || normalizedMessage.includes('retry after') || normalizedMessage.includes('rate limit')) {
    return copy.errors.rateLimited;
  }

  if (normalizedMessage.includes('unauthorized') || normalizedMessage.includes('401')) {
    return copy.errors.unauthorized;
  }

  if (normalizedMessage.includes('forbidden') || normalizedMessage.includes('403')) {
    return copy.errors.forbidden;
  }

  if (message.startsWith('Telegram cleanup failed') || message.startsWith('Telegram cleanup fallback failed')) {
    return copy.errors.cleanupFailed;
  }

  return message;
};

export const SettingsDialog = ({ initialPage = 'account', isOpen, onClose, onPageChange }: SettingsDialogProps) => {
  const [activePage, setActivePage] = useState<SettingsPage>(initialPage);
  const copy = useSettingsCopy();
  const openProjectRepository = () => {
    void window.afterlightApi?.openProjectRepository();
  };
  const changePage = (page: SettingsPage) => {
    setActivePage(page);
    onPageChange?.(page);
  };

  useEffect(() => {
    if (isOpen) {
      setActivePage(initialPage);
    }
  }, [initialPage, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={onClose}>
      <section className="settings-dialog" aria-label={copy.title} onMouseDown={(event) => event.stopPropagation()}>
        <aside className="settings-nav">
          <h2>{copy.title}</h2>
          <nav aria-label={copy.title}>
            {settingsItems.map((item) => (
              <button
                className={activePage === item.id ? 'settings-nav-item active' : 'settings-nav-item'}
                key={item.id}
                type="button"
                onClick={() => changePage(item.id)}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{copy.nav[item.id]}</span>
              </button>
            ))}
          </nav>
          <button className="settings-version-label" type="button" onClick={openProjectRepository}>
            Afterlight v{appVersion.version} © soc1almemory 2026
          </button>
        </aside>

        <button className="settings-close-button" type="button" aria-label={copy.close} onClick={onClose}>
          <img src={assetUrl('popup-close-icon.svg')} alt="" />
        </button>

        <main className="settings-content">
          {activePage === 'account' ? <AccountSettings onAfterReset={onClose} /> : null}
          {activePage === 'main' ? <MainSettings /> : null}
          {activePage === 'language' ? <LanguageSettings /> : null}
          {activePage === 'theme' ? <ThemeSettings /> : null}
          {activePage === 'sidebar' ? <SidebarSettings /> : null}
          {activePage === 'notifications' ? <NotificationsSettings /> : null}
          {activePage === 'telegram' ? <TelegramSettings /> : null}
          {activePage === 'backups' ? <BackupsSettings /> : null}
        </main>
      </section>
    </div>
  );
};

const MainSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);
  const categorySortValue = settings.categorySortMode === 'alphabetical' ? 'alphabetical' : 'created';
  const reset = (input: UpdateSettingsInput) => void updateSettings(input);

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title={copy.main.launch} onReset={() => reset(defaults.launch)}>
        <SettingsSelect
          label={copy.main.startSection}
          value={settings.startSection}
          options={[
            ['inbox', copy.main.inbox],
            ['today', copy.main.today],
            ['week', copy.main.week],
            ['last', copy.main.last],
          ]}
          onChange={(startSection) => void updateSettings({ startSection })}
        />
        <SettingsToggle checked={settings.restoreTabs} label={copy.main.restoreTabs} onChange={(restoreTabs) => void updateSettings({ restoreTabs })} />
        <SettingsSelect
          label={copy.main.windowState}
          value={settings.restoreWindowState}
          options={[
            ['normal', copy.main.normal],
            ['maximized', copy.main.maximized],
            ['fullscreen', copy.main.fullscreen],
          ]}
          onChange={(restoreWindowState) =>
            void updateSettings({
              restoreWindowState,
              openMode: restoreWindowState === 'fullscreen' ? 'fullscreen' : 'normal',
            })
          }
        />
        <SettingsToggle checked={settings.launchWithWindows} label={copy.main.launchWithWindows} onChange={(launchWithWindows) => void updateSettings({ launchWithWindows })} />
        <SettingsToggle checked={settings.launchMinimized} label={copy.main.launchMinimized} onChange={(launchMinimized) => void updateSettings({ launchMinimized })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.closeBehavior} onReset={() => reset(defaults.close)}>
        <SettingsSelect
          label={copy.main.closeButton}
          value={settings.closeBehavior}
          options={[
            ['ask', copy.main.ask],
            ['exit', copy.main.exit],
            ['tray', copy.main.tray],
          ]}
          onChange={(closeBehavior) => void updateSettings({ closeBehavior, minimizeToTrayOnClose: closeBehavior === 'tray' })}
        />
        <SettingsToggle checked={settings.confirmExit} label={copy.main.confirmExit} onChange={(confirmExit) => void updateSettings({ confirmExit })} />
        <SettingsToggle checked={settings.trayEnabled} label={copy.main.trayEnabled} onChange={(trayEnabled) => void updateSettings({ trayEnabled })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.todayPage} onReset={() => reset(defaults.today)}>
        <SettingsTime label={copy.main.refreshTime} value={settings.todayRefreshTime} onChange={(todayRefreshTime) => void updateSettings({ todayRefreshTime })} />
        <SettingsToggle checked={settings.showTodayOverdueFirst} label={copy.main.overdueFirst} onChange={(showTodayOverdueFirst) => void updateSettings({ showTodayOverdueFirst })} />
        <SettingsToggle checked={settings.includeTodayDueTasks} label={copy.main.includeTodayDue} onChange={(includeTodayDueTasks) => void updateSettings({ includeTodayDueTasks })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.tasks} onReset={() => reset(defaults.tasks)}>
        <SettingsSelect
          label={copy.main.taskSort}
          value={settings.taskSortMode}
          options={[
            ['date', copy.main.byDate],
            ['priority', copy.main.byPriority],
            ['manual', copy.main.manual],
            ['created', copy.main.byCreated],
          ]}
          onChange={(taskSortMode) => void updateSettings({ taskSortMode })}
        />
        <SettingsToggle checked={settings.sortCompletedTasksLast} label={copy.main.completedLast} onChange={(sortCompletedTasksLast) => void updateSettings({ sortCompletedTasksLast })} />
        <SettingsToggle checked={settings.confirmTaskDelete} label={copy.main.confirmTaskDelete} onChange={(confirmTaskDelete) => void updateSettings({ confirmTaskDelete })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.weekPage} onReset={() => reset(defaults.week)}>
        <SettingsSelect
          label={copy.main.weekOrder}
          value={settings.weekOrderMode}
          options={[
            ['monday', copy.main.mondayFirst],
            ['today', copy.main.todayFirst],
          ]}
          onChange={(weekOrderMode) => void updateSettings({ weekOrderMode })}
        />
        <SettingsToggle checked={settings.showWeekNoDate} label={copy.main.showNoDate} onChange={(showWeekNoDate) => void updateSettings({ showWeekNoDate })} />
        <SettingsToggle checked={settings.highlightTodayInWeek} label={copy.main.highlightToday} onChange={(highlightTodayInWeek) => void updateSettings({ highlightTodayInWeek })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.categories} onReset={() => reset(defaults.categories)}>
        <SettingsSelect
          label={copy.main.categorySort}
          value={categorySortValue}
          options={[
            ['created', copy.main.byCreated],
            ['alphabetical', copy.main.alphabetically],
          ]}
          onChange={(categorySortMode) => void updateSettings({ categorySortMode })}
        />
        <SettingsToggle checked={settings.showCategoryCounts} label={copy.main.categoryCounts} onChange={(showCategoryCounts) => void updateSettings({ showCategoryCounts })} />
        <SettingsToggle checked={settings.countCompletedTasks} label={copy.main.countCompleted} onChange={(countCompletedTasks) => void updateSettings({ countCompletedTasks })} />
        <SettingsToggle checked={settings.confirmCategoryDelete} label={copy.main.confirmCategoryDelete} onChange={(confirmCategoryDelete) => void updateSettings({ confirmCategoryDelete })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.notes} onReset={() => reset(defaults.notes)}>
        <SettingsNumber label={copy.main.notesLimit} min={5} max={200} value={settings.notesLineLimit} onChange={(notesLineLimit) => void updateSettings({ notesLineLimit })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.interface} onReset={() => reset(defaults.interface)}>
        <SettingsToggle checked={settings.showSidebarCounts} label={copy.main.sidebarCounts} onChange={(showSidebarCounts) => void updateSettings({ showSidebarCounts })} />
        <div className="settings-threshold-grid">
          <SettingsNumber label={copy.main.mediumCounter} min={1} max={999} value={settings.counterMediumAt} onChange={(counterMediumAt) => void updateSettings({ counterMediumAt })} />
          <SettingsNumber label={copy.main.highCounter} min={1} max={999} value={settings.counterHighAt} onChange={(counterHighAt) => void updateSettings({ counterHighAt })} />
          <SettingsNumber label={copy.main.criticalCounter} min={1} max={999} value={settings.counterCriticalAt} onChange={(counterCriticalAt) => void updateSettings({ counterCriticalAt })} />
        </div>
        <SettingsToggle checked={settings.showTabBar} label={copy.main.tabBar} onChange={(showTabBar) => void updateSettings({ showTabBar })} />
        <SettingsToggle checked={settings.showLastModified} label={copy.main.lastModified} onChange={(showLastModified) => void updateSettings({ showLastModified })} />
      </SettingsGroup>

      <SettingsGroup title={copy.main.autosave} onReset={() => reset(defaults.autosave)}>
        <SettingsNumber label={copy.main.notesAutosave} min={1} max={30} value={settings.autosaveNotesIntervalSeconds} onChange={(autosaveNotesIntervalSeconds) => void updateSettings({ autosaveNotesIntervalSeconds })} />
      </SettingsGroup>
    </div>
  );
};

const LanguageSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title={copy.language.title}>
        <SettingsSelect
          label={copy.language.label}
          value={settings.language}
          options={[
            ['ru', 'Русский'],
            ['en', 'English'],
          ]}
          onChange={(language) => void updateSettings({ language })}
        />
        <p className="settings-hint">{copy.language.hint}</p>
      </SettingsGroup>
    </div>
  );
};

const ThemeSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title={copy.theme.title} onReset={() => void updateSettings(defaults.theme)}>
        <SettingsSelect
          label={copy.theme.label}
          value={settings.theme}
          options={[
            ['light', copy.theme.light],
            ['dark', copy.theme.dark],
          ]}
          onChange={(theme) => void updateSettings({ theme })}
        />
      </SettingsGroup>
    </div>
  );
};

const SidebarSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title={copy.sidebar.title} onReset={() => void updateSettings(defaults.sidebar)}>
        <SettingsToggle checked={settings.autoCollapseSidebar} label={copy.sidebar.autoCollapse} onChange={(autoCollapseSidebar) => void updateSettings({ autoCollapseSidebar })} />
        <SettingsToggle checked={settings.showSidebarCounts} label={copy.sidebar.sidebarCounts} onChange={(showSidebarCounts) => void updateSettings({ showSidebarCounts })} />
        <SettingsToggle checked={settings.showCategoryCounts} label={copy.sidebar.categoryCounts} onChange={(showCategoryCounts) => void updateSettings({ showCategoryCounts })} />
      </SettingsGroup>
    </div>
  );
};

const NotificationsSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title={copy.notifications.title} onReset={() => void updateSettings(defaults.notifications)}>
        <SettingsToggle checked={settings.notifyDeadlines} label={copy.notifications.deadlines} onChange={(notifyDeadlines) => void updateSettings({ notifyDeadlines })} />
        <SettingsNumber
          label={copy.notifications.deadlineLead}
          min={1}
          max={10080}
          value={settings.deadlineNotifyBeforeMinutes}
          onChange={(deadlineNotifyBeforeMinutes) => void updateSettings({ deadlineNotifyBeforeMinutes })}
        />
        <SettingsToggle checked={settings.notifyBeforeTodayRefresh} label={copy.notifications.todayRefresh} onChange={(notifyBeforeTodayRefresh) => void updateSettings({ notifyBeforeTodayRefresh })} />
        <SettingsNumber
          label={copy.notifications.todayRefreshLead}
          min={1}
          max={1440}
          value={settings.todayRefreshNotifyBeforeMinutes}
          onChange={(todayRefreshNotifyBeforeMinutes) => void updateSettings({ todayRefreshNotifyBeforeMinutes })}
        />
        <SettingsToggle checked={settings.notifyOverdue} label={copy.notifications.overdue} onChange={(notifyOverdue) => void updateSettings({ notifyOverdue })} />
        <SettingsNumber
          label={copy.notifications.overdueInterval}
          min={5}
          max={10080}
          value={settings.overdueNotifyEveryMinutes}
          onChange={(overdueNotifyEveryMinutes) => void updateSettings({ overdueNotifyEveryMinutes })}
        />
      </SettingsGroup>
    </div>
  );
};

const TelegramSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const [botMode, setBotMode] = useState<TelegramBotMode>('custom');
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<TelegramBotStatus | undefined>();
  const [token, setToken] = useState('');
  const [isStatusRefreshing, setStatusRefreshing] = useState(false);

  const isAfterlightBotMode = botMode === 'afterlight';
  const currentStatus = status?.botMode === botMode ? status : undefined;

  const hasAuthorizedTelegramChat = isAfterlightBotMode
    ? Boolean(currentStatus?.authorizedChatCount)
    : Boolean(currentStatus?.chatId);
  const isTelegramConnected = Boolean(
    currentStatus?.enabled && hasAuthorizedTelegramChat && currentStatus.isRunning,
  );

  const statusIcon = isTelegramConnected
    ? settings.theme === 'dark'
      ? 'settings-telegram-status-connected-dt.svg'
      : 'settings-telegram-status-connected.svg'
    : settings.theme === 'dark'
      ? 'settings-telegram-status-notconnected-dt.svg'
      : 'settings-telegram-status-notconnected.svg';

  const localSuccessMessages: string[] = [
    copy.telegram.disconnected,
    copy.telegram.saved,
    copy.telegram.saveServer,
    copy.telegram.sessionsReset,
    copy.telegram.tested,
  ];
  const isLocalSuccessMessage = localSuccessMessages.includes(message);
  const localErrorMessage = message && !isLocalSuccessMessage ? message : '';
  const localizedStatusError = localizeTelegramStatusMessage(currentStatus?.lastError, copy.telegram);
  const localizedLocalError = localizeTelegramStatusMessage(localErrorMessage, copy.telegram);
  const statusMessage =
    localizedStatusError ??
    (isTelegramConnected ? copy.telegram.tested : localizedLocalError || copy.telegram.noConnection);

  const hasLoadedTelegramSettingsRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async (showSpinner = false) => {
      try {
        if (showSpinner && isMounted) {
          setStatusRefreshing(true);
        }

        const savedStatus = await window.afterlightApi!.getTelegramStatus();

        if (!isMounted) {
          return;
        }

        setStatus(savedStatus);

        if (!hasLoadedTelegramSettingsRef.current) {
          setBotMode(savedStatus.botMode);
          setEnabled(savedStatus.enabled);
          setMessage(savedStatus.lastError ?? '');
          hasLoadedTelegramSettingsRef.current = true;
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : copy.telegram.failed);
        }
      } finally {
        if (showSpinner && isMounted) {
          setStatusRefreshing(false);
        }
      }
    };

    void loadStatus(true);
    const intervalId = window.setInterval(() => void loadStatus(false), 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [copy.telegram.failed]);

  const runAction = async (
    action: () => Promise<TelegramBotStatus>,
    successMessage: string,
    syncEnabled = true,
  ) => {
    try {
      setStatusRefreshing(true);

      const nextStatus = await action();

      setStatus(nextStatus);

      if (syncEnabled) {
        setBotMode(nextStatus.botMode);
        setEnabled(nextStatus.enabled);
      }

      setMessage(nextStatus.lastError ?? successMessage);
      return nextStatus;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.telegram.failed);
      return undefined;
    } finally {
      setStatusRefreshing(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextStatus = await runAction(
      () =>
        window.afterlightApi!.configureTelegram({
          botMode,
          enabled,
          token: isAfterlightBotMode ? undefined : token.trim() || undefined,
        }),
      isAfterlightBotMode ? copy.telegram.saveServer : copy.telegram.saved,
    );

    if (nextStatus && !nextStatus.lastError) {
      setToken('');
    }
  };

  const handleDisconnect = async () => {
    const nextStatus = await runAction(() => window.afterlightApi!.disconnectTelegram(), copy.telegram.disconnected);

    if (nextStatus) {
      setToken('');
    }
  };

  const handleResetSessions = async () => {
    await runAction(() => window.afterlightApi!.resetTelegramSessions(), copy.telegram.sessionsReset, false);
  };

  const handleCheckConnection = async () => {
    await runAction(
      () => window.afterlightApi!.testTelegram(isAfterlightBotMode ? undefined : token.trim() || undefined),
      copy.telegram.tested,
      false,
    );
  };

  const handleModeChange = (nextMode: TelegramBotMode) => {
    setBotMode(nextMode);
    setMessage('');
    setToken('');

    if (status?.botMode === nextMode) {
      setEnabled(status.enabled);
      return;
    }

    setEnabled(false);
  };

  return (
    <div className="settings-page main-settings-page">
      <form className="settings-form" onSubmit={handleSubmit}>
        <SettingsGroup title={copy.telegram.title}>
          <img className="telegram-status-icon preserve-icon-color" src={assetUrl(statusIcon)} alt="" />
          <div className="settings-field settings-option-field telegram-mode-field">
            <span>{copy.telegram.mode}</span>
            <div className="category-icon-mode telegram-mode-switch">

              <button
                className={botMode === 'custom' ? 'active' : ''}
                type="button"
                onClick={() => handleModeChange('custom')}
              >
                {copy.telegram.customMode}
              </button>
              <button
                className={botMode === 'afterlight' ? 'active' : ''}
                type="button"
                onClick={() => handleModeChange('afterlight')}
              >
                {copy.telegram.afterlightMode}
              </button>

            </div>
          </div>
          <p className="settings-hint">{isAfterlightBotMode ? copy.telegram.serverDescription : copy.telegram.description}</p>
          <div className="telegram-status">
            <strong>{copy.telegram.status}</strong>
            {isAfterlightBotMode ? <span>{copy.telegram.serverMode}</span> : null}

            <span>{currentStatus?.isRunning ? copy.telegram.running : copy.telegram.stopped}</span>
            {isAfterlightBotMode ? null : <span>{currentStatus?.hasToken ? copy.telegram.tokenSaved : copy.telegram.tokenMissing}</span>}
            {currentStatus?.botUsername ? <span>{copy.telegram.bot}: @{currentStatus.botUsername}</span> : null}
            {isAfterlightBotMode && currentStatus?.authorizedChatCount ? <span>{copy.telegram.chats}: {currentStatus.authorizedChatCount}</span> : null}
            {!isAfterlightBotMode && currentStatus?.chatId ? <span>{copy.telegram.chat}: {currentStatus.chatId}</span> : null}
            {currentStatus?.linkCode ? <span>{copy.telegram.linkCode}: {currentStatus.linkCode}</span> : null}
            {currentStatus?.linkCode ? <span>{copy.telegram.linkCommand(currentStatus.linkCode)}</span> : null}

          </div>
          {isAfterlightBotMode ? null : (
            <label className="settings-field settings-option-field">
              <span>{copy.telegram.token}</span>
              <input
                autoComplete="off"
                placeholder={currentStatus?.hasToken ? copy.telegram.tokenSaved : copy.telegram.tokenPlaceholder}
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
          )}
          <SettingsToggle checked={enabled} label={isAfterlightBotMode ? copy.telegram.serverEnabled : copy.telegram.enabled} onChange={setEnabled} />

          <div className="settings-button-grid telegram-actions">
            <button type="submit" disabled={isStatusRefreshing}>
              {isAfterlightBotMode ? copy.telegram.saveServer : copy.telegram.save}
            </button>

            <button type="button" disabled={isStatusRefreshing} onClick={() => void handleCheckConnection()}>
              {copy.telegram.check}
            </button>

            <button type="button" disabled={isStatusRefreshing} onClick={() => void handleDisconnect()}>
              {copy.telegram.disconnect}
            </button>

            <button type="button" disabled={isStatusRefreshing} onClick={() => void handleResetSessions()}>
              {copy.telegram.resetSessions}
            </button>
          </div>

          <div className="telegram-status-message" aria-live="polite">
            {isStatusRefreshing ? <span className="telegram-status-spinner" aria-label={copy.telegram.status} /> : <span>{statusMessage}</span>}
          </div>
        </SettingsGroup>
      </form>
    </div>
  );
};

const BackupsSettings = () => {
  const copy = useSettingsCopy();
  const settings = useTaskStore((state) => state.settings);
  const updateSettings = useTaskStore((state) => state.updateSettings);
  const hydrate = useTaskStore((state) => state.hydrate);
  const [message, setMessage] = useState('');

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      const result = await action();
      await hydrate();
      setMessage(typeof result === 'string' && result ? `${successMessage}: ${result}` : successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.backups.failed);
    }
  };

  return (
    <div className="settings-page main-settings-page">
      <SettingsGroup title={copy.backups.files}>
        <div className="settings-button-grid">
          <button type="button" onClick={() => void runAction(() => window.afterlightApi!.exportTasksJson(), copy.backups.jsonExported)}>
            {copy.backups.exportJson}
          </button>
          <button type="button" onClick={() => void runAction(() => window.afterlightApi!.exportTasksCsv(), copy.backups.csvExported)}>
            {copy.backups.exportCsv}
          </button>
          <button type="button" onClick={() => void runAction(() => window.afterlightApi!.importTasksJson(), copy.backups.jsonImported)}>
            {copy.backups.importJson}
          </button>
          <button type="button" onClick={() => void runAction(() => window.afterlightApi!.openDataFolder(), copy.backups.dataOpened)}>
            {copy.backups.openData}
          </button>
          <button type="button" onClick={() => void runAction(() => window.afterlightApi!.openDatabase(), copy.backups.databaseOpened)}>
            {copy.backups.openDatabase}
          </button>
          <button type="button" onClick={() => void runAction(() => window.afterlightApi!.createBackup(), copy.backups.backupCreated)}>
            {copy.backups.createBackup}
          </button>
        </div>
        {message ? <p className="settings-hint">{message}</p> : null}
      </SettingsGroup>

      <SettingsGroup title={copy.backups.auto} onReset={() => void updateSettings(defaults.backups)}>
        <SettingsToggle checked={settings.autoBackupEnabled} label={copy.backups.autoBackup} onChange={(autoBackupEnabled) => void updateSettings({ autoBackupEnabled })} />
        <SettingsNumber label={copy.backups.interval} min={1} max={168} value={settings.autoBackupIntervalHours} onChange={(autoBackupIntervalHours) => void updateSettings({ autoBackupIntervalHours })} />
      </SettingsGroup>
    </div>
  );
};

const AccountSettings = ({ onAfterReset }: { onAfterReset: () => void }) => {
  const copy = useSettingsCopy();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profile = useTaskStore((state) => state.profile);
  const resetProfile = useTaskStore((state) => state.resetProfile);
  const settings = useTaskStore((state) => state.settings);
  const updateProfile = useTaskStore((state) => state.updateProfile);
  const updateWorkspace = useTaskStore((state) => state.updateWorkspace);
  const workspace = useTaskStore((state) => state.workspace);
  const [avatarDataUrl, setAvatarDataUrl] = useState(profile.avatarDataUrl);
  const [email, setEmail] = useState(profile.email ?? '');
  const [name, setName] = useState(profile.name);
  const [workspaceTitle, setWorkspaceTitle] = useState(workspace.title);
  const [isConfirmingReset, setConfirmingReset] = useState(false);
  const [isSavedToastVisible, setSavedToastVisible] = useState(false);
  const canSave = Boolean(name.trim() && workspaceTitle.trim() && email.trim());
  const defaultAvatar = assetUrl(settings.theme === 'dark' ? 'default-avatar-dark.png' : 'default-avatar-light.png');

  useEffect(() => {
    setAvatarDataUrl(profile.avatarDataUrl);
    setEmail(profile.email ?? '');
    setName(profile.name);
    setConfirmingReset(false);
    setSavedToastVisible(false);
  }, [profile]);

  useEffect(() => {
    setWorkspaceTitle(workspace.title);
  }, [workspace]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
      }
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    void Promise.all([
      updateProfile({
        ...profile,
        avatarDataUrl,
        email,
        isSetupComplete: true,
        name,
      }),
      updateWorkspace({ ...workspace, title: workspaceTitle }),
    ]).then(() => {
      setSavedToastVisible(true);
      window.setTimeout(() => setSavedToastVisible(false), 2200);
    });
  };

  const handleReset = async () => {
    await resetProfile();
    onAfterReset();
  };

  return (
    <div className="settings-page">
      {isSavedToastVisible ? <div className="settings-toast">{copy.account.saved}</div> : null}
      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="settings-section">
          <h3>{copy.account.profile}</h3>
          <div className="settings-divider" />
          <div className="profile-settings">
            <div className="profile-avatar-block">
              <div className="profile-avatar-shell">
                <img className="profile-avatar" src={avatarDataUrl ?? defaultAvatar} alt="" />
                <button
                  className="delete-avatar-button"
                  type="button"
                  aria-label={copy.account.deleteAvatar}
                  disabled={!avatarDataUrl}
                  onClick={() => setAvatarDataUrl(undefined)}
                >
                  <img src={assetUrl('settings-delete-avatar-icon.svg')} alt="" />
                </button>
              </div>
              <input
                ref={avatarInputRef}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="visually-hidden"
                type="file"
                onChange={handleAvatarChange}
              />
              <button className="outline-accent-button" type="button" onClick={() => avatarInputRef.current?.click()}>
                {copy.account.upload}
              </button>
            </div>
            <div className="settings-field-stack">
              <label className="settings-field">
                <span>{copy.account.name}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="settings-field">
                <span>{copy.account.workspace}</span>
                <input value={workspaceTitle} onChange={(event) => setWorkspaceTitle(event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>{copy.account.security}</h3>
          <div className="settings-divider" />
          <div className="settings-field-stack wide">
            <label className="settings-field">
              <span>{copy.account.email}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          </div>
          <div className="settings-save-row">
            <button className="settings-save-button" type="submit" disabled={!canSave}>
              {copy.account.save}
            </button>
          </div>
          <div className="settings-divider" />
          {isConfirmingReset ? (
            <div className="settings-action danger confirm">
              <div>
                <h4>{copy.account.confirmTitle}</h4>
                <p>{copy.account.confirmDescription}</p>
              </div>
              <div className="settings-confirm-actions">
                <button type="button" onClick={() => setConfirmingReset(false)}>
                  {copy.account.cancel}
                </button>
                <button type="button" onClick={() => void handleReset()}>
                  {copy.account.confirm}
                </button>
              </div>
            </div>
          ) : (
            <SettingsAction
              danger
              title={copy.account.deleteTitle}
              description={copy.account.deleteDescription}
              action={copy.account.deleteAction}
              onAction={() => setConfirmingReset(true)}
            />
          )}
        </section>
      </form>
    </div>
  );
};

const SettingsAction = ({
  action,
  danger = false,
  description,
  onAction,
  title,
}: {
  action: string;
  danger?: boolean;
  description: string;
  onAction?: () => void;
  title: string;
}) => (
  <div className={danger ? 'settings-action danger' : 'settings-action'}>
    <div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <button type="button" onClick={onAction}>
      {action}
    </button>
  </div>
);

const SettingsGroup = ({ children, onReset, title }: { children: ReactNode; onReset?: () => void; title: string }) => {
  const copy = useSettingsCopy();

  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <h3>{title}</h3>
        {onReset ? (
          <button
            className="settings-reset-button"
            type="button"
            onClick={() => {
              if (window.confirm(copy.resetConfirm.replace('{title}', title))) {
                onReset();
              }
            }}
          >
            {copy.reset}
          </button>
        ) : null}
      </div>
      <div className="settings-divider" />
      <div className="settings-options-list">{children}</div>
    </section>
  );
};

const SettingsToggle = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) => (
  <label className="settings-toggle-row">
    <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>
);

const SettingsSelect = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<[T, string]>;
  value: T;
}) => (
  <label className="settings-field settings-option-field">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  </label>
);

const SettingsTime = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className="settings-field settings-option-field">
    <span>{label}</span>
    <input type="time" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const SettingsNumber = ({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) => (
  <label className="settings-field settings-option-field">
    <span>{label}</span>
    <input max={max} min={min} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

const defaults = {
  autosave: {
    autosaveNotesIntervalSeconds: 1,
  },
  backups: {
    autoBackupEnabled: true,
    autoBackupIntervalHours: 24,
  },
  categories: {
    categorySortMode: 'created',
    confirmCategoryDelete: true,
    countCompletedTasks: true,
    showCategoryCounts: true,
  },
  close: {
    closeBehavior: 'exit',
    confirmExit: false,
    minimizeToTrayOnClose: false,
    trayEnabled: true,
  },
  interface: {
    counterCriticalAt: 31,
    counterHighAt: 16,
    counterMediumAt: 6,
    showLastModified: true,
    showSidebarCounts: true,
    showTabBar: true,
  },
  launch: {
    launchMinimized: false,
    launchWithWindows: false,
    openMode: 'normal',
    restoreTabs: false,
    restoreWindowState: 'normal',
    startSection: 'inbox',
  },
  notes: {
    notesLineLimit: 50,
  },
  notifications: {
    deadlineNotifyBeforeMinutes: 60,
    notifyBeforeTodayRefresh: false,
    notifyDeadlines: false,
    notifyOverdue: false,
    overdueNotifyEveryMinutes: 240,
    todayRefreshNotifyBeforeMinutes: 10,
  },
  sidebar: {
    autoCollapseSidebar: false,
    showCategoryCounts: true,
    showSidebarCounts: true,
  },
  tasks: {
    confirmTaskDelete: true,
    sortCompletedTasksLast: true,
    taskSortMode: 'created',
  },
  theme: {
    theme: 'light',
  },
  today: {
    includeTodayDueTasks: true,
    showTodayOverdueFirst: true,
    todayRefreshTime: '00:00',
  },
  week: {
    highlightTodayInWeek: true,
    showWeekNoDate: true,
    weekOrderMode: 'monday',
  },
} satisfies Record<string, UpdateSettingsInput>;
