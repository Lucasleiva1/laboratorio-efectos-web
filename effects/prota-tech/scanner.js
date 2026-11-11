import schema from './parameters.json';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d',{desynchronized:true});
const halo=document.querySelector('.halo'),copper=document.querySelector('.copper');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const trail=Array.from({length:100},()=>({x:0,y:0,life:0}));
let p={},head=0,x=.7,y=.5,tx=.7,ty=.5,inside=false,energy=0,raf=0,last=0,w=1,h=1,wave=null,started=false;
let frames=0,cost=0,measured=0;
function wake(){if(!raf){last=performance.now();frames=0;cost=0;measured=last;raf=requestAnimationFrame(tick);}}
function resize(){w=canvas.width=innerWidth;h=canvas.height=innerHeight;wake();}
function input(e){if(lab.paused||reduced.matches)return;const d=e.detail;
 if(d.phase==='leave'){inside=false;wake();return;}
 inside=true;tx=d.x;ty=d.y;energy=1;
 if(d.phase==='move'){for(let i=0;i<4;i++){const dot=trail[head++%trail.length];dot.x=tx*w+(Math.random()-.5)*20;dot.y=ty*h+(Math.random()-.5)*20;dot.life=.65+Math.random()*.3;}}
 if(d.phase==='down'&&d.button===0&&p.pulse)wave={x:tx*w,y:ty*h,age:0};
 wake();}
function tick(now){raf=0;if(lab.paused)return;const start=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 const a=1-Math.exp(-dt*18);x+=(tx-x)*a;y+=(ty-y)*a;if(!inside)energy=Math.max(0,energy-dt*1.8);
 const cx=x*w,cy=y*h,r=p.radius;
 ctx.clearRect(0,0,w,h);
 if(energy>.001){
  // Local circuit texture, bounded by the lens. No all-to-all links or blur.
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
  const paths=Array.from({length:4},()=>new Path2D()),points=new Path2D();let edges=0;
  const step=28;
  for(let gx=Math.floor((cx-r)/step)*step;gx<cx+r;gx+=step){
   for(let gy=Math.floor((cy-r)/step)*step;gy<cy+r;gy+=step){
    const distance=Math.hypot(gx-cx,gy-cy);if(distance>r)continue;
    const fade=(1-distance/r)**.65,bucket=Math.min(3,Math.floor(fade*4)),path=paths[bucket];
    const parity=Math.abs(Math.round(gx/step)+Math.round(gy/step))%3;
    if(parity!==0){path.moveTo(gx,gy);path.lineTo(gx+14,gy);path.lineTo(gx+28,gy+14);edges++;}
    if(parity===1){path.moveTo(gx,gy);path.lineTo(gx,gy+28);edges++;}
    points.rect(gx-.7,gy-.7,1.4,1.4);
   }
  }
  ctx.strokeStyle=p.blue;
  for(let i=0;i<4;i++){ctx.lineWidth=4;ctx.globalAlpha=(.05+i*.04)*energy*p.sparks;ctx.stroke(paths[i]);ctx.lineWidth=1.2;ctx.globalAlpha=(.25+i*.23)*energy*p.sparks;ctx.stroke(paths[i]);}
  ctx.fillStyle='#c5ebff';ctx.globalAlpha=.45*energy*p.sparks;ctx.fill(points);ctx.restore();
  canvas.dataset.edges=String(edges);
  ctx.strokeStyle=p.blue;ctx.lineWidth=.9;ctx.globalAlpha=.6*energy*p.sparks;
  ctx.beginPath();ctx.arc(cx,cy,r*.69,-.75,.25);ctx.moveTo(cx+Math.cos(2.38)*r*.69,cy+Math.sin(2.38)*r*.69);ctx.arc(cx,cy,r*.69,2.38,3.38);ctx.stroke();
  ctx.fillStyle=p.copper;ctx.globalAlpha=.9*energy*p.sparks;ctx.fillRect(cx-2,cy-2,4,4);
 }
 let active=0;ctx.fillStyle=p.blue;
 for(const dot of trail){if(dot.life<=0)continue;dot.life=Math.max(0,dot.life-dt);active++;ctx.globalAlpha=dot.life*p.sparks*.22;ctx.fillRect(dot.x-2,dot.y-2,4,4);ctx.globalAlpha=dot.life*p.sparks;ctx.fillRect(dot.x-.55,dot.y-.55,1.1,1.1);}
 if(wave){wave.age+=dt;const fade=Math.max(0,1-wave.age/1.1);ctx.strokeStyle=p.copper;ctx.globalAlpha=fade*.8;ctx.lineWidth=1;ctx.beginPath();ctx.arc(wave.x,wave.y,wave.age*240,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=p.blue;ctx.globalAlpha=fade*.45;ctx.beginPath();ctx.arc(wave.x,wave.y,wave.age*210,0,Math.PI*2);ctx.stroke();if(wave.age>=1.1)wave=null;}
 ctx.globalAlpha=1;
 halo.style.transform=`translate3d(${cx-260}px,${cy-260}px,0)`;halo.style.opacity=String(energy*p.light);
 copper.style.transform=`translate3d(${cx-100}px,${cy-100}px,0)`;copper.style.opacity=String(energy*p.light*.4);
 canvas.dataset.particles=String(active);canvas.dataset.wave=String(Boolean(wave));canvas.dataset.awake='true';
 frames++;cost+=performance.now()-start;if(now-measured>=1000){canvas.dataset.fps=(frames*1000/(now-measured)).toFixed(1);canvas.dataset.drawMs=(cost/frames).toFixed(2);frames=0;cost=0;measured=now;}
 if(!reduced.matches&&(active||wave||Math.abs(tx-x)+Math.abs(ty-y)>.001||!inside&&energy>0))raf=requestAnimationFrame(tick);else canvas.dataset.awake='false';
}
lab.register(schema,value=>{p=value;halo.style.background=`radial-gradient(circle,${p.blue}a0,${p.blue}40 30%,transparent 68%)`;copper.style.background=`radial-gradient(circle,${p.copper}50,transparent 65%)`;if(!p.pulse)wave=null;if(!started&&!reduced.matches){started=true;inside=true;energy=1;}wake();});
function pause(){if(lab.paused){cancelAnimationFrame(raf);raf=0;}else wake();}
function motion(){inside=false;energy=0;wave=null;trail.forEach(d=>d.life=0);wake();}
addEventListener('lab:pointer',input);addEventListener('lab:pause',pause);addEventListener('resize',resize);reduced.addEventListener('change',motion);resize();
lab.onDispose(()=>{cancelAnimationFrame(raf);removeEventListener('lab:pointer',input);removeEventListener('lab:pause',pause);removeEventListener('resize',resize);reduced.removeEventListener('change',motion);});
