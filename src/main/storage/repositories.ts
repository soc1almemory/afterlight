import crypto from 'node:crypto';
import type {
  AppData,
  AppSettings,
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
  UpdateSettingsInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  UserProfile,
  Workspace,
} from '../../shared/types';
import { getDatabase } from './database';

const defaultSettings: AppSettings = {
  autoBackupEnabled: true,
  autoBackupIntervalHours: 24,
  autoCollapseSidebar: false,
  autosaveNotesIntervalSeconds: 1,
  categorySortMode: 'created',
  closeBehavior: 'exit',
  confirmCategoryDelete: true,
  confirmExit: false,
  confirmTaskDelete: true,
  countCompletedTasks: true,
  counterCriticalAt: 31,
  counterHighAt: 16,
  counterMediumAt: 6,
  highlightTodayInWeek: true,
  includeTodayDueTasks: true,
  language: 'ru',
  launchMinimized: false,
  launchWithWindows: false,
  minimizeToTrayOnClose: false,
  deadlineNotifyBeforeMinutes: 60,
  notifyBeforeTodayRefresh: false,
  notifyDeadlines: false,
  notifyOverdue: false,
  notesLineLimit: 50,
  overdueNotifyEveryMinutes: 240,
  openMode: 'normal',
  restoreTabs: false,
  restoreWindowState: 'normal',
  showCategoryCounts: true,
  showLastModified: true,
  showSidebarCounts: true,
  showTabBar: true,
  showTodayOverdueFirst: true,
  sortCompletedTasksLast: true,
  showWeekNoDate: true,
  startSection: 'inbox',
  taskSortMode: 'created',
  theme: 'light',
  todayRefreshNotifyBeforeMinutes: 10,
  todayRefreshTime: '00:00',
  trayEnabled: true,
  weekOrderMode: 'monday',
};

const DEFAULT_PROFILE_NAME = 'Username';
const DEFAULT_PROFILE_EMAIL = 'username@gmail.com';
const SQL_BATCH_SIZE = 500;
const DEFAULT_WORKSPACE_TITLE = 'Личное пространство';

interface CategoryRow {
  id: string;
  title: string;
  color: string;
  icon_mode: string;
  emoji: string | null;
  is_favorite: number;
  updated_at: string | null;
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
  updated_at: string;
}

interface DeletedCategoryRow {
  category_id: string;
  deleted_at: string;
}

interface DeletedTaskRow {
  task_id: string;
  deleted_at: string;
}

interface NoteRow {
  id: string;
  scope: TaskScope;
  category_id: string | null;
  text: string;
  updated_at: string;
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
  settings: getSettings(),
  tasks: listTasks(),
  workspace: getActiveWorkspace(),
});

export const updateSettings = (input: UpdateSettingsInput): AppSettings => {
  const workspaceId = getActiveWorkspaceId();
  const settings = normalizeSettings({ ...getSettings(), ...input });

  getDatabase()
    .prepare(
      `INSERT INTO app_settings (workspace_id, settings_json, updated_at)
       VALUES (@workspaceId, @settingsJson, CURRENT_TIMESTAMP)
       ON CONFLICT(workspace_id) DO UPDATE SET
         settings_json = excluded.settings_json,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run({ workspaceId, settingsJson: JSON.stringify(settings) });

  return settings;
};

export const listCategories = (): Category[] => {
  const workspaceId = getActiveWorkspaceId();
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, color, icon_mode, emoji, is_favorite, updated_at
       FROM categories
       WHERE workspace_id = @workspaceId
       ORDER BY created_at ASC`,
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
      `INSERT INTO categories (id, workspace_id, title, color, icon_mode, emoji, is_favorite, updated_at)
       VALUES (@id, @workspaceId, @title, @color, @iconMode, @emoji, @isFavorite, CURRENT_TIMESTAMP)`,
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
           is_favorite = @isFavorite,
           updated_at = CURRENT_TIMESTAMP
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
    .prepare(
      `UPDATE categories
       SET is_favorite = @isFavorite,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @id AND workspace_id = @workspaceId`,
    )
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
    const result = database
      .prepare('DELETE FROM categories WHERE id = @categoryId AND workspace_id = @workspaceId')
      .run({ categoryId, workspaceId });
    if (result.changes > 0) {
      rememberDeletedCategory(categoryId, workspaceId);
    }

    return result;
  });

  const result = remove();
  return result.changes > 0;
};

