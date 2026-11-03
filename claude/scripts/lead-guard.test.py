"""Cases for lead-guard.mjs: each builds a fake transcript and checks block / pass."""
import json, os, subprocess, tempfile
HOOK = os.path.expanduser('~/.claude/scripts/lead-guard.mjs')
ME, KID, STRANGER, OTHER = 'local_aaaaaaaa-0000', 'local_bbbbbbbb-1111', 'local_cccccccc-2222', 'local_dddddddd-3333'
tmp = tempfile.mkdtemp()
json.dump({'sessionId': KID, 'spawnedFrom': {'sessionId': ME}}, open(f'{tmp}/{KID}.json', 'w'))
json.dump({'sessionId': STRANGER}, open(f'{tmp}/{STRANGER}.json', 'w'))

def human(t): return {'type': 'user', 'origin': {'kind': 'human'}, 'message': {'role': 'user', 'content': t}}
def peer(sid, name, t='Done: the brochure is built.'):
    return {'type': 'user', 'origin': {'kind': 'peer', 'from': sid}, 'message': {'role': 'user', 'content':
            f'Another Claude session sent a message:\n<cross-session-message from="{sid}" name="{name}">\n{t}\n</cross-session-message>'}}
def queued(sid, name): return {'type': 'attachment', 'attachment': {'type': 'queued_command', 'prompt':
            f'<cross-session-message from="{sid}" name="{name}">ready</cross-session-message>'}}
def say(t, stop='end_turn'): return {'type': 'assistant', 'message': {'role': 'assistant', 'stop_reason': stop, 'content': [{'type': 'text', 'text': t}]}}
def tool(name, inp): return {'type': 'assistant', 'message': {'role': 'assistant', 'stop_reason': 'tool_use', 'content': [{'type': 'tool_use', 'name': name, 'input': inp}]}}
SEND = 'mcp__ccd_session_mgmt__send_message'

cases = {
  'child done, lead only relays -> block': ([human('go'), say('ok'), peer(KID, 'Brochures'), say('Brochures is done.')], True, False),
  'child done, lead sends next step -> pass': ([peer(KID, 'Brochures'), tool(SEND, {'session_id': KID, 'message': 'next: print set'}), say('sent')], False, False),
  'stranger note -> pass': ([peer(STRANGER, 'Other'), say('noted')], False, False),
  'coordinated (messaged earlier) -> block': ([tool(SEND, {'session_id': OTHER, 'message': 'do x'}), say('sent'), peer(OTHER, 'Coord'), say('fine')], True, False),
  'explicit no next step -> pass': ([peer(KID, 'Brochures'), say('No next step for Brochures: you need to pick A or B.')], False, False),
  'no-next-step names wrong session -> block': ([peer(KID, 'Brochures'), say('No next step for Films: hold.')], True, False),
  'mid-turn queued note, ignored -> block': ([human('task'), tool('Bash', {'command': 'ls'}), queued(KID, 'Brochures'), say('done task')], True, False),
  'note from earlier turn, already handled -> pass': ([peer(KID, 'Brochures'), say('relayed'), human('new thing'), say('did it')], False, False),
  'stop_hook_active -> pass': ([peer(KID, 'Brochures'), say('relayed')], False, True),
  'archived child -> pass': ([peer(KID, 'Brochures'), tool('mcp__ccd_session_mgmt__archive_session', {'session_id': KID}), say('closed')], False, False),
}
env = {**os.environ, 'CLAUDE_CODE_HOST_SESSION_ID': ME, 'LEAD_GUARD_SESSIONS_DIR': tmp}
bad = 0
for name, (rows, want_block, active) in cases.items():
    p = f'{tmp}/t.jsonl'; open(p, 'w', encoding='utf-8').write('\n'.join(json.dumps(r) for r in rows) + '\n')
    out = subprocess.run(['node', HOOK], input=json.dumps({'transcript_path': p, 'session_id': 't', 'stop_hook_active': active}),
                         capture_output=True, text=True, env=env).stdout
    got = '"block"' in out
    bad += got != want_block
    print('OK ' if got == want_block else 'BAD', name)
print('failures:', bad)
