/** Fields safe to select when listing — everything except the image bytes. */
export const ATTACHMENT_FIELDS = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  caption: true,
  createdAt: true,
};

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Magic-byte sniff, so a renamed file can't slip through on its extension. */
export function looksLikeImage(buf) {
  if (buf.length < 12) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const gif = buf.toString("ascii", 0, 3) === "GIF";
  const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return jpeg || png || gif || webp;
}

export const prettySize = (bytes) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
