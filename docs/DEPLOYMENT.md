# Free deployment with alwaysdata

The source is in https://github.com/CassyStudent/campus-events (private). The application is live at **https://cassy-campus-events.alwaysdata.net/** on the Free plan. API health, registration, occupancy and persistence after a server restart were verified. SMTP credentials remain unconfigured; registrations are stored and confirmation jobs stay queued. The previous paid Render configuration has been removed.

## Selected plan

Alwaysdata's **Free** plan is listed at EUR 0/month for personal, non-commercial projects, with 1 GB of disk space, 256 MB RAM and a quarter CPU. Its free site address is under `alwaysdata.net`. This is separate from the introductory free month on its paid Plus plans. Choose Free, not Plus.

- [Official offers](https://www.alwaysdata.com/en/offers/)
- [Free plan limits](https://help.alwaysdata.com/en/admin-billing/billing/public-cloud-prices/)
- [Node.js configuration](https://help.alwaysdata.com/en/docs/web-hosting/languages/nodejs/configuration/)
- [Restrictions on unverified accounts](https://help.alwaysdata.com/en/docs/admin-billing/profile/restricted-mode/)

Unverified accounts can have stricter HTTP filtering and outbound mail restrictions. Do not add payment details or upgrade to lift restrictions without the owner's explicit decision. Real SMTP delivery must be verified rather than assumed. Free resources may be sufficient for this small assignment, but deployment and resource use still need testing.

## Account step

The owner created the Free account `cassy-campus-events`. Do not send passwords in chat or commit them to GitHub.

## Deployment settings

Replace `ACCOUNT` with the actual hosting account name:

| Setting | Value |
| --- | --- |
| Site type | Node.js |
| Address | `ACCOUNT.alwaysdata.net` |
| Node.js version | Latest available Node 22 LTS, at least 22.22.2 |
| Working directory | `/home/ACCOUNT/www/campus-events` |
| Command | `node api/src/server.mjs` |
| `NODE_ENV` | `production` |
| `NODEJS_VERSION` | `22` |
| `DB_STORAGE` | `/home/ACCOUNT/data/campus-events/events.sqlite` |
| `IP` / `HOST`, `PORT` | Keep the platform-provided values |
| `SMTP_URL` | Your provider's SMTP URL, entered privately in hosting settings |
| `MAIL_FROM` | A sender authorized by that provider |

In Web > Sites, create or edit the site. The app must bind to the IP and port shown by alwaysdata; its configuration now supports those variables. Use one web process: the mail polling worker runs within it, so a separate paid background service is unnecessary.

Deploy the source from your own private GitHub repository through an authorized connection, or upload a release archive containing the source and built frontend. Keep secrets out of the archive. Linux dependencies must be installed on the Linux host; do not upload Windows `node_modules`.

For a source build, run `npm ci` and `npm run build` before starting the site. If the 256 MB limit prevents building Vite remotely, build the frontend locally or in GitHub Actions and upload `web/dist` with the source, then install only runtime dependencies on the host with `npm ci --omit=dev`. Keep the SQLite directory outside code releases, and never run the destructive seed command against live data.

## Verify before submission

1. Open the HTTPS site address and `/api/health`.
2. Create an event and register using a test email address you control.
3. Confirm the participant and remaining seats update, including previously cached responses.
4. Refresh a frontend deep link and check that unknown `/api` routes return JSON 404s.
5. Restart the site and verify the event and registration persist.
6. Verify real confirmation delivery using authorized SMTP settings. A missing or broken mail provider must leave the registration and pending job stored; restoring delivery must allow retry.
7. Record the verified public URL in `SUBMISSION.md`, and give the teacher access to the private repository.

## GitHub updates

`origin` points to your own repository. The starter is retained as an `upstream` fetch source with its push URL disabled.

```sh
git add .
git commit -m "Describe the change"
git push origin main
```

## Application limits

The original API exposes event management and registration listings without authentication. Use fictional data for public demonstrations. Keep one process, retain database backups, and check disk usage against the free quota. Future schema changes should use migrations; back up an existing database before adding constraints.


## Verified deployment

The site uses Node 22, the command `node /home/cassy-campus-events/www/campus-events/api/src/server.mjs`, working directory `www/campus-events`, and `DB_STORAGE=/home/cassy-campus-events/data/campus-events/events.sqlite`. Source and prebuilt frontend archives were uploaded; production dependencies were installed on Linux. The temporary uploader and SSH key were removed. The test registration is fictional (`Demo Student`, `demo@example.com`). SMTP credentials are still required for real email delivery.
