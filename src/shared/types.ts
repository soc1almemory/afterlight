export type TaskPriority = 1 | 2 | 3 | 4;

export type TaskStatus = 'active' | 'completed';

export type TaskScope = 'inbox' | 'today' | 'week' | 'category';

export type CategoryIconMode = 'color' | 'emoji' | 'hash';

export type StartSectionMode = 'inbox' | 'today' | 'week' | 'last';
export type WindowOpenMode = 'normal' | 'fullscreen';
export type TaskSortMode = 'date' | 'priority' | 'manual' | 'created';
export type WeekOrderMode = 'monday' | 'today';
export type CategorySortMode = 'created' | 'alphabetical' | 'manual' | 'favorites';

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
  password?: string;
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
  password: string;
  workspaceTitle: string;
}

export interface AppSettings {
  autosaveNotesIntervalSeconds: number;
  categorySortMode: CategorySortMode;
  confirmCategoryDelete: boolean;
  confirmTaskDelete: boolean;
  countCompletedTasks: boolean;
  counterCriticalAt: number;
  counterHighAt: number;
  counterMediumAt: number;
  highlightTodayInWeek: boolean;
  includeTodayDueTasks: boolean;
  notesLineLimit: number;
  openMode: WindowOpenMode;
  restoreTabs: boolean;
  showCategoryCounts: boolean;
  showLastModified: boolean;
  showSidebarCounts: boolean;
  showTabBar: boolean;
  showTodayOverdueFirst: boolean;
  showWeekNoDate: boolean;
  startSection: StartSectionMode;
  taskSortMode: TaskSortMode;
  todayRefreshTime: string;
  weekOrderMode: WeekOrderMode;
}

export type UpdateSettingsInput = Partial<AppSettings>;

export interface AppData {
  categories: Category[];
  notes: Note[];
  profile: UserProfile;
  settings: AppSettings;
  tasks: Task[];
  workspace: Workspace;
}
