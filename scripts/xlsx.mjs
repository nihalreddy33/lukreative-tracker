// Minimal, dependency-free .xlsx reader: enough ZIP + SpreadsheetML to pull
// cell values out of a workbook. Only used by the one-time import script.

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/** Read a ZIP archive into a Map of path -> Buffer, via the central directory. */
function unzip(buf) {
  // End of central directory record: signature 0x06054b50, scanned backwards.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a zip file");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    // The local header repeats the name/extra with its own lengths.
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);

    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decode = (s) =>
  s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** Concatenate every <t> inside a chunk of XML. */
const textOf = (xml) =>
  [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");

/**
 * Read a workbook into { [sheetName]: Array<Record<columnLetter, string>> }.
 * Row order is preserved; blank cells are simply absent.
 */
export function readWorkbook(path) {
  const files = unzip(readFileSync(path));
  const get = (name) => files.get(name)?.toString("utf8") ?? "";

  const shared = [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => textOf(m[1]));

  const rels = new Map(
    [...get("xl/_rels/workbook.xml.rels").matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)]
      .map((m) => [m[1], m[2]])
  );

  const out = {};
  for (const m of get("xl/workbook.xml").matchAll(/<sheet\b([^>]*)\/>/g)) {
    const attrs = m[1];
    const name = decode(/name="([^"]*)"/.exec(attrs)?.[1] ?? "");
    const rid = /r:id="([^"]*)"/.exec(attrs)?.[1];
    let target = rels.get(rid) ?? "";
    if (!target) continue;
    target = target.replace(/^\//, "");
    if (!target.startsWith("xl/")) target = `xl/${target}`;

    const xml = get(target);
    const rows = [];
    for (const r of xml.matchAll(/<row\b[^>]*[^/>]>([\s\S]*?)<\/row>/g)) {
      const row = {};
      // Note the [^/>] guard: without it, greedy matching lets a self-closing
      // <c r="A2"/> swallow the *next* cell's <v>, shifting the whole row.
      // Self-closing cells are empty, so skipping them loses nothing.
      for (const c of r[1].matchAll(/<c\b([^>]*[^/>])>([\s\S]*?)<\/c>/g)) {
        const attrs = c[1];
        const body = c[2] ?? "";
        const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1];
        if (!ref) continue;
        const type = /t="([^"]*)"/.exec(attrs)?.[1];

        let value;
        if (type === "s") {
          const idx = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]);
          value = shared[idx] ?? "";
        } else if (type === "inlineStr") {
          value = textOf(body);
        } else {
          value = decode(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
        }
        value = String(value).trim();
        if (value) row[ref] = value;
      }
      if (Object.keys(row).length) rows.push(row);
    }
    out[name] = rows;
  }
  return out;
}
