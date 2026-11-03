# Interactive setup spec

Status: built 2026-11-03; one open item: a full /playbook run in a fresh session (the trial was blocked by an expired CLI login)

## Goal
- Anyone who clones the playbook types `/playbook` in Claude Code and gets a review of their own setup against this
  one: what they already have, what differs, what is missing, each with pros, cons and cost, a recommendation fitted
  to how they work, and a choice. Only what they pick gets installed, then verified.
- Bar: Anthropic's `claude-automation-recommender` (reads your setup, recommends hooks, skills, MCP) for the review,
  and chezmoi's `diff` before `apply` for the install. Ours adds the choice per component and a test run after.

## Acceptance criteria
- [x] `node setup/audit.mjs` reads only local files and prints, for every catalog component, one status: installed,
      outdated, different (the user has their own version), partial, missing or broken. `--json` gives the same as JSON.
- [x] The audit also lists what the user has that the playbook doesn't: their own hooks, skills, enabled plugins, MCP
      server names, CLAUDE.md size, and the tools on the machine (node, python, git, rtk, claude version). It never
      prints secrets or the account email.
- [x] `node install.mjs --only <id,id>` installs exactly those components and nothing else; an unknown id exits 1
      before changing anything. `--rules-file <file>` installs a trimmed rules block. With no `--only`, the install is
      the same as before (every default component).
- [x] Every script, skill, hook, env key and setting in the repo belongs to exactly one catalog component (a test
      fails otherwise), so the catalog can't drift from what ships.
- [x] `tests/run-tests.mjs --installed` skips checks for scripts that aren't installed instead of failing them.
- [x] (2026-11-03) Every own component has `source` and `replaces`; 24 third-party tools (plugins, skills, MCP
      servers, CLIs) carry url, licence, stars, verdict, why, detect, install and `replacedBy`. The audit detects them
      (plugin, user or project MCP, skill, CLI on PATH; disabled = partial); `install.mjs --only <third-party id>`
      exits 1 with the install command; `docs/SOURCES.md` lists every component (tests enforce all of this).
- [x] The `/playbook` skill runs the audit, compares the user's rules with ours section by section, asks at most 3
      questions about how they work, shows the review, lets them pick per group, shows a dry run, applies only after
      a final yes, runs the tests and reports backups and how to undo.

## Out of scope
- An uninstaller (backups plus the README's manual steps cover it).
- Syncing this public repo with its private source.

## Affected places
- New: `setup/catalog.json`, `setup/audit.mjs`, `.claude/skills/playbook/SKILL.md`, `CLAUDE.md` (repo root, pointer).
- Changed: `install.mjs` (catalog-driven `--only`, `--rules-file`, opt-in hooks and mods), `tests/run-tests.mjs`,
  `claude/settings.template.json` (compact window 300000 to match docs), `mods/.claude-plugin/marketplace.json`,
  `README.md`, `docs/SETTINGS.md`.

## Tasks
- [x] catalog.json with every component, its parts, pros, cons, cost, default
- [x] audit.mjs + tests on a fake home (empty, partial, outdated, different, foreign hook)
- [x] install.mjs `--only` / `--rules-file` / unknown id + tests; default install unchanged
- [x] tests `--installed` skip; catalog coverage test
- [x] /playbook skill + repo CLAUDE.md pointer
- [x] README quick start, SETTINGS; run all tests; push

## Before done
- [x] Every criterion maps to a passing test or a run shown in the session log.
- [x] Status set to done with the date.
