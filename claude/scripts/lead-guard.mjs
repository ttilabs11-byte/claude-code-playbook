// Stop hook: a lead may not end a turn on a note from a session it started or coordinates without moving that session
// on. Satisfied by send_message (or archive/stop/mark_completed) to that session in the same turn, or by a line
// "No next step for <session>: <reason>" in the reply. A sender counts as this session's child when the desktop session
// index says it was spawned from here, or when this session messaged it earlier. Blocks once per stop
// (stop_hook_active ends the loop). Scheduled-task runs are exempt. Each block appends a line to ~/.claude/logs/lead-guard.log.
import { appendFileSync, closeSync, existsSync, fstatSync, openSync, readFileSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

const entries = read(input.transcript_path, -8 * 2 ** 20, 8 * 2 ** 20).split("\n")
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const NOTE = /<cross-session-message from="(local_[0-9a-f-]+)"(?: name="([^"]*)")?>/g;
const isPeer = (e) => e.type === "user" && e.origin?.kind === "peer";
const isQueued = (e) => e.type === "attachment" && e.attachment?.type === "queued_command";
const isPrompt = (e) => isPeer(e) || (e.type === "user" && !e.isMeta && !e.isCompactSummary
  && (typeof e.message?.content === "string" || (Array.isArray(e.message?.content)
      && e.message.content.some((c) => c.type === "text") && !e.message.content.some((c) => c.type === "tool_result"))));

// the turn = everything after the last finished reply that came before the latest prompt
let lastPrompt = -1, start = -1;
for (let i = entries.length - 1; i >= 0; i--) if (isPrompt(entries[i])) { lastPrompt = i; break; }
if (lastPrompt < 0) process.exit(0);
for (let i = lastPrompt - 1; i >= 0; i--) if (entries[i].type === "assistant" && entries[i].message?.stop_reason === "end_turn") { start = i; break; }

const toolUses = (e) => (e.type === "assistant" && Array.isArray(e.message?.content) ? e.message.content : [])
  .filter((c) => c.type === "tool_use");
const messagedEarlier = new Set();
for (const e of entries.slice(0, start + 1))
  for (const c of toolUses(e)) if (/send_message$/.test(c.name ?? "") && c.input?.session_id) messagedEarlier.add(c.input.session_id);

const me = process.env.CLAUDE_CODE_HOST_SESSION_ID;
const indexDir = process.env.LEAD_GUARD_SESSIONS_DIR || join(process.env.APPDATA ?? "", "Claude-Work", "claude-code-sessions",
  process.env.CLAUDE_CODE_ACCOUNT_UUID ?? "", process.env.CLAUDE_CODE_ORGANIZATION_UUID ?? "");
function isChild(id) {
  if (messagedEarlier.has(id)) return true;
  try { return !!me && JSON.parse(readFileSync(join(indexDir, `${id}.json`), "utf8")).spawnedFrom?.sessionId === me; }
  catch { return false; }
}

const notes = new Map(); // id -> name
const turn = entries.slice(start + 1);
for (const e of turn) {
  if (!isPeer(e) && !isQueued(e)) continue;
  for (const m of JSON.stringify(e).replace(/\\"/g, '"').matchAll(NOTE)) if (m[1] !== me && isChild(m[1])) notes.set(m[1], m[2] || m[1]);
}
if (!notes.size) process.exit(0);

let said = "";
for (const e of turn) {
  for (const c of toolUses(e)) {
    if (!/(send_message|archive_session|stop_session|mark_completed)$/.test(c.name ?? "")) continue;
    const inp = JSON.stringify(c.input ?? {});
    for (const id of [...notes.keys()]) if (inp.includes(id)) notes.delete(id);
  }
  if (e.type === "assistant" && Array.isArray(e.message?.content))
    for (const c of e.message.content) if (c.type === "text") said += c.text + "\n";
}
for (const [id, name] of [...notes]) {
  const line = said.match(/no next step for ([^:\n]+):/gi) ?? [];
  if (line.some((l) => l.toLowerCase().includes(name.toLowerCase().slice(0, 20)) || l.includes(id))) notes.delete(id);
}
if (!notes.size) process.exit(0);

const list = [...notes].map(([id, name]) => `"${name}" (${id})`).join(", ");
const reason = `lead-guard: this turn received a note from ${list}, a session you started or coordinate, and you did not move it on. ` +
  "Work out its most logical next step from its note, the plan and the session's goal, then send it with " +
  "mcp__ccd_session_mgmt__send_message (one batched, specific instruction: what to do next, what done looks like). " +
  "If its work is finished and verified, archive it or say so. If it is still busy on its current step, write " +
  "\"No next step for <session name>: still working\". Only when the next step truly needs the user (a taste pick, money, " +
  "publishing, an irreversible step, or a hold they asked for) leave it, ask the user in one line, and write " +
  "\"No next step for <session name>: <reason>\" in your reply. Then end the turn.";
try { appendFileSync(join(homedir(), ".claude", "logs", "lead-guard.log"), `${new Date().toISOString()} ${input.session_id ?? "?"} block ${[...notes.keys()].join(",")}\n`); } catch {}
process.stdout.write(JSON.stringify({ decision: "block", reason }));
