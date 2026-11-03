# smart-compact

Compacts a big conversation while its prompt cache is still warm, instead of only when the window fills.

- **Idle:** 55 minutes after the main loop's last turn (just inside the cache's 1-hour life), if context is at least
  200k tokens, it calls `$.session.compact` with the CLAUDE.md "Compact instructions". The next message then rewrites
  about 110k tokens of cache instead of 220k+. A new prompt cancels the timer. The CLI has idle compaction built in;
  desktop Code-tab sessions don't (anthropics/claude-code#103040), which is why this exists.
- **Task boundary:** a deferred tool, `mcp__smart-compact__compact_after_turn`. The model calls it when a task is
  finished and verified, the session log is current, and the next work is unrelated. Over 150k tokens it queues a
  compaction for 2 seconds after the turn ends; under that it answers "Not queued".

Settings (environment variables): `SMART_COMPACT_IDLE_MIN` (55), `SMART_COMPACT_MIN_TOKENS` (200000),
`SMART_COMPACT_TOOL_MIN_TOKENS` (150000). Every decision is logged to `~/.claude/logs/smart-compact.log`.
Tests: `claude plugin test smart-compact` (5 tests).
