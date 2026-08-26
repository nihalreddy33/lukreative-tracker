import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest, resolveClient } from "@/lib/auth";



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

/**
 * Serves one image. The team sees everything; a client sees an image only when
 * they hold a valid session for that client AND the task is client-visible —
 * an attachment is exactly as private as the task it hangs off.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const attachmentId = Number(id);
  if (!attachmentId || Number.isNaN(attachmentId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      task: { select: { visibleToClient: true, client: { select: { slug: true } } } },
    },
  });
  if (!att) return new NextResponse("Not found", { status: 404 });

  if (!isAdminRequest(request)) {
    const slug = att.task?.client?.slug;
    const allowed =
      att.task?.visibleToClient && slug && (await resolveClient(slug, null, request));
    if (!allowed) return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(att.data), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Length": String(att.size),
      "Content-Disposition": `inline; filename="${att.filename.replace(/"/g, "")}"`,
      // The bytes behind an id never change, so this can be cached hard. Private
      // because the same URL is refused to anyone without the right session.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  const { id } = await params;
  const attachmentId = Number(id);
  if (!attachmentId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.attachment.delete({ where: { id: attachmentId } }).catch(() => {});
  revalidateQuietly("/", "layout");
  return NextResponse.json({ ok: true });
}
