# Where every part came from, and what it replaces

Every part of this playbook exists because a source or a measurement said it would help, and many of them make a
popular plugin, skill or MCP server unnecessary. This page lists both. It is generated from `setup/catalog.json`
(the same data `/playbook` shows you), and a test fails if a component is missing here.

## The research behind it

- **Nine research rounds** between 2026-10-31 and 2026-11-02, each logged in [RESEARCH.md](RESEARCH.md) with its
  sources: the Claude Code docs and changelog, Anthropic's engineering posts, `anthropics/claude-code` issues,
  Hacker News, Reddit (r/ClaudeAI, r/ClaudeCode), arXiv and GitHub.
- **Round 9 alone** harvested 4,661 items by script (HN 704, GitHub repos 1,776, claude-code issues 484, arXiv 537,
  Reddit 1,160). 3,003 passed a relevance filter, about 220 were reviewed, and 36 were read in full or in part.
- **Methods study** ([METHODS-2026-11-03.md](METHODS-2026-11-03.md)): the core files of 27 skill and harness repos
  (superpowers, mattpocock/skills, addyosmani/agent-skills, spec-kit, OpenSpec, gstack, BMAD, ECC and others), plus
  spec-driven development, TDD, DDD, ADRs and Shape Up, boiled down to ten small versions of our own.
- **Our own numbers**, from `cache-report.py` over real transcripts: a 98.1% prompt-cache hit rate (2026-10-29);
  output is about 11% of spend; sessions woken after a long idle caused about 40% of cache writes.
- **Hard lessons** that cost time are kept in [LESSONS.md](LESSONS.md).

## The playbook's own parts

