/* ======================= moteur d'animation =======================
   Une seule boucle pour toute la page. La géométrie est mesurée une fois
   et remesurée au redimensionnement : plus aucune lecture forcée du
   rendu pendant l'animation, qui est la première cause de saccade. */
const MOTEUR={taches:[],actif:false,t:0,raf:0,timer:0};
const GEO={};
function mesurerEcranMobile(){
  if(!matchMedia('(max-width:860px)').matches)return;
  const root=document.documentElement,v=window.visualViewport;
  const entete=$('.hdr');
  const hauteur=(entete?.getBoundingClientRect().height||62)+(entete?(parseFloat(getComputedStyle(entete).top)||0):0);
  root.style.setProperty('--mobile-header',hauteur+'px');
  if(!v||v.scale===1){root.style.setProperty('--mobile-screen',(v?.height||innerHeight)+'px');
    root.style.setProperty('--mobile-screen-top',(v?.offsetTop||0)+'px');}
}
// Les barres du navigateur mobile émettent plusieurs événements par image.
// Une seule mesure suffit, et un défilement visuel ne relit pas l'en-tête.
let mesureMobileRaf=0;
function planifierMesureMobile(){
  if(mesureMobileRaf)return;
  mesureMobileRaf=requestAnimationFrame(()=>{mesureMobileRaf=0;mesurerEcranMobile();});
}
window.visualViewport?.addEventListener('resize',planifierMesureMobile,{passive:true});
window.visualViewport?.addEventListener('scroll',()=>{
  const v=window.visualViewport;
  if(v&&v.scale===1)document.documentElement.style.setProperty('--mobile-screen-top',v.offsetTop+'px');
},{passive:true});
function mesurer(){
  mesurerEcranMobile();
  GEO.vw=innerWidth; GEO.vh=innerHeight;
  if(typeof RV!=='undefined'&&RV.length)mesurerRV();
  const v=$('#visite'),vStage=$('.visite-stage');
  if(v&&vStage){const decalage=parseFloat(getComputedStyle(vStage).top)||0;GEO.vTop=v.offsetTop-decalage;GEO.vSpan=Math.max(1,v.offsetHeight-vStage.offsetHeight);}
  const a=$('#atelier'),t=$('#attrack');
  const aStage=$('.at-stage');
  if(a&&aStage){const decalage=parseFloat(getComputedStyle(aStage).top)||0;GEO.aTop=a.offsetTop-decalage;GEO.aSpan=Math.max(1,a.offsetHeight-aStage.offsetHeight);}
  if(t){GEO.tW=t.scrollWidth;
    GEO.figs=[...t.children].map(el=>({im:el.querySelector('img'),x:el.offsetLeft,w:el.offsetWidth}))
      .filter(o=>o.im);}
}
function avancer(fn){
  MOTEUR.taches.push(fn);
  return ()=>{const i=MOTEUR.taches.indexOf(fn);if(i>=0)MOTEUR.taches.splice(i,1);};
}
/* Une tâche retourne true pendant une interpolation, false au repos, ou
   un délai en millisecondes pour un décor autonome à cadence limitée. */
function tourner(ts){
  MOTEUR.raf=0;
  if(document.hidden){MOTEUR.actif=false;return;}
  const dt=Math.min(.1,(ts-MOTEUR.t)/1000||.016); MOTEUR.t=ts;
  const sy=scrollY;
  let delai=Infinity;
  for(let i=0;i<MOTEUR.taches.length;i++){
    const suite=MOTEUR.taches[i](dt,sy);
    if(suite===true)delai=0;
    else if(typeof suite==='number'&&suite>0)delai=Math.min(delai,suite);
  }
  if(delai===0)MOTEUR.raf=requestAnimationFrame(tourner);
  else if(Number.isFinite(delai)){
    // Le navigateur garde le dernier pas de synchronisation avec l'écran.
    MOTEUR.timer=setTimeout(()=>{
      MOTEUR.timer=0;
      if(document.hidden){MOTEUR.actif=false;return;}
      MOTEUR.raf=requestAnimationFrame(tourner);
    },Math.max(0,delai-16));
  }else MOTEUR.actif=false;
}
function reveiller(){
  if(document.hidden||!MOTEUR.taches.length)return;
  // Un vrai geste interrompt l'attente du décor : le scroll reste immédiat.
  if(MOTEUR.timer){clearTimeout(MOTEUR.timer);MOTEUR.timer=0;}
  if(MOTEUR.raf)return;
  if(!MOTEUR.actif)MOTEUR.t=performance.now();
  MOTEUR.actif=true;MOTEUR.raf=requestAnimationFrame(tourner);
}
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)return;
  if(MOTEUR.raf)cancelAnimationFrame(MOTEUR.raf);
  if(MOTEUR.timer)clearTimeout(MOTEUR.timer);
  MOTEUR.raf=0;MOTEUR.timer=0;MOTEUR.actif=false;
});
document.addEventListener('benka:motionchange',reveiller);
const borne=(v,a,b)=>v<a?a:v>b?b:v;

