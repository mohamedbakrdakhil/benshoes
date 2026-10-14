# -*- coding: utf-8 -*-
"""Retouche légère des photos produit, avant la mise aux formats du site.

Volontairement discrète : ces photos ont été prises à la maison, au téléphone,
sous des lumières très différentes — parquet chaud, marbre froid, plein jour.
Les uniformiser un peu suffit à ce que la grille se tienne. Les pousser
davantage trahirait la couleur du daim, et une cliente qui reçoit un beige
plus gris que sur l'écran renvoie le colis.

Trois gestes, pas un de plus :

  1. Niveaux doux (autocontrast avec marge) : rattrape les photos ternes sans
     boucher les noirs ni brûler les blancs.
  2. Fond relevé vers le blanc, uniquement sur les photos de studio. Détecté,
     jamais supposé : si les quatre coins ne sont pas d'un même ton clair, on
     ne touche à rien. Sur une photo portée, ce traitement effacerait le
     parquet.
  3. Saturation +4 % et netteté légère, pour compenser le redimensionnement.

    python3 retouche.py photos-sources/*.jpg --vers photos-retouchees
"""
import io, os, sys

try:
    from PIL import Image, ImageOps, ImageEnhance, ImageFilter
except ImportError:
    sys.exit("retouche.py : le module Pillow est absent (pip3 install Pillow)")


def fond_studio(im, marge=0.045, texture_max=4.0, satur_max=8.0,
                clair_min=170):
    """Les quatre coins sont-ils un fond de studio ?

    Mesuré sur les vingt photos de l'atelier avant d'écrire la règle. La
    luminosité et son écart entre coins se chevauchent entre studio et photo
    portée — ils ne décident rien. Deux mesures, elles, séparent sans
    ambiguïté :

        texture (écart-type du coin)   studio 0,9–1,2   portée 7,6–34,1
        saturation du coin             studio 0,0–0,7   portée 34,8–117,5

    Un fond de studio est lisse et neutre ; un parquet est texturé et coloré.
    Les seuils sont posés loin des deux nuages, pas à la frontière.

    Renvoie la luminosité moyenne du fond, ou None si ce n'est pas un studio.
    """
    from PIL import ImageStat
    w, h = im.size
    cw, ch = round(w * marge), round(h * marge)
    coins = [im.crop((0, 0, cw, ch)), im.crop((w - cw, 0, w, ch)),
             im.crop((0, h - ch, cw, h)), im.crop((w - cw, h - ch, w, h))]
    clair, texture, satur = [], [], []
    for k in coins:
        g = ImageStat.Stat(k.convert('L'))
        clair.append(g.mean[0])
        texture.append(g.stddev[0])
        satur.append(ImageStat.Stat(k.convert('HSV')).mean[1])
    if max(texture) > texture_max:
        return None                      # décor : parquet, marbre, tissu
    if max(satur) > satur_max:
        return None                      # fond coloré : ce n'est pas un studio
    if min(clair) < clair_min:
        return None                      # fond sombre : on ne le relève pas
    return sum(clair) / 4


def relever_fond(im, niveau):
    """Étire les hautes lumières pour que le fond gris devienne blanc.

    On agit par une courbe : tout ce qui dépasse `depart` monte vers 255, le
    reste bouge à peine. La chaussure, plus sombre que son fond, est épargnée.
    """
    depart = max(150, int(niveau) - 26)
    table = []
    for v in range(256):
        if v <= depart:
            table.append(v)
        else:
            t = (v - depart) / float(255 - depart)
            table.append(int(round(depart + (255 - depart) * (t ** 0.55))))
    return im.point(table * 3)


def retoucher(chemin, vers):
    im = ImageOps.exif_transpose(Image.open(chemin)).convert('RGB')
    studio = fond_studio(im)

    im = ImageOps.autocontrast(im, cutoff=(0.4, 0.2), preserve_tone=True)
    if studio is not None:
        im = relever_fond(im, studio)
    im = ImageEnhance.Color(im).enhance(1.04)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=48, threshold=3))

    os.makedirs(vers, exist_ok=True)
    sortie = os.path.join(vers, os.path.basename(chemin))
    im.save(sortie, 'JPEG', quality=94, optimize=True, subsampling=0)
    return sortie, studio


def main(args):
    vers = 'photos-retouchees'
    if '--vers' in args:
        i = args.index('--vers')
        vers = args[i + 1]
        args = args[:i] + args[i + 2:]
    fichiers = [a for a in args if not a.startswith('--')]
    if not fichiers:
        sys.exit(__doc__.strip().splitlines()[0])
    n_studio = 0
    for f in sorted(fichiers):
        sortie, studio = retoucher(f, vers)
        if studio is not None:
            n_studio += 1
        print('  %-34s %s' % (os.path.basename(f),
              'studio, fond relevé (%d)' % studio if studio is not None
              else 'portée, niveaux seuls'))
    print('\n  %d photo(s), dont %d de studio' % (len(fichiers), n_studio))


if __name__ == '__main__':
    main(sys.argv[1:])
