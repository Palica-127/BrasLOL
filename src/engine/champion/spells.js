'use strict';
/* Definições normalizadas das habilidades de um campeão (lidas dos dados oficiais) e o estado de cooldown/rank/custo de quem as usa.
   Convenções do cliente (verificadas contra o Data Dragon em todos os campeões):
     recarga e DataValues: índice = rank (0 é sentinela) · custo de mana: índice = rank-1 · castRange 25000 = direcional sem limite. */
const { evalCalc } = require('./calc');

const SLOTS = ['Q', 'W', 'E', 'R'];
const lower = o => { const r = {}; Object.keys(o || {}).forEach(k => r[k.toLowerCase()] = o[k]); return r; };

function missileOf(ch, key, m) {
  if (m.missileSpeed) return { speed: m.missileSpeed, width: m.mLineWidth || null, src: 'spell' };
  const dir = key.split('/').slice(0, -1).join('/').toLowerCase();
  for (const k of Object.keys(ch.objetos_habilidade)) {
    if (k.toLowerCase().startsWith(dir + '/') && k !== key) {
      const ms = (ch.objetos_habilidade[k].mSpell || {}).mMissileSpec;
      if (ms && ms.movementComponent) {
        const mv = ms.movementComponent, sp = mv.mSpeed || mv.mInitialSpeed || mv.mMaxSpeed;
        if (sp) return { speed: sp, width: ms.mMissileWidth || null, src: k.split('/').pop() };
      }
    }
  }
  return null;
}

function buildDef(ch, i, key, textSlot) {
  const o = ch.objetos_habilidade[key], m = (o && o.mSpell) || {}, t = textSlot || {};
  const dd = t.recarga || [];
  const cd = m.cooldownTime && m.cooldownTime.length ? { v: m.cooldownTime, src: 'riot-cdragon' }
    : { v: [0].concat(dd), src: dd.length ? 'riot-ddragon' : 'ausente' };      /* alguns spells nao trazem recarga no extrato do cliente */
  const rangeOv = m.castRangeDisplayOverride, castRange = m.castRange;
  const range = rank => {
    const r = rangeOv && rangeOv[Math.min(rank, rangeOv.length - 1)];
    if (r) return r;
    const c = castRange && castRange[Math.min(rank, castRange.length - 1)];
    return c && c < 25000 ? c : null;
  };
  return {
    slot: i < 4 ? SLOTS[i] : 'P', key, name: t.nome || key.split('/').pop(),
    maxRank: t.nivel_max || (i === 3 ? 3 : 5),
    cooldown: rank => cd.v[Math.min(rank, cd.v.length - 1)], cooldownSrc: cd.src,
    manaCost: rank => (m.mana ? m.mana[Math.min(rank - 1, m.mana.length - 1)] : 0) || 0,
    costType: t.tipo_custo || null,
    castTime: m.mCastTime !== undefined ? m.mCastTime : (m.spellCastTime || 0), totalTime: m.spellTotalTime || 0,
    range, radius: rank => (m.castRadius ? m.castRadius[Math.min(rank, m.castRadius.length - 1)] : null),
    width: m.mLineWidth || null, missile: missileOf(ch, key, m),
    targeting: (m.mTargetingTypeData && m.mTargetingTypeData.__type) || null,
    tags: m.mSpellTags || [], canCastWhileDisabled: !!m.canCastWhileDisabled,
    spell: { dv: lower(Object.fromEntries((m.DataValues || []).filter(d => d.values).map(d => [d.name, d.values]))), calcs: lower(m.mSpellCalculations), effects: m.mEffectAmount },
    has: name => !!lower(Object.fromEntries((m.DataValues || []).map(d => [d.name, 1])))[String(name).toLowerCase()]
  };
}

/* Retorna {Q,W,E,R,P}; P = passiva (pode ser null) */
function spellDefs(ch) {
  const out = {};
  ch.habilidades_chaves.forEach((k, i) => { out[SLOTS[i]] = k ? buildDef(ch, i, k, ch.habilidades_texto[i]) : null; });
  const pk = (ch.passiva_chaves || []).find(k => /Passive$|P$/i.test(k.split('/').pop())) || (ch.passiva_chaves || [])[0];
  out.P = pk ? buildDef(ch, 4, pk, { nome: ch.passiva_texto.nome }) : null;
  return out;
}

const calc = (def, name, ctx) => evalCalc(def.spell, name, ctx);
const dv = (def, name, rank) => { const d = def.spell.dv[String(name).toLowerCase()]; if (!d) throw new Error('DataValue ' + name + ' em ' + def.key); return d[Math.min(rank, d.length - 1)]; };

/* ---- estado de habilidades de um campeão em jogo ---- */
const maxRankAt = (slot, level) => slot === 'R' ? (level >= 16 ? 3 : level >= 11 ? 2 : level >= 6 ? 1 : 0) : Math.min(5, Math.ceil(level / 2));  /* Wiki */
class AbilitySet {
  constructor(defs) { this.defs = defs; this.rank = { Q: 0, W: 0, E: 0, R: 0 }; this.readyAt = { Q: 0, W: 0, E: 0, R: 0 }; this.points = 0; }
  canLevel(slot, level) {
    const d = this.defs[slot];
    return !!d && this.points > 0 && this.rank[slot] < Math.min(d.maxRank, maxRankAt(slot, level));
  }
  levelUp(slot, level) { if (!this.canLevel(slot, level)) return false; this.rank[slot]++; this.points--; return true; }
  /* tempo de recarga efetivo com Ability Haste: cd * 100/(100+AH) */
  cooldownOf(slot, abilityHaste) { return this.defs[slot].cooldown(this.rank[slot]) * 100 / (100 + (abilityHaste || 0)); }
  check(slot, now, unit) {                                      /* unit: {mana, abilityHaste, silenced, stunned, dead} */
    const d = this.defs[slot];
    if (!d || this.rank[slot] < 1) return { ok: false, reason: 'sem-rank' };
    if (unit.dead) return { ok: false, reason: 'morto' };
    if ((unit.stunned || unit.silenced) && !d.canCastWhileDisabled) return { ok: false, reason: unit.stunned ? 'atordoado' : 'silenciado' };
    if (now < this.readyAt[slot]) return { ok: false, reason: 'recarga', restante: this.readyAt[slot] - now };
    const cost = d.manaCost(this.rank[slot]);
    if (d.costType !== 'Sem custo' && unit.mana < cost) return { ok: false, reason: 'mana', falta: cost - unit.mana };
    return { ok: true, cost };
  }
  /* inicia a conjuração: devolve custo e quando a habilidade volta; o efeito em si é do motor de combate (Bloco 3) */
  cast(slot, now, unit) {
    const c = this.check(slot, now, unit);
    if (!c.ok) return c;
    const d = this.defs[slot], cd = this.cooldownOf(slot, unit.abilityHaste);
    this.readyAt[slot] = now + cd;
    return { ok: true, slot, rank: this.rank[slot], cost: c.cost, cooldown: cd, castTime: d.castTime, hitAt: now + d.castTime };
  }
  reduceCooldown(slot, seconds) { this.readyAt[slot] -= seconds; }
}

module.exports = { spellDefs, AbilitySet, calc, dv, maxRankAt, SLOTS };
