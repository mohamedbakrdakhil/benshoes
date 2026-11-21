/* ======================= démarrage ======================= */
function degrader(raison){
  if($('#visite')&&typeof construirePlans==='function'){MODE2D=true;construirePlans();}
  document.documentElement.classList.add('degrade');
  MOTEUR.taches.length=0;
  document.querySelectorAll('[data-rv]').forEach(el=>{el.style.opacity='';el.style.transform='';});
  console.warn('[benka] affichage simplifié :',raison);
}
preparerPanierLocal();
try{
  renderStatic();
  initMotion();initShowroomDemande();initAtelier();initNav();initCounters();initProgress();
  fondVideo();
  avancer(tacheRevelations);revelations();
}catch(err){ degrader(err&&err.message||err); }
// garde-fou : si les scènes n'ont pas de hauteur (unité svh refusée, 3D
// indisponible), on replie plutôt que d'afficher une zone vide.
addEventListener('load',()=>{
  // Sur #admin la boutique est remplacée : la scène n'a légitimement aucune
  // hauteur, et replier ici viderait le moteur pour le retour à la boutique.
  if(location.hash==='#admin') return;
  const st=$('.visite-stage');
  if(st && !st.hidden && st.getBoundingClientRect().height<Math.min(260,innerHeight-80)) degrader('scène sans hauteur');
});
mesurer();
addEventListener('scroll',reveiller,{passive:true});
addEventListener('resize',()=>{mesurer();reveiller();},{passive:true});
document.addEventListener('visibilitychange',reveiller);
addEventListener('load',()=>{mesurer();reveiller();});
reveiller();
draw();
// Une adresse qui désigne un coloris ouvre sa fiche tout de suite.
(function(){const f=depuisLien();
  if(f){S.sheet=f;S.tab='fiche';S.panel='sheet';draw();
    const p=prod(f.id);
    mesure('ViewContent',{content_type:'product',content_ids:[refMeta(f.id,f.c)],
      content_name:p.name+' '+(COLORS[f.c]||{}).n,value:priceOf(p),currency:'MAD'});}})();
if(!HASCLAUDE){
  TOKEN=lsGet('benkashoes.token')||'';
  S.canAdmin=true;loadLocal();
  draw();
  (async function(){
    // Sur l'hébergement statique il n'y a pas de serveur : sonder /api/catalog
    // coûterait un aller-retour et un 404 rouge dans la console à chaque
    // visiteur. build.sh ne pose ce repère que sur la page servie par server.js.
    if(!document.querySelector('meta[name="benka-api"]'))return;
    let cat;try{cat=await api('catalog');}catch(e){return;}   // serveur injoignable : on reste en carnet local
    MODE='api';S.ov={prices:cat.prices,stock:cat.stock};S.orders=[];S.canAdmin=false;
    if(TOKEN){try{await api('session');S.canAdmin=true;await loadOrders();}
      catch(e){TOKEN='';lsSet('benkashoes.token','');}}
    draw();
    setInterval(()=>{if(S.canAdmin&&location.hash==='#admin'&&!S.panel&&S.admTab==='commandes')
      loadOrders().then(draw);},20000);
  })();
}
/* ───────── le stock vient de la feuille ─────────

   La grille écrite dans 02-catalogue.js n'est plus qu'un repli : elle sert le
   temps du premier affichage, et si la feuille est injoignable. La vérité est
   dans l'onglet « Stock » du tableur, que chaque commande décrémente.

   Rien n'est accepté à moitié. Une réponse incomplète — un cuir manquant, une
   ligne qui n'a pas cinq pointures — est rejetée en bloc : mieux vaut un stock
   d'hier qu'une boutique à moitié fermée sur une réponse tronquée. */
