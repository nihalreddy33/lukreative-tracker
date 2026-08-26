/**
 * Runs a command with DATABASE_URL populated from whichever connection-string
 * variable is actually set. The Prisma CLI only reads DATABASE_URL, so commands
 * like `prisma migrate deploy` need it injected when the host provides a
 * prefixed name such as DATABASE1_DATABASE_URL.
 *
 *   node scripts/with-db-env.mjs prisma migrate deploy
 *
 * This runs inside the deploy build, where a failure takes the whole deployment
 * down and the only evidence is the build log. So it ends with a single,
 * unmistakable line naming the cause, and retries the one failure that is
 * genuinely transient — not being able to reach the database.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl, describeTarget, CANDIDATES } from "../src/lib/db-url.mjs";

// Build hosts don't reliably put node_modules/.bin on PATH, so add it
// ourselves — otherwise `prisma` isn't found during a deploy.
const localBin = join(dirname(dirname(fileURLToPath(import.meta.url))), "node_modules", ".bin");

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-db-env.mjs <command> [args…]");
  process.exit(2);
}

const fail = (reason, detail) => {
  console.error("");
  console.error("──────────────────────────────────────────────────────────────");
  console.error(`  STEP FAILED: ${command} ${args.join(" ")}`);
  console.error(`  CAUSE: ${reason}`);
  if (detail) console.error(`  DETAIL: ${detail}`);
  console.error("──────────────────────────────────────────────────────────────");
  process.exit(1);
};

const resolved = resolveDatabaseUrl();
if (!resolved.url) {
  fail(
    "no usable database connection string",
    `${resolved.reason.replace(/\s+/g, " ").trim()} (looked for ${CANDIDATES.join(", ")})`
  );
}

console.log(`  Using ${resolved.source} → ${describeTarget(resolved.url)}`);

/** Runs the child once, streaming output while keeping a copy for diagnosis. */
function runOnce() {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, DATABASE_URL: resolved.url, PATH: `${localBin}:${process.env.PATH ?? ""}` },
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let output = "";
    const tap = (stream, out) =>
      stream.on("data", (d) => {
        output += d;
        out.write(d);
      });
    tap(child.stdout, process.stdout);
    tap(child.stderr, process.stderr);

    child.on("error", (e) => resolve({ code: 1, output: `${output}\n${e.message}`, spawnError: e }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

const TRANSIENT = /P1001|P1017|ECONNRESET|ETIMEDOUT|EAI_AGAIN|Can't reach database server|Timed out/i;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let result;
for (let attempt = 1; attempt <= 3; attempt++) {
  result = await runOnce();
  if (result.code === 0) process.exit(0);

  if (result.spawnError?.code === "ENOENT") {
    fail(`could not run "${command}"`, `not found on PATH, including ${localBin}`);
  }
  if (!TRANSIENT.test(result.output) || attempt === 3) break;

  console.error(`  Could not reach the database (attempt ${attempt} of 3) — retrying…`);
  await wait(attempt * 4000);
}

// Surface the most useful line from the child rather than the whole dump.
const line =
  result.output
    .split("\n")
    .map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim())
    .filter(Boolean)
    .find((l) => /^(Error|error:|P\d{4})|Error:|error code/i.test(l)) || `exit code ${result.code}`;

fail(`${command} ${args.join(" ")} failed`, line);
