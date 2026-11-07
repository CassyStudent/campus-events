# Publishing when ready

The project is currently prepared locally, following the portfolio workflow. No GitHub repository or public deployment has been created by this work.

## GitHub

Create a new empty repository named `campus-events` under your own GitHub account. Do not initialize it with another README. From this project's directory:

```sh
git add .
git commit -m "Refactor API, add durable mail delivery and consistent GET caching"
git remote rename origin upstream
git remote add origin https://github.com/YOUR-USERNAME/campus-events.git
git push -u origin main
```

The cloned starter history is retained. Replace `YOUR-USERNAME`. Check GitHub Actions is green. Never commit `.env`, SMTP credentials, SQLite files or `node_modules`.

## Render

The included `render.yaml` defines a **paid** Starter Node web service with a 1 GB persistent disk. Check the current hosting cost in Render before creating it. A free service's temporary filesystem is not appropriate for durable SQLite registrations. Hosting has not been purchased or deployed.

1. Connect your new repository to Render and create a Blueprint using `render.yaml`.
2. Set `SMTP_URL` to your provider's SMTP connection URL and `MAIL_FROM` to a verified sender. Enter credentials in Render's environment settings, not source code. URL-encode special characters in the SMTP username/password. Check that the provider and selected hosting plan permit outbound SMTP.
3. The definition uses `npm ci && npm run build`, then `npm start`.
4. It sets `NODE_ENV=production`, Node 22.22.2 and `DB_STORAGE=/var/data/events.sqlite`, with the disk mounted at `/var/data`. Render supplies `PORT`.
5. Keep one instance. The internal cache, database work queue and outbox worker assume one Node process.
6. Wait for a successful deploy and `/api/health` to return `{ "status": "ok" }`.
7. Open the public URL, create an event, register with your own real email address and verify both the registration and received confirmation. Warm event/detail/stats responses before changing data, then verify refreshed values.
8. Restart the service and verify the event and registration remain. Temporarily configure an invalid SMTP credential, register for another event and confirm registration still succeeds; restore the credential and verify eventual delivery after backoff. Do not delete the persistent disk.
9. Put the repository and public application URLs in `SUBMISSION.md`.

The app serves both the Vue frontend and `/api` at one origin; a separate static host is unnecessary. Refreshing a Vue route returns the SPA, while `/api/unknown` returns a JSON 404.

## Limits inherited from the starter

The assignment starter exposes event management and registration listing without authentication. This implementation preserves that contract. Use fictional demo data for public presentation. Authentication/authorization would be a separate feature before using it with real campus data.

`sequelize.sync()` adds the outbox table and missing indexes. Existing duplicate `(eventId, email)` rows must be resolved before adding the unique index to a previously modified database. Back up an existing database before deploying; use migrations for future schema changes rather than destructive sync options.
