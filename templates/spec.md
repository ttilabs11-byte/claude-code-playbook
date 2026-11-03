# <Feature> spec

Status: draft | clarified | building | done (YYYY-MM-DD)
Copy to `<repo>/specs/<feature>.md` before coding. One page. Update it in the same commit as any change of direction.
Use the words in the repo's `GLOSSARY.md` (if it has one) for every domain term; add new terms there, not here.

## Goal
- One or two lines: what changes for whom, and the bar it's measured against.

## Clarify (before coding)
At most 5 questions, only where a wrong guess would waste real work. Write each answer here, then set Status to
clarified. Anything still open is an assumption, marked as one.
- Q: … A: …

## Acceptance criteria
Each one testable; the tests are written from these.
- [ ] Given <state>, when <action>, then <result>.

Check the list before building: every criterion is testable (a test could fail it), quantified where a number
applies (time, size, count, limit), and covers the edge cases (empty, too many, wrong input, no network, no rights).

## Out of scope
- What this change deliberately does not do.

## Affected places
- Files, modules, tables, routes and callers this touches (from the project's code map or a grep for callers).

## Tasks
- [ ] Small, checkable steps in order.

## Before done
- [ ] Every criterion maps to a test that passes now (name the test next to the criterion); no test without a criterion.
- [ ] The spec matches what shipped: fold any change of direction in, set Status to done with the date, and move
      lasting behaviour into the project's living docs (README, CODEMAP, GLOSSARY).
