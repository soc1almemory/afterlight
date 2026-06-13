# Afterlight v0.2.1

Version 0.2.1 finishes the MVP polish pass: Telegram integration is smoother inside the app, the interface feels more animated, Help and Changelog are easier to maintain, dark theme details are cleaner, and several visible bugs around sync, icons, search history, and settings have been fixed.

## Interface And Motion

- Added smoother animations for popups, dropdown menus, tabs, lists, buttons, and screen transitions.
- Added animated transitions between the profile setup screen and the main workspace.
- Fixed the setup transition avatar flash: the selected avatar no longer changes back to the default image while the animation is running.
- Replaced the startup text "Loading Afterlight..." with a large centered loading spinner.
- The dark loading screen now uses `#242424` as its background.
- Added animation for collapsing and expanding the sidebar from `titlebar-sidebar-toggle`.
- Added a hover animation for the Afterlight titlebar logo: the default icon transitions into the colored icon.
- Matched the settings close button size and spacing with Help and Changelog popup close buttons.
- Fixed the font size of the "Reset" button in settings.

## Settings

- The app version is now stored in a separate file and displayed at the bottom of the settings navigation.
- Settings now show `Afterlight v0.2.1 © soc1almemory 2026`.
- Added notification timing settings:
  - deadline reminders for Windows and Telegram;
  - Today refresh reminders for Windows;
  - repeated overdue-task reminders for Windows.
- Added a Telegram bot mode switch in settings.
- Telegram settings now use more compact action buttons and a clearer status row.
- The "Check connection" button is available in both Telegram modes.
- Telegram status refreshes automatically every 5 seconds.
- The Telegram settings page shows the bot username `@afterlight_task_bot`.
- Empty checkboxes now adapt correctly to dark theme and use `#1F1F1F`.
- Dark-theme account deletion buttons are now red.

## Help And Changelog

- Help popup content is now loaded from external `.md` files.
- Changelog popup content is now loaded from external `.md` files.
- Help and Changelog can now be edited without changing JSX components.
- Updated the user guide with current information about Telegram modes, notifications, search, backups, and Telegram task message formatting.

## Telegram

- Added the "Own token" mode for a local user-created bot.
- Added the "Afterlight Bot" mode for connecting to `@afterlight_task_bot`.
- The Telegram button in the bottom menu now opens Settings -> Telegram integration instead of the old popup.
- The bottom menu Telegram icon now uses `telegram-icon-connected.svg` when connected.
- Added a large Telegram status icon in settings with light and dark theme variants.
- Telegram connection state now considers the real connection status, not only `chat_id`.
- Fixed data sync between Telegram integration and the open Afterlight window: new tasks and categories appear without restarting the app.
- Added local database and Telegram config watching so the UI refreshes after external data changes.
- Data refresh no longer resets the current page or open tabs.
- Improved Telegram chat cleanup: the bot no longer deletes the message that triggered the current action, so mobile Telegram chats no longer close because they become empty.
- The bot can now parse task priority from the beginning of a message:
  - `1 Task text` - highest priority;
  - `2 Task text` - medium priority;
  - `3 Task text` - low priority;
  - no number - normal priority.
- Updated Russian and English Telegram bot formatting hints.

## Search And Navigation

- Fixed the logic for Search history and Recently opened sections.
- Date and time metadata in Search history now updates correctly.
- Fixed date and time alignment in Search history.
- Newly created categories and opened sections now appear in history correctly.
- Clicking the username in the sidebar now opens the Account page in settings.

## Categories And Tabs

- Fixed emoji category icons in the tab bar.
- Fixed the large gap after the "Add task" button on the Today page.
- Improved setup-screen field sizing and layout.
- The setup language switch, category icon mode, and submit button are now aligned in one row.

## Dark Theme And Icons

- `drop-down-icon.svg` in the sidebar is recolored to white in dark theme.
- Dark-theme hover for `edit-icon.svg` in sidebar and workspace now uses `#171717`.
- Dark-theme hover for `add-icon.svg` in sidebar now uses `#171717`.
- Dark-theme hover for `create-icon.svg` in sidebar now uses `#171717`.
- Dark-theme hover colors using `#E3E3E3` and `#343434` were replaced with `#171717` where applicable.
- `changelog-icon` was replaced with separate light and dark theme icon variants.
- Settings close button hover styles were applied to Help and Changelog popups.

## Fixes

- Fixed text input becoming temporarily unavailable after clearing a section.
- Fixed text input becoming temporarily unavailable after deleting a user-created category.
- Replaced blocking native confirmation prompts for section clearing and category deletion with in-app confirmation dialogs.
- Optimized bulk task deletion when clearing sections.
- Fixed mismatched Telegram status icon and status text in settings.
- Fixed the Telegram mode switch stretching too wide.
- Fixed the phantom hover highlight on the first Telegram mode switch option.
- Fixed Telegram status spinner colors for dark theme.
- Fixed DevTools opening in development mode.
- Fixed small visual inconsistencies across settings, sidebar, workspace, and popups.
