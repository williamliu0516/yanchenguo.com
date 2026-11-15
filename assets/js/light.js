/*
 * Light — a dark silk surface lit by the cursor.
 * Renders into any <canvas data-light>. Falls back to the CSS gradient
 * behind the canvas when WebGL is unavailable.
 */
(() => {
  const canvas = document.querySelector('[data-light]');
  if (!canvas) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) { canvas.remove(); return; }

  const vert = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uLight;   // light position, in aspect-corrected space
    uniform float uEnergy;  // 0..1, how fast the pointer is moving
    uniform float uIntro;   // 0..1 fade-in

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = m * p;
        a *= 0.5;
      }
      return v;
    }

    // domain-warped height field: long, soft folds like draped silk
    float silk(vec2 p, float t) {
      vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
      return fbm(p + 1.7 * q + vec2(t * 0.6, 0.0));
    }

    void main() {
      vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      float t = uTime * 0.03;

      // stretch & rotate so folds run diagonally
      vec2 sp = mat2(0.84, -0.54, 0.54, 0.84) * p;
      sp *= vec2(1.0, 2.2) * 1.15;

      float e = 0.006;
      float h  = silk(sp, t);
      float hx = silk(sp + vec2(e, 0.0), t);
      float hy = silk(sp + vec2(0.0, e), t);
      vec3 n = normalize(vec3((h - hx) / e * 0.22, (h - hy) / e * 0.22, 1.0));

      vec3 pos = vec3(p, h * 0.2);

      // key light — follows the cursor
      vec3 lp = vec3(uLight, 0.42);
      vec3 L = normalize(lp - pos);
      float d = length(uLight - p);
      float att = 1.0 / (1.0 + d * d * 5.0);
      float diff = max(dot(n, L), 0.0);
      float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 56.0);

      // cool rim light from the upper left
      vec3 L2 = normalize(vec3(-0.7, 0.6, 0.35));
      float rim = pow(max(dot(n, L2), 0.0), 3.0);

      vec3 warm = vec3(1.0, 0.84, 0.64);
      vec3 cool = vec3(0.52, 0.62, 0.86);
      vec3 base = mix(vec3(0.020, 0.019, 0.018), vec3(0.150, 0.112, 0.082), smoothstep(0.2, 0.9, h));

      vec3 col = base * 0.45;
      col += base * diff * att * 6.0 * warm;
      col += spec * att * warm * (0.75 + 0.9 * uEnergy);
      col += rim * 0.05 * cool;
      col += warm * 0.05 * exp(-d * d * 7.0);

      // fine caustic threads near the light
      float threads = pow(1.0 - abs(sin(h * 34.0 - t * 6.0)), 22.0);
      col += threads * att * att * 0.12 * warm;

      // vignette
      vec2 uv = gl_FragCoord.xy / uRes;
      float vig = smoothstep(1.2, 0.25, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.05));
      col *= mix(0.35, 1.0, vig);
      // keep the bottom-left calmer for the title
      col *= mix(0.6, 1.0, smoothstep(0.0, 0.55, uv.y + uv.x * 0.25));

      col = 1.0 - exp(-col * 1.7);
      col += (hash(gl_FragCoord.xy + fract(uTime * 7.0)) - 0.5) * (2.0 / 255.0);
      gl_FragColor = vec4(col * uIntro, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ['uRes', 'uTime', 'uLight', 'uEnergy', 'uIntro'].forEach(n => { u[n] = gl.getUniformLocation(prog, n); });

  // Render well below native resolution: the image is soft anyway, and the
  // shader is the heaviest thing on the page. Capped so big screens stay cheap.
  let w = 0, h = 0;
  function resize() {
    const r0 = canvas.getBoundingClientRect();
    const scale = Math.min(0.42, 640 / Math.max(1, r0.width));
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width * scale));
    h = Math.max(1, Math.round(r.height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  // Light position (aspect-corrected: y in -0.5..0.5, x scaled by aspect)
  const startX = 0.2 * (w / h);
  const light = { x: startX, y: 0.16, tx: startX, ty: 0.16, energy: 0 };
  let lastMove = -1e9;
  let px = null, py = null;

  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    if (e.clientY > r.bottom) return;
    light.tx = (e.clientX - r.left - r.width / 2) / r.height;
    light.ty = -(e.clientY - r.top - r.height / 2) / r.height;
    if (px !== null) {
      const v = Math.hypot(e.clientX - px, e.clientY - py);
      light.energy = Math.min(1, light.energy + v / 400);
    }
    px = e.clientX; py = e.clientY;
    lastMove = performance.now();
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  const t0 = performance.now();
  let raf = 0;

  function draw(now) {
    raf = 0;
    const t = (now - t0) / 1000;

    // drift on its own when nobody is touching it
    if (now - lastMove > 3500) {
      const aspect = w / h;
      light.tx = (Math.sin(t * 0.21) * 0.3 + 0.08) * aspect;
      light.ty = Math.sin(t * 0.17 + 1.2) * 0.22 + 0.08;
    }

    light.x += (light.tx - light.x) * 0.06;
    light.y += (light.ty - light.y) * 0.06;
    light.energy *= 0.94;

    const intro = reduce ? 1 : Math.min(1, t / 1.8);
    const eased = 1 - Math.pow(1 - intro, 3);

    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uTime, reduce ? 12 : t + 12);
    gl.uniform2f(u.uLight, light.x, light.y);
    gl.uniform1f(u.uEnergy, light.energy);
    gl.uniform1f(u.uIntro, eased);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (visible && !document.hidden && (!reduce || now - lastMove < 1500)) kick();
  }

  function kick() { if (!raf) raf = requestAnimationFrame(draw); }

  if (reduce) addEventListener('pointermove', kick, { passive: true });
  kick();
})();
