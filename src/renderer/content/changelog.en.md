# Afterlight v0.2.7

Update v0.2.7 fixes profile reset issues and includes fixes to the bot’s list sorting.

## Help and Changelog

- Updated the changelog.

## Telegram

- Fixed list sorting issues.

## Profile

- When deleting a profile, a separate hard reset of the Telegram integration is now triggered instead of the regular “session reset”.
- It disables Telegram, clears the old serverClientId/serverClientSecret/linkCode, sessions, pending auth, deleted markers, token/chat data, and prevents the app from reconnecting to the old Cloudflare workspace.