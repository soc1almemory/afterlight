import crypto from 'node:crypto';
import type { AppData, Category, CreateTaskInput, Note, Task, TaskPriority, TaskScope, TaskStatus } from '../../shared/types';
import { getDatabase } from './database';

interface CategoryRow {
  id: string;
  title: string;
  color: string;
  is_favorite: number;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: number;
  status: TaskStatus;
  scope: TaskScope;
  category_id: string | null;
  is_expired: number;
}

interface NoteRow {
  id: string;
  scope: TaskScope;
  text: string;
}

export const listAppData = (): AppData => ({
  categories: listCategories(),
  notes: listNotes(),
  tasks: listTasks(),
});

export const listCategories = (): Category[] => {
  const rows = getDatabase()
    .prepare('SELECT id, title, color, is_favorite FROM categories ORDER BY created_at ASC')
    .all() as CategoryRow[];

  return rows.map(mapCategory);
};

export const listTasks = (): Task[] => {
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, description, due_at, priority, status, scope, category_id, is_expired
       FROM tasks
       ORDER BY status ASC, created_at DESC`,
    )
    .all() as TaskRow[];

  return rows.map(mapTask);
};

export const createTask = (input: CreateTaskInput): Task => {
  const task: Task = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: cleanOptional(input.description),
    dueLabel: cleanOptional(input.dueLabel),
    priority: input.priority ?? 4,
    status: 'active',
    scope: input.scope,
    categoryId: cleanOptional(input.categoryId),
    isExpired: false,
  };

  getDatabase()
    .prepare(
      `INSERT INTO tasks (id, title, description, due_at, priority, status, scope, category_id, is_expired)
       VALUES (@id, @title, @description, @dueLabel, @priority, @status, @scope, @categoryId, @isExpired)`,
    )
    .run({
      ...task,
      description: task.description ?? null,
      dueLabel: task.dueLabel ?? null,
      categoryId: task.categoryId ?? null,
      isExpired: Number(Boolean(task.isExpired)),
    });

  return task;
};

export const toggleTask = (taskId: string): Task | null => {
  const task = getTask(taskId);

  if (!task) {
    return null;
  }

  const nextStatus: TaskStatus = task.status === 'completed' ? 'active' : 'completed';
  getDatabase()
    .prepare("UPDATE tasks SET status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id")
    .run({ id: taskId, status: nextStatus });

  return getTask(taskId);
};

export const updateNote = (scope: TaskScope, text: string): Note => {
  const existing = getDatabase().prepare('SELECT id FROM notes WHERE scope = ?').get(scope) as { id: string } | undefined;
  const id = existing?.id ?? crypto.randomUUID();

  getDatabase()
    .prepare(
      `INSERT INTO notes (id, scope, text, updated_at)
       VALUES (@id, @scope, @text, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = CURRENT_TIMESTAMP`,
    )
    .run({ id, scope, text });

  return { id, scope, text };
};

const getTask = (taskId: string): Task | null => {
  const row = getDatabase()
    .prepare('SELECT id, title, description, due_at, priority, status, scope, category_id, is_expired FROM tasks WHERE id = ?')
    .get(taskId) as TaskRow | undefined;

  return row ? mapTask(row) : null;
};

const listNotes = (): Note[] => {
  const rows = getDatabase().prepare('SELECT id, scope, text FROM notes ORDER BY updated_at DESC').all() as NoteRow[];

  return rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    text: row.text,
  }));
};

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  title: row.title,
  color: row.color,
  isFavorite: Boolean(row.is_favorite),
});

const mapTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  dueLabel: row.due_at ?? undefined,
  priority: row.priority as TaskPriority,
  status: row.status,
  scope: row.scope,
  categoryId: row.category_id ?? undefined,
  isExpired: Boolean(row.is_expired),
});

const cleanOptional = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue ? cleanValue : undefined;
};
