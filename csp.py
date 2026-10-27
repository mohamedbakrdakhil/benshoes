# -*- coding: utf-8 -*-
"""Remplace @@CSP@@ dans le HTML construit par une politique de sécurité
du contenu où chaque script en ligne est désigné par son empreinte.

Depuis que les polices sont servies par le site lui-même, la page ne contacte
plus aucune origine extérieure : la politique se referme sur 'self'.

Un script injecté dans la page n'aurait alors ni la bonne empreinte pour
s'exécuter, ni le droit de se connecter ailleurs pour emporter ce qu'il a lu.
Appelé par build.sh ; si quelque chose cloche, on retombe sur une politique
sans empreintes plutôt que de livrer une page muette."""
import base64, hashlib, io, re, sys

CHEMIN = sys.argv[1]
h = io.open(CHEMIN, encoding='utf-8').read()

# Un bloc application/ld+json n'est pas exécuté : le navigateur ne consulte
# jamais script-src pour lui. Le sceller ne protégeait rien et faisait changer
# la politique de sécurité à chaque retouche du catalogue.
DONNEES = re.compile(r'type\s*=\s*["\']application/(ld\+json|json)["\']', re.I)

empreintes = []
for m in re.finditer(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', h, re.S):
    if DONNEES.search(m.group(1)):
        continue
    d = hashlib.sha256(m.group(2).encode('utf-8')).digest()
    empreintes.append("'sha256-" + base64.b64encode(d).decode('ascii') + "'")

if not empreintes:
    sys.exit("csp.py : aucun script en ligne trouvé")

script_src = "'self' " + ' '.join(empreintes)

# Le pixel Meta, et lui seul, si un identifiant est renseigné. Trois origines
# s'ouvrent alors, chacune pour une raison précise : le script de mesure est
# servi par connect.facebook.net, les événements partent vers facebook.com, et
# le repli sans JavaScript est une image sur ce même domaine. Tant que PIXEL
# est vide, rien ne s'ouvre — on ne laisse pas une porte entrebâillée « au cas où ».
pixel = bool(re.search(r"const PIXEL\s*=\s*'[^']+'", h))
images = ["'self'", 'data:']
if pixel:
    script_src += ' https://connect.facebook.net'
    images.append('https://www.facebook.com')
    print('  pixel Meta : connect.facebook.net et facebook.com autorisés')

# La page ne se connecte qu'à elle-même. Seule exception : si le tableur de
# l'atelier est configuré, on ouvre juste ce qu'il faut pour lui parler —
# Apps Script répond derrière une redirection, d'où les deux origines. Tant
# que SHOP.tableur est vide, la politique reste entièrement refermée.
destinations = ["'self'"]
if re.search(r"tableur:\s*'https://script\.google\.com/[^']+'", h):
    destinations += ['https://script.google.com', 'https://script.googleusercontent.com']
    print('  tableur configuré : connect-src ouvert vers Apps Script')
if pixel:
    destinations += ['https://www.facebook.com', 'https://connect.facebook.net']

# media-src reste fermé tant qu'aucune vidéo n'est déclarée. Une politique
# ouverte « au cas où » est une permission qu'on oublie d'avoir donnée.
videos = bool(re.search(r'const VIDEOS=\{\s*\w', h))

politique = '; '.join([
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    'script-src ' + script_src,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    'img-src ' + ' '.join(images),
    'connect-src ' + ' '.join(destinations),
    "media-src " + ("'self'" if videos else "'none'"),
    "worker-src 'none'",
    'upgrade-insecure-requests',
])

assert '@@CSP@@' in h, 'csp.py : repère @@CSP@@ absent du HTML'
io.open(CHEMIN, 'w', encoding='utf-8').write(h.replace('@@CSP@@', politique))
print('  politique de sécurité : %d script(s) en ligne scellé(s) par empreinte' % len(empreintes))
if videos:
    print('  vidéo déclarée : media-src ouvert au site lui-même')
