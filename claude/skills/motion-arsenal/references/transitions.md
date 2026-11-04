# Transitions

Choose by meaning: a transition says how two shots relate. Continuation → match cut or zoom-through; time passing →
dissolve; contrast → smash cut; new chapter → wipe or iris; energy → whip, flash or glitch. Check every transition
at its midpoint frame: no blank frame, no colour shift, no clipped element.

## 1. Editing cuts (no effect, all grammar)
| Cut | Use |
|---|---|
| Hard cut on action | cut mid-movement so the motion hides the cut |
| Match cut (shape, motion, colour) | circle → circle, swipe → swipe; the strongest continuous link |
| J-cut / L-cut | next sound starts before (J) or carries after (L) the picture change |
| Smash cut | quiet → loud with no sound bridge; for contrast and comedy |
| Jump cut | same framing, time skips; energy in talking heads |
| Cutaway / insert | detail shot to hide an edit or show proof |
| Hidden cut | pass behind a foreground object or a whip to join two takes |
| Cut on the beat | picture changes on the music or SFX hit (beat grid in `timing-easing.md`) |

## 2. In-page code transitions (kit.js names in brackets)
| Transition | Recipe | Feel |
|---|---|---|
| Blur cross-dissolve (`blurSwap`) | out: blur 0→40 px, opacity 1→0 over 0.25 s ease-in; in: blur 20→0, opacity 0→1 over 0.35 s ease-out | premium default |
| Blur-scale pulse | whole stage scale 1→1.04→1 and blur 0→12→0 around a theme swap at peak | variants, theme morph |
| Zoom-through (`zoomThrough`) | out scales 1→3.2 ease-in with fade; in scales 0.8→1 ease-out expo; add 8-16 px blur at peak | "go inside", life→lab |
| Masked wipe (`softWipe`) | `mask-image` linear gradient with a 12% soft edge, angle per direction | chapter change |
| Iris (`iris`) | `clip-path: circle(r at x y)` grows from a meaningful point (a logo dot, a button) | reveal from an object |
| Shape mask reveal | incoming inside a brand shape (arch, circle, card) that scales to full frame | brand moment |
| Shatter (`shatter` + `shock` + `flash`) | old element splits into seeded shards flying out with rotation and blur; white ring expands; flash peaks ~0.7; new element springs 0.6→1 | hook, break |
| White flash | 2-4 frames to white, 6-10 frames back; place on a hit | palette cleanser, energy |
| Whip pan | outgoing translates fast (≥200 px/frame) with directional blur, incoming arrives from the opposite side, hidden join at peak blur | speed |
| Slide push | both move together: out x 0→-1920 scale 1→0.9, in from +1920, 15 frames | sequence, steps |
| Card stack | incoming card rises over outgoing which scales to 0.92 and darkens 30% | UI, lists |
| Magic move / shared element | same object keeps identity across scenes, interpolates position, size and radius | continuity |
| Morph | SVG path or blob interpolates between shapes (equal point counts) | abstract ideas |
| Luma / gradient dissolve | incoming revealed by brightness of a noise or gradient texture rising | organic |
| Light leak / burn | warm gradient screen-blended over the cut, peak at the join | film, nostalgia |
| Glitch | 2-4 frames: RGB split 6-20 px, slice offsets, posterise; then clean | tech, error |
| Pixelate / mosaic | block size up, swap at peak, block size down | digital |
| Depth of field rack | outgoing blurs as focus pulls to a foreground element that becomes the next scene | cinematic |
| Liquid / displacement | displacement map strength 0→peak→0, swap at peak | fluid, premium |
| Page curl / fold / cube | 3D CSS or gl-transitions (`InvertedPageCurl`, `cube`, `doorway`) | use sparingly |

