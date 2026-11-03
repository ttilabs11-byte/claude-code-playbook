#!/usr/bin/env node
// Ratchet: flags a diff that quietly lowers the quality bar. New check suppressions, skipped or focused tests,
// deleted tests or assertions, coverage/score thresholds edited down, "not implemented" stubs, narrator comments.
// Usage: node ratchet.mjs [--staged | --all | <diff-file>] [-C <repo>]   exit 0 = clean, 2 = findings
// shell-guard.mjs imports scan() and asks before a `git commit` that trips it.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TEST_FILE = /(^|\/)(__tests__\/|tests?\/)|[._-](test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$|_test\.(py|go)$/i;
const ADDED = [
  [/@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|biome-ignore|#\s*type:\s*ignore|#\s*noqa\b|#\s*pragma:\s*no cover|\/\/\s*nolint/i, "check suppressed"],
  [/\b(it|test|describe|context)\.(skip|only|todo)\s*\(|\bx(it|describe|test)\s*\(|\bf(it|describe)\s*\(|@pytest\.mark\.(skip|xfail)|\bt\.Skip\(/, "test skipped or focused"],
  [/throw new Error\(\s*["'`](not implemented|todo|unimplemented)|raise NotImplementedError|\bunimplemented!\(|\btodo!\(|NotImplementedException/i, "stub left in"],
  [/^\s*(\/\/|#|\/?\*)\s*(this (function|method|component|class|hook|code|line|block|file) (is|will|does|handles|now)|here we\b|now we\b|we (now )?(need to|will|are going to)\b|the following (code|function|block))/i, "narrator comment"],
];
const KEY = /(threshold|coverage|branches|statements|functions|lines|min[_-]?score|minscore|fail[_-]under|max[_-]?warnings|max[_-]?errors|budget|min[_-]?coverage)["'\s]*[:=]\s*["']?(-?\d+(\.\d+)?)/i;
const ASSERT = /\b(expect|assert\w*)\s*\(|^\s*assert\s|\.should\b|\bt\.(Error|Fatal)/;

export function scan(diff) {
  const found = [];
  const files = diff.split(/^diff --git /m).slice(1);
  for (const f of files) {
    const path = (f.match(/^a\/(\S+)/) || [])[1] ?? "?";
    const deleted = /^deleted file mode/m.test(f);
    if (deleted && TEST_FILE.test(path)) { found.push(`${path}: test file deleted`); continue; }
    const lines = f.split("\n");
    const plus = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
    const minus = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1));
    for (const [re, what] of ADDED) {
      const hit = plus.find((l) => re.test(l));
      if (hit) found.push(`${path}: ${what}: ${hit.trim().slice(0, 80)}`);
    }
    if (TEST_FILE.test(path)) {
      const lost = minus.filter((l) => ASSERT.test(l)).length - plus.filter((l) => ASSERT.test(l)).length;
      if (lost > 0) found.push(`${path}: ${lost} assertion(s) removed`);
    }
    const before = new Map();
    for (const l of minus) { const m = l.match(KEY); if (m) before.set(m[1].toLowerCase(), Number(m[2])); }
    for (const l of plus) {
      const m = l.match(KEY); if (!m || !before.has(m[1].toLowerCase())) continue;
      const was = before.get(m[1].toLowerCase()), now = Number(m[2]), isMax = /max|budget/i.test(m[1]);
      if (isMax ? now > was : now < was) found.push(`${path}: ${m[1]} ${isMax ? "raised" : "lowered"} ${was} -> ${now}`);
    }
  }
  return found;
}

export function gitDiff(repo, all = false) {
  const args = ["-C", repo || ".", "diff", all ? "HEAD" : "--cached", "-U0", "--no-color", "--no-ext-diff"];
  const r = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : "";
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/ratchet.mjs")) {
  const a = process.argv.slice(2), ci = a.indexOf("-C"), repo = ci >= 0 ? a[ci + 1] : ".";
  const file = a.find((x, i) => !x.startsWith("-") && a[i - 1] !== "-C");
  const diff = file ? readFileSync(file, "utf8") : gitDiff(repo, a.includes("--all"));
  const found = scan(diff);
  for (const f of found) console.log(`RATCHET ${f}`);
  console.log(found.length ? `${found.length} finding(s): fix them, or say why each is right` : "ratchet: clean");
  process.exit(found.length ? 2 : 0);
}
