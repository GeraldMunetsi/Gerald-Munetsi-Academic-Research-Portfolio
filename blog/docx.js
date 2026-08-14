// Minimal, dependency-free .docx (WordprocessingML) writer.
// Produces the smallest valid OOXML package Word will open without a
// "needs repair" prompt: [Content_Types].xml + _rels/.rels + word/document.xml,
// zipped with the "store" (no compression) method so no deflate implementation
// is needed either. Only ever imported by admin.js (post-auth).

/* ---------------- tiny store-only ZIP writer ---------------- */
const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(bytes) {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function u16(n) { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]); }
function u32(n) { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]); }
function concatBytes(arrays) {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let off = 0;
  arrays.forEach((a) => { out.set(a, off); off += a.length; });
  return out;
}
function dosDateTime(date = new Date()) {
  const dosTime = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function buildZip(files) {
  const { dosTime, dosDate } = dosDateTime();
  const local = [];
  const central = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBytes = new TextEncoder().encode(name);
    const crc = crc32(data);
    const size = data.length;
    const localOffset = offset;

    const localHeader = concatBytes([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0),
    ]);
    local.push(localHeader, nameBytes, data);
    offset += localHeader.length + nameBytes.length + data.length;

    central.push(concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(localOffset),
    ]), nameBytes);
  });

  const centralStart = offset;
  const centralBytes = concatBytes(central);
  const eocd = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralBytes.length), u32(centralStart), u16(0),
  ]);

  return concatBytes([...local, centralBytes, eocd]);
}

/* ---------------- markdown-lite -> WordprocessingML ---------------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function parseInlineRuns(text) {
  const runs = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) runs.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) runs.push({ text: m[2], italic: true });
    else if (m[3] !== undefined) runs.push({ text: m[3], code: true });
    else if (m[4] !== undefined) runs.push({ text: `${m[4]} (${m[5]})` });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}
function parseBlocks(src) {
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let para = [], list = [];
  const flushPara = () => { if (para.length) { blocks.push({ type: "p", runs: parseInlineRuns(para.join(" ")) }); para = []; } };
  const flushList = () => { if (list.length) { list.forEach((i) => blocks.push({ type: "li", runs: parseInlineRuns(i) })); list = []; } };
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    if (line.startsWith("## ")) { flushPara(); flushList(); blocks.push({ type: "h3", runs: parseInlineRuns(line.slice(3)) }); return; }
    if (line.startsWith("# ")) { flushPara(); flushList(); blocks.push({ type: "h2", runs: parseInlineRuns(line.slice(2)) }); return; }
    if (line.startsWith("- ")) { flushPara(); list.push(line.slice(2)); return; }
    flushList(); para.push(line);
  });
  flushPara(); flushList();
  return blocks;
}
function runXml(run, opts = {}) {
  const parts = [];
  if (run.bold || opts.bold) parts.push("<w:b/>");
  if (run.italic) parts.push("<w:i/>");
  if (run.code) parts.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
  if (opts.sz) parts.push(`<w:sz w:val="${opts.sz}"/><w:szCs w:val="${opts.sz}"/>`);
  if (opts.color) parts.push(`<w:color w:val="${opts.color}"/>`);
  const rpr = parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
  return `<w:r>${rpr}<w:t xml:space="preserve">${esc(run.text)}</w:t></w:r>`;
}
function paragraphXml(block) {
  if (block.type === "h2") return `<w:p><w:pPr><w:spacing w:before="280" w:after="120"/></w:pPr>${block.runs.map((r) => runXml(r, { bold: true, sz: 30, color: "21306A" })).join("")}</w:p>`;
  if (block.type === "h3") return `<w:p><w:pPr><w:spacing w:before="220" w:after="100"/></w:pPr>${block.runs.map((r) => runXml(r, { bold: true, sz: 24, color: "21306A" })).join("")}</w:p>`;
  if (block.type === "li") return `<w:p><w:pPr><w:ind w:left="720" w:hanging="360"/><w:spacing w:after="80"/></w:pPr><w:r><w:t xml:space="preserve">&#8226;\t</w:t></w:r>${block.runs.map((r) => runXml(r)).join("")}</w:p>`;
  return `<w:p><w:pPr><w:spacing w:after="160"/></w:pPr>${block.runs.map((r) => runXml(r)).join("")}</w:p>`;
}

function buildDocumentXml(post) {
  const blocks = parseBlocks(post.body);
  const metaLine = `${post.status === "published" ? "Published" : "Draft — for review"} · ${post.date || ""}${post.tags && post.tags.length ? " · Tags: " + post.tags.join(", ") : ""}`;
  const parts = [];
  parts.push(`<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${runXml({ text: post.title || "Untitled" }, { bold: true, sz: 44, color: "182039" })}</w:p>`);
  parts.push(`<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>${runXml({ text: metaLine, italic: true }, { sz: 18, color: "7C7566" })}</w:p>`);
  if (post.excerpt) parts.push(`<w:p><w:pPr><w:spacing w:after="240"/></w:pPr>${runXml({ text: post.excerpt, italic: true }, { sz: 22, color: "414A63" })}</w:p>`);
  blocks.forEach((b) => parts.push(paragraphXml(b)));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${parts.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const PACKAGE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

export function buildDocxBlob(post) {
  const enc = new TextEncoder();
  const zipBytes = buildZip([
    { name: "[Content_Types].xml", data: enc.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: enc.encode(PACKAGE_RELS) },
    { name: "word/document.xml", data: enc.encode(buildDocumentXml(post)) },
  ]);
  return new Blob([zipBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
