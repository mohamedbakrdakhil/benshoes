/* ======================= espace commandes =======================
   Un site tiers peut charger le nôtre dans un cadre invisible et guider les
   clics du propriétaire vers « Supprimer » ou « Se déconnecter ». Les en-têtes
   qui l'interdisent ne sont pas réglables sur un hébergement statique, alors
   l'espace commandes vérifie lui-même qu'il est à l'air libre. Dans un artefact
   Claude la page est légitimement encadrée : la vérification ne s'y applique pas. */
const ENCADRE=(function(){try{return STATIC&&window.top!==window.self;}catch(e){return STATIC;}})();
function admHTML(){
  if(ENCADRE) return `<div class="wrap gate"><div style="text-align:center">
    <h2 style="font-size:1.5rem;margin-bottom:10px">Espace commandes bloqué</h2>
    <p class="serif">Cette page est affichée à l'intérieur d'un autre site. Pour votre sécurité, l'espace commandes ne s'ouvre qu'à l'adresse ${esc(SHOP.site)} dans une fenêtre à lui.</p>
    <a class="btn btn-pri" href="https://${esc(SHOP.site)}/#admin" target="_blank" rel="noopener" style="margin-top:22px">Ouvrir la vraie page</a></div></div>`;
  const hd=`<div class="adm-hd"><div class="wrap adm-hd-in">
    <span class="brand">BENKASHOES<i></i><small>Liège &amp; Cuir</small></span>
    <span class="badge-adm">Espace commandes</span>
    <div class="adm-tabs">
      <button data-act="admtab" data-k="commandes" aria-pressed="${S.admTab==='commandes'}">Commandes</button>
      <button data-act="admtab" data-k="catalogue" aria-pressed="${S.admTab==='catalogue'}">Catalogue</button>
      ${MODE==='api'&&S.canAdmin?'<button data-act="logout">Se déconnecter</button>':''}
      <button data-act="toshop">↩ Boutique</button>
    </div></div></div>`;
  if(!S.canAdmin&&MODE==='api') return hd+loginHTML();
  if(!S.canAdmin) return hd+`<div class="wrap gate"><div style="text-align:center">
    <div class="okmark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
    <h2 style="font-size:1.5rem;margin-bottom:10px">Réservé à l'atelier</h2>
    <p class="serif">Cet espace affiche les commandes et le stock. Il s'ouvre uniquement pour le compte propriétaire de la boutique${S.me?` — vous êtes connecté comme ${esc(S.me)}, sans droit d'édition sur cette page.`:', connecté sur claude.ai.'}</p>
    <a class="btn btn-out" href="#top" data-act="toshop" style="margin-top:22px">Retour à la boutique</a></div></div>`;
  const warn=MODE==='local'?`<div class="wrap" style="padding-top:18px"><div class="callout"><b>Carnet de commandes local.</b> Sur cette version hébergée, les commandes et le stock sont enregistrés dans ce navigateur, sur cet appareil uniquement. Sauvegardez régulièrement le fichier JSON. Cet espace n'est pas protégé par mot de passe : qui connaît l'adresse peut l'ouvrir.</div></div>`:'';
  if(S.admTab==='catalogue') return hd+warn+admCatalogue();
  return hd+warn+admOrders();
}
function loginHTML(){
  return `<div class="wrap gate"><div style="text-align:center">
    <div class="okmark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
    <h2 style="font-size:1.5rem;margin-bottom:10px">Espace atelier</h2>
    <p class="serif">Entrez le mot de passe de la boutique pour voir les commandes et le stock.</p>
    <div style="max-width:300px;margin:24px auto 0;display:flex;flex-direction:column;gap:10px">
      <input id="pw" type="password" autocomplete="current-password" placeholder="Mot de passe"
        style="height:44px;padding:0 12px;border:1px solid var(--line);border-radius:3px;background:var(--surface);font-size:.95rem;text-align:center">
      <button class="btn btn-pri" data-act="login" style="justify-content:center">Se connecter</button>
      <p class="note" id="loginerr" style="color:var(--bad);min-height:1.2em"></p>
    </div>
    <a class="btn btn-out btn-sm" href="#top" data-act="toshop">Retour à la boutique</a>
  </div></div>`;}
