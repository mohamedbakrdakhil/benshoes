# Référencement

## L'état réel, au 13 octobre 2026

Le site **n'est pas encore dans l'index de Google**. Une recherche sur
« benkashoes » ne renvoie rien qui concerne l'atelier.

Ce n'est pas un problème de mots-clés : c'est un problème de découverte. Le
domaine est neuf et aucun site au monde ne pointe vers lui. Google ne le
connaît pas, donc il ne peut pas le classer — ni premier, ni dernier.

Techniquement tout est en ordre et vérifié :

| Contrôle | État |
|---|---|
| `https://benkashoes.ma` → `https://www.benkashoes.ma` | 301, correct |
| `robots.txt` accessible | 200, autorise tout |
| `sitemap.xml` accessible | 200, daté à chaque build |
| En-tête `X-Robots-Tag: noindex` | absent, donc rien ne bloque |
| Balise canonique | pointe sur `www`, cohérente avec la redirection |
| DNS | résout vers GitHub Pages |

Autrement dit : la porte est ouverte, personne n'est encore entré.

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
