import crypto from 'node:crypto';
import type {
  AppData,
  Category,
  CreateCategoryInput,
  CreateTaskInput,
  Note,
  Task,
  TaskPriority,
  TaskScope,
  TaskStatus,
  UpdateCategoryInput,
  UpdateTaskInput,
} from '../../shared/types';
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
  due_date: string | null;
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
  category_id: string | null;
  text: string;
}

export const listAppData = (): AppData => ({
  categories: listCategories(),
  notes: listNotes(),
  tasks: listTasks(),
});

export const listCategories = (): Category[] => {
  const rows = getDatabase()
    .prepare('SELECT id, title, color, is_favorite FROM categories ORDER BY is_favorite DESC, created_at ASC')
    .all() as CategoryRow[];

  return rows.map(mapCategory);
};

export const createCategory = (input: CreateCategoryInput): Category => {
  const category: Category = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    color: normalizeColor(input.color),
    isFavorite: Boolean(input.isFavorite),
  };

  getDatabase()
    .prepare(
      `INSERT INTO categories (id, title, color, is_favorite)
       VALUES (@id, @title, @color, @isFavorite)`,
    )
    .run({
      ...category,
      isFavorite: Number(category.isFavorite),
    });

  return category;
};

export const updateCategory = (input: UpdateCategoryInput): Category | null => {
  const existing = getCategory(input.id);

  if (!existing) {
    return null;
  }

  getDatabase()
    .prepare(
      `UPDATE categories
       SET title = @title,
           color = @color,
           is_favorite = @isFavorite
       WHERE id = @id`,
    )
    .run({
      id: input.id,
      title: input.title.trim(),
      color: normalizeColor(input.color),
      isFavorite: Number(input.isFavorite),
    });

  return getCategory(input.id);
};

export const toggleCategoryFavorite = (categoryId: string): Category | null => {
  const category = getCategory(categoryId);

  if (!category) {
    return null;
  }

  getDatabase()
    .prepare('UPDATE categories SET is_favorite = @isFavorite WHERE id = @id')
    .run({ id: categoryId, isFavorite: Number(!category.isFavorite) });

  return getCategory(categoryId);
};

export const deleteCategory = (categoryId: string): boolean => {
  const database = getDatabase();
  const remove = database.transaction(() => {
    database.prepare('UPDATE tasks SET category_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?').run(categoryId);
    database.prepare('DELETE FROM notes WHERE category_id = ?').run(categoryId);
    return database.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
  });

  const result = remove();
  return result.changes > 0;
};

export const listTasks = (): Task[] => {
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired
       FROM tasks
       ORDER BY status ASC, due_date ASC, created_at DESC`,
    )
    .all() as TaskRow[];

  return rows.map(mapTask);
};

export const createTask = (input: CreateTaskInput): Task => {
  const task: Task = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: cleanOptional(input.description),
    dueDate: normalizeDate(input.dueDate),
    dueLabel: cleanOptional(input.dueLabel),
    priority: input.priority ?? 4,
    status: 'active',
    scope: input.scope,
    categoryId: cleanOptional(input.categoryId),
    isExpired: false,
  };

  getDatabase()
    .prepare(
      `INSERT INTO tasks (id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired)
       VALUES (@id, @title, @description, @dueDate, @dueLabel, @priority, @status, @scope, @categoryId, @isExpired)`,
    )
    .run({
      ...task,
      description: task.description ?? null,
      dueDate: task.dueDate ?? null,
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

export const updateTask = (input: UpdateTaskInput): Task | null => {
  const existingTask = getTask(input.id);

  if (!existingTask) {
    return null;
  }

  getDatabase()
    .prepare(
      `UPDATE tasks
       SET title = @title,
           description = @description,
           due_date = @dueDate,
           due_at = @dueLabel,
           priority = @priority,
           category_id = @categoryId,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`,
    )
    .run({
      id: input.id,
      title: input.title.trim(),
      description: cleanOptional(input.description) ?? null,
      dueDate: normalizeDate(input.dueDate) ?? null,
      dueLabel: cleanOptional(input.dueLabel) ?? null,
      priority: input.priority,
      categoryId: cleanOptional(input.categoryId) ?? null,
    });

  return getTask(input.id);
};

export const deleteTask = (taskId: string): boolean => {
  const result = getDatabase().prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return result.changes > 0;
};

export const updateNote = (scope: TaskScope, text: string, categoryId?: string): Note => {
  const cleanCategoryId = cleanOptional(categoryId);
  const existing = getDatabase()
    .prepare(
      `SELECT id FROM notes
       WHERE scope = @scope
         AND ((category_id IS NULL AND @categoryId IS NULL) OR category_id = @categoryId)`,
    )
    .get({ scope, categoryId: cleanCategoryId ?? null }) as { id: string } | undefined;
  const id = existing?.id ?? crypto.randomUUID();

  getDatabase()
    .prepare(
      `INSERT INTO notes (id, scope, category_id, text, updated_at)
       VALUES (@id, @scope, @categoryId, @text, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = CURRENT_TIMESTAMP`,
    )
    .run({ id, scope, categoryId: cleanCategoryId ?? null, text });

  return { id, scope, categoryId: cleanCategoryId, text };
};

const getTask = (taskId: string): Task | null => {
  const row = getDatabase()
    .prepare('SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired FROM tasks WHERE id = ?')
    .get(taskId) as TaskRow | undefined;

  return row ? mapTask(row) : null;
};

const getCategory = (categoryId: string): Category | null => {
  const row = getDatabase()
    .prepare('SELECT id, title, color, is_favorite FROM categories WHERE id = ?')
    .get(categoryId) as CategoryRow | undefined;

  return row ? mapCategory(row) : null;
};

const listNotes = (): Note[] => {
  const rows = getDatabase()
    .prepare('SELECT id, scope, category_id, text FROM notes ORDER BY updated_at DESC')
    .all() as NoteRow[];

  return rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    categoryId: row.category_id ?? undefined,
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
  dueDate: row.due_date ?? undefined,
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

const normalizeColor = (color: string) => {
  const cleanColor = color.trim();
  return /^#[0-9a-f]{6}$/i.test(cleanColor) ? cleanColor : '#7c65ff';
};

const normalizeDate = (date: string | undefined) => {
  const cleanDate = date?.trim();
  return cleanDate && /^\d{4}-\d{2}-\d{2}$/.test(cleanDate) ? cleanDate : undefined;
};
