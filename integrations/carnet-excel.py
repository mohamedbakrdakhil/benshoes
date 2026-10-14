# -*- coding: utf-8 -*-
"""Fabrique le carnet de commandes Benkashoes au format Excel.

Quatre feuilles : un tableau de bord qui se calcule tout seul, le journal des
commandes, le catalogue et le stock. Les colonnes du journal sont exactement
celles que le site et le script du tableur produisent : on peut y coller une
exportation sans rien réaligner.

Écrit sans bibliothèque — un .xlsx est une archive de fichiers XML.

    python3 carnet-excel.py [chemin-de-sortie.xlsx]
"""
import datetime, sys, zipfile

LIGNES_UTILES = 500          # lignes préparées dans le journal
ACCENT, SABLE, ARDOISE = 'FF8C1F14', 'FFF3F0EA', 'FF6F5650'

def x(v):
    s = '' if v is None else str(v)
    for a, b in (('&','&amp;'),('<','&lt;'),('>','&gt;'),('"','&quot;'),("'",'&apos;')):
        s = s.replace(a, b)
    return ''.join(c for c in s if c >= ' ' or c in '\t\n')

def col(n):
    s = ''; n += 1
    while n: n, r = divmod(n - 1, 26); s = chr(65 + r) + s
    return s

def jour(d):
    return (d - datetime.datetime(1899, 12, 30)).total_seconds() / 86400

# ─────────── styles ───────────
# 0 normal · 1 titre · 2 en-tête · 3 date · 4 montant · 5 intitulé
# 6 grand nombre · 7 discret · 8 entier · 9 sous-titre
STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm"/>
<numFmt numFmtId="165" formatCode="#,##0\\ &quot;DH&quot;"/>
<numFmt numFmtId="166" formatCode="#,##0"/></numFmts>
<fonts count="7">
<font><sz val="11"/><color rgb="FF1C0D09"/><name val="Calibri"/></font>
<font><b/><sz val="18"/><color rgb="%(A)s"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF1C0D09"/><name val="Calibri"/></font>
<font><b/><sz val="22"/><color rgb="FF1C0D09"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="%(S)s"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="%(A)s"/><name val="Calibri"/></font></fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="%(A)s"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="%(B)s"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFECDCD6"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="165" fontId="4" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="166" fontId="4" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="6" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs></styleSheet>""" % {'A': ACCENT, 'B': SABLE, 'S': ARDOISE}

def cellule(ref, v, style=0, formule=None):
    s = f' s="{style}"' if style else ''
    if formule is not None:
        return f'<c r="{ref}"{s}><f>{x(formule)}</f><v>{x(v) if v is not None else 0}</v></c>'
    if v is None or v == '':
        return f'<c r="{ref}"{s}/>' if style else ''
    if isinstance(v, datetime.datetime):
        return f'<c r="{ref}"{s}><v>{jour(v):.6f}</v></c>'
    if isinstance(v, (int, float)):
        return f'<c r="{ref}"{s}><v>{v}</v></c>'
    return f'<c r="{ref}"{s} t="inlineStr"><is><t xml:space="preserve">{x(v)}</t></is></c>'

def feuille(lignes, largeurs=None, fige=None, filtre=None, validations=(), hauteurs=None):
    cols = ''.join(f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>'
                   for i, w in enumerate(largeurs or []))
    out = []
    for n, cells in lignes:
        h = f' ht="{hauteurs[n]}" customHeight="1"' if hauteurs and n in hauteurs else ''
        corps = ''.join(cells)
        if corps or h: out.append(f'<row r="{n}"{h}>{corps}</row>')
    vues = ('<sheetView showGridLines="0" workbookViewId="0">'
            + (f'<pane ySplit="{fige}" topLeftCell="A{fige+1}" activePane="bottomLeft" state="frozen"/>' if fige else '')
            + '</sheetView>')
    val = ''
    if validations:
        val = f'<dataValidations count="{len(validations)}">' + ''.join(
            f'<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"'
            f' sqref="{z}"><formula1>"{c}"</formula1></dataValidation>' for z, c in validations
        ) + '</dataValidations>'
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f'<sheetViews>{vues}</sheetViews>'
            + (f'<cols>{cols}</cols>' if cols else '')
            + f'<sheetData>{"".join(out)}</sheetData>'
            + (f'<autoFilter ref="{filtre}"/>' if filtre else '')
            + val + '</worksheet>')

# ─────────── les quatre feuilles ───────────

CATALOGUE = [
    ('Opus',    299, 'Mocassin-mule à bride penny',
     ['beige','gris','marine','rose','marron','tabac','noir']),
    ('Stepy',   259, 'Mocassin-mule à bande pleine',
     ['beige','noir','marron','gris','marine']),
    ('Western', 359, 'Mocassin-mule à bride large crantée', ['noir']),
]
COLORIS = {'noir':'Noir','beige':'Beige','marron':'Marron','taupe':'Marron taupe',
           'tabac':'Tabac','rose':'Rose','gris':'Gris','marine':'Marine'}
