import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import appVersion from '../../shared/app-version.json';
import type { TelegramBotStatus, UpdateSettingsInput } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SettingsDialogProps {
  initialPage?: SettingsPage;
  isOpen: boolean;
  onClose: () => void;
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
      password: 'Новый пароль',
      save: 'Сохранить изменения',
      deleteTitle: 'Удаление аккаунта',
      deleteDescription: 'Сбросить профиль и все данные текущего рабочего пространства.',
      deleteAction: 'Удалить аккаунт',
      confirmTitle: 'Подтвердите удаление аккаунта',
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
      confirmTaskDelete: 'Подтверждать удаление задач',
      weekPage: 'Неделя',
      weekOrder: 'Порядок дней',
      mondayFirst: 'Понедельник всегда сверху',
      todayFirst: 'Сегодняшний день сверху',
      showNoDate: 'Показывать распределитель «Без даты»',
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
      description: 'Локальный бот работает только пока Afterlight запущен. Напишите боту /start, чтобы начать.',
      usernameHint: 'Юзернейм бота: @afterlight_task_bot',
      token: 'Токен бота',
      tokenPlaceholder: 'Вставьте новый токен из BotFather',
      enabled: 'Включить локального Telegram-бота',
      save: 'Сохранить и запустить',
      disconnect: 'Отключить',
      status: 'Статус',
      running: 'бот запущен',
      stopped: 'бот остановлен',
      tokenSaved: 'токен сохранён',
      tokenMissing: 'токен не сохранён',
      chat: 'chat_id',
      bot: 'бот',
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
      password: 'New password',
      save: 'Save changes',
      deleteTitle: 'Account deletion',
      deleteDescription: 'Reset the profile and all data in the current workspace.',
      deleteAction: 'Delete account',
      confirmTitle: 'Confirm account deletion',
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
      confirmTaskDelete: 'Confirm task deletion',
      weekPage: 'Week',
      weekOrder: 'Day order',
      mondayFirst: 'Monday always first',
      todayFirst: 'Today always first',
      showNoDate: 'Show the No date distributor',
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
      description: 'The local bot only works while Afterlight is running. Write to the bot /start to get started.',
      usernameHint: 'Bot username: @afterlight_task_bot',
      token: 'Bot token',
      tokenPlaceholder: 'Paste a new token from BotFather',
      enabled: 'Enable local Telegram bot',
      save: 'Save and start',
      disconnect: 'Disconnect',
      status: 'Status',
      running: 'bot is running',
      stopped: 'bot is stopped',
      tokenSaved: 'token saved',
      tokenMissing: 'token not saved',
      chat: 'chat_id',
      bot: 'bot',
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

export const SettingsDialog = ({ initialPage = 'account', isOpen, onClose }: SettingsDialogProps) => {
  const [activePage, setActivePage] = useState<SettingsPage>(initialPage);
  const copy = useSettingsCopy();

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
                onClick={() => setActivePage(item.id)}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{copy.nav[item.id]}</span>
              </button>
            ))}
          </nav>
          <p className="settings-version-label">Afterlight v{appVersion.version} © soc1almemory 2026</p>
        </aside>

        <button className="settings-close-button" type="button" aria-label={copy.close} onClick={onClose}>
          <img src={assetUrl('settings-close-icon.svg')} alt="" />
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
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<TelegramBotStatus | undefined>();
  const [token, setToken] = useState('');
  const [isStatusRefreshing, setStatusRefreshing] = useState(false);
  const isTelegramConnected = Boolean(status?.isRunning && status.chatId);
  const statusIcon = isTelegramConnected
    ? settings.theme === 'dark'
      ? 'settings-telegram-status-connected-dt.svg'
      : 'settings-telegram-status-connected.svg'
    : settings.theme === 'dark'
      ? 'settings-telegram-status-notconnected-dt.svg'
      : 'settings-telegram-status-notconnected.svg';
  const statusMessage = status?.lastError ?? (message || copy.telegram.noConnection);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        if (isMounted) {
          setStatusRefreshing(true);
        }

        const savedStatus = await window.afterlightApi!.getTelegramStatus();
        const shouldTest = savedStatus.enabled || savedStatus.hasToken || Boolean(token.trim());
        const telegramStatus = shouldTest
          ? await window.afterlightApi!.testTelegram(token.trim() || undefined)
          : savedStatus;

        if (isMounted) {
          setEnabled(telegramStatus.enabled);
          setStatus(telegramStatus);
          setMessage(telegramStatus.lastError ?? (shouldTest ? copy.telegram.tested : ''));
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : copy.telegram.failed);
        }
      } finally {
        if (isMounted) {
          setStatusRefreshing(false);
        }
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(loadStatus, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [copy.telegram.failed, copy.telegram.tested, token]);

  const runAction = async (action: () => Promise<TelegramBotStatus>, successMessage: string) => {
    try {
      setStatusRefreshing(true);
      const nextStatus = await action();
      setStatus(nextStatus);
      setEnabled(nextStatus.enabled);
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
      () => window.afterlightApi!.configureTelegram({ enabled, token: token.trim() || undefined }),
      copy.telegram.saved,
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

  return (
    <div className="settings-page main-settings-page">
      <form className="settings-form" onSubmit={handleSubmit}>
        <SettingsGroup title={copy.telegram.title}>
          <img className="telegram-status-icon preserve-icon-color" src={assetUrl(statusIcon)} alt="" />
          <p className="settings-hint">{copy.telegram.description}</p>
          <p className="settings-hint">{copy.telegram.usernameHint}</p>
          <div className="telegram-status">
            <strong>{copy.telegram.status}</strong>
            <span>{status?.isRunning ? copy.telegram.running : copy.telegram.stopped}</span>
            <span>{status?.hasToken ? copy.telegram.tokenSaved : copy.telegram.tokenMissing}</span>
            {status?.botUsername ? <span>{copy.telegram.bot}: @{status.botUsername}</span> : null}
            {status?.chatId ? <span>{copy.telegram.chat}: {status.chatId}</span> : null}
          </div>
          <label className="settings-field settings-option-field">
            <span>{copy.telegram.token}</span>
            <input
              autoComplete="off"
              placeholder={status?.hasToken ? copy.telegram.tokenSaved : copy.telegram.tokenPlaceholder}
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <SettingsToggle checked={enabled} label={copy.telegram.enabled} onChange={setEnabled} />
          <div className="settings-button-grid telegram-actions">
            <button type="submit">{copy.telegram.save}</button>
            <button type="button" onClick={() => void handleDisconnect()}>
              {copy.telegram.disconnect}
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
  const [password, setPassword] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState(workspace.title);
  const [isConfirmingReset, setConfirmingReset] = useState(false);
  const [isSavedToastVisible, setSavedToastVisible] = useState(false);
  const canSave = Boolean(name.trim() && workspaceTitle.trim() && email.trim());
  const defaultAvatar = assetUrl(settings.theme === 'dark' ? 'default-avatar-dark.png' : 'default-avatar-light.png');

  useEffect(() => {
    setAvatarDataUrl(profile.avatarDataUrl);
    setEmail(profile.email ?? '');
    setName(profile.name);
    setPassword('');
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
        password: password || undefined,
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
            <label className="settings-field">
              <span>{copy.account.password}</span>
              <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} placeholder="************" />
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
