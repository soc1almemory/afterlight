CREATE TABLE IF NOT EXISTS clients (
  client_id TEXT PRIMARY KEY,
  client_secret TEXT NOT NULL,
  workspace_id TEXT NOT NULL UNIQUE,
  link_code TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'ru',
  profile_name TEXT,
  timezone_name TEXT,
  timezone_offset_minutes INTEGER NOT NULL DEFAULT 180,
  workspace_title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  chat_id INTEGER PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  conversation_json TEXT,
  bot_message_ids_json TEXT NOT NULL DEFAULT '[]',
  timezone_name TEXT,
  timezone_offset_minutes INTEGER NOT NULL DEFAULT 180,
  authenticated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_label TEXT
);

CREATE TABLE IF NOT EXISTS pending_auth_chats (
  chat_id INTEGER PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'ru',
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_label TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
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
  workspace_id TEXT NOT NULL,
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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deleted_tasks (
  workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, task_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  workspace_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_link_code ON clients(link_code);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_categories_workspace ON categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_deleted_tasks_workspace ON deleted_tasks(workspace_id);
