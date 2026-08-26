import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { parseWorkbook, applyToDatabase } from "@/lib/import-tracker.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

/** POST an .xlsx as multipart form-data. Team session required. */
export async function POST(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  let file;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1e6).toFixed(1)} MB; the limit is 4 MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // An .xlsx is a zip; anything else fails here rather than deep in the parser.
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return NextResponse.json(
      { error: "That doesn't look like an .xlsx file. Export from Excel as .xlsx, not .xls or .csv." },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed = parseWorkbook(buffer);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  if (!parsed.tasks.length) {
    return NextResponse.json(
      { error: "Found the task sheets but no rows with a task name in column B." },
      { status: 400 }
    );
  }

  try {
    const result = await applyToDatabase(prisma, parsed);
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      sheets: parsed.sheets,
      clients: result.clients.length,
      members: result.memberCount,
      created: result.created,
      updated: result.updated,
      total: parsed.tasks.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Import failed: ${String(e.message || e).split("\n")[0]}` },
      { status: 500 }
    );
  }
}