POINTURES = [37, 38, 39, 40, 41]
STATUTS = 'Nouvelle,Confirmée,Expédiée,Livrée,Annulée'
P = LIGNES_UTILES + 1                       # dernière ligne du journal

def f_journal():
    titres = ['Reçue le','Référence','Statut','Nom','Téléphone','E-mail','Adresse',
              'Code postal','Ville','Pays','Articles','Sous-total','Livraison',
              'Total','Devise','Note','Payée','Suivi']
    lignes = [(1, [cellule(col(i)+'1', t, 2) for i, t in enumerate(titres)])]
    # on pré-formate 200 lignes : la date et les montants s'affichent bien dès la saisie
    for n in range(2, 202):
        cs = [cellule('A%d' % n, '', 3)]
        cs += [cellule('%s%d' % (c, n), '', 4) for c in ('L', 'M', 'N')]
        lignes.append((n, cs))
    return feuille(lignes,
        largeurs=[17,15,12,24,15,26,32,11,15,10,42,12,11,12,8,28,9,24],
        fige=1, filtre='A1:R%d' % P,
        validations=[('C2:C%d' % P, STATUTS), ('Q2:Q%d' % P, 'Oui,Non')],
        hauteurs={1: 22})

def f_bord():
    J = 'Commandes!'
    plage = lambda c: f'{J}${c}$2:${c}${P}'
    L, n = [], 1
    def ligne(cells, h=None):
        nonlocal n
        L.append((n, cells)); n += 1
        return n - 1
    ligne([cellule('A1', 'benka — carnet de commandes', 1)], )
    ligne([cellule('A2', 'Tout se calcule depuis la feuille « Commandes ». Saisissez-y vos ventes, ou collez une exportation du site.', 7)])
    ligne([])
    ligne([cellule('A4', "D'un coup d'œil", 9), cellule('B4', '', 9), cellule('C4', '', 9), cellule('D4', '', 9)])
    ligne([cellule('A5', 'Commandes reçues', 5),
           cellule('B5', 0, 8, f'COUNTA({plage("B")})')])
    ligne([cellule('A6', 'À traiter', 5),
           cellule('B6', 0, 8, f'COUNTIF({plage("C")},"Nouvelle")+COUNTIF({plage("C")},"Confirmée")')])
    ligne([cellule('A7', "Chiffre d'affaires", 5),
           cellule('B7', 0, 6, f'SUMIF({plage("C")},"<>Annulée",{plage("N")})')])
    ligne([cellule('A8', 'Panier moyen', 5),
           cellule('B8', 0, 6, f'IFERROR(SUMIF({plage("C")},"<>Annulée",{plage("N")})/MAX(1,COUNTA({plage("B")})-COUNTIF({plage("C")},"Annulée")),0)')])
    ligne([cellule('A9', 'Reste à encaisser', 5),
           cellule('B9', 0, 6, f'SUMIFS({plage("N")},{plage("Q")},"Non",{plage("C")},"<>Annulée")')])
    ligne([])
    ligne([cellule('A11', 'Par statut', 9), cellule('B11', 'Commandes', 9),
           cellule('C11', 'Montant', 9), cellule('D11', '', 9)])
    for i, st in enumerate(STATUTS.split(',')):
        r = 12 + i
        ligne([cellule(f'A{r}', st, 5),
               cellule(f'B{r}', 0, 8, f'COUNTIF({plage("C")},"{st}")'),
               cellule(f'C{r}', 0, 4, f'SUMIF({plage("C")},"{st}",{plage("N")})')])
    ligne([])
    ligne([cellule('A18', 'Par modèle', 9), cellule('B18', 'Commandes', 9),
           cellule('C18', 'Prix unitaire', 9), cellule('D18', '', 9)])
    for i, (nom, prix, _, _) in enumerate(CATALOGUE):
        r = 19 + i
        ligne([cellule(f'A{r}', nom, 5),
               cellule(f'B{r}', 0, 8, f'COUNTIF({plage("K")},"*{nom}*")'),
               cellule(f'C{r}', prix, 4)])
    ligne([])
    ligne([cellule('A23', 'Comment s’en servir', 9), cellule('B23', '', 9), cellule('C23', '', 9), cellule('D23', '', 9)])
    aide = [
        "Une commande arrive : ajoutez une ligne dans « Commandes ». Les chiffres ci-dessus suivent tout seuls.",
        "La colonne Statut et la colonne Payée se choisissent dans une liste déroulante.",
        "Depuis le site : espace commandes → Exporter Excel, puis copiez les lignes sous l’en-tête.",
        "Les colonnes A à P sont exactement celles du site. Q et R sont à vous.",
    ]
    for i, t in enumerate(aide):
        ligne([cellule(f'A{24+i}', '· ' + t, 7)])
    return feuille(L, largeurs=[34, 16, 16, 16], hauteurs={1: 30, 2: 18})

