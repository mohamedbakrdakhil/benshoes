/**
 * Benkashoes — réception des commandes dans un tableur.
 *
 * À coller dans Apps Script, lié à une feuille Google Sheets. La boutique y
 * envoie chaque commande ; une ligne s'ajoute, et vous recevez un e-mail.
 * La feuille se télécharge en .xlsx quand vous voulez (Fichier → Télécharger).
 *
 * CE SCRIPT NE FAIT CONFIANCE À RIEN de ce que le navigateur envoie. Les prix
 * sont recalculés ici, les modèles, coloris et pointures sont vérifiés contre
 * le catalogue ci-dessous, et chaque texte est borné puis désamorcé avant
 * d'entrer dans la feuille. L'adresse du script est publique — elle est dans
 * le code de la page — donc n'importe qui peut lui écrire : tout ce qui
 * arrive est traité comme hostile jusqu'à preuve du contraire.
 *
 * Installation : voir integrations/LISEZMOI.md
 */

/* ───────── à régler ───────── */

// Votre adresse, pour l'e-mail d'alerte. Vide = pas d'e-mail.
var ALERTE_EMAIL = 'benkashoes@gmail.com';

// Nom de l'onglet qui reçoit les commandes. Créé tout seul s'il manque.
var ONGLET = 'Commandes';

/* Identifiant de la feuille qui reçoit les commandes.
 *
 * Vide = le script est « lié » à une feuille (Extensions → Apps Script depuis
 * celle-ci) et écrit dans sa feuille hôte. C'est le cas simple.
 *
 * Renseigné = le script est autonome et vise cette feuille-là. Nécessaire
 * quand plusieurs comptes Google sont connectés dans le même navigateur :
 * Google refuse alors d'ouvrir l'éditeur lié et répond « Page introuvable ».
 *
 * L'identifiant se lit dans l'adresse de la feuille, entre /d/ et /edit. */
var FEUILLE_ID = '18WEWekxfeI_fbxKN471uPGjCNy54ToMpF8Id2Dm42s8';

// Au-delà de ce nombre de commandes par heure, le script refuse. Protège
// d'un robot qui viendrait noyer la feuille.
var MAX_PAR_HEURE = 40;

/* ───────── catalogue de référence ─────────
   DOIT correspondre à src/scripts/02-catalogue.js. Le prix retenu est
   TOUJOURS celui d'ici, jamais celui annoncé par le navigateur. */

var CATALOGUE = {
  opus:    { nom: 'Opus',    prix: 279, coloris: ['beige','taupe','marron','tabac','burgundy','gris','marine','noir'] }
};
var COLORIS = { noir:'Noir', beige:'Beige', marron:'Marron', taupe:'Marron taupe',
                tabac:'Tabac', burgundy:'Burgundy', gris:'Gris', marine:'Marine',
                taupe:'Marron taupe' };
var POINTURES   = [37,38,39,40,41];
var LIVR_OFFERTE = 0;     // livraison offerte sans minimum
var LIVR_PRIX    = 0;

var COLONNES = ['Reçue le','Référence','Statut','Nom','Téléphone','E-mail','Adresse',
                'Code postal','Ville','Pays','Articles','Sous-total','Livraison',
                'Total','Devise','Note'];

/* ───────── utilitaires ───────── */

/** Coupe, retire les caractères de commande, borne la longueur. */
function texte(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim().slice(0, max);
}

/**
 * Un tableur exécute toute cellule qui commence par = + - @ : sans cela, un
 * client malveillant pourrait se nommer =IMPORTXML(...) et faire sortir le
 * contenu de votre feuille vers son serveur à la seconde où vous l'ouvrez.
 * L'apostrophe force Sheets à traiter la cellule comme du texte.
 */
