/// <reference types="vite/client" />

import type { AppData, Category, CreateTaskInput, Note, Task, TaskScope } from '../shared/types';

interface AfterlightWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

interface AfterlightSystemInfo {
  platform: NodeJS.Platform;
  versions: NodeJS.ProcessVersions;
}

interface AfterlightApi {
  loadData: () => Promise<AppData>;
  listCategories: () => Promise<Category[]>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  toggleTask: (taskId: string) => Promise<Task>;
  updateNote: (scope: TaskScope, text: string) => Promise<Note>;
}

declare global {
  interface Window {
    afterlightApi?: AfterlightApi;
    afterlightWindow?: AfterlightWindowControls;
    afterlightSystem?: AfterlightSystemInfo;
  }
}

export {};
