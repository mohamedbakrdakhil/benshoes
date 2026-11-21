const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=name=>fs.readFileSync('src/scripts/'+name,'utf8');

test('une page de marque sans grilles, anatomie ni tailles conserve son pied de page',()=>{
  const elements={'#ftrmodels':{},'#ftrcontact':{},'#ftrcopy':{}};
  const ctx=vm.createContext({$:s=>elements[s]||null,poserLogo(){},CATALOG:[{id:'opus',name:'Opus',colors:['beige']},{id:'as',name:'AS by BENKA',colors:['camel']}],priceOf:p=>p.id==='as'?299:279,fmt:n=>n+' DH',esc:v=>v,SHOP:{email:'test@example.invalid',site:'example.invalid'}});
  vm.runInContext(source('06-collection.js'),ctx);
  assert.doesNotThrow(()=>vm.runInContext('renderStatic()',ctx));
  assert.match(elements['#ftrmodels'].innerHTML,/href="\/collection\/#opus-beige"/);
  assert.match(elements['#ftrmodels'].innerHTML,/href="\/collection\/#as-camel"/);
  assert.doesNotMatch(elements['#ftrmodels'].innerHTML,/data-act="open"/);
  assert.match(elements['#ftrcontact'].innerHTML,/test@example.invalid/);
  ctx.prod=()=>null;
  assert.equal(vm.runInContext('renderGrid()',ctx),false);
});

test('la navigation utilise les chemins comme liens et conserve la page active',()=>{
  const link=href=>({href,offsetWidth:100,offsetLeft:20,attrs:{},getAttribute(name){return name==='href'?href:this.attrs[name];},setAttribute(name,val){this.attrs[name]=val;},removeAttribute(name){delete this.attrs[name];},hasAttribute(name){return name in this.attrs;}});
  const home=link('/'),collection=link('/collection/'),packs=link('/collection/#packs'),other=link('/maison/');
  const ink={style:{},classList:{add(){},remove(){}}},links=[home,collection,packs,other],section={id:'packs'};
  let observer;
  const ctx=vm.createContext({URL,location:{href:'https://example.invalid/collection/'},matchMedia:()=>({matches:true}),$:s=>s==='#nav'?{querySelectorAll:()=>links}:s==='#navink'?ink:null,document:{getElementById:id=>id==='packs'?section:null,querySelector:()=>{throw new Error('chemin traité comme sélecteur');}},window:{IntersectionObserver:true},IntersectionObserver:class{constructor(fn){observer=fn;}observe(el){assert.equal(el,section);}},addEventListener(){}});
  vm.runInContext(source('10-revelations.js'),ctx);
  vm.runInContext('initNav()',ctx);
  assert.equal(collection.attrs['aria-current'],'page');
  observer([{target:section,intersectionRatio:.7}]);assert.equal(packs.attrs['aria-current'],'location');
  observer([{target:section,intersectionRatio:0}]);assert.equal(collection.attrs['aria-current'],'page');
  assert.equal(other.attrs['aria-current'],undefined);
});

test('la géométrie ne dépend pas des scènes absentes sur une page autonome',()=>{
 const ctx=vm.createContext({$:s=>s==='#visite'||s==='#atelier'?{offsetTop:0}:null,matchMedia:()=>({matches:false}),innerWidth:1200,innerHeight:800,window:{},document:{addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},cancelAnimationFrame(){},setTimeout,clearTimeout});
 vm.runInContext(source('11-moteur.js'),ctx);assert.doesNotThrow(()=>vm.runInContext('mesurer()',ctx));
});

function sharedCart(){
  let saved=[{id:'as',c:'camel',s:37,q:2}],draws=0,syncs=0;
  const events={};
  const ctx=vm.createContext({S:{cart:[],panel:'cart',step:2,ov:{prices:{},stock:{}}},$:()=>({}),readForm:()=>({name:'Coordonnées conservées'}),lsGet:key=>key==='benkashoes.cart'?saved:null,nettoyerCatalogue:()=>({prices:{},stock:{}}),SIZES:[37,38,39,40,41],prod:id=>['as','opus'].includes(id)?{id,colors:['camel','beige']}:null,syncCart(){syncs++;},draw(){draws++;},addEventListener:(name,fn)=>events[name]=fn});
  const code=source('15-demarrage.js');vm.runInContext(code.slice(code.indexOf('function lireSelectionPanier(value){')),ctx);
  return {ctx,events,setSaved:v=>saved=v,counts:()=>({draws,syncs})};
}
test('un retour BFCache reprend le panier partagé et conserve le formulaire',()=>{
 const h=sharedCart();h.events.pageshow({persisted:true});assert.equal(h.ctx.S.cart[0].q,2);assert.equal(h.ctx.S.form.name,'Coordonnées conservées');assert.deepEqual(h.counts(),{draws:1,syncs:1});
 h.events.pageshow({persisted:true});assert.deepEqual(h.counts(),{draws:1,syncs:1});
});
test('un panier vidé sur une autre page quitte la livraison et un envoi en cours reste intact',()=>{
 const h=sharedCart();h.events.storage({key:'benkashoes.cart'});h.setSaved([]);h.events.storage({key:'benkashoes.cart'});assert.equal(h.ctx.S.cart.length,0);assert.equal(h.ctx.S.step,1);
 h.ctx.S.envoi=true;h.setSaved([{id:'opus',q:3}]);h.events.pageshow({persisted:true});assert.equal(h.ctx.S.cart.length,0);assert.deepEqual(h.counts(),{draws:2,syncs:2});
 h.ctx.S.envoi=false;h.events.storage({key:'unrelated'});assert.equal(h.ctx.S.cart.length,0);
});

