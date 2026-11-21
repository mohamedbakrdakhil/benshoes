/* ======================= panier & commande ======================= */
function cartHTML(){
  const pricing=cartPricing(),sub=pricing.sub,ship=shipCost();
  let body,foot;
  if(S.step===3&&S.lastOrder){const o=S.lastOrder;
    body=`<div style="text-align:center;padding-top:18px">
      <div class="okmark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12.5l5.2 5L20 6.5"/></svg></div>
      <span class="eyebrow">${o.saved?'Commande reçue':'Récapitulatif à transmettre'}</span><div class="ordref">${esc(o.ref)}</div>
      <p class="note" style="max-width:34ch;margin:8px auto 0">${o.canal==='tableur'
        ? `Votre commande est arrivée à l'atelier. On vous rappelle au <b>${esc(o.customer.phone)}</b> pour confirmer la disponibilité et la livraison.`
        : o.saved
        ? `Votre commande a bien été enregistrée. Conservez cette référence pour le suivi auprès de l’atelier.`
        : `Votre récapitulatif est prêt. Envoyez-le à l'atelier : il confirme la disponibilité et vous rappelle pour la livraison.`}</p>
      ${o.saved?'':`<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px">
        ${waLink(o)?`<a class="btn btn-pri btn-sm" href="${waLink(o)}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>`:''}
        <a class="btn btn-out btn-sm" href="${mailLink(o)}">Envoyer par e-mail</a></div>
        <p class="note" style="margin-top:10px">ou copiez le texte ci-dessous et envoyez-le à ${esc(SHOP.email)}</p>`}</div>
      ${o.saved?'':`<div class="callout" style="margin-top:20px"><b>Pourquoi cette étape ?</b> Le paiement en ligne n'est pas encore branché sur cette boutique. L'atelier confirme la disponibilité, puis vous réglez à la livraison ou par virement.</div>
      <textarea id="summ" readonly style="width:100%;height:176px;margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:3px;background:var(--surface);font-size:.8rem;font-family:var(--fu);line-height:1.55">${esc(orderText(o))}</textarea>`}
      ${o.discount?`<p class="bf-cart-saved">Black Friday : ${fmt(o.discount)} économisés · prix remisés ci-dessous</p>`:''}<ul class="spec" style="margin-top:18px">${o.items.map(i=>`<li><span>${i.q} × ${esc(i.name)} · ${esc(i.color)} · ${i.size}</span><span class="num">${fmt(i.unit*i.q)}</span></li>`).join('')}
        <li><span>Livraison</span><span class="num">${o.ship?fmt(o.ship):'Offerte'}</span></li>
        <li style="font-weight:700"><span>Total</span><span class="num">${fmt(o.total)}</span></li></ul>`;
    foot=`${o.saved?'':`<button class="btn btn-pri" data-act="copysum" style="justify-content:center">Copier le récapitulatif</button>`}
      <button class="btn btn-out" data-act="closep" style="justify-content:center">Continuer mes achats</button>`;
  } else if(S.step===2){
    const f=S.form||{};
    body=`<div class="steps" style="margin-bottom:20px"><b>Panier</b><i></i><b data-on="1">Livraison</b><i></i><b>Confirmation</b></div>
      <p class="checkout-intro">Vos coordonnées pour la livraison. Aucun paiement en ligne.</p>
      <p class="checkout-error" role="alert" ${S.checkoutError?'':'hidden'}>${esc(S.checkoutError||'')}</p>
      <div class="form">
      <label class="f full">Nom et prénom<input id="f_name" required aria-required="true" maxlength="80" value="${esc(f.name)}" autocomplete="name" placeholder="Amina Benali"></label>
      <label class="f">Téléphone<input id="f_phone" required aria-required="true" type="tel" inputmode="tel" maxlength="20" value="${esc(f.phone)}" autocomplete="tel" placeholder="06 12 34 56 78"></label>
      <label class="f">E-mail<input id="f_email" required aria-required="true" type="email" maxlength="120" value="${esc(f.email)}" autocomplete="email" placeholder="amina@exemple.fr"></label>
      <label class="f full">Adresse<input id="f_addr" required aria-required="true" maxlength="200" value="${esc(f.addr)}" autocomplete="street-address" placeholder="12 rue Tahar Sebti"></label>
      <label class="f full">Ville<input id="f_city" required aria-required="true" maxlength="80" value="${esc(f.city)}" autocomplete="address-level2" placeholder="Casablanca"></label>
      <label class="f full">Pays<select id="f_country"><option selected>Maroc</option></select></label>
      <p class="full checkout-international">Livraison hors Maroc : <a href="mailto:${att(SHOP.email)}">demandez un devis à l’atelier</a>.</p>
      <label class="f full">Note pour l'atelier <span style="text-transform:none;letter-spacing:0;font-weight:400">(optionnel)</span><textarea id="f_note" maxlength="500" placeholder="Pied large, livrer après 18 h…">${esc(f.note)}</textarea></label>
      <input id="f_site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      </div>
      <p class="checkout-privacy">Vos coordonnées servent à préparer votre commande et à vous contacter pour sa livraison.</p>
      <div class="callout" style="margin-top:18px"><b>Aucun paiement maintenant.</b> L'atelier vérifie la disponibilité, vous recevez la confirmation, puis vous réglez à la livraison ou par virement.</div>`;
    foot=`<div class="totals"><div><span>Sous-total</span><span class="num">${fmt(pricing.gross)}</span></div>${pricing.discount?`<div class="bf-discount"><span>Black Friday · ${blackFridayPackLabel(pricing.pack)}</span><span class="num">−${fmt(pricing.discount)}</span></div>`:''}
      <div><span>Livraison</span><span class="num">${ship?fmt(ship):'Offerte'}</span></div>
      <div class="grand"><span>Total</span><span class="num">${fmt(sub+ship)}</span></div></div>
      <button class="btn btn-pri" data-act="place" style="justify-content:center">Valider la commande</button>
      <button class="btn btn-out btn-sm" data-act="back" style="justify-content:center">Retour au panier</button>`;
  } else if(!S.cart.length){
    body=`<div class="empty"><h4>Votre panier est vide</h4><p>Opus ou AS by BENKA : choisissez votre modèle, votre couleur et votre pointure.</p>
      <a class="btn btn-out btn-sm" href="/collection/" data-act="closep" style="margin-top:18px">Voir la collection</a></div>`;
    foot='';
  } else {
    body=(S.cart.some(i=>i.id==='opus'||i.id==='as')?blackFridayCartNote(pricing):'')+`<div class="steps" style="margin-bottom:16px"><b data-on="1">Panier</b><i></i><b>Livraison</b><i></i><b>Confirmation</b></div>`
      +S.cart.map((it,n)=>{const p=prod(it.id);return `<div class="citem">
        <div class="cthumb">${visuel(p,it.c)}</div>
        <div><h4>${p.name}</h4><div class="meta">${COLORS[it.c].n} · Pointure ${it.s}</div>
          <div class="qty"><button data-act="qty" data-n="${n}" data-d="-1" aria-label="Retirer un">−</button><span class="num">${it.q}</span><button data-act="qty" data-n="${n}" data-d="1" aria-label="Ajouter un">+</button></div></div>
        <div class="right"><b class="num">${fmt(priceOf(p)*it.q)}</b><button class="lnk" data-act="rm" data-n="${n}">Retirer</button></div></div>`;}).join('')
      +`<button class="continue-shopping" data-act="continue-shopping">Continuer à choisir mes paires <span aria-hidden="true">↗</span></button><p class="note" style="margin-top:16px">${SHIPFREE===0||SHIPCOST===0?'Livraison offerte, partout au Maroc.':(sub>=SHIPFREE?'Livraison offerte sur cette commande.':`Encore ${fmt(SHIPFREE-sub)} pour la livraison offerte.`)}</p>`;
    foot=`<div class="totals"><div><span>Sous-total</span><span class="num">${fmt(pricing.gross)}</span></div>${pricing.discount?`<div class="bf-discount"><span>Black Friday · ${blackFridayPackLabel(pricing.pack)}</span><span class="num">−${fmt(pricing.discount)}</span></div>`:''}
      <div><span>Livraison</span><span class="num">${ship?fmt(ship):'Offerte'}</span></div>
      <div class="grand"><span>Total</span><span class="num">${fmt(sub+ship)}</span></div></div>
      <button class="btn btn-pri" data-act="next" style="justify-content:center">Passer à la livraison</button>`;
  }
  return `<div class="panel left" role="dialog" aria-modal="true" aria-label="Panier">
    <div class="panel-hd"><h3>${S.step===3?(S.lastOrder?.saved?'Merci':'Votre récapitulatif'):S.step===2?'Livraison':'Votre panier'}</h3>
      <button class="close" data-act="closep" aria-label="Fermer">✕</button></div>
    <div class="panel-bd">${body}</div>${foot?`<div class="panel-ft">${foot}</div>`:''}</div>`;
}
function blackFridayPackLabel(pack){return {opus:'Trio Opus',as:'Trio AS by BENKA',mixte:'Trio mixte'}[pack]||'Votre trio';}
function blackFridayCartNote(pricing){
  const missing=3-pricing.quantity;
  const message=pricing.packs
    ? `Offre appliquée : ${fmt(pricing.discount)} économisés. Livraison offerte.`
    : pricing.quantity<3 && pricing.count===pricing.quantity
      ? `Encore ${missing} paire${missing>1?'s':''} pour composer votre trio. Le prix s’adapte aux modèles choisis.`
      : 'Tarif normal appliqué : ces offres sont réservées à un panier d’exactement 3 paires.';
  const title=pricing.packs ? `${blackFridayPackLabel(pricing.pack)} · ${fmt(pricing.sub)}` : 'BLACK FRIDAY · VOTRE PACK DE 3';
  return `<div class="bf-cart-offer"><b>${title}</b>
    <p>${message}</p>
    ${pricing.packs?'':`<small>3 Opus : 699 DH · Mixte Opus + AS : 749 DH · 3 AS : 799 DH</small>`}
    <small>Exactement 3 paires · Couleurs et pointures au choix</small></div>`;
}
function waLink(o){return SHOP.whatsapp?`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(orderText(o))}`:'';}
function mailLink(o){return `mailto:${SHOP.email}?subject=${encodeURIComponent('Commande '+o.ref)}&body=${encodeURIComponent(orderText(o))}`;}
function orderText(o){
  return `COMMANDE ${o.ref} — ${SHOP.site}\n${new Date(o.createdAt).toLocaleString('fr-FR')}\n\n`
    +o.items.map(i=>`${i.q} × ${i.name} — ${i.color} — pointure ${i.size} — ${fmt(i.unit*i.q)}`).join('\n')
    +(o.discount?`\nBlack Friday : ${fmt(o.discount)} économisés (prix remisés ci-dessus).`:'')
    +`\n\nLivraison : ${o.ship?fmt(o.ship):'offerte'}\nTOTAL : ${fmt(o.total)}\n\n`
    +`${o.customer.name}\n${o.customer.phone}\n${o.customer.email}\n${o.customer.addr}\n${o.customer.city}\n${o.customer.country}`
    +(o.note?`\n\nNote : ${o.note}`:'');
}
function readForm(){
  const g=id=>($('#'+id)?.value||'').trim();
  return {name:g('f_name'),phone:g('f_phone'),email:g('f_email'),addr:g('f_addr'),
    zip:'',city:g('f_city'),country:$('#f_country')?.value||'Maroc',note:g('f_note'),
    site:g('f_site')};   // piège à robots : un humain ne voit pas ce champ
}
/* ---------- dépôt de la commande dans le tableur de l'atelier ----------
   Envoyé en text/plain : avec un type JSON le navigateur enverrait d'abord
   une requête de contrôle, à laquelle Apps Script ne sait pas répondre.
   Chaque commande porte une clé : si la réponse ne nous revient pas — la
   politique d'origine peut l'empêcher — on peut renvoyer sans créer de
   doublon, le script reconnaît la clé et rend la même référence. */
