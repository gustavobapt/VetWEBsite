(function (root) {
  'use strict';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isClub = name => normalize(name).includes('alvares');
  const crestKey = name => normalize(name).replace(/[^a-z0-9]/g,'');
  const teamCrests = Object.freeze(Object.fromEntries([
    ['Alfa AC','alfa-ac'],['Associação Vale do Zêzere','vale-do-zezere'],
    ['Baguim do Monte','baguim-do-monte'],['Casa FCP Rio Tinto','casa-fcp-rio-tinto'],
    ['CP Vila Boa do Bispo','cp-vila-boa-do-bispo'],['FC Amial Regado','fc-amial-regado'],
    ['Gondomar FC','gondomar-fc'],['Gramidense Infante','gramidense-infante'],
    ['Juventude Gaia','juventude-gaia'],['Leixões','leixoes'],['Leões da Guarda','leoes-da-guarda'],
    ['Os Maiatos','os-maiatos'],['AC. Pedras Rubras','ac-pedras-rubras'],
    ["Nun'Álvares",'nunalvares'],["SC Nun'Álvares",'nunalvares'],['SC Nun´Álvares','nunalvares']
  ].map(([name,slug])=>[crestKey(name),slug==='nunalvares'?'emblema-nunalvares-oficial.png':'crest-'+slug+'.png'])));
  const teamCrest = name => {const key=crestKey(name);return Object.hasOwn(teamCrests,key)?teamCrests[key]:'';};
  const isTraining = g => g.kind === 'training' || (normalize(g.away).includes('treino') && !complete(g));
  function complete(g) { return Number.isInteger(g.homeScore) && Number.isInteger(g.awayScore) && g.homeScore >= 0 && g.awayScore >= 0; }
  const official = g => g.kind ? g.kind === 'league' : normalize(g.competition).startsWith('campeonato');
  const dateValid = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0,10) === v;
  function dateParts(value) {
    if (!dateValid(value)) return {day:'—',month:'—',label:'Data a confirmar'};
    const dt = new Date(`${value}T12:00:00`);
    const parts = new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short'}).formatToParts(dt);
    return {day:parts.find(p=>p.type==='day').value,month:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][dt.getMonth()],label:new Intl.DateTimeFormat('pt-PT',{weekday:'short',day:'numeric',month:'long',year:'numeric'}).format(dt)};
  }
  function standings(data) {
    const rows = new Map((data.teams || []).map(team => [team,{team,played:0,won:0,drawn:0,lost:0,for:0,against:0,points:0}]));
    for (const game of data.results || []) {
      if (!complete(game) || !official(game) || game.home === game.away) continue;
      const h=rows.get(game.home), a=rows.get(game.away);
      if (!h || !a) continue;
      h.played++;a.played++;h.for+=game.homeScore;h.against+=game.awayScore;a.for+=game.awayScore;a.against+=game.homeScore;
      if (game.homeScore>game.awayScore) {h.won++;h.points+=3;a.lost++;}
      else if (game.homeScore<game.awayScore) {a.won++;a.points+=3;h.lost++;}
      else {h.drawn++;a.drawn++;h.points++;a.points++;}
    }
    return [...rows.values()].sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.team.localeCompare(b.team,'pt'));
  }
  function fixtures(data) {
    const list = [...(data.results || [])];
    const n = data.nextGame;
    if (n?.home && n?.away && !list.some(g=>g.date===n.date && g.home===n.home && g.away===n.away)) list.push({...n,competition:n.competition || 'Jogo agendado',homeScore:null,awayScore:null});
    return list.map((g,i)=>({...g,key:String(i)})).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'').localeCompare(b.time||''));
  }
  function byeTeam(data,round) {
    if(!Number.isInteger(round)||round<1||!Array.isArray(data.teams)||data.teams.length<3||data.teams.length%2===0)return '';
    const games=fixtures(data).filter(g=>official(g)&&g.round===round);
    const participants=games.flatMap(g=>[g.home,g.away]),playing=new Set(participants);
    if(games.length!==(data.teams.length-1)/2||playing.size!==participants.length||participants.some(t=>!data.teams.includes(t)))return '';
    const resting=data.teams.filter(t=>!playing.has(t));
    return resting.length===1?resting[0]:'';
  }
  function next(data,now = new Date()) {
    const local = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).replace(' ','T');
    return fixtures(data).find(g=>!complete(g) && (isClub(g.home)||isClub(g.away)) && `${g.date}T${g.time||'23:59'}`>=local) || null;
  }
  function validate(data) {
    if (!data || !Array.isArray(data.teams) || !data.teams.length || !Array.isArray(data.results) || !data.nextGame) throw Error('O ficheiro não contém os dados da equipa.');
    if (data.teams.some(t=>typeof t!=='string'||!t.trim()||t.length>100)) throw Error('Uma equipa tem um nome inválido.');
    if (data.teams.length>100 || data.results.length>2000 || new Set(data.teams.map(normalize)).size!==data.teams.length) throw Error('Verifica a lista de equipas e jogos.');
    if (typeof data.nextGame!=='object' || Array.isArray(data.nextGame)) throw Error('Próximo jogo inválido.');
    if (data.demo!==undefined && typeof data.demo!=='boolean') throw Error('Estado de demonstração inválido.');
    for (const g of [...data.results,...(data.nextGame.home ? [data.nextGame]:[])]) {
      if (!g || typeof g!=='object') throw Error('Jogo inválido.');
      if (!dateValid(g.date) || (g.time!=null && g.time!=='' && (typeof g.time!=='string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(g.time)))) throw Error('Verifica a data e a hora do jogo.');
      if (typeof g.home!=='string' || typeof g.away!=='string' || !g.home.trim() || !g.away.trim() || g.home===g.away) throw Error('Escolhe duas equipas diferentes.');
      if ((g.homeScore!=null || g.awayScore!=null) && !complete(g)) throw Error('Indica os dois resultados como números inteiros positivos ou zero.');
      if (g.home.length>100 || g.away.length>100 || (g.homeScore??0)>999 || (g.awayScore??0)>999) throw Error('Equipa ou resultado fora dos limites.');
      if (g.kind!==undefined && !['league','friendly','training'].includes(g.kind)) throw Error('Tipo de jogo inválido.');
      if(g.scorers!==undefined){
        if(!Array.isArray(g.scorers)||g.scorers.length>100)throw Error('Lista de marcadores inválida.');
        const seen=new Set(),totals=new Map();
        for(const s of g.scorers){
          if(!s||typeof s!=='object'||Array.isArray(s)||![g.home,g.away].includes(s.team)||typeof s.name!=='string'||!s.name.trim()||s.name.length>100||!Number.isInteger(s.goals)||s.goals<1||s.goals>999)throw Error('Marcador inválido.');
          const key=s.team+'|'+normalize(s.name.trim());
          if(seen.has(key))throw Error('Marcador repetido.');
          seen.add(key);totals.set(s.team,(totals.get(s.team)||0)+s.goals);
        }
        if(g.scorers.length&&(!complete(g)||(totals.get(g.home)||0)>g.homeScore||(totals.get(g.away)||0)>g.awayScore))throw Error('Os golos dos marcadores não podem exceder o resultado.');
      }
      for (const [key,max] of [['venue',180],['competition',120]]) if (g[key]!==undefined && (typeof g[key]!=='string'||g[key].length>max)) throw Error('Descrição do jogo demasiado longa.');
    }
    const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' inválido ou demasiado longo.');};
    const list=(key,max)=>{if(data[key]!==undefined&&(!Array.isArray(data[key])||data[key].length>max))throw Error('Lista de '+key+' inválida.');return data[key]||[];};
    const numbers=new Set();
    const profile=p=>{
      for(const [key,max] of [['fullName',100],['nickname',100],['bio',15000]])if(p[key]!==undefined&&(typeof p[key]!=='string'||p[key].length>max))throw Error('Campo da ficha inválido: '+key);
      if(p.facts!==undefined){if(!Array.isArray(p.facts)||p.facts.length>20)throw Error('Dados da ficha inválidos.');for(const f of p.facts){if(!f||typeof f!=='object')throw Error('Dado da ficha inválido.');text(f.label,80,'Campo');text(f.value,180,'Valor');}}
      if(p.career!==undefined){if(!Array.isArray(p.career)||p.career.length>200)throw Error('Percurso federado inválido.');for(const c of p.career){if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Época do percurso inválida.');for(const [key,max] of [['season',30],['club',180],['sport',60],['level',80]])text(c[key],max,'Percurso: '+key);}}
      if(p.stats!==undefined){if(!p.stats||typeof p.stats!=='object'||Array.isArray(p.stats))throw Error('Estatísticas inválidas.');for(const key of ['goals','conceded','yellowCards','redCards'])if(!Number.isInteger(p.stats[key])||p.stats[key]<0||p.stats[key]>9999)throw Error('Estatística inválida: '+key);}
    };
    for(const p of list('players',200)) {
      if(!p||typeof p!=='object')throw Error('Jogador inválido.');
      text(p.name,100,'Nome');text(p.position,60,'Posição');
      profile(p);
      if(p.nickname!==undefined && (typeof p.nickname!=='string'||p.nickname.length>100))throw Error('Nome curto do jogador inválido.');
      if(p.number!==undefined && p.number!=='') {
        if(!/^\d{1,2}$/.test(String(p.number))||numbers.has(Number(p.number)))throw Error('Número de jogador inválido ou repetido.');
        numbers.add(Number(p.number));
      }
      if(p.photo && !safePhoto(p.photo))throw Error('A fotografia deve ter um endereço HTTPS válido, sem credenciais.');
    }
    for(const member of list('staff',100)) {
      if(!member||typeof member!=='object'||Array.isArray(member))throw Error('Membro da equipa técnica ou direção inválido.');
      text(member.name,100,'Nome');text(member.role,80,'Cargo');
      profile(member);
      if(!['technical','directors'].includes(member.group))throw Error('Escolhe equipa técnica ou direção.');
      if(member.photo && !safePhoto(member.photo))throw Error('A fotografia deve ter um endereço HTTPS válido, sem credenciais.');
    }
    for(const n of list('news',200)) {
      if(!n||typeof n!=='object')throw Error('Notícia inválida.');
      text(n.title,160,'Título');text(n.category,60,'Categoria');text(n.excerpt,400,'Resumo');text(n.body,15000,'Texto');
      if(!dateValid(n.date))throw Error('Data da notícia inválida.');
      if(n.photo && !safePhoto(n.photo))throw Error('A imagem da notícia deve ter um endereço HTTPS válido, sem credenciais.');
      if(n.images!==undefined){
        if(!Array.isArray(n.images)||n.images.length>8)throw Error('A notícia pode ter até oito imagens adicionais.');
        for(const image of n.images){
          if(!image||typeof image!=='object'||!safePhoto(image.url))throw Error('A imagem adicional deve ter um endereço HTTPS válido, sem credenciais.');
          if(image.alt!==undefined)text(image.alt,200,'Descrição da imagem',true);
          if(image.caption!==undefined)text(image.caption,160,'Legenda da imagem',true);
        }
      }
    }
    for(const item of list('media',500)) {
      if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Conteúdo da galeria inválido.');
      if(!['photo','video'].includes(item.type))throw Error('Escolhe fotografia ou vídeo.');
      text(item.title,160,'Título da galeria');text(item.category,60,'Categoria da galeria');
      if(!dateValid(item.date))throw Error('Data da galeria inválida.');
      if(item.type==='photo'?!safePhoto(item.url):!videoSource(item.url))throw Error('Usa uma imagem HTTPS ou um vídeo MP4, WebM, OGG, YouTube ou Vimeo.');
      if(item.thumbnail&&!safePhoto(item.thumbnail))throw Error('A capa deve ter um endereço HTTPS válido.');
      for(const [key,max] of [['description',3000],['alt',200]])if(item[key]!==undefined&&(typeof item[key]!=='string'||item[key].length>max))throw Error('Descrição da galeria inválida.');
    }
    return data;
  }
  function safePhoto(value) {try{if(typeof value!=='string'||value.length>2048)return '';const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password ? u.href : '';}catch{return '';}}
  function videoSource(value) {
    const safe=safePhoto(value);if(!safe)return null;
    const u=new URL(safe),host=u.hostname;
    let id='';
    if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)\/?$/)?.[1];
    else if(host==='youtu.be')id=u.pathname.slice(1);
    if(id&&/^[\w-]{11}$/.test(id))return {kind:'youtube',src:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0'};
    if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
      const match=u.pathname.match(/^\/(?:video\/)?(\d{1,15})\/?$/);
      if(match)return {kind:'vimeo',src:'https://player.vimeo.com/video/'+match[1]};
    }
    if(/\.(mp4|webm|ogg)$/i.test(u.pathname))return {kind:'file',src:safe};
    return null;
  }
  function calendarEvent(g,description='',now=new Date()) {
    if(!dateValid(g.date))throw Error('Data inválida para o calendário.');
    const text=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,c=>'\\'+c);
    const day=g.date.replace(/-/g,''),timed=!!g.time;
    const zone=['BEGIN:VTIMEZONE','TZID:Europe/Lisbon','BEGIN:DAYLIGHT','DTSTART:20260329T010000','TZOFFSETFROM:+0000','TZOFFSETTO:+0100','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:20261025T020000','TZOFFSETFROM:+0100','TZOFFSETTO:+0000','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','END:VTIMEZONE'];
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SCNA//Veteranos//PT',...(timed?zone:[]),'BEGIN:VEVENT','UID:'+encodeURIComponent(g.sourceId||[g.date,g.home,g.away].join('-'))+'@scna','DTSTAMP:'+now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),timed?'DTSTART;TZID=Europe/Lisbon:'+day+'T'+g.time.replace(':','')+'00':'DTSTART;VALUE=DATE:'+day,...(timed?[]:['DURATION:P1D']),'SUMMARY:'+text(g.home+' — '+g.away),'LOCATION:'+text(g.venue||'Local a confirmar'),'DESCRIPTION:'+text([description,!timed?'Hora a confirmar. Evento de dia inteiro até ser publicado o horário.':'', 'Datas sujeitas a alterações; confirmar junto do clube.'].filter(Boolean).join(' ')),'END:VEVENT','END:VCALENDAR'];
    // RFC 5545: fold long UTF-8 lines without splitting a code point.
    const fold=line=>{let out='',bytes=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(bytes+size>75){out+='\r\n ';bytes=1;}out+=c;bytes+=size;}return out;};
    return lines.map(fold).join('\r\n')+'\r\n';
  }
  const api={escape,normalize,isClub,teamCrest,isTraining,complete,official,dateValid,dateParts,standings,fixtures,byeTeam,next,validate,safePhoto,videoSource,calendarEvent};
  root.SCN = api;
  if(typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
