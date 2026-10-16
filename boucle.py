# -*- coding: utf-8 -*-
"""Fabrique la boucle de fond du héros à partir des packshots de l'atelier.

Pas de service de génération, pas d'abonnement, pas de crédits : les huit
coloris existent déjà en photo de studio, cadrés pareil, sur le même fond.
Les faire se fondre l'un dans l'autre en travelling lent montre la
collection entière en seize secondes — et ce sont les vraies chaussures,
pas une interprétation.

Trois contraintes dictent les réglages :

  Elle passe DERRIÈRE du texte. Les packshots sont sur fond de studio quasi
  blanc ; tels quels ils effaceraient le titre. On les assombrit et on les
  réchauffe vers le bordeaux de la marque — mesuré, pas estimé : le fond,
  qui est la zone la plus claire de l'image et donc le pire cas, tombe à
  7:1 de contraste avec du texte blanc, là où la norme demande 4,5:1.

  Elle tourne en boucle. Le dernier coloris se fond vers le premier, sinon
  le raccord saute toutes les seize secondes et l'œil ne voit plus que ça.

  Elle pèse. C'est un décor, pas le produit : 1280 de large suffit, et un
  mouvement lent se compresse très bien.

    python3 boucle.py            → assets/videos/collection.mp4 + son affiche
"""
import os, subprocess, sys, shutil, math

try:
    from PIL import Image, ImageEnhance, ImageDraw, ImageFilter, ImageStat
except ImportError:
    sys.exit("boucle.py : le module Pillow est absent (pip3 install Pillow)")

SOURCE   = 'photos-retouchees'
SORTIE   = 'assets/videos'
NOM      = 'collection'
ORDRE    = ['beige', 'taupe', 'marron', 'tabac', 'burgundy', 'gris', 'marine', 'noir']

L, H     = 1280, 720
FPS      = 24
TENUE    = 1.15      # secondes pendant lesquelles un coloris est seul à l'écran
FONDU    = 0.85      # secondes de fondu entre deux coloris
ZOOM     = 1.085     # travelling avant sur la vie entière d'un plan
ASSOMBRI = 0.45      # ce qui reste de luminosité : le texte doit se lire dessus
TEINTE   = (92, 34, 26)   # le bordeaux de la marque
MELANGE  = 0.24      # part de cette teinte — assez pour lier, pas pour mentir
FOND     = (40, 17, 13)   # le bordeaux sombre vers lequel le cadre s'éteint

# La paire occupe le bas des packshots, en portrait. Mesuré sur les huit :
# elle court des 48 aux 88 centièmes de la hauteur.
PAIRE    = (0.46, 0.90)
# Sa taille sur le cadre fini, et où elle se pose. Le héros écrit son titre à
# gauche : la chaussure va à droite, et le texte garde du fond uni sous lui.
HAUTEUR  = 0.52
CENTRE   = (0.60, 0.52)
# L'affiche du téléphone. Sous 900 px la vidéo ne se télécharge jamais :
# cette image EST le décor, et c'est elle que Google mesure.
#
# Elle était à demi effacée (force 0,42) tant que le héros portait une
# vignette produit : deux chaussures au même instant, l'une nette dans une
# carte, l'autre en fond, se gênaient. La vignette est partie, le héros est
# passé de 958 à 508 px de haut, et le téléphone n'avait soudain plus aucune
# chaussure au-dessus de la ligne de flottaison. Mesure faite : sous le voile
# du héros, le pixel le plus clair de cette affiche tient 13:1 de contraste
# avec du texte blanc, là où la norme demande 4,5. La prudence ne coûtait
# donc rien au texte et coûtait le produit — la chaussure revient à 0,80.
ETROIT   = (760, 1150)
ETR_H    = 0.33
ETR_C    = (0.52, 0.30)
ETR_F    = 0.80