## 3. FFmpeg xfade (58 built in, FFmpeg 9.0; tested 2026-11-04)
`ffmpeg -i a.mp4 -i b.mp4 -filter_complex "xfade=transition=NAME:duration=0.6:offset=<a_len-0.6>" out.mp4`
Chain: offset of each next xfade = previous output length - duration. Audio: `acrossfade=d=0.6`.
- Premium: `fade`, `dissolve`, `smoothleft/right/up/down`, `hblur`, `fadeblack`, `fadewhite`, `fadegrays`,
  `zoomin`, `fadefast`, `fadeslow`, `circleopen`, `circleclose`, `distance`.
- Directional: `wipeleft/right/up/down`, `wipetl/tr/bl/br`, `slideleft/right/up/down`, `coverleft/right/up/down`,
  `revealleft/right/up/down`, `diagtl/tr/bl/br`, `squeezeh`, `squeezev`.
- Shapes: `circlecrop`, `rectcrop`, `radial`, `vertopen`, `vertclose`, `horzopen`, `horzclose`.
- Textural: `pixelize`, `hlslice`, `hrslice`, `vuslice`, `vdslice`, `hlwind`, `hrwind`, `vuwind`, `vdwind`.
- Custom: `transition=custom:expr='...'` with `A`, `B`, `X`, `Y`, `W`, `H`, `P` (P runs 1→0; A shows at P=1).
  Wavy wipe (tested): `expr='if(gt(P*1.2-0.1+0.1*sin(Y/20),X/W),A,B)'`.
- GPU variants exist (`xfade_opencl`, `xfade_vulkan`) for long 4K chains.

## 4. gl-transitions (120 bundled in `templates/trailer-kit/glt-lib.js`, all compile, tested 2026-11-04)
`const g = GLT(canvas); g.draw("CrossZoom", fromCanvas, toCanvas, p, { strength: 0.4 })`. Sources may be canvases,
images or playing videos; call every frame. Params and defaults per entry (`GLT_LIB[name].defaults`).
- Premium picks: `CrossZoom`, `Dreamy`, `DreamyZoom`, `LinearBlur`, `DefocusBlur`, `directionalwarp`,
  `directional-easing`, `crosswarp`, `ripple`, `WaterDrop`, `morph`, `luminance_melt`, `perlin`, `fadecolor`,
  `fadegrayscale`, `Overexposure`, `FilmBurn`, `ZoomInCircles`, `SimpleZoom`, `rotate_scale_fade`, `swap`,
  `tangentMotionBlur`, `colorphase`, `wind`, `squareswire`.
- Energy: `GlitchMemories`, `GlitchDisplace`, `StripDatamoshGlitch`, `parametric_glitch`, `TVStatic`,
  `old_tv_lost_signal`, `Bounce`, `Swirl`, `kaleidoscope`, `pinwheel`, `hexagonalize`, `PolkaDotsCurtain`.
- 3D: `cube`, `doorway`, `InvertedPageCurl`, `BookFlip`, `GridFlip`, `Rolls`, `Fold`, `StereoViewer`.
- Dropped from the bundle: `StarWipe`, `heart`, `cannabisleaf` (symbol-sensitive audiences); `displacement`, `luma` (need extra
  textures). Check `kaleidoscope`/`powerKaleido` frames for star-like symmetry before using with symbol-sensitive audiences.
- In FFmpeg instead: render both clips' frames into a page with `glt.js`, or use an FFmpeg build with the
  gltransition filter (not in this build).

## 5. Pairing guide
| Film | Default | Accent (max 2-3 per film) |
|---|---|---|
| Reception loop, brand film | blur dissolve, push-in match cuts | zoom-through into the lab, iris from logo |
| Lab method explainer | cut on action, insert shots, wipes on steps | zoom-through, rack focus |
| Product or app trailer | blur swap, card stack, magic move | shatter hook, snap zoom, carousel |
| Social reel (9:16) | hard cuts on beat, slide push | flash, whip, glitch on the hook |
| Event or photo film | dissolves, light leak | Ken Burns parallax, white flash on the title |
