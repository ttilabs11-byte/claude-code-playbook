# email-shield

Claude Code puts the claude.ai account email into every conversation (anthropics/claude-code#81138, open as of 2026-11-01).
This mod removes it before the model reads it: it drops the `userEmail` block from `prompt.context` and strips the
email section from any `prompt.attachment`. As a backstop it denies any tool call outside the local file tools (Read,
Glob, Grep, Edit, Write, NotebookEdit) whose input contains the address from `~/.claude.json` → `oauthAccount.emailAddress`.
Tests: `claude plugin test email-shield` (3 tests). Remove it once Anthropic ships an off switch.
