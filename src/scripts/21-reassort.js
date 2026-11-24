/* Préremplir uniquement la variante en rupture. L’adresse est saisie par le client
   chez Google ou dans son application de messagerie. */
function restockLink(product, color){
  const sizes=SIZES.filter((size,index)=>stockCol(product,color,index)===0);
  if(!sizes.length)return '';
  const form=SHOP.reassortForm;
  const links=sizes.map(size=>{
    const variant=product.name+' · '+COLORS[color].n+' · '+size;
    let url;
    if(form){
      url=new URL(form.url);
      url.searchParams.set(form.field,variant);
    }else{
      const subject='Réassort Benka · '+variant;
      url='mailto:'+SHOP.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent('Bonjour, je souhaite être prévenu(e) par e-mail du retour de '+variant+'. Merci.');
    }
    return '<a href="'+att(String(url))+'"'+(form?' target="_blank" rel="noopener noreferrer"':'')+' aria-label="'+att('Demander une alerte pour '+variant)+'">'+size+' <span aria-hidden="true">↗</span></a>';
  }).join('');
  return '<details class="reassort-details"><summary>Ma pointure est épuisée</summary><p>'+ (form?'Choisissez votre pointure pour recevoir un e-mail à son retour. Le formulaire s’ouvre dans un nouvel onglet.':'Choisissez votre pointure puis envoyez la demande de réassort à l’atelier depuis votre messagerie.')+'</p><div class="reassort-sizes">'+links+'</div></details>';
}
