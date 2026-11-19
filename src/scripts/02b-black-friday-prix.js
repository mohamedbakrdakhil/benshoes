/* Une offre par lot complet de trois Opus, couleurs et pointures au choix.
   Les lignes remisées portent leur prix net : exports, reçus et stock restent
   cohérents même quand une ligne contient à la fois un lot et une paire seule.
   Les serveurs appellent cette fonction APRÈS avoir validé le catalogue. */
function prixBlackFriday(items, active = true) {
  const eligible = i => i.id === 'opus' && i.unit === 279;
  const count = items.reduce((n, i) => n + (eligible(i) ? i.q : 0), 0);
  const packs = active ? Math.floor(count / 3) : 0;
  let remaining = packs * 3;
  const net = [];
  for (const item of items) {
    const discounted = eligible(item) ? Math.min(remaining, item.q) : 0;
    if (discounted) {
      net.push({...item, q: discounted, unit: 233});
      remaining -= discounted;
    }
    if (item.q > discounted) net.push({...item, q: item.q - discounted});
  }
  const gross = items.reduce((n, i) => n + i.unit * i.q, 0);
  const sub = net.reduce((n, i) => n + i.unit * i.q, 0);
  return {items: net, count, packs, gross, sub, discount: gross - sub};
}
if (typeof module !== 'undefined' && module.exports) module.exports = {prixBlackFriday};
