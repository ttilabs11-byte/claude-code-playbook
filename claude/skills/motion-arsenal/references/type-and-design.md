# Type, UI mock-ups and design atmosphere

The look always comes from the brand. These are the structures to fill with it.

## 1. Kinetic type
| Technique | Recipe | Kit |
|---|---|---|
| Masked word slide | each word in an `overflow:hidden` span, translateY 105%→0, stagger 40-80 ms, 0.5 s ease-out | `revealWords` |
| Masked line roll (label swap) | old line exits up, new enters from below in the same mask, 0.35-0.4 s | `revealWords` with `out` |
| Rolling digits | each digit a 0-9 column in a mask, translateY to the digit, 40 ms stagger per digit | `rollDigits` |
| Count-up | number tweens with ease-out; format with fixed width (tabular figures) so it doesn't jitter | `K.mix` + `font-variant-numeric: tabular-nums` |
| Typewriter | 10-15 characters/s plus a 1 Hz caret; 2-4 frames per character at 30 fps | `typed`, `caret` |
| Streamed AI answer | 8-12 words/s, fade the last word in over 80 ms | `streamed` |
| Scramble / decode | random glyphs settle left to right, seeded, 0.6-1 s | `K.rng` |
| Underline draw | `scaleX` 0→1 from the left, 0.6 s ease-in-out; exits from the right | demo title |
| Highlight sweep | marker block scaleX behind words, then the text colour flips | |
| Word-by-word captions | active word gets colour or weight change; at most 2 lines at the bottom | |
| Variable-font animation | animate `font-variation-settings` weight or width on emphasis words | needs a variable font |
| Big-type layout | single word 300-500 px, cropped by the frame edge, slides across | statements |
| 3D type | text on a `perspective` wrapper rotating 10-20°, or extruded in Three.js | titles |
| Split-flap | each character a flap that flips through glyphs to its target, staggered | `K.rng` |

Type rules: display face 700-800 with tight tracking (-2% to -4%); UI text 400-600; captions ≥50 px at 1080p; never
scale or blur body text mid-read; read time ≈ 0.3 s per word plus 0.5 s.

## 2. UI demo mock-ups (product films, app demos)
- Build the UI in HTML/CSS, not screenshots, so it stays crisp under the virtual camera.
- Panels: dark or light surface, 12-20 px radius, 1 px border, footer key hints, soft drop shadow (0 40px 80px, 20-25%).
- Cursor: SVG arrow on a bezier path with ease-in-out, 0.6-1 s per move; overshoot a few px and settle; click =
  scale 0.9 for 80 ms plus a ripple ring (radius 0→40 px, opacity 0.4→0).
- Key press: keycap darkens and drops 2 px; glow in the accent colour 0→1→0.4.
- Toast: rises 16 px with fade, 0.3 s ease-out, holds 1.5 s, exits faster; success = green tick drawn by stroke-dashoffset.
- Lists: items stagger in 40-60 ms apart; selection bar slides (magic move) rather than jumping.
- Phone frames for 9:16: real device proportions, status bar, notch; never a real brand's device trademark.
- Data: real numbers only (brand facts); charts draw on with stroke-dashoffset, bars grow from the baseline.

## 3. Showcase devices
- 3D carousel (`K.carousel`): `perspective` 1600 px, cards gap ~560 px, sides rotateY ±25°, pushed back 260 px,
  blurred 6 px, one step per ~0.9 s with ease-in-out quart, label below rolls on each step.
- Constellation: 12-20 names scattered (seeded positions, no overlaps), random subsets light up in waves every 0.5 s.
- Bento grid: tiles fly in staggered, then the camera pushes into one tile which becomes the next scene.
- Device stack or fan: 3 screens fanned with rotate ±6°, the middle rises.
- Before / after: split line wipes across.
- Exploded view: parts separate along an axis with staggered springs, labels draw leader lines.

## 4. Atmosphere and finish (all cheap in code)
- Two worlds: one saturated brand colour, one light neutral; switch with a blur swap to mark a chapter change.
- Drifting blurred shapes: 2-4 large circles, blur 120-160 px, moving on fbm noise at 0.3-0.4× speed.
- Grain: SVG `feTurbulence` (fractalNoise, baseFrequency 0.8-0.9) at 6-10% overlay, re-seeded at 24 fps
  (`K.grainSeed`); or FFmpeg `noise` in finishing.
- Vignette: radial gradient to 10-20% darker edges; or FFmpeg `vignette=PI/5`.
- Light: soft top-left key, glow on accents (`box-shadow` or FFmpeg bloom), sheen sweep across cards once.
- Glass: `backdrop-filter: blur(16-24px) saturate(140%)`, 1 px inner highlight, 8-12% white fill.
- Depth: shadows grow and soften with height; contact shadows under objects.

## 5. Style families (pick one per film, from the brand)
| Family | Traits | Fits |
|---|---|---|
| Apple-style minimal | huge type, lots of space, slow push-ins, blur dissolves | brand films, launches |
| Product-tech trailer | dark UI panels, rolling counters, carousels, fast blur swaps | app or AI product demos |
| Editorial / magazine | serif headlines, grid, photo crops, paper texture | reports, recaps |
| Kinetic typographic | type is the image, beat-cut, bold colour fields | social reels, muted autoplay |
| Isometric / diagram | technical drawings, line draw-on, exploded views | lab methods, processes |
| Documentary | real photos, Ken Burns parallax, handheld drift, lower thirds | events, people stories |
| 3D product | Three.js or Blender, studio light, orbit and macro | hero objects |
| Collage / cut-paper | torn edges, stop-motion steps at 12 fps, grain | playful, cultural |

## 6. Layout and composition
- Grid: 12 columns, 96-120 px outer margin at 1080p; align every element to it.
- Hierarchy: one hero per frame; size ratio between title and body ≥3:1.
- Colour: 60-30-10 (base, secondary, accent); accent only on what matters now.
- Contrast: text ≥4.5:1 against its background, check over moving backgrounds at the worst frame.
