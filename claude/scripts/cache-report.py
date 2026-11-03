"""Prompt-cache report for all Claude Code sessions on this computer.

Reads ~/.claude/projects/*/*.jsonl (no network, no model calls) and prints a markdown report:
hit rate, weighted spend shares, why the cache was rewritten, and which sessions cost the most.

Usage: python -I cache-report.py [--days 7] [--out report.md]
Weights (x base input price): uncached input 1, cache read 0.1, cache write 1.25 (5m) or 2 (1h), output 5.
"""
import argparse, collections as C, datetime as dt, glob, json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser()
ap.add_argument("--days", type=int, default=7)
ap.add_argument("--out")
a = ap.parse_args()

now = dt.datetime.now(dt.timezone.utc)
cut = now - dt.timedelta(days=a.days)
tot = C.Counter()
cause_tok, cause_n = C.Counter(), C.Counter()
sess = {}  # session id -> stats

def cause_of(prev, ts, compacted):
    if prev is None: return "first call (new or resumed session)"
    if compacted: return "after compaction"
    gap = (ts - prev).total_seconds() / 60
    if gap > 60: return "woken after >1 h idle (cache expired)"
    if gap > 5: return "gap 5-60 min"
    return "mid-session change (prefix broke)"

for f in glob.glob(os.path.expanduser("~/.claude/projects/*/*.jsonl")):
    if os.path.getmtime(f) < cut.timestamp(): continue
    sid = os.path.basename(f)[:-6]
    s = {"title": "", "cwd": "", "cost": 0.0, "calls": 0, "wakes": 0, "wake_tok": 0, "peak": 0}
    seen, prev, compacted = set(), None, False
    for line in open(f, encoding="utf-8", errors="ignore"):
        try: d = json.loads(line)
        except ValueError: continue
        t = d.get("type")
        if t == "custom-title": s["title"] = d.get("customTitle", "")
        if d.get("cwd"): s["cwd"] = d["cwd"]
        if d.get("isCompactSummary"): compacted = True
        if t != "assistant": continue
        m = d.get("message", {}); u = m.get("usage") or {}
        key = (m.get("id"), d.get("requestId"))
        if key in seen: continue
        seen.add(key)
        try: ts = dt.datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00"))
        except (KeyError, ValueError): continue
        if ts < cut: continue
        for it in u.get("iterations") or [u]:
            r = it.get("cache_read_input_tokens") or 0
            w = it.get("cache_creation_input_tokens") or 0
            i = it.get("input_tokens") or 0
            o = it.get("output_tokens") or 0
            cc = it.get("cache_creation") or {}
            w1h = cc.get("ephemeral_1h_input_tokens") or 0
            w5m = w - w1h
            cost = i + 0.1 * r + 2 * w1h + 1.25 * w5m + 5 * o
            tot["read"] += r; tot["write"] += w; tot["in"] += i; tot["out"] += o; tot["w1h"] += w1h
            tot["c_read"] += 0.1 * r; tot["c_write"] += 2 * w1h + 1.25 * w5m; tot["c_in"] += i; tot["c_out"] += 5 * o
            tot["calls"] += 1
            s["cost"] += cost; s["calls"] += 1
            ctx = r + w + i
            s["peak"] = max(s["peak"], ctx)
            if ctx > 20000 and w > 0.3 * ctx:
                c = cause_of(prev, ts, compacted)
                cause_tok[c] += w; cause_n[c] += 1
                if c.startswith("woken"): s["wakes"] += 1; s["wake_tok"] += w
            if ctx: prev, compacted = ts, False
    if s["calls"]: sess[sid] = s

if not tot["calls"]:
    print(f"No API calls in the last {a.days} days."); sys.exit()
inp = tot["read"] + tot["write"] + tot["in"]
cost = tot["c_read"] + tot["c_write"] + tot["c_in"] + tot["c_out"]
pct = lambda x, y: f"{100 * x / y:.1f}%"
name = lambda sid, s: (s["title"] or os.path.basename(s["cwd"].rstrip("\\/")) or "?")[:55] + f" ({sid[:8]})"

L = [f"# Prompt-cache report, {now:%Y-%m-%d} (last {a.days} days)", "",
     f"- API calls: {tot['calls']:,} in {len(sess)} sessions",
     f"- Cache hit rate: **{pct(tot['read'], inp)}** of input tokens "
     f"(1 h TTL on {pct(tot['w1h'], tot['write'] or 1)} of writes)",
     f"- Weighted spend: cache reads {pct(tot['c_read'], cost)}, cache writes {pct(tot['c_write'], cost)}, "
     f"output {pct(tot['c_out'], cost)}, uncached input {pct(tot['c_in'], cost)}", "",
     "## Why the cache was rewritten", "", "| Cause | Times | Tokens written | Share of all writes |", "|---|---:|---:|---:|"]
for c, n in cause_tok.most_common():
    L.append(f"| {c} | {cause_n[c]} | {n / 1e6:.1f}M | {pct(n, tot['write'])} |")
rest = tot["write"] - sum(cause_tok.values())
L.append(f"| normal growth (new turns) | - | {rest / 1e6:.1f}M | {pct(rest, tot['write'])} |")

L += ["", "## Costliest sessions", "", "| Session | Share of spend | Calls | Peak context | Expensive wake-ups |", "|---|---:|---:|---:|---:|"]
for sid, s in sorted(sess.items(), key=lambda kv: -kv[1]["cost"])[:12]:
    L.append(f"| {name(sid, s)} | {pct(s['cost'], cost)} | {s['calls']:,} | {s['peak'] // 1000}k | {s['wakes']} |")

woken = sorted(((s["wake_tok"], sid, s) for sid, s in sess.items() if s["wakes"]), reverse=True)[:8]
if woken:
    L += ["", "## Sessions most often woken cold (each wake rewrites the whole context at 2x)", ""]
    L += [f"- {name(sid, s)}: {s['wakes']} wakes, {w / 1e6:.1f}M tokens rewritten" for w, sid, s in woken]

L += ["", "Fixes: `/compact` before leaving a big session idle for more than an hour; don't wake idle sessions for status checks; "
      "choose the model and fast mode at the start; use `/rewind` to drop a dead end; check one session with `/usage`."]
out = "\n".join(L)
print(out)
if a.out:
    open(a.out, "w", encoding="utf-8").write(out + "\n")
