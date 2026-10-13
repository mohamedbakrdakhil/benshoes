#!/bin/sh
# Assemble le site à partir des modules de src/ :
#
#   src/styles/*.css   feuilles de style, dans l'ordre des numéros
#   src/page.html      le balisage
#   src/scripts/*.js   le code, dans l'ordre des numéros
#
# Sorties :
#   index.html         racine du dépôt, servie par GitHub Pages
#   public/index.html  servie par server.js (porte le repère d'API)
#   .build/corps.html  le même contenu sans en-tête, pour l'artefact Claude
#
# SITE_URL fixe l'adresse canonique :
#   SITE_URL=https://exemple.test/ ./build.sh
#
# GOOGLE_VERIF pose la balise de propriété de la Search Console :
#   GOOGLE_VERIF=le-jeton-donné-par-google ./build.sh
# (la vérification par enregistrement DNS TXT chez l'hébergeur est préférable :
#  elle couvre le domaine entier et ne dépend pas d'un fichier de la page.)
set -e
cd "$(dirname "$0")"
URL="${SITE_URL:-https://www.benkashoes.ma/}"
TITRE="Benkashoes — mocassins-mules en daim, atelier marocain"
DESC="Benkashoes — mocassins-mules en daim de veau, première en liège estampée, doublure cuir pleine fleur. Trois modèles, huit coloris, pointures 37 à 41. Livraison au Maroc, offerte dès 400 DH, ressemelage en atelier."
PARTAGE="assets/marque/partage-1200x630.jpg"
if [ -n "${GOOGLE_VERIF:-}" ]; then
  VERIF="<meta name=\"google-site-verification\" content=\"$GOOGLE_VERIF\">
"
else
  VERIF=""
fi
mkdir -p public .build

# ---------- 0. les données structurées, tirées du catalogue ----------
# Avant tout le reste : le graphe part dans l'en-tête de la page.
if command -v python3 >/dev/null 2>&1 && python3 seo.py "$DESC"; then
  SEO="$(cat .build/seo.json)"
else
  SEO='{"@context":"https://schema.org","@type":"ShoeStore","name":"Benkashoes","url":"'"$URL"'"}'
fi

