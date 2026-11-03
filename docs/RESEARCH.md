# Research log

What we checked, what it means for this setup, and what we did about it. Newest round first. Each round names its
sources so the next one can start where it stopped.

## Round 9 (2026-11-02, Claude Code 2.1.316, desktop app 3.6556.2)

Follow-up the same day: [REVIEW-2026-11-02.md](REVIEW-2026-11-02.md), an introspective review of the setup and a verdict on 28 named repos, the bookmarks, the playlist and top-starred skill repos. Correction: `ponytail@synced` is disabled, not enabled.
Then [METHODS-2026-11-03.md](METHODS-2026-11-03.md): the essence of the named tools, development methods (spec-driven, TDD, ratchet, DDD, ADR, Shape Up) and the big harnesses, as 10 ranked token-cheap versions of our own; #1 is fresh-run routing against cold wakes.

Sources: one scripted harvest of **4,661 items**: HN Algolia 704 (26 queries, since 2026-07-01, points>15), GitHub
repos 1,776 (20 queries, pushed after 2026-08-01, stars>40), `anthropics/claude-code` issues 484 (most-reacted
since 2026-08), arXiv 537 (10 queries, since 2026-03), Reddit 1,160 (6 subs top-45-days plus 18 searches, via
`reddit.py`), plus the changelog. 3,003 passed a relevance filter, about 220 were reviewed by title and metadata in a
ranked digest, and **36 were read in full or in part**. Nobody can honestly read 1,000+ in depth; the scan is wide and
the reading is narrow. Our own data: desktop session index (208 sessions, 110 not archived), `settings.json` (8 hooks,
19 plugins), 24 routines, and instruction files (global CLAUDE.md 14.9 KB, project 2.0 KB, MEMORY.md 7.9 KB).

### Confirms

- Still no Claude Code release after 2.1.316.
- The backdoored "Claude Code for VS Code" 2.1.312/2.1.313 on the Cursor marketplace (Phorion, 2026-10-30): rechecked,
  and there is still no Claude extension in `.vscode` or `.cursor`.
- Systima (HN 706): Claude Code sends about 33k tokens before the first prompt; a 72 KB CLAUDE.md adds about 20k more
  per request, and 5 MCP servers add 5-7k. Our instruction files total 24.8 KB, so we are well under that. Fanning
  out to 2 subagents cost 4.2× the tokens (121k to 513k), which backs the cap of 2.
- Chief of Staff pattern (asyncdot, 2026-09-19): one session coordinates and verifies, others execute, and every
  report is treated as evidence and re-run. That is our lead rule. It adds two things we don't have yet: a durable
  board, and durable channels for notes (rows 1 and 6 below).

### Proposed (not applied; each needs a yes)

Ranked by gain for effort.

| # | Change | Evidence | Gain | Risk / effort | Where |
|---|---|---|---|---|---|
| 1 | **Session board** (`board.py`): one table of every live session (title, folder, idle time, waiting on you, parent lead, last `postTurnSummary`), read from the desktop index with no model calls | Index fields `lastActivityAt`, `interruptedAwaitingPerson`, `postTurnSummary`, `spawnedFrom`, `isArchived` (read 2026-11-02); Chief of Staff "state in a durable store"; issue #94620 asks for the same thing | Status checks stop waking sessions (a session idle >1 h pays a full cache rewrite at 2×); one view for you and the leads | None (read-only); ~1 h | `~/.claude/scripts/board.py`, named in the Orchestrator rule |
| 2 | **Stuck-session watchdog**: the same scan every 15 min flags sessions with `interruptedAwaitingPerson` (scheduled runs most of all) and raises a Windows toast | The Expo routine sat on a permission prompt from 2026-10-31 to 2026-11-02 and skipped 2 runs; memory "Routine permission mode" | Hung routines caught within 15 min instead of days | Low: a Task Scheduler job (no model); ~1 h on top of #1 | `board.py --watch` plus a Task Scheduler entry |
| 3 | **Measure cold returns, then act**: add a "cold returns" line to `cache-report.py` (turns after >60 min idle × context size) | Issue #103040: idle compaction does not run in desktop Code-tab sessions; one user had 841 cold returns in 30 days, re-caching 295M tokens at the 1 h write price (2× input, ~40× a warm turn) | If ours looks similar, the biggest lever left: `/compact` before long breaks, or archive instead of leaving 300k sessions idle | None to measure; ~30 min | `cache-report.py`; the result goes in LESSONS |
| 4 | **Destructive-command guard** in `shell-guard.mjs`: ask before recursive deletes outside temp/scratch folders, `git reset --hard`, `git clean -fdx`, `format`, and deletes at drive or profile roots | We run in bypass mode, so nothing else stops these; Dicklesworthstone/destructive_command_guard (6.2k★) does the same in Rust; cleanup work is starting now | Turns a one-keystroke disaster into a prompt | Low (ask, not block); ~45 min, with tests proving each pattern fires | `~/.claude/scripts/shell-guard.mjs` plus a test file |
| 5 | **Archive sweep**: archive sessions idle more than 7 days with no running children, listed by #1 | 110 sessions not archived; Reddit 1wlgfpw: one session messaged 6 idle peers and each paid a cold cache rewrite; archiving can be undone (`unarchive_session`) | Fewer sessions that a stray broadcast can wake; a cleaner sidebar | Low; your yes on the list first | One-off, then monthly in the Saturday tool scout |
| 6 | **Durable channel for progress notes**: children write progress-only notes to their session log or board line; `send_message` is reserved for done, blocked and waiting | Chief of Staff "write to durable channels"; cross-session docs: messages can be held or delayed; cache arithmetic as in #1 | Fewer lead wake-ups per child task | One sentence in the Session notes rule | Global CLAUDE.md |
| 7 | **Mutation check as the "prove it can fail" gate** wherever a project has tests (for example a Stryker `npm run mutate` script) | Claude Code team (claude.dev, 2026-10-15): reverts fell more than 40% while merged PRs doubled, through layered automated checks and fast undo | Catches tests that pass while checking nothing | Per-project scripts; skill text only | Code map / Verification lines in the dev skills |
| 8 | **Monthly `/usage` + `f`** (carried over from round 8) | Issue #105125: Opus 5.5 limits draining up to 5× faster for some users since late Oct; the `/usage` panel ranks causes ("Stop sessions you no longer need", "Run fewer at once") | Early warning on plan burn | `f` can run `/effort` commands | Habit; `docs/SETTINGS.md` |
| 9 | **Cloud sessions for routines that need no local files or browser** | Cloud sessions left preview on 2026-09-23 and run on the subscription (Anthropic staff reply in Reddit 1wojd4c) | Unaffected by PC crashes and desktop permission prompts | Most of our 24 routines need D: files or Brave, so the fit is small; check each routine | Routine-by-routine review |
| 10 | **Keep-warm only for leads, and only if #3 shows it pays**: cache-tax mod (karanb192/claude-code-mods) pings after 50 idle min | Reddit 1wj108u: a 330k cold recap cost $6.28 in cache writes at API prices | A ping is a cache read (0.1×); a cold return is a 2× write | Pings cost tokens even if you never return; needs `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` | Decide after #3 |

