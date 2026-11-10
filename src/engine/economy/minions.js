'use strict';
/* Minions de rota (Bloco 5). Atributos base, XP, ouro, alcance, tempos de ataque e raio vêm dos registros do cliente
   (data/<patch>/minions.json). O CRESCIMENTO por melhoria de 90 s NÃO existe nos dados extraídos (é script da Riot): usamos os
   tetos publicados pela Wiki e uma interpolação linear -> ESTIMADO (declarado em PARAMS, a calibrar no Bloco 10).
   Outros valores da Wiki usados: dano de minion contra campeões e estruturas = 60%; melhorias a cada 90 s a partir de 0:30. */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const PARAMS = {
  firstUpgrade: 30, every: 90, upgradesToCap: 26,                                  /* ESTIMADO: teto atingido ~40 min */
  /* ganho total até o teto (Wiki 26.09: melee 465->1550 PV, 11->80 AD, 0->20 armadura; caster 284->600 PV, 21->125 AD; siege 835->5850 PV, 37.5->126 AD) */
  growth: { melee: { hp: 1085, ad: 69, armor: 20 }, ranged: { hp: 316, ad: 104, armor: 0 }, siege: { hp: 5015, ad: 88.5, armor: 0 }, super: { hp: 0, ad: 0, armor: 0 } },
  siegeGoldPerUpgrade: 1,                                                          /* Wiki: siege 50 + 1 por melhoria */
  /* vida e ouro conforme o guia de minions (1:05 de primeira onda; melhoria a cada 90 s) */
  hpBase: { melee: 477, ranged: 296, siege: 913, super: 1500 }, hpUp: { super: 200 },   /* vida inicial conforme o guia; o crescimento dos outros tipos segue o teto da Wiki (growth): mantem o ritmo de empurrar torres */
  goldBase: { melee: 21, ranged: 14, super: 90 }, siegeGold: { from: 60, to: 90, untilS: 1020 },   /* canhao: 60 -> 90 de ouro ate ~17 min */
  midGoldPenaltyUntil: 840,                                                        /* rota do meio: -1 de ouro por minion ate os 14 min */
  vsChampionStructure: 0.6                                                         /* Wiki: dano de minion contra campeões/estruturas */
};
const TYPE_ID = { melee: 'minionmelee', ranged: 'minionranged', siege: 'minionsiege', super: 'minionsuper' };

const v = x => (x && typeof x === 'object' ? x.baseValue : x);
function upgrades(t) { return t < PARAMS.firstUpgrade ? 0 : Math.min(PARAMS.upgradesToCap, 1 + Math.floor((t - PARAMS.firstUpgrade) / PARAMS.every)); }

function record(loader, team, type) { return loader.minions()['sru_' + (team === 0 ? 'order' : 'chaos') + TYPE_ID[type]].registro; }
function spec(loader, team, type, t) {
  const r = record(loader, team, type), n = upgrades(t), g = PARAMS.growth[type], f = n / PARAMS.upgradesToCap;
  const at = r.basicAttack || {}, key = Object.keys(loader.minions()['sru_' + (team === 0 ? 'order' : 'chaos') + TYPE_ID[type]].objetos || {}).find(k => /BasicAttack$/.test(k));
  const ms = key ? (loader.minions()['sru_' + (team === 0 ? 'order' : 'chaos') + TYPE_ID[type]].objetos[key].mSpell || {}).missileSpeed || 0 : 0;
  return {
    type, hp: PARAMS.hpBase[type] + (type === 'super' ? PARAMS.hpUp.super * n : g.hp * f), ad: v(r.baseDamageModifiable) + g.ad * f, armor: v(r.baseArmorModifiable) + g.armor * f, mr: 0,
    ms: v(r.baseMoveSpeedModifiable), range: v(r.attackRangeModifiable), as: v(r.attackSpeedModifiable),
    total: at.mAttackTotalTime, cast: at.mAttackCastTime, missile: ms, radius: r.overrideGameplayCollisionRadius || r.pathfindingCollisionRadius || 48,
    xp: r.expGivenOnDeath, gold: type === 'siege' ? Math.min(PARAMS.siegeGold.to, PARAMS.siegeGold.from + (PARAMS.siegeGold.to - PARAMS.siegeGold.from) * t / PARAMS.siegeGold.untilS) : PARAMS.goldBase[type], xpRadius: r.experienceRadius, acquire: r.firstAcquisitionRange, wake: r.wakeUpRange
  };
}

