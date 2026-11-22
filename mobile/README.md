# Benka Shoes pour iPhone et Android

Boutique Flutter en français. Identifiant prévu sur les deux plateformes `ma.benkashoes.boutique`. Les photos du catalogue sont embarquées. Le stock et la validation des commandes proviennent du service de la boutique. Une confirmation en production crée une vraie commande.

## Lancer et vérifier

Depuis ce dossier avec Flutter 3.41.9, exécuter `flutter pub get --enforce-lockfile`, puis `flutter analyze`, `flutter test` et `flutter run`. Les tests automatisés utilisent un service simulé pour les achats. L’APK de test s’installe sur Android. L’archive de simulateur se lance dans le simulateur iOS de Xcode.

## Publication

Sur Android, configurer le keystore de téléversement Benka dans le fichier privé `android/key.properties` avec `storeFile`, `storePassword`, `keyAlias` et `keyPassword`. Exécuter `flutter build appbundle --release`, vérifier la signature, puis charger le bundle dans Play Console. Sans cette configuration la compilation de distribution produit un bundle non signé. La clé de test de l’APK ne doit pas servir à la publication.

Sur iOS, choisir l’équipe Apple Developer Benka dans Xcode pour Runner, enregistrer l’identifiant et créer la fiche dans App Store Connect. Exécuter `flutter build ipa --release` avec les identifiants de signature de Benka et charger l’archive dans TestFlight.

Catégorie Shopping. Assistance <https://www.benkashoes.ma/aide/>. Confidentialité <https://www.benkashoes.ma/application/confidentialite/>. Pour les déclarations de données des stores, vérifier les réglages effectifs du service de commande, y compris l’éventuelle mesure de conversion Meta. Les deux stores demandent la validation des déclarations par le titulaire du compte.

## Atelier et livraison

Les paiements des chaussures physiques se font à la livraison. La commande n’exige aucun compte client. La référence retournée par l’atelier apparaît après confirmation. Pour tester le paiement à la livraison avant publication, utiliser un environnement de test ou une commande explicitement autorisée par l’atelier.
