import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppData,
  Category,
  CreateCategoryInput,
  CreateTaskInput,
  Note,
  ProfileSetupInput,
  Task,
  TaskScope,
  UpdateCategoryInput,
  UpdateProfileInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  UserProfile,
  Workspace,
} from '../shared/types';

const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('afterlightWindow', windowControls);
contextBridge.exposeInMainWorld('afterlightApi', {
  loadData: (): Promise<AppData> => ipcRenderer.invoke('app-data:load'),
  completeProfileSetup: (input: ProfileSetupInput): Promise<AppData> => ipcRenderer.invoke('profile:complete-setup', input),
  resetProfile: (): Promise<AppData> => ipcRenderer.invoke('profile:reset'),
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
  updateNote: (scope: TaskScope, text: string, categoryId?: string): Promise<Note> =>
    ipcRenderer.invoke('notes:update', { scope, text, categoryId }),
  updateProfile: (input: UpdateProfileInput): Promise<UserProfile> => ipcRenderer.invoke('profile:update', input),
  updateWorkspace: (input: UpdateWorkspaceInput): Promise<Workspace> => ipcRenderer.invoke('workspace:update', input),
});
contextBridge.exposeInMainWorld('afterlightSystem', {
  platform: process.platform,
  versions: process.versions,
});
