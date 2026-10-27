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

/* ───── l'API Conversions de Meta ─────

   Le pixel du site perd 30 à 40 % des ventes : iOS, les bloqueurs de
   publicité, un onglet fermé trop vite. Ici l'achat part des serveurs de
   Google vers ceux de Meta, hors de portée de tout ça — et avec la
   certitude qu'il a vraiment eu lieu, puisqu'on l'envoie après l'avoir
   écrit dans la feuille.

   JETON vide = rien n'est envoyé. Pour l'obtenir : Events Manager → votre
   pixel → Paramètres → API de conversions → Générer un jeton d'accès.
   Collez-le entre les apostrophes ci-dessous, puis redéployez.

   Ce jeton donne le droit d'écrire des événements sur votre pixel : il ne
   se partage pas, et ne sort pas de ce script. */
var META_PIXEL = '2324082461765253';
var META_JETON = '';
var META_SITE  = 'https://www.benkashoes.ma/';

// Nom de l'onglet qui porte le stock. Créé tout seul s'il manque.
var ONGLET_STOCK = 'Stock';

/* La semence du stock : ce qui est écrit dans l'onglet la première fois, et
   plus jamais ensuite. Une fois l'onglet créé, c'est LUI qui fait foi — on ne
   le réécrit pas depuis le code, sinon la moindre republication du script
   effacerait les corrections de l'atelier.

   Inventaire de référence 920, 202 paires. Ordre des colonnes : POINTURES. */
var STOCK_DEPART = {
  opus: { noir:     [6,6,6,6,4],
          marron:   [6,6,6,6,4],
          marine:   [6,6,6,6,4],
          gris:     [6,6,6,6,4],
          burgundy: [5,5,5,5,2],
          taupe:    [5,5,5,5,2],
          beige:    [5,0,5,6,2],   // 38 déclaré épuisé par l'atelier
          tabac:    [5,5,6,5,2] }
};


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

/* Les colonnes de l'onglet « Stock ». Déclarée ICI, après POINTURES : plus
   haut dans le fichier, POINTURES est hoistée mais encore vide, et le .map
   échouait avant même que le script démarre. */
var COL_STOCK = ['Modèle','Cuir','clé'].concat(POINTURES.map(String)).concat(['Total']);

/* Il n'y a plus de liste de ruptures tenue à la main : l'onglet « Stock » est
   la seule vérité. Une case à zéro refuse la vente, et chaque commande
   décrémente la sienne. Voir retirerDuStock plus bas. */
var LIVR_OFFERTE = 0;     // livraison offerte sans minimum
var LIVR_PRIX    = 0;

/* Les colonnes de l'onglet « Commandes » : une ligne = une commande.
   « Code postal » est parti : le formulaire du site ne le demande plus, la
   colonne restait vide. « Devise » aussi : elle annonçait MAD sur chaque
   ligne d'une boutique qui ne vend qu'en dirhams. Deux colonnes de moins,
   c'est deux colonnes de plus pour lire l'adresse. */
var COLONNES = ['Reçue le','Référence','Statut','Nom','Téléphone','E-mail','Adresse',
                'Ville','Pays','Articles','Paires','Sous-total','Livraison','Total','Note'];

/* L'onglet « Articles » : une ligne = une paire commandée.
   « 1 × Opus Beige — pointure 39 » dans une seule cellule se lit, mais ne
   se compte pas. Ici chaque détail a sa colonne, donc se trie, se filtre et
   s'additionne : combien de 39 ce mois-ci, quel coloris part le mieux. */
var ONGLET_ARTICLES = 'Articles';
var COL_ARTICLES = ['Reçue le','Référence','Modèle','Coloris','Pointure',
                    'Quantité','Prix unitaire','Total ligne'];

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

/** L'onglet du détail, créé au besoin. */
function feuilleArticles() {
  var classeur = FEUILLE_ID ? SpreadsheetApp.openById(FEUILLE_ID)
                            : SpreadsheetApp.getActiveSpreadsheet();
  var a = classeur.getSheetByName(ONGLET_ARTICLES);
  if (!a) {
    a = classeur.insertSheet(ONGLET_ARTICLES);
    a.appendRow(COL_ARTICLES);
    a.setFrozenRows(1);
  }
  return a;
}

