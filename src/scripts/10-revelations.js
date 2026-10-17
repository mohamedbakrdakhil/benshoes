/* ======================= mouvement ======================= */
const MOTION=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function initMotion(){
  if(!MOTION)return;
  // lueur bordeaux qui suit le curseur dans le héros
  const hero=document.querySelector('.hero'),glow=$('#heroglow');
  if(hero&&glow)hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect();
    glow.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
    glow.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
  },{passive:true});
  // parallaxe des courbes topographiques, servie par la boucle unique
  const topo=$('#herotopo');
  if(topo){let yPrec=-1;
    avancer((dt,sy)=>{const y=Math.min(sy,900);
      if(Math.abs(y-yPrec)>.5){yPrec=y;
        topo.style.transform=`translate3d(0,${(y*.22).toFixed(1)}px,0) scale(${(1+y*.00022).toFixed(4)})`;}
      return sy<1400;});}
  // boutons magnétiques
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    const b=e.target.closest('.btn-pri,.btn-hero,.cartbtn');
    if(!b){document.querySelectorAll('[data-mag]').forEach(x=>{x.style.transform='';x.removeAttribute('data-mag')});return;}
    const r=b.getBoundingClientRect();
    b.setAttribute('data-mag','1');
    b.style.transform=`translate(${((e.clientX-r.left-r.width/2)*.14).toFixed(1)}px,${((e.clientY-r.top-r.height/2)*.22).toFixed(1)}px)`;
  },{passive:true});
  document.addEventListener('pointerleave',()=>document.querySelectorAll('[data-mag]').forEach(x=>{x.style.transform='';x.removeAttribute('data-mag')}),true);

}
function initNav(){
  const nav=$('#nav'),ink=$('#navink'); if(!nav||!ink)return;
  const links=[...nav.querySelectorAll('a')];
  const place=a=>{if(!a){ink.classList.remove('on');return;}
    ink.style.width=a.offsetWidth+'px';ink.style.transform=`translateX(${a.offsetLeft}px)`;ink.classList.add('on');};
  const secs=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if('IntersectionObserver' in window){
    const vus=new Map();
    const io=new IntersectionObserver(es=>{
      es.forEach(e=>vus.set(e.target.id,e.intersectionRatio));
      let best=null,r=0; vus.forEach((v,k)=>{if(v>r){r=v;best=k;}});
      links.forEach(a=>a.removeAttribute('aria-current'));
      if(best&&r>0.04){const a=links.find(x=>x.getAttribute('href')==='#'+best);
        if(a){a.setAttribute('aria-current','true');place(a);}}
      else place(null);
    },{threshold:[0,.05,.25,.5,.75,1],rootMargin:'-80px 0px -45% 0px'});
    secs.forEach(s=>io.observe(s));
  }
  addEventListener('resize',()=>place(links.find(x=>x.hasAttribute('aria-current'))),{passive:true});
}
function initCounters(){
  const els=[...document.querySelectorAll('[data-count]')]; if(!els.length)return;
  const run=el=>{const to=+el.dataset.count,suf=el.dataset.suffix||'';
    if(!MOTION){el.textContent=to+suf;return;}
    const t0=performance.now(),d=1100;
    const tick=t=>{const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);
      el.textContent=Math.round(to*e)+suf; if(p<1)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);};
  if(!('IntersectionObserver' in window)){els.forEach(run);return;}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){run(e.target);io.unobserve(e.target);}}),{threshold:.4});
  els.forEach(el=>io.observe(el));
}
function initProgress(){
  const bar=$('#prog'); if(!bar)return;
  if(CSS.supports&&CSS.supports('animation-timeline','scroll()'))return;
  let raf=0;
  const up=()=>{raf=0;const max=document.documentElement.scrollHeight-innerHeight;
    bar.style.transform='scaleX('+(max>0?Math.min(1,scrollY/max):0).toFixed(4)+')';};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(up);},{passive:true});up();
}
// Révélations : confiées au moteur, pas à un observateur. La position de
// chaque élément est mesurée une fois ; dès que le défilement la dépasse,
// l'élément s'anime. Rien ne peut rester masqué, et sans JavaScript tout
// est visible d'emblée.
let RV=[];
function revelations(){
  if(!MOTION)return;
  document.querySelectorAll('.rv,.anat-item,.pledge,.grid .card').forEach(el=>{
    if(el.dataset.rv)return;
    el.dataset.rv='1'; el.style.transform='translateY(22px)'; RV.push(el);
  });
  mesurerRV(); reveiller();
}
function mesurerRV(){
  const sy=scrollY;
  for(const el of RV) el._y=el.getBoundingClientRect().top+sy;
}
function tacheRevelations(dt,sy){
  if(!RV.length)return false;
  const limite=sy+GEO.vh*0.92;
  for(let i=RV.length-1;i>=0;i--){
    const el=RV[i];
    if(el._y<limite){
      // la révélation ne joue que sur la position, jamais sur l'opacité :
      // même si l'animation ne tourne pas, le contenu reste lisible.
      el.style.transform='';
      el.style.animation='riseUp .65s cubic-bezier(.16,1,.3,1)';
      el.addEventListener('animationend',()=>{el.style.animation='';},{once:true});
      RV.splice(i,1);
    }
  }
  return RV.length>0;
}
function bumpCart(){const b=$('#cartbtn');if(!b||!MOTION)return;b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump');}


/* ===================== vidéos de fond =====================
   Une vidéo de fond est la chose la plus lourde qu'on puisse poser sur une
   page. Ce site transfère 55 Ko ; une boucle de dix secondes en pèse deux à
   quatre mille. Au Maroc, où la plupart des clientes arrivent en 4G avec un
   forfait compté, l'envoyer sans condition reviendrait à faire payer le décor
   à celles qui viennent acheter.

   D'où les garde-fous. Rien ne se télécharge si :
     — l'écran est étroit (téléphone) ;
     — le navigateur annonce une connexion lente ou le mode économie de données ;
     — le système demande à réduire les animations ;
     — la section n'est pas encore approchée à l'écran.

   L'affiche, elle, est une image ordinaire : elle s'affiche tout de suite et
   c'est elle que Google mesure. La vidéo se fond par-dessus quand elle peut
   jouer — jamais avant, pour ne pas décaler la mise en page. */
function fondVideo(){
  if(typeof VIDEOS!=='object'||!VIDEOS) return;
  const noms=Object.keys(VIDEOS); if(!noms.length) return;

  const co=navigator.connection||{};
  const lente=co.saveData===true||/^(slow-)?2g$/.test(co.effectiveType||'')||co.effectiveType==='3g';
  const etroit=matchMedia('(max-width:900px)').matches;

  noms.forEach(id=>{
    const sec=document.getElementById(id), base=VIDEOS[id];
    if(!sec||!base) return;

    // L'affiche d'abord, toujours : c'est le décor visible, vidéo ou pas.
    // Sur une colonne étroite, une affiche large est agrandie et rognée des
    // trois quarts — il n'en reste qu'un gros plan flou. On sert alors
    // l'affiche verticale si elle existe, en retombant sur la large sinon :
    // l'image sonde est la même URL que le fond, donc aucun second appel.
    const large=`${base}-affiche.jpg`, etroite=etroit?`${base}-affiche-etroite.jpg`:'';
    const couche=document.createElement('div');
    couche.className='fond-video';
    couche.style.backgroundImage=`url("${etroite||large}")`;
    if(etroite){
      const sonde=new Image();
      sonde.onerror=()=>{couche.style.backgroundImage=`url("${large}")`;};
      sonde.src=etroite;
    }
    sec.prepend(couche);
    // La section le sait : ses propres décors doivent s'effacer devant.
    sec.classList.add('a-fond');
    if(getComputedStyle(sec).position==='static') sec.style.position='relative';

    if(etroit||lente||!MOTION) return;   // l'affiche suffira

    // La vidéo n'est demandée qu'à l'approche de la section.
    const io=new IntersectionObserver(e=>{
      if(!e[0].isIntersecting) return;
      io.disconnect();
      const v=document.createElement('video');
      v.muted=true; v.loop=true; v.playsInline=true; v.preload='none';
      v.setAttribute('aria-hidden','true'); v.tabIndex=-1;
      v.src=base+'.mp4';
      // oncanplay et non onloadstart : on ne révèle que ce qui peut tourner.
      v.addEventListener('canplay',()=>{couche.appendChild(v);requestAnimationFrame(()=>v.classList.add('vu'));},{once:true});
      v.addEventListener('error',()=>v.remove(),{once:true});
      v.load(); v.play().catch(()=>{});   // un refus d'autoplay laisse l'affiche
    },{rootMargin:'300px'});
    io.observe(sec);
  });
}
