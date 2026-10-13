/* ===================================================================
   CONFIGURATION DE LA BOUTIQUE — modifiez ces quatre lignes
   =================================================================== */
const SHOP={
  email:'contact@benkashoes.ma',   // votre vraie adresse e-mail
  phone:'',                       // ex. '+212 6 12 34 56 78'  (vide = masqué)
  whatsapp:'',                    // ex. '2126XXXXXXXX' indicatif SANS le +  (vide = bouton masqué)
  site:'www.benkashoes.ma',      // l'adresse affichée en bas de page
  // Vos pages publiques. C'est ce qui dit à Google que ce site, cette page
  // Instagram et cette fiche Google Business sont la même maison — le signal
  // le plus fort pour qu'une recherche sur « benka » tombe sur vous.
  // ex. ['https://www.instagram.com/benkashoes/','https://www.facebook.com/benkashoes']
  reseaux:[],
  // Adresse du script qui dépose les commandes dans votre tableur.
  // Vide = le client reçoit un récapitulatif à vous envoyer lui-même.
  // Comment l'obtenir : integrations/LISEZMOI.md
  tableur:'https://script.google.com/macros/s/AKfycbxe9a0sMOxdZh4uBQuCSkdsi12cUepOBlLI5_M2ZwJhoyAJPIFM9THGg744WT1a1K8Z6Q/exec'
};
/* Logo et photos. Laisser vide = illustration vectorielle et logo typographique.
   Déposer les fichiers dans assets/ puis renseigner ici — voir assets/README.md */
const BRAND={logo:'',logoClair:''};
const PHOTOS={/* 'opus':{_:'assets/produits/opus.jpg', noir:'assets/produits/opus-noir.jpg'} */};
function photoDe(id,c){const e=PHOTOS[id];return (e&&(e[c]||e._))||'';}
function visuel(p,c,lite){
  const src=photoDe(p.id,c);
  if(src) return `<img class="pv" src="${src}" alt="${p.name} — ${(COLORS[c]||{}).n||''}" loading="lazy" decoding="async">`;
  return sandal(p.style,c,p.platform,lite);
}
// Le logo benka, redessiné : mot rond et gras, empreinte de pied en appui.
// Si un vrai fichier est fourni dans BRAND.logo, il prend le dessus.
function logoHTML(){
  // balises auto-fermées d'un seul tenant : « / » séparé de « > » casse l'analyse
  return '<span class="logo" role="img" aria-label="benka">'
    +'<span class="logo-mot" aria-hidden="true">benka</span>'
    +'<svg class="logo-pied" viewBox="0 0 40 34" aria-hidden="true">'
    +'<ellipse cx="10.8" cy="23.2" rx="7.2" ry="9.6" transform="rotate(19 10.8 23.2)"/>'
    +'<circle cx="22.2" cy="12.8" r="4"/><circle cx="28.8" cy="7.8" r="3.2"/>'
    +'<circle cx="34" cy="4" r="2.5"/><circle cx="37.8" cy="1.7" r="1.9"/>'
    +'</svg></span>';
}
function poserLogo(){
  document.querySelectorAll('.brand').forEach(el=>{
    const clair=!!el.closest('.ftr,.adm-hd,.hero');
    el.innerHTML=BRAND.logo
      ? `<img class="brand-logo" src="${(clair&&BRAND.logoClair)||BRAND.logo}" alt="benka">`
      : logoHTML();
  });
}

const HASCLAUDE=!!(window.claude&&window.claude.use);
const STATIC=!HASCLAUDE;
// 'artifact' = base partagée Claude · 'api' = serveur Benkashoes · 'local' = ce navigateur seulement
let MODE=HASCLAUDE?'artifact':'local';
let TOKEN='';
async function api(route,opt={}){
  const head=Object.assign({},opt.headers||{});
  if(opt.body!==undefined)head['content-type']='application/json';
  if(TOKEN)head.authorization='Bearer '+TOKEN;
  const r=await fetch('/api/'+route,{method:opt.method||'GET',headers:head,
    body:opt.body!==undefined?JSON.stringify(opt.body):undefined});
  let d={};try{d=await r.json();}catch(e){}
  if(!r.ok){const err=new Error(d.error||'Le serveur n\'a pas répondu.');err.status=r.status;throw err;}
  return d;}

