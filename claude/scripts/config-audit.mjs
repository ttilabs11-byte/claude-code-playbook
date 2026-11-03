// ConfigChange hook: appends one line per settings or skill change to ~/.claude/logs/config-audit.log, so a change
// you didn't make (a cloned repo, another session, a plugin) leaves a trace. Never blocks a change.
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  try {
    const j = JSON.parse(raw);
    const dir = join(homedir(), '.claude', 'logs');
    mkdirSync(dir, { recursive: true });
    const line = { time: new Date().toISOString(), source: j.source ?? '?', file: j.file_path ?? null, cwd: j.cwd ?? null, session: j.session_id ?? null };
    appendFileSync(join(dir, 'config-audit.log'), `${JSON.stringify(line)}\n`);
  } catch {}
  process.exit(0);
});
