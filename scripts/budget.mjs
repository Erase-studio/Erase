/**
 * A budget you can't quietly break.
 *
 * Reads the prerendered HTML for each route, follows every script it asks for,
 * brotli-compresses them the way a CDN will, and fails the build if a route
 * costs more than it is allowed to. Run it after `next build`:
 *
 *   node scripts/budget.mjs
 *
 * The numbers are the ones that shipped when the budget was set, rounded up to
 * leave a little room. Raising one is a decision, not an accident.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

/** Route → kilobytes of brotli'd JavaScript the first paint may cost. */
const BUDGET = JSON.parse(readFileSync(new URL("./budget.json", import.meta.url), "utf8"));

const OUT = ".next";
const files = new Map();

function br(path) {
  if (files.has(path)) return files.get(path);
  const size = existsSync(path) ? brotliCompressSync(readFileSync(path), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length : 0;
  files.set(path, size);
  return size;
}

function htmlFor(route) {
  const base = join(OUT, "server/app");
  const name = route === "/" ? "index.html" : route.slice(1).replace(/\//g, "/") + ".html";
  const p = join(base, name);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

let failed = false;
const rows = [];

for (const [route, cap] of Object.entries(BUDGET)) {
  const html = htmlFor(route);
  if (!html) {
    console.warn(`  ? ${route} — no prerendered HTML, skipped`);
    continue;
  }
  // Everything the document pulls in before it can run.
  const srcs = new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]));
  let total = 0;
  for (const s of srcs) total += br(join(OUT, s.replace("/_next/", "")));
  const kb = Math.round(total / 1024);
  const ok = kb <= cap;
  failed ||= !ok;
  rows.push(`  ${ok ? "ok " : "OVER"} ${route.padEnd(12)} ${String(kb).padStart(4)} KB / ${cap} KB   (${srcs.size} files)`);
}

// What a visitor picks up later, as they scroll into the 3D.
const chunks = join(OUT, "static/chunks");
const lazy = existsSync(chunks)
  ? readdirSync(chunks)
      .filter((f) => f.endsWith(".js"))
      .map((f) => [f, br(join(chunks, f))])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  : [];

console.log("\nFirst-load JavaScript, brotli:\n" + rows.join("\n"));
console.log("\nLargest chunks on disk (fetched on demand):");
for (const [f, size] of lazy) console.log(`  ${String(Math.round(size / 1024)).padStart(4)} KB  ${f}`);

if (failed) {
  console.error("\nOver budget. Either make it smaller or change the number in scripts/budget.mjs on purpose.\n");
  process.exit(1);
}
console.log("\nWithin budget.\n");
