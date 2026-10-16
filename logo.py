# -*- coding: utf-8 -*-
"""Détoure le logo benka et en sort les versions dont le site a besoin.

Le fichier de marque arrive en 1600x1600 sur fond blanc, avec une ombre
portée grise et le mot « FOOTWEAR » sous le logotype. Tel quel il est
inutilisable dans l'en-tête : le fond blanc ferait un rectangle au milieu
du bandeau bordeaux, et le sous-titre, haut de 25 px sur 1600, se
réduirait à une bavure d'un pixel et demi.

Ce que l'outil produit, dans assets/marque/ :

    benka.png          le logotype seul, détouré, bordeaux  — fonds clairs
    benka-clair.png    le même, le mot en crème             — fonds sombres
    benka-complet.png  le verrou entier avec « FOOTWEAR »   — impression, réseaux
    benka-carre.png    le verrou centré sur fond blanc      — données structurées

Le carré n'est pas une coquetterie : Google demande un logo sur fond plein
pour `Organization.logo`, et c'est lui qui s'affiche dans l'encadré de
marque à droite des résultats. Un PNG transparent y sort sur n'importe quoi.

**Le détourage ne se fait pas au seuil.** Un seuil laisse des bords en
escalier sur une lettre arrondie, et surtout il ne sait pas distinguer un
gris d'ombre d'un bordeaux pâle : les deux sont « pas blanc ». La règle
employée ici lit la DIRECTION du manque de blanc.

Un pixel vaut blanc moins quelque chose. Ce « quelque chose » pointe
toujours dans la même direction pour une encre donnée, quelle que soit
l'opacité du bord :

    bordeaux  (120, 30, 22)  →  manque (135, 225, 233)
    crème     (254, 241, 188) →  manque (  1,  14,  67)
    ombre     un gris         →  manque (  n,   n,   n)

On compare donc la direction du manque à ces trois-là, et l'encre la plus
proche gagne. L'opacité vaut alors la longueur du manque rapportée à celle
de l'encre pure. L'ombre, elle, est jetée : posée sur le bordeaux du
bandeau, elle ne ferait pas une ombre mais une salissure.

    python3 logo.py            → relit logo-source/benka-logo.png
"""
import io, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit("logo.py : le module Pillow est absent (pip3 install Pillow)")

SOURCE = 'logo-source/benka-logo.png'
SORTIE = 'assets/marque'

BORDEAUX = (120, 30, 22)      # relevé sur le fichier, 3,95 % des pixels
CREME    = (254, 241, 188)    # les orteils
CLAIR    = (253, 247, 244)    # --band-fg : le mot sur fond sombre

# Largeur d'export. Le logotype s'affiche sur 110 px dans l'en-tête et 139
# dans le pied ; 440 couvre les deux au triple, de quoi tenir sur un écran
# à forte densité sans servir des pixels que personne ne verra.
LARGE = 440
# Pas de marge : le fichier s'arrête au dessin. La CSS fixe une hauteur, et
# toute marge incluse ici rapetisserait le logo d'autant à l'affichage —
# une première version en ajoutait 29 % en haut et en bas, et le logotype
# ressortait à 23 px au lieu de 30.
PALETTE = 64         # couleurs de la palette d'export
CARRE = 600          # côté du logo sur fond blanc, pour les données structurées


def _direction(v):
    n = (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) ** 0.5
    return (0.0, 0.0, 0.0) if n == 0 else (v[0] / n, v[1] / n, v[2] / n), n


def detourer(im):
    """Renvoie une image RGBA : fond et ombre à zéro, encres à leur opacité.

    Le tableau de correspondance est construit une fois pour toutes les
    couleurs rencontrées, et non pixel par pixel : un logo à plat n'en
    compte que quelques milliers, là où l'image en fait deux millions et
    demi. Sans ce cache, la fonction mettait près d'une minute.
    """
    im = im.convert('RGB')
    encres = []
    for couleur in (BORDEAUX, CREME):
        d, n = _direction([255 - c for c in couleur])
        encres.append((couleur, d, n))
    gris, _ = _direction((1, 1, 1))

    cache, sortie = {}, Image.new('RGBA', im.size)
    px, out = im.load(), sortie.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            v = cache.get(p)
            if v is None:
                v = cache[p] = _classer(p, encres, gris)
            out[x, y] = v
    return sortie


