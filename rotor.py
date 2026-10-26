# -*- coding: utf-8 -*-
"""Refabrique les planches de rotation depuis les clips de l'atelier.

Les premières planches gardaient 260 × 213 pixels par vue. Affichées sur
740 points de large, écran Retina compris, elles étaient étirées près de six
fois : d'où le flou que l'on voyait tourner.

Les clips sources font 1440 × 1440. On en tire 24 vues de 700 × 573, soit
sept fois plus de pixels — et le WebP ramène la planche à 350 Ko, à peine
deux fois et demie l'ancienne. Les .jpg d'origine restent en place : ils
servent de repli aux navigateurs qui ignorent le WebP.

    python3 rotor.py            toutes les couleurs
    python3 rotor.py tabac      une seule
"""
import glob, os, subprocess, sys, tempfile
from PIL import Image

CLIPS   = 'higgsfield-sorties'
SORTIE  = 'assets/produits'
VUES, COLS, RANGS = 24, 6, 4
LARG = 700
RAPPORT = 260 / 213          # le cadrage d'origine, conservé
HAUT = round(LARG / RAPPORT)
FOND = (244, 236, 231)       # le fond de .rotor, pour que rien ne jure

def cadrer(im):
    """Recadre au rapport de la vue, centré — jamais déformé."""
    w, h = im.size
    nh = round(w / RAPPORT)
    if nh <= h:
        y = (h - nh) // 2
        return im.crop((0, y, w, y + nh))
    nw = round(h * RAPPORT)
    x = (w - nw) // 2
    return im.crop((x, 0, x + nw, h))

def planche(clip, cible):
    with tempfile.TemporaryDirectory() as d:
        duree = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=nw=1:nk=1', clip],
            capture_output=True, text=True).stdout.strip()
        fps = VUES / float(duree)
        subprocess.run(['ffmpeg', '-v', 'error', '-i', clip,
                        '-vf', 'fps=%.6f' % fps, '-vframes', str(VUES),
                        d + '/f%02d.png', '-y'], check=True)
        src = sorted(glob.glob(d + '/f*.png'))
        if len(src) < VUES:
            raise SystemExit('%s : %d vues seulement' % (clip, len(src)))
        pl = Image.new('RGB', (LARG * COLS, HAUT * RANGS), FOND)
        for i, p in enumerate(src[:VUES]):
            im = cadrer(Image.open(p).convert('RGB')).resize((LARG, HAUT), Image.LANCZOS)
            pl.paste(im, ((i % COLS) * LARG, (i // COLS) * HAUT))
        pl.save(cible, 'WEBP', quality=80, method=6)

choix = sys.argv[1:] or None
total = 0
for clip in sorted(glob.glob(CLIPS + '/opus-*.mp4')):
    couleur = os.path.basename(clip)[5:-4]
    if choix and couleur not in choix:
        continue
    cible = '%s/rotor-%s.webp' % (SORTIE, couleur)
    planche(clip, cible)
    ko = os.path.getsize(cible) // 1024
    total += ko
    ancien = cible[:-5] + '.jpg'
    av = (os.path.getsize(ancien) // 1024) if os.path.exists(ancien) else 0
    print('  %-9s %dx%d par vue — %4d Ko  (avant : %d Ko en 260x213)'
          % (couleur, LARG, HAUT, ko, av))
print('  %d planche(s), %d Ko au total — une seule se charge à la fois' %
      (len(choix or glob.glob(CLIPS + '/opus-*.mp4')), total))
