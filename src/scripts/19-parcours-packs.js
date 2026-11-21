/* Le guide n'altère jamais le panier ni le calcul commercial partagé. */
function packProgress(cart){
  const count=cart.reduce((n,i)=>n+i.q,0);
  return {count,missing:Math.max(0,3-count),complete:count===3,over:count>3};
}
function packDestination(mode,cart){
  if(mode==='opus')return '#modeles';
  // Dans un trio mixte, on invite d'abord à découvrir le modèle manquant.
  if(mode==='mixte'&&cart.some(i=>i.id==='as')&&!cart.some(i=>i.id==='opus'))return '#modeles';
  return '#as-by-benka';
}
function goPackCollection(){
  const target=packDestination(S.packMode,S.cart);
  if(S.panel)fermerPanneau();
  const section=document.querySelector(target);
  section?.scrollIntoView({behavior:MOTION?'smooth':'auto',block:'start'});
  if(section){section.setAttribute('tabindex','-1');section.focus({preventScroll:true});}
}
function startPack(mode){
  if(!['opus','as','mixte'].includes(mode))return;
  S.packMode=mode;
  if(packProgress(S.cart).count>=3){S.panel='cart';S.step=1;draw();return;}
  draw();goPackCollection();
}
function renderPackGuide(){
  const el=document.getElementById('pack-guide');if(!el)return;
  const on=!!S.packMode&&location.hash!=='#admin';
  document.body.classList.toggle('pack-guiding',on);
  el.hidden=!on||!!S.panel;
  if(!on)return;
  const progress=packProgress(S.cart),price=cartPricing();
  const title=price.packs?`${blackFridayPackLabel(price.pack)} · ${fmt(price.sub)}`:'Votre trio · '+progress.count+' / 3 paires';
  const hint=price.packs?'Offre appliquée · Livraison offerte':progress.over?'Plus de 3 paires : tarif à l’unité':progress.missing?'Encore '+progress.missing+' paire'+(progress.missing>1?'s':'')+' · prix selon votre sélection':'Vérifiez les modèles de votre panier';
  const pairs=S.cart.flatMap(i=>Array.from({length:Math.min(3,i.q)},()=>i)).slice(0,3);
  const slots=[0,1,2].map(n=>{const i=pairs[n];const src=i?(i.id==='as'?`assets/as-by-benka/${i.c}-480.webp`:`assets/produits/opus-${i.c}-1-480.webp`):'';
    return `<span class="pack-guide-slot ${i?'filled':''}">${i?`<img src="${src}" alt="${esc(prod(i.id).name+' '+COLORS[i.c].n+', pointure '+i.s)}" width="46" height="52">`:n+1}</span>`;}).join('');
  const html=`<div><div class="pack-guide-title" role="status" aria-live="polite"><b>${title}</b><small>${hint}</small></div><div class="pack-guide-links"><a href="#as-by-benka">Choisir AS</a><a href="#modeles">Choisir Opus</a></div></div><div class="pack-guide-slots">${slots}</div><button class="btn" data-act="pack-cart">${progress.count>=3?'Voir mon trio →':'Voir mon panier'}</button><button class="pack-guide-close" data-act="pack-stop" aria-label="Quitter le guide du trio, conserver mon panier">✕</button>`;
  if(el.innerHTML!==html)el.innerHTML=html;
}
