import { ipcMain } from 'electron';
import type { CreateTaskInput, TaskScope } from '../../shared/types';
import { createTask, listAppData, listCategories, toggleTask, updateNote } from '../storage/repositories';

export const registerTaskIpcHandlers = () => {
  ipcMain.handle('app-data:load', () => listAppData());
  ipcMain.handle('categories:list', () => listCategories());

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

  ipcMain.handle('notes:update', (_event, input: { scope: TaskScope; text: string }) =>
    updateNote(input.scope, input.text),
  );
};
