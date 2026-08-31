"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prettySize } from "@/lib/attachments";
import { uploadImage } from "@/lib/image-upload";

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
        const problem = await uploadImage(taskId, file);
        if (problem) setError(problem);
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
