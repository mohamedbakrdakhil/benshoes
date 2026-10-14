/* ======================= boutique ======================= */
function renderStatic(){
  $('#herotopo').innerHTML=[1.6,1.3,1.05,.82,.6,.4,.22].map((k,i)=>
    `<g transform="translate(600,310) scale(${k*2.1},${k*1.25}) translate(-100,-230)"><path d="${SOLE}" fill="none" stroke="rgba(207,149,73,${(.3-i*.03).toFixed(2)})" stroke-width="${(1.6/k).toFixed(2)}"/></g>`).join('');
  // Le héros garde l'illustration : les photos de l'atelier portent leur
  // décor (canapé, parquet, marbre), qui ferait une boîte claire au milieu du
  // bordeaux. Pour y mettre la vraie chaussure il faudrait un détourage.
  $('#heroart').innerHTML=visuel(prod('opus'),'rose');
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
  renderCmp(); renderFAQ();
  $('#sizebody').innerHTML=SIZES.map(s=>{const mm=MM[s];
    return `<tr><td style="font-weight:700" class="num">${s}</td><td class="num">${mm} – ${mm+6}</td><td class="num">${mm+13} mm</td><td class="num">${Math.round(mm*.372)} mm</td><td class="num">${Math.round(mm*.405)} mm</td></tr>`;}).join('');
}
let _cmpSig='';
function renderCmp(){
  const sig=CATALOG.map(p=>p.id+priceOf(p)+totStock(p)).join('|');
  if(sig===_cmpSig)return; _cmpSig=sig;
  const t=$('#cmptable'); if(!t)return;
  t.innerHTML=`<thead><tr><th>Modèle</th><th>Travail</th><th>Usage</th><th>Poids (40)</th><th>Coloris</th><th>Stock</th><th class="r">Prix</th></tr></thead><tbody>`
   +CATALOG.map(p=>{const st=totStock(p);
     return `<tr data-act="open" data-id="${p.id}" data-c="${p.colors[0]}">
       <td><span class="mdl">${visuel(p,p.colors[0])}<span><b>${p.name}</b><span>${p.sub}</span></span></span></td>
       <td><span class="meter" title="${p.hold} sur 5">${[1,2,3,4,5].map(i=>`<i class="${i<=p.hold?'on':''}"></i>`).join('')}</span></td>
       <td style="color:var(--fg-soft)">${p.use}</td>
       <td class="num" style="color:var(--fg-soft)">${(p.spec.find(s=>s[0]==='Poids')||['','—'])[1].replace(' (pointure 40)','')}</td>
       <td><span class="dots">${p.colors.map(k=>`<i style="background:linear-gradient(135deg,${COLORS[k].c},${COLORS[k].d})" title="${COLORS[k].n}"></i>`).join('')}</span></td>
       <td style="color:${st?'var(--ok)':'var(--fg-soft)'};font-size:.8rem">${st?st+' paires':'épuisé'}</td>
       <td class="r prix">${fmt(priceOf(p))}</td></tr>`;}).join('')+`</tbody>`;
}
function renderFAQ(){
  const el=$('#faqlist'); if(!el)return;
  el.innerHTML=FAQ.map((q,i)=>`<div class="qa" data-open="0">
    <button class="qa-q" data-act="qa" data-i="${i}" aria-expanded="false">${q[0]}<span class="pm" aria-hidden="true"></span></button>
    <div class="qa-a"><div><p>${q[1]}</p></div></div></div>`).join('');
}
function renderGrid(){
  const list=CATALOG.filter(p=>(S.filter==='tous'||p.fam===S.filter)&&(!S.colorFilter||p.colors.includes(S.colorFilter)));
  $('#filters').querySelectorAll('[data-act="fam"]').forEach(b=>b.setAttribute('aria-pressed',S.filter===b.dataset.k));
  $('#filters').querySelectorAll('[data-act="col"]').forEach(b=>b.setAttribute('aria-pressed',S.colorFilter===b.dataset.k));
  if(!list.length){$('#grid').innerHTML=`<div class="empty" style="grid-column:1/-1;background:var(--surface)"><h4>Aucun modèle dans cette combinaison</h4><p>Essayez une autre couleur ou revenez à tous les modèles.</p></div>`;return;}
  $('#grid').innerHTML=list.map(p=>{
    const c=S.colorFilter&&p.colors.includes(S.colorFilter)?S.colorFilter:p.colors[0];
    const out=totStock(p)===0;
    return `<button class="card" data-act="open" data-id="${p.id}" data-c="${c}">
      <div class="card-art">${out?`<span class="card-flag out">Épuisé</span>`:p.flag?`<span class="card-flag">${p.flag}</span>`:''}${visuel(p,c)}</div>
      <div><div class="card-name"><h3>${p.name}</h3><span class="p num">${fmt(priceOf(p))}</span></div>
      <div class="card-meta"><span>${p.sub}</span><span class="dots">${p.colors.map(k=>`<i style="background:linear-gradient(135deg,${COLORS[k].c},${COLORS[k].d})"></i>`).join('')}</span></div></div>
    </button>`;}).join('');
}
function cartCount(){return S.cart.reduce((a,i)=>a+i.q,0);}
function cartSub(){return S.cart.reduce((a,i)=>a+priceOf(prod(i.id))*i.q,0);}
function shipCost(){return S.cart.length===0?0:(cartSub()>=SHIPFREE?0:SHIPCOST);}
function syncCart(){$('#cartcount').textContent=cartCount();lsSet('benkashoes.cart',S.cart);}

