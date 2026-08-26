"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prettySize, MAX_UPLOAD_BYTES } from "@/lib/attachments";

const MAX_EDGE = 1600; // plenty for a reference image on any screen

/**
 * Shrinks an image in the browser before upload. A phone photo is often 4–8 MB;
 * stored as-is that would bloat every row for no visible gain, and would blow
 * the request limit outright.
 *
 * Returns the original file untouched if anything about the canvas path fails,
 * or if it's a GIF (which would lose its animation).
 */
async function downscale(file) {
  if (file.type === "image/gif") return { blob: file, width: null, height: null };

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    // Already small and already compressed — leave it alone.
    if (scale === 1 && file.size < 600_000) {
      return { blob: file, width: bitmap.width, height: bitmap.height };
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);

    // PNG screenshots of flat UI keep their crispness; photos go to JPEG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((res) => canvas.toBlob(res, type, 0.85));
    if (!blob || blob.size >= file.size) {
      return { blob: file, width: bitmap.width, height: bitmap.height };
    }
    return { blob, width: w, height: h };
  } catch {
    return { blob: file, width: null, height: null };
  }
}

export default function Attachments({ taskId, attachments = [], readOnly = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const input = useRef(null);
  const router = useRouter();

  async function upload(files) {
    setError(null);
    setBusy(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setError(`${file.name} isn't an image.`);
          continue;
        }
        const { blob, width, height } = await downscale(file);
        if (blob.size > MAX_UPLOAD_BYTES) {
          setError(`${file.name} is still too large after shrinking.`);
          continue;
        }
        const body = new FormData();
        body.append("taskId", String(taskId));
        body.append("file", blob, file.name);
        body.append("filename", file.name);
        if (width) body.append("width", String(width));
        if (height) body.append("height", String(height));

        const res = await fetch("/api/attachments", { method: "POST", body });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || `Upload failed (${res.status}).`);
        }
      }
      router.refresh();
    } catch (e) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id) {
    if (!window.confirm("Remove this image?")) return;
    setBusy(true);
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="stack-v" style={{ gap: 10 }}>
      {attachments.length ? (
        <div className="thumbs">
          {attachments.map((a) => (
            <figure className="thumb" key={a.id}>
              <button
                type="button"
                onClick={() => setPreview(a)}
                title={`${a.filename} · ${prettySize(a.size)}`}
              >
                <img src={`/api/attachments/${a.id}`} alt={a.caption || a.filename} loading="lazy" />
              </button>
              {!readOnly ? (
                <button
                  type="button"
                  className="thumb-x"
                  onClick={() => remove(a.id)}
                  aria-label={`Remove ${a.filename}`}
                  disabled={busy}
                >
                  ✕
                </button>
              ) : null}
              <figcaption title={a.filename}>{a.caption || a.filename}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="small muted">
          {readOnly ? "No reference images." : "No reference images yet."}
        </p>
      )}

      {!readOnly ? (
        <div className="row">
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => upload([...e.target.files])}
            style={{ fontSize: 13 }}
          />
          {busy ? <span className="small muted">Uploading…</span> : null}
        </div>
      ) : null}

      {error ? <div className="notice err">{error}</div> : null}

      {preview ? (
        <div className="lightbox" onClick={() => setPreview(null)} role="dialog">
          <img src={`/api/attachments/${preview.id}`} alt={preview.caption || preview.filename} />
          <p>
            {preview.filename} · {prettySize(preview.size)}
            {preview.width ? ` · ${preview.width}×${preview.height}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
