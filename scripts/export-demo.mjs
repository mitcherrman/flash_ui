// scripts/export-demo.mjs — build the offline portfolio demo (F6).
//
//   npm run export:demo            → dist/demo/
//   npm run export:demo -- <dir>   → <dir>/ (inside the project, an Expo rule)
//
// A static web build of the real study screens over the bundled synthetic
// deck (src/demo). It makes no network requests, so any static host — or a
// sub-path of the portfolio site — can serve it. Asset URLs in index.html are
// rewritten to be relative so the folder works from any path.
//
// --clear is always passed: Metro caches transforms, and a cached normal
// build of index.js must never be reused for the demo (or the other way
// round). For the same reason, a normal `expo export` after this script
// should also use --clear (see FLASH_PORTFOLIO_HANDOFF.md).
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = process.argv[2] || path.join("dist", "demo");

const env = { ...process.env, EXPO_PUBLIC_FLASH_DEMO: "1" };
// Nothing environment-specific reaches the demo bundle.
delete env.EXPO_PUBLIC_API_BASE;
delete env.EXPO_PUBLIC_SHOW_DEV_TOOLS;

const run = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", outDir, "--clear"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (run.status !== 0) process.exit(run.status ?? 1);

const indexPath = path.join(outDir, "index.html");
const html = readFileSync(indexPath, "utf8");
const page = html
  .replace(/(src|href)="\/(?!\/)/g, '$1="./')
  // The static title before the app sets its own (app.json's slug otherwise).
  .replace(/<title>[^<]*<\/title>/, "<title>Flashcard Maker · Offline demo</title>");
writeFileSync(indexPath, page);
console.log(`\nOffline demo written to ${outDir}${path.sep} (open index.html through any static web server).`);
