'use strict';
/* Buffs de selva e objetivos (Bloco 6). Valores: Wiki do LoL (v. 26.x == Data Dragon 16.x). ESTIMADOS e declarados: faixas de nível dos buffs azul/vermelho
   (a Wiki só diz "por nível"), raio das explosões/cadeias das almas, duração do escudo da alma da Montanha, intervalo da alma do Oceano,
   escala por minuto do Barão/Ancião (em objectives.js). Almas e pilhas valem para o time inteiro. */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const tier = (lvl, a, b, c) => (lvl < 9 ? a : lvl < 14 ? b : c);                           /* ESTIMADO: faixas 1-8 / 9-13 / 14-18 */
const K = { FIRE: 'sru_dragon_fire', WATER: 'sru_dragon_water', EARTH: 'sru_dragon_earth', AIR: 'sru_dragon_air', HEX: 'sru_dragon_hextech', CHEM: 'sru_dragon_chemtech' };
const count = (J, team, key) => J.stacks[team].filter(k => k === key).length;
const isChamp = u => u && u.kind !== 'minion' && u.kind !== 'monster';

function grantCrest(w, u, which) {
  if (!isChamp(u)) return;
  const dur = 120;
  if (which === 'blue') {
    u.buffs = u.buffs.filter(b => b.tag !== 'crestBlue');
    w.addBuff(u, { dur, flat: { abilityHaste: tier(u.level, 10, 15, 20), manaRegen5: 0.05 * u.manaMax + 25 }, tag: 'crestBlue', loseOnDeath: true });
  } else u.helpers.crestRed = { until: w.t + dur };
  w.emit('crest', { id: u.id, which });
}

/* após computeStats: pilhas de dragão do time */
function postStats(w, u, S) {
  const J = w.jungle; if (!J || u.kind === 'minion' || u.kind === 'monster') return S;
  const tm = u.team, n = k => count(J, tm, k), h = u.helpers;
  h.oocMs = 0.05 * n(K.AIR); h.slowResist = (h.slowResist || 0) + 0.05 * n(K.AIR); h.oceanPct = 0.02 * n(K.WATER);
  const ch = n(K.CHEM); if (ch) { S.abilityHaste += 5 * ch; const f = 0.02 * ch; S.ad.bonus += S.ad.total * f; S.ad.total += S.ad.total * f; S.ap.bonus += S.ap.total * f; S.ap.total += S.ap.total * f; }   /* especificação: Aceleração de Habilidade e AD/AP adicionais */
  const inf = 0.03 * n(K.FIRE); if (inf) { S.ad.bonus += S.ad.total * inf; S.ad.total += S.ad.total * inf; S.ap.bonus += S.ap.total * inf; S.ap.total += S.ap.total * inf; }
  const mt = 0.05 * n(K.EARTH); if (mt) { S.armor.bonus += S.armor.total * mt; S.armor.total *= 1 + mt; S.mr.bonus += S.mr.total * mt; S.mr.total *= 1 + mt; }
  const hx = n(K.HEX); if (hx) { S.abilityHaste += 5 * hx; S.as.bonus += 0.05 * hx; S.as.total = Math.min(2.5, S.as.base + S.as.ratio * S.as.bonus); }
  h.soul = J.soul[tm];
  return S;
}

