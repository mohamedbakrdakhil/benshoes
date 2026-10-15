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


def fond_studio(im, marge=0.05, satur_max=15.0, clair_min=170):
    """Les coins hauts sont-ils un fond de studio ?

    Règle refaite sur les 24 photos de l'atelier, packshots du catalogue
    compris. Deux corrections par rapport à la première version :

    Les coins HAUTS seulement. Sur un fond en gorge, le bas du cadre est la
    table : un bord, une ombre portée, une couture du papier. Quatre
    packshots sur huit y avaient un coin chargé et passaient pour des photos
    de décor.

    La saturation seule décide. La texture, qui séparait nettement sur les
    photos portées, se chevauche dès qu'un pied ou son ombre atteint un coin
    (packshot marron 45,3 contre photo portée 3,6). La saturation, elle,
    garde un fossé net :

        saturation des coins hauts   packshot 1,2–8,5   portée 29,3–224,7

    Le seuil est posé à 15, au milieu du fossé, pas à sa bordure. Une erreur
    ici ne coûte qu'un fond relevé ou non : c'est cosmétique, jamais faux.

    Renvoie la luminosité moyenne du fond, ou None si ce n'est pas un studio.
    """
    from PIL import ImageStat
    w, h = im.size
    cw, ch = round(w * marge), round(h * marge)
    hauts = [im.crop((0, 0, cw, ch)), im.crop((w - cw, 0, w, ch))]
    clair, satur = [], []
    for k in hauts:
        clair.append(ImageStat.Stat(k.convert('L')).mean[0])
        satur.append(ImageStat.Stat(k.convert('HSV')).mean[1])
    if max(satur) > satur_max:
        return None                      # fond coloré : décor, pas studio
    if min(clair) < clair_min:
        return None                      # fond sombre : on ne le relève pas
    return sum(clair) / 2


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
