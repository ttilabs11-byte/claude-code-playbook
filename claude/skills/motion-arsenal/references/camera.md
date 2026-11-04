# Camera

In code the "camera" is a transform on a stage wrapper (2D/2.5D) or a real camera (Three.js, Blender). Rules: one
smootherstep (or ease-in-out) curve per move, start and end at rest, never follow a moving figure, at most one camera
move per shot plus optional drift. Depth comes from parallax, not zoom.

## Moves
| Move | Code recipe | Use |
|---|---|---|
| Push-in | scale 1→1.08-1.15 over the whole shot, `ease.smoother` | attention, "in use" UI scenes |
| Pull-back reveal | scale 1.4→1 ending on the wide; hide detail first | context, scale, end of a sequence |
| Pan / truck | translateX on the wrapper, layers move by parallax factor | survey a row, a lab bench |
| Pedestal / crane | translateY plus slight scale, foreground faster than background | reveal from below, hero height |
| Orbit | 3D: rotate camera around target; 2.5D: rotateY on a `perspective` wrapper ±8-15° | product hero |
| Dolly zoom (vertigo) | move camera toward subject while narrowing field of view so subject size stays fixed: `fov = 2·atan(h/(2·d))` with subject height h, distance d | unease, realisation |
| Snap zoom | scale 1→1.35 in 4-6 frames ease-out expo, hold, optional shake | punchline, hook |
| Rack focus | blur foreground 0→8 px as background 8→0 px (or Three.js DOF focusDistance) | shift attention |
| Virtual camera on UI | scale 1→1.15 with gentle pans between areas of interest, each move 0.8-1.2 s | product demos |
| Ken Burns | slow scale 1→1.12 plus 2-4% pan on a still; better with the photo split into 2-3 depth layers | photos, events |
| Handheld drift (`K.handheld`) | fbm noise on x/y 4-12 px and rotation 0.1-0.3°, seeded | life, documentary feel |
| Impact shake (`K.shake`) | decaying noise 10-20 px over 0.3-0.4 s on a hit | shatter, stamp, drop |
| Whip pan | 4-6 frames of ≥200 px/frame with directional blur; join two shots at the peak | energy, hidden cut |
| Bullet-time / orbit freeze | time stops (t frozen for subject), camera keeps moving | hero moment |
| Top-down to eye level | rotateX 60°→0 on the wrapper with perspective 1600 px | maps, desks, reveal of a layout |

## Parallax (2.5D)
- Layer speed factors: far 0.35, mid 0.7, subject 1.0, near foreground 1.4.
- Cut a photo into layers (subject cut-out, background with the hole filled) and move them by factor × camera move.
- Add atmospheric haze to far layers (lower contrast, slight blur 1-2 px) and a foreground blur (6-12 px) to sell depth.
- `perspective` 1200-1800 px on the wrapper; translateZ per layer gives true perspective with CSS.

## Framing and angles
- Rule of thirds for people and objects; centre for symmetry and logos.
- Low angle = strength, high angle = overview, eye level = honesty, Dutch tilt (5-10°) = tension (rarely).
- Macro inserts sell quality: tight crop, shallow depth, slow push.
- Lead room: leave space in the direction of motion or gaze.
- Safe zones: 16:9 keep text inside 90%; 9:16 keep captions between 20% and 75% of height (platform UI covers the rest).

## Motion blur
- Code capture: average 8 sub-frames across half the frame interval (180° shutter look).
- FFmpeg on a high-fps render: `tmix=frames=4:weights='1 1 1 1',fps=30` from 120 fps (tested).
- Per element: blur along motion only for fast elements (whips, shards); never blur text that must be read.
