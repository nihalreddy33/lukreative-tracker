import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl, describeTarget, CANDIDATES, ACCELERATE_VAR } from "@/lib/db-url.mjs";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic: GET /api/health
 *
 * Reports which connection-string variables the running function can see, and
 * whether the database answers. Deliberately reports only names, booleans and
 * URL shapes — never a value, so no credential can leak.
 */
export async function GET() {
  const env = process.env;

  const shape = (v) => {
    if (!v) return null;
    if (v.startsWith("prisma+postgres://")) return "prisma+postgres:// (Accelerate)";
    if (v.startsWith("postgres://") || v.startsWith("postgresql://")) return "postgres:// (direct)";
    if (v.startsWith("file:")) return "file: (SQLite)";
    return "unrecognised";
  };

  const variables = {};
  for (const name of [...CANDIDATES, ACCELERATE_VAR]) {
    variables[name] = env[name] ? shape(env[name]) : "not set";
  }

  const report = {
    ok: false,
    variables,
    appSecretSet: !!env.APP_SECRET,
    resolved: null,
    database: null,
    tables: null,
    hint: null,
  };

  const resolved = resolveDatabaseUrl();
  if (!resolved.url) {
    report.hint = resolved.reason.replace(/\s+/g, " ").trim();
    return NextResponse.json(report, { status: 503 });
  }

  report.resolved = { from: resolved.source, target: describeTarget(resolved.url) };

  const prisma = new PrismaClient({ datasourceUrl: resolved.url });
  try {
    await prisma.$queryRaw`SELECT 1`;
    report.database = "connected";

    try {
      const [clients, members, tasks, requests] = await Promise.all([
        prisma.client.count(),
        prisma.member.count(),
        prisma.task.count(),
        prisma.taskRequest.count(),
      ]);
      report.tables = { clients, members, tasks, requests };
      report.ok = true;
      if (!tasks && !clients) {
        report.hint = 'Tables exist but are empty. Run: npm run import -- "<the .xlsx>"';
      }
    } catch (e) {
      report.tables = "missing";
      report.hint =
        "Connected, but the tables do not exist. Run `npm run db:push` locally " +
        "against this same database to create them.";
      report.error = String(e.message || e).split("\n")[0];
      return NextResponse.json(report, { status: 503 });
    }
  } catch (e) {
    report.database = "unreachable";
    report.error = String(e.message || e).split("\n")[0];
    report.hint =
      "The connection string resolved but the server did not answer. Check the " +
      "host, and that the database allows connections (most need sslmode=require).";
    return NextResponse.json(report, { status: 503 });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  return NextResponse.json(report);
}
