const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function boutique(motion=true){
  const scripts=[];let builds=0,cleanups=0;
  function el(){const events={},classes=new Set();return {events,hidden:false,disabled:false,dataset:{},textContent:'',
    style:{},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)},
    addEventListener:(k,f)=>events[k]=f,setAttribute(){},removeAttribute(){},
    scrollIntoView(){},focus(){},replaceChildren(){this.children=[];},children:[]};}
  const section=el(),stage=el(),button=el(),close=el(),cover=el(),status=el(),world=el();
  stage.hidden=true;button.hidden=true;section.dataset.showroomActive='false';section.querySelector=()=>cover;
  const elements={'#visite':section,'#showroom-stage':stage,'#showroom-start':button,'#showroom-close':close,'#showroom-status':status,'#world':world};
  const ctx=vm.createContext({MOTION:motion,SHOWROOM_SOURCE:'assets/js/showroom-test.js',$:id=>elements[id],
    document:{createElement(){return {remove(){this.removed=true;}};},head:{appendChild:s=>scripts.push(s)}},
    mesurer(){},reveiller(){},console:{warn(){}},initVisite(){builds++;world.children=[1,2,3];return ()=>cleanups++;}});
  vm.runInContext(fs.readFileSync('src/scripts/12a-showroom-demande.js','utf8'),ctx);
  vm.runInContext('initShowroomDemande()',ctx);
  return {scripts,section,stage,button,close,cover,status,world,get builds(){return builds;},get cleanups(){return cleanups;}};
}
test('arriver au showroom ne charge pas la 3D; un clic la charge une fois et la fermeture libère la scène',async()=>{
 const h=boutique();assert.equal(h.scripts.length,0);assert.equal(h.stage.hidden,true);
 const opening=h.button.events.click();assert.equal(h.scripts.length,1);assert.equal(h.button.disabled,true);
 await h.button.events.click();assert.equal(h.scripts.length,1);
 h.scripts[0].onload();await opening;
 assert.equal(h.builds,1);assert.equal(h.stage.hidden,false);assert.equal(h.cover.hidden,true);
 h.close.events.click();assert.equal(h.cleanups,1);assert.equal(h.stage.hidden,true);assert.equal(h.world.children.length,0);
 await h.button.events.click();assert.equal(h.scripts.length,1);assert.equal(h.builds,2);
 h.section.events['benka:showroomclose']();assert.equal(h.cleanups,2);assert.equal(h.section.dataset.showroomActive,'false');
});
test('un échec réseau laisse la collection disponible et permet de réessayer',async()=>{
 const h=boutique();const opening=h.button.events.click();h.scripts[0].onerror();await opening;
 assert.equal(h.cover.hidden,false);assert.equal(h.stage.hidden,true);assert.equal(h.button.disabled,false);assert.ok(h.status.textContent);
 const retry=h.button.events.click();assert.equal(h.scripts.length,2);h.scripts[1].onload();await retry;assert.equal(h.builds,1);
});
test('mouvement réduit : le showroom reste un aperçu léger',()=>{
 const h=boutique(false);assert.equal(h.scripts.length,0);assert.equal(h.button.hidden,true);assert.equal(h.stage.hidden,true);
});
test('la page livrée sépare le code 3D du JavaScript du panier et sert un module existant',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.doesNotMatch(html,/function buildWorld\(/);
 const source=html.match(/const SHOWROOM_SOURCE='([^']+)'/)[1];assert.ok(fs.existsSync(source));
 assert.match(fs.readFileSync(source,'utf8'),/function buildWorld\(/);
 assert.match(html,/function initShowroomDemande\(/);assert.match(html,/function nettoyerPanier\(/);
});
