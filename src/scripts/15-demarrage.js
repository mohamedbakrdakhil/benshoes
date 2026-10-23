/* ======================= démarrage ======================= */
function degrader(raison){
  MODE2D=true; construirePlans();
  document.documentElement.classList.add('degrade');
  MOTEUR.taches.length=0;
  document.querySelectorAll('[data-rv]').forEach(el=>{el.style.opacity='';el.style.transform='';});
  console.warn('[benka] affichage simplifié :',raison);
}
try{
  renderStatic();
  initMotion();initVisite();initAtelier();initNav();initCounters();initProgress();
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
  if(st && st.getBoundingClientRect().height<Math.min(260,innerHeight-80)) degrader('scène sans hauteur');
});
mesurer();
addEventListener('scroll',reveiller,{passive:true});
addEventListener('resize',()=>{mesurer();reveiller();},{passive:true});
document.addEventListener('visibilitychange',reveiller);
addEventListener('load',()=>{mesurer();reveiller();});
reveiller();
const savedCart=lsGet('benkashoes.cart');if(Array.isArray(savedCart))S.cart=savedCart.slice(0,40)
  .filter(i=>i&&prod(i.id)&&COLORS[i.c]&&prod(i.id).colors.includes(i.c)&&SIZES.includes(i.s))
  .map(i=>({id:i.id,c:i.c,s:i.s,q:Math.min(99,Math.max(1,Math.floor(Number(i.q))||1))}));
draw();
if(!HASCLAUDE){
  TOKEN=lsGet('benkashoes.token')||'';
  S.canAdmin=true;loadLocal();
  const c=lsGet('benkashoes.catalog');if(c&&c.prices)S.ov=c;
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
        if(Array.isArray(l)&&l.length===SIZES.length)
          n[c]=l.map(v=>{const x=Math.floor(Number(v));return x>0?x:0;});});
      if(Object.keys(n).length===p.colors.length)net[p.id]=n;});
    return Object.keys(net).length?net:null;
  };
  // Le dernier stock connu s'affiche tout de suite : au rechargement suivant,
  // les pointures fermées le restent sans attendre l'aller-retour.
  const garde=lsGet('benkashoes.stock');
  const tot=valider(garde);
  if(tot){S.ov.stock=Object.assign({},S.ov.stock,tot);draw();}
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
      if(snap.exists){const v=snap.data()||{};S.ov={prices:v.prices||{},stock:v.stock||{}};}}catch(e){}
    db.collection('orders').orderBy('createdAt','desc').limit(500).onSnapshot(
      s=>{S.orders=nettoyerListe(s.docs.map(d=>d.data()));draw();},
      ()=>{});
  }
  draw();
})();