function cellule(v) {
  var s = String(v === null || v === undefined ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/**
 * Force une valeur à rester du texte. Sans cela, le tableur lit « 0600000000 »
 * comme un nombre et laisse tomber le zéro de tête : le numéro n'est plus
 * composable. L'apostrophe ne s'affiche pas, elle dit juste « ceci est du
 * texte ». Vaut aussi pour un code postal.
 */
function texteBrut(v) {
  var s = String(v === null || v === undefined ? '' : v);
  return s === '' ? '' : "'" + s;
}

function reponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function feuille() {
  var classeur = FEUILLE_ID ? SpreadsheetApp.openById(FEUILLE_ID)
                            : SpreadsheetApp.getActiveSpreadsheet();
  var f = classeur.getSheetByName(ONGLET);
  if (!f) {
    f = classeur.insertSheet(ONGLET);
    f.appendRow(COLONNES);
    f.getRange(1, 1, 1, COLONNES.length).setFontWeight('bold').setBackground('#f3f0ea');
    f.setFrozenRows(1);
    f.setColumnWidth(1, 140);
    f.setColumnWidth(7, 240);
    f.setColumnWidth(11, 320);
    f.setColumnWidth(16, 260);
  }
  return f;
}

/** Vrai si le quota horaire est dépassé. */
function tropDeCommandes() {
  var p = PropertiesService.getScriptProperties();
  var maintenant = Date.now();
  var debut = Number(p.getProperty('fenetre') || 0);
  var n = Number(p.getProperty('compte') || 0);
  if (maintenant - debut > 3600000) { debut = maintenant; n = 0; }
  n++;
  p.setProperties({ fenetre: String(debut), compte: String(n) });
  return n > MAX_PAR_HEURE;
}

/**
 * Clé d'idempotence. Le navigateur envoie une clé par commande. Si la
 * réponse ne lui parvient pas — la politique d'origine peut l'en empêcher —
 * il renvoie la même requête ; en retrouvant la clé, on rend la référence
 * déjà attribuée au lieu d'enregistrer une deuxième fois. Sans cela, un
 * client aurait sa commande en double dans la feuille.
 */
function refDejaVue(cle) {
  var p = PropertiesService.getScriptProperties();
  var brut = p.getProperty('cles');
  var vues = brut ? JSON.parse(brut) : {};
  var maintenant = Date.now();
  // on oublie ce qui a plus de six heures, et on garde 300 clés au plus
  var noms = Object.keys(vues);
  for (var i = 0; i < noms.length; i++)
    if (maintenant - vues[noms[i]].t > 21600000) delete vues[noms[i]];
  noms = Object.keys(vues);
  if (noms.length > 300) {
    noms.sort(function (a, b) { return vues[a].t - vues[b].t; });
    for (var k = 0; k < noms.length - 300; k++) delete vues[noms[k]];
  }
  return {
    ref: vues[cle] ? vues[cle].r : null,
    retenir: function (ref) {
      vues[cle] = { r: ref, t: maintenant };
      p.setProperty('cles', JSON.stringify(vues));
    }
  };
}

/** Référence fabriquée ici, pas par le navigateur. */
function nouvelleReference(f) {
  var d = new Date();
  var aa = String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2);
  var A = 'ACDEFHJKLMNPRTUVWXY34789';
  var existantes = {};
  var n = f.getLastRow();
  if (n > 1) {
    var col = f.getRange(2, 2, n - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) existantes[String(col[i][0])] = true;
  }
  for (var essai = 0; essai < 60; essai++) {
    var r = '';
    for (var k = 0; k < 5; k++) r += A.charAt(Math.floor(Math.random() * A.length));
    var ref = 'BS-' + aa + '-' + r;
    if (!existantes[ref]) return ref;
  }
  return 'BS-' + aa + '-' + Date.now().toString(36).toUpperCase();
}

/* ───────── validation de la commande ───────── */

function construireCommande(entree) {
  var brut = (entree && entree.items) || [];
  if (!(brut instanceof Array) || !brut.length) return { erreur: 'Panier vide.' };
  if (brut.length > 20) return { erreur: 'Trop d’articles.' };

  var articles = [], sousTotal = 0;
  for (var i = 0; i < brut.length; i++) {
    var it = brut[i] || {};
    var p = CATALOGUE[it.id];
    if (!p) return { erreur: 'Modèle inconnu.' };
    var c = String(it.colorKey || '');
    if (p.coloris.indexOf(c) < 0) return { erreur: 'Coloris indisponible pour ce modèle.' };
    var t = Number(it.size);
    if (POINTURES.indexOf(t) < 0) return { erreur: 'Pointure invalide.' };
    var q = Math.floor(Number(it.q));
    if (!(q >= 1 && q <= 10)) return { erreur: 'Quantité invalide.' };
    sousTotal += p.prix * q;                     // le prix vient d'ici, pas du navigateur
    articles.push(q + ' × ' + p.nom + ' ' + (COLORIS[c] || c) + ' — pointure ' + t);
  }

  var c0 = entree.customer || {};
  var client = {
    nom:   texte(c0.name, 80),
    tel:   texte(c0.phone, 30),
    email: texte(c0.email, 120),
    adr:   texte(c0.addr, 200),
    cp:    texte(c0.zip, 20),
    ville: texte(c0.city, 80),
    pays:  texte(c0.country, 60) || 'Maroc'
  };
  if (!client.nom)   return { erreur: 'Le nom est obligatoire.' };
  if (!client.adr)   return { erreur: 'L’adresse est obligatoire.' };
  if (!client.ville) return { erreur: 'La ville est obligatoire.' };
  if (!/^[0-9+().\s-]{8,20}$/.test(client.tel))
    return { erreur: 'Numéro de téléphone invalide.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(client.email))
    return { erreur: 'Adresse e-mail invalide.' };

  var livraison = sousTotal >= LIVR_OFFERTE ? 0 : LIVR_PRIX;
  return {
    commande: {
      articles: articles.join(' | '),
      client: client,
      note: texte(entree.note, 500),
      sousTotal: sousTotal,
      livraison: livraison,
      total: sousTotal + livraison
    }
  };
}

/* ───────── point d'entrée ───────── */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reponse({ erreur: 'Requête vide.' });
    if (e.postData.contents.length > 20000) return reponse({ erreur: 'Requête trop volumineuse.' });

    var entree;
    try { entree = JSON.parse(e.postData.contents); }
    catch (err) { return reponse({ erreur: 'Format invalide.' }); }

    // Piège à robots : ce champ est invisible pour un humain. S'il est rempli,
    // on répond comme si tout allait bien et on jette.
    if (entree && entree.site) return reponse({ ok: true, ref: 'BS-000000' });

    var cle = texte(entree && entree.cle, 40);
    if (!/^[A-Za-z0-9_-]{8,40}$/.test(cle)) return reponse({ erreur: 'Requête invalide.' });

    var memoire = refDejaVue(cle);
    if (memoire.ref) return reponse({ ok: true, ref: memoire.ref, deja: true });

    if (tropDeCommandes()) return reponse({ erreur: 'Trop de commandes reçues. Réessayez dans un moment.' });

    var r = construireCommande(entree);
    if (r.erreur) return reponse({ erreur: r.erreur });
    var cmd = r.commande;

    // Un verrou : deux commandes simultanées ne doivent pas se marcher dessus
    // sur le numéro de ligne ni sur la référence.
    var verrou = LockService.getScriptLock();
    verrou.waitLock(20000);
    var ref, f;
    try {
      f = feuille();
      ref = nouvelleReference(f);
      f.appendRow([
        new Date(), ref, 'Nouvelle',
        cellule(cmd.client.nom), texteBrut(cmd.client.tel), cellule(cmd.client.email),
        cellule(cmd.client.adr), texteBrut(cmd.client.cp), cellule(cmd.client.ville),
        cellule(cmd.client.pays), cellule(cmd.articles),
        cmd.sousTotal, cmd.livraison, cmd.total, 'MAD', cellule(cmd.note)
      ]);
      // La date et les trois montants restent des valeurs, pas du texte :
      // sans cela la feuille ne saurait ni les trier ni les additionner.
      var l = f.getLastRow();
      f.getRange(l, 1).setNumberFormat('dd/mm/yyyy hh:mm');
      f.getRange(l, 12, 1, 3).setNumberFormat('#,##0 \"DH\"');
      memoire.retenir(ref);
    } finally {
      verrou.releaseLock();
    }

    if (ALERTE_EMAIL) {
      try {
        MailApp.sendEmail(ALERTE_EMAIL, 'Commande ' + ref + ' — ' + cmd.total + ' DH',
          'Référence : ' + ref + '\n' +
          'Total : ' + cmd.total + ' DH (dont livraison ' + cmd.livraison + ' DH)\n\n' +
          cmd.articles.split(' | ').join('\n') + '\n\n' +
          cmd.client.nom + '\n' + cmd.client.tel + '\n' + cmd.client.email + '\n' +
          cmd.client.adr + '\n' + cmd.client.cp + ' ' + cmd.client.ville + '\n' + cmd.client.pays +
          (cmd.note ? '\n\nNote : ' + cmd.note : ''));
      } catch (err) {
        // Un e-mail perdu ne doit pas perdre la commande : on continue. Mais
        // le silence total rendait une adresse fausse indétectable — la trace
        // apparaît désormais dans Exécutions, dans l'éditeur Apps Script.
        console.error('Alerte e-mail non partie (' + ALERTE_EMAIL + ') : ' + err);
      }
    }

    return reponse({ ok: true, ref: ref, total: cmd.total, livraison: cmd.livraison });
  } catch (err) {
    return reponse({ erreur: 'Erreur du serveur.' });
  }
}

