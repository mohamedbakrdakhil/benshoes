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
var ALERTE_EMAIL = '';

// Nom de l'onglet qui reçoit les commandes. Créé tout seul s'il manque.
var ONGLET = 'Commandes';

// Au-delà de ce nombre de commandes par heure, le script refuse. Protège
// d'un robot qui viendrait noyer la feuille.
var MAX_PAR_HEURE = 40;

/* ───────── catalogue de référence ─────────
   DOIT correspondre à src/scripts/02-catalogue.js. Le prix retenu est
   TOUJOURS celui d'ici, jamais celui annoncé par le navigateur. */

var CATALOGUE = {
  opus:    { nom: 'Opus',    prix: 299, coloris: ['burgundy','noir','beige','marron','taupe','tabac','gris','marine'] },
  stepy:   { nom: 'Stepy',   prix: 259, coloris: ['beige','noir','marron','gris','marine'] },
  western: { nom: 'Western', prix: 359, coloris: ['noir'] }
};
var COLORIS = { noir:'Noir', beige:'Beige', marron:'Marron', taupe:'Marron taupe',
                tabac:'Tabac', burgundy:'Burgundy', gris:'Gris', marine:'Marine' };
var POINTURES   = [37,38,39,40,41];
var LIVR_OFFERTE = 400;   // à partir de ce montant
var LIVR_PRIX    = 35;

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
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
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
      } catch (err) { /* un e-mail perdu ne doit pas perdre la commande */ }
    }

    return reponse({ ok: true, ref: ref, total: cmd.total, livraison: cmd.livraison });
  } catch (err) {
    return reponse({ erreur: 'Erreur du serveur.' });
  }
}

/** Ouvrir l'adresse dans un navigateur doit dire quelque chose d'utile. */
function doGet() {
  return reponse({ service: 'Benkashoes — réception des commandes', methode: 'POST' });
}
