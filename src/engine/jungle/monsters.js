'use strict';
/* Monstros neutros (Bloco 6). Atributos base, crescimento por nível, XP, ouro, alcance e tempos de ataque vêm dos registros do cliente
   (data/<patch>/monstros.json). Epicos (dragões, arauto, barão, larvas) trazem `hpPerLevel`/`damagePerLevel` e usam a mesma fórmula de
   crescimento dos campeões; níveis mínimos foram DERIVADOS conferindo os extremos publicados na Wiki (larva 7, dragão 6, arauto 9, barão 11, ancião 13).
   Monstros de acampamento NÃO têm crescimento no registro: usamos a razão (vida no nível 18 / vida base) publicada na Wiki -> ESTIMADO. */
const { growthFactor } = require('../champion/stats');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const v = x => (x && typeof x === 'object' && 'baseValue' in x ? x.baseValue : x);

/* nível mínimo de nascimento dos épicos (derivado dos extremos de vida da Wiki) */
const MIN_LEVEL = { sru_horde: 7, sru_dragon: 6, sru_dragon_air: 6, sru_dragon_chemtech: 6, sru_dragon_earth: 6, sru_dragon_fire: 6, sru_dragon_hextech: 6, sru_dragon_water: 6, sru_riftherald: 9, sru_baron: 11, sru_dragon_elder: 13 };
/* razão vida(18)/vida base das Wiki para acampamentos (ESTIMADO); XP cresce 1,5x até o nível 18 (Wiki); dano 3x (Wiki só para azul/vermelho) */
const CAMP_HP_RATIO = { sru_blue: 6210 / 2300, sru_red: 6210 / 2300 }, CAMP_HP_RATIO_DEFAULT = 3172.5 / 1350, CAMP_AD_RATIO = 3, CAMP_XP_RATIO = 1.5;
const LEASH = { default: 650, epic: 1200 };                                           /* Wiki: azul/vermelho 650, arauto 1200 */
const EPIC = new Set(Object.keys(MIN_LEVEL));
const SMITABLE = new Set(['sru_blue', 'sru_red', 'sru_gromp', 'sru_murkwolf', 'sru_razorbeak', 'sru_krug', 'sru_crab', ...[...EPIC]]);

function spec(loader, key, level) {
  const r = loader.monsters()[key].registro, f = growthFactor(level) / 17, epic = EPIC.has(key);
  const hpPer = v(r.hpPerLevelModifiable), adPer = v(r.damagePerLevelModifiable), arPer = v(r.armorPerLevelModifiable) || 0, mrPer = v(r.mrPerLevel) || 0;
  const g = growthFactor(level);
  let hp = v(r.baseHPModifiable), ad = v(r.baseDamageModifiable), xp = r.expGivenOnDeath;
  if (hpPer !== undefined) { hp += hpPer * g; if (adPer !== undefined) ad += adPer * g; }
  else if (!epic) { hp *= 1 + ((CAMP_HP_RATIO[key] || CAMP_HP_RATIO_DEFAULT) - 1) * f; ad *= 1 + (CAMP_AD_RATIO - 1) * f; xp *= 1 + (CAMP_XP_RATIO - 1) * f; }
  const at = r.basicAttack || {};
  return {
    key, epic, level, hp, ad, armor: (v(r.baseArmorModifiable) || 0) + arPer * g, mr: (v(r.baseMR) || v(r.baseSpellBlockModifiable) || 0) + mrPer * g,
    ms: v(r.baseMoveSpeedModifiable), range: v(r.attackRangeModifiable) || 175, as: v(r.attackSpeedModifiable) || 0.6,
    total: at.mAttackTotalTime || 1 / (v(r.attackSpeedModifiable) || 0.6), cast: at.mAttackCastTime || 0.3,
    radius: r.overrideGameplayCollisionRadius || r.pathfindingCollisionRadius || 60, xp, gold: r.goldGivenOnDeath || 0, xpRadius: r.experienceRadius > 0 ? r.experienceRadius : 1400,
    leash: epic ? LEASH.epic : LEASH.default, smitable: SMITABLE.has(key)
  };
}

