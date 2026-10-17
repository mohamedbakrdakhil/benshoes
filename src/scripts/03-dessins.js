/* ======================= illustration ======================= */
const SOLE="M100 14C136 14 168 40 172 84C176 116 166 152 156 190C148 220 142 248 142 276C142 308 146 340 146 368C146 404 128 430 100 430C72 430 54 404 54 368C54 340 58 308 58 276C58 248 52 220 44 190C34 152 24 116 28 84C32 40 64 14 100 14Z";
const WTAB=[[14,2],[40,34],[70,56],[100,68],[130,74],[160,71],[190,57],[220,51],[250,46],[280,42],[310,42],[340,44],[370,46],[400,43],[430,2]];
function halfW(y){for(let i=1;i<WTAB.length;i++){if(y<=WTAB[i][0]){const a=WTAB[i-1],b=WTAB[i];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]);}}return 3;}
let _uid=0;
function band(y,h,bow){const w=halfW(y+h/2);const x0=100-w+1,x1=100+w-1;
  return `M${x0} ${y}Q100 ${y-bow} ${x1} ${y}L${x1} ${y+h}Q100 ${y+h-bow} ${x0} ${y+h}Z`;}
function stitch(y,h,bow){return [y+3.4,y+h-3.4].map(v=>{const w=halfW(v);
  return `<path d="M${100-w+6} ${v}Q100 ${v-bow} ${100+w-6} ${v}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width=".9" stroke-dasharray="3.5 3.5"/>`;}).join('');}
function buckle(y,h,u){const w=halfW(y+h/2);const x=100-w+5;
  return `<g><rect x="${x}" y="${y-4.5}" width="17" height="${h+9}" rx="2.4" fill="url(#m${u})" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>`
   +`<rect x="${x+4.2}" y="${y+.5}" width="8.6" height="${h-1}" rx="1.2" fill="rgba(0,0,0,.4)"/>`
   +`<rect x="${x+7.6}" y="${y-8}" width="2.2" height="${h+16}" rx="1.1" fill="url(#m${u})" stroke="rgba(0,0,0,.35)" stroke-width=".45"/>`
   +`<circle cx="${x+8.7}" cy="${y-7}" r="1.9" fill="url(#m${u})" stroke="rgba(0,0,0,.35)" stroke-width=".45"/></g>`;}
