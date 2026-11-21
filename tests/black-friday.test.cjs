const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {prixBlackFriday} = require('../src/scripts/02b-black-friday-prix.js');
const apps = fs.readFileSync('integrations/tableur.gs','utf8');
const context = vm.createContext({});
vm.runInContext(apps, context);
const customer={name:'Test local',phone:'0600000000',email:'test@example.invalid',addr:'Adresse de test',city:'Fès',country:'Maroc'};
function scriptOrder(items,extra={}) {
  context.input = JSON.stringify({items,customer,...extra});
  return JSON.parse(vm.runInContext('JSON.stringify(construireCommande(JSON.parse(input)))',context));
}
function row(q,colorKey='noir',size=38){return {id:'opus',colorKey,size,q,unit:279};}
for(const [q,expected] of [[1,279],[2,558],[3,699],[4,1116],[5,1395],[6,1674],[7,1953],[9,2511],[10,2790]]) {
  test(`${q} paires : panier et Apps Script = ${expected} DH`,()=>{
    const items=[row(q)];
    const p=prixBlackFriday(items);
    assert.equal(p.sub,expected);
    assert.equal(p.items.reduce((n,i)=>n+i.q,0),q);
    assert.equal(p.gross-p.discount,p.sub);
    assert.equal(items[0].unit,279,'pas de mutation du panier');
    const o=scriptOrder(items).commande;
    assert.equal(o.total,expected);
    assert.equal(o.livraison,0);
    assert.equal(o.lignes.reduce((n,i)=>n+i.prix*i.q,0),expected);
    assert.equal(o.paires,q);
  });
}
test('trio réparti entre couleurs et pointures, prix client falsifié ignoré',()=>{
  const items=[row(1,'noir',37),row(1,'beige',39),row(1,'marine',41)];
  const o=scriptOrder(items.map(i=>({...i,unit:1,prix:1}))).commande;
  assert.equal(o.total,699);assert.equal(o.lignes.length,3);
  assert.deepEqual(o.lignes.map(i=>i.prix),[233,233,233]);
  assert.deepEqual(o.lignes.map(i=>i.pointure),[37,39,41]);
});
test('ligne de 4 : tarif normal pour toutes les paires',()=>{
  const o=scriptOrder([row(4)]).commande;
  assert.deepEqual(o.lignes.map(i=>[i.q,i.prix]),[[4,279]]);
  const need=o.lignes.reduce((n,i)=>n+i.q,0);assert.equal(need,4);
});
test('suppression de la troisième paire enlève la remise',()=>{
  assert.equal(prixBlackFriday([row(3)]).discount,138);
  assert.equal(prixBlackFriday([row(2)]).discount,0);
  assert.equal(prixBlackFriday([]).sub,0);
});
test('aucune remise sur un autre modèle ou une saisie atelier',()=>{
  assert.equal(prixBlackFriday([{id:'autre',q:3,unit:279}]).sub,837);
  assert.equal(prixBlackFriday([row(3)],false).sub,837);
});
test('validation serveur conservée et ancien total refusé',()=>{
  for (const items of [[],[row(0)],[row(11)],[row(1,'inconnu')],[row(1,'noir',99)]]) assert.ok(scriptOrder(items).erreur);
  assert.ok(scriptOrder([row(3)],{expectedTotal:837}).erreur);
  assert.equal(scriptOrder([row(3)],{expectedTotal:699}).commande.total,699);
});
test('le calcul embarqué Apps Script reste identique au calcul du site',()=>{
  const shared=fs.readFileSync('src/scripts/02b-black-friday-prix.js','utf8').split('if (typeof module')[0];
  assert.ok(apps.includes(shared));
});
// Exécuter la vraie fonction du serveur sans démarrer HTTP ni écrire de données.
const server=fs.readFileSync('server.js','utf8');
const build=server.slice(server.indexOf('function buildOrder('),server.indexOf('/* ---------- fichiers statiques'));
test('serveur Node : total net, stock de 3 retiré, stock insuffisant inchangé',()=>{
  const env=vm.createContext({prixBlackFriday,SEED:{opus:{price:279,colors:['noir'],stock:[10,10,10,10,10]}},COLORS:['noir'],SIZES:[37,38,39,40,41],db:{catalog:{prices:{},stock:{opus:{noir:[10,10,10,10,10]}}}},SHIP_FREE:400,SHIP_COST:35,str:(v,n)=>String(v||'').slice(0,n),newRef:()=> 'TEST',customer});
  vm.runInContext('function grille(id){return db.catalog.stock[id]}\n'+build,env);
  env.input={items:[row(3)],customer};
  const o=vm.runInContext('buildOrder(input,"boutique")',env).order;
  assert.equal(o.total,699);assert.equal(o.ship,0);assert.equal(o.items[0].unit,233);
  assert.equal(env.db.catalog.stock.opus.noir[1],7);
  env.input.items=[row(10)];
  assert.ok(vm.runInContext('buildOrder(input,"boutique")',env).error);
  assert.equal(env.db.catalog.stock.opus.noir[1],7);
});
test('ancien récepteur ou réseau coupé : aucune commande remisée envoyée',async()=>{
  const source=fs.readFileSync('src/scripts/08-panier.js','utf8');
  const calls=[];
  const env=vm.createContext({SHOP:{tableur:'https://example.invalid'},AbortController,setTimeout,clearTimeout,fetch:async(u,opt)=>{calls.push(opt.method);return {ok:true,json:async()=>({stock:{}})};}});
  vm.runInContext(source,env);
  env.order={discount:138,items:[row(3)],customer,total:699};
  const result=await vm.runInContext('envoyerAuTableur(order,"test-only","")',env);
  assert.equal(result.ok,false);assert.equal(result.refus,true);assert.deepEqual(calls,['GET']);
});
test('récepteur à jour : lignes de quantité originale et total attendu transmis',async()=>{
  const source=fs.readFileSync('src/scripts/08-panier.js','utf8');
  let sent;
  const env=vm.createContext({SHOP:{tableur:'https://example.invalid'},AbortController,setTimeout,clearTimeout,fetch:async(u,opt)=>{
    if(opt.method==='GET')return {ok:true,json:async()=>({promotion:{version:'bf-exact3-699-v2',packsVersion:'bf-trios-opus-as-mixte-v3'}})};
    sent=JSON.parse(opt.body);return {ok:true,json:async()=>({ok:true,ref:'TEST',total:699})};
  }});
  vm.runInContext(source,env);
  env.order={discount:138,items:prixBlackFriday([row(3)]).items,requestItems:[row(3)],customer,total:699};
  const result=await vm.runInContext('envoyerAuTableur(order,"test-only","")',env);
  assert.equal(result.ok,true);assert.equal(sent.items.length,1);assert.equal(sent.items[0].q,3);assert.equal(sent.expectedTotal,699);
});

