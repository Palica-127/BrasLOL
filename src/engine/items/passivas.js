'use strict';
/* Passivas de itens, lote 2 (além das 8 de effects.js). Os números vêm dos DataValues/cálculos do cliente sempre que existem.
   Onde o cálculo do cliente usa um código que o avaliador não valida (mStatFormula 1 = AD base nas Lâminas Arcanas), o valor segue a Wiki
   (Fulgor 100% do AD base, Força da Trindade 200%, Manopla dos Glacinatas 150%, Perdição de Lich 75% do AD base + 45% do PA) e a duração
   de 10 s do efeito armado vem do DataValue SpellbladeDuration da Perdição de Lich (aplicada aos quatro).
   NÃO modelado: Sofrimento do Liandry (+dano por segundo em combate), campo de gelo da Manopla (só a lentidão no alvo), Energizado do
   Canhão Fumegante, mínimo de 15 do Gume do Rei Destruído, repetição dos ecos do Eco de Luden (usa o teto de um alvo).
   IMPLEMENTADOS (18): Arco Recurvo, Dente de Na'Shor, Limite da Razão, Lâmina da Fúria de Guinsoo, Espada do Rei Destruído, Fulgor,
   Força da Trindade, Manopla dos Glacinatas, Perdição de Lich, Armadura de Espinhos, Colete Espinhoso, Serrespada Quimiopunk,
   Chamado do Carrasco, Morellonomicon, Tormento de Liandry, Eco de Luden, Hidra Raivosa, Armadura de Warmog. */
const { catalog } = require('./catalog');
const { evalCalc, Unsupported } = require('../champion/calc');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const ID = {
  RECURVE: 1043, NASHOR: 3115, WITS: 3091, GUINSOO: 3124, BORK: 3153,
  SHEEN: 3057, TRINITY: 3078, ICEBORN: 6662, LICHBANE: 3100,
  THORN: 3075, BRAMBLE: 3076, CHEMPUNK: 6609, EXEC: 3123, MORELLO: 3165,
  LIANDRY: 6653, LUDEN: 6655, RAVENOUS: 3074, WARMOG: 3083
};
const IMPLEMENTED = Object.values(ID);
const SPELLBLADE = [ID.SHEEN, ID.TRINITY, ID.ICEBORN, ID.LICHBANE];
const owns = (u, id) => (u.items || []).includes(id);
const dv = (it, n) => { const d = it.dv[n.toLowerCase()]; if (!d) throw new Error('DataValue ' + n + ' em ' + it.name); return d[1]; };
const isChamp = x => !!x.ch;
const isRanged = u => u.stats.range >= 325;
const foeOf = (src, dst) => dst.team !== src.team && dst.kind !== 'structure';
const ready = (w, u, id) => (u.itemCd[id] || 0) <= w.t + 1e-9;
/* avalia um cálculo do item com as estatísticas do portador; cai para o valor informado se o avaliador não valida o código */
function calc(it, name, u, fallback) {
  const calcs = {}; Object.entries(it.calcs).forEach(([k, v]) => { calcs[k.toLowerCase()] = v; });
  try { return evalCalc({ dv: it.dv, calcs }, name, { rank: 1, level: u.level, S: u.stats }); } catch (e) { if (!(e instanceof Unsupported)) throw e; return fallback; }
}
const item = (w, src, dst, amount, type) => w.dealDamage(src, dst, amount, type, { ability: 'item' });
const grievous = (dst, amount, dur, now) => {
  dst.helpers.healReduction = Math.max(dst.helpers.healReduction || 0, amount);
  dst.helpers.healReductionUntil = Math.max(dst.helpers.healReductionUntil || 0, now + dur);
};

/* sofreu dano: Espinhos (Armadura de Espinhos e Colete Espinhoso) */
function onTaken(w, src, dst, info) {
  if (!dst.items || !dst.items.length || !info.attack || info.ability === 'item' || src.team === dst.team || src.dead) return;
  const cat = catalog();
  [ID.THORN, ID.BRAMBLE].forEach(id => {
    if (!owns(dst, id)) return;
    const it = cat[id];
    const amt = dv(it, 'BaseDamage') + (it.dv.bonusarmordamageratio ? dv(it, 'BonusArmorDamageRatio') * dst.stats.armor.bonus : 0);
    item(w, dst, src, amt, 'magic');
    if (isChamp(src)) grievous(src, dv(it, 'GrievousAmount'), dv(it, 'GrievousDuration'), w.t);
  });
}

