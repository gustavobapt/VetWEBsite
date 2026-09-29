(function (root) {
  'use strict';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isClub = name => normalize(name).includes('alvares');
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
      for (const [key,max] of [['venue',180],['competition',120]]) if (g[key]!==undefined && (typeof g[key]!=='string'||g[key].length>max)) throw Error('Descrição do jogo demasiado longa.');
    }
    const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' inválido ou demasiado longo.');};
    const list=(key,max)=>{if(data[key]!==undefined&&(!Array.isArray(data[key])||data[key].length>max))throw Error('Lista de '+key+' inválida.');return data[key]||[];};
    const numbers=new Set();
    for(const p of list('players',200)) {
      if(!p||typeof p!=='object')throw Error('Jogador inválido.');
      text(p.name,100,'Nome');text(p.position,60,'Posição');
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
      if(!['technical','directors'].includes(member.group))throw Error('Escolhe equipa técnica ou direção.');
      if(member.photo && !safePhoto(member.photo))throw Error('A fotografia deve ter um endereço HTTPS válido, sem credenciais.');
    }
    for(const n of list('news',200)) {
      if(!n||typeof n!=='object')throw Error('Notícia inválida.');
      text(n.title,160,'Título');text(n.category,60,'Categoria');text(n.excerpt,400,'Resumo');text(n.body,15000,'Texto');
      if(!dateValid(n.date))throw Error('Data da notícia inválida.');
      if(n.photo && !safePhoto(n.photo))throw Error('A imagem da notícia deve ter um endereço HTTPS válido, sem credenciais.');
    }
    return data;
  }
  function safePhoto(value) {try{if(typeof value!=='string'||value.length>2048)return '';const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password ? u.href : '';}catch{return '';}}
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
  const api={escape,normalize,isClub,isTraining,complete,official,dateValid,dateParts,standings,fixtures,next,validate,safePhoto,calendarEvent};
  root.SCN = api;
  if(typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
