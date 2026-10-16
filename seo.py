# -*- coding: utf-8 -*-
"""Les données structurées, fabriquées depuis le catalogue du site.

Deux raisons de les générer plutôt que de les écrire à la main :

1. Un prix recopié dans un bloc JSON-LD vieillit en silence. Google continue
   d'annoncer 299 DH longtemps après que la boutique est passée à 320, et
   c'est le genre d'écart qui fait retirer les résultats enrichis. Ici le prix
   vient de la même ligne que celui affiché sur la page.

2. Les variantes du nom (benka, benka shoes, benkashoes…) doivent être
   déclarées au même endroit que le reste, sinon on en oublie une.

Lu depuis src/scripts/02-catalogue.js et 01-reglages.js, écrit dans
.build/seo.json, injecté par build.sh.
"""
import io, json, re, sys, datetime

URL = 'https://www.benkashoes.ma/'
ORG = URL + '#organisation'

# Les façons dont on écrit la marque. Ce ne sont pas des mots-clés jetés en
# vrac : ce sont les orthographes réelles sous lesquelles une cliente peut
# chercher l'atelier, et c'est ce qui permet à Google de les rattacher toutes
# à la même entité.
NOMS = ['Benka', 'benka', 'Benka Shoes', 'BenkaShoes', 'Benkashoes Maroc',
        'Atelier Benkashoes', 'Benka chaussures', 'Benka Fès']


def deslash(s):
    """Les chaînes du catalogue portent des échappements \\u2019 et \\'."""
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')


def lire_catalogue(p='src/scripts/02-catalogue.js'):
    s = io.open(p, encoding='utf-8').read()

    couleurs = dict(re.findall(r"(\w+):\{n:'([^']*)'", s))

    tailles = re.search(r'const SIZES=\[([\d,\s]*)\]', s)
    tailles = [t.strip() for t in tailles.group(1).split(',') if t.strip()] if tailles else []

    liv = re.search(r'const SHIPFREE=(\d+),\s*SHIPCOST=(\d+)', s)
    liv = (int(liv.group(1)), int(liv.group(2))) if liv else None

    produits = []
    for m in re.finditer(
            r"\{id:'(\w+)'.*?name:'([^']*)',sub:'([^']*)'.*?price:(\d+),\s*\n?\s*"
            r"colors:\[([^\]]*)\],\s*\n?\s*stock:\[([\d,\s]*)\].*?blurb:\"(.*?)\",\s*\n?\s*spec:",
            s, re.S):
        produits.append({
            'id':   m.group(1),
            'nom':  m.group(2),
            'sous': m.group(3),
            'prix': int(m.group(4)),
            'coloris': [couleurs.get(c, c) for c in re.findall(r"'(\w+)'", m.group(5))],
            'stock': sum(int(x) for x in m.group(6).split(',') if x.strip()),
            'texte': deslash(m.group(7)),
        })

    faq = []
    bloc = re.search(r'const FAQ=\[(.*?)\n\];', s, re.S)
    if bloc:
        for m in re.finditer(r"\['(.*?)',\s*\n?\s*\"(.*?)\"\]", bloc.group(1), re.S):
            faq.append((deslash(m.group(1)), deslash(m.group(2))))

    return produits, faq, tailles, liv


def lire_reglages(p='src/scripts/01-reglages.js'):
    s = io.open(p, encoding='utf-8').read()
    def champ(n):
        m = re.search(n + r":\s*'([^']*)'", s)
        return m.group(1) if m else ''
    # Les réseaux sociaux, quand ils existent, sont le signal le plus fort
    # pour rattacher le site à la marque. Déclarés dans SHOP.reseaux.
    res = re.search(r'reseaux:\s*\[([^\]]*)\]', s)
    res = re.findall(r"'([^']+)'", res.group(1)) if res else []
    return champ('email'), champ('phone'), res


