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

**Cadrage** : vue de trois quarts, la mule seule, fond uni très clair ou détouré.
C'est ce qui s'accorde avec la mise en page. Format carré ou légèrement
vertical, 1200 px de côté minimum, JPEG de qualité 80.

Tout modèle sans photo garde son illustration vectorielle : le site ne
casse jamais, il complète au fur et à mesure.

---

## `videos/` — la boucle de fond du héros

Trois fichiers, tous fabriqués, aucun filmé :

    collection.mp4                 la boucle, 16 s, 303 Ko
    collection-affiche.jpg         l'affiche large (écrans ≥ 901 px)
    collection-affiche-etroite.jpg l'affiche verticale (téléphones)

Ils sortent de `boucle.py`, qui ne lit que `photos-retouchees/opus-*-1.jpg`
— les huit packshots de studio. La boucle fait défiler les huit cuirs, du
beige au noir, en travelling lent, et se referme sur elle-même.

**Pour la refaire** après un changement de coloris :

```bash
python3 boucle.py && ./build.sh
```

**Ce qui se télécharge, et quand.** L'affiche s'affiche toujours : c'est le
décor, et c'est elle que Google mesure. La vidéo ne part qu'ensuite, et
seulement si l'écran est large, la connexion rapide, et le système
n'interdit pas les animations — voir `fondVideo()` dans
`src/scripts/10-revelations.js`. Sur un téléphone marocain en 3G, rien de
plus que les 18 Ko de l'affiche verticale ne part sur le réseau.

**Deux affiches et non une.** Le héros fait 2,34:1 sur ordinateur et 0,39:1
sur téléphone. Une seule affiche 16/9 servie aux deux se retrouve agrandie
de 133 % et rognée des trois quarts sur la colonne étroite : il n'en reste
qu'un gros plan flou. La verticale est composée pour ce cadre-là, la
chaussure à demi effacée pour ne pas concurrencer le texte empilé par-dessus.

**Déclarer une autre vidéo** : ajouter l'identifiant de la section dans
`VIDEOS`, `src/scripts/01-reglages.js`. L'affiche large est obligatoire, la
verticale facultative — sans elle, la large sert partout.
