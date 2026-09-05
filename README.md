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

## Editing tasks and dependencies

**Edit** on any task row opens the full record — name, client, owner, channel,
priority, status, dates, notes and client visibility. The inline controls in the
table stay for quick nudges.

The same dialog manages **prerequisites**: work that must finish first. Add an
existing task, or create one and assign it on the spot — the usual case, since
"this needs copy first" is normally work nobody has written down yet. A new
prerequisite inherits the client and visibility of the task it unblocks.

A task with unfinished prerequisites shows a "waiting on…" marker in the list.
Circular dependencies are refused, checked across the whole chain rather than
just the direct link.

## Calendar

**Calendar** shows every client's work month by month, tasks placed on their due
date and coloured by client, filterable by client, owner, and whether completed
work is shown. The month is in the URL, so a particular month is a link.

Festivals and public holidays are seeded on first run — Indian national
holidays plus the regional days a Hyderabad agency plans around. Anything can be
edited, removed, or added from the bottom of the page.

The distinction that matters: a day marked *same date every year* (Independence
Day, Republic Day) is stored once and repeats. Lunar and Islamic festivals
(Diwali, Holi, Eid, Onam) are stored against a specific year and never repeat
automatically, because they move — repeating them would silently put them on the
wrong date. 2026 is seeded; later years need their dates adding once known.

Dates were cross-checked against the DoPT gazetted list. Where that disagreed
with the calendar the team already uses (Milad-un-Nabi), the team's calendar won.

## WhatsApp reminders (Interakt)

