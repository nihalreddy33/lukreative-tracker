import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, resolveClient } from "@/lib/auth";

export const dynamic = "force-dynamic";

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


/**
 * Builds a Content-Disposition value that cannot break the response.
 *
 * HTTP headers are latin1, and real filenames are not: a macOS screenshot is
 * named "Screenshot … at 10.24.15 AM.png" using U+202F, a narrow no-break
 * space. Putting that straight into a header throws while constructing the
 * Response, so the whole image 500s and renders as a broken thumbnail.
 *
 * So: an ASCII-safe fallback for `filename`, plus the real name in RFC 5987
 * form for clients that understand it.
 */
function contentDisposition(filename) {
  const safe =
    (filename || "image")
      .replace(/[\r\n"\\]/g, "")       // quotes and control characters
      .replace(/[^\x20-\x7E]/g, "_")     // anything outside printable ASCII
      .trim() || "image";
  const encoded = encodeURIComponent(filename || "image");
  return `inline; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

const parseId = (raw) => {
  const n = Number(raw);
  return n && !Number.isNaN(n) ? n : null;
};

/**
 * May this caller see the image? Admins yes; a member only on their own task;
 * a client only with a valid session for their client and only when the task is
 * client-visible.
 */
async function canRead(session, att, request) {
  if (session?.isAdmin) return true;
  if (session?.memberId && att.task?.assigneeId === session.memberId) return true;

  const slug = att.task?.client?.slug;
  if (!att.task?.visibleToClient || !slug) return false;
  return !!(await resolveClient(slug, null, request));
}

export async function GET(request, { params }) {
  const id = parseId((await params).id);
  if (!id) return new NextResponse("Not found", { status: 404 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: {
      task: {
        select: {
          assigneeId: true,
          visibleToClient: true,
          client: { select: { slug: true } },
        },
      },
    },
  });
  if (!att) return new NextResponse("Not found", { status: 404 });

  const session = await getSession(request);
  // 404 rather than 403, so a refusal doesn't confirm the image exists.
  if (!(await canRead(session, att, request))) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(att.data), {
    headers: {
      "Content-Type": att.mimeType,
      // Content-Length is left to the runtime: setting it by hand goes wrong
      // the moment the platform compresses the response.
      "Content-Disposition": contentDisposition(att.filename),
      // The bytes behind an id never change, so this can be cached hard. Private
      // because the same URL is refused to anyone without the right session.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(request, { params }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    select: { id: true, task: { select: { assigneeId: true } } },
  });
  if (!att) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!session.isAdmin && att.task?.assigneeId !== session.memberId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  await prisma.attachment.delete({ where: { id } });
  revalidateQuietly("/", "layout");
  return NextResponse.json({ ok: true });
}
