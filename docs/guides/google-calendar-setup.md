# Google Calendar setup (one-way push)

Corta pushes classes, exams, submissions, holidays and study sessions into a **dedicated "Corta" calendar** in
your Google account. It's one-way: edits made in Google are overwritten on the next sync. It uses the
`calendar.app.created` scope, which only allows touching calendars the app itself created, so your other
calendars are physically out of reach.

## 1. Create OAuth credentials (once)

1. Go to <https://console.cloud.google.com/>, create a project (e.g. "Corta").
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**: User type *External*, app name "Corta", your email as support
   and developer contact. Under *Test users* add your own Google account. (Leaving it in *Testing* is fine.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type **Desktop app**.
5. Copy the client ID and secret into `.env`:

```dotenv
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
```

6. Restart Corta (`start.ps1`).

## 2. Connect and sync

On Home, click **Google** (calendar toolbar). The first time it sends you to Google to approve; you come back
to Corta and the first sync runs automatically. After that, the same button pushes the current state.

- Tokens are stored in the local SQLite database (`server/data/corta.db`, settings key `secret.gcal.tokens`),
  never in files that go to git.
- Each derived event is linked to its Google event (`gcal_links` table) and updated in place; events that no
  longer exist in Corta are deleted from the Corta calendar.
- If you delete the "Corta" calendar in Google, the next sync creates a new one.
- To disconnect: `POST http://localhost:8787/api/gcal/disconnect` (or delete the `secret.gcal.tokens` setting).

Troubleshooting: "access blocked / app not verified" → add yourself as a test user (step 3). Redirect errors →
the API must run on the port in `CORTA_PORT` (default 8787); desktop clients accept any localhost port.
