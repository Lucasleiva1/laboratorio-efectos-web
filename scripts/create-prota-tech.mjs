import {readFile,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'projects/prota-code/portada-prota-code-v1.0.0.effectlab';
const p=JSON.parse(await readFile(base,'utf8'));
p.id='prota-code-tech-01';p.name='Prota Code · Profundidad tecnológica';p.modifiedAt=new Date().toISOString();
p.description='Propuesta 01: imagen con profundidad al mover el mouse, halo azul, microdestellos cobre y pulso al hacer clic. Texto estable.';
const control=(id,label,value,widget,extra={})=>({id,binding:id,label,value,defaultValue:value,widget,source:'code',...extra});
const slider=(id,label,value,min,max,step=.05)=>control(id,label,value,'slider',{min,max,step});
const bg=p.composition.layers.find(l=>l.id==='cover-image').source;
bg.parameters.push(slider('depth','Profundidad con el mouse (px)',16,0,28,1));
bg.files.find(f=>f.path==='parameters.json').content=JSON.stringify(bg.parameters,null,2);
const main=bg.files.find(f=>f.path==='main.js');main.content=main.content.replace(/lab\.register\(\[.*?\],p=>/s,'lab.register('+JSON.stringify(bg.parameters)+',p=>');
main.content+='\n'+await readFile('effects/prota-tech/parallax.js','utf8');
bg.files.find(f=>f.path==='style.css').content+='\n#cover{transform:translate3d(var(--shiftX,0px),var(--shiftY,0px),0) scale(calc(var(--zoom) * var(--safetyZoom,1.055)));will-change:transform}';
const parameters=[control('blue','Luz azul','#297dff','color'),control('copper','Destellos cobre','#d47a42','color'),slider('light','Intensidad del halo',.65,0,1),slider('sparks','Intensidad de microdestellos',.7,0,1),control('pulse','Pulso al hacer clic',true,'toggle')];
const glow={formatVersion:1,id:'prota-tech-lights',name:'Luces tecnológicas',createdAt:p.createdAt,modifiedAt:p.modifiedAt,profile:'html',entry:'index.html',parameters,dependencies:[],tags:['tecnología'],description:'Luces pequeñas reactivas con presupuesto fijo; sin malla ni desenfoques.',files:[
{path:'index.html',content:'<div class="halo"></div><div class="copper"></div><canvas></canvas><link rel="stylesheet" href="style.css"><script type="module" src="main.js"></script>'},
{path:'style.css',content:'html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.halo,.copper{position:absolute;left:0;top:0;width:520px;height:520px;border-radius:50%;pointer-events:none;will-change:transform,opacity;mix-blend-mode:screen}.copper{width:200px;height:200px}'},
{path:'main.js',content:await readFile('effects/prota-tech/lights.js','utf8')},{path:'parameters.json',content:JSON.stringify(parameters,null,2)}]};
const layer={id:'tech-light',name:'Luz azul y microdestellos · mouse',kind:'effect',source:glow,transparent:true,x:0,y:0,scale:1,rotation:0,opacity:1,visible:true,locked:true,blend:'screen',mask:'none'};
// Behind stable copy, above the shade and image. The locked effect never intercepts buttons.
p.composition.layers.splice(p.composition.layers.length-1,0,layer);
await writeFile('projects/prota-code/portada-prota-code-v1.1.0.effectlab',JSON.stringify(p,null,2)+'\n');
console.log('Propuesta 01 creada; portada original conservada.');
