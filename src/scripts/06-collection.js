/* ======================= boutique ======================= */
function renderStatic(){
  $('#herotopo').innerHTML=[1.6,1.3,1.05,.82,.6,.4,.22].map((k,i)=>
    `<g transform="translate(600,310) scale(${k*2.1},${k*1.25}) translate(-100,-230)"><path d="${SOLE}" fill="none" stroke="rgba(207,149,73,${(.3-i*.03).toFixed(2)})" stroke-width="${(1.6/k).toFixed(2)}"/></g>`).join('');
  // Le héros garde l'illustration : les photos de l'atelier portent leur
  // décor (canapé, parquet, marbre), qui ferait une boîte claire au milieu du
  // bordeaux. Pour y mettre la vraie chaussure il faudrait un détourage.
  // Jamais un nom de coloris en dur : il a déjà fallu corriger ici deux fois
  // après un renommage (burgundy, puis rose), et chaque fois le héros est
  // reparti en dessin avec des couleurs indéfinies sans que rien n'alerte.
  // Le premier coloris du modèle existe toujours, par construction.
  const vedette=CATALOG[0];
  $('#heroart').innerHTML=visuel(vedette,vedette.colors[0]);
  const etiq=document.querySelector('.hero-art .tag');
  if(etiq) etiq.innerHTML=`${vedette.name} · ${COLORS[vedette.colors[0]].n}<br>Pointures ${SIZES[0]} → ${SIZES[SIZES.length-1]}`;
  poserLogo();
  $('#anatfig').innerHTML=anatomySVG();
  $('#filters').innerHTML=FAMS.map(([k,l])=>`<button class="chip" data-act="fam" data-k="${k}" aria-pressed="${S.filter===k}">${l}</button>`).join('')
    +`<span class="fsep"></span><span class="swatches">`
    +Object.entries(COLORS).map(([k,c])=>`<button class="sw" data-act="col" data-k="${k}" aria-pressed="${S.colorFilter===k}" title="${c.n}" aria-label="${c.n}" style="background:linear-gradient(135deg,${c.c},${c.d})"></button>`).join('')
    +`</span>`;
  $('#ftrmodels').innerHTML=CATALOG.map(p=>`<li><a href="#modeles" data-act="open" data-id="${p.id}">${p.name} — ${fmt(priceOf(p))}</a></li>`).join('');
  $('#ftrcontact').innerHTML=`<h5>Nous écrire</h5>
    <div class="copybox"><code id="mailtxt">${esc(SHOP.email)}</code><button class="btn btn-sm btn-ghost" data-copy="mailtxt" style="margin-left:auto">Copier</button></div>
    ${SHOP.phone?`<div class="copybox"><code id="teltxt">${esc(SHOP.phone)}</code><button class="btn btn-sm btn-ghost" data-copy="teltxt" style="margin-left:auto">Copier</button></div>`:''}
    ${SHOP.whatsapp?`<a class="btn btn-ghost btn-sm" href="https://wa.me/${esc(SHOP.whatsapp)}" target="_blank" rel="noopener" style="width:100%;justify-content:center">Écrire sur WhatsApp</a>`:''}
    <p class="note" style="color:var(--band-soft);margin-top:9px">Atelier ouvert du lundi au vendredi, 9 h – 18 h.</p>`;
  $('#ftrcopy').textContent=`© ${new Date().getFullYear()} Benkashoes — ${SHOP.site}`;
  renderFAQ();
  $('#sizebody').innerHTML=SIZES.map(s=>{const mm=MM[s];
    return `<tr><td style="font-weight:700" class="num">${s}</td><td class="num">${mm} – ${mm+6}</td><td class="num">${mm+13} mm</td><td class="num">${Math.round(mm*.372)} mm</td><td class="num">${Math.round(mm*.405)} mm</td></tr>`;}).join('');
}
function renderFAQ(){
  const el=$('#faqlist'); if(!el)return;
  el.innerHTML=FAQ.map((q,i)=>`<div class="qa" data-open="0">
    <button class="qa-q" data-act="qa" data-i="${i}" aria-expanded="false">${q[0]}<span class="pm" aria-hidden="true"></span></button>
    <div class="qa-a"><div><p>${q[1]}</p></div></div></div>`).join('');
}
/* La grille montre un coloris par carte, pas un modèle par carte.

   L'atelier fabrique un modèle en sept cuirs : une seule vignette ne
   montrerait qu'un septième de ce qu'on vend, et les six autres resteraient
   cachés derrière un clic. Chaque carte ouvre la fiche directement sur son
   coloris. */
function renderGrid(){
  const paires=[];
  CATALOG.filter(p=>S.filter==='tous'||p.fam===S.filter).forEach(p=>
    p.colors.filter(c=>!S.colorFilter||c===S.colorFilter).forEach(c=>paires.push([p,c])));
  $('#filters').querySelectorAll('[data-act="fam"]').forEach(b=>b.setAttribute('aria-pressed',S.filter===b.dataset.k));
  $('#filters').querySelectorAll('[data-act="col"]').forEach(b=>b.setAttribute('aria-pressed',S.colorFilter===b.dataset.k));
  if(!paires.length){$('#grid').innerHTML=`<div class="empty" style="grid-column:1/-1;background:var(--surface)"><h4>Aucun cuir dans cette combinaison</h4><p>Essayez une autre couleur ou revenez à tous les cuirs.</p></div>`;return;}
  $('#grid').innerHTML=paires.map(([p,c],i)=>{
    const out=totStock(p)===0;
    // Le bandeau du modèle ne se répète pas sur chaque coloris.
    const ruban=out?`<span class="card-flag out">Épuisé</span>`
                   :(i===0&&p.flag?`<span class="card-flag">${p.flag}</span>`:'');
    return `<button class="card" data-act="open" data-id="${p.id}" data-c="${c}">
      <div class="card-art">${ruban}${visuel(p,c)}</div>
      <div><div class="card-name"><h3>${p.name} · ${COLORS[c].n}</h3><span class="p num">${fmt(priceOf(p))}</span></div>
      <div class="card-meta"><span>${p.sub}</span><span class="dots"><i style="background:linear-gradient(135deg,${COLORS[c].c},${COLORS[c].d})"></i></span></div></div>
    </button>`;}).join('');
}
function cartCount(){return S.cart.reduce((a,i)=>a+i.q,0);}
function cartSub(){return S.cart.reduce((a,i)=>a+priceOf(prod(i.id))*i.q,0);}
function shipCost(){return S.cart.length===0?0:(cartSub()>=SHIPFREE?0:SHIPCOST);}
function syncCart(){$('#cartcount').textContent=cartCount();lsSet('benkashoes.cart',S.cart);}

