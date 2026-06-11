# Afterlight
### Local Windows task manager for tasks, notes, categories, and Telegram reminders.

![Version](https://img.shields.io/badge/version-0.2.0-FF5B5B)
![Platform](https://img.shields.io/badge/platform-Windows-5B6EFF)
![Runtime](https://img.shields.io/badge/runtime-Electron-5BFFD0)
![UI](https://img.shields.io/badge/UI-React%20%2B%20TypeScript-FCFFA4)
![Storage](https://img.shields.io/badge/storage-SQLite-FFA4FD)

# About

**Afterlight** is a lightweight local desktop app for Windows, built as a personal task manager for everyday workflow. It helps organize tasks, notes, categories, deadlines, and weekly planning without requiring a server or cloud account.

The app stores data locally in SQLite, uses an Electron + React interface, and includes a Telegram bot integration for adding, viewing, completing, and deleting tasks while the desktop app is running.

# Features

- **Tasks** — create, edit, complete, and delete tasks.
- **Inbox / Today / Week** — system sections for incoming tasks, daily planning, and weekly scheduling.
- **Categories** — custom categories with color, icon mode, emoji mode, and favorites.
- **Notes** — page and category notes with autosave.
- **Search** — quick search across sections, categories, and tasks.
- **Tabs & history** — tab-based navigation, route history, back and forward actions.
- **Themes** — light and dark interface modes.
- **Settings** — account, language, theme, notifications, sidebar, Telegram, and backup settings.
- **Notifications** — Windows reminders for deadlines, overdue tasks, and Today page refresh.
- **Telegram bot** — local bot for task creation, task lists, completion, deletion, categories, and deadline reminders.
- **Import / Export / Backup** — JSON/CSV export, JSON import, and SQLite backups.

# Tech stack

| Layer | Tools |
|---|---|
| Desktop | Electron, Electron Forge |
| Build | Vite, TypeScript |
| UI | React 19, CSS |
| State | Zustand |
| Database | SQLite, better-sqlite3 |
| Integration | Telegram Bot API |
| Platform | Windows |

# Architecture

Afterlight follows a standard Electron architecture:

```text
Main process     -> app window, tray, SQLite, files, backups, notifications, Telegram
Preload process  -> secure bridge between renderer and main via contextBridge
Renderer process -> React UI, pages, popups, settings, UI state
Shared layer     -> shared TypeScript types and app version
```

# Project structure

```text
src/
├─ main/
│  ├─ main.ts              # Electron main process
│  ├─ preload.ts           # secure API exposed to the renderer
│  ├─ ipc/                 # IPC handlers
│  ├─ storage/             # SQLite, migrations, repositories
│  └─ telegram/            # local Telegram bot
│
├─ renderer/
│  ├─ App.tsx              # main UI shell
│  ├─ components/          # interface components
│  ├─ store/               # Zustand store
│  ├─ styles/              # app.css, themes, layout, animations
│  └─ content/             # help and changelog Markdown files
│
└─ shared/
   ├─ types.ts             # shared data types
   └─ app-version.json     # app version

assets/                    # SVG/PNG/ICO assets
reference/                 # Figma HTML/CSS export and visual references
```

# Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run TypeScript checks
npm run lint

# Package the Windows build
npm run package

# Create distributable artifacts
npm run make
```

After `npm run package`, the Windows build is created here:

```text
out/afterlight-win32-x64/afterlight.exe
```

# Telegram integration

The Telegram bot runs locally through long polling. No external server, webhook, VPS, or ngrok setup is required.

The bot can:

- add tasks from plain text or `/add`;
- show tasks from Inbox, Today, Week, and categories;
- complete, restore, and delete tasks;
- create categories;
- send deadline reminders;
- work in Russian and English.

Task examples:

```text
Buy milk today
Submit report tomorrow 18:00
Call the client #Work
Homework 12.06 14:30 #Study
```

# Local data

User data is stored locally:

```text
app.getPath('userData')/storage/afterlight.sqlite
```

Related local files:

```text
storage/backups        # SQLite backups
storage/telegram.json  # local Telegram bot config
```

# Current status

Afterlight v0.2.0 is a complete local MVP with desktop UI, persistent local storage, task sections, notes, settings, themes, search, backups, Markdown help/changelog content, Windows notifications, and local Telegram integration.

The project is ready to evolve from a local desktop app into a synchronized product with cloud storage, server-side Telegram webhooks, multi-device sync, and multiple workspaces.