/* ═════════════════ installation : organiser la feuille ═════════════════

   À lancer UNE fois depuis l'éditeur Apps Script : choisissez « installer »
   dans la liste des fonctions, puis Exécuter.

   Rejouable sans risque : la fonction ne lit ni ne modifie aucune commande
   déjà enregistrée. Elle ne fait que (re)poser la mise en forme, les menus
   déroulants et le tableau de bord. Si vous cassez quelque chose en bricolant
   la feuille, relancez-la.                                                  */

var STATUTS = ['Nouvelle', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];

/* Largeur de chaque colonne, dans l'ordre de COLONNES. Posées explicitement :
   la largeur par défaut coupe « Adresse » et « Articles », les deux colonnes
   qu'on lit vraiment quand on prépare un colis. */
var LARGEURS = [140, 130, 110, 170, 130, 200, 240, 100, 120, 90, 320, 100, 90, 100, 70, 260];

/* Une teinte par statut. Le but n'est pas de décorer : c'est de voir d'un
   coup d'œil, en ouvrant la feuille, ce qui attend d'être traité. */
var TEINTES = {
  'Nouvelle':  '#fff1dc',
  'Confirmée': '#e3edfd',
  'Expédiée':  '#e2f1e6',
  'Livrée':    '#eceff1',
  'Annulée':   '#fbe3e0'
};

