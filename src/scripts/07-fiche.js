/* ======================= fiche produit ======================= */

/* Toutes les photos du coloris choisi, empilées dans la fiche.

   Empilées plutôt qu'en carrousel : un carrousel demande un état, des
   flèches, des points, du clavier et du tactile — et cache la moitié des
   photos derrière un geste que beaucoup ne font pas. Ici tout est visible en
   faisant défiler, ce que tout le monde sait faire. Les images suivantes sont
   différées : seule la première coûte quelque chose à l'ouverture. */
function galerie(p,c){
  const n=nbPhotos(p.id,c);
  if(n<=1) return `<div class="sheet-art">${visuel(p,c)}</div>`;
  let h='';
  for(let i=0;i<n;i++) h+=`<div class="sheet-art">${visuel(p,c,false,i)}</div>`;
  return `<div class="galerie">${h}</div>`;
}

function sheetHTML(){
  const p=prod(S.sheet.id),c=S.sheet.c,si=S.sheet.s;
  const st=si==null?null:stockOf(p,SIZES.indexOf(si));
  return `<div class="panel plein" role="dialog" aria-modal="true" aria-label="${p.name}">
    <div class="panel-hd"><span class="eyebrow">${p.sub}</span><h3 style="flex:0"></h3>
      <button class="close" data-act="closep" style="margin-left:auto" aria-label="Fermer">✕</button></div>
    <div class="panel-bd">
      ${galerie(p,c)}
      <div class="sheet-top"><h2>${p.name}</h2><span class="sheet-price num">${fmt(priceOf(p))}</span></div>
      <p class="serif">${p.blurb}</p>
      <div class="fld"><div class="fld-lab"><span class="t">Cuir</span><span class="v">${COLORS[c].n}</span></div>
        <div class="colrow">${p.colors.map(k=>`<button class="colopt" data-act="setcol" data-k="${k}" aria-pressed="${k===c}"><i style="background:linear-gradient(135deg,${COLORS[k].c},${COLORS[k].d})"></i>${COLORS[k].n}</button>`).join('')}</div></div>
      <div class="fld"><div class="fld-lab"><span class="t">Pointure EU</span><span class="v">${si?`${si} · ${st>0?st+' en stock':'épuisé'}`:'Choisissez votre pointure'}</span></div>
        <div class="sizegrid">${SIZES.map((s,i)=>{const k=stockOf(p,i);
          return `<button class="sizebtn" data-act="setsize" data-s="${s}" aria-pressed="${si===s}" ${k?'':'disabled'}>${s}${k&&k<=3?`<small>${k} rest.</small>`:''}</button>`;}).join('')}</div>
        <p class="note" style="margin-top:9px">Entre deux pointures, prenez la plus grande : <a href="#tailles" data-act="closep" style="color:var(--accent-text)">voir le guide</a>.</p></div>
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