function onDealDamage(w, src, dst, info) {
  if (!src.items || !src.items.length || !foeOf(src, dst) || info.ability === 'item') return;
  const cat = catalog(), now = w.t, st = src.itemState;
  const abil = !!info.ability && !info.attack;
  /* lentidão do Gume do Rei Destruído e dos outros ficam abaixo; Ferimentos Dolorosos primeiro */
  if (isChamp(dst)) {
    if (owns(src, ID.CHEMPUNK) && info.type === 'physical') grievous(dst, dv(cat[ID.CHEMPUNK], 'GrievousAmount'), dv(cat[ID.CHEMPUNK], 'GrievousDuration'), now);
    if (owns(src, ID.EXEC) && info.type === 'physical') grievous(dst, dv(cat[ID.EXEC], 'GrievousAmount'), dv(cat[ID.EXEC], 'GrievousDuration'), now);
    if (owns(src, ID.MORELLO) && info.type === 'magic') grievous(dst, dv(cat[ID.MORELLO], 'GrievousAmount'), dv(cat[ID.MORELLO], 'GrievousDuration'), now);
  }
  /* habilidades: armam a Lâmina Arcana, queimam (Liandry) e disparam o Eco de Luden */
  if (abil) {
    if (SPELLBLADE.some(id => owns(src, id)) && (st.sbCd || 0) <= now + 1e-9) st.sbUntil = now + dv(cat[ID.LICHBANE], 'SpellbladeDuration');
    if (owns(src, ID.LIANDRY) && (isChamp(dst) || dst.kind === 'monster')) { const it = cat[ID.LIANDRY]; st.liandry = { dst: dst.id, until: now + dv(it, 'BurnDuration'), next: st.liandry && st.liandry.dst === dst.id ? st.liandry.next : now + dv(it, 'TickFrequency') }; }
    if (owns(src, ID.LUDEN) && ready(w, src, ID.LUDEN) && !info.tick) {
      const it = cat[ID.LUDEN]; src.itemCd[ID.LUDEN] = now + dv(it, 'Cooldown');
      item(w, src, dst, calc(it, 'SingleTargetMax', src, 150), 'magic');
    }
    return;
  }
  if (!info.attack) return;
  /* a partir daqui: ataques básicos (efeitos ao contato) */
  if (owns(src, ID.RECURVE)) item(w, src, dst, dv(cat[ID.RECURVE], 'OnHitDamage'), 'physical');
  if (owns(src, ID.NASHOR)) item(w, src, dst, calc(cat[ID.NASHOR], 'TotalOnHitDamage', src, 15), 'magic');
  if (owns(src, ID.WITS)) item(w, src, dst, calc(cat[ID.WITS], 'OnHitDamage', src, 15), 'magic');
  if (owns(src, ID.GUINSOO)) {
    const it = cat[ID.GUINSOO], g = st.guinsoo = st.guinsoo || { n: 0, until: 0 };
    item(w, src, dst, dv(it, 'OnHitDamage'), 'magic');
    g.n = g.until > now ? Math.min(dv(it, 'MaxStacks'), g.n + 1) : 1; g.until = now + dv(it, 'BuffDuration');
    src.buffs = src.buffs.filter(b => b.tag !== 'guinsoo');
    w.addBuff(src, { dur: dv(it, 'BuffDuration'), pct: { as: g.n * dv(it, 'AttackSpeedPerStack') }, tag: 'guinsoo' });
  }
  if (owns(src, ID.BORK)) {
    const it = cat[ID.BORK], k = isRanged(src) ? dv(it, 'RangedValue') : dv(it, 'MeleeValue');
    let a = dst.hp * k; if (dst.kind === 'monster') a = Math.min(a, dv(it, 'MonsterDamageCap'));
    item(w, src, dst, a, 'physical');
    if (isChamp(dst)) {
      const b = st.bork = st.bork && st.bork.until > now && st.bork.dst === dst.id ? st.bork : { n: 0, dst: dst.id };
      b.n++; b.until = now + dv(it, 'AttackCounterDuration');
      if (b.n >= 3) { b.n = 0; w.addStatus(dst, { kind: 'slow', dur: dv(it, 'MoveSpeedDuration'), amount: -dv(it, 'MoveSpeedMod'), src, tag: 'bork' }); }
    }
  }
  if (owns(src, ID.RAVENOUS)) {
    const it = cat[ID.RAVENOUS], a = calc(it, 'PrimaryDamage', src, 0.8 * src.stats.ad.total);
    w.foes(src).filter(x => x !== dst && dist(x.pos, dst.pos) <= dv(it, 'CleaverRadius') + x.radius).forEach(x => item(w, src, x, a, 'physical'));
  }
  if (owns(src, ID.TRINITY)) {
    const it = cat[ID.TRINITY]; src.buffs = src.buffs.filter(b => b.tag !== 'trinityMS');
    w.addBuff(src, { dur: dv(it, 'MsDuration'), flat: { ms: dv(it, 'MoveSpeedBonus') }, tag: 'trinityMS' });
  }
  /* Lâmina Arcana: o ataque seguinte a uma habilidade; só o mais forte vale e todos dividem a recarga de 1,5 s */
  if ((st.sbUntil || 0) > now && (st.sbCd || 0) <= now + 1e-9) {
    const base = src.stats.ad.base, ap = src.stats.ap.total, opts = [];
    if (owns(src, ID.SHEEN)) opts.push({ a: base, t: 'physical' });
    if (owns(src, ID.TRINITY)) opts.push({ a: base * dv(cat[ID.TRINITY], 'SpellbladeMultiplier'), t: 'physical' });
    if (owns(src, ID.ICEBORN)) opts.push({ a: base * dv(cat[ID.ICEBORN], 'SpellbladeMultiplier'), t: 'physical', ice: true });
    if (owns(src, ID.LICHBANE)) { const it = cat[ID.LICHBANE]; opts.push({ a: base * dv(it, 'SpellbladeADRatio') + ap * dv(it, 'LichBaneAPValue'), t: 'magic' }); }
    if (opts.length) {
      const best = opts.sort((x, y) => y.a - x.a)[0];
      st.sbUntil = 0; st.sbCd = now + dv(cat[ID.LICHBANE], 'SpellbladeCooldown');
      item(w, src, dst, best.a, best.t);
      if (best.ice && isChamp(dst)) { const it = cat[ID.ICEBORN]; w.addStatus(dst, { kind: 'slow', dur: dv(it, 'SlowFieldDuration'), amount: dv(it, isRanged(src) ? 'RangedSlowAmount' : 'SlowAmount'), src, tag: 'iceborn' }); }
    }
  }
}

