#!/usr/bin/env node
// Lossless session-log compaction helper. The model writes the compact summary; this script does the mechanical parts.
//   node log-compact.mjs archive <log>            copy the log verbatim to session-logs/archive/<name>.<date>.md
//   node log-compact.mjs check <log> <archive>    list anchors (paths, URLs, IDs, hashes, versions) in the archive
//                                                 that the compacted log no longer contains; exit 1 if any
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [cmd, log, arch] = process.argv.slice(2);
const kb = (p) => Math.round(statSync(p).size / 1024);

if (cmd === "archive" && log) {
  const dir = join(dirname(log), "archive");
  mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  let to = join(dir, `${basename(log, ".md")}.${day}.md`);
  for (let n = 2; existsSync(to); n++) to = join(dir, `${basename(log, ".md")}.${day}-${n}.md`);
  copyFileSync(log, to);
  console.log(`archived ${kb(log)} KB verbatim -> ${to.replace(/\\/g, "/")}`);
} else if (cmd === "check" && log && arch) {
  const PATTERNS = [
    /https?:\/\/[^\s`'")<>\]]+/g,                                   // URLs
    /(?:[A-Za-z]:[\\/]|~\/|\/[a-z]\/)[^\s`'")<>|*]+/g,              // absolute paths
    /\b[\w.-]+\.(?:md|mjs|js|ts|tsx|py|ps1|json|jsonl|html|css|sql|ya?ml|txt|blend|mp4|webm|png|jpg|wav|mp3)\b/g, // file names
    /\blocal_[0-9a-f]{8}\b/g,                                       // session IDs
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, // UUIDs
    /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/g,         // commit hashes, hex IDs
    /\bv?\d+\.\d+\.\d+(?:\.\d+)?\b/g,                               // versions
  ];
  const anchors = (t) => new Set(PATTERNS.flatMap((re) => t.match(re) ?? []).map((a) => a.replace(/[.,;:)\]]+$/, "")));
  const live = readFileSync(log, "utf8");
  const missing = [...anchors(readFileSync(arch, "utf8"))].filter((a) => !live.includes(a)).sort();
  console.log(`live ${kb(log)} KB (archive ${kb(arch)} KB, ${Math.round((100 * statSync(log).size) / statSync(arch).size)}%)`);
  console.log(missing.length ? `${missing.length} anchors not in the live log; keep each one still in use, or confirm it is superseded:` : "every anchor kept");
  for (const a of missing.slice(0, 300)) console.log(`  ${a}`);
  process.exit(missing.length ? 1 : 0);
} else {
  console.log("usage: log-compact.mjs archive <log> | check <log> <archive>");
  process.exit(2);
}
