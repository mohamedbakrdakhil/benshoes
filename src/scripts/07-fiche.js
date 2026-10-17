/* ======================= fiche produit ======================= */

/* Toutes les vues restent disponibles : galerie empilée sur ordinateur,
   rangée à défilement natif sur téléphone pour rapprocher les pointures.
   Les images suivantes sont différées. */
/* Le tourne-disque : la paire que la cliente fait tourner elle-même.
   ------------------------------------------------------------------
   « Elle ressemble à quoi de l'autre côté ? » est la question que le
   commerce en ligne laisse sans réponse, et c'est elle qui fait renoncer.
   Une vidéo y répond à moitié : elle montre ce qu'on a décidé de montrer.
   Ici la cliente tient la chaussure — elle la tourne au doigt, s'arrête sur
   l'angle qui l'intéresse, revient.

   Vingt-quatre vues sur une seule planche, et non vingt-quatre fichiers :
   une image, une requête, et le changement de vue ne coûte qu'un décalage
   de fond — aucun chargement, donc aucun à-coup sous le doigt. C'est aussi
   pourquoi ce n'est pas une vidéo : chercher une image précise dans un flux
   compressé saute, et une vidéo ne se laisse pas tenir.

   Elle tourne doucement toute seule tant qu'on n'y a pas touché — sinon
   rien ne dit qu'elle est vivante. Au premier contact, elle se tait et
   obéit. */
const ROT_N=24, ROT_COLS=6, ROT_RANGS=4;
let rotorAuto=null;

function rotorHTML(p,c){
  const n=(COLORS[c]||{}).n||c;
  return `<div class="rotor" tabindex="0" role="img"
    aria-label="${att(p.name+' en daim '+n+', à faire tourner')}"
    data-src="assets/produits/rotor-${att(c)}.jpg">
    <div class="rotor-vue"></div>
    <span class="rotor-aide" aria-hidden="true">Glissez pour tourner</span></div>`;
}

/* Appelée à CHAQUE rendu, panneau ouvert ou non : c'est elle qui éteint la
   rotation précédente. Sans ce passage inconditionnel, fermer la fiche
   laissait un intervalle tourner sur un élément retiré du document. */
function majRotor(){
  if(rotorAuto){clearInterval(rotorAuto);rotorAuto=null;}
  const r=document.querySelector('.rotor');
  if(!r) return;
  // Connexion comptée : on retire le tourne-disque. Les photos de la galerie
  // restent, et elles suffisent à acheter.
  const co=navigator.connection||{};
  if(co.saveData===true||/^(slow-)?2g$/.test(co.effectiveType||'')){r.remove();return;}

  const vue=r.querySelector('.rotor-vue');
  const img=new Image();
  img.onerror=()=>r.remove();
  img.onload=()=>{
    vue.style.backgroundImage=`url("${r.dataset.src}")`;
    r.classList.add('prete');
    let i=0, tenu=false, x0=0, i0=0;
    const pose=k=>{
      i=((k%ROT_N)+ROT_N)%ROT_N;
      vue.style.backgroundPosition=
        `${(i%ROT_COLS)/(ROT_COLS-1)*100}% ${Math.floor(i/ROT_COLS)/(ROT_RANGS-1)*100}%`;
    };
    pose(0);
    const taire=()=>{if(rotorAuto){clearInterval(rotorAuto);rotorAuto=null;}
                     r.classList.add('touche');};
    if(MOTION) rotorAuto=setInterval(()=>{if(!tenu)pose(i+1);},110);

    r.addEventListener('pointerdown',e=>{
      tenu=true; taire(); x0=e.clientX; i0=i;
      r.setPointerCapture(e.pointerId); r.classList.add('prise');});
    r.addEventListener('pointermove',e=>{
      // Quatorze pixels par vue : assez pour viser un angle précis, assez
      // peu pour faire un tour complet d'un seul geste sur un téléphone.
      if(tenu) pose(i0+Math.round((e.clientX-x0)/14));});
    const lacher=()=>{tenu=false; r.classList.remove('prise');};
    r.addEventListener('pointerup',lacher);
    r.addEventListener('pointercancel',lacher);
    // Au clavier aussi : une flèche, une vue.
    r.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        taire(); pose(i+(e.key==='ArrowRight'?1:-1)); e.preventDefault();}});
  };
  img.src=r.dataset.src;
}
function galerie(p,c){
  const n=nbPhotos(p.id,c);
  // Le tourne-disque n'est plus DANS la galerie. Sur téléphone celle-ci se
  // parcourt au doigt horizontalement, et le tourne-disque tourne au doigt
  // horizontalement : les deux se disputaient le même geste, et le premier
  // qui l'attrapait empêchait l'autre d'exister. Il est posé au-dessus,
  // dans sheetHTML — un geste chacun.
  if(n<=1) return `<div class="galerie" role="group" aria-label="Photos du produit"><div class="sheet-art">${visuel(p,c)}</div></div>`;
  let h='';
  for(let i=0;i<n;i++) h+=`<div class="sheet-art">${visuel(p,c,false,i)}</div>`;
  return `<div class="galerie" role="group" aria-label="Photos du produit">${h}</div>`;
}

