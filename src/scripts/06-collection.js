/* ======================= boutique ======================= */
function renderStatic(){
  const topo=$('#herotopo');
  if(topo)topo.innerHTML=[1.6,1.3,1.05,.82,.6,.4,.22].map((k,i)=>
    `<g transform="translate(600,310) scale(${k*2.1},${k*1.25}) translate(-100,-230)"><path d="${SOLE}" fill="none" stroke="rgba(207,149,73,${(.3-i*.03).toFixed(2)})" stroke-width="${(1.6/k).toFixed(2)}"/></g>`).join('');
  // Le héros garde l'illustration : les photos de l'atelier portent leur
  // décor (canapé, parquet, marbre), qui ferait une boîte claire au milieu du
  // bordeaux. Pour y mettre la vraie chaussure il faudrait un détourage.
  // Le héros ne porte plus de vignette : la chaussure est derrière, dans la
  // boucle de collection, et la montrer deux fois au même instant — une fois
  // nette dans une carte blanche, une fois sombre en fond — faisait de la
  // carte un autocollant posé sur le décor.
  poserLogo();
  $('#anatfig').innerHTML=anatomySVG();
  $('#filters').innerHTML=`<div class="color-filters" role="group" aria-label="Couleur"><button class="color-chip" data-act="filters-reset" aria-pressed="true">Tous les coloris</button>`
    +Object.entries(COLORS).filter(([k])=>prod('opus').colors.includes(k)).map(([k,c])=>`<button class="color-chip" data-act="col" data-k="${k}" aria-pressed="false"><i style="background:linear-gradient(135deg,${c.c},${c.d})" aria-hidden="true"></i>${c.n}</button>`).join('')+`</div>`;
  $('#ftrmodels').innerHTML=CATALOG.map(p=>`<li><a href="#modeles" data-act="open" data-id="${p.id}">${p.name} — ${fmt(priceOf(p))}</a></li>`).join('');
  $('#ftrcontact').innerHTML=`<h5>Nous écrire</h5>
    <div class="copybox"><code id="mailtxt">${esc(SHOP.email)}</code><button class="btn btn-sm btn-ghost" data-copy="mailtxt" style="margin-left:auto">Copier</button></div>
    ${SHOP.phone?`<div class="copybox"><code id="teltxt">${esc(SHOP.phone)}</code><button class="btn btn-sm btn-ghost" data-copy="teltxt" style="margin-left:auto">Copier</button></div>`:''}
    ${SHOP.whatsapp?`<a class="btn btn-ghost btn-sm" href="https://wa.me/${esc(SHOP.whatsapp)}" target="_blank" rel="noopener" style="width:100%;justify-content:center">Écrire sur WhatsApp</a>`:''}
    <p class="note" style="color:var(--band-soft);margin-top:9px">Atelier ouvert du lundi au vendredi, 9 h – 18 h.</p>`;
  $('#ftrcopy').textContent=`© ${new Date().getFullYear()} Benkashoes — ${SHOP.site}`;
  renderFAQ();
  $('#sizebody').innerHTML=SIZES.map((s,i)=>{const mm=MM[s],fin=i<SIZES.length-1?MM[SIZES[i+1]]-1:mm+6;
    return `<tr><td style="font-weight:700" class="num">${s}</td><td class="num">${mm} – ${fin}</td><td class="num">${mm+13} mm</td><td class="num">${Math.round(mm*.372)} mm</td><td class="num">${Math.round(mm*.405)} mm</td></tr>`;}).join('');
}
function renderFAQ(){
  const el=$('#faqlist'); if(!el)return;
  el.innerHTML=FAQ.map((q,i)=>`<div class="qa" data-open="0">
    <button class="qa-q" data-act="qa" data-i="${i}" aria-expanded="false" aria-controls="faq-answer-${i}">${q[0]}<span class="pm" aria-hidden="true"></span></button>
    <div class="qa-a" id="faq-answer-${i}" aria-hidden="true"><div><p>${q[1]}</p></div></div></div>`).join('');
}
/* La grille montre un coloris par carte, pas un modèle par carte.

   L'atelier fabrique un modèle en sept cuirs : une seule vignette ne
   montrerait qu'un septième de ce qu'on vend, et les six autres resteraient
   cachés derrière un clic. Chaque carte ouvre la fiche directement sur son
   coloris. */
