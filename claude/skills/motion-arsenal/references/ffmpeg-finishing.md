# FFmpeg finishing, audio, encodes, checks

FFmpeg 9.0 full build (gyan.dev) (Windows 11). Every recipe below ran OK on 2026-11-04 on a testsrc2 clip
(proof frames checked for bloom, halation, aberration, light leak, custom xfade). `F="ffmpeg -v error -y"`.

## Look
| Effect | Filter |
|---|---|
| Film grain | `noise=alls=12:allf=t+u` (8-16; `t` = changes every frame) |
| Vignette | `vignette=PI/5` |
| Bloom / glow | `split[a][b];[b]curves=all='0/0 0.7/0.1 1/1',gblur=sigma=25[g];[a][g]blend=all_mode=screen:all_opacity=0.6,format=yuv420p` |
| Halation (red glow on highlights) | `format=gbrp,split[a][b];[b]lutrgb=g=0:b=0,curves=all='0/0 0.75/0.05 1/1',gblur=sigma=12[h];[a][h]blend=all_mode=screen:all_opacity=0.5,format=yuv420p` |
| Chromatic aberration | `rgbashift=rh=-3:bh=3:edge=smear` (or `chromashift`) |
| LUT grade | `lut3d=file.cube` (any .cube; tested with a hand-made 2³ warm cube) |
| Curves / exposure / temperature | `curves=preset=medium_contrast`, `exposure=0.3`, `colortemperature=temperature=5600` |
| Letterbox 2.39 | `drawbox=y=0:w=iw:h=(ih-iw/2.39)/2:color=black:t=fill,drawbox=y=ih-(ih-iw/2.39)/2:w=iw:h=(ih-iw/2.39)/2:color=black:t=fill` |
| Light leak | second input `gradients=s=WxH:c0=0xff7a2a:c1=0x000000:speed=0.03`, then `blend=all_mode=screen:all_opacity=0.45` |
| Trails / echo | `lagfun=decay=0.93` |
| Animated gradient background | `-f lavfi -i "gradients=s=1920x1080:r=30:d=10:c0=0x...:c1=0x...:speed=0.02"` |
| Sharpen after scaling | `unsharp=5:5:0.6` |
| Deband dark gradients | `deband` (before encode, then grain hides the rest) |

## Motion and time
| Effect | Filter |
|---|---|
| Motion blur from high-fps render | render at 120 fps, then `tmix=frames=4:weights='1 1 1 1',fps=30` |
| Speed ramp (hard segments) | `split=3` → `trim` each part → `setpts=2.5*(PTS-STARTPTS)` on the slow part → `concat=n=3:v=1` |
| Smooth slow motion | `minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=2*PTS` (check edges for warping) |
| Frame-blend retime | `framerate=fps=60` |
| Camera shake on footage | `crop=iw-24:ih-24:12+10*sin(t*13):12+9*sin(t*17+1),scale=W:H` |
| Ken Burns on a still | `-loop 1 -i photo.png -vf "scale=3840:-1,zoompan=z='1+0.15*on/90':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30" -frames:v 90` (upscale first or it jitters) |
| Transitions | `xfade` (58 types) and custom expressions: `transitions.md` §3 |
| Text burn-in | `drawtext=text='...':fontfile=...:fontsize=56:fontcolor=white:x=(w-tw)/2:y=h-th-80`; `.ass` via `subtitles=` (libass present) |
| Grid / split screen | `xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0` |
| Keying | `chromakey=0x00ff00:0.1:0.05` then overlay |

## Audio
| Job | Filter | Tested result |
|---|---|---|
| Loudness for social and web | `loudnorm=I=-14:TP=-1:LRA=11` | -14.0 LUFS measured |
| Duck a bed under voice | `[bed][voice]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350` (split the voice with `asplit` to also mix it: `amix=inputs=2:normalize=0`) | bed -8.6 dB under voice |
| Crossfade | `acrossfade=d=1:c1=tri:c2=tri` | OK |
| Measure | `-af ebur128 -f null -` (integrated LUFS), `astats` (RMS) | |
| Clean voice | `afftdn=nf=-25`, `highpass=f=80`, `acompressor` | OK |

## Encodes
| Target | Command |
|---|---|
| Web / social master (H.264) | `-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart` |
| Fast GPU (RTX 3050) | `-c:v h264_nvenc -preset p7 -cq 19 -b:v 0 -pix_fmt yuv420p` (hevc_nvenc, av1_nvenc also present) |
| Editing master with alpha | `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le` (.mov) |
| Small modern web | `-c:v libsvtav1 -crf 32` or `libvpx-vp9 -crf 32 -b:v 0` |
| GIF | `fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4` |
| Frames to video | `-framerate 30 -i frames/f%04d.png ...` |
| Loop for screens | add `-stream_loop -1` only for playback tests; deliver a single clean loop |

## Checks before delivery
- Loop seam: extract first and last frame, `ffmpeg -i first.png -i last.png -lavfi ssim -f null -`; a true loop is
  ≥0.98 (a non-loop testsrc scored 0.85, so the check can fail).
- Contact sheet of transition midpoints: `-vf "select='...',scale=480:-1,tile=4x3"`.
- Black or frozen frames: `blackdetect=d=0.1:pix_th=0.05`, `freezedetect=n=-60dB:d=0.5`.
- Loudness: `ebur128` reads -14 ±1 LUFS for social; true peak ≤ -1 dBTP.
- Duration and fps: `ffprobe -v error -show_entries format=duration:stream=r_frame_rate -of csv=p=0 out.mp4`.
