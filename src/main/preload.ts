import { contextBridge, ipcRenderer } from 'electron';
import type { AppData, Category, CreateTaskInput, Note, Task, TaskScope } from '../shared/types';

const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('afterlightWindow', windowControls);
contextBridge.exposeInMainWorld('afterlightApi', {
  loadData: (): Promise<AppData> => ipcRenderer.invoke('app-data:load'),
  listCategories: (): Promise<Category[]> => ipcRenderer.invoke('categories:list'),
  createTask: (input: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:create', input),
  toggleTask: (taskId: string): Promise<Task> => ipcRenderer.invoke('tasks:toggle', taskId),
  updateNote: (scope: TaskScope, text: string): Promise<Note> => ipcRenderer.invoke('notes:update', { scope, text }),
});
contextBridge.exposeInMainWorld('afterlightSystem', {
  platform: process.platform,
  versions: process.versions,
});
