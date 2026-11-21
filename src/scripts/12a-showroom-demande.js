/* La boutique fonctionne sans charger ni construire le moteur de visite. */
function initShowroomDemande(){
  const section=$('#visite'),stage=$('#showroom-stage'),button=$('#showroom-start');
  if(!section||!stage||!button||!MOTION)return;
  const cover=section.querySelector('.showroom-cover'),status=$('#showroom-status'),world=$('#world');
  let chargement=null,arreter=null,actif=false;
  function charger(){
    if(chargement)return chargement;
    chargement=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=SHOWROOM_SOURCE;script.async=true;
      script.onload=()=>resolve();
      script.onerror=()=>{script.remove();chargement=null;reject(new Error('chargement du showroom'));};
      document.head.appendChild(script);
    });
    return chargement;
  }
  function fermer(revenir=false){
    if(!actif)return;
    arreter?.();arreter=null;actif=false;
    stage.hidden=true;cover.hidden=false;
    section.classList.add('visite-preview');section.dataset.showroomActive='false';
    world.replaceChildren();world.removeAttribute('style');
    button.setAttribute('aria-expanded','false');
    mesurer();reveiller();
    if(revenir){section.scrollIntoView({block:'start',behavior:'instant'});button.focus({preventScroll:true});}
  }
  button.hidden=false;
  button.addEventListener('click',async()=>{
    if(actif||button.disabled)return;
    button.disabled=true;status.textContent='Ouverture du showroom…';
    try{
      await charger();
      cover.hidden=true;stage.hidden=false;actif=true;
      section.classList.remove('visite-preview');section.dataset.showroomActive='true';
      button.setAttribute('aria-expanded','true');
      section.scrollIntoView({block:'start',behavior:'instant'});
      arreter=initVisite();
      $('#showroom-close')?.focus({preventScroll:true});
      status.textContent='';
    }catch(err){
      fermer();status.textContent='La visite est indisponible. La collection reste accessible via « Voir les modèles ».';
      console.warn('[benka] showroom :',err);
    }finally{button.disabled=false;}
  });
  $('#showroom-close')?.addEventListener('click',()=>fermer(true));
  section.addEventListener('benka:showroomclose',()=>fermer());
}
