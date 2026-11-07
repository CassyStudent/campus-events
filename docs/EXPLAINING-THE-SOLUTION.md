# Presentation guide

Read the implementation and run the failure demonstrations before presenting. This guide explains the choices; it does not replace understanding the code.

## Request flow

`routes → validation → controller → service → repository → SQLite`

- `app.mjs` composes Express middleware, API routes, production static files and the error handler.
- `config/env.mjs` is the only application module reading environment variables. It loads `api/.env` regardless of the working directory. Defaults let tests and local development run without external services.
- `config/logger.mjs` builds the JSON logger and silences it during tests.
- `validation/schemas.mjs` preserves the starter's Zod schemas. `validate.mjs` stores parsed input in `res.locals`, because Express 5 request properties should not be overwritten indiscriminately.
- `routes/events.mjs` connects URLs and validation to controller functions.
- `controllers/events.mjs` translates HTTP requests and responses. Business decisions belong in services.
- `services/events.mjs` checks existence, duplicate registrations and capacity, calculates statistics and coordinates cached reads and transactional writes. It imports neither Express nor Sequelize.
- `repositories/events.mjs` translates plain data operations into Sequelize calls. Its transaction callback receives a repository context, so service code can perform several operations atomically without knowing SQL or Sequelize.
- `db/models.mjs` defines the tables and associations. The unique `(eventId, email)` index adds a database safeguard against duplicate subscriptions. `db/demo.mjs` contains the original seed data.
- `errors/AppError.mjs` represents expected application failures. `middleware/errors.mjs` preserves the existing JSON error contract and hides unexpected error details from clients.

## Why registration survives email failures

Sending mail inside the HTTP handler makes a successful subscription depend on an external provider. Sending mail before saving can produce confirmations for registrations that never existed. Saving first and then keeping a job only in memory loses delivery work if the process stops.

Instead, one SQLite transaction performs the existence/duplicate/capacity checks, inserts the registration and inserts a `MailJob`. All database calls receive the same transaction. An exception rolls back both inserts. A successful commit returns HTTP 201 without waiting for SMTP.

`mailWorker.mjs` polls pending jobs in batches of 20. `sender.mjs` uses the existing Nodemailer dependency with SMTP connection and socket timeouts. Successful deliveries delete their outbox row. Failures increment attempts and schedule another attempt with exponential backoff capped at one hour. There is no fixed retry limit, so a long provider outage does not discard pending confirmations. Polling errors are logged, and later polls try again. Restarting the app resumes database-backed pending work.

The worker shares an in-flight promise between overlapping polls. A slow SMTP request therefore cannot cause two polls in this process to send the same job simultaneously. `stop()` stops polling and waits for current work during shutdown. Recipient addresses, message bodies and SMTP errors are not logged.

**Delivery is at least once, not exactly once.** If SMTP accepts a message and the process stops before deleting its job, a retry may deliver a duplicate. A stable Message-ID is provided, but SMTP does not guarantee deduplication. The tests deliberately check registration durability separately from delivery. Real delivery additionally needs valid SMTP credentials and a verified sender.

The queue stores a snapshot of the confirmation at registration time. Deleting an event does not cancel a confirmation already queued for a successful registration.

## Why concurrent registrations cannot take the same last seat

The original `count > capacity` check allowed one extra registration. The service now checks `count >= capacity`. The check and insert run in an IMMEDIATE SQLite transaction. A shared promise queue serializes database operations in this single process, preventing overlapping SQLite transactions and reads from sharing an active transaction connection. A rejected operation is caught on the queue tail so later requests still run; the original caller still receives the error.

The database unique index independently protects `(eventId, email)`. This solution deliberately deploys one process and one worker; it does not claim to support multiple API replicas or external database writers. Scaling requires shared invalidation, a shared database suitable for concurrent writers, and atomic job claiming.

## How the cache stays correct

`cache/cache.mjs` implements cache-aside: return an unexpired cached value, otherwise load from the repository. Defaults are a 30-second TTL and a maximum of 200 entries. Oldest inserted entries are evicted when full. Values are cloned to prevent callers from mutating the stored result. Errors are not cached.

Cached database reads cover the event list, event detail, registrations and statistics. After every successful create, update, delete or registration transaction, `change()` clears all entries before the mutation response is returned. Global invalidation is intentionally simple for a small campus app; it avoids missing dependencies between registrations, detail counts and statistics.

