import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Read-only source: the store is never modified by this importer.
const store = 'D:/PAGINAS WEB Y APP/tienda-protacode';
const output = 'projects/prota-code/portada-prota-code-v1.0.0.effectlab';
const now = new Date().toISOString();
const control = (id, label, value, widget = 'text', extra = {}) => ({id, binding:id, label, value, defaultValue:value, widget, source:'code', ...extra});
const slider = (id, label, value, min, max, step = 1) => control(id,label,value,'slider',{min,max,step});
const make = (id, name, html, css, js, parameters, assets=[]) => ({
  formatVersion:1,id,name,createdAt:now,modifiedAt:now,profile:'html',entry:'index.html',parameters,dependencies:[],tags:['prota-code','portada'],description:'Portada original de Prota Code preparada para experimentar en Effect Lab.',
  files:[{path:'index.html',content:html+'<link rel="stylesheet" href="style.css"><script type="module" src="main.js"></script>'},
    {path:'style.css',content:'*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}'+css},
    {path:'main.js',content:js},{path:'parameters.json',content:JSON.stringify(parameters,null,2)},...assets]
});
const data = async (relative,mime) => 'data:'+mime+';base64,'+(await readFile(path.join(store,relative))).toString('base64');
const image = {path:'assets/portada.png',content:await data('public/marca/portada.png','image/png')};
const imageParams=[slider('zoom','Zoom de imagen',1,1,1.6,.01),slider('positionX','Encuadre horizontal (%)',62,0,100),slider('positionY','Encuadre vertical (%)',65,0,100),slider('brightness','Luminosidad',1,.2,1.5,.05),control('responsive','Encuadre original adaptable',true,'toggle')];
const bg=make('prota-cover-image','Imagen original · portada.png','<img id="cover" alt="Caja de Prota Code sobre una tarima iluminada, rodeada de pantallas de aplicaciones.">',
  'body{background:#111827}img{display:block;width:100%;height:100%;object-fit:cover;object-position:var(--positionX) var(--positionY);transform:scale(var(--zoom));filter:brightness(var(--brightness))}body[data-responsive="true"] img{object-position:85% top}@media(min-width:640px){body[data-responsive="true"] img{object-position:70% center}}@media(min-width:990px){body[data-responsive="true"] img{object-position:62% 65%}}@media(min-width:1280px){body[data-responsive="true"] img{object-position:58% 55%}}',
  `import image from './assets/portada.png';document.querySelector('#cover').src=image;lab.register(${JSON.stringify(imageParams)},p=>{document.body.dataset.responsive=String(p.responsive);const s=document.documentElement.style;s.setProperty('--positionX',p.positionX+'%');s.setProperty('--positionY',p.positionY+'%');s.setProperty('--zoom',p.zoom);s.setProperty('--brightness',p.brightness);});`,imageParams,[image]);
const shadeParams=[slider('darkness','Intensidad del sombreado',1,0,1,.05)];
const shade=make('prota-cover-shade','Sombreado original · legibilidad','<div class="shade"></div><div class="line"></div>',
  '.shade{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 25%,rgb(17 24 39/.8) 55%,rgb(17 24 39/.95));opacity:var(--darkness)}.line{position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,#d47a4299,transparent)}@media(min-width:990px){.shade{background:linear-gradient(to right,rgb(17 24 39/.9),rgb(17 24 39/.5),transparent)}}',
  `lab.register(${JSON.stringify(shadeParams)},p=>document.documentElement.style.setProperty('--darkness',p.darkness));`,shadeParams);

