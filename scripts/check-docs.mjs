#!/usr/bin/env node
/**
 * Documentation guard. Fails on broken relative links and on vocabulary that
 * describes a design we no longer have.
 *
 * Historical documents are exempt: they describe the game as it was.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());

const HISTORICAL = new Set(["docs/phase-0-report.md"]);

/** Lines containing these are allowed to mention the old design (they explain it). */
const EXEMPT_LINE = /originally|historical|no longer|used to|previous design/i;

const STALE = [
  { pattern: /\b28[- ]day\b/i, hint: "the run is 84 days now" },
  { pattern: /\b5 bosses\b/i, hint: "the ladder ends in 3 raids" },
  { pattern: /\bbossId\b/, hint: "content is generic: contentId" },
  { pattern: /\bbosses\.ts\b/, hint: "the file is content/content.ts" },
  { pattern: /\bparty\.ts\b/, hint: "the file is plan.ts" },
  { pattern: /\bchecks\.ts\b/, hint: "the file is encounter.ts" },
];

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "tmp" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
};

const files = walk(ROOT);
const problems = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  // Broken relative links.
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || target.startsWith("http") || target.startsWith("mailto:")) continue;
    const resolved = normalize(join(dirname(file), target));
    if (!existsSync(resolved)) problems.push(`${rel}: broken link → ${target}`);
  }

  // Stale vocabulary. External research describes other games, so it is exempt.
  if (!HISTORICAL.has(rel) && !rel.startsWith("docs/research/")) {
    lines.forEach((line, i) => {
      if (EXEMPT_LINE.test(line)) return;
      for (const { pattern, hint } of STALE) {
        if (pattern.test(line)) {
          problems.push(`${rel}:${i + 1}: "${line.trim().slice(0, 70)}" — ${hint}`);
        }
      }
    });
  }
}

if (problems.length > 0) {
  console.error(`docs:check failed (${problems.length} problem${problems.length === 1 ? "" : "s"})\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nFix the doc, or mark it Historical if it describes the past.");
  process.exit(1);
}

console.log(`docs:check ok — ${files.length} files, links and vocabulary clean`);