function create(w, team, type, lane) {
  const sp = spec(w.loader, team, type, w.t), a = lane.a, b = lane.b, from = team === 0 ? a : b, to = team === 0 ? b : a;
  const path = lane.path ? (team === 0 ? lane.path.concat(lane.end0 ? [lane.end0] : []) : lane.path.slice().reverse().concat(lane.end1 ? [lane.end1] : [])).map(p => ({ x: p.x, y: p.y })) : null;
  const u = {
    id: w.nextId++, kind: 'minion', name: type, team, level: 1, lane, goal: { x: to.x, y: to.y }, path, wp: path ? 1 : 0, spec: sp,
    pos: { x: from.x, y: from.y }, vel: { x: 0, y: 0 }, face: 0, radius: sp.radius, hp: sp.hp, hpMax: sp.hp, mana: 0, manaMax: 0,
    stats: { hp: { base: sp.hp, bonus: 0, total: sp.hp }, ad: { base: sp.ad, bonus: 0, total: sp.ad }, ap: { total: 0, bonus: 0, base: 0 }, armor: { base: sp.armor, bonus: 0, total: sp.armor }, mr: { base: 0, bonus: 0, total: 0 },
      as: { total: sp.as }, ms: { base: sp.ms, bonus: 0, total: sp.ms }, range: sp.range, crit: 0, critDamage: 2, abilityHaste: 0, lethality: 0, hpRegen5: { base: 0, bonus: 0, total: 0 }, manaRegen5: { base: 0, bonus: 0, total: 0 } },
    shields: [], st: [], dr: [], buffs: [], marks: {}, helpers: {}, items: [], itemCd: {}, itemState: {}, zonesOwned: {}, recast: {},
    attack: { readyAt: 0, windup: null }, cast: null, dash: null, order: null, empower: null, dead: false, lastHit: -99, lastDamageAt: -99,
    ai: { enabled: false, next: 0, aim: 0, dodge: 0, react: 0, dodgeUntil: 0 }, born: w.t, stat: { kills: 0, deaths: 0, assists: 0, dmgDealt: 0, dmgTaken: 0, healed: 0, shielded: 0, ccTime: 0, casts: 0, hits: 0, attacks: 0 }
  };
  w.units.push(u); w.emit('minion', { id: u.id, team, mtype: type, hp: Math.round(sp.hp) });
  return u;
}

/* alvo: minion inimigo mais próximo; se não houver, campeão inimigo no alcance (Wiki: minions priorizam minions) */
function pickTarget(w, u) {
  const R = u.spec.acquire || 600, R2 = R * R, ux = u.pos.x, uy = u.pos.y, foe = 1 - u.team; let best = null, bd = 1e18;
  for (const x of w.idx.minions[foe]) { if (x.dead) continue; const dx = x.pos.x - ux, dy = x.pos.y - uy, d = dx * dx + dy * dy; if (d < bd && d <= R2) { best = x; bd = d; } }
  if (best) return best;
  for (const x of w.idx.champs[foe]) { if (x.dead) continue; const r = u.stats.range + x.radius + 15, dx = x.pos.x - ux, dy = x.pos.y - uy, d = dx * dx + dy * dy; if (d <= r * r && d < bd) { best = x; bd = d; } }
  if (best) return best;
  for (const x of w.structs) {                                   /* estruturas inimigas vulneraveis ao alcance (ordem entre campeoes e estruturas: ESTIMADA) */
    if (x.dead || x.invuln || x.team === u.team) continue;
    const r = u.stats.range + x.radius + 15, dx = x.pos.x - ux, dy = x.pos.y - uy, d = dx * dx + dy * dy; if (d <= r * r && d < bd) { best = x; bd = d; }
  }
  return best;
}
function update(w, u) {
  if (u.dead) return;
  if (u.attack.windup && w.t >= u.attack.windup.until - 1e-9) {
    const tg = u.attack.windup.target; u.attack.windup = null;
    if (!tg.dead) {
      const dmg = u.stats.ad.total * ((tg.kind === 'minion') ? 1 : PARAMS.vsChampionStructure);
      u.stat.attacks++;
      if (u.spec.missile > 0) w.exec.spawnHoming(w, u, tg, { speed: u.spec.missile, tag: 'AA', onHit: t => w.dealDamage(u, t, dmg, 'physical', { attack: true, minionAA: true }) });
      else w.dealDamage(u, tg, dmg, 'physical', { attack: true, minionAA: true });
    }
  }
  if (!w.canAct(u)) return;
  if (u.attack.windup) return;
  const tg = pickTarget(w, u);
  if (tg && dist(u.pos, tg.pos) <= u.stats.range + tg.radius + 15) {
    if (w.t >= u.attack.readyAt) {
      const interval = u.spec.total; u.attack.windup = { target: tg, until: w.t + u.spec.cast }; u.attack.readyAt = w.t + interval; u.face = Math.atan2(tg.pos.y - u.pos.y, tg.pos.x - u.pos.x);
    }
    u.vel = { x: 0, y: 0 }; return;
  }
  if (!tg && u.path && u.wp < u.path.length - 1 && dist(u.pos, u.path[u.wp]) < 120) u.wp++;
  const to = tg ? tg.pos : (u.path ? u.path[u.wp] : u.goal), d = dist(u.pos, to);
  if (d < 10) { u.vel = { x: 0, y: 0 }; return; }
  if (w.has(u, 'root')) return;
  const step = Math.min(d, w.msOf(u) * w.dt); w.moveBy(u, (to.x - u.pos.x) / d, (to.y - u.pos.y) / d, step);
}
module.exports = { PARAMS, upgrades, spec, create, update, pickTarget, TYPE_ID };
