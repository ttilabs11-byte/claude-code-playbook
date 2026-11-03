#!/usr/bin/env node
// Installs this setup into ~/.claude (or --home <dir>). Safe to re-run: backs up what it changes, merges settings
// instead of replacing them, and keeps one marked block in CLAUDE.md.
// Usage: node install.mjs [--only <id,id>] [--rules-file <file>] [--dry-run] [--home <dir>] [--tracker <file>]
//                         [--force-skills] [--no-rtk]
// Without --only it installs every default component in setup/catalog.json. `node setup/audit.mjs` shows what you have.
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { END, ROOT, SRC, START, defaultIds, extraGroup, fwd, hasCmd, hookGroups, partsFor, rulesText, template } from "./setup/components.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag("--dry-run");
const REAL_HOME = join(homedir(), ".claude");
const HOME = resolve(opt("--home") ?? REAL_HOME);
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const done = [];

let P;
try { P = partsFor(opt("--only") ? opt("--only").split(",").map((s) => s.trim()).filter(Boolean) : defaultIds()); }
catch (e) { console.error(e.message); process.exit(1); }
const rulesFile = opt("--rules-file");
if (rulesFile && !existsSync(rulesFile)) { console.error(`--rules-file not found: ${rulesFile}`); process.exit(1); }

const write = (path, text) => { if (!DRY) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); } };
const backup = (path) => { if (existsSync(path)) { if (!DRY) copyFileSync(path, `${path}.bak-${stamp}`); done.push(`backed up ${path}`); } };

// 1. CLAUDE.md: one marked block, replaced on re-run, anything else in the file kept
if (P.rules) {
  const tracker = opt("--tracker");
  const block = `${START}\n${rulesText(tracker && resolve(tracker), rulesFile).trimEnd()}\n${END}\n`;
  const mdPath = join(HOME, "CLAUDE.md");
  const md = existsSync(mdPath) ? readFileSync(mdPath, "utf8") : "";
  const re = new RegExp(`${START}[\\s\\S]*?${END}\\n?`);
  const nextMd = re.test(md) ? md.replace(re, block) : (md ? `${md.trimEnd()}\n\n${block}` : block);
  if (nextMd !== md) { backup(mdPath); write(mdPath, nextMd); done.push(`rules written to ${mdPath}`); }
}

// 2. settings.json: merge the chosen env keys, settings, permissions and hooks; never remove what is there
const setPath = join(HOME, "settings.json");
const cur = existsSync(setPath) ? JSON.parse(readFileSync(setPath, "utf8")) : {};
const tpl = template(HOME);
const s = structuredClone(cur);
if (P.env.size) { s.env ??= {}; for (const k of P.env) s.env[k] ??= tpl.env[k]; }
for (const k of P.keys) if (s[k] === undefined) s[k] = tpl[k];
for (const k of P.permissions) { s.permissions ??= {}; s.permissions[k] = [...new Set([...(s.permissions[k] ?? []), ...tpl.permissions[k]])]; }
const groups = [...P.hooks].flatMap((n) => hookGroups(tpl, n)).concat(P.extraHooks.map((h) => extraGroup(HOME, h)));
const rtk = P.hooks.has("shell-guard.mjs") && !flag("--no-rtk") && spawnSync("rtk --version", { shell: true }).status === 0;
if (rtk) groups.push(["PreToolUse", { matcher: "Bash", hooks: [{ type: "command", command: "rtk hook claude" }] }]);
for (const [event, g] of groups) {
  const needle = g.hooks[0].command.match(/[\w-]+\.mjs|rtk hook/)[0];
  s.hooks ??= {};
  s.hooks[event] ??= [];
  if (hasCmd(s.hooks[event], needle)) continue;
  // hooks run in parallel and the strictest answer wins; the guard goes first only so it reads first
  if (needle === "shell-guard.mjs") s.hooks[event].unshift(g); else s.hooks[event].push(g);
  done.push(`hook added: ${event} ${needle}`);
}
if (JSON.stringify(s) !== JSON.stringify(cur)) { backup(setPath); write(setPath, `${JSON.stringify(s, null, 2)}\n`); done.push(`settings merged into ${setPath}`); }

// 3. scripts (always refreshed) and skills (kept if you already have one with that name)
for (const f of P.scripts) {
  const to = join(HOME, "scripts", f), from = join(SRC, "scripts", f);
  if (existsSync(to) && readFileSync(to, "utf8") === readFileSync(from, "utf8")) continue;
  if (existsSync(to)) backup(to);
  if (!DRY) { mkdirSync(join(HOME, "scripts"), { recursive: true }); copyFileSync(from, to); }
  done.push(`script copied: ${f}`);
}
for (const sk of P.skills) {
  const to = join(HOME, "skills", sk);
  if (existsSync(to) && !flag("--force-skills")) { done.push(`skill kept (already there): ${sk}`); continue; }
  if (!DRY) cpSync(join(SRC, "skills", sk), to, { recursive: true });
  done.push(`skill installed: ${sk}`);
}
if (groups.length && !DRY) mkdirSync(join(HOME, "logs"), { recursive: true });

// 4. mods: plugins from this repo's local marketplace, installed for your user (real home only)
const have = Object.entries(s.enabledPlugins ?? {}).filter(([, v]) => v).map(([k]) => k);
for (const p of [...P.plugins]) {
  const key = have.find((k) => k.startsWith(`${p}@`));
  if (key) { done.push(`mod already installed: ${key}`); P.plugins.splice(P.plugins.indexOf(p), 1); }
}
if (P.plugins.length) {
  const claude = (...a) => spawnSync(`claude ${a.join(" ")}`, { shell: true, encoding: "utf8" });
  if (HOME !== resolve(REAL_HOME)) done.push(`mods skipped (they install into your real Claude Code, not --home): ${P.plugins.join(", ")}`);
  else if (DRY) done.push(`would run: claude plugin marketplace add "${fwd(join(ROOT, "mods"))}" and install ${P.plugins.map((p) => `${p}@playbook-mods`).join(", ")}`);
  else {
    claude("plugin", "marketplace", "add", `"${fwd(join(ROOT, "mods"))}"`);
    for (const p of P.plugins) {
      const r = claude("plugin", "install", `${p}@playbook-mods`, "--scope", "user");
      done.push(r.status === 0 ? `mod installed: ${p} (starts with your next session)` : `mod FAILED: ${p}: ${(r.stderr || r.stdout).trim().slice(0, 160)}`);
    }
  }
}

console.log(`${DRY ? "[dry run] " : ""}claude-code-playbook -> ${HOME}`);
for (const d of done) console.log(`  - ${d}`);
if (!done.length) console.log("  - nothing to change: everything chosen is already in place");
if (P.hooks.has("shell-guard.mjs")) console.log(rtk ? "  - RTK found: its hook runs after the shell guard" : "  - RTK not found or skipped (optional, see docs/OPTIONAL.md)");
console.log("Next: run `node tests/run-tests.mjs --installed` and read README.md 'After installing'.");
