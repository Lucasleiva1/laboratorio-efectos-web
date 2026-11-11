import schema from './parameters.json';
const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d',{desynchronized:true});
const halo=document.querySelector('.halo'), copper=document.querySelector('.copper');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const dots=Array.from({length:56},(_,i)=>({u:((i*37)%97)/97,v:((i*53)%89)/89,r:i%5===0?1.1:.55}));
const pool=Array.from({length:60},()=>({life:0,x:0,y:0}));
let params={}, head=0, px=.7,py=.5,tx=.7,ty=.5, hover=false, energy=0, wave=null, raf=0,last=0,w=1,h=1;
let frames=0,cost=0,measured=0;
function wake(){if(!raf){last=performance.now();measured=last;frames=0;cost=0;raf=requestAnimationFrame(tick);}}
function resize(){w=canvas.width=Math.round(innerWidth);h=canvas.height=Math.round(innerHeight);wake();}
function input(e){if(lab.paused||reduced.matches)return;const d=e.detail;hover=d.phase!=='leave';tx=d.x;ty=d.y;
 if(d.phase==='move'){energy=1;for(let i=0;i<2;i++){const dot=pool[head++%pool.length];dot.life=1;dot.x=tx*w+(Math.random()-.5)*12;dot.y=ty*h+(Math.random()-.5)*12;}}
 if(d.phase==='down'&&d.button===0&&params.pulse){wave={x:tx*w,y:ty*h,age:0};energy=1;}
 wake();}
function tick(now){raf=0;const started=performance.now();if(lab.paused)return;const dt=Math.min(.05,(now-last)/1000);last=now;
 const a=1-Math.exp(-dt*9);px+=(tx-px)*a;py+=(ty-py)*a;energy=Math.max(0,energy-dt*.65);
 ctx.clearRect(0,0,w,h);
 // Sparse, fixed point field; no all-to-all links or per-point shadow blur.
 ctx.fillStyle=params.blue;
 for(const dot of dots){const x=(.38+dot.u*.6)*w,y=(.08+dot.v*.85)*h;const dist=Math.hypot(x-px*w,y-py*h);const reaction=Math.max(0,1-dist/190)*energy;ctx.globalAlpha=params.sparks*(.15+reaction*.75);ctx.fillRect(x,y,dot.r+reaction*.7,dot.r+reaction*.7);}
 let active=0;ctx.fillStyle=params.copper;
 for(const dot of pool){if(dot.life<=0)continue;dot.life=Math.max(0,dot.life-dt*1.1);active++;ctx.globalAlpha=dot.life*params.sparks*.8;ctx.fillRect(dot.x,dot.y,.85,.85);}
 if(wave){wave.age+=dt;const r=wave.age*190,alpha=Math.max(0,1-wave.age/1.35);ctx.strokeStyle=params.blue;ctx.globalAlpha=alpha*params.sparks*.65;ctx.lineWidth=.8;ctx.setLineDash([3,11]);ctx.beginPath();ctx.ellipse(wave.x,wave.y,r,r*.7,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(wave.age>=1.35)wave=null;}
 ctx.globalAlpha=1;
 halo.style.transform=`translate3d(${px*w-260}px,${py*h-260}px,0)`;
 halo.style.opacity=String(params.light*(.16+energy*.52));
 copper.style.transform=`translate3d(${px*w-100}px,${py*h-100}px,0)`;
 copper.style.opacity=String(params.light*energy*.22);
 canvas.dataset.particles=String(active);canvas.dataset.wave=String(Boolean(wave));canvas.dataset.awake='true';
 frames++;cost+=performance.now()-started;
 if(now-measured>1000){canvas.dataset.fps=(frames*1000/(now-measured)).toFixed(1);canvas.dataset.drawMs=(cost/frames).toFixed(2);measured=now;frames=0;cost=0;}
 if(!reduced.matches&&(energy>0||active||wave||Math.abs(tx-px)+Math.abs(ty-py)>.001))raf=requestAnimationFrame(tick);else canvas.dataset.awake='false';
}
lab.register(schema,p=>{params=p;halo.style.background=`radial-gradient(circle,${p.blue}30,${p.blue}0d 33%,transparent 68%)`;copper.style.background=`radial-gradient(circle,${p.copper}38,transparent 65%)`;if(!p.pulse)wave=null;wake();});
function pause(){if(lab.paused){cancelAnimationFrame(raf);raf=0;}else wake();}
function motion(){energy=0;wave=null;pool.forEach(d=>d.life=0);wake();}
addEventListener('lab:pointer',input);addEventListener('lab:pause',pause);addEventListener('resize',resize);reduced.addEventListener('change',motion);resize();
lab.onDispose(()=>{cancelAnimationFrame(raf);removeEventListener('lab:pointer',input);removeEventListener('lab:pause',pause);removeEventListener('resize',resize);reduced.removeEventListener('change',motion);});