function persistentCartEnv(entries={}){
  const store=new Map(Object.entries(entries).map(([key,value])=>[key,JSON.stringify(value)])),events={},writes=[];
  const nodes={'#cartcount':{textContent:''},'#cartbtn':{setAttribute(){}}};
  const ctx=vm.createContext({
    CATALOG:[{id:'opus',name:'Opus',colors:['beige'],price:279,stock:{beige:[0,0,0,0,0]}}],
    SIZES:[37,38,39,40,41],COLORS:{beige:{n:'Beige'}},STATUS:{},SHIPFREE:0,SHIPCOST:0,HASCLAUDE:false,
    document:{querySelector:selector=>nodes[selector]||null},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>{writes.push({key,value});store.set(key,value);}},
    addEventListener:(name,fn)=>events[name]=fn,draw(){},readForm:()=>({}),
  });
  vm.runInContext(source('04-outils.js')+'\n'+source('06-collection.js'),ctx);
  const startup=source('15-demarrage.js');vm.runInContext(startup.slice(startup.indexOf('function lireSelectionPanier(value){')),ctx);
  return {ctx,store,events,writes,nodes,set:(key,value)=>store.set(key,JSON.stringify(value)),get:key=>JSON.parse(store.get(key)||'null')};
}
const restockedCart=[{id:'opus',c:'beige',s:38,q:3}];
test('navigation : une paire réassortie est conservée malgré un stock embarqué à zéro',()=>{
  const h=persistentCartEnv({'benkashoes.cart':restockedCart,'benkashoes.stock':{stock:{opus:{beige:[5,4,5,6,2]}}},'benkashoes.catalog':{prices:{opus:279},stock:{opus:{beige:[0,0,0,0,0]}}}});
  vm.runInContext('preparerPanierLocal()',h.ctx);
  assert.equal(vm.runInContext('stockCol(prod("opus"),"beige",1)',h.ctx),4);
  assert.deepEqual(h.get('benkashoes.cart'),restockedCart);
  assert.ok(h.writes.every(write=>write.key!=='benkashoes.cart'||JSON.parse(write.value).length===1));
});
test('cache absent ou périmé : la reprise ne supprime ni ne réduit les quantités avant réception du stock',()=>{
  for(const stock of [null,{stock:{opus:{beige:[0,1,0,0,0]}}}]){
    const h=persistentCartEnv({'benkashoes.cart':restockedCart,'benkashoes.stock':stock});
    vm.runInContext('preparerPanierLocal()',h.ctx);
    assert.deepEqual(h.get('benkashoes.cart'),restockedCart);
    // La validation liée au stock reste disponible pour les décisions de vente.
    assert.ok(vm.runInContext('nettoyerPanier(S.cart).reduce((n,i)=>n+i.q,0)',h.ctx)<3);
  }
});
test('BFCache et storage : un ancien zéro ne réécrit pas la nouvelle sélection partagée',()=>{
  for(const trigger of ['pageshow','storage']){
    const h=persistentCartEnv();vm.runInContext('preparerPanierLocal()',h.ctx);
    h.set('benkashoes.cart',restockedCart);
    h.events[trigger](trigger==='pageshow'?{persisted:true}:{key:'benkashoes.cart'});
    assert.equal(vm.runInContext('S.cart[0].q',h.ctx),3);
    assert.deepEqual(h.get('benkashoes.cart'),restockedCart);
  }
});
test('un stock partagé actualisé conserve les coordonnées même lorsque le panier est identique',()=>{
  const h=persistentCartEnv({'benkashoes.cart':restockedCart});
  vm.runInContext('preparerPanierLocal();S.panel="cart";S.step=2;',h.ctx);
  h.nodes['#f_name']={};h.ctx.readForm=()=>({name:'Cliente',city:'Fès'});
  let draws=0;h.ctx.draw=()=>{draws++;assert.equal(vm.runInContext('S.form.name',h.ctx),'Cliente');};
  h.set('benkashoes.stock',{stock:{opus:{beige:[5,4,5,6,2]}}});
  h.events.storage({key:'benkashoes.stock'});
  assert.equal(draws,1);assert.equal(vm.runInContext('S.form.city',h.ctx),'Fès');
  assert.deepEqual(h.get('benkashoes.cart'),restockedCart);
  // Un autre retour navigateur ne réapplique pas le cache sur une donnée
  // plus récente en mémoire et ne recrée pas le formulaire sans changement.
  vm.runInContext('S.ov.stock.opus.beige[1]=2;',h.ctx);
  h.events.pageshow({persisted:true});
  assert.equal(draws,1);assert.equal(vm.runInContext('stockCol(prod("opus"),"beige",1)',h.ctx),2);
});
test('reprise du panier : les entrées inconnues, quantités non finies et pointures invalides restent exclues',()=>{
 const h=persistentCartEnv({'benkashoes.cart':[
  {id:'opus',c:'beige',s:38,q:7},{id:'opus',c:'beige',s:38,q:8},
  {id:'intrus',c:'beige',s:38,q:1},{id:'opus',c:'absent',s:38,q:1},
  {id:'opus',c:'beige',s:99,q:1},{id:'opus',c:'beige',s:37,q:'Infinity'},
 ]});
 vm.runInContext('preparerPanierLocal()',h.ctx);
 assert.deepEqual(h.get('benkashoes.cart'),[{id:'opus',c:'beige',s:38,q:10}]);
});
