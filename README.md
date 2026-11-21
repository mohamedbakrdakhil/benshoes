# Benka Shoes

Boutique publique : [benkashoes.ma](https://www.benkashoes.ma/). Le site est assemblé depuis `src/`, puis publié sur GitHub Pages. Les commandes et le stock passent par Google Apps Script ; `server.js` fournit une variante Node distincte.

## Catalogue et offre

- AS by BENKA : quatre coloris (Camel, Cognac, Noir, Chocolat), pointures 37 à 41, 299 DH la paire. Le PDF contient deux lignes de 5 paires en 37 ; elles sont additionnées : 10 / 7 / 5 / 5 / 3 par coloris, soit 120 paires au départ.
- Opus : huit coloris, pointures 37 à 41, 279 DH la paire.
- Black Friday : un panier d’exactement trois paires Opus coûte 699 DH, livraison offerte au Maroc. Quatre, cinq ou six paires restent au tarif unitaire ; aucun pack multiple automatique.
- Le stock reçu d’Apps Script remplace le stock de repli du catalogue. Le service recalcule les prix et vérifie la disponibilité avant réception.
- Les livraisons internationales nécessitent un devis auprès de l’atelier.

## Développement

Prérequis : Node.js 20 ou plus, Python 3 et un shell POSIX. Aucune dépendance JavaScript à installer.

```sh
npm run build
npm test
python3 -m http.server 8766 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8766/`. Le serveur local sert la version statique ; ses commandes pointent vers le vrai service configuré. Les tests automatisés simulent les envois : ne pas envoyer de fausses commandes depuis l’aperçu.

## Sources

- `src/page.html` : sections, navigation et contenus fixes.
- `src/scripts/01-reglages.js` et `02-catalogue.js` : coordonnées publiques, médias, catalogue et questions fréquentes.
- `04-outils.js`, `06-collection.js`, `07-fiche.js`, `08-panier.js`, `14-evenements.js` : données, filtres, fiches, commande et interactions.
- `11-moteur.js`, `12-visite.js` et les modules associés : showroom traditionnel, visibilité, mouvement et décor de fête.
- `src/styles/` : styles ordonnés ; `18-finitions.css` harmonise les composants et les adaptations mobiles.
- `integrations/tableur.gs` : réception Apps Script, prix, stock, dédoublonnage, export et mise en forme du classeur.
- `tests/` : règles de prix, sécurité de réception, intégrité du panier, animations et chargement différé.

`build.sh` produit `index.html` et `public/index.html`, les images dérivées, le flux catalogue et les données structurées. Il vérifie la cohérence des catalogues et calcule les empreintes de la politique de sécurité. Modifier les sources, puis reconstruire ; ne pas modifier uniquement les fichiers générés.

## Publication

Vérifier le build, les tests et les vues PC/mobile avant de publier sur `main`. GitHub Pages prend en charge le site statique. **Une modification de `integrations/tableur.gs` nécessite aussi une nouvelle version du déploiement Apps Script existant** : une publication GitHub ne met pas ce service à jour.

Conserver le même déploiement et les mêmes droits, remplacer le code vérifié, enregistrer puis choisir « Manage deployments → Edit → New version → Deploy ». Vérifier ensuite le GET public du service, qui expose uniquement son état et le stock, jamais les commandes.

## Données et limites

Ne jamais publier le classeur des commandes ou son CSV : il contient les coordonnées des clients. Les clés privées et mots de passe doivent rester hors du dépôt. Le service public de commande valide les entrées, neutralise les formules de tableur, recalcule les montants et utilise un verrou pour gérer les commandes simultanées.

Une confirmation s’affiche seulement après une réponse positive vérifiable. Si le réseau coupe après réception, le panier reste présent ; une nouvelle tentative identique dans la même page réutilise la clé d’envoi. Les tests ne créent aucune commande réelle.

Voir [le compte rendu d’audit](AUDIT-2026-11-20.md), [l’intégration du tableur](integrations/LISEZMOI.md) et [le référencement](REFERENCEMENT.md).

## Installation du modèle AS

Après remplacement du code Apps Script, exécuter `installerCollectionAS` une fois puis publier une nouvelle version du déploiement existant. La migration ajoute seulement les lignes AS absentes ; elle préserve le stock Opus et toute ligne AS déjà présente. Vérifier le GET public : révision `as-2026-11-21`, prix AS 299 et quatre lignes de stock.