### Tool scout

| Name | Stars | Verdict |
|---|---|---|
| mksglu/context-mode | 33k | Skip: sandboxes tool output, the same job RTK and Headroom already do |
| JuliusBrussee/caveman | 117k | Skip: terse-output skill plus proxy; the Concise style already does this without a proxy |
| thedotmack/claude-mem, Gentleman-Programming/engram | 110k / 7.7k | Skip for now: they capture everything into a store. Our memory is curated and small (7.9 KB index), so it doesn't fail the way flat memory fails at scale. Revisit if MEMORY.md passes ~25 KB |
| kenn-io/agentsview, getagentseal/codeburn | 6.3k / 11.7k | Skip: overlap `cache-report.py`; read their cold-return metric for #3 |
| rbartoli/agent-usage-guard | Show HN | Skip: holds subagent fan-out, which the cap of 2 already covers |
| NanoNets/Graft (now trail-code) | — | Skip: a code map with npm install; our app repo already has its own `pnpm map` |
| OrchestratorInc/agent-orchestrator, builderz-labs/mission-control | 14k / 6.4k | Skip: fleet dashboards for git/PR flows; #1 does the part we need with no install |

### Worth knowing, not adopted

- **Sonnet 5.5 cache reads cost 50% less**, and Haiku 5.5 is out (Reddit 1x04oqq, 2026-10-07). Subagent model stays
  Opus 5.5 medium by your rule.
- **Wrap-up allowance** (support article 17040437): at the 5-hour limit Claude Code may finish the current step
  using a small capped extra.
- **Effort A/B test**: server-side shrinking of the effort scale on Fable 5 sessions, 2.1.236+ (X @argofowl,
  2026-08-22). We use Opus 5.5.
- `claude --worktree --tmux` makes a worktree plus a tmux session in one flag (terminal only; no tmux on native Windows).
- "Verification loop 4× DeepSeek" (HN, 2026-07-07): a vendor post with thin evidence; ignored.
- arXiv this round (memory consolidation, "Less Context, Better Agents", "The Context Fails First") restates what we
  already apply: curated memory and small, fresh context. Nothing new to adopt.

### Next round: start here

- Changelog after 2.1.316.
- Results of #3 (cold returns) decide #10 and whether to add a "compact before you step away" rule.
- TokenEconomizer verdict 2026-11-08.

## Round 8 (2026-11-02, Claude Code 2.1.316)

Sources: changelog (newest entry still 2.1.316, no new release since round 7); docs pages Prompt caching, Costs,
Checkpointing, Settings reference (first 200k characters; `idleCompaction` entry itself not reached); anthropic.com
engineering (newest post 2026-10-13, source control, not Claude Code setup) and claude.com blog (newest 2026-10-28,
enterprise and industry posts only); GitHub search API (5 queries, pushed after 2026-10-19); official marketplace
(315 plugins, 0 new since 2026-11-01); r/ClaudeCode and r/ClaudeAI top and search (7 days); HN Algolia (points>30, since
2026-10-25); support article "How Claude marks AI-generated content"; gist flamerix-ai/c3905705 (background agent
summaries).

### Confirms

- Nothing in the changelog since 2.1.316. Everything on the start-here list (`idleCompaction`, prompt-cache TTLs,
  skill-listing settings, `crossSessionInbound`, prompt suggestions) was already judged in rounds 3-7.
- TTL buckets: on a subscription within plan usage the main conversation gets 1 h; subagents, workflows, compaction
  and titles get 5 min (`subagentPromptCacheTtl` / `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` change that). Over the plan
  limit, on usage credits, the main conversation drops to 5 min. `FORCE_PROMPT_CACHING_5M=1` beats every other control.
- Changing effort mid-session keeps the cache on Opus 5.5 / Sonnet 5.5 / Haiku 5.5 / Fable 5.1 with a subscription
  (since 2.1.260), as `LESSONS.md` already says.

### Proposed (not applied)

| Change | Why | Risk | Where |
|---|---|---|---|
| Lesson: text Claude writes carries an invisible watermark | Support article: text watermarks are applied at the model level across the API, Claude, Claude Code, Cowork and Claude Tag; older models are being added (Reddit post with 5.5k points dates the extension to 2026-11-03; not on the support page). Detection is a private preview for selected organisations, with no opt-out and no public text checker. Matters for posts and client text drafted with Claude. | None (a note) | `docs/LESSONS.md`; one line in the writing skill |
| Lesson: `/rewind` skips symlinked and hard-linked files | Checkpointing page: restore skips them with "Restored the code, but skipped N files". `~/.claude/projects/*` are symlinks to `<data drive>/ClaudeData/projects`, so memory edits can't be rewound; the backup-first rule is the only undo. | None | `docs/LESSONS.md` (Compaction and continuity) |
| Monthly `/usage` check, pressing `f` | `/usage` (subscription) ranks what drives usage (≥10% rows) and since 2.1.305 `f` applies the fixable ones after showing each change. A cheap check on the 80k start floor and on loops. | Low: `f` can run `/effort` commands without asking | Habit; add to `docs/SETTINGS.md` Status line / cost section |

