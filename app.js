(() => {
  'use strict';
  const D=window.SCN, esc=D.escape;
  const paths={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4M17 3v4M3 11h18M7 15h2M14 15h2',table:'M4 4h16v16H4ZM4 9h16M4 14h16M9 4v16',team:'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM17 4a4 4 0 0 1 0 7M21 21v-2a4 4 0 0 0-3-4',news:'M5 3h13v18H5ZM8 7h7M8 11h7M8 15h3M3 7v12a2 2 0 0 0 2 2M18 7h3v12a2 2 0 0 1-2 2',shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6ZM8 12l3 3 5-6',settings:'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',menu:'M4 6h16M4 12h16M4 18h16',arrow:'M4 12h16M14 6l6 6-6 6',pin:'M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',trophy:'M8 3h8v8a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 15v6M8 21h8',ball:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8l4 3-2 5h-4l-2-5ZM12 3v5M21 10l-5 1M17 20l-3-4M7 20l3-4M3 10l5 1',instagram:'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM17 7h.01',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2'};
  const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.ball}"/></svg>`;
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  const titles={inicio:'Visão geral',jogos:'Jogos e resultados',classificacao:'Classificação',equipa:'A equipa',noticias:'Notícias',clube:'O clube'};
  const aliases={'dash-home':'inicio','dash-jogo':'jogos','dash-calendario':'jogos','dash-tabela':'classificacao','dash-notas':'noticias',calendario:'jogos',plantel:'equipa',top:'inicio'};
  const main=document.querySelector('#content'),dialog=document.querySelector('#detail-dialog');
  let data, allGames=[], currentRoute='inicio', filter='all', round='', ownOnly=false;
  const matchButton=g=>`<button class="fixture-arrow" data-game="${g.key}" aria-label="Detalhes: ${esc(g.home)} — ${esc(g.away)}">${icon('arrow')}</button>`;
  const initials=name=>D.isClub(name)?'NA':String(name).split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const nameLabel=name=>D.isClub(name)?"Nun'Álvares":esc(name);
  const badge=(name,size='')=>{const src=D.teamCrest(name);return `<span class="team-badge ${D.isClub(name)?'own':''} ${src?'has-crest':''} ${size?'badge-'+size:''}" aria-hidden="true"><span class="badge-initials">${esc(initials(name))}</span>${src?`<img src="${src}" alt="" width="200" height="200" decoding="async">`:''}</span>`;};
  const teamLabel=(name,size='small')=>`<span class="team-label">${badge(name,size)}<span>${nameLabel(name)}</span></span>`;
  document.addEventListener('error',e=>{if(e.target.matches?.('.team-badge img')){e.target.parentElement.classList.remove('has-crest');e.target.remove();}else if(e.target.matches?.('.partner-logo'))e.target.hidden=true;},true);
  const heading=(title,subtitle)=>`<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><span class="season-badge">${icon('calendar')} Época 2026/27</span></div>`;
  const empty=(title,text)=>`<div class="empty-state">${icon('calendar')}<h3>${title}</h3><p>${text}</p></div>`;
  const demoNote=()=>data.demo!==false?`<p class="demo-note">Versão em atualização · confirma datas, horários e restantes informações junto do clube.</p>`:'';
  const photo=(url,label)=>D.safePhoto(url)?`<img class="content-photo" src="${esc(D.safePhoto(url))}" alt="${esc(label)}" loading="lazy" referrerpolicy="no-referrer">`:'';
  function mapsUrl(venue) {
    if(typeof venue!=='string')return '';
    const place=venue.trim();
    if(!place||['local a confirmar','a confirmar','local por definir','por definir','—','-'].includes(D.normalize(place)))return '';
    const url=new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api','1');
    url.searchParams.set('query',place.replace(/\s*·\s*/g,', '));
    return url.href;
  }
  function mapLink(g) {
    const url=mapsUrl(g.venue);
    return url?`<a class="venue-map-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(g.venue)} no Google Maps (nova janela)" title="Abrir no Google Maps">${icon('pin')}</a>`:'';
  }
  function venueLocation(g) {
    const name=typeof g.venue==='string'&&g.venue.trim()?g.venue.trim():'Local a confirmar';
    return `<span class="venue-location"><span class="venue-name">${esc(name)}</span>${mapLink(g)}</span>`;
  }
  function fixture(g,full=false) {
    const dp=D.dateParts(g.date), training=D.isTraining(g), completed=D.complete(g);
    return `<article class="fixture-row"><div class="date-tile"><b>${esc(dp.day)}</b><small>${esc(dp.month)}</small></div><div><div class="fixture-title">${training?'Treino da equipa':`${teamLabel(g.home)} <span class="fixture-separator" aria-label="contra">—</span> ${teamLabel(g.away)}`}</div><p class="fixture-meta">${esc(g.competition||'Jogo agendado')} · ${esc(g.time||'Hora a confirmar')}</p><p class="fixture-venue">${venueLocation(g)}</p></div>${full?`<span class="${completed?'fixture-score':'tag'}">${completed?`${g.homeScore} – ${g.awayScore}`:(D.isClub(g.home)?'Casa':D.isClub(g.away)?'Fora':'Jogo')}</span>`:''}${matchButton(g)}</article>`;
  }
  function table(compact=false) {
    const rows=D.standings(data).map((row,i)=>({...row,rank:i+1}));
    let shown=rows;
    if(compact){shown=rows.slice(0,4);const own=rows.find(r=>D.isClub(r.team));if(own&&!shown.includes(own))shown.push(own);}
    const played=rows.some(r=>r.played);
    return `<div class="table-wrap" tabindex="0" role="region" aria-label="${compact?'Resumo da classificação':'Classificação completa'}"><table><caption class="sr-only">Campeonato Masters 2026/27</caption><thead><tr><th scope="col">#</th><th scope="col">EQUIPA</th><th scope="col" title="Jogos">J</th>${compact?'':'<th scope="col" title="Vitórias">V</th><th scope="col" title="Empates">E</th><th scope="col" title="Derrotas">D</th><th scope="col" title="Golos marcados">GM</th><th scope="col" title="Golos sofridos">GS</th><th scope="col" title="Diferença de golos">DG</th>'}<th scope="col" title="Pontos">PTS</th></tr></thead><tbody>${shown.map(r=>`<tr class="${D.isClub(r.team)?'own-row':''}"><td>${played?r.rank:'—'}</td><td>${teamLabel(r.team)}</td><td>${r.played}</td>${compact?'':`<td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.for}</td><td>${r.against}</td><td>${r.for-r.against}</td>`}<td class="points">${r.points}</td></tr>`).join('')||`<tr><td colspan="${compact?4:10}">Nenhuma equipa encontrada.</td></tr>`}</tbody></table></div>`;
  }
  function matchPanel() {
    const next=D.next(data);
    if(!next) return `<section class="panel match-panel"><div class="panel-header"><h2>Próximo jogo</h2></div>${empty('À espera do próximo desafio','Ainda não existe um próximo jogo agendado.')}<a class="match-action" href="#jogos">Consultar jogos →</a></section>`;
    const g=allGames.find(g=>g.date===next.date&&g.home===next.home&&g.away===next.away), training=D.isTraining(g);
    return `<section class="panel match-panel" aria-label="Próximo ${training?'treino':'jogo'}"><div class="panel-header"><h2 class="match-label">PRÓXIMO ${training?'TREINO':'JOGO'}</h2><span class="tag">${esc(D.normalize(g.competition).startsWith('jogo-treino')?'Jogo-treino':(g.competition||'Agendado').split('·').pop().trim())}</span></div><p class="match-date">${esc(D.dateParts(g.date).label)}</p><div class="match-sides"><div>${badge(g.home)}<span class="team-name">${nameLabel(g.home)}</span><small class="team-side">${training?'EQUIPA':'CASA'}</small></div><div class="kickoff"><strong>${esc(g.time||'—')}</strong><small>${!g.time?'Hora a confirmar':training?'TREINO':'VS'}</small></div><div>${badge(g.away)}<span class="team-name">${nameLabel(g.away)}</span><small class="team-side">${training?'PRÉ-ÉPOCA':'VISITANTE'}</small></div></div><p class="venue">${venueLocation(g)}</p><button class="match-action" data-game="${g.key}">Ver detalhes do jogo &nbsp; →</button></section>`;
  }
  function featuredNews() {
    const entry=(data.news||[]).map((n,i)=>({n,i})).sort((a,b)=>Number(b.n.featured===true)-Number(a.n.featured===true)||b.n.date.localeCompare(a.n.date))[0];
    if(!entry)return '';
    const {n,i}=entry, image=D.safePhoto(n.photo);
    return `<section class="panel featured-news" aria-labelledby="featured-news-heading"><div class="panel-header"><h2 id="featured-news-heading">Em destaque</h2><a class="text-button" href="#noticias">Todas as notícias ${icon('arrow')}</a></div><article class="featured-news-content ${image?'':'without-image'}">${image?`<button class="featured-news-image" data-news="${i}" aria-label="Ler notícia: ${esc(n.title)}">${photo(image,n.title)}</button>`:''}<div class="featured-news-copy"><span class="tag red">${esc(n.category)}</span><h3>${esc(n.title)}</h3>${D.dateValid(n.eventDate)?`<p class="featured-news-date">${icon('calendar')} ${esc(D.dateParts(n.eventDate).label)}</p>`:''}<p>${esc(n.excerpt)}</p>${n.venue?`<p class="featured-news-venue">${venueLocation(n)}</p>`:''}<button class="button" data-news="${i}">Ler notícia ${icon('arrow')}</button></div></article></section>`;
  }
  function overview() {
    const own=D.standings(data).find(r=>D.isClub(r.team))||{played:0,won:0,for:0,points:0};
    const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon'}).format(new Date());
    const upcoming=allGames.filter(g=>!D.complete(g)&&g.date>=now&&(D.isClub(g.home)||D.isClub(g.away))).slice(0,3);
    return heading('A nossa equipa. A nossa casa.','Tudo o que acontece com os veteranos, num só lugar.')+`<div class="hero-grid"><section class="hero"><div><span class="hero-label">SPORT CLUBE NUN'ÁLVARES · REC​AREI</span><h2>Um clube,<br>uma paixão,<br>uma família!!</h2><p>SC Nun’Álvares sempre!</p></div><img class="hero-emblem" src="emblema-nunalvares-oficial.png" width="700" height="946" alt="Emblema do SC Nun'Álvares"><div class="hero-bottom"><a class="button white" href="#equipa">Conhecer a equipa ${icon('arrow')}</a><span>26 / 27</span></div></section>${matchPanel()}</div>${featuredNews()}<section class="stat-grid" aria-label="Números no campeonato">${[['calendar',own.played,'Jogos disputados'],['trophy',own.won,'Vitórias'],['ball',own.for,'Golos marcados'],['table',own.points,'Pontos conquistados']].map(([i,v,label])=>`<article class="stat"><span class="stat-icon">${icon(i)}</span><div><b>${v}</b><small>${label}</small></div></article>`).join('')}</section><div class="overview-grid"><section class="panel"><div class="panel-header"><h2>Na agenda</h2><a class="text-button" href="#jogos">Todos os jogos ${icon('arrow')}</a></div>${upcoming.map(g=>fixture(g)).join('')||empty('Agenda em atualização','Os próximos jogos aparecem aqui quando forem agendados.')}<p class="panel-note">${data.calendarSource?'Calendário zerozero · horários sujeitos a confirmação':data.demo!==false?'Datas de exemplo · confirmação pendente':'Próximos jogos agendados'}</p></section><section class="panel"><div class="panel-header"><h2>Classificação</h2><a class="text-button" href="#classificacao">Tabela completa ${icon('arrow')}</a></div>${table(true)}<p class="panel-note">${own.played?'Pontuação calculada a partir dos resultados registados.':'Sem resultados registados. Época por começar.'}</p></section></div><div class="lower-grid"><section class="training-card"><div><span class="eyebrow">O TRABALHO COMEÇA AQUI</span><h2>Da semana de treino ao dia de jogo.</h2><p>Consulta os horários de pré-época da equipa.</p></div><a class="text-button" href="#clube" aria-label="Ver horários de treino">${icon('arrow')}</a></section><section class="social-card"><div><h2>Acompanha o Nun'Álvares</h2><p>O clube também se vive fora do pavilhão.</p></div><div class="social-links"><a href="https://www.instagram.com/scnunalvares/" target="_blank" rel="noreferrer" aria-label="Instagram do clube">${icon('instagram')}</a><a href="https://www.facebook.com/399576246821132" target="_blank" rel="noreferrer" aria-label="Facebook do clube">f</a></div></section></div>`+demoNote();
  }
  function gamesList() {
    let games=allGames.filter(g=>filter==='all'||(filter==='results'?D.complete(g):!D.complete(g)));
    if(ownOnly) games=games.filter(g=>D.isClub(g.home)||D.isClub(g.away));
    if(round) games=games.filter(g=>round==='friendly'?friendlyGame(g):String(g.round)===round);
    if(filter==='results') games=[...games].reverse();
    return games.length?`<p class="calendar-count" role="status">${games.length} ${games.length===1?'jogo':'jogos'}</p>`+games.map(g=>fixture(g,true)).join(''):`<div class="panel">${empty(filter==='results'?'O marcador ainda não abriu.':'Nenhum jogo encontrado.',filter==='results'?'Os resultados aparecem aqui depois de serem registados.':'Experimenta outra jornada ou filtro.')}</div>`;
  }
  const friendlyGame=g=>!D.official(g)&&!D.isTraining(g);
  function gamesPage() {
    const rounds=[...new Set(allGames.map(g=>g.round).filter(Number.isInteger))].sort((a,b)=>a-b);
    const hasFriendlies=allGames.some(friendlyGame),options=[...(hasFriendlies?['friendly']:[]),...rounds.map(String)];
    if(!options.includes(round)){
      const next=D.next(data);
      round=hasFriendlies&&next&&friendlyGame(next)?'friendly':rounds.length?String(rounds[0]):hasFriendlies?'friendly':'';
    }
    return heading('Cada jornada conta.','Calendário, resultados e todos os detalhes dos jogos.')+`<div class="toolbar"><div class="filter-tabs" role="group" aria-label="Filtrar jogos">${[['all','Todos os jogos'],['pending','Por disputar'],['results','Resultados']].map(([v,t])=>`<button data-filter="${v}" aria-pressed="${v===filter}">${t}</button>`).join('')}</div></div><div class="toolbar"><div class="filter-tabs"><button id="club-games" aria-pressed="${ownOnly}">Só Nun’Álvares</button></div>${options.length?`<select class="search-field" id="round-select" aria-label="Filtrar por jornada">${hasFriendlies?`<option value="friendly" ${round==='friendly'?'selected':''}>Jogos-treino e amigáveis</option>`:''}${rounds.map(n=>`<option value="${n}" ${String(n)===round?'selected':''}>Jornada ${n}</option>`).join('')}</select>`:''}</div>${data.calendarSource?`<p class="calendar-note">AF Porto Futsal Masters 2026/27 · ${rounds.length} jornadas · <a href="https://www.zerozero.pt/edicao/af-porto-futsal-masters-2026-2027/223816/calendario" target="_blank" rel="noreferrer">Fonte: zerozero</a>. Datas sujeitas a alterações; hora e local a confirmar quando não indicados.</p>`:''}<div class="game-list" id="game-list">${gamesList()}</div>`+demoNote();
  }
  function rankingPage() {return heading('O campeonato, ponto a ponto.','Consulta a classificação das '+data.teams.length+' equipas.')+`<div class="toolbar"><span class="tag">Vitória 3 pts · Empate 1 pt · Derrota 0 pts</span></div><section class="panel standings-full"><div id="standings-table">${table()}</div><p class="rank-note">Ordenação provisória: pontos, diferença de golos, golos marcados e nome. Os critérios oficiais de desempate aguardam confirmação. Amigáveis e treinos não contam.</p></section>`;}
  function staffSections() {
    return [['technical','Treinador e equipa técnica','A orientação dentro de campo.','Treinador a anunciar'],['directors','Direção','Quem acompanha e organiza a equipa.','Diretores a anunciar']].map(([group,title,subtitle,pending])=>{
      const members=(data.staff||[]).filter(p=>p.group===group);
      return `<section class="staff-section" aria-labelledby="staff-${group}"><h2 class="section-title" id="staff-${group}">${title}</h2><p class="admin-lead">${subtitle}</p>${members.length?`<div class="players-grid">${members.map(p=>`<article class="player-card staff-card ${group}">${photo(p.photo,p.name)}<span class="tag ${group==='directors'?'red':''}">${esc(p.role)}</span><h3>${esc(p.name)}</h3><button class="text-button profile-button" data-profile="staff" data-index="${data.staff.indexOf(p)}" aria-label="Ver ficha de ${esc(p.name)}">Ver ficha ${icon('arrow')}</button></article>`).join('')}</div>`:`<div class="panel staff-pending"><span class="stat-icon" aria-hidden="true">${icon(group==='technical'?'team':'shield')}</span><div><h3>${pending}</h3><p>Informação a confirmar pelo clube.</p></div></div>`}</section>`;
    }).join('');
  }
  function squadPage() {const players=[...(data.players||[])].sort((a,b)=>Number(a.number)-Number(b.number));return heading('Quem veste a camisola.','O plantel dos Veteranos do SC Nun’Álvares.')+(players.length?`<div class="players-grid">${players.map(p=>`<article class="player-card">${photo(p.photo,p.name)}<span class="player-number">${esc(p.number||'—')}</span><h2>${esc(p.name)}</h2>${p.nickname?`<p class="player-nickname">${esc(p.nickname)}</p>`:""}<p>${esc(p.position||'Jogador')}</p><button class="text-button profile-button" data-profile="players" data-index="${data.players.indexOf(p)}" aria-label="Ver ficha de ${esc(p.name)}">Ver ficha ${icon('arrow')}</button></article>`).join('')}</div>`:`<section class="panel">${empty('O plantel está a ser preparado.','Os nomes e fotografias serão apresentados depois de confirmados pelo clube.')}<div class="club-stripe"></div></section>`)+staffSections()+`<h2 class="section-title">Quatro posições. Uma equipa.</h2><div class="position-list">${[['Guarda-redes','Segurança entre os postes'],['Fixo','Equilíbrio e leitura de jogo'],['Ala','Velocidade e criatividade'],['Pivot','Presença na finalização']].map(([p,d])=>`<div class="position"><b>${p}</b><span>${d}</span></div>`).join('')}</div><div class="lower-grid"><section class="training-card"><div><span class="eyebrow">PRÉ-ÉPOCA</span><h2>O trabalho é de todos.</h2><p>Consulta os horários de treino.</p></div><a class="text-button" href="#clube">${icon('arrow')}</a></section></div>`;}
  function newsPage() {return heading('A vida do clube.','Do balneário para a bancada.')+`<div class="news-grid">${(data.news||[]).map((n,i)=>({n,i})).sort((a,b)=>b.n.date.localeCompare(a.n.date)).map(({n,i})=>`<article class="panel news-card">${photo(n.photo,n.title)}<span class="tag red">${esc(n.category)}</span><h2>${esc(n.title)}</h2><p>${esc(n.excerpt)}</p><button class="text-button" data-news="${i}">Ler notícia ${icon('arrow')}</button><time datetime="${esc(n.date)}">${esc(D.dateParts(n.date).label)}</time></article>`).join('')||empty('Ainda não há notícias.','As novidades da equipa serão publicadas aqui.')}</div>`+demoNote();}
  function clubPage() {return heading('De Recarei. Pelo Nun’Álvares.','Um clube que se vive dentro e fora do campo.')+`<div class="content-grid"><section class="panel"><div class="club-stripe"></div><div class="story-panel"><span class="eyebrow">SPORT CLUBE NUN'ÁLVARES</span><h2>A experiência joga.<br>A paixão fica.</h2><p>Esta é a casa dos veteranos do Sport Clube Nun’Álvares de Recarei. Uma equipa unida pela vontade de competir, pelo futsal e pela camisola que representa.</p><p>Azul, branco, vermelho e preto. As cores que nos acompanham em cada jornada.</p><a class="button" href="#equipa">Conhecer a equipa ${icon('arrow')}</a></div></section><section class="panel"><div class="panel-header"><h2>Treinos de pré-época</h2>${icon('clock')}</div><div class="schedule-item"><span>Quarta-feira<small>Treino da equipa</small></span><b>22:00</b></div><div class="schedule-item"><span>Sábado<small>Treino da equipa</small></span><b>18:00</b></div><p class="panel-note">Horários apresentados no site anterior. Confirma com a equipa antes de te deslocares.</p></section></div><h2 class="section-title">Patrocinadores</h2><p class="admin-lead">Quem está ao nosso lado, dentro e fora do campo.</p><div class="partner-grid">${[['1000 Números','1000-numeros',522,255],['Batida de Côco','batida-de-coco',400,400],['BCN','bcn',400,400],['Belma','belma',399,400],['MedPartner','medpartner',400,400],['Re-mood','re-mood',315,93],['Óptica Alto da Maia','optica-alto-da-maia',700,292]].map(([name,slug,width,height])=>`<div class="partner"><img class="partner-logo" src="sponsor-${slug}.png" alt="" width="${width}" height="${height}" loading="lazy" decoding="async"><span>${esc(name)}</span></div>`).join('')}</div>`;}
  function closeMenu(restore=false) {document.querySelector('#sidebar').classList.remove('is-open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');document.querySelector('#menu-backdrop').hidden=true;document.body.style.overflow='';document.querySelector('#sidebar').inert=window.matchMedia('(max-width:720px)').matches;if(restore)document.querySelector('#menu-toggle').focus();}
  function render(focus=false) {
    const raw=location.hash.slice(1),route=aliases[raw]||raw||'inicio';
    currentRoute=titles[route]?route:'inicio';allGames=data?D.fixtures(data):[];
    document.querySelector('#breadcrumb').textContent=titles[currentRoute];
    document.querySelectorAll('[data-route]').forEach(a=>{if(a.dataset.route===currentRoute)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(!data) {
      const loading=window.scnLoadState==='loading';
      main.innerHTML=`<section class="panel"><div class="empty-state" role="${loading?'status':'alert'}"><h2>${loading?'A carregar os conteúdos…':'Não foi possível carregar os conteúdos.'}</h2><p>${loading?'A ligar à base de dados do clube.':'Verifica a tua ligação e tenta novamente.'}</p>${loading?'':'<button class="button" id="retry-data">Tentar novamente</button>'}</div></section>`;
    } else main.innerHTML=({inicio:overview,jogos:gamesPage,classificacao:rankingPage,equipa:squadPage,noticias:newsPage,clube:clubPage}[currentRoute])();
    document.title=`${titles[currentRoute]} · SC Nun'Álvares`;
    document.querySelector('.preview-pill').textContent=data&&data.demo!==false?'VERSÃO DE APRESENTAÇÃO':'CONTEÚDOS DO CLUBE';
    closeMenu();if(focus){window.scrollTo(0,0);main.focus({preventScroll:true});}
  }
  function showGame(key) {
    const g=allGames.find(g=>g.key===key);if(!g)return;
    document.querySelector('#dialog-content').innerHTML=`<p class="dialog-eyebrow">${esc(g.competition||'Jogo agendado')}</p><h2 class="dialog-title" id="dialog-title">${teamLabel(g.home,'detail')}<span class="dialog-versus">${D.complete(g)?`${g.homeScore} – ${g.awayScore}`:'vs'}</span>${teamLabel(g.away,'detail')}</h2><div class="dialog-meta"><span>${esc(D.dateParts(g.date).label)} · ${esc(g.time||'Hora a confirmar')}</span>${venueLocation(g)}</div><p class="dialog-body">${g.sourceId?'Calendário importado do zerozero. Confirma a data, a hora e o local junto do clube.':data.demo!==false?'Jogo apresentado nesta versão de demonstração. Confirma a data e o local junto do clube.':'Consulta os detalhes do jogo. Alterações de horário serão atualizadas pelo clube.'}</p><div style="margin-top:22px"><button class="button" data-download="${g.key}">Guardar no calendário ${icon('calendar')}</button></div>`;
    dialog.showModal();
  }
  function downloadCalendar(key) {
    const g=allGames.find(g=>g.key===key);if(!g)return;
    const ics=D.calendarEvent(g,g.sourceId?'Calendário zerozero · '+g.competition:data.demo!==false?'Data de demonstração. Confirmar com o clube.':g.competition);
    const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sc-nunalvares-'+g.date+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function showProfile(kind,index) {
    if(!['players','staff'].includes(kind))return;
    const p=data[kind]?.[index];if(!p)return;
    const facts=Array.isArray(p.facts)?p.facts:[];
    const career=Array.isArray(p.career)?p.career:[];
    document.querySelector('#dialog-content').innerHTML=`<div class="profile-details"><p class="dialog-eyebrow">${kind==='players'?'Jogador · '+esc(p.position):esc(p.role)}</p><h2 id="dialog-title" class="dialog-title">${esc(p.fullName||p.name)}</h2>${p.nickname&&p.nickname!==(p.fullName||p.name)?`<p class="profile-nickname">${esc(p.nickname)}</p>`:''}${photo(p.photo,p.name)}${p.bio?`<section class="profile-biography"><h3>Biografia</h3><p class="dialog-body">${esc(p.bio)}</p></section>`:''}${facts.length?`<dl class="profile-facts">${facts.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`:''}${p.stats?`<section class="profile-stats" aria-label="Estatísticas da época">${[['goals','Golos marcados'],['conceded','Golos sofridos'],['yellowCards','Cartões amarelos'],['redCards','Cartões vermelhos']].map(([key,label])=>`<div><b>${esc(p.stats[key])}</b><span>${label}</span></div>`).join('')}</section>`:''}${career.length?`<section class="profile-career"><h3>Percurso federado</h3><div class="profile-career-scroll"><table class="profile-career-table"><caption class="sr-only">Percurso federado de ${esc(p.fullName||p.name)}</caption><thead><tr><th scope="col">Época</th><th scope="col">Clube</th><th scope="col">Modalidade</th><th scope="col">Escalão</th></tr></thead><tbody>${career.map(c=>`<tr><td data-label="Época">${esc(c.season)}</td><td data-label="Clube">${esc(c.club)}</td><td data-label="Modalidade">${esc(c.sport)}</td><td data-label="Escalão">${esc(c.level)}</td></tr>`).join('')}</tbody></table></div></section>`:''}${kind==='staff'&&p.group==='directors'?'':`<p class="profile-source">${kind==='players'?'Informação transcrita do site da fpf.':'Informação transcrita do <a href="https://sc-nunalvares-veteranos.gustavo-fcb.workers.dev/#equipa" target="_blank" rel="noopener noreferrer">site anterior do clube</a>.'}</p>`}</div>`;
    dialog.showModal();
  }
  document.addEventListener('click',async e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.id==='retry-data'){const pending=window.loadScnRemoteData();render();data=await pending;render(true);return;}
    if(!data)return;
    if(target.dataset.game!==undefined)showGame(target.dataset.game);
    if(target.dataset.download!==undefined)downloadCalendar(target.dataset.download);
    if(target.id==='club-games'){ownOnly=!ownOnly;target.setAttribute('aria-pressed',String(ownOnly));document.querySelector('#game-list').innerHTML=gamesList();}
    if(target.dataset.filter){filter=target.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));document.querySelector('#game-list').innerHTML=gamesList();}
    if(target.dataset.news!==undefined){const n=(data.news||[])[Number(target.dataset.news)];if(!n)return;const image=D.safePhoto(n.photo);document.querySelector('#dialog-content').innerHTML=`<p class="dialog-eyebrow">${esc(n.category)}</p><h2 id="dialog-title" class="dialog-title">${esc(n.title)}</h2>${image?`<a class="news-image-link" href="${esc(image)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem completa da notícia (nova janela)">${photo(image,n.title)}</a><a class="text-button" href="${esc(image)}" target="_blank" rel="noopener noreferrer">Abrir cartaz completo ${icon('arrow')}</a>`:''}<p class="dialog-body">${esc(n.body)}</p>${(n.images||[]).filter(img=>D.safePhoto(img.url)).map((img,i)=>`<section class="news-gallery"><h3>${esc(img.caption||'Cartaz adicional')}</h3><a class="news-image-link" href="${esc(D.safePhoto(img.url))}" target="_blank" rel="noopener noreferrer" aria-label="Abrir cartaz adicional ${i+1} completo (nova janela)">${photo(img.url,img.alt||n.title)}</a><a class="text-button" href="${esc(D.safePhoto(img.url))}" target="_blank" rel="noopener noreferrer">Abrir cartaz adicional ${i+1} ${icon('arrow')}</a></section>`).join('')}`;dialog.showModal();}
    if(target.dataset.profile)showProfile(target.dataset.profile,Number(target.dataset.index));
  });
  document.addEventListener('change',e=>{if(e.target.id==='round-select'){round=e.target.value;document.querySelector('#game-list').innerHTML=gamesList();}});
  document.querySelector('#menu-toggle').addEventListener('click',()=>{const open=document.querySelector('#menu-toggle').getAttribute('aria-expanded')==='true';if(open)return closeMenu(true);document.querySelector('#sidebar').inert=false;document.querySelector('#sidebar').classList.add('is-open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','true');document.querySelector('#menu-backdrop').hidden=false;document.body.style.overflow='hidden';document.querySelector('.main-nav a').focus();});
  document.querySelector('#menu-backdrop').addEventListener('click',()=>closeMenu(true));
  document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.addEventListener('keydown',e=>{
    const sidebar=document.querySelector('#sidebar');
    if(e.key==='Escape'&&sidebar.classList.contains('is-open'))closeMenu(true);
    if(e.key==='Tab'&&sidebar.classList.contains('is-open')) {
      const links=[...sidebar.querySelectorAll('a')],first=links[0],last=links[links.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  window.matchMedia('(max-width:720px)').addEventListener('change',()=>closeMenu());
  window.addEventListener('hashchange',()=>{if(location.hash==='#content'){main.focus();return;}render(true);});
  document.querySelector('.main-nav').addEventListener('click',()=>closeMenu());
  window.addEventListener('storage',e=>{if(e.key==='scn-data'&&window.scnMode==='local'){data=loadScnData();render();}});
  window.addEventListener('scn-data-change',()=>{data=window.scnData;render();});
  window.scnReady.then(d=>{data=d;render();});
})();
