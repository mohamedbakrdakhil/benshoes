const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const showroom = fs.readFileSync('src/pages/showroom.html', 'utf8');
const catalogue = fs.readFileSync('src/scripts/02-catalogue.js', 'utf8');
const scene = fs.readFileSync('src/scripts/12-visite.js', 'utf8');
const interactions = fs.readFileSync('src/scripts/14-evenements.js', 'utf8');

test('la façade expose deux liens de vraies paires, avec leurs photos exactes', () => {
  const liens = [...showroom.matchAll(/<a class="riad-side [^"]+" href="([^"]+)" data-act="open" data-id="([^"]+)" data-c="([^"]+)"[^>]*><img src="([^"]+)"/g)];
  assert.deepEqual(liens.map(m => [m[2], m[3]]), [['opus', 'tabac'], ['as', 'camel']]);
  for (const [, href, id, couleur, image] of liens) {
    assert.equal(href, '/collection/#' + id + '-' + couleur);
    assert.ok(fs.existsSync(image));
    assert.ok(image.includes('niche-' + (id === 'as' ? 'as-' : '') + couleur + '-'));
  }
});

test('les douze alcôves du riad ouvrent le même modèle et coloris que leur image', () => {
  const ctx = vm.createContext({att: String, riadNicheSVG: () => ''});
  vm.runInContext(catalogue, ctx);
  vm.runInContext(scene.slice(scene.indexOf('function photoNiche('), scene.indexOf('const PLANS=')), ctx);
  for (const riche of [true, false]) {
    ctx.RICHE = riche;
    ctx.K = riche ? 1 : .5;
    const niches = vm.runInContext('CATALOG.flatMap(p => p.colors.map(c => [p.id,c,niche(p,0,10,10,0,true,c)]))', ctx);
    assert.equal(niches.length, 12);
    for (const [id, color, html] of niches) {
      assert.ok(html.includes('data-act="open" data-id="' + id + '" data-c="' + color + '"'));
      assert.ok(html.includes('niche-' + (id === 'as' ? 'as-' : '') + color + '-380.'));
    }
  }
});

function navigation(pathname = '/showroom/', hash = '#visite') {
  const location = {pathname, hash, search: '?lang=fr'};
  const entries = [{hash, state: null}];
  const history = {
    get state() { return entries.at(-1).state; },
    pushState(state, _, url) { location.hash = url; entries.push({hash: url, state}); },
    replaceState(state, _, url) { location.hash = url.startsWith('#') ? url : ''; entries[entries.length - 1] = {hash: location.hash, state}; },
    back() { entries.pop(); location.hash = entries.at(-1).hash; },
  };
  const ctx = vm.createContext({location, history});
  vm.runInContext(catalogue + '\nfunction prod(id){return CATALOG.find(p=>p.id===id);}', ctx);
  vm.runInContext(interactions.slice(interactions.indexOf('function depuisLien('), interactions.indexOf('let ancienAdmin=')), ctx);
  return {ctx, entries, location};
}

test('un seul retour ferme la fiche du showroom, même après un changement de coloris', () => {
  const {ctx, entries, location} = navigation();
  vm.runInContext("poserLien('#as-camel');poserLien('#as-noir');", ctx);
  assert.equal(location.hash, '#riad-as-noir');
  assert.equal(entries.length, 2);
  assert.equal(vm.runInContext('depuisLien().c', ctx), 'noir');
  vm.runInContext("poserLien('');", ctx);
  assert.equal(location.hash, '#visite');
  assert.equal(entries.length, 1);
});

test('une fiche du showroom ouverte directement se ferme sur la même page et valide le coloris', () => {
  const {ctx, location} = navigation('/showroom/index.html', '#riad-opus-tabac');
  assert.equal(vm.runInContext('depuisLien().id', ctx), 'opus');
  vm.runInContext("poserLien('')", ctx);
  assert.equal(location.hash, '');
  location.hash = '#riad-opus-inconnu';
  assert.equal(vm.runInContext('depuisLien()', ctx), null);
  const collection = navigation('/collection/', '#opus-tabac');
  assert.equal(vm.runInContext('depuisLien().c', collection.ctx), 'tabac');
  collection.location.hash = '#riad-opus-tabac';
  assert.equal(vm.runInContext('depuisLien()', collection.ctx), null);
});