function sheetHTML(){
  const p=prod(S.sheet.id),c=S.sheet.c,si=S.sheet.s;
  const st=si==null?null:stockOf(p,SIZES.indexOf(si));
  return `<div class="panel plein" role="dialog" aria-modal="true" aria-label="${p.name}">
    <div class="panel-hd"><span class="eyebrow">${p.sub}</span><h3 style="flex:0"></h3>
      <button class="close" data-act="closep" style="margin-left:auto" aria-label="Fermer">✕</button></div>
    <div class="panel-bd">
      ${rotorHTML(p,c)}
      ${galerie(p,c)}
      <div class="sheet-top"><h2>${p.name}</h2><span class="sheet-price num">${fmt(priceOf(p))}</span></div>
      <p class="serif">${p.blurb}</p>
      <div class="fld"><div class="fld-lab"><span class="t">Cuir</span><span class="v">${COLORS[c].n}</span></div>
        <div class="colrow">${p.colors.map(k=>`<button class="colopt" data-act="setcol" data-k="${k}" aria-pressed="${k===c}"><i style="background:linear-gradient(135deg,${COLORS[k].c},${COLORS[k].d})"></i>${COLORS[k].n}</button>`).join('')}</div></div>
      <div class="fld"><div class="fld-lab"><span class="t">Pointure EU</span><span class="v">${si?`${si} · ${st>0?st+' en stock':'épuisé'}`:'Choisissez votre pointure'}</span></div>
        <div class="sizegrid">${SIZES.map((s,i)=>{const k=stockOf(p,i);
          return `<button class="sizebtn" data-act="setsize" data-s="${s}" aria-pressed="${si===s}" ${k?'':'disabled'}>${s}${k&&k<=3?`<small>${k} rest.</small>`:''}</button>`;}).join('')}</div>
        <p class="note" style="margin-top:9px">Entre deux pointures, prenez la plus petite : <a href="#tailles" data-act="closep" style="color:var(--accent-text)">voir le guide</a>.</p></div>
      <div class="tabs" role="tablist">
        ${[['fiche','Fiche technique'],['entretien','Entretien'],['livraison','Livraison']].map(([k,l])=>
          `<button role="tab" data-act="tab" data-k="${k}" aria-selected="${(S.tab||'fiche')===k}">${l}</button>`).join('')}
      </div>
      <div class="tabpane">${sheetTab(p)}</div>
    </div>
    <div class="panel-ft">
      <button class="btn btn-pri" data-act="add" ${si&&st>0?'':'disabled'} style="justify-content:center">${si?`Ajouter au panier — ${fmt(priceOf(p))}`:'Choisissez une pointure'}</button>
      <p class="note" style="text-align:center">Expédition 48 h · ${LIVR_PHRASE()} · essai 30 jours</p>
    </div></div>`;
}

function sheetTab(p){
  const tab=S.tab||'fiche';
  if(tab==='entretien') return `<p class="serif" style="padding-top:16px">Brossez le daim à sec avec une brosse en crêpe, jamais à l\u2019eau. Une tache fraîche part à la gomme à daim ; une auréole, à la vapeur suivie d\u2019un brossage. Imperméabilisez en début de saison, le daim boit tout.</p>
    <ul class="spec"><li><span>Daim</span><span>Brosse en crêpe, à sec</span></li>
    <li><span>Taches</span><span>Gomme à daim, puis brossage</span></li>
    <li><span>À éviter</span><span>Eau, soleil direct, radiateur</span></li>
    <li><span>Protection</span><span>Spray imperméabilisant, 2 fois l\u2019an</span></li></ul>`;
  if(tab==='livraison') return `<p class="serif" style="padding-top:16px">Expédition le jour même pour toute commande confirmée avant 14 h. Vous réglez à la livraison ou par virement : le paiement en ligne n\u2019est pas encore branché sur la boutique.</p>
    <ul class="spec"><li><span>Délai</span><span>48 h partout au Maroc</span></li>
    <li><span>Frais de port</span><span>${SHIPCOST===0||SHIPFREE===0?'offerts':`${fmt(SHIPCOST)}, offerts dès ${fmt(SHIPFREE)}`}</span></li>
    <li><span>Paiement</span><span>À la livraison ou par virement</span></li>
    <li><span>Retour</span><span>30 jours, frais à notre charge</span></li>
    <li><span>Ressemelage</span><span>80 DH, sans limite de durée</span></li></ul>`;
  return `<ul class="spec" style="border-top:0">${p.spec.map(r=>`<li><span>${r[0]}</span><span>${r[1]}</span></li>`).join('')}
    <li><span>Montage</span><span>Sur forme, semelle cousue</span></li>
    <li><span>Travail</span><span>${p.hold} sur 5 — ${p.use.toLowerCase()}</span></li>
    <li><span>Pointures</span><span>37 à 41</span></li></ul>`;
}

