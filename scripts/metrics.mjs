/**
 * Writes down what this build actually costs.
 *
 * Every number on the studio page's ledger comes from here, measured against
 * the output of `next build` — never typed by hand, never rounded in our
 * favour. If a number gets worse, the page says so on the next deploy.
 *
 *   next build && node scripts/metrics.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const OUT = ".next";
const q = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } };
const br = (p) => (existsSync(p) ? brotliCompressSync(readFileSync(p), q).length : 0);
const kb = (n) => Math.round(n / 1024);

function html(route) {
  const p = join(OUT, "server/app", route === "/" ? "index.html" : route.slice(1) + ".html");
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

/** Everything the document fetches before it can show anything. */
function firstLoad(route) {
  const doc = html(route);
  if (!doc) return null;
  const scripts = [...doc.matchAll(/<script[^>]*src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  const styles = [...doc.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  const fonts = [...doc.matchAll(/href="(\/_next\/static\/media\/[^"]+\.woff2)"/g)].map((m) => m[1]);
  const path = (u) => join(OUT, u.replace("/_next/", ""));
  return {
    js: kb(scripts.reduce((s, u) => s + br(path(u)), 0)),
    css: kb(styles.reduce((s, u) => s + br(path(u)), 0)),
    fonts: kb([...new Set(fonts)].reduce((s, u) => s + br(path(u)), 0)),
    // The document itself, plus everything it names.
    requests: 1 + scripts.length + styles.length + new Set(fonts).size,
  };
}

function walk(dir, hit) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    if (statSync(p).isDirectory()) walk(p, hit);
    else hit(p);
  }
}

const RASTER = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".tiff"]);

let raster = 0;
walk("public", (p) => RASTER.has(extname(p).toLowerCase()) && raster++);
walk("src", (p) => RASTER.has(extname(p).toLowerCase()) && raster++);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
let routes = 0;
walk(join(OUT, "server/app"), (file) => {
  const name = basename(file);
  // Error pages aren't pages anyone asked for.
  if (name.endsWith(".html") && !name.startsWith("_")) routes++;
});

const home = firstLoad("/") ?? { js: 0, css: 0, fonts: 0, requests: 0 };
const budget = JSON.parse(readFileSync("scripts/budget.json", "utf8"));

const metrics = {
  measured: new Date().toISOString().slice(0, 10),
  js: home.js,
  css: home.css,
  fonts: home.fonts,
  requests: home.requests,
  raster,
  deps: Object.keys(pkg.dependencies ?? {}).length,
  routes,
  budget: budget["/"],
};

writeFileSync("src/content/metrics.json", JSON.stringify(metrics, null, 2) + "\n");
console.log("metrics:", metrics);
