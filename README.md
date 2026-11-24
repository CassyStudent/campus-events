# Campus Events

Students browse campus events, register, and queue confirmation emails. Based on the [Thomas More starter](https://github.com/JelleOosterboschThomasMore/campus-events).

## Assignment submission

- **GitHub project:** [CassyStudent/campus-events](https://github.com/CassyStudent/campus-events)
- **Working online application:** [Open Campus Events](https://cassy-campus-events.alwaysdata.net/)
- **MCP endpoint:** `https://cassy-campus-events.alwaysdata.net/mcp` (Streamable HTTP, JSON responses)

### MCP and live notifications assignment

- `list_events` lets an MCP-compatible AI assistant find `upcoming`, `past` or `all` events. The date filter uses the current server time, including when the event list is cached.
- `register_for_event` accepts an event ID and a `people` array of names and email addresses. One person or a group can register. A group is committed in one transaction; a duplicate, full event or storage failure rolls back the entire group.
- Every connected browser/tab receives a toast when an event is created or a registration commits, including changes made through MCP. Each registration generates one notification, with a unique ID for deduplication. The payload contains only `id`, `type` and `eventId`; participant names and emails are never broadcast or shown in these toasts.
- One application-wide `EventSource` listens to `/api/notifications`. Navigation does not create extra subscriptions. Notifications appear only after the database transaction commits; mail retries never create notifications.

See [MCP setup, example requests and classroom demo](docs/MCP-AND-NOTIFICATIONS.md) for connection instructions and an explanation of the code. This small implementation adds no dependencies and implements the MCP 2025-06-18 JSON-RPC lifecycle and tools over stateless Streamable HTTP.

The backend has been split into routes, controllers, services and repositories. Registration and its confirmation job are saved in a single database transaction, so mail-provider failures do not lose a successful registration. A background worker retries failed emails. GET data is cached, with invalidation after successful changes and protection against stale in-flight requests refilling the cache.

The application runs on alwaysdata's Free plan. Browsing, registration, occupancy, API health and registration persistence after a server restart have been checked. All 56 automated tests and the production build pass, including MCP calls, atomic group rollback, two simultaneous notification streams, anonymous messages and frontend replay deduplication.

**Email delivery status:** the SMTP sender and retry mechanism are implemented and tested, but the live deployment still needs valid SMTP credentials to send real confirmation emails. Registrations are saved and their email jobs remain queued in the meantime.

### Stack Overflow sources used and why

| Source | How it was used |
| --- | --- |
| [Cache invalidation algorithm](https://stackoverflow.com/questions/45118929/cache-invalidation-algorithm) | Used to understand how an older request can finish after invalidation and refill the cache with stale data. This informed the generation counter and its regression test. |
| [Managing a transactional outbox](https://stackoverflow.com/questions/76308901/managing-rapidly-growing-outbox-table-when-implementing-transactional-outbox) | Used to consider the outbox lifecycle and cleanup: successful email jobs are removed, while failed jobs remain stored for retry. This project uses SQLite and SMTP rather than the question's Postgres/Kafka stack. |

The repository is public, so the teacher can open the source and README directly. The [presentation guide](docs/EXPLAINING-THE-SOLUTION.md) explains the architecture, important functions and design choices.

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
| `MCP_ORIGINS` | Comma-separated browser origins allowed to connect to MCP; defaults to localhost ports 3000/5173 and the live site |

Without SMTP credentials, registration succeeds and confirmation jobs remain queued. Real delivery requires valid provider settings. Automated tests need no external mail provider, Redis or RabbitMQ.

## Implementation

- `routes/` wires URLs and validation; `controllers/` handles HTTP; `services/` holds business rules; `repositories/` handles Sequelize operations. `db/` defines models and seed data; `config/` holds settings and logging. Services import neither Express nor Sequelize. Only `config/env.mjs` reads application environment variables.
- Registration and its mail job commit in one SQLite transaction. A Nodemailer worker retries delivery failures with exponential backoff capped at one hour and resumes after restart. Registration never waits for SMTP.
- Lists, details, registrations and statistics snapshots use a bounded 30-second server cache. Successful writes clear it after commit. A generation guard prevents stale in-flight reads from repopulating it. Statistics recalculate time-based status per request. Health always queries the database.
- The corrected capacity check, transactions, serialized database work and unique `(eventId, email)` index protect concurrent subscriptions.
- Production static serving, SPA deep links, graceful shutdown, a root start command, configurable listening address and CI build check prepare the app for hosting.

## API

| Method | URL |
| --- | --- |
| GET | `/api/health` |
| GET / POST | `/api/events` |
| GET / PATCH / DELETE | `/api/events/:id` |
| GET / POST | `/api/events/:id/registrations` |
| GET | `/api/stats` |
| GET | `/api/notifications` (SSE stream) |
| POST | `/mcp` (MCP JSON-RPC; GET returns 405 because MCP sessions are stateless) |

Registration takes `{ name, email }`. Errors preserve `{ error: { code, message, details? } }`. API responses use `Cache-Control: no-store` to prevent independent browser/intermediary caching; internal server caching remains enabled.

## Verification

```sh
npm run check
npm run build
```

The original 20 API integration tests remain unchanged. Additional tests cover cache consistency, races, expiry, mail failure/recovery, transaction rollback, concurrent registration, SMTP transport, process restart durability and time-dependent statistics. The existing 10 frontend tests also pass. CI runs lint, tests and build.

## Deployment and submission

Source code is available in [CassyStudent/campus-events](https://github.com/CassyStudent/campus-events), a public repository. The application is online at **https://cassy-campus-events.alwaysdata.net/**. GitHub Pages alone cannot run the API, database or worker. The selected hosting option is alwaysdata's personal-use Free plan; see the publishing steps below. The server accepts the platform's `IP`/`HOST` and `PORT` settings. No paid hosting has been configured or purchased.

- [Publishing steps](docs/DEPLOYMENT.md)
- [Presentation guide and references](docs/EXPLAINING-THE-SOLUTION.md)
- [Submission checklist and Stack Overflow sources](SUBMISSION.md)

The implementation assumes one Node process and one SQLite database. Email delivery is at least once: a crash after SMTP acceptance but before outbox deletion may cause a duplicate. See the presentation guide for tradeoffs and scaling changes.
