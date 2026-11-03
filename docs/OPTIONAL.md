# Optional tools

None of these are needed for the setup to work. Each one was used daily alongside it. Install only what you'll use:
every plugin and personal skill adds to every session's context.

## Token savers

### RTK (command output compression)

- What: rewrites shell commands so their output comes back compressed (long listings, logs and test output are
  shortened, errors kept). `rtk gain` shows what it saved.
- Source: [github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk). On Windows: `winget install rtk-ai.rtk`. Tested with
  0.51.0.
- Watch out: another project on crates.io is also called `rtk` (reachingforthejack/rtk, a Rust type kit). Make sure
  `rtk --version` shows the rtk-ai tool.
- Wiring: re-run `node install.mjs` after installing RTK; it adds `rtk hook claude` after `shell-guard`. RTK's
  rewrites slip past ask rules; shell-guard covers that, see [SETTINGS.md](SETTINGS.md#hooks).

### Headroom (context compression proxy)

- What: a local proxy that compresses requests between Claude Code and the API. Works for terminal sessions that
  point `ANTHROPIC_BASE_URL` at it (`http://127.0.0.1:8787`); the desktop app talks to the API directly.
- Source: plugin marketplace [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom) (formerly chopratejas/headroom). In Claude Code:
  `/plugin marketplace add headroomlabs-ai/headroom`, then install the `headroom` plugin. Tested with 0.40.0.
- Check it keeps your cache: a proxy that strips Claude Code's `cache_control` markers bills the whole conversation
  as uncached on every turn, and one that drops the `anthropic-beta` header loses the one-hour TTL. In a terminal that
  uses the proxy, run `claude -p "hello" --output-format json` and read `usage.cache_creation`:
  `ephemeral_1h_input_tokens` above zero means both survive. `cache-report.py` shows the same as "1 h TTL on N% of
  writes".

### Measuring

`python ~/.claude/scripts/cache-report.py` (installed by this setup) prints your prompt-cache hit rate, what caused
cache rewrites and which sessions cost the most. Run it before and after a change to see whether it helped. A healthy
setup sits around 95% or higher.

## Plugins

From the official marketplace (`/plugin`):

- `typescript-lsp`: type-aware code navigation for TypeScript projects.
- `hyperframes`: HTML-based video and motion graphics, rendered to MP4.

From other marketplaces:

- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills): Obsidian notes, bases and canvases, if you keep
  notes in Obsidian.
- [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo): SEO audits and plans.

## Third-party skills

Installed into `~/.claude/skills` from their own projects; not copied here because they're someone else's work.

- [tt-a1i/archify](https://github.com/tt-a1i/archify): architecture, workflow and sequence diagrams as standalone HTML.
- `impeccable` (Apache 2.0, `npx impeccable`): front-end design critique and polish.
- `officecli` ([officecli.ai](https://officecli.ai)): create and edit .docx, .xlsx and .pptx from the command line.

## What's deliberately not here

- Skills for one business (brand rules, client pipelines, social accounts). Build your own with the learning loop;
  `anthropic-skills:skill-creator` helps.
- Any MCP server credentials, account IDs or tokens.