test('ajouter une quatrième paire retire la remise ; revenir à trois la rétablit',()=>{
  assert.equal(prixBlackFriday([row(3)]).sub,699);
  assert.equal(prixBlackFriday([row(3),row(1,'beige')]).sub,1116);
  assert.equal(prixBlackFriday([row(2),row(1,'beige')]).sub,699);
});
test('six paires réparties en deux trios ne cumulent pas l’offre',()=>{
  const items=[row(3),row(3,'beige')];
  assert.equal(prixBlackFriday(items).discount,0);
  assert.equal(scriptOrder(items).commande.total,1674);
});
test('trois Opus et un autre article ne constituent pas un panier de trois',()=>{
  const p=prixBlackFriday([row(3),{id:'autre',q:1,unit:100}]);
  assert.equal(p.discount,0);assert.equal(p.sub,937);
});
test('le panier de quatre annonce le tarif normal, sans inviter à acheter un autre lot',()=>{
  const env=vm.createContext({fmt:n=>n+' DH'});
  vm.runInContext(fs.readFileSync('src/scripts/08-panier.js','utf8'),env);
  env.pricing=prixBlackFriday([row(4)]);
  const html=vm.runInContext('blackFridayCartNote(pricing)',env);
  assert.match(html,/Tarif normal appliqué/);assert.doesNotMatch(html,/Encore/);
});

