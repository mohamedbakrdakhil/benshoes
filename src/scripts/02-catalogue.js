/* ======================= données ======================= */
const SIZES=[37,38,39,40,41];
const MM={37:238,38:245,39:251,40:258,41:264};
const COLORS={
  noir:{n:'Noir',c:'#272421',d:'#131211'},
  beige:{n:'Beige',c:'#cdb595',d:'#a48c6c'},
  marron:{n:'Marron',c:'#6b4529',d:'#45290f'},
  taupe:{n:'Marron taupe',c:'#837567',d:'#5e5347'},
  tabac:{n:'Tabac',c:'#9a6433',d:'#6c4318'},
  burgundy:{n:'Burgundy',c:'#8e3b40',d:'#5e2126'},
  gris:{n:'Gris',c:'#7e8389',d:'#575c61'},
  marine:{n:'Marine',c:'#27374f',d:'#16202f'}
};
const FAMS=[['tous','Tous les coloris']];
/* Les coloris listés sous chaque modèle sont exactement ceux dont l'atelier a
   envoyé les photos. Un coloris annoncé sans photo s'afficherait en dessin au
   milieu des autres : une boutique à moitié photographiée fait plus de mal que
   sept coloris bien montrés.

   Ne rien glisser entre « price: » et « colors: » — seo.py et
   verif-catalogue.py lisent ce bloc à l'expression régulière. */
const CATALOG=[
  {id:'opus',hold:4,use:'Tous les jours',name:'Opus',sub:'Mocassin-mule à bride penny',fam:'penny',style:'penny',price:279,
   colors:['beige','taupe','marron','tabac','burgundy','gris','marine','noir'],
   /* Le stock réel de l'atelier, relevé sur l'inventaire (référence 920,
      202 paires). Une ligne par cuir, une colonne par pointure, dans
      l'ordre de SIZES : 37, 38, 39, 40, 41.

      Avant, une seule ligne servait aux huit cuirs. Elle ne pouvait pas
      dire que le beige en 40 existe en six exemplaires et le tabac en
      cinq — donc elle ne pouvait pas non plus fermer une pointure sur un
      seul coloris. C'est ce que cette grille rend possible, et c'est ce
      qui rend la rupture automatique : une case à zéro ferme la pointure
      pour ce cuir-là, sans rien d'autre à écrire. */
   stock:{noir:     [6,6,6,6,4],
          marron:   [6,6,6,6,4],
          marine:   [6,6,6,6,4],
          gris:     [6,6,6,6,4],
          burgundy: [5,5,5,5,2],
          taupe:    [5,5,5,5,2],
          beige:    [5,5,5,6,2],
          tabac:    [5,5,6,5,2]},
   flag:'Le plus porté',
   /* Le coloris qui porte le bandeau « Le plus porté ». Sans lui le bandeau
      tombait sur la première vignette de la grille, c'est-à-dire sur le
      premier coloris listé — un hasard d'ordre, pas une information. */
   vedette:'tabac',
   /* Fermetures à la main, par-dessus la grille ci-dessus.

      Depuis que le stock est par coloris, une case à zéro suffit à fermer une
      pointure : « rupture » n'est plus nécessaire pour ça. Elle sert
      maintenant au cas inverse — l'inventaire croit encore à des paires que
      l'atelier sait parties. On ferme la vente sans falsifier le compte.

      Format : coloris → pointures fermées. */
   rupture:{beige:[38]},
   blurb:"La bride penny ajourée, posée sur un daim souple monté à la main sur forme. Talon ouvert : on l’enfile d’un geste, il tient par le cou-de-pied. Huit daims au choix, du beige au noir, c’est le modèle sur lequel l’atelier a bâti sa réputation.",
   spec:[['Tige','Daim de veau, monté sur forme'],['Bride','Penny ajourée, surpiquée main'],['Semelle','EVA souple']]}
];
const FAQ=[
 ['Comment choisir ma pointure ?',
  "Posez le talon contre un mur, marquez le bout du gros orteil, mesurez en millimètres et comparez au guide. Une mule ne tient que par le cou-de-pied : elle doit envelopper sans serrer. Entre deux pointures, prenez la plus petite \u2014 le daim se détend d\u2019un demi-point après quelques ports."],
 ['La mule tient-elle vraiment au pied ?',
  "Oui, parce que la tige est montée sur forme : elle épouse le cou-de-pied au lieu de pincer les orteils. Les premiers jours on a le réflexe de crisper le pied, puis le daim se fait et la mule suit la marche toute seule. Ce n\u2019est pas une chaussure de course, c\u2019est une chaussure de journée."],
 ['Comment entretenir le daim ?',
  "Brosse en crêpe à sec, jamais d\u2019eau. Une tache fraîche part à la gomme à daim, une auréole se traite à la vapeur puis au brossage. Passez un spray imperméabilisant deux fois par an : le daim boit tout, mieux vaut le protéger avant la pluie qu\u2019après."],
 ['La première en mousse change-t-elle avec le temps ?',
  "C\u2019est même le principe. La mousse épouse la forme du pied sous l\u2019appui et finit par en garder le creux. Au bout de deux ou trois semaines, la première n\u2019est plus plate : elle est à vous. C\u2019est l\u2019empreinte du logo."],
 ['Puis-je payer en ligne ?',
  "Pas encore. Vous composez votre panier et vous le validez : la commande arrive directement à l\u2019atelier avec une référence. On vous rappelle pour confirmer la disponibilité dans votre pointure, puis vous réglez à la livraison ou par virement."],
 ['Livrez-vous en dehors du Maroc ?',
  "Oui, sur demande. L\u2019expédition sous 48 h et la livraison offerte ne valent que pour le Maroc. Pour l\u2019étranger, indiquez votre pays dans le formulaire : on vous envoie un devis de port avant de confirmer la commande."]
];
const STATUS={nouvelle:'Nouvelle',confirmee:'Confirmée',expediee:'Expédiée',livree:'Livrée',annulee:'Annulée'};
// Livraison offerte partout au Maroc, sans montant minimum : le seuil de
// 400 DH n'a plus lieu d'être puisque le port est inclus dans le prix.
const SHIPFREE=0, SHIPCOST=0;

