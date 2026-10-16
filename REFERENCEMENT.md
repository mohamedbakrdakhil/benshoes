# Référencement

## L'état réel, au 13 octobre 2026 (18 h)

Le site est **déclaré et validé dans la Search Console**, le plan du site est
soumis et lu, et l'indexation est demandée.

| Contrôle | État |
|---|---|
| Propriété `https://www.benkashoes.ma/` | **validée** (fichier HTML) |
| Plan du site | **envoyé**, lu le 13 oct., 1 page découverte |
| Indexation | **demandée** |
| Test en direct Googlebot | « Google a accès à cette URL » |
| Exploration autorisée | oui |
| Récupération de page | réussie |
| Indexation autorisée | oui |
| Canonique déclarée | `https://www.benkashoes.ma/` |
| Extraits de produits | **3 éléments valides** |
| Fiches de marchand | **3 éléments valides** |
| `https://benkashoes.ma` → `www` | 301, correct |
| En-tête `X-Robots-Tag: noindex` | absent |

Google indique la page comme « Détectée, actuellement non indexée » : c'est
l'état normal d'une adresse tout juste découverte. L'exploration suit.

**Deux avertissements non critiques** sur chaque produit : champs `review` et
`aggregateRating` absents. C'est délibéré. Les remplir signifierait inventer
des avis et des notes que la boutique n'a pas encore ; Google l'interdit et
sanctionne la page entière. Ils viendront avec les premiers vrais avis.

### Les deux preuves de propriété — ne pas les supprimer

- `googleda42fe0b92307fea.html` à la racine du dépôt
- la balise méta, dont le jeton vit dans `.google-verif` et que `build.sh`
  repose à chaque construction

Google retire le statut de propriétaire si la preuve disparaît. Le jeton est
dans un fichier et non dans une variable d'environnement précisément pour
qu'un build distrait ne l'efface pas en silence.

## Ce qui a été fait sur le site

- **Données structurées** (`seo.py`) : un graphe `Organization` + `WebSite` +
  `ShoeStore` + trois `Product` + `FAQPage`, **généré depuis le catalogue**.
  Un prix recopié à la main vieillit en silence : Google continuerait
  d'annoncer 299 DH longtemps après un changement de tarif, et c'est le genre
  d'écart qui fait retirer les résultats enrichis.
- **Variantes du nom** déclarées en `alternateName` : Benka, benka,
  Benka Shoes, BenkaShoes, Benkashoes Maroc, Atelier Benkashoes,
  Benka chaussures, Benka Fès. C'est ce qui permet à Google de rattacher
  toutes ces orthographes à une seule et même maison.
- **La collection est désormais dans le HTML servi.** Avant, `#grid` était
  vide et les trois modèles n'existaient que si le navigateur exécutait le
  script : ni un visiteur sans JavaScript, ni un robot qui n'en exécute pas
  ne voyaient le moindre produit. Le repli est fabriqué au build depuis le
  même catalogue (1204 → 1940 mots servis tels quels).
- **Image de partage** 1200×630 (`assets/marque/partage-1200x630.jpg`),
  déclarée en `og:image` et dans le plan du site. Avant, un lien partagé sur
  WhatsApp ou Facebook n'affichait aucune vignette.
- Balises `robots` (avec `max-image-preview:large`), `author`, `geo.region`,
  `og:locale` en `fr_MA`, carte Twitter en grand format.
- Le plan du site est daté du jour à chaque build et déclare l'image.

## Core Web Vitals

Mesurés sur le site en ligne, dans un navigateur réellement au premier plan
(une mesure prise dans un onglet d'arrière-plan donne un FCP faux : Chrome y
diffère la première peinture).

| Métrique | Valeur | Seuil « bon » |
|---|---|---|
| FCP | 124–476 ms | < 1800 ms |
| **LCP** | **1068–1088 ms** | < 2500 ms |
| CLS | 0 | < 0,1 |
| Tâches longues | aucune | — |
| Blocage total | 0 ms | < 200 ms |
| Transfert | 55 Ko (190 Ko décompressés) | — |
| Requêtes | 5 | — |

### Ce qui fixe le LCP : l'entrée du héros, pas le réseau

L'élément que Google mesure est le **paragraphe du héros**. Tant qu'il est à
opacité nulle, la page compte comme non peinte. Son animation d'entrée valait
donc directement des millisecondes de classement :

| | Avant | Après |
|---|---|---|
| `.hero p` | `.8s` après `.42s` | `.55s` après `.36s` |
| Fin de l'entrée | 1,22 s | 0,91 s |
| Écart LCP − FCP mesuré | 1236 ms | **945 ms** |

La cascade est intacte — surtitre, les trois lignes du titre, le paragraphe,
les boutons — chacun démarre toujours après le précédent.

Sur une machine rapide le LCP passait déjà. Le calcul change sur une 4G
marocaine en cache froid : ce délai-là s'ajoute au temps réseau au lieu de s'y
cacher. **Toute animation d'entrée posée sur un gros bloc de texte au-dessus
de la ligne de flottaison se paie en LCP** — c'est la règle à retenir avant
d'en ajouter une.

