# Afterlight

### Local Windows task manager for tasks, notes, categories, notifications, backups, and Telegram integration.

![Version](https://img.shields.io/badge/version-0.2.8-FF5B5B)
![Platform](https://img.shields.io/badge/platform-Windows-5B6EFF)
![Runtime](https://img.shields.io/badge/runtime-Electron-5BFFD0)
![UI](https://img.shields.io/badge/UI-React%20%2B%20TypeScript-FCFFA4)
![Storage](https://img.shields.io/badge/storage-SQLite-FFA4FD)

![Afterlight banner](https://files.catbox.moe/j7xfdn.png)

## About

**Afterlight** is a lightweight local desktop app for Windows, built as a personal task manager for everyday workflow. It helps organize tasks, notes, categories, deadlines, weekly planning, reminders, and Telegram-based task capture without requiring a cloud account.

The app stores its main data locally in SQLite, uses an Electron + React interface, and exposes a Telegram integration that can work either through a user-created local bot or through the Cloudflare-backed `Afterlight Bot` mode configured in app settings.

## Features

- **Tasks** - create, edit, complete, restore, and delete tasks.
- **Inbox / Today / Week** - system sections for incoming tasks, daily planning, and weekly scheduling.
- **Categories** - custom categories with color, hash, emoji icon mode, favorites, and counters.
- **Notes** - separate page and category notes with autosave.
- **Search** - quick search across tasks, categories, recently opened sections, and route history.
- **Tabs & navigation** - tab-based navigation, route history, back and forward actions.
- **Themes** - light and dark interface modes with theme-aware icons and controls.
- **Animations** - smoother popups, dropdowns, setup transitions, sidebar transitions, and loading states.
- **Settings** - account, language, theme, notifications, sidebar, Telegram, and backup settings.
- **Notifications** - Windows reminders for deadlines, overdue tasks, and Today page refresh.
- **Telegram integration** - task creation, task lists, categories, completion, deletion, language choice, and deadline reminders.
- **Conflict-safe bot sync** - task/category deletions use tombstone markers and timestamp-aware merging so old bot snapshots do not restore removed data.
- **Telegram session control** - connected chat count, session reset, pairing code, and localized status messages.
- **Import / Export / Backup** - JSON/CSV export, validated JSON import, and automatic SQLite backups.
- **App updates** - installed Windows builds can check GitHub Releases, download updates, and prompt for restart.
- **Markdown Help / Changelog** - Help and Changelog popup content is loaded from external `.md` files.

## Tech Stack

| Layer | Tools |
|---|---|
| Desktop | Electron, Electron Forge |
| Build | Vite, TypeScript |
| UI | React 19, CSS |
| State | Zustand |
| Database | SQLite, better-sqlite3 |
| Integration | Telegram Bot API, Cloudflare Workers, Cloudflare D1 |
| Platform | Windows |

## Architecture

Afterlight follows a standard Electron architecture:

```text
Main process     -> app window, tray, SQLite, files, backups, notifications, Telegram runtime
Preload process  -> secure bridge between renderer and main via contextBridge
Renderer process -> React UI, pages, popups, settings, UI state
Shared layer     -> shared TypeScript types and app version
```

The renderer does not access Node.js APIs directly. It communicates through the preload bridge and IPC handlers.

## Project Structure

```text
src/
  main/
    main.ts              # Electron main process
    preload.ts           # secure API exposed to the renderer
    ipc/                 # IPC handlers
    storage/             # SQLite, migrations, repositories
    telegram/            # Telegram integration runtime and Cloudflare sync bridge

  renderer/
    App.tsx              # main UI shell
    components/          # interface components
    store/               # Zustand store
    styles/              # app.css, themes, layout, animations
    content/             # Help and Changelog Markdown files

  shared/
    types.ts             # shared data types
    app-version.json     # app version used by the UI

assets/                  # SVG/PNG/ICO assets
afterlight-bot-worker/   # Cloudflare Worker for @afterlight_task_bot
afterlight-bot-server/   # legacy local standalone bot server
```

## Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run TypeScript checks
npm run lint

# Package an unpacked Windows app
npm run package

# Create distributable Windows artifacts
npm run make

# Deploy the Cloudflare Worker used by Afterlight Bot
npm run bot:worker:deploy
```

After `npm run package`, the unpacked Windows app is created here:

```text
out/afterlight-win32-x64/afterlight.exe
```

For a GitHub release, use `npm run make` and upload the Squirrel installer artifacts from:

```text
out/make/squirrel.windows/x64/
```

The installer icon is configured in `forge.config.ts` through `assets/logo-main.ico`.

## Telegram Integration

Telegram settings are available inside Afterlight at:

```text
Settings -> Telegram integration
```

There are two app-level modes.

### Own Token

This mode uses a bot created by the user in BotFather. The bot is handled by the Electron app and works while Afterlight is running.

To connect:

1. Create a bot in BotFather and copy its token.
2. Open Afterlight settings.
3. Go to Telegram integration.
4. Select `Own token`.
5. Paste the token, enable the bot, and save.
6. Send `/start` to your bot, then send the shown 6-digit pairing code as a separate message.

If Telegram allows a start payload, `/start <code>` is also supported.

### Afterlight Bot

This mode connects the app to the shared `@afterlight_task_bot`. It is the recommended mode for normal use.

Afterlight Bot uses a Cloudflare Worker as the Telegram bridge:

```text
https://afterlight-task-bot.afterlight.workers.dev
```

The URL is built into the app. Users do not need to type a server address, run a local server, expose an IP address, or configure a tunnel.

Connection flow:

1. Open `Settings -> Telegram integration`.
2. Select `Afterlight Bot`.
3. Enable the mode and save.
4. Send `/start` to `@afterlight_task_bot`.
5. Send the 6-digit pairing code shown in Afterlight as a separate message.

The app shows the number of authorized Telegram chats in Afterlight Bot mode. If the connection state becomes messy, use `Reset sessions` in Telegram settings. This clears authorized chats and pending authorizations, but keeps the integration enabled and keeps the pairing code.

In `Afterlight Bot` mode, `chat_id` is intentionally hidden from the status area because the mode can handle multiple chats. In `Own token` mode, `chat_id` is still shown because that mode remains one-chat oriented.

Tasks and categories created through Telegram are synchronized back into the local SQLite database. Edits and deletions are reconciled with timestamps and deletion markers (`deleted_tasks` / `deleted_categories`) so stale Worker snapshots do not restore items the desktop app already removed. The Cloudflare Worker acts as a bridge for Telegram, not as a full cloud account system.

Telegram status messages are localized in the UI for known technical errors, including connection failure, rate limit, invalid token, duplicate polling, chat access errors, and unavailable Afterlight Bot service states.

### Cloudflare Worker

The Worker source lives in:

```text
afterlight-bot-worker/
```

Useful commands:

```bash
# Initialize the remote D1 schema
npm run bot:worker:init-db

# Run the Worker locally through Wrangler
npm run bot:worker:dev

# Deploy the Worker
npm run bot:worker:deploy
```

The production Worker stores Telegram-side task data, pairing codes, chat sessions, task/category deletion markers, and workspace metadata in Cloudflare D1. It also stores timezone metadata sent by the desktop app so Telegram date parsing matches the user's Windows time.

## Telegram Task Format

The bot can add tasks from plain text or `/add`.

Examples:

```text
Buy milk
Buy milk today
Submit report tomorrow 18:00
Call the client #Work
Homework 12.06 14:30 #Study
```

If a message uses a category hashtag that does not exist yet, the bot can create that category while adding the task.

Priority can be placed at the beginning of the message:

```text
1 Send the report      # highest priority
2 Do homework          # medium priority
3 Read materials       # low priority
Buy milk               # normal priority
```

The bot can also show task lists, create categories, complete tasks, restore tasks, delete tasks, and switch between Russian and English.

## Notifications

Afterlight supports Windows notifications for:

- task deadlines;
- overdue tasks;
- Today page refresh reminders.

Deadline notification timing is configurable. Telegram deadline reminders use the same deadline lead setting when Telegram notifications are enabled.

## App Updates

Installed Windows builds can check GitHub Releases for new versions. When an update is available, Afterlight downloads it in the background and shows a small notification after the update is ready to install.

The update notification includes a restart action to finish installation. Automatic update checks are not intended for development mode.

## Local Data

User data is stored locally:

```text
app.getPath('userData')/storage/afterlight.sqlite
```

Related local files:

```text
storage/backups        # SQLite backups
storage/telegram.json  # Telegram integration config
```

Telegram tokens for the in-app custom bot mode are stored through Electron `safeStorage` when OS encryption is available.

The Telegram config stores pairing codes, server heartbeat data, session status, pending local-bot metadata, and Cloudflare Worker client credentials. In `Afterlight Bot` mode, task data remains in the local SQLite database and is synchronized through the Worker bridge; local SQLite tombstone tables keep deletions authoritative across sync cycles.

## Documentation Content

Help and Changelog are loaded from Markdown files:

```text
src/renderer/content/
```

This keeps user-facing documentation editable without changing React components.

## Current Status

Afterlight is a complete local desktop application with desktop UI, persistent SQLite storage, task sections, notes, settings, themes, search, backups, Markdown Help/Changelog content, Windows notifications, Telegram integration modes, session-aware Telegram status, Electron hardening, validated import, automatic update support, and polished interface animations.