function strapOf(st,u,col){
  // la bride « penny » qui traverse le cou-de-pied, variable selon le modèle
  const L=`url(#l${u})`, S='stroke="rgba(0,0,0,.34)" stroke-width="1"';
  if(st==='plain')   // bande pleine
    return `<path d="M50 138H150V176H50Z" fill="${L}" ${S}/>`
      +`<path d="M54 144H146M54 170H146" stroke="rgba(255,255,255,.22)" stroke-width="1" stroke-dasharray="4 4"/>`;
  if(st==='western') // bande surpiquée, bord dentelé
    return `<path d="M48 134H152V180H48Z" fill="${L}" ${S}/>`
      +`<path d="M48 157H152" stroke="rgba(0,0,0,.3)" stroke-width="1.4"/>`
      +`<path d="M52 140H148M52 174H148" stroke="rgba(255,255,255,.26)" stroke-width="1" stroke-dasharray="3 3"/>`
      +`<path d="M62 146l6 8-6 8M138 146l-6 8 6 8" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.2"/>`;
  // penny : bande ajourée d'une découpe en accolade
  return `<path d="M50 136H150V178H50Z" fill="${L}" ${S}/>`
    +`<path d="M74 150h14l6 6 6-6h14l6 7-6 7h-14l-6-6-6 6H74l-6-7Z" fill="rgba(0,0,0,.42)"/>`
    +`<path d="M54 142H146M54 172H146" stroke="rgba(255,255,255,.24)" stroke-width="1" stroke-dasharray="4 4"/>`
    +`<path d="M58 136v42M142 136v42" stroke="rgba(0,0,0,.28)" stroke-width="1"/>`;
}
function mule(st,colorKey,u,lite){
  const col=COLORS[colorKey]||COLORS.noir;
  // tige : contour avant du chausson, évidé de l'ouverture où entre le pied
  const TIGE="M58 292C50 244 32 172 34 118C38 58 66 22 100 22C134 22 162 58 166 118"
    +"C168 172 150 244 142 292C120 304 80 304 58 292Z"
    +"M100 72C127 72 137 102 135 150C133 212 123 266 100 270C77 266 67 212 65 150C63 102 73 72 100 72Z";
  let s=`<g><path d="M100 76C125 76 134 104 132 150C130 208 121 262 100 266C79 262 70 208 68 150C66 104 75 76 100 76Z" fill="url(#d${u})"/>`
    +`<path d="${TIGE}" fill="url(#l${u})" fill-rule="evenodd" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
  if(!lite) s+=`<path d="M62 286C54 240 38 170 40 120C44 64 70 29 100 29C130 29 156 64 160 120C162 170 146 240 138 286" fill="none" stroke="rgba(255,255,255,.26)" stroke-width="1" stroke-dasharray="5 5"/>`
    +`<path d="M100 79C123 79 131 105 129 150C127 206 119 259 100 263C81 259 73 206 71 150C69 105 77 79 100 79Z" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1" stroke-dasharray="4 4"/>`;
  return s+strapOf(st,u,col)+`</g>`;
}
function sandal(st,colorKey,platform,lite){
  const u=++_uid, col=COLORS[colorKey]||COLORS.noir;
  const lift=platform?14:9;
  let s=`<svg viewBox="-6 0 212 478" role="img" aria-label="Mocassin Benkashoes, ${col.n}"><defs>`
   +`<linearGradient id="l${u}" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${col.c}"/><stop offset="1" stop-color="${col.d}"/></linearGradient>`
   +`<linearGradient id="d${u}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#c9ab7d"/><stop offset="1" stop-color="#a98a5e"/></linearGradient>`
   +`<linearGradient id="k${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f6a3a"/><stop offset=".45" stop-color="#bb9358"/><stop offset="1" stop-color="#7e5c30"/></linearGradient>`
   +`<linearGradient id="b${u}" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#d9bf95"/><stop offset=".55" stop-color="#c7a675"/><stop offset="1" stop-color="#b08f5c"/></linearGradient>`
   +`<clipPath id="sc${u}"><path d="${SOLE}"/></clipPath></defs>`
   +`<ellipse cx="100" cy="${450+lift}" rx="64" ry="11" fill="rgba(30,16,8,.22)"/>`
   +`<path d="${SOLE}" transform="translate(-4.6,${lift+2.5}) scale(1.046)" fill="#2a2420"/>`;
  for(let i=2;i>=1;i--) s+=`<path d="${SOLE}" transform="translate(${(-3.4*i/2).toFixed(2)},${(lift*i/2-2.6*i/2).toFixed(2)}) scale(${(1+.034*i/2).toFixed(3)})" fill="url(#k${u})" stroke="rgba(40,26,8,.34)" stroke-width=".7"/>`;
  // première de propreté en mousse, visible derrière la tige
  s+=`<path d="${SOLE}" fill="url(#b${u})"/><g clip-path="url(#sc${u})">`;
  if(!lite){
    [.86,.7,.54,.38].forEach(k=>{s+=`<path d="${SOLE}" transform="translate(100,222) scale(${k}) translate(-100,-222)" fill="none" stroke="rgba(92,62,24,.14)" stroke-width="1"/>`;});
    s+=`<g transform="translate(100,344)" opacity=".5"><text text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" font-size="21" fill="#4a3312" letter-spacing="-.5">benka</text>`
      +`<g fill="#4a3312"><ellipse cx="36" cy="-14" rx="4.6" ry="6"/><circle cx="42" cy="-22" r="2"/><circle cx="46.5" cy="-26.5" r="1.6"/><circle cx="50" cy="-30.5" r="1.2"/></g></g>`;
  }
  s+=`<path d="M58 316Q100 294 142 316Q147 382 100 398Q53 382 58 316Z" fill="rgba(70,46,16,.12)"/></g>`
   +`<path d="${SOLE}" fill="none" stroke="rgba(62,42,16,.32)" stroke-width="1.2"/>`
   +mule(st,colorKey,u,lite)+`</svg>`;
  return s;
}
function anatomySVG(){
  const g=(y,c,h,lab)=>`<rect x="34" y="${y}" width="214" height="${h}" rx="3" fill="${c}" stroke="rgba(0,0,0,.2)"/>`;
  return `<svg viewBox="0 0 330 250" role="img" aria-label="Coupe d'une mule Benkashoes, quatre pièces">
  <defs><linearGradient id="ck" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b2844a"/><stop offset=".5" stop-color="#cfa56a"/><stop offset="1" stop-color="#a87b40"/></linearGradient></defs>
  <path d="M34 44Q90 20 150 30Q210 40 248 34" fill="none" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="3 4"/>
  <text x="34" y="16" font-family="Archivo, sans-serif" font-size="9" letter-spacing="1.6" fill="var(--fg-soft)">COUPE LONGITUDINALE · POINTURE 40</text>
  ${g(34,'#c9a977',13)}${g(47,'url(#ck)',26)}${g(73,'#bba77e',8)}${g(81,'#36332f',14)}
  <path d="M34 34h214" stroke="rgba(255,255,255,.4)"/>
  <path d="M248 34v61" stroke="var(--line-2)"/><path d="M34 34v61" stroke="var(--line-2)"/>
  ${[[40,'01'],[60,'02'],[77,'03'],[88,'04']].map(([y,n])=>`<g><circle cx="268" cy="${y}" r="9" fill="var(--bg)" stroke="var(--accent)"/><text x="268" y="${y+3.2}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" font-size="8" fill="var(--accent-text)">${n}</text><path d="M252 ${y}h7" stroke="var(--accent)"/></g>`).join('')}
  <g font-family="Archivo, sans-serif" font-size="8.5" fill="var(--fg-soft)" letter-spacing=".6">
  <path d="M34 112h214" stroke="var(--line-2)"/><text x="34" y="126">AVANT-PIED</text><text x="118" y="126">COU-DE-PIED</text><text x="210" y="126">TALON OUVERT</text>
  <path d="M100 100v18" stroke="var(--line-2)" stroke-dasharray="2 3"/><path d="M196 100v18" stroke="var(--line-2)" stroke-dasharray="2 3"/></g>
  <g transform="translate(34,150)">
    <text font-family="Archivo, sans-serif" font-size="9" letter-spacing="1.6" fill="var(--fg-soft)">ÉPAISSEURS</text>
    ${[['Tige en daim','1,6 mm'],['Doublure cuir','0,8 mm'],['Première mousse','6 mm'],['Semelle EVA','9 mm']].map((r,i)=>
      `<g transform="translate(0,${18+i*18})"><rect width="214" height="1" y="13" fill="var(--line)"/><text font-family="Newsreader, serif" font-size="11.5" fill="var(--fg)">${r[0]}</text><text x="214" text-anchor="end" font-family="Archivo, sans-serif" font-weight="600" font-size="10.5" fill="var(--accent-text)">${r[1]}</text></g>`).join('')}
  </g></svg>`;
}

