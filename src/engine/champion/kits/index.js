'use strict';
/* Registro e resolvedor de kits. resolveSlot() troca cada {dv}/{calc} pelo valor do patch para um rank/nível/atributos,
   devolvendo o que o motor de combate precisa (números concretos + geometria vinda dos dados). */
const { dv, calc } = require('../spells');
const { Unsupported } = require('../calc');
const wave1 = require('./wave1');

const KITS = {};
wave1.forEach(k => { KITS[k.id] = k; });
/* rascunhos gerados por ferramentas/dados/gerar_kits_auto.js: nunca substituem um kit escrito à mão */
try { const auto = require('./auto.json'); Object.keys(auto).forEach(id => { if (!KITS[id]) KITS[id] = auto[id]; }); } catch (e) { /* sem rascunhos */ }

const isRef = x => x && typeof x === 'object' && ('dv' in x || 'calc' in x || 'dmg' in x);
function resolveValue(def, x, ctx) {
  if ('dv' in x) return dv(def, x.dv, ctx.rank);
  if ('dmg' in x) {                                   /* dano/escudo sem cálculo oficial: base + razões dos DataValues do patch (declarado em gaps) */
    const o = x.dmg, S = ctx.S || {}, t = k => (S[k] && S[k].total) || 0;
    return dv(def, o.base, ctx.rank) + (o.ap ? dv(def, o.ap, ctx.rank) * t('ap') : 0) + (o.ad ? dv(def, o.ad, ctx.rank) * t('ad') : 0) + (o.bad ? dv(def, o.bad, ctx.rank) * ((S.ad && S.ad.bonus) || 0) : 0);
  }
  try { return calc(def, x.calc.calc || x.calc, ctx); } catch (e) { if (e instanceof Unsupported) return { unsupported: e.message, calc: x.calc.calc || x.calc }; throw e; }
}
function walk(def, x, ctx) {
  if (Array.isArray(x)) return x.map(v => walk(def, v, ctx));
  if (x && typeof x === 'object') {
    if (isRef(x) && Object.keys(x).length === 1) return resolveValue(def, x, ctx);
    const o = {}; Object.keys(x).forEach(k => { o[k] = walk(def, x[k], ctx); }); return o;
  }
  return x;
}
/* defs = spellDefs(ch); ctx = {rank, level, S} ; slot = 'Q'|'W'|'E'|'R'|'P' */
function resolveSlot(defs, kit, slot, ctx) {
  const def = defs[slot], k = kit[slot];
  if (!def || !k) return null;
  const c = { ...ctx, rank: slot === 'P' ? 1 : ctx.rank };
  return {
    slot, name: def.name, shape: k.shape || null, rank: c.rank,
    geometry: { range: def.range(c.rank), radius: def.radius(c.rank), width: def.width, missile: def.missile, castTime: def.castTime, targeting: def.targeting },
    cooldown: def.cooldown(c.rank), manaCost: def.manaCost(c.rank),
    effects: walk(def, k.effects, c), extra: Object.keys(k).filter(x => !['shape', 'effects'].includes(x)).reduce((o, x) => { o[x] = walk(def, k[x], c); return o; }, {})
  };
}
/* todas as referências {dv}/{calc} do kit: usado pelo teste de integridade */
function refsOf(kit) {
  const out = [];
  const w = (x, slot) => {
    if (Array.isArray(x)) return x.forEach(v => w(v, slot));
    if (x && typeof x === 'object') {
      if (isRef(x) && Object.keys(x).length === 1) {
        if ('dmg' in x) { Object.values(x.dmg).forEach(n => out.push({ slot, dv: n })); return; }
        out.push({ slot, ...('dv' in x ? { dv: x.dv } : { calc: x.calc.calc || x.calc }) }); return;
      }
      Object.values(x).forEach(v => w(v, slot));
    }
  };
  ['P', 'Q', 'W', 'E', 'R'].forEach(s => { if (kit[s]) w(kit[s], s); });
  return out;
}
module.exports = { KITS, resolveSlot, refsOf, kitIds: () => Object.keys(KITS) };
