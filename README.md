# Alert Bot

Job alert tracker for first-party company career pages (ATS: Greenhouse, Lever, Ashby, Workday). Users sign in with Clerk, subscribe to representative ATS-backed companies, set role/location/experience/keyword filters, and receive Telegram alerts on their chosen schedule when matching jobs are found.

## Features

- **4 representative companies**, mapped 1:1 to Greenhouse, Lever, Ashby, and Workday
- **Custom company tracking** — add companies by comma-separated name (`Airbnb, Spotify, Linear`) or by pasting a careers page URL
- **ATS segments** — filter the company list by All, Greenhouse, Lever, Ashby, and Workday
- **Role filtering** via focused SWE/SDE clickable role pills
- **Experience & location filters** with dropdown toggles, plus free-text keyword matching (e.g. `React, Node, Security`)
- **4 configurable alert windows** — hourly, every 6 hours, daily morning, daily evening
- **Telegram delivery** with structured, per-role alerts (title, location, direct application link), connect/verify/send flow, and setup via deep link
- **Dashboard controls** — live poller health status per company, manual "Poll now," "Track all" / "Pause all," and per-user saved filters
- **Clerk authentication** for sign-in/sign-up

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

Set `DATABASE_URL` to a Postgres database (this project uses Neon) before running the migration.

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

Call these with `Authorization: Bearer $CRON_SECRET`, or use `?secret=$CRON_SECRET` when configuring cron from a web UI:

```text
POST /api/cron/poll
POST /api/cron/dispatch
```

For Vercel web cron, configure:

```text
/api/cron/poll?secret=YOUR_CRON_SECRET
0 */2 * * *

/api/cron/dispatch?secret=YOUR_CRON_SECRET
*/15 * * * *
```

The poller updates global job postings. The dispatcher checks each user's alert window (hourly, 6-hourly, morning, evening) and sends matching unsent postings.
