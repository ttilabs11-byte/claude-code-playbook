# Lessons

Traps that each cost real time, written as rules with the reason. The rules in `CLAUDE.md` already act on most of
them; this is the why, so you can judge new cases.

## Hooks and permissions

- **A command-rewriting hook defeats your ask rules.** RTK rewrites `git push origin main` to
  `rtk git push origin main`, and `Bash(git push *)` no longer matches the new text, so the ask never fires. Guard
  with a hook that reads the original command and returns `ask` itself. (`shell-guard.mjs` does this.) Parallel
  `PreToolUse` hooks merge to the strictest answer (deny, then ask, then allow), so the guard wins whatever its order.
- **A project's settings can switch off your hooks.** `disableAllHooks: true` in a repo's `.claude/settings.json`
  overrides your user settings, guards included; only managed-settings hooks survive. Read a cloned repo's
  `.claude/settings*.json` before you trust the folder.
- **Guards match text, not intent.** A guard that blocks `.env` also blocks a harmless `grep` whose pattern contains
  that word, and a commit message that mentions it. Say "env file" in prose and commands; never weaken the guard to
  get past it.
- **`Read(//**/.env)` is the absolute form.** `//` starts at the filesystem root; a single `/` is relative to the
  settings file's folder.
- **`autoMode` works only in `~/.claude/settings.json`** (or managed settings). In a project's `.claude/settings*.json`
  it is ignored, so a cloned repo can't loosen your classifier; it also means your entries there do nothing.
- **No backslash paths in permission rules.** They never match on Windows; use wildcards with forward slashes.
- **Prove a guard can fail.** Feed it a known-bad case and see it block before trusting a pass. A guard that never
  fires looks exactly like a guard that works.

## Scheduled tasks

- **A desktop (local) scheduled task runs in its own stored permission mode**, not the folder's `defaultMode`.
  Unattended, one prompt hangs it forever, and later runs queue behind it. Set the mode per task; give it narrow allow
  rules. Cloud scheduled tasks start in auto mode instead, and pause for you after 3 blocks in a row or 20 in a run.
- **A scheduled prompt is not your approval.** The saved prompt is the task, but Claude treats it as stored text, not
  live consent, so anything that needs your yes (publishing, sending, money) still stops and waits.
- **Stop a stuck run before archiving it**; archive alone fails on a running session.
- **Exempt routines from interactive hooks** (like a Stop hook that blocks), or they can loop with nobody to answer.

## Compaction and continuity

- **Write it down as you go, not at the end.** Anything only in the conversation can vanish at compaction. A session
  log appended after every step, plus `# Compact instructions`, plus a hook that puts the log back, keeps quality
  level after a compact.
- **`PreCompact` can't add context**; it can only block. Use `SessionStart` with matcher `compact` to re-inject.
- **Put a skill's key instructions at the top of `SKILL.md`.** After compaction each invoked skill comes back cut to
  its first 5,000 tokens (25,000 for all skills together, oldest dropped first).
- **Rules with `paths:` don't survive compaction**; they reload only when a matching file is touched again. A rule
  that must always hold goes in `CLAUDE.md` or a hook.
- **Editing `CLAUDE.md` mid-session does nothing until `/clear`, `/compact` or a restart.** Test a rule change in a
  fresh session.
- **Read transcript tails, not whole transcripts.** Session transcripts grow to hundreds of MB; read the last few MB.
  Check you have the right transcript by its creation time and content before drawing conclusions from it.

## Tokens and cost

- **Context is the cost.** Every tool call re-sends the whole conversation. Fewer, batched calls and a smaller context
  save far more than shorter replies. Do mechanical loops in one script.
- **Images stay in context until compaction.** Check text and layout through text or DOM reads; view crops or small
  screenshots; don't reopen an image you've seen.
- **Personal skills and long rules load into every session.** Keep `~/.claude/skills` for skills you use everywhere;
  put project and coding skills in the project's `.claude/skills/`.
- **Subagents multiply cost.** Each one re-reads its own context; a fan-out of judges or "trimming passes" can cost
  more than the work. Default to doing the work yourself; use subagents only for parallel work whose context can be
  thrown away.
- **Give web fetches a narrow question**, so the page summary that comes back is short.
- **Anything that changes the model or tool list mid-session rewrites the whole cache**: `/model`, effort (except on
  the 5.5 models and Fable 5.1), fast mode, adding an MCP server or plugin with MCP tools, and a skill whose
  frontmatter names a `model`. Choose these at the start; leave `model:` out of skills you use mid-task.
