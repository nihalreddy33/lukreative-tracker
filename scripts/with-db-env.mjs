/**
 * Runs a command with DATABASE_URL populated from whichever connection-string
 * variable is actually set. The Prisma CLI only reads DATABASE_URL, so commands
 * like `prisma db push` need it injected when the host provides a prefixed name.
 *
 *   node scripts/with-db-env.mjs prisma db push
 */

import { spawn } from "node:child_process";
import { resolveDatabaseUrl, describeTarget } from "../src/lib/db-url.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-db-env.mjs <command> [args…]");
  process.exit(2);
}

const resolved = resolveDatabaseUrl();
if (!resolved.url) {
  console.error(`\n  ✗ ${resolved.reason}\n`);
  process.exit(1);
}

console.log(
  `  Using ${resolved.source} → ${describeTarget(resolved.url)}\n`
);

const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: resolved.url },
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
child.on("error", (e) => {
  console.error(`\n  ✗ Could not run "${command}": ${e.message}\n`);
  process.exit(1);
});
