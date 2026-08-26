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
npm run db:push     # create the database from prisma/schema.prisma
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

## Deploying

Local dev uses SQLite. For a deployment your clients can reach, switch to Postgres:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to the Postgres connection string and `APP_SECRET` to a real password.
3. `npm run db:push`, then `npm run import -- <xlsx>` against the new database.

Every field type in the schema is valid on both, so nothing else changes.

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
