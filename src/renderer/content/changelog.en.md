# Afterlight v0.2.5

The v0.2.5 update moves Afterlight Bot to Cloudflare, improves Telegram synchronization, and fixes date, time, and modification-history issues.

## Telegram And Afterlight Bot
- **Afterlight Bot** has been moved to Cloudflare Worker and now works through a shared server bridge for `@afterlight_task_bot`.
- The Cloudflare server address is built into the app by default, so manual server-address input has been removed from settings.
- Old local Afterlight Bot server addresses are no longer used in Afterlight Bot mode.
- Added a proper multi-user flow: different users can connect their own workspaces to the shared bot through individual pairing codes.
- Bot authorization has been updated: send `/start` first, then send the 6-digit code as a separate message.
- Added Telegram session reset for clearing connected chats and pending authorizations.
- Telegram integration status now shows the number of connected chats in Afterlight Bot mode.

## Cloudflare Synchronization
- Added task and category synchronization between the local app and Afterlight Bot through Cloudflare Worker.
- Tasks and categories created in Telegram now appear in the app without running a local bot-server.
- Deleted tasks are synchronized between the app and the bot through a deletion list.
- Background synchronization no longer overwrites task and category modification time.
- Last modified time now changes only when data is actually changed, not during an empty sync.

## Dates And Time
- Afterlight Bot now receives the app system timezone and calculates `today`, `tomorrow`, and the current week relative to the user's time.
- Fixed current-week display in the Telegram bot after moving to Cloudflare.
- The current day is now marked separately in the Telegram week-day picker.
- Fixed current-day highlighting on the app's "Week" page.
- The "Week" page now follows the Windows calendar week instead of the "Today" refresh-time setting.
- Fixed false "Updated just now" states caused by background Telegram synchronization.
- Fixed incorrect dates and times in search, history, and recently opened sections after synchronization.

## Telegram Integration UI
- Removed the Afterlight Bot server address field from Telegram settings.
- Status texts have been adapted for Cloudflare mode instead of the local-server flow.
- In Afterlight Bot mode, `chat_id` is no longer shown; it remains only for "Own token" mode.
- Improved localization for Telegram integration status messages.
- Updated help files with the current Cloudflare-mode description.

## Telegram Bot
- Removed extra inline navigation buttons from bot messages: navigation now lives in the main Telegram menu.
- Restored automatic cleanup of old bot messages after user actions.
- The bot no longer fully clears the chat in a way that could close an empty Telegram chat on mobile devices.
- Improved date and time parsing in text tasks.
- Added priority support through a number at the beginning of a message: `1`, `2`, `3`.
- Updated Russian bot hints with examples for priorities, dates, time, and categories.
- Added Telegram deadline reminders when notifications are enabled.

## Stability
- Worker received a soft D1 schema migration for the new timezone fields.
- Server logic is more resilient to old saved settings and legacy addresses.
- Fixed cases where an already connected bot could show an incorrect connection status.
