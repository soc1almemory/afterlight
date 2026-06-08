import crypto from 'node:crypto';
import type {
  AppData,
  Category,
  CategoryIconMode,
  CreateCategoryInput,
  CreateTaskInput,
  Note,
  ProfileSetupInput,
  Task,
  TaskPriority,
  TaskScope,
  TaskStatus,
  UpdateCategoryInput,
  UpdateProfileInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  UserProfile,
  Workspace,
} from '../../shared/types';
import { getDatabase } from './database';

const DEFAULT_PROFILE_NAME = 'Username';
const DEFAULT_PROFILE_EMAIL = 'username@gmail.com';
const DEFAULT_WORKSPACE_TITLE = 'Личное пространство';

interface CategoryRow {
  id: string;
  title: string;
  color: string;
  icon_mode: string;
  emoji: string | null;
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

interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  avatar_data_url: string | null;
  active_workspace_id: string;
  is_setup_complete: number;
}

interface WorkspaceRow {
  id: string;
  profile_id: string;
  title: string;
}

export const listAppData = (): AppData => ({
  categories: listCategories(),
  notes: listNotes(),
  profile: getProfile(),
  tasks: listTasks(),
  workspace: getActiveWorkspace(),
});

export const listCategories = (): Category[] => {
  const workspaceId = getActiveWorkspaceId();
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, color, icon_mode, emoji, is_favorite
       FROM categories
       WHERE workspace_id = @workspaceId
       ORDER BY is_favorite DESC, created_at ASC`,
    )
    .all({ workspaceId }) as CategoryRow[];

  return rows.map(mapCategory);
};

export const createCategory = (input: CreateCategoryInput): Category => {
  const workspaceId = getActiveWorkspaceId();
  const category: Category = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    color: normalizeColor(input.color),
    emoji: cleanOptional(input.emoji),
    iconMode: normalizeIconMode(input.iconMode, input.emoji),
    isFavorite: Boolean(input.isFavorite),
  };

  getDatabase()
    .prepare(
      `INSERT INTO categories (id, workspace_id, title, color, icon_mode, emoji, is_favorite)
       VALUES (@id, @workspaceId, @title, @color, @iconMode, @emoji, @isFavorite)`,
    )
    .run({
      ...category,
      workspaceId,
      emoji: category.emoji ?? null,
      isFavorite: Number(category.isFavorite),
    });

  return category;
};

export const updateCategory = (input: UpdateCategoryInput): Category | null => {
  const workspaceId = getActiveWorkspaceId();
  const existing = getCategory(input.id);

  if (!existing) {
    return null;
  }

  getDatabase()
    .prepare(
      `UPDATE categories
       SET title = @title,
           color = @color,
           icon_mode = @iconMode,
           emoji = @emoji,
           is_favorite = @isFavorite
       WHERE id = @id AND workspace_id = @workspaceId`,
    )
    .run({
      id: input.id,
      workspaceId,
      title: input.title.trim(),
      color: normalizeColor(input.color),
      emoji: cleanOptional(input.emoji) ?? null,
      iconMode: normalizeIconMode(input.iconMode, input.emoji),
      isFavorite: Number(input.isFavorite),
    });

  return getCategory(input.id);
};

export const toggleCategoryFavorite = (categoryId: string): Category | null => {
  const workspaceId = getActiveWorkspaceId();
  const category = getCategory(categoryId);

  if (!category) {
    return null;
  }

  getDatabase()
    .prepare('UPDATE categories SET is_favorite = @isFavorite WHERE id = @id AND workspace_id = @workspaceId')
    .run({ id: categoryId, workspaceId, isFavorite: Number(!category.isFavorite) });

  return getCategory(categoryId);
};

export const deleteCategory = (categoryId: string): boolean => {
  const database = getDatabase();
  const workspaceId = getActiveWorkspaceId();
  const remove = database.transaction(() => {
    database
      .prepare(
        `UPDATE tasks
         SET category_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE category_id = @categoryId AND workspace_id = @workspaceId`,
      )
      .run({ categoryId, workspaceId });
    database
      .prepare('DELETE FROM notes WHERE category_id = @categoryId AND workspace_id = @workspaceId')
      .run({ categoryId, workspaceId });
    return database
      .prepare('DELETE FROM categories WHERE id = @categoryId AND workspace_id = @workspaceId')
      .run({ categoryId, workspaceId });
  });

  const result = remove();
  return result.changes > 0;
};

export const listTasks = (): Task[] => {
  refreshTaskExpiration();

  const workspaceId = getActiveWorkspaceId();
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired
       FROM tasks
       WHERE workspace_id = @workspaceId
       ORDER BY status ASC, due_date ASC, created_at DESC`,
    )
    .all({ workspaceId }) as TaskRow[];

  return rows.map(mapTask);
};

