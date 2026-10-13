# Benkashoes

Boutique de mocassins-mules en daim, première en liège estampée benka. Site statique, un seul fichier, sans dépendance ni build complexe.

**En ligne :** https://www.benkashoes.ma/
**Espace atelier :** https://www.benkashoes.ma/#admin

## Ce que contient le site

- Trois modèles — Opus (299 DH), Stepy (259 DH), Western (359 DH) — en huit cuirs, pointures 37 à 41, illustrés en SVG généré.
- Une visite en 3D au défilement, en neuf chapitres : **Fès d'abord** — la porte au lever du jour, la derb et ses zelliges sous la claie de roseau, les cuves des tanneries de Chouara — puis la façade benka au bout de la rue, l'allée, et le mur des quatorze cuirs. Tout est dessiné en dégradés CSS : pas une image à télécharger.
- Des passants marchent dans la derb et deux clients longent le mur du
  show-room, où trois mannequins de couturière attendent devant les vitrines.
  Une silhouette tient dans **un seul plan** : le SVG est dessiné dedans, et le
  pas est une animation CSS sur les jambes — elle tourne sur le compositeur,
  sans une ligne de JavaScript. Seul le déplacement le long de la rue est
  piloté par le moteur, et la marche se met en pause dès que la visite quitte
  l'écran.
- Le décor est groupé par quartier (`ZONES`). Un quartier hors de portée de la caméra est retiré du document : il ne coûte plus un seul calque graphique. C'est ce qui permet de doubler le décor en divisant la mémoire par quatre — 82 Mo au plus fort contre 320 avant, 19 Mo sur téléphone contre 47.
- Un plan sans contenu et trop grand est dessiné réduit puis agrandi par la transformation (`pane()`, facteur `--f`). Au-delà d'environ deux millions de pixels, le navigateur renonce à peindre un dégradé et n'en dessine qu'une bande : c'est ce qui tronquait les zelliges de la porte.
- Filtres par cuir, fiche produit, choix de pointure avec stock réel, panier, commande en trois étapes.
- Menu de sections sur téléphone : sous 860 px la barre de navigation disparaissait sans rien à la place.
- Coupe annotée de la semelle, guide des pointures en millimètres, photos d'atelier, thème clair/sombre.
- Espace commandes : chiffre d'affaires, commandes à traiter, panier moyen, suivi des statuts, saisie manuelle, édition des prix et du stock, sauvegarde JSON, et **export Excel** — un vrai `.xlsx` fabriqué dans le navigateur, sans bibliothèque (`src/scripts/09b-export-excel.js`). Dates et montants typés, en-tête figé, filtre posé. Le CSV reste disponible, mais il se répartit mal dans un Excel français et lit les montants comme du texte.

## Comment le code est rangé

Il n'y a plus de fichier unique : `build.sh` assemble le site à partir de
modules, dans l'ordre de leurs numéros.

```
src/
  page.html              le balisage
  styles/
    00-polices.css       @font-face, polices servies par le site
    01-fondations.css    variables, remise à zéro, utilitaires
    02-mouvement.css     animations, transitions, mouvement réduit
    03-ossature.css      en-tête, héros, sections, pied de page
    04-architecture.css  barre de progression, chiffres, comparatif, questions
    05-atelier.css       la galerie horizontale
    06-visite.css        la scène 3D : Fès, la boutique, le show-room
    07-boutique.css      panneaux, fiche produit, panier, formulaires
    08-commandes.css     l'espace commandes
  scripts/
    01-reglages.js       vos coordonnées, le logo, les photos
    02-catalogue.js      pointures, coloris, modèles, questions
    03-dessins.js        les illustrations en SVG
    04-outils.js         état, échappement, stockage local, assainisseur
    05-theme.js          clair / sombre
    06-collection.js     la grille et les filtres
    07-fiche.js          la fiche produit
    08-panier.js         panier, livraison, envoi de la commande
    09-commandes.js      l'espace commandes
    10-revelations.js    apparitions au défilement
    11-moteur.js         la boucle d'animation unique
    12-visite.js         géométrie de la scène, caméra, quartiers
    13-atelier.js        le panoramique horizontal
    14-evenements.js     tous les écouteurs
    15-demarrage.js      l'amorçage
```

