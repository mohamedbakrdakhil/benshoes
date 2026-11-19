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
for(const [q,expected] of [[1,279],[2,558],[3,699],[4,978],[5,1257],[6,1398],[7,1677],[9,2097],[10,2376]]) {
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
test('ligne de 4 : séparation 3 à 233 et 1 à 279 sans perdre le stock',()=>{
  const o=scriptOrder([row(4)]).commande;
  assert.deepEqual(o.lignes.map(i=>[i.q,i.prix]),[[3,233],[1,279]]);
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
    if(opt.method==='GET')return {ok:true,json:async()=>({promotion:{version:'bf-3-699-v1'}})};
    sent=JSON.parse(opt.body);return {ok:true,json:async()=>({ok:true,ref:'TEST',total:978})};
  }});
  vm.runInContext(source,env);
  env.order={discount:138,items:prixBlackFriday([row(4)]).items,requestItems:[row(4)],customer,total:978};
  const result=await vm.runInContext('envoyerAuTableur(order,"test-only","")',env);
  assert.equal(result.ok,true);assert.equal(sent.items.length,1);assert.equal(sent.items[0].q,4);assert.equal(sent.expectedTotal,978);
});
