import { ipcMain } from 'electron';
import type {
  CreateCategoryInput,
  CreateTaskInput,
  ProfileSetupInput,
  TaskScope,
  UpdateCategoryInput,
  UpdateProfileInput,
  UpdateSettingsInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
} from '../../shared/types';
import {
  createCategory,
  createTask,
  completeProfileSetup,
  deleteCategory,
  deleteTask,
  deleteTasks,
  listAppData,
  resetProfile,
  listCategories,
  toggleCategoryFavorite,
  toggleTask,
  updateCategory,
  updateNote,
  updateProfile,
  updateSettings,
  updateTask,
  updateWorkspace,
} from '../storage/repositories';

interface RegisterTaskIpcHandlersOptions {
  onProfileReset?: () => void;
  onSettingsUpdated?: () => void;
}

export const registerTaskIpcHandlers = (options: RegisterTaskIpcHandlersOptions = {}) => {
  ipcMain.handle('app-data:load', () => listAppData());
  ipcMain.handle('profile:complete-setup', (_event, input: ProfileSetupInput) => {
    if (!input.name.trim()) {
      throw new Error('Profile name is required.');
    }

    if (!input.workspaceTitle.trim()) {
      throw new Error('Workspace title is required.');
    }

    if (!input.email.trim()) {
      throw new Error('Email is required.');
    }

    return completeProfileSetup(input);
  });
  ipcMain.handle('profile:reset', () => {
    const data = resetProfile();
    options.onProfileReset?.();
    return data;
  });
  ipcMain.handle('settings:update', (_event, input: UpdateSettingsInput) => {
    const settings = updateSettings(input);
    options.onSettingsUpdated?.();
    return settings;
  });
  ipcMain.handle('categories:list', () => listCategories());

  ipcMain.handle('categories:create', (_event, input: CreateCategoryInput) => {
    if (!input.title.trim()) {
      throw new Error('Category title is required.');
    }

    return createCategory(input);
  });

  ipcMain.handle('categories:update', (_event, input: UpdateCategoryInput) => {
    if (!input.title.trim()) {
      throw new Error('Category title is required.');
    }

    const category = updateCategory(input);

    if (!category) {
      throw new Error(`Category "${input.id}" was not found.`);
    }

    return category;
  });

  ipcMain.handle('categories:toggle-favorite', (_event, categoryId: string) => {
    const category = toggleCategoryFavorite(categoryId);

    if (!category) {
      throw new Error(`Category "${categoryId}" was not found.`);
    }

    return category;
  });

  ipcMain.handle('categories:delete', (_event, categoryId: string) => {
    const wasDeleted = deleteCategory(categoryId);

    if (!wasDeleted) {
      throw new Error(`Category "${categoryId}" was not found.`);
    }

    return categoryId;
  });

  ipcMain.handle('tasks:create', (_event, input: CreateTaskInput) => {
    if (!input.title.trim()) {
      throw new Error('Task title is required.');
    }

    return createTask(input);
  });

  ipcMain.handle('tasks:toggle', (_event, taskId: string) => {
    const task = toggleTask(taskId);

    if (!task) {
      throw new Error(`Task "${taskId}" was not found.`);
    }

    return task;
  });

  ipcMain.handle('tasks:update', (_event, input: UpdateTaskInput) => {
    if (!input.title.trim()) {
      throw new Error('Task title is required.');
    }

    const task = updateTask(input);

    if (!task) {
      throw new Error(`Task "${input.id}" was not found.`);
    }

    return task;
  });

  ipcMain.handle('tasks:delete', (_event, taskId: string) => {
    const wasDeleted = deleteTask(taskId);

    if (!wasDeleted) {
      throw new Error(`Task "${taskId}" was not found.`);
    }

    return taskId;
  });

  ipcMain.handle('tasks:delete-many', (_event, taskIds: string[]) => deleteTasks(taskIds));

  ipcMain.handle('notes:update', (_event, input: { scope: TaskScope; text: string; categoryId?: string }) =>
    updateNote(input.scope, input.text, input.categoryId),
  );

  ipcMain.handle('profile:update', (_event, input: UpdateProfileInput) => {
    if (!input.name.trim()) {
      throw new Error('Profile name is required.');
    }

    const profile = updateProfile(input);

    if (!profile) {
      throw new Error(`Profile "${input.id}" was not found.`);
    }

    return profile;
  });

  ipcMain.handle('workspace:update', (_event, input: UpdateWorkspaceInput) => {
    if (!input.title.trim()) {
      throw new Error('Workspace title is required.');
    }

    const workspace = updateWorkspace(input);

    if (!workspace) {
      throw new Error(`Workspace "${input.id}" was not found.`);
    }

    return workspace;
  });
};
