const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('src/scripts/00b-pages.js','utf8');
function visit(pathname,hash,search=''){
  const redirects=[];
  const context={location:{pathname,hash,search,replace:url=>redirects.push(url)}};
  vm.runInNewContext(code,context);
  return redirects;
}
test('les liens des publicités conservent produit et paramètres de campagne',()=>{
  assert.deepEqual(visit('/','#as-camel','?utm_source=annonce&gclid=exemple'),['/collection/?utm_source=annonce&gclid=exemple#as-camel']);
  assert.deepEqual(visit('/index.html','#opus-noir'),['/collection/#opus-noir']);
});
test('les anciens favoris arrivent sur la bonne page sans boucle',()=>{
  for(const [hash,path] of [['#modeles','/collection/'],['#packs','/collection/'],['#visite','/showroom/'],['#atelier','/maison/'],['#tailles','/aide/']]){
    assert.deepEqual(visit('/',hash),[path+hash]);
    assert.deepEqual(visit(path,hash),[]);
    assert.deepEqual(visit(path+'index.html',hash),[]);
  }
});
test('les ancres partagées et l’espace commandes restent sur leur page',()=>{
  for(const hash of ['','#top','#contenu','#ftrcontact','#admin','#inconnu'])assert.deepEqual(visit('/collection/',hash),[]);
});