def _classer(p, encres, gris):
    manque = [255 - c for c in p]
    d, n = _direction(manque)
    if n < 3:
        return (0, 0, 0, 0)                      # blanc : le fond
    # L'encre dont la direction colle le mieux. Le produit scalaire suffit :
    # les trois directions sont unitaires.
    best, score = None, -2.0
    for couleur, dd, nn in encres:
        s = d[0] * dd[0] + d[1] * dd[1] + d[2] * dd[2]
        if s > score:
            best, score = (couleur, nn), s
    sgris = d[0] * gris[0] + d[1] * gris[1] + d[2] * gris[2]
    if sgris >= score:
        return (0, 0, 0, 0)                      # gris neutre : l'ombre portée
    couleur, nn = best
    a = max(0, min(255, int(round(255.0 * n / nn))))
    return (couleur[0], couleur[1], couleur[2], a)


def recolorer(im, depuis, vers):
    """Remplace une encre par une autre en gardant l'opacité des bords."""
    out = Image.new('RGBA', im.size)
    a, b = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, bl, al = a[x, y]
            if al and abs(r - depuis[0]) < 10 and abs(g - depuis[1]) < 10 \
                    and abs(bl - depuis[2]) < 10:
                b[x, y] = (vers[0], vers[1], vers[2], al)
            else:
                b[x, y] = (r, g, bl, al)
    return out


def bandes(im, opaque=60, mini=3, fusion=20):
    """Les groupes de lignes non vides : le logotype, puis le sous-titre.

    Deux précautions, et chacune a corrigé un découpage faux :

    Une ligne ne compte que si elle porte vraiment de l'encre. Les restes
    d'anticrénelage laissent des lignes à un ou deux pixels très pâles tout
    autour du dessin ; prises au sérieux, elles faisaient commencer le
    logotype une bande trop haut, et il en ressortait haut de 48 pixels.

    Les trous étroits se referment. Une ligne horizontale du dessin peut
    être vide sur toute sa largeur — entre le haut du « b » et le reste du
    mot, par exemple — sans que ce soit une séparation. Seul un vrai blanc,
    ici celui qui précède « FOOTWEAR », sépare deux bandes.
    """
    a = im.load()
    pleine = [sum(1 for x in range(im.width) if a[x, y][3] >= opaque) >= mini
              for y in range(im.height)]
    out, debut, fin, creux = [], None, 0, 0
    for y, pleinel in enumerate(pleine):
        if pleinel:
            if debut is None:
                debut = y
            fin, creux = y, 0
        elif debut is not None:
            creux += 1
            if creux > fusion:
                out.append((debut, fin)); debut, creux = None, 0
    if debut is not None:
        out.append((debut, fin))
    return out


def cadrer(im, haut, bas):
    """Recadre sur une bande, au plus juste : le fichier s'arrête au dessin."""
    bande = im.crop((0, haut, im.width, bas + 1))
    return bande.crop(bande.getbbox())


