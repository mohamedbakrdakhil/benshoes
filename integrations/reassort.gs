// Projet Apps Script autonome de Benka. Les inscriptions restent dans un Google Form privé en édition.
// L'adresse préremplie imprimée par initialiserReassorts() est la seule donnée à reporter sur le site.
const REASSORT_STOCK = 'https://script.google.com/macros/s/AKfycbyKIXldC3avykJrboBcLLyYBL0xjefbvN7sZXuF55bztMTadznsNQL7XruExX-1mhPj/exec';
const REASSORT_DUREE = 60 * 24 * 3600000;
const REASSORT_MODELES = {
  opus: ['Opus', {beige:'Beige',taupe:'Marron taupe',marron:'Marron',tabac:'Tabac',burgundy:'Burgundy',gris:'Gris',marine:'Marine',noir:'Noir'}],
  as: ['AS by BENKA', {camel:'Camel',cognac:'Cognac',noir:'Noir',chocolat:'Chocolat'}]
};
const REASSORT_QUESTION = 'Modèle, coloris et pointure';

function variantesReassort_() {
  const resultat = [];
  for (const [id, [modele, couleurs]] of Object.entries(REASSORT_MODELES)) {
    for (const [couleur, nom] of Object.entries(couleurs)) {
      for (let taille=37; taille<=41; taille++) {
        resultat.push({id,couleur,taille,libelle:[modele,nom,taille].join(' · ')});
      }
    }
  }
  return resultat;
}

function avecVerrouReassort_(action) {
  const props = PropertiesService.getScriptProperties();
  const proprietaire = (props.getProperty('COMPTE_PROPRIETAIRE') || '').trim().toLowerCase();
  if (!proprietaire || Session.getEffectiveUser().getEmail().toLowerCase() !== proprietaire)
    throw Error('Ouvrez le projet sous le compte propriétaire de Benka.');
  const verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try { return action(props); }
  finally { verrou.releaseLock(); }
}

function initialiserReassorts() {
  return avecVerrouReassort_(props => {
    let id = props.getProperty('FORMULAIRE');
    let form;
    if (!id) {
      form = FormApp.create('Benka Shoes · Retour en stock', false);
      props.setProperty('FORMULAIRE', form.getId());
    } else form = FormApp.openById(id);
    form.setDescription('Choisissez le modèle, le coloris et la pointure. En envoyant cette demande, vous acceptez de recevoir un e-mail de Benka Shoes lorsque cette paire revient en stock. Votre demande expire après 60 jours. La disponibilité peut évoluer avant votre commande.')
      .setConfirmationMessage('Votre demande est enregistrée pour ce modèle et cette pointure.')
      .setAllowResponseEdits(false).setPublishingSummary(false)
      .setLimitOneResponsePerUser(false).setShowLinkToRespondAgain(false);
    if (!form.collectsEmail()) {
      props.deleteProperty('COLLECTE_VERIFIEE');
      form.setCollectEmail(true);
    }
    const variantes = variantesReassort_();
    const items = form.getItems();
    if (items.length > 1 || (items.length && items[0].getType() !== FormApp.ItemType.LIST))
      throw Error('Le formulaire comporte une question inattendue.');
    const question = items.length ? items[0].asListItem() : form.addListItem();
    question.setTitle(REASSORT_QUESTION).setChoiceValues(variantes.map(v=>v.libelle)).setRequired(true);
    props.setProperty('QUESTION', String(question.getId()));
    if (!props.getProperty('DISPONIBILITES')) releverReassorts_(props, variantes, Date.now());
    if (form.supportsAdvancedResponderPermissions() && !form.isPublished()) form.setPublished(true);
    const declencheurs = ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='traiterReassorts');
    if (!declencheurs.length) ScriptApp.newTrigger('traiterReassorts').timeBased().everyHours(1).create();
    declencheurs.slice(1).forEach(t=>ScriptApp.deleteTrigger(t));
    const url = form.createResponse().withItemResponse(question.createResponse('AS by BENKA · Camel · 37')).toPrefilledUrl();
    console.log(url);
    return url;
  });
}

// FormApp expose seulement le booléen collectsEmail(). Exécuter cette fonction après avoir vérifié
// « Collecter les adresses e-mail : Validées » dans les paramètres du formulaire.
// Les réponses antérieures à la première vérification ne déclenchent aucun message.
function confirmerCollecteVerifieeReassorts() {
  return avecVerrouReassort_(props => {
    const form = FormApp.openById(props.getProperty('FORMULAIRE'));
    if (!form.collectsEmail()) throw Error('Activez la collecte des adresses e-mail validées.');
    if (!props.getProperty('COLLECTE_VERIFIEE')) props.setProperty('COLLECTE_VERIFIEE', String(Date.now()));
  });
}

// Un événement est un passage réellement observé de zéro à une quantité positive.
// Une lecture défaillante ou incomplète ne modifie jamais l'état de référence.
function releverReassorts_(props, variantes, maintenant) {
  const r = UrlFetchApp.fetch(REASSORT_STOCK, {method:'get', muteHttpExceptions:true});
  if (r.getResponseCode() !== 200) throw Error('Lecture du stock momentanément indisponible.');
  const stock = JSON.parse(r.getContentText()).stock;
  const avant = JSON.parse(props.getProperty('DISPONIBILITES') || '{}');
  const apres = {};
  for (const v of variantes) {
    const tailles = stock && stock[v.id] && stock[v.id][v.couleur];
    const n = Array.isArray(tailles) && tailles.length === 5 ? tailles[v.taille-37] : undefined;
    if (!Number.isSafeInteger(n) || n < 0) throw Error('Grille de stock incomplète.');
    const precedent = avant[v.libelle];
    apres[v.libelle] = {dispo:n>0, retour:precedent && !precedent.dispo && n>0 ? maintenant : (precedent ? precedent.retour : 0)};
  }
  props.setProperty('DISPONIBILITES', JSON.stringify(apres));
  return apres;
}

