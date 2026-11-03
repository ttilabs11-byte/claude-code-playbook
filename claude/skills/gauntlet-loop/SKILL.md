---
name: gauntlet-loop
description: >
  Gauntlet Loop: hold work to a real, named reference ("the bar") with builder and blind-critic pairs, and loop until
  the critic picks ours over the bar in a blind A/B. Two modes: write one short paste-ready gauntlet prompt for a fresh
  session, or run the loop here. User-invoked only (/gauntlet-loop), because it fans out subagents and costs tokens.
disable-model-invocation: true
---

# Gauntlet Loop

Matt Shumer's technique, named while building Claude of Duty (github.com/mshumer/Claude-of-Duty). Adapted from
robonuggets/gauntlet-loop (CC BY 4.0). Changes: a run-here mode, cost and model rules, and the lessons
from the Claude of Duty write-up.

Most agent output stops at "good enough" because nothing holds it to a standard. A gauntlet gives it a standard it
can't argue with: something real that already exists, which a fresh critic puts next to ours with the labels
stripped, and picks.

## Step 1: set the bar (always, in both modes)

If the user named a reference, use it. Otherwise offer two or three candidate bars, one line each, and stop until they
pick. Every bar must pass three tests:

- **Named**: a specific thing, not a category. "Stripe's pricing page", not "award-winning SaaS sites".
- **Fetchable**: the critic can actually get it: screenshot the live page, read the piece, run the binary, open the
  repo. A bar the agent can't obtain gets hallucinated, and then the critic approves everything.
- **Comparable**: both sit side by side and a judge can pick one. If you can't picture the A/B, it isn't a bar.

| Goal | Bar that works |
|---|---|
| Website, app, UI | A best-in-class product's live screen, captured at the same viewport (here: 390 and 1440, light and dark) |
| Writing | A named author's published piece, same length and format |
| Code, tooling | A named repo's implementation plus its benchmark or test suite |
| Research, analysis | A named analyst report or a paper's methods section |
| Deck, doc, report | A real artifact from a firm known for it, same page count |

Prefer the hardest bar the agent can genuinely reach; an easy bar exits on round one. When the goal has a measurable
half (load time, p95 latency, pass rate, bundle size, word count), name it next to the reference. Taste plus a number
beats taste alone.

## Mode A: write the prompt (default)

One block, paste-ready, 120 to 180 words, plain sentences, no headings or bullets inside it, nothing after it except
the line "I can run this here."

