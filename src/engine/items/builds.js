'use strict';
/* Builds inteligentes (Bloco 4): o campeão é analisado pelos próprios dados (proporção AP/AD/defesa nos cálculos oficiais das habilidades,
   classes do Data Dragon, alcance de ataque) e recebe um arquétipo; os itens são ordenados por valor em ouro dos atributos que o arquétipo quer
   (eficiência = valor do atributo / preço) e a build se adapta à composição inimiga (dano AP/AD, vida alta).
   Valores em ouro por atributo: tabela de eficiência da Wiki do LoL (ESTIMADO/REFERÊNCIA; usada só para ESCOLHER itens, nunca no combate). */
const { catalog, components } = require('./catalog');
const FX = require('./effects'), CUR = require('./curated');

/* ouro por unidade de atributo (referência Wiki). pct e crit/fração -> por 1% = valor/100 aplicado na fração */
const GOLD = { ad: 35, ap: 21.75, hp: 2.67, armor: 20, mr: 18, mana: 1.4, abilityHaste: 26.5, ms: 12, crit: 40 * 100, as: 25 * 100, lifesteal: 27.5 * 100, msPct: 39.6 * 100,
  magicPenFlat: 31.1, armorPenPct: 33 * 100, magicPenPct: 33 * 100, lethality: 30, hpRegen5: 36, baseHpRegenPct: 3, tenacity: 20 * 100, critDamage: 40 * 100 / 2, healPower: 15 * 100 };

/* quanto cada arquétipo quer de cada atributo (0..1) */
const ARCH = {
  'mago':       { ap: 1, abilityHaste: .6, mana: .35, magicPenFlat: .8, magicPenPct: .9, hp: .25, mr: .08, armor: .08 },
  'atirador':   { ad: 1, as: .9, crit: .9, critDamage: .7, lifesteal: .4, armorPenPct: .5, lethality: .3, hp: .1, ms: .2 },
  'lutador':    { ad: .9, hp: .65, abilityHaste: .6, armor: .35, mr: .3, armorPenPct: .35, lethality: .35, as: .25, lifesteal: .25, tenacity: .25 },
  'assassino':  { ad: 1, lethality: .95, abilityHaste: .55, armorPenPct: .5, hp: .15, ms: .25 },
  'tanque':     { hp: 1, armor: .9, mr: .9, abilityHaste: .5, tenacity: .3, baseHpRegenPct: .3, ad: .05 },
  'suporte':    { abilityHaste: 1, hp: .45, ap: .3, mr: .3, armor: .3, mana: .2, healPower: .5, hpRegen5: .1 },
  'mago-tanque':{ ap: .6, hp: .8, abilityHaste: .6, armor: .5, mr: .5, mana: .2 },
  'tanque-suporte': { hp: .7, armor: .8, mr: .8, abilityHaste: .8, tenacity: .2, ms: .1 },                    /* Bloco 4b: engage/protetor: sem Warmog, mais defesa ativa */
  'encantador': { abilityHaste: 1, healPower: .9, ap: .35, hp: .3, mana: .4, ms: .2, hpRegen5: .1 }
};
const NO_SUPPORT = new Set([3083, 6657, 3084]);                  /* itens de rota/farm que suporte de fallback não compra (Warmog, Bastão das Eras, Coração de Aço) */

/* proporção de AP/AD/defesa nos cálculos de habilidade: lê mStat de cada parte (ausente=AP, 2=AD, 1/6/12=defesa) */
function scalingProfile(ch) {
  const w = { ap: 0, ad: 0, def: 0 };
  Object.values(ch.objetos_habilidade || {}).forEach(o => {
    const calcs = (o.mSpell && o.mSpell.mSpellCalculations) || {};
    (function walk(x) {
      if (Array.isArray(x)) return x.forEach(walk);
      if (x && typeof x === 'object') {
        if (/^Stat/.test(x.__type || '')) { const s = x.mStat; if (s === undefined || s === 0) w.ap++; else if (s === 2) w.ad++; else if (s === 1 || s === 6 || s === 12) w.def++; }
        Object.values(x).forEach(walk);
      }
    })(calcs);
  });
  return w;
}
function profile(ch) {
  const roles = ch.funcoes || [], ranged = ch.stats_cdragon.alcance_ataque >= 325, sc = scalingProfile(ch), tot = (sc.ap + sc.ad) || 1;
  const apShare = sc.ap / tot, has = r => roles.includes(r);
  const main = roles[0], second = roles[1];
  let arch;                                                       /* a PRIMEIRA função do Data Dragon manda; a segunda desempata */
  if (main === 'Marksman') arch = apShare > 0.6 ? 'mago' : 'atirador';
  else if (main === 'Assassin') arch = apShare > 0.5 ? 'mago' : 'assassino';
  else if (main === 'Mage') arch = second === 'Tank' ? 'mago-tanque' : 'mago';
  else if (main === 'Fighter') arch = apShare > 0.6 ? 'mago' : (second === 'Assassin' ? 'assassino' : 'lutador');
  else if (main === 'Tank') arch = second === 'Mage' ? 'mago-tanque' : 'tanque';
  else if (main === 'Support') arch = second === 'Tank' ? 'tanque-suporte' : second === 'Mage' && apShare > 0.6 ? 'mago' : 'encantador';
  else arch = apShare > 0.5 ? 'mago' : (ranged ? 'atirador' : 'lutador');
  void has;
  return { arch, apShare, ranged, roles, scaling: sc, id: ch.id };
}

