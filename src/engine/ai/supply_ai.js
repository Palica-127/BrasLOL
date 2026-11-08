'use strict';
/* Comportamento da IA com suprimentos (poções, sentinelas, Sentinela de Controle, Lente do Oráculo) e compra inicial. Ver items/supplies.js para dados e fontes.
   ESTIMADO: pontos de colocação de sentinelas (coordenadas de comunidade, como o mapa do Bloco 7), frequência de viagens de visão e limiares de poção. */
const SUP = require('../items/supplies'), SHOP = require('../items/shop'), LAY = require('../map/layout');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), { ID } = SUP;

/* pontos do time 0 (Order); o time 1 usa a rotação de 180 graus. Rio, tri-brushes e entradas de selva (ESTIMADO) */
const SPOTS0 = {
  pit: [{ x: 9300, y: 5300 }, { x: 4700, y: 9700 }],            /* perto do poço do Dragão e do Barão (lado do rio) */
  river: [{ x: 3500, y: 7900 }, { x: 6400, y: 8400 }, { x: 8500, y: 6500 }, { x: 11400, y: 3200 }],
  entry: [{ x: 8200, y: 9400 }, { x: 6700, y: 5600 }, { x: 2600, y: 9800 }, { x: 11600, y: 2500 }]
};
const spots = (team, kind) => SPOTS0[kind].map(p => (team === 0 ? p : LAY.mirror(p)));

/* compra: kit inicial, poções, Sentinela de Controle, Poção com Refil, trocar para a Lente do Oráculo */
function shop(brain, p) {
  const u = p.u, w = brain.w; if (!w.supplies || !u.sup) return;
  const arch = p.build ? p.build.arch : 'lutador';
  if (!p.kitDone && w.t < 30) {
    p.kitDone = true; const k = SUP.startKit(p.role, arch);
    k.items.forEach(id => SHOP.buy(w, u, id)); for (let i = 0; i < k.pots; i++) SHOP.buy(w, u, ID.HP);
    return;
  }
  const t = w.t / 60;
  if (u.level >= 9 && (p.role === 'support' || p.role === 'jungle')) SUP.setTrinket(w, u, ID.ORACLE);
  SUP.refillAtBase(u);
  const pinks = SUP.count(u, ID.PINK), want = p.role === 'support' ? (t > 4 ? 2 : 0) : p.role === 'jungle' ? (t > 4 ? 1 : 0) : (t > 8 ? 1 : 0);
  if (pinks < want && u.gold >= 75 + (p.role === 'support' ? 0 : 250)) SHOP.buy(w, u, ID.PINK);
  if (t < 12 && SUP.potionsLeft(u) < 1 && u.gold >= 120 && !u.items.includes(ID.REFILL)) SHOP.buy(w, u, ID.HP);
  if (!u.items.includes(ID.REFILL) && t >= 3 && t < 25 && u.gold >= 1000 && u.items.length <= 4) SHOP.buy(w, u, ID.REFILL);
}

/* uso em campo. `danger`: há inimigo perto. Devolve true se gastou a ação (viagem de visão) */
function act(brain, p, danger) {
  const u = p.u, w = brain.w; if (!w.supplies || !u.sup || u.dead) return false;
  if (u.hp < u.hpMax * 0.55 || (u.hp < u.hpMax * 0.72 && w.t - u.lastDamageAt < 4 && p.mode !== 'fight')) SUP.usePotion(w, u);
  if (u.trk.id === ID.ORACLE && u.trk.ammo >= 1 && !danger && w.t - (p.oracleAt || -999) > 25) {
    const near = [...spots(1 - u.team, 'pit'), ...spots(1 - u.team, 'river'), ...spots(1 - u.team, 'entry')].some(s => dist(s, u.pos) < 650);
    if (near && SUP.useOracle(w, u)) p.oracleAt = w.t;
  }
  const wantPink = SUP.count(u, ID.PINK) > 0 && SUP.wardsOf(w, u).filter(x => x.kind === 'control').length < 3;
  const wantWard = u.trk.id === ID.WARD && u.trk.ammo >= 1;
  if (!wantPink && !wantWard) return false;
  const mine = (w.wards || []).filter(x => x.team === u.team);
  const pool = wantPink ? [...spots(u.team, 'pit'), ...spots(u.team, 'entry')] : [...spots(u.team, 'river'), ...spots(u.team, 'entry'), ...spots(u.team, 'pit')];
  const free = pool.filter(s => !mine.some(x => dist(x.pos, s) < 1100));
  if (!free.length) return false;
  const near = free.reduce((b, s) => (dist(s, u.pos) < b.d ? { s, d: dist(s, u.pos) } : b), { s: null, d: 1e9 });
  if (near.d <= 280) { if (!danger) { const kind = wantPink && (p.role !== 'top' || w.t > 900) ? 'control' : 'stealth'; if (kind === 'control' ? SUP.placeWard(w, u, 'control', near.s) : SUP.placeWard(w, u, 'stealth', near.s)) return false; } return false; }
  /* viagem de visão: suporte e selva vão até o ponto; os demais só colocam quando passam por perto */
  if ((p.role === 'support' || p.role === 'jungle') && !danger && u.hp > u.hpMax * 0.65 && near.d < 3200 && w.t >= (p.wardTripAt || 0) && (p.role === 'support' ? brain.laneSafe ? brain.laneSafe(p) : true : true)) {
    p.wardTripAt = w.t + 40; p.wardGo = { s: near.s, until: w.t + 14 };
  }
  if (p.wardGo && w.t < p.wardGo.until && !danger) { if (dist(p.wardGo.s, u.pos) > 260) { brain.go(u, p.wardGo.s, 100); return true; } p.wardGo = null; }
  return false;
}
module.exports = { shop, act, spots, SPOTS0 };
