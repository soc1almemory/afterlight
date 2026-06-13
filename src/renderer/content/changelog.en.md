# Afterlight v0.2.0

Current MVP state of Afterlight: a local Windows task manager with tasks, categories, notes, settings, Telegram integration, notifications, and backups.

## Core Workflow

- Added Inbox, Today, Week, and category pages.
- Added tasks with title, description, date, deadline time, priority, status, and category binding.
- Added fast task creation from the current section.
- Added task editing, completion, restore, and deletion.
- Today uses the configured refresh time and can show active overdue tasks.
- Week shows current-week dated tasks and no-date week tasks in the distributor.
- Fixed Week counters so dated tasks outside the current week are no longer counted as current-week tasks.

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
- Removed the obsolete profile security field because the app does not yet provide real local authentication.

## Search

- Added search popup for tasks and categories.
- Added recently opened history.
- Search can quickly open a found task or category.
- Search Today metadata now follows the configured Today refresh time.

## Windows Settings

- Added launch with Windows.
- Added launch minimized.
- Added close button behavior: exit, tray, or confirmation.
- Added system notifications for deadlines, overdue tasks, and Today refresh.
- Added system tray support.

## Backups And Data

- Added JSON task export.
- Added CSV task export.
- Added validated JSON task import.
- Added button to open the data folder.
- Added button to open the SQLite database.
- Added automatic SQLite backups.

## Telegram

- Added local Telegram integration through a user-provided BotFather token.
- The bot can add tasks from normal Telegram text.
- The bot understands dates, time, and hashtag categories.
- Added Telegram bot commands and buttons.
- Added bot language selection.
- Added category creation from Telegram.
- Added task lists, completion, and deletion directly from Telegram.
- Added automatic cleanup of old bot messages in chat.
- Telegram tokens are stored with Electron `safeStorage` when OS encryption is available.

## Technical Improvements

- App data is stored locally in SQLite.
- Electron renderer is isolated behind a preload API.
- Added renderer sandboxing and a Content Security Policy.
- Build pipeline uses Electron Forge and Vite.
- TypeScript validation runs before packaging.
- Production sourcemaps are disabled for release builds.
