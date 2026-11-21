/* Les étapes restent accessibles sans traverser toute la visite au défilement. */
(function(){
  const section=document.getElementById('visite');
  const stage=section?.querySelector('.visite-stage');
  const select=document.getElementById('fete-chapter');
  const nav=section?.querySelector('.fete-tour-nav');
  if(!section||!stage||!select||!nav)return;
  const art=section.querySelector('.showroom-cover-art');
  if(art&&typeof riadPortalSVG==='function')art.innerHTML=riadPortalSVG().replace('decoding="async"','decoding="async" loading="lazy"');
  nav.hidden=false;
  const caps=[...section.querySelectorAll('.vcap')];
  const prev=document.getElementById('tour-prev'),next=document.getElementById('tour-next'),position=document.getElementById('tour-position');
  const sync=()=>{if(prev)prev.disabled=select.selectedIndex===0;if(next)next.disabled=select.selectedIndex===select.options.length-1;if(position)position.textContent=String(select.selectedIndex+1).padStart(2,'0')+' / '+String(select.options.length).padStart(2,'0');};
  const jump=()=>{
    const offset=parseFloat(getComputedStyle(stage).top)||0;
    const start=section.getBoundingClientRect().top+scrollY-offset;
    const span=Math.max(1,section.offsetHeight-stage.offsetHeight);
    section.dispatchEvent(new Event('benka:visitejump'));
    window.scrollTo({top:Math.max(0,start+Number(select.value)*span),behavior:'instant'});
    sync();reveiller();
  };
  select.addEventListener('change',jump);
  prev?.addEventListener('click',()=>{select.selectedIndex=Math.max(0,select.selectedIndex-1);jump();});
  next?.addEventListener('click',()=>{select.selectedIndex=Math.min(select.options.length-1,select.selectedIndex+1);jump();});
  sync();
  // La boucle existante synchronise le menu ; aucun minuteur supplémentaire.
  let previous=-1;
  avancer((dt,sy)=>{
    if(section.dataset.showroomActive!=='true'||!MOTION||document.documentElement.classList.contains('degrade'))return false;
    const progress=borne((sy-GEO.vTop)/GEO.vSpan,0,1);
    const index=caps.findIndex(cap=>progress>=Number(cap.dataset.a)&&progress<Number(cap.dataset.b));
    if(index!==previous&&index>=0){select.selectedIndex=index;previous=index;sync();}
    return false;
  });
})();
