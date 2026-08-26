/**
 * Connection smoke test.  npm run check:db
 *
 * Reports which variable supplied the connection string, opens a real
 * connection, and shows what's in the tables. Every failure explains the fix
 * rather than surfacing a raw driver error.
 */

import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl, describeTarget } from "../src/lib/db-url.mjs";

const die = (msg) => {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
};

const resolved = resolveDatabaseUrl();
if (!resolved.url) die(resolved.reason);

const target = describeTarget(resolved.url);
console.log(`\n  Using ${resolved.source}`);
console.log(`  Connecting to ${target} …`);

const prisma = new PrismaClient({ datasourceUrl: resolved.url });

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("  ✓ Connected.");
} catch (e) {
  const m = e.message || "";
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT/i.test(m)) {
    die(
      `Reached no server at ${target}.\n` +
        "    Check the host and port, and that the database accepts connections\n" +
        "    from your IP (most hosts need sslmode=require)."
    );
  }
  if (/authentication failed|password/i.test(m)) {
    die(`Wrong username or password in ${resolved.source}.`);
  }
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
