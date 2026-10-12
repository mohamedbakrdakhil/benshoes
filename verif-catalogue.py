# -*- coding: utf-8 -*-
"""Le script du tableur a son propre catalogue — c'est ce qui le rend sûr : il
ne croit jamais les prix annoncés par le navigateur. Mais deux catalogues,
c'est deux occasions de diverger. Ce contrôle les compare à chaque build et
prévient, sans bloquer : un prix changé d'un seul côté ferait facturer autre
chose que ce qui est affiché."""
import io, re, sys

def du_site(p='src/scripts/02-catalogue.js'):
    s = io.open(p, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"\{id:'(\w+)'.*?price:(\d+),\s*\n?\s*colors:\[([^\]]*)\]", s, re.S):
        out[m.group(1)] = (int(m.group(2)),
                           tuple(sorted(re.findall(r"'(\w+)'", m.group(3)))))
    liv = re.search(r'const SHIPFREE=(\d+),\s*SHIPCOST=(\d+)', s)
    return out, (int(liv.group(1)), int(liv.group(2))) if liv else None

def du_tableur(p='integrations/tableur.gs'):
    s = io.open(p, encoding='utf-8').read()
    bloc = re.search(r'var CATALOGUE = \{(.*?)\n\};', s, re.S)
    out = {}
    if bloc:
        for m in re.finditer(r"(\w+):\s*\{[^}]*prix:\s*(\d+),\s*coloris:\s*\[([^\]]*)\]", bloc.group(1)):
            out[m.group(1)] = (int(m.group(2)),
                               tuple(sorted(re.findall(r"'(\w+)'", m.group(3)))))
    a = re.search(r'var LIVR_OFFERTE = (\d+)', s)
    b = re.search(r'var LIVR_PRIX\s+= (\d+)', s)
    return out, (int(a.group(1)), int(b.group(1))) if a and b else None

try:
    site, livS = du_site()
    tab,  livT = du_tableur()
except Exception as e:
    sys.exit(0)                      # pas de script tableur : rien à comparer

if not tab:
    sys.exit(0)

ecarts = []
for id_ in sorted(set(site) | set(tab)):
    a, b = site.get(id_), tab.get(id_)
    if a is None:  ecarts.append('%s : absent du site' % id_)
    elif b is None: ecarts.append('%s : absent du tableur' % id_)
    else:
        if a[0] != b[0]: ecarts.append('%s : %d DH sur le site, %d DH dans le tableur' % (id_, a[0], b[0]))
        if a[1] != b[1]: ecarts.append('%s : coloris différents' % id_)
if livS != livT:
    ecarts.append('livraison : %s sur le site, %s dans le tableur' % (livS, livT))

if ecarts:
    print('  ⚠ catalogues divergents entre le site et integrations/tableur.gs :')
    for e in ecarts: print('     · ' + e)
    print('     corrigez puis redéployez le script (Déployer → Gérer → Nouvelle version)')
else:
    print('  catalogues du site et du tableur : identiques')
