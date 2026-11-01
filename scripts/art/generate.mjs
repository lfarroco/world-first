/**
 * Generate the art set from art/prompts.csv.
 *
 *   npm run art:generate -- --provider gemini --folder roles
 *   npm run art:generate -- --dry-run --limit 1     # print one request, send nothing
 *   npm run art:generate -- --only emberwood --force
 *
 * Keys come from the environment or from .env (read here, ignored by git):
 *   GEMINI_API_KEY=… (- also GEMINI_KEY, GOOGLE_API_KEY)
 *   OPENAI_API_KEY=… (--provider openai)
 * A real environment variable wins over .env.
 *
 * No dependencies: Node 24 has fetch, and the CSV parser below is the one
 * place a quoting bug could live, so it is written out rather than imported.
 *
 * UNTESTED AGAINST THE LIVE API. No key exists in this environment, so the
 * request and response shapes are from the docs, not from a run. `--dry-run`
 * prints the exact request — check it before spending money.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ART = join(ROOT, "public/art");
const RAW = join(ROOT, "art/raw");

// ── args ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const provider = flag("provider", process.env.ART_PROVIDER ?? "gemini");
const model =
  flag("model", process.env.ART_MODEL ?? (provider === "openai" ? "gpt-image-1" : "gemini-2.5-flash-image"));
const folder = flag("folder", null);
const only = flag("only", null)?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const limit = Number(flag("limit", 0)) || 0;
const concurrency = Number(flag("concurrency", 2)) || 2;
const force = has("force");
const dryRun = has("dry-run");
const noAspect = has("no-aspect");

/** Read .env if it exists. Not a dependency and not a parser war: KEY=value,
 *  one per line, quotes stripped, and anything already in the environment
 *  wins, so `GEMINI_API_KEY=… npm run art:generate` still overrides. */
