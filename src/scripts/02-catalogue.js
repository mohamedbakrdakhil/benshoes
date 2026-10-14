/* ======================= données ======================= */
const SIZES=[37,38,39,40,41];
const MM={37:238,38:245,39:251,40:258,41:264};
const COLORS={
  noir:{n:'Noir',c:'#272421',d:'#131211'},
  beige:{n:'Beige',c:'#cdb595',d:'#a48c6c'},
  marron:{n:'Marron',c:'#6b4529',d:'#45290f'},
  taupe:{n:'Marron taupe',c:'#837567',d:'#5e5347'},
  tabac:{n:'Tabac',c:'#9a6433',d:'#6c4318'},
  rose:{n:'Rose',c:'#b85c6b',d:'#8e4150'},
  gris:{n:'Gris',c:'#7e8389',d:'#575c61'},
  marine:{n:'Marine',c:'#27374f',d:'#16202f'}
};
const FAMS=[['tous','Tous les modèles']];
/* Les coloris listés sous chaque modèle sont exactement ceux dont l'atelier a
   envoyé les photos. Un coloris annoncé sans photo s'afficherait en dessin au
   milieu des autres : une boutique à moitié photographiée fait plus de mal que
   sept coloris bien montrés.

   Ne rien glisser entre « price: » et « colors: » — seo.py et
   verif-catalogue.py lisent ce bloc à l'expression régulière. */
const CATALOG=[
  {id:'opus',hold:4,use:'Tous les jours',name:'Opus',sub:'Mocassin-mule à bride penny',fam:'penny',style:'penny',price:259,
   colors:['beige','gris','marine','rose','marron','tabac','noir'],
   stock:[9,16,21,18,11],flag:'Le plus porté',
   blurb:"La bride penny ajourée, posée sur un daim souple monté à la main sur forme. Talon ouvert : on l’enfile d’un geste, il tient par le cou-de-pied. Huit cuirs au choix, c’est le modèle sur lequel l’atelier a bâti sa réputation.",
   spec:[['Tige','Daim de veau, monté sur forme'],['Bride','Penny ajourée, surpiquée main'],['Première','Liège estampé benka'],['Semelle','Gomme souple, cousue']]},
  {id:'stepy',hold:3,use:'À enfiler',name:'Stepy',sub:'Mocassin-mule à bande pleine',fam:'bande',style:'plain',price:259,
   colors:['beige','noir','marron','gris','marine'],
   stock:[7,13,17,14,8],flag:'Entrée de collection',
   blurb:"La même mule, bande pleine au lieu de la bride ajourée. Ligne plus nette, moins de couture apparente, un prix plus doux. Cinq cuirs, le même montage et la même première en liège.",
   spec:[['Tige','Daim de veau, monté sur forme'],['Bande','Pleine, bord franc'],['Première','Liège estampé benka'],['Semelle','Gomme souple, cousue']]},
  {id:'western',hold:5,use:'Pièce travaillée',name:'Western',sub:'Mocassin-mule surpiqué',fam:'surpique',style:'western',price:359,
   colors:['noir'],
   stock:[4,7,9,8,5],flag:'Série limitée',
   blurb:"Bride large à double surpiqûre et crantage latéral, inspirée des bottes de l’Ouest. C’est la pièce la plus travaillée de l’atelier : trois passages de machine là où les autres en demandent un.",
   spec:[['Tige','Daim de veau, monté sur forme'],['Bride','Large, double surpiqûre, crantée'],['Première','Liège estampé benka'],['Semelle','Gomme souple, cousue']]}
];
const FAQ=[
 ['Comment choisir ma pointure ?',
  "Posez le talon contre un mur, marquez le bout du gros orteil, mesurez en millimètres et comparez au guide. Une mule ne tient que par le cou-de-pied : elle doit envelopper sans serrer. Entre deux pointures, prenez la plus petite \u2014 le daim se détend d\u2019un demi-point après quelques ports."],
 ['La mule tient-elle vraiment au pied ?',
  "Oui, parce que la tige est montée sur forme : elle épouse le cou-de-pied au lieu de pincer les orteils. Les premiers jours on a le réflexe de crisper le pied, puis le daim se fait et la mule suit la marche toute seule. Ce n\u2019est pas une chaussure de course, c\u2019est une chaussure de journée."],
 ['Comment entretenir le daim ?',
  "Brosse en crêpe à sec, jamais d\u2019eau. Une tache fraîche part à la gomme à daim, une auréole se traite à la vapeur puis au brossage. Passez un spray imperméabilisant deux fois par an : le daim boit tout, mieux vaut le protéger avant la pluie qu\u2019après."],
 ['La première en liège change-t-elle avec le temps ?',
  "C\u2019est même le principe. Le liège se tasse sous les points d\u2019appui au fil des ports et finit par garder le creux de votre pied. Au bout de deux ou trois semaines, la première n\u2019est plus plate : elle est à vous. C\u2019est l\u2019empreinte du logo."],
 ['Puis-je payer en ligne ?',
  "Pas encore. Vous composez votre panier, le site vous donne une référence, et vous envoyez le récapitulatif à l\u2019atelier par WhatsApp ou par e-mail. On confirme la disponibilité dans votre pointure, puis vous réglez à la livraison ou par virement."],
 ['Livrez-vous en dehors du Maroc ?',
  "Oui, sur demande. L\u2019expédition sous 48 h et la livraison offerte ne valent que pour le Maroc. Pour l\u2019étranger, indiquez votre pays dans le formulaire : on vous envoie un devis de port avant de confirmer la commande."]
];
const STATUS={nouvelle:'Nouvelle',confirmee:'Confirmée',expediee:'Expédiée',livree:'Livrée',annulee:'Annulée'};
// Livraison offerte partout au Maroc, sans montant minimum : le seuil de
// 400 DH n'a plus lieu d'être puisque le port est inclus dans le prix.
const SHIPFREE=0, SHIPCOST=0;

