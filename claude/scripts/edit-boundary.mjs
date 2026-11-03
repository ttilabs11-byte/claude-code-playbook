// Edit boundary for a session (gstack `freeze`, our version). A message with a line `EDIT-BOUNDARY: <folder>[; <folder>]`
// pins that session's Edit/Write/NotebookEdit to those folders; `EDIT-BOUNDARY: off` lifts it. Session logs, ~/.claude
// and temp folders stay writable. Hooks: UserPromptSubmit (sets) and PreToolUse Edit|Write|MultiEdit|NotebookEdit (enforces).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let j; try { j = JSON.parse(raw); } catch { return; }
  const id = String(j.session_id ?? '').replace(/[^\w-]/g, '');
  if (!id) return;
  const dir = join(homedir(), '.claude', 'state', 'edit-boundary'), file = join(dir, `${id}.txt`);
  const norm = p => resolve(j.cwd || '.', p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

  if (j.hook_event_name === 'UserPromptSubmit' || typeof j.prompt === 'string') {
    const m = String(j.prompt ?? '').match(/^\s*EDIT-BOUNDARY:\s*(.+?)\s*$/m);
    if (!m) return;
    if (/^off$/i.test(m[1])) { rmSync(file, { force: true }); return; }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, m[1].split(';').map(s => norm(s.trim().replace(/^["'`]|["'`]$/g, ''))).filter(Boolean).join('\n'));
    return;
  }

  if (!existsSync(file)) return;
  const target = j.tool_input?.file_path ?? j.tool_input?.notebook_path;
  if (!target) return;
  const t = norm(target);
  const always = [norm(join(homedir(), '.claude')), norm(tmpdir())];
  const roots = readFileSync(file, 'utf8').split('\n').filter(Boolean).concat(always);
  if (/\/session-logs\//.test(t) || roots.some(r => t === r || t.startsWith(`${r}/`))) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
    permissionDecisionReason: `edit-boundary: this session may only edit inside ${roots.slice(0, -2).join(', ')}; ${target} is outside. Ask the lead to widen it.` } }));
});
