"""Sépare le moteur 3D du parcours d'achat et prépare ses images responsive."""
import hashlib
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from minifier import js


def preparer():
    code = js(Path('src/scripts/12-visite.js').read_text())
    empreinte = hashlib.sha256(code.encode()).hexdigest()[:12]
    dossier = Path('assets/js')
    dossier.mkdir(parents=True, exist_ok=True)
    source = dossier / ('showroom-' + empreinte + '.js')
    source.write_text(code)
    Path('.build/showroom-manifest.js').write_text(f"const SHOWROOM_SOURCE='{source.as_posix()}';\n")
    with Path('.build/site.js').open('w') as sortie:
        for chemin in [Path('.build/photos.js'), Path('.build/showroom-manifest.js')]:
            if chemin.exists():
                sortie.write(chemin.read_text() + '\n')
        for chemin in sorted(Path('src/scripts').glob('*.js')):
            if chemin.name != '12-visite.js':
                sortie.write(chemin.read_text() + '\n')

    # Les originaux transparents restent disponibles ; seules ces variantes
    # adaptées aux niches sont transférées pendant la visite.
    from PIL import Image
    for couleur in ('camel', 'cognac', 'noir', 'chocolat'):
        with Image.open(f'assets/visite/niche-as-{couleur}-960.png') as original:
            for largeur in (190, 380):
                hauteur = round(original.height * largeur / original.width)
                image = original.resize((largeur, hauteur), Image.Resampling.LANCZOS)
                image.save(f'assets/visite/niche-as-{couleur}-{largeur}.webp',
                           format='WEBP', quality=85, method=6)
        with Image.open(f'assets/as-by-benka/{couleur}.jpg') as original:
            for largeur in (480, 640, 960):
                hauteur = round(original.height * largeur / original.width)
                image = original.resize((largeur, hauteur), Image.Resampling.LANCZOS)
                image.save(f'assets/as-by-benka/{couleur}-{largeur}.webp',
                           format='WEBP', quality=85, method=6)
    print(f'  showroom différé   {source.name}, {len(code.encode()) // 1024} Ko')


if __name__ == '__main__':
    preparer()
