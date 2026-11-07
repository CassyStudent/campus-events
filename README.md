# Campus Events

Students browse campus events, register, and receive confirmation emails. Based on the [Thomas More starter](https://github.com/JelleOosterboschThomasMore/campus-events).

## Development

Use Node.js 22.22.2 or newer compatible with the starter lockfile, plus Git.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to Express on port 3000. The first server start seeds demo events if there are no events. `npm run seed` resets the database and pending mail jobs; use only with disposable demo data.

## Production preview

In PowerShell:

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
```

Open http://localhost:3000. Express serves the Vue production bundle and API together. For live frontend edits use `npm run dev`.

## Configuration

Copy `api/.env.example` to `api/.env` for local overrides. Never commit credentials or `.env`.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, default 3000 |
| `NODE_ENV` | `production` serves `web/dist`; `test` disables local env loading and logging |
| `DB_STORAGE` | SQLite file, defaults to `api/data/events.sqlite` |
| `LOG_LEVEL` | Winston log level, default `info` |
| `SMTP_URL` | Provider connection, e.g. `smtps://user:password@smtp.example.com:465` |
| `MAIL_FROM` | Your verified sender address |

Without SMTP credentials, registration succeeds and confirmation jobs remain queued. Real delivery requires valid provider settings. Automated tests need no external mail provider, Redis or RabbitMQ.

## Implementation

- `routes/` wires URLs and validation; `controllers/` handles HTTP; `services/` holds business rules; `repositories/` handles Sequelize operations. `db/` defines models and seed data; `config/` holds settings and logging. Services import neither Express nor Sequelize. Only `config/env.mjs` reads application environment variables.
- Registration and its mail job commit in one SQLite transaction. A Nodemailer worker retries delivery failures with exponential backoff capped at one hour and resumes after restart. Registration never waits for SMTP.
- Lists, details, registrations and statistics snapshots use a bounded 30-second server cache. Successful writes clear it after commit. A generation guard prevents stale in-flight reads from repopulating it. Statistics recalculate time-based status per request. Health always queries the database.
- The corrected capacity check, transactions, serialized database work and unique `(eventId, email)` index protect concurrent subscriptions.
- Production static serving, SPA deep links, graceful shutdown, a root start command, Render Blueprint and CI build check prepare the app for hosting.

## API

| Method | URL |
| --- | --- |
| GET | `/api/health` |
| GET / POST | `/api/events` |
| GET / PATCH / DELETE | `/api/events/:id` |
| GET / POST | `/api/events/:id/registrations` |
| GET | `/api/stats` |

Registration takes `{ name, email }`. Errors preserve `{ error: { code, message, details? } }`. API responses use `Cache-Control: no-store` to prevent independent browser/intermediary caching; internal server caching remains enabled.

## Verification

```sh
npm run check
npm run build
```

The original 20 API integration tests remain unchanged. Additional tests cover cache consistency, races, expiry, mail failure/recovery, transaction rollback, concurrent registration, SMTP transport, process restart durability and time-dependent statistics. The existing 10 frontend tests also pass. CI runs lint, tests and build.

## Deployment and submission

This project is local and **not yet publicly deployed**. GitHub Pages alone cannot run the API, database or worker. `render.yaml` prepares a single paid Render service with a persistent SQLite disk. No hosting has been purchased or deployed.

- [Publishing steps](docs/DEPLOYMENT.md)
- [Presentation guide and references](docs/EXPLAINING-THE-SOLUTION.md)
- [Submission checklist and Stack Overflow sources](SUBMISSION.md)

The implementation assumes one Node process and one SQLite database. Email delivery is at least once: a crash after SMTP acceptance but before outbox deletion may cause a duplicate. See the presentation guide for tradeoffs and scaling changes.
