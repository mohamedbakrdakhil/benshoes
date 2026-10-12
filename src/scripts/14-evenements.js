/* ======================= rendu + interactions ======================= */
function draw(){
  const adm=location.hash==='#admin';
  $('#shopview').hidden=adm;$('#admview').hidden=!adm;
  if(adm)$('#admview').innerHTML=admHTML();else{renderGrid();renderCmp();revelations();}
  poserLogo();
  const o=$('#overlays');
  o.innerHTML=S.panel==='sheet'?sheetHTML():S.panel==='cart'?cartHTML():S.panel==='manual'?manualHTML():'';
  if(S.panel){o.insertAdjacentHTML('afterbegin','<div class="scrim" data-act="closep"></div>');
    o.querySelector('.close')?.focus();}
  document.body.style.overflow=S.panel?'hidden':'';
  $('#cartcount').textContent=cartCount();
}
async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(e){
  const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';
  document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}a.remove();return ok;}}
const use=n=>(window.claude&&window.claude.use)?window.claude.use(n).catch(()=>null):Promise.resolve(null);

function saveLocal(){lsSet('benkashoes.orders',S.orders);}
function loadLocal(){S.orders=nettoyerListe(lsGet('benkashoes.orders'));}
async function dlFile(name,text,mime){
  if(!STATIC){const dl=await use('downloads');
    if(dl){try{await dl.save({filename:name,data:text});return true;}catch(e){if(e&&e.code==='declined')return true;}}
    return await copy(text);}
  try{const b=new Blob([text],{type:mime});const u=URL.createObjectURL(b);
    const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),3000);return true;}catch(e){return await copy(text);}
}
async function refreshCatalog(){try{const c=await api('catalog');S.ov={prices:c.prices,stock:c.stock};}catch(e){}}
async function loadOrders(){if(MODE!=='api')return;
  try{const r=await api('orders');S.orders=nettoyerListe(r.orders);}
  catch(e){if(e.status===401){TOKEN='';lsSet('benkashoes.token','');S.canAdmin=false;}}}
async function saveCat(){
  if(MODE==='api'){try{const r=await api('catalog',{method:'PUT',body:{prices:S.ov.prices,stock:S.ov.stock}});
    S.ov={prices:r.prices,stock:r.stock};}catch(e){toast(e.message);}return;}
  if(MODE==='local'){lsSet('benkashoes.catalog',S.ov);return;}
  if(!S.db)return;try{await S.db.doc('settings/catalog').set({prices:S.ov.prices,stock:S.ov.stock,at:new Date().toISOString()});}
  catch(e){toast('Enregistrement refusé');}}
async function patchOrder(ref,patch){const o=S.orders.find(x=>x.ref===ref);if(!o)return;
  Object.assign(o,patch);draw();
  if(MODE==='api'){try{await api('orders/'+ref,{method:'PATCH',body:patch});}
    catch(e){toast(e.message);await loadOrders();draw();}return;}
  if(MODE==='local'){saveLocal();return;}
  if(S.db){try{await S.db.doc('orders/'+ref).update(patch);}catch(e){toast('Modification non enregistrée');}}}