export const createTask = (input: CreateTaskInput): Task => {
  const workspaceId = getActiveWorkspaceId();
  const categoryId = cleanOptional(input.categoryId);
  const task: Task = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: cleanOptional(input.description),
    dueDate: normalizeDate(input.dueDate),
    dueLabel: cleanOptional(input.dueLabel),
    priority: input.priority ?? 4,
    status: 'active',
    scope: input.scope,
    categoryId: categoryId && getCategory(categoryId) ? categoryId : undefined,
    isExpired: false,
  };

  getDatabase()
    .prepare(
      `INSERT INTO tasks (id, workspace_id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired)
       VALUES (@id, @workspaceId, @title, @description, @dueDate, @dueLabel, @priority, @status, @scope, @categoryId, @isExpired)`,
    )
    .run({
      ...task,
      workspaceId,
      description: task.description ?? null,
      dueDate: task.dueDate ?? null,
      dueLabel: task.dueLabel ?? null,
      categoryId: task.categoryId ?? null,
      isExpired: Number(Boolean(task.isExpired)),
    });

  refreshTaskExpiration();

  return task;
};

export const toggleTask = (taskId: string): Task | null => {
  const workspaceId = getActiveWorkspaceId();
  const task = getTask(taskId);

  if (!task) {
    return null;
  }

  const nextStatus: TaskStatus = task.status === 'completed' ? 'active' : 'completed';
  getDatabase()
    .prepare(
      `UPDATE tasks
       SET status = @status, updated_at = CURRENT_TIMESTAMP
       WHERE id = @id AND workspace_id = @workspaceId`,
    )
    .run({ id: taskId, workspaceId, status: nextStatus });

  refreshTaskExpiration();

  return getTask(taskId);
};