def graphe(produits, faq, tailles, liv, email, tel, reseaux, desc):
    fin = (datetime.date.today() + datetime.timedelta(days=365)).isoformat()

    org = {
        '@type': 'Organization', '@id': ORG,
        'name': 'Benkashoes', 'alternateName': NOMS, 'url': URL,
        'description': desc,
        # Le logo, et non l'image de partage : Google veut ici la marque sur
        # fond plein, et c'est elle qu'il montre dans l'encadré à droite des
        # résultats. L'image de partage, qui est une photo, reste en og:image.
        'logo': {'@type': 'ImageObject',
                 'url': URL + 'assets/marque/benka-carre.png',
                 'width': 600, 'height': 600},
        'image': URL + 'assets/marque/partage-1200x630.jpg',
        'foundingDate': '2019',
        'knowsLanguage': ['fr', 'ar'],
        'address': {'@type': 'PostalAddress', 'addressCountry': 'MA'},
        'areaServed': {'@type': 'Country', 'name': 'Maroc'},
    }
    if email:
        org['email'] = email
        org['contactPoint'] = {'@type': 'ContactPoint', 'email': email,
                               'contactType': 'customer service',
                               'areaServed': 'MA', 'availableLanguage': ['fr', 'ar']}
    if tel:
        org['telephone'] = tel
    if reseaux:
        org['sameAs'] = reseaux

    site = {
        '@type': 'WebSite', '@id': URL + '#site', 'url': URL,
        'name': 'Benkashoes', 'alternateName': NOMS,
        'inLanguage': 'fr-MA', 'publisher': {'@id': ORG},
    }

    boutique = {
        '@type': 'ShoeStore', '@id': URL + '#boutique',
        'name': 'Benkashoes', 'alternateName': NOMS, 'url': URL,
        'description': desc, 'image': URL + 'assets/marque/partage-1200x630.jpg',
        'parentOrganization': {'@id': ORG},
        'currenciesAccepted': 'MAD',
        'priceRange': '%d-%d MAD' % (min(p['prix'] for p in produits),
                                     max(p['prix'] for p in produits)),
        'paymentAccepted': 'Paiement à la livraison, virement',
        'address': {'@type': 'PostalAddress', 'addressCountry': 'MA'},
        'areaServed': {'@type': 'Country', 'name': 'Maroc'},
        'openingHours': 'Mo-Fr 09:00-18:00',
    }

    livraison = None
    if liv:
        offerte, prix = liv
        livraison = {
            '@type': 'OfferShippingDetails',
            'shippingRate': {'@type': 'MonetaryAmount', 'value': prix,
                             'currency': 'MAD'},
            'shippingDestination': {'@type': 'DefinedRegion',
                                    'addressCountry': 'MA'},
            'deliveryTime': {'@type': 'ShippingDeliveryTime',
                             'handlingTime': {'@type': 'QuantitativeValue',
                                              'minValue': 0, 'maxValue': 2,
                                              'unitCode': 'DAY'},
                             'transitTime': {'@type': 'QuantitativeValue',
                                             'minValue': 1, 'maxValue': 4,
                                             'unitCode': 'DAY'}},
        }

    items = []
    for p in produits:
        offre = {
            '@type': 'Offer', '@id': URL + '#offre-' + p['id'],
            'url': URL + '#modeles',
            'priceCurrency': 'MAD', 'price': p['prix'],
            'priceValidUntil': fin,
            'itemCondition': 'https://schema.org/NewCondition',
            'availability': ('https://schema.org/InStock' if p['stock'] > 0
                             else 'https://schema.org/OutOfStock'),
            'seller': {'@id': ORG},
        }
        if livraison:
            offre['shippingDetails'] = livraison
        items.append({
            '@type': 'Product', '@id': URL + '#produit-' + p['id'],
            'name': 'Benkashoes %s — %s' % (p['nom'], p['sous'].lower()),
            'alternateName': ['%s %s' % (n, p['nom']) for n in ('Benka', 'Benkashoes')],
            'sku': p['id'], 'description': p['texte'],
            'brand': {'@type': 'Brand', 'name': 'Benkashoes'},
            'manufacturer': {'@id': ORG},
            'category': 'Chaussures > Mocassins-mules',
            'material': 'Daim de veau, première en liège, doublure cuir',
            'color': p['coloris'], 'size': tailles,
            'image': URL + 'assets/marque/partage-1200x630.jpg',
            'offers': offre,
        })

    g = [org, site, boutique] + items
    if faq:
        g.append({'@type': 'FAQPage', '@id': URL + '#questions',
                  'inLanguage': 'fr-MA',
                  'mainEntity': [{'@type': 'Question', 'name': q,
                                  'acceptedAnswer': {'@type': 'Answer', 'text': r}}
                                 for q, r in faq]})
    return {'@context': 'https://schema.org', '@graph': g}


def echap(t):
    return (t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;'))


def repli_html(produits, tailles, liv):
    """Le catalogue en texte, pour qui n'exécute pas de script.

    Ce n'est pas une version appauvrie destinée aux robots : c'est ce que voit
    un visiteur dont le navigateur a coupé JavaScript, et il doit y trouver la
    même chose — le modèle, son prix, ses cuirs, les pointures.
    """
    li = []
    for p in produits:
        li.append(
            '<li><h3>Benkashoes %s — %s</h3>'
            '<p><strong>%d DH</strong> · pointures %s · %s</p>'
            '<p>%s</p>'
            '<p>Cuirs : %s.</p></li>' % (
                echap(p['nom']), echap(p['sous'].lower()), p['prix'],
                '%s à %s' % (tailles[0], tailles[-1]) if tailles else '37 à 41',
                'en stock' if p['stock'] > 0 else 'momentanément épuisé',
                echap(p['texte']), echap(', '.join(p['coloris']))))
    port = ''
    if liv:
        port = ('<p>Livraison au Maroc %d DH, offerte à partir de %d DH '
                'd\'achat.</p>' % (liv[1], liv[0]))
    return ('<noscript><div class="repli-catalogue">'
            '<ul>%s</ul>%s</div></noscript>' % (''.join(li), port))


def main():
    desc = sys.argv[1] if len(sys.argv) > 1 else ''
    produits, faq, tailles, liv = lire_catalogue()
    if not produits:
        sys.stderr.write('seo : catalogue illisible, données structurées non générées\n')
        return 1
    email, tel, reseaux = lire_reglages()
    d = graphe(produits, faq, tailles, liv, email, tel, reseaux, desc)
    io.open('.build/seo.json', 'w', encoding='utf-8').write(
        json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    io.open('.build/catalogue-repli.html', 'w', encoding='utf-8').write(
        repli_html(produits, tailles, liv))
    print('  données structurées  %d produits, %d questions%s'
          % (len(produits), len(faq),
             '' if reseaux else ', aucun réseau social déclaré'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
