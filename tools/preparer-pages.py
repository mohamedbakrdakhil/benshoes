"""Génère de vraies pages : seul le contenu de la route est livré dans son HTML."""
from pathlib import Path
import copy
import html
import json
import re
import subprocess
import sys
import datetime
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from minifier import main as minifier

PAGES={
 'home':('','Benka Shoes — L’allure prend forme à Fès','Découvrez la maison Benka : mocassins-mules, daim et savoir-faire à Fès. Explorez les collections Opus et AS by BENKA, et notre showroom virtuel.'),
 'collection':('collection/','Collection — Opus & AS by BENKA | Benka Shoes','Choisissez Opus ou AS by BENKA. Black Friday : 3 Opus à 699 DH, trio mixte à 749 DH, 3 AS à 799 DH. Livraison offerte au Maroc.'),
 'showroom':('showroom/','Le showroom — Le riad Benka | Benka Shoes','Entrez dans le riad virtuel Benka. Architecture inspirée de Fès, zellige, cèdre et collection dans une visite immersive à votre rythme.'),
 'maison':('maison/','La maison — Notre atelier à Fès | Benka Shoes','Les matières et les gestes de l’atelier Benka : découvrez le daim, la coupe, le montage et les détails de nos mocassins-mules.'),
 'aide':('aide/','Aide — Pointures, livraison & commandes | Benka Shoes','Trouvez votre pointure du 37 au 41, les informations de livraison et les réponses aux questions sur votre commande Benka.')
}

def absolute_assets(content):
    return re.sub(r'(?<![/\w-])assets/', '/assets/', content)

def schema_for(source,route,url,title,description):
    graph=[]
    for item in source.get('@graph',[]):
        typ=item.get('@type')
        if typ=='Product' and route!='collection':continue
        if typ=='FAQPage' and route!='aide':continue
        graph.append(copy.deepcopy(item))
    page_id=url+'#page'
    graph.append({'@type':'WebPage','@id':page_id,'url':url,'name':title,'description':description,'inLanguage':'fr','isPartOf':{'@id':sys.argv[1].rstrip('/')+'/#site'}})
    if route!='home':graph.append({'@type':'BreadcrumbList','@id':url+'#fil','itemListElement':[{'@type':'ListItem','position':1,'name':'Accueil','item':sys.argv[1]},{'@type':'ListItem','position':2,'name':{'collection':'Collection','showroom':'Showroom','maison':'La maison','aide':'Aide'}[route],'item':url}]})
    return json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False,separators=(',',':'))

def main():
    origin=sys.argv[1].rstrip('/')+'/'
    template=Path('index.html').read_text()
    assert '@@PAGE@@' in template and '@@ROUTE@@' in template
    seo=json.loads(Path('.build/seo.json').read_text())
    for route,(path,title,desc) in PAGES.items():
        body=Path('src/pages/'+route+'.html').read_text()
        body=body.replace('@@CATALOGUE@@',Path('.build/catalogue-repli.html').read_text())
        page=template.replace('@@PAGE@@',body).replace('@@ROUTE@@',route)
        page=re.sub(r'<title>.*?</title>','<title>'+html.escape(title)+'</title>',page,count=1)
        for key,val in [('name="description"',desc),('property="og:title"',title),('name="twitter:title"',title),('property="og:description"',desc),('name="twitter:description"',desc),('property="og:url"',origin+path)]:
            page=re.sub(r'(<meta '+key+r' content=")[^"]*(")',lambda m:m[1]+html.escape(val,quote=True)+m[2],page,count=1)
        page=re.sub(r'<link rel="canonical" href="[^"]*">','<link rel="canonical" href="'+origin+path+'">',page,count=1)
        page=re.sub(r'<script type="application/ld\+json">.*?</script>',lambda m:'<script type="application/ld+json">'+schema_for(seo,route,origin+path,title,desc)+'</script>',page,count=1,flags=re.S)
        page=re.sub(r'<link rel="preload" as="image"[^>]*>','',page)
        # The priority image is already explicit in each page; no obsolete preload.
        page=absolute_assets(page)
        out=Path(path)/'index.html';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(page)
        minifier(str(out))
        subprocess.run([sys.executable,'csp.py',str(out)],check=True,stdout=subprocess.DEVNULL)
        public=Path('public')/path/'index.html';public.parent.mkdir(parents=True,exist_ok=True)
        public.write_text(out.read_text().replace('<meta name="referrer"','<meta name="benka-api" content="oui">\n<meta name="referrer"',1))
        print('  page '+(path or '/')+' : '+str(out.stat().st_size//1024)+' Ko')
    today=datetime.date.today().isoformat()
    entries=''.join('<url><loc>'+origin+path+'</loc><lastmod>'+today+'</lastmod></url>' for path,_,_ in PAGES.values())
    Path('sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries+'</urlset>\n')

if __name__=='__main__':main()