async function exportExcel(){
  if(!S.orders.length){toast('Aucune commande à exporter');return;}
  try{
    const bin=classeurCommandes(S.orders);
    const nom='benkashoes-commandes-'+new Date().toISOString().slice(0,10)+'.xlsx';
    const b=new Blob([bin],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    if(STATIC){
      const u=URL.createObjectURL(b);const a=document.createElement('a');
      a.href=u;a.download=nom;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(u),3000);
    }else{
      const dl=await use('downloads');
      if(!dl){toast('Téléchargement indisponible ici');return;}
      await dl.save({filename:nom,data:bin});
    }
    toast('Classeur Excel prêt');
  }catch(e){toast('Export impossible');}
}
async function exportCSV(){
  const H=['Référence','Date','Statut','Client','Téléphone','E-mail','Adresse','CP','Ville','Pays','Articles','Sous-total','Livraison','Total','Note'];
  const rows=[H].concat(S.orders.map(o=>[o.ref,new Date(o.createdAt).toLocaleString('fr-FR'),STATUS[o.status],
    o.customer.name,o.customer.phone,o.customer.email,o.customer.addr,o.customer.zip,o.customer.city,o.customer.country,
    o.items.map(i=>`${i.q}x ${i.name} / ${i.color} / ${i.size}`).join(' | '),o.sub,o.ship,o.total,o.note||'']));
  /* Un tableur exécute toute cellule qui commence par = + - @ : on désamorce
     avec une apostrophe, sinon un client malveillant pourrait glisser une
     formule dans son nom et la faire tourner sur le poste de l'atelier. */
  const cell=c=>{const v=String(c??'').replace(/[\r\n\t]+/g,' ');
    return '"'+(/^[=+\-@]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';};
  const csv='﻿'+rows.map(r=>r.map(cell).join(';')).join('\r\n');
  if(await dlFile('benkashoes-commandes.csv',csv,'text/csv;charset=utf-8'))toast('Export prêt');else toast('Export indisponible ici');
}
document.addEventListener('click',async e=>{
  const cp=e.target.closest('[data-copy]');
  if(cp){const ok=await copy($('#'+cp.dataset.copy).textContent.trim());toast(ok?'Copié':'Copie refusée par le navigateur');return;}
  if(e.target.closest('#cartbtn')){S.panel='cart';S.step=S.cart.length?1:1;S.lastOrder=null;draw();return;}
  const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act,d=t.dataset;
  if(a==='skipvisite'){const m=$('#modeles');if(m)window.scrollTo({top:m.offsetTop-70,behavior:'smooth'});}
  else if(a==='qa'){const qa=t.closest('.qa');const o=qa.dataset.open==='1';
    qa.parentElement.querySelectorAll('.qa').forEach(x=>{x.dataset.open='0';x.querySelector('.qa-q').setAttribute('aria-expanded','false');});
    if(!o){qa.dataset.open='1';t.setAttribute('aria-expanded','true');}}
  else if(a==='tab'){S.tab=d.k;draw();}
  else if(a==='fam'){S.filter=d.k;draw();}
  else if(a==='col'){S.colorFilter=S.colorFilter===d.k?null:d.k;draw();}
  else if(a==='open'){const p=prod(d.id);S.sheet={id:p.id,c:d.c||p.colors[0],s:null};S.tab='fiche';S.panel='sheet';draw();}
  else if(a==='closep'){S.panel=null;S.manual=null;draw();}
  else if(a==='setcol'){S.sheet.c=d.k;draw();}
  else if(a==='setsize'){S.sheet.s=+d.s;draw();}
  else if(a==='add'){const{id,c,s}=S.sheet;
    // le bouton est désactivé sans pointure, mais une ligne sans pointure
    // fausserait le panier et la commande : on refuse aussi ici.
    if(!prod(id)||!COLORS[c]||!SIZES.includes(s)){toast('Choisissez une pointure');return;}
    const ex=S.cart.find(i=>i.id===id&&i.c===c&&i.s===s);
    const max=stockOf(prod(id),SIZES.indexOf(s));
    if(ex){if(ex.q>=max){toast('Stock atteint pour cette pointure');return;}ex.q++;}else S.cart.push({id,c,s,q:1});
    syncCart();S.panel='cart';S.step=1;draw();bumpCart();toast('Ajouté au panier');}
  else if(a==='qty'){const i=S.cart[+d.n];const max=stockOf(prod(i.id),SIZES.indexOf(i.s));
    i.q+=+d.d;if(i.q>max){i.q=max;toast('Stock atteint');}if(i.q<1)S.cart.splice(+d.n,1);syncCart();draw();}
  else if(a==='rm'){S.cart.splice(+d.n,1);syncCart();draw();}
  else if(a==='next'){S.step=2;draw();}
  else if(a==='back'){S.form=readForm();S.step=1;draw();}
  else if(a==='place'){placeOrder();}
  else if(a==='copysum'){const ok=await copy(orderText(S.lastOrder));toast(ok?'Récapitulatif copié':'Sélectionnez le texte pour le copier');}
  /* admin */
  else if(a==='admtab'){S.admTab=d.k;S.openRow=null;draw();}
  else if(a==='toshop'){location.hash='';draw();}
  else if(a==='stf'){S.stFilter=d.k||null;draw();}
  else if(a==='row'){S.openRow=S.openRow===d.r?null:d.r;draw();}
  else if(a==='setst'){patchOrder(d.r,{status:d.k});toast('Statut : '+STATUS[d.k]);}
  else if(a==='deduct'){const o=S.orders.find(x=>x.ref===d.r);if(!o)return;
    o.items.forEach(i=>{const p=prod(i.id);if(!p)return;const arr=(S.ov.stock[p.id]||p.stock).slice();
      const ix=SIZES.indexOf(i.size);arr[ix]=Math.max(0,(arr[ix]??0)-i.q);S.ov.stock[p.id]=arr;});
    saveCat();patchOrder(d.r,{stockDeducted:true});toast('Stock mis à jour');}
  else if(a==='del'){if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent='Confirmer ?';return;}
    S.orders=S.orders.filter(x=>x.ref!==d.r);S.openRow=null;draw();
    if(MODE==='api'){try{await api('orders/'+d.r,{method:'DELETE'});}catch(err){toast(err.message);await loadOrders();draw();}return;}
    if(MODE==='local'){saveLocal();return;}
    if(S.db){try{await S.db.doc('orders/'+d.r).delete();}catch(err){toast('Suppression non enregistrée');}}}
  else if(a==='copyord'){const o=S.orders.find(x=>x.ref===d.r);const ok=await copy(orderText(o));toast(ok?'Commande copiée':'Copie refusée');}
  else if(a==='excel'){exportExcel();}
  else if(a==='csv'){exportCSV();}
  else if(a==='backup'){await dlFile('benkashoes-sauvegarde-'+new Date().toISOString().slice(0,10)+'.json',
    JSON.stringify({version:1,exportedAt:new Date().toISOString(),orders:S.orders,catalog:S.ov},null,2),'application/json');
    toast('Sauvegarde enregistrée');}
  else if(a==='restore'){$('#impfile')?.click();}
  else if(a==='login'){const el=$('#loginerr');if(el)el.textContent='';
    try{const r=await api('login',{method:'POST',body:{password:$('#pw')?.value||''}});
      TOKEN=r.token;lsSet('benkashoes.token',TOKEN);S.canAdmin=true;await loadOrders();draw();toast('Bienvenue dans l\'atelier');}
    catch(err){if(el)el.textContent=err.message;$('#pw')?.focus();}}
  else if(a==='logout'){TOKEN='';lsSet('benkashoes.token','');S.canAdmin=false;S.orders=[];draw();toast('Déconnecté');}
  else if(a==='resetcat'){S.ov={prices:{},stock:{}};saveCat();draw();toast('Valeurs de départ rétablies');}
  else if(a==='manual'){S.manual={name:'',phone:'',email:'',addr:'',zip:'',city:'',country:'Maroc',note:'',
    lines:[{id:CATALOG[0].id,c:CATALOG[0].colors[0],s:40,q:1}]};S.panel='manual';draw();}
  else if(a==='mline'){readManual();S.manual.lines.push({id:CATALOG[0].id,c:CATALOG[0].colors[0],s:40,q:1});draw();}
  else if(a==='mrm'){readManual();S.manual.lines.splice(+d.n,1);draw();}
  else if(a==='msave'){saveManual();}
});
function readManual(){const m=S.manual;if(!m)return;
  ['name','phone','email','addr','zip','city','note'].forEach(k=>{const el=$('#m_'+k);if(el)m[k]=el.value.trim();});
  if($('#m_country'))m.country=$('#m_country').value;}
async function saveManual(){readManual();const m=S.manual;
  if(!m.name){toast('Indiquez au moins le nom du client');$('#m_name')?.focus();return;}
  const items=m.lines.map(l=>{const p=prod(l.id);return{id:p.id,name:p.name,color:COLORS[l.c].n,colorKey:l.c,size:l.s,q:l.q,unit:priceOf(p)};});
  const sub=items.reduce((a,i)=>a+i.unit*i.q,0),ship=sub>=SHIPFREE?0:SHIPCOST;
  const o={ref:newRef(),createdAt:new Date().toISOString(),status:'confirmee',source:'atelier',items,
    customer:{name:m.name,phone:m.phone,email:m.email,addr:m.addr,zip:m.zip,city:m.city,country:m.country},
    note:m.note,sub,ship,total:sub+ship,currency:'MAD'};
  if(MODE==='api'){
    try{const r=await api('orders',{method:'PUT',body:{items:o.items,customer:o.customer,note:o.note}});
      S.orders=nettoyerListe([r.order]).concat(S.orders);await refreshCatalog();
      S.panel=null;S.manual=null;S.openRow=r.order.ref;draw();toast('Commande '+r.order.ref+' enregistrée');return;}
    catch(e){toast(e.message);return;}}
  if(MODE==='local'){S.orders=[o].concat(S.orders);saveLocal();}
  else if(S.db){try{await S.db.doc('orders/'+o.ref).set(o);}catch(err){toast("Commande non enregistrée — droits insuffisants");return;}}
  else{S.orders=[o].concat(S.orders);}
  S.panel=null;S.manual=null;S.openRow=o.ref;draw();toast('Commande '+o.ref+' enregistrée');
}
document.addEventListener('change',e=>{
  const c=e.target.closest('[data-ch]');
  if(c){const v=Math.max(0,Math.round(+e.target.value||0));
    if(c.dataset.ch==='price'){S.ov.prices[c.dataset.id]=v;}
    else{const p=prod(c.dataset.id);const arr=(S.ov.stock[p.id]||p.stock).slice();arr[+c.dataset.i]=v;S.ov.stock[p.id]=arr;}
    saveCat();draw();return;}
  const m=e.target.closest('[data-mch]');
  if(m){readManual();const l=S.manual.lines[+m.dataset.n],k=m.dataset.mch;
    if(k==='q')l.q=Math.max(1,Math.round(+e.target.value||1));
    else if(k==='s')l.s=+e.target.value;
    else if(k==='c')l.c=e.target.value;
    else{l.id=e.target.value;l.c=prod(l.id).colors[0];}
    draw();}
});
document.addEventListener('change',e=>{
  if(e.target.id!=='impfile'||!e.target.files||!e.target.files[0])return;
  const fr=new FileReader();
  fr.onload=()=>{try{const v=JSON.parse(fr.result);
    if(!v||!Array.isArray(v.orders))throw 0;
    const seen=new Set(S.orders.map(o=>o.ref));
    const add=nettoyerListe(v.orders).filter(o=>!seen.has(o.ref));
    S.orders=add.concat(S.orders).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    if(v.catalog&&v.catalog.prices)S.ov=v.catalog;
    saveLocal();if(STATIC)lsSet('benkashoes.catalog',S.ov);draw();
    toast(add.length+' commande(s) restaurée(s)');
  }catch(err){toast('Fichier de sauvegarde illisible');}};
  fr.readAsText(e.target.files[0]);e.target.value='';
});
/* menu de téléphone : ouverture, fermeture au choix d'une section,
   à l'échappement, et dès qu'on clique ailleurs. */
(function(){
  const b=$('#menubtn'), m=$('#navmob'); if(!b||!m)return;
  const poser=ouvert=>{m.hidden=!ouvert;b.setAttribute('aria-expanded',String(ouvert));
    b.setAttribute('aria-label',ouvert?'Fermer le menu':'Ouvrir le menu');};
  b.addEventListener('click',e=>{e.stopPropagation();poser(m.hidden);});
  m.addEventListener('click',e=>{if(e.target.closest('a'))poser(false);});
  document.addEventListener('click',e=>{if(!m.hidden&&!m.contains(e.target)&&e.target!==b)poser(false);});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden){poser(false);b.focus();}});
  addEventListener('resize',()=>{if(innerWidth>860&&!m.hidden)poser(false);},{passive:true});
})();
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='pw'){e.preventDefault();document.querySelector('[data-act="login"]')?.click();return;}
  if(e.key==='Escape'&&S.panel){S.panel=null;S.manual=null;draw();}});
addEventListener('hashchange',()=>{S.panel=null;draw();window.scrollTo(0,0);});

