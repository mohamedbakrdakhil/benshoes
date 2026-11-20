/* ===================== mesure : le pixel Meta =====================

   Les événements produits et commandes servent à mesurer les campagnes.
   Leur échec ne doit jamais interrompre la boutique.

   Vide = aucune mesure, aucun octet chargé, et csp.py referme la politique
   de sécurité sur le site lui-même. */
const PIXEL='2324082461765253';

/* Le code officiel de Meta est volontairement illisible. Celui-ci fait
   exactement la même chose, en clair : une file d'attente qui encaisse les
   appels jusqu'à ce que le vrai script soit arrivé. */
(function(w,d){
  if(!PIXEL||w.fbq)return;
  const n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments);};
  if(!w._fbq)w._fbq=n;
  n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
  const t=d.createElement('script');t.async=true;
  t.onerror=()=>{n.disabled=true;n.queue.length=0;};
  t.src='https://connect.facebook.net/en_US/fbevents.js';
  (d.head||d.documentElement).appendChild(t);
})(window,document);
if(PIXEL){fbq('init',PIXEL);fbq('track','PageView');}

/* Un seul point de passage, et jamais d'exception qui remonte : une erreur
   de mesure ne doit pas pouvoir casser une vente. */
function mesure(nom,donnees,id){
  /* « id » dédoublonne. L'achat part deux fois vers Meta : d'ici par le
     pixel, et du script du tableur par l'API Conversions — le second passe
     là où iOS et les bloqueurs arrêtent le premier. Même identifiant des
     deux côtés, Meta comprend que c'est une seule vente et n'en compte
     qu'une. Sans lui, votre chiffre d'affaires s'afficherait en double. */
  try{if(PIXEL&&window.fbq&&!window.fbq.disabled)fbq('track',nom,donnees||{},id?{eventID:id}:undefined);}catch(e){}
}
/* L'identifiant d'un article, le même ici et dans le flux catalogue — c'est
   ce qui permet à Meta de remontrer LA paire regardée, pas une autre. */
const refMeta=(id,c)=>id+'-'+c;
