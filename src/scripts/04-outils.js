/* ======================= état ======================= */
const S={cart:[],sheet:null,panel:null,step:1,filter:'tous',colorFilter:null,
  ov:{prices:{},stock:{}},orders:[],db:null,user:null,canAdmin:false,dbTried:false,
  admTab:'commandes',openRow:null,lastOrder:null,manual:null,me:'',envoi:false};
const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat('fr-MA',{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n))+' DH';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const att=s=>esc(s).replace(/`/g,'&#96;');
/* Une commande peut arriver de trois endroits que nous ne contrôlons pas : le
   serveur (ouvert à tous), la base partagée, ou un fichier de sauvegarde
   restauré. On la ramène d'abord à une forme connue — pointures, statuts et
   modèles tirés du catalogue, textes coupés et débarrassés des caractères de
   commande — pour qu'aucun champ ne puisse se faire passer pour du balisage. */
const txt=(v,m)=>String(v??'').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim().slice(0,m);
const prod=id=>CATALOG.find(p=>p.id===id);
const priceOf=p=>S.ov.prices[p.id]??p.price;
const stockOf=(p,i)=>(S.ov.stock[p.id]||p.stock)[i]??0;
const totStock=p=>SIZES.reduce((a,_,i)=>a+stockOf(p,i),0);
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
function nettoyerCommande(o){
  if(!o||typeof o!=='object')return null;
  const items=(Array.isArray(o.items)?o.items:[]).slice(0,40).map(i=>{
    if(!i||typeof i!=='object')return null;
    const p=prod(i.id);if(!p)return null;
    const size=Number(i.size),q=Math.floor(Number(i.q)),u=Number(i.unit);
    if(!SIZES.includes(size)||!(q>=1&&q<=99))return null;
    const ck=p.colors.includes(i.colorKey)?i.colorKey:p.colors[0];
    return {id:p.id,name:p.name,colorKey:ck,color:COLORS[ck].n,size:size,q:q,
      unit:Number.isFinite(u)&&u>=0&&u<=1e6?u:priceOf(p)};
  }).filter(Boolean);
  if(!items.length)return null;
  const c=(o.customer&&typeof o.customer==='object')?o.customer:{};
  const sub=items.reduce((a,i)=>a+i.unit*i.q,0);
  const num=(v,d)=>{const x=Number(v);return Number.isFinite(x)&&x>=0&&x<=1e9?x:d;};
  return {ref:/^[A-Za-z0-9-]{1,24}$/.test(String(o.ref||''))?String(o.ref):'BS-SANS-REF',
    createdAt:isNaN(Date.parse(o.createdAt))?new Date().toISOString():String(o.createdAt).slice(0,40),
    status:STATUS[o.status]?o.status:'nouvelle',
    source:o.source==='atelier'?'atelier':'boutique',
    items:items,
    customer:{name:txt(c.name,80),phone:txt(c.phone,40),email:txt(c.email,120),
      addr:txt(c.addr,200),zip:txt(c.zip,20),city:txt(c.city,80),country:txt(c.country,60)||'Maroc'},
    note:txt(o.note,500),sub:num(o.sub,sub),ship:num(o.ship,0),total:num(o.total,sub),
    stockDeducted:!!o.stockDeducted,saved:!!o.saved};
}
const nettoyerListe=v=>(Array.isArray(v)?v:[]).slice(0,2000).map(nettoyerCommande).filter(Boolean);
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
function toast(m){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2300);}
function newRef(){const d=new Date();const y=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0');
  let r='';for(let i=0;i<4;i++)r+='ACDEFHJKLMNPRTUVWXY34789'[Math.floor(Math.random()*'ACDEFHJKLMNPRTUVWXY34789'.length)];return `BS-${y}-${r}`;}

/* La livraison, dite en français. Avec un seuil à zéro, « offerte dès 0 DH »
   n'a aucun sens : on écrit simplement qu'elle est offerte. La formule suit
   le réglage, elle ne le répète pas. */
const LIVR_PHRASE = () => (SHIPCOST===0||SHIPFREE===0)
  ? 'livraison offerte'
  : `livraison ${fmt(SHIPCOST)}, offerte dès ${fmt(SHIPFREE)}`;
