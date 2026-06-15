# Afterlight v0.2.8

Update v0.2.8 significantly improves the design of all app elements, fixes synchronization with the Telegram bot, and resolves other major bugs.

## Design

- The app design has been significantly updated.
- The setup-panel in the Setup Screen now adapts to height.

## Sidebar

- A category created from the "Favorites" section is now immediately created in Favorites.
- The regular add button still creates a regular category.

## Telegram

- Local SQLite now stores deleted tasks and categories so that a server snapshot cannot bring them back.
- Sync with the bot now sends deletedTaskIds and deletedCategoryIds.
- The Worker now stores deleted categories, deletes them on its side, and no longer upserts old versions over newer ones.
- Merge is now timestamp-aware: an older snapshot no longer overwrites newer local changes.

## Help and Changelog

- The changelog has been updated.
