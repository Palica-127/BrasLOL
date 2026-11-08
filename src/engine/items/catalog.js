'use strict';
/* Catálogo de itens da Summoner's Rift (mapa 11) a partir de data/<patch>/items.json (Data Dragon + CommunityDragon).
   Nada é inventado: preço, receita e atributos vêm dos dados. Ids de Arena (>= 320000 / duplicatas) e variantes da Kalista ficam de fora.
   Classe: starter | component | epic | legendary | boots | consumable | trinket | other. */
const { createLoader } = require('../data/loader');

/* atributo do cliente -> modificador do computeStats / extras. Valores já em fração onde o cliente usa fração. */
const STAT_MAP = {
  mFlatHPPoolMod: ['flat', 'hp'], mFlatMPPoolMod: ['flat', 'mana'], mFlatPhysicalDamageMod: ['flat', 'ad'], mFlatMagicDamageMod: ['flat', 'ap'],
  mFlatArmorMod: ['flat', 'armor'], mFlatSpellBlockMod: ['flat', 'mr'], mFlatMovementSpeedMod: ['flat', 'ms'], mPercentMovementSpeedMod: ['pct', 'ms'],
  mPercentAttackSpeedMod: ['pct', 'as'], mFlatCritChanceMod: ['flat', 'crit'], mAbilityHasteMod: ['flat', 'abilityHaste'], mFlatHPRegenMod: ['flat', 'hpRegen5'],
  mFlatCritDamageMod: ['extra', 'critDamage'], mPercentLifeStealMod: ['extra', 'lifesteal'], mPercentTenacityItemMod: ['extra', 'tenacity'],
  mPercentHealingAmountMod: ['extra', 'healPower'], mPercentSlowResistMod: ['extra', 'slowResist'], mFlatMagicPenetrationMod: ['extra', 'magicPenFlat'],
  mPercentArmorPenetrationMod: ['extra', 'armorPenPct'], mPercentMagicPenetrationMod: ['extra', 'magicPenPct'], mPercentBaseHPRegenMod: ['extra', 'baseHpRegenPct']
};
/* DataValues que funcionam como atributo (não aparecem em mStats) */
const DV_STATS = { LethalityAmount: ['flat', 'lethality'] };

function classify(it) {
  const t = it.tags || [];
  if (t.includes('Trinket')) return 'trinket';
  if (t.includes('Consumable')) return 'consumable';
  if (t.includes('Boots')) return 'boots';
  const de = (it.de || []).length, para = (it.para || []).length;
  if (!de && !para) return it.preco <= 500 ? 'starter' : (it.preco >= 1500 ? 'legendary' : 'other');
  if (!para) return it.preco >= 2200 ? 'legendary' : 'other';
  return de ? 'epic' : 'component';
}

function build(loader) {
  loader = loader || createLoader();
  const raw = Object.values(loader.items()).filter(x => x.mapas && x.mapas.includes(11) && x.na_loja && x.id < 320000 && x.id !== 3600 && x.id !== 667666);
  const byName = {}; raw.sort((a, b) => a.id - b.id).forEach(x => { if (!byName[x.nome]) byName[x.nome] = x; });
  const items = {}; Object.values(byName).forEach(x => { items[x.id] = x; });
  const ITEMS = {};
  Object.values(items).forEach(x => {
    const mods = { flat: {}, pct: {}, extra: {} };
    const add = (k, v) => { mods[k[0]][k[1]] = (mods[k[0]][k[1]] || 0) + v; };
    Object.entries(x.cdragon.stats || {}).forEach(([k, v]) => { if (!STAT_MAP[k]) throw new Error('atributo de item desconhecido: ' + k + ' em ' + x.nome); add(STAT_MAP[k], v); });
    if (!mods.flat.mana && x.stats_ddragon && x.stats_ddragon.FlatMPPoolMod) add(['flat', 'mana'], x.stats_ddragon.FlatMPPoolMod);   /* o extrato do cliente não traz mana: cai para o Data Dragon */
    (x.cdragon.dados || []).forEach(d => { if (DV_STATS[d.mName] && typeof d.mValue === 'number') add(DV_STATS[d.mName], d.mValue); });
    const dv = {}; (x.cdragon.dados || []).forEach(d => { if (d.mValue !== undefined) dv[String(d.mName).toLowerCase()] = [0, d.mValue]; });
    ITEMS[x.id] = {
      id: x.id, name: x.nome, price: x.preco, combine: x.preco_combinar, sell: x.vendavel, from: (x.de || []).filter(i => items[i] || true), into: x.para || [],
      tags: x.tags, cls: classify(x), mods, dv, calcs: x.cdragon.calculos || {}, text: x.descricao, simple: x.texto_simples, maxStack: x.cdragon.empilhamento_max || 1,
      hasPassive: /<passive>|<active>/.test(x.descricao || ''), raw: x
    };
  });
  Object.values(ITEMS).forEach(i => { i.from = i.from.filter(c => ITEMS[c]); i.into = i.into.filter(c => ITEMS[c]); });
  return ITEMS;
}
let CACHE = null;
const catalog = loader => (loader ? build(loader) : (CACHE = CACHE || build()));
const byName = (cat, n) => Object.values(cat).find(i => i.name === n);
/* todos os componentes (recursivo) de um item */
function components(cat, id) { const o = []; (cat[id].from || []).forEach(c => { o.push(c); o.push(...components(cat, c)); }); return o; }
/* soma dos atributos de uma lista de ids -> { flat, pct, extra } */
function sumMods(cat, ids) {
  const r = { flat: {}, pct: {}, extra: {} };
  ids.forEach(id => { const m = cat[id].mods; ['flat', 'pct', 'extra'].forEach(g => Object.entries(m[g]).forEach(([k, v]) => { r[g][k] = (r[g][k] || 0) + v; })); });
  return r;
}
module.exports = { catalog, classify, components, sumMods, byName, STAT_MAP };
