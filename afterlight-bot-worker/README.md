# Afterlight Bot Worker

Free Cloudflare Workers + D1 deployment for `@afterlight_task_bot`.

This is the preferred free option when users should not run a local server or type
LAN/IP addresses manually.

## Free Plan

For a small MVP/demo, Cloudflare Workers Free + D1 Free is enough for a couple of
users. The worker gets a public `workers.dev` URL, and D1 stores registered
Afterlight clients, Telegram chats, categories, tasks, and deleted-task markers.

## One-Time Deploy

1. Install/login Wrangler:

```bash
npx wrangler login
```

2. Create D1 database:

```bash
npx wrangler d1 create afterlight_bot
```

3. Copy the returned `database_id` into `wrangler.toml`.

4. Create tables:

```bash
npm run bot:worker:init-db
```

5. Set the Telegram token secret:

```bash
cd afterlight-bot-worker
npx wrangler secret put AFTERLIGHT_BOT_TOKEN
```

6. Deploy:

```bash
npm run bot:worker:deploy
```

7. Copy the deployed URL, for example:

```text
https://afterlight-task-bot.YOUR_SUBDOMAIN.workers.dev
```

8. Set Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://afterlight-task-bot.YOUR_SUBDOMAIN.workers.dev/telegram/webhook\"}"
```

9. In Afterlight desktop, use this URL as the Afterlight Bot server URL.
   Once the final URL is known, it can be hardcoded as the default app URL and
   the settings field can be hidden from ordinary users.

## API Compatibility

The worker implements the same client API as `afterlight-bot-server`:

- `GET /health`
- `POST /api/workspaces/register`
- `POST /api/workspaces/status`
- `POST /api/workspaces/reset-sessions`

Telegram sends updates to:

- `POST /telegram/webhook`