# ---------- 1. concaténation des modules ----------
cat src/styles/*.css  > .build/site.css
cat src/scripts/*.js  > .build/site.js
printf '  %-18s %s modules, %s Ko\n' "styles" "$(ls src/styles | wc -l | tr -d ' ')" "$(( $(wc -c < .build/site.css) / 1024 ))"
printf '  %-18s %s modules, %s Ko\n' "scripts" "$(ls src/scripts | wc -l | tr -d ' ')" "$(( $(wc -c < .build/site.js) / 1024 ))"

# ---------- 2. le corps, commun à toutes les sorties ----------
# Le corps ne porte pas de titre : la page complète met le titre long dans
# l'en-tête, et l'artefact Claude ajoute le sien devant.
{
  printf '<style>\n'; cat .build/site.css; printf '</style>\n'
  if [ -f .build/catalogue-repli.html ]; then
    # Le repli sans script prend la place du repère dans la page.
    # Découpe à la main plutôt que sub() : dans le texte de remplacement de
    # awk, « & » signifie « le motif trouvé », si bien qu'un nom de modèle
    # contenant une esperluette recollait @@CATALOGUE@@ au milieu de la page.
    awk 'BEGIN{while((getline l < ".build/catalogue-repli.html")>0) r=r l
               m="@@CATALOGUE@@"; n=length(m)}
         {i=index($0,m)
          if(i) print substr($0,1,i-1) r substr($0,i+n); else print}' src/page.html
  else
    sed 's/@@CATALOGUE@@//' src/page.html
  fi
  printf '<script>\n'; cat .build/site.js; printf '</script>\n'
} > .build/corps.html
{ printf '<title>Benkashoes</title>\n'; cat .build/corps.html; } > .build/artefact.html

# ---------- 3. la page complète ----------
{
cat <<HEAD
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="@@CSP@@">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>$TITRE</title>
<meta name="description" content="$DESC">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="Benkashoes">
<meta name="geo.region" content="MA">
<meta name="geo.placename" content="Maroc">
$VERIF<link rel="preload" as="font" type="font/woff2" href="assets/polices/archivo.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="assets/polices/archivo-black.woff2" crossorigin>
<meta name="theme-color" content="#15181b">
<link rel="canonical" href="$URL">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Benkashoes">
<meta property="og:title" content="$TITRE">
<meta property="og:description" content="$DESC">
<meta property="og:url" content="$URL">
<meta property="og:locale" content="fr_MA">
<meta property="og:image" content="${URL}${PARTAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Une tige en daim benka montée sur forme, à l'atelier">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="$TITRE">
<meta name="twitter:description" content="$DESC">
<meta name="twitter:image" content="${URL}${PARTAGE}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2315181b'/%3E%3Cpath d='M16 5c5 0 8 4 8 8 0 5-3 7-3 11 0 2-2 3-5 3s-5-1-5-3c0-4-3-6-3-11 0-4 3-8 8-8z' fill='%23cf9549'/%3E%3C/svg%3E">
<script type="application/ld+json">$SEO</script>
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html,body{margin:0}body{font:14px system-ui,sans-serif;background:#f3f0ea}
img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
HEAD
cat .build/corps.html
printf '</body>\n</html>\n'
} > index.html

# ---------- 4. le catalogue du tableur doit suivre celui du site ----------
if command -v python3 >/dev/null 2>&1; then python3 verif-catalogue.py; fi

# ---------- 5. allègement du fichier livré (les sources restent lisibles) ----------
# Doit passer avant le scellage : il modifie le texte des scripts, donc leurs
# empreintes.
if command -v python3 >/dev/null 2>&1; then python3 minifier.py index.html; fi

# ---------- 6. politique de sécurité : chaque script scellé par son empreinte ----------
if command -v python3 >/dev/null 2>&1 && python3 csp.py index.html; then
  :
else
  echo "  python3 absent : politique de repli (scripts en ligne autorisés)"
  POLITIQUE="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'none'; worker-src 'none'; upgrade-insecure-requests"
  sed -i '' "s|@@CSP@@|$POLITIQUE|" index.html
fi
grep -q '@@CSP@@' index.html && { echo "ERREUR : la politique de sécurité n'a pas été posée"; exit 1; }

# ---------- 7. la version servie par server.js porte le repère d'API ----------
# Sans ce repère, la page ne sonde pas /api/catalog : inutile sur GitHub Pages,
# où il n'y a pas de serveur et où le sondage coûtait un 404 à chaque visite.
python3 - <<'PY' || cp index.html public/index.html
import io
h=io.open('index.html',encoding='utf-8').read()
io.open('public/index.html','w',encoding='utf-8').write(
  h.replace('<meta name="referrer"','<meta name="benka-api" content="oui">\n<meta name="referrer"',1))
PY

# ---------- 8. le plan du site, daté du jour ----------
# Une seule adresse — le site tient sur une page — mais l'image de marque y est
# déclarée : c'est ce qui la rend éligible à Google Images.
cat > sitemap.xml <<SITEMAP
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>$URL</loc>
    <lastmod>$(date -u +%Y-%m-%d)</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${URL}${PARTAGE}</image:loc>
      <image:title>Benkashoes — mocassins-mules en daim</image:title>
      <image:caption>Une tige en daim benka montée sur forme, à l'atelier.</image:caption>
    </image:image>
  </url>
</urlset>
SITEMAP

# La clé IndexNow doit être servie à la racine pour que les moteurs qui
# l'utilisent (Bing, Yandex, DuckDuckGo…) acceptent nos annonces d'adresse.
# Google, lui, ne s'en sert pas : voir REFERENCEMENT.md.
cp -f robots.txt sitemap.xml public/ 2>/dev/null || true
for f in *.txt; do
  case "$f" in robots.txt) ;; *) cp -f "$f" public/ 2>/dev/null || true ;; esac
done
rm -rf public/assets && cp -R assets public/assets 2>/dev/null || true
printf '  %-18s %s Ko (gzip %s Ko) — canonique : %s\n' "index.html" \
  "$(( $(wc -c < index.html) / 1024 ))" "$(( $(gzip -9 -c index.html | wc -c) / 1024 ))" "$URL"
