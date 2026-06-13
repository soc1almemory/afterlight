# Afterlight v0.2.2

Version 0.2.2 improves Telegram integration, task settings, and introduces automatic updates for the application.

## Application Updates

- Added automatic update checks for the installed Windows version of Afterlight.
- New versions are downloaded from the Afterlight GitHub Releases repository.
- The application now shows a small notification only after an update has been downloaded and is ready to install.
- You can restart Afterlight directly from the notification to complete the installation.

## Settings

- Improved localization for `telegram-status-message`.
- Added a new option under **General → Task Sorting** to move completed tasks to the end of the list.

## Help and Changelog

- Updated the user guide and changelog.

## Telegram

- The bot now automatically creates the specified category when adding a task if it does not already exist.
- Telegram integration metadata is now preserved when updating settings, preventing connected chats from being reset.
- Fixed saving Telegram bot authorization data when updating status and application settings.
- Afterlight Bot mode status is now determined by actual authorized chats rather than only the legacy `chat_id`.
- Added a connected chat counter to the Telegram integration status for Afterlight Bot mode.
- Added a button to reset Telegram sessions without disabling the integration or removing the pairing code.
- `chat_id` is now displayed only in **Custom Token** mode.
- Technical Telegram errors shown in the status line are now localized to the application interface language.

## Dark Theme and Icons

- `color-swatch.active` now uses white (`#ffffff`).
- The connected Telegram icon in the light theme now uses a dedicated light variant.

## Fixes

- Fixed the tab bar drag region interfering with normal button behavior.
- `telegram-status` strings are no longer inherited when switching between bot modes.
