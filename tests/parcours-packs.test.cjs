const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('src/scripts/19-parcours-packs.js','utf8');
function env(cart=[]){const calls=[];const c=vm.createContext({S:{cart},draw:()=>calls.push('draw'),document:{querySelector:()=>null},location:{assign:url=>calls.push(url)},MOTION:false});vm.runInContext(source,c);return {c,calls};}
test('le guide compte les quantités et ne promet pas de deuxième pack pour six paires',()=>{
 const {c}=env();for(const [q,complete,over] of [[0,false,false],[1,false,false],[2,false,false],[3,true,false],[4,false,true],[6,false,true]]){
  c.items=[{id:'as',q}];const p=vm.runInContext('packProgress(items)',c);assert.equal(p.count,q);assert.equal(p.complete,complete);assert.equal(p.over,over);assert.equal(p.missing,Math.max(0,3-q));
 }
});
test('commencer un trio conserve les paires déjà choisies et ne change pas leur prix',()=>{
 const cart=[{id:'opus',c:'tabac',s:37,q:1}],{c,calls}=env(cart);vm.runInContext("startPack('mixte')",c);assert.equal(c.S.packMode,'mixte');assert.deepEqual(cart,[{id:'opus',c:'tabac',s:37,q:1}]);assert.deepEqual(calls,['draw','/collection/#as-by-benka']);
});
test('un panier complet est ouvert pour révision, sans ajouter de quatrième paire',()=>{
 const {c,calls}=env([{id:'as',c:'camel',s:37,q:3}]);vm.runInContext("startPack('opus')",c);assert.equal(c.S.panel,'cart');assert.equal(c.S.step,1);assert.equal(c.S.cart[0].q,3);assert.deepEqual(calls,['draw']);
});
test('le trio mixte propose le modèle encore absent',()=>{
 const {c}=env();assert.equal(vm.runInContext("packDestination('mixte',[{id:'as',q:1}])",c),'#modeles');assert.equal(vm.runInContext("packDestination('mixte',[{id:'opus',q:1}])",c),'#as-by-benka');assert.equal(vm.runInContext("packDestination('opus',[])",c),'#modeles');assert.equal(vm.runInContext("packDestination('as',[])",c),'#as-by-benka');
});
test('un mode de pack inconnu ne modifie pas la sélection',()=>{
 const {c,calls}=env([{id:'opus',q:2}]);vm.runInContext("startPack('six')",c);assert.equal(c.S.packMode,undefined);assert.equal(c.S.cart[0].q,2);assert.deepEqual(calls,[]);
});
test('AS : filtrer une pointure montre uniquement les coloris disponibles et se réinitialise',()=>{
 const elements={'#as-grid':{innerHTML:''},'#as-size-filter':{},'#as-collection-count':{}};
 const c=vm.createContext({S:{sizeFilter:37},SIZES:[37,38],$:(s)=>elements[s],prod:()=>({id:'as',colors:['camel','noir']}),stockCol:(_,color,si)=>color==='camel'?1:si,productCard:(_,color)=>color});
 vm.runInContext(fs.readFileSync('src/scripts/06-collection.js','utf8'),c);c.productCard=(_,color)=>color;vm.runInContext('renderASGrid()',c);assert.equal(elements['#as-grid'].innerHTML,'camel');assert.equal(elements['#as-collection-count'].textContent,'1 coloris en pointure 37');
 c.S.sizeFilter=38;vm.runInContext('renderASGrid()',c);assert.equal(elements['#as-grid'].innerHTML,'camelnoir');c.S.sizeFilter=null;vm.runInContext('renderASGrid()',c);assert.equal(elements['#as-size-filter'].value,'');
});
