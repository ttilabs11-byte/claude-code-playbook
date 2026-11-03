# claude-code-playbook

A tested Claude Code setup for people who want finished, verified work from Claude, with fewer tokens and nothing
lost when long sessions are compacted. It installs global rules, four safety, memory and audit hooks, a status line, four
general skills and the settings that make them work. It runs on Windows, macOS and Linux and was built on Claude Code 2.1.316.

## Quick start: let Claude review your setup first

```bash
git clone https://github.com/ttilabs11-byte/claude-code-playbook
```

Open the `claude-code-playbook` folder in Claude Code (terminal: `cd claude-code-playbook` then `claude`; desktop app:
open the folder in the Code tab) and type:

```
/playbook
```

Claude reads your `~/.claude` (locally, read-only), asks up to three questions about how you work, and shows a review:
for each of the 24 components, whether you have it, an older copy, your own version, or nothing; what it does; pros,
cons and cost; and a recommendation for you. You pick per group, see a dry run, say yes, and only your picks are
installed, with backups, then tested. Your own hooks, skills and plugins are never touched. Run `/playbook` again
later to see what changed.

It also checks for 24 popular third-party tools: plugins, skills, MCP servers and CLIs such as RTK, Headroom,
code-review-graph, Graphify, codebase-memory-mcp, superpowers, caveman and claude-mem. For each one it shows whether
you have it, our verdict (use, per need, tried and dropped, or skip), why, and which part of the playbook does the same
job for less context. The playbook never installs them; for the ones worth having it gives you the command.

Just the review, without Claude: `node setup/audit.mjs` (add `--json` for machine-readable output).

## What you get

