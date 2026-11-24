/* Les étapes restent accessibles sans traverser toute la visite au défilement. */
(function(){
  const section=document.getElementById('visite');
  const stage=section?.querySelector('.visite-stage');
  const select=document.getElementById('fete-chapter');
  const nav=section?.querySelector('.fete-tour-nav');
  if(!section||!stage||!select||!nav)return;
  nav.hidden=false;
  const caps=[...section.querySelectorAll('.vcap')];
  const prev=document.getElementById('tour-prev'),next=document.getElementById('tour-next'),position=document.getElementById('tour-position');
  const picker=section.querySelector('#riad-picker'),variant=section.querySelector('#riad-variant'),openPiece=section.querySelector('#riad-open-piece');
  function selectPiece(){
    const option=variant.selectedOptions[0];
    if(!option)return;
    const id=option.dataset.id,c=option.value;
    openPiece.dataset.id=id;openPiece.dataset.c=c;
    openPiece.href='/collection/#'+id+'-'+c;
    openPiece.setAttribute('aria-label','Voir la fiche de '+option.textContent);
  }
  function populatePieces(){
    for(const product of CATALOG){
      const group=document.createElement('optgroup');group.label=product.name;
      for(const color of product.colors){
        const option=document.createElement('option');
        option.value=color;option.dataset.id=product.id;
        option.textContent=product.name+' · '+COLORS[color].n;
        option.selected=product.id==='opus'&&color==='tabac';
        group.append(option);
      }
      variant.append(group);
    }
    selectPiece();
  }
  variant.addEventListener('change',selectPiece);
  stage.addEventListener('click',event=>{
    const piece=event.target.closest('.riad-wall-piece');
    if(!piece||picker.hidden)return;
    const option=Array.from(variant.options).find(item=>item.dataset.id===piece.dataset.id&&item.value===piece.dataset.c);
    if(option){
      option.selected=true;selectPiece();
      openPiece.focus({preventScroll:true});
    }
  });
  const sync=()=>{
    const index=select.selectedIndex;
    if(prev)prev.disabled=index===0;
    if(next)next.disabled=index===select.options.length-1;
    if(position)position.textContent=String(index+1).padStart(2,'0')+' / '+String(select.options.length).padStart(2,'0');
    const inGallery=index>=7;
    stage.classList.toggle('riad-gallery-active',inGallery);
    if(inGallery){
      if(!variant.options.length)populatePieces();
      if(picker.parentElement!==caps[index])caps[index].append(picker);
    }
    picker.hidden=!inGallery;
  };
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