def prepare(chemin):
    """Découpe la paire, l'assombrit, la réchauffe.

    Renvoie la photo prête et la couleur de son fond de studio après
    traitement : c'est vers elle que le fond composé devra tendre sous la
    chaussure, sinon la couture se voit.
    """
    src = Image.open(chemin).convert('RGB')
    w, h = src.size
    photo = src.crop((0, int(h * PAIRE[0]), w, int(h * PAIRE[1])))
    photo = ImageEnhance.Brightness(photo).enhance(ASSOMBRI)
    photo = Image.blend(photo, Image.new('RGB', photo.size, TEINTE), MELANGE)
    coin = photo.crop((0, 0, photo.width // 8, photo.height // 8))
    return photo, tuple(int(round(v)) for v in ImageStat.Stat(coin).mean[:3])


def compose(photo, studio, cw, ch, hauteur, centre, force=1.0):
    """Pose la paire sur un fond bordeaux, fondue dedans par un masque.

    Le premier montage recadrait simplement le packshot au format voulu. À
    l'écran c'était faux : le héros est un bandeau de 2,34:1 sur ordinateur
    et une colonne de 0,39:1 sur téléphone, et `object-fit:cover` y rogne
    sans ménagement. Comme la paire remplissait tout le cadre, elle en
    sortait — un gros plan de semelle, tronqué.

    D'où ce montage-ci. La paire est posée petite, avec de l'air tout
    autour : le rognage ne mange plus que du décor. Et le bord du rectangle
    photographique ne doit jamais se voir, puisqu'il sera coupé n'importe où
    selon la fenêtre — donc la photo se fond dans le fond par un masque
    elliptique flou, et le fond part de la couleur même du studio, relevée
    sur la photo, pour s'éteindre vers le bordeaux aux coins. Aucune couture
    possible : il n'y a plus de bord.

    `force` plafonne l'opacité du masque. À 1 la chaussure est pleine ; en
    dessous elle n'est plus qu'une texture — ce qu'il faut sur téléphone, où
    le héros empile photo, titre, texte et boutons sur toute sa hauteur et
    où un sujet net derrière ne serait que du bruit.
    """
    # HAUTEUR vise la PAIRE, pas la bande découpée : la bande porte en plus
    # la marge d'air, d'où le rapport entre les deux.
    ph = int(round(ch * hauteur * (PAIRE[1] - PAIRE[0]) / (0.88 - 0.48)))
    pw = int(round(photo.width * ph / float(photo.height)))
    photo = photo.resize((pw, ph), Image.LANCZOS)
    cx, cy = int(round(cw * centre[0])), int(round(ch * centre[1]))

    # Le fond : un dégradé radial, calculé une fois en petit puis étiré. Le
    # faire pixel par pixel en pleine taille coûterait des secondes par
    # image ; en 72 de large puis agrandi, l'œil ne voit pas la différence.
    pt = 72
    petit = Image.new('RGB', (pt, max(2, int(pt * ch / float(cw)))))
    px = petit.load()
    fx, fy = cx / float(cw) * pt, cy / float(ch) * petit.height
    rmax = (pt ** 2 + petit.height ** 2) ** 0.5 * 0.62
    for y in range(petit.height):
        for x in range(pt):
            d = min(1.0, ((x - fx) ** 2 + (y - fy) ** 2) ** 0.5 / rmax) ** 1.25
            px[x, y] = tuple(int(round(studio[k] + (FOND[k] - studio[k]) * d))
                             for k in range(3))
    cadre = petit.resize((cw, ch), Image.BICUBIC)

    # Le masque : une ellipse floue aux dimensions de la photo. Son flou vaut
    # près d'un dixième de la largeur — assez pour qu'aucun bord droit ne
    # subsiste, quel que soit l'endroit où la fenêtre vient couper.
    masque = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(masque).ellipse(
        [cx - pw * 0.50, cy - ph * 0.50, cx + pw * 0.50, cy + ph * 0.50],
        fill=int(round(255 * force)))
    masque = masque.filter(ImageFilter.GaussianBlur(pw * 0.085))

    couche = Image.new('RGB', (cw, ch), studio)
    couche.paste(photo, (cx - pw // 2, cy - ph // 2))
    cadre.paste(couche, (0, 0), masque)
    return cadre


def plan(im, t):
    """Une image du travelling. t va de 0 à 1 sur la VIE ENTIÈRE du plan.

    Une photo vit plus longtemps que le bloc qui porte son nom : elle entre
    en fondu sur le bloc précédent, reste seule, puis sort en fondu sur le
    suivant. Le travelling doit couvrir ces trois temps d'un seul geste,
    sinon la photo repart en arrière à l'instant où elle devient seule —
    un à-coup toutes les deux secondes, et l'œil ne voit plus que lui.
    """
    gw, gh = im.size
    f = 1 + (ZOOM - 1) * (1 - t) / ZOOM      # on part large, on resserre
    cw, ch = min(int(round(L * f)), gw), min(int(round(H * f)), gh)
    x, y = (gw - cw) // 2, (gh - ch) // 2
    return im.crop((x, y, x + cw, y + ch)).resize((L, H), Image.LANCZOS)


def main():
    if not os.path.isdir(SOURCE):
        sys.exit('boucle.py : dossier %s introuvable' % SOURCE)
    cw, ch = int(round(L * ZOOM)), int(round(H * ZOOM))
    photos, premiere = [], None
    for c in ORDRE:
        p = os.path.join(SOURCE, 'opus-%s-1.jpg' % c)
        if not os.path.isfile(p):
            continue
        brut, studio = prepare(p)
        if premiere is None:
            premiere = (brut, studio)
        photos.append(compose(brut, studio, cw, ch, HAUTEUR, CENTRE))
    if len(photos) < 2:
        sys.exit('boucle.py : il faut au moins deux packshots')

    nT, nF = int(round(TENUE * FPS)), int(round(FONDU * FPS))
    bloc = nT + nF          # longueur d'un bloc : un coloris prend la main
    vie = nT + 2 * nF       # longueur de vie d'une photo : entrée + seule + sortie

    tmp = '.build/boucle-images'
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)

    n = 0
    for i, im in enumerate(photos):
        prec = photos[i - 1]                 # i=0 reprend la dernière : la boucle ferme
        for k in range(bloc):
            cour = plan(im, k / float(vie - 1))
            if k < nF:
                # Le coloris précédent finit sa course : ses nF dernières images.
                sort = plan(prec, (nT + nF + k) / float(vie - 1))
                # Fondu en cosinus : ni départ ni arrivée brusques.
                m = (1 - math.cos(math.pi * (k + 1) / nF)) / 2
                cour = Image.blend(sort, cour, m)
            cour.save('%s/%05d.jpg' % (tmp, n), quality=92)
            n += 1

    os.makedirs(SORTIE, exist_ok=True)
    mp4 = '%s/%s.mp4' % (SORTIE, NOM)
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error',
                           '-framerate', str(FPS), '-i', '%s/%%05d.jpg' % tmp,
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '31',
                           '-pix_fmt', 'yuv420p', '-an',
                           '-movflags', '+faststart', mp4])
    # L'affiche : la première image de la boucle. C'est elle qui s'affiche
    # tout de suite, et c'est elle que Google mesure — la vidéo se fond
    # par-dessus ensuite, et seulement si les conditions le permettent.
    aff = '%s/%s-affiche.jpg' % (SORTIE, NOM)
    # Pas la première image, qui tombe au milieu d'un fondu. Sous 900 px la
    # vidéo ne se télécharge jamais : l'affiche EST le décor du téléphone, et
    # c'est elle que Google mesure. On prend donc le milieu du premier plan,
    # le coloris en tête du catalogue, net et seul à l'écran.
    Image.open('%s/%05d.jpg' % (tmp, nF + nT // 2)).save(
        aff, quality=82, optimize=True, progressive=True)
    etr = '%s/%s-affiche-etroite.jpg' % (SORTIE, NOM)
    compose(premiere[0], premiere[1], ETROIT[0], ETROIT[1],
            ETR_H, ETR_C, ETR_F).save(etr, quality=80, optimize=True,
                                      progressive=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print('  %d coloris, %d images, %.1f s' % (len(photos), n, n / float(FPS)))
    print('  %-34s %d Ko' % (mp4, os.path.getsize(mp4) // 1024))
    print('  %-34s %d Ko' % (aff, os.path.getsize(aff) // 1024))
    print('  %-34s %d Ko' % (etr, os.path.getsize(etr) // 1024))


if __name__ == '__main__':
    main()
