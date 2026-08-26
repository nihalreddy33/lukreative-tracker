import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads in dev so we don't exhaust connections.
const g = globalThis;
export const prisma = g.__lkPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__lkPrisma = prisma;
