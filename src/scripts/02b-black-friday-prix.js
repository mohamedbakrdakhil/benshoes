/* Offre réservée à un panier de exactement trois Opus, couleurs et pointures
   au choix. Les prix nets restent cohérents dans les reçus et les exports.
   Les serveurs appellent cette fonction APRÈS avoir validé le catalogue. */
function prixBlackFriday(items, active = true) {
  const eligible = i => i.id === 'opus' && i.unit === 279;
  const count = items.reduce((n, i) => n + (eligible(i) ? i.q : 0), 0);
  const quantity = items.reduce((n, i) => n + i.q, 0);
  const packs = active && count === 3 && quantity === 3 ? 1 : 0;
  const net = items.map(item => ({...item, unit: packs ? 233 : item.unit}));
  const gross = items.reduce((n, i) => n + i.unit * i.q, 0);
  const sub = net.reduce((n, i) => n + i.unit * i.q, 0);
  return {items: net, count, quantity, packs, gross, sub, discount: gross - sub};
}
if (typeof module !== 'undefined' && module.exports) module.exports = {prixBlackFriday};