/** Une ligne par paire commandée. */
function ecrireArticles(recue, ref, lignes) {
  if (!lignes || !lignes.length) return;
  var a = feuilleArticles();
  var depart = a.getLastRow() + 1;
  var corps = lignes.map(function (l) {
    return [recue, ref, cellule(l.modele), cellule(l.coloris),
            l.pointure, l.q, l.prix, l.prix * l.q];
  });
  a.getRange(depart, 1, corps.length, COL_ARTICLES.length).setValues(corps);
  a.getRange(depart, 1, corps.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  a.getRange(depart, 7, corps.length, 2).setNumberFormat('#,##0 \"DH\"');
}

/* ═══════════════ le stock, dans la feuille ═══════════════

   C'est ici que vit la vérité du stock : une ligne par cuir, une colonne par
   pointure. L'atelier corrige à la main dans l'onglet ; le site lit la même
   chose par doGet ; chaque commande en retire ce qu'elle emporte.

   Trois colonnes avant les chiffres : le modèle et le nom du cuir pour qu'on
   s'y retrouve, puis la clé technique — c'est elle que le code lit, jamais le
   nom affiché, qui peut être réécrit sans rien casser.                      */

/** L'onglet du stock, semé la première fois et jamais réécrit ensuite. */
function feuilleStock() {
  var classeur = FEUILLE_ID ? SpreadsheetApp.openById(FEUILLE_ID)
                            : SpreadsheetApp.getActiveSpreadsheet();
  var f = classeur.getSheetByName(ONGLET_STOCK);
  if (f) return f;
  f = classeur.insertSheet(ONGLET_STOCK);
  var lignes = [COL_STOCK];
  for (var id in STOCK_DEPART) {
    var p = CATALOGUE[id];
    for (var i = 0; i < p.coloris.length; i++) {
      var c = p.coloris[i], v = (STOCK_DEPART[id] || {})[c] || [];
      var l = [p.nom, COLORIS[c] || c, c];
      for (var k = 0; k < POINTURES.length; k++) l.push(Number(v[k]) || 0);
      l.push('');                                   // le total, posé en formule
      lignes.push(l);
    }
  }
  f.getRange(1, 1, lignes.length, COL_STOCK.length).setValues(lignes);
  var premiere = 4, derniere = 3 + POINTURES.length;
  for (var r = 2; r <= lignes.length; r++) {
    f.getRange(r, COL_STOCK.length).setFormula(
      '=SUM(' + f.getRange(r, premiere, 1, POINTURES.length).getA1Notation() + ')');
  }
  habillerStock(f);
  return f;
}

/** Mise en forme, rejouable. */
function habillerStock(f) {
  f = f || feuilleStock();
  var n = COL_STOCK.length;
  f.getRange(1, 1, 1, n).setValues([COL_STOCK])
   .setFontWeight('bold').setBackground('#2b1512').setFontColor('#fdf6ec')
   .setVerticalAlignment('middle');
  f.setFrozenRows(1);
  f.setRowHeight(1, 34);
  f.setColumnWidth(1, 110); f.setColumnWidth(2, 150); f.setColumnWidth(3, 90);
  for (var i = 0; i < POINTURES.length; i++) f.setColumnWidth(4 + i, 70);
  f.setColumnWidth(n, 80);
  // La clé est technique : on la montre, en gris, pour qu'on ne la prenne pas
  // pour une case à remplir.
  f.getRange('C2:C').setFontColor('#9aa0a6');
  // Une case à zéro saute aux yeux : c'est une pointure fermée à la vente.
  f.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule()
    .whenNumberEqualTo(0).setBackground('#fbe3e0').setFontColor('#8a1c13')
    .setRanges([f.getRange(2, 4, Math.max(f.getMaxRows() - 1, 1), POINTURES.length)])
    .build()]);
}

/** Le stock tel qu'il est, lu depuis l'onglet : { modèle: { cuir: [par pointure] } } */
function lireStock() {
  var f = feuilleStock(), out = {};
  var n = f.getLastRow();
  if (n < 2) return out;
  var v = f.getRange(2, 1, n - 1, 3 + POINTURES.length).getValues();
  for (var i = 0; i < v.length; i++) {
    var cle = String(v[i][2] || '').trim();
    if (!cle) continue;
    // Le modèle est retrouvé par son nom affiché : une seule ligne de code à
    // changer si un jour il y a deux modèles.
    var id = null;
    for (var k in CATALOGUE) if (CATALOGUE[k].nom === String(v[i][0]).trim()) id = k;
    if (!id || CATALOGUE[id].coloris.indexOf(cle) < 0) continue;
    var ligne = [];
    for (var t = 0; t < POINTURES.length; t++) {
      var x = Math.floor(Number(v[i][3 + t]));
      ligne.push(isNaN(x) || x < 0 ? 0 : x);
    }
    (out[id] || (out[id] = {}))[cle] = ligne;
  }
  return out;
}