export const listTasks = (): Task[] => {
  refreshTaskExpiration();

  const workspaceId = getActiveWorkspaceId();
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired, updated_at
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
    dueLabel: normalizeDueTime(input.dueLabel),
    priority: normalizePriority(input.priority),
    status: 'active',
    scope: normalizeScope(input.scope),
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

  return getTask(task.id) ?? task;
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
      dueLabel: normalizeDueTime(input.dueLabel) ?? null,
      priority: normalizePriority(input.priority),
      scope: input.scope ? normalizeScope(input.scope) : existingTask.scope,
      categoryId: categoryId && getCategory(categoryId) ? categoryId : null,
    });

  refreshTaskExpiration();

  return getTask(input.id);
};

export const deleteTask = (taskId: string): boolean => {
  const database = getDatabase();
  const workspaceId = getActiveWorkspaceId();
  const remove = database.transaction(() => {
    const result = database
      .prepare('DELETE FROM tasks WHERE id = @taskId AND workspace_id = @workspaceId')
      .run({ taskId, workspaceId });
    if (result.changes > 0) {
      rememberDeletedTask(taskId, workspaceId);
    }

    return result;
  });

  return remove().changes > 0;
};

export const deleteTasks = (taskIds: string[]): string[] => {
  const cleanTaskIds = [...new Set(taskIds.filter(Boolean))];

  if (cleanTaskIds.length === 0) {
    return [];
  }

  const database = getDatabase();
  const workspaceId = getActiveWorkspaceId();
  const deletedTaskIds: string[] = [];
  const runDelete = database.transaction((ids: string[]) => {
    chunkItems(ids, SQL_BATCH_SIZE).forEach((chunk) => {
      const placeholders = chunk.map(() => '?').join(', ');
      const params = [workspaceId, ...chunk];
      const existingRows = database
        .prepare(`SELECT id FROM tasks WHERE workspace_id = ? AND id IN (${placeholders})`)
        .all(...params) as Array<{ id: string }>;

      if (existingRows.length === 0) {
        return;
      }

      database.prepare(`DELETE FROM tasks WHERE workspace_id = ? AND id IN (${placeholders})`).run(...params);
      existingRows.forEach((row) => rememberDeletedTask(row.id, workspaceId));
      deletedTaskIds.push(...existingRows.map((row) => row.id));
    });
  });

  runDelete(cleanTaskIds);
  return deletedTaskIds;
};

