const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'public');
const files=['index.html','manage.html','app.css','club-background.css','admin-content.css','app.js','admin-content.js','domain.js','data.js','court.svg','fundo-nunalvares-v1.png','emblema-nunalvares.png'];
fs.mkdirSync(target,{recursive:true});
const extras=fs.readdirSync(target).filter(name=>!files.includes(name));
if(extras.length)throw Error('Ficheiros inesperados na pasta public. Rever antes de publicar: '+extras.join(', '));
for(const file of files)fs.copyFileSync(path.join(__dirname,file),path.join(target,file));
console.log('Preparados '+files.length+' ficheiros públicos. Nenhuma publicação foi executada.');
