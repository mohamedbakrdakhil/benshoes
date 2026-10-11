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

