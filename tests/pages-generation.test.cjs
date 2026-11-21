const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.benkashoes.ma';
const PAGES = [
  {route: '/', file: 'index.html'},
  {route: '/collection/', file: 'collection/index.html'},
  {route: '/showroom/', file: 'showroom/index.html'},
  {route: '/maison/', file: 'maison/index.html'},
  {route: '/aide/', file: 'aide/index.html'},
];

function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named = {'&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>'};
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    return String.fromCodePoint(entity[2].toLowerCase() === 'x'
      ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10));
  });
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function documentFor(page, destination = '') {
  const file = path.join(ROOT, destination, page.file);
  assert.ok(fs.existsSync(file), `${file} doit être généré par npm run build`);
  const html = fs.readFileSync(file, 'utf8');
  // Templates in JavaScript and CSS are not elements in the delivered page.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const elements = [...markup.matchAll(/<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi)]
    .map(match => ({tag: match[1].toLowerCase(), attrs: attributes(match[2])}));
  const ids = elements.filter(element => 'id' in element.attrs).map(element => element.attrs.id);
  return {...page, html, elements, ids: new Set(ids), allIds: ids, destination};
}

function pagesFor(destination) {
  return PAGES.map(page => documentFor(page, destination));
}

for (const destination of ['', 'public']) {
  const label = destination || 'GitHub Pages';

  test(`${label} : l’accueil présente la marque, les autres pages livrent seulement leur contenu`, () => {
    const [home, collection, showroom, maison, aide] = pagesFor(destination);
    const has = (page, ids) => ids.forEach(id => assert.ok(page.ids.has(id), `${page.route} : #${id} absent`));
    const lacks = (page, ids) => ids.forEach(id => assert.ok(!page.ids.has(id), `${page.route} contient encore #${id}`));
    lacks(home, ['grid', 'as-grid', 'modeles', 'as-by-benka', 'packs', 'visite', 'world', 'sizebody', 'anatfig', 'attrack']);
    assert.ok(home.elements.some(el => el.tag === 'a' && el.attrs.href === '/collection/'));
    assert.ok(home.elements.some(el => el.tag === 'a' && el.attrs.href === '/showroom/'));
    has(collection, ['grid', 'as-grid', 'modeles', 'as-by-benka', 'packs']);
    lacks(collection, ['visite', 'world', 'anatfig', 'attrack', 'sizebody']);
    has(showroom, ['visite', 'world', 'showroom-stage', 'showroom-start', 'showroom-close']);
    lacks(showroom, ['grid', 'as-grid', 'packs', 'anatfig', 'sizebody']);
    has(maison, ['liege', 'anatfig', 'atelier', 'attrack']);
    lacks(maison, ['grid', 'as-grid', 'packs', 'visite', 'sizebody']);
    has(aide, ['tailles', 'sizebody', 'commander', 'faq', 'faqlist']);
    lacks(aide, ['grid', 'as-grid', 'packs', 'visite', 'anatfig']);
  });

  test(`${label} : chaque page a son titre, son URL canonique et une structure accessible complète`, () => {
    const titles = new Set();
    for (const page of pagesFor(destination)) {
      const canonical = page.elements.filter(el => el.tag === 'link' && el.attrs.rel === 'canonical');
      assert.equal(canonical.length, 1, `${page.route} : une seule URL canonique`);
      assert.equal(canonical[0].attrs.href, ORIGIN + page.route);
      const ogUrl = page.elements.find(el => el.tag === 'meta' && el.attrs.property === 'og:url');
      assert.equal(ogUrl?.attrs.content, ORIGIN + page.route);
      const title = decode(page.html.match(/<title>([^<]+)<\/title>/i)?.[1] || '');
      assert.match(title, /Benka/i, `${page.route} : titre de marque absent`);
      assert.ok(!titles.has(title), `${page.route} : titre dupliqué`);
      titles.add(title);
      assert.equal(page.elements.filter(el => el.tag === 'h1').length, 1, `${page.route} : un seul H1 réel`);
      assert.equal(page.allIds.length, page.ids.size, `${page.route} : identifiants HTML dupliqués`);
      assert.ok(!page.ids.has(''), `${page.route} : identifiant vide`);
      for (const id of ['contenu', 'shopview', 'top', 'nav', 'navmob', 'menubtn', 'cartbtn', 'cartcount', 'admview', 'overlays']) {
        assert.ok(page.ids.has(id), `${page.route} : élément partagé #${id} absent`);
      }
      for (const element of page.elements) {
        for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for']) {
          for (const id of (element.attrs[attribute] || '').split(/\s+/).filter(Boolean)) {
            assert.ok(page.ids.has(id), `${page.route} : ${attribute} référence #${id} absent`);
          }
        }
      }
      assert.ok(!page.elements.some(el => el.tag === 'base'), 'Les chemins doivent fonctionner sans <base>');
      assert.doesNotMatch(page.html, /@@(?:PAGE|ROUTE|CATALOGUE|CSP)@@/);
    }
  });

  test(`${label} : les liens internes mènent à une page et une ancre existantes`, () => {
    const pages = pagesFor(destination);
    const routes = new Map(pages.map(page => [page.route, page]));
    for (const page of pages) {
      for (const element of page.elements.filter(el => ['a', 'area'].includes(el.tag) && el.attrs.href)) {
        const href = element.attrs.href;
        const url = new URL(href, ORIGIN + page.route);
        if (url.origin !== ORIGIN) continue;
        const target = routes.get(url.pathname);
        assert.ok(target, `${page.route} : ${href} cible une page absente`);
        const id = decodeURIComponent(url.hash.slice(1));
        if (!id) continue;
        // The administration drawer is a shared JavaScript route, not a section.
        if (id === 'admin') assert.ok(target.ids.has('admview'));
        else assert.ok(target.ids.has(id), `${page.route} : ${href} cible #${id} absent de ${target.route}`);
      }
    }
  });

  test(`${label} : les ressources locales restent accessibles depuis toutes les routes`, () => {
    for (const page of pagesFor(destination)) {
      const resources = [];
      for (const element of page.elements) {
        for (const attribute of ['src', 'poster']) {
          if (element.attrs[attribute]) resources.push(element.attrs[attribute]);
        }
        for (const attribute of ['srcset', 'imagesrcset']) {
          if (element.attrs[attribute]) resources.push(...element.attrs[attribute].split(',').map(item => item.trim().split(/\s+/)[0]));
        }
        if (element.tag === 'link' && /^(preload|stylesheet|icon)$/.test(element.attrs.rel || '')) {
          resources.push(element.attrs.href);
        }
      }
      const styles = [...page.html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(match => match[1]);
      styles.push(...page.elements.map(element => element.attrs.style || ''));
      for (const css of styles) {
        for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) resources.push(match[1]);
      }
      for (const resource of resources.filter(Boolean)) {
        if (/^(?:data:|https?:|#)/i.test(resource)) continue;
        assert.ok(resource.startsWith('/assets/'), `${page.route} : ressource relative ${resource}`);
        const url = new URL(resource, ORIGIN);
        const local = path.join(ROOT, destination, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
        assert.ok(fs.existsSync(local), `${page.route} : ressource absente ${resource}`);
      }
      // Also cover URL strings used by lazy images and dynamically loaded scripts.
      assert.doesNotMatch(page.html, /["'`(=\s]assets\//, `${page.route} : chemin assets/ non réécrit`);
    }
  });

  test(`${label} : la CSP scelle les scripts réellement livrés après réécriture des URL`, () => {
    for (const page of pagesFor(destination)) {
      const policy = page.elements.find(el => el.tag === 'meta' && el.attrs['http-equiv']?.toLowerCase() === 'content-security-policy');
      assert.ok(policy, `${page.route} : CSP absente`);
      const directive = policy.attrs.content.split(';').map(value => value.trim()).find(value => value.startsWith('script-src '));
      assert.ok(directive, `${page.route} : script-src absent`);
      assert.doesNotMatch(directive, /'unsafe-inline'/);
      const declared = new Set(directive.match(/'sha256-[^']+'/g) || []);
      const actual = new Set();
      for (const match of page.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        const attrs = attributes(match[1]);
        if ('src' in attrs || /^application\/(?:ld\+)?json$/i.test(attrs.type || '')) continue;
        actual.add(`'sha256-${createHash('sha256').update(match[2], 'utf8').digest('base64')}'`);
      }
      assert.ok(actual.size > 0, `${page.route} : aucun script d’initialisation`);
      assert.deepEqual(declared, actual, `${page.route} : empreintes CSP périmées ou manquantes`);
    }
  });
}
