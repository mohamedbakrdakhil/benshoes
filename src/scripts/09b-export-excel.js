/* ======================= export Excel =======================
   Un fichier .xlsx véritable, fabriqué dans le navigateur, sans bibliothèque.

   Pourquoi pas du CSV : ouvert dans Excel en configuration française, un CSV
   se répartit mal (point-virgule contre virgule), perd les accents si le BOM
   saute, et lit « 299 » comme du texte — on ne peut plus additionner la
   colonne. Un .xlsx porte ses types : une date est une date, un montant est
   un nombre. Et une cellule qui commence par « = » y reste du texte, alors
   qu'un tableur l'exécuterait depuis un CSV.

   Un .xlsx est une archive ZIP de fichiers XML. On écrit donc un ZIP sans
   compression — la méthode « rangé tel quel » — ce qui évite d'embarquer un
   compresseur pour quelques kilo-octets. */

const TABX={};

/* somme de contrôle exigée par le format ZIP */
TABX.crcTable=(()=>{const t=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  return t;})();
TABX.crc32=u=>{let c=0xFFFFFFFF;
  for(let i=0;i<u.length;i++)c=TABX.crcTable[(c^u[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;};

TABX.octets=s=>new TextEncoder().encode(s);

/* ZIP « rangé tel quel » : en-tête par fichier, puis le répertoire central */
TABX.zip=fichiers=>{
  const parts=[],central=[];let decalage=0;
  const ent=(n,v)=>{const b=new Uint8Array(n);for(let i=0;i<n;i++)b[i]=(v>>>(8*i))&0xFF;return b;};
  for(const f of fichiers){
    const nom=TABX.octets(f.nom), data=f.data, crc=TABX.crc32(data);
    const tete=[ent(4,0x04034b50),ent(2,20),ent(2,0),ent(2,0),ent(2,0),ent(2,0),
      ent(4,crc),ent(4,data.length),ent(4,data.length),ent(2,nom.length),ent(2,0),nom];
    const nTete=tete.reduce((a,x)=>a+x.length,0);
    parts.push(...tete,data);
    central.push({nom,crc,taille:data.length,decalage});
    decalage+=nTete+data.length;
  }
  const debutCentral=decalage;let tailleCentral=0;
  for(const c of central){
    const e=[ent(4,0x02014b50),ent(2,20),ent(2,20),ent(2,0),ent(2,0),ent(2,0),ent(2,0),
      ent(4,c.crc),ent(4,c.taille),ent(4,c.taille),ent(2,c.nom.length),
      ent(2,0),ent(2,0),ent(2,0),ent(2,0),ent(4,0),ent(4,c.decalage),c.nom];
    tailleCentral+=e.reduce((a,x)=>a+x.length,0);
    parts.push(...e);
  }
  parts.push(ent(4,0x06054b50),ent(2,0),ent(2,0),ent(2,central.length),ent(2,central.length),
    ent(4,tailleCentral),ent(4,debutCentral),ent(2,0));
  const total=parts.reduce((a,x)=>a+x.length,0);
  const out=new Uint8Array(total);let p=0;
  for(const x of parts){out.set(x,p);p+=x.length;}
  return out;
};

TABX.xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');

/* Excel compte les jours depuis le 30 décembre 1899 */
TABX.jour=d=>{const t=d instanceof Date?d:new Date(d);
  return isNaN(t)?null:(t.getTime()-t.getTimezoneOffset()*60000)/86400000+25569;};

TABX.colonne=n=>{let s='';n++;while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=(n-r-1)/26;}return s;};

/* Fabrique le classeur. `colonnes` : [{titre, largeur, type}] ;
   `lignes` : tableau de tableaux de valeurs brutes. */
TABX.classeur=(colonnes,lignes,nomFeuille)=>{
  const cols=colonnes.map((c,i)=>
    `<col min="${i+1}" max="${i+1}" width="${c.largeur||16}" customWidth="1"/>`).join('');
  const entete='<row r="1" s="1">'+colonnes.map((c,i)=>
    `<c r="${TABX.colonne(i)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${TABX.xml(c.titre)}</t></is></c>`).join('')+'</row>';
  const corps=lignes.map((l,n)=>{
    const r=n+2;
    const cells=l.map((v,i)=>{
      const ref=TABX.colonne(i)+r, t=colonnes[i]&&colonnes[i].type;
      if(t==='date'){const j=TABX.jour(v);
        return j===null?'':`<c r="${ref}" s="2"><v>${j}</v></c>`;}
      if(t==='nombre'){const x=Number(v);
        return Number.isFinite(x)?`<c r="${ref}" s="3"><v>${x}</v></c>`:'';}
      const s=String(v??''); if(!s)return '';
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${TABX.xml(s)}</t></is></c>`;
    }).join('');
    return `<row r="${r}">${cells}</row>`;
  }).join('');

  const feuille=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols><sheetData>${entete}${corps}</sheetData>
<autoFilter ref="A1:${TABX.colonne(colonnes.length-1)}${lignes.length+1}"/></worksheet>`;

  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm"/><numFmt numFmtId="165" formatCode="#,##0\\ &quot;DH&quot;"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F0EA"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs></styleSheet>`;

  const nom=TABX.xml((nomFeuille||'Feuille').slice(0,31));
  return TABX.zip([
    {nom:'[Content_Types].xml',data:TABX.octets(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`)},
    {nom:'_rels/.rels',data:TABX.octets(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)},
    {nom:'xl/workbook.xml',data:TABX.octets(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${nom}" sheetId="1" r:id="rId1"/></sheets></workbook>`)},
    {nom:'xl/_rels/workbook.xml.rels',data:TABX.octets(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)},
    {nom:'xl/styles.xml',data:TABX.octets(styles)},
    {nom:'xl/worksheets/sheet1.xml',data:TABX.octets(feuille)},
  ]);
};

/* Les commandes de l'espace atelier, en Excel. */
function classeurCommandes(commandes){
  const colonnes=[
    {titre:'Reçue le',largeur:18,type:'date'},
    {titre:'Référence',largeur:16},
    {titre:'Statut',largeur:12},
    {titre:'Nom',largeur:24},
    {titre:'Téléphone',largeur:16},
    {titre:'E-mail',largeur:26},
    {titre:'Adresse',largeur:32},
    {titre:'Code postal',largeur:12},
    {titre:'Ville',largeur:16},
    {titre:'Pays',largeur:12},
    {titre:'Articles',largeur:46},
    {titre:'Sous-total',largeur:13,type:'nombre'},
    {titre:'Livraison',largeur:12,type:'nombre'},
    {titre:'Total',largeur:13,type:'nombre'},
    {titre:'Note',largeur:30},
  ];
  const lignes=commandes.map(o=>[
    o.createdAt,o.ref,(STATUS[o.status]||o.status),
    o.customer.name,o.customer.phone,o.customer.email,o.customer.addr,
    o.customer.zip,o.customer.city,o.customer.country,
    o.items.map(i=>`${i.q}× ${i.name} / ${i.color} / ${i.size}`).join(' · '),
    o.sub,o.ship,o.total,o.note||'']);
  return TABX.classeur(colonnes,lignes,'Commandes');
}
