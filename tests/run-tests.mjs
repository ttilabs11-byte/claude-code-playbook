#!/usr/bin/env node
// Feeds known-bad and known-good cases to every hook, and installs twice into a throwaway home to prove the
// installer is idempotent. Usage: node tests/run-tests.mjs [--installed]  (--installed tests ~/.claude/scripts)
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPTS = process.argv.includes("--installed") ? join(homedir(), ".claude", "scripts") : join(ROOT, "claude", "scripts");
const tmp = mkdtempSync(join(tmpdir(), "ccs-test-"));
let pass = 0, fail = 0;
const check = (name, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got: ${got})`}`); };
const run = (script, input) => spawnSync("node", [join(SCRIPTS, script)], { input: JSON.stringify(input), encoding: "utf8" });
const decision = (out) => { try { const j = JSON.parse(out); return j.hookSpecificOutput?.permissionDecision ?? j.decision ?? "?"; } catch { return out ? "?" : "pass"; } };

// shell-guard: secrets denied, risky commands asked, normal commands untouched
const guard = [
  ["cat .env", "deny"], ["type C:\\app\\.env.local", "deny"], ["ls ~/.ssh/", "deny"], ["cat .env.example", "pass"],
  ["git push origin main", "ask"], ["git -C repo push", "ask"], ["gh pr create --fill", "ask"], ["pip install x", "ask"],
  ["python -m pip install x", "ask"], ["npm i -g x", "ask"], ["winget install x", "ask"],
  ["git status", "pass"], ["npm install", "pass"], ["ls -la", "pass"],
  // destructive commands ask; build/temp folders and non-recursive deletes pass
  ["rm -rf src", "ask"], ["rm -fr ~/work", "ask"], ["sudo rm -R /data", "ask"], ["Remove-Item -Recurse -Force C:\\proj", "ask"],
  ["ri C:\\proj -rec", "ask"], ["rd /s /q C:\\proj", "ask"], ["pwsh -c \"Remove-Item -r x\"", "ask"],
  ["git reset --hard HEAD~3", "ask"], ["git clean -fd", "ask"], ["git checkout .", "ask"], ["git push --force origin main", "ask"],
  ["git branch -D old", "ask"], ["psql -c 'DROP TABLE users'", "ask"], ["docker system prune -a", "ask"],
  ["rm -rf node_modules dist", "pass"], ["rm -rf ./build", "pass"], ["Remove-Item -Force notes.txt", "pass"], ["rm -f a.log", "pass"],
  ["Remove-Item -Recurse \"$env:TEMP\\x\"", "pass"], ["git checkout main", "pass"], ["git reset HEAD file", "pass"],
];
for (const [cmd, want] of guard) { const got = decision(run("shell-guard.mjs", { tool_input: { command: cmd } }).stdout); check(`shell-guard ${want.padEnd(4)} ${cmd}`, got === want, got); }

