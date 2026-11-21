/* Les anciennes publicités et favoris restent valables après la séparation. */
function benkaPagePourAncre(hash){
  const anchor=String(hash||'').replace(/^#/,'');
  if(['modeles','as-by-benka','packs'].includes(anchor)||/^(opus-(beige|taupe|marron|tabac|burgundy|gris|marine|noir)|as-(camel|cognac|noir|chocolat))$/.test(anchor))return '/collection/';
  if(anchor==='visite')return '/showroom/';
  if(['liege','atelier'].includes(anchor))return '/maison/';
  if(['tailles','commander','faq'].includes(anchor))return '/aide/';
  return null;
}
function redirigerAncienneAncre(){
  const destination=benkaPagePourAncre(location.hash);
  const ici=location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');
  if(destination&&ici!==destination){location.replace(destination+location.search+location.hash);return true;}
  return false;
}
redirigerAncienneAncre();
