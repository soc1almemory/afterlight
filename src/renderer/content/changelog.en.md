# Afterlight v0.2.1

Update 0.2.1 improves the in-app Telegram integration and fixes data synchronization.

## Settings

- Added a bot mode switch to the "Telegram Integration" section.
- The "Check connection" button is available for both Telegram modes.
- The Telegram section now shows the bot username `@afterlight_task_bot`.

## Help And Changelog

- Updated the user guide.

## Telegram

- Added the "Own token" mode in settings for the user's local bot.
- Added the "Afterlight Bot" mode in settings for connecting to `@afterlight_task_bot`.
- The connection status now considers not only `chat_id`, but also the real connection state.
- Fixed data synchronization between the Telegram integration and the open Afterlight window: new tasks and categories are pulled in without restarting the app.
- Added watching for the local database and Telegram config so the interface updates when external changes occur.
- Reloading data no longer resets the current page and tabs.
- Improved Telegram chat cleanup: the bot no longer deletes the message that directly triggered the action, so the chat does not close in mobile Telegram.
- The bot can now detect task priority from the beginning of a message:
  - `1 Task text` - highest priority;
  - `2 Task text` - medium priority;
  - `3 Task text` - low priority;
  - no number - normal priority.
- Updated Russian and English Telegram bot hints for task formatting.

## Fixes

- Fixed a conflict between the visual state of the Telegram icon and the status text in settings.
- Fixed the stretching Telegram mode switch.
- Fixed the phantom hover on the first option in the Telegram mode switch.
