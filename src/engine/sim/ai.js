'use strict';
/* Micro-IA mínima (Bloco 3): existe só para os testes de combate serem significativos (mira com erro, esquiva, uso de habilidades,
   ataque básico). A IA estratégica/tática de verdade é o Bloco 5 e usa o mesmo estado do mundo.
   Parâmetros por unidade (u.ai): aim (0..1, precisão da mira), dodge (0..1, chance de esquivar), react (s). Aleatoriedade: fluxo 'ia'. */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const GLOBAL = 20000;
const FX = require('../items/effects');

const enabled = u => u.ai.enabled !== false;

function pickTarget(w, u) {
  const foes = w.foes(u); if (!foes.length) return null;
  return foes.reduce((b, x) => (dist(x.pos, u.pos) < dist(b.pos, u.pos) ? x : b));
}
/* mira com antecipação (predição linear) e erro angular que diminui com a precisão */
function aimAt(w, u, tg, def, rank) {
  const sp = (def.missile && def.missile.speed) > 50 ? def.missile.speed : 0;
  let x = tg.pos.x, y = tg.pos.y;
  if (sp && w.rng.next('ia') < u.ai.aim) { const t = dist(u.pos, tg.pos) / sp; x += tg.vel.x * t; y += tg.vel.y * t; }
  const a = Math.atan2(y - u.pos.y, x - u.pos.x), err = w.rng.gauss('ia') * (1 - u.ai.aim) * 0.35, d = dist(u.pos, { x, y });
  return { x: u.pos.x + Math.cos(a + err) * d, y: u.pos.y + Math.sin(a + err) * d, target: ['target', 'targetAlly'].includes(def.shape) ? tg : undefined };
}
function dodge(w, u) {
  if (u.ai.dodgeUntil > w.t) return true;
  for (const P of w.projs) {
    if (P.kind !== 'line' || P.owner.team === u.team) continue;
    const dx = Math.cos(P.ang), dy = Math.sin(P.ang), rx = u.pos.x - P.x, ry = u.pos.y - P.y;
    const along = rx * dx + ry * dy, perp = rx * -dy + ry * dx;
    if (along < 0 || along > 900 || Math.abs(perp) > P.width / 2 + u.radius + 60) continue;
    if (w.rng.next('ia') < u.ai.dodge) {
      const s = perp >= 0 ? 1 : -1;
      u.ai.dodgeUntil = w.t + 0.4; u.ai.dodgeDir = { x: u.pos.x + -dy * s * 400, y: u.pos.y + dx * s * 400 };
      u.order = { type: 'move', x: u.ai.dodgeDir.x, y: u.ai.dodgeDir.y }; return true;
    }
    u.ai.dodgeUntil = w.t + 0.4; u.ai.dodgeDir = null;                 /* decidiu não esquivar deste projétil */
  }
  return false;
}
/* Modo farm (Bloco 5): acerta o último golpe em minions. u.ai.lastHit (0..1) = habilidade mecânica: erro na estimativa da vida do minion. */
const inRangeAny = (w, u) => { const r = w.units.filter(x => !x.dead && x.team !== u.team && x.kind === 'minion' && dist(x.pos, u.pos) <= u.stats.range + x.radius + 15); return r.length ? r : null; };
function farmDecide(w, u) {
  const R = u.stats.range + 15, mins = w.units.filter(x => !x.dead && x.team !== u.team && x.kind === 'minion');
  if (!mins.length) return !u.ai.trade;                                         /* sem minions: espera (só luta se trade=true) */
  /* posição de rota: nunca passa do minion aliado mais avançado (rota ao longo de x) */
  const dirX = u.team === 0 ? 1 : -1, allies = w.units.filter(x => !x.dead && x.team === u.team && x.kind === 'minion');
  const front = allies.length ? allies.reduce((m, x) => (x.pos.x * dirX > m * dirX ? x.pos.x : m), allies[0].pos.x) : u.pos.x;
  const clampX = x => (dirX > 0 ? Math.min(x, front) : Math.max(x, front));
  /* sem minions aliados por perto e inimigos chegando: recua (senão os minions inimigos focam o campeão) */
  const guard = allies.some(x => Math.abs(x.pos.x - u.pos.x) < 700), threat = mins.some(x => dist(x.pos, u.pos) < 700);
  if (!guard && threat && u.ai.farm && inRangeAny(w, u)) { const t = inRangeAny(w, u).sort((a, b) => a.hp - b.hp)[0]; if (!(u.order && u.order.type === 'attack' && u.order.target === t)) w.orderAttack(u, t); return true; }   /* onda sem apoio: limpa em vez de esperar */
  if (!guard && threat) { w.orderMove(u, Math.max(200, Math.min(w.arena.w - 200, u.pos.x - dirX * 500)), u.pos.y); return true; }
  if (allies.length && (u.pos.x - front) * dirX > 60) { w.orderMove(u, front - dirX * 150, u.pos.y); return true; }   /* não fica à frente dos próprios minions */
  const near = mins.filter(x => dist(x.pos, u.pos) <= 1400).sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos));
  if (!near.length) { if (Math.abs(u.pos.x - front) > 80) w.orderMove(u, front - dirX * 120, u.pos.y); return true; }
  const dmg = u.stats.ad.total * (1 / (1 + Math.max(0, near[0].stats.armor.total) / 100)), sk = u.ai.lastHit == null ? 0.7 : u.ai.lastHit;
  const inRange = near.filter(x => dist(x.pos, u.pos) <= R + x.radius);
  /* vida prevista no instante do impacto: soma os golpes de minions aliados já em andamento que chegam antes do nosso */
  const spec = w.attackSpec(u), flight = d => (spec.missile > 0 ? d / spec.missile : 0), mine = d => spec.windupFrac / w.asOf(u) + flight(d);
  const incoming = x => { const tIm = w.t + mine(dist(u.pos, x.pos)); return w.units.reduce((acc, m) => (m.kind === 'minion' && !m.dead && m.team !== x.team && m.attack.windup && m.attack.windup.target === x && m.attack.windup.until + (m.spec.missile > 0 ? dist(m.pos, x.pos) / m.spec.missile : 0) <= tIm ? acc + m.stats.ad.total : acc), 0); };
  const pick = inRange.find(x => (x.hp - incoming(x)) * (1 + w.rng.gauss('ia') * (1 - sk) * 0.6) <= dmg);
  if (pick) { if (!(u.order && u.order.type === 'attack' && u.order.target === pick)) w.orderAttack(u, pick); return true; }
  if (!inRange.length) { const t = near[0]; w.orderMove(u, clampX(t.pos.x - dirX * (u.stats.range * 0.8)), t.pos.y); return true; }
  if (!u.attack.windup) u.order = null;                                           /* espera o minion enfraquecer */
  return true;
}
function decide(w, u) {
  if (!w.canAct(u) || u.dash || u.cast) return;
  if (u.ai.dodgeUntil > w.t && u.ai.dodgeDir) return;
  if (u.ai.farm && farmDecide(w, u)) return;
  const tg = pickTarget(w, u); if (!tg) return;
  if (u.ai.dodge > 0 && !u.attack.windup && dodge(w, u) && u.ai.dodgeDir) return;
  const d = dist(u.pos, tg.pos);
  if (u.items && u.items.includes(FX.ID.ZHONYA) && u.hp < u.hpMax * 0.3 && d < 700 && w.t - u.lastDamageAt < 2) { FX.use(w, u, FX.ID.ZHONYA); return; }
  for (const slot of ['R', 'Q', 'E', 'W']) {
    const def = u.defs[slot], rank = u.abil.rank[slot]; if (!rank || w.t < u.abil.readyAt[slot]) continue;
    if (u.ai.skip && u.ai.skip.includes(slot)) continue;
    const k = u.kit[slot]; if (!k) continue;
    const g = def, range = g.range(rank) || 0, rad = g.radius(rank) || 0, shape = k.shape;
    let ok = false;
    if (shape === 'self') ok = d <= 600;
    else if (shape === 'selfAoe') ok = d <= Math.max(rad, 250) * 0.9;
    else if (shape === 'targetAlly') ok = !u.shields.length && d <= 800;
    else if (shape === 'toggleAura') ok = d <= rad && !u.zonesOwned.W;
    else if (shape === 'blink' || shape === 'dash') ok = d <= 700 && d > 250 && slot !== 'R';
    else if (shape === 'globalLine') ok = d < 2500;
    else ok = d <= (range >= GLOBAL ? 1200 : range) + 20;
    if (slot === 'R' && !['self', 'selfAoe', 'area', 'target', 'cone'].includes(shape) && shape !== 'dash' && shape !== 'globalLine') ok = false;
    if (!ok) continue;
    if (shape === 'targetAlly') { const r = w.orderCast(u, slot, { target: u }); if (r.ok) return; continue; }
    const r = w.orderCast(u, slot, aimAt(w, u, tg, { ...def, shape, missile: def.missile }, rank));
    if (r.ok) return;
  }
  if (!u.attack.windup && !(u.order && u.order.type === 'attack' && u.order.target === tg)) w.orderAttack(u, tg);
}
module.exports = { enabled, decide, pickTarget, aimAt };
