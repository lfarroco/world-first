/**
 * Turn the prompt pack into something you can actually run.
 *
 *   node scripts/art/prompts.mjs           # write art/prompts.csv + art/prompts-mj.txt
 *   node scripts/art/prompts.mjs --check   # verify the doc still covers the content
 *
 * The doc is the source of truth: the style blocks and the per-image subject
 * lines are parsed out of docs/art-prompts.md, so editing the doc changes the
 * list. Nothing here is a second copy of a prompt.
 */

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DOC = join(ROOT, "docs/art-prompts.md");
const OUT = join(ROOT, "art");
const ART = join(ROOT, "public/art");

const doc = await readFile(DOC, "utf8");

// ── parse ────────────────────────────────────────────────────────────────────

/** The body of the fenced block under a bold label such as `**Portraits**`. */
function block(label) {
  const re = new RegExp("\\*\\*" + label + "\\*\\*[^\\n]*\\n+```\\n([\\s\\S]*?)```");
  const m = doc.match(re);
  if (!m) throw new Error(`no code block under "${label}" in docs/art-prompts.md`);
  return m[1].replace(/\s*\n\s*/g, " ").trim();
}

const STYLE = {
  roles: block("Portraits"),
  places: block("Locations"),
  items: block("Items"),
};
const NEGATIVE = block("Negative prompt");

/** `| \`places/emberwood.webp\` | Emberwood | birch and pine wood at dusk, … |` */
const ROW = /^\|\s*`([a-z]+)\/([a-z0-9-]+)\.(?:webp|jpe?g|png)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm;

const SPEC = {
  roles: { aspect: "4:5", size: "1024x1280", export: "512x640" },
  places: { aspect: "16:9", size: "1536x864", export: "1280x720" },
  items: { aspect: "1:1", size: "512x512", export: "256x256" },
};

const EXTS = [".jpg", ".jpeg", ".png", ".webp"];

const rows = [];
for (const m of doc.matchAll(ROW)) {
  const [, folder, id, name, subject] = m;
  if (!STYLE[folder]) throw new Error(`unknown folder "${folder}" for ${id}`);
  rows.push({
    folder,
    id,
    name,
    file: `public/art/${folder}/${id}.jpg`,
    raw: `art/raw/${folder}/${id}.jpg`,
    ...SPEC[folder],
    prompt: `${STYLE[folder]}, ${subject}`,
    subject,
  });
}

if (rows.length === 0) throw new Error("parsed 0 prompts — the table format changed");

// ── write ────────────────────────────────────────────────────────────────────

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const csv = [
  ["file", "folder", "id", "name", "aspect", "generate_size", "export_size", "prompt", "negative"].join(","),
  ...rows.map((r) =>
    [r.file, r.folder, r.id, r.name, r.aspect, r.size, r.export, r.prompt, NEGATIVE].map(csvCell).join(","),
  ),
].join("\n");

// Midjourney: one line per image, flags already applied.
const MJ_NO = "text, letters, watermark, frame, border, signature";
const mj = rows
  .map((r) => `# ${r.file}\n${r.prompt} --ar ${r.aspect} --style raw --s 50 --no ${MJ_NO}`)
  .join("\n\n");

async function write() {
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "prompts.csv"), csv + "\n");
  await writeFile(join(OUT, "prompts-mj.txt"), mj + "\n");

  const counts = rows.reduce((a, r) => ({ ...a, [r.folder]: (a[r.folder] ?? 0) + 1 }), {});
  console.log(`wrote  art/prompts.csv         ${rows.length} prompts`);
  console.log(`wrote  art/prompts-mj.txt      ${rows.length} commands`);
  console.log(`        roles ${counts.roles ?? 0} · places ${counts.places ?? 0} · items ${counts.items ?? 0}`);
}

// ── check ────────────────────────────────────────────────────────────────────