### Tool scout

| Name | What it does | Evidence | Verdict | Install |
|---|---|---|---|---|
| [blender-skills](https://github.com/EL4CTEO/blender-skills) | 28 Blender skills (modelling to render, cloth, hair, QA), scripts tested in Blender | 656★, MIT, single maintainer (EL4CTEO), last commit 2026-10-30, 0 issues, created 2026-10-14 | **Try**, project scope only: targets Blender 5.2 LTS+, and this PC runs 5.2.2 (`blender/run.py`). Install from the ANIMATION folder so the 28 descriptions don't join every session's skill listing. Read the scripts first; compare against `blender/BRIEF.md` rules before trusting any. | `claude plugin marketplace add EL4CTEO/blender-skills` then `claude plugin install blender-agent-skills@blender-agent-skills --scope project` |
| [floorplan](https://github.com/haydenschmitty/floorplan) | Claude reads a codebase and draws an interactive plain-English map | 1,887★, MIT, single maintainer, last commit 2026-11-02, 38 open issues, created 2026-10-27 | **Try later** on the app project, once: overlaps archify and `pnpm map`; the map costs a full read of the codebase. Wait for the issue count to settle. | `claude plugin marketplace add haydenschmitty/floorplan` then `claude plugin install floorplan@floorplan --scope project` |
| [optimaizr](https://github.com/blendbunjaku/optimaizr) | Local CLI and plugin: shows where tokens go, holds a message that would re-pay an expired cache | 195★, MIT, single maintainer, last commit 2026-10-31, 3 issues | **Skip for now**: overlaps `cache-report.py` and TokenEconomizer; revisit after the 2026-11-08 TokenEconomizer verdict | `npx optimaizr` (no install needed to look) |
| [graphicle](https://github.com/Graphicle-AI/graphicle) | Code graph and memory MCP in Rust | 489★, Apache-2.0, org, last commit 2026-11-02 | **Skip**: a Rust port of Graphify, which was piloted and dropped on 2026-10-28 for off-target answers | — |

Skipped without a row: magpie (routes Claude Code to other vendors' models: sends data out), invisible_playwright_mcp
(bypasses bot detection), Claude-Guardian (account-ban evasion), cheapAg (hands work to a third-party model).

### Worth knowing, not adopted (with reason)

- **Background agent summaries** (HN 586 points; gist flamerix-ai): since about 2.1.232, every ~30 s Claude Code sends
  each *background* agent's transcript to its model for a 3-5 word status label. No setting turns it off;
  `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` stops it but also stops background agents; the gist's fix is a Bun preload
  that patches the binary. Not adopted: we run few subagents (max 2), and patching the binary breaks on every update.
  It stays inside Anthropic (token cost, not a leak).
- `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` stops idle `/goal` check-ins (max 3 per goal since 2.1.246). Only matters if
  `/goal` is used.
- `/insights` writes an HTML report on how you work to `~/.claude/usage-data/report.html` (tokens count against the
  plan). Overlaps the session-report plugin.
- Rewind menu has **Summarize up to here** (compress the start, keep recent turns) as well as Summarize from here.
- Plans: docs now name Pro, Max and Ultra (Reddit: Max 20x renamed Ultra, 5-hour window removed for it). Not checked
  against the user's own plan; no settings depend on it.
- r/ClaudeAI/ClaudeCode this week: game-cloning refusals (already in the system prompt), usage-limit complaints,
  Opus 5.6 rumours. Nothing to act on.

### Next round: start here

- Changelog entries after 2.1.316 (two weeks without a release; expect a large batch, check breaking changes first).
- Settings reference from offset 200000: exact `idleCompaction` entry (type, default) and `skillListingBudgetFraction`
  default, to recheck round 5's numbers.
- TokenEconomizer verdict (task `tokeneconomizer-week-check`, 2026-11-08); then decide on optimaizr.
- Recheck blender-skills and floorplan (issues, commits) if the user hasn't tried them.

## Compaction window for the app project (2026-11-02)

Study of 36 the app project sessions (691 compactions; script kept in the session log Traps) across window periods 433k, 483k, 400k, 250k:
- Fixed start cost ~80k tokens; context right after compaction ~105-118k (summary ~4k, re-injected skills ~10k, skill listing ~9k, files).
- At 250k auto-compaction fires at ~218k, leaving ~108k of room; median 41 min between compactions (p25 11 min), 62 s each.
- Rework after compaction (re-reading files read just before) was 0.4 per compaction at both 250k and 400k; calls before the first edit 5 vs 6. No quality gain measured from bigger windows.
- Mean context per API call: 165k at 250k vs 219k at 400k; each call re-sends it.
Decision: the app project only gets 300k (project `settings.local.json`, backup `.bak-2026-11-02`); global stays 250k. 400k was rejected: more cost per call with no measured quality gain.
Update 2026-11-02: at the user's request 300k became the global value (`~/.claude/settings.json`); the the app project override was removed.
Bigger lever, open: the ~80k start floor. The skill listing (~9k tokens, including ~35 SEO and ~12 video skills) loads in every the app project session.

## Email shield and Anthropic plugins (2026-11-01, Claude Code 2.1.316)

**Account email in every prompt.** [anthropics/claude-code#81138](https://github.com/anthropics/claude-code/issues/81138)
(open; 20 comments, including leaks to websites, git identities and subagents) confirms Claude Code injects
`# userEmail` from `~/.claude.json` → `oauthAccount.emailAddress`. There is no setting for it; only API-key, Bedrock or
Vertex login omits it. Fix applied: the **email-shield** mod (`<plugins folder>/local-mods/email-shield`,
local marketplace `local-mods`, installed at user scope). It drops the `userEmail` block at `prompt.context`, strips it
from `prompt.attachment`, and denies any non-local tool call (anything except Read/Glob/Grep/Edit/Write/NotebookEdit)
whose input contains the address. `claude plugin test` 3/3 pass, and the tests fail when the filter or guard is
broken. Live check unverified: `claude -p` reports "OAuth session expired" (the CLI's own login); check in a new
desktop session. Remove the mod once Anthropic ships an off switch.

**Official marketplace, Anthropic-authored (39 of 315; full list in `docs/marketplace-baseline.tsv`).**
| Plugin | Decision | Why |
| :- | :- | :- |
| claude-security | installed (user) | On-demand multi-agent vulnerability scan; rule added to global CLAUDE.md Code map: run on the diff before shipping |
| claude-code-setup | installed (user) | Automation recommender: run once per new codebase (same rule) |
| claude-md-management | installed (user) | `claude-md-improver` audit / `revise-claude-md`; overlaps the learning loop, use as an occasional audit |
| feature-dev | installed 2026-10-31 | 7-phase `/feature-dev` |
| session-report, receipts | installed (user) | Skills only, local transcripts, no hooks: HTML usage report; impact report for a manager |
| pyright-lsp | installed (user), 2026-11-01 | User approved; `npm i -g pyright` 1.1.414; Python type errors reach Claude after each edit |
| security-guidance | skipped | LLM diff review on every Stop costs tokens each turn; claude-security covers it on demand |
| code-review, pr-review-toolkit, code-simplifier, commit-commands, skill-creator, frontend-design | skipped | Built-in `/code-review`, `/simplify`, anthropic-skills and impeccable already cover them |
| hookify, plugin-dev, mcp-server-dev, agent-sdk-dev, project-artifact | skipped | No current need |

**coderabbit** (made by CodeRabbit, not Anthropic) was disabled: it needs its own CLI and account, sends code to
CodeRabbit's servers (against the confidentiality rule), and claims to be the default code-review skill. To turn it
back on: `claude plugin enable coderabbit@claude-plugins-official`.

Also: a one-time task `tokeneconomizer-week-check` (2026-11-08 10:30) measures TokenEconomizer against the 98.1%
cache baseline and writes a keep/tune/remove verdict here. The weekly scout now diffs the marketplace against
`docs/marketplace-baseline.tsv`.

## Installs and tool scout (2026-10-31, Claude Code 2.1.316)

User asked for both installs.
- **TokenEconomizer** (github.com/microsoft/TokenEconomizer, commit e428fc9, Apache-2.0): cloned to
  `<plugins folder>/TokenEconomizer`, marketplace added from that path, `tokeneconomizer@tokeneconomizer`
  0.1.0 installed at user scope. Config: microskills off, toolprune auto, loopguard nudge; state in `~/.tokeneconomizer`.
  It officially supports 2.1.300–2.1.310; status and `toolprune refresh-catalog` (46 tools) work on 2.1.316.
  CLI: `CLAUDE_PLUGIN_ROOT=".../TokenEconomizer/plugin" sh ".../plugin/scripts/te" --host claude --cwd "$(pwd)" status`
  (`~/.tokeneconomizer/bin/te` is not created). Tool pruning writes deny rules to `.claude/settings.local.json`.
- **feature-dev@claude-plugins-official** (Anthropic): `/feature-dev` runs 7 phases (discovery, codebase exploration,
  clarifying questions, architecture, implementation, quality review, summary) with code-explorer, code-architect and
  code-reviewer subagents. Those subagents run only when `/feature-dev` is invoked, and the cap of 2 at once still applies.

**Tool scout added to the weekly routine** (step 2b of `~/.claude/scheduled-tasks/claude-setup-weekly-research/SKILL.md`,
backup `SKILL.md.bak-2026-10-31`). It covers GitHub search API (pushed in the last weeks, sorted by stars), GitHub trending,
new official-marketplace entries, r/ClaudeCode and r/ClaudeAI via `gap-hunt/pains/reddit_archive.py`, and HN Algolia
(points>30). Each candidate is verified at its source and written up as a max-5 table with a verdict and the install
command. It recommends only; the user approves installs. The GitHub and HN queries were tested live on 2026-10-31.

**Security, from the first scout run:** backdoored "Claude Code for VS Code" 2.1.312/2.1.313 shipped on the Cursor
Marketplace (phorion.io advisory, 2026-10-30, updated 2026-10-31; SSH backdoor; uninstalling doesn't remove it).
Checked this PC on 2026-10-31: no Claude extension in `.vscode`/`.cursor`, Cursor not installed, none of the Windows
indicators present (`~/.config/smt.cmd`, `smtk`, Startup `sysmon.cmd`, scheduled task `SysMon`). The only ssh process
belonged to an app project's CI runner. `authorized_keys` was not read because shell-guard blocks `~/.ssh` reads. Lesson: get
editor extensions from the official VS Code Marketplace only.

## Reader post: end-of-session sweep (2026-10-31)

Source: r/ClaudeCode post "One question I ask my coding agent before closing every session" (68 runs over 14 days,
one user; skill `substantial` in github.com/digora-dev/digora) and its comments. The user asked for it to be read.

### Adopted (global `CLAUDE.md` Learning loop, and the template)

| Change | Why |
|---|---|
| A task's end is now a learning-loop trigger: sweep for open items, hard-won facts and notes the session proved wrong, before a `/clear` or a long break | In the post's runs about one candidate in five was a correction to an existing note; stale notes were the biggest catch. Asking before a break also keeps the sweep on a warm cache (two-thirds of their cost came from runs after the cache expired). |
| Fix a wrong note in place and its index line too; keep "was X, now Y" when the old fact could mislead | A corrected note whose `MEMORY.md` line still says the old thing is still read wrong by every session. |
| Each saved fact names the date and source it was checked against | From the comments: a claim with a source can be rechecked in one command; one without just gets repeated. |

Applied once in this session: the token-economy memory and its index line now record the settings that enforce
"max 2 at once".

### Not adopted (with reason)

- Hand-picking from a candidate list each time (the post's core ritual). Your rules say save without asking; the
  post's own figure is about 6 minutes of attention a day.
- Keep-warm pings every 30 minutes on idle sessions. Each ping is a paid cached read, it only pays off if you come
  back within about 2.5 hours, and Claude Code already compacts idle sessions past 200K tokens before the cache
  expires.
- A hook that asks the question. `PreCompact` can block compaction but can't make Claude take a turn, and
  `SessionEnd` runs after the session can answer, matching the post.
- Confidence labels (DEFINITIVE to SPECULATIVE) instead of number scores. Interesting for findings, but our gauntlet
  scores are judged against a named reference, not guessed certainty.

## Round 7 (2026-10-31, Claude Code 2.1.316)

Sources: changelog (newest entry still 2.1.316); docs pages Mods overview (`plugins/mods/overview`), Explore the
context window, Best practices (Keep CLAUDE.md short, Know what subagents cost, Keep cost and context down),
Environment variables (cache, compaction and subagent rows), Workflows (caching, limits, cost, size guideline).

### Changed in this round

| Change | Why |
|---|---|
| Lesson: after compaction a skill comes back cut to its first 5,000 tokens | Context-window page: invoked skill bodies are re-injected at up to 5,000 tokens each and 25,000 in total, oldest dropped first; truncation keeps the start. Our biggest video skill is under the cap; `framer-code-components` (~16k tokens) and the `hyperframes` family (~5-7k) are not. |
| Lesson: after compaction only five files come back | Same page: up to five most recently modified files are re-read; one over 5,000 tokens comes back as a path only. |
| Sharpened the round 6 break lesson | Best practices: on the one-hour cache, a session past about 200K tokens that sits idle is compacted automatically shortly before the cache expires (`CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`, default 200,000). Below that, or on the five-minute cache, it's still on you. |

### Proposed, then applied 2026-10-31 (user approved; user settings only, template unchanged)

| Proposal | Why | Risk | Where |
|---|---|---|---|
| `env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS: "2"` and `workflowSizeGuideline: "small"` | The subagent limit from round 6 doesn't cover workflows, which run up to 16 agents at once by default. This extends "max 2 at once" to them. Workflow agents also get the five-minute cache even on a subscription, so a wide run re-pays its prefix often. | A workflow you ask for runs slower. The size guideline is advice, not a cap. | Your settings |

### Worth knowing, not adopted (with reason)

- `/doctor prompt-audit` flags instructions written for older models, pointing at missing files, or contradicting
  each other. Worth running on the global `CLAUDE.md` by hand; Claude can't run it for you.
- `/autocompact 500k` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` move the auto-compact point; our
  `CLAUDE_CODE_AUTO_COMPACT_WINDOW: 250000` already does this.
- "You should know" (`/plugin enable cc-plugin-you-should-know@builtin`) is a built-in mod where a side agent flags
  things you might miss. It's off by default and its side agent spends tokens every turn; not adopted.
- Built-in mods ignore `disableAllHooks`, `--bare` and `--safe-mode`; turn one off in `/plugin` instead.
- Workflow fan-outs hold matching agents up to 5 seconds so they share the first agent's cached prefix; a
  `Large workflow` warning shows past 25 agents or 1.5M projected tokens. Advisory only.
- `/usage` on subscription plans breaks usage down by skill, subagent, plugin and MCP server: the quickest check on
  which ones earn their cost.

- Measured (round 6 follow-up): in the last 7 days, 2,163 of 233,244 text tool results (0.9%) were over 15,000
  characters, median 21,394; the excess was about 23M characters (~5.8M tokens) across 150 transcripts. Screenshots
  are excluded (they inflate a naive count 7x). `bashOutputMaxChars: 15000` would trim a little but only covers Bash,
  so not adopted.
- Transcript volume: 10.4 GB in the last 7 days, 17 GB on disk in total (`<data drive>/ClaudeData/projects`, 512 GB free on
  2026-10-31). With 90-day retention this levels off around 130 GB. The `~/.claude/projects/*` folders are symlinks
  there, so `find` needs `-L` to see them.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages: `settings-reference` (`idleCompaction`), `prompt-caching` (which TTL each request gets),
  `interactive-mode` (You should know), `checkpointing` (rewind and summarize), `costs`.

## Round 6 (2026-10-31, Claude Code 2.1.316)

Sources: changelog (newest entry still 2.1.316); docs pages Sessions (Branch a session), Goal, Tools reference (Bash
timeout and output limits), Subagents (persistent memory, what loads at startup, output scanning, concurrent limit);
two web searches for posts since 2026-10-28 (third-party summaries of Anthropic staff advice, marked below). The
`mods` page has moved to `plugins/mods/overview`.

### Changed in this round

| Change | Why |
|---|---|
| Lesson: a failing command shows only a head-and-tail excerpt | Tools reference: a failed result is cut to about 10,000 characters inline, with no file path, so the middle is gone. A successful one past 30,000 characters is saved to a file instead. |
| Lesson: every subagent loads your whole `CLAUDE.md` | Subagents reference: each non-fork subagent starts with the full `CLAUDE.md` hierarchy and a git status snapshot, but not your output style or auto memory. |
| Lesson: write `/goal` conditions Claude will print | Goal page: the evaluator is a small model that sees only the conversation and calls no tools. |
| Lesson: compact or clear before a break longer than the cache TTL | Third-party write-ups of Anthropic staff advice; consistent with the cache mechanics in the costs docs. The new status line shows the minutes left. |

### Proposed, then applied 2026-10-31 (user approved; user settings only, template unchanged)

| Proposal | Why | Risk | Where |
|---|---|---|---|
| `env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "2"` | Turns "at most 2 subagents at once" from a rule into a setting. Spawning a third fails with an error that tells Claude not to retry. Workflows and agent teams keep their own limits. | A request for wider fan-out fails until the value is raised. Default is 20. | Your settings; the template only if the rule is shared |

### Worth knowing, not adopted (with reason)

- `/branch [name]` copies the conversation so far into a new session and switches to it; the original stays as it
  was, and "allow for this session" grants carry over. Good for trying a second approach without losing the first.
  Not wired into anything; it's a habit, not a setting. Desktop equivalent not checked.
- Subagent `memory: user | project | local` gives a custom subagent its own `MEMORY.md` (first 200 lines or 25 KB
  load). We ship no custom subagents, so nothing to change.
- `omitClaudeMd: true` launches a custom subagent without the user, project and local `CLAUDE.md`; restate any rule
  it needs in the prompt. Worth it for a narrow, frequent agent.
- Claude Code scans each subagent's report and marks text that imitates its own tags or mentions permission
  bypasses. It doesn't remove anything, and permission checks still apply; it's a warning label, not a filter.
- `BASH_MAX_OUTPUT_LENGTH` (up to 150,000) widens the read-back window; `bashOutputMaxChars` overrides it. Neither
  helps a failing command, which stays at about 10,000 characters.
- Exit code 1 from `grep`, `rg`, `find`, `diff`, `test`, `git diff` and `git grep` counts as success; any other
  command exiting 1 is a failure and gets the short excerpt.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages: `plugins/mods/overview`, `context-window`, `best-practices` (keep cost and context down),
  `env-vars` (scan for token and cache controls), `workflows`.
- Measure before adopting `bashOutputMaxChars: 15000`: count tool results over 15,000 characters in last week's
  transcripts.

## Round 5 (2026-10-31, Claude Code 2.1.316)

Sources: docs pages Memory (How Claude remembers your project) and Settings reference (entries for
`bashOutputMaxChars`, `skillListingBudgetFraction`, `skillListingMaxDescChars`, `cleanupPeriodDays`).

### Measured on our own setup

- The skill listing is over budget. In a session with about 120 skills (40 of them from two SEO plugins), the SEO
  skills and several others showed with no description at all. The listing is capped at 1% of the context window
  (`skillListingBudgetFraction: 0.01`); over the cap, the least-used skills keep only their names, so Claude rarely
  picks them on its own.

### Changed in this round

| Change | Why |
|---|---|
| Lessons: the skill listing budget; transcripts vanish after 30 days | From the Settings reference, and what we saw in our own listing. |

### Proposed (not applied)

| Proposal | Why | Risk | Where |
|---|---|---|---|
| Turn off plugins you aren't using this month (`/plugin`), starting with the two SEO plugins | Frees the listing budget, so the skills you do use keep their descriptions and get picked. No setting change needed. | Re-enable when needed; their skills vanish meanwhile. | Your machine, not the repo |
| `cleanupPeriodDays: 90` | The default 30 days silently deletes transcripts, `/rewind` snapshots and the history that `/insights` and `cache-report.py` read. The rules say "check past sessions before asking again". | Disk: long transcripts run to hundreds of MB. | `claude/settings.template.json` |
| `bashOutputMaxChars: 15000` (default 30,000) | Output past the limit goes to a file with a preview and the path, so nothing is lost; context grows half as fast on verbose commands. | Claude may need an extra Read for long logs; RTK already trims many commands. Measure before adopting. | `claude/settings.template.json` |

### Adopted after review (2026-10-31)

| Change | Where | Checked |
|---|---|---|
| `cleanupPeriodDays: 90` | template, installer, our machine | Installer test |
| Status line (round 3 proposal) | `claude/scripts/statusline.mjs`, template `statusLine` | 4 tests: full, before the first reply, cold cache, broken input; each fails on a mutated script |
| `ConfigChange` audit hook (round 4 proposal) | `claude/scripts/config-audit.mjs`, template hook | 2 tests plus a live run: one settings write logged one line per open session (10) |
| Two SEO plugins off | claude.ai account (not local plugins, so not settable here) | Left to the account owner |

`bashOutputMaxChars` stays at the default until measured.

### Worth knowing, not adopted (with reason)

- `skillListingMaxDescChars` (default 1,536) caps each description; `skillListingBudgetFraction` raises the 1% cap.
  Raising it costs context on every turn; turning off unused plugins is cheaper. `/doctor` shows which skills use the
  most listing space.
- The project-root `CLAUDE.md` is re-read from disk after `/compact`; nested `CLAUDE.md` files and `paths:` rules
  reload only when a matching file is touched again.
- `@path` imports organise a long `CLAUDE.md` but don't reduce its context cost. Files over 4 MiB are skipped
  entirely; on-demand files over 150,000 characters (1M context, current models) arrive cut short.
- `includeGitInstructions: false` removes the built-in commit and PR guidance; use it only if your `CLAUDE.md` sets
  its own commit rules, so the two don't conflict.
- An `InstructionsLoaded` hook can log which instruction files load and why; useful to debug a rule that never fires.
- `promptSuggestionEnabled: false` and `awaySummaryEnabled: false` stop two small background requests. Both mostly
  read cache; not worth losing the features for.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages not yet read: sessions (`/branch`, naming), goal, mods (approval of hook-blocked calls),
  tools-reference (output limits), sub-agents "enable persistent memory".
- Anthropic engineering and claude.com/blog posts after 2026-10-28.

## Round 4 (2026-10-31, Claude Code 2.1.316)

Sources: docs pages Output styles, Manage costs, Checkpointing, Automate actions with hooks (hooks guide). Changelog:
still nothing newer than 2.1.316. Local test: piped a `git push` event through `rtk hook claude`.

### Measured on our own setup

- `rtk hook claude` returns only `updatedInput` (`rtk git push origin main`) and no permission decision. So RTK
  defeats ask rules by changing the command text, not by approving it. Our docs said the second; corrected.

### Changed in this round

| Change | Why |
|---|---|
| LESSONS and SETTINGS: why shell-guard repeats the ask rules, rewritten | The guide says parallel `PreToolUse` hooks merge to the strictest decision (deny, ask, allow), and a hook's `allow` doesn't bypass ask or deny rules. Hook order doesn't matter; the rewritten text is the real gap. |
| Lesson: a project's `disableAllHooks: true` switches off your user hooks | From the hooks guide: the value after settings precedence wins, and project beats user. Only managed hooks survive. |
| Lessons: `/clear` is free, `/compact` is a large request, `/rewind` "Summarize up to here"; rewind misses shell and subagent edits; idle sessions still spend | From Manage costs and Checkpointing. |

### Proposed (not applied)

| Proposal | Why | Risk | Where |
|---|---|---|---|
| **Adopted 2026-10-31, see round 5.** A `ConfigChange` hook that appends each settings or skills change (source, file, time) to `~/.claude/logs/config-audit.log` | Shows when a settings file changed under a running session, by an editor or another process. A record, not a block. | One more hook process per change; tiny. | `claude/scripts/config-audit.mjs` + template |

### Worth knowing, not adopted (with reason)

- Hook `if` field (`"if": "Bash(git *)"`) spawns a hook only for matching calls. Not used on shell-guard: the docs
  call the filter best-effort, and a guard must never be skipped.
- Prompt and agent hooks (`type: "prompt"` / `"agent"`) let a model judge a `Stop` ("are all tasks done?"). Each
  fires on every stop and costs a model call; our command-based log-guard is free.
- `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`: a Stop hook that blocks 8 times in a row is overridden. log-guard blocks once.
- New hook events since our hooks were written: `PostCompact`, `PostToolBatch`, `InstructionsLoaded`,
  `FileChanged`, `PreModelSwitch` (can block a model switch, which would rewrite the cache), `StopFailure`.
- Output style value is case-sensitive in settings: `concise` silently gives Default. Ours is `Concise`. Styles
  don't reach subagents (only forks), and a mid-session switch applies from the next message.
- Prefer CLI tools (`gh`, `aws`) over MCP servers where both exist: no tool listing in context. Code-intelligence
  (LSP) plugins cut file reads in typed codebases.
- `MAX_THINKING_TOKENS` is ignored on adaptive-reasoning models (the 5.5 family); use effort instead.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages not yet read: memory (auto memory limits), settings-reference (new keys), sessions (`/branch`),
  goal, mods (they can approve a call a hook blocked on API-key sessions).
- Anthropic engineering and claude.com/blog posts after 2026-10-28.

## Round 3 (2026-10-31, Claude Code 2.1.316)

Sources: docs pages Configure auto mode, Desktop scheduled tasks, Status line; Anthropic engineering index (newest
post 2026-10-13, about source control, not relevant); Claude blog "Building agents: when to fold subagents into your
main agent loop" (2026-10-22) and "Manage costs and demonstrate ROI for Claude Code on Google Cloud" (2026-10-27).

### Confirms what this setup already does

- One agent loop with skills beat subagent designs on quality in several enterprise comparisons, usually at lower
  cost and about 2x lower latency. Subagents earn their place for verification, parallel work with fresh context, or
  when one loop measurably degrades. (Our "no subagents by default" rule.)
- An ask rule like `Bash(git push *)` doesn't match `git -C <dir> push`; the docs name a `PreToolUse` hook that reads
  the full command as the fix. (Our `shell-guard`.)
- A boundary stated in chat ("don't push yet") can be lost at compaction; durable boundaries belong in ask or deny
  rules. (Our deny and ask lists.)
- Tool choice degrades past roughly 30 to 50 tool definitions; short descriptions with details loaded on demand
  ("progressive disclosure") scale better. (Tool search on; skills over long rules.)

### Changed in this round

| Change | Why |
|---|---|
| `templates/weekly-research-task.md` added | The prompt for a weekly desktop scheduled task that runs the next research round, commits locally and proposes changes without applying them. |
| SETTINGS.md: desktop scheduled tasks get "Run now once, always allow", missed-run catch-up and the bypass trap | From the Desktop scheduled tasks page and our own setup: a task created from a session in bypass mode is saved in bypass mode. |
| Lesson: `autoMode` is read only from `~/.claude/settings.json` (and managed settings or `--settings`) | Project `.claude/settings*.json` can't set it, so a cloned repo can't loosen your classifier. The installer already writes it to user settings. |

### Proposed (not applied)

| Proposal | Why | Risk | Where |
|---|---|---|---|
| **Adopted 2026-10-31, see round 5.** A status line script showing context %, cache `warm`/`ttl`/`expires_at` and the last miss cause | Shows when a session's cache is about to go cold, so you `/compact` or finish before stepping away. Runs locally, costs no tokens. | Terminal only; the desktop app has its own footer. | `claude/scripts/statusline.mjs` + `statusLine` in the template |
| Run `claude auto-mode critique` after editing `autoMode` | Flags ambiguous or over-broad environment and allow entries. | None; read-only. | README "After installing" |

### Worth knowing, not adopted (with reason)

- `autoMode.soft_deny`, `hard_deny`, `allow`: setting any of them without `"$defaults"` throws away the built-in list
  (force push, `curl | bash`, production deploys). Always include `"$defaults"`.
- `autoMode.classifyAllShell: true`: the classifier checks every shell command, ignoring narrow allow rules. Safer,
  slower; worth it only if your allow list is broad.
- `claude auto-mode defaults` / `config`: print the built-in and effective rules.
- Desktop scheduled tasks can run each run in its own git worktree (Edit form, **Worktree**), so a run never touches
  uncommitted work.
- OpenTelemetry (`OTEL_RESOURCE_ATTRIBUTES`) reports cost by skill, plugin, agent and MCP server; for teams. Track
  cost per task, not per token, and retire scheduled tasks nobody reads.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages not yet read: output-styles, hooks-guide (new events since 2.1.316), costs (prompt cache statistics),
  memory (auto memory limits), checkpointing.
- Anthropic engineering and claude.com/blog posts after 2026-10-28.

## Round 2 (2026-10-31, Claude Code 2.1.316)

Sources: docs pages Context window, Prompt caching, Skills, Sub-agents, Permission modes, Scheduled tasks (formerly
Routines). Changelog: nothing newer than 2.1.316 yet.

### Measured on our own setup

- Cache TTL: in a long desktop session, all 186 cache writes were one-hour, none five-minute (2.2M tokens). The
  subscription's one-hour TTL is working; the earlier `cache-report.py` baseline (98.1% hit rate) stands.
- Repo skills: every description is under the 1,536-character listing cap, none sets `model:` (which would cost a
  full cache rewrite each call), and the longest body (`human-voice`, about 1,900 words) fits the 5,000-token cap
  that applies when skills are re-injected after compaction.

### Changed in this round

| Change | Why |
|---|---|
| Scheduled-task docs split into desktop (local) and cloud | Cloud scheduled tasks start in auto mode and act as you on GitHub and connectors; only desktop tasks keep their own stored mode. Our docs had merged the two. |
| Lessons: key skill instructions at the top; `paths:` rules vanish at compaction; `CLAUDE.md` edits apply only after `/clear`, `/compact` or restart | From the Context window and Prompt caching pages. |
| Lessons: what rewrites the whole cache; `/rewind` beats `/compact` for a dead end | From the Prompt caching page. |
| Lesson: a scheduled prompt is not live approval | From the Scheduled tasks page. |
| OPTIONAL.md: how to check a proxy keeps your cache | A proxy that strips `cache_control` bills every turn as uncached; one that drops `anthropic-beta` loses the one-hour TTL. |

### Worth knowing, not adopted (with reason)

- `skillOverrides` (`"name-only"`, `"user-invocable-only"`, `"off"`): lists a skill by name only or hides it, cutting
  listing tokens. Not set by the installer, because a name-only skill is picked less reliably. Use it for personal
  skills you call by `/name`. Plugin skills aren't affected; disable the plugin instead.
- `promptCacheTtl` / `subagentPromptCacheTtl` (`"5m"` or `"1h"`): a subscription already gets one hour for the main
  conversation. API-key users should set `promptCacheTtl: "1h"` if they leave sessions idle.
- `idleCompaction: false`: keeps idle sessions from being compacted. Left on; compacting before the cache expires is
  cheaper than a cold re-read.
- `/autocompact 500k` sets the compaction point per session; our `CLAUDE_CODE_AUTO_COMPACT_WINDOW` does it for all.
- Subagent frontmatter `maxTurns` caps a runaway subagent; `model: haiku` on read-only helpers is the documented cost
  cut. Custom agent descriptions above 15,000 tokens in total trigger a startup warning.
- Auto mode: `autoMode.allow` overrides a block for one routine action; deny rules still win in every mode. After 3
  blocks in a row or 20 in a session, auto mode pauses and asks.

### Built-in tools to run yourself

- `/usage` now has a `Prompt cache (main)` line with the hit ratio and the likely cause of the last miss.
- `/context` shows what is loaded right now, by category, with suggestions.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages not yet read: auto-mode-config, desktop-scheduled-tasks, statusline (cache fields), output-styles.
- Anthropic posts after 2026-10-13.

## Round 1 (2026-10-31, Claude Code 2.1.316)

Sources: Claude Code CHANGELOG (2.1.301 to 2.1.316), docs pages Best practices, Manage costs, Memory, Hooks;
Anthropic engineering posts "Harness design for long-running application development" (2026-03-24) and "An update
on recent Claude Code quality reports" (2026-04-23); community setups (cassler/awesome-claude-code-setup and others).

### Confirms what this setup already does

- Rules that must always hold belong in hooks or deny rules; `CLAUDE.md` is for guidance Claude may weigh. (Our
  shell-guard, log-guard and deny rules.)
- `# Compact instructions` in `CLAUDE.md` is the documented way to steer compaction.
- Keep each `CLAUDE.md` under 200 lines; only write what Claude can't find by reading the files. Auto memory loads
  only the first 200 lines or 25 KB of `MEMORY.md`.
- Clear or start a new session between unrelated tasks; every request re-sends the whole conversation.
- A written handoff (our session log) is what carries a long task across a reset or compaction.

### Changed in this round

| Change | Why |
|---|---|
| `CLAUDE_CODE_SUBAGENT_EFFORT=medium` added to the template | New in 2.1.316. Makes "subagents run at medium effort" a setting instead of a request. |
| `ENABLE_TOOL_SEARCH` documented as now default | MCP tool definitions are deferred by default (and on behind a custom base URL since 2.1.304). Kept for older versions; harmless. |
| Lessons added: re-check scaffolding on each new model; emphasis doesn't make rules stick | From the harness post and the best-practices "what you can stop doing" table. |

### Worth knowing, not adopted (with reason)

- `onFailure: "block"` on hooks (2.1.295+): makes a crashed hook block the action. Not set on shell-guard, because the
  `Read(...)` deny rules already catch `cat .env`-style reads, and a hung guard would then block every command.
- `permissions.blockWritesOutsideWorkingDirectories` (2.1.314): strong safety, but breaks setups that write memory,
  notes or logs outside the project folder. Turn it on if your work stays inside one folder.
- `crossSessionInbound: "hold"`: stops messages from other sessions waking an idle session (each wake re-sends its
  whole context). Not set because hub sessions that route work rely on those messages. Set it if you don't
  orchestrate sessions.
- `PostToolUse` `updatedToolOutput` can replace a tool's output, so a hook could trim huge MCP or web results. Not
  built yet: trimming risks hiding the line that mattered. RTK already compresses shell output.
- `.claude/rules/*.md` and `~/.claude/rules/*.md` with `paths:` frontmatter load only when matching files are touched.
  Good home for coding-only rules (code map, quality gates) so non-code sessions don't carry them.
- HTML comments in `CLAUDE.md` are stripped before loading, so maintainer notes there cost nothing.
- Idle compaction (2.1.314): on a subscription's one-hour cache, a session past about 200k tokens left idle is
  compacted just before the cache expires.

### Built-in tools to run yourself

- `/usage`: on a plan, shows which skills, subagents, plugins and MCP servers use your tokens, with recommendations;
  press `f` to apply the ones it can.
- `/insights`: analyses up to 200 recent sessions for friction (misunderstood requests, rework) and writes an HTML
  report to `~/.claude/usage-data/report.html`.
- `/doctor prompt-audit`: checks your `CLAUDE.md`, rules, skills and output styles for instructions written for older
  models, dead references and contradictions. Proposes edits; changes nothing until you say so.
- `/auto-mode-setup`: drafts `autoMode.environment` from your projects and recent sessions.

### From Anthropic's long-running harness work

- Turn taste into explicit criteria and hard thresholds; any criterion under its threshold fails the unit.
- An evaluator is worth its cost only for work beyond what the model reliably does alone; otherwise run it once at
  the end or skip it.
- Out of the box a model judge approves flawed work; tune it by reading its verdicts against your own.
- Remove one piece of scaffolding at a time and measure; on each new model, strip what's no longer load-bearing.

### Next round: start here

- Changelog entries after 2.1.316.
- Docs pages not yet read: context-window, prompt-caching, skills, sub-agents, permission-modes, routines.
- Anthropic posts after 2026-10-13.