let grilleRendue=null;
function renderGrid(){
  const asChange=renderASGrid();
  const paires=[];
  CATALOG.filter(p=>p.id!=='as'&&(S.filter==='tous'||p.fam===S.filter)).forEach(p=>
    p.colors.filter(c=>(!S.colorFilter||c===S.colorFilter)&&(!S.sizeFilter||stockCol(p,c,SIZES.indexOf(S.sizeFilter))>0)).forEach(c=>paires.push([p,c])));
  $('#filters').querySelectorAll('[data-act="fam"]').forEach(b=>b.setAttribute('aria-pressed',S.filter===b.dataset.k));
  $('#filters').querySelectorAll('[data-act="col"]').forEach(b=>b.setAttribute('aria-pressed',S.colorFilter===b.dataset.k));
  $('#filters').querySelector('[data-act="filters-reset"]')?.setAttribute('aria-pressed',!S.colorFilter&&!S.sizeFilter);
  if($('#size-filter'))$('#size-filter').value=S.sizeFilter||'';
  // Le compte des cuirs affichés, sous les pastilles. role="status" : un
  // lecteur d'écran annonce le nouveau total quand on filtre, sinon le
  // changement se produit en silence.
  const compte=$('#collection-count');
  if(compte) compte.textContent=paires.length+' coloris'+(S.sizeFilter?' en pointure '+S.sizeFilter:'');
  const html=!paires.length?`<div class="empty" style="grid-column:1/-1;background:var(--surface)"><h4>Aucune paire disponible avec ces filtres</h4><p>Essayez une autre pointure ou découvrez les autres coloris.</p><button class="btn btn-out" data-act="filters-reset">Réinitialiser les filtres</button></div>`:paires.map(([p,c],i)=>productCard(p,c,i)).join('');
  // Une quantité du panier ou une pointure ne doit pas reconstruire la collection.
  if(html===grilleRendue)return asChange;
  $('#grid').innerHTML=html;grilleRendue=html;return true;
}
function productCard(p,c,i){
    const out=totStockCol(p,c)===0;
    // Le bandeau du modèle ne se répète pas sur chaque coloris.
    const ruban=out?`<span class="card-flag out">Épuisé</span>`
                   :((p.vedette?c===p.vedette:i===0)&&p.flag
                       ?`<span class="card-flag">${p.flag}</span>`:'');
    const packPrice=p.id==='opus'&&priceOf(p)===279?699:p.id==='as'&&priceOf(p)===299?799:0;
    const ticket=!out&&packPrice?`<span class="bf-card-ticket" aria-hidden="true"><span>BLACK FRIDAY</span><b>TRIO · ${packPrice} DH</b></span>`:'';
    return `<button class="card" data-act="open" data-id="${p.id}" data-c="${c}">
      <div class="card-art">${ruban}${visuel(p,c)}${ticket}<span class="card-discover">Découvrir</span></div>
      <div><div class="card-name"><h3>${p.name} <span>${COLORS[c].n}</span></h3><span class="p num">${fmt(priceOf(p))}</span></div>
      <div class="card-meta"><span>${out?'Actuellement épuisé':SIZES.filter((s,i)=>stockCol(p,c,i)>0).join(' · ')+' EU'}</span><span class="dots"><i style="background:linear-gradient(135deg,${COLORS[c].c},${COLORS[c].d})"></i></span></div></div>
    </button>`;}
let asGrilleRendue=null;
function renderASGrid(){
  const el=$('#as-grid'),p=prod('as');if(!el||!p)return false;
  const html=p.colors.map((c,i)=>productCard(p,c,i)).join('');
  if(html===asGrilleRendue)return false;
  el.innerHTML=html;asGrilleRendue=html;return true;
}
function cartCount(){return S.cart.reduce((a,i)=>a+i.q,0);}
function cartPricing(){
  return prixBlackFriday(S.cart.map(i=>{const p=prod(i.id);return {
    id:p.id,name:p.name,color:COLORS[i.c].n,colorKey:i.c,size:i.s,q:i.q,unit:priceOf(p)
  };}));
}
function cartSub(){return cartPricing().sub;}
function shipCost(){return S.cart.length===0?0:(cartSub()>=SHIPFREE?0:SHIPCOST);}
function syncCart(){$('#cartcount').textContent=cartCount();
  // Le compteur seul ne dit rien à qui n'a pas l'écran.
  $('#cartbtn')?.setAttribute('aria-label','Panier, '+cartCount()+' article(s)');
  lsSet('benkashoes.cart',S.cart);}

