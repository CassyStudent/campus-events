# Submission checklist

The application is deployed on alwaysdata Free. Public browsing, registration, API health, occupancy and registration persistence after a restart were checked on 7 November 2026. Real email delivery still requires valid SMTP credentials.

- **Your GitHub repository:** https://github.com/CassyStudent/campus-events (public).
- **Working public application:** https://cassy-campus-events.alwaysdata.net/
- **MCP endpoint:** https://cassy-campus-events.alwaysdata.net/mcp

## MCP and notifications assignment

- MCP tools list upcoming/past/all events and register one person or a group through the shared registration service.
- Event creation and each successful registration produce one anonymous toast in every connected browser/tab. Failed transactions and email retries produce none.
- Notifications contain only a unique ID, notification type and event ID. The frontend suppresses replayed IDs.
- Automated checks: lint, 56 tests and production build pass. See [setup and classroom demo](docs/MCP-AND-NOTIFICATIONS.md).
- Live verification on **24 November 2026**: MCP initialization/discovery, upcoming/past events, group registration, duplicate/capacity rejection and two simultaneous browser pages passed. Each page showed one toast per committed registration, with no participant identity. All three demo registrations remained after restarting the host.

## Stack Overflow sources used and why

- https://stackoverflow.com/questions/45118929/cache-invalidation-algorithm — used to reason about late database reads repopulating invalidated caches; led to the generation guard and its regression test.
- https://stackoverflow.com/questions/76308901/managing-rapidly-growing-outbox-table-when-implementing-transactional-outbox — used to consider durable outbox lifecycle and removing delivered jobs while retaining failed ones.

## Implemented requirements

- API split into routes, controllers, services, repositories, configuration, validation and database modules.
- SMTP confirmation sender and transactional database outbox; failed mail never removes a committed registration.
- Bounded GET data caching, post-commit invalidation and stale in-flight load protection.
- Correct last-seat capacity check, transactional concurrent registration handling and duplicate registration constraint.
- Production frontend serving, start script, free-host deployment instructions, and GitHub CI build check.

See `docs/EXPLAINING-THE-SOLUTION.md` for the presentation walkthrough and `docs/DEPLOYMENT.md` for publishing steps. Do not claim the site is online until its public URL and real registration flow have been checked.