def f_catalogue():
    L = [(1, [cellule('A1', 'Modèle', 2), cellule('B1', 'Description', 2),
              cellule('C1', 'Prix', 2), cellule('D1', 'Coloris', 2),
              cellule('E1', 'Pointures', 2)])]
    for i, (nom, prix, desc, cols) in enumerate(CATALOGUE):
        r = 2 + i
        L.append((r, [cellule(f'A{r}', nom), cellule(f'B{r}', desc),
                      cellule(f'C{r}', prix, 4),
                      cellule(f'D{r}', ', '.join(COLORIS[c] for c in cols)),
                      cellule(f'E{r}', ' · '.join(str(p) for p in POINTURES))]))
    r = len(CATALOGUE) + 3
    L.append((r, [cellule(f'A{r}', 'Livraison', 5), cellule(f'B{r}', 'Offerte dès 400 DH, sinon'),
                  cellule(f'C{r}', 35, 4)]))
    L.append((r + 1, [cellule(f'A{r+1}',
        'Si vous changez un prix ici, changez-le aussi sur le site (src/scripts/02-catalogue.js) et dans integrations/tableur.gs.', 7)]))
    return feuille(L, largeurs=[14, 36, 10, 46, 20], fige=1, hauteurs={1: 22})

def f_stock():
    L = [(1, [cellule('A1', 'Modèle', 2)]
             + [cellule(col(1+i)+'1', 'P. %d' % p, 2) for i, p in enumerate(POINTURES)]
             + [cellule(col(1+len(POINTURES))+'1', 'Total', 2)])]
    for i, (nom, _, _, _) in enumerate(CATALOGUE):
        r = 2 + i
        cs = [cellule(f'A{r}', nom)]
        cs += [cellule(col(1+k)+str(r), 0, 8) for k in range(len(POINTURES))]
        d, f = col(1), col(len(POINTURES))
        cs.append(cellule(col(1+len(POINTURES))+str(r), 0, 8, f'SUM({d}{r}:{f}{r})'))
        L.append((r, cs))
    r = len(CATALOGUE) + 2
    cs = [cellule(f'A{r}', 'Total', 5)]
    for k in range(len(POINTURES) + 1):
        c = col(1 + k)
        cs.append(cellule(f'{c}{r}', 0, 8, f'SUM({c}2:{c}{r-1})'))
    L.append((r, cs))
    L.append((r + 2, [cellule(f'A{r+2}', 'Paires disponibles, par modèle et par pointure. À tenir à jour à la main.', 7)]))
    return feuille(L, largeurs=[16] + [9] * len(POINTURES) + [10], fige=1, hauteurs={1: 22})

# ─────────── assemblage ───────────

FEUILLES = [('Tableau de bord', f_bord), ('Commandes', f_journal),
            ('Catalogue', f_catalogue), ('Stock', f_stock)]

def construire(chemin):
    n = len(FEUILLES)
    onglets = ''.join(f'<sheet name="{x(nom)}" sheetId="{i+1}" r:id="rId{i+1}"/>'
                      for i, (nom, _) in enumerate(FEUILLES))
    classeur = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
        ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets>{onglets}</sheets>'
        # recalcul à l'ouverture : les formules n'ont pas de valeur mise en cache
        '<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + ''.join(f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/'
                  f'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i+1}.xml"/>'
                  for i in range(n))
        + f'<Relationship Id="rId{n+1}" Type="http://schemas.openxmlformats.org/'
          'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-'
        'officedocument.spreadsheetml.sheet.main+xml"/>'
        + ''.join(f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" ContentType="application/'
                  'vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(n))
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-'
          'officedocument.spreadsheetml.styles+xml"/></Types>')
    racine = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/'
        'relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')

    with zipfile.ZipFile(chemin, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', types)
        z.writestr('_rels/.rels', racine)
        z.writestr('xl/workbook.xml', classeur)
        z.writestr('xl/_rels/workbook.xml.rels', rels)
        z.writestr('xl/styles.xml', STYLES)
        for i, (_, faire) in enumerate(FEUILLES):
            z.writestr(f'xl/worksheets/sheet{i+1}.xml', faire())
    return chemin

if __name__ == '__main__':
    sortie = sys.argv[1] if len(sys.argv) > 1 else 'benkashoes-carnet.xlsx'
    construire(sortie)
    import os
    print('%s — %.1f Ko · %d feuilles' % (sortie, os.path.getsize(sortie)/1024, len(FEUILLES)))
