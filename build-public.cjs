const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'public');
const files=['index.html','manage.html','app.css','club-background.css','admin-content.css','app.js','admin-content.js','domain.js','data.js','court.svg','fundo-nunalvares-v1.png','emblema-nunalvares.png','crest-alfa-ac.png','crest-vale-do-zezere.png','crest-baguim-do-monte.png','crest-casa-fcp-rio-tinto.png','crest-cp-vila-boa-do-bispo.png','crest-fc-amial-regado.png','crest-gondomar-fc.png','crest-gramidense-infante.png','crest-juventude-gaia.png','crest-leixoes.png','crest-leoes-da-guarda.png','crest-nunalvares.png','sponsor-1000-numeros.png','sponsor-batida-de-coco.png','sponsor-bcn.png','sponsor-belma.png','sponsor-medpartner.png','sponsor-re-mood.png','sponsor-optica-alto-da-maia.png'];
fs.mkdirSync(target,{recursive:true});
const extras=fs.readdirSync(target).filter(name=>!files.includes(name));
if(extras.length)throw Error('Ficheiros inesperados na pasta public. Rever antes de publicar: '+extras.join(', '));
for(const file of files)fs.copyFileSync(path.join(__dirname,file),path.join(target,file));
console.log('Preparados '+files.length+' ficheiros públicos. Nenhuma publicação foi executada.');
