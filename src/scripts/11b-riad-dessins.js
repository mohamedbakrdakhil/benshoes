/* Généré par tools/generer-riad.cjs. Les dessins sources vivent dans
   tools/riad-dessins.cjs. Une URL par décor permet le partage du décodage
   et du cache entre toutes ses occurrences, sans SVG répétés dans le DOM. */
const RIAD_ARTWORK={"portail":{"src":"assets/visite/riad/portail.6a4e2420bd8e.svg","w":1000,"h":1200},"niche":{"src":"assets/visite/riad/niche.41f59ae88395.svg","w":230,"h":420},"frise":{"src":"assets/visite/riad/frise.db97f022ec65.svg","w":1000,"h":160},"lanterne":{"src":"assets/visite/riad/lanterne.5682ee7ba713.svg","w":180,"h":420},"fontaine":{"src":"assets/visite/riad/fontaine.95d1d8cc0946.svg","w":500,"h":500},"moucharabieh":{"src":"assets/visite/riad/moucharabieh.b9ed71ebd119.svg","w":400,"h":600},"rosace":{"src":"assets/visite/riad/rosace.a438928a67a3.svg","w":400,"h":400}};
function riadImage(nom){
  const a=RIAD_ARTWORK[nom];
  return `<img class="riad-svg" src="${a.src}" width="${a.w}" height="${a.h}" alt="" aria-hidden="true" draggable="false" decoding="async" fetchpriority="low">`;
}
function riadPortalSVG(){return riadImage('portail');}
function riadNicheSVG(){return riadImage('niche');}
function riadFriezeSVG(){return riadImage('frise');}
function riadLanternSVG(){return riadImage('lanterne');}
function riadFountainSVG(){return riadImage('fontaine');}
function riadScreenSVG(){return riadImage('moucharabieh');}
function riadMedallionSVG(){return riadImage('rosace');}
