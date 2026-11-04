// motion-arsenal kit: pure functions of time for render(t) pages (HyperFrames, any frame-exact capture).
// Rule: every value is computed from t (seconds) and seeded randomness only. No Date.now, no Math.random at draw time.
"use strict";
const K = (() => {
  // ---------- numbers ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const prog = (t, start, dur) => clamp((t - start) / dur);           // 0..1 progress of a window
  const win = (t, a, b) => t >= a && t < b;

  // ---------- easing ----------
  // cubic-bezier(x1,y1,x2,y2) as a function, solved by Newton then bisection (same curve CSS draws)
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s;
    const dX = s => (3 * ax * s + 2 * bx) * s + cx;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let s = x;
      for (let i = 0; i < 8; i++) { const e = X(s) - x, d = dX(s); if (Math.abs(e) < 1e-6) return Y(s); if (Math.abs(d) < 1e-6) break; s -= e / d; }
      let lo = 0, hi = 1; s = x;
      for (let i = 0; i < 40; i++) { const v = X(s); if (Math.abs(v - x) < 1e-6) break; v < x ? (lo = s) : (hi = s); s = (lo + hi) / 2; }
      return Y(s);
    };
  }
  const ease = {
    linear: x => x,
    entrance: bezier(0.22, 1, 0.36, 1),          // the Helix entrance curve (ease-out-quint family)
    outQuart: bezier(0.165, 0.84, 0.44, 1), outExpo: bezier(0.19, 1, 0.22, 1), outCubic: bezier(0.215, 0.61, 0.355, 1),
    inOutCubic: bezier(0.645, 0.045, 0.355, 1), inOutQuart: bezier(0.77, 0, 0.175, 1), inOutExpo: bezier(1, 0, 0, 1),
    inCubic: bezier(0.55, 0.055, 0.675, 0.19), inQuart: bezier(0.895, 0.03, 0.685, 0.22),
    smoother: x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); },   // smootherstep: camera moves
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  };
  // Damped spring 0 -> 1, closed form (deterministic for any t). Remotion-style presets.
  function spring(t, { stiffness = 170, damping = 26, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);                         // critically / over damped
  }
  const springs = { snappy: { stiffness: 260, damping: 24 }, overshoot3: { stiffness: 300, damping: 26 }, bouncy: { stiffness: 180, damping: 12 }, gentle: { stiffness: 90, damping: 20 } };
  // Keyframe track: key(t, [[t0,v0],[t1,v1,easeFn],...]) -> value (ease applies to the segment ending at that key)
  function key(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e = ease.inOutCubic] = keys[i], [t0, v0] = keys[i - 1];
      if (t < t1) return mix(v0, v1, e((t - t0) / (t1 - t0)));
    }
    return keys[keys.length - 1][1];
  }

  // ---------- seeded randomness and noise ----------
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let r = Math.imul(seed ^ seed >>> 15, 1 | seed); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; };  // mulberry32
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(hash(i), hash(i + 1), u) * 2 - 1; };
  const fbm = (x, oct = 3) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise1(x * f + i * 17.3); a *= 0.5; f *= 2; } return v; };

  // ---------- DOM helpers (set state, never toggle display mid-shot) ----------
  const $ = id => document.getElementById(id);
  function set(el, { x = 0, y = 0, s = 1, r = 0, rx = 0, ry = 0, z = 0, o, blur, bright } = {}) {
    el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotate(${r}deg) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
    if (o !== undefined) el.style.opacity = o;
    const f = []; if (blur) f.push(`blur(${blur.toFixed(2)}px)`); if (bright !== undefined) f.push(`brightness(${bright})`);
    el.style.filter = f.join(" ");
    el.style.visibility = o === 0 ? "hidden" : "visible";            // unload invisible layers (cheaper, no jitter)
  }
  // Masked word reveal: wraps each word in an overflow:hidden span once; reveal(t) slides words up from 100%.
  function splitWords(el) {
    if (el._words) return el._words;
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    el._words = words.map((w, i) => {
      const m = document.createElement("span"); m.className = "k-mask";
      const s = document.createElement("span"); s.className = "k-word"; s.textContent = w;
      m.appendChild(s); el.appendChild(m); if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      return s;
    });
    return el._words;
  }
  function revealWords(el, t, start, { stagger = 0.06, dur = 0.55, out = Infinity, outDur = 0.35, e = ease.entrance } = {}) {
    splitWords(el).forEach((w, i) => {
      const pin = e(prog(t, start + i * stagger, dur)), pout = ease.inCubic(prog(t, out + i * stagger * 0.5, outDur));
      w.style.transform = `translateY(${(1 - pin) * 105 - pout * 105}%)`;
    });
  }
  // Rolling counter: each digit is a masked column 0-9; digits stagger (Helix: 40 ms).
  function rollDigits(el, value, t, changedAt, { digits = 2, stagger = 0.04, dur = 0.45, from } = {}) {
    if (!el._cols) {
      el.textContent = ""; el._cols = [];
      for (let i = 0; i < digits; i++) {
        const m = document.createElement("span"); m.className = "k-mask k-digit";
        const c = document.createElement("span"); c.className = "k-col"; c.innerHTML = [...Array(10).keys()].join("<br>");
        m.appendChild(c); el.appendChild(m); el._cols.push(c);
      }
    }
    const to = String(value).padStart(digits, "0"), fr = String(from ?? value).padStart(digits, "0");
    el._cols.forEach((c, i) => {
      const p = ease.entrance(prog(t, changedAt + i * stagger, dur));
      c.style.transform = `translateY(${-mix(+fr[i], +to[i], p)}em)`;
    });
  }
  // Typewriter (cps = characters per second; 10-15 reads as typing) and streamed answer (words per second).
  const typed = (text, t, start, cps = 14) => text.slice(0, Math.max(0, Math.floor((t - start) * cps)));
  const streamed = (text, t, start, wps = 9) => text.split(" ").slice(0, Math.max(0, Math.floor((t - start) * wps))).join(" ");
  const caret = t => (Math.floor(t * 2) % 2 ? "" : "|");                 // 1 Hz blink, frame exact

  // ---------- scene transitions ----------
  // Blur swap (Helix rule): outgoing blurs 0->40 px and fades over `out` s; incoming sharpens 20->0 px over `inn` s.
  function blurSwap(t, start, end, { out = 0.25, inn = 0.35, outBlur = 40, inBlur = 20 } = {}) {
    if (t < start - 1e-9 || t >= end + out) return { o: 0, blur: 0 };
    const pin = ease.entrance(prog(t, start, inn)), pout = ease.inCubic(prog(t, end, out));
    return { o: Math.min(pin, 1 - pout), blur: (1 - pin) * inBlur + pout * outBlur };
  }
  // Zoom-through: outgoing scales up past camera while incoming scales from 0.8; pair with blur for speed.
  const zoomThrough = (p) => ({ outS: mix(1, 3.2, ease.inCubic(p)), outO: 1 - ease.inCubic(p), inS: mix(0.8, 1, ease.outExpo(p)), inO: ease.outCubic(p) });
  // Iris / shape reveal through clip-path (circle from a point the brand owns).
  const iris = (p, cx = 50, cy = 50) => `circle(${(ease.inOutCubic(p) * 150).toFixed(2)}% at ${cx}% ${cy}%)`;
  // Directional wipe with soft edge: use as mask-image on the incoming layer.
  const softWipe = (p, angle = 90, soft = 12) => { const e = p * (100 + soft) - soft; return `linear-gradient(${angle}deg, #000 ${e}%, transparent ${e + soft}%)`; };

  // ---------- effects ----------
  // Shatter: n pieces fly out with rotation; returns per-piece transforms (seeded, so the same every render).
  function shatter(t, start, n, { seed = 7, speed = 900, spin = 540, dur = 0.6 } = {}) {
    const R = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * Math.PI * 2 + (R() - 0.5) * 0.5, v = speed * (0.6 + R() * 0.8), sp = (R() - 0.5) * spin;
      const p = clamp((t - start) / dur), d = ease.outQuart(p) * v;
      out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d + 300 * p * p, r: sp * p, o: 1 - ease.inCubic(p), blur: Math.min(14, p * v / 60), s: 1 - 0.3 * p });
    }
    return out;
  }
  // Shockwave ring radius/opacity and white flash peak (flash: quick rise, slower fall).
  const shock = (t, start, { r0 = 40, r1 = 1300, dur = 0.55 } = {}) => { const p = prog(t, start, dur); return { r: mix(r0, r1, ease.outExpo(p)), o: p >= 1 ? 0 : (1 - p) * 0.9, w: mix(6, 1, p) }; };
  const flash = (t, peak, { rise = 0.06, fall = 0.22, max = 0.85 } = {}) => t < peak ? max * ease.inCubic(prog(t, peak - rise, rise)) : max * (1 - ease.outCubic(prog(t, peak, fall)));
  // Handheld / drift camera from fbm (amplitude in px and deg). Keep it subtle: 4-12 px.
  const handheld = (t, amp = 6, rot = 0.25, seed = 0) => ({ x: fbm(t * 0.7 + seed) * amp, y: fbm(t * 0.6 + seed + 40) * amp, r: fbm(t * 0.5 + seed + 80) * rot });
  // Impact shake: decaying, frame exact.
  const shake = (t, at, amp = 18, dur = 0.35) => { const p = prog(t, at, dur); if (p <= 0 || p >= 1) return { x: 0, y: 0 }; const d = (1 - p) * (1 - p) * amp; return { x: noise1(t * 60) * d, y: noise1(t * 60 + 9) * d }; };
  // Film grain: re-seed an SVG feTurbulence each film frame (24 fps grain reads as film even at 60 fps).
  const grainSeed = (t, fps = 24) => Math.floor(t * fps) % 997;
  // 3D carousel slot for a card at index offset d (0 = front): Helix spec rotateY ±25°, side blur 6 px.
  const carousel = (d, { gap = 560, ry = 25, z = 260, blur = 6 } = {}) => ({ x: d * gap, z: -Math.abs(d) * z, ry: -Math.sign(d) * Math.min(1, Math.abs(d)) * ry, blur: Math.min(1, Math.abs(d)) * blur, o: clamp(1.6 - Math.abs(d) * 0.55) });

  // ---------- page boot (preview loop; a capture calls render(t) directly) ----------
  function boot(render, duration) {
    window.render = render; window.DURATION = duration;
    const fit = () => { const s = $("stage"); if (!s || location.search.includes("capture")) return; const k = Math.min(innerWidth / 1920, innerHeight / 1080); s.style.transform = `scale(${k})`; s.style.transformOrigin = "0 0"; s.style.left = (innerWidth - 1920 * k) / 2 + "px"; s.style.top = (innerHeight - 1080 * k) / 2 + "px"; };
    addEventListener("resize", fit); fit();
    document.fonts.ready.then(() => {
      window.READY = true;
      if (location.search.includes("capture")) return;
      let t0 = performance.now(), paused = false, held = 0;
      addEventListener("keydown", e => { if (e.code === "Space") { paused = !paused; if (!paused) t0 = performance.now() - held * 1000; } });
      const loop = now => { if (!paused) { held = ((now - t0) / 1000) % duration; render(held); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
  }
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches && !location.search.includes("capture");

  return { clamp, mix, prog, win, bezier, ease, spring, springs, key, rng, hash, noise1, fbm, $, set, splitWords, revealWords, rollDigits, typed, streamed, caret, blurSwap, zoomThrough, iris, softWipe, shatter, shock, flash, handheld, shake, grainSeed, carousel, boot, reducedMotion };
})();
