'use strict';
/* Ciclo de vida do campeão (Bloco 8): tempo de morte, renascimento na fonte e recall.
   Tempo de morte: tabela base por nível e fator por minuto da Wiki (a mesma que o motor legado já usava, `LVBRW`/`lvDeathT`).
   Recall: canalização de 8 s (Wiki) cancelada por dano ou movimento; ao fim, o campeão vai à fonte. */
const BRW = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];
const RECALL = 8;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function deathTime(level, sec) {
  const b = BRW[clamp(Math.round(level || 1), 1, 18) - 1], m = sec / 60; let f = 0;
  if (m >= 45) f = 21.75 + Math.ceil(2 * (m - 45)) * 1.45; else if (m >= 30) f = 12.75 + Math.ceil(2 * (m - 30)) * 0.30; else if (m >= 15) f = Math.ceil(2 * (m - 15)) * 0.425;
  return b * (1 + Math.min(f, 50) / 100);
}
const fountainOf = (w, u) => (w.structures ? w.structures.fountain[u.team] : { x: u.team === 0 ? 400 : w.arena.w - 400, y: u.team === 0 ? 400 : w.arena.h - 400 });

function onDeath(w, u) {
  u.recall = null; const dt = deathTime(u.level, w.t); u.respawnAt = w.t + dt;
  w.emit('death-timer', { id: u.id, secs: +dt.toFixed(2) });
  w.schedule(u.respawnAt, () => revive(w, u));
}
function revive(w, u) {
  if (!u.dead || (w.winner && w.winner() !== null)) return;
  u.dead = false; u.st = []; u.shields = []; u.dr = []; u.cast = null; u.dash = null; u.order = null; u.recall = null; u.attack.windup = null; u.attack.readyAt = w.t;
  u.pos = { ...fountainOf(w, u) }; u.vel = { x: 0, y: 0 }; w.refresh(u); u.hp = u.hpMax; u.mana = u.manaMax; u.lastDamageAt = -99;
  w.emit('respawn', { id: u.id });
}
function startRecall(w, u) { if (u.dead || u.recall || u.cast || u.dash) return false; u.recall = { start: w.t, until: w.t + RECALL }; u.order = null; w.emit('recall-start', { id: u.id }); return true; }
function cancelRecall(w, u, why) { if (u.recall) { u.recall = null; w.emit('recall-cancel', { id: u.id, why }); } }
function update(w) {
  for (const u of w.units) {
    if (!u.recall || u.dead) continue;
    if (u.lastDamageAt > u.recall.start + 1e-9 || u.cast || u.dash || !w.canAct(u)) { cancelRecall(w, u, 'interrompido'); continue; }
    if (u.order && u.order.type !== 'recall') { cancelRecall(w, u, 'moveu'); continue; }
    if (w.t >= u.recall.until - 1e-9) { u.recall = null; u.pos = { ...fountainOf(w, u) }; u.vel = { x: 0, y: 0 }; w.emit('recall', { id: u.id }); }
  }
}
module.exports = { deathTime, onDeath, revive, startRecall, cancelRecall, update, RECALL, BRW, fountainOf };