const fontNames=[['barlow-400','c52d0a8a47055bb1-s.p.2p4adm_386h58.woff2','Barlow',400],['barlow-500','b5363c3b0545cfa1-s.p.0s4utfvp8prsy.woff2','Barlow',500],['barlow-condensed-500','bf56aec03b6c512f-s.p.2-6hkzwn24m5-.woff2','Barlow Condensed',500],['barlow-condensed-600','066ba92c8fc1c222-s.p.3lj349bs9hfu1.woff2','Barlow Condensed',600]];
const fonts=await Promise.all(fontNames.map(async([name,file])=>({path:`assets/${name}.woff2`,content:await data(`.next/dev/static/media/${file}`,'font/woff2')})));
const textParams=[
 control('eyebrow','Texto superior','Programas de escritorio · Pago único'),
 control('headline','Título','Herramientas que se compran una vez.'),
 control('description','Descripción','Pagás, descargás y las usás. La versión que comprás queda tuya de forma permanente, sin cuotas todos los meses.'),
 control('primary','Botón principal','Ver programas'),control('secondary','Botón secundario','Cómo funciona'),
 control('textColor','Color del título','#eef2f7','color'),control('mutedColor','Color de descripción','#94a3b8','color'),control('accentColor','Color del botón','#d47a42','color'),
 slider('textScale','Tamaño de los textos',1,.7,1.4,.05),slider('offsetX','Desplazamiento horizontal (px)',0,-150,150),slider('offsetY','Desplazamiento vertical (px)',0,-150,150)
];
const html='<section aria-labelledby="portada"><div class="container"><div class="copy"><p class="eyebrow"></p><h1 id="portada"></h1><p class="description"></p><div class="actions"><button class="primary"><span></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button><button class="secondary"></button></div></div></div></section>';
const css=`body{font-family:Barlow,Arial,sans-serif;color:var(--textColor);-webkit-font-smoothing:antialiased}section{height:100%;position:relative}.container{height:100%;width:100%;max-width:1400px;margin:auto;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(160px,38vh,300px) 16px 40px}.copy{min-width:0;max-width:576px;transform:translate(var(--offsetX),var(--offsetY));transform-origin:left center}.eyebrow{margin:0;font:500 calc(11px * var(--textScale))/1.5 'Barlow Condensed',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--mutedColor)}h1{margin:16px 0 0;font:600 calc(34.4px * var(--textScale))/.95 'Barlow Condensed',sans-serif;letter-spacing:-.015em;text-wrap:balance;overflow-wrap:anywhere}.description{margin:20px 0 0;max-width:448px;font-size:calc(16px * var(--textScale));line-height:1.625;color:var(--mutedColor)}.actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px}button{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;font:500 calc(14px * var(--textScale))/20px Barlow,sans-serif;cursor:pointer;border:1px solid transparent}.primary{background:var(--accentColor);color:#111827}.secondary{border-color:#2c3a4f;color:var(--textColor);background:transparent}button:hover{filter:brightness(1.12)}button:focus-visible{outline:2px solid #f0a66b;outline-offset:3px}@media(min-width:640px){.container{padding:clamp(120px,30vh,260px) 24px 48px}h1{font-size:calc(48px * var(--textScale));margin-top:20px}.description{margin-top:24px;font-size:calc(18px * var(--textScale))}.actions{margin-top:32px}}@media(min-width:990px){.container{justify-content:center;padding:64px 40px}.copy{max-width:384px}h1{font-size:calc(42.4px * var(--textScale))}}@media(min-width:1280px){.copy{max-width:448px}h1{font-size:calc(48px * var(--textScale))}}@media(min-width:1536px){h1{font-size:calc(60px * var(--textScale))}}`;
const js=fontNames.map(([name],i)=>`import font${i} from './assets/${name}.woff2';`).join('\n')+`
const style=document.createElement('style');style.textContent=[${fontNames.map(([, ,family,weight],i)=>'`@font-face{font-family:"'+family+'";font-weight:'+weight+';font-style:normal;font-display:swap;src:url("${font'+i+'}") format("woff2")}`').join(',')}].join('');document.head.append(style);
lab.register(${JSON.stringify(textParams)},p=>{for(const [id,selector] of Object.entries({eyebrow:'.eyebrow',headline:'h1',description:'.description',primary:'.primary span',secondary:'.secondary'}))document.querySelector(selector).textContent=p[id];for(const key of ['textColor','mutedColor','accentColor','textScale'])document.documentElement.style.setProperty('--'+key,p[key]);for(const key of ['offsetX','offsetY'])document.documentElement.style.setProperty('--'+key,p[key]+'px');});
document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>console.info('Vista de laboratorio: '+b.textContent.trim())));`;
const p=make('prota-code-cover','Prota Code · Portada',html,css,js,textParams,fonts);
const layer=(id,name,source)=>({id,name,kind:'effect',...(source?{source}:{}),transparent:!source||id!=='cover-image',x:0,y:0,scale:1,rotation:0,opacity:1,visible:true,locked:false,blend:'normal',mask:'none'});
p.composition={version:1,enabled:true,layers:[layer('cover-image','Imagen · portada original',bg),layer('cover-shade','Sombreado · legibilidad',shade),layer('cover-copy','Textos y botones · portada')],nodes:[],edges:[],tracks:[],duration:8,loop:true};
p.files.push({path:'REFERENCIA.md',content:'Fuente de lectura: tienda-protacode/src/components/home/Hero.tsx, src/config/site.ts y src/app/globals.css. Imagen: public/marca/portada.png (1672×941). Fuentes originales Barlow y Barlow Condensed, incluidas sin dependencia de red. Copia en español. Capas de imagen, sombreado y contenido. El lienzo utiliza todo el alto disponible del laboratorio; los puntos de corte y la tipografía siguen la portada. Los botones son una vista de composición, sin navegación de tienda. No se modificó la tienda.'});
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(p,null,2)+'\n');
console.log(output);
