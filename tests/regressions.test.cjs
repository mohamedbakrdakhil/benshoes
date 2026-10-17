const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {spawn}=require('node:child_process');
const net=require('node:net');
const ROOT=path.resolve(__dirname,'..');
const src=name=>fs.readFileSync(path.join(ROOT,'src/scripts',name),'utf8');

function client(extra={}){
  const context=vm.createContext({console,Intl,Date,Math,Uint8Array,AbortController,setTimeout,clearTimeout,
    document:{querySelector:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},...extra});
  vm.runInContext(src('02-catalogue.js')+src('04-outils.js')+src('06-collection.js')+src('08-panier.js'),context);
  vm.runInContext('toast=()=>{};',context);return context;
}
test('Références : aucune lettre undefined, même au maximum aléatoire',()=>{
  const c=client();vm.runInContext('Math.random=()=>0.999999;',c);
  assert.match(vm.runInContext('newRef()',c),/^BS-\d{4}-[A-Z0-9]{4}$/);
});
test('Le panier cumule le stock de tous les coloris pour une même pointure',()=>{
  const c=client();assert.equal(vm.runInContext("S.cart=[{id:'opus',c:'beige',s:37,q:5},{id:'opus',c:'noir',s:37,q:5}];panierValide()",c),false);
  assert.equal(vm.runInContext('S.cart[1].q=4;panierValide()',c),true);
});
test('Une réponse opaque ou illisible ne confirme pas la réception',async()=>{
  const c=client({fetch:async()=>({ok:true,json:async()=>{throw Error('opaque')}})});
  vm.runInContext("const SHOP={tableur:'https://example.invalid'};",c);
  const r=await vm.runInContext("envoyerAuTableur({items:[],customer:{},note:''},'test','')",c);
  assert.equal(r.ok,false);assert.equal(r.refus,true);
});
test('Une confirmation du tableur exige une référence et une réponse HTTP valide',async()=>{
  const c=client({fetch:async()=>({ok:true,json:async()=>({ok:true,ref:'BS-TEST'})})});
  vm.runInContext("const SHOP={tableur:'https://example.invalid'};",c);
  assert.equal((await vm.runInContext("envoyerAuTableur({items:[],customer:{},note:''},'test','')",c)).ref,'BS-TEST');
});
test('Une panne réseau conserve un état de commande non confirmée',async()=>{
  let calls=0;const c=client({fetch:async()=>{calls++;throw Error('offline')}});
  vm.runInContext("const SHOP={tableur:'https://example.invalid'};",c);
  assert.equal((await vm.runInContext("envoyerAuTableur({items:[],customer:{},note:''},'test','')",c)).ok,false);
  assert.equal(calls,1);
});
let processServer,base,tmp;
before(async()=>{
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  tmp=fs.mkdtempSync(path.join(os.tmpdir(),'benka-test-'));base='http://127.0.0.1:'+port;
  processServer=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),DATA_DIR:tmp,ADMIN_PASSWORD:'local-test-only',SESSION_SECRET:'local-tests-only'},stdio:'ignore'});
  let ready=false;for(let i=0;i<50;i++){try{await fetch(base+'/api/catalog');ready=true;break;}catch{await new Promise(r=>setTimeout(r,50));}}
  assert.ok(ready,'Serveur de test démarré');
});
after(async()=>{processServer?.kill();if(processServer)await new Promise(r=>processServer.once('exit',r));fs.rmSync(tmp,{recursive:true,force:true});});
const order=items=>({items,customer:{name:'Test local',phone:'0600000000',email:'test@example.com',addr:'Adresse de test',city:'Casablanca',country:'Maroc'}});
const item=(q=1,colorKey='beige')=>({id:'opus',name:'Nom falsifié',color:'Faux',colorKey,size:37,q,unit:1});
const post=body=>fetch(base+'/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('Le catalogue du serveur correspond au prix public de 259 DH',async()=>{
  const c=await (await fetch(base+'/api/catalog')).json();assert.equal(c.prices.opus,259);assert.deepEqual(Object.keys(c.prices),['opus']);
});
test('Prix, livraison et identité du produit sont recalculés par le serveur',async()=>{
  const r=await post(order([item()]));assert.equal(r.status,201);const {order:o}=await r.json();
  assert.equal(o.total,259);assert.equal(o.ship,0);assert.equal(o.items[0].unit,259);assert.equal(o.items[0].name,'Opus');assert.equal(o.items[0].color,'Beige');
});
test('Le serveur refuse un cumul de stock insuffisant entre coloris',async()=>{
  const r=await post(order([item(5),item(5,'noir')]));assert.equal(r.status,400);assert.match((await r.json()).error,/Stock insuffisant/);
});
test('Les coordonnées invalides et les modèles retirés sont refusés',async()=>{
  const o=order([item()]);o.customer.phone='........';assert.equal((await post(o)).status,400);
  const retired=order([{...item(),id:'western'}]);assert.equal((await post(retired)).status,400);
});
test('Les commandes privées restent protégées',async()=>{assert.equal((await fetch(base+'/api/orders')).status,401);});
test('Une URL mal encodée donne 400 sans arrêter le serveur',async()=>{
  assert.equal((await fetch(base+'/%ZZ')).status,400);assert.equal((await fetch(base+'/api/catalog')).status,200);
});
test('Les polices et vidéos reçoivent leur véritable type MIME',async()=>{
  assert.equal((await fetch(base+'/assets/polices/newsreader.woff2',{method:'HEAD'})).headers.get('content-type'),'font/woff2');
  assert.equal((await fetch(base+'/assets/videos/collection.mp4',{method:'HEAD'})).headers.get('content-type'),'video/mp4');
});
