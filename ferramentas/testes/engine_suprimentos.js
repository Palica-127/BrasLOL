'use strict';
/* Suprimentos: kit inicial, poções, sentinelas, Sentinela de Controle, Oráculo. Roda: node ferramentas/testes/engine_suprimentos.js */
const M = require('../../src/engine/ai/match'), SUP = require('../../src/engine/items/supplies'), SHOP = require('../../src/engine/items/shop');
let ok = 0, bad = 0; const T = (c, m) => { if (c) { ok++; console.log('ok    ' + m); } else { bad++; console.log('FALHA ' + m); } };
const mk = seed => M.createGame({ seed, teams: [{ name: 'A', roster: M.ROSTERS.A }, { name: 'B', roster: M.ROSTERS.B }], cap: 1500 });
{ const g = mk(3), us = g.brains.flatMap(b => b.players.map(p => p.u));
  T(us.every(u => u.stk && u.trk && u.sup), 'todos os campeões têm pilhas, trinket e estatísticas de suprimento');
  g.w.run(40);
  T(g.brains.every(b => b.players.every(p => SUP.potionsLeft(p.u) >= 1 || p.u.sup.potions >= 1)), 'todos compraram poção de vida no início');
  T(g.brains[0].players.every(p => p.u.items.length >= 1), 'todos têm item inicial');
  g.w.run(780);
  const placed = us.reduce((s, u) => s + u.sup.placed, 0), pots = us.reduce((s, u) => s + u.sup.potions, 0);
  T(placed >= 3, 'sentinelas foram colocadas (' + placed + ')'); T(pots >= 3, 'poções foram usadas (' + pots + ')');
  T(us.every(u => Number.isFinite(u.hp) && Number.isFinite(u.gold)), 'sem NaN');
  T((g.w.wards || []).length <= 30, 'limite de sentinelas respeitado'); }
{ const a = mk(5), b = mk(5); a.w.run(600); b.w.run(600); T(JSON.stringify(a.w.units.filter(u => u.sup).map(u => [u.hp | 0, u.sup.placed, u.sup.potions])) === JSON.stringify(b.w.units.filter(u => u.sup).map(u => [u.hp | 0, u.sup.placed, u.sup.potions])), 'determinístico com suprimentos'); }
{ const g = mk(2), u = g.brains[0].players[4].u; SUP.setTrinket(g.w, u, SUP.ID.ORACLE); T(u.trk.id === SUP.ID.WARD, 'Oráculo exige nível 9');
  u.level = 9; T(SUP.setTrinket(g.w, u, SUP.ID.ORACLE) && u.trk.id === SUP.ID.ORACLE, 'Oráculo liberado no nível 9');
  u.gold = 5000; const r = SHOP.buy(g.w, u, SUP.ID.PINK); T(r.ok && SUP.count(u, SUP.ID.PINK) >= 1, 'compra de Sentinela de Controle'); }
console.log(bad ? '\nHÁ FALHAS' : '\nTODOS OS TESTES PASSARAM'); process.exit(bad ? 1 : 0);
