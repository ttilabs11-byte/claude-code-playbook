---
name: motion-arsenal
description: The craft arsenal for any video made in code or finished in FFmpeg, for any brand. Transitions (in-page, 58 FFmpeg xfade, 120 bundled gl-transitions), camera moves, kinetic type, UI demo mock-ups, design atmosphere, easing and spring timing, pacing rules, FFmpeg finishing (grain, bloom, halation, aberration, LUTs, speed ramps, motion blur, ducking, loudness, encodes), a brief template for planning a film, and a tested render(t) kit with a demo. Use whenever planning, building, reviewing or finishing a video, trailer, promo, product demo, reel, explainer, title or loop, alongside your brand or project skill and the HyperFrames skills.
---

# Motion arsenal

Techniques, not a look. The brand's own rules (its skill or style guide) decide colours, fonts, music and content. This skill
decides how things move, cut, reveal and finish. Every recipe here was run on Windows 11 with FFmpeg 9.0 on 2026-11-04 unless marked.

## 1. How to use it
1. Plan with the brief template (`references/brief-template.md`): role, task, output format, visual system, timed
   scene list, motion rules, constraints, acceptance criteria. Fill the visual system from the brand, never from an
   example. Every scene names its technique from this skill and its exit transition.
2. Pick techniques per beat from the references (index below). Match energy to purpose: a reception loop wants calm
   push-ins and blur dissolves; a social hook wants a shatter, flash or snap zoom in the first 0.6 s.
3. Build as a pure `render(t)` page (copy `templates/trailer-kit/`) or a HyperFrames composition. Capture with
   a frame capture (Playwright: load `?capture`, call `render(t)` per frame, screenshot `#stage`; average sub-frames for motion blur),
   or HyperFrames render. Finish and encode with FFmpeg.
4. Judge real frames against the acceptance criteria and a named reference (the `gauntlet-loop` skill). Check every transition at its midpoint frame, not only scene holds.

## 2. Core rules (from the best trailer and motion-design work studied)
- Something changes at least every 1.5 s; one focus at a time; elements of the same material move alike.
- Never a hard cut between worlds unless it is a deliberate smash cut. Default: outgoing blurs to ~40 px and fades
  in 0.25 s while incoming sharpens from ~20 px.
- Enter on ease-out (strong: `cubic-bezier(.22,1,.36,1)` or quart), move on ease-in-out, exit on ease-in, exits
  30-40% shorter than entrances. Springs only where things have mass (logos, cards, wheels); overshoot about 3%.
- Text reveals are masked (slides up from behind its own line), staggered per word or digit. Never scale body text;
  scale(0.96) not scale(0) for pop-ins.
- Pure function of time: seeded randomness only, no Date.now or Math.random in a draw, so any frame re-renders
  identically. Respect prefers-reduced-motion in live pages (blur, springs and shatter become fades).
- Camera: one smootherstep curve per move, never chase a moving figure, add depth with parallax layers.

## 3. Index
| Need | File |
|---|---|
| Plan a film, write the brief, scene timing | `references/brief-template.md` |
| Every transition: in-page code, FFmpeg xfade (58), gl-transitions (120), editing cuts | `references/transitions.md` |
| Camera moves, parallax, dolly zoom, rack focus, shake, handheld | `references/camera.md` |
| Kinetic type, counters, UI demo mock-ups, atmosphere, layout and style families | `references/type-and-design.md` |
| Easing tables, springs, durations in frames, rhythm, beat sync | `references/timing-easing.md` |
| FFmpeg finishing, audio, encodes, loop and QA checks (all tested) | `references/ffmpeg-finishing.md` |

## 4. Kit (`templates/trailer-kit/`, tested 2026-11-04)
- `kit.js`, global `K`: bezier easing set, closed-form `spring`, `key` keyframe tracks, seeded `rng`/`noise1`/`fbm`,
  `set` transforms, `revealWords` masked reveal, `rollDigits` counter, `typed`/`streamed`/`caret`, `blurSwap`,
  `zoomThrough`, `iris`, `softWipe`, `shatter`, `shock`, `flash`, `handheld`, `shake`, `grainSeed`, `carousel`,
  `boot` (preview loop, space pauses; a capture calls `render(t)` directly).
- `demo.html`: 12 s demo of the kit (shatter hook, spring wheel, digit roll, masked title, world switch, 3D carousel,
  spring logo). All colours and fonts sit in one `:root` THEME block; swap them per brand.
- `glt.js` + `glt-lib.js`: run any of 120 gl-transitions between two canvases, images or videos on WebGL.
  `glt-test.html?name=CrossZoom` for one, `?all` for a contact grid of all 120 (all compiled, 0 failures).
- Render: a frame capture (Playwright: load `?capture`, call `render(t)` per frame, screenshot `#stage`; average sub-frames for motion blur). The page exposes `#stage`, `window.FONT`, `DURATION`, `render(t)`; `?capture` stops the preview loop.

## 5. Pitfalls
- CSS `var()` does not work in SVG presentation attributes (`fill=`, `stroke=`); use `style="fill:var(--x)"`.
- A capture should wait on `document.fonts.check(window.FONT)`; set `window.FONT` to a font the page really loads, and
  list later fonts in `window.FONTS`.
- WebGL output for capture needs `preserveDrawingBuffer: true`; upload textures with `UNPACK_FLIP_Y_WEBGL`.
- FFmpeg custom xfade: `P` runs from 1 to 0 (A at P=1). `-loop 1` works on images only, not videos.
- `zoompan` jitters on small sources; upscale first (`scale=3840:-1`) or do Ken Burns in `render(t)`.
- Blur over ~40 px on full-frame layers is slow in a browser; for capture it is fine, for live pages keep ≤20 px.

## 6. Sources (read 2026-11-04)
Helix code-trailer brief (user-supplied prompt, a worked example of the brief shape, not a style to copy);
richtabor/agent-skills motion-design (easing and duration tokens); endlessblink/clean-cut-mcp Remotion trailer
breakdown (frame counts, springs); editframe motion-design skill (exit timing, focus); gl-transitions.com
(unpkg gl-transitions@1, 125 shaders, 123 MIT, 1 BSD-2, 1 BSD-3; licence and author kept per entry in
`glt-lib.js`); FFmpeg 9.0 docs (xfade, filters). Add new sources here with date when the skill grows.
