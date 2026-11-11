'use strict';
/* Partida completa 5x5 (Bloco 8): monta mundo, economia, selva, estruturas, renascimento e as duas IAs. */
const { World } = require('../sim/world'), ECO = require('../economy/economy'), JG = require('../jungle/objectives'), STR = require('../map/structures'), LAY = require('../map/layout');
const { createMatch } = require('./brain');
const ROSTERS = {
  A: [{ name: 'Garen', role: 'top' }, { name: 'Amumu', role: 'jungle' }, { name: 'Ahri', role: 'mid' }, { name: 'Ezreal', role: 'adc' }, { name: 'Leona', role: 'support' }],
  B: [{ name: 'Malphite', role: 'top' }, { name: 'Amumu', role: 'jungle' }, { name: 'Annie', role: 'mid' }, { name: 'Ezreal', role: 'adc' }, { name: 'Morgana', role: 'support' }]
};
function createGame({ seed = 1, teams, loader, cap = 3600 } = {}) {
  const w = new World({ seed, loader, arena: { w: LAY.W, h: LAY.H } });
  ECO.enable(w, { lanes: LAY.lanes() }); JG.enable(w); w.jungle.mul = { gold: 2.2, xp: 3.2 }; /* Bloco 10c (ESTIMADO): compensa o ritmo de limpeza da IA (~1,3 acampamento/min); calibrar com CAL_CLASSICO=1 */ STR.enable(w); w.respawn = true; w.supplies = true;
  const brains = createMatch(w, teams || [{ roster: ROSTERS.A }, { roster: ROSTERS.B }]);
  w.cap = cap; return { w, brains };
}
function play(g, { until = 3600, tick } = {}) {
  const w = g.w; const t0 = Date.now();
  while (w.t < until && w.winner() === null) { w.run(10); if (tick) tick(w); }
  return { t: w.t, winner: w.winner(), ms: Date.now() - t0 };
}
module.exports = { createGame, play, ROSTERS };
