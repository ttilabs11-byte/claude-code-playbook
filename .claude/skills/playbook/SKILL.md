---
name: playbook
description: Review this person's Claude Code setup against the claude-code-playbook in this repo, explain every difference with pros, cons, cost and a recommendation fitted to how they work, let them choose, then install only what they picked and verify it. Use for /playbook, "review my setup", "set me up", "what's different", "install the playbook" or "update the playbook".
---

# Playbook: review, choose, install, verify

You are helping someone adopt as much or as little of this playbook as suits them. They own their setup: nothing
changes until they have chosen and said yes, and nothing they already have is removed. Run every command from the
repo root (the folder holding `install.mjs`). Never send their files or settings anywhere, and never print secrets.

## 1. Look (read-only)

1. `node --version` must be 18 or newer; if not, say so and stop.
2. `node setup/audit.mjs --json`. It reads `~/.claude` and reports each component in `setup/catalog.json` as
   installed, outdated (older or edited copy of ours), different (their own thing under the same name or key),
   partial, missing or broken; plus what only they have (`yours`) and the tools on the machine.
3. Rules: read `claude/CLAUDE.md` and their `~/.claude/CLAUDE.md`. Compare section by section: the nine framework
   steps, each "Token economy" bullet, each standing rule (the label before its colon), and "Compact
   instructions". Sort each into: they have an equivalent, theirs conflicts (quote theirs, under 15 words), or missing.

## 2. Ask how they work (one AskUserQuestion call, at most 3 questions; skip any the audit already answers)

- Where they use Claude Code: terminal, desktop app, IDE, or a mix.
- How they run sessions: one at a time, several in parallel, or a lead session that coordinates others.
- What they mostly do: code with git and tests, writing and research, or both.

Use the answers to fit each recommendation: `statusline` is terminal-only; `edit-boundary` needs parallel sessions in
one repo; `lead-guard` needs a lead session in the desktop app; `shell-guard`'s ratchet matters with git and tests;
`skill-human-voice` matters for writing; `skill-after-restart` is Windows-only; `smart-compact` pays for long-lived
sessions they leave idle and come back to; `email-shield` matters with a claude.ai login.

## 3. Show the review

Lead with two or three sentences: their setup in one line (counts from the audit, their own extras), and the three
changes that would help them most, with why. Then one table per catalog group, leaving out components they already
have current:

| Component | Yours now | What it does | Pros | Cons | Cost | For you |

- "Yours now" in plain words: older copy, your own version, half set up, not set up, broken.
- Pros, cons and cost come from the catalog; shorten them, don't invent numbers.
- "For you": Recommended, Optional or Skip, with a reason under 10 words tied to their answers.
- A "different" item: say what theirs does and what ours adds; default to keeping theirs unless ours fixes a real gap.
- A "broken" item (a hook pointing at a missing script) is always recommended: it's failing on every call now.
- Rules: list equivalents (count), conflicts (each one) and what's missing.
- Close the review with "Only in your setup": their own hooks, skills, plugins and MCP servers, and that none of it
  will be touched.

## 4. Let them choose (AskUserQuestion, multiSelect)

- One question per group, 2 to 4 options each (split a bigger group). Put recommended options first with
  "(Recommended)" at the end of the label; the description carries the main pro and con.
- Rules is single-select: "Add the full rules block", "Add only sections I pick", "Skip rules". For "sections I
  pick", follow up with multiSelect questions over the missing sections. Write the chosen sections verbatim from
  `claude/CLAUDE.md`, under its own headings, to a temp file and pass it as `--rules-file`.
- Optional tracker rule: only if they want a one-line-per-milestone project log; ask for the file path and pass
  `--tracker <file>`.
- A "different" skill they choose to replace needs `--force-skills` (it only affects the skills in `--only`).
- A "different" setting value is never overwritten by the installer. If they want ours, edit that one key in
  `~/.claude/settings.json` after a backup and their yes.

## 5. Dry run, then apply

1. `node install.mjs --only <ids> [--rules-file <file>] [--tracker <file>] [--force-skills] --dry-run`. Show what
   it will do in plain words (files backed up, hooks added, scripts and skills copied, mods installed).
2. Ask once more with AskUserQuestion: "Apply", "Change my picks", "Cancel". Apply only on "Apply".
3. Run the same command without `--dry-run`. Keep its list of backups for the report.

## 6. Verify

1. `node tests/run-tests.mjs --installed`. Components they left out show as SKIP. A failure in a script they keep
   their own version of is theirs, not a fault: say which.
2. For each mod installed: `claude plugin test mods/<id>`. Mods start working in their next session.
3. `node setup/audit.mjs` again, and show the before and after counts.

## 7. Make it theirs (offer, don't push)

- The rules are written in the first person for one owner. Suggest they put their own preferences in
  `~/.claude/CLAUDE.md` above the playbook block: the block is replaced on every re-install, so edits inside it are lost.
- If they chose `auto-mode-env`, offer to add two or three lines about their world to `autoMode.environment`
  (organisation, protected branches, production services that need their yes).
- `templates/` holds a project CLAUDE.md, session log, spec and glossary to copy into their projects.

## 8. Report

What was installed, the backups the installer made, the test result, and how to undo: restore the `.bak-*` files
next to `CLAUDE.md` and `settings.json`, delete the copied scripts and skills, and `claude plugin uninstall
<id>@playbook-mods` for mods. Re-running `/playbook` later shows what changed in the playbook since.
