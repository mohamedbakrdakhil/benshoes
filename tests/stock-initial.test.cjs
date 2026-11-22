const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {prixBlackFriday} = require('../src/scripts/02b-black-friday-prix.js');

const expectedAS = {
  camel: [6,6,6,6,6], cognac: [6,6,6,6,6],
  noir: [12,12,12,12,12], chocolat: [6,6,6,6,6]
};
const server = fs.readFileSync('server.js', 'utf8');
function json(env, expression) {
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, env));
}
function serverEnv() {
  const env = vm.createContext({
    prixBlackFriday,
    str: (v, n) => String(v || '').slice(0, n),
    newRef: () => 'TEST-STOCK'
  });
  // Vraies fonctions de stock/commande, sans démarrage HTTP ni fichier de données.
  vm.runInContext(server.slice(server.indexOf('const SIZES ='), server.indexOf('async function load()')), env);
  vm.runInContext(server.slice(server.indexOf('function buildOrder('), server.indexOf('/* ---------- fichiers statiques')), env);
  vm.runInContext('db.catalog = defaultCatalog()', env);
  return env;
}

test('AS du 22 novembre : site, Apps Script et nouveau catalogue Node partagent les 150 paires initiales', () => {
  const site = vm.createContext({});
  vm.runInContext(fs.readFileSync('src/scripts/02-catalogue.js', 'utf8'), site);
  const apps = vm.createContext({});
  vm.runInContext(fs.readFileSync('integrations/tableur.gs', 'utf8'), apps);
  const node = serverEnv();
  assert.deepEqual(json(site, 'CATALOG.find(p => p.id === "as").stock'), expectedAS);
  assert.deepEqual(json(apps, 'STOCK_DEPART.as'), expectedAS);
  assert.deepEqual(json(node, 'defaultCatalog().stock.as'), expectedAS);
  for (const [env, price] of [[site, 'CATALOG.find(p => p.id === "as").price'], [apps, 'CATALOGUE.as.prix'], [node, 'SEED.as.price']]) {
    assert.equal(vm.runInContext(price, env), 299);
  }
});

test('Node : grille initiale indépendante et ancien stock enregistré préservé, y compris les ruptures', () => {
  const env = serverEnv();
  vm.runInContext('const fresh = grilleSeed("as"); fresh.noir[0] = 0; fresh.camel[0] = 2;', env);
  assert.deepEqual(json(env, 'grilleSeed("as")'), expectedAS);
  vm.runInContext('db.catalog.stock.as = {noir:[0,1,2,3,4],camel:[1,0,2,0,3]};', env);
  assert.deepEqual(json(env, 'grille("as")'), {noir:[0,1,2,3,4],camel:[1,0,2,0,3]});
  vm.runInContext('db.catalog.stock.as = [0,1,2,3,4];', env);
  const legacy = json(env, 'grille("as")');
  for (const color of Object.keys(expectedAS)) assert.deepEqual(legacy[color], [0,1,2,3,4]);
});

test('Node : une vente AS retire la bonne pointure et le repli des autres coloris respecte Noir 12 / autres 6', () => {
  const env = serverEnv();
  vm.runInContext('db.catalog.stock.as = {camel:[6,6,6,6,6],chocolat:[0,0,0,0,0]};', env);
  env.input = {items:[{id:'as',colorKey:'camel',size:37,q:3}],customer:{name:'Test local'}};
  const result = json(env, 'buildOrder(input, "atelier")');
  assert.equal(result.order.total, 897);
  assert.deepEqual(json(env, 'db.catalog.stock.as'), {
    camel:[3,6,6,6,6], cognac:[6,6,6,6,6],
    noir:[12,12,12,12,12], chocolat:[0,0,0,0,0]
  });
  assert.deepEqual(json(env, 'grilleSeed("as")'), expectedAS);
});