TTL alone would leave stale data after writes. Clearing alone also has a race: an older database read might finish after a write and insert stale data into the newly cleared cache. The generation counter increments on clear. A loader only inserts its result if the generation still matches the one at its start. An already-running read can observe the state before an overlapping write; subsequent requests after the completed mutation use the new generation.

The statistics cache stores database facts. Time-based `past` status is calculated on each request, including cache hits. `/api/health` always contacts the database; caching it would hide outages. API responses use `Cache-Control: no-store`, so browsers and intermediary caches cannot independently retain registration data or stale API responses. This header does not disable the server's internal cache.

## Frontend design

The frontend uses the supplied pastel reference: lavender/peach background gradients, translucent white cards, rounded controls and glossy decorative orbs. `web/src/styles.css` contains the shared tokens, layouts, responsive breakpoints and reduced-motion treatment. `CampusOrbit.vue` uses CSS circles and inline SVG icons instead of external image files or a new dependency. It is marked `aria-hidden` because it is decorative. The homepage remains driven by the existing events API; the upcoming count comes from its existing computed list. System fonts avoid a remote font download. Registration, occupancy and creation use the same shared styles. Automated checks pass, with desktop and mobile browser checks for layout and overflow.

## Deployment

`npm run build` creates the Vue production bundle. With `NODE_ENV=production`, Express serves that bundle and the API from one origin, including Vue Router fallback on deep links. API 404s remain JSON. `PORT` is supplied by the host. `DB_STORAGE` points to a persistent disk. `render.yaml` prepares a single paid Render web service with that disk; creating it incurs hosting charges and has not been performed here.

GitHub Pages can serve the portfolio's static files, but cannot run this Node API, SQLite database or mail worker. The local preview is not a public deployment and is not the working online URL required for submission.

## Tests to explain

Run `npm run check` and `npm run build`.

- The original 20 HTTP integration tests remain unchanged.
- The existing 10 Vue/client tests still pass.
- New tests exercise cache hits, expiration, bounded size, mutation invalidation, mutable values, load errors and in-flight cache races.
- New HTTP/database tests check SMTP failure/recovery, rollback on an outbox insert failure, last-seat concurrency and duplicate concurrency.
- A test opens a real local SMTP connection through Nodemailer and checks the transmitted confirmation.
- A test starts two separate Node processes against a temporary SQLite file to prove pending jobs survive a restart.
- Statistics crossing an event's start time and no-store response headers are checked explicitly.

## Suggested live demonstration

1. Run the app without SMTP credentials. Register for an event and show the registration and remaining seats update successfully.
2. Run the automated offline/recovery test and explain the durable pending job and retry timestamp.
3. Warm detail and statistics pages, register, then reload them to show fresh counts.
4. Run the concurrent last-seat test and explain why one request gets 201 and the other gets 409.
5. Walk through `events.register`, `repository.write`, `cache.get`, `change` and the worker's `deliver` function.

## Questions to practice

- What happens if SMTP accepts an email but deleting its job fails?
- What happens if writing the outbox row fails?
- Why must invalidation happen after commit and before returning success?
- Why is a TTL insufficient for correctness?
- Why is health deliberately uncached?
- What would need to change to run two API instances?
- Which data must survive a redeploy, and where is it stored?

## References actually consulted

1. [Stack Overflow: Cache invalidation algorithm](https://stackoverflow.com/questions/45118929/cache-invalidation-algorithm). Used to identify the late-reader race and choose a generation counter; no answer was copied verbatim. A regression test reproduces this race.
2. [Stack Overflow: Managing a rapidly growing transactional outbox](https://stackoverflow.com/questions/76308901/managing-rapidly-growing-outbox-table-when-implementing-transactional-outbox). Used to consider outbox lifecycle and cleanup. This app deletes delivered jobs so successful deliveries do not accumulate indefinitely; pending jobs remain until delivered. It uses SQLite and SMTP rather than the question's Postgres/Kafka stack.
3. [Sequelize managed transactions](https://sequelize.org/docs/v6/other-topics/transactions/). Primary reference for commit/rollback behavior and explicitly passing the transaction to every database operation.
4. [Nodemailer SMTP transport](https://nodemailer.com/smtp). Primary reference for SMTP URL configuration and transport timeouts.
5. [Render persistent disks](https://render.com/docs/disks). Primary reference for preserving SQLite on a hosted filesystem; ephemeral service storage would lose registrations on redeploy.
