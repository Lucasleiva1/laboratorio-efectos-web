import schema from "./parameters.json";

const canvas = document.querySelector("#network");
const ctx = canvas.getContext("2d");
let settings = {},
  width = 1,
  height = 1,
  nodes = [],
  columns = 0,
  rows = 0;
let trail = [],
  ripples = [],
  clock = 0,
  previous = performance.now(),
  raf;
let cursor = { x: -1000, y: -1000, inside: false };

function lattice() {
  const spacing = Math.max(settings.spacing, Math.sqrt((width * height) / 450));
  columns = Math.ceil(width / spacing) + 2;
  rows = Math.ceil(height / spacing) + 2;
  nodes = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const jitter = (seed - Math.floor(seed) - 0.5) * spacing * 0.3;
      nodes.push({
        bx: x * spacing - 20 + jitter,
        by: y * spacing - 20 - jitter,
        x: 0,
        y: 0,
        heat: 0,
        phase: x * 0.8 + y * 1.3,
      });
    }
  canvas.dataset.nodes = String(nodes.length);
}
function resize() {
  width = innerWidth;
  height = innerHeight;
  const dpr = 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (settings.spacing) lattice();
}
window.lab.register(schema, (value) => {
  const rebuild = settings.spacing !== value.spacing;
  settings = value;
  if (rebuild) lattice();
  if (!settings.ripples) ripples = [];
  canvas.dataset.color = settings.color;
});
resize();

function stamp(x, y) {
  trail.push({ x, y, born: clock });
  if (trail.length > 32) trail.shift();
}
function move(event) {
  const x = event.clientX,
    y = event.clientY;
  const last = trail.at(-1);
  if (
    !last ||
    Math.hypot(x - last.x, y - last.y) > 6 ||
    clock - last.born > 0.06
  )
    stamp(x, y);
  cursor = { x, y, inside: true };
}
function click(event) {
  if (event.button !== 0) return;
  stamp(event.clientX, event.clientY);
  if (settings.ripples) {
    ripples.push({ x: event.clientX, y: event.clientY, born: clock });
    if (ripples.length > 3) ripples.shift();
  }
}
function leave() {
  cursor.inside = false;
}
canvas.addEventListener("pointermove", move);
canvas.addEventListener("pointerdown", click);
canvas.addEventListener("pointerleave", leave);
addEventListener("resize", resize);

let paths, hotPath, dots;
function edge(a, b) {
  const heat = Math.max(a.heat, b.heat);
  const bin = heat < 0.06 ? 0 : Math.min(4, Math.ceil(heat * 4));
  const path = paths[bin];
  path.moveTo(a.x, a.y);
  path.lineTo(b.x, b.y);
  if (heat > 0.2) {
    hotPath.moveTo(a.x, a.y);
    hotPath.lineTo(b.x, b.y);
  }
}
let frames = 0,
  measuredAt = performance.now(),
  cost = 0;