Each person's card on **Daily reminders** has a **WhatsApp** button that sends
their reminder through [Interakt](https://www.interakt.ai/).

WhatsApp only permits pre-approved templates for business-initiated messages,
and template variables may not contain newlines — so the detailed list cannot be
sent this way. The template carries a name, two counts and a link:

> Hi {{1}}, you have {{2}} tasks needing attention today — {{3}} overdue.
> Full list: {{4}}

That is also a deliberate privacy boundary: **no task titles or client names are
ever sent**. These messages leave through a WhatsApp Business account, and one
client's work should not appear in another's message logs.

Configure with `INTERAKT_API_KEY`, `INTERAKT_TEMPLATE_NAME`,
`INTERAKT_TEMPLATE_LANG`, `INTERAKT_COUNTRY_CODE` and `APP_URL`. With no API key
set, the button reports exactly what it *would* send instead of sending
anything, so the wiring can be checked first. Numbers are stored per member on
the Team page and normalised to what Interakt expects.

## Repeating work

A task can repeat — daily, weekly on chosen days, or monthly on a day of the
month, at any interval. Set it up once from **+ New task**; **Repeating work**
in the sidebar lists the series, pause/resume, and end them.

Each due date becomes its own task, rather than one task whose date keeps
moving, so completion, notes and attachments stay per occurrence and the
history survives. By default a series waits while the previous occurrence is
still open, which stops a month of identical unfinished tasks piling up; that
can be switched off per series.

Occurrences are generated lazily on an admin page load rather than by a
scheduler, so there is no cron to run. Task has a unique
`(recurrenceId, occurrenceDate)`, so two simultaneous page loads can't create
the same occurrence twice — the loser of the race fails harmlessly.

The date maths lives in `src/lib/recurrence.js`, kept pure so it can be checked
without a database or a clock: month-end clamping (the 31st becomes the 30th in
a short month, then returns to the 31st), leap days, and interval anchoring are
all covered.

## Accounts and access

Two kinds of sign-in, both on `/login`:

- **A team member** enters their name (or email) and password. They land on
  `/my` and see only tasks assigned to them.
- **The owner** leaves the name blank and enters `APP_SECRET`. This is the
  break-glass login and is how the app worked before accounts existed — keep it
  working so nobody can be locked out.

An admin manages sign-in from the **Team** page: set or change a password, add
an email, and switch someone between Member and Admin. Passwords are scrypt
hashed with a per-password salt. Changing a password signs that person out
everywhere, since the session signature covers the hash. Saving an empty
password blocks sign-in without touching their task history.

### What a member can and cannot do

A member sees only their own tasks and may change status, dates, notes,
channel, and reference images on them. Who owns a task, which client it belongs
to, its priority and whether the client can see it are scheduling decisions that
stay with an admin — along with approving client requests, managing clients and
share links, deleting tasks, and importing the spreadsheet.

This is enforced in the server actions and route handlers, not just hidden in
the UI: a member editing a field they don't own, or attaching an image to
someone else's task, is refused regardless of what the page offers.

## Reference images

Tasks take reference images. Attach them while creating the task, or later from
**Edit** on any row; a member can do the same on their own tasks from
**My tasks**.

A task carrying images shows a **🖼 N images** badge in the list — clicking it
opens a viewer, with arrow keys and Escape, rather than making you open Edit
just to look at a reference. The browser
downscales each one to 1600px on its longest edge before upload — a phone photo
is typically 4–8 MB, and stored as-is that would bloat every row for no visible
gain. In testing a 3000×2000 image went from 229 KB to 28 KB.

Bytes live in Postgres rather than object storage, so the app stays
self-contained with nothing extra to provision. `/api/attachments/<id>` serves
one image and is exactly as private as the task it hangs off: the team sees
everything, a client sees an image only with a valid session for that client and
only when the task is client-visible. Anyone else gets a 404.

Listing queries select metadata only — never `data` — so browsing tasks never
pulls image bytes out of the database.

## Daily reminders

**Daily reminders** in the sidebar groups every open task by the person who owns
it, split into overdue / due today / the next few days / undated. Each person has
a **Copy for WhatsApp** button producing a plain-text nudge (WhatsApp only
understands `*bold*`, so the rest stays plain), and **Send** opens WhatsApp with
it prefilled. **Copy whole team** produces one digest for a group chat, skipping
anyone with nothing open.

The page refetches when you arrive, when the tab comes back to the front, and
once a minute while it's open, showing "Updated HH:MM" — arriving from a cached
navigation otherwise showed the page as it was earlier.

Dates are computed in **Asia/Kolkata**, not on the host clock. Vercel runs UTC,
so reading the host would roll "due today" over at 05:30 IST rather than
midnight. `AGENCY_TIMEZONE` in `src/lib/dates.js` is the one place to change it.

The range switches between today, three days and a week. What's shown on screen
is the same string that gets copied.

Every open task appears somewhere on the page, including work due beyond the
chosen range, which sits under **Later**. Only the copied message is
range-scoped — it is about what to do now, and a task due next month isn't.
A deactivated member who still holds open work keeps a section too, marked
inactive, rather than their tasks disappearing.

Tasks on **Hold** are left out — chasing somebody about work that is
deliberately paused is noise, and it buries what they can act on. The count is
still noted on screen so held work isn't forgotten, and somebody whose only
remaining work is on hold drops out of the team digest entirely. Their own
`/my` page still lists held tasks.

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

Sign in and use **Import from Excel** in the sidebar, which uploads the workbook
and imports it server-side — the deployment's own credentials are used, so no
connection string has to be copied anywhere.

The same import also runs from the command line against whatever database
`.env` points at:

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

### Variable names

Vercel's database integration creates prefixed names rather than a plain
`DATABASE_URL`. No duplicate variable is needed — the app checks, in order:

| Name | |
|---|---|
| `DATABASE_URL` | set this to override the rest |
| `DATABASE1_DATABASE_URL` | created by Vercel's integration |
| `DATABASE1_POSTGRES_URL` | same, alternative name |

The first usable `postgres://` value wins. Placeholders and leftover `file:`
SQLite paths are skipped rather than shadowing a real value, so a stale `.env`
can't break a deploy.

`DATABASE1_PRISMA_DATABASE_URL` is deliberately **not** in that list: it is the
Accelerate URL, which speaks HTTP and needs `@prisma/extension-accelerate`. If
it's the only one available the app refuses it and says so.

The Prisma CLI only ever reads `DATABASE_URL`, so `npm run db:push` runs through
a small wrapper that injects whichever value was resolved.

Sharing a database with another Prisma app is a trap: this schema defines a
`Task` table and so do others, and `db:push` would alter theirs. Use a separate
database, or append `&schema=lukreative` to isolate it in its own namespace.

## Deploying

Schema changes ship as migrations under `prisma/migrations/`, and the build
runs `prisma migrate deploy` before `next build`. A deploy therefore creates or
updates its own tables using the host's environment variables — no need to copy
a connection string onto a laptop just to run `db:push`.

`GET /api/health` reports which connection variables the running deployment can
see, whether the database answers, and whether the tables exist. It returns only
names, booleans and URL shapes, never a value.

After changing `prisma/schema.prisma`, generate a migration and commit it:

```bash
npx prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$DATABASE_URL" --script > prisma/migrations/<name>/migration.sql
```

For local work against your own database:

1. Set `DATABASE_URL` and `APP_SECRET` in `.env`.
2. `npm run check:db` to confirm the connection string actually works.
3. `npm run db:migrate` to apply migrations (or `npm run db:push` for a
   throwaway database you don't mind rewriting).
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