```
Build [GOAL].

The bar is [BAR]. Get the real thing first and compare against it directly, not against a description of it.

Break this into the smallest pieces that can be improved and judged on their own. For each piece, fan out a builder
and a separate critic with fresh context. The critic inspects the actual output, puts it next to the bar blind with
the labels stripped, says which one is better, and names the single biggest remaining gap. Then it goes back to the
builder.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

Fill the brackets and keep the last line. Add a budget line only if the user named one. Add tool names only when the
goal needs them (a browser, image generation, a deploy target). Leave out architecture, file layout, decomposition,
round counts and stack choices: the running agent decides those better than a spec written before the work starts.
For an agent other than Claude Code, replace the last two lines with: "Keep looping until the critic picks ours. Run
the builders and critics as parallel subagents."

## Mode B: run it here (only when the user says so)

The user invoking this skill and asking to run it is their opt-in to subagents for this run. That overrides the
"no subagents by default" rule for this run only. Pass `model: "opus"` to every agent.

1. **Fetch the bar first.** Capture or download it before building anything, and keep the capture as a file the critic
   opens. For UI, use the project's Playwright scripts to capture both ours and the bar at the same viewports. Never
   type passwords into a browser.
1b. **Goldfish the plan before building** (from Google's Elephant-Goldfish Model, Apache-2.0). This session is the
   elephant: it holds the context and writes a short plan (goal, bar, pieces, files or scenes, done criteria). A fresh
   agent that sees only the plan and the real files, never this conversation, explains it back in its own words. If
   its explanation differs from the intent, the plan is ambiguous: fix the plan, not the reader. Then one hostile
   fresh reader lists hidden assumptions and edge cases, and a last one answers GO or NO-GO on whether every piece
   names concrete files, values and checks. Build only on GO. Skip this for small one-shot fixes.
2. **Split by coupling, not by file.** Small pieces that can be judged alone get a builder and critic pair each, and
   can run in parallel. Concerns that share state (lighting with tonemapping, layout with type scale, schema with
   queries) get one sequential owner. In Claude of Duty, parallel owners of coupled subsystems kept breaking each
   other's assumptions: three parallel rounds moved the score +0.46 and raised defects 60 to 66, while one sequential
   pass moved it +1.00 and cut defects 66 to 26.
3. **Critic contract.** A fresh agent that never sees the builder's reasoning. It opens the real output and the bar,
   labels stripped and order randomised, and returns exactly: `PICK: A|B`, `BIGGEST GAP: <one concrete, measurable
   defect>`, `EVIDENCE: <file, screenshot or number>`. Binary picks, not scores out of 10, because scores drift upward.
4. **Make comparisons reproducible.** Capture each sample in a fresh page or process with a fixed budget. Two runs of
   the same build must compare identically, or the critic is judging noise. Report distributions (p50, p95, p99), not
   medians: a median hid 700 ms stalls in Claude of Duty.
5. **Treat the critic's gap as a symptom.** Measure before fixing. Claude of Duty's critics called the weapon
   "untextured" for three rounds; it was really specular-dominated, and the right fix was the opposite of what was
   asked. A builder may contradict its brief when the measurement says so.
6. **Loop.** Builder fixes the biggest gap, critic re-judges blind. Exit only when the critic picks ours, or when the
   user stops the run. Never stop at a fixed round count. After each round, post one progress line in chat (piece,
   pick, gap, tokens so far) so the user can act as the brake.
7. **Finish properly.** The winning work still goes through the project's definition of done: tests, /verify, the
   Reviewer, and a commit.

## Metric mode (when the bar is a number)

Use this when "better" is one number a command can print: Lighthouse score, test pass count, render or build time,
bundle or file size, error count, cache hit rate. A number needs no critic, so it runs solo, with no subagents. The
idea comes from uditgoenka/autoresearch (MIT), which takes it from Karpathy's autoresearch.

1. **Set it up once.** Write down the metric, its direction (up or down), the target, and the verify command that
   prints it. Also write the scope: which files may change. Run the command twice on the untouched work. If the two
   runs differ by more than the gain you hope for, fix the measurement first (fixed budget, fresh process, median of 3).
2. **Loop.** Make one change. Run verify. If the number improved and nothing else broke, commit it. If not, undo it
   with `git restore`/`git revert`, or by restoring the copy. Log one TSV row per try
   (`try, change, metric, kept`) in the session folder.
3. **Stop** at the target, at the iteration cap (default 15, or what the user sets), or after 5 tries in a row with
   no gain. That last one is a plateau: rethink the approach, don't keep nudging. Report the start number, the final
   number, how many tries were kept, and the log path.
4. **Guard against gaming.** The metric may not be bought by lowering the bar (`ratchet.mjs` runs on every commit),
   by narrowing what is measured, or by editing the verify command. A change that does any of these is discarded,
   whatever the number says.

## What breaks a gauntlet

- A vague bar: the critic invents a comparison and approves everything. By far the most common failure.
- An ambiguous plan: rounds get spent rediscovering intent that a fresh reader would have flagged before building.
- The builder judging its own work: the critic needs fresh context and no idea how hard the builder tried.
- A soft critic: give it a binary job, not a score.
- A fixed round count: the exit is winning, or the user calling it.
- Non-reproducible captures: the critic ends up judging noise between runs instead of the work.
