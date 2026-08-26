import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./db-url.mjs";

// The connection string is resolved at runtime rather than read straight from
// DATABASE_URL, so the prefixed names Vercel's database integration creates
// (DATABASE1_DATABASE_URL and friends) work without a duplicate variable.
const resolved = resolveDatabaseUrl();

// Reuse one client across hot reloads in dev so we don't exhaust connections.
const g = globalThis;
export const prisma =
  g.__lkPrisma ??
  new PrismaClient(resolved.url ? { datasourceUrl: resolved.url } : undefined);
if (process.env.NODE_ENV !== "production") g.__lkPrisma = prisma;
