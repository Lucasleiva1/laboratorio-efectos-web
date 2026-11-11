import imageURL from './assets/portada.png';
import schema from './parameters.json';
const canvas=document.querySelector('canvas');
const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
if(!gl)throw Error('La imagen de partículas necesita WebGL 2.');
const vs=`#version 300 es
precision highp float;
in vec2 home;
uniform vec2 viewport;
uniform float cell,time,radius,scatter,returnTime,wholeImage;
uniform vec4 brush[32];
uniform vec4 strokeTime[32];
uniform float drag;
out vec2 anchor;
out float broken;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 float seed=hash(home);float angle=seed*6.2831853;
 vec2 shift=vec2(0.);float amount=0.;
 for(int i=0;i<32;i++){
  if(strokeTime[i].w<.5||time-strokeTime[i].y>returnTime)continue;
  vec2 segment=brush[i].zw-brush[i].xy;
  float along=clamp(dot(home-brush[i].xy,segment)/max(dot(segment,segment),.001),0.,1.);
  vec2 delta=home-mix(brush[i].xy,brush[i].zw,along);
  float age=max(0.,time-mix(strokeTime[i].x,strokeTime[i].y,along));
  float decay=pow(max(0.,1.-age/returnTime),.85);
  float dist2=dot(delta,delta)/(radius*radius);
  float influence=exp(-dist2*6.)*decay*strokeTime[i].z;
  vec2 flow=segment/max(length(segment),.001);vec2 tangent=vec2(-flow.y,flow.x);
  float grain=sin(angle+age*2.4+dot(home,vec2(.018,.027)));
  shift+=(flow*drag+tangent*grain*drag*.55+vec2(cos(angle),sin(angle))*scatter)*influence;
  amount+=influence;
 }
 shift/=max(1.,amount*.65);
 vec2 pos=home+shift;
 broken=min(1.,amount);anchor=home;
 gl_Position=vec4(pos/viewport*vec2(2.,-2.)+vec2(-1.,1.),0,1);
 gl_PointSize=max(1.,cell*(1.-broken*.35))+.01;
}`;
const fs=`#version 300 es
precision highp float;
uniform sampler2D photo;
uniform vec2 imageSize,viewport;
uniform float cell;
in vec2 anchor;
in float broken;
out vec4 color;
void main(){
 vec2 local=gl_PointCoord-.5;
 if(broken>.04 && length(local)>.5)discard;
 float scale=max(viewport.x/imageSize.x,viewport.y/imageSize.y);
 vec2 size=imageSize*scale;
 vec2 position=viewport.x>=1280.?vec2(.58,.55):viewport.x>=990.?vec2(.62,.65):viewport.x>=640.?vec2(.7,.5):vec2(.85,0.);
 vec2 offset=(viewport-size)*position;
 vec2 uv=(anchor+local*cell-offset)/size;
 color=vec4(texture(photo,uv).rgb,1.);
}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const vert=shader(gl.VERTEX_SHADER,vs),frag=shader(gl.FRAGMENT_SHADER,fs),program=gl.createProgram();
gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer(),texture=gl.createTexture();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
const attr=gl.getAttribLocation(program,'home');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const uniform=Object.fromEntries(['viewport','imageSize','cell','time','radius','scatter','returnTime','wholeImage','drag','strokeTime[0]','brush[0]'].map(k=>[k,gl.getUniformLocation(program,k)]));
const brushes=new Float32Array(128),timings=new Float32Array(128);let head=0,p={},count=0,cell=2,w=1,h=1,ready=false,raf=0,last=0,time=0,lastMove=null,frames=0,total=0,measured=0,currentSegment=-1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let dirty=true,previouslyActive=false,disposed=false;
const img=new Image();img.src=imageURL;
function wake(){dirty=true;if(!raf&&ready&&!lab.paused&&!disposed){last=performance.now();measured=last;frames=0;total=0;raf=requestAnimationFrame(tick);}}
function resize(){w=canvas.width=Math.round(innerWidth);h=canvas.height=Math.round(innerHeight);cell=Math.max(p.particleSize||2,Math.ceil(Math.sqrt(w*h/180000)));const cols=Math.ceil(w/cell),rows=Math.ceil(h/cell);count=cols*rows;const points=new Float32Array(count*2);let j=0;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){points[j++]=(x+.5)*cell;points[j++]=(y+.5)*cell;}gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,points,gl.STATIC_DRAW);gl.viewport(0,0,w,h);brushes.fill(0);lastMove=null;canvas.dataset.count=String(count);wake();}
function input(e){if(!ready||lab.paused||(p.respectReducedMotion&&reduced.matches))return;const d=e.detail;
 if(d.phase==='leave'){lastMove=null;currentSegment=-1;return;}
 if(d.phase!=='move')return;
 const x=d.x*w,y=d.y*h;
 if(!lastMove){lastMove={x,y,time};return;}
 const distance=Math.hypot(x-lastMove.x,y-lastMove.y);if(distance<1.5)return;
 const interval=Math.max(.05,p.returnTime/28);
 if(currentSegment<0||time-timings[currentSegment*4]>=interval){
  currentSegment=head++%32;const i=currentSegment*4;
  brushes[i]=lastMove.x;brushes[i+1]=lastMove.y;
  timings[i]=Math.max(lastMove.time,time-interval);timings[i+2]=1;timings[i+3]=1;
 }
 const i=currentSegment*4;brushes[i+2]=x;brushes[i+3]=y;timings[i+1]=time;
 lastMove={x,y,time};wake();
}
function tick(now){raf=0;if(lab.paused||disposed)return;const begin=performance.now();time+=Math.min(.05,(now-last)/1000);last=now;
 let active=0;for(let i=0;i<32;i++){if(time-timings[i*4+1]>=p.returnTime)timings[i*4+3]=0;if(timings[i*4+3])active++;}
 if(dirty||active||previouslyActive){
 gl.useProgram(program);gl.uniform2f(uniform.viewport,w,h);gl.uniform2f(uniform.imageSize,img.naturalWidth,img.naturalHeight);gl.uniform1f(uniform.cell,cell);gl.uniform1f(uniform.time,time);gl.uniform1f(uniform.radius,p.radius);gl.uniform1f(uniform.scatter,p.scatter);gl.uniform1f(uniform.returnTime,p.returnTime);gl.uniform4fv(uniform['brush[0]'],brushes);
 gl.uniform1f(uniform.wholeImage,p.wholeImage?1:0);
 gl.uniform1f(uniform.drag,p.drag);
 gl.uniform4fv(uniform['strokeTime[0]'],timings);
 gl.clearColor(.008,.015,.03,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.POINTS,0,count);
 dirty=false;
 }
 previouslyActive=active>0;
 canvas.dataset.active=String(active);canvas.dataset.awake='true';canvas.dataset.running='true';canvas.dataset.clock=time.toFixed(2);frames++;total+=performance.now()-begin;
 if(now-measured>1000){canvas.dataset.fps=(frames*1000/(now-measured)).toFixed(1);canvas.dataset.submitMs=(total/frames).toFixed(2);frames=0;total=0;measured=now;}
 // Keep the running session alive until Pause/Stop. A settled image skips GPU
 // drawing, but the clock and input processing remain active.
 raf=requestAnimationFrame(tick);
}
lab.register(schema,value=>{const previous=p.particleSize;p=value;if(p.respectReducedMotion&&reduced.matches)timings.fill(0);if(previous!==p.particleSize){timings.fill(0);currentSegment=-1;resize();}else wake();});
img.decode().then(()=>{if(disposed)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);ready=true;resize();}).catch(e=>console.error('No se pudo cargar la imagen',e));
function pause(){if(lab.paused){cancelAnimationFrame(raf);raf=0;canvas.dataset.running='false';}else wake();}
function motion(){if(p.respectReducedMotion&&reduced.matches)timings.fill(0);wake();}
addEventListener('lab:pointer',input);addEventListener('resize',resize);addEventListener('lab:pause',pause);reduced.addEventListener('change',motion);
lab.onDispose(()=>{disposed=true;cancelAnimationFrame(raf);canvas.dataset.running='false';removeEventListener('lab:pointer',input);removeEventListener('resize',resize);removeEventListener('lab:pause',pause);reduced.removeEventListener('change',motion);gl.deleteBuffer(buffer);gl.deleteTexture(texture);gl.deleteProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);});
