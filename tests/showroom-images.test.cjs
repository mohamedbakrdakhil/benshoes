const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/scripts/12-visite.js','utf8');
function env(){const e=vm.createContext({att:s=>String(s),visuel:(p,c)=>`<img src="assets/${p.id}-${c}.jpg" loading="lazy">`});vm.runInContext(fs.readFileSync('src/scripts/02-catalogue.js','utf8'),e);const a=source.indexOf('function photoNiche('),b=source.indexOf('function niche(',a);vm.runInContext(source.slice(a,b),e);return e;}
test('showroom : chaque image et chaque variante responsive existe pour tous les modèles et coloris',()=>{
 const e=env(),products=vm.runInContext('CATALOG',e);
 for(const p of products)for(const c of p.colors){e.product=p;e.color=c;const html=vm.runInContext('photoNiche(product,color)',e);
  const src=html.match(/src="([^"]+)"/)[1];assert.ok(fs.existsSync(src),`${p.id}/${c}: ${src}`);
  const srcset=html.match(/srcset="([^"]+)"/)[1];for(const candidate of srcset.split(',')){const path=candidate.trim().split(' ')[0];assert.ok(fs.existsSync(path),`${p.id}/${c}: ${path}`)}
  assert.match(html,/loading="eager"/);
 }
});
test('showroom : le Noir AS utilise sa propre photo, distincte du Noir Opus',()=>{
 const e=env();const as=vm.runInContext('photoNiche(CATALOG.find(p=>p.id==="as"),"noir")',e),opus=vm.runInContext('photoNiche(CATALOG.find(p=>p.id==="opus"),"noir")',e);
 assert.match(as,/niche-as-noir-960\.png/);assert.doesNotMatch(as,/niche-noir-380\.png/);assert.match(opus,/niche-noir-380\.png/);
});
test('showroom : un modèle sans découpe dédiée conserve sa vraie photo produit',()=>{
 const e=env();const html=vm.runInContext('photoNiche({id:"nouveau",name:"Nouveau"},"camel")',e);
 assert.match(html,/assets\/nouveau-camel\.jpg/);assert.match(html,/loading="eager"/);assert.doesNotMatch(html,/niche-camel/);
});