(async function(){
  if(!SHOP.tableur)return;
  const valider=d=>{
    if(!d||typeof d!=='object'||!d.stock||typeof d.stock!=='object')return null;
    const net={};
    CATALOG.forEach(p=>{
      const g=d.stock[p.id];if(!g||typeof g!=='object')return;
      const n={};
      p.colors.forEach(c=>{const l=g[c];
        if(Array.isArray(l)&&l.length===SIZES.length&&l.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10000))
          n[c]=l.map(v=>{const x=Math.floor(Number(v));return x>0?x:0;});});
      if(Object.keys(n).length===p.colors.length)net[p.id]=n;});
    return Object.keys(net).length?net:null;
  };
  try{
    const r=await fetch(SHOP.tableur,{method:'GET'});
    const frais=valider(await r.json());
    if(frais){S.ov.stock=Object.assign({},S.ov.stock,frais);
      lsSet('benkashoes.stock',{stock:frais});draw();}
  }catch(e){/* feuille injoignable : on garde le repli, la boutique reste ouverte */}
})();

(async function(){
  if(STATIC)return;
  const [db,user]=await Promise.all([use('db'),use('user')]);
  S.db=db;S.user=user;
  if(user){try{S.canAdmin=await user.canEdit();}catch(e){}
    try{const me=await user.me();S.me=(me&&me.name)||'';}catch(e){}}
  if(db){
    try{const snap=await db.doc('settings/catalog').get();
      if(snap.exists)S.ov=nettoyerCatalogue(snap.data());}catch(e){}
    db.collection('orders').orderBy('createdAt','desc').limit(500).onSnapshot(
      s=>{S.orders=nettoyerListe(s.docs.map(d=>d.data()));draw();},
      ()=>{});
  }
  draw();
})();

/* Reprendre une sélection n'est pas la valider pour la vente. Un stock
   embarqué ou en cache peut dater d'avant un réassort ; il ne doit jamais
   effacer des paires lors du passage d'une page à l'autre. L'ajout contrôle
   toujours le stock affiché et le serveur vérifie la commande finale. */
function lireSelectionPanier(value){
  const cart=[];
  (Array.isArray(value)?value:[]).slice(0,40).forEach(item=>{
    const product=item&&prod(item.id),quantity=Number(item?.q);
    if(!product||!product.colors.includes(item.c)||!SIZES.includes(item.s)||!Number.isFinite(quantity)||quantity<1)return;
    const q=Math.min(10,Math.floor(quantity));
    const existing=cart.find(line=>line.id===item.id&&line.c===item.c&&line.s===item.s);
    if(existing)existing.q=Math.min(10,existing.q+q);
    else cart.push({id:product.id,c:item.c,s:item.s,q});
  });
  return cart;
}
function chargerStockCache(){
  const cache=nettoyerCatalogue(lsGet('benkashoes.stock'));
  const signature=JSON.stringify(cache.stock);
  if(signature===S.stockCacheSignature)return false;
  S.stockCacheSignature=signature;
  if(!Object.keys(cache.stock).length)return false;
  S.ov.stock=Object.assign({},S.ov.stock,cache.stock);return true;
}
function preparerPanierLocal(){
  if(!HASCLAUDE)S.ov=nettoyerCatalogue(lsGet('benkashoes.catalog'));
  chargerStockCache();
  S.cart=lireSelectionPanier(lsGet('benkashoes.cart'));
  syncCart();
}
/* Le retour navigateur peut restaurer une ancienne page depuis son cache.
   Le panier partagé reprend alors la sélection réelle, même si la grille
   de stock de cette page est encore ancienne. */
function restaurerPanierPartage(){
  if(S.envoi)return;
  const stockChange=chargerStockCache();
  const cart=lireSelectionPanier(lsGet('benkashoes.cart'));
  const cartChange=JSON.stringify(cart)!==JSON.stringify(S.cart);
  if(!cartChange&&!stockChange)return;
  if(S.panel==='cart'&&S.step===2&&$('#f_name'))S.form=readForm();
  if(!cartChange){draw();return;}
  S.cart=cart;
  if(!cart.length&&S.step===2)S.step=1;
  syncCart();draw();
}
addEventListener('pageshow',event=>{if(event.persisted)restaurerPanierPartage();});
addEventListener('storage',event=>{if(event.key==='benkashoes.cart'||event.key==='benkashoes.stock'||event.key===null)restaurerPanierPartage();});
