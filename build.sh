#!/bin/sh
# Génère le HTML déployable à partir de src/site.html (source unique du site).
#   index.html        -> GitHub Pages (racine du dépôt)
#   public/index.html -> servi par server.js sur Railway
# SITE_URL fixe l'adresse canonique ; passez-la en variable pour basculer sur Railway :
#   SITE_URL=https://benkashoes.up.railway.app/ ./build.sh
set -e
cd "$(dirname "$0")"
URL="${SITE_URL:-https://www.benkashoes.ma/}"
DESC="Benkashoes — mocassins-mules en daim et latex naturels, cuir pleine fleur tanné en Europe. Six modèles du 35 au 46, livraison 48 h, essai 30 jours, ressemelage garanti à vie."
mkdir -p public
{
cat <<HEAD
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
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
{"@context":"https://schema.org","@type":"Store","name":"Benkashoes","url":"$URL",
"description":"$DESC","currenciesAccepted":"EUR","paymentAccepted":"Virement, paiement à la livraison",
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
cp index.html public/index.html
cp -f robots.txt sitemap.xml public/ 2>/dev/null || true
rm -rf public/assets && cp -R assets public/assets 2>/dev/null || true
echo "index.html + public/index.html générés ($(wc -c < index.html) octets) — canonique : $URL"
