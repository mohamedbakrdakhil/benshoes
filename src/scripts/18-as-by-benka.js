// Le lien direct doit rester sur AS après le chargement des polices et du showroom.
addEventListener('pageshow',async()=>{
  if(location.hash!=='#as-by-benka')return;
  if(document.fonts)await document.fonts.ready;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(location.hash==='#as-by-benka'&&!S.panel)
      document.getElementById('as-by-benka')?.scrollIntoView({behavior:'instant',block:'start'});
  }));
});