export const applyTelegramServerSnapshot = (input: {
  categories?: Category[];
  deletedCategoryIds?: string[];
  deletedTaskIds?: string[];
  tasks?: Task[];
}): AppData => {
  const database = getDatabase();
  const workspaceId = getActiveWorkspaceId();

  const applySnapshot = database.transaction(() => {
    const upsertCategory = database.prepare(
      `INSERT INTO categories (id, workspace_id, title, color, icon_mode, emoji, is_favorite, updated_at)
       VALUES (@id, @workspaceId, @title, @color, @iconMode, @emoji, @isFavorite, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         color = excluded.color,
         icon_mode = excluded.icon_mode,
         emoji = excluded.emoji,
         is_favorite = excluded.is_favorite,
         updated_at = CASE
           WHEN categories.title IS NOT excluded.title
             OR categories.color IS NOT excluded.color
             OR categories.icon_mode IS NOT excluded.icon_mode
             OR categories.emoji IS NOT excluded.emoji
             OR categories.is_favorite IS NOT excluded.is_favorite
           THEN excluded.updated_at
           ELSE categories.updated_at
         END
       WHERE datetime(excluded.updated_at) >= datetime(categories.updated_at)`,
    );

    for (const category of input.categories ?? []) {
      if (!category.id || !category.title.trim()) {
        continue;
      }

      const updatedAt = normalizeImportedTimestamp(category.updatedAt);
      const deletedAt = getDeletedCategoryAt(category.id, workspaceId);
      if (deletedAt && compareSyncTimestamps(deletedAt, updatedAt) >= 0) {
        database.prepare('DELETE FROM categories WHERE id = @categoryId AND workspace_id = @workspaceId').run({
          categoryId: category.id,
          workspaceId,
        });
        continue;
      }

      upsertCategory.run({
        id: category.id,
        workspaceId,
        title: category.title.trim(),
        color: normalizeColor(category.color),
        emoji: cleanOptional(category.emoji) ?? null,
        iconMode: normalizeIconMode(category.iconMode, category.emoji),
        isFavorite: Number(category.isFavorite),
        updatedAt,
      });
    }

    const upsertTask = database.prepare(
      `INSERT INTO tasks (id, workspace_id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired, updated_at)
       VALUES (@id, @workspaceId, @title, @description, @dueDate, @dueLabel, @priority, @status, @scope, @categoryId, @isExpired, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         due_date = excluded.due_date,
         due_at = excluded.due_at,
         priority = excluded.priority,
         status = excluded.status,
         scope = excluded.scope,
         category_id = excluded.category_id,
         is_expired = excluded.is_expired,
         updated_at = CASE
           WHEN tasks.title IS NOT excluded.title
             OR tasks.description IS NOT excluded.description
             OR tasks.due_date IS NOT excluded.due_date
             OR tasks.due_at IS NOT excluded.due_at
             OR tasks.priority IS NOT excluded.priority
             OR tasks.status IS NOT excluded.status
             OR tasks.scope IS NOT excluded.scope
             OR tasks.category_id IS NOT excluded.category_id
           THEN excluded.updated_at
           ELSE tasks.updated_at
         END
       WHERE datetime(excluded.updated_at) >= datetime(tasks.updated_at)`,
    );

    for (const task of input.tasks ?? []) {
      if (!task.id || !task.title.trim()) {
        continue;
      }

      const updatedAt = normalizeImportedTimestamp(task.updatedAt);
      const deletedAt = getDeletedTaskAt(task.id, workspaceId);
      if (deletedAt && compareSyncTimestamps(deletedAt, updatedAt) >= 0) {
        database.prepare('DELETE FROM tasks WHERE id = @taskId AND workspace_id = @workspaceId').run({ taskId: task.id, workspaceId });
        continue;
      }

      const categoryId = cleanOptional(task.categoryId);
      upsertTask.run({
        id: task.id,
        workspaceId,
        title: task.title.trim(),
        description: cleanOptional(task.description) ?? null,
        dueDate: normalizeDate(task.dueDate) ?? null,
        dueLabel: normalizeDueTime(task.dueLabel) ?? null,
        priority: normalizePriority(task.priority),
        status: task.status === 'completed' ? 'completed' : 'active',
        scope: normalizeScope(task.scope),
        categoryId: categoryId && getCategory(categoryId) ? categoryId : null,
        isExpired: Number(Boolean(task.isExpired)),
        updatedAt,
      });
    }

    const deletedCategoryIds = [...new Set((input.deletedCategoryIds ?? []).filter(Boolean))];
    for (const categoryId of deletedCategoryIds) {
      database
        .prepare(
          `UPDATE tasks
           SET category_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE category_id = @categoryId AND workspace_id = @workspaceId`,
        )
        .run({ categoryId, workspaceId });
      database.prepare('DELETE FROM notes WHERE category_id = @categoryId AND workspace_id = @workspaceId').run({
        categoryId,
        workspaceId,
      });
      database.prepare('DELETE FROM categories WHERE id = @categoryId AND workspace_id = @workspaceId').run({
        categoryId,
        workspaceId,
      });
      rememberDeletedCategory(categoryId, workspaceId);
    }

    const deletedTaskIds = [...new Set((input.deletedTaskIds ?? []).filter(Boolean))];
    for (const taskId of deletedTaskIds) {
      database
        .prepare('DELETE FROM tasks WHERE id = @taskId AND workspace_id = @workspaceId')
        .run({ taskId, workspaceId });
      rememberDeletedTask(taskId, workspaceId);
    }
  });

  applySnapshot();
  refreshTaskExpiration();
  return listAppData();
};