function cleReassort_(email, libelle) {
  const octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email+'\n'+libelle, Utilities.Charset.UTF_8);
  return 'ENVOI_'+Utilities.base64EncodeWebSafe(octets);
}

function demandesReassort_(form, props, variantes, maintenant) {
  const seuil = Number(props.getProperty('COLLECTE_VERIFIEE')) || 0;
  const idQuestion = props.getProperty('QUESTION');
  const valides = new Set(variantes.map(v=>v.libelle));
  const groupes = new Map(), aEffacer=[];
  for (const r of form.getResponses()) {
    const date = r.getTimestamp().getTime();
    const email = String(r.getRespondentEmail() || '').trim().toLowerCase();
    const choix = r.getItemResponses().find(l=>String(l.getItem().getId())===idQuestion);
    const libelle = choix && choix.getResponse();
    if (date <= maintenant-REASSORT_DUREE || (seuil && date < seuil)
        || !valides.has(libelle) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) {
      aEffacer.push(r.getId());
      continue;
    }
    const cle = cleReassort_(email, libelle);
    if (!groupes.has(cle)) groupes.set(cle, {email,libelle,reponses:[]});
    groupes.get(cle).reponses.push({id:r.getId(),date});
  }
  return {groupes,aEffacer};
}

function bilanReassorts() {
  return avecVerrouReassort_(props => {
    const variantes = variantesReassort_();
    const form = FormApp.openById(props.getProperty('FORMULAIRE'));
    const {groupes} = demandesReassort_(form,props,variantes,Date.now());
    const quantites = Object.fromEntries(variantes.map(v=>[v.libelle,0]));
    let envoisAVerifier = 0;
    for (const [cle,groupe] of groupes) {
      const trace = JSON.parse(props.getProperty(cle) || 'null');
      if (!trace || groupe.reponses.some(r=>r.date>trace.jusqua)) quantites[groupe.libelle]++;
      if (trace && trace.etat==='engage') envoisAVerifier++;
    }
    const bilan = {demandesParVariante:quantites,envoisAVerifier};
    console.log(JSON.stringify(bilan));
    return bilan;
  });
}

function traiterReassorts() {
  return avecVerrouReassort_(props => {
    const maintenant=Date.now(), limite=maintenant+220000, variantes=variantesReassort_();
    const form=FormApp.openById(props.getProperty('FORMULAIRE'));
    if (!form.collectsEmail()) props.deleteProperty('COLLECTE_VERIFIEE');
    const {groupes,aEffacer}=demandesReassort_(form,props,variantes,maintenant);
    for (const id of aEffacer) {
      if (Date.now()>limite) return;
      form.deleteResponse(id);
    }
    // Une réserve ancienne sans réponse restante peut disparaître sans provoquer de doublon.
    for (const cle of props.getKeys()) if (cle.startsWith('ENVOI_') && !groupes.has(cle)) props.deleteProperty(cle);
    const dispos=releverReassorts_(props,variantes,maintenant);
    if (!props.getProperty('COLLECTE_VERIFIEE')) return;
    let quota=MailApp.getRemainingDailyQuota();
    for (const [cle,groupe] of groupes) {
      if (Date.now()>limite) return;
      const trace=JSON.parse(props.getProperty(cle) || 'null');
      let reponses=groupe.reponses;
      if (trace) {
        const couvertes=reponses.filter(r=>r.date<=trace.jusqua);
        if (trace.etat==='engage' && couvertes.length) continue;
        for (const r of couvertes) form.deleteResponse(r.id);
        reponses=reponses.filter(r=>r.date>trace.jusqua);
        props.deleteProperty(cle);
      }
      const dispo=dispos[groupe.libelle];
      if (!quota || !dispo.dispo || !reponses.some(r=>r.date<=dispo.retour)) continue;
      const variante=variantes.find(v=>v.libelle===groupe.libelle);
      const url='https://www.benkashoes.ma/collection/#'+variante.id+'-'+variante.couleur;
      // MailApp et Forms n'ont pas de transaction commune. Cette réserve empêche un double
      // envoi même après une coupure. Une remise incertaine est comptée dans le bilan privé.
      props.setProperty(cle,JSON.stringify({jusqua:maintenant,etat:'engage'}));
      try {
        MailApp.sendEmail({to:groupe.email,subject:'Benka Shoes · Votre paire est de retour',
          body:groupe.libelle+' est de nouveau disponible au moment de cet e-mail.\n\nVoir la paire et choisir la pointure '+variante.taille+' :\n'+url+'\n\nVous recevez cette alerte à votre demande.\nBenka Shoes',
          name:'Benka Shoes'});
      } catch (_) { break; }
      quota--;
      props.setProperty(cle,JSON.stringify({jusqua:maintenant,etat:'envoye'}));
      for (const r of reponses) form.deleteResponse(r.id);
      props.deleteProperty(cle);
    }
  });
}