const kebab = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function check() {
  const contentSrc = await readFile(join(ROOT, "src/sim/content/content.ts"), "utf8");
  const marketSrc = await readFile(join(ROOT, "src/sim/content/market.ts"), "utf8");
  const rolesSrc = await readFile(join(ROOT, "src/sim/content/roles.ts"), "utf8");

  const contentIds = [...contentSrc.matchAll(/^\s{4}id: "([a-z-]+)"/gm)].map((m) => m[1]);
  const marketIds = [...marketSrc.matchAll(/^\s{4}id: "([a-z-]+)"/gm)].map((m) => m[1]);
  const roleIds = [...rolesSrc.matchAll(/^\s{4}id: "([a-z-]+)"/gm)].map((m) => m[1]);
  const dropIds = [...contentSrc.matchAll(/\{ name: "([^"]+)", slot: "/g)]
    .map((m) => kebab(m[1].replace(/^the-/, "")))
    .map((id) => id.replace(/^the-/, ""));

  const expected = {
    roles: roleIds,
    places: contentIds,
    items: [...marketIds, ...dropIds],
  };

  let drift = 0;
  for (const [folder, ids] of Object.entries(expected)) {
    const have = new Set(rows.filter((r) => r.folder === folder).map((r) => r.id));
    const missing = ids.filter((id) => !have.has(id));
    const unknown = [...have].filter((id) => !ids.includes(id));
    if (missing.length || unknown.length) drift++;
    console.log(
      `${folder.padEnd(6)} source ${String(ids.length).padStart(2)} · doc ${String(have.size).padStart(2)}` +
        (missing.length ? ` · MISSING ${missing.join(", ")}` : "") +
        (unknown.length ? ` · UNKNOWN ${unknown.join(", ")}` : ""),
    );
  }

  // The committed list must match the doc, or the doc is being read and the
  // list is what gets run.
  const committed = await readFile(join(OUT, "prompts.csv"), "utf8").catch(() => null);
  const fresh = committed === csv + "\n";
  if (!fresh) drift++;
  console.log(`list   art/prompts.csv ${fresh ? "up to date" : "STALE — run npm run art:prompts"}`);

  // What has been generated so far, and whether hand-saved files left a mess.
  const present = {};
  const known = {};
  for (const folder of Object.keys(SPEC)) {
    const files = (await readdir(join(ART, folder)).catch(() => [])).filter((f) => !f.startsWith("."));
    present[folder] = new Set(files);
    known[folder] = new Set(rows.filter((r) => r.folder === folder).map((r) => r.id));
  }

  // Two files for one id means the lookup serves whichever extension it tries
  // first — usually the older picture. Files whose stem is not an id are
  // invisible to the game: a mis-named download, or a stray copy.
  for (const folder of Object.keys(SPEC)) {
    const stems = new Map();
    for (const file of present[folder]) {
      const ext = EXTS.find((e) => file.endsWith(e));
      if (!ext) continue;
      const stem = file.slice(0, -ext.length);
      stems.set(stem, [...(stems.get(stem) ?? []), ext]);
    }
    const dupes = [...stems].filter(([, exts]) => exts.length > 1);
    const strays = [...stems.keys()].filter((stem) => !known[folder].has(stem));
    if (dupes.length) {
      drift++;
      console.log(`${folder} duplicates: ${dupes.map(([id, exts]) => `${id} (${exts.join(" + ")})`).join(", ")}`);
    }
    if (strays.length) {
      drift++;
      console.log(`${folder} not in the content list: ${strays.join(", ")}`);
    }
  }

  const done = rows.filter((r) =>
    EXTS.some((ext) => present[r.folder].has(`${r.id}${ext}`)),
  ).length;  console.log(`\nart    ${done}/${rows.length} images in public/art/`);

  if (drift) {
    console.error(
      "\nfail: something above is inconsistent — a content id without a prompt, a stale" +
        " art/prompts.csv, or a folder with two files for one id. Fix it before generating.",
    );
    process.exit(1);
  }
  console.log("ok: every content id has a prompt");
}

if (process.argv.includes("--check")) await check();
else await write();
