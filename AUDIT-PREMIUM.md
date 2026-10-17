# Refonte premium Benkashoes

Version préparée le 17 octobre 2026 à partir du dépôt benshoes. Les modifications sont proposées sur une branche dédiée ; elles ne remplacent pas automatiquement le site en production.

## Design et achat

- Nouvelle direction ivoire et bordeaux, titres Newsreader, photographie réelle de l’Opus en accueil et boutons plus lisibles.
- Collection directement après l’accueil : huit coloris, cartes photographiques et filtre réinitialisable.
- Galerie de l’atelier parcourable horizontalement, sans imposer plusieurs écrans de défilement vertical.
- Visite 3D conservée en fin de page et initialisée à son ouverture uniquement.
- Fiche produit avec une vue principale et les vues supplémentaires à la demande : les options de pointure sont plus proches.
- Section d’entretien dédiée, lien du pied de page corrigé, menu mobile et thèmes clair/sombre conservés.
- Polices de l’accueil préchargées et suppression du téléchargement de la vidéo d’accueil.

## Corrections

- Catalogue initial du serveur aligné sur le catalogue public : Opus, 259 DH, livraison offerte au Maroc. Les réglages déjà enregistrés par l’atelier dans une base existante restent prioritaires ; vérifier ces réglages lors d’une migration serveur.
- Noms et couleurs des articles de commande établis par le serveur.
- Stock cumulé entre les coloris d’un modèle pour une même pointure, contrôlé avant ajout et validation.
- Navigation vers les sections préservée : les changements d’ancre ne renvoient plus tous en haut de page.
- Références aléatoires corrigées : l’ancien tirage pouvait dépasser la longueur de l’alphabet et insérer « undefined ».
- Une réponse de tableur illisible, opaque, sans référence ou en échec ne vaut plus confirmation. Le panier reste disponible et une erreur persistante est affichée. Délai réseau borné à 15 secondes. Les essais inchangés réutilisent leur clé pendant la session.
- Protection contre les doubles clics pendant une commande sur le serveur.
- Suppression de l’annonce d’un e-mail automatique que le serveur n’envoie pas.
- Formulaire en ligne limité au Maroc ; les livraisons internationales passent par un devis auprès de l’atelier pour ne pas afficher des frais de livraison erronés.
- Champs obligatoires, messages accessibles, focus conservé lors des sélections, clavier contenu dans la fenêtre modale et retour au déclencheur à la fermeture.
- URL mal encodée traitée par une réponse 400 ; types MIME des vidéos et polices corrigés.

## Vérifications réalisées

- `npm run build` : assemblage réussi, cohérence du catalogue avec le tableur et génération des empreintes CSP.
- `npm test` : 12 tests de régression réussis, avec un serveur local et une base temporaire indépendante.
- `node --check .build/site.js` et `git diff --check` : réussis.
- Audit du HTML assemblé : 41 identifiants uniques, 29 références de médias présentes, ancres valides (la route JavaScript #admin est distinguée), empreinte CSP vérifiée.
- Navigateur : contrôles aux largeurs 320, 390, 900 et 1440 pixels ; absence de débordement horizontal constatée. Accueil, menu mobile, filtres et remise à zéro, fiche, pointure, ajout au panier, total, validation des champs, thème sombre et visite optionnelle vérifiés. Aucun avertissement ou erreur relevé dans la console pendant ces essais.

## Limites de cette validation

Aucune commande n’a été envoyée au tableur de production. Les réponses du tableur et les pannes sont testées avec des simulations ; il reste à valider la réception réelle dans Google Sheets avec une commande convenue avec l’atelier. Le paiement en ligne n’a pas été ajouté. Les délais, retours et caractéristiques des produits proviennent du contenu existant de la boutique et doivent correspondre aux conditions réellement proposées par l’atelier. Cet audit corrige les défauts identifiés ; il ne garantit pas l’absence de tout défaut possible.
