export type TaskPriority = 1 | 2 | 3 | 4;

export type TaskStatus = 'active' | 'completed';

export type TaskScope = 'inbox' | 'today' | 'week' | 'category';

export type CategoryIconMode = 'color' | 'emoji' | 'hash';

export type StartSectionMode = 'inbox' | 'today' | 'week' | 'last';
export type WindowOpenMode = 'normal' | 'fullscreen';
export type LanguageCode = 'ru' | 'en';
export type WindowStateMode = 'normal' | 'maximized' | 'fullscreen';
export type CloseBehaviorMode = 'ask' | 'exit' | 'tray';
export type ThemeMode = 'light' | 'dark';
export type TaskSortMode = 'date' | 'priority' | 'manual' | 'created';
export type WeekOrderMode = 'monday' | 'today';
export type CategorySortMode = 'created' | 'alphabetical' | 'manual' | 'favorites';
export type TelegramBotMode = 'custom' | 'afterlight';
export type AppUpdateStatusKind =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloaded'
  | 'error'
  | 'unsupported';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueLabel?: string;
  priority: TaskPriority;
  status: TaskStatus;
  scope: TaskScope;
  categoryId?: string;
  isExpired?: boolean;
  updatedAt?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  dueLabel?: string;
  priority?: TaskPriority;
  scope: TaskScope;
  categoryId?: string;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueLabel?: string;
  priority: TaskPriority;
  scope?: TaskScope;
  categoryId?: string;
}

export interface Category {
  id: string;
  title: string;
  color: string;
  emoji?: string;
  iconMode: CategoryIconMode;
  isFavorite: boolean;
  updatedAt?: string;
}

export interface CreateCategoryInput {
  title: string;
  color: string;
  emoji?: string;
  iconMode?: CategoryIconMode;
  isFavorite?: boolean;
}

export interface UpdateCategoryInput {
  id: string;
  title: string;
  color: string;
  emoji?: string;
  iconMode: CategoryIconMode;
  isFavorite: boolean;
}

export interface Note {
  id: string;
  scope: TaskScope;
  text: string;
  categoryId?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarDataUrl?: string;
  activeWorkspaceId: string;
  isSetupComplete: boolean;
}

export interface Workspace {
  id: string;
  title: string;
  profileId: string;
}

export interface UpdateProfileInput {
  id: string;
  name: string;
  email?: string;
  avatarDataUrl?: string;
  isSetupComplete?: boolean;
}

export interface UpdateWorkspaceInput {
  id: string;
  title: string;
}

export interface ProfileSetupInput {
  avatarDataUrl?: string;
  email: string;
  name: string;
  workspaceTitle: string;
}

export interface AppSettings {
  autoBackupEnabled: boolean;
  autoBackupIntervalHours: number;
  autoCollapseSidebar: boolean;
  autosaveNotesIntervalSeconds: number;
  categorySortMode: CategorySortMode;
  closeBehavior: CloseBehaviorMode;
  confirmCategoryDelete: boolean;
  confirmExit: boolean;
  confirmTaskDelete: boolean;
  countCompletedTasks: boolean;
  counterCriticalAt: number;
  counterHighAt: number;
  counterMediumAt: number;
  highlightTodayInWeek: boolean;
  includeTodayDueTasks: boolean;
  language: LanguageCode;
  launchMinimized: boolean;
  launchWithWindows: boolean;
  minimizeToTrayOnClose: boolean;
  deadlineNotifyBeforeMinutes: number;
  notifyBeforeTodayRefresh: boolean;
  notifyDeadlines: boolean;
  notifyOverdue: boolean;
  notesLineLimit: number;
  overdueNotifyEveryMinutes: number;
  openMode: WindowOpenMode;
  restoreTabs: boolean;
  restoreWindowState: WindowStateMode;
  showCategoryCounts: boolean;
  showLastModified: boolean;
  showSidebarCounts: boolean;
  showTabBar: boolean;
  showTodayOverdueFirst: boolean;
  sortCompletedTasksLast: boolean;
  showWeekNoDate: boolean;
  startSection: StartSectionMode;
  taskSortMode: TaskSortMode;
  theme: ThemeMode;
  todayRefreshNotifyBeforeMinutes: number;
  todayRefreshTime: string;
  trayEnabled: boolean;
  weekOrderMode: WeekOrderMode;
}

export type SystemQuickAction = 'open' | 'add-task' | 'today' | 'week';

export type UpdateSettingsInput = Partial<AppSettings>;

export interface TelegramConfigInput {
  botMode?: TelegramBotMode;
  enabled: boolean;
  token?: string;
}

export interface TelegramBotStatus {
  botMode: TelegramBotMode;
  enabled: boolean;
  hasToken: boolean;
  isRunning: boolean;
  authorizedChatCount?: number;
  chatId?: number;
  botUsername?: string;
  linkCode?: string;
  lastError?: string;
  serverLastHeartbeatAt?: string;
  lastUpdateAt?: string;
}

export interface AppUpdateStatus {
  currentVersion: string;
  error?: string;
  releaseName?: string;
  status: AppUpdateStatusKind;
  updateUrl?: string;
}

export interface AppData {
  categories: Category[];
  notes: Note[];
  profile: UserProfile;
  settings: AppSettings;
  tasks: Task[];
  workspace: Workspace;
}
