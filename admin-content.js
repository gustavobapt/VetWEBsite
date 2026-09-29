(() => {
  'use strict';
  const D=window.SCN,e=D.escape,$=s=>document.querySelector(s);
  const forms={next:$('#next-game-form'),game:$('#result-form'),player:$('#player-form'),news:$('#news-form'),settings:$('#settings-form')};
  const editing={game:-1,player:-1,news:-1},keys={game:'results',player:'players',news:'news'};
  const labels={game:['result-title','Agendar jogo ou registar resultado','cancel-edit','jogo'],player:['player-title','Plantel','cancel-player','jogador'],news:['news-title','Notícias','cancel-news','notícia']};
  let data,undo=null,busy=false,resolveConfirmation=null;
  const identity=g=>[g.date,g.home,g.away].join('|');
  function status(text,error=false){const box=$('#status');box.textContent=text;box.hidden=false;box.classList.toggle('error',error);box.scrollIntoView({block:'nearest'});}
  function confirmChange(title,description){$('#confirm-title').textContent=title;$('#confirm-description').textContent=description;$('#confirm-dialog').showModal();$('#confirm-cancel').focus();return new Promise(resolve=>resolveConfirmation=resolve);}
  function finishConfirm(answer){$('#confirm-dialog').close();resolveConfirmation?.(answer);resolveConfirmation=null;}
  $('#confirm-cancel').onclick=()=>finishConfirm(false);$('#confirm-accept').onclick=()=>finishConfirm(true);
  $('#confirm-dialog').addEventListener('cancel',event=>{event.preventDefault();finishConfirm(false);});
  function fill(form,item){for(const input of form.elements)if(input.name)input.value=item[input.name]??'';}
  function gameFields(g){return {...g,kind:g.kind||(D.isTraining(g)?'training':D.official(g)?'league':'friendly')};}
  function teamOptions(){document.querySelectorAll('select[name=home],select[name=away]').forEach(select=>{const current=select.value;const names=[...new Set([...data.teams,...data.results.flatMap(g=>[g.home,g.away]),data.nextGame.home,data.nextGame.away].filter(Boolean))];select.innerHTML=names.map(t=>'<option value="'+e(t)+'">'+e(t)+'</option>').join('');if(names.includes(current))select.value=current;});}
  function fillNext(){fill(forms.next,gameFields(data.nextGame));}
  function buttons(kind,i){const label=labels[kind][3];return '<div class="record-actions"><button class="text-button" data-edit="'+kind+'" data-index="'+i+'">Editar '+label+'</button><button class="text-button danger" data-remove="'+kind+'" data-index="'+i+'">Remover '+label+'</button></div>';}
  function render(){
    $('#records').innerHTML=data.results.map((g,i)=>'<article class="record"><span class="record-date">'+e(D.dateParts(g.date).label)+'</span><span><b>'+e(g.home)+' '+(D.complete(g)?g.homeScore+' – '+g.awayScore:'vs')+' '+e(g.away)+'</b><br>'+e(g.competition)+' · '+e(g.time||'Hora a confirmar')+'</span>'+buttons('game',i)+'</article>').join('')||'<p class="admin-lead">Ainda não há jogos registados.</p>';
    $('#player-records').innerHTML=(data.players||[]).map((p,i)=>'<article class="record"><span class="record-date">N.º '+e(p.number)+'</span><span><b>'+e(p.name)+'</b>'+(p.nickname?'<br><small>'+e(p.nickname)+'</small>':'')+'<br><small>'+e(p.position)+'</small></span>'+buttons('player',i)+'</article>').join('')||'<p class="admin-lead">O plantel ainda está vazio.</p>';
    $('#news-records').innerHTML=(data.news||[]).map((n,i)=>'<article class="record"><span class="record-date">'+e(D.dateParts(n.date).label)+'</span><span><b>'+e(n.title)+'</b><br><small>'+e(n.category)+'</small></span>'+buttons('news',i)+'</article>').join('')||'<p class="admin-lead">Ainda não há notícias.</p>';
    $('#admin-summary').innerHTML=[[data.results.length,'Jogos'],[(data.players||[]).length,'Jogadores'],[(data.news||[]).length,'Notícias']].map(([n,label])=>'<div><b>'+n+'</b><span>'+label+'</span></div>').join('');
    forms.settings.elements.demo.checked=data.demo!==false;
  }
  function reset(kind){editing[kind]=-1;forms[kind].reset();$('#'+labels[kind][0]).textContent=labels[kind][1];$('#'+labels[kind][2]).hidden=true;}
  async function commit(candidate,message,remember=true){
    if(busy||!data)return false;busy=true;
    const controls=[...document.querySelectorAll('main button,main input,main textarea,main select')],states=controls.map(c=>c.disabled),previous=structuredClone(data);controls.forEach(c=>c.disabled=true);
    try{await window.saveScnData(candidate);undo=remember?previous:null;data=window.scnData;render();$('#undo-change').hidden=!undo;status(message+(window.scnMode==='local'?' Guardado neste navegador.':' Guardado no site online.'));return true;}
    catch(err){status(err.name==='TimeoutError'?'A ligação demorou demasiado. Exporta a cópia e atualiza a página antes de repetir a gravação.':err.message||'Não foi possível guardar.',true);return false;}
    finally{controls.forEach((c,i)=>c.disabled=states[i]);busy=false;}
  }
  function formData(form){const item=Object.fromEntries(new FormData(form));Object.keys(item).forEach(k=>item[k]=item[k].trim());return item;}
  forms.next.onsubmit=async event=>{event.preventDefault();if(!data||busy)return;const g=formData(forms.next),candidate=structuredClone(data),previous=candidate.nextGame;candidate.nextGame=g;
    const oldIndex=candidate.results.findIndex(r=>identity(r)===identity(previous)&&!D.complete(r)),newIndex=candidate.results.findIndex(r=>identity(r)===identity(g));
    if(newIndex>=0){if(D.complete(candidate.results[newIndex]))return status('Este jogo já tem resultado. Usa a edição de jogos para o alterar.',true);candidate.results[newIndex]={...candidate.results[newIndex],...g};if(oldIndex>=0&&oldIndex!==newIndex)candidate.results.splice(oldIndex,1);}
    else if(oldIndex>=0)candidate.results[oldIndex]={...g,homeScore:null,awayScore:null};else candidate.results.push({...g,homeScore:null,awayScore:null});
    if(await commit(candidate,'Próximo jogo atualizado.')){reset('game');fillNext();}
  };
  forms.game.onsubmit=async event=>{event.preventDefault();if(!data||busy)return;const g=formData(forms.game);g.homeScore=g.homeScore===''?null:Number(g.homeScore);g.awayScore=g.awayScore===''?null:Number(g.awayScore);const candidate=structuredClone(data),same=candidate.results.findIndex(r=>identity(r)===identity(g));if(editing.game>=0&&same>=0&&same!==editing.game)return status('Já existe um jogo com estas equipas e data.',true);if(editing.game<0&&same>=0)return status('Este jogo já existe. Usa Editar jogo para o alterar.',true);const i=editing.game>=0?editing.game:same,prior=i>=0?data.results[i]:null;if(i>=0)candidate.results[i]={...prior,...g};else candidate.results.push(g);if(prior&&identity(data.nextGame)===identity(prior))candidate.nextGame={...g};if(await commit(candidate,'Jogo guardado. A classificação foi atualizada.')){reset('game');fillNext();}};
  for(const kind of ['player','news'])forms[kind].onsubmit=async event=>{event.preventDefault();if(!data||busy)return;const item=formData(forms[kind]),candidate=structuredClone(data),key=keys[kind];candidate[key]||=[];if(editing[kind]>=0)candidate[key][editing[kind]]=item;else candidate[key].push(item);if(await commit(candidate,'Conteúdo guardado e disponível no site.'))reset(kind);};
  for(const kind of Object.keys(labels))$('#'+labels[kind][2]).onclick=()=>reset(kind);
  document.addEventListener('click',async event=>{const b=event.target.closest('[data-edit],[data-remove]');if(!b||!data||busy)return;const kind=b.dataset.edit||b.dataset.remove,key=keys[kind],i=Number(b.dataset.index),item=data[key]?.[i];if(!item)return;
    if(b.dataset.edit){editing[kind]=i;fill(forms[kind],kind==='game'?gameFields(item):item);$('#'+labels[kind][0]).textContent='Editar '+labels[kind][3];$('#'+labels[kind][2]).hidden=false;forms[kind].scrollIntoView({block:'center'});forms[kind].querySelector('input').focus();return;}
    const label=kind==='game'?item.home+' — '+item.away:item.name||item.title;
    if(!await confirmChange('Remover este conteúdo?',label+' deixará de aparecer no site. Podes desfazer enquanto esta página permanecer aberta, antes da próxima gravação.'))return;
    const candidate=structuredClone(data);candidate[key].splice(i,1);if(kind==='game'&&identity(candidate.nextGame)===identity(item))candidate.nextGame={};if(await commit(candidate,'Conteúdo removido.')){reset(kind);fillNext();}
  });
  $('#undo-change').onclick=async()=>{if(!undo||busy)return;if(await commit(structuredClone(undo),'Última alteração desfeita.',false)){Object.keys(editing).forEach(reset);teamOptions();fillNext();}};
  forms.settings.onsubmit=async event=>{event.preventDefault();if(!data||busy)return;const demo=forms.settings.elements.demo.checked;if(!demo&&!await confirmChange('Confirmar conteúdos reais','Confirmas que substituíste todos os exemplos por informação validada pelo clube? Esta opção apenas muda a identificação dos conteúdos.'))return;await commit({...structuredClone(data),demo},'Identificação dos conteúdos atualizada.');};
  let exportUrl=null;
  $('#export-data').onclick=()=>{if(!data)return;if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(new Blob([window.scnLoadError&&window.scnRecoveryRaw!=null?window.scnRecoveryRaw:JSON.stringify(data,null,2)],{type:'application/json'}));let a=$('#backup-download');if(!a){a=document.createElement('a');a.id='backup-download';a.className='text-button';$('#export-data').after(a);}a.href=exportUrl;a.download='sc-nunalvares-dados-'+new Date().toISOString().slice(0,10)+'.json';a.textContent='Descarregar a cópia preparada';a.click();status('Cópia preparada. Se o download não iniciar, usa o link ao lado de Exportar cópia.');};
  $('#import-data').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file||!data||busy)return;try{if(file.size>1000000)throw Error('A cópia deve ter no máximo 1 MB.');const candidate=D.validate(JSON.parse(await file.text())),summary=candidate.results.length+' jogos, '+(candidate.players||[]).length+' jogadores e '+(candidate.news||[]).length+' notícias. Vai substituir os conteúdos atuais. Exporta primeiro uma cópia se precisares de os conservar.';if(!await confirmChange('Importar cópia?',summary))return;if(await commit(candidate,'Cópia importada.')){Object.keys(editing).forEach(reset);teamOptions();fillNext();}}catch(err){status(err instanceof SyntaxError?'Este ficheiro não contém JSON válido.':err.message,true);}};
  window.addEventListener('storage',event=>{if(event.key==='scn-data'&&window.scnMode==='local')status('Os dados foram alterados noutra janela. Exporta a tua cópia e atualiza esta página antes de guardar.',true);});
  const controls=[...document.querySelectorAll('main button,main input,main select,main textarea')];controls.forEach(c=>c.disabled=true);
  window.scnReady.then(d=>{data=d;teamOptions();fillNext();render();controls.forEach(c=>c.disabled=false);$('#mode-label').textContent=window.scnMode==='local'?'Modo local · alterações guardadas apenas neste navegador.':window.scnConnected?'Ligado à base de dados online.':'Sem ligação à base de dados online.';$('#online-access').hidden=window.scnMode==='local';if(window.scnLoadError)status('Os dados locais não puderam ser lidos. Exporta uma cópia para revisão; as gravações estão bloqueadas para preservar o original.',true);else if(window.scnMode==='remote'&&!window.scnConnected)status('A gestão online ainda não está ligada. A gravação está indisponível.',true);});
})();