function burn(w, src, dst, ticks, each, firstDelay, step, tag) {
  for (let i = 0; i < ticks; i++) w.schedule(w.t + firstDelay + i * step, () => { if (!dst.dead && !src.dead) w.dealDamage(src, dst, each, 'true', { ability: tag, tick: true }); });
}
function onDealDamage(w, src, dst, info) {
  const J = w.jungle; if (!J || !isChamp(src) || dst.team === src.team) return;
  const via = (info.attack || (info.ability && !['item', 'smite', 'crest', 'soul', 'aspect'].includes(info.ability))) && !info.tick;
  if (!via) return;
  const h = src.helpers, hostile = dst.kind !== 'minion';
  /* Brasas do Vermelho: lentidão e queimadura (verdadeiro) */
  if (h.crestRed && h.crestRed.until > w.t && hostile) {
    const ranged = src.stats.range >= 325, a = tier(src.level, ranged ? 0.05 : 0.10, ranged ? 0.075 : 0.15, ranged ? 0.125 : 0.25);
    w.addStatus(dst, { kind: 'slow', dur: 3, amount: a, src, tag: 'crest' });
    if (!(dst.marks.crestBurn && dst.marks.crestBurn.until > w.t)) { dst.marks.crestBurn = { until: w.t + 2 }; burn(w, src, dst, 3, lerp(5, 20, (src.level - 1) / 17), 0.0001, 1, 'crest'); }
  }
  /* Aspecto do Dragão (Ancião): queimadura + execução abaixo de 20% */
  if (h.aspectUntil > w.t && dst.kind !== 'minion' && dst.kind !== 'monster') {
    if (!(dst.marks.aspectBurn && dst.marks.aspectBurn.until > w.t)) { dst.marks.aspectBurn = { until: w.t + 2.25 }; burn(w, src, dst, 3, h.aspectBurn / 3, 0.25, 1, 'aspect'); }
    if (dst.hp < dst.hpMax * 0.2 && !(dst.marks.aspectExec && dst.marks.aspectExec.until > w.t)) {
      dst.marks.aspectExec = { until: w.t + 2 };
      w.schedule(w.t + 0.5, () => { if (!dst.dead && dst.hp < dst.hpMax * 0.2) { w.emit('execute', { src: src.id, dst: dst.id }); w.dealDamage(src, dst, dst.hp + dst.shields.reduce((s, x) => s + x.amount, 0) + 1, 'true', { ability: 'aspect' }); } });
    }
  }
  /* Almas */
  if (dst.kind === 'minion' || dst.kind === 'monster' || !h.soul) return;
  const cd = (key, secs) => { const t = (src.itemCd[key] || 0); if (t > w.t) return false; src.itemCd[key] = w.t + secs; return true; };
  const bAD = src.stats.ad.bonus, ap = src.stats.ap.total, bHP = src.stats.hp.bonus;
  if (h.soul === K.FIRE && cd('soulFire', 3)) {
    const a = 100 + 0.225 * bAD + 0.135 * ap + 0.0275 * bHP, type = bAD > ap ? 'physical' : 'magic';
    w.units.filter(x => !x.dead && x.team !== src.team && x.kind !== 'minion' && dist(x.pos, dst.pos) <= 350 + x.radius).forEach(x => w.dealDamage(src, x, a, type, { ability: 'soul', tick: true }));
  } else if (h.soul === K.HEX && cd('soulHex', 8)) {
    const a = lerp(25, 52.94, (src.level - 1) / 17), slow = src.stats.range >= 325 ? 0.35 : 0.45;
    [dst, ...w.units.filter(x => !x.dead && x !== dst && x.team !== src.team && x.kind !== 'minion' && x.kind !== 'monster' && dist(x.pos, dst.pos) <= 600)].slice(0, 3).forEach(x => { w.dealDamage(src, x, a, 'true', { ability: 'soul', tick: true }); w.addStatus(x, { kind: 'slow', dur: 2, amount: slow, src, tag: 'soul' }); });
  } else if (h.soul === K.WATER && cd('soulWater', 4)) {
    w.heal(src, 150 + 0.26 * bAD + 0.17 * ap + 0.07 * bHP, src); src.mana = Math.min(src.manaMax, src.mana + 100 + 0.035 * src.manaMax);      /* instantâneo (simplificação: a Wiki diz ao longo de 4 s) */
  }
}

function tick(w, u) {
  const J = w.jungle; if (!J || u.kind === 'minion' || u.kind === 'monster') return;
  const h = u.helpers, now = w.t, combat = now - Math.max(u.lastDamageAt, u.lastDealtAt || -99) < 5;
  if (h.crestRed && h.crestRed.until <= now) h.crestRed = null;
  if (h.oceanPct && now >= (h.nextOcean || 0)) { h.nextOcean = now + 5; w.heal(u, (u.hpMax - u.hp) * h.oceanPct, u); }
  if (h.crestRed && !combat && now >= (h.nextRedRegen || 0)) { h.nextRedRegen = now + 5; w.heal(u, u.hpMax * (u.level < 6 ? 0.005 : u.level < 11 ? 0.01 : u.level < 16 ? 0.015 : 0.03), u); }      /* faixas ESTIMADAS */
  h.oocMsNow = !combat ? (h.oocMs || 0) : 0;
  h.soulMs = 0;
  if (h.soul === K.AIR) h.soulMs = h.soulMsUntil > now ? 0.6 : 0.15;
  if (h.soul === K.EARTH && now - u.lastDamageAt >= 5 && now >= (u.itemCd.soulMtn || 0)) {
    u.itemCd.soulMtn = now + 5; w.addShield(u, 220 + 0.16 * u.stats.ad.bonus + 0.12 * u.stats.ap.total + 0.12 * u.stats.hp.bonus, { dur: 8, src: u });      /* duração ESTIMADA */
  }
  if (h.soul === K.CHEM) {
    const low = u.hp < u.hpMax * 0.5; h.dmgAmp = low ? 0.13 : 0;
    u.dr = u.dr.filter(r => r.tag !== 'soulChem'); if (low) u.dr.push({ pct: 0.13, until: now + 1, tag: 'soulChem' });
  }
}
/* gancho de conjuração: alma da Nuvem acelera após a ultimate (recarga 30 s) */
function onCast(w, u, slot) {
  if (slot === 'R' && u.helpers.soul === K.AIR && (u.itemCd.soulAir || 0) <= w.t) { u.itemCd.soulAir = w.t + 30; u.helpers.soulMsUntil = w.t + 6; }
}
function onDeath(w, u) {
  u.buffs = u.buffs.filter(b => !b.loseOnDeath); u.helpers.crestRed = null; u.helpers.aspectUntil = 0;
}
/* Habilidade do Dragão Ancestral: dragões elementais ficam resistentes contra quem tem pilhas (15% por pilha, até 60%) */
function extraReductions(w, src, dst) {
  const J = w.jungle; if (!J || dst.kind !== 'monster' || dst.epicKey !== 'drake' || dst.name === 'sru_dragon_elder' || !isChamp(src)) return [];
  const n = Math.min(4, J.stacks[src.team].length); return n ? [{ pct: 0.15 * n }] : [];
}
module.exports = { grantCrest, postStats, onDealDamage, tick, onCast, onDeath, extraReductions, K, tier };