function admOrders(){
  const os=S.orders,live=os.filter(o=>o.status!=='annulee');
  const ca=live.reduce((a,o)=>a+(o.total||0),0);
  const todo=os.filter(o=>o.status==='nouvelle'||o.status==='confirmee').length;
  const avg=live.length?ca/live.length:0;
  const kpis=[['Commandes',os.length,`${todo} à traiter`],['Chiffre d’affaires',fmt(ca),'hors commandes annulées'],
    ['À traiter',todo,'nouvelles + confirmées'],['Panier moyen',live.length?fmt(avg):'—',`${live.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.q,0),0)} paires vendues`]];
  const list=S.stFilter?os.filter(o=>o.status===S.stFilter):os;
  let table;
  if(MODE==='artifact'&&!S.db) table=`<div class="empty" style="background:var(--surface);border:1px solid var(--line)"><h4>Stockage indisponible dans cette vue</h4><p>Les commandes sont enregistrées côté serveur et ne se chargent pas ici. Ouvrez la page en étant connecté à votre compte claude.ai.</p></div>`;
  else if(!os.length) table=`<div class="empty" style="background:var(--surface);border:1px solid var(--line)">
    <h4>Aucune commande pour l'instant</h4><p>Les commandes passées sur la boutique arrivent ici automatiquement.<br>Celles reçues par téléphone ou WhatsApp, saisissez-les avec « Nouvelle commande ».</p>
    <button class="btn btn-pri btn-sm" data-act="manual" style="margin-top:18px">Nouvelle commande</button></div>`;
  else table=`<div class="scroll-x"><table class="tbl"><thead><tr>
    <th>Référence</th><th>Date</th><th>Client</th><th>Articles</th><th class="r">Total</th><th>Statut</th><th></th></tr></thead><tbody>`
    +list.map(o=>{const open=S.openRow===o.ref;const d=new Date(o.createdAt);
      return `<tr class="${open?'open':''}" data-act="row" data-r="${att(o.ref)}" style="cursor:pointer">
        <td class="ref">${esc(o.ref)}</td>
        <td class="num" style="color:var(--fg-soft);white-space:nowrap">${d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} · ${d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</td>
        <td><b style="font-weight:600">${esc(o.customer.name)}</b><br><span style="color:var(--fg-soft);font-size:.78rem">${esc(o.customer.city)}, ${esc(o.customer.country)}</span></td>
        <td class="num" style="color:var(--fg-soft)">${o.items.reduce((a,i)=>a+i.q,0)} art.</td>
        <td class="r" style="font-weight:600">${fmt(o.total)}</td>
        <td><span class="st ${att(o.status)}">${STATUS[o.status]||'—'}</span></td>
        <td style="color:var(--fg-soft);text-align:right">${open?'▲':'▼'}</td></tr>`
      +(open?`<tr class="det"><td colspan="7">${admDetail(o)}</td></tr>`:'');}).join('')
    +`</tbody></table></div>`;
  return `<div class="wrap" style="padding-block:4px 60px">
    <div class="kpis">${kpis.map(k=>`<div class="kpi"><div class="k">${k[0]}</div><div class="v">${k[1]}</div><div class="s">${k[2]}</div></div>`).join('')}</div>
    <div class="filters">
      <button class="chip" data-act="stf" data-k="" aria-pressed="${!S.stFilter}">Toutes (${os.length})</button>
      ${Object.entries(STATUS).map(([k,l])=>`<button class="chip" data-act="stf" data-k="${k}" aria-pressed="${S.stFilter===k}">${l} (${os.filter(o=>o.status===k).length})</button>`).join('')}
      <span style="margin-left:auto;display:flex;gap:8px">
        <button class="btn btn-out btn-sm" data-act="excel" ${os.length?'':'disabled'}>Exporter Excel</button>
        <button class="btn btn-out btn-sm" data-act="csv" ${os.length?'':'disabled'}>CSV</button>
        ${MODE!=='artifact'?`<button class="btn btn-out btn-sm" data-act="backup" ${os.length?'':'disabled'}>Sauvegarder</button>`:''}
        ${MODE==='local'?`<button class="btn btn-out btn-sm" data-act="restore">Restaurer</button>
        <input type="file" id="impfile" accept="application/json,.json" hidden>`:''}
        <button class="btn btn-pri btn-sm" data-act="manual">Nouvelle commande</button></span>
    </div>${table}</div>`;
}
function admDetail(o){
  const next={nouvelle:['confirmee','annulee'],confirmee:['expediee','annulee'],expediee:['livree'],livree:[],annulee:['nouvelle']};
  return `<div class="detbox">
    <div><h5>Client &amp; livraison</h5><div class="kv">
      <span>Nom</span><span>${esc(o.customer.name)}</span>
      <span>Téléphone</span><span class="num">${esc(o.customer.phone)}</span>
      <span>E-mail</span><span>${esc(o.customer.email)}</span>
      <span>Adresse</span><span>${esc(o.customer.addr)}<br>${esc(o.customer.zip)} ${esc(o.customer.city)}<br>${esc(o.customer.country)}</span>
      <span>Origine</span><span>${o.source==='atelier'?'Saisie atelier':'Boutique en ligne'}</span>
      ${o.note?`<span>Note</span><span style="font-family:var(--fb)">${esc(o.note)}</span>`:''}
      ${o.stockDeducted?`<span>Stock</span><span style="color:var(--ok)">déduit du catalogue</span>`:''}
    </div></div>
    <div><h5>Articles</h5><ul>${o.items.map(i=>`<li><span>${i.q} × ${esc(i.name)}<br><span style="color:var(--fg-soft);font-size:.78rem">${esc(i.color)} · pointure ${i.size}</span></span><span class="num" style="font-weight:600">${fmt(i.unit*i.q)}</span></li>`).join('')}
      <li><span>Livraison</span><span class="num">${o.ship?fmt(o.ship):'Offerte'}</span></li>
      <li style="font-weight:700;border-bottom:0"><span>Total</span><span class="num">${fmt(o.total)}</span></li></ul></div>
    <div class="actrow">
      <span class="eyebrow" style="margin-right:4px">Faire passer à</span>
      ${next[o.status].map(k=>`<button class="btn btn-sm ${k==='annulee'?'btn-out':'btn-pri'}" data-act="setst" data-r="${att(o.ref)}" data-k="${k}">${STATUS[k]}</button>`).join('')||'<span class="note">Commande clôturée.</span>'}
      <span style="margin-left:auto;display:flex;gap:8px">
        ${o.stockDeducted?'':`<button class="btn btn-out btn-sm" data-act="deduct" data-r="${att(o.ref)}">Déduire du stock</button>`}
        <button class="btn btn-out btn-sm" data-act="copyord" data-r="${att(o.ref)}">Copier</button>
        <button class="btn btn-out btn-sm" data-act="del" data-r="${att(o.ref)}" style="border-color:var(--bad);color:var(--bad)">Supprimer</button></span>
    </div></div>`;
}
function admCatalogue(){
  return `<div class="wrap" style="padding-block:26px 60px">
    <div class="sec-head" style="margin-bottom:20px"><div><span class="eyebrow">Catalogue</span><h2 style="font-size:1.7rem;margin-top:10px">Prix et stock par pointure</h2></div>
      <p class="serif" style="max-width:40ch">Les valeurs livrées sont des valeurs de départ, à ajuster sur votre vrai stock. Chaque modification est enregistrée dès que vous quittez la case et s'applique à la boutique pour tout le monde.</p></div>
    ${(MODE!=='artifact'||S.db)?'':`<div class="callout" style="margin-bottom:18px;border-left-color:var(--bad)"><b>Enregistrement indisponible.</b> Vos modifications ne seront pas conservées dans cette vue.</div>`}
    <div class="scroll-x"><table class="tbl"><thead><tr><th>Modèle</th><th>Prix</th>${SIZES.map(s=>`<th class="r">${s}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>
    ${CATALOG.map(p=>`<tr><td><b style="font-weight:600">${p.name}</b><br><span style="color:var(--fg-soft);font-size:.76rem">${p.sub}</span></td>
      <td><input class="pricei" type="number" min="0" step="1" value="${priceOf(p)}" data-ch="price" data-id="${p.id}" aria-label="Prix ${p.name}"></td>
      ${SIZES.map((s,i)=>{const k=stockOf(p,i);return `<td class="r"><input class="stocki ${k?'':'zero'}" type="number" min="0" step="1" value="${k}" data-ch="stock" data-id="${p.id}" data-i="${i}" aria-label="Stock ${p.name} pointure ${s}"></td>`;}).join('')}
      <td class="r" style="font-weight:700">${totStock(p)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="filters" style="margin-top:18px"><button class="btn btn-out btn-sm" data-act="resetcat">Rétablir les valeurs de départ</button></div></div>`;
}
function manualHTML(){
  const m=S.manual;
  return `<div class="panel right wide" role="dialog" aria-modal="true" aria-label="Nouvelle commande">
    <div class="panel-hd"><h3>Nouvelle commande</h3><button class="close" data-act="closep" aria-label="Fermer">✕</button></div>
    <div class="panel-bd">
      <p class="note" style="margin-bottom:16px">Pour une commande reçue par téléphone, WhatsApp ou en atelier.</p>
      <div class="form">
        <label class="f full">Nom du client<input id="m_name" value="${esc(m.name)}" placeholder="Amina Benali"></label>
        <label class="f">Téléphone<input id="m_phone" value="${esc(m.phone)}" placeholder="06 12 34 56 78"></label>
        <label class="f">E-mail<input id="m_email" value="${esc(m.email)}" placeholder="amina@exemple.fr"></label>
        <label class="f full">Adresse<input id="m_addr" value="${esc(m.addr)}" placeholder="12 rue Tahar Sebti"></label>
        <label class="f">Code postal<input id="m_zip" value="${esc(m.zip)}"></label>
        <label class="f">Ville<input id="m_city" value="${esc(m.city)}"></label>
        <label class="f full">Pays<select id="m_country">${['Maroc','France','Belgique','Espagne','Algérie','Tunisie','Canada','Autre'].map(c=>`<option ${m.country===c?'selected':''}>${c}</option>`).join('')}</select></label>
      </div>
      <div class="fld"><div class="fld-lab"><span class="t">Articles</span><button class="btn btn-out btn-sm" data-act="mline">+ Ajouter une ligne</button></div>
      ${m.lines.length?m.lines.map((l,n)=>{const p=prod(l.id);return `<div style="display:grid;grid-template-columns:1fr 1fr 70px 62px 30px;gap:7px;margin-bottom:7px;align-items:center">
        <select data-mch="id" data-n="${n}" style="height:38px;border:1px solid var(--line);border-radius:3px;background:var(--surface);padding:0 8px;font-size:.84rem">${CATALOG.map(q=>`<option value="${q.id}" ${q.id===l.id?'selected':''}>${q.name}</option>`).join('')}</select>
        <select data-mch="c" data-n="${n}" style="height:38px;border:1px solid var(--line);border-radius:3px;background:var(--surface);padding:0 8px;font-size:.84rem">${p.colors.map(k=>`<option value="${k}" ${k===l.c?'selected':''}>${COLORS[k].n}</option>`).join('')}</select>
        <select data-mch="s" data-n="${n}" style="height:38px;border:1px solid var(--line);border-radius:3px;background:var(--surface);padding:0 8px;font-size:.84rem">${SIZES.map(s=>`<option value="${s}" ${s===l.s?'selected':''}>${s}</option>`).join('')}</select>
        <input type="number" min="1" value="${l.q}" data-mch="q" data-n="${n}" style="height:38px;border:1px solid var(--line);border-radius:3px;background:var(--surface);text-align:center;font-size:.84rem">
        <button class="lnk" data-act="mrm" data-n="${n}" aria-label="Retirer la ligne">✕</button></div>`;}).join('')
        :'<p class="note">Aucun article. Ajoutez au moins une ligne.</p>'}
      </div>
      <label class="f" style="margin-top:18px">Note<textarea id="m_note">${esc(m.note)}</textarea></label>
    </div>
    <div class="panel-ft">
      <div class="totals"><div class="grand"><span>Total</span><span class="num">${fmt(m.lines.reduce((a,l)=>a+priceOf(prod(l.id))*l.q,0))}</span></div></div>
      <button class="btn btn-pri" data-act="msave" ${m.lines.length?'':'disabled'} style="justify-content:center">Enregistrer la commande</button>
    </div></div>`;
}

