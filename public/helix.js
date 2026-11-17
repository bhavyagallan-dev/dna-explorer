// Draws a rotating 3D DNA double helix made of glowing particles on a <canvas>.
// Usage: createHelix(canvasElement, { color: "213,232,240", tilt: -0.5, ... })
function createHelix(canvas, options) {
  const opts = {
    color: "213,232,240",   // RGB of the particles
    tilt: -0.55,            // angle of the helix across the canvas (radians)
    turns: 2.6,             // number of full twists visible
    radiusRatio: 0.075,     // helix radius relative to canvas diagonal
    lengthRatio: 1.1,       // helix length relative to canvas diagonal
    offsetX: 0.15,          // shift of the helix centre, as a share of the width
    speed: 0.004,           // rotation speed per frame
    density: 1100,          // particles per strand
    ...options,
  };

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width, height, angle = 0, running = false;

  // Fixed random scatter per particle so each strand looks like a cloud of dust.
  const scatter = Array.from({ length: opts.density * 2 }, () => [
    (Math.random() - 0.5) * 14,
    (Math.random() - 0.5) * 14,
    Math.random(),
  ]);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Turn a point on the helix (t from 0 to 1 along the axis, phase around it)
  // into 2D screen coordinates plus a depth value from -1 (back) to 1 (front).
  function project(t, phase) {
    const diagonal = Math.hypot(width, height);
    const a = t * opts.turns * Math.PI * 2 + phase + angle;
    const along = (t - 0.5) * diagonal * opts.lengthRatio;
    const across = Math.cos(a) * diagonal * opts.radiusRatio;
    const cos = Math.cos(opts.tilt), sin = Math.sin(opts.tilt);
    return {
      x: width / 2 + width * opts.offsetX + along * cos - across * sin,
      y: height / 2 + along * sin + across * cos,
      depth: Math.sin(a),
    };
  }

  function dot(x, y, radius, alpha) {
    ctx.fillStyle = `rgba(${opts.color},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";   // overlapping light adds up into a glow

    // Base-pair rungs: a faint line plus a few dots between the two strands.
    const rungs = Math.round(opts.turns * 11);
    for (let i = 0; i <= rungs; i++) {
      const t = i / rungs;
      const p1 = project(t, 0);
      const p2 = project(t, Math.PI);
      const near = ((p1.depth + p2.depth) / 2 + 1) / 2;
      ctx.strokeStyle = `rgba(${opts.color},${0.08 + near * 0.22})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      for (let k = 1; k < 6; k++) {
        const f = k / 6;
        dot(p1.x + (p2.x - p1.x) * f, p1.y + (p2.y - p1.y) * f, 1.1, 0.12 + near * 0.3);
      }
    }

    // Strands: soft halo every few points, then the particle cloud.
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < opts.density; i++) {
        const t = i / opts.density;
        const p = project(t, s * Math.PI);
        const near = (p.depth + 1) / 2;
        const [sx, sy, r] = scatter[s * opts.density + i];
        if (i % 14 === 0) dot(p.x, p.y, 10 + near * 14, 0.025 + near * 0.035);
        dot(p.x + sx * (0.3 + near), p.y + sy * (0.3 + near), 0.7 + near * 2.2 * r, 0.2 + near * 0.7 * (0.4 + r * 0.6));
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function loop() {
    if (!running) return;
    angle += opts.speed;
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  draw();
  window.addEventListener("resize", () => { resize(); draw(); });

  // Only animate while the canvas is on screen, and never for reduced-motion users.
  if (!reduceMotion) {
    new IntersectionObserver(([entry]) => {
      const wasRunning = running;
      running = entry.isIntersecting;
      if (running && !wasRunning) loop();
    }).observe(canvas);
  }
}