## Le vrai logo, et ce qu'il change pour Google

Posé le 16 octobre 2026, depuis le fichier de marque fourni par l'atelier.

- **`Organization.logo` pointe désormais sur un vrai logo**,
  `benka-carre.png`, 600×600 sur fond blanc. Il pointait sur l'image de
  partage, qui est une photo de produit. Google attend ici la marque sur
  fond plein : c'est ce fichier qu'il affiche dans l'encadré de marque à
  droite des résultats, et c'est un des signaux qui construisent l'entité
  « Benkashoes ». L'image de partage, elle, reste en `og:image`, où sa place
  est juste.
- **La description servie était fausse.** Elle annonçait « trois modèles »
  et « livraison offerte dès 400 DH », alors que le catalogue est à un
  modèle et la livraison gratuite pour tout le monde. C'est le texte que
  Google affiche sous le titre : un client qui lit 400 DH et trouve 259 DH
  gratuits n'est pas déçu, mais l'inverse arrive aussi, et une description
  démentie par la page se fait remplacer par un extrait choisi au hasard.
- **L'icône d'onglet** est l'empreinte de la marque, en adresse de données :
  459 octets dans l'en-tête, aucune requête.

## La boucle de fond du héros

Ajoutée le 15 octobre 2026, refaite le 16 en plans filmés.

Chaque plan part du packshot de son coloris ; **Kling 2.6 n'apporte que le
mouvement de caméra**, le produit reste celui des photos. La fidélité a été
contrôlée coloris par coloris avant d'aller plus loin — un premier modèle
refermait le talon de la mule après deux secondes, ce qui en faisait un
autre produit. Détail dans `assets/README.md`.

Si les clips disparaissent, `boucle.py` retombe sur les packshots et calcule
le travelling lui-même : le site ne dépend d'aucun service.

| | Poids | Qui le reçoit |
|---|---|---|
| `collection-affiche-etroite.jpg` | 18 Ko | tout écran ≤ 900 px |
| `collection-affiche.jpg` | 28 Ko | tout écran ≥ 901 px |
| `collection.mp4` | 303 Ko | écran large **et** connexion rapide **et** animations autorisées |

Trois points qui touchent au classement :

- **L'affiche est préchargée**, et par requête de média : le navigateur ne
  télécharge que celle de sa largeur, et il la découvre pendant la lecture
  du HTML, avant même la feuille de style. Mesuré en local : départ à 15 ms,
  reçue à 20 ms. Sans ce préchargement elle n'était découverte qu'au moment
  où le script la réclame, c'est-à-dire après tout le reste — et comme elle
  occupe tout le bandeau, c'est elle que Google prend pour repère.
- **Aucun décalage de mise en page** : l'affiche et la vidéo occupent la
  même boîte, en fond, et la vidéo n'apparaît qu'en fondu une fois prête.
  CLS mesuré à 0, inchangé.
- **Le LCP reste à vérifier sur le site en ligne**, dans un navigateur
  réellement au premier plan. Le volet intégré utilisé pendant le
  développement exécute la page en arrière-plan : il n'enregistre aucune
  entrée de peinture, ses chiffres ne valent rien. C'est la même précaution
  que pour les mesures du tableau plus haut.

## IndexNow : les moteurs qu'on peut prévenir sans compte

Google n'accepte pas qu'on lui annonce une adresse : il faut passer par la
Search Console, donc par un navigateur connecté au compte du propriétaire.

Bing, Yandex, DuckDuckGo et Seznam acceptent le protocole **IndexNow** : une
clé déposée à la racine du site prouve qu'on en est responsable, et une simple
requête leur dit « venez voir ». Aucun compte, aucune connexion.

La clé est dans un fichier `<clé>.txt` à la racine du dépôt, recopié dans
`public/` par `build.sh`. Pour réannoncer le site après une refonte :

```bash
CLE=$(cat .indexnow-cle)
curl -s -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json' \
  -d '{"host":"www.benkashoes.ma","key":"'"$CLE"'",
       "keyLocation":"https://www.benkashoes.ma/'"$CLE"'.txt",
       "urlList":["https://www.benkashoes.ma/"]}'
```

Une réponse `200` ou `202` signifie que l'annonce est acceptée. Cela **ne
remplace pas** la Search Console : Google reste à faire, et Google est de loin
le premier moteur au Maroc.

## Ce que vous seul pouvez faire — par ordre d'importance

### 1. Search Console (le seul geste vraiment urgent)

1. Ouvrez <https://search.google.com/search-console> avec votre compte Google.
2. Ajoutez une propriété de type **Domaine** : `benkashoes.ma`.
3. Google donne un enregistrement **TXT** à poser dans le DNS, chez
   NindoHost. C'est la méthode à préférer : elle couvre `www`, l'apex et
   l'e-mail d'un coup.
   *Variante* : si vous préférez la balise HTML, Google donne un jeton et le
   build sait le poser —
   ```bash
   GOOGLE_VERIF=le-jeton-donné-par-google ./build.sh
   ```