Trois outils accompagnent l'assemblage :

- **`minifier.py`** allège le fichier livré sans jamais toucher aux sources.
  Chaque traitement est choisi pour ne rien pouvoir casser — le détail est en
  tête du fichier.
- **`csp.py`** scelle chaque script en ligne par son empreinte SHA-256 et
  n'ouvre `connect-src` que si le tableur est configuré.
- **`verif-catalogue.py`** compare le catalogue du site à celui du script du
  tableur. Deux catalogues, c'est deux occasions de diverger — et un prix
  changé d'un seul côté ferait facturer autre chose que l'affiché.
- **`build.sh`** orchestre, et refuse de livrer si le scellage a échoué.

Le dossier `.build/` ne contient que des fichiers intermédiaires ; il n'est pas
versionné.

## Personnaliser

**Coordonnées** — `src/scripts/01-reglages.js`, le bloc `const SHOP` :

```js
const SHOP={
  email:'contact@benkashoes.ma',   // votre vraie adresse e-mail
  phone:'',                       // ex. '+33 6 12 34 56 78'  (vide = masqué)
  whatsapp:'',                    // ex. '33612345678' indicatif SANS le +  (vide = bouton masqué)
  site:'www.benkashoes.ma'
};
```

Renseigner `whatsapp` fait apparaître un bouton « Envoyer sur WhatsApp » : le client arrive sur votre WhatsApp avec sa commande déjà rédigée. C'est le moyen le plus simple de recevoir les commandes.

**Modèles, prix, stock** — le tableau `CATALOG` dans `src/scripts/02-catalogue.js`. Les prix et le stock se modifient aussi depuis l'espace atelier, sans toucher au code.

## Publier une modification

```sh
./build.sh
git add -A && git commit -m "mise à jour" && git push
```

`build.sh` réassemble `index.html` à partir des modules de `src/`, l'allège, y pose la politique de sécurité et les métadonnées de référencement. GitHub Pages met le site à jour en une minute environ.

## Le carnet de commandes Excel

`integrations/carnet-excel.py` fabrique `benkashoes-carnet.xlsx` : quatre
feuilles — tableau de bord qui se calcule seul, journal des commandes,
catalogue, stock.

```sh
python3 integrations/carnet-excel.py benkashoes-carnet.xlsx
```

Les colonnes A à P du journal sont **exactement** celles que produisent le site
et le script du tableur : une exportation se colle sous l'en-tête sans rien
réaligner. Q et R sont libres pour votre suivi.

Écrit sans bibliothèque, comme l'export du site — un `.xlsx` est une archive de
fichiers XML.

## Recevoir les commandes dans un tableur

Chaque commande validée dépose une ligne dans une feuille Google — date,
référence, nom, téléphone, e-mail, adresse, articles, total — et vous envoie
un e-mail. La feuille se télécharge en `.xlsx` pour Excel.

Dix minutes à installer, une seule fois : **`integrations/LISEZMOI.md`**.

Le script receveur (`integrations/tableur.gs`) ne fait confiance à rien : il
recalcule les prix depuis son propre catalogue, vérifie modèle, coloris et
pointure, borne les textes, désamorce les formules avant qu'elles n'entrent
dans la feuille, écarte les robots par un champ invisible et refuse les
doublons grâce à une clé par commande. 25 vérifications automatiques couvrent
ces points — `node .travail/essai-tableur.js` après avoir recréé le banc.

Tant que `SHOP.tableur` est vide, la page ne contacte rien à l'extérieur et la
politique de sécurité reste entièrement refermée sur `'self'` ; `build.sh`
l'ouvre tout seul, et juste ce qu'il faut, le jour où vous renseignez
l'adresse.

