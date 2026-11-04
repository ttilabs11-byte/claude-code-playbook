# Timing, easing and rhythm

## Easing (all in `K.ease`; CSS values below)
| Job | Curve | cubic-bezier |
|---|---|---|
| Strong entrance (default for films) | entrance / out-quint | .22,1,.36,1 (quint .23,1,.32,1) |
| UI enter/exit (default) | out-quart | .165,.84,.44,1 |
| Gentle | out-quad / out-cubic | .25,.46,.45,.94 / .215,.61,.355,1 |
| Aggressive hero | out-expo | .19,1,.22,1 |
| Unique long tail | out-circ | .075,.82,.165,1 |
| On-screen move or morph (default) | in-out-cubic | .645,.045,.355,1 |
| Strong move, carousel steps | in-out-quart / quint | .77,0,.175,1 / .86,0,.07,1 |
| Snappy swap | in-out-expo | 1,0,0,1 |
| Exits that don't return, anticipation | in-cubic / in-quart | .55,.055,.675,.19 / .895,.03,.685,.22 |
| Camera moves | smootherstep | `x³(x(6x-15)+10)` |
| Progress bars, tickers, spinners | linear | |
Source: richtabor/agent-skills motion-design easing tokens (read 2026-11-04).

## Springs (`K.spring(t, {stiffness, damping, mass})`, closed form, frame exact)
| Preset | Values | Feel |
|---|---|---|
| `overshoot3` | 300 / 26 | ~3% overshoot; wheels, panels, scale-ins |
| `snappy` | 260 / 24 | quick settle, no visible bounce |
| `bouncy` | 180 / 12 | logo pops, playful |
| `gentle` | 90 / 20 | slow settle, rotations |
Remotion equivalents (clean-cut-mcp): smooth {damping 200, stiffness 100}, snappy {100, 200}, bouncy {80, 100,
mass 1.5}, gentle {200, 50}. Use springs for things with mass; never on text baselines.

## Durations
| Thing | Seconds | Frames @30 |
|---|---|---|
| Micro feedback (press, tick) | 0.12 | 4 |
| Small UI (dropdown, toast) | 0.18-0.24 | 5-7 |
| Scene transition quick / standard / smooth | 0.17 / 0.33-0.5 / 0.47-0.67 | 5 / 10-15 / 14-20 |
| Blur swap (Helix) | out 0.25, in 0.35 | 8 / 10 |
| Text entry | 0.33-0.5 | 10-15 |
| Logo reveal | 0.5-0.67 | 15-20 |
| Illustrative move | 0.7-1.2 | 21-36 |
| Hold: minimum / standard / extended | 0.43 / 0.83-1.67 / 2.3+ | 13 / 25-50 / 70+ |
| One idea on screen | 4-5 | |
| Typing | 2-4 frames per character | |
| Draw-on line | 0.5-1 per segment, next starts 0.3-0.5 later | |
Exits 30-40% shorter than their entrance. White flash 5-15 frames. Stagger 2-5 frames (40-80 ms) per item.

## Rhythm
- Fast-pause-hold: a burst of motion, then let the viewer read. Never more than 1.5 s with nothing changing.
- One focus at a time: secondary elements move less, later, or not at all.
- Overlap: next element starts while the previous is 60-80% done (offset, not sequential).
- Contrast pace between sections: 3-4 quick beats, then one slow hero moment.
- Loops: last frame = first frame; check with the SSIM seam test in `ffmpeg-finishing.md`.

## Beat sync
- Get beats: `hyperframes beats <audio>` (HyperFrames CLI) or an onset list; place cuts and hits on beats,
  movement peaks a frame before the hit (anticipation reads as on-beat).
- Grid at tempo B bpm: beat = 60/B s; cut on every 2nd or 4th beat for calm, every beat for energy.
- SFX hits: whoosh starts 4-6 frames before a whip; impact on the exact frame of contact.
- With no music bed, voice and SFX carry the rhythm.
