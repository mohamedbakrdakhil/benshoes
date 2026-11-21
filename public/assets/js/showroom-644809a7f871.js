const VIS={HW:520,FY:320,CY:-520,FZ:-1100,Z1:-4700,
           SX:2600,SZ0:-2900,SZ1:-5700,SCY:-820,SX0:520,
           SCY2:-1900};
const FES={HW:430,SOL:320,HAUT:-820,ZP:2450,ZR0:2430,ZR1:-1060,ZT:1500};
const CAM=[
  [0,     0, 4500,  0,  0],   // devant la porte, la ville dort encore
  [.07,   0, 3900,  0,  0],
  [.14,   0, 3150,  0, -3],   // on lève un peu les yeux vers l'arche
  [.21,   0, 2420,  0,  0],   // on passe dessous
  [.28,   0, 1950,  9,  0],   // la derb
  [.34,   0, 1480, 17,  0],   // le regard glisse vers les cuves
  [.40,   0, 1000,  6,  0],
  [.46,   0,  420,  0,  0],   // la façade benka, bout de rue
  [.53,   0, -820,  0,  0],
  [.61,   0,-1750,  0,  0],
  [.70,   0,-2550,  0,  0],
  [.76, 260,-2950, 62,  0],
  [.83,1150,-3550, 88,  0],
  [.90,1120,-3900, 90,  2],
  [.94, 960,-4300, 90,  7],
  // (`innerWidth` plutôt que PETIT : cette constante est déclarée plus bas.)
  ...(innerWidth<700
      ? [[.96,1500,-4265, 90,  6],
         [1,  1850,-4280, 90,  4]]
      : [[.97,1380,-4240, 90,  4],
         [1,  1700,-4300, 90,  2]])];
