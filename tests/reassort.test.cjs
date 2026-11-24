const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');

const jour=86400000;
const source=fs.readFileSync('integrations/reassort.gs','utf8');
function simulation(){
  const temps={now:Date.UTC(2026,10,24)},props=new Map([['COMPTE_PROPRIETAIRE','atelier@example.invalid']]),stock={},mails=[],logs=[],triggers=[];
  for(const [id,cs] of Object.entries({opus:['beige','taupe','marron','tabac','burgundy','gris','marine','noir'],as:['camel','cognac','noir','chocolat']})){
    stock[id]=Object.fromEntries(cs.map(c=>[c,[0,0,0,0,0]]));
  }
  const service={
    getProperty:k=>props.get(k)??null,setProperty(k,v){props.set(k,v);return this;},
    getKeys:()=>[...props.keys()],deleteProperty(k){props.delete(k);return this;}
  };
  let verrous=0,numero=0,nForm=0;
  const reponses=new Map(),questions=[];
  const etat={quota:10,echecMail:false,echecSuppression:false,codeStock:200,owner:'atelier@example.invalid',collecte:false,publie:false};
  const form={
    getId:()=>'atelier-test',getItems:()=>questions,
    addListItem(){
      const item={getType:()=>'LIST',asListItem:()=>item,getId:()=>72,
        setTitle(){return this;},setChoiceValues(v){etat.choix=Array.from(v);return this;},
        setRequired(){return this;},createResponse:v=>v};questions.push(item);return item;
    },
    setDescription(){return this;},setConfirmationMessage(){return this;},
    setAllowResponseEdits(){return this;},setPublishingSummary(v){etat.resume=v;return this;},
    setLimitOneResponsePerUser(){return this;},setShowLinkToRespondAgain(){return this;},
    collectsEmail:()=>etat.collecte,setCollectEmail(v){etat.collecte=v;return this;},
    supportsAdvancedResponderPermissions:()=>true,isPublished:()=>etat.publie,setPublished(v){etat.publie=v;return this;},
    createResponse(){return {withItemResponse(v){return {toPrefilledUrl:()=>'https://docs.google.com/forms/d/e/TEST/viewform?usp=pp_url&entry.72='+encodeURIComponent(v)};}};},
    getResponses:()=>[...reponses.values()],deleteResponse(id){if(etat.echecSuppression){etat.echecSuppression=false;throw Error('test suppression');}reponses.delete(id);}
  };
  const contexte=vm.createContext({
    Date:class extends Date{static now(){return temps.now;}},
    FormApp:{ItemType:{LIST:'LIST'},create(){nForm++;return form;},openById(id){assert.equal(id,'atelier-test');return form;}},
    Session:{getEffectiveUser:()=>({getEmail:()=>etat.owner})},
    LockService:{getScriptLock:()=>({waitLock(){assert.equal(verrous++,0);},releaseLock(){assert.equal(--verrous,0);}})},
    PropertiesService:{getScriptProperties:()=>service},
    MailApp:{getRemainingDailyQuota:()=>etat.quota,sendEmail(m){mails.push(m);if(etat.echecMail)throw Error('réponse perdue');}},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
      computeDigest:(alg,s,charset)=>crypto.createHash(alg).update(s,charset).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')},
    UrlFetchApp:{fetch(url,opts){assert.match(url,/^https:\/\/script.google.com\/macros\/s\/.+\/exec$/);assert.equal(opts.method,'get');
      return {getResponseCode:()=>etat.codeStock,getContentText:()=>JSON.stringify({stock})};}},
    ScriptApp:{getProjectTriggers:()=>triggers,deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),
      newTrigger(handler){return {timeBased(){return this;},everyHours(n){assert.equal(n,1);return this;},create(){triggers.push({getHandlerFunction:()=>handler});}};}},
    console:{log:m=>logs.push(m)}
  });
  vm.runInContext(source,contexte);
  const run=fn=>vm.runInContext(fn+'()',contexte);
  function inscrire(email,libelle,date=temps.now){
    const id=String(++numero);
    reponses.set(id,{getTimestamp:()=>new Date(date),getRespondentEmail:()=>email,getId:()=>id,
      getItemResponses:()=>[{getItem:()=>questions[0],getResponse:()=>libelle}]});
  }
  return {run,inscrire,stock,etat,temps,mails,logs,props,reponses,triggers,get nbForms(){return nForm;}};
}
const camel='AS by BENKA · Camel · 37',beige='Opus · Beige · 38';
function pret(){
  const s=simulation();s.run('initialiserReassorts');s.temps.now+=1000;s.run('confirmerCollecteVerifieeReassorts');s.temps.now+=1000;return s;
}
test('initialisation idempotente sous le propriétaire, 60 variantes identiques au catalogue du site',()=>{
  const s=simulation();s.etat.owner='autre@example.invalid';
  assert.throws(()=>s.run('initialiserReassorts'),/propriétaire/);assert.equal(s.nbForms,0);
  s.etat.owner='atelier@example.invalid';const url=s.run('initialiserReassorts');s.run('initialiserReassorts');
  assert.equal(s.nbForms,1);assert.equal(s.triggers.length,1);assert.equal(s.etat.resume,false);assert.ok(s.etat.publie);
  assert.equal(new URL(url).searchParams.get('entry.72'),camel);assert.deepEqual(s.logs,[url,url]);
  const catalogue=fs.readFileSync('src/scripts/02-catalogue.js','utf8');
  const labels=vm.runInNewContext(catalogue+'; CATALOG.flatMap(p=>p.colors.flatMap(c=>SIZES.map(s=>[p.name,COLORS[c].n,s].join(" · "))))');
  assert.equal(s.etat.choix.length,60);assert.deepEqual([...s.etat.choix].sort(),Array.from(labels).sort());
});
test('alerte après le retour de la variante exacte, e-mail dédupliqué et réinscription lors d’une nouvelle rupture',()=>{
  const s=pret();s.inscrire('ESSAI@example.invalid',camel);s.inscrire('essai@example.invalid',camel);s.inscrire('client@example.invalid',beige);
  const bilan=s.run('bilanReassorts');assert.equal(bilan.demandesParVariante[camel],1);assert.equal(bilan.demandesParVariante[beige],1);
  assert.doesNotMatch(s.logs.join('\n'),/@example/);
  s.stock.as.camel[1]=6;s.run('traiterReassorts');assert.equal(s.mails.length,0);
  s.stock.as.camel[0]=3;s.temps.now+=1000;s.run('traiterReassorts');s.run('traiterReassorts');
  assert.equal(s.mails.length,1);assert.equal(s.mails[0].to,'essai@example.invalid');assert.match(s.mails[0].body,/#as-camel/);assert.equal(s.reponses.size,1);
  s.temps.now+=1000;s.inscrire('essai@example.invalid',camel);s.run('traiterReassorts');assert.equal(s.mails.length,1);
  s.stock.as.camel[0]=0;s.run('traiterReassorts');s.stock.as.camel[0]=2;s.temps.now+=1000;s.run('traiterReassorts');assert.equal(s.mails.length,2);
});
test('collecte vérifiée, expiration, quota et lecture en panne ne déclenchent aucune alerte prématurée',()=>{
  const s=simulation();s.run('initialiserReassorts');s.inscrire('avant@example.invalid',camel);
  s.stock.as.camel[0]=10;s.run('traiterReassorts');assert.equal(s.mails.length,0);
  s.temps.now+=1000;s.run('confirmerCollecteVerifieeReassorts');s.inscrire('expire@example.invalid',camel,s.temps.now-61*jour);
  s.stock.as.camel[0]=0;s.run('traiterReassorts');assert.equal(s.reponses.size,0);
  s.inscrire('apres@example.invalid',camel);s.stock.as.camel[0]=4;s.etat.codeStock=503;
  assert.throws(()=>s.run('traiterReassorts'),/stock/);assert.equal(s.reponses.size,1);
  s.etat.codeStock=200;s.etat.quota=0;s.temps.now+=1000;s.run('traiterReassorts');assert.equal(s.mails.length,0);assert.equal(s.reponses.size,1);
  s.etat.quota=1;s.run('traiterReassorts');assert.equal(s.mails.length,1);assert.equal(s.reponses.size,0);
});
test('coupure après remise du mail ou échec de suppression des réponses : aucun double envoi',()=>{
  for(const incertain of [false,true]){
    const s=pret();s.inscrire('essai@example.invalid',camel);s.stock.as.camel[0]=2;s.temps.now+=1000;
    s.etat.echecMail=incertain;s.etat.echecSuppression=!incertain;
    if(incertain)s.run('traiterReassorts');else assert.throws(()=>s.run('traiterReassorts'),/suppression/);
    s.etat.echecMail=false;s.run('traiterReassorts');assert.equal(s.mails.length,1);
    assert.equal(s.run('bilanReassorts').envoisAVerifier,incertain?1:0);
    s.temps.now+=61*jour;s.run('traiterReassorts');assert.equal(s.reponses.size,0);
    assert.ok([...s.props.keys()].every(k=>!k.startsWith('ENVOI_')));
  }
});
test('une réponse de stock partielle ne change aucune variante',()=>{
  const s=pret();const avant=s.props.get('DISPONIBILITES');delete s.stock.as.camel;s.stock.opus.beige[0]=4;
  assert.throws(()=>s.run('traiterReassorts'),/incomplète/);assert.equal(s.props.get('DISPONIBILITES'),avant);
});
