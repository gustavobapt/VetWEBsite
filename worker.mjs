import './domain.js';
const D=globalThis.SCN;
const MAX_BYTES=1000000;
const initial={demo:false,nextGame:{},teams:["Nun'Álvares",'Alfa AC','Associação Vale do Zêzere','Baguim do Monte','Casa FCP Rio Tinto','CP Vila Boa do Bispo','FC Amial Regado','Gondomar FC','Gramidense Infante','Juventude Gaia','Leixões','Leões da Guarda'],results:[],players:[],news:[],media:[]};
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
async function hash(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return '"'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+'"';}
async function validToken(received,expected){if(!expected||expected.length<32||!received)return false;const a=await hash(received),b=await hash('Bearer '+expected);let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function readBody(request){
  if(Number(request.headers.get('Content-Length'))>MAX_BYTES)throw Object.assign(Error('Limite de 1 MB excedido.'),{status:413});
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw Object.assign(Error('Envia dados JSON.'),{status:415});
  const reader=request.body?.getReader();if(!reader)throw Error('Corpo vazio.');let length=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Object.assign(Error('Limite de 1 MB excedido.'),{status:413});}parts.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return D.validate(JSON.parse(new TextDecoder().decode(bytes)));
}
function secure(response){const out=new Response(response.body,response);out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','strict-origin-when-cross-origin');out.headers.set('X-Frame-Options','DENY');out.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self'; media-src 'self' https:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return out;}
export async function handle(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(url.pathname!=='/api/data')return json({error:'Não encontrado.'},404);
  if(!['GET','PUT'].includes(request.method))return json({error:'Método não permitido.'},405,{Allow:'GET, PUT'});
  if(request.method==='PUT'){
    if(!await validToken(request.headers.get('Authorization'),env.ADMIN_TOKEN))return json({error:'Acesso não autorizado.'},401,{'WWW-Authenticate':'Bearer'});
    const origin=request.headers.get('Origin');if((origin&&origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Origem não autorizada.'},403);
    if(!request.headers.get('If-Match'))return json({error:'Atualiza os dados antes de guardar.'},428);
  }
  if(!env.DB)return json({error:'Base de dados por configurar.'},503);
  let record;try{record=await env.DB.prepare('SELECT payload FROM club_data WHERE id = 1').first();}catch{return json({error:'Base de dados indisponível.'},503);}
  const before=record?.payload??JSON.stringify(initial),etag=await hash(before);
  if(request.method==='GET'){
    try{return json(D.validate(JSON.parse(before)),200,{ETag:etag});}catch{return json({error:'Os dados guardados precisam de revisão.'},500);}
  }
  if(request.headers.get('If-Match')!==etag)return json({error:'Outra sessão alterou os dados. Atualiza a página.'},412);
  let payload;try{payload=JSON.stringify(await readBody(request));}catch(err){return json({error:err instanceof SyntaxError?'JSON inválido.':err.message},err.status||400);}
  try{
    const result=record
      ? await env.DB.prepare('UPDATE club_data SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND payload = ?').bind(payload,before).run()
      : await env.DB.prepare('INSERT OR IGNORE INTO club_data (id, payload, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)').bind(payload).run();
    if(!result.success)throw Error('D1 write failed');
    if(result.meta.changes!==1)return json({error:'Outra sessão guardou primeiro. Atualiza a página.'},409);
    return json({ok:true},200,{ETag:await hash(payload)});
  }catch{return json({error:'Não foi possível guardar. Tenta novamente mais tarde.'},503);}
}
export default {async fetch(request,env){try{return secure(await handle(request,env));}catch{return secure(json({error:'Serviço temporariamente indisponível.'},503));}}};
