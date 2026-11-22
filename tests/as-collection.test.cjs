const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function client(){const e=vm.createContext({document:{querySelector:()=>null}});for(const f of ['02-catalogue.js','02b-black-friday-prix.js','04-outils.js','07-fiche.js','06-collection.js'])vm.runInContext(fs.readFileSync('src/scripts/'+f,'utf8'),e);return e;}
function apps(){const e=vm.createContext({console});vm.runInContext(fs.readFileSync('integrations/tableur.gs','utf8'),e);return e;}
test('AS : quatre coloris, stock initial total 150, fiche à 299 avec trio AS à 799, mixte à 749 et sans rotor d’un autre modèle',()=>{
 const e=client();assert.equal(vm.runInContext('totStock(prod("as"))',e),150);
 e.visuel=()=>'<img>';e.nbPhotos=()=>1;
 vm.runInContext('S.sheet={id:"as",c:"camel",s:39};S.tab="fiche"',e);
 const html=vm.runInContext('sheetHTML()',e);assert.match(html,/Ajouter au panier — 299 DH/);assert.match(html,/AS by BENKA/);assert.match(html,/799 DH/);assert.match(html,/749 DH/);assert.doesNotMatch(html,/product-360/);
 assert.equal((html.match(/data-act="setcol"/g)||[]).length,4);
 assert.equal((html.match(/data-act="setsize"/g)||[]).length,5);
 vm.runInContext('S.ov.stock.as={camel:[0,6,6,6,6],cognac:[6,6,6,6,6],noir:[12,12,12,12,12],chocolat:[6,6,6,6,6]};S.sheet.s=37',e);
 assert.match(vm.runInContext('sheetHTML()',e),/Pointure épuisée/);
});
test('panier mixte à 749, trois AS à 799',()=>{
 const e=client();vm.runInContext('S.cart=[{id:"as",c:"camel",s:39,q:1},{id:"opus",c:"noir",s:39,q:2}]',e);
 assert.equal(vm.runInContext('cartSub()',e),749);assert.equal(vm.runInContext('cartPricing().discount',e),108);
 vm.runInContext('S.cart=[{id:"as",c:"noir",s:41,q:3}]',e);assert.equal(vm.runInContext('cartSub()',e),799);
});
test('Apps Script : AS accepté à 299, prix client falsifié ignoré, total incohérent refusé',()=>{
 const e=apps();e.input={items:[{id:'as',colorKey:'chocolat',size:39,q:2,unit:1}],customer:{name:'Test local',phone:'0600000000',email:'test@example.invalid',addr:'Adresse test',city:'Fès',country:'Maroc'},expectedTotal:598};
 e.input=JSON.stringify(e.input);const r=vm.runInContext('construireCommande(JSON.parse(input))',e);assert.equal(r.commande.total,598);assert.equal(r.commande.lignes[0].prix,299);
 e.input=JSON.stringify({...JSON.parse(e.input),expectedTotal:2});assert.ok(vm.runInContext('construireCommande(JSON.parse(input)).erreur',e));
});
test('migration AS : conserve les lignes existantes et les ventes, deuxième passage sans écriture',()=>{
 const e=apps();const rows=[['Opus','Noir','noir',1,2,3,4,5,''],['AS by BENKA','Camel','camel',8,7,5,5,3,'']];let writes=0,released=0;
 const sheet={getLastRow:()=>rows.length+1,getRange(r,c,h=1,w=1){return {getValues:()=>rows.slice(r-2,r-2+h).map(row=>row.slice(c-1,c-1+w)),setValues(v){writes++;v.forEach((row,i)=>{rows[r-2+i]=row.slice()});return this},setFormula(){return this},getA1Notation:()=>`D${r}:H${r}`}}};
 e.feuilleStock=()=>sheet;e.habillerStock=()=>{};e.CacheService={getScriptCache:()=>({remove(){}})};e.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){released++}})};
 assert.equal(vm.runInContext('installerCollectionAS()',e),3);assert.equal(rows[0][3],1);assert.equal(rows[1][3],8);assert.equal(writes,3);
 assert.deepEqual(Array.from(rows.find(row=>row[2]==='noir'&&row[0]==='AS by BENKA').slice(3,8)),[12,12,12,12,12]);
 for(const color of ['cognac','chocolat'])assert.deepEqual(Array.from(rows.find(row=>row[2]===color).slice(3,8)),[6,6,6,6,6]);
 assert.equal(vm.runInContext('installerCollectionAS()',e),0);assert.equal(writes,3);assert.equal(released,2);
});