## Où sont les commandes

Sur cet hébergement statique il n'y a pas de serveur. Le client valide son panier, le site lui donne une référence et un récapitulatif qu'il vous envoie par WhatsApp ou par e-mail. Vous le saisissez ensuite dans l'espace atelier, qui enregistre tout dans le navigateur de l'appareil que vous utilisez.

Deux conséquences à connaître :

- Le carnet de commandes ne suit pas d'un appareil à l'autre. Utilisez le bouton **Sauvegarder** régulièrement, et **Restaurer** sur l'autre appareil.
- L'adresse `#admin` n'est protégée par aucun mot de passe sur l'hébergement statique. Qui la connaît peut l'ouvrir. Un vrai contrôle d'accès demande un serveur : c'est ce que fait `server.js`, avec mot de passe et jeton de session.

Pour des commandes qui arrivent toutes seules et un paiement en ligne, il faut passer à un hébergement avec serveur (Shopify, ou Netlify/Cloudflare avec une petite base).

## Sécurité

Ce qui est en place, et pourquoi.

**Sur la page, côté client**

- Toute commande venue d'ailleurs — le serveur ouvert à tous, la base partagée, un fichier de sauvegarde restauré — passe par `nettoyerCommande()` avant d'être affichée : pointures, statuts et noms de modèles sont repris du catalogue, les textes coupés et débarrassés des caractères de commande. Un nom de modèle soumis par un client n'atteint jamais la page.
- Tout ce qui est écrit par un client est ensuite échappé à l'affichage (`esc`, `att`). Sans cela, un client malveillant pourrait glisser un script dans son nom de famille et le faire tourner dans l'espace commandes du propriétaire, qui y lit le jeton de session.
- L'export CSV désamorce les formules : une cellule qui commence par `=`, `+`, `-` ou `@` est préfixée d'une apostrophe, sinon le tableur l'exécuterait à l'ouverture.
- Une politique de sécurité du contenu est posée dans la page, chaque script en ligne scellé par son empreinte SHA-256 (`csp.py`, appelé par `build.sh`). Un script injecté n'aurait ni l'empreinte pour s'exécuter, ni le droit de se connecter ailleurs pour emporter ce qu'il a lu.
- L'espace commandes refuse de s'ouvrir dans un cadre étranger — l'en-tête qui l'interdirait n'est pas réglable sur GitHub Pages, la page le vérifie donc elle-même.

**Sur `server.js`**

- Les prix et le stock sont recalculés par le serveur : ce que le navigateur annonce n'est jamais cru.
- Mot de passe comparé sur empreinte de longueur fixe, en temps constant ; sans cela le temps de réponse révélerait sa longueur.
- Limitation du débit par adresse : 10 commandes par heure, 8 tentatives de connexion par quart d'heure. Posez `TRUST_PROXY=1` derrière un proxy, sinon l'en-tête `x-forwarded-for` est écrit par le client et la limitation se contourne.
- Service de fichiers borné au dossier `public` (séparateur compris, pour qu'un dossier voisin ne passe pas), 404 réel sur un fichier absent.
- En-têtes envoyés à chaque réponse : CSP, `x-frame-options`, `nosniff`, `referrer-policy`, `permissions-policy`, COOP/CORP, et HSTS quand la connexion est chiffrée.

**Ce qui reste à votre charge**

- `ADMIN_PASSWORD` et `SESSION_SECRET` sont des variables d'environnement, jamais dans le dépôt. Sans `ADMIN_PASSWORD`, l'espace commandes du serveur reste fermé.
- Le paiement en ligne n'est pas branché : aucune coordonnée bancaire ne transite par ce site, et c'est voulu tant qu'il n'y a pas de prestataire de paiement.

## Licence

Code et design : usage libre pour le projet Benkashoes.
