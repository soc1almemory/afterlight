import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  AppData,
  Category,
  CreateCategoryInput,
  CreateTaskInput,
  Note,
  ProfileSetupInput,
  Task,
  TaskScope,
  SystemQuickAction,
  TelegramBotStatus,
  TelegramConfigInput,
  UpdateCategoryInput,
  UpdateProfileInput,
  UpdateSettingsInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  UserProfile,
  Workspace,
} from '../shared/types';

const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  setFullScreen: (value: boolean) => ipcRenderer.invoke('window:set-fullscreen', value),
  close: () => ipcRenderer.invoke('window:close'),
  onQuickAction: (callback: (action: SystemQuickAction) => void) => {
    const listener = (_event: IpcRendererEvent, action: SystemQuickAction) => callback(action);
    ipcRenderer.on('system:quick-action', listener);
    return () => ipcRenderer.removeListener('system:quick-action', listener);
  },
};

contextBridge.exposeInMainWorld('afterlightWindow', windowControls);
contextBridge.exposeInMainWorld('afterlightApi', {
  loadData: (): Promise<AppData> => ipcRenderer.invoke('app-data:load'),
  completeProfileSetup: (input: ProfileSetupInput): Promise<AppData> => ipcRenderer.invoke('profile:complete-setup', input),
  resetProfile: (): Promise<AppData> => ipcRenderer.invoke('profile:reset'),
  updateSettings: (input: UpdateSettingsInput): Promise<AppData['settings']> => ipcRenderer.invoke('settings:update', input),
  listCategories: (): Promise<Category[]> => ipcRenderer.invoke('categories:list'),
  createCategory: (input: CreateCategoryInput): Promise<Category> => ipcRenderer.invoke('categories:create', input),
  updateCategory: (input: UpdateCategoryInput): Promise<Category> => ipcRenderer.invoke('categories:update', input),
  toggleCategoryFavorite: (categoryId: string): Promise<Category> =>
    ipcRenderer.invoke('categories:toggle-favorite', categoryId),
  deleteCategory: (categoryId: string): Promise<string> => ipcRenderer.invoke('categories:delete', categoryId),
  createTask: (input: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:create', input),
  toggleTask: (taskId: string): Promise<Task> => ipcRenderer.invoke('tasks:toggle', taskId),
  updateTask: (input: UpdateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:update', input),
  deleteTask: (taskId: string): Promise<string> => ipcRenderer.invoke('tasks:delete', taskId),
  deleteTasks: (taskIds: string[]): Promise<string[]> => ipcRenderer.invoke('tasks:delete-many', taskIds),
  updateNote: (scope: TaskScope, text: string, categoryId?: string): Promise<Note> =>
    ipcRenderer.invoke('notes:update', { scope, text, categoryId }),
  updateProfile: (input: UpdateProfileInput): Promise<UserProfile> => ipcRenderer.invoke('profile:update', input),
  updateWorkspace: (input: UpdateWorkspaceInput): Promise<Workspace> => ipcRenderer.invoke('workspace:update', input),
  onDataChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('system:data-changed', listener);
    return () => ipcRenderer.removeListener('system:data-changed', listener);
  },
  exportTasksJson: (): Promise<string | undefined> => ipcRenderer.invoke('system:export-json'),
  exportTasksCsv: (): Promise<string | undefined> => ipcRenderer.invoke('system:export-csv'),
  importTasksJson: (): Promise<number> => ipcRenderer.invoke('system:import-json'),
  openDataFolder: (): Promise<string> => ipcRenderer.invoke('system:open-data-folder'),
  openDatabase: (): Promise<void> => ipcRenderer.invoke('system:open-database'),
  createBackup: (): Promise<string> => ipcRenderer.invoke('system:create-backup'),
  getTelegramStatus: (): Promise<TelegramBotStatus> => ipcRenderer.invoke('telegram:status'),
  configureTelegram: (input: TelegramConfigInput): Promise<TelegramBotStatus> =>
    ipcRenderer.invoke('telegram:configure', input),
  testTelegram: (token?: string): Promise<TelegramBotStatus> => ipcRenderer.invoke('telegram:test', token),
  disconnectTelegram: (): Promise<TelegramBotStatus> => ipcRenderer.invoke('telegram:disconnect'),
});
contextBridge.exposeInMainWorld('afterlightSystem', {
  platform: process.platform,
  versions: process.versions,
});
