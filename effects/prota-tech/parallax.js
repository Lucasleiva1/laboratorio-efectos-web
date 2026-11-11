// Only the image moves; text and buttons remain still.
let targetX = 0, targetY = 0, x = 0, y = 0, raf = 0, params = {}, last = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const img = document.querySelector('#cover');
function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
function tick(now) {
  raf = 0;
  if (lab.paused) return;
  const dt = Math.min(.05, (now-last)/1000); last = now;
  const a = 1-Math.exp(-dt*10);
  x += (targetX-x)*a; y += (targetY-y)*a;
  const depth = reduced.matches ? 0 : Math.min(params.depth ?? 16, Math.min(innerWidth,innerHeight)*.022);
  const s = document.documentElement.style;
  s.setProperty('--shiftX', `${x*depth}px`);s.setProperty('--shiftY',`${y*depth}px`);
  s.setProperty('--safetyZoom', depth ? 1.055 : 1);
  img.dataset.shift = `${(x*depth).toFixed(2)},${(y*depth).toFixed(2)}`;
  img.dataset.awake = 'true';
  if(Math.abs(targetX-x)+Math.abs(targetY-y)>.001) raf=requestAnimationFrame(tick);
  else img.dataset.awake='false';
}
function input(e) {
  if (lab.paused) return;
  const d=e.detail;
  targetX=d.phase==='leave'?0:(d.x-.5)*-2;
  targetY=d.phase==='leave'?0:(d.y-.5)*-2;
  wake();
}
function pause(){if(lab.paused){cancelAnimationFrame(raf);raf=0;}else wake();}
lab.onChange(p=>{params=p;wake();});
addEventListener('lab:pointer',input);addEventListener('lab:pause',pause);
reduced.addEventListener('change',wake);
lab.onDispose(()=>{cancelAnimationFrame(raf);removeEventListener('lab:pointer',input);removeEventListener('lab:pause',pause);reduced.removeEventListener('change',wake);});
