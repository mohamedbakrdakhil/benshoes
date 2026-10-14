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

LARGEURS = (320, 480, 640, 960)

# La qualité suit la taille d'affichage. Une vignette de 160 px à l'écran n'a
# aucun besoin de la finesse d'une photo plein cadre, et une photo portée —
# parquet, marbre, tissu — coûte trois fois le prix d'un packshot sur fond uni
# à qualité égale. Sans ce dégradé, la grille réclamait 419 Ko sur téléphone.
QUALITE = {320: (68, 72), 480: (72, 76), 640: (76, 80), 960: (82, 85)}
DEFAUT = (82, 85)


def derivees(chemin, carre=False, largeurs=LARGEURS, vers=None):
    base, _ = os.path.splitext(chemin)
    if vers:
        os.makedirs(vers, exist_ok=True)
        base = os.path.join(vers, os.path.basename(base))
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
        qw, qj = QUALITE.get(w, DEFAUT)
        for ext, opts in (('webp', dict(quality=qw, method=6)),
                          ('jpg', dict(quality=qj, optimize=True,
                                       progressive=True))):
            sortie = '%s-%d.%s' % (base, w, ext)
            im.save(sortie, **opts)
            produits.append((sortie, os.path.getsize(sortie), w, h))
    return produits


def main(args):
    carre = '--carre' in args
    vers = None
    if '--vers' in args:
        i = args.index('--vers')
        vers = args[i + 1]
        args = args[:i] + args[i + 2:]
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
        for sortie, taille, w, h in derivees(f, carre, vers=vers):
            total_apres += taille
            print('  %-44s %4d Ko   %dx%d' % (sortie, taille // 1024, w, h))
    if total_avant:
        print('\n  sources %d Ko  →  dérivées %d Ko' %
              (total_avant // 1024, total_apres // 1024))
    n = manifeste()
    print('  manifeste : %d visuel(s) déclaré(s)' % n)




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
    """Deux conventions de nommage cohabitent :

        opus-beige-3-640.webp   galerie : modèle, coloris, 3e photo, 640 px
        opus-beige-640.webp     photo unique pour ce coloris
        opus-640.webp           photo unique, tous coloris confondus

    La galerie est lue d'abord : « opus-beige-3-640 » se terminant par deux
    nombres, la lire avec l'ancien motif donnerait un coloris « 3 ».
    """
    import json, re, collections
    if not os.path.isdir(dossier):
        return 0
    GALERIE = re.compile(r'^([a-z0-9]+)-([a-z0-9]+)-(\d+)-(\d+)\.(webp|jpg)$')
    SIMPLE = re.compile(r'^([a-z0-9]+)(?:-([a-z0-9]+))?-(\d+)\.(webp|jpg)$')

    trouve = collections.defaultdict(lambda: collections.defaultdict(
        lambda: {'webp': set(), 'jpg': set(), 'n': set()}))
    for f in sorted(os.listdir(dossier)):
        m = GALERIE.match(f)
        if m:
            modele, coloris, idx, w, ext = (m.group(1), m.group(2),
                                            int(m.group(3)), int(m.group(4)),
                                            m.group(5))
        else:
            m = SIMPLE.match(f)
            if not m:
                continue
            modele, coloris, idx, w, ext = (m.group(1), m.group(2) or '_', 0,
                                            int(m.group(3)), m.group(4))
        e = trouve[modele][coloris]
        e[ext].add(w)
        e['n'].add(idx)

    out = {}
    for modele, cols in trouve.items():
        for coloris, e in cols.items():
            if not e['jpg']:
                continue                  # le JPEG est le repli obligatoire
            base = '%s/%s' % (dossier, modele if coloris == '_'
                              else '%s-%s' % (modele, coloris))
            entree = {'b': base, 'j': sorted(e['jpg']), 'p': sorted(e['webp'])}
            idx = sorted(i for i in e['n'] if i)
            if idx:
                entree['n'] = idx          # galerie : numéros disponibles
            out.setdefault(modele, {})[coloris] = entree
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    io.open(sortie, 'w', encoding='utf-8').write(
        'const PHOTOS_AUTO=' + json.dumps(out, ensure_ascii=False,
                                          separators=(',', ':')) + ';\n')
    return sum(len(c) for c in out.values())


if __name__ == '__main__':
    main(sys.argv[1:])
