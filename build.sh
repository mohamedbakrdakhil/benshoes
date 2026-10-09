#!/bin/sh
# Génère index.html (le site déployé) à partir de src/site.html (la source partagée).
# src/site.html est aussi la source publiée telle quelle comme Artifact Claude.
set -e
cd "$(dirname "$0")"
URL="https://mohamedbakrdakhil.github.io/benshoes/"
DESC="Benshoes — sandales à lit de liège et latex naturels, cuir pleine fleur tanné en Europe. Six modèles du 35 au 46, livraison 48 h, essai 30 jours, ressemelage garanti à vie."
{
cat <<HEAD
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Benshoes — sandales à lit de liège</title>
<meta name="description" content="$DESC">
<meta name="theme-color" content="#15181b">
<link rel="canonical" href="$URL">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Benshoes">
<meta property="og:title" content="Benshoes — sandales à lit de liège">
<meta property="og:description" content="$DESC">
<meta property="og:url" content="$URL">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2315181b'/%3E%3Cpath d='M16 5c5 0 8 4 8 8 0 5-3 7-3 11 0 2-2 3-5 3s-5-1-5-3c0-4-3-6-3-11 0-4 3-8 8-8z' fill='%23cf9549'/%3E%3C/svg%3E">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Store","name":"Benshoes","url":"$URL",
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
echo "index.html généré ($(wc -c < index.html) octets)"
