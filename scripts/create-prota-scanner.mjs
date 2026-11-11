import{readFile,writeFile}from'node:fs/promises';
const p=JSON.parse(await readFile('projects/prota-code/portada-prota-code-v1.1.0.effectlab','utf8'));
p.id='prota-code-scanner-02';p.name='Prota Code · Escáner interactivo';
p.description='Propuesta 02: lente luminosa que revela circuitos al mover el mouse, microestela azul y pulso cobre al clic.';
p.modifiedAt=new Date().toISOString();
const layer=p.composition.layers.find(l=>l.id==='tech-light');layer.name='Escáner de circuitos · mouse';
const s=layer.source;s.id='prota-circuit-scanner';
s.files.find(f=>f.path==='main.js').content=await readFile('effects/prota-tech/scanner.js','utf8');
for(const param of s.parameters){
 if(param.id==='blue')param.value=param.defaultValue='#369dff';
 if(param.id==='light')param.value=param.defaultValue=.85;
 if(param.id==='sparks'){param.value=param.defaultValue=.85;param.label='Luminosidad de circuitos y partículas';}
}
s.parameters.push({id:'radius',binding:'radius',label:'Radio del escáner (px)',value:155,defaultValue:155,widget:'slider',min:80,max:210,step:5,source:'code'});
s.files.find(f=>f.path==='parameters.json').content=JSON.stringify(s.parameters,null,2);
await writeFile('projects/prota-code/portada-prota-code-v1.2.1.effectlab',JSON.stringify(p,null,2)+'\n');
