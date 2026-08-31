"use client";

import { MAX_UPLOAD_BYTES } from "./attachments";

const MAX_EDGE = 1600; // plenty for a reference image on any screen

/**
 * Shrinks an image in the browser before upload. A phone photo is often 4–8 MB;
 * stored as-is that would bloat every row for no visible gain, and would blow
 * the request limit outright.
 *
 * Returns the original file untouched if anything about the canvas path fails,
 * or if it's a GIF (which would lose its animation).
 */
export async function downscale(file) {
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

/**
 * Shrinks and uploads one image against a task. Returns an error string rather
 * than throwing, so a caller can report per-file without losing the others.
 */
export async function uploadImage(taskId, file) {
  if (!file.type.startsWith("image/")) return `${file.name} isn't an image.`;

  const { blob, width, height } = await downscale(file);
  if (blob.size > MAX_UPLOAD_BYTES) return `${file.name} is still too large after shrinking.`;

  const body = new FormData();
  body.append("taskId", String(taskId));
  body.append("file", blob, file.name);
  body.append("filename", file.name);
  if (width) body.append("width", String(width));
  if (height) body.append("height", String(height));

  const res = await fetch("/api/attachments", { method: "POST", body });
  if (res.ok) return null;

  const data = await res.json().catch(() => ({}));
  return data.error || `Upload failed (${res.status}).`;
}

/** Uploads several, returning the first problem encountered. */
export async function uploadImages(taskId, files) {
  for (const file of files) {
    const problem = await uploadImage(taskId, file);
    if (problem) return problem;
  }
  return null;
}
