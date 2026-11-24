# Alertes de retour en stock

Sur la fiche produit, chaque lien correspond à un modèle, un coloris et une pointure en rupture. Une fiche configurée avec Google Forms ouvre le choix prérempli. Si aucun formulaire n’est configuré, le site prépare un e-mail que le client peut envoyer à l’atelier. Ce dernier parcours demande une réponse manuelle.

## Préparer le formulaire

1. Avec le compte Google propriétaire de la boutique, créer un projet Apps Script autonome et y copier [reassort.gs](reassort.gs). Dans les paramètres du projet, définir la propriété de script `COMPTE_PROPRIETAIRE` avec l’adresse du compte propriétaire. Conserver la détection automatique des autorisations.
2. Exécuter `initialiserReassorts()`. Dans le journal d’exécution, copier le lien prérempli. La fonction crée une question de 60 variantes et un déclencheur horaire. Elle peut être relancée pour retrouver le lien.
3. Dans Google Forms, vérifier dans **Paramètres → Réponses** que la collecte des adresses utilise le mode **Validées**. Vérifier que le résumé des réponses est masqué et que les clients peuvent ouvrir le formulaire avec leur compte Google. Exécuter ensuite `confirmerCollecteVerifieeReassorts()` avant de diffuser le lien.
4. Reporter dans `SHOP.reassortForm` l’URL publique du formulaire (champ `url`) et le nom complet du paramètre `entry.…` du lien prérempli (champ `field`). Reconstruire le site. Sur une fiche dont une pointure est épuisée, ouvrir le lien et vérifier la sélection avant de le proposer aux clients.

## Exploiter les demandes

Le déclencheur `traiterReassorts()` consulte le stock une fois par heure. Un passage observé de zéro à une quantité positive rend les demandes de cette variante admissibles à l’envoi. Le quota de messagerie peut reporter une alerte à une exécution ultérieure. Les inscriptions expirent au bout de 60 jours. Le traitement supprime les réponses expirées et celles dont l’envoi a été confirmé.

Depuis l’éditeur privé, exécuter `bilanReassorts()` pour connaître le nombre de demandes distinctes par variante. Le champ `envoisAVerifier` compte les groupes pour lesquels la remise du message reste incertaine. Consulter alors les exécutions du script avant toute action manuelle pour éviter un doublon.

Les tests locaux utilisent des données fictives. Depuis la racine du site, lancer `node --test tests/reassort.test.cjs tests/reassort-fiche.test.cjs`.