/** Combien reste-t-il, et où est-ce écrit. Rend null si la ligne n'existe pas. */
function caseStock(f, id, cle, pointure) {
  var n = f.getLastRow();
  if (n < 2) return null;
  var col = POINTURES.indexOf(Number(pointure));
  if (col < 0) return null;
  var v = f.getRange(2, 1, n - 1, 3).getValues();
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][2] || '').trim() !== cle) continue;
    if (String(v[i][0] || '').trim() !== CATALOGUE[id].nom) continue;
    return { rangee: i + 2, colonne: 4 + col };
  }
  return null;
}

/* Retire du stock ce que la commande emporte — ou refuse, sans rien toucher.

   À n'appeler QUE sous le verrou de doPost : entre le moment où l'on constate
   qu'il reste une paire et celui où on l'enlève, une seconde commande ne doit
   pas pouvoir passer. C'est tout l'intérêt de faire les deux ici.

   Rend une chaîne d'erreur, ou null si tout est retiré. */
function retirerDuStock(lignes) {
  var f = feuilleStock();
  var besoin = {}, i;
  for (i = 0; i < lignes.length; i++) {
    var k = lignes[i].id + '|' + lignes[i].cle + '|' + lignes[i].pointure;
    besoin[k] = (besoin[k] || 0) + lignes[i].q;
  }
  // D'abord TOUT vérifier, ensuite seulement écrire : une commande de deux
  // paires dont la seconde manque ne doit pas retirer la première.
  var aEcrire = [];
  for (var k2 in besoin) {
    var p = k2.split('|'), ref = caseStock(f, p[0], p[1], p[2]);
    if (!ref) return 'Stock introuvable pour ' + (COLORIS[p[1]] || p[1]) + ' en ' + p[2] + '.';
    var reste = Math.floor(Number(f.getRange(ref.rangee, ref.colonne).getValue())) || 0;
    if (reste < besoin[k2]) {
      return reste <= 0
        ? (COLORIS[p[1]] || p[1]) + ' en pointure ' + p[2] + ' est épuisé.'
        : 'Il ne reste que ' + reste + ' paire(s) de ' + (COLORIS[p[1]] || p[1])
          + ' en pointure ' + p[2] + '.';
    }
    aEcrire.push({ ref: ref, valeur: reste - besoin[k2] });
  }
  for (i = 0; i < aEcrire.length; i++) {
    f.getRange(aEcrire[i].ref.rangee, aEcrire[i].ref.colonne).setValue(aEcrire[i].valeur);
  }
  CacheService.getScriptCache().remove('stock');
  return null;
}

/* ═══════════ l'achat, envoyé de serveur à serveur ═══════════ */

/** SHA-256 en hexadécimal minuscule — la forme exigée par Meta. */
function empreinte(v) {
  if (!v) return null;
  var o = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v), Utilities.Charset.UTF_8);
  var h = '';
  for (var i = 0; i < o.length; i++) h += ('0' + (o[i] & 0xff).toString(16)).slice(-2);
  return h;
}

/* Meta exige des données normalisées AVANT le hachage : sans ça, le même
   client haché de deux façons donne deux empreintes, et le rapprochement
   échoue en silence. */
function normalTel(v) {
  var d = String(v || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 9) d = '212' + d;                 // 6XXXXXXXX
  else if (d.charAt(0) === '0') d = '212' + d.slice(1);
  else if (d.slice(0, 3) !== '212' && d.length === 10) d = '212' + d.slice(1);
  return d;
}
function normalTexte(v) {
  return String(v || '').trim().toLowerCase()
    .normalize ? String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
               : String(v || '').trim().toLowerCase();
}

/* N'échoue jamais bruyamment : une commande enregistrée ne doit pas être
   perdue parce que Meta a mal répondu. La trace va dans Exécutions. */
