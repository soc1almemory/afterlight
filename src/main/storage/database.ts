import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

let connection: Database.Database | null = null;

const DEFAULT_PROFILE_ID = 'default-profile';
const DEFAULT_WORKSPACE_ID = 'default-workspace';

export const getStoragePaths = () => {
  const storageDir = path.join(app.getPath('userData'), 'storage');
  return {
    backupDir: path.join(storageDir, 'backups'),
    databasePath: path.join(storageDir, 'afterlight.sqlite'),
    storageDir,
  };
};

export const initializeDatabase = () => {
  if (connection) {
    return connection;
  }

  const { storageDir, databasePath } = getStoragePaths();
  fs.mkdirSync(storageDir, { recursive: true });

  connection = new Database(databasePath);
  connection.pragma('journal_mode = WAL');
  connection.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_data_url TEXT,
      is_setup_complete INTEGER NOT NULL DEFAULT 0,
      active_workspace_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(profile_id) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      icon_mode TEXT NOT NULL DEFAULT 'color',
      emoji TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      due_at TEXT,
      priority INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'active',
      scope TEXT NOT NULL DEFAULT 'inbox',
      category_id TEXT,
      is_expired INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      scope TEXT NOT NULL,
      category_id TEXT,
      text TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS deleted_categories (
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      category_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS deleted_tasks (
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      task_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      workspace_id TEXT PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_scope ON tasks(scope);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
  `);
  migrateDatabase(connection);
  seedProfileAndWorkspace(connection);
  connection.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_notes_scope_category ON notes(scope, category_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_categories_workspace ON categories(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_deleted_categories_workspace ON deleted_categories(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_deleted_tasks_workspace ON deleted_tasks(workspace_id);
  `);
  return connection;
};

export const getDatabase = () => connection ?? initializeDatabase();

const seedProfileAndWorkspace = (database: Database.Database) => {
  const profile = database.prepare('SELECT id FROM profiles LIMIT 1').get() as { id: string } | undefined;

  if (!profile) {
    database
      .prepare(
        `INSERT INTO profiles (id, name, email, active_workspace_id)
         VALUES (@id, @name, @email, @activeWorkspaceId)`,
      )
      .run({
        id: DEFAULT_PROFILE_ID,
        name: 'Username',
        email: 'username@gmail.com',
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      });
  }

  const workspace = database.prepare('SELECT id FROM workspaces LIMIT 1').get() as { id: string } | undefined;

  if (!workspace) {
    database
      .prepare(
        `INSERT INTO workspaces (id, profile_id, title)
         VALUES (@id, @profileId, @title)`,
      )
      .run({
        id: DEFAULT_WORKSPACE_ID,
        profileId: profile?.id ?? DEFAULT_PROFILE_ID,
        title: 'Личное пространство',
      });
  }

  database
    .prepare(
      `UPDATE profiles
       SET active_workspace_id = @workspaceId
       WHERE active_workspace_id IS NULL OR active_workspace_id = @emptyWorkspaceId`,
    )
    .run({ workspaceId: DEFAULT_WORKSPACE_ID, emptyWorkspaceId: '' });
};

const migrateDatabase = (database: Database.Database) => {
  const profileColumns = database.prepare('PRAGMA table_info(profiles)').all() as Array<{ name: string }>;
  const hasProfileSetupColumn = profileColumns.some((column) => column.name === 'is_setup_complete');

  if (!hasProfileSetupColumn) {
    database.exec('ALTER TABLE profiles ADD COLUMN is_setup_complete INTEGER NOT NULL DEFAULT 0');
  }

  const taskColumns = database.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
  const hasExpiredColumn = taskColumns.some((column) => column.name === 'is_expired');

  if (!hasExpiredColumn) {
    database.exec('ALTER TABLE tasks ADD COLUMN is_expired INTEGER NOT NULL DEFAULT 0');
  }

  const hasDueDateColumn = taskColumns.some((column) => column.name === 'due_date');

  if (!hasDueDateColumn) {
    database.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
  }

  const hasTaskWorkspaceColumn = taskColumns.some((column) => column.name === 'workspace_id');

  if (!hasTaskWorkspaceColumn) {
    database.exec(`ALTER TABLE tasks ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}'`);
  }

  const categoryColumns = database.prepare('PRAGMA table_info(categories)').all() as Array<{ name: string }>;
  const hasCategoryIconModeColumn = categoryColumns.some((column) => column.name === 'icon_mode');
  const hasCategoryEmojiColumn = categoryColumns.some((column) => column.name === 'emoji');
  const hasCategoryWorkspaceColumn = categoryColumns.some((column) => column.name === 'workspace_id');
  const hasCategoryUpdatedAtColumn = categoryColumns.some((column) => column.name === 'updated_at');

  if (!hasCategoryIconModeColumn) {
    database.exec("ALTER TABLE categories ADD COLUMN icon_mode TEXT NOT NULL DEFAULT 'color'");
  }

  if (!hasCategoryEmojiColumn) {
    database.exec('ALTER TABLE categories ADD COLUMN emoji TEXT');
  }

  if (!hasCategoryWorkspaceColumn) {
    database.exec(`ALTER TABLE categories ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}'`);
  }

  if (!hasCategoryUpdatedAtColumn) {
    database.exec('ALTER TABLE categories ADD COLUMN updated_at TEXT');
    database.exec('UPDATE categories SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL');
  }

  const noteColumns = database.prepare('PRAGMA table_info(notes)').all() as Array<{ name: string }>;
  const hasNoteCategoryColumn = noteColumns.some((column) => column.name === 'category_id');
  const hasNoteWorkspaceColumn = noteColumns.some((column) => column.name === 'workspace_id');

  if (!hasNoteCategoryColumn) {
    database.exec('ALTER TABLE notes ADD COLUMN category_id TEXT');
  }

  if (!hasNoteWorkspaceColumn) {
    database.exec(`ALTER TABLE notes ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}'`);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS deleted_categories (
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      category_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS deleted_tasks (
      workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE_ID}',
      task_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, task_id)
    );
  `);
};
