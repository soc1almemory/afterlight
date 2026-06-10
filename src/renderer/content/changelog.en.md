# Changelog

Current MVP state of Afterlight: a local Windows task manager with tasks, categories, notes, settings, Telegram integration, and backups.

## Core Workflow

- Added Inbox, Today, Week, and category pages.
- Added tasks with title, description, date, deadline time, priority, status, and category binding.
- Added fast task creation from the current section.
- Added task editing, completion, restore, and deletion.
- Today shows current-day tasks and overdue tasks when enabled in settings.
- Week lets tasks be distributed across days, including drag-and-drop from the no-date distributor.

## Categories And Favorites

- Added categories with color, hash, or emoji icon.
- Added favorite categories.
- Added task counters in the sidebar.
- Added category sorting and counter visibility settings.
- Fixed emoji category icons in the tab bar.

## Notes

- Every main section and category has its own notes field.
- Added note autosave.
- Added note line limit setting.
- Added last modified time for the current page.

## Interface

- Added tab bar.
- Added open tab restore after launch.
- Added start section and last window state settings.
- Added light and dark themes.
- Added Russian and English interface localization.
- Added automatic sidebar collapse.
- Added smooth animations for popups, dropdowns, lists, tabs, buttons, and workspace screens.
- Added fullscreen launch mode.

## Search

- Added search popup for tasks and categories.
- Added recently opened history.
- Search can quickly open a found task or category.

## Windows Settings

- Added launch with Windows.
- Added launch minimized.
- Added close button behavior: exit, tray, or confirmation.
- Added system notifications for deadlines, overdue tasks, and Today refresh.
- Added system tray support.

## Backups And Data

- Added JSON task export.
- Added CSV task export.
- Added JSON task import.
- Added button to open the data folder.
- Added button to open the SQLite database.
- Added automatic SQLite backups.

## Telegram

- Added local Telegram integration through @afterlight_task_bot.
- The bot can add tasks from normal Telegram text.
- The bot understands dates, time, and hashtag categories.
- Added Telegram bot commands and buttons.
- Added bot language selection.
- Added category creation from Telegram.
- Added task lists, completion, and deletion directly from Telegram.
- Added automatic cleanup of old bot messages in chat.

## Technical Improvements

- App data is stored locally in SQLite.
- Electron renderer is isolated behind a preload API.
- Build pipeline uses Electron Forge and Vite.
- TypeScript validation runs before packaging.
