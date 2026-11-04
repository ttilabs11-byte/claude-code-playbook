# Brief template: plan any film before building

A brief that a builder (you, a fresh session, or a model) can execute without questions. Eight blocks, in order.
Studied from the Helix code-trailer prompt (2026-11-04): what made it work is that every block is checkable.

## The eight blocks
1. **Role**: who builds it, at what bar ("senior motion designer and front-end engineer; Apple and Linear launch
   films are the bar"). Name a real reference film.
2. **Task**: one sentence: what film, for whom, how long, where it plays (lobby screen, LinkedIn feed, website hero).
3. **Output format**: file type and size (1920×1080 or 1080×1920), the clock (`render(t)` pure function), loop or not,
   controls for live pages (space = pause, arrows = scene skip), libraries allowed, fps target, reduced-motion fallback.
4. **Visual system**: worlds (usually two contrasting backgrounds, e.g. brand colour and light neutral), atmosphere
   (grain %, drifting blurred shapes, vignette), type pair (display weight and tracking, UI text), component specs
   (radius, border, panel colour, icon stroke). **Fill from the brand's rules**; never reuse an example's palette.
5. **Scenes**: a numbered table, each row with start-end seconds, what is on screen, the technique, and the exit
   transition. First 0.6 s is the hook. Last scene is the end card (logo, title, one line, call to action).
6. **Motion rules**: easing (enter, move, exit), transition default, text-reveal rule, spring amount, maximum time
   with nothing changing, what never scales or moves.
7. **Constraints**: copy is fixed (use only given text), no real logos or trademarks of others, your house rules
   (content, symbols and audio you never use).
8. **Acceptance criteria**: checkable lines: total length ±0.1 s, every scene present at its time, no console
   errors, loop seam invisible, captions ≥50 px at 1080p, 60 fps preview, every transition has no blank frame.

## Scene-timing pattern for a 30-50 s trailer (the Helix rhythm, generalised)
| Beat | Share | Purpose | Typical techniques |
|---|---|---|---|
| Hook | 0-0.6 s | stop the scroll | shatter + shockwave + flash, snap zoom, smash cut on a sound hit |
| Proof in numbers | ~15% | show scale fast | rolling-digit counter, selection jumps, items unfolding |
| Title | ~5% | name the thing | background blurs, masked word slide, underline draw |
| How you start | ~3% | the gesture or entry | key glow, button press, light-world switch |
| In use | ~35% | real workflow | mock UI, typing, streamed answer, toast, cursor path, virtual camera 1→1.15 |
| Variants | ~10% | options or looks | theme morph with blur-scale pulse every 1.5 s |
| Breadth | ~10% | "it does a lot" | constellation of names lighting up in waves |
| Showcase | ~13% | hero shots | 3D carousel, one card per ~0.9 s, label roll |
| End card | ~10% | action | blur to brand world, spring logo pop, title, tagline, pill button, settle to 60% |

For a lab or explainer film swap the middle beats for: problem → method → evidence → result. For a 9:16 reel,
put the hook and the claim in the first 2 s and keep captions in the lower-middle safe zone.

## Writing the brief
- Use exact numbers (px, s, %, hex), never "subtle" or "smooth".
- One technique per beat; name its exit.
- Put the acceptance criteria in a list the review step will tick.
