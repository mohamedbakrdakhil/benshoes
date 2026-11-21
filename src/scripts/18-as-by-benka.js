// Le lien direct doit rester sur AS après le chargement des polices et du showroom.
addEventListener('pageshow',async()=>{
  if(location.hash!=='#as-by-benka')return;
  if(document.fonts)await document.fonts.ready;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(location.hash==='#as-by-benka'&&!S.panel)
      document.getElementById('as-by-benka')?.scrollIntoView({behavior:'instant',block:'start'});
  }));
});

// La sélection prépare un e-mail ; aucune commande ni aucun stock n'est engagé.
document.getElementById('as-selection')?.addEventListener('submit',e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  const color=form.elements.namedItem('color').value;
  const size=form.elements.namedItem('size').value;
  const subject='AS by BENKA — '+color+' — pointure '+size;
  const body='Bonjour,\n\nJe souhaite des renseignements sur le modèle AS by BENKA :\nColoris : '+color+'\nPointure EU : '+size+'\n\nPouvez-vous me confirmer le prix et la disponibilité ?\n\nMerci.';
  location.href='mailto:'+SHOP.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
});
