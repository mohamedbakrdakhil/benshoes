/* ======================= l'atelier : panoramique horizontal ======================= */
function initAtelier(){
  const sec=$('#atelier'), track=$('#attrack'), bar=$('#atbar');
  if(!sec||!track||!MOTION||sec.classList.contains('editorial-atelier'))return;
  let x=0;
  avancer((dt,sy)=>{
    const p=borne((sy-GEO.aTop)/GEO.aSpan,0,1);
    const proche=sy>GEO.aTop-GEO.vh*1.3 && sy<GEO.aTop+GEO.aSpan+GEO.vh*0.5;
    const course=Math.max(0,GEO.tW-GEO.vw+GEO.vw*0.12);
    const cible=-course*p;
    x+=(cible-x)*(1-Math.pow(.0015,dt));
    track.style.transform=`translate3d(${x.toFixed(1)}px,0,0)`;
    // parallaxe calculée depuis le décalage mis en cache : aucune lecture du rendu
    const f=GEO.figs||[];
    for(let i=0;i<f.length;i++){
      const centre=f[i].x+f[i].w/2+x;
      f[i].im.style.setProperty('--px',(-9-(centre/GEO.vw-.5)*7).toFixed(2)+'%');
    }
    if(bar)bar.style.width=(p*100).toFixed(1)+'%';
    return proche || Math.abs(cible-x)>.5;
  });
}

