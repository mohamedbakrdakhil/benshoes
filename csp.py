# -*- coding: utf-8 -*-
"""Remplace @@CSP@@ dans le HTML construit par une politique de sécurité
du contenu où chaque script en ligne est désigné par son empreinte.

Un script injecté dans la page n'aurait alors ni la bonne empreinte pour
s'exécuter, ni le droit de se connecter ailleurs pour emporter ce qu'il a lu.
Appelé par build.sh ; si quelque chose cloche, on retombe sur une politique
sans empreintes plutôt que de livrer une page muette."""
import base64, hashlib, io, re, sys

CHEMIN = sys.argv[1]
h = io.open(CHEMIN, encoding='utf-8').read()

empreintes = []
for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', h, re.S):
    d = hashlib.sha256(m.group(1).encode('utf-8')).digest()
    empreintes.append("'sha256-" + base64.b64encode(d).decode('ascii') + "'")

if not empreintes:
    sys.exit("csp.py : aucun script en ligne trouvé")

script_src = "'self' " + ' '.join(empreintes)

politique = '; '.join([
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    'script-src ' + script_src,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "media-src 'none'",
    "worker-src 'none'",
    'upgrade-insecure-requests',
])

assert '@@CSP@@' in h, 'csp.py : repère @@CSP@@ absent du HTML'
io.open(CHEMIN, 'w', encoding='utf-8').write(h.replace('@@CSP@@', politique))
print('  politique de sécurité : %d script(s) en ligne scellé(s) par empreinte' % len(empreintes))
