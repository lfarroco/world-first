/**
 * Shrink what the API gave you. Gemini returns PNG at ~1.4 MB a picture;
 * 30 locations is 45 MB and the game only ever shows them at card size.
 *
 *   npm run art:tidy            # PNG → JPEG q85, originals move to art/raw/
 *   npm run art:tidy -- --dry-run
 *
 * macOS only: it calls `sips`, which is present on every Mac and cannot write
 * WebP on this one. If sips is missing it prints the per-file command and
 * exits, rather than pretending.
 *
 * The original is never deleted and never overwritten: it moves to
 * art/raw/<folder>/, which is gitignored, and a second conversion of the same
 * id lands beside it as <id>.2.png. Nothing in this script removes a file.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ART = join(ROOT, "public/art");
const RAW = join(ROOT, "art/raw");
const FOLDERS = ["roles", "places", "items"];
const QUALITY = "85";
const dryRun = process.argv.includes("--dry-run");

try {
  await run("sips", ["--version"]);
} catch {
  console.error("sips not found — this script is macOS only. Per file:");
  console.error("  sips -s format jpeg -s formatOptions 85 in.png --out out.jpg");
  process.exit(1);
}

const kb = (bytes) => Math.round(bytes / 1024);

let converted = 0;
let before = 0;
let after = 0;

for (const folder of FOLDERS) {
  const dir = join(ART, folder);
  if (!existsSync(dir)) continue;

  for (const name of await readdir(dir)) {
    if (!name.endsWith(".png")) continue;
    const id = name.slice(0, -4);
    const src = join(dir, name);
    const out = join(dir, `${id}.jpg`);

    // Never overwrite an earlier original: a regenerated id gets probe.2.png,
    // probe.3.png. The archive keeps every version it was given.
    let raw = join(RAW, folder, name);
    for (let n = 2; existsSync(raw); n++) raw = join(RAW, folder, `${id}.${n}.png`);

    const srcSize = (await stat(src)).size;
    if (dryRun) {
      console.log(`would  ${folder}/${name}  ${kb(srcSize)} KB → ${id}.jpg`);
      converted++;
      continue;
    }

    await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", QUALITY, src, "--out", out]);
    const outSize = (await stat(out)).size;

    await mkdir(dirname(raw), { recursive: true });
    await rename(src, raw);

    before += srcSize;
    after += outSize;
    converted++;
    console.log(
      `ok     ${folder}/${id}  ${kb(srcSize)} KB → ${kb(outSize)} KB  (${Math.round((1 - outSize / srcSize) * 100)}% smaller)`,
    );
  }
}

if (dryRun) {
  console.log(`\n${converted} files would convert`);
} else if (converted === 0) {
  console.log("nothing to convert — every folder is already JPEG");
} else {
  console.log(
    `\n${converted} converted · ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB` +
      ` · originals in art/raw/`,
  );
  console.log("next: npm run art:check");
}