| Component | Makes these unnecessary | Where it came from |
|---|---|---|
| `rules` Working rules (CLAUDE.md block) | superpowers (verification-before-completion, systematic-debugging, writing-plans); andrej-karpathy-skills CLAUDE.md; planning-with-files; spec-kit / OpenSpec CLIs; ECC continuous-learning | Anthropic's Claude Code best practices and long-running-harness posts (RESEARCH.md rounds 1-2); essence of superpowers, spec-kit, OpenSpec, Kiro EARS and mattpocock/skills retro (METHODS-2026-11-03.md #4, #5, #8); the learning loop is modelled on Nous Research's Hermes Agent; the end-of-session sweep on an r/ClaudeCode post (68 runs over 14 days); the judgement-call check (readings, strongest counter-case) from a 'structured-thinker' subagent prompt shared on Reddit (2026-11-03) |
| `compact-window` Auto-compact at 300k tokens | – | Our own measurement: sessions start near 80k and refill to about 110k after compaction, so 250k left ~108k of room and 300k leaves ~158k (RESEARCH.md, Compaction window 2026-11-02); Claude Code settings reference |
| `tool-search` Tool search on | Hand-pruning MCP servers to save context | Claude Code settings reference; on by default since 2.1.304 (changelog) |
| `subagent-effort` Subagents at medium effort | – | Claude Code changelog 2.1.316 (CLAUDE_CODE_SUBAGENT_EFFORT) |
| `concise-output` Concise output style | caveman; i-have-adhd | Built-in output style. Our cache-report data put output at about 11% of spend, so terse-output plugins buy little, and caveman's style breaks plain writing (our 2026-11-02 setup review) |
| `keep-transcripts` Keep transcripts 90 days | – | Claude Code settings reference: the default cleanupPeriodDays of 30 deletes transcripts and /rewind snapshots (RESEARCH.md round 5) |
| `auto-mode-env` Auto-mode environment | – | Claude Code auto-mode docs: autoMode is read only from user or managed settings, so a cloned repo can't loosen it (RESEARCH.md round 3) |
| `secret-deny` Deny reading secret files | – | Claude Code permissions docs (// absolute paths, ~ home paths) |
| `risky-ask` Ask before pushes and installs | – | Claude Code permissions docs |
| `statusline` Status line with cache state | – | Claude Code status-line docs; cache minutes left comes from the prompt-caching TTLs (RESEARCH.md round 6) |
| `shell-guard` Shell guard + ratchet | gstack careful (destructive-command guard); addyosmani/agent-skills constraint-driven; oh-my-openagent comment-checker | Hooks guide: parallel PreToolUse answers merge to the strictest, so a hook can hold ask rules that RTK's rewrites slip past (RESEARCH.md round 4); essence of gstack careful, agent-skills and comment-checker (METHODS-2026-11-03.md #2, #3) |
| `edit-boundary` Edit boundary for parallel sessions | gstack freeze | Essence of gstack freeze (METHODS-2026-11-03.md #9), for lead sessions running two children in one repo |
| `config-audit` Config change audit | – | ConfigChange hook event (hooks guide) |
| `log-guard` Session log guard | planning-with-files; claude-mem capture-everything memory | Anthropic's long-running-harness post (a progress file the next context reads); our own lost-context incidents after compaction (LESSONS.md, Compaction and continuity) |
| `session-resume` Session resume after compaction + log compaction | claude-mem; mem0; codebase-memory-mcp session memory | Context-window docs: after compaction only five recent files come back and skills are cut to 5,000 tokens (RESEARCH.md round 6) |
| `lead-guard` Lead guard (desktop app, hub sessions) | – | Our own desktop-app lead and child sessions: notes from children were left unanswered (2026-11-02) |
| `cache-report` cache-report.py | optimaizr (token dashboards); ccusage-style usage reports | Usage fields in Claude Code transcripts and the prompt-caching docs (cache read, 5-minute and 1-hour writes); baseline 98.1% hit rate on our data 2026-10-29 |
| `reddit` reddit.py | reddrix and other Reddit scrapers | Arctic Shift's public Reddit archive API, because WebSearch and browser tools can't reach Reddit |
| `skill-grilling` grilling | – | Matt Pocock's grilling skill from github.com/mattpocock/skills (MIT), copied unchanged; licence in claude/skills/grilling/LICENSE |
| `skill-human-voice` human-voice | stop-slop; humanizer | A study of 4,000+ summaries by a much-loved Reddit TL;DR bot; extra checks harvested from hardikpandya/stop-slop and blader/humanizer (METHODS-2026-11-03.md #6) |
| `skill-wilson-voice` wilson-voice | generic "summarise this" prompts | A study of 4,000+ real summaries by r/ClaudeAI's TL;DR bot (openers, labels, closers, room dynamics); joke structure from Judy Carter (attitude) and Greg Dean (two stories) |
| `skill-youtube-growth` youtube-growth | ad-hoc idea and title brainstorming | Jake Trinder's public talks on YouTube growth (100+ channels); Eugene Schwartz, Breakthrough Advertising (awareness levels) |
| `skill-motion-arsenal` motion-arsenal | looking up transitions, easing and FFmpeg filters from scratch | Craft studied from a code-trailer brief shared online (the brief shape, not its style); richtabor/agent-skills motion-design (easing and duration tokens); endlessblink/clean-cut-mcp Remotion trailer breakdown (frame counts, springs); editframe motion-design skill; FFmpeg 9.0 docs; 120 shaders bundled from gl-transitions.com (MIT, one BSD-2, one BSD-3; author and licence kept per entry) |
| `skill-gauntlet-loop` gauntlet-loop | autoresearch (metric loop); taste-skill (reference plus browser check) | Adapted from robonuggets/gauntlet-loop (CC BY 4.0), Matt Shumer's technique from github.com/mshumer/Claude-of-Duty; Google's Elephant-Goldfish model (Apache-2.0); metric mode from uditgoenka/autoresearch (MIT); Anthropic's harness post on criteria and thresholds |
| `skill-after-restart` after-restart (Windows) | – | Our own Windows crashes: blank-window freezes traced to commit-memory exhaustion (Resource-Exhaustion-Detector event 2004; LESSONS.md, Windows) |
| `smart-compact` smart-compact mod | optimaizr cache-hold; manual /compact before breaks | anthropics/claude-code issue #103040 (idle compaction doesn't run in desktop Code-tab sessions); our cache-report data: cold wakes were ~40% of cache writes (our 2026-11-02 setup review) |
| `email-shield` email-shield mod | – | anthropics/claude-code issue #81138 (the account email is injected into prompts) |

## Third-party tools we use, tried or reviewed

Stars and licences from the GitHub API on 2026-11-03. **Use**: we run it daily. **Per need**: only for
that kind of work. **Tried, dropped**: we ran it and removed it. **Skip**: reviewed, not adopted. The playbook never
installs these; `/playbook` shows which you have and, for the ones worth having, the command to get them.

| Tool | ★ | Licence | Verdict | Why | Use instead |
|---|---|---|---|---|---|
| `rtk` [RTK (shell output compression)](https://github.com/rtk-ai/rtk) | 85.4k | Apache-2.0 | Use | Cuts tool-output tokens on every shell call at no context cost. Pair it with shell-guard: its rewrites slip past ask rules. | – |
| `headroom` [Headroom (context compression proxy)](https://github.com/headroomlabs-ai/headroom) | 78.7k | Apache-2.0 | Use | Terminal sessions only (the desktop app talks to the API directly). Check it keeps your cache: see docs/OPTIONAL.md. | – |
| `tokeneconomizer` [TokenEconomizer (Microsoft)](https://github.com/microsoft/TokenEconomizer) | 4.5k | Apache-2.0 | Per need | On trial since 2026-10-31; verdict against cache-report numbers due 2026-11-08. Its tool pruning writes deny rules into .claude/settings.local.json. | – |
| `code-review-graph` [code-review-graph (CLI)](https://github.com/tirth8205/code-review-graph) | 32.6k | MIT | Use | Use the CLI (build, impact, update), not its MCP server: the CLI costs no context until you run it. | – |
| `lsp-plugins` [typescript-lsp and pyright-lsp](https://github.com/anthropics/claude-plugins-official) | – | official | Use | Native LSP is what serena adds through MCP, without the MCP context cost. | – |
| `official-dev-plugins` [feature-dev, claude-security, claude-md-management](https://github.com/anthropics/claude-plugins-official) | – | official | Use | Load on use; we run /claude-security on every app change before shipping. | – |
| `context7` [Context7 (current library docs)](https://github.com/upstash/context7) | 64.1k | MIT | Per need | Useful for fast-moving libraries. With tool search on, its tools cost only their names until used. | – |
| `impeccable` [impeccable (front-end design)](https://github.com/pbakaus/impeccable) | 100.8k | Apache-2.0 | Per need | Pick one design skill: it covers what taste-skill, hallmark and UI/UX Pro Max overlap on. | – |
| `archify` [archify (diagrams)](https://github.com/tt-a1i/archify) | 92.9k | Apache-2.0 | Per need | Only if you draw diagrams. | – |
| `obsidian-skills` [obsidian-skills](https://github.com/kepano/obsidian-skills) | 50.7k | MIT | Per need | Only if you keep notes in Obsidian; scope it to the vault folder. | – |
| `claude-seo` [claude-seo](https://github.com/AgriciDaniel/claude-seo) | 26.1k | MIT | Per need | Only for website work; scope it to that project. | – |
| `graphify` [Graphify (codebase knowledge graph)](https://github.com/Graphify-Labs/graphify) | 141.4k | Apache-2.0 | Tried, dropped | Piloted 2026-10-28 on a real app: answers were off-target. code-review-graph's impact check plus reading the files did better. | `code-review-graph` |
| `codebase-memory-mcp` [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | 48.0k | MIT | Tried, dropped | Removed for context cost: its tools and hooks load into every session. The blast-radius job is code-review-graph's CLI; continuity is session-resume. | `code-review-graph`, `session-resume` |
| `superpowers` [superpowers](https://github.com/obra/superpowers) | 311.4k | MIT | Tried, dropped | Removed for context cost; its brainstorming makes you pick an approach before every build. Its best habits are rules here. | `rules` |
| `mem0` [mem0](https://github.com/mem0ai/mem0) | 68.3k | Apache-2.0 | Tried, dropped | Removed for context cost; a small curated markdown memory with an index was enough. | `session-resume`, `log-guard` |
| `caveman` [caveman](https://github.com/JuliusBrussee/caveman) | 117.0k | Apache-2.0 | Skip | Output is about 11% of spend; the Concise output style does this without a proxy, and keeps plain writing. | `concise-output` |
| `ponytail` [ponytail](https://github.com/DietrichGebert/ponytail) | 183.1k | MIT | Skip | The rules' 'smallest change that fully works' line does the same with no plugin. | `rules` |
| `i-have-adhd` [i-have-adhd](https://github.com/ayghri/i-have-adhd) | 59.9k | MIT | Skip | The Concise output style and the rules' 'lead with the answer' already do this. | `concise-output` |
| `context-mode` [context-mode](https://github.com/mksglu/context-mode) | 33.3k | see repo | Skip | Same job as RTK plus Headroom, which we already run. | `rtk`, `headroom` |
| `claude-mem` [claude-mem](https://github.com/thedotmack/claude-mem) | 111.1k | Apache-2.0 | Skip | It would touch at most the ~13% of writes that compaction causes; session logs plus session-resume cover continuity, curated. | `session-resume`, `log-guard` |
| `serena` [serena](https://github.com/oraios/serena) | 31.0k | see repo | Skip | typescript-lsp and pyright-lsp give Claude Code native LSP without the MCP. | `lsp-plugins` |
| `repomix` [repomix](https://github.com/yamadashy/repomix) | 29.1k | MIT | Skip | Claude Code reads files directly, and packing a repo to send elsewhere breaks confidentiality. | – |
| `understand-anything` [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) | 90.0k | MIT | Skip | Same family as Graphify, which answered off-target in our pilot. | `code-review-graph` |
| `open-code-review` [open-code-review (Alibaba)](https://github.com/alibaba/open-code-review) | 49.3k | Apache-2.0 | Skip | claude-security plus /code-review cover our reviews. | `official-dev-plugins` |

Also reviewed and not adopted (2026-11-02):

| Repo | Why not |
|---|---|
| [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | One CLAUDE.md: think first, simplicity, surgical changes, goal-driven. All four are already in the rules. |
| [taste-skill](https://github.com/Leonxlnx/taste-skill), [hallmark](https://github.com/Nutlope/hallmark), [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Overlap impeccable; pick one design skill at most. taste-skill's reference-plus-browser check is the gauntlet loop. |
| spec-kit, OpenSpec, BMAD, gstack, ruflo, ECC, wshobson/agents | Whole processes or harnesses. Their best ideas are taken as small pieces (see [METHODS-2026-11-03.md](METHODS-2026-11-03.md)). |
| optimaizr, graphicle | Overlap `cache-report` and Graphify (see [RESEARCH.md](RESEARCH.md), round 8). |
| [lateral-thinking](https://github.com/danium/lateral-thinking) | Small and useful only when strategy work is stuck; a short prompt list does the same. |
