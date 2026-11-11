import schema from "./parameters.json";
const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d");
let p = {},
  w = 1,
  h = 1;
function draw() {
  w = innerWidth;
  h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = p.gridColor;
  ctx.fillStyle = p.gridColor;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = p.gridOpacity;
  for (let x = 0; x < w; x += p.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    for (let y = 0; y < h; y += p.gridSize) ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  for (let y = 0; y < h; y += p.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}
window.lab.register(schema, (value) => {
  p = value;
  document.body.style.background = p.background;
  draw();
});
addEventListener("resize", draw);
window.lab.onDispose(() => removeEventListener("resize", draw));
