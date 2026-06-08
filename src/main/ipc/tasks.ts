import { ipcMain } from 'electron';
import type {
  CreateCategoryInput,
  CreateTaskInput,
  TaskScope,
  UpdateCategoryInput,
  UpdateTaskInput,
} from '../../shared/types';
import {
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  listAppData,
  listCategories,
  toggleCategoryFavorite,
  toggleTask,
  updateCategory,
  updateNote,
  updateTask,
} from '../storage/repositories';

export const registerTaskIpcHandlers = () => {
  ipcMain.handle('app-data:load', () => listAppData());
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

  ipcMain.handle('notes:update', (_event, input: { scope: TaskScope; text: string; categoryId?: string }) =>
    updateNote(input.scope, input.text, input.categoryId),
  );
};
