#!/usr/bin/env node
// Installs this setup into ~/.claude (or --home <dir>). Safe to re-run: backs up what it changes, merges settings
// instead of replacing them, and keeps one marked block in CLAUDE.md.
// Usage: node install.mjs [--dry-run] [--home <dir>] [--tracker <file>] [--force-skills] [--no-rtk]
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag("--dry-run");
const HOME = resolve(opt("--home") ?? join(homedir(), ".claude"));
const SRC = join(dirname(fileURLToPath(import.meta.url)), "claude");
const fwd = (p) => p.replace(/\\/g, "/");
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const done = [];

const write = (path, text) => { if (!DRY) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); } };
const backup = (path) => { if (existsSync(path)) { if (!DRY) copyFileSync(path, `${path}.bak-${stamp}`); done.push(`backed up ${path}`); } };

// 1. CLAUDE.md: one marked block, replaced on re-run, anything else in the file kept
const START = "<!-- claude-code-setup:start -->", END = "<!-- claude-code-setup:end -->";
let rules = readFileSync(join(SRC, "CLAUDE.md"), "utf8").replace(/\r\n/g, "\n");
const tracker = opt("--tracker");
rules = tracker
  ? rules.replace("{{TRACKER_FILE}}", `\`${fwd(resolve(tracker))}\``)
  : rules.replace(/- Project tracker \(optional\)[\s\S]*?Append only; don't read or edit the rest\.\n/, "");
const block = `${START}\n${rules.trimEnd()}\n${END}\n`;
const mdPath = join(HOME, "CLAUDE.md");
const md = existsSync(mdPath) ? readFileSync(mdPath, "utf8") : "";
const re = new RegExp(`${START}[\\s\\S]*?${END}\\n?`);
const nextMd = re.test(md) ? md.replace(re, block) : (md ? `${md.trimEnd()}\n\n${block}` : block);
if (nextMd !== md) { backup(mdPath); write(mdPath, nextMd); done.push(`rules written to ${mdPath}`); }

// 2. settings.json: merge env, permissions, hooks, output style, status line; never remove what is there
const setPath = join(HOME, "settings.json");
const cur = existsSync(setPath) ? JSON.parse(readFileSync(setPath, "utf8")) : {};
const tpl = JSON.parse(readFileSync(join(SRC, "settings.template.json"), "utf8").replaceAll("{{CLAUDE_HOME}}", fwd(HOME)));
const s = structuredClone(cur);
s.env = { ...tpl.env, ...(s.env ?? {}) };
for (const k of ["outputStyle", "autoCompactEnabled", "cleanupPeriodDays", "statusLine"]) if (s[k] === undefined) s[k] = tpl[k];
s.autoMode ??= tpl.autoMode;
s.permissions ??= {};
for (const k of ["deny", "ask"]) s.permissions[k] = [...new Set([...(s.permissions[k] ?? []), ...tpl.permissions[k]])];
s.hooks ??= {};
const hasCmd = (groups, needle) => (groups ?? []).some((g) => (g.hooks ?? []).some((h) => String(h.command).includes(needle)));
const rtk = !flag("--no-rtk") && spawnSync("rtk", ["--version"], { shell: true }).status === 0;
if (rtk) tpl.hooks.PreToolUse.push({ matcher: "Bash", hooks: [{ type: "command", command: "rtk hook claude" }] });
for (const [event, groups] of Object.entries(tpl.hooks)) {
  s.hooks[event] ??= [];
  for (const g of groups) {
    const needle = g.hooks[0].command.match(/[\w-]+\.mjs|rtk hook/)[0];
    if (hasCmd(s.hooks[event], needle)) continue;
    // hooks run in parallel and the strictest answer wins; the guard goes first only so it reads first
    if (needle === "shell-guard.mjs") s.hooks[event].unshift(g); else s.hooks[event].push(g);
    done.push(`hook added: ${event} ${needle}`);
  }
}
if (JSON.stringify(s) !== JSON.stringify(cur)) { backup(setPath); write(setPath, `${JSON.stringify(s, null, 2)}\n`); done.push(`settings merged into ${setPath}`); }

// 3. scripts (always refreshed) and skills (kept if you already have one with that name)
for (const f of readdirSync(join(SRC, "scripts"))) { if (!DRY) { mkdirSync(join(HOME, "scripts"), { recursive: true }); copyFileSync(join(SRC, "scripts", f), join(HOME, "scripts", f)); } }
done.push(`scripts copied to ${join(HOME, "scripts")}`);
for (const sk of readdirSync(join(SRC, "skills"))) {
  const to = join(HOME, "skills", sk);
  if (existsSync(to) && !flag("--force-skills")) { done.push(`skill kept (already there): ${sk}`); continue; }
  if (!DRY) cpSync(join(SRC, "skills", sk), to, { recursive: true });
  done.push(`skill installed: ${sk}`);
}
if (!DRY) mkdirSync(join(HOME, "logs"), { recursive: true });

console.log(`${DRY ? "[dry run] " : ""}claude-code-setup -> ${HOME}`);
for (const d of done) console.log(`  - ${d}`);
console.log(rtk ? "  - RTK found: its hook runs after the shell guard" : "  - RTK not found or skipped (optional, see docs/OPTIONAL.md)");
console.log("Next: run `node tests/run-tests.mjs --installed` and read README.md 'After installing'.");