export const listDeletedSyncState = () => {
  const workspaceId = getActiveWorkspaceId();
  const deletedCategories = getDatabase()
    .prepare('SELECT category_id, deleted_at FROM deleted_categories WHERE workspace_id = @workspaceId')
    .all({ workspaceId }) as DeletedCategoryRow[];
  const deletedTasks = getDatabase()
    .prepare('SELECT task_id, deleted_at FROM deleted_tasks WHERE workspace_id = @workspaceId')
    .all({ workspaceId }) as DeletedTaskRow[];

  return {
    deletedCategoryIds: deletedCategories.map((row) => row.category_id),
    deletedTaskIds: deletedTasks.map((row) => row.task_id),
  };
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

  const note = getDatabase()
    .prepare('SELECT id, scope, category_id, text, updated_at FROM notes WHERE id = @id AND workspace_id = @workspaceId')
    .get({ id, workspaceId }) as NoteRow | undefined;

  return note ? mapNote(note) : { id, scope, categoryId: cleanCategoryId, text };
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
           is_setup_complete = @isSetupComplete,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`,
    )
    .run({
      id: input.id,
      name: cleanOptional(input.name) ?? existing.name,
      email: cleanOptional(input.email) ?? null,
      avatarDataUrl: cleanOptional(input.avatarDataUrl) ?? null,
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
  });
  updateWorkspace({ id: workspace.id, title: input.workspaceTitle });

  return listAppData();
};

export const resetProfile = (): AppData => {
  const database = getDatabase();
  const profile = getProfile();
  const workspace = getActiveWorkspace();
  const reset = database.transaction(() => {
    database.prepare('DELETE FROM deleted_tasks WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database.prepare('DELETE FROM deleted_categories WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database.prepare('DELETE FROM notes WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database.prepare('DELETE FROM tasks WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database.prepare('DELETE FROM categories WHERE workspace_id = @workspaceId').run({ workspaceId: workspace.id });
    database
      .prepare(
        `INSERT INTO app_settings (workspace_id, settings_json, updated_at)
         VALUES (@workspaceId, @settingsJson, CURRENT_TIMESTAMP)
         ON CONFLICT(workspace_id) DO UPDATE SET
           settings_json = excluded.settings_json,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .run({ workspaceId: workspace.id, settingsJson: JSON.stringify(defaultSettings) });

    database
      .prepare(
        `UPDATE profiles
         SET name = @name,
             email = @email,
             avatar_data_url = NULL,
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
      `SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired, updated_at
       FROM tasks
       WHERE id = @taskId AND workspace_id = @workspaceId`,
    )
    .get({ taskId, workspaceId: getActiveWorkspaceId() }) as TaskRow | undefined;

  return row ? mapTask(row) : null;
};

const getCategory = (categoryId: string): Category | null => {
  const row = getDatabase()
    .prepare(
      `SELECT id, title, color, icon_mode, emoji, is_favorite, updated_at
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
      `SELECT id, scope, category_id, text, updated_at
       FROM notes
       WHERE workspace_id = @workspaceId
       ORDER BY updated_at DESC`,
    )
    .all({ workspaceId }) as NoteRow[];

  return rows.map(mapNote);
};

const mapNote = (row: NoteRow): Note => ({
  id: row.id,
  scope: row.scope,
  categoryId: row.category_id ?? undefined,
  text: row.text,
  updatedAt: row.updated_at,
});

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  title: row.title,
  color: row.color,
  emoji: row.emoji ?? undefined,
  iconMode: normalizeIconMode(row.icon_mode, row.emoji ?? undefined),
  isFavorite: Boolean(row.is_favorite),
  updatedAt: row.updated_at ?? undefined,
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
  updatedAt: row.updated_at,
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

const getSettings = (): AppSettings => {
  const workspaceId = getActiveWorkspaceId();
  const row = getDatabase()
    .prepare('SELECT settings_json FROM app_settings WHERE workspace_id = ?')
    .get(workspaceId) as { settings_json: string } | undefined;

  if (!row) {
    getDatabase()
      .prepare(
        `INSERT INTO app_settings (workspace_id, settings_json, updated_at)
         VALUES (@workspaceId, @settingsJson, CURRENT_TIMESTAMP)`,
      )
      .run({ workspaceId, settingsJson: JSON.stringify(defaultSettings) });
    return defaultSettings;
  }

  try {
    return normalizeSettings(JSON.parse(row.settings_json) as Partial<AppSettings>);
  } catch {
    return defaultSettings;
  }
};