function tick(w, u) {
  const cat = catalog(), st = u.itemState;
  if (st.liandry && owns(u, ID.LIANDRY)) {
    const l = st.liandry, it = cat[ID.LIANDRY];
    if (w.t >= l.until) st.liandry = null;
    else if (w.t + 1e-9 >= l.next) {
      const x = w.byId(l.dst);
      if (!x || x.dead) st.liandry = null;
      else { l.next = w.t + dv(it, 'TickFrequency'); let a = x.hpMax * dv(it, 'BurnPercentHealthDamage') * dv(it, 'TickFrequency'); if (x.kind === 'monster') a = Math.min(a, dv(it, 'MonsterDamageCap')); item(w, u, x, a, 'magic'); }
    }
  }
  if (owns(u, ID.WARMOG) && !u.dead) {
    const it = cat[ID.WARMOG], s = st.warmog = st.warmog || { next: 0 };
    if (u.stats.hp.bonus >= dv(it, 'HealthThreshold') && w.t - Math.max(u.lastDamageAt, u.lastDealtAt || -99) >= dv(it, 'OOCTimerChampion') && w.t + 1e-9 >= s.next && u.hp < u.hpMax) {
      s.next = w.t + dv(it, 'SecondsPerHeal'); w.heal(u, u.hpMax * dv(it, 'MaxHealthRatio'), u);
    }
  }
}
module.exports = { ID, IMPLEMENTED, onTaken, onDealDamage, tick };