// ratchet: each bar-lowering change is found; an honest diff is clean; shell-guard asks on a commit that trips it
const { scan } = await import(new URL(`file:///${join(SCRIPTS, "ratchet.mjs").replace(/\\/g, "/")}`));
const d = (path, body, extra = "") => `diff --git a/${path} b/${path}\n${extra}--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n${body}\n`;
const rt = [
  ["ts-ignore", d("src/a.ts", "+// @ts-ignore\n+const x: number = 'a';"), 1],
  ["eslint-disable", d("src/b.js", "+/* eslint-disable no-unused-vars */"), 1],
  ["it.skip", d("src/a.test.ts", "+it.skip('works', () => {});"), 1],
  ["pytest skip", d("tests/test_a.py", "+@pytest.mark.skip"), 1],
  ["assertions removed", d("src/a.spec.ts", "-  expect(a).toBe(1);\n-  expect(b).toBe(2);\n+  // checked elsewhere"), 1],
  ["test file deleted", d("src/old.test.ts", "-it('x', () => {})", "deleted file mode 100644\n"), 1],
  ["coverage lowered", d("vitest.config.ts", "-      lines: 80,\n+      lines: 60,"), 1],
  ["max warnings raised", d("package.json", "-  \"lint\": \"eslint --max-warnings=0\"\n+  \"lint\": \"eslint --max-warnings=50\""), 1],
  ["stub", d("src/c.ts", "+  throw new Error('not implemented');"), 1],
  ["narrator comment", d("src/d.ts", "+// This function handles the login flow"), 1],
  ["honest change", d("src/e.ts", "-const a = 1;\n+const a = 2;\n+// retry once: the API drops the first call after idle"), 0],
  ["coverage raised", d("vitest.config.ts", "-      lines: 60,\n+      lines: 80,"), 0],
  ["new test added", d("src/a.test.ts", "+it('handles empty input', () => { expect(f('')).toBe(0); });"), 0],
];
for (const [name, diff, want] of rt) { const got = scan(diff).length; check(`ratchet ${want ? "finds" : "clean"} ${name}`, got === want, got); }
const repo = join(tmp, "repo"); mkdirSync(repo);
const g = (...a) => spawnSync("git", ["-C", repo, ...a], { encoding: "utf8" });
g("init", "-q"); writeFileSync(join(repo, "a.test.ts"), "it('a', () => { expect(1).toBe(1); });\n"); g("add", "."); g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init");
writeFileSync(join(repo, "a.test.ts"), "it.skip('a', () => {});\n"); g("add", ".");
check("shell-guard asks on a commit ratchet flags", decision(run("shell-guard.mjs", { tool_input: { command: "git commit -m x" }, cwd: repo }).stdout) === "ask", "no ask");
g("reset", "-q", "--hard"); writeFileSync(join(repo, "b.ts"), "export const b = 1;\n"); g("add", ".");
check("shell-guard passes an honest commit", decision(run("shell-guard.mjs", { tool_input: { command: "git commit -m x" }, cwd: repo }).stdout) === "pass", "asked");

// edit-boundary: a pinned session can't edit outside its folder; session logs, ~/.claude and temp stay open; off lifts it
const bh = join(tmp, "bhome"), benv = { ...process.env, USERPROFILE: bh, HOME: bh };
const eb = (input) => decision(spawnSync("node", [join(SCRIPTS, "edit-boundary.mjs")], { input: JSON.stringify(input), encoding: "utf8", env: benv }).stdout);
const sid = "s-bound", W2 = (p) => ({ session_id: sid, cwd: "C:/r", hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: p } });
check("edit-boundary inactive by default", eb(W2("C:/r/other/x.ts")) === "pass", "blocked");
eb({ session_id: sid, cwd: "C:/r", hook_event_name: "UserPromptSubmit", prompt: "Do the API part.\nEDIT-BOUNDARY: C:/r/api" });
check("edit-boundary blocks outside", eb(W2("C:/r/web/page.tsx")) === "deny", "allowed");
check("edit-boundary blocks a sibling prefix", eb(W2("C:/r/api-old/x.ts")) === "deny", "allowed");
check("edit-boundary allows inside", eb(W2("C:\\r\\API\\routes.ts")) === "pass", "blocked");
check("edit-boundary allows session logs", eb(W2("C:/r/session-logs/2026-01-01-x.md")) === "pass", "blocked");
check("edit-boundary leaves other sessions alone", eb({ ...W2("C:/r/web/page.tsx"), session_id: "s-other" }) === "pass", "blocked");
eb({ session_id: sid, cwd: "C:/r", hook_event_name: "UserPromptSubmit", prompt: "EDIT-BOUNDARY: off" });
check("edit-boundary off lifts it", eb(W2("C:/r/web/page.tsx")) === "pass", "still blocked");