- **`/rewind` beats `/compact` for a dead end.** Rewinding returns to a prefix that is already cached; compacting
  builds a new one and is itself a large request. `/clear` costs nothing. In `/rewind`, **Summarize up to here**
  compresses old history but keeps recent messages word for word.
- **`/rewind` restores only files Claude edited with its edit tools.** Files changed only by shell commands or by
  subagents stay changed. Commit before risky work; git is the real undo.
- **Idle sessions still spend.** Session-scoped `/loop` tasks, messages from other sessions, goal check-ins and
  prompt suggestions each start a request that re-sends the whole context. Close or clear sessions you're done with.
- **Too many skills hide the useful ones.** The skill listing gets 1% of the context window. Past that, the
  least-used skills lose their descriptions and Claude stops picking them on its own. Turn off plugins you aren't
  using rather than raising the cap.
- **Transcripts are deleted after 30 days by default** (`cleanupPeriodDays`), silently, along with `/rewind`
  snapshots. Anything worth keeping goes in a session log, memory or the repo.
- **One settings edit wakes every open session.** Each running session reloads `~/.claude/settings.json` and runs
  its own hooks for the change; we counted 10 open sessions from one write. Close finished sessions.
- **One topic per session.** A session that wanders carries every old topic's context into every new call.
- **A failing command shows only its head and tail.** Past about 10,000 characters a failed result is cut to an
  excerpt with no file to read the rest. For long builds or tests, write the output to a file and grep it for errors.
- **Every subagent pays for your whole `CLAUDE.md`.** Each one starts with the full `CLAUDE.md` hierarchy (not your
  output style or memory), so a long global file is paid again per subagent. Keep it lean; restate a rule in the
  delegation prompt if the subagent must follow it.
- **Compact or finish before a long break.** After the cache TTL (5 minutes or 1 hour) the next request re-sends the
  whole conversation uncached. Past about 200K tokens on the one-hour cache, Claude Code compacts an idle session
  itself just before expiry; below that, `/compact` or `/clear` while it's still warm. The status line shows the
  minutes left.
- **Put a skill's hard rules at the top.** After compaction an invoked skill comes back cut to its first 5,000 tokens
  (25,000 across all skills, oldest dropped). Rules buried lower in a long skill are lost until it's invoked again.
- **Re-read files after compaction.** Only the five most recently modified files come back, and any over 5,000
  tokens returns as a path only.
- **`/goal` conditions must be visible in the chat.** Its evaluator is a small model that reads the conversation and
  runs no tools. Write "the test run prints 0 failed", not "the code works".
- **Searching a huge folder times out.** Narrow the path or the file type before grepping.

## Windows

- **Blank-window app crashes usually mean commit memory ran out** (RAM plus pagefile). Check the System log for event
  2004 (resource exhaustion), 41 or 6008 (unexpected shutdown), 1074 (planned restart). Headless-browser renders are
  the usual cause: at most 2 workers, one reused browser, one render at a time.
- **`node -e` inside PowerShell loses backslashes and escaped quotes.** Write a small script file instead.
- **Stopping a background task may leave a shell loop running** on Windows. Have loops check a stop file, or find the
  child process you started by its command line.
- **Never kill a process you didn't start.** Identify yours by command line and start time.

## Working method

- **Show options before long work** on a new look or direction: 2 to 4 labelled samples, then wait for a pick. Ordinary
  choices: decide and keep moving.
- **Never judge quality from a downscale.** Check the details (hands, edges, small text) in full-size crops.
- **Removing a tool means removing every rule that names it.** Grep `CLAUDE.md` files, memory and skills in the same
  step, or sessions keep trying to use what's gone.
- **New quality gates start as warnings** that print a count and the first few hits, so a noisy gate doesn't block
  real work on day one.
- **Emphasis doesn't make a rule stick.** IMPORTANT or capitals make current models over-apply a rule. If a line keeps
  getting missed, the file is too long or the rule belongs in a hook or deny rule.
- **Re-check the scaffolding on each new model.** Rules and hooks written around an old model's weakness cost tokens
  forever. Remove one piece at a time and see whether results change; keep only what's load-bearing.
- **Check the fact at its source** (version, path, number, quote) before it goes into a deliverable. Memory and old
  notes go stale.

## Video and motion (if you make animation with Claude)

- One easing curve per camera move, and never have the camera track a moving figure; both read as jitter.
- Review every frame, not samples: the bad frame is always the one you skipped.
- Simulated cloth or hair must be baked after the rig moves, or it floats off the body.
- No primitive stand-ins in finals (a sphere for a knuckle reads as a drop of liquid). Check scale and misreads.
- Run at most two final renders at once, with a watchdog that kills a render that has gone silent.
