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

# La page ne se connecte qu'à elle-même. Seule exception : si le tableur de
# l'atelier est configuré, on ouvre juste ce qu'il faut pour lui parler —
# Apps Script répond derrière une redirection, d'où les deux origines. Tant
# que SHOP.tableur est vide, la politique reste entièrement refermée.
destinations = ["'self'"]
if re.search(r"tableur:\s*'https://script\.google\.com/[^']+'", h):
    destinations += ['https://script.google.com', 'https://script.googleusercontent.com']
    print('  tableur configuré : connect-src ouvert vers Apps Script')

politique = '; '.join([
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    'script-src ' + script_src,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    'connect-src ' + ' '.join(destinations),
    "media-src 'none'",
    "worker-src 'none'",
    'upgrade-insecure-requests',
])

assert '@@CSP@@' in h, 'csp.py : repère @@CSP@@ absent du HTML'
io.open(CHEMIN, 'w', encoding='utf-8').write(h.replace('@@CSP@@', politique))
print('  politique de sécurité : %d script(s) en ligne scellé(s) par empreinte' % len(empreintes))
