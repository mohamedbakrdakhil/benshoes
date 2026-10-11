# -*- coding: utf-8 -*-
"""Allège le fichier livré, sans toucher aux sources.

Trois traitements, chacun choisi pour ne rien pouvoir casser :

CSS   — commentaires retirés, espaces resserrés autour des délimiteurs. Sûr :
        la feuille ne contient ni « white-space:pre », ni url(data:), et tous
        les content:"" sont vides, donc aucune espace n'est signifiante.

JS    — seules les lignes entièrement en commentaire disparaissent, ainsi que
        les lignes vides. L'indentation reste : elle ne pèse presque rien une
        fois compressée, et la retirer modifierait le HTML produit par les
        gabarits. Les lignes contenant une apostrophe inverse ou « http » sont
        épargnées, pour ne jamais confondre un commentaire avec du texte.

HTML  — l'indentation de début de ligne part, mais jamais le retour à la
        ligne : entre deux éléments en ligne, ce retour vaut une espace et la
        supprimer déplacerait le texte.

Appelé par build.sh sur le fichier construit, jamais sur src/.
"""
import io,re,sys

def css(t):
    t=re.sub(r'/\*.*?\*/','',t,flags=re.S)
    t=re.sub(r'\s+',' ',t)
    t=re.sub(r'\s*([{};,])\s*',r'\1',t)
    t=re.sub(r';}','}',t)
    return t.strip()

def js(t):
    sortie=[]; bloc=False
    for l in t.split('\n'):
        d=l.strip()
        if bloc:
            if '*/' in d:
                bloc=False
                reste=d.split('*/',1)[1].strip()
                if reste: sortie.append(reste)
            continue
        if not d: continue
        if d.startswith('/*'):
            if '*/' in d:
                reste=d.split('*/',1)[1].strip()
                if reste: sortie.append(l)
                continue
            bloc=True; continue
        if d.startswith('//') and '`' not in d and 'http' not in d: continue
        sortie.append(l)
    return '\n'.join(sortie)

def html(t):
    t=re.sub(r'<!--(?!\[if).*?-->','',t,flags=re.S)
    return '\n'.join(l.lstrip() for l in t.split('\n') if l.strip())

def main(chemin):
    h=io.open(chemin,encoding='utf-8').read()
    avant=len(h.encode())
    # on isole les blocs pour les traiter chacun selon sa nature
    morceaux=[]; i=0
    for m in re.finditer(r'(<style>)(.*?)(</style>)|(<script(?![^>]*\bsrc=)[^>]*>)(.*?)(</script>)',h,re.S):
        morceaux.append(('html',h[i:m.start()]))
        if m.group(1): morceaux.append(('css',m.group(1),m.group(2),m.group(3)))
        else:
            t=m.group(4)
            morceaux.append(('json' if 'ld+json' in t else 'js', t, m.group(5), m.group(6)))
        i=m.end()
    morceaux.append(('html',h[i:]))
    out=[]
    for p in morceaux:
        if p[0]=='html': out.append(html(p[1]))
        elif p[0]=='css':  out.append(p[1]+css(p[2])+p[3])
        elif p[0]=='json': out.append(p[1]+re.sub(r'\s*\n\s*','',p[2])+p[3])
        else:              out.append(p[1]+js(p[2])+p[3])
    r='\n'.join(x for x in out if x)
    io.open(chemin,'w',encoding='utf-8').write(r)
    apres=len(r.encode())
    print('  allègement           %d → %d Ko (−%d %%)'
          % (avant/1024, apres/1024, round((avant-apres)/avant*100)))

if __name__=='__main__': main(sys.argv[1])