export const updateTask = (input: UpdateTaskInput): Task | null => {
  const workspaceId = getActiveWorkspaceId();
  const existingTask = getTask(input.id);
  const categoryId = cleanOptional(input.categoryId);

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
           scope = @scope,
           category_id = @categoryId,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @id AND workspace_id = @workspaceId`,
    )
    .run({
      id: input.id,
      workspaceId,
      title: input.title.trim(),
      description: cleanOptional(input.description) ?? null,
      dueDate: normalizeDate(input.dueDate) ?? null,
      dueLabel: cleanOptional(input.dueLabel) ?? null,
      priority: input.priority,
      scope: input.scope ?? existingTask.scope,
      categoryId: categoryId && getCategory(categoryId) ? categoryId : null,
    });

  refreshTaskExpiration();

  return getTask(input.id);
};

export const deleteTask = (taskId: string): boolean => {
  const result = getDatabase()
    .prepare('DELETE FROM tasks WHERE id = @taskId AND workspace_id = @workspaceId')
    .run({ taskId, workspaceId: getActiveWorkspaceId() });
  return result.changes > 0;
};

export const updateNote = (scope: TaskScope, text: string, categoryId?: string): Note => {
  const cleanCategoryId = cleanOptional(categoryId);
  const workspaceId = getActiveWorkspaceId();
  const existing = getDatabase()
    .prepare(
      `SELECT id FROM notes
       WHERE workspace_id = @workspaceId
         AND scope = @scope
         AND ((category_id IS NULL AND @categoryId IS NULL) OR category_id = @categoryId)`,
    )
    .get({ workspaceId, scope, categoryId: cleanCategoryId ?? null }) as { id: string } | undefined;
  const id = existing?.id ?? crypto.randomUUID();

  getDatabase()
    .prepare(
      `INSERT INTO notes (id, workspace_id, scope, category_id, text, updated_at)
       VALUES (@id, @workspaceId, @scope, @categoryId, @text, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = CURRENT_TIMESTAMP`,
    )
    .run({ id, workspaceId, scope, categoryId: cleanCategoryId ?? null, text });

  return { id, scope, categoryId: cleanCategoryId, text };
};

export const updateProfile = (input: UpdateProfileInput): UserProfile | null => {
  const existing = getProfileById(input.id);

  if (!existing) {
    return null;
  }

  getDatabase()
    .prepare(
      `UPDATE profiles
       SET name = @name,
           email = @email,
           avatar_data_url = @avatarDataUrl,
           password_hash = COALESCE(@passwordHash, password_hash),
           is_setup_complete = @isSetupComplete,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`,
    )
    .run({
      id: input.id,
      name: cleanOptional(input.name) ?? existing.name,
      email: cleanOptional(input.email) ?? null,
      avatarDataUrl: cleanOptional(input.avatarDataUrl) ?? null,
      passwordHash: input.password ? hashPassword(input.password) : null,
      isSetupComplete: Number(input.isSetupComplete ?? existing.isSetupComplete),
    });

  return getProfileById(input.id);
};

export const completeProfileSetup = (input: ProfileSetupInput): AppData => {
  const profile = getProfile();
  const workspace = getActiveWorkspace();

  updateProfile({
    ...profile,
    avatarDataUrl: input.avatarDataUrl,
    email: input.email,
    isSetupComplete: true,
    name: input.name,
    password: input.password,
  });
  updateWorkspace({ id: workspace.id, title: input.workspaceTitle });

  return listAppData();
};

export const resetProfile = (): AppData => {
  const database = getDatabase();
  const profile = getProfile();
  const workspace = getActiveWorkspace();
  const reset = database.transaction(() => {
    database.prepare('DELETE FROM notes WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database.prepare('DELETE FROM tasks WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database.prepare('DELETE FROM categories WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });

    database
      .prepare(
        `UPDATE profiles
         SET name = @name,
             email = @email,
             avatar_data_url = NULL,
             password_hash = NULL,
             active_workspace_id = @workspaceId,
             is_setup_complete = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @profileId`,
      )
      .run({
        profileId: profile.id,
        name: DEFAULT_PROFILE_NAME,
        email: DEFAULT_PROFILE_EMAIL,
        workspaceId: workspace.id,
      });

    database
      .prepare(
        `UPDATE workspaces
         SET title = @title,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @workspaceId`,
      )
      .run({ workspaceId: workspace.id, title: DEFAULT_WORKSPACE_TITLE });
  });

  reset();
  return listAppData();
};

export const updateWorkspace = (input: UpdateWorkspaceInput): Workspace | null => {
  const existing = getWorkspaceById(input.id);

  if (!existing) {
    return null;
  }

  getDatabase()
    .prepare(
      `UPDATE workspaces
       SET title = @title,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`,
    )
    .run({
      id: input.id,
      title: cleanOptional(input.title) ?? existing.title,
    });

  return getWorkspaceById(input.id);
};

const getTask = (taskId: string): Task | null => {
  refreshTaskExpiration();

  const row = getDatabase()
    .prepare(
      `SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired
       FROM tasks
       WHERE id = @taskId AND workspace_id = @workspaceId`,
    )
    .get({ taskId, workspaceId: getActiveWorkspaceId() }) as TaskRow | undefined;

  return row ? mapTask(row) : null;
};

const getCategory = (categoryId: string): Category | null => {
  const row = getDatabase()
    .prepare(
      `SELECT id, title, color, icon_mode, emoji, is_favorite
       FROM categories
       WHERE id = @categoryId AND workspace_id = @workspaceId`,
    )
    .get({ categoryId, workspaceId: getActiveWorkspaceId() }) as CategoryRow | undefined;

  return row ? mapCategory(row) : null;
};

const listNotes = (): Note[] => {
  const workspaceId = getActiveWorkspaceId();
  const rows = getDatabase()
    .prepare(
      `SELECT id, scope, category_id, text
       FROM notes
       WHERE workspace_id = @workspaceId
       ORDER BY updated_at DESC`,
    )
    .all({ workspaceId }) as NoteRow[];

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
  emoji: row.emoji ?? undefined,
  iconMode: normalizeIconMode(row.icon_mode, row.emoji ?? undefined),
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

const getProfile = (): UserProfile => {
  const row = getDatabase()
    .prepare(
      `SELECT id, name, email, avatar_data_url, active_workspace_id, is_setup_complete
       FROM profiles
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .get() as ProfileRow | undefined;

  if (!row) {
    throw new Error('User profile was not initialized.');
  }

  return mapProfile(row);
};

const getProfileById = (profileId: string): UserProfile | null => {
  const row = getDatabase()
    .prepare(
      `SELECT id, name, email, avatar_data_url, active_workspace_id, is_setup_complete
       FROM profiles
       WHERE id = ?`,
    )
    .get(profileId) as ProfileRow | undefined;

  return row ? mapProfile(row) : null;
};

const getActiveWorkspace = (): Workspace => {
  const profile = getProfile();
  const workspace = getWorkspaceById(profile.activeWorkspaceId);

  if (!workspace) {
    throw new Error('Active workspace was not initialized.');
  }

  return workspace;
};

const getWorkspaceById = (workspaceId: string): Workspace | null => {
  const row = getDatabase()
    .prepare('SELECT id, profile_id, title FROM workspaces WHERE id = ?')
    .get(workspaceId) as WorkspaceRow | undefined;

  return row ? mapWorkspace(row) : null;
};

const getActiveWorkspaceId = () => getProfile().activeWorkspaceId;

const mapProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  name: row.name,
  email: row.email ?? undefined,
  avatarDataUrl: row.avatar_data_url ?? undefined,
  activeWorkspaceId: row.active_workspace_id,
  isSetupComplete: Boolean(row.is_setup_complete),
});

