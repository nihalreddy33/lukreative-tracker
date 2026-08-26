/**
 * Imports the Excel tracker from the command line.
 *
 *   npm run import -- "/path/to/Lukreative Digital Marketing Task Tracker.xlsx"
 *
 * The same logic backs the in-app upload at /import, so both stay in step.
 * Idempotent: re-running updates rather than duplicating.
 */

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl, describeTarget } from "../src/lib/db-url.mjs";
import { parseWorkbook, applyToDatabase } from "../src/lib/import-tracker.mjs";

const resolved = resolveDatabaseUrl();
if (!resolved.url) {
  console.error(`\n  \u2717 ${resolved.reason}\n`);
  process.exit(1);
}

const path =
  process.argv[2] ||
  `${process.env.HOME}/Downloads/Lukreative Digital Marketing Task Tracker.xlsx`;

console.log(`Using ${resolved.source} \u2192 ${describeTarget(resolved.url)}`);

const prisma = new PrismaClient({ datasourceUrl: resolved.url });

try {
  const parsed = parseWorkbook(readFileSync(path));
  console.log(`Read ${parsed.tasks.length} task rows from ${parsed.sheets.length} sheet(s).`);

  const result = await applyToDatabase(prisma, parsed);
  console.log(
    `Done. ${result.clients.length} clients, ${result.memberCount} team members, ` +
      `${result.created} tasks created, ${result.updated} updated.`
  );

  for (const c of result.clients) {
    console.log(`  ${c.name.padEnd(22)} /c/${c.slug}?k=${c.shareToken}`);
  }
} catch (e) {
  console.error(`\n  \u2717 ${e.message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
