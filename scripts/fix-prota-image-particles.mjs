import{readFile,writeFile}from'node:fs/promises';
const p=JSON.parse(await readFile('projects/prota-code/portada-prota-code-v2.0.0.effectlab','utf8'));
p.modifiedAt=new Date().toISOString();
p.composition.layers=p.composition.layers.filter(l=>l.id!=='cover-shade');
const s=p.composition.layers.find(l=>l.id==='image-particles').source;
s.parameters.push({id:'wholeImage',binding:'wholeImage',label:'Dispersar toda la imagen',value:true,defaultValue:true,widget:'toggle',source:'code'});
for(const param of s.parameters){if(param.id==='scatter')param.value=param.defaultValue=140;if(param.id==='returnTime')param.value=param.defaultValue=2.2;}
s.files.find(f=>f.path==='parameters.json').content=JSON.stringify(s.parameters,null,2);
s.files.find(f=>f.path==='main.js').content=await readFile('effects/prota-tech/image-particles.js','utf8');
await writeFile('projects/prota-code/portada-prota-code-v2.1.0.effectlab',JSON.stringify(p,null,2)+'\n');