async function loadEnvFile() {
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return;
  for (const line of (await readFile(file, "utf8")).split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, name, raw] = match;
    let value = raw;
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

await loadEnvFile();

const KEY =
  provider === "openai"
    ? (process.env.OPENAI_API_KEY ?? "")
    : (process.env.GEMINI_API_KEY ?? process.env.GEMINI_KEY ?? process.env.GOOGLE_API_KEY ?? "");

// ── csv ──────────────────────────────────────────────────────────────────────

/** RFC 4180: quoted fields may contain commas, newlines and doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// ── providers ────────────────────────────────────────────────────────────────

const ASPECT = { roles: "4:5", places: "16:9", items: "1:1" };
const OPENAI_SIZE = { "4:5": "1024x1536", "16:9": "1536x1024", "1:1": "1024x1024" };

function request(row) {
  const aspect = ASPECT[row.folder] ?? "1:1";

  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/images/generations",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: { model, prompt: row.prompt, size: OPENAI_SIZE[aspect] ?? "1024x1024", n: 1 },
    };
  }

  const generationConfig = { responseModalities: ["IMAGE"] };
  if (!noAspect) generationConfig.imageConfig = { aspectRatio: aspect };

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: { contents: [{ parts: [{ text: row.prompt }] }], generationConfig },
  };
}

/** @returns {{ data: string, ext: string }} base64 payload and file extension. */
function parseResponse(json) {
  if (provider === "openai") {
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error(`no b64_json in response: ${JSON.stringify(json).slice(0, 240)}`);
    return { data: b64, ext: ".png" };
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
      return { data: inline.data, ext: mime.includes("jpeg") ? ".jpg" : ".png" };
    }
  }
  throw new Error(`no inline image in response: ${JSON.stringify(json).slice(0, 240)}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `--force` overwrites the shipped file. Keep the old one, numbered, so a
 * re-roll never quietly destroys a render someone liked.
 *
 * It archives *every* extension of the id, not just the one being written:
 * the API returns PNG and `art:tidy` leaves JPEG behind, so a re-roll used to
 * leave `salve.jpg` (old) next to `salve.png` (new) and the lookup served the
 * old one forever.
 */
const SHIPPED = [".jpg", ".jpeg", ".png", ".webp"];

async function archive(folder, id, keep) {
  const moved = [];
  for (const ext of SHIPPED) {
    if (ext === keep) continue;
    const file = join(ART, folder, `${id}${ext}`);
    if (!existsSync(file)) continue;
    let dest = join(RAW, folder, `${id}${ext}`);
    for (let n = 2; existsSync(dest); n++) dest = join(RAW, folder, `${id}.${n}${ext}`);
    await mkdir(dirname(dest), { recursive: true });
    await rename(file, dest);
    moved.push(dest.slice(ROOT.length + 1));
  }
  return moved;
}

async function generate(row) {
  const req = request(row);
  const dest = join(ART, row.folder, `${row.id}.jpg`);
  const destDir = dirname(dest);

  if (dryRun) {
    const headers = Object.fromEntries(
      Object.keys(req.headers).map((h) => [h, /key|authorization/i.test(h) ? "<redacted>" : req.headers[h]]),
    );
    console.log(
      `\n# ${row.file}\nPOST ${req.url}\n` +
        `${JSON.stringify({ headers, body: req.body }, null, 2)}`,
    );
    return "dry";
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(req.body),
    });

    if (res.ok) {
      const json = await res.json();
      const { data, ext } = parseResponse(json);
      const buf = Buffer.from(data, "base64");
      const file = dest.replace(/\.jpg$/, ext);
      await mkdir(destDir, { recursive: true });
      const moved = await archive(row.folder, row.id, ext);
      for (const dest of moved) console.log(`      previous version → ${dest}`);
      await writeFile(file, buf);
      console.log(`ok    ${row.folder}/${row.id}${ext}  ${(buf.length / 1024).toFixed(0)} KB`);
      return "ok";
    }

    const text = (await res.text()).replace(/\s+/g, " ").slice(0, 300);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === 3) {
      console.error(`fail  ${row.folder}/${row.id}  ${res.status} ${text}`);
      return "fail";
    }
    await sleep(attempt * 2000);
  }
  return "fail";
}

// ── run ──────────────────────────────────────────────────────────────────────

if (KEY && KEY.length < 20) {
  console.error(`the ${provider} key looks like a placeholder (${KEY.length} characters) — refusing to call the API`);
  process.exit(1);
}

if (!KEY && !dryRun) {
  console.error(
    provider === "openai"
      ? "missing OPENAI_API_KEY — put it in .env, export it, or pass --dry-run"
      : "missing GEMINI_API_KEY (or GEMINI_KEY) — put it in .env, export it, or pass --dry-run",
  );
  process.exit(1);
}

const csv = parseCsv(await readFile(join(ROOT, "art/prompts.csv"), "utf8"));
const EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const hasImage = (row) => EXTS.some((ext) => existsSync(join(ART, row.folder, row.id + ext)));

const queue = csv
  .filter((row) => (folder ? row.folder === folder : true))
  .filter((row) => (only ? only.includes(row.id) : true))
  .filter((row) => (force ? true : !hasImage(row)))
  .slice(0, limit || undefined);

const total = csv.length;
const done = csv.filter(hasImage).length;
console.log(
  `${visible(total - done)} of ${total} missing · ${queue.length} queued · ` +
    `${provider}/${model}${dryRun ? " · dry run" : ""}`,
);

const results = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (cursor < queue.length) {
      const row = queue[cursor++];
      results.push(await generate(row));
    }
  }),
);

if (!dryRun) {
  const ok = results.filter((r) => r === "ok").length;
  // Recount from disk: `--force` rewrites files that already counted as present.
  const present = csv.filter(hasImage).length;
  console.log(`\n${ok} written, ${results.length - ok} failed · ${visible(present)}/${total} present`);
  console.log("next: npm run art:check");
}

function visible(n) {
  return `${n}`.padStart(2);
}
