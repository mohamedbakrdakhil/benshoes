const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/scripts/08-panier.js','utf8');
const outils=fs.readFileSync('src/scripts/04-outils.js','utf8');
const order={discount:0,items:[{id:'opus',colorKey:'beige',q:1,size:37}],customer:{name:'Test'},total:279};
function receiver(fetch){
  const env=vm.createContext({SHOP:{tableur:'https://example.invalid'},AbortController,setTimeout,clearTimeout,fetch});
  vm.runInContext(source,env);env.order=order;return env;
}
for(const kind of ['network','opaque','http500','invalidJSON','missingRef'])test('réception '+kind+' : jamais une fausse confirmation ni un renvoi aveugle',async()=>{
  let calls=0;
  const env=receiver(async()=>{
    calls++;
    if(kind==='network')throw Error('offline');
    return {ok:kind!=='http500'&&kind!=='opaque',type:kind==='opaque'?'opaque':'cors',json:async()=>{
      if(kind==='invalidJSON')throw Error('invalid');
      return kind==='missingRef'?{ok:true}:kind==='opaque'?null:{ok:true,ref:'BS-TEST'};
    }};
  });
  const r=await vm.runInContext('envoyerAuTableur(order,"test-only","")',env);
  assert.equal(r.ok,false);assert.equal(r.incertain,true);assert.equal(calls,1);
});
test('réception confirmée et refus explicite du stock restent distincts',async()=>{
  const env=receiver(async()=>({ok:true,json:async()=>({erreur:'Stock insuffisant'})}));
  const r=await vm.runInContext('envoyerAuTableur(order,"test-only","")',env);
  assert.equal(r.ok,false);assert.equal(r.refus,true);assert.equal(r.message,'Stock insuffisant');
});
test('une nouvelle tentative identique garde la clé ; un panier différent en change',()=>{
  let n=0;const env=receiver(()=>{});env.S={};env.cleCommande=()=>String(++n);
  assert.equal(vm.runInContext('clePourCommande(order)',env),'1');
  assert.equal(vm.runInContext('clePourCommande(order)',env),'1');
  env.order={...order,total:699};assert.equal(vm.runInContext('clePourCommande(order)',env),'2');
});
test('validation : ponctuation seule et numéro trop court refusés',()=>{
  const env=receiver(()=>{});
  env.form={name:'Test',phone:'++++++++',email:'test@example.invalid',addr:'Adresse',city:'Fès'};
  assert.ok(vm.runInContext('erreursLivraison(form).phone',env));
  env.form.phone='+212 6 00 00 00 00';assert.equal(vm.runInContext('Object.keys(erreursLivraison(form)).length',env),0);
  env.form.email='a@';assert.ok(vm.runInContext('erreursLivraison(form).email',env));
});
function dataEnv(){
  const env=vm.createContext({CATALOG:[{id:'opus',colors:['beige'],price:279,stock:{beige:[3,0,2,1,1]}}],SIZES:[37,38,39,40,41],STATUS:{nouvelle:'Nouvelle'},COLORS:{beige:{n:'Beige'}},SHIPCOST:0,SHIPFREE:0});
  vm.runInContext(outils,env);return env;
}
test('catalogue importé : prix injecté, stock infini ou incomplet rejetés',()=>{
  const env=dataEnv();env.input={prices:{opus:'<img onerror=alert(1)>'},stock:{opus:{beige:[3,0,Infinity,1,1]}}};
  assert.equal(vm.runInContext('JSON.stringify(nettoyerCatalogue(input))',env),'{"prices":{},"stock":{}}');
  env.input={prices:{opus:279},stock:{opus:{beige:[3,0,2,1,1]}}};
  assert.equal(vm.runInContext('nettoyerCatalogue(input).stock.opus.beige[0]',env),3);
});
test('panier restauré : fusion des doublons, limite de stock et exclusion des ruptures',()=>{
  const env=dataEnv();env.input=[{id:'opus',c:'beige',s:37,q:2},{id:'opus',c:'beige',s:37,q:2},{id:'opus',c:'beige',s:38,q:1},{id:'opus',c:'beige',s:40,q:Infinity},{id:'absent',c:'beige',s:37,q:1}];
  assert.equal(vm.runInContext('JSON.stringify(nettoyerPanier(input))',env),'[{"id":"opus","c":"beige","s":37,"q":3}]');
});
test('référence locale : aucun undefined même à la borne haute aléatoire',()=>{
  const env=dataEnv();vm.runInContext('Math.random=()=>.999999',env);
  assert.match(vm.runInContext('newRef()',env),/^BS-\d{4}-[A-Z0-9]{6}$/);
});
test('adresse produit mal encodée : pas de plantage au démarrage',()=>{
  const all=fs.readFileSync('src/scripts/14-evenements.js','utf8');
  const start=all.indexOf('function depuisLien(){'),end=all.indexOf('/* Nos propres',start);
  const env=vm.createContext({location:{hash:'#%E0%A4%A'},prod:()=>null});vm.runInContext(all.slice(start,end),env);
  assert.equal(vm.runInContext('depuisLien()',env),null);
});
test('Apps Script : une clé apparue pendant l’attente du verrou ne retire aucun stock',()=>{
  const env=vm.createContext({console});vm.runInContext(fs.readFileSync('integrations/tableur.gs','utf8'),env);
  let reads=0,writes=0,releases=0;
  env.refDejaVue=()=>({ref:++reads===1?null:'BS-DEJA',retenir(){throw Error('duplicate write')}});
  env.reponse=v=>v;env.tropDeCommandes=()=>false;env.construireCommande=()=>({commande:{lignes:[]}});
  env.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){releases++}})};
  env.retirerDuStock=()=>{writes++;return null};env.e={postData:{contents:JSON.stringify({cle:'test-only'})}};
  const result=vm.runInContext('doPost(e)',env);
  assert.equal(result.ref,'BS-DEJA');assert.equal(result.deja,true);assert.equal(writes,0);assert.equal(releases,1);
});

