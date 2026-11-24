const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=name=>fs.readFileSync('src/scripts/'+name,'utf8');
function boutique(){
  const element={hidden:true,innerHTML:'',contains:()=>false};
  const events={},storage=new Map();
  const location={protocol:'https:',origin:'https://www.benkashoes.ma',pathname:'/collection/',search:'',hash:''};
  const document={
    addEventListener:(name,fn)=>events[name]=fn,activeElement:{},querySelector:()=>null,
    getElementById:id=>id==='shared-trio'?element:null,
  };
  const context=vm.createContext({URL,document,location,navigator:{},
    localStorage:{setItem:(k,v)=>storage.set(k,v)},history:{replaceState:()=>location.hash=''},
    toast(){},draw(){},visuel:()=>'<img>',});
  for(const name of ['02-catalogue.js','02b-black-friday-prix.js','04-outils.js','06-collection.js','08-panier.js','20-trio-partage.js']){
    vm.runInContext(source(name),context);
  }
  const run=(js)=>vm.runInContext(js,context);
  const state=run('S');
  return {context,run,state,element,location,events,storage};
}
function ligne(id,c,s,q=1){return {id,c,s,q};}
function visite(env,hash){
  env.location.hash=hash;env.run('afficherTrioPartage()');
}
test('lien stable de une à trois paires : seuls modèles, coloris et pointures sont partagés',()=>{
  const env=boutique();
  env.state.cart=[ligne('as','noir',38,2),ligne('opus','tabac',39)];
  env.state.form={name:'Nom privé',phone:'0600000000'};
  const url=env.run('lienPartageTrio()');
  assert.equal(url,'https://www.benkashoes.ma/collection/#trio=v1.as-noir-38,as-noir-38,opus-tabac-39');
  const rebuilt=env.run("lignesTrio(decoderTrio('"+new URL(url).hash+"'))");
  assert.deepEqual(JSON.parse(JSON.stringify(rebuilt)),env.state.cart);
  assert.match(env.run('actionsPartageTrio()'),/https:\/\/wa.me\/\?text=/);
  assert.match(env.run('actionsPartageTrio()'),/Copier le lien/);
  env.state.cart=[ligne('as','noir',38,1)];assert.ok(env.run('lienPartageTrio()'));
  env.state.cart[0].q=4;assert.equal(env.run('actionsPartageTrio()'),'');
  env.state.cart[0].q='3';assert.equal(env.run('lienPartageTrio()'),null);
});
test('un lien invalide est refusé en bloc sans modifier le panier',()=>{
  const env=boutique();
  const old=[ligne('as','noir',38)];env.state.cart=old;
  for(const hash of ['#trio=v9.as-noir-39','#trio=v1.as-beige-37','#trio=v1.as-noir-42','#trio=v1.as-noir-39,opus-faux-40',
    '#trio=v1.'+'as-noir-39,'.repeat(4),'#trio=v1.constructor-prototype-38','#trio=v1.as-<img>-37','#trio=v1.'+'a'.repeat(150)]){
    visite(env,hash);assert.match(env.element.innerHTML,/Sélection indisponible/);
    env.run('importerTrio()');assert.equal(env.state.cart,old);
  }
});
test('les trois tarifs et les prix hors pack viennent du même calcul que le panier',()=>{
  const env=boutique();
  for(const [composition,prix] of [['as-noir-37,as-camel-39,as-noir-37',799],['opus-beige-37,opus-tabac-38,opus-beige-39',699],
    ['as-noir-37,opus-beige-38,as-noir-39',749],['opus-beige-37,opus-tabac-38,as-noir-39',749],['as-noir-37,opus-beige-38',578]]){
    visite(env,'#trio=v1.'+composition);
    assert.match(env.element.innerHTML,new RegExp('>'+prix+' DH<'));
  }
  env.state.ov.prices.as=320;visite(env,'#trio=v1.as-noir-37,as-noir-37,as-noir-37');
  assert.match(env.element.innerHTML,/>960 DH</);
});
test('reprise après consentement, même si le panier change dans un autre onglet',()=>{
  const env=boutique();env.state.cart=[ligne('opus','tabac',37)];
  visite(env,'#trio=v1.as-noir-39,as-noir-39');
  assert.equal(env.storage.size,0);
  env.run('importerTrio()');
  assert.match(env.element.innerHTML,/Confirmer le remplacement/);
  assert.equal(env.state.cart[0].id,'opus');
  env.state.cart[0].q=2;env.run('importerTrio()');
  assert.match(env.element.innerHTML,/Votre panier contient 2 paires/);assert.equal(env.storage.size,0);
  env.run('importerTrio()');
  assert.equal(env.state.panel,'cart');
  assert.deepEqual(JSON.parse(env.storage.get('benkashoes.cart')),[ligne('as','noir',39,2)]);
  assert.equal(env.location.hash,'');
  assert.equal(env.run('cartPricing().sub'),598);
});
test('stock de deux paires identiques revérifié au clic, pointure modifiable avant import',()=>{
  const env=boutique();
  visite(env,'#trio=v1.as-camel-37,as-camel-37');
  env.state.ov.stock.as={camel:[1,5,3,1,0]};
  env.run('importerTrio()');
  assert.equal(env.storage.size,0);
  assert.match(env.element.innerHTML,/La quantité choisie dépasse le stock/);
  const field={dataset:{pair:'1',trioField:'s'},value:'38'};
  env.events.change({target:{closest:()=>field}});
  env.run('importerTrio()');
  assert.deepEqual(JSON.parse(env.storage.get('benkashoes.cart')),[ligne('as','camel',37),ligne('as','camel',38)]);
});
