# User Guide

Afterlight helps you capture tasks quickly, plan them by day and category, keep short notes, and manage tasks from Telegram while the desktop app is running.

## Main Sections

- **Inbox** - a place for tasks without a specific day. Use it to collect things you will sort later.
- **Today** - tasks for the current app day. The day can start at the refresh time configured in settings, and active overdue tasks can also appear here.
- **Week** - day-by-day planning for the current week. No-date week tasks live in the distributor and can be dragged to a day.
- **Categories** - contexts such as Study, Home, Work, or Project. Categories can be marked as favorites.

## Working With Tasks

- Click "Add task" to create a task in the current section.
- A task can have a title, description, date, time, priority, and category.
- Click the task title to edit it.
- Click the checkbox on the left to complete or restore a task.
- The edit button appears when you hover a task row.
- In Week, tasks can be dragged to another day.

## Priorities

- Red means highest priority.
- Yellow means high priority.
- Green means medium priority.
- Blue means normal priority.

## Categories

- Create a category from the top of the sidebar or from the Categories block.
- A category can use a color, hash icon, or emoji icon.
- Favorite categories are shown in a separate block.
- Counters next to categories show task counts.
- Category sorting and counter visibility can be changed in settings.

## Notes

- Every page has a Notes field at the bottom.
- Notes are saved automatically.
- Notes are scoped by context: Inbox, Today, Week, and every category have separate text.
- Note line limit and autosave interval can be changed in settings.

## Search

- Click Search in the sidebar.
- Search finds tasks, categories, and recently opened sections.
- Clicking a result opens the task or section.

## Tabs

- Tabs help keep multiple sections open.
- The tab bar can be enabled or disabled in settings.
- Open tabs can be restored after app launch.

## Page Menu

- The three-dot button at the top of the page opens actions for the current section.
- Normal sections can be cleared.
- Category pages can delete the category.
- Category pages also have a favorite toggle.

## Telegram

- The Telegram bot works only while Afterlight is running on your computer.
- Create your own bot in BotFather and paste its token in Settings -> Telegram integration.
- After saving the token, send the shown `/start <code>` command to your bot.
- You can send normal text and the bot will create a task.
- Message examples:
- `Buy milk`
- `Buy milk today`
- `Buy milk tomorrow 18:00`
- `Submit report 12.06 14:30`
- `Call client #Work`
- The bot can show task lists, complete tasks, delete tasks, and create categories.

## Settings

- General contains launch behavior, tabs, task sorting, Today settings, Week settings, and notes.
- Language switches between Russian and English.
- Theme switches between light and dark mode.
- Sidebar controls auto-collapse and counters.
- Notifications configures Windows system reminders.
- Telegram integration connects your local bot.
- Backups contains export, import, data access, and automatic backups.

## Backups

- JSON is best for importing tasks back into Afterlight.
- CSV is best for viewing tasks in spreadsheets.
- Automatic SQLite backups help protect against accidental data loss.

## MVP Limitation

Afterlight currently works as a local app. Data and the Telegram bot depend on Afterlight running on your computer.