for(const outcome of ['failure','success'])test('commande complète simulée : '+outcome+' conserve ou vide le panier au bon moment',async()=>{
  const env=receiver(()=>{});let purchases=0,draws=0;
  env.S={cart:[{id:'opus',c:'beige',s:37,q:3}],step:2,panel:'cart',orders:[]};
  env.MODE='local';env.readForm=()=>({name:'Test',phone:'0600000000',email:'test@example.invalid',addr:'Test',city:'Fès',country:'Maroc',note:''});
  env.afficherErreursLivraison=()=>{};env.toast=()=>{};env.draw=()=>{draws++};
  env.cartPricing=()=>({items:order.items,sub:699,discount:138,packs:1});env.shipCost=()=>0;
  env.newRef=()=> 'BS-LOCAL';env.cleCommande=()=> 'stable-test';env.nettoyerCommande=o=>o;
  env.syncCart=()=>{};env.saveLocal=()=>{};env.mesurerAchat=()=>{purchases++};
  env.envoyerAuTableur=async()=>outcome==='success'?{ok:true,ref:'BS-TEST'}:{ok:false,message:'Réception non confirmée'};
  await vm.runInContext('placeOrder()',env);
  assert.equal(env.S.envoi,false);assert.equal(draws,2);
  if(outcome==='failure'){
    assert.equal(env.S.cart.length,1);assert.equal(env.S.step,2);assert.equal(env.S.form.name,'Test');
    assert.equal(env.S.checkoutError,'Réception non confirmée');assert.equal(purchases,0);assert.equal(env.S.lastOrder,undefined);
  }else{
    assert.equal(env.S.cart.length,0);assert.equal(env.S.step,3);assert.equal(env.S.form,null);
    assert.equal(env.S.lastOrder.ref,'BS-TEST');assert.equal(purchases,1);
  }
});

test('serveur Node : chemin mal encodé refusé sans exception ni lecture disque',()=>{
  const all=fs.readFileSync('server.js','utf8');
  const code=all.slice(all.indexOf('function serveStatic('),all.indexOf('/* ---------- serveur ---------- */'));
  let status=0,body='';const res={writeHead(n){status=n;return this},end(s){body=s}};
  const env=vm.createContext({res,req:{method:'GET'}});vm.runInContext(code,env);
  vm.runInContext('serveStatic(req,res,"/%E0%A4%A")',env);
  assert.equal(status,400);assert.equal(body,'Chemin invalide');
});
