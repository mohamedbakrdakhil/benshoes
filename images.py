# -*- coding: utf-8 -*-
"""Prépare une photo pour le site : plusieurs largeurs, en WebP et en JPEG.

Pourquoi un outil plutôt qu'un glisser-déposer : une photo de téléphone pèse
3 à 6 Mo. Posée telle quelle dans une vignette de 260 px, elle coûte au
client marocain son forfait data et fait tomber le site hors des seuils de
Google, qui mesure justement le chargement de la plus grosse image visible.

Ce que produit l'outil, pour une photo `opus-marine.jpg` :

    opus-marine-320.webp   opus-marine-320.jpg
    opus-marine-640.webp   opus-marine-640.jpg
    opus-marine-960.webp   opus-marine-960.jpg

Le site sert le WebP à qui sait le lire (tous les navigateurs depuis 2020) et
le JPEG aux autres, et laisse le navigateur choisir la largeur selon l'écran.

    python3 images.py assets/produits/opus-marine.jpg
    python3 images.py --carre assets/produits/*.jpg

`--carre` recadre au centre en 1:1, pour les vignettes de la grille, qui ont
toutes le même format. Sans l'option, les proportions sont conservées.
"""
import io, os, sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("images.py : le module Pillow est absent (pip3 install Pillow)")

LARGEURS = (320, 640, 960)
QUALITE_WEBP = 82
QUALITE_JPEG = 84


def derivees(chemin, carre=False, largeurs=LARGEURS):
    base, _ = os.path.splitext(chemin)
    src = Image.open(chemin)
    # Une photo de téléphone porte son orientation dans les métadonnées EXIF :
    # sans ce redressement, elle s'affiche couchée dans le navigateur.
    src = ImageOps.exif_transpose(src).convert('RGB')

    if carre:
        cote = min(src.size)
        g = (src.width - cote) // 2
        h = (src.height - cote) // 2
        src = src.crop((g, h, g + cote, h + cote))

    produits = []
    for w in largeurs:
        if w > src.width:
            continue                      # ne jamais agrandir : ça ne fait que du flou lourd
        h = round(src.height * w / src.width)
        im = src.resize((w, h), Image.LANCZOS)
        for ext, opts in (('webp', dict(quality=QUALITE_WEBP, method=6)),
                          ('jpg', dict(quality=QUALITE_JPEG, optimize=True,
                                       progressive=True))):
            sortie = '%s-%d.%s' % (base, w, ext)
            im.save(sortie, **opts)
            produits.append((sortie, os.path.getsize(sortie), w, h))
    return produits


def main(args):
    carre = '--carre' in args
    fichiers = [a for a in args if not a.startswith('--')]
    if not fichiers:
        sys.exit(__doc__.strip().splitlines()[0])

    total_avant = total_apres = 0
    for f in fichiers:
        if not os.path.isfile(f):
            print('  absent : %s' % f)
            continue
        avant = os.path.getsize(f)
        total_avant += avant
        print('\n%s  (%d Ko)' % (f, avant // 1024))
        for sortie, taille, w, h in derivees(f, carre):
            total_apres += taille
            print('  %-44s %4d Ko   %dx%d' % (sortie, taille // 1024, w, h))
    if total_avant:
        print('\n  sources %d Ko  →  dérivées %d Ko' %
              (total_avant // 1024, total_apres // 1024))
    n = manifeste()
    print('  manifeste : %d visuel(s) déclaré(s)' % n)


if __name__ == '__main__':
    main(sys.argv[1:])


# ---------------------------------------------------------------------------
# Le manifeste : ce que le site trouvera dans assets/produits/
#
# Écrit à chaque build. Déposer une photo, lancer images.py, et le site la
# sert : pas de liste à tenir à jour à la main, donc pas de vignette qui
# pointe vers un fichier disparu.
#
# Convention de nommage :  <modele>-<coloris>-<largeur>.<webp|jpg>
#   opus-marine-640.webp   →  modèle « opus », coloris « marine », 640 px
#   opus-640.webp          →  modèle « opus », tous coloris confondus
# ---------------------------------------------------------------------------
def manifeste(dossier='assets/produits', sortie='.build/photos.js'):
    import json, re, collections
    if not os.path.isdir(dossier):
        return 0
    # Les largeurs sont suivies PAR FORMAT. Un fichier laissé d'une ancienne
    # exportation — un 800 en JPEG sans son WebP — ferait sinon réclamer au
    # navigateur une adresse qui n'existe pas.
    trouve = collections.defaultdict(lambda: collections.defaultdict(
        lambda: {'webp': set(), 'jpg': set()}))
    for f in sorted(os.listdir(dossier)):
        m = re.match(r'^([a-z0-9]+)(?:-([a-z0-9]+))?-(\d+)\.(webp|jpg)$', f)
        if not m:
            continue
        modele, coloris, w, ext = m.group(1), m.group(2) or '_', int(m.group(3)), m.group(4)
        trouve[modele][coloris][ext].add(w)
    out = {}
    for modele, cols in trouve.items():
        for coloris, e in cols.items():
            if not e['jpg']:
                continue                  # le JPEG est le repli obligatoire
            base = '%s/%s' % (dossier, modele if coloris == '_'
                              else '%s-%s' % (modele, coloris))
            out.setdefault(modele, {})[coloris] = {
                'b': base, 'j': sorted(e['jpg']), 'p': sorted(e['webp'])}
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    io.open(sortie, 'w', encoding='utf-8').write(
        'const PHOTOS_AUTO=' + json.dumps(out, ensure_ascii=False,
                                          separators=(',', ':')) + ';\n')
    return sum(len(c) for c in out.values())
