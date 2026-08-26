import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./db-url.mjs";

// Built on first use, not at import. auth.js imports this and every page
// imports auth.js, so constructing eagerly meant a misconfigured connection
// string took down every route — including the login page, which needs no
// database at all. Failing here instead surfaces the real reason.
const g = globalThis;

function createClient() {
  const resolved = resolveDatabaseUrl();
  if (!resolved.url) throw new Error(`Database is not configured. ${resolved.reason}`);
  return new PrismaClient({ datasourceUrl: resolved.url });
}

function client() {
  if (!g.__lkPrisma) g.__lkPrisma = createClient();
  return g.__lkPrisma;
}

/** Behaves like a PrismaClient, but connects lazily on first property access. */
export const prisma = new Proxy(
  {},
  {
    get: (_t, prop) => {
      const c = client();
      const v = c[prop];
      return typeof v === "function" ? v.bind(c) : v;
    },
  }
);
