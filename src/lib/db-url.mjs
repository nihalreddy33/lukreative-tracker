/**
 * Resolves the Postgres connection string.
 *
 * Vercel's database integration exposes prefixed names (DATABASE1_DATABASE_URL,
 * DATABASE1_POSTGRES_URL) rather than a plain DATABASE_URL, so rather than
 * requiring a duplicate variable we read whichever is present.
 *
 * A plain DATABASE_URL still wins when set, so a local .env keeps working and
 * anyone can override deliberately.
 */

// Checked in order; first usable value wins.
export const CANDIDATES = [
  "DATABASE_URL",
  "DATABASE1_DATABASE_URL",
  "DATABASE1_POSTGRES_URL",
];

// The name Vercel gives the Accelerate URL. Kept separate: it speaks HTTP and
// needs @prisma/extension-accelerate, so it is never a valid direct connection.
export const ACCELERATE_VAR = "DATABASE1_PRISMA_DATABASE_URL";

const isPlaceholder = (v) =>
  /USER:PASSWORD|user:password|HOST:5432|host:5432\/dbname/.test(v);

const isDirectPostgres = (v) => /^postgres(ql)?:\/\//.test(v);

/**
 * @returns {{url: string, source: string} | {url: null, reason: string}}
 */
export function resolveDatabaseUrl(env = process.env) {
  const seen = [];

  for (const name of CANDIDATES) {
    const value = env[name];
    if (!value) continue;
    seen.push(name);

    if (isPlaceholder(value)) continue; // a stale .env must not shadow a real one
    if (value.startsWith("prisma+postgres://")) continue; // Accelerate, wrong shape
    if (value.startsWith("file:")) continue; // leftover SQLite path
    if (!isDirectPostgres(value)) continue;

    return { url: value, source: name };
  }

  // Nothing usable. Work out the most helpful explanation.
  const acceleratingVars = [ACCELERATE_VAR, ...seen].filter((n) =>
    env[n]?.startsWith("prisma+postgres://")
  );
  if (acceleratingVars.length) {
    return {
      url: null,
      reason:
        `Only an Accelerate URL is available (${acceleratingVars.join(", ")}). It speaks\n` +
        "    HTTP and needs @prisma/extension-accelerate, which this app doesn't use. Set\n" +
        `    one of ${CANDIDATES.join(", ")} to a direct postgres:// connection string.`,
    };
  }

  if (seen.length) {
    return {
      url: null,
      reason:
        `Found ${seen.join(", ")}, but no usable value — still a placeholder, or not a\n` +
        "    postgres:// URL. Paste the real connection string.",
    };
  }

  return {
    url: null,
    reason:
      `None of ${CANDIDATES.join(", ")} is set.\n` +
      "    Set one in .env locally and in your host's environment variables.",
  };
}

/** Host and database only — safe to print, never includes the password. */
export function describeTarget(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(unparseable URL)";
  }
}
