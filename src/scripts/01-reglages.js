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
// Le vrai logo de la marque, détouré par logo.py depuis le fichier d'origine.
// « larg » et « haut » sont la taille réelle du fichier : sans elles le
// navigateur ne connaît pas la proportion de l'image, ne réserve pas sa
// place, et l'en-tête saute au chargement.
const BRAND={logo:'assets/marque/benka.png',logoClair:'assets/marque/benka-clair.png',
  larg:440,haut:120};
/* Vidéos de fond. Laisser vide = aucune vidéo, aucun octet téléchargé.

   Chaque entrée associe l'identifiant d'une section du site au nom de base
   des fichiers, SANS extension :

     VIDEOS={ atelier:'assets/videos/montage' }

   attend  assets/videos/montage.mp4  et  assets/videos/montage-affiche.jpg

   L'affiche est obligatoire. C'est elle qui s'affiche tout de suite ; la
   vidéo ne se télécharge qu'ensuite, et seulement si les conditions sont
   réunies (voir fondVideo() dans 10-revelations.js). Sans affiche, la
   section resterait noire le temps du chargement. */
const VIDEOS={};

/* Surcharge manuelle, pour une photo isolée qui ne suit pas la convention de
   nommage. Le cas normal passe par assets/produits/ et images.py. */
const PHOTOS={/* 'opus':{_:'assets/produits/opus.jpg'} */};

/* PHOTOS_AUTO est écrit au build par images.py en lisant assets/produits/.
   Déposer une photo, lancer images.py, et elle est servie : rien à tenir à
   jour ici, donc pas de vignette qui pointe vers un fichier disparu. */
function photoDe(id,c){
  const m=PHOTOS[id], manuel=m&&(m[c]||m._);
  if(manuel) return {brut:manuel};
  const a=(typeof PHOTOS_AUTO!=='undefined'&&PHOTOS_AUTO[id])||null;
  return (a&&(a[c]||a._))||null;
}
const jeuSrc=(base,larg,ext)=>larg.map(w=>`${base}-${w}.${ext} ${w}w`).join(',');
/* Un coloris peut avoir plusieurs photos : les fichiers portent alors leur
   numéro (opus-beige-3-640.webp). Sans ce calcul, le site réclamait
   opus-beige-640.webp, qui n'existe pas, et la vignette restait vide. */
const basePhoto=(ph,i)=>ph.n&&ph.n.length?`${ph.b}-${ph.n[Math.min(i||0,ph.n.length-1)]}`:ph.b;
function nbPhotos(id,c){const ph=photoDe(id,c);return ph&&ph.n?ph.n.length:(ph?1:0);}
function visuel(p,c,lite,i){
  const ph=photoDe(p.id,c);
  if(!ph) return sandal(p.style,c,p.platform,lite);
  const alt=att(`${p.name} — ${(COLORS[c]||{}).n||''}`);
  if(ph.brut) return `<img class="pv" src="${ph.brut}" alt="${alt}" loading="lazy" decoding="async">`;
  const B=basePhoto(ph,i);
  // « sizes » dit au navigateur la place réelle de l'image AVANT de la
  // choisir : sans lui il prend la plus large et télécharge pour rien.
  /* Mesuré, pas supposé : sur téléphone la grille est à une colonne et la
     vignette occupe 293 px sur 375, soit 78 % — pas les 42 % que j'avais
     écrits en imaginant deux colonnes. Un « sizes » faux fait choisir au
     navigateur une image trop lourde ou trop floue. */
  const places=lite?'100px':'(max-width:700px) 50vw, (max-width:980px) 48vw, 400px';
  /* Un <img> seul, jamais un <picture>.

     Le <picture> servait à offrir le WebP avec un repli JPEG. Il créait des
     lignes de grille parasites et faussait toute hauteur exprimée en
     pourcentage : les chaussures du show-room tombaient à 23 px dans une
     niche de 150, et la galerie de la fiche naissait à hauteur nulle, donc
     ne se chargeait jamais. Deux pannes pour un seul confort.

     Ici le srcset ne liste que du WebP et le src pointe le JPEG. Tout
     navigateur qui comprend srcset — donc tout ce qui est sorti depuis 2020
     — prend le WebP ; les plus anciens ignorent srcset et reçoivent le
     JPEG. Même résultat, sans boîte intermédiaire.

     width/height déclarés : le navigateur réserve la place avant d'avoir
     l'image. Sans eux, une image différée naît à hauteur nulle, ne descend
     jamais dans le champ de vision, et ne se charge donc jamais. */
  const dim=ph.w&&ph.h?` width="${ph.w}" height="${ph.h}"`:'';
  const repli=ph.j[ph.j.length-1];
  const jeu=ph.p.length?jeuSrc(B,ph.p,'webp'):jeuSrc(B,ph.j,'jpg');
  return `<img class="pv"${dim} src="${B}-${repli}.jpg" srcset="${jeu}" sizes="${places}"`
    +` alt="${alt}" loading="lazy" decoding="async">`;
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
// Le thème demandé : celui que la cliente a choisi, sinon celui de son système.
function themeSombre(){
  const t=document.documentElement.getAttribute('data-theme');
  return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
}
function poserLogo(){
  // Le logo crème sert dans deux cas sans rapport l'un avec l'autre : sur les
  // bandeaux bordeaux quel que soit le thème, et partout dès que le thème est
  // sombre. Le bordeaux de la marque ne tient que 1,85:1 sur le fond #140a08
  // du thème sombre — illisible. L'ancienne version ne regardait que
  // l'emplacement : le logo de l'en-tête y disparaissait.
  const sombre=themeSombre();
  document.querySelectorAll('.brand').forEach(el=>{
    const clair=sombre||!!el.closest('.ftr,.adm-hd,.hero');
    el.innerHTML=BRAND.logo
      ? `<img class="brand-logo" src="${(clair&&BRAND.logoClair)||BRAND.logo}"`
        +` width="${BRAND.larg}" height="${BRAND.haut}" alt="Benkashoes">`
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

