// SessionStart hook (matcher "compact"): after a compaction, put this session's own session log back in context.
// Many sessions share one session-logs folder, so the log is the one this transcript names most in its recent part,
// not the newest file. Reads only the end of the transcript (they reach hundreds of MB). Silent when nothing is found.
// Each run appends one line to ~/.claude/logs/session-resume.log, so you can check it fired.
import { appendFileSync, closeSync, existsSync, fstatSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const started = Date.now();
const NAME = /session-logs\/+(\d{4}-\d{2}-\d{2}-[\w.-]+\.md)/g;
const ROOT = /(?:^|[\s"'=(])((?:[A-Za-z]:|\/[a-z])\/)/g;
let input = {};
try { input = JSON.parse(readFileSync(0, "utf8")); } catch { /* no or bad stdin: nothing to do */ }

function tail(path, bytes) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size, start = Math.max(0, size - bytes), buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    return { text: buf.toString("utf8").replace(/\\+/g, "/"), whole: start === 0 };
  } finally { closeSync(fd); }
}

// the full path of one mention: from the last drive root before it (D:/ or /d/) to the file name, else cwd/session-logs
function resolve(text, at, file) {
  const before = text.slice(Math.max(0, at - 200), at);
  let root = -1;
  for (const m of before.matchAll(ROOT)) root = m.index + m[0].length - m[1].length;
  const dir = root < 0 ? null : before.slice(root).replace(/^\/([a-z])\//, (_, d) => `${d.toUpperCase()}:/`);
  return [dir && `${dir}session-logs/${file}`, input.cwd && join(input.cwd, "session-logs", file)].filter((p) => p && existsSync(p))[0];
}

function pick() {
  if (!input.transcript_path || !existsSync(input.transcript_path)) return null;
  for (const mb of [4, 16, 64]) {
    const { text, whole } = tail(input.transcript_path, mb * 2 ** 20);
    const seen = new Map(); // file -> { count, last index }
    for (const m of text.matchAll(NAME)) seen.set(m[1], { count: (seen.get(m[1])?.count ?? 0) + 1, at: m.index });
    const ranked = [...seen].sort((a, b) => b[1].count - a[1].count || b[1].at - a[1].at);
    for (const [file, { at }] of ranked) {
      const path = resolve(text, at, file);
      if (path) return path;
    }
    if (whole) break;
  }
  return null;
}

let path = null, note = "";
try { path = pick(); } catch (e) { note = ` error: ${String(e).slice(0, 120)}`; }
if (path) {
  const lines = readFileSync(path, "utf8").trimEnd().split(/\r?\n/);
  let end = "";
  for (let i = lines.length - 1; i >= 0 && end.length + lines[i].length < 1800; i--) end = `${lines[i]}\n${end}`;
  const kb = Math.round(statSync(path).size / 1024);
  const big = kb > 40 ? `\nThis log is ${kb} KB (over 40). Compact it now with the session-log compaction rule (log-compact.mjs archive, rewrite, check).` : "";
  const additionalContext = `Session log for this conversation (the one its recent transcript names most): ${path}\nIts last lines, as of this compaction:\n${end.trimEnd()}${big}`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }));
}
try {
  appendFileSync(join(homedir(), ".claude", "logs", "session-resume.log"),
    `${new Date().toISOString()} ${input.source ?? "?"} ${input.session_id ?? "?"} ${path ?? "none"} ${Date.now() - started}ms${note}\n`);
} catch { /* logging is best effort */ }
