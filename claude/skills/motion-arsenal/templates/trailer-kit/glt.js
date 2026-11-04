// GLT: run any gl-transitions shader between two sources (canvas, img, video) on a WebGL canvas, frame exact.
// Usage: const g = GLT(outCanvas); g.draw("Dreamy", fromCanvas, toCanvas, progress, { optional params });
// Needs glt-lib.js loaded first (window.GLT_LIB). preserveDrawingBuffer is on so frame captures screenshot see the frame.
"use strict";
function GLT(canvas) {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL unavailable");
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const mkTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t; };
  const texFrom = mkTex(), texTo = mkTex(), progs = {};
  const VS = "attribute vec2 p;varying vec2 _uv;void main(){_uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  function program(name) {
    if (progs[name]) return progs[name];
    const T = window.GLT_LIB[name]; if (!T) throw new Error("unknown transition " + name);
    const FS = "precision highp float;varying vec2 _uv;uniform sampler2D from,to;uniform float progress,ratio;" +
      "vec4 getFromColor(vec2 uv){return texture2D(from,uv);}vec4 getToColor(vec2 uv){return texture2D(to,uv);}\n" +
      T.glsl + "\nvoid main(){gl_FragColor=transition(_uv);}";
    const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return (progs[name] = { p, T });
  }
  function setUniform(p, name, type, v) {
    const loc = gl.getUniformLocation(p, name); if (loc === null) return;
    const a = Array.isArray(v) ? v : [v];
    ({ float: () => gl.uniform1f(loc, a[0]), int: () => gl.uniform1i(loc, a[0]), bool: () => gl.uniform1i(loc, a[0] ? 1 : 0),
       vec2: () => gl.uniform2fv(loc, a), vec3: () => gl.uniform3fv(loc, a), vec4: () => gl.uniform4fv(loc, a), ivec2: () => gl.uniform2iv(loc, a) })[type]?.();
  }
  function upload(unit, tex, src) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }
  return {
    names: () => Object.keys(window.GLT_LIB),
    draw(name, from, to, progress, params = {}) {
      const { p, T } = program(name); gl.useProgram(p);
      gl.viewport(0, 0, canvas.width, canvas.height);
      upload(0, texFrom, from); upload(1, texTo, to);
      gl.uniform1i(gl.getUniformLocation(p, "from"), 0); gl.uniform1i(gl.getUniformLocation(p, "to"), 1);
      gl.uniform1f(gl.getUniformLocation(p, "progress"), Math.min(1, Math.max(0, progress)));
      gl.uniform1f(gl.getUniformLocation(p, "ratio"), canvas.width / canvas.height);
      const all = { ...T.defaults, ...params }; for (const k in all) setUniform(p, k, T.types[k], all[k]);
      const loc = gl.getAttribLocation(p, "p"); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
