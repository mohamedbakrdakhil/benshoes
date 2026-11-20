/* Effets de campagne : préférence de pause et arrêt hors écran.
   Aucun minuteur ni nouvelle boucle de rendu ; le catalogue reste indépendant. */
(function(){
  function initBlackFridayMotion(){
    const root=document.getElementById('shopview');
    const button=document.getElementById('bf-motion-toggle');
    if(!root||!root.classList.contains('black-friday')||!button)return;

    const key='benkashoes.blackFridayMotionPaused';
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const label=button.querySelector('[data-bf-motion-label]');
    const icon=button.querySelector('[data-bf-motion-icon]');
    let paused=lsGet(key)===true;

    function updateControl(){
      root.classList.toggle('bf-paused',paused);
      button.hidden=reduced.matches;
      button.setAttribute('aria-pressed',String(paused));
      const text=paused?'Animer le décor':'Mettre le décor en pause';
      if(label)label.textContent=text;
      else button.textContent=text;
      if(icon){icon.textContent=paused?'▶':'Ⅱ';icon.setAttribute('aria-hidden','true');}
      document.dispatchEvent(new Event('benka:motionchange'));
    }
    button.addEventListener('click',()=>{
      paused=!paused;
      lsSet(key,paused);
      updateControl();
    });
    reduced.addEventListener('change',updateControl);
    updateControl();

    const scenes=[...root.querySelectorAll('[data-bf-scene],.marquee')];
    const visible=new Map(scenes.map(scene=>[scene,false]));
    const updateScene=scene=>{
      scene.dataset.bfVisible=String(!document.hidden&&visible.get(scene)===true);
    };
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          visible.set(entry.target,entry.isIntersecting);
          updateScene(entry.target);
        });
      });
      scenes.forEach(scene=>{updateScene(scene);observer.observe(scene);});
    }else{
      scenes.forEach(scene=>{visible.set(scene,true);updateScene(scene);});
    }
    document.addEventListener('visibilitychange',()=>scenes.forEach(updateScene));
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initBlackFridayMotion,{once:true});
  }else initBlackFridayMotion();
})();