| Piece | What it does for you |
|---|---|
| Rules (`~/.claude/CLAUDE.md`) | A before/during/after framework for every task: checkable criteria, a named bar, small verified steps, proof by running the real output, a self-check before anything reaches you, honest "unverified" notes. Plus token economy, a learning loop, cleanup, living docs and compaction instructions. |
| `log-guard` (Stop hook) | A turn that made 3+ changes can't end until the session log was updated in that turn. That makes "document every step" automatic, so compaction loses nothing. |
| `lead-guard` (Stop hook) | 2026-11-02: a lead can't end a turn on a note from a session it started or messaged without sending it the next step (`send_message`), archiving it, or writing "No next step for <session>: <reason>". Children are found via `spawnedFrom` in `%APPDATA%/Claude-Work/claude-code-sessions/<acct>/<org>/<id>.json`. Before it, leads moved a child on after 10 of 71 "done" notes and 0 of 7 "waiting" notes. Test: `python claude/scripts/lead-guard.test.py` (10 cases). |
| `session-resume` (SessionStart hook, after compaction) | Puts the session's own log back into context right after a compaction, and says when the log has passed 40 KB. |
| `log-compact.mjs` | Lossless session-log compaction: archives the log verbatim, then lists every path, URL, ID, hash and version the rewritten log dropped, so nothing still in use is lost. |
| `shell-guard` (PreToolUse hook) | Blocks shell commands that touch `.env`, `.env.local` or `~/.ssh`, and asks before `git push`, `gh pr create`, `pip install`, `npm -g` and `winget install`. 2026-11-03: also asks before a recursive delete (`rm -rf`, `Remove-Item -Recurse`, `rd /s`) unless every target is a build or cache folder, and before `git reset --hard`, `git clean -f`, `git checkout .`, force-push, `git branch -D`, `stash drop`, SQL `DROP`/`TRUNCATE`, Docker prunes and disk formatting. On `git commit` it runs `ratchet.mjs` over the diff and asks when the diff lowers the bar. It reads the original command, so tools that rewrite commands can't slip past it. |
| `ratchet.mjs` | Scans a diff's added lines for ways to pass by lowering the bar: new lint/type suppressions (`ts-ignore`, `eslint-disable`, `noqa` ...), skipped or focused tests (`it.skip`, `.only`, `xit`, `pytest.mark.skip`), stubs (`not implemented`, `todo!()`), narrator comments, a deleted test file, fewer assertions, and a coverage or score threshold moved the easy way. `node ratchet.mjs [--staged|--all] [-C repo]`, exit 2 on findings. |
| `edit-boundary` (PreToolUse + UserPromptSubmit hook) | A message line `EDIT-BOUNDARY: <folder>[; <folder>]` fences that session's Edit/Write to those folders until `EDIT-BOUNDARY: off`. For two child sessions working in one repo. `~/.claude`, temp and `session-logs/` stay writable. |
| `config-audit` (ConfigChange hook) | Logs every change to a settings or skill file (which file, when, from which session and folder) to `~/.claude/logs/config-audit.log`, so a change you didn't make leaves a trace. Never blocks. |
| Status line (terminal) | One line under the prompt: context used, whether the prompt cache is warm and for how many more minutes, the session's cache hit rate and why the last miss happened. Tells you when a break will cost a full re-cache. |
| Settings | Concise output style, a 300k auto-compact window, tool search on, deny rules for secret files, ask rules for pushes and installs, transcripts kept 90 days instead of 30, auto-mode defaults. |
| Skills | `grilling` (stress-test a plan), `human-voice` (writing that doesn't read as AI), `gauntlet-loop` (hold work to a named bar with blind critics; you start it with `/gauntlet-loop`, since it runs subagents), `after-restart` (find why the PC or app crashed and resume sessions). |
| Mods (`mods/`, a local plugin marketplace) | `smart-compact`: compacts a context over 200k tokens 55 minutes into an idle gap, before the 1-hour cache goes cold (the desktop app has no idle compaction), and gives the model a `compact_after_turn` tool for finished-task boundaries over 150k. `email-shield`: keeps the account email out of what the model reads and blocks outbound calls that carry it. |
| `cache-report.py` | Prompt-cache hit rate, why the cache was rewritten, and which sessions cost the most. Reads local transcripts only. |
| `reddit.py` | Read Reddit for research: `top`, `search`, `thread` (public Arctic Shift archive; the official API when `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` are set). |

## Install

Needs Claude Code and Node.js 18 or newer. Python 3 is only needed for `cache-report.py`, `reddit.py` and the `human-voice` checks.
The commands below install every default component at once; `/playbook` (above) is the guided way. To pick by hand:
`node install.mjs --only shell-guard,log-guard,skill-grilling` (ids in `setup/catalog.json` or the audit's output),
and `--rules-file <file>` to install a trimmed copy of the rules.

```bash
git clone https://github.com/ttilabs11-byte/claude-code-playbook claude-code-setup
```

```bash
node claude-code-setup/install.mjs --dry-run
```

```bash
node claude-code-setup/install.mjs
```

```bash
node claude-code-setup/tests/run-tests.mjs --installed
```

Options: `--tracker <file>` turns on the one-line project tracker rule, `--force-skills` replaces skills you already
have with the same name, `--no-rtk` skips the RTK hook even if RTK is installed, and `--home <dir>` installs somewhere
other than `~/.claude`.

The installer backs up `CLAUDE.md` and `settings.json` (`*.bak-<time>`) before changing them. It merges into your
settings without removing anything, and keeps its rules between `<!-- claude-code-setup:start/end -->` markers, so
re-running it updates the block and leaves the rest of your file alone. The tests feed known-bad and known-good cases
to every hook and install twice into a throwaway folder; 104 checks, all must pass.

## After installing (by hand, two minutes)

1. Open `~/.claude/CLAUDE.md` and change the opening paragraph to how you like to be worked with. The rules are
   written in the first person ("me", "I'm often away"). Keep what fits you.
2. Add a few lines about your world to `autoMode.environment` in `~/.claude/settings.json` if you use auto mode:
   your organisation, protected branches, production services that need your yes, and trusted local folders. See
   [docs/SETTINGS.md](docs/SETTINGS.md).
3. Desktop app: set the options in [docs/SETTINGS.md](docs/SETTINGS.md#desktop-app). For desktop scheduled tasks,
   set each task's permission mode in its own settings; a task does not follow a folder's `defaultMode`, and an
   unattended run that hits a prompt waits forever.
4. Start each project with a `CLAUDE.md` from [templates/project-CLAUDE.md](templates/project-CLAUDE.md).
5. Optional: keep the setup current with the weekly research task in
   [templates/weekly-research-task.md](templates/weekly-research-task.md).
6. Optional mods: `node install.mjs --only smart-compact` (and `email-shield` if your account email shows up in
   prompts). It adds this repo's `mods/` as the `playbook-mods` marketplace and installs them for your user. Test with
   `claude plugin test mods/smart-compact`.

## What it replaces, and the research behind it

Each part says where it came from and which popular tools it makes unnecessary: the rules cover superpowers'
verification and planning habits, andrej-karpathy-skills and planning-with-files; the Concise style covers caveman
and i-have-adhd; `session-resume` and `log-guard` cover claude-mem and mem0; `shell-guard` covers gstack's `careful`;
`smart-compact` covers what idle-cache tools like optimaizr hold back. The sources behind it are nine logged research
rounds (round 9 alone scanned 4,661 items from Hacker News, GitHub, claude-code issues, arXiv and Reddit, and read 36
in depth), the core files of 27 skill and harness repos, the Claude Code docs and changelog, and our own
prompt-cache data (98.1% hit rate). Full table, with stars, licences and verdicts:
[docs/SOURCES.md](docs/SOURCES.md).

## Will I get the same results?

The behaviour, yes: the rules, hooks, settings and skills here are the whole working method. Two things don't come in
a repo:

- **Memory and project knowledge.** Claude's per-project memory, your project `CLAUDE.md` files and skills for your
  own business are built from your work. The learning loop in the rules builds them for you over time: each
  correction becomes a rule in memory or a skill, so you teach each thing once.
- **Your judgement calls.** The rules tell Claude to decide routine choices itself and stop only for real forks,
  money, publishing, passwords and irreversible deletes. How fast it learns your taste depends on how clearly you
  correct it early on.

[docs/LESSONS.md](docs/LESSONS.md) lists the hard-won lessons behind these rules, so you start with them instead of
learning them the expensive way.

## Layout

```
install.mjs                     installer (merge, backup, idempotent; --only <ids> installs just those)
setup/catalog.json              every component: what it is, pros, cons, cost, default, and the files and settings it owns
setup/audit.mjs                 read-only review of your ~/.claude against the catalog
.claude/skills/playbook/        the /playbook skill: review, choose, dry run, install, verify
specs/                          feature specs (interactive-setup.md)
tests/run-tests.mjs             104 checks: every hook, ratchet, status line, audit and installer, known-bad cases, catalog and sources coverage
claude/CLAUDE.md                global rules
claude/settings.template.json   settings merged into ~/.claude/settings.json
claude/scripts/                 shell-guard, log-guard, lead-guard, session-resume, log-compact, config-audit, statusline, ratchet, edit-boundary (.mjs), cache-report.py, reddit.py
claude/skills/                  after-restart, gauntlet-loop, grilling, human-voice
mods/                           local plugin marketplace: smart-compact, email-shield (each with tests)
docs/SETTINGS.md                every setting and hook, with the reason; desktop app settings
docs/LESSONS.md                 traps that cost real time, as rules
docs/OPTIONAL.md                optional tools (RTK, Headroom, plugins) and what they cost
docs/RESEARCH.md                research rounds: what changed in Claude Code, what we adopted and why
docs/SOURCES.md                 where every part came from, what it replaces, verdicts on 24 third-party tools
docs/METHODS-2026-11-03.md      development methods and harnesses, boiled down to ten small parts of our own
templates/                      project CLAUDE.md, session log, feature spec, glossary, weekly research task prompt
```

## Uninstall

Restore the newest `~/.claude/CLAUDE.md.bak-*` and `~/.claude/settings.json.bak-*`, or delete the marked block and the
hook entries, `statusLine` and `cleanupPeriodDays` by hand. Then delete the playbook's scripts from `~/.claude/scripts`
and its skills from `~/.claude/skills` (`node setup/audit.mjs` lists which are installed), and run
`claude plugin uninstall <id>@playbook-mods` for any mod.

## Licence

MIT, except `claude/skills/gauntlet-loop`, which is adapted from robonuggets/gauntlet-loop (Matt Shumer's technique)
and stays under CC BY 4.0, and `claude/skills/grilling`, copied unchanged from
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT, Copyright (c) 2026 Matt Pocock; see its `LICENSE`).
