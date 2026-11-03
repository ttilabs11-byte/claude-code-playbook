# Settings, hooks and why

Everything `install.mjs` merges into `~/.claude/settings.json`, plus the settings you set by hand in the desktop app.
Checked against Claude Code 2.1.316.

## settings.json

| Key | Value | Why |
|---|---|---|
| `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` | `300000` | 2026-11-02 (was `250000`): compacts at about 268k. Sessions start at ~80k and refill to ~110k after compaction, so 250k left only ~108k of working room; 300k gives ~158k. Every tool call re-sends the whole context, so going higher costs more per call; 400k showed no measured quality gain (the app project study, docs/RESEARCH.md). |
| `skillOverrides` (user) | `user-invocable-only` for skills that belong to one folder (video, SEO, one business) | Skill descriptions load into every session (~9k tokens for ~50 skills). Folder-bound skills set to user-invocable-only stay usable by `/name` anywhere, and are model-invoked only in the folder whose project settings turn them back on. |
| MCP servers used by one project | local scope of that project folder (was user scope) | `claude mcp add-json -s local` + `claude mcp remove -s user`: each MCP server's tool list loads only where it is used. Back up `~/.claude.json` first. |
| `env.ENABLE_TOOL_SEARCH` | `true` | MCP and rarely used tools load on demand instead of sitting in every request. Now the default in current versions; kept so older versions behave the same. |
| `env.CLAUDE_CODE_SUBAGENT_EFFORT` | `medium` | Subagents run at medium effort unless a definition names another. Turns the "subagents at medium" rule into a setting (2.1.316+). |
| `outputStyle` | `Concise` | Answer first, no narration or recap. Only set if you have none. |
| `autoCompactEnabled` | `true` | Compaction happens on its own at the window above instead of the session hitting the limit. |
| `cleanupPeriodDays` | `90` | The default 30 silently deletes transcripts and `/rewind` snapshots, which `/insights`, `cache-report.py` and "check past sessions before asking again" all read. Long transcripts can reach hundreds of MB; lower it if disk is tight. Only set if you have none. |
| `statusLine` | `node ".../scripts/statusline.mjs"` | See [Status line](#status-line). Only set if you have none. |
| `permissions.deny` | `Read(~/.ssh/**)`, `Read(//**/.env)`, `Read(//**/.env.local)` | Claude never reads keys or secret files, in any folder. `//` means an absolute path, so `//**/.env` matches every drive and folder. |
| `permissions.ask` | `git push`, `gh pr create`, `pip install`, `python -m pip install`, `npm install -g`, `winget install`, for both Bash and PowerShell | These publish or install. Even in bypass or auto mode you get asked first. |
| `autoMode.environment` | `["$defaults"]` | Keeps the built-in auto-mode context. Add your own lines after it (below). |

Your existing values win: the installer never overwrites a key you already set, and only adds list entries.

### autoMode.environment

Auto mode lets a classifier approve routine actions. It decides better when it knows your world. Add plain sentences
after `"$defaults"`, for example:

```json
"autoMode": {
  "environment": [
    "$defaults",
    "Organisation: Example Ltd. Trusted repos: github.com/example/*.",
    "Protected branches: main, master. Never push to them without asking.",
    "Production: the Supabase project 'prod' and the live website. Any write there needs my yes.",
    "Trusted local folders: ~/work, ~/projects."
  ]
}
```

### Permission rules that actually match

- Use forward slashes and wildcards: `Bash(python *my-tool*run.py*)`. A rule with Windows backslashes
  (`C:\\tools\\run.py`) does not match the command as it arrives, so the prompt still appears.
- `Read(//**/name)` is absolute from the root; `Read(~/x/**)` is from your home folder.

## Hooks

| Event | Script | What it does | Fails safe how |
|---|---|---|---|
| `PreToolUse` (Bash, PowerShell) | `shell-guard.mjs` | Denies a command whose text touches `.env`, `.env.local` (not `.env.example`) or `~/.ssh`. Asks before `git push` (also `git -C dir push`), `gh pr create`, pip installs, global npm installs and `winget install`. Asks before recursive deletes outside build/cache/temp folders and before destructive git, SQL, Docker and disk commands. On `git commit` it imports `ratchet.mjs` and asks with the first 3 findings. | Bad input or an unknown shape passes through untouched; it never blocks an ordinary command. |
| `Stop` | `log-guard.mjs` | If this turn made 3 or more changes (edits, writes, shell commands, MCP calls whose name says create, update, send, delete, publish and so on) and did not write a `session-logs/*.md` file, it blocks the stop once and tells Claude to log the step. | Blocks at most once per stop (`stop_hook_active`). Scheduled runs are exempt. Reads only the last 4 MB of the transcript. Every block is written to `~/.claude/logs/log-guard.log`. |
| `SessionStart` (matcher `compact`) | `session-resume.mjs` | Right after a compaction, finds the session log this conversation wrote to most and puts its last lines back into context, with its path. | If the transcript names no log, it adds nothing. |
| `ConfigChange` | `config-audit.mjs` | Appends `{time, source, file, cwd, session}` to `~/.claude/logs/config-audit.log` for every change to user, project, local or managed settings, or to a skill file. | Never blocks (always exits 0, writes nothing on bad input). |
| `PreToolUse` (Edit, Write, MultiEdit, NotebookEdit) + `UserPromptSubmit` | `edit-boundary.mjs` | A prompt line `EDIT-BOUNDARY: <folder>[; <folder>]` saves a per-session fence in `~/.claude/state/edit-boundary/<session>.txt`; edits outside it are denied until `EDIT-BOUNDARY: off`. `~/.claude`, temp and `session-logs/` are always allowed. | No fence file, no effect. Bad input passes. |
| `PreToolUse` (Bash) | `rtk hook claude` | Only if RTK is installed: rewrites commands to compress their output. Added after `shell-guard`. | See [OPTIONAL.md](OPTIONAL.md). |

**Why shell-guard repeats the ask rules.** A hook that rewrites commands (RTK) turns `git push origin main` into
`rtk git push origin main`, which no longer matches `Bash(git push *)`, so the ask rule stays silent. Every
`PreToolUse` hook gets the original command, and Claude Code merges their answers to the strictest one (deny, then
ask, then allow), so shell-guard's `ask` holds whatever the hook order. The installer still puts it first, for
readability.

Every open session runs its own ConfigChange hooks, so one edit to `~/.claude/settings.json` writes one line per
open session: a quick count of how many sessions are still running. A hook you just added does not log the edit that
added it.

To change the log-guard threshold, edit `MIN_WORK` at the top of `~/.claude/scripts/log-guard.mjs`.

## Status line

`statusline.mjs` prints one line under the terminal prompt, for example:

```
ctx 42% | cache warm 1h, 10m left | hit 91% | last miss: tools_changed
```

- `ctx`: share of the context window in use (`?` before the first reply).
- `cache warm 1h, 10m left`: the cached prefix and its TTL, and minutes until it goes cold. A reply after that
  re-caches the whole conversation, so a long break is the moment to `/clear` or finish. `cache cold` means the
  last request wrote the cache fresh; `cache off` means no response reported cache tokens.
- `hit`: cache reads as a share of all input this session. Healthy is about 95% and up.
- `last miss`: why the cache was last rebuilt (`tools_changed`, `system_prompt_changed`, `ttl_expired_5m`,
  `likely_server_side` and others). Repeated `tools_changed` points at an MCP server or plugin that connects
  mid-session.

It is a terminal feature; the desktop app may not show it (unchecked). It runs only on your
machine and reads only the JSON Claude Code passes it.

## Compaction

These pieces work together so a long session keeps its quality after compacting, and compacts at the right time:

1. The session log, appended after every step (rule) and enforced by `log-guard` (hook).
2. `# Compact instructions` at the end of `CLAUDE.md`: tells the summariser to keep your last three requests word
   for word, the to-do list with states, decisions with reasons, constraints, exact paths and IDs, and what is
   verified versus not. This section heading is the documented way to steer `/compact` and auto-compaction.
3. `session-resume`: puts the log back right after the summary, and asks for a log compaction once the log passes
   40 KB (about 10k tokens re-read every time a session resumes).
4. `log-compact.mjs`: the log's own compaction. `archive` copies it verbatim to `session-logs/archive/`; the session
   rewrites the live log into current state, pointers, decisions, traps, open items and a one-line-per-milestone
   history; `check` lists every anchor (path, URL, ID, hash, version) the rewrite dropped, and exits 1 until each one
   is restored or judged superseded. Pilot: a 66 KB log became 14 KB (20%) with all live pointers kept.

5. The `smart-compact` mod (`mods/smart-compact`, 2026-11-03): compaction at the right moment, not only at the limit.
   A desktop session's cache lives 1 hour; a message after a longer gap rewrites the whole context (14 days on this
   PC: 606 such cold wakes, 133M tokens, 39.5% of all cache writes, about 220k per wake). 55 minutes after the main
   loop's last turn, over 200k tokens, the mod compacts while the cache is warm, so the next wake rewrites about
   110k instead. The CLI has this built in; desktop sessions don't (anthropics/claude-code#103040). It also
   registers a deferred tool, `compact_after_turn`, that the model calls at a finished task's boundary (rule in
   CLAUDE.md, over 150k). Why not lower: a session restarts at about 80k and is back near 110k after a compaction,
   so compacting below that saves little. Tunable with `SMART_COMPACT_IDLE_MIN`, `SMART_COMPACT_MIN_TOKENS`,
   `SMART_COMPACT_TOOL_MIN_TOKENS`; each decision is logged to `~/.claude/logs/smart-compact.log`.

