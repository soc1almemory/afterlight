# Afterlight v0.2.3a

Update v0.2.3a improves the initial profile setup, the settings window behavior, Week page, Telegram integration, and icon display in Windows.

## App Updates

- The Afterlight icon is now displayed correctly in the list of installed Windows apps.
- In the Week section, the no-date distributor has been replaced with Inbox.

## Settings

- The settings window now remembers the last opened page.
- When settings are opened again, the last page is shown.

## Help and Changelog

- The changelog has been updated.

## Telegram

- When a profile is deleted, Telegram sessions and linked chats are now reset.
- The Telegram bot’s initial messages before language selection now include paragraphs in both Russian and English.
- In the Telegram bot, the Week list and no-date task creation now work through Inbox.

## Dark Theme and Icons

- The system tray icon now uses a separate `icon-tray.ico` file.

## Initial Profile Setup

- The profile setup screen is now more responsive to the window’s height and width.
- The form reduces spacing and avatar size on smaller windows.
- When there is not enough space, the content now scrolls inside the panel instead of overflowing outside the window.
- The form scrollbar is now rendered inside `setup-panel` and no longer overlaps the container border or rounded corners.
- `setup-shell` now opens in full screen by default until the profile is configured.