function installer() {
  var classeur = FEUILLE_ID ? SpreadsheetApp.openById(FEUILLE_ID)
                            : SpreadsheetApp.getActiveSpreadsheet();

  /* Sans fuseau explicite, Google date les commandes à l'heure du serveur.
     Une commande passée à 23 h le lundi peut alors s'inscrire au mardi. */
  classeur.setSpreadsheetTimeZone('Africa/Casablanca');

  var f = feuille();                     // crée l'onglet et ses en-têtes au besoin
  var n = COLONNES.length;

  /* ---------- l'en-tête ---------- */
  f.getRange(1, 1, 1, n).setValues([COLONNES])
     .setFontWeight('bold').setBackground('#2b1512').setFontColor('#fdf6ec')
     .setVerticalAlignment('middle');
  f.setFrozenRows(1);
  f.setRowHeight(1, 34);
  for (var i = 0; i < n; i++) f.setColumnWidth(i + 1, LARGEURS[i]);

  /* ---------- formats de colonne ---------- */
  // Posés sur la colonne entière, pas seulement sur les lignes existantes :
  // sinon chaque nouvelle commande arriverait sans format.
  f.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  f.getRange('L2:N').setNumberFormat('#,##0 "DH"');
  f.getRange('G2:G').setWrap(true);      // adresse
  f.getRange('K2:K').setWrap(true);      // articles
  f.getRange('P2:P').setWrap(true);      // note

  /* ---------- le statut devient un menu déroulant ---------- */
  // Tapé à la main, « expédiée » et « Expédié » coexistent et aucun compte
  // ne tombe juste. La liste ferme la porte à l'orthographe libre.
  f.getRange('C2:C').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUTS, true)
      .setAllowInvalid(false)
      .setHelpText('Choisissez un statut dans la liste.')
      .build());

  /* ---------- la ligne se colore selon son statut ---------- */
  var plage = f.getRange(2, 1, Math.max(f.getMaxRows() - 1, 1), n);
  var regles = [];
  STATUTS.forEach(function (st) {
    var b = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$C2="' + st + '"')
      .setBackground(TEINTES[st])
      .setRanges([plage]);
    if (st === 'Annulée') b.setStrikethrough(true);
    regles.push(b.build());
  });
  f.setConditionalFormatRules(regles);

  /* ---------- un filtre, pour trier et chercher ---------- */
  var filtre = f.getFilter();
  if (filtre) filtre.remove();
  f.getRange(1, 1, Math.max(f.getLastRow(), 2), n).createFilter();

  tableauDeBord(classeur);
  menageOngletVide(classeur);

  // L'onglet qui résume passe devant : c'est ce qu'on veut voir en ouvrant.
  classeur.setActiveSheet(classeur.getSheetByName('Tableau de bord'));
  classeur.moveActiveSheet(1);
  return 'Feuille organisée.';
}

