const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const scripts = ['02-catalogue.js', '04-outils.js', '21-reassort.js']
  .map(name => fs.readFileSync('src/scripts/' + name, 'utf8')).join('\n');

function fiche(form) {
  const context = vm.createContext({URL, SHOP: {email: 'atelier@example.invalid', reassortForm: form}});
  vm.runInContext(scripts, context);
  const state = vm.runInContext('S', context);
  state.ov.stock = {
    as: {noir: [1, 0, 2, 0, 3], camel: [2, 2, 2, 2, 2]},
    opus: {taupe: [0, 1, 0, 1, 1]}
  };
  return (model, color) => {
    context.model = model;
    context.color = color;
    return vm.runInContext('restockLink(prod(model), color)', context);
  };
}

function liens(html) {
  return [...html.matchAll(/<a href="([^"]+)"/g)]
    .map(match => new URL(match[1].replaceAll('&amp;', '&')));
}

test('fiche : aucun appel à inscription quand les cinq tailles du coloris sont en stock', () => {
  const render = fiche();
  assert.equal(render('as', 'camel'), '');
});

test('fiche : le formulaire Google préremplit exclusivement les pointures épuisées et le bon coloris', () => {
  const render = fiche({
    url: 'https://docs.google.com/forms/d/e/EXEMPLE/viewform?usp=pp_url&entry.987=ValeurInitiale',
    field: 'entry.987'
  });
  const html = render('opus', 'taupe');
  const destinations = liens(html);
  assert.deepEqual(destinations.map(url => url.searchParams.getAll('entry.987')), [
    ['Opus · Marron taupe · 37'], ['Opus · Marron taupe · 39']
  ]);
  for (const url of destinations) {
    assert.equal(url.origin + url.pathname, 'https://docs.google.com/forms/d/e/EXEMPLE/viewform');
    assert.equal(url.searchParams.get('usp'), 'pp_url');
    assert.deepEqual([...url.searchParams.keys()].sort(), ['entry.987', 'usp']);
  }
  assert.match(html, /aria-label="Demander une alerte pour Opus · Marron taupe · 39"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('fiche : en mode messagerie, chaque demande contient la variante exacte sans envoi automatique', () => {
  const render = fiche(null);
  const html = render('as', 'noir');
  const destinations = liens(html);
  assert.equal(destinations.length, 2);
  for (const [i, taille] of [38, 40].entries()) {
    const url = destinations[i];
    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, 'atelier@example.invalid');
    const variante = 'AS by BENKA · Noir · ' + taille;
    assert.ok(url.searchParams.get('subject').includes(variante));
    assert.ok(url.searchParams.get('body').includes(variante));
  }
  assert.match(html, /envoyez la demande de réassort à l’atelier depuis votre messagerie/);
});
