/* ======================= la boutique en 3D =======================
   Allée, puis grand showroom : mur de présentation de 2 800 px sur deux
   rangées, banc central, plafond rehaussé, corniche lumineuse. */
const VIS={HW:520,FY:320,CY:-520,FZ:-1100,Z1:-4700,
           SX:2600,SZ0:-2900,SZ1:-5700,SCY:-820,SX0:520};
/* Fès, avant la boutique. Le cuir vient de là : on part devant la porte au
   lever du jour, on passe sous l'arche, on longe la derb et ses zelliges, on
   jette un œil aux cuves des tanneries, et la ruelle débouche sur la façade
   benka. Même monde, même caméra — la scène est simplement plus longue. */
const FES={HW:430,SOL:320,HAUT:-820,ZP:2450,ZR0:2430,ZR1:-1060,ZT:1500};
const CAM=[
  [0,     0, 4500,  0],   // devant la porte, la ville dort encore
  [.07,   0, 3900,  0],
  [.14,   0, 3150,  0],   // l'arche grandit
  [.21,   0, 2420,  0],   // on passe dessous
  [.28,   0, 1950,  9],   // la derb
  [.34,   0, 1480, 17],   // le regard glisse vers les cuves
  [.40,   0, 1000,  6],
  [.46,   0,  420,  0],   // la façade benka, bout de rue
  [.53,   0, -820,  0],
  [.61,   0,-1750,  0],
  [.70,   0,-2550,  0],
  [.76, 260,-2950, 62],
  [.83,1150,-3550, 88],
  [.91,1190,-3950, 90],
  [1,  1210,-4300, 90]];
/* Les plans sont groupés par quartier. Un quartier loin de la caméra est
   démonté : son contenu ne coûte plus un seul calque graphique. C'est ce qui
   permet de doubler le décor sans dépasser la charge d'avant. Les marges sont
   larges pour que le montage se fasse hors champ, jamais sous les yeux. */
const ZONES=[['fes',0,.58],['seuil',.18,.70],['allee',.42,.94],['salle',.64,1.01]];
const PETIT=innerWidth<700, RICHE=!PETIT;
// Safari iOS alloue un calque graphique par plan 3D, et sa mémoire suit la
// SURFACE du plan. On garde la même scène, dessinée deux fois plus petite,
// avec une perspective divisée d'autant : la projection reste identique.
const K=PETIT?0.5:1;
// Garde-fou : si l'onglet s'est déjà rechargé deux fois (Safari tue la page
// quand elle manque de mémoire), on bascule sur la version en fondus.
let MODE2D=false;
try{
  const b=+(sessionStorage.getItem('benka.boot')||0)+1;
  sessionStorage.setItem('benka.boot',String(b));
  if(b>=3){MODE2D=true;console.warn('[benka] 3D desactivee apres plusieurs rechargements');}
  setTimeout(()=>{try{sessionStorage.setItem('benka.boot','0');}catch(e){}},9000);
}catch(e){}
// toutes les combinaisons modèle × cuir, pour garnir le grand mur
const VITRINES=CATALOG.flatMap(p=>p.colors.map(c=>[p,c]));

/* Un dégradé peint sur un plan immense est tronqué par le navigateur — au-delà
   d'environ deux millions de pixels il renonce et ne peint qu'une bande du haut
   — et il coûte en mémoire autant qu'il couvre de surface. Un plan sans contenu
   est donc dessiné f fois plus petit, puis agrandi d'autant par la
   transformation : même image à l'écran, f² fois moins de pixels à peindre.
   Les tailles de motif et les ombres se divisent par --f pour compenser.
   Les plans qui portent des vitrines gardent leur taille : on n'agrandit pas
   du texte au risque de le flouter. */