A `PreCompact` hook can only block compaction, not add to it, so it is not used.

## Desktop app

Set these in the app's own settings (Code tab). They are per account and per machine, so the installer can't set
them.

| Setting | Value | Why |
|---|---|---|
| Output style | Concise | Same as `outputStyle` above; the app keeps its own default for new sessions. |
| Keep computer awake | On | Long renders, builds and scheduled runs don't stop when the screen sleeps. |
| Auto-archive | Off | Finished sessions stay in the sidebar until you archive them, so nothing disappears mid-review. |
| Notifications | Banners | You hear when a session needs you or finishes. |
| Default permission mode | Default (ask) | Choose bypass or auto per session when you trust the task, not for everything. |

### Scheduled tasks

- **Desktop (local) scheduled tasks** run on your computer with your files. Each has its own permission mode in its
  settings; a run does **not** use the folder's `defaultMode`. An unattended run that hits a permission prompt waits
  forever, and a stuck run blocks the next ones. Set the task to the mode it needs (and add narrow `allow` rules to
  that folder's `.claude/settings.local.json`). After creating a task, click **Run now** once and choose "always
  allow" on each prompt; later runs reuse those approvals (listed under **Always allowed** on the task's page).
- A task created by asking Claude in a session is saved in that session's permission mode. From a bypass session it
  runs in bypass, unreviewed. For a task that reads the web, switch it to Auto in its Edit form.
- Desktop tasks run only while the app is open and the PC awake. A missed run is caught up once on wake (only the
  latest missed time within 7 days), so write prompts that still make sense when they start late.
- **Cloud scheduled tasks** (formerly routines; `/schedule`, claude.ai/code/routines) run on Anthropic's servers with
  a fresh clone of the repo, start in auto mode, push only to `claude/` branches unless told otherwise, and act as you
  on GitHub and every connector included. Remove connectors the task doesn't need.
- To clear a stuck run, stop the session first, then archive it.
- `log-guard` skips scheduled runs, so a routine never hangs on a logging block.