function create(w, key, home, camp, level) {
  const sp = spec(w.loader, key, level);
  const u = {
    id: w.nextId++, kind: 'monster', name: key, team: 2, level, camp, home: { x: home.x, y: home.y }, spec: sp, target: null, born: w.t,
    pos: { x: home.x, y: home.y }, vel: { x: 0, y: 0 }, face: 0, radius: sp.radius, hp: sp.hp, hpMax: sp.hp, mana: 0, manaMax: 0,
    stats: { hp: { base: sp.hp, bonus: 0, total: sp.hp }, ad: { base: sp.ad, bonus: 0, total: sp.ad }, ap: { total: 0, bonus: 0, base: 0 }, armor: { base: sp.armor, bonus: 0, total: sp.armor }, mr: { base: sp.mr, bonus: 0, total: sp.mr },
      as: { total: sp.as }, ms: { base: sp.ms, bonus: 0, total: sp.ms }, range: sp.range, crit: 0, critDamage: 2, abilityHaste: 0, lethality: 0, hpRegen5: { base: 0, bonus: 0, total: 0 }, manaRegen5: { base: 0, bonus: 0, total: 0 } },
    shields: [], st: [], dr: [], buffs: [], marks: {}, helpers: {}, items: [], itemCd: {}, itemState: {}, zonesOwned: {}, recast: {},
    attack: { readyAt: 0, windup: null }, cast: null, dash: null, order: null, empower: null, dead: false, lastHit: -99, lastDamageAt: -99,
    ai: { enabled: false, next: 0, aim: 0, dodge: 0, react: 0, dodgeUntil: 0 }, stat: { kills: 0, deaths: 0, assists: 0, dmgDealt: 0, dmgTaken: 0, healed: 0, shielded: 0, ccTime: 0, casts: 0, hits: 0, attacks: 0 }
  };
  w.units.push(u); w.emit('monster', { id: u.id, mkey: key, level, hp: Math.round(sp.hp) });
  return u;
}

/* IA do monstro: parado até ser atacado; persegue o agressor dentro da correia; ao perder o alvo volta para casa e se cura */
function update(w, u) {
  if (u.dead) return;
  if (u.attack.windup && w.t >= u.attack.windup.until - 1e-9) {
    const tg = u.attack.windup.target; u.attack.windup = null;
    if (!tg.dead) { u.stat.attacks++; w.dealDamage(u, tg, u.stats.ad.total, 'physical', { attack: true, monsterAA: true }); }
  }
  if (!w.canAct(u)) return;
  /* agro compartilhado pelo acampamento */
  if (!u.target || u.target.dead) {
    u.target = null;
    const hitBy = u.lastAttacker && w.t - u.lastDamageAt < 3 ? w.byId(u.lastAttacker) : null;
    if (!u.evading && hitBy && !hitBy.dead && hitBy.team !== 2) u.target = hitBy;
    else if (u.camp) { const mate = u.camp.members.find(m => !m.dead && m.target && !m.target.dead); if (mate) u.target = mate.target; }
  }
  /* correia: se o MONSTRO se afasta demais de casa, desiste, volta e ignora agressões até chegar (Wiki: perde a paciência, regenera e volta) */
  if (u.target && (dist(u.pos, u.home) > u.spec.leash || u.target.dead)) { if (!u.target.dead) u.evading = true; u.target = null; }
  if (u.evading && dist(u.pos, u.home) <= 20) u.evading = false;
  if (u.attack.windup) return;
  if (u.target) {
    const d = dist(u.pos, u.target.pos);
    if (d <= u.stats.range + u.target.radius + 15) {
      if (w.t >= u.attack.readyAt) { u.attack.windup = { target: u.target, until: w.t + u.spec.cast }; u.attack.readyAt = w.t + u.spec.total; u.face = Math.atan2(u.target.pos.y - u.pos.y, u.target.pos.x - u.pos.x); }
      u.vel = { x: 0, y: 0 }; return;
    }
    if (!w.has(u, 'root')) w.moveBy(u, (u.target.pos.x - u.pos.x) / d, (u.target.pos.y - u.pos.y) / d, Math.min(d, w.msOf(u) * w.dt));
    return;
  }
  const d = dist(u.pos, u.home);
  if (d > 8) { w.moveBy(u, (u.home.x - u.pos.x) / d, (u.home.y - u.pos.y) / d, Math.min(d, w.msOf(u) * w.dt)); u.hp = Math.min(u.hpMax, u.hp + u.hpMax * 0.1 * w.dt); }   /* regenera ao voltar */
  else if (u.hp < u.hpMax) u.hp = Math.min(u.hpMax, u.hp + u.hpMax * 0.2 * w.dt);
}
module.exports = { spec, create, update, MIN_LEVEL, EPIC, SMITABLE, LEASH };
