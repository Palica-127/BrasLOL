'use strict';
/* Suprimentos e visão (Bloco 9+): itens iniciais, poções, sentinelas (trinket e Sentinela de Controle) e a regra de compra que os jogadores reais seguem.
   DADOS: preços, curas, durações, cargas e recargas vêm do patch (items.json: 2003, 2031, 2055, 3340, 3364, 1054/1055/1056/1086/1120, 3865, 1101-1103).
   COMPORTAMENTO (leagueofgraphs.com, patch 16.22, partidas reais): quase todos começam com Sentinela Invisível + Poção de Vida; magos no mid levam
   Anel de Doran + 2 poções; atiradores, Arco de Doran + 2 poções; lutadores, Lâmina (ou Escudo) de Doran + 1 poção; tanques, Escudo de Doran;
   suportes, Atlas Mundial + 2 poções; selvas, o filhote de selva + poção. Botas e itens seguem a build do Bloco 4.
   ESTIMADO (sem fonte): cadência de compra de Sentinela de Controle/poções por viagem à base, onde cada jogador coloca sentinelas, vida das sentinelas
   e tempo de limpeza. NÃO há névoa de guerra: a visão só entra como bônus leve na leitura de objetivos da IA e nas estatísticas (pontuação de visão). */
const { catalog } = require('./catalog');
const ID = { HP: 2003, REFILL: 2031, PINK: 2055, WARD: 3340, ORACLE: 3364, ATLAS: 3865, DB: 1055, DS: 1054, DR: 1056, DBOW: 1086, DH: 1120, PUP_FIRE: 1101, PUP_WIND: 1102, PUP_MOSS: 1103 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const WARD = { stealthLife: [90, 120], stealthMaxPlaced: 3, pinkMax: 3, radius: 900, clearRadius: 450, clearStealth: 1.5, clearPink: 4, oracleRadius: [600, 750], oracleDur: 8 };
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));

/* kit inicial por papel/arquétipo: ouro inicial 500 */
function startKit(role, arch, champ) {
  if (role === 'support') return { items: [ID.ATLAS], pots: 2 };
  if (role === 'jungle') return { items: [arch === 'tanque' || arch === 'lutador' ? ID.PUP_MOSS : (arch === 'mago' || arch === 'mago-tanque') ? ID.PUP_FIRE : ID.PUP_WIND], pots: 1 };
  if (role === 'adc') return { items: [ID.DBOW], pots: 2 };
  if (role === 'mid') return { items: [arch === 'assassino' || arch === 'lutador' ? ID.DB : ID.DR], pots: arch === 'assassino' || arch === 'lutador' ? 1 : 2 };
  /* top */ return { items: [arch === 'tanque' || arch === 'mago-tanque' ? ID.DS : ID.DB], pots: 1 };
}

function init(w, u, role) {
  u.stk = {}; u.hots = []; u.role = role;
  u.trk = { id: ID.WARD, ammo: 1, next: null, last: -999 };
  u.sup = { placed: 0, pinks: 0, wardsKilled: 0, potions: 0, vision: 0 };
}
const maxAmmo = id => (id === ID.ORACLE ? 2 : 2);
/* recarga da carga do trinket: interpola entre o valor inicial e o final conforme o tempo de jogo (dados: GameTimeThreshold = 14 min) */
function chargeTime(id, t) { const k = t / (14 * 60); return id === ID.ORACLE ? lerp(160, 100, k) : lerp(210, 90, k); }
function setTrinket(w, u, id) {
  if (u.trk.id === id) return false;
  if (id === ID.ORACLE && u.level < 9) return false;
  u.trk = { id, ammo: Math.min(u.trk.ammo, maxAmmo(id)), next: null, last: u.trk.last }; w.emit('trinket', { id: u.id, item: id }); return true;
}

/* ---- consumíveis ---- */
const count = (u, id) => (u.stk && u.stk[id]) || 0;
const potionsLeft = u => count(u, ID.HP) + (u.refill ? u.refill.charges : 0);
function usePotion(w, u) {
  if (u.dead || !u.hots) return false;
  const cat = catalog();
  const act = id => u.hots.some(h => h.id === id);
  if (u.refill && u.refill.charges > 0 && !act(ID.REFILL) && u.items.includes(ID.REFILL)) {
    u.refill.charges--; u.hots.push({ id: ID.REFILL, per: 100 / 12, until: w.t + 12 }); u.sup.potions++; w.emit('potion', { id: u.id, item: ID.REFILL }); return true;
  }
  if (count(u, ID.HP) > 0 && !act(ID.HP)) {
    u.stk[ID.HP]--; if (u.stk[ID.HP] <= 0) { delete u.stk[ID.HP]; const k = u.items.indexOf(ID.HP); if (k >= 0) u.items.splice(k, 1); }
    u.hots.push({ id: ID.HP, per: 120 / 15, until: w.t + 15 }); u.sup.potions++; w.emit('potion', { id: u.id, item: ID.HP }); void cat; return true;
  }
  return false;
}
function refillAtBase(u) { if (u.refill && u.items.includes(ID.REFILL)) u.refill.charges = 2; }
function onBuy(u, id) {
  u.stk = u.stk || {};
  if (id === ID.REFILL) u.refill = { charges: 2 };
  else u.stk[id] = (u.stk[id] || 0) + 1;
}
/* o item consumível some do inventário quando acaba a pilha (control ward usada) */
function dropIfEmpty(u, id) { if (!(u.stk[id] > 0)) { delete u.stk[id]; const k = u.items.indexOf(id); if (k >= 0) u.items.splice(k, 1); } }

