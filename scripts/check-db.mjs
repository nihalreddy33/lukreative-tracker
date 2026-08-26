/**
 * Connection smoke test.  npm run check:db
 *
 * Validates DATABASE_URL, opens a real connection, reports whether the tables
 * exist and what's in them. Every failure explains the fix rather than
 * surfacing a raw driver error.
 */

import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;

const die = (msg) => {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
};

if (!url) {
  die(
    "DATABASE_URL is not set.\n" +
      "    Add it to .env locally, and to Vercel's environment variables for deploys.\n" +
      "    Vercel may have named it DATABASE1_DATABASE_URL — Prisma only reads\n" +
      "    DATABASE_URL, so add a plain one with the same value."
  );
}

if (url.startsWith("prisma+postgres://")) {
  die(
    "That's the Prisma Accelerate URL.\n" +
      "    It speaks HTTP and needs @prisma/extension-accelerate, which this app\n" +
      "    doesn't use. Use the direct connection string instead — the value that\n" +
      "    starts with postgres:// (DATABASE1_DATABASE_URL or DATABASE1_POSTGRES_URL)."
  );
}

if (url.startsWith("file:")) {
  die(
    "That's a SQLite path, but the datasource provider is postgresql.\n" +
      "    Put a postgres:// connection string in .env."
  );
}

if (!/^postgres(ql)?:\/\//.test(url)) {
  die(`DATABASE_URL should start with postgres:// — got "${url.slice(0, 24)}…"`);
}

if (/USER:PASSWORD|user:password|HOST:5432/.test(url)) {
  die("DATABASE_URL is still the placeholder. Paste your real connection string into .env.");
}

// Show where we're connecting without leaking the password.
let target = "(unparseable URL)";
try {
  const u = new URL(url);
  target = `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
} catch {}

console.log(`\n  Connecting to ${target} …`);

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("  ✓ Connected.");
} catch (e) {
  const m = e.message || "";
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT/i.test(m)) {
    die(
      `Reached no server at ${target}.\n` +
        "    Check the host and port, and that the database allows connections\n" +
        "    from your IP (most hosts need sslmode=require)."
    );
  }
  if (/authentication failed|password/i.test(m)) die("Wrong username or password in DATABASE_URL.");
  if (/does not exist/i.test(m)) die(`The database named in the URL doesn't exist: ${target}`);
  die(m.split("\n")[0]);
}

try {
  const [clients, members, tasks, requests, pending] = await Promise.all([
    prisma.client.count(),
    prisma.member.count(),
    prisma.task.count(),
    prisma.taskRequest.count(),
    prisma.taskRequest.count({ where: { status: "pending" } }),
  ]);

  console.log("  ✓ Tables present.\n");
  console.log(`    clients   ${clients}`);
  console.log(`    members   ${members}`);
  console.log(`    tasks     ${tasks}`);
  console.log(`    requests  ${requests}${pending ? ` (${pending} pending)` : ""}`);

  if (!tasks && !clients) {
    console.log("\n  Database is empty. Load the tracker with:");
    console.log('    npm run import -- "<path to the .xlsx>"');
  }
  console.log("");
} catch (e) {
  if (/does not exist|relation .* does not exist|P2021/i.test(e.message)) {
    die("Connected, but the tables aren't there yet. Create them with:\n    npm run db:push");
  }
  die(e.message.split("\n")[0]);
} finally {
  await prisma.$disconnect();
}
