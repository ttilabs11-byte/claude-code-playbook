#!/usr/bin/env node
// Read-only review of a Claude Code setup against this playbook. Reads local files only; changes nothing.
// For every component in setup/catalog.json: installed, outdated, different (you have your own), partial, missing or
// broken. Also lists what you have that the playbook doesn't, and which tools the machine has.
// Usage: node setup/audit.mjs [--json] [--home <dir>] [--no-tools]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { END, SRC, START, catalog, extraGroup, hasCmd, hookGroups, needleOf, rulesText, template } from "./components.mjs";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const HOME = resolve(opt("--home") ?? join(homedir(), ".claude"));
const read = (p) => { try { return readFileSync(p, "utf8").replace(/\r\n/g, "\n"); } catch { return null; } };
const json = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const tidy = (s) => String(s).replaceAll(HOME.replace(/\\/g, "/"), "~/.claude").replaceAll(HOME, "~/.claude");

const settings = json(join(HOME, "settings.json")) ?? {};
const md = read(join(HOME, "CLAUDE.md")) ?? "";
const tpl = template(HOME);
const plugins = settings.enabledPlugins ?? {};

// one part -> [status, note]
const fileStatus = (mine, ours) => mine === null ? ["missing"] : mine === read(ours) ? ["installed"] : ["outdated", "differs from the playbook's copy"];
function parts(c) {
  const p = c.parts, out = [];
  if (p.rules) {
    const m = md.match(new RegExp(`${START}\\n([\\s\\S]*?)\\n${END}`));
    const strip = (t) => t.replace(/- Project tracker[\s\S]*?Append only; don't read or edit the rest\.\n/, "").trim();
    if (m) out.push(strip(m[1]) === strip(rulesText(null)) ? ["installed"] : ["outdated", "playbook block present but older or edited"]);
    else out.push(md.trim() ? ["missing", `you have your own CLAUDE.md (${md.length} chars, ~${Math.round(md.length / 4)} tokens)`] : ["missing"]);
  }
  for (const k of p.env ?? []) {
    const v = settings.env?.[k];
    out.push(v === undefined ? ["missing"] : String(v) === String(tpl.env[k]) ? ["installed"] : ["different", `yours: ${k}=${v}, ours: ${tpl.env[k]}`]);
  }
  for (const k of p.keys ?? []) {
    const v = settings[k];
    if (v === undefined) out.push(["missing"]);
    else if (k === "statusLine") out.push(String(v.command ?? "").includes("statusline.mjs") ? ["installed"] : ["different", "you have your own status line"]);
    else if (k === "autoMode") out.push(["installed"]);
    else out.push(JSON.stringify(v) === JSON.stringify(tpl[k]) ? ["installed"] : ["different", `yours: ${k}=${JSON.stringify(v)}, ours: ${JSON.stringify(tpl[k])}`]);
  }
  for (const k of p.permissions ?? []) {
    const have = new Set(settings.permissions?.[k] ?? []), want = tpl.permissions[k], n = want.filter((r) => have.has(r)).length;
    out.push(n === want.length ? ["installed"] : n ? ["partial", `${n} of ${want.length} ${k} rules`] : ["missing"]);
  }
  const hooks = [...(p.hooks ?? []).flatMap((n) => hookGroups(tpl, n)), ...(p.extraHooks ?? []).map((h) => extraGroup(HOME, h))];
  for (const [event, g] of hooks) {
    const n = needleOf(g.hooks[0].command), wired = hasCmd(settings.hooks?.[event], n), file = existsSync(join(HOME, "scripts", n));
    out.push(wired && !file ? ["broken", `${event} hook points at ${n}, which is not in ~/.claude/scripts`] : wired ? ["installed"] : ["missing"]);
  }
  for (const f of (p.scripts ?? []).filter((f) => !f.includes(".test."))) out.push(fileStatus(read(join(HOME, "scripts", f)), join(SRC, "scripts", f)));
  for (const sk of p.skills ?? []) {
    const mine = read(join(HOME, "skills", sk, "SKILL.md"));
    out.push(mine === null ? ["missing"] : mine === read(join(SRC, "skills", sk, "SKILL.md")) ? ["installed"] : ["different", `you have a skill named ${sk} that differs from ours`]);
  }
  if (p.plugin) {
    const key = Object.keys(plugins).find((k) => k.startsWith(`${p.plugin}@`));
    out.push(!key ? ["missing"] : plugins[key] ? ["installed"] : ["partial", `${key} is installed but disabled`]);
  }
  return out;
}
const RANK = ["broken", "different", "outdated", "partial"];
function verdict(ps) {
  const st = ps.map((x) => x[0]);
  const status = st.every((x) => x === "installed") ? "installed" : st.every((x) => x === "missing") ? "missing"
    : RANK.find((r) => st.includes(r)) ?? "partial";
  return { status, notes: [...new Set(ps.map((x) => x[1]).filter(Boolean))] };
}

const userJson = json(join(dirname(HOME), ".claude.json"));
const mcpServers = Object.keys(userJson?.mcpServers ?? {});
const projectMcp = new Set(Object.values(userJson?.projects ?? {}).flatMap((p) => Object.keys(p?.mcpServers ?? {})));
const onPath = (cmd) => spawnSync(process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`, { shell: true, stdio: "ignore", timeout: 10000 }).status === 0;
// third-party tools: found (and where) or not; CLIs are only looked for when tools are checked
function external(c) {
  const d = c.external.detect, found = [], list = (v) => [v ?? []].flat();
  for (const p of list(d.plugin)) { const k = Object.keys(plugins).find((x) => x.startsWith(`${p}@`)); if (k) found.push(plugins[k] ? `plugin ${k}` : `plugin ${k} (disabled)`); }
  for (const m of list(d.mcp)) if (mcpServers.includes(m) || projectMcp.has(m)) found.push(`MCP server ${m}`);
  for (const sk of list(d.skill)) if (existsSync(join(HOME, "skills", sk, "SKILL.md"))) found.push(`skill ${sk}`);
  if (!args.includes("--no-tools")) for (const x of list(d.cli)) if (onPath(x)) found.push(`CLI ${x}`);
  return { status: !found.length ? "missing" : found.every((f) => f.endsWith("(disabled)")) ? "partial" : "installed", notes: found, verdict: c.external.verdict, replacedBy: c.external.replacedBy };
}
const components = catalog.components.map((c) => ({ id: c.id, group: c.group, title: c.title, default: c.default, ...(c.external ? external(c) : verdict(parts(c))) }));

// what you have that the playbook doesn't
const known = new Set(catalog.components.flatMap((c) => [...(c.parts.scripts ?? []), ...(c.parts.extraHooks ?? []).map((h) => h.command)]).concat("rtk hook"));
const ownHooks = Object.entries(settings.hooks ?? {}).flatMap(([event, groups]) => (groups ?? []).flatMap((g) => (g.hooks ?? [])
  .filter((h) => ![...known].some((n) => String(h.command ?? h.url ?? "").includes(n)))
  .map((h) => ({ event, matcher: g.matcher ?? "", command: tidy(h.command ?? h.url ?? h.type).slice(0, 120) }))));
const ourSkills = new Set(catalog.components.flatMap((c) => c.parts.skills ?? []));
let ownSkills = []; try { ownSkills = readdirSync(join(HOME, "skills"), { withFileTypes: true }).filter((d) => d.isDirectory() && !ourSkills.has(d.name) && existsSync(join(HOME, "skills", d.name, "SKILL.md"))).map((d) => d.name); } catch {}
const ourPlugins = new Set(catalog.components.flatMap((c) => [c.parts.plugin, c.external?.detect.plugin].flat()).filter(Boolean));
const ownPlugins = Object.entries(plugins).filter(([k, v]) => v && !ourPlugins.has(k.split("@")[0])).map(([k]) => k);
const yours = {
  hooks: ownHooks, skills: ownSkills, plugins: ownPlugins, mcpServers,
  claudeMd: { chars: md.length, approxTokens: Math.round(md.length / 4), hasPlaybookBlock: md.includes(START), hasCompactInstructions: /^#+\s*Compact instructions/im.test(md) },
  settings: { model: settings.model ?? null, outputStyle: settings.outputStyle ?? null, defaultMode: settings.permissions?.defaultMode ?? null, allowRules: (settings.permissions?.allow ?? []).length },
};

const version = (cmd) => { const r = spawnSync(`${cmd} --version`, { shell: true, encoding: "utf8", timeout: 15000 }); return r.status === 0 ? (r.stdout || r.stderr).trim().split("\n")[0] : null; };
const tools = args.includes("--no-tools") ? null : {
  platform: `${process.platform} ${process.arch}`, node: process.version,
  python: version("python") ?? version("python3"), git: version("git"), rtk: version("rtk"), claude: version("claude"),
};

const report = { home: HOME, components, yours, tools };
if (args.includes("--json")) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const own = components.filter((c) => !c.verdict), count = (s) => own.filter((c) => c.status === s).length;
console.log(`Claude Code setup review: ${HOME}`);
console.log(`${count("installed")} installed, ${count("outdated")} outdated, ${count("different")} different, ${count("partial")} partial, ${count("missing")} missing, ${count("broken")} broken (of ${own.length}; third-party tools listed separately)\n`);
for (const g of catalog.groups) {
  console.log(`${g}`);
  for (const c of components.filter((x) => x.group === g)) console.log(`  ${c.status.padEnd(10)} ${c.id.padEnd(20)} ${c.title}${c.verdict ? `  (our verdict: ${c.verdict})` : ""}${c.notes.length ? `  [${c.notes.join("; ")}]` : ""}`);
}
console.log(`\nOnly in your setup`);
console.log(`  hooks:   ${ownHooks.length ? ownHooks.map((h) => `${h.event}${h.matcher ? `(${h.matcher})` : ""}: ${h.command}`).join("\n           ") : "none"}`);
console.log(`  skills:  ${ownSkills.join(", ") || "none"}`);
console.log(`  plugins: ${ownPlugins.join(", ") || "none"}`);
console.log(`  MCP servers (user scope): ${mcpServers.join(", ") || "none"}`);
console.log(`  CLAUDE.md: ${yours.claudeMd.chars} chars (~${yours.claudeMd.approxTokens} tokens), playbook block: ${yours.claudeMd.hasPlaybookBlock ? "yes" : "no"}, Compact instructions: ${yours.claudeMd.hasCompactInstructions ? "yes" : "no"}`);
if (tools) console.log(`\nMachine: ${Object.entries(tools).map(([k, v]) => `${k} ${v ?? "not found"}`).join(" | ")}`);