function cleCommande(){
  const a=new Uint8Array(12);
  if(self.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);
  else for(let i=0;i<a.length;i++)a[i]=Math.random()*256|0;
  return Array.from(a,b=>('0'+b.toString(16)).slice(-2)).join('');
}
async function envoyerAuTableur(o,cle,leurre){
  // Ne jamais envoyer un total remisé à un ancien déploiement qui facturerait
  // encore trois prix unitaires. Cette lecture ne crée aucune commande.
  if(o.discount){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const check=await fetch(SHOP.tableur,{method:'GET',signal:controller.signal});
      const data=await check.json();
      if(!check.ok||data?.promotion?.packsVersion!=='bf-trios-opus-as-mixte-v3')throw new Error('offre indisponible');
    }catch(e){return {ok:false,refus:true,message:'L’offre Black Friday est momentanément indisponible. Votre panier est conservé ; réessayez dans un moment.'};}
    finally{clearTimeout(timeout);}
  }
  const charge=JSON.stringify({cle,
    items:o.requestItems||o.items.map(i=>({id:i.id,colorKey:i.colorKey,size:i.size,q:i.q})),
    customer:o.customer,note:o.note,expectedTotal:o.total,pricingVersion:'bf-trios-opus-as-mixte-v3',site:leurre||''});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch(SHOP.tableur,{method:'POST',mode:'cors',signal:controller.signal,
      headers:{'Content-Type':'text/plain;charset=utf-8'},body:charge});
    let d=null;try{d=await r.json();}catch(e){}
    if(r.ok&&d?.ok===true&&/^[A-Za-z0-9-]{1,24}$/.test(d.ref||''))return {ok:true,ref:d.ref};
    if(d&&typeof d.erreur==='string')return {ok:false,refus:true,message:d.erreur};
  }catch(e){/* Une réponse absente ne prouve ni le succès ni l'échec du dépôt. */}
  finally{clearTimeout(timeout);}
  return {ok:false,incertain:true,message:'La réception de votre commande n’a pas pu être confirmée. Votre panier est conservé. Réessayez ici : la même référence d’envoi sera utilisée.'};
}
function clePourCommande(o){
  const signature=JSON.stringify([o.requestItems,o.customer,o.note,o.total]);
  if(S.tentative?.signature===signature)return S.tentative.cle;
  const cle=cleCommande();S.tentative={signature,cle};return cle;
}
function erreursLivraison(f){
  const e={};
  for(const k of ['name','phone','email','addr','city'])if(!f[k])e[k]='Ce champ est obligatoire.';
  if(f.phone&&(!/^[0-9+().\s-]+$/.test(f.phone)||!/^\d{8,15}$/.test(f.phone.replace(/\D/g,''))))e.phone='Indiquez un numéro de téléphone valide.';
  if(f.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email))e.email='Indiquez une adresse e-mail valide.';
  return e;
}
function afficherErreursLivraison(erreurs){
  document.querySelectorAll('.field-error').forEach(el=>el.remove());
  document.querySelectorAll('label.f').forEach(l=>l.classList.remove('bad'));
  for(const k of ['name','phone','email','addr','city']){
    const el=$('#f_'+k);if(!el)continue;
    el.setAttribute('aria-invalid',String(!!erreurs[k]));el.removeAttribute('aria-describedby');
    if(!erreurs[k])continue;
    const note=document.createElement('span');note.className='field-error';note.id='error-'+k;note.textContent=erreurs[k];
    el.closest('label')?.appendChild(note);el.closest('label')?.classList.add('bad');el.setAttribute('aria-describedby',note.id);
  }
  const premier=Object.keys(erreurs)[0];if(premier)$('#f_'+premier)?.focus();
}
/* Appelée une seule fois, quand la commande est vraiment passée. */
function mesurerAchat(o,id){
  mesure('Purchase',{content_type:'product',
    content_ids:(o.items||[]).map(i=>refMeta(i.id,i.colorKey)),
    num_items:(o.items||[]).reduce((a,i)=>a+i.q,0),
    value:o.total,currency:'MAD'},id);
}
async function placeOrder(){
  if(S.envoi||!S.cart.length)return;
  const f=readForm();S.form=f;
  const erreurs=erreursLivraison(f);afficherErreursLivraison(erreurs);
  if(Object.keys(erreurs).length){toast('Vérifiez les champs indiqués.');return;}
  if(f.country!=='Maroc'){S.checkoutError='Pour une livraison hors Maroc, contactez l’atelier pour un devis.';draw();return;}
  const pricing=cartPricing(),sub=pricing.sub,ship=shipCost();
  const o={ref:newRef(),createdAt:new Date().toISOString(),status:'nouvelle',source:'boutique',
    items:pricing.items,requestItems:S.cart.map(i=>({id:i.id,colorKey:i.c,size:i.s,q:i.q})),
    customer:{name:f.name,phone:f.phone,email:f.email,addr:f.addr,zip:f.zip,city:f.city,country:f.country},
    note:f.note,discount:pricing.discount,packs:pricing.packs,sub,ship,total:sub+ship,currency:'MAD'};
  const cle=clePourCommande(o);
  S.envoi=true;S.checkoutError='';draw();
  try{
    if(MODE==='api'){
      const r=await api('orders',{method:'POST',body:{items:o.requestItems,customer:o.customer,note:o.note,expectedTotal:o.total}});
      S.lastOrder=Object.assign({},nettoyerCommande(r.order)||o,{saved:true});
      await refreshCatalog();
    }else if(SHOP.tableur){
      const r=await envoyerAuTableur(o,cle,f.site);
      if(!r.ok){S.checkoutError=r.message;toast(r.message);return;}
      o.ref=r.ref;S.lastOrder=Object.assign({},nettoyerCommande(o),{saved:true,canal:'tableur'});
    }else{
      let saved=false;
      if(S.db){await S.db.doc('orders/'+o.ref).set(o);saved=true;}
      S.lastOrder=Object.assign({},nettoyerCommande(o),{saved});
    }
    if(S.lastOrder.saved)mesurerAchat(o,cle);
    S.cart=[];S.packMode=null;syncCart();S.step=3;S.form=null;S.tentative=null;
    if(MODE==='local'){S.orders=[S.lastOrder].concat(S.orders);saveLocal();}
    if(!S.panel)toast(S.lastOrder.saved?'Commande reçue : '+S.lastOrder.ref:'Votre récapitulatif est disponible dans le panier.');
  }catch(e){S.checkoutError='L’envoi n’a pas pu être confirmé. Votre panier et vos coordonnées sont conservés ; réessayez dans un moment.';toast(S.checkoutError);}
  finally{S.envoi=false;draw();}
}
