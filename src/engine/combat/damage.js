'use strict';
/* Matemática de dano (funções puras). Fontes: Wiki do LoL (fórmulas); parâmetros do campeão vêm dos dados oficiais.
   Ordem de resistências (Wiki): redução % -> redução plana -> penetração % -> penetração plana/letalidade.
   Penetração nunca reduz abaixo de 0; reduções (que vêm de debuffs) podem deixar a resistência negativa. */

/* multiplicador de dano para uma resistência efetiva: 100/(100+r); negativa: 2 - 100/(100-r) */
const resistMultiplier = r => (r >= 0 ? 100 / (100 + r) : 2 - 100 / (100 - r));

/* letalidade -> penetração plana: lethality * (0,6 + 0,4 * nível_do_atacante/18) */
const lethalityToFlat = (lethality, level) => lethality * (0.6 + 0.4 * Math.min(18, Math.max(1, level)) / 18);

/* p = { reductionPct, reductionFlat, penPct, penFlat }  (frações; plano em pontos) */
function effectiveResist(res, p) {
  p = p || {};
  let r = res;
  if (p.reductionPct && r > 0) r *= (1 - p.reductionPct);
  if (p.reductionFlat) r -= p.reductionFlat;
  if (r > 0 && p.penPct) r *= (1 - p.penPct);
  if (r > 0 && p.penFlat) r = Math.max(0, r - p.penFlat);
  return r;
}

/* dano depois das resistências (ainda antes de redução % geral e escudos) */
function mitigate(amount, type, target, pen) {
  if (type === 'true') return amount;
  const res = type === 'physical' ? target.armor : target.mr;
  return amount * resistMultiplier(effectiveResist(res, pen));
}

/* ataque crítico: multiplicador = dano crítico do campeão (dado oficial: 2 = 200%) */
const critMultiplier = (critDamage, bonusCritDamage) => critDamage + (bonusCritDamage || 0);

/* Aplica redução de dano multiplicativa e escudos. unit = { hp, shields:[{amount,type:'all'|'magic'|'physical',until}] }.
   reductions = [{pct, flat, types?}]. Devolve o que foi de fato absorvido/aplicado.
   Ordem: redução %/plana -> escudos (do mais antigo para o mais novo) -> vida. Escudo de tipo só absorve o próprio tipo. */
function applyToUnit(unit, postResist, type, reductions) {
  let d = postResist;
  const red = { pct: 0, flat: 0 };
  let mult = 1, flat = 0;
  (reductions || []).forEach(r => { if (!r.types || r.types.includes(type)) { mult *= (1 - (r.pct || 0)); flat += r.flat || 0; } });
  d = Math.max(0, d * mult - flat);
  const reducedBy = postResist - d;
  let absorbed = 0, left = d;
  for (const s of unit.shields) {
    if (left <= 0) break;
    if (s.type !== 'all' && s.type !== type) continue;
    const a = Math.min(s.amount, left); s.amount -= a; left -= a; absorbed += a;
  }
  unit.shields = unit.shields.filter(s => s.amount > 1e-9);
  const dealt = Math.min(unit.hp, left);
  unit.hp -= dealt;
  return { dealt, absorbed, reducedBy, overkill: left - dealt, killed: unit.hp <= 1e-9 };
}

/* tenacidade: encurta controles (exceto arremesso/levantamento e supressão) */
const TENACITY_IMMUNE = new Set(['knockup', 'knockback', 'suppress']);
const tenacityDuration = (dur, tenacity, kind) => (TENACITY_IMMUNE.has(kind) ? dur : dur * (1 - Math.min(0.9, Math.max(0, tenacity))));

/* várias lentidões: a mais forte vale inteira e as demais 35% (Wiki; conferir no Bloco 10) */
function stackSlows(amounts) {
  const a = amounts.slice().sort((x, y) => y - x);
  if (!a.length) return 0;
  return Math.min(0.95, a[0] + a.slice(1).reduce((s, x) => s + x * 0.35, 0));
}

/* cura: limitada à vida máxima; ferimentos graves reduzem; devolve o quanto curou */
function heal(unit, amount, healReduction) {
  const amt = amount * (1 - (healReduction || 0)), before = unit.hp;
  unit.hp = Math.min(unit.hpMax, unit.hp + amt);
  return unit.hp - before;
}

module.exports = { resistMultiplier, lethalityToFlat, effectiveResist, mitigate, critMultiplier, applyToUnit, tenacityDuration, stackSlows, heal, TENACITY_IMMUNE };
