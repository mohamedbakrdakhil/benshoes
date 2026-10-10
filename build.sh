#!/bin/sh
# Génère le HTML déployable à partir de src/site.html (source unique du site).
#   index.html        -> GitHub Pages (racine du dépôt)
#   public/index.html -> servi par server.js
# SITE_URL fixe l'adresse canonique ; passez-la en variable pour basculer ailleurs :
#   SITE_URL=https://benkashoes.up.railway.app/ ./build.sh
set -e
cd "$(dirname "$0")"
URL="${SITE_URL:-https://www.benkashoes.ma/}"
DESC="Benkashoes — mocassins-mules en daim de veau, première en liège estampée, doublure cuir pleine fleur. Trois modèles, huit coloris, pointures 37 à 41. Livraison au Maroc, offerte dès 400 DH, ressemelage en atelier."
mkdir -p public
{
cat <<HEAD
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="@@CSP@@">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Benkashoes — mocassins-mules en daim</title>
<meta name="description" content="$DESC">
<meta name="theme-color" content="#15181b">
<link rel="canonical" href="$URL">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Benkashoes">
<meta property="og:title" content="Benkashoes — mocassins-mules en daim">
<meta property="og:description" content="$DESC">
<meta property="og:url" content="$URL">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2315181b'/%3E%3Cpath d='M16 5c5 0 8 4 8 8 0 5-3 7-3 11 0 2-2 3-5 3s-5-1-5-3c0-4-3-6-3-11 0-4 3-8 8-8z' fill='%23cf9549'/%3E%3C/svg%3E">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ShoeStore","name":"Benkashoes","url":"$URL",
"description":"$DESC","image":"${URL}assets/marque/logo-sur-photo.jpg",
"currenciesAccepted":"MAD","priceRange":"259-359 MAD",
"paymentAccepted":"Paiement à la livraison, virement",
"address":{"@type":"PostalAddress","addressCountry":"MA"},
"areaServed":{"@type":"Country","name":"Maroc"},
"openingHours":"Mo-Fr 09:00-18:00"}
</script>
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html,body{margin:0}body{font:14px system-ui,sans-serif;background:#f3f0ea}
img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
HEAD
grep -v '^<title>' src/site.html
printf '</body>\n</html>\n'
} > index.html

# Scelle chaque script en ligne par son empreinte. Sans python3 on garde une
# politique sans empreintes : moins stricte, mais la page ne reste jamais muette.
if command -v python3 >/dev/null 2>&1 && python3 csp.py index.html; then
  :
else
  echo "  python3 absent : politique de repli (scripts en ligne autorisés)"
  POLITIQUE="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; media-src 'none'; worker-src 'none'; upgrade-insecure-requests"
  python3 - "$POLITIQUE" <<'PY' 2>/dev/null || sed -i '' "s|@@CSP@@|$POLITIQUE|" index.html
import io,sys
p='index.html';h=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(h.replace('@@CSP@@',sys.argv[1]))
PY
fi

grep -q '@@CSP@@' index.html && { echo "ERREUR : la politique de sécurité n'a pas été posée"; exit 1; }

cp index.html public/index.html
cp -f robots.txt sitemap.xml public/ 2>/dev/null || true
rm -rf public/assets && cp -R assets public/assets 2>/dev/null || true
echo "index.html + public/index.html générés ($(wc -c < index.html | tr -d ' ') octets) — canonique : $URL"