const normalizeSettings = (settings: Partial<AppSettings>): AppSettings => ({
  ...defaultSettings,
  ...settings,
  autosaveNotesIntervalSeconds: clampNumber(settings.autosaveNotesIntervalSeconds, 1, 30, defaultSettings.autosaveNotesIntervalSeconds),
  autoBackupIntervalHours: clampNumber(settings.autoBackupIntervalHours, 1, 168, defaultSettings.autoBackupIntervalHours),
  counterCriticalAt: clampNumber(settings.counterCriticalAt, 1, 999, defaultSettings.counterCriticalAt),
  deadlineNotifyBeforeMinutes: clampNumber(settings.deadlineNotifyBeforeMinutes, 1, 10080, defaultSettings.deadlineNotifyBeforeMinutes),
  counterHighAt: clampNumber(settings.counterHighAt, 1, 999, defaultSettings.counterHighAt),
  counterMediumAt: clampNumber(settings.counterMediumAt, 1, 999, defaultSettings.counterMediumAt),
  closeBehavior: normalizeOneOf(settings.closeBehavior, ['ask', 'exit', 'tray'], defaultSettings.closeBehavior),
  language: normalizeOneOf(settings.language, ['ru', 'en'], defaultSettings.language),
  notesLineLimit: clampNumber(settings.notesLineLimit, 5, 200, defaultSettings.notesLineLimit),
  overdueNotifyEveryMinutes: clampNumber(settings.overdueNotifyEveryMinutes, 5, 10080, defaultSettings.overdueNotifyEveryMinutes),
  restoreWindowState: normalizeOneOf(settings.restoreWindowState, ['normal', 'maximized', 'fullscreen'], defaultSettings.restoreWindowState),
  theme: normalizeOneOf(settings.theme, ['light', 'dark'], defaultSettings.theme),
  todayRefreshNotifyBeforeMinutes: clampNumber(
    settings.todayRefreshNotifyBeforeMinutes,
    1,
    1440,
    defaultSettings.todayRefreshNotifyBeforeMinutes,
  ),
  todayRefreshTime: normalizeTime(settings.todayRefreshTime),
});

const clampNumber = (value: number | undefined, min: number, max: number, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
};

const normalizeTime = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue && /^\d{2}:\d{2}$/.test(cleanValue) ? cleanValue : defaultSettings.todayRefreshTime;
};

const normalizeImportedTimestamp = (value: string | undefined) => {
  const cleanValue = value?.trim();
  const date = cleanValue ? new Date(cleanValue.includes('T') ? cleanValue : `${cleanValue.replace(' ', 'T')}Z`) : undefined;
  return date && !Number.isNaN(date.getTime()) ? cleanValue ?? new Date().toISOString() : new Date().toISOString();
};

const compareSyncTimestamps = (first: string, second: string) => normalizeSyncTimestamp(first) - normalizeSyncTimestamp(second);

const normalizeSyncTimestamp = (value: string) => {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getDeletedCategoryAt = (categoryId: string, workspaceId: string) => {
  const row = getDatabase()
    .prepare('SELECT deleted_at FROM deleted_categories WHERE workspace_id = @workspaceId AND category_id = @categoryId')
    .get({ categoryId, workspaceId }) as { deleted_at: string } | undefined;

  return row?.deleted_at;
};

const getDeletedTaskAt = (taskId: string, workspaceId: string) => {
  const row = getDatabase()
    .prepare('SELECT deleted_at FROM deleted_tasks WHERE workspace_id = @workspaceId AND task_id = @taskId')
    .get({ taskId, workspaceId }) as { deleted_at: string } | undefined;

  return row?.deleted_at;
};

const rememberDeletedCategory = (categoryId: string, workspaceId: string) => {
  getDatabase()
    .prepare(
      `INSERT INTO deleted_categories (workspace_id, category_id, deleted_at)
       VALUES (@workspaceId, @categoryId, CURRENT_TIMESTAMP)
       ON CONFLICT(workspace_id, category_id) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
    )
    .run({ categoryId, workspaceId });
};

const rememberDeletedTask = (taskId: string, workspaceId: string) => {
  getDatabase()
    .prepare(
      `INSERT INTO deleted_tasks (workspace_id, task_id, deleted_at)
       VALUES (@workspaceId, @taskId, CURRENT_TIMESTAMP)
       ON CONFLICT(workspace_id, task_id) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
    )
    .run({ taskId, workspaceId });
};

const normalizeOneOf = <T extends string>(value: string | undefined, allowed: T[], fallback: T) =>
  allowed.includes(value as T) ? (value as T) : fallback;

const normalizePriority = (value: unknown): TaskPriority => {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  return 4;
};

const normalizeScope = (value: unknown): TaskScope => {
  if (value === 'today' || value === 'week' || value === 'category') {
    return value;
  }

  return 'inbox';
};

const cleanOptional = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue ? cleanValue : undefined;
};

const chunkItems = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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
  return cleanDate && isValidDateKey(cleanDate) ? cleanDate : undefined;
};

const normalizeDueTime = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue && /^\d{2}:\d{2}$/.test(cleanValue) ? cleanValue : undefined;
};

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

const isValidDateKey = (dateValue: string) => {
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
