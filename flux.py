# -*- coding: utf-8 -*-
"""Écrit flux-meta.csv : le catalogue, dans la forme que Meta sait lire.

C'est ce fichier qui permet les publicités dynamiques — celles qui
remontrent à une visiteuse LA paire qu'elle a regardée — et la boutique
Instagram. Meta le relit tout seul, tous les jours, à son adresse publique.

Une ligne par coloris, pas par pointure : c'est le coloris qu'on choisit
dans une publicité, la pointure se règle sur la fiche. L'identifiant est le
même que celui envoyé par le pixel (refMeta), sans quoi Meta ne pourrait pas
rapprocher la vue de l'article.

Appelé par build.sh.
"""
import csv, io, os, re, sys

SITE   = (sys.argv[1] if len(sys.argv) > 1 else 'https://www.benkashoes.ma/').rstrip('/') + '/'
CAT    = 'src/scripts/02-catalogue.js'
SORTIE = 'flux-meta.csv'

s = io.open(CAT, encoding='utf-8').read()

couleurs = dict(re.findall(r"(\w+):\{n:'([^']*)'", s))
tailles  = re.search(r'const SIZES=\[([\d,\s]*)\]', s)
tailles  = [t.strip() for t in tailles.group(1).split(',') if t.strip()] if tailles else []

m = re.search(r"\{id:'(\w+)'.*?name:'([^']*)',sub:'([^']*)'.*?price:(\d+),\s*\n?\s*"
              r"colors:\[([^\]]*)\],.*?stock:\{(.*?)\}.*?blurb:\"(.*?)\",", s, re.S)
if not m:
    sys.exit('flux.py : catalogue illisible')

pid, nom, sous, prix = m.group(1), m.group(2), m.group(3), int(m.group(4))
coloris = re.findall(r"'(\w+)'", m.group(5))
texte   = re.sub(r'\\u2019', '’', m.group(7)).replace('\\"', '"')
texte   = re.sub(r'\s+', ' ', texte).strip()

# Le stock, cuir par cuir : un coloris dont les cinq pointures sont à zéro
# part en « out of stock » plutôt que d'attirer des clics qu'on ne peut pas honorer.
grille = {c: [int(x) for x in re.findall(r'\d+', l)]
          for c, l in re.findall(r'(\w+)\s*:\s*\[([\d,\s]*)\]', m.group(6))}

# La photo principale d'un coloris, telle que images.py l'a nommée.
def visuel(c):
    for n in ('1', ''):
        base = 'assets/produits/%s-%s%s' % (pid, c, ('-' + n) if n else '')
        for larg in (960, 640, 480):
            f = '%s-%d.jpg' % (base, larg)
            if os.path.exists(f):
                return SITE + f
    return SITE + 'assets/marque/partage-1200x630.jpg'

COLONNES = ['id', 'title', 'description', 'availability', 'condition', 'price',
            'link', 'image_link', 'brand', 'color', 'item_group_id',
            'product_type', 'custom_label_0']

lignes = []
for c in coloris:
    reste = sum(grille.get(c, []))
    lignes.append({
        'id':             '%s-%s' % (pid, c),
        'title':          '%s — %s' % (nom, couleurs.get(c, c)),
        'description':    texte[:5000],
        'availability':   'in stock' if reste else 'out of stock',
        'condition':      'new',
        'price':          '%d.00 MAD' % prix,
        'link':           '%s#%s-%s' % (SITE, pid, c),
        'image_link':     visuel(c),
        'brand':          'Benkashoes',
        'color':          couleurs.get(c, c),
        'item_group_id':  pid,
        'product_type':   sous,
        'custom_label_0': 'pointures ' + '-'.join(tailles[:1] + tailles[-1:]),
    })

with io.open(SORTIE, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=COLONNES)
    w.writeheader()
    w.writerows(lignes)

dispo = sum(1 for l in lignes if l['availability'] == 'in stock')
print('  %-18s %d articles (%d disponibles) — %s' %
      ('flux catalogue', len(lignes), dispo, SORTIE))