const facteur=a=>a>8e6?5:a>4e6?4:a>2e6?3:a>8e5?2:1;
function pane(cls,w,ht,tf,inner){
  const f=inner?1:facteur(w*ht);
  if(f!==1){w/=f;ht/=f;tf+=` scale(${f})`;}
  if(K!==1){w*=K;ht*=K;tf=tf.replace(/(-?[\d.]+)px/g,(m,v)=>(v*K).toFixed(1)+'px');}
  return `<div class="pane ${cls}"${f!==1?` style="--f:${f};`:' style="'}width:${w}px;height:${ht}px;margin-left:${-w/2}px;margin-top:${-ht/2}px;transform:${tf}">${inner||''}</div>`;}
/* Une silhouette humaine, en un seul SVG. Les jambes et les bras sont dans
   leurs propres groupes pour que la CSS leur donne le pas. */
function silhouetteSVG(){
  return '<svg class="sil" viewBox="0 0 70 184" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'
    +'<circle cx="35" cy="17" r="13"/>'
    +'<path d="M35 32c-12 0-20 8-21 19l-2 27h10l1-17v23h24v-23l1 17h10l-2-27c-1-11-9-19-21-19z"/>'
    +'<g class="br b1"><path d="M15 52l-6 36 8 2 6-35z"/></g>'
    +'<g class="br b2"><path d="M55 52l6 36-8 2-6-35z"/></g>'
    +'<g class="jb j1"><path d="M26 84l-3 47 2 46h10l1-46 2-47z"/></g>'
    +'<g class="jb j2"><path d="M44 84l3 47-2 46h-10l-1-46-2-47z"/></g>'
    +'</svg>';
}
/* Buste de couturière sur son pied. */
function mannequinSVG(id){
  // Le dégradé donne le galbe : sans lui, la forme reste une découpe plate.
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
/* Un passant : le moteur réécrira sa position à chaque image, on garde donc
   ses paramètres sur l'élément lui-même. */
function passant(cls,w,ht,x,y,z0,z1,vitesse,phase,ry){
  const W=w*K, H=ht*K;
  return `<div class="pane pane-gens ${cls} passant" data-x="${x}" data-y="${y}" data-z0="${z0}"`
    +` data-z1="${z1}" data-v="${vitesse}" data-t="${phase}" data-ry="${ry||0}"`
    +` style="width:${W}px;height:${H}px;margin-left:${-W/2}px;margin-top:${-H/2}px;`
    +`transform:translate3d(${(x*K).toFixed(1)}px,${(y*K).toFixed(1)}px,${(z0*K).toFixed(1)}px) rotateY(${ry||0}deg)">`
    +silhouetteSVG()+'</div>';
}
function niche(p,left,w,ht,top,plate,col){
  if(K!==1){left*=K;w*=K;ht*=K;top*=K;}
  const corps=`${visuel(p,col||p.colors[0],true)}<b>${p.name}</b><span>${(COLORS[col||p.colors[0]]||{}).n||''}</span>`;
  if(!RICHE) return `<div class="niche" style="left:${left}px;top:${top}px;width:${w}px;height:${ht}px">${corps}</div>`;
  return `<div class="n3${plate?' plate':''}" style="left:${left}px;top:${top}px;width:${w}px;height:${ht}px">
      <div class="nb">${corps}</div><div class="ns nl"></div><div class="ns nr"></div>
      <div class="nt"></div><div class="nf"></div></div>`;}

const PLANS=[
  ['assets/marque/logo-sur-photo-800.jpg','La vitrine benka'],
  ['assets/atelier/02-800.jpg','Les tiges en daim, avant montage'],
  ['assets/atelier/03-800.jpg','L\u2019établi et les formes'],
  ['assets/atelier/04-800.jpg','Le montage sur forme'],
  ['assets/produits/mocassin-noir-800.jpg','La collection, prête à partir']
];
function construirePlans(){
  const w=$('#world'); if(!w)return;
  w.innerHTML=PLANS.map(([src,alt],i)=>
    `<div class="mv"><img src="${src}" alt="${alt}" ${i?'loading="lazy"':''} decoding="async"></div>`).join('');
}
function buildWorld(){
  const w=$('#world'); if(!w)return;
  if(MODE2D){construirePlans();return;}
  const V=VIS,F=FES,H=850,CYm=(V.CY+V.FY)/2;
  const fes=[],seuil=[],allee=[],salle=[];
  const kx=v=>Math.round(v*K);

  /* =============== Fès : la médina =============== */
  // Le ciel : la porte s'arrête assez bas pour qu'on voie le jour se lever
  // au-dessus des terrasses — sans cela le zellige remplissait tout le cadre.
  fes.push(pane('pane-ciel',9000,1500,`translate3d(0px,-1590px,2520px)`));
  // la place et la ruelle, d'un seul tenant
  fes.push(pane('pane-pave',2600,6200,`translate3d(0px,${F.SOL}px,1800px) rotateX(90deg)`));
  // La porte : deux massifs de zellige, un linteau, l'arche en fer à cheval.
  // Elle s'arrête à -950 pour qu'une bande de ciel reste visible au-dessus.
  fes.push(pane('pane-zellige',3800,1470,`translate3d(-2300px,-215px,${F.ZP}px)`));
  fes.push(pane('pane-zellige',3800,1470,`translate3d(2300px,-215px,${F.ZP}px)`));
  fes.push(pane('pane-zellige',900,340,`translate3d(0px,-780px,${F.ZP}px)`));
  fes.push(pane('pane-cedre',9000,120,`translate3d(0px,-1010px,${F.ZP+20}px)`));
  // créneaux : la silhouette de la porte se découpe sur le jour qui se lève
  fes.push(pane('pane-creneaux',9000,120,`translate3d(0px,-1130px,${F.ZP+22}px)`));
  fes.push(pane('pane-vide',900,1080,`translate3d(0px,-220px,${F.ZP-20}px)`,
    `<div class="arche" style="width:${kx(820)}px;height:${kx(1040)}px"><i></i></div>`));
  // les murs de la ruelle : chaux, zellige en bas, cèdre en haut
  const rl=F.ZR0-F.ZR1, rc=(F.ZR0+F.ZR1)/2, mh=F.SOL-F.HAUT, mz=(F.SOL+F.HAUT)/2;
  fes.push(pane('pane-chaux',rl,mh,`translate3d(${-F.HW}px,${mz}px,${rc}px) rotateY(90deg)`));
  fes.push(pane('pane-zellige fin bas',rl,380,`translate3d(${-F.HW+6}px,${F.SOL-190}px,${rc}px) rotateY(90deg)`));
  fes.push(pane('pane-cedre',rl,130,`translate3d(${-F.HW+6}px,${F.HAUT+65}px,${rc}px) rotateY(90deg)`));
  // côté droit : deux tronçons, l'écart ouvre sur les tanneries
  [[630,2115],[2260,70]].forEach(([lg,zc])=>{
    fes.push(pane('pane-chaux',lg,mh,`translate3d(${F.HW}px,${mz}px,${zc}px) rotateY(-90deg)`));
    fes.push(pane('pane-zellige fin bas',lg,380,`translate3d(${F.HW-6}px,${F.SOL-190}px,${zc}px) rotateY(-90deg)`));
    fes.push(pane('pane-cedre',lg,130,`translate3d(${F.HW-6}px,${F.HAUT+65}px,${zc}px) rotateY(-90deg)`));
  });
  // lanternes de cuivre accrochées aux murs
  [[-F.HW+14,2050,90],[F.HW-14,2300,-90],[-F.HW+14,900,90],[F.HW-14,600,-90],[-F.HW+14,-300,90]]
    .forEach(([lx,lz,ry])=>fes.push(pane('pane-lampe',58,80,`translate3d(${lx}px,-470px,${lz}px) rotateY(${ry}deg)`)));
  // le toit de claies au-dessus de la ruelle
  fes.push(pane('pane-claie',2*F.HW+40,rl,`translate3d(0px,${F.HAUT}px,${rc}px) rotateX(-90deg)`));
  // Des passants dans la derb. Ils marchent le long de la rue, à contresens
  // de la caméra pour la plupart : c'est ce qui donne l'impression que la
  // ville vit pendant qu'on la traverse.
  // Tous tournés vers la caméra : un plan de dos est effacé par
  // backface-visibility, et le sens de marche se lit au déplacement.
  const foule = RICHE
    ? [[-230,2300,-900,.055,0  ],[ 250,-900,2300,.042,.35],
       [ 120,2100,-700,.068,.62],[-290,-800,2200,.037,.18],
       [  40,1700,-900,.050,.80]]
    : [[-230,2300,-900,.055,0  ],[ 250,-900,2300,.042,.35]];
  foule.forEach(([px,z0,z1,v,ph])=>
    fes.push(passant('ombre',150,370,px,F.SOL-185,z0,z1,v,ph,0)));

  // les tanneries de Chouara : la nappe de cuves, et de quoi fermer la vue
  fes.push(pane('pane-cuves',1000,780,`translate3d(1000px,${F.SOL-4}px,${F.ZT}px) rotateX(90deg)`));
  fes.push(pane('pane-chaux',1060,1020,`translate3d(1530px,-190px,${F.ZT}px) rotateY(-90deg)`));
  fes.push(pane('pane-chaux',1120,1020,`translate3d(1000px,-190px,${F.ZT-520}px)`));
  fes.push(pane('pane-chaux',1120,1020,`translate3d(1000px,-190px,${F.ZT+520}px)`));
  fes.push(pane('pane-cedre',1120,1060,`translate3d(1000px,-700px,${F.ZT}px) rotateX(-90deg)`));

  /* =============== le seuil : la façade =============== */
  seuil.push(pane('pane-wall',1880,1500,`translate3d(-1270px,-220px,${V.FZ}px)`));
  seuil.push(pane('pane-wall',1880,1500,`translate3d(1270px,-220px,${V.FZ}px)`));
  seuil.push(pane('pane-wall',640,700,`translate3d(0px,-550px,${V.FZ}px)`));
  seuil.push(pane('pane-sign',600,200,`translate3d(0px,-560px,${V.FZ+14}px)`,'<div><b>benka</b><i>MOCASSINS · FÈS → CASABLANCA</i></div>'));
  seuil.push(pane('pane-glass',700,430,`translate3d(-1000px,-120px,${V.FZ+10}px)`));
  seuil.push(pane('pane-glass',700,430,`translate3d(1000px,-120px,${V.FZ+10}px)`));
  // plinthe de zellige : 125 de haut, sous les vitrines, pour ne rien couper
  seuil.push(pane('pane-zellige fin bas',1880,125,`translate3d(-1270px,${V.FY-62}px,${V.FZ+6}px)`));
  seuil.push(pane('pane-zellige fin bas',1880,125,`translate3d(1270px,${V.FY-62}px,${V.FZ+6}px)`));
  seuil.push(pane('pane-jamb',140,520,`translate3d(-320px,60px,${V.FZ-70}px) rotateY(90deg)`));
  seuil.push(pane('pane-jamb',140,520,`translate3d(320px,60px,${V.FZ-70}px) rotateY(-90deg)`));
  seuil.push(pane('pane-jamb',640,140,`translate3d(0px,-200px,${V.FZ-70}px) rotateX(-90deg)`));

  /* =============== l'allée =============== */
  allee.push(pane('pane-floor',1500,4600,`translate3d(0px,${V.FY}px,-1900px) rotateX(90deg)`));
  allee.push(pane('pane-tapis',520,3600,`translate3d(0px,${V.FY-3}px,-2600px) rotateX(90deg)`));
  allee.push(pane('pane-ceil',PETIT?1400:2200,PETIT?3800:6400,`translate3d(0px,${V.CY}px,-2600px) rotateX(-90deg)`));
  let li=''; CATALOG.forEach((p,k)=>{li+=niche(p,420+k*900,420,430,200);});
  allee.push(pane('pane-wall',3400,H,`translate3d(${-V.HW}px,${CYm}px,-3000px) rotateY(90deg)`,li));
  allee.push(pane('pane-zellige fin bas',3400,125,`translate3d(${-V.HW+6}px,${V.FY-62}px,-3000px) rotateY(90deg)`));
  let ri=''; [0,1].forEach(k=>{ri+=niche(CATALOG[k],300+k*620,400,430,200,false,CATALOG[k].colors[1]||CATALOG[k].colors[0]);});
  allee.push(pane('pane-wall',1500,H,`translate3d(${V.HW}px,${CYm}px,-2050px) rotateY(-90deg)`,ri));
  allee.push(pane('pane-zellige fin bas',1500,125,`translate3d(${V.HW-6}px,${V.FY-62}px,-2050px) rotateY(-90deg)`));
  allee.push(pane('pane-wall',1040,H,`translate3d(0px,${CYm}px,${V.Z1}px)`));
  allee.push(pane('pane-strip',170,3000,`translate3d(0px,${V.CY+16}px,-2900px) rotateX(-90deg)`));
  if(RICHE) for(let i=0;i<5;i++) allee.push(pane('pane-beam',1040,46,`translate3d(0px,${V.CY+34}px,${-1500-i*680}px) rotateX(-90deg)`));
  if(RICHE) [[-300,-2050],[300,-2850]].forEach(([px,pz],i)=>{
    const p=CATALOG[i===0?0:2];
    allee.push(pane('pane-podium',300,250,`translate3d(${px}px,${V.FY-125}px,${pz+150}px)`));
    allee.push(pane('pane-podtop',300,300,`translate3d(${px}px,${V.FY-250}px,${pz}px) rotateX(90deg)`));
    allee.push(pane('pane-prop',200,290,`translate3d(${px}px,${V.FY-395}px,${pz}px)`,visuel(p,p.colors[0],true)));
  });

  /* =============== la grande salle =============== */
  const SH=V.FY-V.SCY, SZc=(V.SZ0+V.SZ1)/2, SL=V.SZ0-V.SZ1, SYm=(V.SCY+V.FY)/2;
  salle.push(pane('pane-floor',2800,3400,`translate3d(1400px,${V.FY}px,-4300px) rotateX(90deg)`));
  salle.push(pane('pane-tapis',760,2600,`translate3d(1760px,${V.FY-3}px,-4300px) rotateX(90deg)`));
  salle.push(pane('pane-ceil',PETIT?1900:2100,PETIT?2600:3000,`translate3d(1560px,${V.SCY}px,-4300px) rotateX(-90deg)`));
  const nb=PETIT?8:VITRINES.length, cols=PETIT?4:7, cw=230, gap=30, ch=PETIT?360:420;
  const emprise=cols*cw+(cols-1)*gap, marge=(SL-emprise)/2;
  let mi='';
  for(let i=0;i<nb;i++){
    const [p,c]=VITRINES[i%VITRINES.length];
    mi+=niche(p,marge+(i%cols)*(cw+gap),cw,ch,i<cols?120:120+ch+45,true,c);
  }
  salle.push(pane('pane-wall',SL,SH,`translate3d(${V.SX}px,${SYm}px,${SZc}px) rotateY(-90deg)`,mi));
  salle.push(pane('pane-zellige',SL,125,`translate3d(${V.SX-8}px,${V.FY-62}px,${SZc}px) rotateY(-90deg)`));
  salle.push(pane('pane-wall',2080,SH,`translate3d(1560px,${SYm}px,${V.SZ1-100}px)`));
  // Côté entrée : sans ce mur, le virage ouvrait sur le vide derrière la caméra.
  // Le demi-tour est indispensable — un plan montre sa face avant vers +z, et
  // backface-visibility:hidden le rend invisible quand on le regarde de dos.
  salle.push(pane('pane-wall',2080,SH,`translate3d(1560px,${SYm}px,${V.SZ0}px) rotateY(180deg)`));
  salle.push(pane('pane-zellige fin bas',2080,125,`translate3d(1560px,${V.FY-62}px,${V.SZ0-8}px) rotateY(180deg)`));
  // et le retour du mur proche, qui ferme l'angle au fond
  salle.push(pane('pane-wall',1100,SH,`translate3d(${V.SX0}px,${SYm}px,-5190px) rotateY(90deg)`));
  salle.push(pane('pane-mouchara',440,640,`translate3d(1060px,-230px,${V.SZ1-88}px)`));
  salle.push(pane('pane-mouchara',440,640,`translate3d(2060px,-230px,${V.SZ1-88}px)`));
  salle.push(pane('pane-strip',150,SL,`translate3d(${V.SX-110}px,${V.SCY+18}px,${SZc}px) rotateX(-90deg)`));
  salle.push(pane('pane-strip',150,SL,`translate3d(${V.SX0+180}px,${V.SCY+18}px,${SZc}px) rotateX(-90deg)`));
  [-3500,-4300,-5100].forEach(lz=>salle.push(pane('pane-lampe',74,100,`translate3d(2340px,-640px,${lz}px) rotateY(-90deg)`)));
  // claustras de cèdre sur le mur proche, et deux appliques au-dessus du banc
  salle.push(pane('pane-mouchara',420,620,`translate3d(${V.SX0+8}px,-230px,-3700px) rotateY(90deg)`));
  salle.push(pane('pane-mouchara',420,620,`translate3d(${V.SX0+8}px,-230px,-4900px) rotateY(90deg)`));
  [-3900,-4700].forEach(lz=>salle.push(pane('pane-lampe',66,90,`translate3d(1700px,-690px,${lz}px)`)));
  // Flaques de lumière au sol, sous chaque lanterne du mur. Un seul plan
  // chacune, et la salle cesse d'être éclairée uniformément.
  [-3500,-4300,-5100].forEach(lz=>
    salle.push(pane('pane-flaque',760,760,`translate3d(2180px,${V.FY-6}px,${lz}px) rotateX(90deg)`)));
  // Mannequins de couturière, posés devant le mur. Deux plans croisés chacun :
  // de trois quarts, on ne voit jamais une silhouette plate.
  // Un seul plan par mannequin, face à la caméra : dans la salle le regard
  // ne tourne que de 62° à 90°, le plan reste de face. Le plan croisé que
  // j'avais ajouté ne faisait qu'un fantôme en double exposition.
  const mans = RICHE ? [[1880,-3300],[1840,-4450],[1910,-5400]] : [[1880,-3600],[1860,-5150]];
  mans.forEach(([mx,mz],i)=>{
    salle.push(pane('pane-podtop',260,260,`translate3d(${mx}px,${V.FY-12}px,${mz}px) rotateX(90deg)`));
    salle.push(pane('pane-mannequin',200,420,`translate3d(${mx}px,${V.FY-222}px,${mz}px) rotateY(-90deg)`,mannequinSVG(i)));
  });
  // Deux clients qui longent le mur, lentement.
  if(RICHE){
    salle.push(passant('client',150,370,1480,V.FY-185,-3200,-5600,.030,.1,-90));
    salle.push(passant('client',150,370,1560,V.FY-185,-5600,-3200,.024,.55,-90));
  }else{
    salle.push(passant('client',150,370,1520,V.FY-185,-3200,-5600,.030,.1,-90));
  }
  // banc central, parallèle au mur
  if(RICHE){
    salle.push(pane('pane-podium',2200,150,`translate3d(1950px,${V.FY-75}px,-4300px) rotateY(-90deg)`));
    salle.push(pane('pane-podtop',300,2200,`translate3d(2100px,${V.FY-150}px,-4300px) rotateX(90deg)`));
    [[-3600,0],[-4150,1],[-4700,2],[-5200,0]].forEach(([pz,k])=>{
      const p=CATALOG[k];
      salle.push(pane('pane-prop',190,270,`translate3d(2100px,${V.FY-285}px,${pz}px) rotateY(-90deg)`,visuel(p,p.colors[0],true)));
    });
  }

  w.innerHTML=[['fes',fes],['seuil',seuil],['allee',allee],['salle',salle]]
    .map(([n,a])=>`<div class="zone" data-z="${n}">${a.join('')}</div>`).join('');
}

/* Les passants avancent avec le temps, pas avec le défilement : la rue vit
   même quand on s'arrête de faire défiler. Une seule tâche pour tout le
   monde, et seulement quand la scène est à portée d'écran — ailleurs elle
   rend la main et le moteur s'endort. */
function animerPassants(world){
  const gens=[...world.querySelectorAll('.passant')].map(el=>({
    el, x:+el.dataset.x, y:+el.dataset.y, z0:+el.dataset.z0, z1:+el.dataset.z1,
    v:+el.dataset.v, t:+el.dataset.t, ry:+el.dataset.ry }));
  if(!gens.length)return;
  // Un observateur suffit : il ne coûte rien tant que rien ne traverse le
  // bord de l'écran, là où un sondage à chaque image coûterait tout le temps.
  const sec=world.closest('.visite')||world.parentElement;
  if(self.IntersectionObserver&&sec){
    new IntersectionObserver(e=>world.classList.toggle('vit',e[0].isIntersecting),
      {rootMargin:'25% 0px'}).observe(sec);
  }else world.classList.add('vit');
  let horloge=0;
  avancer((dt,sy)=>{
    if(sy<GEO.vTop-GEO.vh || sy>GEO.vTop+GEO.vSpan+GEO.vh*0.6) return false;
    horloge+=dt;
    for(let i=0;i<gens.length;i++){
      const g=gens[i];
      const u=(horloge*g.v+g.t)%1;                    // 0 → 1, puis on repart
      const z=g.z0+(g.z1-g.z0)*u;
      const bob=Math.sin(horloge*5.7+g.t*6.3)*2.5;     // le pas fait monter le corps
      g.el.style.transform='translate3d('+(g.x*K).toFixed(1)+'px,'
        +((g.y+bob)*K).toFixed(1)+'px,'+(z*K).toFixed(1)+'px) rotateY('+g.ry+'deg)';
    }
    return true;
  });
}

function cr(a,b,c,d,t){const t2=t*t,t3=t2*t;
  return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);}
function echantillon(p){
  let i=0; while(i<CAM.length-2&&p>CAM[i+1][0])i++;
  const A=CAM[i],B=CAM[i+1],P=CAM[Math.max(0,i-1)],N=CAM[Math.min(CAM.length-1,i+2)];
  const t=borne((p-A[0])/((B[0]-A[0])||1),0,1);
  return {x:cr(P[1],A[1],B[1],N[1],t), z:cr(P[2],A[2],B[2],N[2],t), yaw:cr(P[3],A[3],B[3],N[3],t)};
}
function initVisite(){
  const sec=$('#visite'),world=$('#world'); if(!sec||!world)return;
  buildWorld();
  if(!MOTION)return;
  const caps=[...sec.querySelectorAll('.vcap')].map(el=>({el,a:+el.dataset.a,b:+el.dataset.b}));
  const bar=$('#vprogbar'),hint=$('#vhint');
  const bar2=bar;
  if(MODE2D){
    const plans=[...world.querySelectorAll('.mv')];
    const bornes=caps.map(c=>[c.a,c.b]);
    let capPrec=-1;
    avancer((dt,sy)=>{
      const p=borne((sy-GEO.vTop)/GEO.vSpan,0,1);
      const proche=sy>GEO.vTop-GEO.vh*1.2 && sy<GEO.vTop+GEO.vSpan+GEO.vh*0.5;
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
      return proche;
    });
    return;
  }
  // Un quartier hors de portée est retiré du document : plus de calque, plus
  // de mémoire. Le masque ne change qu'aux frontières — quelques écritures
  // DOM sur toute la visite, rien par image.
  const zel=ZONES.map(([nom])=>world.querySelector('.zone[data-z="'+nom+'"]'));
  let masque=-1;
  function majZones(p){
    let m=0;
    for(let i=0;i<ZONES.length;i++) if(p>=ZONES[i][1]&&p<=ZONES[i][2]) m|=1<<i;
    if(m===masque)return;
    masque=m;
    for(let i=0;i<zel.length;i++) if(zel[i]) zel[i].style.display=(m>>i&1)?'':'none';
  }
  majZones(0);
  animerPassants(world);
  const cam=echantillon(0); let roll=0, prevYaw=cam.yaw, capPrec=-1, hintPrec=-1;
  avancer((dt,sy)=>{
    const p=borne((sy-GEO.vTop)/GEO.vSpan,0,1);
    const proche=sy>GEO.vTop-GEO.vh*1.4 && sy<GEO.vTop+GEO.vSpan+GEO.vh*0.6;
    majZones(p);
    const c=echantillon(p);
    const k=1-Math.pow(.0012,dt);
    cam.x+=(c.x-cam.x)*k; cam.z+=(c.z-cam.z)*k; cam.yaw+=(c.yaw-cam.yaw)*k;
    const d=cam.yaw-prevYaw; prevYaw=cam.yaw;
    roll+=(borne(-d*2.6,-6,6)-roll)*Math.min(1,dt*7);
    const bob=Math.sin(p*46)*7;
    world.style.transform=`rotateZ(${roll.toFixed(2)}deg) rotateY(${cam.yaw.toFixed(2)}deg) `
      +`translate3d(${(-cam.x*K).toFixed(1)}px,${(-bob*K).toFixed(1)}px,${(-cam.z*K).toFixed(1)}px)`;
    let vu=-1; for(let i=0;i<caps.length;i++) if(p>=caps[i].a&&p<caps[i].b) vu=i;
    if(vu!==capPrec){capPrec=vu; for(let i=0;i<caps.length;i++) caps[i].el.style.opacity=i===vu?'1':'0';}
    if(bar)bar.style.width=(p*100).toFixed(1)+'%';
    const hv=p>.03?0:1;
    if(hint&&hv!==hintPrec){hintPrec=hv;hint.style.opacity=hv;hint.style.visibility=p>.12?'hidden':'visible';}
    return proche || Math.abs(c.x-cam.x)+Math.abs(c.z-cam.z)+Math.abs(c.yaw-cam.yaw)>.4 || Math.abs(roll)>.05;
  });
}

