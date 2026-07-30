# Alert Bot

Job alert tracker for first-party company career pages. Users sign in with Clerk, subscribe to companies, set location and keyword filters, and receive Telegram alerts when matching jobs are found.

## Clerk setup

Create a Clerk project, then copy these values into `.env`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

In Clerk, enable the login methods you want, such as email and Google.

## Local setup

```bash
npm install
copy .env.example .env
npm run prisma:migrate
npm run seed
npm run dev
```

Set `DATABASE_URL` to a Postgres database before running the migration.

## Telegram setup

Create a bot with BotFather, then set:

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=your_bot_username
```

Configure Telegram to call:

```text
POST https://your-domain.com/api/telegram/webhook
```

Users connect from the dashboard through a Telegram deep link.

## Cron endpoints

Call these with `Authorization: Bearer $CRON_SECRET`:

```text
POST /api/cron/poll
POST /api/cron/dispatch
```

The poller updates global job postings. The dispatcher checks each user's alert window and sends matching unsent postings.