function tick(now) {
  const started = performance.now();
  paths = Array.from({ length: 5 }, () => new Path2D());
  hotPath = new Path2D();
  dots = new Path2D();
  const delta = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  if (!window.lab.paused) clock += delta;
  ctx.clearRect(0, 0, width, height);
  trail = trail.filter((point) => clock - point.born < settings.persistence);
  const lifetime = Math.hypot(width, height) / settings.waveSpeed + 1;
  ripples = ripples.filter((wave) => clock - wave.born < lifetime);
  ctx.strokeStyle = settings.color;
  ctx.fillStyle = settings.color;
  ctx.shadowColor = settings.color;
  ctx.globalCompositeOperation = "source-over";
  for (const node of nodes) {
    let heat = 0;
    let dx = Math.sin(clock * settings.motion + node.phase) * 2.5;
    let dy = Math.cos(clock * settings.motion * 0.8 + node.phase) * 2.5;
    for (const point of trail) {
      const x = node.bx - point.x,
        y = node.by - point.y;
      const distance2 = x * x + y * y;
      if (distance2 < settings.radius * settings.radius) {
        const age = 1 - (clock - point.born) / settings.persistence;
        heat = Math.max(
          heat,
          (1 - distance2 / (settings.radius * settings.radius)) * age * age,
        );
      }
    }
    if (cursor.inside) {
      const x = cursor.x - node.bx,
        y = cursor.y - node.by;
      const distance = Math.hypot(x, y);
      if (distance < settings.radius) {
        const pull = (1 - distance / settings.radius) * settings.pull;
        dx += x * pull * 0.08;
        dy += y * pull * 0.08;
      }
    }
    for (const wave of ripples) {
      const x = node.bx - wave.x,
        y = node.by - wave.y;
      const distance = Math.hypot(x, y),
        age = clock - wave.born;
      const band = distance - age * settings.waveSpeed;
      const envelope =
        Math.exp((-band * band) / (2 * 42 * 42)) * Math.exp(-age * 0.6);
      const displacement =
        Math.sin(band * 0.075) * settings.waveForce * envelope;
      if (distance > 0.1) {
        dx += (x / distance) * displacement;
        dy += (y / distance) * displacement;
      }
      heat = Math.max(heat, envelope * 0.95);
    }
    node.x = node.bx + dx;
    node.y = node.by + dy;
    node.heat = heat;
  }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const index = y * columns + x,
        node = nodes[index];
      if (x + 1 < columns) edge(node, nodes[index + 1]);
      if (y + 1 < rows) edge(node, nodes[index + columns]);
      if (x + 1 < columns && y + 1 < rows && (x + y) % 2 === 0)
        edge(node, nodes[index + columns + 1]);
      if (node.heat > 0.12) {
        dots.moveTo(node.x + 2, node.y);
        dots.arc(node.x, node.y, 1 + node.heat * 1.5, 0, Math.PI * 2);
      }
    }
  for (const wave of ripples) {
    const age = clock - wave.born;
    for (let ring = 0; ring < 3; ring++) {
      const radius = age * settings.waveSpeed - ring * 18;
      if (radius <= 0) continue;
      const bin = Math.max(1, Math.ceil(Math.exp(-age * 1.1) * 2));
      paths[bin].moveTo(wave.x + radius, wave.y);
      paths[bin].arc(wave.x, wave.y, radius, 0, Math.PI * 2);
    }
  }
  // Glow is batched into two wide, low-opacity strokes, without shadowBlur.
  if (settings.glow > 0) {
    ctx.globalAlpha = 0.035;
    ctx.lineWidth = settings.lineWidth + settings.glow * 0.9;
    ctx.stroke(hotPath);
    ctx.globalAlpha = 0.09;
    ctx.lineWidth = settings.lineWidth + settings.glow * 0.35;
    ctx.stroke(hotPath);
  }
  for (let i = 0; i < paths.length; i++) {
    ctx.globalAlpha =
      i === 0
        ? settings.base
        : Math.min(1, settings.base + i * 0.25 * settings.intensity);
    ctx.lineWidth = settings.lineWidth + i * 0.15;
    ctx.stroke(paths[i]);
  }
  ctx.globalAlpha = 0.9;
  ctx.fill(dots);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  cost += performance.now() - started;
  frames++;
  if (now - measuredAt >= 1000) {
    canvas.dataset.fps = ((frames * 1000) / (now - measuredAt)).toFixed(1);
    canvas.dataset.drawMs = (cost / frames).toFixed(2);
    frames = 0;
    cost = 0;
    measuredAt = now;
  }
  canvas.dataset.trail = String(trail.length);
  canvas.dataset.ripples = String(ripples.length);
  raf = requestAnimationFrame(tick);
}
raf = requestAnimationFrame(tick);
window.lab.onDispose(() => {
  cancelAnimationFrame(raf);
  removeEventListener("resize", resize);
  canvas.removeEventListener("pointermove", move);
  canvas.removeEventListener("pointerdown", click);
  canvas.removeEventListener("pointerleave", leave);
});
