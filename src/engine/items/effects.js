'use strict';
/* Passivas e ativas de itens (Bloco 3 -> 4). Cada efeito lê seus números dos DataValues/cálculos reais do item (catálogo).
   Lote 2 (18 itens: on-hit, Lâminas Arcanas, espinhos, Ferimentos, Liandry, Luden, Hidra Raivosa, Warmog) em ./passivas.js.
   IMPLEMENTADOS (8): Capuz da Morte de Rabadon, Cutelo Negro, Eclipse, Ampulheta de Zhonya, Anjo Guardião, Véu da Banshee,
   Égide de Fogo Solar, Lembrete Mortal.  Os demais itens têm só os atributos numéricos (verdadeiros) e a passiva marcada como PENDENTE
   em docs/ITENS_COBERTURA_<patch>.md.  Estimado: duração da estase do Anjo Guardião (4 s) vem do texto ("após 4s"), não de DataValue. */
const { catalog } = require('./catalog');
const { evalCalc, Unsupported } = require('../champion/calc');
const P2 = require('./passivas');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const ID = { RABADON: 3089, CLEAVER: 3071, ECLIPSE: 6692, ZHONYA: 3157, GA: 3026, BANSHEE: 3102, SUNFIRE: 3068, LEMBRETE: 3033 };
const IMPLEMENTED = Object.values(ID).concat(P2.IMPLEMENTED);
const owns = (u, id) => (u.items || []).includes(id);
const dv = (it, n) => { const d = it.dv[n.toLowerCase()]; if (!d) throw new Error('DataValue ' + n + ' em ' + it.name); return d[1]; };
const ready = (w, u, id) => (u.itemCd[id] || 0) <= w.t + 1e-9;
const isRanged = u => u.stats.range >= 325;                                       /* Wiki: ataque à distância */

/* após computeStats: efeitos que dependem do total (Rabadon: PA total x (1 + 30%)) */
function postStats(u, S) {
  if (!owns(u, ID.RABADON)) return S;
  const it = catalog()[ID.RABADON], total = S.ap.total * (1 + dv(it, 'APAmp'));
  S.ap = { base: 0, bonus: total, total }; return S;
}

