const defaultData = {
  demo: true,
  nextGame: { date: '2026-10-17', time: '18:00', home: "SC Nun'Álvares", away: 'Juventude Gaia', venue: 'Pavilhão Municipal de Recarei', competition: 'Campeonato · Jornada 01', kind: 'league' },
  teams: ["SC Nun'Álvares", 'Alfa AC', 'Associação Vale do Zêzere', 'Baguim do Monte', 'Casa FCP Rio Tinto', 'CP Vila Boa do Bispo', 'FC Amial Regado', 'Gondomar FC', 'Gramidense Infante', 'Juventude Gaia', 'Leixões', 'Leões da Guarda'],
  results: [
    { date: '2026-10-17', time:'18:00', competition:'Campeonato · Jornada 01', kind:'league', home:"SC Nun'Álvares", away:'Juventude Gaia', homeScore:null, awayScore:null, venue:'Pavilhão Municipal de Recarei' },
    { date: '2026-10-24', time:'18:00', competition:'Campeonato · Jornada 02', kind:'league', home:'FC Amial Regado', away:"SC Nun'Álvares", homeScore:null, awayScore:null, venue:'Local a confirmar' },
    { date: '2026-10-31', time:'18:00', competition:'Campeonato · Jornada 03', kind:'league', home:"SC Nun'Álvares", away:'Casa FCP Rio Tinto', homeScore:null, awayScore:null, venue:'Pavilhão Municipal de Recarei' },
    { date: '2026-11-07', time:'18:00', competition:'Campeonato · Jornada 04', kind:'league', home:'Leixões', away:"SC Nun'Álvares", homeScore:null, awayScore:null, venue:'Local a confirmar' }
  ],
  players: [
    {
      "number": "2",
      "name": "Leandro Rocha",
      "nickname": "Leandro",
      "position": "Universal"
    },
    {
      "number": "3",
      "name": "Jorge Rodrigues",
      "nickname": "J. Rodrigues",
      "position": "Pivô / Ala"
    },
    {
      "number": "4",
      "name": "Bruno Veloso",
      "nickname": "Gabi Davi",
      "position": "Ala / Pivô"
    },
    {
      "number": "5",
      "name": "Ricardo Sousa",
      "nickname": "Ricardo",
      "position": "Universal"
    },
    {
      "number": "6",
      "name": "Ivo Ferreira",
      "nickname": "Ivo",
      "position": "Ala"
    },
    {
      "number": "7",
      "name": "Nuno Moreira",
      "nickname": "Nuno",
      "position": "Ala"
    },
    {
      "number": "8",
      "name": "Diogo Antão",
      "nickname": "Diogo",
      "position": "Fixo / Ala"
    },
    {
      "number": "9",
      "name": "José Ressurreição",
      "nickname": "Ressurreição",
      "position": "Universal"
    },
    {
      "number": "10",
      "name": "Rui Lima",
      "nickname": "R. Lima",
      "position": "Fixo / Ala"
    },
    {
      "number": "12",
      "name": "Emanuel Barros",
      "nickname": "Emanuel",
      "position": "Guarda-redes"
    },
    {
      "number": "13",
      "name": "José Pinto",
      "nickname": "Márcio",
      "position": "Ala"
    },
    {
      "number": "14",
      "name": "Gustavo Batista",
      "nickname": "Gustavo",
      "position": "Ala"
    },
    {
      "number": "59",
      "name": "Adelino Almeida",
      "nickname": "Pisco",
      "position": "Guarda-redes"
    },
    {
      "number": "70",
      "name": "Tiago Paiva",
      "nickname": "Paiva",
      "position": "Ala / Pivô"
    },
    {
      "number": "77",
      "name": "Rogério Martins",
      "nickname": "Roger",
      "position": "Pivô / Ala"
    },
    {
      "number": "88",
      "name": "Bruno Ferreira",
      "nickname": "Moreno",
      "position": "Ala"
    }
  ],
  news: [
    { title:'A nossa casa, agora mais perto.', category:'O clube', date:'2026-09-11', excerpt:'Uma nova forma de acompanhar os veteranos do Nun’Álvares.', body:'Esta é uma proposta para a nova casa digital dos Veteranos do SC Nun’Álvares. Aqui poderás acompanhar os jogos, consultar a classificação e conhecer a equipa.\n\nOs conteúdos desta apresentação são demonstrativos e aguardam confirmação do clube.' },
    { title:'A época prepara-se no treino.', category:'Equipa', date:'2026-09-11', excerpt:'Compromisso durante a semana. Vontade de competir ao fim de semana.', body:'Na versão anterior do site, os treinos de pré-época estavam previstos para as quartas-feiras às 22h00 e os sábados às 18h00.\n\nConfirma sempre os horários junto da equipa antes de te deslocares.' }
  ]
};
const localMode = location.protocol === 'file:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
window.scnMode = localMode ? 'local' : 'remote';
let scnRevision = null, scnSaving = false;
function loadScnData() {
  try {
    scnRevision = localStorage.getItem('scn-data');
    window.scnRecoveryRaw = scnRevision;
    const cached = JSON.parse(scnRevision);
    if (cached) { SCN.validate(cached); return cached; }
  } catch { window.scnLoadError = true; }
  return structuredClone(defaultData);
}
window.scnData = localMode ? loadScnData() : null;
window.scnLoadState = localMode ? 'ready' : 'loading';
let scnLoading = null;
window.loadScnRemoteData = function() {
  if(localMode) return Promise.resolve(window.scnData);
  if(scnLoading) return scnLoading;
  window.scnLoadState = 'loading';
  window.scnConnected = false;
  scnLoading = (async () => {
    try {
      const response = await fetch('/api/data',{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw Error('Dados indisponíveis');
      const incoming = SCN.validate(await response.json());
      scnRevision = response.headers?.get('ETag') || null;
      window.scnData = incoming;
      window.scnConnected = true;
      window.scnLoadState = 'ready';
    } catch {
      window.scnData = null;
      scnRevision = null;
      window.scnLoadState = 'error';
    }
    return window.scnData;
  })().finally(()=>{scnLoading=null;});
  return scnLoading;
};
window.scnReady = localMode ? Promise.resolve(window.scnData) : window.loadScnRemoteData();
window.saveScnData = async function(candidate) {
  if(scnSaving) throw Error('Aguarda que a gravação em curso termine.');
  scnSaving = true;
  try {
  if(localMode && window.scnLoadError) throw Error('Não foi possível ler os dados existentes. A gravação foi bloqueada para os preservar; exporta a cópia local para revisão.');
  const data = structuredClone(SCN.validate(candidate));
  if(!localMode) {
    if(!window.scnConnected) throw Error('Sem ligação à gestão online. Tenta novamente mais tarde.');
    const token = document.querySelector('#admin-token')?.value.trim();
    if(!token) throw Error('Introduz a chave de gestão no campo de acesso online.');
    if(!scnRevision) throw Error('Atualiza a página: a API ainda não disponibiliza proteção contra alterações simultâneas.');
    const response = await fetch('/api/data',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'If-Match':scnRevision},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
    if(response.status===409 || response.status===412) throw Error('Os dados foram alterados noutra sessão. Exporta a tua cópia e atualiza a página antes de tentar novamente.');
    if(!response.ok) throw Error(response.status===401?'A chave de gestão não foi aceite.':'Não foi possível guardar. Os dados anteriores foram mantidos.');
    scnRevision=response.headers.get('ETag');
  } else {
    if(localStorage.getItem('scn-data')!==scnRevision) throw Error('Os dados foram alterados noutra janela. Exporta a tua cópia e atualiza a página.');
    try { const serialized=JSON.stringify(data);localStorage.setItem('scn-data',serialized);scnRevision=serialized; }
    catch { throw Error('O navegador não permitiu guardar. Exporta uma cópia dos dados.'); }
  }
  window.scnData = data;
  window.dispatchEvent(new Event('scn-data-change'));
  return {local:localMode,remote:!localMode};
  } finally { scnSaving=false; }
};