function envoyerAchatAMeta(cle, cmd, ref) {
  if (!META_JETON || !META_PIXEL) return;
  var nom = normalTexte(cmd.client.nom).split(/\s+/);
  var user = {
    em:      [empreinte(normalTexte(cmd.client.email))],
    ph:      [empreinte(normalTel(cmd.client.tel))],
    fn:      [empreinte(nom[0])],
    ln:      [empreinte(nom.length > 1 ? nom[nom.length - 1] : '')],
    ct:      [empreinte(normalTexte(cmd.client.ville).replace(/\s/g, ''))],
    country: [empreinte('ma')]
  };
  for (var k in user) if (!user[k][0]) delete user[k];

  var contenus = (cmd.lignes || []).map(function (l) {
    return { id: l.id + '-' + l.cle, quantity: l.q, item_price: l.prix };
  });

  var charge = { data: [{
    event_name:       'Purchase',
    event_time:       Math.floor(Date.now() / 1000),
    event_id:         cle,            // le même que celui envoyé par le pixel
    action_source:    'website',
    event_source_url: META_SITE,
    user_data:        user,
    custom_data: { currency: 'MAD', value: cmd.total, order_id: ref,
                   content_type: 'product', contents: contenus }
  }] };

  try {
    var r = UrlFetchApp.fetch(
      'https://graph.facebook.com/v21.0/' + META_PIXEL + '/events?access_token='
        + encodeURIComponent(META_JETON),
      { method: 'post', contentType: 'application/json',
        payload: JSON.stringify(charge), muteHttpExceptions: true });
    if (r.getResponseCode() !== 200)
      console.error('Meta a refusé l\'achat ' + ref + ' : ' + r.getContentText().slice(0, 300));
  } catch (err) {
    console.error('Achat non transmis à Meta (' + ref + ') : ' + err);
  }
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

  var articles = [], lignes = [], sousTotal = 0;
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
    // La même chose, mais en champs séparés : c'est cette forme qui part
    // dans l'onglet « Articles ».
    lignes.push({ id: it.id, cle: c, modele: p.nom, coloris: (COLORIS[c] || c),
                  pointure: t, q: q, prix: p.prix });
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
      lignes: lignes,
      paires: lignes.reduce(function (t, l) { return t + l.q; }, 0),
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
    var ref, f, refus = null;
    try {
      /* Le stock d'abord, et sous le même verrou que l'écriture : entre le
         moment où l'on constate qu'il reste une paire et celui où on l'enlève,
         une seconde commande ne doit pas pouvoir se glisser. Si ça refuse,
         rien n'a bougé — ni le stock, ni la feuille des commandes. */
      refus = retirerDuStock(cmd.lignes);
      if (refus) throw { refusStock: refus };
      f = feuille();
      ref = nouvelleReference(f);
      var recue = new Date();
      f.appendRow([
        recue, ref, 'Nouvelle',
        cellule(cmd.client.nom), texteBrut(cmd.client.tel), cellule(cmd.client.email),
        cellule(cmd.client.adr), cellule(cmd.client.ville), cellule(cmd.client.pays),
        cellule(cmd.articles), cmd.paires,
        cmd.sousTotal, cmd.livraison, cmd.total, cellule(cmd.note)
      ]);
      // La date et les trois montants restent des valeurs, pas du texte :
      // sans cela la feuille ne saurait ni les trier ni les additionner.
      var l = f.getLastRow();
      f.getRange(l, 1).setNumberFormat('dd/mm/yyyy hh:mm');
      f.getRange(l, 12, 1, 3).setNumberFormat('#,##0 \"DH\"');
      // Le détail, une ligne par paire. Si cette écriture échoue, la commande
      // est déjà enregistrée : on ne la perd pas pour un détail.
      try { ecrireArticles(recue, ref, cmd.lignes); } catch (err) {
        console.error('Détail des articles non écrit (' + ref + ') : ' + err);
      }
      memoire.retenir(ref);
    } catch (err) {
      verrou.releaseLock();
      if (err && err.refusStock) return reponse({ erreur: err.refusStock });
      throw err;
    } finally {
      try { verrou.releaseLock(); } catch (e) {}
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

    envoyerAchatAMeta(cle, cmd, ref);

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
var LARGEURS     = [140, 130, 110, 170, 130, 200, 260, 120, 90, 300, 70, 100, 90, 100, 240];
var LARG_ARTICLES = [140, 130, 100, 140, 90, 90, 120, 110];

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
  migrerAncienFormat(f);                 // avant toute mise en forme
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
  f.getRange('J2:J').setWrap(true);      // articles
  f.getRange('O2:O').setWrap(true);      // note

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

  habillerArticles();
  habillerStock();
  tableauDeBord(classeur);
  menageOngletVide(classeur);

  // L'onglet qui résume passe devant : c'est ce qu'on veut voir en ouvrant.
  classeur.setActiveSheet(classeur.getSheetByName('Tableau de bord'));
  classeur.moveActiveSheet(1);
  return 'Feuille organisée.';
}

/** Met l'onglet du détail en forme. Même traitement que « Commandes » :
    en-tête figé, largeurs posées, montants formatés sur la colonne entière. */
function habillerArticles() {
  var a = feuilleArticles();
  var n = COL_ARTICLES.length;
  a.getRange(1, 1, 1, n).setValues([COL_ARTICLES])
   .setFontWeight('bold').setBackground('#2b1512').setFontColor('#fdf6ec')
   .setVerticalAlignment('middle');
  a.setFrozenRows(1);
  a.setRowHeight(1, 34);
  for (var i = 0; i < n; i++) a.setColumnWidth(i + 1, LARG_ARTICLES[i]);
  a.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  a.getRange('G2:H').setNumberFormat('#,##0 "DH"');
  var filtre = a.getFilter();
  if (filtre) filtre.remove();
  a.getRange(1, 1, Math.max(a.getLastRow(), 2), n).createFilter();
}

/** Le résumé. Rien n'y est recopié : tout est formule, donc toujours juste.

    Les totaux de commande se lisent dans « Commandes », les comptages par
    pointure et par coloris dans « Articles » — c'est tout l'intérêt d'avoir
    séparé les deux : on peut enfin demander « combien de 39 beige ». */
function tableauDeBord(classeur) {
  var t = classeur.getSheetByName('Tableau de bord');
  if (!t) t = classeur.insertSheet('Tableau de bord');
  t.clear();
  t.clearConditionalFormatRules();

  var C = "'" + ONGLET + "'!";
  var A = "'" + ONGLET_ARTICLES + "'!";
  var lignes = [], titres = [], argent = [];

  function pousser(gauche, droite) { lignes.push([gauche, droite]); }
  function titre(mot) { pousser('', ''); titres.push(lignes.length + 1); pousser(mot, ''); }
  function dirham() { argent.push(lignes.length); }

  pousser('BENKASHOES', '');
  pousser('Commandes reçues', '=COUNTA(' + C + 'B2:B)');
  pousser('Chiffre d\'affaires', '=SUM(' + C + 'N2:N)');            dirham();
  pousser('Panier moyen', '=IFERROR(ROUND(B3/B2),0)');              dirham();
  pousser('Paires vendues', '=SUM(' + C + 'K2:K)');

  titre('PAR STATUT');
  STATUTS.forEach(function (st) {
    pousser(st, '=COUNTIF(' + C + 'C2:C,"' + st + '")');
  });

  titre('7 DERNIERS JOURS');
  pousser('Commandes', '=COUNTIFS(' + C + 'A2:A,">="&TODAY()-7)');
  pousser('Chiffre d\'affaires',
          '=SUMIFS(' + C + 'N2:N,' + C + 'A2:A,">="&TODAY()-7)');   dirham();

  // Paires, pas commandes : c'est ce qu'on commande au fournisseur.
  titre('PAIRES PAR POINTURE');
  POINTURES.forEach(function (pt) {
    pousser(String(pt), '=SUMIFS(' + A + 'F2:F,' + A + 'E2:E,' + pt + ')');
  });

  titre('PAIRES PAR COLORIS');
  var vus = {};
  for (var id in CATALOGUE) {
    CATALOGUE[id].coloris.forEach(function (c) {
      var nom = COLORIS[c] || c;
      if (vus[nom]) return;
      vus[nom] = true;
      pousser(nom, '=SUMIFS(' + A + 'F2:F,' + A + 'D2:D,"' + nom + '")');
    });
  }

  t.getRange(1, 1, lignes.length, 2).setValues(lignes);
  t.setColumnWidth(1, 220);
  t.setColumnWidth(2, 140);
  t.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#7a1f16');
  t.getRange('A2:A5').setFontWeight('bold');
  titres.forEach(function (r) {
    t.getRange(r, 1, 1, 2).setFontWeight('bold').setFontColor('#7a1f16');
  });
  /* Toute la colonne repasse en nombre simple AVANT qu'on y remette des
     dirhams. Sans cette ligne, un format « DH » survivant d'une version
     précédente du tableau collait à sa cellule : « Commandes : 2 DH ». */
  t.getRange(2, 2, lignes.length - 1, 1).setNumberFormat('0');
  argent.forEach(function (r) { t.getRange(r, 2).setNumberFormat('#,##0 "DH"'); });
  t.getRange(2, 2, lignes.length - 1, 1).setHorizontalAlignment('right');
  t.setFrozenRows(1);
  if (t.getMaxColumns() > 2) t.deleteColumns(3, t.getMaxColumns() - 2);
  if (t.getMaxRows() > lignes.length) t.deleteRows(lignes.length + 1, t.getMaxRows() - lignes.length);
}

/* ───────── reprise des commandes écrites dans l'ancien format ─────────

   L'onglet avait 16 colonnes, dont « Code postal » et « Devise ». Les
   commandes déjà enregistrées ne doivent pas être perdues pour autant :
   on les réécrit dans le nouvel ordre, et on reconstruit leur détail.

   Ne fait rien si l'en-tête est déjà au nouveau format — donc rejouable. */
function migrerAncienFormat(f) {
  var larg = Math.max(f.getLastColumn(), 1);
  var tete = f.getRange(1, 1, 1, larg).getValues()[0];
  if (tete.indexOf('Code postal') < 0) return;      // déjà migré

  var n = f.getLastRow() - 1;
  var vieilles = n > 0 ? f.getRange(2, 1, n, 16).getValues() : [];

  f.clear();
  f.clearConditionalFormatRules();
  var filtre = f.getFilter();
  if (filtre) filtre.remove();
  f.getRange(1, 1, 1, COLONNES.length).setValues([COLONNES]);

  if (!vieilles.length) return;
  var neuves = vieilles.map(function (v) {
    var lignes = lireArticles(v[10]);
    var paires = lignes.reduce(function (t, l) { return t + l.q; }, 0);
    return [v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[8], v[9],
            v[10], paires, v[11], v[12], v[13], v[15]];
  });
  f.getRange(2, 1, neuves.length, COLONNES.length).setValues(neuves);

  // Le détail repart de zéro : il se reconstruit entièrement d'ici.
  var a = feuilleArticles();
  if (a.getLastRow() > 1) a.getRange(2, 1, a.getLastRow() - 1, a.getLastColumn()).clearContent();
  vieilles.forEach(function (v) {
    ecrireArticles(v[0], v[1], lireArticles(v[10]));
  });
}

/** Relit « 2 × Opus Marron taupe — pointure 39 | 1 × … » en champs séparés.

    On ne relit ici que des textes écrits par ce script lui-même, dans un
    format qu'il contrôle. Le nom de modèle est pris en un seul mot : si un
    jour un modèle s'appelle « Opus Bis », il faudra revoir cette ligne. */
function lireArticles(texteArticles) {
  var sortie = [];
  String(texteArticles || '').split(' | ').forEach(function (bout) {
    var m = bout.match(/^(\d+)\s*×\s*(\S+)\s+(.+?)\s+—\s+pointure\s+(\d+)$/);
    if (!m) return;
    var prix = 0;
    for (var id in CATALOGUE) if (CATALOGUE[id].nom === m[2]) prix = CATALOGUE[id].prix;
    sortie.push({ modele: m[2], coloris: m[3], pointure: Number(m[4]),
                  q: Number(m[1]), prix: prix });
  });
  return sortie;
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
  /* Le site lit le stock ici à chaque visite. Un cache de soixante secondes
     évite d'ouvrir la feuille pour chaque visiteur — le quota d'exécution
     d'un compte Google n'est pas infini — sans jamais afficher plus d'une
     minute de retard. retirerDuStock vide ce cache dès qu'il écrit. */
  var cache = CacheService.getScriptCache(), brut = null;
  try { brut = cache.get('stock'); } catch (e) {}
  var stock;
  if (brut) { try { stock = JSON.parse(brut); } catch (e) { stock = null; } }
  if (!stock) {
    try { stock = lireStock(); cache.put('stock', JSON.stringify(stock), 60); }
    catch (e) { stock = null; }
  }
  return reponse({ service: 'Benkashoes — réception des commandes', methode: 'POST',
                   alerte: ALERTE_EMAIL ? 'armée' : 'absente',
                   stock: stock });
}
