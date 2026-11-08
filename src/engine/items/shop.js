'use strict';
/* Loja e inventário (regras da Summoner's Rift): 6 espaços (+ amuleto fora da conta), receita consome componentes já possuídos
   e abate o preço, botas únicas, venda por `vendavel` (valor do cliente), ouro por unidade. */
const { catalog, sumMods } = require('./catalog');
const MAX_SLOTS = 6;

function init(u, gold) { u.items = u.items || []; u.itemCd = u.itemCd || {}; u.itemState = u.itemState || {}; u.gold = gold !== undefined ? gold : (u.gold || 0); u.spent = u.spent || 0; }

/* componentes (recursivo) de `id` que o jogador possui; devolve a lista de ids a consumir (cada posse conta 1 vez) */
function plan(u, id, cat = catalog()) {
  const own = u.items.slice(), used = [];
  (function walk(i) {
    cat[i].from.forEach(c => { const k = own.indexOf(c); if (k >= 0) { own.splice(k, 1); used.push(c); } else walk(c); });
  })(id);
  return used;
}
function quote(u, id, cat = catalog()) {
  const it = cat[id]; if (!it) return { ok: false, reason: 'item-inexistente' };
  const used = plan(u, id, cat), cost = it.price - used.reduce((s, c) => s + cat[c].price, 0);
  const slots = u.items.length - used.length + 1;
  if (it.cls === 'trinket') return { ok: false, reason: 'use-setTrinket' };
  if (it.cls === 'consumable') {                                                     /* poções e Sentinela de Controle: pilha num espaço; só os vendidos na loja */
    if (!it.raw.na_loja || !it.price) return { ok: false, reason: 'nao-vendido' };
    const have = u.items.includes(id), st = (u.stk && u.stk[id]) || 0;
    if (id === 2031 && have) return { ok: false, reason: 'duplicado' };
    if (have && id !== 2031 && st >= it.maxStack) return { ok: false, reason: 'pilha-cheia' };
    if (!have && u.items.length + 1 > MAX_SLOTS) return { ok: false, reason: 'inventario-cheio' };
    if (u.gold < it.price) return { ok: false, reason: 'ouro', cost: it.price };
    return { ok: true, cost: it.price, used: [], stack: true };
  }
  if (slots > MAX_SLOTS) return { ok: false, reason: 'inventario-cheio' };
  if (it.cls === 'boots' && u.items.some(i => cat[i].cls === 'boots' && !used.includes(i))) return { ok: false, reason: 'botas-unicas' };
  if (u.items.includes(id) && it.maxStack <= 1 && !(it.cls === 'component')) return { ok: false, reason: 'duplicado' };
  if (u.gold < cost) return { ok: false, reason: 'ouro', cost };
  return { ok: true, cost, used };
}
function buy(w, u, id) {
  const cat = catalog(), q = quote(u, id, cat); if (!q.ok) return q;
  q.used.forEach(c => u.items.splice(u.items.indexOf(c), 1));
  if (!(q.stack && u.items.includes(id))) u.items.push(id);
  if (q.stack) require('./supplies').onBuy(u, id);
  u.gold -= q.cost; u.spent += q.cost;
  if (w) { w.refresh(u); w.emit('buy', { id: u.id, item: id, cost: q.cost }); }
  return q;
}
function sell(w, u, id) {
  const cat = catalog(), k = u.items.indexOf(id); if (k < 0) return { ok: false, reason: 'nao-possui' };
  u.items.splice(k, 1); u.gold += cat[id].sell; if (w) { w.refresh(u); w.emit('sell', { id: u.id, item: id }); }
  return { ok: true, gold: cat[id].sell };
}
const mods = u => sumMods(catalog(), u.items || []);
module.exports = { init, quote, buy, sell, plan, mods, MAX_SLOTS };
