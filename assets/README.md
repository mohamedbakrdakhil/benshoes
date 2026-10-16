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

Ils sortent de `boucle.py`. La boucle fait défiler les huit cuirs, du beige
au noir, et se referme sur elle-même.

**Deux sources possibles, et l'outil choisit tout seul.** S'il trouve les
huit clips dans `higgsfield-sorties/`, il les emploie : ce sont de vrais
mouvements de caméra. Sinon il retombe sur `photos-retouchees/opus-*-1.jpg`
et calcule un travelling avant sur les packshots — plus plat, mais il ne
dépend de rien.

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

---

## `higgsfield-sorties/` — les huit plans filmés

Un clip de 5 s par coloris, rendu par **Kling 2.6** à partir du packshot du
coloris lui-même. Ils ne partent jamais sur le site : `build.sh` ne publie
que `assets/`. Ils servent uniquement de matière à `boucle.py`.

**Le modèle ne sert qu'au mouvement.** Tout le reste — l'assombrissement, le
bordeaux de la marque, le fondu des bords, l'enchaînement — est le même code
que pour les photos. Le produit montré est celui des packshots.

**La fidélité a été vérifiée, pas supposée.** Un premier essai avec Seedance
2.0 Mini tenait deux secondes sur cinq : au-delà, la fente de la bride penny
s'effaçait et le talon de la mule se refermait — ce n'était plus le même
produit, et une cliente qui commande sur cette image renvoie le colis. Kling
2.6 tient les cinq secondes sur les huit coloris : talon ouvert, fente,
ornement à trois carrés, couture d'empeigne, « benka » estampé lisible.
Contrôlé coloris par coloris, à la première et à la dernière image gardée.

Seules les **68 premières images** de chaque clip servent, soit 2,83 s —
exactement la durée de vie d'un plan dans la boucle, et la portion où la
dérive est la plus faible.

**Les refaire coûte des crédits Higgsfield** (10 par coloris, 80 en tout).
C'est pourquoi les clips sont versionnés malgré leur poids : les perdre
voudrait dire les racheter. Si le dossier disparaît, `boucle.py` continue de
fonctionner sur les packshots, sans rien casser.

---

## `marque/` — le logo

Cinq fichiers, tous sortis de `logo.py` depuis `logo-source/benka-logo.png` :

    benka.png          le logotype, bordeaux   — en-tête sur fond clair
    benka-clair.png    le logotype, crème      — bandeaux bordeaux, thème sombre
    benka-complet.png  avec « FOOTWEAR »       — impression, réseaux sociaux
    benka-carre.png    sur fond blanc, 600²    — données structurées Google
    benka-icone.svg    l'empreinte seule       — icône d'onglet

**Pour les refaire** après une retouche du logo :

```bash
python3 logo.py && ./build.sh
```

**Pourquoi deux couleurs et non une.** Le bordeaux de la marque, `#781e16`,
tient 1,85:1 de contraste sur le fond `#140a08` du thème sombre : il y est
illisible. `poserLogo()` choisit donc la version crème dans deux cas sans
rapport — sur les bandeaux bordeaux quel que soit le thème, et partout dès
que le thème est sombre. Le logo étant une image et non du texte, aucune
variable CSS ne le suit : le basculement du thème le rappelle lui-même.

**Pourquoi le logotype seul dans l'en-tête.** « FOOTWEAR » mesure 25 px sur
les 1600 du fichier d'origine. Ramené à une hauteur d'en-tête de 30 px, il
ferait une bavure d'un pixel et demi. Le verrou entier reste disponible dans
`benka-complet.png` pour les usages où il a la place d'exister.

**Pourquoi l'empreinte pour l'onglet.** À 32 px un logotype est illisible.
L'empreinte — l'ovale du gros orteil et ses quatre points — est le seul
élément qui tienne, et c'est la marque elle-même. Sa géométrie est relevée
sur le fichier, pas dessinée à vue : le pied qui servait d'icône jusqu'ici
faisait décroître les points bien plus vite que la vraie empreinte.

---

## `visite/` — les paires détourées du show-room

Deux fichiers par coloris, `niche-<coloris>-190.png` et `-380.png`, servis
en `srcset` selon la largeur réelle de la niche (95 px sur téléphone,
230 px sur ordinateur) — et non selon la largeur de l'écran.

**Pourquoi ils existent.** Le mur de la collection montrait huit fois le
même packshot, seule la couleur changeant, chacun posé sur le rectangle
blanc du fond de studio. Dans une niche en bois chaud, ça faisait huit
autocollants alignés.

Chaque coloris a maintenant **son angle de caméra**, pris dans le plan
filmé correspondant (`higgsfield-sorties/`, image 5 + 12 × rang) : la vue
tourne progressivement le long de l'étagère, comme devant de vraies paires
posées. Le fond est retiré — détourage Higgsfield, 1 crédit par image.

**L'ombre n'est pas dans le fichier**, elle est portée par la CSS en
`drop-shadow`, qui suit la découpe. Une ombre dessinée dans l'image serait
un rectangle, et c'est exactement ce que faisait l'ancien `box-shadow` :
sur une image transparente il cerne la boîte, pas la chaussure.

**Plus léger, aussi** : 147 Ko pour les huit, contre 512 Ko de packshots en
960 px que la scène chargeait sans en avoir l'usage.

**Pour les refaire** : extraire une image de chaque clip, la passer au
détoureur, recadrer sur la silhouette, exporter en palette de 128 couleurs.
Sans le dossier, il faut remettre `visuel()` dans `niche()`.