// log-guard: a working turn without a session-log write is blocked once
const turn = (tools, first = "hello") => {
  const L = [{ type: "user", message: { role: "user", content: first } }, { type: "user", message: { role: "user", content: "do it" } }];
  for (const [name, input] of tools) {
    L.push({ type: "assistant", message: { content: [{ type: "tool_use", name, input }] } });
    L.push({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } });
  }
  const p = join(tmp, `t${Math.random().toString(36).slice(2)}.jsonl`);
  writeFileSync(p, L.map((x) => JSON.stringify(x)).join("\n"));
  return p;
};
const B = ["Bash", { command: "ls" }], W = ["Write", { file_path: "/x/a.txt" }], M = ["mcp__srv__archive_session", {}], R = ["Read", { file_path: "/x" }];
const LOG = ["Edit", { file_path: "C:\\p\\session-logs\\2026-01-01-x.md" }];
const lg = [
  ["3 changes, no log", { transcript_path: turn([B, W, M]) }, "block"],
  ["3 changes + log edit", { transcript_path: turn([B, W, M, LOG]) }, "pass"],
  ["2 changes only", { transcript_path: turn([B, W, R, R]) }, "pass"],
  ["already blocked once", { transcript_path: turn([B, W, M]), stop_hook_active: true }, "pass"],
  ["scheduled-task run", { transcript_path: turn([B, W, M], "<scheduled-task name=x>") }, "pass"],
];
for (const [name, input, want] of lg) { const got = decision(run("log-guard.mjs", input).stdout); check(`log-guard  ${want.padEnd(5)} ${name}`, got === want, got); }

// session-resume: after compaction, the log the transcript names is put back; nothing named, nothing added
const proj = join(tmp, "proj"); mkdirSync(join(proj, "session-logs"), { recursive: true });
writeFileSync(join(proj, "session-logs", "2026-01-01-demo.md"), "# Goal\n- Done: step one\n");
const named = join(tmp, "named.jsonl");
writeFileSync(named, JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: `${proj.replace(/\\/g, "/")}/session-logs/2026-01-01-demo.md` } }] } }));
const ctx = (p) => { try { return JSON.parse(run("session-resume.mjs", { transcript_path: p, cwd: proj, source: "compact" }).stdout).hookSpecificOutput.additionalContext; } catch { return ""; } };
check("session-resume restores the named log", ctx(named).includes("step one"), ctx(named).slice(0, 60));
check("session-resume silent when none named", ctx(turn([B])) === "", "context");
check("session-resume no compact nudge for a small log", !ctx(named).includes("Compact it now"), "nudged");
writeFileSync(join(proj, "session-logs", "2026-01-01-demo.md"), `# Goal\n${"- Done: filler line\n".repeat(2500)}- Done: step one\n`);
check("session-resume nudges to compact a log over 40 KB", ctx(named).includes("Compact it now"), ctx(named).slice(-80));

// log-compact: archive is verbatim; check fails when a live anchor is dropped and passes when all are kept
const lc = (...a) => spawnSync("node", [join(SCRIPTS, "log-compact.mjs"), ...a], { encoding: "utf8" });
const clog = join(proj, "session-logs", "2026-01-02-big.md");
writeFileSync(clog, "- Done: pushed abc1234f to https://example.com/repo; config at C:/work/app/settings.json\n");
const archived = lc("archive", clog).stdout.match(/-> (.+\.md)/)?.[1] ?? "";
check("log-compact archive is a verbatim copy", archived && readFileSync(archived, "utf8") === readFileSync(clog, "utf8"), archived);
writeFileSync(clog, "## Current state\n- Pushed abc1234f; config C:/work/app/settings.json\n");
const bad = lc("check", clog, archived);
check("log-compact check fails on a dropped URL", bad.status === 1 && bad.stdout.includes("https://example.com/repo"), bad.stdout.slice(0, 80));
writeFileSync(clog, "## Pointers\n- abc1234f https://example.com/repo C:/work/app/settings.json\n");
check("log-compact check passes when every anchor is kept", lc("check", clog, archived).status === 0, "missing anchors");