/** Le résumé. Rien n'y est recopié : tout est formule, donc toujours juste. */
function tableauDeBord(classeur) {
  var t = classeur.getSheetByName('Tableau de bord');
  if (!t) t = classeur.insertSheet('Tableau de bord');
  t.clear();
  t.clearConditionalFormatRules();

  var O = "'" + ONGLET + "'!";
  var lignes = [
    ['BENKASHOES', ''],
    ['Commandes reçues', '=COUNTA(' + O + 'B2:B)'],
    ['Chiffre d\'affaires', '=SUM(' + O + 'N2:N)'],
    ['Panier moyen', '=IFERROR(ROUND(B3/B2),0)'],
    ['', ''],
    ['PAR STATUT', '']
  ];
  STATUTS.forEach(function (st) {
    lignes.push([st, '=COUNTIF(' + O + 'C2:C,"' + st + '")']);
  });
  lignes.push(['', '']);
  lignes.push(['7 DERNIERS JOURS', '']);
  lignes.push(['Commandes', '=COUNTIFS(' + O + 'A2:A,">="&TODAY()-7)']);
  lignes.push(['Chiffre d\'affaires',
               '=SUMIFS(' + O + 'N2:N,' + O + 'A2:A,">="&TODAY()-7)']);

  // setValues accepte formules et textes : Sheets reconnaît le « = ».
  t.getRange(1, 1, lignes.length, 2).setValues(lignes);

  t.setColumnWidth(1, 220);
  t.setColumnWidth(2, 140);
  t.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#7a1f16');
  t.getRange('A6').setFontWeight('bold').setFontColor('#7a1f16');
  t.getRange('A13').setFontWeight('bold').setFontColor('#7a1f16');
  t.getRange('A2:A4').setFontWeight('bold');
  t.getRange('B3').setNumberFormat('#,##0 "DH"');
  t.getRange('B4').setNumberFormat('#,##0 "DH"');
  t.getRange('B15').setNumberFormat('#,##0 "DH"');
  t.getRange('B2:B15').setHorizontalAlignment('right');
  t.setFrozenRows(1);
  if (t.getMaxColumns() > 2) t.deleteColumns(3, t.getMaxColumns() - 2);
}

/** Supprime l'onglet vide que Google crée avec tout nouveau classeur. */
function menageOngletVide(classeur) {
  classeur.getSheets().forEach(function (f) {
    var nom = f.getName();
    if (nom === ONGLET || nom === 'Tableau de bord') return;
    // On ne supprime que ce qui est vraiment vide : jamais une feuille
    // où quelqu'un aurait écrit quelque chose.
    //
    // isBlank() plutôt que getLastRow()===0 : sur l'onglet que Google crée
    // avec le classeur, ces compteurs ne retombent pas toujours à zéro, et
    // l'onglet vide survivait au ménage. isBlank() regarde le contenu.
    if (f.getDataRange().isBlank()) classeur.deleteSheet(f);
  });
}

/** Ouvrir l'adresse dans un navigateur doit dire quelque chose d'utile — et
 *  d'abord : si l'alerte par e-mail est armée dans la version DEPLOYEE.
 *
 *  Le fichier du dépôt peut porter l'adresse sans que le script en service
 *  l'ait reçue : ce sont deux copies distinctes, et seule celle de Google
 *  s'exécute. Sans ce témoin, le seul moyen de savoir était de passer une
 *  vraie commande et d'attendre un e-mail qui ne venait peut-être pas.
 *
 *  L'adresse elle-même n'est pas renvoyée : cette URL est publique. */
function doGet() {
  return reponse({ service: 'Benkashoes — réception des commandes', methode: 'POST',
                   alerte: ALERTE_EMAIL ? 'armée' : 'absente' });
}
