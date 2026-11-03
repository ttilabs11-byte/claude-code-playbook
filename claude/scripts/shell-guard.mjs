// PreToolUse guard for Bash|PowerShell. Sees the original command, so RTK's rewrite
// (git push -> rtk git push, cat -> rtk read) cannot slip past the permission rules.
// Denies secrets; asks before installs, pushes, destructive commands, and a `git commit` whose diff trips ratchet.mjs.
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', async () => {
  let cmd = '', cwd = '.';
  try { const j = JSON.parse(raw); cmd = String(j.tool_input?.command ?? ''); cwd = j.cwd || '.'; } catch { return; }

  const SECRET = [
    /(^|[\s"'`\/\\=<>:(])\.env(\.local)?(?=$|[\s"'`|;&)<>,])/,   // .env, .env.local; not .env.example
    /(^|[\s"'`\/\\=~])\.ssh(?=$|[\/\\\s"'`])/,
  ];
  const ASK = [
    [/\bgit(\.exe)?(\s+(-C|-c)\s+\S+|\s+--?[\w-]+(=\S+)?)*\s+push\b/, 'git push'],
    [/\bgh(\.exe)?\s+pr\s+create\b/, 'gh pr create'],
    [/\b(pip3?(\.exe)?|(python[\d.]*|py)(\.exe)?\s+-m\s+pip)\s+install\b/, 'pip install'],
    [/\bnpm(\.cmd)?\s+(install|i|add)\b[^|;&\n]*\s(-g|--global)\b/, 'npm install -g'],
    [/\bwinget(\.exe)?\s+install\b/, 'winget install'],
  ];
  // Destructive: recursive deletes (bash, PowerShell incl. aliases and -r prefixes, cmd), history/work-tree loss, data loss.
  const RM = /(?:^|[\s;&|(`'"])(rm|Remove-Item|ri|del|erase|rd|rmdir)(?:\.exe)?\s+([^|;&\n]*)/gi;
  const isRecursive = (rest) => rest.split(/\s+/).some(t => {
    const w = t.slice(1).toLowerCase();
    if (t === '--recursive' || /^\/s$/i.test(t)) return true;
    if (!/^-[a-zA-Z]+$/.test(t) || 'force'.startsWith(w)) return false;                // -Force/-force is not recursive
    return /^-[A-Z][a-z]+$/.test(t) ? 'recurse'.startsWith(w) : /r/i.test(w);          // -Recurse prefixes; -r -rf -fr -R
  });
  const SAFE = /^(["']?)(\.\/)?((.*[\/\\])?(node_modules|dist|build|out|\.next|\.turbo|\.parcel-cache|__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|\.cache|coverage|\.venv|tmp|temp)[\/\\]?|.*[\/\\](Temp|tmp|scratchpad)[\/\\].*|\$env:TEMP.*|\$TMPDIR.*|\/tmp\/.*)\1$/i;
  const DESTRUCTIVE = [
    [/\bgit(\s+-C\s+\S+)?\s+reset\s+[^|;&\n]*--hard\b/, 'git reset --hard'],
    [/\bgit(\s+-C\s+\S+)?\s+clean\s+[^|;&\n]*-[a-zA-Z]*f/, 'git clean -f'],
    [/\bgit(\s+-C\s+\S+)?\s+(checkout|restore)\s+(--\s+)?\.(?=\s|$)/, 'git checkout/restore .'],
    [/\bgit(\s+-C\s+\S+)?\s+push\b[^|;&\n]*(\s--force(-with-lease)?\b|\s-f\b|\s\+\S)/, 'git push --force'],
    [/\bgit(\s+-C\s+\S+)?\s+branch\s+[^|;&\n]*-D\b/, 'git branch -D'],
    [/\bgit(\s+-C\s+\S+)?\s+stash\s+(drop|clear)\b/, 'git stash drop/clear'],
    [/\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+(TABLE\s+)?\w)/i, 'SQL DROP/TRUNCATE'],
    [/\bdocker(\.exe)?\s+(system\s+prune|volume\s+(rm|prune)|rm\s+[^|;&\n]*-f\b)/i, 'docker prune/rm -f'],
    [/\b(Format-Volume|diskpart|Clear-Disk)\b/i, 'disk format'],
  ];

  const out = (decision, reason) =>
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
    }));

  if (SECRET.some(r => r.test(cmd))) return out('deny', 'shell-guard: command touches .env/.env.local or ~/.ssh');
  for (const m of cmd.matchAll(RM)) {
    const rest = m[2];
    if (!isRecursive(rest)) continue;
    const targets = rest.split(/\s+/).filter(t => t && !/^(-|\/[a-z]$)/i.test(t));
    if (!targets.length || !targets.every(t => SAFE.test(t))) return out('ask', `shell-guard: recursive delete (${m[1]}) needs your yes`);
  }
  const bad = DESTRUCTIVE.find(([r]) => r.test(cmd));
  if (bad) return out('ask', `shell-guard: ${bad[1]} needs your yes`);
  const hit = ASK.find(([r]) => r.test(cmd));
  if (hit) return out('ask', `shell-guard: ${hit[1]} needs your yes`);

  const commit = cmd.match(/\bgit(?:\.exe)?((?:\s+-C\s+("[^"]+"|'[^']+'|\S+))?)\s+commit\b([^|;&\n]*)/);
  if (commit && !/--dry-run/.test(commit[3])) {
    try {
      const { scan, gitDiff } = await import(new URL('./ratchet.mjs', import.meta.url));
      const repo = commit[2] ? commit[2].replace(/^["']|["']$/g, '') : cwd;
      const found = scan(gitDiff(repo, /(^|\s)(-a|--all|-am)\b/.test(commit[3])));
      if (found.length) return out('ask', `shell-guard: ratchet found ${found.length} bar-lowering change(s): ${found.slice(0, 3).join(' | ')}`);
    } catch { /* ratchet missing or git failed: never block on our own error */ }
  }
});
