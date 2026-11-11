import schema from "./parameters.json";
const canvas = document.querySelector("#network");
const ctx = canvas.getContext("2d", { desynchronized: true });
// Fixed pool: no growing particle arrays, no mesh and no per-particle blur.
const pool = Array.from({ length: 240 }, () => ({
  alive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  born: 0,
  life: 1,
}));
let p = {},
  cursor = null,
  head = 0,
  waves = [],
  time = 0,
  previous = performance.now(),
  raf;
let w = 1,
  h = 1,
  dirty = true,
  frames = 0,
  cost = 0,
  measuredAt = performance.now();
function resize() {
  w = innerWidth;
  h = innerHeight;
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  dirty = true;
  wake();
}
window.lab.register(schema, (value) => {
  p = value;
  head %= p.count;
  if (!p.ripples) waves = [];
  dirty = true;
  canvas.dataset.color = p.color;
  wake();
});
resize();
addEventListener("resize", resize);
function spawn(x, y) {
  const particle = pool[head];
  head = (head + 1) % p.count;
  const angle = Math.random() * Math.PI * 2,
    speed = p.drift * (0.25 + Math.random() * 0.75);
  Object.assign(particle, {
    alive: true,
    x: x + (Math.random() - 0.5) * p.spread,
    y: y + (Math.random() - 0.5) * p.spread,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    born: time,
    life: p.life * (0.6 + Math.random() * 0.4),
  });
}
function move(e) {
  if (window.lab.paused) return;
  const from = cursor ?? { x: e.clientX, y: e.clientY };
  const dx = e.clientX - from.x,
    dy = e.clientY - from.y;
  const steps = Math.min(16, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4)));
  for (let i = 1; i <= steps; i++) {
    spawn(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
    spawn(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
  }
  cursor = { x: e.clientX, y: e.clientY };
  dirty = true;
  wake();
}
function click(e) {
  if (e.button !== 0 || window.lab.paused) return;
  for (let i = 0; i < 14; i++) spawn(e.clientX, e.clientY);
  if (p.ripples) {
    waves.push({ x: e.clientX, y: e.clientY, born: time });
    if (waves.length > 3) waves.shift();
  }
  dirty = true;
  wake();
}
function leave() {
  cursor = null;
}
canvas.addEventListener("pointermove", move);
canvas.addEventListener("pointerdown", click);
canvas.addEventListener("pointerleave", leave);
function wake() {
  if (!raf) {
    previous = performance.now();
    measuredAt = previous;
    frames = 0;
    cost = 0;
    raf = requestAnimationFrame(tick);
  }
}
function pauseChanged() {
  wake();
}
window.addEventListener("lab:pause", pauseChanged);
function tick(now) {
  raf = 0;
  const started = performance.now(),
    dt = Math.min(0.04, (now - previous) / 1000);
  previous = now;
  if (!window.lab.paused) time += dt;
  waves = waves.filter((wave) => time - wave.born < 2.6);
  let active = 0;
  const dots = new Path2D(),
    halos = new Path2D();
  function dot(x, y, alpha) {
    const radius = p.size * Math.max(0.25, alpha);
    dots.moveTo(x + radius, y);
    dots.arc(x, y, radius, 0, Math.PI * 2);
    if (p.glow > 0) {
      const halo = radius * (1 + p.glow * 2);
      halos.moveTo(x + halo, y);
      halos.arc(x, y, halo, 0, Math.PI * 2);
    }
  }
  for (let i = 0; i < p.count; i++) {
    const particle = pool[i];
    if (!particle.alive) continue;
    const age = (time - particle.born) / particle.life;
    if (age >= 1) {
      particle.alive = false;
      continue;
    }
    active++;
    if (!window.lab.paused) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    let x = particle.x,
      y = particle.y;
    for (const wave of waves) {
      const dx = x - wave.x,
        dy = y - wave.y,
        distance = Math.sqrt(dx * dx + dy * dy),
        band = distance - (time - wave.born) * p.waveSpeed;
      if (Math.abs(band) < 35 && distance > 0.1) {
        const push =
          Math.sin(band * 0.1) * (1 - Math.abs(band) / 35) * p.waveForce;
        x += (dx / distance) * push;
        y += (dy / distance) * push;
      }
    }
    dot(x, y, (1 - age) * (1 - age));
  }
  for (const wave of waves) {
    const age = time - wave.born,
      radius = age * p.waveSpeed,
      fade = 1 - age / 2.6;
    for (let i = 0; i < 40; i++) {
      const angle = (i * Math.PI * 2) / 40;
      dot(
        wave.x + Math.cos(angle) * radius,
        wave.y + Math.sin(angle) * radius,
        fade * 0.8,
      );
    }
  }
  if (dirty || active || waves.length) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = p.color;
    if (p.glow > 0) {
      ctx.globalAlpha = 0.12 * p.glow * p.intensity;
      ctx.fill(halos);
    }
    ctx.globalAlpha = p.intensity;
    ctx.fill(dots);
    ctx.globalAlpha = 1;
    dirty = Boolean(active || waves.length);
  }
  frames++;
  cost += performance.now() - started;
  if (now - measuredAt >= 1000) {
    canvas.dataset.fps = ((frames * 1000) / (now - measuredAt)).toFixed(1);
    canvas.dataset.drawMs = (cost / frames).toFixed(2);
    frames = 0;
    cost = 0;
    measuredAt = now;
  }
  canvas.dataset.particles = String(active);
  canvas.dataset.ripples = String(waves.length);
  if (!window.lab.paused && (active || waves.length || dirty))
    raf = requestAnimationFrame(tick);
}
wake();
window.lab.onDispose(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("lab:pause", pauseChanged);
  removeEventListener("resize", resize);
  canvas.removeEventListener("pointermove", move);
  canvas.removeEventListener("pointerdown", click);
  canvas.removeEventListener("pointerleave", leave);
});
