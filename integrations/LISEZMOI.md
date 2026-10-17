# Recevoir les commandes dans un tableur

> **Déjà installé.** La feuille « Commandes benka » existe dans votre Drive, le
> script est déployé en version 3, et le site lui parle. Ce document reste pour
> comprendre, dépanner, ou tout refaire ailleurs.

Quand un client valide son panier, une ligne s'ajoute toute seule à votre
feuille — date, référence, nom, téléphone, e-mail, adresse, articles, total —
et vous recevez un e-mail. La feuille s'ouvre dans Excel quand vous voulez.

Comptez dix minutes, une seule fois.

---

## 1 · Créer la feuille

Allez sur <https://sheets.new>. Nommez-la **Commandes benka**.
N'y mettez rien : le script crée l'onglet et les colonnes au premier passage.

## 2 · Coller le script

Dans la feuille : menu **Extensions → Apps Script**.

Effacez le `function myFunction() {}` qui s'y trouve, puis collez **tout** le
contenu de `integrations/tableur.gs`.

En haut du script, l'adresse qui reçoit l'alerte est déjà renseignée :

```js
var ALERTE_EMAIL = 'benkashoes@gmail.com';
```

> **Attention** : ce fichier est la source. Le script qui tourne vraiment
> vit chez Google. Tant que vous n'avez pas recollé `tableur.gs` dans Apps
> Script et redéployé, l'ancienne version continue de s'exécuter — et si
> l'adresse y était vide, aucune alerte ne part.

Enregistrez (l'icône disquette, ou ⌘S).

## 3 · Publier

Bouton **Déployer** en haut à droite → **Nouveau déploiement**.

- Roue dentée à gauche → **Application web**
- **Exécuter en tant que** : *Moi*
- **Qui a accès** : *Tout le monde*  ← indispensable, vos clients ne sont pas connectés à Google
- **Déployer**

Google affiche alors un avertissement, parce que le script n'est pas « vérifié »
par eux — c'est normal pour un script personnel :

> **Paramètres avancés** → **Accéder à Commandes benka (non sécurisé)** → **Autoriser**

Il demande deux permissions : écrire dans vos feuilles, et envoyer des e-mails
en votre nom. C'est exactement ce que fait le script, rien de plus.

Copiez l'**URL de l'application web**. Elle ressemble à :

```
https://script.google.com/macros/s/AKfycb..../exec
```

## 4 · Brancher la boutique

Dans `src/scripts/01-reglages.js` :

```js
tableur:'https://script.google.com/macros/s/AKfycb..../exec'
```

Puis :

```sh
./build.sh
git add -A && git commit -m "commandes vers le tableur" && git push
```

Une minute plus tard, c'est en ligne.

> `build.sh` détecte l'adresse et ouvre la politique de sécurité juste ce qu'il
> faut pour lui parler. Tant que la ligne est vide, la page ne contacte
> strictement rien à l'extérieur.

## 5 · Essayer

Passez une vraie commande sur le site avec votre propre numéro. La ligne doit
apparaître dans la feuille en deux ou trois secondes, et l'e-mail arriver.

---

## Travailler dans Excel

Trois façons, de la plus simple à la plus confortable.

**1 · Télécharger ponctuellement**
Dans la feuille : **Fichier → Télécharger → Microsoft Excel (.xlsx)**.

**2 · Excel se met à jour tout seul** — le plus confortable au quotidien.
Dans la feuille : **Fichier → Partager → Publier sur le Web**, choisissez
l'onglet *Commandes* et le format **.csv**, copiez l'adresse. Puis dans Excel :
**Données → À partir du Web**, collez l'adresse. Ensuite un seul clic sur
**Actualiser tout** suffit : vos filtres, vos couleurs et vos formules restent.

**3 · Sans rien installer du tout**
L'espace commandes du site (`/#admin`) a un bouton **Exporter Excel** qui
fabrique un vrai `.xlsx` dans le navigateur — dates, montants et filtres déjà
en place. Utile pour les commandes que vous saisissez à la main, ou si vous
préférez ne pas passer par Google.

---

## Ce qui protège cette adresse

Elle est publique — elle est dans le code de la page, n'importe qui peut la
lire et lui écrire. Le script part donc du principe que tout ce qui arrive est
hostile :

| | |
|---|---|
| **Prix** | recalculés dans le script, à partir de son propre catalogue. Ce que le navigateur annonce n'est jamais lu. |
| **Modèle, coloris, pointure** | vérifiés contre le catalogue. Un Opus en burgundy est refusé : ce coloris n'existe pas. |
| **Quantités** | bornées à 10 par ligne, 20 lignes par commande. |
| **Textes** | coupés (80 caractères pour un nom, 200 pour une adresse) et débarrassés des caractères de commande. |
| **Formules** | une cellule qui commence par `=`, `+`, `-` ou `@` est préfixée d'une apostrophe. Sans cela, un client nommé `=IMPORTXML(...)` ferait sortir le contenu de votre feuille vers son serveur à la seconde où vous l'ouvrez. |
| **Robots** | un champ invisible dans le formulaire. Un humain ne le voit pas, un robot le remplit : la commande est jetée en silence. |
| **Débit** | 40 commandes par heure au maximum. Au-delà, le script refuse. |
| **Doublons** | chaque commande porte une clé. Si le navigateur renvoie la même, la ligne n'est pas écrite deux fois. |

**Ce que cela n'empêche pas** : quelqu'un de déterminé peut déposer de fausses
commandes à la main, comme il pourrait vous téléphoner pour rien. Si cela
arrive, baissez `MAX_PAR_HEURE`, ou dites-le-moi et j'ajoute une question
simple à la validation.

**Où vont les données** : dans votre compte Google, et nulle part ailleurs. Ni
moi ni le site ne les conservent.

---

## Si vous changez les prix

Le script a son propre catalogue — c'est ce qui le rend sûr. Si vous modifiez
un prix dans `src/scripts/02-catalogue.js`, **modifiez-le aussi** dans
`CATALOGUE` en tête de `tableur.gs`, puis **Déployer → Gérer les déploiements →
modifier → Nouvelle version**.

`build.sh` compare les deux et vous avertit s'ils divergent.

## Si rien n'arrive

1. Ouvrez l'URL `/exec` dans un navigateur : elle doit répondre
   `{"service":"Benkashoes — réception des commandes","methode":"POST"}`.
   Sinon le déploiement n'est pas public — reprenez l'étape 3.
2. Dans Apps Script, **Exécutions** (à gauche) montre chaque appel reçu et
   l'erreur éventuelle.
3. Le client n'est jamais bloqué : si l'envoi échoue, il reçoit son
   récapitulatif à vous transmettre par WhatsApp ou e-mail.
