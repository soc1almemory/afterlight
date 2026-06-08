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
  UpdateCategoryInput,
  UpdateProfileInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  UserProfile,
  Workspace,
} from '../shared/types';

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
  completeProfileSetup: (input: ProfileSetupInput) => Promise<AppData>;
  resetProfile: () => Promise<AppData>;
  listCategories: () => Promise<Category[]>;
  createCategory: (input: CreateCategoryInput) => Promise<Category>;
  updateCategory: (input: UpdateCategoryInput) => Promise<Category>;
  toggleCategoryFavorite: (categoryId: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<string>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  toggleTask: (taskId: string) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<string>;
  updateNote: (scope: TaskScope, text: string, categoryId?: string) => Promise<Note>;
  updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
  updateWorkspace: (input: UpdateWorkspaceInput) => Promise<Workspace>;
}

declare global {
  interface Window {
    afterlightApi?: AfterlightApi;
    afterlightWindow?: AfterlightWindowControls;
    afterlightSystem?: AfterlightSystemInfo;
  }
}

export {};
