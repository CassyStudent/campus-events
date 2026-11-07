# Submission checklist

The implementation is local and tested. This file is not yet a completed submission: the two public URLs must be filled in after publishing and verifying the live app.

- **Your GitHub repository:** pending creation/push under your account.
- **Working public application:** pending backend deployment. The localhost preview is only available on this computer and is not the submission URL.

## Stack Overflow sources used and why

- https://stackoverflow.com/questions/45118929/cache-invalidation-algorithm — used to reason about late database reads repopulating invalidated caches; led to the generation guard and its regression test.
- https://stackoverflow.com/questions/76308901/managing-rapidly-growing-outbox-table-when-implementing-transactional-outbox — used to consider durable outbox lifecycle and removing delivered jobs while retaining failed ones.

## Implemented requirements

- API split into routes, controllers, services, repositories, configuration, validation and database modules.
- SMTP confirmation sender and transactional database outbox; failed mail never removes a committed registration.
- Bounded GET data caching, post-commit invalidation and stale in-flight load protection.
- Correct last-seat capacity check, transactional concurrent registration handling and duplicate registration constraint.
- Production frontend serving, start script, Render deployment definition, and GitHub CI build check.

See `docs/EXPLAINING-THE-SOLUTION.md` for the presentation walkthrough and `docs/DEPLOYMENT.md` for publishing steps. Do not claim the site is online until its public URL and real registration flow have been checked.