function onDealDamage(w, src, dst, info) {
  P2.onTaken(w, src, dst, info);
  if (!src.items || !src.items.length || dst.team === src.team) return;
  P2.onDealDamage(w, src, dst, info);
  const cat = catalog(), champ = true, now = w.t;
  if (owns(src, ID.CLEAVER) && info.type === 'physical' && (info.attack || info.ability) && champ) {
    const it = cat[ID.CLEAVER], m = dst.marks.Cleaver && dst.marks.Cleaver.until > now ? dst.marks.Cleaver : { stacks: 0 };
    m.stacks = Math.min(dv(it, 'MaxStacks'), m.stacks + 1); m.until = now + dv(it, 'DebuffDuration'); dst.marks.Cleaver = m;
    dst.helpers.armorShred = Math.max(dst.helpers.armorShred || 0, m.stacks * dv(it, 'ShredPerStack')); dst.helpers.armorShredUntil = m.until;
    src.buffs = src.buffs.filter(b => b.tag !== 'cleaverMS');
    w.addBuff(src, { dur: dv(it, 'MoveSpeedDuration'), flat: { ms: dv(it, 'MoveSpeedBonus') * (isRanged(src) ? dv(it, 'RangedMod') : 1) }, tag: 'cleaverMS' });
  }
  if (owns(src, ID.LEMBRETE) && info.type === 'physical') {
    const it = cat[ID.LEMBRETE]; dst.helpers.healReduction = dv(it, 'GrievousAmount'); dst.helpers.healReductionUntil = now + dv(it, 'GrievousDuration');
  }
  if (owns(src, ID.ECLIPSE) && (info.attack || info.ability) && info.ability !== 'item') {
    const it = cat[ID.ECLIPSE], st = src.itemState.eclipse = src.itemState.eclipse || [];
    const key = (info.ability || 'AA');
    if (!st.some(h => h.dst === dst.id && h.t === now && h.key === key)) st.push({ t: now, dst: dst.id, key });
    const win = dv(it, 'WindowDuration');
    const recent = st.filter(h => h.dst === dst.id && now - h.t <= win + 1e-9);
    src.itemState.eclipse = st.filter(h => now - h.t <= win + 1e-9);
    const distinct = new Set(recent.map(h => h.t + ':' + h.key));
    if (distinct.size >= 2 && ready(w, src, ID.ECLIPSE)) {
      src.itemCd[ID.ECLIPSE] = now + dv(it, 'Cooldown');
      const amt = (dv(it, 'MeleeBaseShield') + dv(it, 'MeleeBonusADShieldRatio') * src.stats.ad.bonus) * (isRanged(src) ? dv(it, 'RangedShieldMult') : 1);
      w.addShield(src, amt, { dur: dv(it, 'ShieldDuration'), src });
      src.itemState.eclipse = [];
    }
  }
}
/* Égide de Fogo Solar: depois de causar ou sofrer dano, dano mágico por segundo a inimigos próximos por AuraDuration */
function tick(w, u) {
  P2.tick(w, u);
  if (owns(u, ID.SUNFIRE)) {
    const it = catalog()[ID.SUNFIRE], s = u.itemState.sun = u.itemState.sun || { next: 0 };
    const active = w.t - Math.max(u.lastDamageAt, u.lastDealtAt || -99) <= dv(it, 'AuraDuration');
    if (active && w.t + 1e-9 >= s.next) {
      s.next = w.t + 1 / dv(it, 'TicksPerSecond');
      const calcs = {}; Object.entries(it.calcs).forEach(([k, v]) => { calcs[k.toLowerCase()] = v; });
      let a; try { a = evalCalc({ dv: it.dv, calcs }, 'DamagePerTick', { rank: 1, level: u.level, S: u.stats }); } catch (e) { if (!(e instanceof Unsupported)) throw e; a = 0; }
      w.foes(u).filter(x => dist(x.pos, u.pos) <= dv(it, 'Range') + x.radius).forEach(x => w.dealDamage(u, x, a, 'magic', { ability: 'item', tick: true }));
    }
  }
  if (u.helpers.healReductionUntil && u.helpers.healReductionUntil <= w.t) { u.helpers.healReduction = 0; u.helpers.healReductionUntil = 0; }
}
/* ativas */
function use(w, u, id) {
  const it = catalog()[id];
  if (!owns(u, id) || !ready(w, u, id) || u.dead) return false;
  if (id === ID.ZHONYA) {
    u.itemCd[id] = w.t + dv(it, 'Cooldown'); w.addStatus(u, { kind: 'stasis', dur: dv(it, 'Duration'), src: u, tag: 'item' }); w.emit('item-use', { id: u.id, item: id }); return true;
  }
  return false;
}
/* Anjo Guardião: ao sofrer dano letal -> estase por 4 s e volta com 50% da vida base e 100% da mana */
function tryRevive(w, u) {
  if (!owns(u, ID.GA) || !ready(w, u, ID.GA)) return false;
  const it = catalog()[ID.GA]; u.itemCd[ID.GA] = w.t + dv(it, 'Cooldown');
  u.hp = 1e-6; w.addStatus(u, { kind: 'stasis', dur: 4, src: u, tag: 'item' });
  w.schedule(w.t + 4, () => { if (u.dead) return; u.hp = u.stats.hp.base * 0.5; u.mana = u.manaMax; w.emit('revive', { id: u.id }); });
  w.emit('item-use', { id: u.id, item: ID.GA, passive: true }); return true;
}
/* Véu da Banshee: bloqueia a próxima habilidade inimiga (dano e controle da mesma habilidade, no mesmo instante) */
function blockAbility(w, u) {
  if (!owns(u, ID.BANSHEE)) return false;
  const it = catalog()[ID.BANSHEE];
  if (u.itemState.bansheeT === w.t) return true;
  if (!ready(w, u, ID.BANSHEE)) return false;
  u.itemCd[ID.BANSHEE] = w.t + dv(it, 'Cooldown'); u.itemState.bansheeT = w.t; w.emit('spell-shield', { id: u.id }); return true;
}
module.exports = { ID, IMPLEMENTED, owns, postStats, onDealDamage, tick, use, tryRevive, blockAbility };
