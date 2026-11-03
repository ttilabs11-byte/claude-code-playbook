# claude-code-playbook

This repo is a Claude Code setup people adopt piece by piece. When someone wants to review, compare, install or update
it, use the `playbook` skill (`/playbook`): audit first (`node setup/audit.mjs`), explain, let them choose, dry-run,
apply only after their yes, then verify. Never install anything they didn't pick.

Working on the repo itself: every script, skill, hook and setting belongs to one component in `setup/catalog.json`
(a test enforces it). Run `node tests/run-tests.mjs` before committing.