def exporter(im, nom):
    """Réduit, réduit la palette, écrit.

    Le dessin ne porte que deux encres sur du vide : une palette de 64
    couleurs suffit à rendre l'anticrénelage. Mesuré sur ce fichier, l'écart
    moyen avec la version en couleurs vraies vaut 1 sur 255 — invisible —
    pour un cinquième du poids. L'en-tête est au-dessus de la ligne de
    flottaison : 7 Ko contre 35, cela se voit au chargement, pas à l'œil.
    """
    h = int(round(im.height * LARGE / float(im.width)))
    petit = im.resize((LARGE, h), Image.LANCZOS)
    petit = petit.quantize(colors=PALETTE, method=Image.FASTOCTREE)
    chemin = os.path.join(SORTIE, nom)
    petit.save(chemin, optimize=True)
    print('  %-34s %4d x %-4d  %d Ko'
          % (chemin, petit.width, petit.height, os.path.getsize(chemin) // 1024))
    return petit.size


def carre(im, cote=CARRE, marge=0.12, fond=(255, 255, 255)):
    """Le verrou centré sur un carré blanc, pour les données structurées."""
    util = int(round(cote * (1 - 2 * marge)))
    f = min(util / float(im.width), util / float(im.height))
    p = im.resize((int(round(im.width * f)), int(round(im.height * f))),
                  Image.LANCZOS)
    out = Image.new('RGB', (cote, cote), fond)
    out.paste(p, ((cote - p.width) // 2, (cote - p.height) // 2), p)
    return out


def empreinte(im):
    """Les cinq taches crème du logo : l'ovale du gros orteil et ses points.

    C'est la seule partie du logo lisible à 32 pixels — un logotype y est
    une bavure. Elle est relevée sur le fichier et non dessinée à vue : le
    dessin qui servait d'icône jusqu'ici faisait décroître les points bien
    plus vite que la vraie marque.
    """
    a = im.load()
    pts = set()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, al = a[x, y]
            if al > 128 and abs(r - CREME[0]) < 12 and abs(g - CREME[1]) < 12 \
                    and abs(b - CREME[2]) < 12:
                pts.add((x, y))
    vus, taches = set(), []
    for d in pts:
        if d in vus:
            continue
        pile, comp = [d], []
        vus.add(d)
        while pile:
            x, y = pile.pop(); comp.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                           (1, 1), (1, -1), (-1, 1), (-1, -1)):
                q = (x + dx, y + dy)
                if q in pts and q not in vus:
                    vus.add(q); pile.append(q)
        if len(comp) > 60:                    # au-dessous : du bruit de bord
            xs = [c[0] for c in comp]; ys = [c[1] for c in comp]
            taches.append(((max(xs) + min(xs)) / 2.0, (max(ys) + min(ys)) / 2.0,
                           (max(xs) - min(xs) + 1) / 2.0,
                           (max(ys) - min(ys) + 1) / 2.0))
    return sorted(taches, key=lambda t: t[0])


def icone(taches, cote=32, marge=4.0):
    """L'icône d'onglet : l'empreinte en crème sur le bordeaux de la marque.

    Rendue en SVG et glissée telle quelle dans l'en-tête du HTML : à cette
    taille le fichier tient en quelques centaines d'octets, et une icône
    qui ne coûte aucune requête est une requête de moins avant la première
    image de la page.
    """
    x0 = min(t[0] - t[2] for t in taches); x1 = max(t[0] + t[2] for t in taches)
    y0 = min(t[1] - t[3] for t in taches); y1 = max(t[1] + t[3] for t in taches)
    util = cote - 2 * marge
    f = min(util / (x1 - x0), util / (y1 - y0))
    dx = (cote - (x1 - x0) * f) / 2.0 - x0 * f
    dy = (cote - (y1 - y0) * f) / 2.0 - y0 * f
    n = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
    formes = ''
    for cx, cy, rx, ry in taches:
        formes += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (
            n(cx * f + dx), n(cy * f + dy), n(rx * f), n(ry * f))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'
            '<rect width="%d" height="%d" rx="%s" fill="#%02x%02x%02x"/>'
            '<g fill="#%02x%02x%02x">%s</g></svg>'
            % (cote, cote, cote, cote, n(cote * 0.22),
               BORDEAUX[0], BORDEAUX[1], BORDEAUX[2],
               CREME[0], CREME[1], CREME[2], formes))


def main():
    if not os.path.isfile(SOURCE):
        sys.exit('logo.py : %s introuvable' % SOURCE)
    os.makedirs(SORTIE, exist_ok=True)

    net = detourer(Image.open(SOURCE))
    bs = bandes(net)
    if not bs:
        sys.exit('logo.py : rien trouvé dans le fichier')
    print('  %d bande(s) : %s' % (len(bs), ', '.join('%d-%d' % b for b in bs)))

    mot = cadrer(net, *bs[0])
    exporter(mot, 'benka.png')
    exporter(recolorer(mot, BORDEAUX, CLAIR), 'benka-clair.png')
    # Le verrou entier : du haut du logotype au bas du sous-titre.
    complet = cadrer(net, bs[0][0], bs[-1][1])
    exporter(complet, 'benka-complet.png')

    ch = os.path.join(SORTIE, 'benka-carre.png')
    carre(complet).save(ch, optimize=True)
    print('  %-34s %4d x %-4d  %d Ko'
          % (ch, CARRE, CARRE, os.path.getsize(ch) // 1024))

    taches = empreinte(net)
    ch = os.path.join(SORTIE, 'benka-icone.svg')
    io.open(ch, 'w', encoding='utf-8').write(icone(taches))
    print('  %-34s %d tache(s), %d octets'
          % (ch, len(taches), os.path.getsize(ch)))


if __name__ == '__main__':
    main()