function asRow(q,colorKey='camel',size=38){return {id:'as',colorKey,size,q,unit:299};}
for(const [label,items,total,kind] of [
  ['trois AS identiques',[asRow(3)],799,'as'],
  ['trois AS distincts',[asRow(1,'camel',37),asRow(1,'noir',39),asRow(1,'chocolat',41)],799,'as'],
  ['deux Opus et un AS',[row(2),asRow(1)],749,'mixte'],
  ['un Opus et deux AS',[row(1),asRow(2)],749,'mixte'],
  ['trois Opus',[row(3)],699,'opus'],
]) test(`${label} : frontend, Apps Script et lignes facturées = ${total} DH`,()=>{
  const original=JSON.stringify(items),p=prixBlackFriday(items);
  assert.equal(p.pack,kind);assert.equal(p.sub,total);assert.equal(p.packs,1);
  assert.equal(JSON.stringify(items),original);
  assert.equal(p.items.reduce((n,i)=>n+i.unit*i.q,0),total);
  assert.equal(p.items.reduce((n,i)=>n+i.q,0),3);
  assert.ok(p.items.every(i=>Number.isInteger(i.unit)&&i.unit>0));
  for(const original of items) assert.equal(p.items.filter(i=>i.id===original.id&&i.colorKey===original.colorKey&&i.size===original.size).reduce((n,i)=>n+i.q,0),original.q);
  const o=scriptOrder(items.map(i=>({...i,unit:1})),{expectedTotal:total}).commande;
  assert.equal(o.total,total);assert.equal(o.livraison,0);assert.equal(o.paires,3);
  assert.equal(o.lignes.reduce((n,i)=>n+i.prix*i.q,0),total);
  assert.ok(scriptOrder(items,{expectedTotal:total+1}).erreur);
});
test('les deux compositions mixtes et leurs permutations gardent les mêmes tarifs nets',()=>{
  for(const items of [[row(2),asRow(1)],[row(1),asRow(2)]]) {
    const forward=prixBlackFriday(items),reverse=prixBlackFriday([...items].reverse());
    assert.deepEqual(forward.items.map(i=>[i.id,i.unit,i.q]).sort(),reverse.items.map(i=>[i.id,i.unit,i.q]).sort());
  }
});
test('AS : 1, 2, 4, 5, 6 paires et packs désactivés restent au tarif normal',()=>{
  for(const q of [1,2,4,5,6]) {
    assert.equal(prixBlackFriday([asRow(q)]).sub,299*q);
    assert.equal(scriptOrder([asRow(q)]).commande.total,299*q);
  }
  assert.equal(prixBlackFriday([asRow(3)],false).sub,897);
  assert.equal(prixBlackFriday([row(1),asRow(2)],false).sub,877);
  assert.equal(prixBlackFriday([row(3),asRow(3)]).sub,1734);
  assert.equal(scriptOrder([row(3),asRow(3)]).commande.total,1734);
  assert.equal(prixBlackFriday([{...asRow(3),unit:300}]).sub,900);
});
test('stock Apps Script : les prix arrondis du trio AS retirent exactement trois paires une seule fois',()=>{
  const env=vm.createContext({});vm.runInContext(apps,env);
  let stock=5,writes=0;
  env.feuilleStock=()=>({getRange:()=>({getValue:()=>stock,setValue:n=>{stock=n;writes++;}})});
  env.caseStock=()=>({rangee:1,colonne:1});env.CacheService={getScriptCache:()=>({remove(){}})};
  env.lines=scriptOrder([asRow(3)]).commande.lignes;
  assert.equal(vm.runInContext('retirerDuStock(lines)',env),null);assert.equal(stock,2);assert.equal(writes,1);
  assert.match(vm.runInContext('retirerDuStock(lines)',env),/reste/);assert.equal(stock,2);assert.equal(writes,1);
});
test('serveur Node : chaque pack applique le même total et conserve les quantités de stock',()=>{
  for(const items of [[asRow(3)],[row(2),asRow(1)],[row(1),asRow(2)]]) {
    const total=prixBlackFriday(items).sub;
    const env=vm.createContext({prixBlackFriday,SEED:{opus:{name:'Opus',price:279,colors:['noir'],stock:[10,10,10,10,10]},as:{name:'AS',price:299,colors:['camel'],stock:[10,10,10,10,10]}},COLORS:['noir','camel'],SIZES:[37,38,39,40,41],db:{catalog:{prices:{},stock:{opus:{noir:[10,10,10,10,10]},as:{camel:[10,10,10,10,10]}}}},SHIP_FREE:0,SHIP_COST:0,str:(v,n)=>String(v||'').slice(0,n),newRef:()=> 'TEST',customer});
    vm.runInContext('function grille(id){return db.catalog.stock[id]}\n'+build,env);env.input={items,customer,expectedTotal:total};
    const o=vm.runInContext('buildOrder(input,"boutique")',env).order;
    assert.equal(o.total,total);assert.equal(o.items.reduce((n,i)=>n+i.q*i.unit,0),total);
    assert.equal(env.db.catalog.stock.opus.noir[1]+env.db.catalog.stock.as.camel[1],17);
  }
});
test('ancien récepteur Opus seul : les nouveaux packs ne sont pas envoyés',async()=>{
  const calls=[],env=vm.createContext({SHOP:{tableur:'https://example.invalid'},AbortController,setTimeout,clearTimeout,fetch:async(u,opt)=>{calls.push(opt.method);return {ok:true,json:async()=>({promotion:{version:'bf-exact3-699-v2'}})};}});
  vm.runInContext(fs.readFileSync('src/scripts/08-panier.js','utf8'),env);
  env.order={discount:98,requestItems:[asRow(3)],items:prixBlackFriday([asRow(3)]).items,customer,total:799};
  assert.equal((await vm.runInContext('envoyerAuTableur(order,"test","")',env)).refus,true);
  assert.deepEqual(calls,['GET']);
});
test('trio AS : le reçu réparti en deux prix transmet toujours une seule ligne de stock originale',async()=>{
  let sent;const env=vm.createContext({SHOP:{tableur:'https://example.invalid'},AbortController,setTimeout,clearTimeout,fetch:async(u,opt)=>{
    if(opt.method==='GET')return {ok:true,json:async()=>({promotion:{packsVersion:'bf-trios-opus-as-mixte-v3'}})};
    sent=JSON.parse(opt.body);return {ok:true,json:async()=>({ok:true,ref:'TEST'})};
  }});
  vm.runInContext(fs.readFileSync('src/scripts/08-panier.js','utf8'),env);
  env.order={discount:98,items:prixBlackFriday([asRow(3)]).items,requestItems:[asRow(3)],customer,total:799};
  assert.equal((await vm.runInContext('envoyerAuTableur(order,"test","")',env)).ok,true);
  assert.equal(sent.items.length,1);assert.equal(sent.items[0].q,3);assert.equal(sent.expectedTotal,799);assert.equal(sent.pricingVersion,'bf-trios-opus-as-mixte-v3');
});
