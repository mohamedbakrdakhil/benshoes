/* Le lien décrit uniquement les références catalogue et les pointures. */
function encoderTrio(lignes){
  const paires=[];
  if(!Array.isArray(lignes)||!lignes.length||lignes.length>3)return null;
  for(const ligne of lignes){
    const p=ligne&&prod(ligne.id);
    if(!p||!['as','opus'].includes(p.id)||!p.colors.includes(ligne.c)||!SIZES.includes(ligne.s)
      ||!Number.isInteger(ligne.q)||ligne.q<1||paires.length+ligne.q>3)return null;
    for(let i=0;i<ligne.q;i++)paires.push([p.id,ligne.c,ligne.s].join('-'));
  }
  return '#trio=v1.'+paires.join(',');
}
function decoderTrio(hash){
  if(typeof hash!=='string'||hash.length>100||!hash.startsWith('#trio=v1.'))return null;
  const refs=hash.slice('#trio=v1.'.length).split(',');
  if(refs.length>3)return null;
  const paires=[];
  for(const ref of refs){
    const parts=/^(opus|as)-([a-z]+)-(\d{2})$/.exec(ref);
    if(!parts)return null;
    const [,id,c,taille]=parts,s=Number(taille);
    if(!prod(id)?.colors.includes(c)||!SIZES.includes(s))return null;
    paires.push({id,c,s,q:1});
  }
  return paires;
}
function lienPartageTrio(){
  const hash=encoderTrio(S.cart);
  if(!hash)return null;
  const origin=/^https?:$/.test(location.protocol)?location.origin:'https://'+SHOP.site;
  return new URL('/collection/'+hash,origin).href;
}
function actionsPartageTrio(){
  const url=lienPartageTrio();
  if(!url)return '';
  const whatsapp='https://wa.me/?text='+encodeURIComponent('Ma sélection Benka Shoes\n'+url);
  return `<details class="trio-share"><summary>Partager mon trio <span aria-hidden="true">↗</span></summary>
    <div class="trio-share-body"><p>Envoyez les modèles et les pointures de votre sélection.</p>
    <div class="trio-share-options"><a href="${att(whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
    <button type="button" data-trio-action="copy">Copier le lien</button>
    ${typeof navigator.share==='function'?'<button type="button" data-trio-action="share">Autres options</button>':''}</div>
    <label class="trio-copy-fallback" hidden>Lien de la sélection<input readonly value="${att(url)}"></label></div></details>`;
}
function lignesTrio(paires){
  const lignes=[];
  for(const paire of paires){
    const ligne=lignes.find(l=>l.id===paire.id&&l.c===paire.c&&l.s===paire.s);
    if(ligne)ligne.q++;
    else lignes.push({...paire,q:1});
  }
  return lignes;
}
function trioDisponible(lignes){
  return lignes.every(ligne=>stockCol(prod(ligne.id),ligne.c,SIZES.indexOf(ligne.s))>=ligne.q);
}
function cartePairePartagee(paire,index){
  const p=prod(paire.id),coloris=COLORS[paire.c].n;
  const couleurs=p.colors.map(c=>`<option value="${c}"${c===paire.c?' selected':''}>${esc(COLORS[c].n)}</option>`).join('');
  const tailles=SIZES.map((taille,n)=>{
    const dispo=stockCol(p,paire.c,n)>0;
    return `<option value="${taille}"${taille===paire.s?' selected':''}${dispo?'':' disabled'}>${taille}${dispo?'':' · épuisée'}</option>`;
  }).join('');
  const nom=esc(p.name);
  return `<li class="shared-pair"><div class="shared-pair-photo">${visuel(p,paire.c,true,0,'86px')}</div>
    <div class="shared-pair-choice"><strong>${nom}</strong><div class="shared-pair-fields">
    <label>Coloris<select id="trio-c-${index}" data-trio-field="c" data-pair="${index}">${couleurs}</select></label>
    <label>Pointure<select id="trio-s-${index}" data-trio-field="s" data-pair="${index}">${tailles}</select></label></div></div>
    <button class="shared-remove" id="trio-remove-${index}" type="button" data-trio-action="remove" data-pair="${index}" aria-label="Retirer ${nom} ${esc(coloris)}, pointure ${paire.s}">Retirer</button></li>`;
}
function afficherTrioPartage(){
  const el=document.getElementById('shared-trio');
  if(!el)return;
  const hash=location.hash;
  if(!hash.startsWith('#trio=')){el.hidden=true;S.trioRecu=null;return;}
  if(S.trioRecu?.hash!==hash)S.trioRecu={hash,paires:decoderTrio(hash)};
  const recu=S.trioRecu;
  let html;
  if(!recu.paires?.length){
    html=`<h2 id="shared-trio-title">Sélection indisponible</h2><p>Retrouvez les deux modèles dans la collection pour composer votre trio.</p>
      <button type="button" class="btn btn-out" data-trio-action="dismiss">Voir la collection</button>`;
  }else{
    const lignes=lignesTrio(recu.paires),dispo=trioDisponible(lignes);
    const prix=prixBlackFriday(lignes.map(l=>({...l,unit:priceOf(prod(l.id))})));
    if(recu.panierAConfirmer!==JSON.stringify(S.cart))recu.panierAConfirmer=null;
    const confirmation=!!recu.panierAConfirmer;
    html=`<div class="shared-trio-copy"><span class="eyebrow">Trio Benka</span><h2 id="shared-trio-title">Une sélection pour vous.</h2>
      <p>Ajustez les couleurs et les pointures avant d’ajouter cette sélection à votre panier.</p></div>
      <div class="shared-trio-edit"><ul class="shared-pairs">${recu.paires.map(cartePairePartagee).join('')}</ul>
      <div class="shared-trio-total"><span>${prix.pack?blackFridayPackLabel(prix.pack):prix.quantity+' paire'+(prix.quantity>1?'s':'')}</span><strong>${fmt(prix.sub)}</strong></div>
      ${!dispo?'<p class="shared-warning" role="status">La quantité choisie dépasse le stock dans une pointure. Changez la couleur, la pointure ou retirez une paire.</p>':''}
      ${confirmation?`<p class="shared-warning" role="status">Votre panier contient ${cartCount()} paire${cartCount()>1?'s':''}. Voulez-vous le remplacer par cette sélection ?</p>`:''}
      <div class="shared-buttons"><button class="btn btn-pri" type="button" data-trio-action="apply"${dispo&&!S.envoi?'':' disabled'}>${confirmation?'Confirmer le remplacement':'Reprendre cette sélection'}</button>
      <button class="btn btn-out" type="button" data-trio-action="dismiss">${confirmation?'Garder mon panier':'Voir la collection'}</button></div></div>`;
  }
  el.hidden=false;
  if(el._htmlTrio!==html){
    const focus=el.contains(document.activeElement)?document.activeElement.id:'';
    el.innerHTML=html;el._htmlTrio=html;
    if(focus)document.getElementById(focus)?.focus({preventScroll:true});
  }
}
function quitterTrioPartage(){
  if(location.hash.startsWith('#trio='))history.replaceState(null,'',location.pathname+location.search);
  S.trioRecu=null;
  const el=document.getElementById('shared-trio');if(el)el.hidden=true;
}
function importerTrio(){
  const recu=S.trioRecu;
  if(S.envoi||!recu?.paires?.length||recu.hash!==location.hash)return;
  const lignes=lignesTrio(recu.paires);
  if(!trioDisponible(lignes)){afficherTrioPartage();return;}
  const signature=JSON.stringify(S.cart);
  if(S.cart.length&&encoderTrio(S.cart)!==encoderTrio(lignes)&&recu.panierAConfirmer!==signature){
    recu.panierAConfirmer=signature;
    afficherTrioPartage();
    document.querySelector('#shared-trio [data-trio-action="apply"]')?.focus();
    return;
  }
  S.cart=lignes;
  S.packMode=lignes.every(l=>l.id===lignes[0].id)?lignes[0].id:'mixte';
  S.step=1;S.panel='cart';S.checkoutError='';
  quitterTrioPartage();syncCart();draw();
}
document.addEventListener('change',event=>{
  const field=event.target.closest('[data-trio-field]'),recu=S.trioRecu;
  if(!field||!recu?.paires||recu.hash!==location.hash)return;
  const paire=recu.paires[Number(field.dataset.pair)];if(!paire)return;
  if(field.dataset.trioField==='c'&&prod(paire.id).colors.includes(field.value))paire.c=field.value;
  else if(field.dataset.trioField==='s'&&SIZES.includes(Number(field.value)))paire.s=Number(field.value);
  recu.panierAConfirmer=null;afficherTrioPartage();
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-trio-action]');if(!button)return;
  const action=button.dataset.trioAction;
  if(action==='share'||action==='copy'){
    const url=lienPartageTrio();if(!url)return;
    if(action==='share'&&typeof navigator.share==='function'){
      try{await navigator.share({title:'Ma sélection Benka Shoes',url});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    if(await copy(url)){toast('Lien du trio copié');return;}
    const label=button.closest('.trio-share')?.querySelector('.trio-copy-fallback');
    if(label){label.hidden=false;const field=label.querySelector('input');field.focus();field.select();}
    return;
  }
  if(action==='apply'){importerTrio();return;}
  if(action==='remove'&&S.trioRecu?.paires){
    const n=Number(button.dataset.pair);
    if(!Number.isInteger(n)||!S.trioRecu.paires[n])return;
    S.trioRecu.paires.splice(n,1);S.trioRecu.panierAConfirmer=null;
    if(S.trioRecu.paires.length){
      afficherTrioPartage();
      document.getElementById('trio-c-'+Math.min(n,S.trioRecu.paires.length-1))?.focus();
      return;
    }
  }
  if(action==='dismiss'||action==='remove'){
    const revenir=!!S.trioRecu?.panierAConfirmer;
    quitterTrioPartage();
    if(revenir){S.step=1;S.panel='cart';draw();return;}
    const titre=document.getElementById('store-title');
    if(titre){titre.tabIndex=-1;titre.focus();}
  }
});