/* ---- sentinelas ---- */
function wardsOf(w, u) { return (w.wards || []).filter(x => x.owner === u.id); }
function placeWard(w, u, kind, pos) {
  if (u.dead) return false;
  w.wards = w.wards || [];
  if (kind === 'control') {
    if (count(u, ID.PINK) < 1 || wardsOf(w, u).filter(x => x.kind === 'control').length >= WARD.pinkMax) return false;
    u.stk[ID.PINK]--; dropIfEmpty(u, ID.PINK); u.sup.pinks++;
    w.wards.push({ id: w.nextId++, kind, team: u.team, owner: u.id, pos: { x: pos.x, y: pos.y }, born: w.t, until: Infinity, reveal: 0, clear: 0 });
  } else {
    if (u.trk.id !== ID.WARD || u.trk.ammo < 1 || wardsOf(w, u).filter(x => x.kind === 'stealth').length >= WARD.stealthMaxPlaced) return false;
    u.trk.ammo--; if (u.trk.next === null) u.trk.next = w.t + chargeTime(ID.WARD, w.t); u.trk.last = w.t;
    const life = lerp(WARD.stealthLife[0], WARD.stealthLife[1], (u.level - 1) / 17);
    w.wards.push({ id: w.nextId++, kind, team: u.team, owner: u.id, pos: { x: pos.x, y: pos.y }, born: w.t, until: w.t + life, reveal: 0, clear: 0 });
  }
  u.sup.placed++; w.emit('ward', { id: u.id, kind, at: [Math.round(pos.x), Math.round(pos.y)] }); return true;
}
function useOracle(w, u) {
  if (u.dead || u.trk.id !== ID.ORACLE || u.trk.ammo < 1) return false;
  u.trk.ammo--; if (u.trk.next === null) u.trk.next = w.t + chargeTime(ID.ORACLE, w.t); u.trk.sweepUntil = w.t + WARD.oracleDur;
  w.emit('oracle', { id: u.id }); return true;
}
const wardNear = (w, team, pos, r) => (w.wards || []).some(x => x.team === team && dist(x.pos, pos) <= r);

/* ---- passo da simulação (cada tick) ---- */
function tick(w, dt) {
  /* cura ao longo do tempo */
  for (const u of w.units) {
    if (!u.hots || !u.hots.length || u.dead) { if (u.hots && u.dead) u.hots.length = 0; continue; }
    for (const h of u.hots) u.hp = Math.min(u.hpMax, u.hp + h.per * dt);
    u.hots = u.hots.filter(h => h.until > w.t);
  }
  /* recarga do trinket */
  for (const u of w.units) {
    if (!u.trk || u.dead) continue;
    const t = u.trk;
    if (t.ammo < maxAmmo(t.id) && t.next === null) t.next = w.t + chargeTime(t.id, w.t);
    if (t.next !== null && w.t >= t.next) { t.ammo = Math.min(maxAmmo(t.id), t.ammo + 1); t.next = t.ammo < maxAmmo(t.id) ? w.t + chargeTime(t.id, w.t) : null; }
    u.sup.vision = Math.round(((u.sup.vision || 0)) * 1000) / 1000;
  }
  if (!w.wards || !w.wards.length) return;
  /* varredura do Oráculo revela; campeão inimigo perto de uma sentinela revelada a destrói */
  for (const x of w.wards) {
    const foes = w.units.filter(c => !c.dead && c.team !== x.team && c.trk);
    for (const f of foes) { if (f.trk.sweepUntil > w.t && dist(f.pos, x.pos) <= lerp(WARD.oracleRadius[0], WARD.oracleRadius[1], (w.t) / (14 * 60))) x.reveal = Math.max(x.reveal, w.t + 2); }
    const clr = foes.find(f => dist(f.pos, x.pos) <= WARD.clearRadius);
    if (x.reveal > w.t && clr) { x.clear += dt; if (x.clear >= (x.kind === 'control' ? WARD.clearPink : WARD.clearStealth)) { x.dead = true; clr.sup.wardsKilled++; w.emit('ward-killed', { id: clr.id, kind: x.kind }); } } else x.clear = Math.max(0, x.clear - dt);
    if (!x.dead && w.t >= x.until) x.dead = true;
    if (!x.dead) { const o = w.units.find(c => c.id === x.owner); if (o && o.sup) o.sup.vision += dt * (x.kind === 'control' ? 1 / 30 : 1 / 60); }
  }
  w.wards = w.wards.filter(x => !x.dead);
}
module.exports = { ID, WARD, startKit, init, setTrinket, usePotion, refillAtBase, onBuy, dropIfEmpty, placeWard, useOracle, wardNear, wardsOf, potionsLeft, count, tick, chargeTime, maxAmmo };
