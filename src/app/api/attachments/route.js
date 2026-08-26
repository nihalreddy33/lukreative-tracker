import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import {
  ATTACHMENT_FIELDS,
  MAX_UPLOAD_BYTES,
  ALLOWED_TYPES,
  looksLikeImage,
} from "@/lib/attachments";

/**
 * revalidatePath throws "static generation store missing" from route handlers
 * whose async context has been broken by reading the request body. The client
 * calls router.refresh() after these calls anyway, so a failure here must not
 * turn a successful write into a 500.
 */
function revalidateQuietly(path, type) {
  try {
    revalidatePath(path, type);
  } catch {
    // Nothing to do — the caller refreshes.
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST multipart: taskId, file, optional caption. Team session required. */
export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const taskId = Number(form.get("taskId"));
  const file = form.get("file");

  if (!taskId || Number.isNaN(taskId)) {
    return NextResponse.json({ error: "Missing task." }, { status: 400 });
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No image was attached." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `That image is ${(file.size / 1e6).toFixed(1)} MB; the limit is 4 MB.` },
      { status: 413 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP and GIF images can be attached." },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buffer)) {
    return NextResponse.json({ error: "That file isn't a real image." }, { status: 415 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "That task no longer exists." }, { status: 404 });

  const created = await prisma.attachment.create({
    data: {
      taskId,
      filename: String(form.get("filename") || file.name || "image").slice(0, 180),
      mimeType: file.type,
      size: buffer.length,
      width: Number(form.get("width")) || null,
      height: Number(form.get("height")) || null,
      caption: String(form.get("caption") || "").slice(0, 300),
      data: buffer,
    },
    select: ATTACHMENT_FIELDS,
  });

  revalidateQuietly("/", "layout");
  return NextResponse.json({ ok: true, attachment: created });
}
