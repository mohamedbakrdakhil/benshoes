/* Dessins d'architecture du riad. Chaque décor reste un seul plan 3D.
   Les identifiants SVG sont uniques : plusieurs niches peuvent partager
   le même dessin sans emprunter le dégradé ou le masque d'une autre. */
let riadDrawingId=0;
function riadId(nom){return 'riad-'+nom+'-'+(++riadDrawingId);}
function riadSVG(w,h,body){
  return `<svg class="riad-svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}
function riadStar(cx,cy,r,ri,n){
  let path='';
  for(let i=0;i<(n||8)*2;i++){
    const a=-Math.PI/2+i*Math.PI/(n||8),d=i%2?ri:r;
    path+=(i?'L':'M')+(cx+Math.cos(a)*d).toFixed(2)+' '+(cy+Math.sin(a)*d).toFixed(2);
  }
  return path+'Z';
}
function riadTilePattern(id,size){
  const s=size||80,c=s/2;
  return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="#173f38"/><path d="M0 ${c}L${c} 0L${s} ${c}L${c} ${s}Z" fill="#2c6556" stroke="#d4c4a0" stroke-width="1.5"/><path d="${riadStar(c,c,s*.39,s*.22)}" fill="#b18b4f" stroke="#f1ddad" stroke-width="1.1"/><path d="${riadStar(c,c,s*.24,s*.14)}" fill="#143c37"/><path d="M0 0L${s} ${s}M${s} 0L0 ${s}" fill="none" stroke="#d8cbae" stroke-width="1"/><path d="M${c} 0V${s}M0 ${c}H${s}" stroke="#d8cbae" stroke-width=".7" opacity=".48"/></pattern>`;
}
function riadPortalSVG(){
  const id=riadId('portail'),opening='M265 1200V690C185 585 190 468 240 372C290 275 392 218 500 148C608 218 710 275 760 372C810 468 815 585 735 690V1200Z';
  let s=`<defs><linearGradient id="${id}-p" x1="0" x2="1"><stop stop-color="#ad9470"/><stop offset=".25" stop-color="#eadbc0"/><stop offset=".52" stop-color="#f4e8d0"/><stop offset=".8" stop-color="#d3bc96"/><stop offset="1" stop-color="#9f815d"/></linearGradient>${riadTilePattern(id+'-z',64)}</defs>`;
  s+=`<path d="M12 1200V20H988V1200Z${opening}" fill="url(#${id}-p)" fill-rule="evenodd"/>`;
  s+='<path d="M32 1200V40H968V1200M48 1200V57H952V1200" fill="none" stroke="#88683f" stroke-width="5"/>';
  s+=`<path d="M95 1200V116H905V1200" fill="none" stroke="url(#${id}-z)" stroke-width="47"/><path d="M66 1200V88H934V1200M123 1200V145H877V1200" fill="none" stroke="#816038" stroke-width="5"/>`;
  s+='<path d="M239 1200V701C153 580 160 454 214 348C268 243 381 182 500 111C619 182 732 243 786 348C840 454 847 580 761 701V1200" fill="none" stroke="#765334" stroke-width="31"/>';
  s+='<path d="M239 1200V701C153 580 160 454 214 348C268 243 381 182 500 111C619 182 732 243 786 348C840 454 847 580 761 701V1200" fill="none" stroke="#d2af71" stroke-width="18"/>';
  s+='<path d="M239 1200V701C153 580 160 454 214 348C268 243 381 182 500 111C619 182 732 243 786 348C840 454 847 580 761 701V1200" fill="none" stroke="#795839" stroke-width="3" stroke-dasharray="2 15"/>';
  s+=`<path d="${opening}" fill="none" stroke="#efdfbf" stroke-width="12"/><path d="M275 1200V690M725 1200V690" stroke="#89683e" stroke-width="5"/>`;
  [170,830].forEach(x=>{
    s+=`<circle cx="${x}" cy="206" r="45" fill="#bfa67c" stroke="#8d6c40" stroke-width="3"/><path d="${riadStar(x,206,36,23)}" fill="#eee1c3" stroke="#9d7a48" stroke-width="2"/><circle cx="${x}" cy="206" r="13" fill="#205247" stroke="#c4a064" stroke-width="3"/>`;
    for(let y=370;y<1160;y+=92)s+=`<path d="M${x} ${y-29}q-21 17-24 29q3 20 24 32q21-12 24-32q-3-12-24-29Z" fill="none" stroke="#a88b60" stroke-width="3"/><path d="M${x} ${y-18}v37M${x-13} ${y}h26" stroke="#c6ad83" stroke-width="2"/>`;
  });
  for(let x=150;x<875;x+=35)s+=`<path d="M${x} 72l17-13l17 13l-17 13Z" fill="#e5d3ad" stroke="#9b7847" stroke-width="1.6"/>`;
  s+='<path d="M180 1190h122v-58H180zM698 1190h122v-58H698z" fill="#bca177" stroke="#805d36" stroke-width="4"/><path d="M178 1132h126M696 1132h126" stroke="#eedeb9" stroke-width="9"/>';
  return riadSVG(1000,1200,s);
}
function riadNicheSVG(){
  const id=riadId('niche');
  let s=`<defs><linearGradient id="${id}" x1="0" x2="1"><stop stop-color="#86623a"/><stop offset=".3" stop-color="#dec393"/><stop offset=".5" stop-color="#fff0c5"/><stop offset=".72" stop-color="#c9a977"/><stop offset="1" stop-color="#74512e"/></linearGradient></defs>`;
  s+='<path d="M5 415V4H225V415" fill="none" stroke="#997340" stroke-width="8"/><path d="M12 412V145C1 89 40 56 115 18C190 56 229 89 218 145V412" fill="none" stroke="#33291d" stroke-width="23"/>';
  s+=`<path d="M15 412V145C4 89 43 57 115 22C187 57 226 89 215 145V412" fill="none" stroke="url(#${id})" stroke-width="12"/>`;
  s+='<path d="M15 412V145C4 89 43 57 115 22C187 57 226 89 215 145V412" fill="none" stroke="#785a33" stroke-width="1.7" stroke-dasharray="1 6"/>';
  s+='<path d="M24 411V145C12 93 49 65 115 31C181 65 218 93 206 145V411" fill="none" stroke="#e9c984" stroke-width="2"/>';
  [35,195].forEach(x=>{s+=`<path d="${riadStar(x,39,13,7)}" fill="#bf9a59" stroke="#efdbad" stroke-width="1"/><circle cx="${x}" cy="39" r="3" fill="#284e40"/>`;});
  s+='<path d="M2 402H228V419H2Z" fill="#63472d"/><path d="M2 402H228M6 411H224" stroke="#e8cb94" stroke-width="2"/>';
  return riadSVG(230,420,s);
}
function riadFriezeSVG(){
  const id=riadId('frise');
  let s=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#70482b"/><stop offset=".45" stop-color="#b7864b"/><stop offset="1" stop-color="#342316"/></linearGradient></defs><rect width="1000" height="160" fill="url(#${id})"/><path d="M0 6H1000M0 153H1000" stroke="#e4c18a" stroke-width="5"/><path d="M0 22H1000M0 135H1000" stroke="#39271a" stroke-width="8"/>`;
  for(let i=0;i<20;i++){
    const x=i*50;
    s+=`<path d="M${x} 24h50v30l-25 22l-25-22Z" fill="${i%2?'#d2b88c':'#ead9b7'}" stroke="#8d6b40" stroke-width="2"/><path d="M${x+25} 24v52M${x} 54h50" stroke="#9b7950" stroke-width="1.5"/><path d="M${x+3} 85l22-17l22 17v23l-22 23l-22-23Z" fill="${i%2?'#8c633d':'#af8551'}" stroke="#d0ad75" stroke-width="2"/><path d="M${x+25} 68v63M${x+3} 85l22 23l22-23" fill="none" stroke="#593c26" stroke-width="2"/>`;
  }
  for(let x=20;x<1000;x+=40)s+=`<path d="${riadStar(x,145,6,3.7)}" fill="#ebd4a0"/>`;
  return riadSVG(1000,160,s);
}
function riadLanternSVG(){
  const id=riadId('lanterne');
  let s=`<defs><linearGradient id="${id}-metal" x1="0" x2="1"><stop stop-color="#594124"/><stop offset=".32" stop-color="#b99351"/><stop offset=".5" stop-color="#f4d897"/><stop offset=".68" stop-color="#bd9656"/><stop offset="1" stop-color="#634727"/></linearGradient><radialGradient id="${id}-light"><stop stop-color="#fff4c5"/><stop offset=".48" stop-color="#e9ba66"/><stop offset="1" stop-color="#80522b"/></radialGradient><pattern id="${id}-pierce" width="24" height="30" patternUnits="userSpaceOnUse"><path d="M12 2L21 15L12 28L3 15Z" fill="none" stroke="#694b2a" stroke-width="3"/><circle cx="12" cy="15" r="3" fill="#fff3c8"/></pattern><clipPath id="${id}-body"><path d="M31 149L61 126H119L149 149L136 298L112 323H68L44 298Z"/></clipPath></defs>`;
  s+='<path d="M90 0v46" stroke="#b18a4d" stroke-width="4"/><ellipse cx="90" cy="58" rx="10" ry="14" fill="none" stroke="#d7b773" stroke-width="4"/>';
  s+=`<path d="M90 72L115 104L138 114L145 131H35L42 114L65 104Z" fill="url(#${id}-metal)" stroke="#523b24" stroke-width="3"/><path d="M50 112H130M41 125H139" stroke="#f0d297" stroke-width="3"/><path d="M31 149L61 126H119L149 149L136 298L112 323H68L44 298Z" fill="url(#${id}-light)" stroke="#e9c884" stroke-width="4"/>`;
  s+=`<g clip-path="url(#${id}-body)"><rect x="24" y="130" width="135" height="198" fill="url(#${id}-pierce)"/><path d="M60 126L65 321M120 126L115 321" stroke="#6f4d28" stroke-width="7"/><path d="M62 126L67 321M118 126L113 321" stroke="#edce8c" stroke-width="2"/><path d="M90 145V300" stroke="#ffe9ad" stroke-width="2" opacity=".6"/><path d="M31 170H149M38 282H142" stroke="#8c6635" stroke-width="9"/><path d="M31 167H149M38 279H142" stroke="#e6c485" stroke-width="2"/></g>`;
  s+=`<path d="M43 298H137L121 325L106 338H74L59 325Z" fill="url(#${id}-metal)" stroke="#6f4b29" stroke-width="3"/><path d="M60 326H120" stroke="#e8cc8d" stroke-width="3"/><path d="M82 338h16l-8 25Z" fill="#c7a264"/><circle cx="90" cy="370" r="7" fill="#e4c686"/><path d="M90 377v25" stroke="#c29e5c" stroke-width="3"/><path d="M84 392l6 18l6-18" fill="#aa8047"/>`;
  return riadSVG(180,420,s);
}
function riadFountainSVG(){
  const id=riadId('fontaine');
  const arch='M70 379V180C70 96 151 55 250 15C349 55 430 96 430 180V379Z';
  let s=`<defs>${riadTilePattern(id+'-tile',46)}<linearGradient id="${id}-stone" x1="0" x2="1"><stop stop-color="#a68d66"/><stop offset=".38" stop-color="#f2e4c4"/><stop offset=".65" stop-color="#d9c29a"/><stop offset="1" stop-color="#98794f"/></linearGradient><radialGradient id="${id}-water"><stop stop-color="#5d9f8f"/><stop offset=".65" stop-color="#255c53"/><stop offset="1" stop-color="#112e2c"/></radialGradient></defs>`;
  s+=`<path d="${arch}" fill="url(#${id}-tile)" stroke="url(#${id}-stone)" stroke-width="30"/><path d="M91 378V184C91 111 160 77 250 37C340 77 409 111 409 184V378" fill="none" stroke="#e5c58a" stroke-width="5"/><path d="M57 390V180C57 90 140 40 250 0C360 40 443 90 443 180V390" fill="none" stroke="#795835" stroke-width="5"/>`;
  s+=`<circle cx="250" cy="227" r="51" fill="#b59154" stroke="#ead29b" stroke-width="4"/><path d="${riadStar(250,227,42,28)}" fill="#dfc68e" stroke="#76532f" stroke-width="3"/><circle cx="250" cy="227" r="14" fill="#73502d" stroke="#f0d49a" stroke-width="4"/><path d="M250 227v24h20" fill="none" stroke="#d4ad65" stroke-width="14" stroke-linecap="round"/><path d="M267 252q3 41 0 100" fill="none" stroke="#d7f1df" stroke-width="4" opacity=".75"/>`;
  s+='<ellipse cx="250" cy="470" rx="209" ry="20" fill="#080e0b" opacity=".3"/>';
  s+=`<path d="M34 380Q250 435 466 380L426 463Q250 499 74 463Z" fill="url(#${id}-stone)" stroke="#856741" stroke-width="4"/><ellipse cx="250" cy="381" rx="217" ry="54" fill="#c9b58d" stroke="#f2dfb5" stroke-width="9"/><ellipse cx="250" cy="377" rx="184" ry="36" fill="url(#${id}-water)" stroke="#705839" stroke-width="4"/><ellipse cx="267" cy="368" rx="37" ry="8" fill="none" stroke="#b8dbc2" stroke-width="2" opacity=".8"/><ellipse cx="267" cy="368" rx="68" ry="15" fill="none" stroke="#99c5b2" stroke-width="1.5" opacity=".45"/><path d="M66 424Q250 472 434 424M77 449Q250 486 423 449" fill="none" stroke="#a1865c" stroke-width="4"/>`;
  return riadSVG(500,500,s);
}
function riadScreenSVG(){
  const id=riadId('claustra');
  let s=`<defs><linearGradient id="${id}-cedar" x1="0" x2="1"><stop stop-color="#362519"/><stop offset=".3" stop-color="#8c5d32"/><stop offset=".5" stop-color="#ba8650"/><stop offset=".75" stop-color="#79522f"/><stop offset="1" stop-color="#35251a"/></linearGradient><pattern id="${id}-lace" width="80" height="80" patternUnits="userSpaceOnUse"><path d="${riadStar(40,40,37,24)}" fill="none" stroke="#805630" stroke-width="9"/><path d="${riadStar(40,40,37,24)}" fill="none" stroke="#c29358" stroke-width="2"/><path d="M0 0L16 16M80 0L64 16M0 80L16 64M80 80L64 64" stroke="#9b6b3b" stroke-width="8"/><path d="M0 0L16 16M80 0L64 16M0 80L16 64M80 80L64 64" stroke="#d0a264" stroke-width="1.5"/></pattern></defs>`;
  s+=`<rect x="13" y="13" width="374" height="574" rx="3" fill="#17251b" fill-opacity=".36" stroke="url(#${id}-cedar)" stroke-width="26"/><rect x="32" y="32" width="336" height="536" fill="url(#${id}-lace)" stroke="#d0a263" stroke-width="3"/><rect x="43" y="43" width="314" height="514" fill="none" stroke="#412c1b" stroke-width="3"/><path d="M15 300H385" stroke="url(#${id}-cedar)" stroke-width="20"/><path d="M23 294H377M23 306H377" stroke="#d3a969" stroke-width="2"/>`;
  [[24,24],[376,24],[24,576],[376,576]].forEach(([x,y])=>{s+=`<circle cx="${x}" cy="${y}" r="7" fill="#e1be7a" stroke="#614125" stroke-width="2"/>`;});
  return riadSVG(400,600,s);
}
function riadMedallionSVG(){
  const id=riadId('rosace');
  let s=`<defs><radialGradient id="${id}"><stop stop-color="#b99759"/><stop offset=".5" stop-color="#e8d1a0"/><stop offset="1" stop-color="#8f6c3d"/></radialGradient></defs><circle cx="200" cy="200" r="191" fill="#173f38" stroke="#ad8950" stroke-width="8"/><circle cx="200" cy="200" r="176" fill="none" stroke="#ead7ab" stroke-width="3"/>`;
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,x=200+Math.sin(a)*156,y=200-Math.cos(a)*156;
    s+=`<path d="${riadStar(x,y,19,10,4)}" fill="#d1b778" stroke="#f0dbad" stroke-width="1"/>`;
  }
  s+=`<path d="${riadStar(200,200,148,94)}" fill="url(#${id})" stroke="#fae6b8" stroke-width="4"/><path d="${riadStar(200,200,126,80)}" fill="#2f6857" stroke="#755634" stroke-width="4"/><path d="${riadStar(200,200,99,63)}" fill="#d8bf86" stroke="#e9d4a5" stroke-width="3"/><path d="${riadStar(200,200,76,49)}" fill="#173f38" stroke="#8e6c3d" stroke-width="3"/>`;
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=200+Math.sin(a)*103,y=200-Math.cos(a)*103;
    s+=`<circle cx="${x}" cy="${y}" r="5" fill="#f2dfb4"/>`;
  }
  s+='<circle cx="200" cy="200" r="37" fill="#bb9658" stroke="#f0dab0" stroke-width="4"/><circle cx="200" cy="200" r="22" fill="#e4cc94" stroke="#7c5b35" stroke-width="3"/>';
  return riadSVG(400,400,s);
}
