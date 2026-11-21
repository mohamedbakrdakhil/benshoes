/* Offre réservée à un panier d’exactement trois paires Opus et/ou AS.
   Le total est réparti au prorata des prix catalogue, en dirhams entiers.
   Les serveurs appellent cette fonction APRÈS avoir validé le catalogue. */
function prixBlackFriday(items, active = true) {
  const eligible = i => ((i.id === 'opus' && i.unit === 279) || (i.id === 'as' && i.unit === 299)) && Number.isInteger(i.q) && i.q > 0;
  const count = items.reduce((n, i) => n + (eligible(i) ? i.q : 0), 0);
  const quantity = items.reduce((n, i) => n + i.q, 0);
  const opusCount = items.reduce((n, i) => n + (eligible(i) && i.id === 'opus' ? i.q : 0), 0);
  const asCount = count - opusCount;
  const packs = active && quantity === 3 && items.length > 0 && items.every(eligible) ? 1 : 0;
  const pack = packs ? (opusCount === 3 ? 'opus' : asCount === 3 ? 'as' : 'mixte') : null;
  const gross = items.reduce((n, i) => n + i.unit * i.q, 0);
  const sub = packs ? {opus:699, as:799, mixte:749}[pack] : gross;
  let net = items.map(item => ({...item}));
  if (packs) {
    // Une ligne de trois AS peut devenir 2 × 266 + 1 × 267 : ni arrondi
    // perdu, ni paire ajoutée. Les références de stock restent identiques.
    const pairs = [];
    items.forEach((item, row) => {
      for (let n = 0; n < item.q; n++) pairs.push({row, unit:Math.floor(sub * item.unit / gross), remainder:(sub * item.unit) % gross});
    });
    const rest = sub - pairs.reduce((n, i) => n + i.unit, 0);
    [...pairs].sort((a, b) => b.remainder - a.remainder).slice(0, rest).forEach(i => i.unit++);
    net = [];
    items.forEach((item, row) => {
      const grouped = new Map();
      pairs.filter(i => i.row === row).forEach(i => grouped.set(i.unit, (grouped.get(i.unit) || 0) + 1));
      grouped.forEach((q, unit) => net.push({...item, q, unit}));
    });
  }
  return {items:net, count, quantity, opusCount, asCount, packs, pack, gross, sub, discount:gross - sub};
}
if (typeof module !== 'undefined' && module.exports) module.exports = {prixBlackFriday};
