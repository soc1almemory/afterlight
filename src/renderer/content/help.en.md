# User Guide

Afterlight helps you capture tasks quickly, organize them by day and category, keep short notes, search across your workspace, and manage tasks from Telegram.

## Main Sections

- **Inbox** - a place for tasks without a specific day. Use it to collect things you will sort later.
- **Today** - tasks for the current app day. The start of the app day can be configured through the Today refresh time.
- **Week** - current calendar-week planning by day. The current day is highlighted when the setting is enabled. Tasks without a date can appear at the start of Week and can be moved to a specific day.
- **Categories** - contexts like Study, Home, Work, or Project. Categories can be added to Favorites.

## Tasks

- Click "Add task" to create a task in the current section.
- A task can have a title, description, date, deadline time, priority, and category.
- Click a task title to edit it.
- Click the checkbox on the left to complete or restore a task.
- The edit button appears when hovering over a task row.
- In Week, tasks can be moved between days.
- If overdue display is enabled, active overdue tasks can appear on the Today page.

## Time And Dates

- The Today date depends on the Today refresh time setting.
- The Week page follows the Windows calendar week.
- Last modified time reflects real task, category, or note changes, not background synchronization.
- Search history and recently opened sections show the time when a section was opened.

## Priorities

- Red - highest priority.
- Yellow - medium priority.
- Green - low priority.
- Blue - normal task without explicit priority.

## Categories

- Create a category from the sidebar or from the Categories block.
- A category can use a color, hashtag, or emoji icon.
- Favorite categories appear in a separate block.
- Counters next to categories show task counts.
- Category sorting and counter display can be adjusted in settings.
- Emoji category icons are shown in the sidebar, tab bar, task metadata, and search.

## Notes

- Every page has a Notes field at the bottom.
- Notes are saved automatically.
- Today, Week, Inbox, and every category each have their own note text.
- Note line limit and autosave interval can be adjusted in settings.

## Search

- Click "Search" in the sidebar.
- Search finds tasks, categories, and recently opened sections.
- Clicking a result opens the task, category, or section.
- Recently opened and History blocks help you return to recent working contexts.

## Tabs

- Tabs help keep multiple sections open.
- The tab bar can be enabled or disabled in settings.
- Open tabs can be restored after app launch.
- Category tabs show the selected category icon.

## Page Menu

- The three-dot button at the top of a page opens current-section actions.
- Regular sections can be cleared.
- Category pages can be deleted.
- Categories can also be added to or removed from Favorites.

## Notifications

- Windows notifications are configured in Settings -> Notifications.
- Deadline reminders can be enabled.
- You can choose how many minutes before a deadline Windows and Telegram should notify you.
- You can enable reminders before the daily Today refresh.
- You can configure repeated overdue-task reminder intervals.

## Telegram

Telegram integration is configured in **Settings -> Telegram integration**.

There are two modes:

- **Afterlight Bot** - the main mode for working through the shared `@afterlight_task_bot`. The app uses the built-in Cloudflare server URL, so there is no server address to type manually.
- **Own token** - a local bot created by the user in BotFather. It works only while Afterlight is running on the computer.

In **Afterlight Bot** mode, click "Save and start", then send the bot `/start` and send the 6-digit code shown by Afterlight as a separate message. If Telegram lets you pass a parameter directly, `/start <code>` is also supported.

The status shows the number of connected Telegram chats. If the connection state gets messy, click **Reset sessions**: the app removes connected chats and pending authorizations, but keeps the integration enabled and keeps the pairing code.

Afterlight Bot synchronizes tasks and categories between the app and Telegram through a Cloudflare Worker. The main app database still remains a local SQLite database on your computer.

The bot can:

- add tasks from normal messages;
- show Inbox, Today, Week, and categories;
- create categories;
- add tasks to a specific category;
- complete, restore, and delete tasks;
- switch between Russian and English;
- show formatting hints;
- send Telegram deadline reminders when they are enabled in settings.

## Telegram Message Format

You can send normal text and the bot will create a task:

- `Buy milk`
- `Buy milk today`
- `Buy milk tomorrow 18:00`
- `Submit report 12.06 14:30`
- `Call client #Work`
- `Homework tomorrow #Study`

The bot understands:

- dates: `today`, `tomorrow`, `12.06`, `12.06.2026`;
- time: `09:30`, `18:00`;
- categories through hashtags: `#Work`; if the category does not exist yet, the bot can create it while adding the task;
- priority at the beginning of the message.

Telegram priorities:

- `1 Send the report` - highest priority;
- `2 Do homework` - medium priority;
- `3 Read materials` - low priority;
- `Buy milk` - normal task without explicit priority.

You can also use `/add task text`.

## Settings

- Account: update name, workspace title, email, and avatar.
- General: launch behavior, tabs, task sorting, Today and Week settings, notes, and interface behavior.
- Language: switch the interface between Russian and English.
- Theme: choose light or dark theme.
- Sidebar: configure auto-collapse and counters.
- Notifications: configure system reminders.
- Telegram integration: connect a Telegram bot.
- Backups: export, import, open data folder, and configure automatic backups.

## App Updates

- The installed Windows version of Afterlight automatically checks for new versions.
- If an update is available, the app downloads it in the background without extra notifications.
- When the update is ready to install, Afterlight shows a small notification. Click "Restart" to finish installing it.
- Automatic updates do not run in development mode.

## Backups

- JSON is best for importing tasks back into Afterlight.
- CSV is best for viewing tasks in spreadsheets.
- Automatic SQLite backups help protect against accidental data loss.
- Settings can open the data folder and the database file.

## MVP Limitation

Afterlight is currently a local app. Main data is stored on your computer in SQLite. Afterlight Bot uses Cloudflare only as a bridge for the Telegram bot. Full cloud sync between devices and a full user-account server are not part of the MVP yet.
