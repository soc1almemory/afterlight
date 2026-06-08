import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { seedCategories, seedNotes, seedTasks } from '../../shared/seedData';

let connection: Database.Database | null = null;

export const initializeDatabase = () => {
  if (connection) {
    return connection;
  }

  const storageDir = path.join(app.getPath('userData'), 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  connection = new Database(path.join(storageDir, 'afterlight.sqlite'));
  connection.pragma('journal_mode = WAL');
  connection.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      icon_mode TEXT NOT NULL DEFAULT 'color',
      emoji TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
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
      scope TEXT NOT NULL,
      category_id TEXT,
      text TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_scope ON tasks(scope);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
  `);
  migrateDatabase(connection);
  connection.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_notes_scope_category ON notes(scope, category_id);
  `);

  seedDatabase(connection);

  return connection;
};

export const getDatabase = () => connection ?? initializeDatabase();

const seedDatabase = (database: Database.Database) => {
  const categoryCount = database.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  const taskCount = database.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number };
  const noteCount = database.prepare('SELECT COUNT(*) AS count FROM notes').get() as { count: number };

  const insertCategory = database.prepare(`
    INSERT INTO categories (id, title, color, icon_mode, emoji, is_favorite)
    VALUES (@id, @title, @color, @iconMode, @emoji, @isFavorite)
  `);

  const insertTask = database.prepare(`
    INSERT INTO tasks (id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired)
    VALUES (@id, @title, @description, @dueDate, @dueLabel, @priority, @status, @scope, @categoryId, @isExpired)
  `);

  const insertNote = database.prepare(`
    INSERT INTO notes (id, scope, category_id, text)
    VALUES (@id, @scope, @categoryId, @text)
  `);

  const seed = database.transaction(() => {
    if (categoryCount.count === 0) {
      seedCategories.forEach((category) => {
        insertCategory.run({
          ...category,
          emoji: category.emoji ?? null,
          isFavorite: Number(category.isFavorite),
        });
      });
    }

    if (taskCount.count === 0) {
      seedTasks.forEach((task) => {
        insertTask.run({
          ...task,
          categoryId: task.categoryId ?? null,
          description: task.description ?? null,
          dueDate: task.dueDate ?? null,
          dueLabel: task.dueLabel ?? null,
          isExpired: Number(Boolean(task.isExpired)),
        });
      });
    }

    if (noteCount.count === 0) {
      seedNotes.forEach((note) => insertNote.run({ ...note, categoryId: note.categoryId ?? null }));
    }
  });

  seed();
};

const migrateDatabase = (database: Database.Database) => {
  const taskColumns = database.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
  const hasExpiredColumn = taskColumns.some((column) => column.name === 'is_expired');

  if (!hasExpiredColumn) {
    database.exec('ALTER TABLE tasks ADD COLUMN is_expired INTEGER NOT NULL DEFAULT 0');
  }

  const hasDueDateColumn = taskColumns.some((column) => column.name === 'due_date');

  if (!hasDueDateColumn) {
    database.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
  }

  const categoryColumns = database.prepare('PRAGMA table_info(categories)').all() as Array<{ name: string }>;
  const hasCategoryIconModeColumn = categoryColumns.some((column) => column.name === 'icon_mode');
  const hasCategoryEmojiColumn = categoryColumns.some((column) => column.name === 'emoji');

  if (!hasCategoryIconModeColumn) {
    database.exec("ALTER TABLE categories ADD COLUMN icon_mode TEXT NOT NULL DEFAULT 'color'");
  }

  if (!hasCategoryEmojiColumn) {
    database.exec('ALTER TABLE categories ADD COLUMN emoji TEXT');
  }

  const noteColumns = database.prepare('PRAGMA table_info(notes)').all() as Array<{ name: string }>;
  const hasNoteCategoryColumn = noteColumns.some((column) => column.name === 'category_id');

  if (!hasNoteCategoryColumn) {
    database.exec('ALTER TABLE notes ADD COLUMN category_id TEXT');
  }
};