4. Une fois la propriété validée : **Sitemaps** → soumettre
   `https://www.benkashoes.ma/sitemap.xml`.
5. **Inspection de l'URL** → coller `https://www.benkashoes.ma/` →
   **Demander l'indexation**.

Comptez quelques jours à deux semaines avant la première apparition.

### 2. Une fiche Google Business Profile

<https://business.google.com> — pour un atelier marocain, c'est le geste qui
crée l'entité « Benkashoes » aux yeux de Google : encadré de marque à droite
des résultats, présence dans Maps, et un rattachement fort entre le nom et le
site. Gratuit.

### 3. Au moins un lien entrant

Un domaine sans aucun lien reste long à indexer même déclaré. Le plus simple :
mettre `https://www.benkashoes.ma` dans la bio Instagram et sur la page
Facebook de l'atelier, puis renseigner ces adresses dans le site :

```js
// src/scripts/01-reglages.js
reseaux:['https://www.instagram.com/votre-compte/',
         'https://www.facebook.com/votre-page'],
```

Elles partent alors en `sameAs` dans les données structurées — le signal le
plus fort pour dire « ce site, ce compte et cette fiche sont la même maison ».

### 4. Les coordonnées manquantes

`SHOP.whatsapp` est vide et `contact@benkashoes.ma` n'a pas d'enregistrement
MX. Une cliente qui veut joindre l'atelier autrement que par le formulaire ne
peut pas. Ça pèse sur la conversion, et les coordonnées complètes comptent
aussi pour la fiche Google Business.

## Les mots-clés, honnêtement

| Requête | Atteignable ? |
|---|---|
| `benkashoes`, `benka shoes`, `benkashoes maroc` | **Oui, premier.** Nom exact, domaine exact, aucun concurrent. Quasi automatique une fois indexé. |
| `benkasho`, `benkash` | **Oui.** Google les traite comme un préfixe ou une faute de frappe de la marque une fois celle-ci connue. |
| `benka` | **Probable, pas garanti.** « Benka » est aussi un patronyme et d'autres marques le portent. Atteignable au Maroc. |
| `benk` | **Difficile.** Trop court, déjà occupé ailleurs. |
| `ben` | **Non, et personne ne peut le promettre.** Trois lettres parmi les plus génériques du web — Ben Affleck, Big Ben, « ben » qui veut dire « fils de ». Aucun travail de référencement ne place un atelier de chaussures devant ça. |
| `banka` | **À ne pas chercher.** Ce n'est pas votre nom : « banka » veut dire banque dans plusieurs langues. Viser cette requête serait de l'effort perdu, et courir après une orthographe qui n'est pas la vôtre ressemble à du détournement de trafic. |

Le vrai levier n'est pas d'ajouter des mots-clés : c'est de **se faire
indexer**, puis de laisser le nom exact faire son travail. Une marque avec son
propre domaine se classe première sur son propre nom dès que Google la
connaît.

À plus long terme, les requêtes qui amènent des clientes ne sont pas des
fragments du nom mais des intentions : « mule en daim maroc »,
« mocassin femme cuir fès », « chaussure première liège ». Celles-là
demandent du contenu — une page par modèle, un journal d'atelier — et c'est un
autre chantier.

## Entretien

`seo.py` relit le catalogue à chaque build. Changer un prix, un coloris ou un
stock dans `src/scripts/02-catalogue.js` met à jour les données structurées et
le repli sans script sans rien avoir à retoucher ici.

## Le style marocain, et ce qu'il coûte

Posé le 16 octobre 2026. Zellige, arc en plein cintre, typographie ronde.

**Zéro octet de police en plus.** Baloo 2 était déjà servie — elle ne
servait plus à rien depuis que le vrai logo a remplacé le logotype dessiné.
Elle est simplement préchargée maintenant qu'elle porte les titres de
section (+18 Ko sur le chemin critique, et c'est tout).

**Zéro image.** Le zellige est fait de cinq dégradés CSS empilés, repris du
show-room. Les arcs sont des `border-radius`. Rien ne se télécharge.

**Les contrastes, mesurés dans les deux thèmes** — c'est ce qui a imposé de
scinder le vert en deux jetons. Le vert profond du zellige est la matière
(carreau, fond de puce) ; un second, plus clair en thème sombre, porte le
texte. Un seul jeton tombait à 3,3:1 sur le fond sombre, sous les 4,5
exigés pour un surtitre de onze pixels.

| | clair | sombre |
|---|---|---|
| Surtitre vert sur la page | 8,3:1 | 5,9:1 |
| Texte blanc sur puce verte | 8,3:1 | 5,9:1 |
| Chiffre des statistiques | 7,8:1 | 5,5:1 |

**CLS resté à 0**, aucun débordement horizontal, de 375 à 1440 px.