const valueOf = (it, wts) => {
  let v = 0;
  ['flat', 'pct', 'extra'].forEach(g => Object.entries(it.mods[g]).forEach(([k, x]) => {
    const key = g === 'pct' && k === 'ms' ? 'msPct' : (g === 'pct' && k === 'as' ? 'as' : k);
    v += (wts[key] || 0) * (GOLD[key] || 0) * x;
  }));
  return v;
};
/* itens "puros de utilidade" dos quais o arquétipo não deve depender */
function score(it, arch, extra) {
  const wts = ARCH[arch], v = valueOf(it, wts);
  const gold = Object.values(it.mods).reduce((s, g) => s + Object.keys(g).length, 0);
  if (!gold) return 0;
  const eff = v / it.price;                                                   /* eficiência desejada */
  return v * 0.002 + eff + (FX.IMPLEMENTED.includes(it.id) ? 0.15 : 0) + (extra || 0);
}

/* enemies: lista de perfis (profile()) dos inimigos; devolve a build completa ordenada de compra */
function makeBuild(ch, enemies, opts = {}) {
  const cur = CUR.BUILDS[ch.id]; if (cur) return curatedBuild(ch, cur, enemies, opts);
  const cat = catalog(), P = profile(ch), arch = P.arch;
  const legend = Object.values(cat).filter(i => i.cls === 'legendary' && i.maxStack <= 1);
  const boots = Object.values(cat).filter(i => i.cls === 'boots' && i.into.length === 0 && i.from.length);
  const apE = enemies.length ? enemies.reduce((s, e) => s + e.apShare, 0) / enemies.length : 0.5;
  const tanky = enemies.filter(e => e.arch === 'tanque' || e.arch === 'mago-tanque' || e.arch === 'lutador').length;
  const reasons = [];
  const supp = arch === 'tanque-suporte' || arch === 'encantador';
  const pool = legend.map(i => ({ i, s: score(i, arch) })).filter(x => x.s > 0 && !(supp && NO_SUPPORT.has(x.i.id)));
  /* adaptação: contra muito AP, bônus a resistência mágica; contra muito AD, a armadura; contra vida alta, penetração percentual */
  const adapt = (i) => {
    let b = 0;
    if (arch !== 'tanque' && apE >= 0.65 && (i.mods.flat.mr || 0) >= 40) b += 0.25;
    if (arch !== 'tanque' && apE <= 0.35 && (i.mods.flat.armor || 0) >= 40) b += 0.25;
    if (tanky >= 2 && (i.mods.extra.armorPenPct || i.mods.extra.magicPenPct)) b += 0.25;
    return b;
  };
  const taken = new Set(), build = [];
  const bestBoot = boots.map(i => ({ i, s: score(i, arch) + (apE >= 0.65 && (i.mods.flat.mr || 0) ? 0.2 : 0) + (apE <= 0.35 && (i.mods.flat.armor || 0) ? 0.2 : 0) + (i.mods.pct.as ? 0 : 0) })).sort((a, b) => b.s - a.s || a.i.id - b.i.id)[0];
  const pick = (needDefense) => {
    const c = pool.filter(x => !taken.has(x.i.name) && !build.some(b => overlaps(cat, b, x.i))).map(x => ({ ...x, t: x.s + (needDefense ? adapt(x.i) * 4 : adapt(x.i)) })).sort((a, b) => b.t - a.t || a.i.id - b.i.id);
    return c[0];
  };
  for (let k = 0; k < 5; k++) { const c = pick(k === 2); if (!c) break; taken.add(c.i.name); build.push(c.i); }
  const out = [build[0], bestBoot.i, ...build.slice(1)].filter(Boolean);
  if (apE >= 0.65) reasons.push('inimigos majoritariamente AP: priorizou resistência mágica'); else if (apE <= 0.35) reasons.push('inimigos majoritariamente AD: priorizou armadura');
  if (tanky >= 2) reasons.push('muitos alvos resistentes: priorizou penetração percentual');
  return { arch, profile: P, items: out.map(i => i.id), names: out.map(i => i.name), reasons };
}
/* Bloco 4b: build curada + adaptação. opts.lane = perfil do rival direto de rota (pesa em dobro no tipo de dano e na cura). */
function curatedBuild(ch, cur, enemies, opts) {
  const cat = catalog(), P = profile(ch), S = CUR.SIT[cur.k], reasons = ['build curada do campeão (estimada)'];
  const all = enemies.concat(opts.lane ? [opts.lane] : []);
  const apE = all.length ? all.reduce((s, e) => s + e.apShare, 0) / all.length : 0.5;
  const tanky = enemies.filter(e => e.arch === 'tanque' || e.arch === 'mago-tanque' || e.arch === 'tanque-suporte' || e.arch === 'lutador').length;
  const heal = all.filter(e => CUR.HEAL.has(e.id)).length + (opts.lane && CUR.HEAL.has(opts.lane.id) ? 1 : 0);
  const have = new Set(cur.c.slice(0, 3)), sit = [];
  const take = (pool, why) => { const id = (pool || []).find(i => !have.has(i) && !cur.c.includes(i)) || (pool || []).find(i => !have.has(i)); if (id && !sit.includes(id)) { sit.push(id); have.add(id); reasons.push(why + ': ' + cat[id].name); } };
  if (apE >= 0.6) take(S.ap, 'dano inimigo AP'); else if (apE <= 0.4) take(S.ad, 'dano inimigo AD');
  if (heal >= 1) take(S.heal, 'inimigo com cura');
  if (tanky >= 2) take(S.tank, 'alvos resistentes');
  const L = []; [...cur.c.slice(0, 3), ...sit, ...cur.c.slice(3), ...cur.f].forEach(i => { if (!L.includes(i) && cat[i]) L.push(i); });
  let boots = cur.b;
  if (boots === CUR.BOOTS.plated || boots === CUR.BOOTS.merc) boots = apE >= 0.6 ? CUR.BOOTS.merc : apE <= 0.4 ? CUR.BOOTS.plated : boots;
  const legs = L.slice(0, 5), out = [legs[0], boots, ...legs.slice(1)];
  return { arch: P.arch, k: cur.k, profile: P, items: out.map(i => i), names: out.map(i => cat[i].name), reasons };
}
/* itens do mesmo "tipo" que não devem coexistir (ex.: duas botas já tratadas; aqui evita o mesmo componente raiz exclusivo) */
function overlaps(cat, a, b) { return a.id === b.id; }

/* ordem de compra com componentes: dado o ouro, o próximo componente/item a comprar para progredir na build */
function nextPurchase(u, build) {
  const cat = catalog(), { quote } = require('./shop');
  for (const id of build) {
    if (u.items.includes(id)) continue;
    const q = quote(u, id, cat);
    if (q.ok) return { id, cost: q.cost };
    /* não dá o item inteiro: compra o maior componente que cabe e ainda não foi comprado */
    const comps = cat[id].from.filter(c => !u.items.includes(c)).sort((a, b) => cat[b].price - cat[a].price);
    for (const c of comps) { const qc = quote(u, c, cat); if (qc.ok) return { id: c, cost: qc.cost, partOf: id }; }
    /* Bloco 4b: todos os componentes diretos já estão no inventário: só falta ouro para combinar; comprar "componentes de componentes" aqui lotava o inventário */
    if (!comps.length) return null;
    for (const c of comps) for (const g of cat[c].from) { const qg = quote(u, g, cat); if (qg.ok && !u.items.includes(g)) return { id: g, cost: qg.cost, partOf: id }; }
    return null;
  }
  return null;
}
module.exports = { profile, scalingProfile, makeBuild, nextPurchase, GOLD, ARCH, score };