// statusline: one line from good, partial and broken input; never crashes
const sl = (input) => spawnSync("node", [join(SCRIPTS, "statusline.mjs")], { input: typeof input === "string" ? input : JSON.stringify(input), encoding: "utf8" });
const full = sl({ context_window: { used_percentage: 41.6 }, prompt_cache: { warm: true, caching_observed: true, ttl: "1h", expires_at: Date.now() / 1000 + 600, hit_ratio: 0.913, last_miss_cause: { causes: ["tools_changed"] } } });
check("statusline full", full.status === 0 && full.stdout.trim() === "ctx 42% | cache warm 1h, 10m left | hit 91% | last miss: tools_changed", full.stdout.trim());
const early = sl({ context_window: { used_percentage: null } });
check("statusline before first reply", early.status === 0 && early.stdout.trim() === "ctx ?", early.stdout.trim());
const cold = sl({ context_window: { used_percentage: 7 }, prompt_cache: { warm: false, caching_observed: true, expires_at: null, hit_ratio: null, last_miss_cause: null } });
check("statusline cold cache", cold.stdout.trim() === "ctx 7% | cache cold", cold.stdout.trim());
const junk = sl("not json{");
check("statusline survives bad input", junk.status === 0 && junk.stdout.trim() === "ctx ?", junk.stdout.trim() || junk.stderr.slice(0, 80));

// config-audit: each change is one JSON line in <home>/.claude/logs; bad input still exits 0 and writes nothing
const ah = join(tmp, "audit-home"), aenv = { ...process.env, USERPROFILE: ah, HOME: ah };
const audit = (input) => spawnSync("node", [join(SCRIPTS, "config-audit.mjs")], { input, encoding: "utf8", env: aenv });
const a1 = audit(JSON.stringify({ source: "project_settings", file_path: "/r/.claude/settings.json", cwd: "/r", session_id: "s1" }));
const a2 = audit("garbage");
let alog = ""; try { alog = readFileSync(join(ah, ".claude", "logs", "config-audit.log"), "utf8"); } catch {}
const arows = alog.trim().split("\n").filter(Boolean);
check("config-audit logs one line per change", a1.status === 0 && arows.length === 1 && JSON.parse(arows[0]).source === "project_settings", alog.slice(0, 80));
check("config-audit never blocks bad input", a2.status === 0 && a2.stdout === "", `exit ${a2.status}`);

// installer: two runs into a fresh home give one block, one copy of each hook, and keep foreign settings
const home = join(tmp, "home"); mkdirSync(home);
writeFileSync(join(home, "settings.json"), JSON.stringify({ theme: "dark", permissions: { allow: ["Bash(ls *)"] } }));
writeFileSync(join(home, "CLAUDE.md"), "# My own notes\n");
for (let i = 0; i < 2; i++) spawnSync("node", [join(ROOT, "install.mjs"), "--home", home, "--no-rtk"], { encoding: "utf8" });
const st = JSON.parse(readFileSync(join(home, "settings.json"), "utf8")), md = readFileSync(join(home, "CLAUDE.md"), "utf8");
const count = (ev, n) => (st.hooks[ev] ?? []).filter((g) => JSON.stringify(g).includes(n)).length;
check("install keeps existing settings", st.theme === "dark" && st.permissions.allow[0] === "Bash(ls *)" && st.cleanupPeriodDays === 90 && st.statusLine.command.includes("statusline.mjs"), JSON.stringify(st).slice(0, 80));
check("install adds each hook exactly once", count("PreToolUse", "shell-guard") === 1 && count("Stop", "log-guard") === 1 && count("SessionStart", "session-resume") === 1 && count("ConfigChange", "config-audit") === 1, JSON.stringify(st.hooks).slice(0, 120));
check("install keeps one rules block + own notes", md.split("claude-code-setup:start").length === 2 && md.startsWith("# My own notes"), md.slice(0, 60));
check("install drops tracker rule when no --tracker", !md.includes("{{TRACKER_FILE}}") && !md.includes("Project tracker"), "tracker text left");

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