const mapWorkspace = (row: WorkspaceRow): Workspace => ({
  id: row.id,
  profileId: row.profile_id,
  title: row.title,
});

const cleanOptional = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue ? cleanValue : undefined;
};

const normalizeIconMode = (value: string | undefined, emoji: string | undefined | null): CategoryIconMode => {
  if (value === 'emoji') {
    return cleanOptional(emoji ?? undefined) ? 'emoji' : 'hash';
  }

  if (value === 'hash') {
    return 'hash';
  }

  return 'color';
};

const normalizeColor = (color: string) => {
  const cleanColor = color.trim();
  return /^#[0-9a-f]{6}$/i.test(cleanColor) ? cleanColor : '#7c65ff';
};

const normalizeDate = (date: string | undefined) => {
  const cleanDate = date?.trim();
  return cleanDate && /^\d{4}-\d{2}-\d{2}$/.test(cleanDate) ? cleanDate : undefined;
};

const hashPassword = (password: string) => crypto.createHash('sha256').update(password).digest('hex');

const refreshTaskExpiration = () => {
  const today = getTodayDate();
  const workspaceId = getActiveWorkspaceId();

  getDatabase()
    .prepare(
      `UPDATE tasks
       SET is_expired = CASE
         WHEN status = 'active' AND due_date IS NOT NULL AND due_date < @today THEN 1
         ELSE 0
       END
       WHERE workspace_id = @workspaceId`,
    )
    .run({ today, workspaceId });
};

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
