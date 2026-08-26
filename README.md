# Lukreative Solutions — Task Tracker

Agency-side task management with per-client dashboards, a private share link per
client, and an approval queue for work clients ask for.

Two audiences, one app:

| | Agency (your team) | Client |
|---|---|---|
| Gets in via | `/login` + team password | a private link, no signup |
| Sees | every client, every task | only their own visible tasks |
| Can | create/edit/assign/complete tasks, approve or decline requests | track progress, submit requests |

## How the client link works

Each client has one secret token. Their link looks like:

```
https://your-domain.com/c/akan?k=XP_2oV2mhjtH1Efa2Bscop_0
```

On first open the token is swapped for a cookie and stripped from the address
bar, so it stays out of screenshots and browser history. Later visits to
`/c/akan` just work.

- The cookie is scoped per client — an Akan link never opens another client's board.
- **Regenerate link** on the Clients page invalidates the old URL immediately.
- **Archive** a client and their link stops working; their tasks are kept.
- Any task can be flipped to **Hidden** so internal work never shows up client-side.

## Approval flow

1. Client submits a request from their portal.
2. It lands in **Client requests** (red badge in the sidebar). Nothing reaches
   the team board yet.
3. You approve — setting owner, priority, due date, channel, and an optional
   note back — and it becomes a real task. Or you decline with a reason.
4. Either way the client sees the outcome and your note in **Your requests**.

Approval creates the request update and the task in one transaction, so a
request can never read "approved" without the task actually existing.

## Running it

```bash
npm install
npm run db:push     # create the tables (needs DATABASE_URL set — see below)
npm run dev         # http://localhost:3200
```

The team password is `APP_SECRET` in `.env`. Change it before anyone else uses this.

### Importing the Excel tracker

```bash
npm run import -- "/path/to/Lukreative Digital Marketing Task Tracker.xlsx"
```

Reads both the open and completed task sheets, creates clients and team members
from the Client and Assignee columns, and converts Excel serial dates to real
dates. Re-running updates instead of duplicating — tasks are matched on
(title, client). It prints every client's share link when it finishes.

The Dashboard and Calc_Data sheets are ignored; the app recomputes those numbers.

## Database configuration

`DATABASE_URL` must be a **direct** Postgres connection string:

```
postgres://user:password@host:5432/dbname?sslmode=require
```

Not the `prisma+postgres://` Accelerate URL — that speaks HTTP and would need
`@prisma/extension-accelerate`, which this app does not use.

It goes in two places:

- **Locally** — `.env` (gitignored, never deployed).
- **On Vercel** — Settings → Environment Variables, ticked for Production,
  Preview *and* Development. `APP_SECRET` goes here too.

If you connected the database through Vercel's integration, it may have created
prefixed names like `DATABASE1_DATABASE_URL`. Prisma only reads `DATABASE_URL`,
so add a plain `DATABASE_URL` with the same value rather than renaming things —
that keeps local and production identical and lets the Prisma CLI work.

Sharing a database with another Prisma app is a trap: this schema defines a
`Task` table and so do others, and `db:push` would alter theirs. Use a separate
database, or append `&schema=lukreative` to isolate it in its own namespace.

## Deploying

1. Set `DATABASE_URL` and `APP_SECRET` in `.env` and in Vercel.
2. `npm run check:db` to confirm the connection string actually works.
3. `npm run db:push` to create the tables.
4. `npm run import -- <xlsx>` to load the tracker — this prints fresh share
   links, and they are new tokens, so send the new ones out.

## Layout

```
prisma/schema.prisma      Client, Member, Task, TaskRequest
scripts/import-xlsx.mjs   one-time Excel import
scripts/xlsx.mjs          dependency-free .xlsx reader
src/lib/auth.js           team session + per-client share-link sessions
src/lib/actions.js        every mutation (server actions, auth checked in each)
src/lib/metrics.js        the rollups every dashboard shows
src/lib/dates.js          date-only helpers; due dates are "YYYY-MM-DD" strings
src/app/(agency)/         overview, tasks, requests, clients, team
src/app/c/[slug]/         the client portal
```

Dates are stored as date-only strings rather than timestamps, so a task due the
24th is due the 24th regardless of timezone.
