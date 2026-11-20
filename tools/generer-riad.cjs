/* Décors statiques du riad : une image réutilisable remplace les centaines
   de nœuds SVG dupliqués dans chaque portail, lanterne et frise. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dessins=require('./riad-dessins.cjs');
const root=path.resolve(__dirname,'..');
const dossier=path.join(root,'assets/visite/riad');
const elements=[
  ['portail','riadPortalSVG',1000,1200],
  ['niche','riadNicheSVG',230,420],
  ['frise','riadFriezeSVG',1000,160],
  ['lanterne','riadLanternSVG',180,420],
  ['fontaine','riadFountainSVG',500,500],
  ['moucharabieh','riadScreenSVG',400,600],
  ['rosace','riadMedallionSVG',400,400]
];
fs.mkdirSync(dossier,{recursive:true});
const manifeste={};
let poids=0;
for(const [nom,fonction,w,h] of elements){
  // Une image SVG externe doit avoir une taille intrinsèque, indépendante
  // de son parent (les zones 3D sont parfois display:none au chargement).
  const svg=dessins[fonction]().replace('width="100%" height="100%"',`width="${w}" height="${h}"`);
  const empreinte=crypto.createHash('sha256').update(svg).digest('hex').slice(0,12);
  const fichier=`${nom}.${empreinte}.svg`;
  fs.writeFileSync(path.join(dossier,fichier),svg+'\n');
  manifeste[nom]={src:`assets/visite/riad/${fichier}`,w,h};
  poids+=Buffer.byteLength(svg);
}
// Le module livré ne contient plus les générateurs ni leurs boucles.
const moduleClient=`/* Généré par tools/generer-riad.cjs. Les dessins sources vivent dans
   tools/riad-dessins.cjs. Une URL par décor permet le partage du décodage
   et du cache entre toutes ses occurrences, sans SVG répétés dans le DOM. */
const RIAD_ARTWORK=${JSON.stringify(manifeste)};
function riadImage(nom){
  const a=RIAD_ARTWORK[nom];
  return \`<img class="riad-svg" src="\${a.src}" width="\${a.w}" height="\${a.h}" alt="" aria-hidden="true" draggable="false" decoding="async" fetchpriority="low">\`;
}
`+elements.map(([nom,fonction])=>`function ${fonction}(){return riadImage('${nom}');}`).join('\n')+'\n';
fs.writeFileSync(path.join(root,'src/scripts/11b-riad-dessins.js'),moduleClient);
console.log(`  décors du riad     ${elements.length} SVG partagés, ${Math.round(poids/1024)} Ko hors du JavaScript`);
