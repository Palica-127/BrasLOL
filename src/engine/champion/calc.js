'use strict';
/* Avaliador dos cálculos de habilidade do cliente (mSpellCalculations). Nada aqui é estimado: cada parte é lida dos dados oficiais.
   Convenção confirmada contra o Data Dragon: DataValues[nome].values[rank] (índice 0 = sentinela).
   Códigos de atributo (mStat) CONFIRMADOS pelos nomes dos próprios dados: ausente=AP, 1=Armadura, 2=AD, 4=Vel. de ataque, 6=RM,
   7=Vel. de movimento, 12=Vida máxima. mStatFormula: ausente=total, 2=bônus. Qualquer outro código lança Unsupported (nunca chuta). */
class Unsupported extends Error { constructor(m) { super(m); this.unsupported = true; } }

const STAT = { undefined: 'ap', 0: 'ap', 1: 'armor', 2: 'ad', 4: 'as', 6: 'mr', 7: 'ms', 12: 'hp' };

/* S = estatísticas do conjurador no formato de computeStats ({total,base,bonus} por atributo). */
function stat(S, code, formula) {
  const key = STAT[code];
  if (!key) throw new Unsupported('mStat ' + code);
  if (formula !== undefined && formula !== 0 && formula !== 2) throw new Unsupported('mStatFormula ' + formula);
  const s = S[key];
  if (!s) throw new Unsupported('atributo ausente: ' + key);
  return formula === 2 ? s.bonus : s.total;
}

/* spell = { dv: {nomeMinusculo: values[]}, calcs: {nomeMinusculo: obj}, effects: [..] } ; ctx = { rank, level, S, buffs } */
function evalPart(p, spell, ctx) {
  if (typeof p === 'number') return p;
  if (!p || typeof p !== 'object') throw new Unsupported('parte invalida');
  const sub = x => evalPart(x, spell, ctx);
  switch (p.__type) {
    case 'NumberCalculationPart': return p.mNumber === undefined ? 0 : p.mNumber;
    case 'NamedDataValueCalculationPart': return dvAt(spell, p.mDataValue, ctx.rank);
    case 'StatByNamedDataValueCalculationPart': return stat(ctx.S, p.mStat, p.mStatFormula) * dvAt(spell, p.mDataValue, ctx.rank);
    case 'StatByCoefficientCalculationPart': return stat(ctx.S, p.mStat, p.mStatFormula) * p.mCoefficient;
    case 'StatBySubPartCalculationPart': return stat(ctx.S, p.mStat, p.mStatFormula) * sub(p.mSubpart);
    case 'SumOfSubPartsCalculationPart': return (p.mSubparts || []).reduce((a, x) => a + sub(x), 0);
    case 'ProductOfSubPartsCalculationPart': return sub(p.mPart1) * sub(p.mPart2);
    case 'ClampSubPartsCalculationPart': {
      const v = (p.mSubparts || []).reduce((a, x) => a + sub(x), 0);
      return Math.min(p.mCeiling === undefined ? Infinity : p.mCeiling, Math.max(p.mFloor === undefined ? -Infinity : p.mFloor, v));
    }
    case 'ByCharLevelInterpolationCalculationPart': {            /* linear do nível 1 ao 18 */
      const t = (Math.min(18, Math.max(1, ctx.level)) - 1) / 17;
      return p.mStartValue + (p.mEndValue - p.mStartValue) * t;
    }
    case 'ByCharLevelBreakpointsCalculationPart': {
      if (p.mInitialBonusPerLevel !== undefined) throw new Unsupported('mInitialBonusPerLevel (semantica nao validada)');
      if (p.mLevel1Value === undefined) throw new Unsupported('breakpoints sem mLevel1Value');
      if ((p.mBreakpoints || []).some(b => b.mAdditionalBonusAtThisLevel === undefined)) throw new Unsupported('mBonusPerLevelAtAndAfter (semantica nao validada)');
      let v = p.mLevel1Value;                                       /* degrau: soma o bonus de cada ponto de quebra ja atingido */
      (p.mBreakpoints || []).forEach(b => { if (ctx.level >= b.mLevel) v += b.mAdditionalBonusAtThisLevel; });
      return v;
    }
    case 'BuffCounterByNamedDataValueCalculationPart': return ((ctx.buffs && ctx.buffs[p.mBuffName]) || 0) * dvAt(spell, p.mDataValue, ctx.rank);
    case 'BuffCounterByCoefficientCalculationPart': return ((ctx.buffs && ctx.buffs[p.mBuffName]) || 0) * p.mCoefficient;
    case 'EffectValueCalculationPart': {
      const e = spell.effects && spell.effects[p.mEffectIndex];
      if (!e || !e.value) throw new Unsupported('mEffectAmount[' + p.mEffectIndex + ']');
      return e.value[Math.min(ctx.rank, e.value.length - 1)];
    }
    case 'GameCalculation': case 'GameCalculationModified': return evalCalc(spell, p, ctx);
    default: throw new Unsupported(p.__type || 'sem tipo');
  }
}
function dvAt(spell, name, rank) {
  const d = spell.dv[String(name).toLowerCase()];
  if (!d) throw new Unsupported('DataValue ' + name);
  return d[Math.min(rank, d.length - 1)];
}
function evalCalc(spell, c, ctx) {
  if (typeof c === 'string') {
    const o = spell.calcs[c.toLowerCase()];
    if (!o) throw new Unsupported('calculo ' + c);
    return evalCalc(spell, o, ctx);
  }
  if (c.__type === 'GameCalculationModified') {
    const base = evalCalc(spell, c.mModifiedGameCalculation, c.mOverrideSpellLevel ? { ...ctx, rank: c.mOverrideSpellLevel } : ctx);
    return base * (c.mMultiplier ? evalPart(c.mMultiplier, spell, ctx) : 1);
  }
  if (c.__type === 'GameCalculation') {
    const v = (c.mFormulaParts || []).reduce((a, x) => a + evalPart(x, spell, ctx), 0);
    return v * (c.mMultiplier ? evalPart(c.mMultiplier, spell, ctx) : 1);
  }
  return evalPart(c, spell, ctx);
}
module.exports = { evalCalc, evalPart, Unsupported, STAT };
