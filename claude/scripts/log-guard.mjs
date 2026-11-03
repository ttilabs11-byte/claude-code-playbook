// Stop hook: a turn that did real work (3+ edits, shell commands or write-type MCP calls) may not end until the
// session log (<folder>/session-logs/YYYY-MM-DD-<topic>.md) was written in that same turn. Blocks once per stop
// (stop_hook_active ends the loop). Scheduled-task runs are exempt: they write their own reports.
// Each block appends one line to ~/.claude/logs/log-guard.log.
import { appendFileSync, closeSync, existsSync, fstatSync, openSync, readFileSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MIN_WORK = 3;
const WRITE_MCP = /create|update|send|set_|archive|stop|delete|run_|publish|apply|deploy|execute|merge|upload|post/i;

let input = {};
try { input = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
if (input.stop_hook_active || !input.transcript_path || !existsSync(input.transcript_path)) process.exit(0);

function read(path, start, bytes) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size, from = start < 0 ? Math.max(0, size + start) : start;
    const buf = Buffer.alloc(Math.min(bytes, size - from));
    readSync(fd, buf, 0, buf.length, from);
    return buf.toString("utf8");
  } finally { closeSync(fd); }
}

if (read(input.transcript_path, 0, 65536).includes("<scheduled-task")) process.exit(0);

const entries = read(input.transcript_path, -4 * 2 ** 20, 4 * 2 ** 20).split("\n")
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

// the turn starts at the last real user prompt (not a tool result, not a meta or hook message)
const isPrompt = (e) => e.type === "user" && !e.isMeta && !e.isCompactSummary && (typeof e.message?.content === "string"
  || (Array.isArray(e.message?.content) && e.message.content.some((c) => c.type === "text")
      && !e.message.content.some((c) => c.type === "tool_result")));
let start = 0;
for (let i = entries.length - 1; i >= 0; i--) if (isPrompt(entries[i])) { start = i; break; }

let work = 0, logged = false;
for (const e of entries.slice(start)) {
  if (e.type !== "assistant" || !Array.isArray(e.message?.content)) continue;
  for (const c of e.message.content) {
    if (c.type !== "tool_use") continue;
    const n = c.name ?? "", inp = c.input ?? {};
    const target = String(inp.file_path ?? inp.notebook_path ?? inp.command ?? "").replace(/\\+/g, "/");
    if (/session-logs\/[^\s"']*\.md/i.test(target) && /^(Edit|Write|Bash|PowerShell)$/.test(n)) logged = true;
    if (/^(Edit|Write|NotebookEdit|Bash|PowerShell)$/.test(n) || (n.startsWith("mcp__") && WRITE_MCP.test(n.split("__").pop()))) work++;
  }
}

if (work >= MIN_WORK && !logged) {
  const reason = `log-guard: this turn made ${work} changes or commands but the session log was not updated. ` +
    "Before finishing, append what happened to this session's log (<working folder>/session-logs/YYYY-MM-DD-<topic>.md; " +
    "create it if the session has none): Found, Done, Decisions, Traps, Open/next, facts only. Then end the turn.";
  try { appendFileSync(join(homedir(), ".claude", "logs", "log-guard.log"), `${new Date().toISOString()} ${input.session_id ?? "?"} block work=${work}\n`); } catch {}
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}
