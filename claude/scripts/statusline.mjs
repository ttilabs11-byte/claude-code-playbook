// Status line (terminal): context used, whether the prompt cache is warm and for how long, the session's cache hit
// rate and the cause of the last cache miss. Reads the status JSON on stdin, prints one line, never fails.
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(raw) ?? {}; } catch {}
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const used = j.context_window?.used_percentage;
  const parts = [`ctx ${num(used) ? `${Math.round(used)}%` : '?'}`];
  const c = j.prompt_cache;
  if (c && typeof c === 'object') {
    if (c.caching_observed === false) parts.push('cache off');
    else if (c.warm && num(c.expires_at)) parts.push(`cache warm ${c.ttl ?? ''}, ${Math.max(0, Math.ceil((c.expires_at - Date.now() / 1000) / 60))}m left`.replace(' ,', ','));
    else parts.push('cache cold');
    if (num(c.hit_ratio)) parts.push(`hit ${Math.round(c.hit_ratio * 100)}%`);
    const causes = c.last_miss_cause?.causes;
    if (Array.isArray(causes) && causes.length) parts.push(`last miss: ${causes.join('+')}`);
  }
  process.stdout.write(`${parts.join(' | ')}\n`);
});
