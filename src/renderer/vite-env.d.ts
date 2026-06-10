/// <reference types="vite/client" />

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

interface AfterlightWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  setFullScreen: (value: boolean) => Promise<void>;
  close: () => Promise<void>;
  onQuickAction: (callback: (action: SystemQuickAction) => void) => () => void;
}

interface AfterlightSystemInfo {
  platform: NodeJS.Platform;
  versions: NodeJS.ProcessVersions;
}

interface AfterlightApi {
  loadData: () => Promise<AppData>;
  completeProfileSetup: (input: ProfileSetupInput) => Promise<AppData>;
  resetProfile: () => Promise<AppData>;
  updateSettings: (input: UpdateSettingsInput) => Promise<AppData['settings']>;
  listCategories: () => Promise<Category[]>;
  createCategory: (input: CreateCategoryInput) => Promise<Category>;
  updateCategory: (input: UpdateCategoryInput) => Promise<Category>;
  toggleCategoryFavorite: (categoryId: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<string>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  toggleTask: (taskId: string) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<string>;
  deleteTasks: (taskIds: string[]) => Promise<string[]>;
  updateNote: (scope: TaskScope, text: string, categoryId?: string) => Promise<Note>;
  updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
  updateWorkspace: (input: UpdateWorkspaceInput) => Promise<Workspace>;
  onDataChanged: (callback: () => void) => () => void;
  exportTasksJson: () => Promise<string | undefined>;
  exportTasksCsv: () => Promise<string | undefined>;
  importTasksJson: () => Promise<number>;
  openDataFolder: () => Promise<string>;
  openDatabase: () => Promise<void>;
  createBackup: () => Promise<string>;
  getTelegramStatus: () => Promise<TelegramBotStatus>;
  configureTelegram: (input: TelegramConfigInput) => Promise<TelegramBotStatus>;
  testTelegram: (token?: string) => Promise<TelegramBotStatus>;
  disconnectTelegram: () => Promise<TelegramBotStatus>;
}

declare global {
  interface Window {
    afterlightApi?: AfterlightApi;
    afterlightWindow?: AfterlightWindowControls;
    afterlightSystem?: AfterlightSystemInfo;
  }
}

export {};
