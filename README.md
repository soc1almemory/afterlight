# Afterlight

### Local Windows task manager for tasks, notes, categories, notifications, backups, and Telegram integration.

![Version](https://img.shields.io/badge/version-0.2.1-FF5B5B)
![Platform](https://img.shields.io/badge/platform-Windows-5B6EFF)
![Runtime](https://img.shields.io/badge/runtime-Electron-5BFFD0)
![UI](https://img.shields.io/badge/UI-React%20%2B%20TypeScript-FCFFA4)
![Storage](https://img.shields.io/badge/storage-SQLite-FFA4FD)

![Afterlight banner](https://files.catbox.moe/j7xfdn.png)

## About

**Afterlight** is a lightweight local desktop app for Windows, built as a personal task manager for everyday workflow. It helps organize tasks, notes, categories, deadlines, weekly planning, reminders, and Telegram-based task capture without requiring a cloud account.

The app stores its main data locally in SQLite, uses an Electron + React interface, and exposes a Telegram integration that can work either through a user-created local bot or through the `Afterlight Bot` mode configured in app settings.

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
- **Import / Export / Backup** - JSON/CSV export, validated JSON import, and automatic SQLite backups.
- **Markdown Help / Changelog** - Help and Changelog popup content is loaded from external `.md` files.

## Tech Stack

| Layer | Tools |
|---|---|
| Desktop | Electron, Electron Forge |
| Build | Vite, TypeScript |
| UI | React 19, CSS |
| State | Zustand |
| Database | SQLite, better-sqlite3 |
| Integration | Telegram Bot API |
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
    telegram/            # in-app Telegram runtime

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
```

After `npm run package`, the unpacked Windows app is created here:

```text
out/afterlight-win32-x64/afterlight.exe
```

For a GitHub release, use `npm run make` and upload the Squirrel installer artifacts from:

```text
out/make/squirrel.windows/x64/
```

Expected files include:

```text
afterlight-0.2.1 Setup.exe
afterlight-0.2.1-full.nupkg
RELEASES
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
6. Send the shown `/start <code>` command to your bot.

### Afterlight Bot

This mode connects the app to `@afterlight_task_bot`. It is designed for the companion server workflow and uses the same local Afterlight data files when configured.

The app watches local SQLite and Telegram config changes, so tasks and categories created through Telegram can appear in an open Afterlight window without restarting the app.

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

Priority can be placed at the beginning of the message:

```text
1 Send the report      # highest priority
2 Do homework          # medium priority
3 Read materials       # low priority
Buy milk               # normal priority
```

The bot can also show task lists, create categories, complete tasks, restore tasks, delete tasks, and switch between Russian and English.

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

## Documentation Content

Help and Changelog are loaded from Markdown files:

```text
src/renderer/content/
```

This keeps user-facing documentation editable without changing React components.

## Current Status

Afterlight v0.2.1 is a complete local MVP with desktop UI, persistent SQLite storage, task sections, notes, settings, themes, search, backups, Markdown Help/Changelog content, Windows notifications, Telegram integration modes, Electron hardening, validated import, and polished interface animations.

The next natural direction is turning Afterlight from a local desktop app into a synchronized product with cloud storage, account-based sync, server-side Telegram webhooks, multi-device access, and richer workspace collaboration.
