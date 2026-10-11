/* ======================= panier & commande ======================= */
function cartHTML(){
  const sub=cartSub(),ship=shipCost();
  let body,foot;
  if(S.step===3&&S.lastOrder){const o=S.lastOrder;
    body=`<div style="text-align:center;padding-top:18px">
      <div class="okmark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12.5l5.2 5L20 6.5"/></svg></div>
      <span class="eyebrow">Commande enregistrée</span><div class="ordref">${esc(o.ref)}</div>
      <p class="note" style="max-width:34ch;margin:8px auto 0">${o.saved
        ? `Nous avons reçu votre commande. Un e-mail de confirmation part à <b>${esc(o.customer.email)}</b>.`
        : `Votre récapitulatif est prêt. Envoyez-le à l'atelier : il confirme la disponibilité et vous rappelle pour la livraison.`}</p>
      ${o.saved?'':`<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px">
        ${waLink(o)?`<a class="btn btn-pri btn-sm" href="${waLink(o)}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>`:''}
        <a class="btn btn-out btn-sm" href="${mailLink(o)}">Envoyer par e-mail</a></div>
        <p class="note" style="margin-top:10px">ou copiez le texte ci-dessous et envoyez-le à ${esc(SHOP.email)}</p>`}</div>
      ${o.saved?'':`<div class="callout" style="margin-top:20px"><b>Pourquoi cette étape ?</b> Le paiement en ligne n'est pas encore branché sur cette boutique. L'atelier confirme la disponibilité, puis vous règlez à la livraison ou par virement.</div>
      <textarea id="summ" readonly style="width:100%;height:176px;margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:3px;background:var(--surface);font-size:.8rem;font-family:var(--fu);line-height:1.55">${esc(orderText(o))}</textarea>`}
      <ul class="spec" style="margin-top:18px">${o.items.map(i=>`<li><span>${i.q} × ${esc(i.name)} · ${esc(i.color)} · ${i.size}</span><span class="num">${fmt(i.unit*i.q)}</span></li>`).join('')}
        <li><span>Livraison</span><span class="num">${o.ship?fmt(o.ship):'Offerte'}</span></li>
        <li style="font-weight:700"><span>Total</span><span class="num">${fmt(o.total)}</span></li></ul>`;
    foot=`${o.saved?'':`<button class="btn btn-pri" data-act="copysum" style="justify-content:center">Copier le récapitulatif</button>`}
      <button class="btn btn-out" data-act="closep" style="justify-content:center">Continuer mes achats</button>`;
  } else if(S.step===2){
    const f=S.form||{};
    body=`<div class="steps" style="margin-bottom:20px"><b>Panier</b><i></i><b data-on="1">Livraison</b><i></i><b>Confirmation</b></div>
      <div class="form">
      <label class="f full">Nom et prénom<input id="f_name" value="${esc(f.name)}" autocomplete="name" placeholder="Amina Benali"></label>
      <label class="f">Téléphone<input id="f_phone" value="${esc(f.phone)}" autocomplete="tel" placeholder="06 12 34 56 78"></label>
      <label class="f">E-mail<input id="f_email" type="email" value="${esc(f.email)}" autocomplete="email" placeholder="amina@exemple.fr"></label>
      <label class="f full">Adresse<input id="f_addr" value="${esc(f.addr)}" autocomplete="street-address" placeholder="12 rue Tahar Sebti"></label>
      <label class="f">Code postal<input id="f_zip" value="${esc(f.zip)}" autocomplete="postal-code" placeholder="20250"></label>
      <label class="f">Ville<input id="f_city" value="${esc(f.city)}" autocomplete="address-level2" placeholder="Casablanca"></label>
      <label class="f full">Pays<select id="f_country">${['Maroc','France','Belgique','Espagne','Algérie','Tunisie','Canada','Autre'].map(c=>`<option ${(f.country||'Maroc')===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label class="f full">Note pour l'atelier <span style="text-transform:none;letter-spacing:0;font-weight:400">(optionnel)</span><textarea id="f_note" placeholder="Pied large, livrer après 18 h…">${esc(f.note)}</textarea></label>
      </div>
      <div class="callout" style="margin-top:18px"><b>Aucun paiement maintenant.</b> L'atelier vérifie la disponibilité, vous recevez la confirmation, puis vous réglez à la livraison ou par virement.</div>`;
    foot=`<div class="totals"><div><span>Sous-total</span><span class="num">${fmt(sub)}</span></div>
      <div><span>Livraison</span><span class="num">${ship?fmt(ship):'Offerte'}</span></div>
      <div class="grand"><span>Total</span><span class="num">${fmt(sub+ship)}</span></div></div>
      <button class="btn btn-pri" data-act="place" style="justify-content:center">Valider la commande</button>
      <button class="btn btn-out btn-sm" data-act="back" style="justify-content:center">Retour au panier</button>`;
  } else if(!S.cart.length){
    body=`<div class="empty"><h4>Votre panier est vide</h4><p>Trois modèles, huit cuirs — commencez par la bride, la couleur et la pointure viennent après.</p>
      <a class="btn btn-out btn-sm" href="#modeles" data-act="closep" style="margin-top:18px">Voir la collection</a></div>`;
    foot='';
  } else {
    body=`<div class="steps" style="margin-bottom:16px"><b data-on="1">Panier</b><i></i><b>Livraison</b><i></i><b>Confirmation</b></div>`
      +S.cart.map((it,n)=>{const p=prod(it.id);return `<div class="citem">
        <div class="cthumb">${visuel(p,it.c)}</div>
        <div><h4>${p.name}</h4><div class="meta">${COLORS[it.c].n} · Pointure ${it.s}</div>
          <div class="qty"><button data-act="qty" data-n="${n}" data-d="-1" aria-label="Retirer un">−</button><span class="num">${it.q}</span><button data-act="qty" data-n="${n}" data-d="1" aria-label="Ajouter un">+</button></div></div>
        <div class="right"><b class="num">${fmt(priceOf(p)*it.q)}</b><button class="lnk" data-act="rm" data-n="${n}">Retirer</button></div></div>`;}).join('')
      +`<p class="note" style="margin-top:16px">${sub>=SHIPFREE?'Livraison offerte sur cette commande.':`Encore ${fmt(SHIPFREE-sub)} pour la livraison offerte.`}</p>`;
    foot=`<div class="totals"><div><span>Sous-total</span><span class="num">${fmt(sub)}</span></div>
      <div><span>Livraison</span><span class="num">${ship?fmt(ship):'Offerte'}</span></div>
      <div class="grand"><span>Total</span><span class="num">${fmt(sub+ship)}</span></div></div>
      <button class="btn btn-pri" data-act="next" style="justify-content:center">Passer à la livraison</button>`;
  }
  return `<div class="panel left" role="dialog" aria-modal="true" aria-label="Panier">
    <div class="panel-hd"><h3>${S.step===3?'Merci':S.step===2?'Livraison':'Votre panier'}</h3>
      <button class="close" data-act="closep" aria-label="Fermer">✕</button></div>
    <div class="panel-bd">${body}</div>${foot?`<div class="panel-ft">${foot}</div>`:''}</div>`;
}
function waLink(o){return SHOP.whatsapp?`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(orderText(o))}`:'';}
function mailLink(o){return `mailto:${SHOP.email}?subject=${encodeURIComponent('Commande '+o.ref)}&body=${encodeURIComponent(orderText(o))}`;}
function orderText(o){
  return `COMMANDE ${o.ref} — ${SHOP.site}\n${new Date(o.createdAt).toLocaleString('fr-FR')}\n\n`
    +o.items.map(i=>`${i.q} × ${i.name} — ${i.color} — pointure ${i.size} — ${fmt(i.unit*i.q)}`).join('\n')
    +`\n\nLivraison : ${o.ship?fmt(o.ship):'offerte'}\nTOTAL : ${fmt(o.total)}\n\n`
    +`${o.customer.name}\n${o.customer.phone}\n${o.customer.email}\n${o.customer.addr}\n${o.customer.zip} ${o.customer.city}\n${o.customer.country}`
    +(o.note?`\n\nNote : ${o.note}`:'');
}
function readForm(){
  const g=id=>($('#'+id)?.value||'').trim();
  return {name:g('f_name'),phone:g('f_phone'),email:g('f_email'),addr:g('f_addr'),
    zip:g('f_zip'),city:g('f_city'),country:$('#f_country')?.value||'Maroc',note:g('f_note')};
}
async function placeOrder(){
  const f=readForm();S.form=f;
  const miss=['name','phone','email','addr','city'].filter(k=>!f[k]);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email))miss.push('email');
  if(miss.length){document.querySelectorAll('label.f').forEach(l=>l.classList.remove('bad'));
    miss.forEach(k=>$('#f_'+k)?.closest('label')?.classList.add('bad'));
    toast('Complétez les champs en rouge');$('#f_'+miss[0])?.focus();return;}
  const sub=cartSub(),ship=shipCost();
  const o={ref:newRef(),createdAt:new Date().toISOString(),status:'nouvelle',source:'boutique',
    items:S.cart.map(i=>{const p=prod(i.id);return {id:p.id,name:p.name,color:COLORS[i.c].n,colorKey:i.c,size:i.s,q:i.q,unit:priceOf(p)};}),
    customer:{name:f.name,phone:f.phone,email:f.email,addr:f.addr,zip:f.zip,city:f.city,country:f.country},
    note:f.note,sub,ship,total:sub+ship,currency:'MAD'};
  if(MODE==='api'){
    try{const r=await api('orders',{method:'POST',body:{items:o.items,customer:o.customer,note:o.note}});
      S.lastOrder=Object.assign({},nettoyerCommande(r.order)||o,{saved:true});S.cart=[];syncCart();S.step=3;S.form=null;
      await refreshCatalog();draw();return;}
    catch(e){toast(e.message);return;}}
  let saved=false;
  if(S.db){try{await S.db.doc('orders/'+o.ref).set(o);saved=true;}catch(e){saved=false;}}
  S.lastOrder=Object.assign({},nettoyerCommande(o)||o,{saved:saved});S.cart=[];syncCart();S.step=3;S.form=null;draw();
}

