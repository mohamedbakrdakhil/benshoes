# Benkashoes

Boutique de sandales à lit de liège. Site statique, un seul fichier, sans dépendance ni build complexe.

**En ligne :** https://www.benkashoes.ma/
**Espace atelier :** https://www.benkashoes.ma/#admin

## Ce que contient le site

- Six modèles (Deux, Solo, Noor, Atlas, Oasis, Haut), illustrés en SVG généré — aucune photo à fournir.
- Filtres par forme et par cuir, fiche produit, choix de pointure avec stock réel, panier, commande en trois étapes.
- Coupe annotée du lit de liège, guide des pointures en millimètres, thème clair/sombre.
- Espace atelier : chiffre d'affaires, commandes à traiter, panier moyen, suivi des statuts, saisie manuelle, édition des prix et du stock, export CSV, sauvegarde JSON.

## Personnaliser

Tout est dans `src/site.html`.

**Coordonnées** — en haut du premier `<script>`, le bloc `const SHOP` :

```js
const SHOP={
  email:'contact@benkashoes.ma',   // votre vraie adresse e-mail
  phone:'',                       // ex. '+33 6 12 34 56 78'  (vide = masqué)
  whatsapp:'',                    // ex. '33612345678' indicatif SANS le +  (vide = bouton masqué)
  site:'www.benkashoes.ma'
};
```

Renseigner `whatsapp` fait apparaître un bouton « Envoyer sur WhatsApp » : le client arrive sur votre WhatsApp avec sa commande déjà rédigée. C'est le moyen le plus simple de recevoir les commandes.

**Modèles, prix, stock** — le tableau `CATALOG`, juste en dessous. Les prix et le stock se modifient aussi depuis l'espace atelier, sans toucher au code.

## Publier une modification

```sh
./build.sh
git add -A && git commit -m "mise à jour" && git push
```

`build.sh` régénère `index.html` à partir de `src/site.html` en y ajoutant l'en-tête HTML et les métadonnées de référencement. GitHub Pages met le site à jour en une minute environ.

## Où sont les commandes

Sur cet hébergement statique il n'y a pas de serveur. Le client valide son panier, le site lui donne une référence et un récapitulatif qu'il vous envoie par WhatsApp ou par e-mail. Vous le saisissez ensuite dans l'espace atelier, qui enregistre tout dans le navigateur de l'appareil que vous utilisez.

Deux conséquences à connaître :

- Le carnet de commandes ne suit pas d'un appareil à l'autre. Utilisez le bouton **Sauvegarder** régulièrement, et **Restaurer** sur l'autre appareil.
- L'adresse `#admin` n'est protégée par aucun mot de passe. Qui la connaît peut l'ouvrir. Un vrai contrôle d'accès demande un serveur.

Pour des commandes qui arrivent toutes seules et un paiement en ligne, il faut passer à un hébergement avec serveur (Shopify, ou Netlify/Cloudflare avec une petite base).

## Licence

Code et design : usage libre pour le projet Benkashoes.