const ZONES=[['fes',0,.58],['seuil',.18,.70],['allee',.42,.94],['salle',.64,1.01]];
const PETIT=innerWidth<700, RICHE=!PETIT;
const K=PETIT?0.5:1;
let MODE2D=false;
try{
  const b=+(sessionStorage.getItem('benka.boot')||0)+1;
  sessionStorage.setItem('benka.boot',String(b));
  if(b>=3){MODE2D=true;console.warn('[benka] 3D desactivee apres plusieurs rechargements');}
  setTimeout(()=>{try{sessionStorage.setItem('benka.boot','0');}catch(e){}},9000);
}catch(e){}
const VITRINES=CATALOG.flatMap(p=>p.colors.map(c=>[p,c]));
const facteur=a=>a>8e6?5:a>4e6?4:a>2e6?3:a>8e5?2:1;
function pane(cls,w,ht,tf,inner){
  const f=inner?1:facteur(w*ht);
  if(f!==1){w/=f;ht/=f;tf+=` scale(${f})`;}
  if(K!==1){w*=K;ht*=K;tf=tf.replace(/(-?[\d.]+)px/g,(m,v)=>(v*K).toFixed(1)+'px');}
  return `<div class="pane ${cls}"${f!==1?` style="--f:${f};`:' style="'}width:${w}px;height:${ht}px;margin-left:${-w/2}px;margin-top:${-ht/2}px;transform:${tf}">${inner||''}</div>`;}
function feteSVG(w,h,body){
  return `<svg class="fete-svg" data-bf-motion viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="display:block" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}
function feteGuirlande(feuillage){
  const courbe=x=>28+56*Math.abs(Math.sin(x/1000*Math.PI*3));
  let s='<path d="M0 28Q167 140 333 28Q500 140 667 28Q834 140 1000 28" fill="none" stroke="'+(feuillage?'#123e32':'#92704a')+'" stroke-width="'+(feuillage?24:3)+'"/>';
  if(feuillage){
    for(let i=0;i<42;i++){
      const x=12+i*23.3,y=courbe(x),a=i%2?22:-22;
      s+=`<path d="M${x-20} ${y-17}q25 2 36 30q-26-2-36-30M${x+20} ${y-14}q-25 2-36 30q26-2 36-30" fill="${i%3?'#20523c':'#316348'}" transform="rotate(${a} ${x} ${y})"/>`;
    }
    s+='<path d="M0 26Q167 126 333 26Q500 126 667 26Q834 126 1000 26" fill="none" stroke="#cda96c" stroke-width="3"/>';
  }
  for(let i=0;i<20;i++){
    const x=24+i*50,y=courbe(x)+8;
    s+=`<path d="M${x} ${y-10}v16" stroke="#b89a65" stroke-width="2"/><g class="fete-bulb"><circle cx="${x}" cy="${y+12}" r="14" fill="#f4ce8c" opacity=".13"/><circle cx="${x}" cy="${y+12}" r="6" fill="#ffedbc"/></g>`;
  }
  if(feuillage) [167,500,834].forEach(x=>{
    s+=`<path d="M${x} 65q-56-43-48-9q5 24 48 9q56-43 48-9q-5 24-48 9l-17 42l17-9l16 9z" fill="#9e2942" stroke="#c8676e" stroke-width="2"/><circle cx="${x}" cy="65" r="8" fill="#eed0a3"/>`;
  });
  return feteSVG(1000,150,s);
}
function feteCadeau(x,y,w,h,couleur){
  const r=w*.12;
  return `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="${couleur}"/><path d="M0 ${h*.15}H${w}" stroke="#ffffff" stroke-opacity=".12" stroke-width="${h*.3}"/><path d="M${w/2} 0V${h}" stroke="#eed0a3" stroke-width="${r}"/><path d="M0 ${h*.48}H${w}" stroke="#d4ae72" stroke-width="${r*.65}"/><rect x="-4" y="-5" width="${w+8}" height="${h*.16}" rx="2" fill="${couleur}" stroke="#eed0a3" stroke-opacity=".4"/><path d="M${w/2} 0c-${w*.35}-${w*.35}-${w*.46} 3 0 0c${w*.35}-${w*.35} ${w*.46} 3 0 0" fill="none" stroke="#eed0a3" stroke-width="${r*.38}"/><path d="M${w/2} 0v${h*.11}" stroke="#eed0a3" stroke-width="${r}"/></g>`;
}
function feteSapin(){
  let s='<ellipse cx="220" cy="748" rx="190" ry="20" fill="#080b08" opacity=".4"/><rect x="198" y="600" width="43" height="138" fill="#795134"/><path d="M220 95L113 280h57L78 428h65L30 622h380L297 428h65L270 280h57z" fill="#123e32" stroke="#386c4b" stroke-width="4"/><path d="M220 95v527H30l113-194H78l92-148h-57z" fill="#1b5139"/><path d="M156 254q70 44 132 9M115 402q107 68 204 8M70 559q156 78 297 9" fill="none" stroke="#d0ae71" stroke-width="7"/>';
  [[197,236],[255,285],[174,344],[276,381],[120,440],[229,460],[326,513],[157,543],[257,581]].forEach(([x,y],i)=>{
    s+=`<circle cx="${x}" cy="${y}" r="${i%3?14:18}" fill="${i%2?'#eed0a3':'#aa3049'}"/><circle cx="${x-4}" cy="${y-4}" r="4" fill="#fff2cd" opacity=".65"/>`;
  });
  [[173,257],[269,282],[142,416],[244,441],[301,424],[96,573],[194,600],[326,590]].forEach(([x,y])=>{
    s+=`<g class="fete-bulb"><circle cx="${x}" cy="${y}" r="15" fill="#eed0a3" opacity=".12"/><circle cx="${x}" cy="${y}" r="5" fill="#fff1c6"/></g>`;
  });
  s+='<path d="M220 20l15 43l46 1l-37 27l13 45l-37-27l-38 27l14-45l-37-27l46-1z" fill="#eed0a3" stroke="#fff2d5" stroke-width="3"/>';
  s+=feteCadeau(25,661,139,91,'#8c223b')+feteCadeau(263,640,147,112,'#b58952')+feteCadeau(160,690,104,64,'#235840');
  return feteSVG(440,780,s);
}
function fetePaquets(){
  return feteSVG(500,280,feteCadeau(32,121,174,131,'#8c223b')+feteCadeau(231,78,225,174,'#b58952')+feteCadeau(103,39,143,94,'#235840'));
}
function feteAffiche(){
  return feteSVG(1000,270,'<rect x="5" y="5" width="990" height="260" rx="4" fill="#1b1016" stroke="#eed0a3" stroke-width="5"/><rect x="20" y="20" width="960" height="230" fill="none" stroke="#ad8656" stroke-width="2"/><g text-anchor="middle" font-family="Arial,sans-serif" fill="#eed0a3"><text x="500" y="66" font-size="29" letter-spacing="8">NOËL CHEZ BENKA</text><text x="500" y="147" font-size="70" font-weight="800" letter-spacing="2">BLACK FRIDAY</text><text x="500" y="211" font-size="34" letter-spacing="5">TRIOS · 699 / 749 / 799 DH</text></g><path d="M66 122l8 17l19 5l-19 7l-8 18l-7-18l-19-7l19-5zM934 122l8 17l19 5l-19 7l-8 18l-7-18l-19-7l19-5z" fill="#eed0a3"/>');
}
function feteCouronne(){
  let s='<circle cx="150" cy="150" r="95" fill="none" stroke="#123e32" stroke-width="42"/><circle cx="150" cy="150" r="94" fill="none" stroke="#416d47" stroke-width="20" stroke-dasharray="3 12"/>';
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,x=150+Math.cos(a)*95,y=150+Math.sin(a)*95;
    s+=`<circle cx="${x}" cy="${y}" r="9" fill="${i%2?'#eed0a3':'#a62c43'}"/>`;
  }
  s+='<path d="M150 235q-77-52-70-7q12 31 70 7q77-52 70-7q-12 31-70 7l-23 56l23-13l23 13z" fill="#a62c43" stroke="#d4757d" stroke-width="3"/><circle cx="150" cy="235" r="12" fill="#eed0a3"/>';
  return feteSVG(300,300,s);
}
const SILHOUETTES = {
  robe:'<circle cx="35" cy="18" r="12"/>'
    +'<path class="ch" d="M22 14c0-9 5-13 13-13s13 4 13 13c0 7-2 11-4 13l-2-9c-3 2-11 3-16 0l-2 9c-2-2-2-6-2-13z"/>'
    +'<path d="M35 31c-9 0-15 5-16 13l-3 24 7 2 2-13 1 14h18l1-14 2 13 7-2-3-24c-1-8-7-13-16-13z"/>'
    +'<path d="M24 71h22l6 46H18z"/>'
    +'<g class="br b1"><path d="M19 49l-5 30 6 2 5-29z"/>'
      +'<path d="M11 76h14v13H11z" opacity=".88"/><path d="M14 72h8v5h-8z"/></g>'
    +'<g class="br b2"><path d="M51 49l5 30-6 2-5-29z"/></g>'
    +'<g class="jb j1"><path d="M28 117l-2 32 1 33h7l1-33 1-32z"/></g>'
    +'<g class="jb j2"><path d="M42 117l2 32-1 33h-7l-1-33-1-32z"/></g>',
  manteau:'<circle cx="35" cy="17" r="12"/>'
    +'<path class="ch" d="M23 15c1-9 6-13 12-13s11 4 12 13c0 5-1 8-2 10l-3-10c-4 2-10 2-14 0l-3 10c-1-2-2-5-2-10z"/>'
    +'<path d="M35 30c-10 0-17 6-18 15l-2 22 7 2 2-11v66h22V58l2 11 7-2-2-22c-1-9-8-15-18-15z"/>'
    +'<g class="br b1"><path d="M18 48l-4 32 6 1 4-31z"/>'
      +'<path d="M12 81h15v20H12z" opacity=".9"/><path d="M16 77h7v5h-7z"/></g>'
    +'<g class="br b2"><path d="M52 48l4 32-6 1-4-31z"/></g>'
    +'<g class="jb j1"><path d="M28 124l-2 27 1 33h7l1-33 1-27z"/></g>'
    +'<g class="jb j2"><path d="M42 124l2 27-1 33h-7l-1-33-1-27z"/></g>',
  tailleur:'<circle cx="35" cy="17" r="12"/>'
    +'<path class="ch" d="M24 13c0-8 5-12 11-12s11 4 11 12c0 4-1 7-2 8l-2-8c-4 2-10 2-14 0l-2 8c-1-1-2-4-2-8z"/>'
    +'<path d="M35 30c-11 0-18 6-19 15l-2 23 8 2 2-12v27h22V58l2 12 8-2-2-23c-1-9-8-15-19-15z"/>'
    +'<path d="M26 34l24 40-4 3-24-40z" opacity=".85"/><path d="M44 72h12v15H44z" opacity=".9"/>'
    +'<g class="br b1"><path d="M17 49l-5 31 6 2 5-30z"/></g>'
    +'<g class="br b2"><path d="M53 49l5 31-6 2-5-30z"/></g>'
    +'<g class="jb j1"><path d="M27 85l-2 44 1 36h8l1-36 1-44z"/></g>'
    +'<g class="jb j2"><path d="M43 85l2 44-1 36h-8l-1-36-1-44z"/></g>',
  costume:'<circle cx="35" cy="16" r="12"/>'
    +'<path d="M35 29c-12 0-20 7-21 17l-2 25 9 2 2-15v24h24V58l2 15 9-2-2-25c-1-10-9-17-21-17z"/>'
    +'<g class="br b1"><path d="M15 50l-6 32 7 2 6-31z"/></g>'
    +'<g class="br b2"><path d="M55 50l6 32-7 2-6-31z"/></g>'
    +'<g class="jb j1"><path d="M26 82l-2 46 1 38h9l1-38 2-46z"/></g>'
    +'<g class="jb j2"><path d="M44 82l2 46-1 38h-9l-1-38-2-46z"/></g>'
};
function silhouetteSVG(type){
  return '<svg class="sil" viewBox="0 0 70 184" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'
    +(SILHOUETTES[type]||SILHOUETTES.costume)+'</svg>';
}
function mannequinSVG(id){
  return '<svg class="man" viewBox="0 0 80 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'
    +'<defs><linearGradient id="g'+id+'" x1="0" y1="0" x2="1" y2="0">'
    +'<stop offset="0" stop-color="#6d5a49"/><stop offset=".42" stop-color="#9d8871"/>'
    +'<stop offset="1" stop-color="#53432f"/></linearGradient></defs>'
    +'<path fill="url(#g'+id+')" d="M36 6h8v10c13 3 21 13 22 27 1 13-4 24-7 32'
    +'-2 6-2 10-1 15l2 13H20l2-13c1-5 1-9-1-15-3-8-8-19-7-32 1-14 9-24 22-27z"/>'
    +'<rect class="pied" x="37.5" y="100" width="5" height="74"/>'
    +'<ellipse class="pied" cx="40" cy="179" rx="23" ry="6"/>'
    +'</svg>';
}
function arcade(left,w,ht,top){
  if(K!==1){left*=K;w*=K;ht*=K;top*=K;}
  return `<div class="riad-arcade" style="left:${left}px;top:${top}px;width:${w}px;height:${ht}px">${riadPortalSVG()}</div>`;
}
function passant(cls,w,ht,x,y,z0,z1,vitesse,phase,ry,type){
  const W=w*K, H=ht*K;
  return `<div class="pane pane-gens ${cls} passant" data-x="${x}" data-y="${y}" data-z0="${z0}"`
    +` data-z1="${z1}" data-v="${vitesse}" data-t="${phase}" data-ry="${ry||0}"`
    +` style="width:${W}px;height:${H}px;margin-left:${-W/2}px;margin-top:${-H/2}px;`
    +`transform:translate3d(${(x*K).toFixed(1)}px,${(y*K).toFixed(1)}px,${(z0*K).toFixed(1)}px) rotateY(${ry||0}deg)">`
    +silhouetteSVG(type)+'</div>';
}
function photoNiche(p,col){
  const jeux={opus:{base:'/assets/visite/niche-',largeurs:[190,380]},
              as:{base:'/assets/visite/niche-as-',largeurs:[190,380],ext:'webp'}};
  const jeu=jeux[p.id];
  if(!jeu)return visuel(p,col,true).replace('loading="lazy"','loading="eager"');
  const b=jeu.base+col,largeur=jeu.largeurs[jeu.largeurs.length-1];
  const hauteur=p.id==='opus'?258:253,ext=jeu.ext||'png';
  return `<img class="pv pv-decoupe" src="${b}-${largeur}.${ext}"`
    +` srcset="${jeu.largeurs.map(w=>b+'-'+w+'.'+ext+' '+w+'w').join(', ')}"`
    +` sizes="(max-width:700px) 95px, 230px" width="${largeur}" height="${hauteur}"`
    +` alt="${att(p.name+' — '+((COLORS[col]||{}).n||col))}"`
    +` loading="eager" decoding="async">`;
}
function niche(p,left,w,ht,top,plate,col){
  if(K!==1){left*=K;w*=K;ht*=K;top*=K;}
  const c=col||p.colors[0];
  const corps=`<div class="riad-niche-art" aria-hidden="true">${riadNicheSVG()}</div>${photoNiche(p,c)}<b>${p.name}</b><span>${(COLORS[c]||{}).n||''}</span>`;
  if(!RICHE) return `<div class="niche" style="left:${left}px;top:${top}px;width:${w}px;height:${ht}px">${corps}</div>`;
  return `<div class="n3${plate?' plate':''}" style="left:${left}px;top:${top}px;width:${w}px;height:${ht}px">
      <div class="nb">${corps}</div><div class="ns nl"></div><div class="ns nr"></div>
      <div class="nt"></div><div class="nf"></div></div>`;}
const PLANS=[
  ['/assets/marque/logo-sur-photo-800.jpg','La vitrine benka'],
  ['/assets/atelier/02-800.jpg','Les tiges en daim, avant montage'],
  ['/assets/atelier/03-800.jpg','L\u2019établi et les formes'],
  ['/assets/atelier/04-800.jpg','Le montage sur forme'],
  ['/assets/atelier/rangee-mules-noires-800.jpg','La collection, prête à partir']
];
function construirePlans(){
  const w=$('#world'); if(!w)return;
  w.innerHTML=PLANS.map(([src,alt],i)=>
    `<div class="mv"><img src="${src}" alt="${alt}" ${i?'loading="lazy"':''} decoding="async"></div>`).join('');
}
function buildWorld(){
  const w=$('#world'); if(!w)return;
  if(MODE2D){construirePlans();return;}
  w.style.setProperty('--k',K);
  const V=VIS,F=FES,H=850,CYm=(V.CY+V.FY)/2;
  const fes=[],seuil=[],allee=[],salle=[];
  fes.push(pane('pane-ciel',9000,1500,`translate3d(0px,-1590px,2520px)`));
  fes.push(pane('pane-pave',2600,6200,`translate3d(0px,${F.SOL}px,1800px) rotateX(90deg)`));
  fes.push(pane('pane-zellige',3800,1470,`translate3d(-2300px,-215px,${F.ZP}px)`));
  fes.push(pane('pane-zellige',3800,1470,`translate3d(2300px,-215px,${F.ZP}px)`));
  fes.push(pane('pane-zellige',900,160,`translate3d(0px,-920px,${F.ZP}px)`));
  fes.push(pane('pane-cedre',9000,120,`translate3d(0px,-1010px,${F.ZP+20}px)`));
  fes.push(pane('pane-creneaux',9000,120,`translate3d(0px,-1130px,${F.ZP+22}px)`));
  fes.push(pane('pane-riad riad-portal',1100,1320,`translate3d(0px,-340px,${F.ZP+28}px)`,riadPortalSVG()));
  [-680,680].forEach(x=>fes.push(pane('pane-riad riad-lantern',180,420,`translate3d(${x}px,-260px,${F.ZP+42}px)`,riadLanternSVG())));
  const rl=F.ZR0-F.ZR1, rc=(F.ZR0+F.ZR1)/2, mh=F.SOL-F.HAUT, mz=(F.SOL+F.HAUT)/2;
  fes.push(pane('pane-chaux',rl,mh,`translate3d(${-F.HW}px,${mz}px,${rc}px) rotateY(90deg)`));
  fes.push(pane('pane-zellige fin bas',rl,380,`translate3d(${-F.HW+6}px,${F.SOL-190}px,${rc}px) rotateY(90deg)`));
  fes.push(pane('pane-cedre',rl,130,`translate3d(${-F.HW+6}px,${F.HAUT+65}px,${rc}px) rotateY(90deg)`));
  [[630,2115],[2260,70]].forEach(([lg,zc])=>{
    fes.push(pane('pane-chaux',lg,mh,`translate3d(${F.HW}px,${mz}px,${zc}px) rotateY(-90deg)`));
    fes.push(pane('pane-zellige fin bas',lg,380,`translate3d(${F.HW-6}px,${F.SOL-190}px,${zc}px) rotateY(-90deg)`));
    fes.push(pane('pane-cedre',lg,130,`translate3d(${F.HW-6}px,${F.HAUT+65}px,${zc}px) rotateY(-90deg)`));
  });
  [[-F.HW+14,2050,90],[F.HW-14,2300,-90],[-F.HW+14,900,90],[F.HW-14,600,-90],[-F.HW+14,-300,90]]
    .forEach(([lx,lz,ry])=>fes.push(pane('pane-riad riad-lantern',115,268,`translate3d(${lx}px,-430px,${lz}px) rotateY(${ry}deg)`,riadLanternSVG())));
  fes.push(pane('pane-claie',2*F.HW+40,rl,`translate3d(0px,${F.HAUT}px,${rc}px) rotateX(-90deg)`));
  const foule = RICHE
    ? [[-230,2300,-900,.055,0  ,'robe'],[ 250,-900,2300,.042,.35,'manteau'],
       [ 120,2100,-700,.068,.62,'costume'],[-290,-800,2200,.037,.18,'tailleur'],
       [  40,1700,-900,.050,.80,'robe']]
    : [[-230,2300,-900,.055,0  ,'robe'],[ 250,-900,2300,.042,.35,'manteau']];
  foule.forEach(([px,z0,z1,v,ph,t])=>
    fes.push(passant('ombre',150,370,px,F.SOL-185,z0,z1,v,ph,0,t)));
  fes.push(pane('pane-cuves',1000,780,`translate3d(1000px,${F.SOL-4}px,${F.ZT}px) rotateX(90deg)`));
  fes.push(pane('pane-chaux',1060,1020,`translate3d(1530px,-190px,${F.ZT}px) rotateY(-90deg)`));
  fes.push(pane('pane-chaux',1120,1020,`translate3d(1000px,-190px,${F.ZT-520}px)`));
  fes.push(pane('pane-chaux',1120,1020,`translate3d(1000px,-190px,${F.ZT+520}px)`));
  fes.push(pane('pane-cedre',1120,1060,`translate3d(1000px,-700px,${F.ZT}px) rotateX(-90deg)`));
  seuil.push(pane('pane-wall',1880,1500,`translate3d(-1270px,-220px,${V.FZ}px)`));
  seuil.push(pane('pane-wall',1880,1500,`translate3d(1270px,-220px,${V.FZ}px)`));
  seuil.push(pane('pane-wall',640,300,`translate3d(0px,-850px,${V.FZ}px)`));
  seuil.push(pane('pane-riad riad-portal',850,1020,`translate3d(0px,-190px,${V.FZ+22}px)`,riadPortalSVG()));
  seuil.push(pane('pane-sign riad-sign',350,100,`translate3d(0px,-640px,${V.FZ+28}px)`,'<div><b>benka</b><i>LA MAISON DES COULEURS</i></div>'));
  seuil.push(pane('pane-glass',700,430,`translate3d(-1000px,-120px,${V.FZ+10}px)`));
  seuil.push(pane('pane-glass',700,430,`translate3d(1000px,-120px,${V.FZ+10}px)`));
  seuil.push(pane('pane-zellige fin bas',1880,125,`translate3d(-1270px,${V.FY-62}px,${V.FZ+6}px)`));
  seuil.push(pane('pane-zellige fin bas',1880,125,`translate3d(1270px,${V.FY-62}px,${V.FZ+6}px)`));
  seuil.push(pane('pane-jamb',140,520,`translate3d(-320px,60px,${V.FZ-70}px) rotateY(90deg)`));
  seuil.push(pane('pane-jamb',140,520,`translate3d(320px,60px,${V.FZ-70}px) rotateY(-90deg)`));
  seuil.push(pane('pane-jamb',640,140,`translate3d(0px,-575px,${V.FZ-70}px) rotateX(-90deg)`));
  allee.push(pane('pane-floor',1500,4600,`translate3d(0px,${V.FY}px,-1900px) rotateX(90deg)`));
  allee.push(pane('pane-tapis',520,3600,`translate3d(0px,${V.FY-3}px,-2600px) rotateX(90deg)`));
  allee.push(pane('pane-ceil',PETIT?1400:2200,PETIT?3800:6400,`translate3d(0px,${V.CY}px,-2600px) rotateX(-90deg)`));
  const alcove=(left,w,ht,top)=>
    `<div class="niche decor" style="left:${left*K}px;top:${top*K}px;width:${w*K}px;height:${ht*K}px"><div class="riad-niche-art">${riadNicheSVG()}</div></div>`;
  let li=''; [0,1,2].forEach(k=>{li+=alcove(420+k*900,420,430,200);});
  allee.push(pane('pane-wall',3400,H,`translate3d(${-V.HW}px,${CYm}px,-3000px) rotateY(90deg)`,li));
  allee.push(pane('pane-zellige fin bas',3400,125,`translate3d(${-V.HW+6}px,${V.FY-62}px,-3000px) rotateY(90deg)`));
  let ri=''; [0,1].forEach(k=>{ri+=alcove(300+k*620,400,430,200);});
  allee.push(pane('pane-wall',1500,H,`translate3d(${V.HW}px,${CYm}px,-2050px) rotateY(-90deg)`,ri));
  allee.push(pane('pane-zellige fin bas',1500,125,`translate3d(${V.HW-6}px,${V.FY-62}px,-2050px) rotateY(-90deg)`));
  allee.push(pane('pane-wall',1040,H,`translate3d(0px,${CYm}px,${V.Z1}px)`));
  allee.push(pane('pane-strip',80,3000,`translate3d(0px,${V.CY+16}px,-2900px) rotateX(-90deg)`));
  (PETIT?[-1250]:[-1450,-1750]).forEach(z=>allee.push(pane('pane-riad riad-portal',1040,870,`translate3d(0px,-115px,${z}px)`,riadPortalSVG())));
  [-1550,-2350,-3150].forEach(z=>allee.push(pane('pane-riad riad-lantern',105,245,`translate3d(0px,-380px,${z}px)`,riadLanternSVG())));
  if(RICHE) for(let i=0;i<5;i++) allee.push(pane('pane-beam',1040,46,`translate3d(0px,${V.CY+34}px,${-1500-i*680}px) rotateX(-90deg)`));
  if(RICHE) [[-300,-2050],[300,-2850]].forEach(([px,pz])=>{
    allee.push(pane('pane-podium',300,250,`translate3d(${px}px,${V.FY-125}px,${pz+150}px)`));
    allee.push(pane('pane-podtop',300,300,`translate3d(${px}px,${V.FY-250}px,${pz}px) rotateX(90deg)`));
    allee.push(pane('pane-riad riad-lantern',130,303,`translate3d(${px}px,${V.FY-401.5}px,${pz}px)`,riadLanternSVG()));
  });
  const SH=V.FY-V.SCY, SZc=(V.SZ0+V.SZ1)/2, SL=V.SZ0-V.SZ1, SYm=(V.SCY+V.FY)/2;
  salle.push(pane('pane-marbre sol',2800,3400,`translate3d(1400px,${V.FY}px,-4300px) rotateX(90deg)`));
  salle.push(pane('pane-tapis',760,2600,`translate3d(1760px,${V.FY-3}px,-4300px) rotateX(90deg)`));
  salle.push(pane('pane-ceil',PETIT?1900:2200,PETIT?2600:3100,`translate3d(1560px,${V.SCY2}px,-4300px) rotateX(-90deg)`));
  const nb=VITRINES.length, cols=nb, cw=PETIT?190:230, gap=PETIT?16:30, ch=PETIT?300:420;
  const emprise=cols*cw+(cols-1)*gap, marge=(SL-emprise)/2;
  let mi='';
  for(let i=0;i<nb;i++){
    const [p,c]=VITRINES[i%VITRINES.length];
    mi+=niche(p,marge+i*(cw+gap),cw,ch,170,true,c);
  }
  salle.push(pane('pane-wall',SL,SH,`translate3d(${V.SX}px,${SYm}px,${SZc}px) rotateY(-90deg)`,mi));
  salle.push(pane('pane-riad riad-frieze',SL,150,`translate3d(${V.SX-20}px,-735px,${SZc}px) rotateY(-90deg)`,riadFriezeSVG()));
  salle.push(pane('pane-riad riad-medallion',900,900,`translate3d(1650px,${V.SCY2+10}px,${SZc}px) rotateX(-90deg)`,riadMedallionSVG()));
  salle.push(pane('pane-riad riad-fountain',540,540,`translate3d(2260px,50px,-5480px) rotateY(-90deg)`,riadFountainSVG()));
  const ENT=-880, HAUT=V.SCY2;                 // entablement, puis plafond
  const SH2=ENT-HAUT, SY2=(ENT+HAUT)/2;        // hauteur et milieu du mur haut
  salle.push(pane('pane-chapiteau riad-entablement',SL,130,`translate3d(${V.SX-30}px,${ENT+10}px,${SZc}px) rotateY(-90deg)`));
  let arcs='';
  const na=PETIT?3:5, aw=Math.round(SL/(na+1.4)), amarge=(SL-na*aw-(na-1)*90)/2;
  for(let i=0;i<na;i++) arcs+=arcade(amarge+i*(aw+90),aw,Math.round(SH2*0.50),Math.round(SH2*0.42));
  salle.push(pane('pane-wall',SL,SH2,`translate3d(${V.SX}px,${SY2}px,${SZc}px) rotateY(-90deg)`,arcs));
  salle.push(pane('pane-balustres',SL,250,`translate3d(${V.SX-170}px,${ENT-135}px,${SZc}px) rotateY(-90deg)`));
  salle.push(pane('pane-rampe',SL,46,`translate3d(${V.SX-170}px,${ENT-275}px,${SZc}px) rotateY(-90deg)`));
  salle.push(pane('pane-rampe',SL,36,`translate3d(${V.SX-170}px,${ENT-8}px,${SZc}px) rotateY(-90deg)`));
  salle.push(pane('pane-led',SL,26,`translate3d(${V.SX-186}px,${ENT+34}px,${SZc}px) rotateY(-90deg)`));
  salle.push(pane('pane-led froide',SL,22,`translate3d(${V.SX-40}px,${HAUT+70}px,${SZc}px) rotateY(-90deg)`));
  const cz = PETIT ? [-3300,-5500] : [-3310,-3020,-5290,-5580];
  cz.forEach(z=>{
    salle.push(pane('pane-colonne',140,1150,`translate3d(2300px,${V.FY-625}px,${z}px) rotateY(-90deg)`));
    salle.push(pane('pane-chapiteau',185,110,`translate3d(2300px,${V.FY-1255}px,${z}px) rotateY(-90deg)`));
    salle.push(pane('pane-socle',185,90,`translate3d(2300px,${V.FY-45}px,${z}px) rotateY(-90deg)`));
  });
  salle.push(pane('pane-zellige',SL,240,`translate3d(${V.SX-8}px,${V.FY-120}px,${SZc}px) rotateY(-90deg)`));
  salle.push(pane('pane-wall',2080,SH,`translate3d(1560px,${SYm}px,${V.SZ1-100}px)`));
  salle.push(pane('pane-wall',2080,SH2,`translate3d(1560px,${SY2}px,${V.SZ1-100}px)`));
  salle.push(pane('pane-wall',2080,SH,`translate3d(1560px,${SYm}px,${V.SZ0}px) rotateY(180deg)`));
  salle.push(pane('pane-wall',2080,SH2,`translate3d(1560px,${SY2}px,${V.SZ0}px) rotateY(180deg)`));
  salle.push(pane('pane-zellige fin bas',2080,125,`translate3d(1560px,${V.FY-62}px,${V.SZ0-8}px) rotateY(180deg)`));
  salle.push(pane('pane-wall',1100,SH,`translate3d(${V.SX0}px,${SYm}px,-5190px) rotateY(90deg)`));
  salle.push(pane('pane-riad riad-screen',440,640,`translate3d(1060px,-230px,${V.SZ1-88}px)`,riadScreenSVG()));
  salle.push(pane('pane-riad riad-screen',440,640,`translate3d(2060px,-230px,${V.SZ1-88}px)`,riadScreenSVG()));
  salle.push(pane('pane-strip',150,SL,`translate3d(${V.SX-110}px,${V.SCY+18}px,${SZc}px) rotateX(-90deg)`));
  salle.push(pane('pane-strip',150,SL,`translate3d(${V.SX0+180}px,${V.SCY+18}px,${SZc}px) rotateX(-90deg)`));
  [-3500,-4300,-5100].forEach(lz=>salle.push(pane('pane-riad riad-lantern',140,327,`translate3d(2340px,-1055px,${lz}px) rotateY(-90deg)`,riadLanternSVG())));
  salle.push(pane('pane-riad riad-screen',420,620,`translate3d(${V.SX0+8}px,-230px,-3700px) rotateY(90deg)`,riadScreenSVG()));
  salle.push(pane('pane-riad riad-screen',420,620,`translate3d(${V.SX0+8}px,-230px,-4900px) rotateY(90deg)`,riadScreenSVG()));
  [-3900,-4700].forEach(lz=>salle.push(pane('pane-riad riad-lantern',120,280,`translate3d(1700px,-900px,${lz}px) rotateY(-90deg)`,riadLanternSVG())));
  [-3500,-4300,-5100].forEach(lz=>
    salle.push(pane('pane-flaque',760,760,`translate3d(2180px,${V.FY-6}px,${lz}px) rotateX(90deg)`)));
  const mans = RICHE ? [[1800,-3180],[1830,-5560]] : [[1810,-3250],[1830,-5480]];
  mans.forEach(([mx,mz],i)=>{
    salle.push(pane('pane-podtop',260,260,`translate3d(${mx}px,${V.FY-12}px,${mz}px) rotateX(90deg)`));
    salle.push(pane('pane-mannequin',200,420,`translate3d(${mx}px,${V.FY-222}px,${mz}px) rotateY(-90deg)`,mannequinSVG(i)));
  });
  const vz = PETIT ? [-3560] : [-3620];
  vz.forEach(z=>{
    salle.push(pane('pane-podium',240,300,`translate3d(1790px,${V.FY-150}px,${z}px) rotateY(-90deg)`));
    salle.push(pane('pane-podtop',240,240,`translate3d(1790px,${V.FY-300}px,${z}px) rotateX(90deg)`));
    salle.push(pane('pane-riad riad-lantern',120,280,`translate3d(1790px,${V.FY-440}px,${z}px) rotateY(-90deg)`,riadLanternSVG()));
  });
  if(RICHE){
    salle.push(passant('client',150,370,1420,V.FY-185,-3150,-5600,.030,.10,-90,'robe'));
    salle.push(passant('client',150,370,1530,V.FY-185,-5600,-3150,.024,.55,-90,'manteau'));
    salle.push(passant('client',150,370,2130,V.FY-185,-5500,-3300,.019,.78,-90,'tailleur'));
  }else{
    salle.push(passant('client',150,370,1470,V.FY-185,-3150,-5600,.030,.10,-90,'robe'));
    salle.push(passant('client',150,370,1600,V.FY-185,-5600,-3150,.023,.58,-90,'manteau'));
  }
  if(RICHE){
    salle.push(pane('pane-podium',2200,150,`translate3d(1950px,${V.FY-75}px,-4300px) rotateY(-90deg)`));
    salle.push(pane('pane-podtop',300,2200,`translate3d(2100px,${V.FY-150}px,-4300px) rotateX(90deg)`));
    salle.push(pane('pane-riad riad-frieze',2200,120,`translate3d(1948px,${V.FY-80}px,-4300px) rotateY(-90deg)`,riadFriezeSVG()));
    salle.push(pane('pane-riad riad-lantern',145,338,`translate3d(2100px,1px,-4900px) rotateY(-90deg)`,riadLanternSVG()));
  }
  if($('#shopview')?.classList.contains('black-friday')){
    fes.push(pane('pane-fete fete-entree',3000,450,
      `translate3d(0px,-790px,${F.ZP+36}px)`,feteGuirlande(true)));
    seuil.push(pane('pane-fete fete-facade',2400,360,
      `translate3d(0px,-850px,${V.FZ+32}px)`,feteGuirlande(true)));
    seuil.push(pane('pane-fete fete-affiche',650,175.5,
      `translate3d(-1000px,-100px,${V.FZ+24}px)`,feteAffiche()));
    seuil.push(pane('pane-fete fete-sapin',350,620.5,
      `translate3d(1000px,${V.FY-310.25}px,${V.FZ+34}px)`,feteSapin()));
    seuil.push(pane('pane-fete fete-paquets',400,224,
      `translate3d(-1000px,${V.FY-112}px,${V.FZ+40}px)`,fetePaquets()));
    seuil.push(pane('pane-fete fete-couronne',190,190,
      `translate3d(0px,-335px,${V.FZ+30}px)`,feteCouronne()));
    seuil.push(pane('pane-fete fete-sapin fete-porte',180,319.1,
      `translate3d(-230px,${V.FY-159.55}px,${V.FZ+70}px)`,feteSapin()));
    seuil.push(pane('pane-fete fete-paquets fete-porte',170,95.2,
      `translate3d(235px,${V.FY-47.6}px,${V.FZ+76}px)`,fetePaquets()));
    seuil.push(pane('pane-fete fete-linteau',600,90,
      `translate3d(0px,-185px,${V.FZ+74}px)`,feteGuirlande(false)));
    [-1500,-2300,-3100].forEach(z=>
      allee.push(pane('pane-fete fete-plafond',1000,150,
        `translate3d(0px,-405px,${z}px)`,feteGuirlande(false))));
    salle.push(pane('pane-fete fete-galerie',2600,300,
      `translate3d(${V.SX-34}px,-1020px,${SZc}px) rotateY(-90deg)`,feteGuirlande(true)));
    salle.push(pane('pane-fete fete-affiche',1100,297,
      `translate3d(${V.SX-26}px,-85px,${SZc}px) rotateY(-90deg)`,feteAffiche()));
    [-3100].forEach(z=>
      salle.push(pane('pane-fete fete-sapin',390,691.4,
        `translate3d(2410px,${V.FY-345.7}px,${z}px) rotateY(-90deg)`,feteSapin())));
  }
  w.innerHTML=[['fes',fes],['seuil',seuil],['allee',allee],['salle',salle]]
    .map(([n,a])=>`<div class="zone" data-z="${n}">${a.join('')}</div>`).join('');
}
function animerPassants(world){
  const gens=[...world.querySelectorAll('.passant')].map(el=>({
    el, zone:el.closest('.zone'), x:+el.dataset.x, y:+el.dataset.y, z0:+el.dataset.z0, z1:+el.dataset.z1,
    v:+el.dataset.v, t:+el.dataset.t, ry:+el.dataset.ry }));
  if(!gens.length)return;
  const sec=world.closest('.visite')||world.parentElement;
  const boutique=world.closest('#shopview');
  let visible=!self.IntersectionObserver,horloge=0,attente=0,observer;
  const cadence=PETIT?50:1000/30;
  if(self.IntersectionObserver&&sec){
    observer=new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      world.classList.toggle('vit',visible);
      if(visible)reveiller();
    });observer.observe(sec);
  }else world.classList.add('vit');
  const arreter=avancer((dt,sy)=>{
    if(!visible||boutique?.classList.contains('bf-paused')
      ||(typeof S!=='undefined'&&S.panel)
      ||sy<GEO.vTop-GEO.vh||sy>GEO.vTop+GEO.vSpan+GEO.vh*.6)return false;
    attente+=dt*1000;
    if(attente<cadence)return cadence-attente;
    horloge+=attente/1000;attente=0;
    let anime=false;
    for(let i=0;i<gens.length;i++){
      const g=gens[i];
      if(g.zone?.style.display==='none')continue;
      anime=true;
      const u=(horloge*g.v+g.t)%1,z=g.z0+(g.z1-g.z0)*u;
      const bob=Math.sin(horloge*5.7+g.t*6.3)*2.5;
      g.el.style.transform='translate3d('+(g.x*K).toFixed(1)+'px,'
        +((g.y+bob)*K).toFixed(1)+'px,'+(z*K).toFixed(1)+'px) rotateY('+g.ry+'deg)';
    }
    return anime?cadence:false;
  });
  return ()=>{arreter();observer?.disconnect();world.classList.remove('vit');};
}
function cr(a,b,c,d,t){const t2=t*t,t3=t2*t;
  return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);}
