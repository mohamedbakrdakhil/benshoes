# Images du site

Déposez les fichiers ici, puis lancez `./build.sh` et poussez.

## Logo — `assets/marque/`

| Fichier | Usage |
|---|---|
| `logo.svg` *(idéal)* ou `logo.png` | En-tête et pied de page. Fond transparent. |
| `logo-clair.svg` ou `.png` | Version claire, posée sur les fonds bordeaux foncé. Facultatif. |

Un SVG est préférable : net à toutes les tailles, quelques kilo-octets.
À défaut, un PNG transparent d'au moins 600 px de large.

## Photos produits — `assets/produits/`

Nommage : `<modele>-<coloris>.jpg`

Modèles : `deux` `solo` `noor` `atlas` `oasis` `haut`
Coloris : `noir` `marron` `tabac` `taupe` `beige` `marine` `gris` `bordeaux`

Exemples : `deux-bordeaux.jpg`, `atlas-marron.jpg`, `solo-noir.jpg`

Une photo sans coloris — `deux.jpg` — sert de secours pour toutes les
couleurs de ce modèle.

**Cadrage** : vue du dessus, sandale seule, fond uni très clair ou détouré.
C'est ce qui s'accorde avec la mise en page. Format carré ou légèrement
vertical, 1200 px de côté minimum, JPEG de qualité 80.

Tout modèle sans photo garde son illustration vectorielle : le site ne
casse jamais, il complète au fur et à mesure.
