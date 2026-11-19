# Offre Black Friday — trois Opus à 699 DH

Chaque lot complet de 3 Opus au tarif habituel de 279 DH coûte 699 DH (233 DH par paire du lot). Couleurs et pointures peuvent être mélangées. Les paires hors lot restent à 279 DH. Livraison offerte au Maroc ; les conditions habituelles de devis pour l’étranger restent applicables.

## Ordre de mise en production

1. Lire et sauvegarder le script Apps Script actuellement déployé : préserver ses réglages, identifiants et secrets.
2. Reporter le calcul `prixBlackFriday`, les changements de `construireCommande` et le champ `promotion` de `doGet` depuis `tableur.gs`. Ne pas lancer `installer`, ne pas toucher aux commandes existantes.
3. Mettre à jour le déploiement existant (Déployer → Gérer les déploiements → Modifier → Nouvelle version), en conservant son URL et ses autorisations.
4. Vérifier par une requête GET sur l’URL configurée dans `src/scripts/01-reglages.js` que `promotion.version` vaut `bf-3-699-v1`. Aucune commande de test réelle n’est nécessaire.
5. Exécuter `node --test tests/black-friday.test.cjs`, puis `npm run build` et publier le site.

Le panier vérifie également la version du récepteur avant l’envoi d’une commande remisée, afin de ne pas envoyer 699 DH à un ancien script qui recalculerait 837 DH.

Les montants nets sont répartis dans les lignes Articles : 3 à 233 DH pour un lot, puis les éventuelles paires à 279 DH. Le total de ces lignes doit toujours égaler celui de la commande. Les commandes historiques ne sont pas recalculées.