function echantillon(p){
  let i=0; while(i<CAM.length-2&&p>CAM[i+1][0])i++;
  const A=CAM[i],B=CAM[i+1],P=CAM[Math.max(0,i-1)],N=CAM[Math.min(CAM.length-1,i+2)];
  const t=borne((p-A[0])/((B[0]-A[0])||1),0,1);
  return {x:cr(P[1],A[1],B[1],N[1],t), z:cr(P[2],A[2],B[2],N[2],t),
          yaw:cr(P[3],A[3],B[3],N[3],t), pit:cr(P[4],A[4],B[4],N[4],t)};
}
function initVisite(){
  const sec=$('#visite'),world=$('#world'); if(!sec||!world||!MOTION)return;
  buildWorld();mesurer();
  const arreter=installerVisite(sec,world);reveiller();
  return arreter;
}
function installerVisite(sec,world){
  const caps=[...sec.querySelectorAll('.vcap')].map(el=>({el,a:+el.dataset.a,b:+el.dataset.b}));
  const bar=$('#vprogbar'),hint=$('#vhint');
  const bar2=bar;
  if(MODE2D){
    const plans=[...world.querySelectorAll('.mv')];
    const bornes=plans.map((_,i)=>[i/plans.length,(i+1)/plans.length]);
    let capPrec=-1,progression=-1;
    return avancer((dt,sy)=>{
      const p=borne((sy-GEO.vTop)/GEO.vSpan,0,1);
      if(p===progression)return false;
      progression=p;
      for(let i=0;i<plans.length;i++){
        const [a,b]=bornes[i]||[0,1];
        const dedans=p>=a-0.05&&p<b+0.05;
        const t=borne((p-a)/((b-a)||1),0,1);
        plans[i].style.opacity=dedans?(p<a?1-(a-p)/0.05:p>b?1-(p-b)/0.05:1).toFixed(2):'0';
        if(dedans)plans[i].firstChild.style.transform='scale('+(1.1-t*0.1).toFixed(3)+')';
      }
      let vu=-1; for(let i=0;i<caps.length;i++) if(p>=caps[i].a&&p<caps[i].b) vu=i;
      if(vu!==capPrec){capPrec=vu; for(let i=0;i<caps.length;i++) caps[i].el.style.opacity=i===vu?'1':'0';}
      if(bar2)bar2.style.width=(p*100).toFixed(1)+'%';
      if(hint){hint.style.opacity=p>.03?'0':'1';hint.style.visibility=p>.12?'hidden':'visible';}
      return false;
    });
  }
  const zel=ZONES.map(([nom])=>world.querySelector('.zone[data-z="'+nom+'"]'));
  let masque=-1;
  function majZones(p){
    let m=0;
    for(let i=0;i<ZONES.length;i++) if(p>=ZONES[i][1]&&p<=ZONES[i][2]) m|=1<<i;
    if(m===masque)return;
    masque=m;
    for(let i=0;i<zel.length;i++) if(zel[i]) zel[i].style.display=(m>>i&1)?'':'none';
  }
  const debut=borne((scrollY-GEO.vTop)/GEO.vSpan,0,1);
  majZones(debut);
  const arreterPassants=animerPassants(world);
  const cam=echantillon(debut);
  let roll=0,prevYaw=cam.yaw,capPrec=-1,hintPrec=-1,progression=-1,saut=false;
  cam.pit=cam.pit||0;
  const sauter=()=>{saut=true;};
  sec.addEventListener('benka:visitejump',sauter);
  const arreterCamera=avancer((dt,sy)=>{
    const p=borne((sy-GEO.vTop)/GEO.vSpan,0,1);
    const proche=sy>GEO.vTop-GEO.vh*1.4 && sy<GEO.vTop+GEO.vSpan+GEO.vh*0.6;
    majZones(proche?p:-1);
    const c=echantillon(p);
    const erreur=()=>Math.abs(c.x-cam.x)+Math.abs(c.z-cam.z)+Math.abs(c.yaw-cam.yaw)+Math.abs(c.pit-cam.pit);
    const arrive=erreur()<.15&&Math.abs(roll)<.02;
    if(p===progression&&arrive&&!saut)return false;
    progression=p;
    if(saut||!proche||arrive){
      cam.x=c.x;cam.z=c.z;cam.yaw=c.yaw;cam.pit=c.pit;roll=0;saut=false;
    }else{
      const k=1-Math.pow(.0012,dt);
      cam.x+=(c.x-cam.x)*k;cam.z+=(c.z-cam.z)*k;cam.yaw+=(c.yaw-cam.yaw)*k;
      cam.pit+=(c.pit-cam.pit)*k;
      const d=cam.yaw-prevYaw;
      roll+=(borne(-d*2.6,-6,6)-roll)*Math.min(1,dt*7);
    }
    prevYaw=cam.yaw;
    const bob=Math.sin(p*46)*7;
    world.style.transform=`rotateZ(${roll.toFixed(2)}deg) rotateX(${cam.pit.toFixed(2)}deg) `
      +`rotateY(${cam.yaw.toFixed(2)}deg) `
      +`translate3d(${(-cam.x*K).toFixed(1)}px,${(-bob*K).toFixed(1)}px,${(-cam.z*K).toFixed(1)}px)`;
    let vu=-1; for(let i=0;i<caps.length;i++) if(p>=caps[i].a&&p<caps[i].b) vu=i;
    if(vu!==capPrec){capPrec=vu; for(let i=0;i<caps.length;i++) caps[i].el.style.opacity=i===vu?'1':'0';}
    if(bar)bar.style.width=(p*100).toFixed(1)+'%';
    const hv=p>.03?0:1;
    if(hint&&hv!==hintPrec){hintPrec=hv;hint.style.opacity=hv;hint.style.visibility=p>.12?'hidden':'visible';}
    return proche&&(erreur()>=.15||Math.abs(roll)>=.02);
  });
  return ()=>{arreterCamera();arreterPassants?.();sec.removeEventListener('benka:visitejump',sauter);};
}