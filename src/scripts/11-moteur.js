/* ======================= moteur d'animation =======================
   Une seule boucle pour toute la page. La géométrie est mesurée une fois
   et remesurée au redimensionnement : plus aucune lecture forcée du
   rendu pendant l'animation, qui est la première cause de saccade. */
const MOTEUR={taches:[],actif:false,t:0};
const GEO={};
function mesurerEcranMobile(){
  if(!matchMedia('(max-width:860px)').matches)return;
  const root=document.documentElement,v=window.visualViewport;
  const hauteur=$('.hdr')?.getBoundingClientRect().height||62;
  root.style.setProperty('--mobile-header',hauteur+'px');
  if(!v||v.scale===1){root.style.setProperty('--mobile-screen',(v?.height||innerHeight)+'px');
    root.style.setProperty('--mobile-screen-top',(v?.offsetTop||0)+'px');}
}
window.visualViewport?.addEventListener('resize',mesurerEcranMobile,{passive:true});
window.visualViewport?.addEventListener('scroll',mesurerEcranMobile,{passive:true});
function mesurer(){
  mesurerEcranMobile();
  GEO.vw=innerWidth; GEO.vh=innerHeight;
  if(typeof RV!=='undefined'&&RV.length)mesurerRV();
  const v=$('#visite'); if(v){const stage=$('.visite-stage'),decalage=parseFloat(getComputedStyle(stage).top)||0;GEO.vTop=v.offsetTop-decalage; GEO.vSpan=Math.max(1,v.offsetHeight-stage.offsetHeight);}
  const a=$('#atelier'),t=$('#attrack');
  if(a){const stage=$('.at-stage'),decalage=parseFloat(getComputedStyle(stage).top)||0;GEO.aTop=a.offsetTop-decalage; GEO.aSpan=Math.max(1,a.offsetHeight-stage.offsetHeight);}
  if(t){GEO.tW=t.scrollWidth;
    GEO.figs=[...t.children].map(el=>({im:el.querySelector('img'),x:el.offsetLeft,w:el.offsetWidth}))
      .filter(o=>o.im);}
}
function avancer(fn){MOTEUR.taches.push(fn);}
function tourner(ts){
  const dt=Math.min(.05,(ts-MOTEUR.t)/1000||.016); MOTEUR.t=ts;
  let encore=false;
  for(let i=0;i<MOTEUR.taches.length;i++) if(MOTEUR.taches[i](dt,scrollY)) encore=true;
  if(encore&&!document.hidden) requestAnimationFrame(tourner); else MOTEUR.actif=false;
}
function reveiller(){
  if(MOTEUR.actif||document.hidden||!MOTEUR.taches.length)return;
  MOTEUR.actif=true; MOTEUR.t=performance.now(); requestAnimationFrame(tourner);
}
const borne=(v,a,b)=>v<a?a:v>b?b:v;

