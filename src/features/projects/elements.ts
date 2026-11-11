import { createProject } from "../../../packages/core/project";
import type { Parameter } from "../../../packages/parameter-schema";

const slider = (
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step = 1,
): Parameter => ({
  id,
  binding: id,
  label,
  widget: "slider",
  value,
  defaultValue: value,
  min,
  max,
  step,
  source: "code",
});
const color = (value: string): Parameter => ({
  id: "color",
  binding: "color",
  label: "Color",
  widget: "color",
  value,
  defaultValue: value,
  source: "code",
});
function element(
  name: string,
  html: string,
  css: string,
  code: string,
  parameters: Parameter[],
) {
  const p = createProject(name);
  p.id = "element-" + name.toLowerCase().replace(/[^a-z]/g, "");
  p.parameters = parameters;
  p.files = [
    {
      path: "index.html",
      content:
        html +
        '<link rel="stylesheet" href="style.css"><script type="module" src="main.js"></script>',
    },
    {
      path: "style.css",
      content:
        "html,body{width:100%;height:100%;margin:0;overflow:hidden;background:transparent}*{box-sizing:border-box}" +
        css,
    },
    {
      path: "main.js",
      content: "import schema from './parameters.json';\n" + code,
    },
    { path: "parameters.json", content: JSON.stringify(parameters, null, 2) },
  ];
  return p;
}

export const compositionElements = [
  element(
    "Partículas",
    '<canvas id="particles"></canvas>',
    "#particles{display:block;width:100%;height:100%}",
    `
const canvas=document.querySelector('#particles'),ctx=canvas.getContext('2d');let p={},w=1,h=1,points=[],raf,last=performance.now();
function resize(){w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize);resize();
window.lab.register(schema,value=>{p=value;const count=Math.round(p.count);while(points.length<count)points.push({x:Math.random(),y:Math.random(),phase:Math.random()*6.28});points.length=count;canvas.dataset.count=String(points.length);canvas.dataset.color=p.color;});
function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;ctx.clearRect(0,0,w,h);ctx.fillStyle=p.color;ctx.globalAlpha=p.opacity;ctx.shadowColor=p.color;ctx.shadowBlur=p.glow;
 for(const dot of points){if(!window.lab.paused){dot.y=(dot.y-dt*p.speed*.08+1)%1;dot.x=(dot.x+Math.sin(now*.0003+dot.phase)*dt*p.speed*.015+1)%1;}ctx.beginPath();ctx.arc(dot.x*w,dot.y*h,p.size,0,Math.PI*2);ctx.fill();}raf=requestAnimationFrame(tick);}
raf=requestAnimationFrame(tick);window.lab.onDispose(()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize);});
`,
    [
      slider("count", "Cantidad de partículas", 90, 5, 600),
      slider("speed", "Velocidad", 1, 0, 5, 0.1),
      slider("size", "Tamaño de partícula", 2, 0.5, 12, 0.5),
      color("#ffffff"),
      slider("glow", "Brillo de partículas", 8, 0, 40),
      slider("opacity", "Opacidad de partículas", 0.8, 0, 1, 0.01),
    ],
  ),
  element(
    "Glow",
    '<div id="glow"></div>',
    "#glow{position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:screen}",
    `
const light=document.querySelector('#glow');let p={},raf,time=0,last=performance.now();
window.lab.register(schema,value=>{p=value;light.style.left=p.x+'%';light.style.top=p.y+'%';light.style.width=p.size+'px';light.style.height=p.size+'px';light.style.background='radial-gradient(ellipse,'+p.color+' 0%,transparent 70%)';light.style.filter='blur('+p.blur+'px)';light.style.opacity=p.strength;});
function tick(now){if(!window.lab.paused)time+=(now-last)/1000;last=now;light.style.transform='translate(-50%,-50%) scale('+(1+Math.sin(time*p.pulse)*.15)+')';raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);window.lab.onDispose(()=>cancelAnimationFrame(raf));
`,
    [
      color("#a855f7"),
      slider("strength", "Intensidad del resplandor", 0.65, 0, 1, 0.01),
      slider("size", "Tamaño del resplandor", 450, 50, 1500, 10),
      slider("blur", "Suavidad", 30, 0, 160),
      slider("x", "Posición horizontal", 50, 0, 100),
      slider("y", "Posición vertical", 50, 0, 100),
      slider("pulse", "Velocidad de pulsación", 0.8, 0, 4, 0.1),
    ],
  ),
  element(
    "Texto",
    '<div id="text"></div>',
    "#text{position:absolute;transform:translate(-50%,-50%);white-space:pre-wrap;text-align:center;font-family:system-ui;max-width:95vw}",
    `
const text=document.querySelector('#text');window.lab.register(schema,p=>{text.textContent=p.text;text.style.color=p.color;text.style.fontSize=p.size+'px';text.style.fontWeight=p.weight;text.style.left=p.x+'%';text.style.top=p.y+'%';text.style.opacity=p.opacity;});
`,
    [
      {
        id: "text",
        binding: "text",
        label: "Contenido del texto",
        widget: "text",
        value: "Tu idea empieza acá",
        defaultValue: "Tu idea empieza acá",
        source: "code",
      },
      color("#ffffff"),
      slider("size", "Tamaño del texto", 48, 12, 180),
      slider("weight", "Grosor del texto", 600, 100, 900, 100),
      slider("x", "Posición horizontal", 50, 0, 100),
      slider("y", "Posición vertical", 50, 0, 100),
      slider("opacity", "Opacidad del texto", 1, 0, 1, 0.01),
    ],
  ),
  element(
    "Forma",
    '<div id="shape"></div>',
    "#shape{position:absolute;transform-origin:center}",
    `
const shape=document.querySelector('#shape');window.lab.register(schema,p=>{shape.style.width=p.size+'px';shape.style.height=p.size+'px';shape.style.background=p.color;shape.style.borderRadius=p.roundness+'%';shape.style.opacity=p.opacity;shape.style.left=p.x+'%';shape.style.top=p.y+'%';shape.style.transform='translate(-50%,-50%) rotate('+p.angle+'deg)';});
`,
    [
      color("#8b5cf6"),
      slider("size", "Tamaño de la forma", 140, 10, 700),
      slider("roundness", "Redondeo (50 = círculo)", 50, 0, 50),
      slider("x", "Posición horizontal", 50, 0, 100),
      slider("y", "Posición vertical", 50, 0, 100),
      slider("angle", "Giro", 0, -180, 180),
      slider("opacity", "Opacidad de la forma", 0.8, 0, 1, 0.01),
    ],
  ),
];
