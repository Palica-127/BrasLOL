'use strict';
/* Mundo de simulação do combate (Bloco 3). Tick fixo (padrão 50 ms = 20 Hz), determinístico por semente.
   Estado: unidades, projéteis, zonas, eventos agendados, log de eventos estruturado. Sem DOM, sem Math.random.
   Simplificações declaradas: arena plana sem paredes nem colisão entre unidades (mapa e terreno chegam no Bloco 7);
   conjuração interrompida por controle não gasta mana nem recarga (custo e recarga são cobrados ao fim da conjuração). */
const { makeRng } = require('../core/rng');
const { createLoader } = require('../data/loader');
const { computeStats } = require('../champion/stats');
const { spellDefs, AbilitySet } = require('../champion/spells');
const { KITS } = require('../champion/kits');
const D = require('../combat/damage');
const { xpToReach } = require('../champion/stats'), MIN = require('../economy/minions'), MON = require('../jungle/monsters'), JB = require('../jungle/buffs');
const shop = require('../items/shop'), FX = require('../items/effects'), LIFE = require('./lifecycle');

const HARD = new Set(['stun', 'knockup', 'charm', 'fear', 'suppress', 'stasis']);        /* impedem agir */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

class World {
  constructor({ seed = 1, loader, dt = 0.05, arena = { w: 6000, h: 6000 } } = {}) {
    this.seed = seed; this.rng = makeRng(seed); this.loader = loader || createLoader(); this.rules = this.loader.rules();
    this.dt = dt; this.arena = arena; this.t = 0; this.tickN = 0; this.nextId = 1;
    this.idx = { minions: [[], []], champs: [[], []] }; this.units = []; this.brains = []; this.structs = []; this.projs = []; this.zones = []; this.sched = []; this.log = []; this.listeners = [];
    this.exec = require('./exec'); this.ai = require('./ai');
  }
  emit(type, data) { const e = { t: +this.t.toFixed(3), type, ...data }; this.log.push(e); this.listeners.forEach(f => f(e)); return e; }
  schedule(at, fn) { this.sched.push({ at, fn, n: this.sched.length }); this.sched.sort((a, b) => a.at - b.at || a.n - b.n); }

  /* ---------- criação ---------- */
  addChampion({ name, team, level = 1, pos = { x: 0, y: 0 }, skill, mods, ranks = 'auto', items = [], gold = 0, smite = false }) {
    const ch = this.loader.champion(name), id = ch.id;
    const kit = KITS[id]; if (!kit) throw new Error('sem kit implementado: ' + id);
    const defs = spellDefs(ch), u = {
      id: this.nextId++, name: id, team, ch, kit, defs, level, abil: new AbilitySet(defs),
      pos: { x: pos.x, y: pos.y }, vel: { x: 0, y: 0 }, face: team === 0 ? 0 : Math.PI,
      radius: ch.stats_cdragon.raio_colisao || 35, mods: { flat: { ...(mods && mods.flat) }, pct: { ...(mods && mods.pct) } },
      shields: [], st: [], dr: [], buffs: [], marks: {}, passive: {}, recast: {}, zonesOwned: {},
      attack: { readyAt: 0, windup: null }, cast: null, dash: null, order: null, empower: null, dead: false, lastHit: -99, lastDamageAt: -99,
      ai: { aim: skill && skill.aim != null ? skill.aim : 0.7, dodge: skill && skill.dodge != null ? skill.dodge : 0.3, react: skill && skill.react != null ? skill.react : 0.25, next: 0, dodgeUntil: 0, dodgeDir: null },
      stat: { kills: 0, deaths: 0, assists: 0, dmgDealt: 0, dmgTaken: 0, healed: 0, shielded: 0, ccTime: 0, casts: 0, hits: 0, attacks: 0 }, helpers: {}
    };
    shop.init(u, gold); u.items = items.slice(); u.xp = xpToReach(this.rules, level); u.autoRank = ranks === 'auto'; if (smite) u.smite = { charges: 1, cdUntil: 0, nextCharge: 48 };
    this.refresh(u, true); u.hp = u.hpMax; u.mana = u.manaMax;
    u.abil.points = level;
    if (ranks === 'auto') this.autoRank(u);
    this.units.push(u); this.emit('spawn', { id: u.id, name: u.name, team, level });
    return u;
  }
  autoRank(u) {                                                    /* R sempre que possível; depois Q, E, W equilibrando os ranks */
    while (u.abil.points > 0) {
      if (u.abil.levelUp('R', u.level)) continue;
      const c = ['Q', 'E', 'W'].filter(s => u.abil.canLevel(s, u.level)).sort((x, y) => u.abil.rank[x] - u.abil.rank[y]);
      if (!c.length || !u.abil.levelUp(c[0], u.level)) break;
    }
  }

  /* ---------- atributos ---------- */
  refresh(u, init) {
    if (u.kind === 'minion') return u.stats;
    const flat = { ...u.mods.flat }, pct = { ...u.mods.pct };
    const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
    u.buffs.forEach(b => { if (b.flat) Object.entries(b.flat).forEach(([k, v]) => add(flat, k, v)); if (b.pct) Object.entries(b.pct).forEach(([k, v]) => add(pct, k, v)); });
    const im = shop.mods(u), ex = im.extra;
    Object.entries(im.flat).forEach(([k, v]) => add(flat, k, v)); Object.entries(im.pct).forEach(([k, v]) => add(pct, k, v));
    const old = u.hpMax, S = computeStats(u.ch, u.level, { flat, pct });
    if (ex.baseHpRegenPct) S.hpRegen5.bonus += S.hpRegen5.base * ex.baseHpRegenPct;
    if (ex.critDamage) S.critDamage += ex.critDamage;
    Object.assign(u.helpers, { lifesteal: ex.lifesteal || 0, penPct: ex.armorPenPct || 0, magicPenFlat: ex.magicPenFlat || 0, magicPenPct: ex.magicPenPct || 0, itemTenacity: ex.tenacity || 0, healPower: ex.healPower || 0, slowResist: ex.slowResist || 0 });
    FX.postStats(u, S); JB.postStats(this, u, S); S.hpRegen5.total = S.hpRegen5.base + S.hpRegen5.bonus;
    u.stats = S; u.hpMax = S.hp.total; u.manaMax = S.mana.total;
    if (!init && old) u.hp = Math.min(u.hpMax, u.hp * (u.hpMax / old));
    return S;
  }
  armorOf(u) { return u.stats.armor.total * (1 - (u.helpers.armorShred || 0)); }
  msOf(u) {
    const slows = u.st.filter(s => s.kind === 'slow').map(s => s.amount);
    let ms = u.stats.ms.total * (1 - D.stackSlows(slows) * (1 - (u.helpers.slowResist || 0)));
    ms *= 1 + (u.helpers.oocMsNow || 0) + (u.helpers.soulMs || 0);
    if (this.has(u, 'root')) ms = 0;
    return Math.max(0, ms);
  }
  asOf(u) { const slow = u.st.filter(s => s.kind === 'asSlow').reduce((m, s) => Math.max(m, s.amount), 0); return u.stats.as.total * (1 - slow); }

  /* ---------- status / controle ---------- */
  has(u, kind) { return u.st.some(s => s.kind === kind && s.until > this.t); }
  canAct(u) { return !u.dead && !u.st.some(s => HARD.has(s.kind) && s.until > this.t); }
  canMove(u) { return this.canAct(u) && !this.has(u, 'root') && !u.cast && !u.attack.windup; }
  canCast(u, def) { return this.canAct(u) && (!this.has(u, 'silence') || def.canCastWhileDisabled); }
  canAttack(u) { return this.canAct(u) && !this.has(u, 'disarm'); }
  tenacityOf(u) { return Math.max(u.helpers.itemTenacity || 0, u.buffs.filter(b => b.tenacity && b.until > this.t).reduce((a, b) => Math.max(a, b.tenacity), 0)); }
  /* aplica controle: tenacidade, escudo anti-controle (Escudo Negro) e interrupção de conjuração */
  addStatus(u, { kind, dur, amount = 0, src = null, tag = '' }) {
    if (u.dead || !(dur > 0)) return false;
    if (this.has(u, 'stasis') && kind !== 'stasis') return false;
    if (src && src.team !== u.team && tag && ['Q', 'W', 'E', 'R'].includes(tag) && FX.blockAbility(this, u)) return false;
    const cc = ['stun', 'root', 'silence', 'charm', 'fear', 'knockup', 'suppress', 'slow', 'disarm'].includes(kind);
    if (cc && kind !== 'slow' && u.shields.some(s => s.blocksCC && s.amount > 0)) { this.emit('cc-blocked', { id: u.id, kind, src: src && src.id }); return false; }
    const d = cc ? D.tenacityDuration(dur, this.tenacityOf(u), kind) : dur;
    const ex = u.st.find(s => s.kind === kind && s.tag === tag && s.src === (src && src.id) && s.kind !== 'slow');
    if (ex) ex.until = Math.max(ex.until, this.t + d); else u.st.push({ kind, until: this.t + d, amount, src: src && src.id, tag });
    u.stat.ccTime += d;
    if (HARD.has(kind) || (kind === 'silence' && u.cast && u.cast.channel)) this.interrupt(u, kind);
    this.emit('cc', { id: u.id, kind, dur: +d.toFixed(3), src: src && src.id });
    return true;
  }
  interrupt(u, why) {
    if (u.cast) { this.emit('cast-cancel', { id: u.id, slot: u.cast.slot, why }); u.cast = null; }
    if (u.attack.windup) { this.emit('attack-cancel', { id: u.id, why }); u.attack.windup = null; }
    if (u.dash && u.dash.cancelable) u.dash = null;
  }
  addShield(u, amount, { type = 'all', dur = 3, blocksCC = false, src = null } = {}) {
    if (!(amount > 0)) return;
    u.shields.push({ amount, type, until: this.t + dur, blocksCC, src: src && src.id });
    if (src) src.stat.shielded += amount;
    this.emit('shield', { id: u.id, amount: +amount.toFixed(1), dur, src: src && src.id });
  }
  heal(u, amount, src) {
    const got = D.heal(u, amount * (1 + (src && src.helpers.healPower || 0)), u.helpers.healReduction || 0);
    if (src) src.stat.healed += got;
    if (got > 0) this.emit('heal', { id: u.id, amount: +got.toFixed(1), src: src && src.id });
    return got;
  }
  addBuff(u, b) { u.buffs.push({ ...b, until: this.t + b.dur }); this.refresh(u); }

  /* ---------- dano ---------- */
  /* info = { ability: 'Q'.., attack: bool, canCrit: bool, tag } */
  dealDamage(src, dst, amount, type, info = {}) {
    if (dst.dead || !(amount > 0)) return null;
    if (this.has(dst, 'stasis')) return null;
    if (dst.kind === 'structure') { amount = this.structures.preDamage(src, dst, amount); if (!(amount > 0)) return null; }
    if (info.ability && ['Q', 'W', 'E', 'R'].includes(info.ability) && src.team !== dst.team && FX.blockAbility(this, dst)) return null;
    const split = !info._split && this.exec.preDamage(this, src, dst, amount, type);
    if (split) { let last = null; split.forEach(([am, ty]) => { last = this.dealDamage(src, dst, am, ty, { ...info, _split: true }) || last; }); return last; }
    if (src.smite && dst.kind === 'monster' && !info.smite) amount *= 3;                      /* item de selva (ESTIMADO, Bloco 10): bonus de dano do cacador contra monstros */
    if (src.kind === 'monster' && dst.smite) amount *= 1 - 0.5;                              /* companheiro de selva: -50% de dano de monstros (ESTIMADO, Bloco 6 pendente) */
    let a = amount, crit = false;
    if (info.canCrit && src.stats.crit > 0 && this.rng.next('combate') < src.stats.crit) { a *= D.critMultiplier(src.stats.critDamage); crit = true; }
    if (src.helpers.dmgAmp) a *= 1 + src.helpers.dmgAmp;
    const pen = { penFlat: D.lethalityToFlat(src.stats.lethality || 0, src.level), penPct: (src.helpers.penPct || 0), reductionPct: dst.helpers.armorShred || 0 };
    const post = type === 'true' ? a : D.mitigate(a, type, { armor: dst.stats.armor.total, mr: dst.stats.mr.total }, type === 'physical' ? pen : { penFlat: src.helpers.magicPenFlat || 0, penPct: src.helpers.magicPenPct || 0 });
    const reductions = dst.dr.filter(r => r.until > this.t).map(r => ({ pct: r.pct, flat: r.flat, types: r.types })).concat(JB.extraReductions(this, src, dst));
    const r = D.applyToUnit(dst, post, type, reductions);
    dst.lastDamageAt = this.t; dst.lastHit = this.t; dst.lastAttacker = src.id;
    if (this.structures) { if (dst.kind === 'structure') this.structures.afterDamage(src, dst); else if (src.team !== dst.team && src.kind !== 'minion' && src.kind !== 'monster' && src.kind !== 'structure' && dst.kind !== 'minion' && dst.kind !== 'monster') this.structures.onChampionDamage(src, dst); }
    dst.assisters = dst.assisters || {}; dst.assisters[src.id] = this.t;
    src.stat.dmgDealt += r.dealt; dst.stat.dmgTaken += r.dealt;
    this.emit('damage', { src: src.id, dst: dst.id, raw: +amount.toFixed(1), dealt: +r.dealt.toFixed(1), absorbed: +r.absorbed.toFixed(1), dtype: type, ability: info.ability || (info.attack ? 'AA' : null), crit });
    src.lastDealtAt = this.t;
    if (dst.kind === 'minion') { dst.dmgWin = (dst.dmgWin || []).filter(e => this.t - e.t < 1); dst.dmgWin.push({ t: this.t, a: r.dealt }); }
    this.exec.onDamage(this, src, dst, { ...info, type, dealt: r.dealt, post }); FX.onDealDamage(this, src, dst, { ...info, type, dealt: r.dealt }); JB.onDealDamage(this, src, dst, { ...info, type, dealt: r.dealt });
    if (src.smite && dst.kind === 'monster' && r.dealt > 0 && src.team !== 2) this.heal(src, r.dealt * 0.07, src);            /* companheiro de selva: 7% de vampirismo contra monstros (ESTIMADO, Bloco 6 pendente) */
    if (src.stat && info.attack && src.helpers.lifesteal) this.heal(src, r.dealt * src.helpers.lifesteal, src);
    if (r.killed && !FX.tryRevive(this, dst)) this.kill(dst, src);
    return r;
  }
  kill(dst, src) {
    if (dst.dead) return;
    dst.dead = true; dst.hp = 0; dst.stat.deaths++; if (src && dst.kind !== 'minion' && dst.kind !== 'monster' && dst.kind !== 'structure') src.stat.kills++;
    Object.keys(dst.assisters || {}).forEach(id => { const u = this.byId(+id); if (u && u !== src && u.team === src.team && this.t - dst.assisters[id] < 10) u.stat.assists++; });
    dst.cast = null; dst.attack.windup = null; dst.dash = null; dst.order = null;
    this.zones.forEach(z => { if (z.owner === dst && z.dieWithOwner) z.until = this.t; });
    if (dst.kind === 'structure') { this.structures.onDeath(dst, src); return; }
    if (dst.kind === 'minion') { if (this.econ) this.econ.onMinionDeath(dst, src); return; }
    if (dst.kind === 'monster') { if (this.jungle) this.jungle.onMonsterDeath(dst, src); return; }
    JB.onDeath(this, dst); if (this.respawn) LIFE.onDeath(this, dst);
    this.emit('kill', { dst: dst.id, src: src && src.id });
    if (this.econ) this.econ.onChampionKill(dst, src);
  }
  get life() { return LIFE; }
  byId(id) { return this.units.find(u => u.id === id) || this.structs.find(u => u.id === id); }
  foes(u) { return this.units.filter(x => !x.dead && x.team !== u.team); }
  friends(u) { return this.units.filter(x => !x.dead && x.team === u.team); }
  winner() { if (this.structures) return this.structures.winner(); const a = [0, 1].map(t => this.units.some(u => u.team === t && !u.dead && u.kind !== 'minion')); return a[0] && !a[1] ? 0 : a[1] && !a[0] ? 1 : null; }

  /* ---------- ordens ---------- */
  orderMove(u, x, y) { u.order = { type: 'move', x, y }; }
  orderAttack(u, target) { u.order = { type: 'attack', target }; }
  orderCast(u, slot, aim) {
    const def = u.defs[slot], c = u.abil.check(slot, this.t, { mana: u.mana, abilityHaste: u.stats.abilityHaste, dead: u.dead, stunned: !this.canAct(u), silenced: this.has(u, 'silence') });
    if (!c.ok || u.cast || u.dash) return c;
    if (!this.canCast(u, def)) return { ok: false, reason: 'controle' };
    const rank = u.abil.rank[slot];
    u.cast = { slot, rank, aim, until: this.t + def.castTime, start: this.t };
    if (aim && aim.x !== undefined) u.face = Math.atan2(aim.y - u.pos.y, aim.x - u.pos.x);
    else if (aim && aim.target) u.face = Math.atan2(aim.target.pos.y - u.pos.y, aim.target.pos.x - u.pos.x);
    u.attack.windup = null; this.emit('cast-start', { id: u.id, slot, rank });
    if (def.castTime <= 0) this.completeCast(u);
    return { ok: true };
  }
  completeCast(u) {
    const c = u.cast; if (!c) return; u.cast = null;
    const slot = c.slot, def = u.defs[slot];
    const toggleOff = u.zonesOwned[slot] && def.targeting === 'SelfAoe' && u.kit[slot].shape === 'toggleAura';
    const res = u.abil.cast(slot, this.t, { mana: u.mana, abilityHaste: u.stats.abilityHaste });
    if (!res.ok && !toggleOff) { this.emit('cast-fail', { id: u.id, slot, reason: res.reason }); return; }
    if (res.ok) u.mana -= res.cost;
    u.stat.casts++;
    this.emit('cast', { id: u.id, slot, rank: c.rank }); JB.onCast(this, u, slot);
    this.exec.launch(this, u, { slot, rank: c.rank, aim: c.aim });
  }

  /* ---------- ataque básico ---------- */
  attackSpec(u) {
    if (u.helpers.atk) return u.helpers.atk;
    const ab = u.ch.stats_cdragon.ataque_basico || {};
    let frac = ab.mAttackCastTime !== undefined && ab.mAttackTotalTime ? ab.mAttackCastTime / ab.mAttackTotalTime : 0.3 + (ab.mAttackDelayCastOffsetPercent || 0);
    const key = Object.keys(u.ch.objetos_habilidade).find(k => /BasicAttack$/i.test(k));
    const ms = key ? (u.ch.objetos_habilidade[key].mSpell || {}).missileSpeed : 0;
    return (u.helpers.atk = { windupFrac: Math.max(0.05, frac), missile: ms || 0, src: ab.mAttackCastTime !== undefined ? 'cast/total' : '0,3+offset' });
  }
  inAttackRange(u, t) { return dist(u.pos, t.pos) <= u.stats.range + t.radius + 15; }       /* ~ raio de jogabilidade */
  startAttack(u, target) {
    if (!this.canAttack(u) || u.cast || u.dash || u.attack.windup || this.t < u.attack.readyAt || !this.inAttackRange(u, target)) return false;
    const spec = this.attackSpec(u), interval = 1 / this.asOf(u);
    u.face = Math.atan2(target.pos.y - u.pos.y, target.pos.x - u.pos.x);
    u.attack.windup = { target, until: this.t + spec.windupFrac * interval };
    u.attack.readyAt = this.t + interval;
    return true;
  }
  finishAttack(u) {
    const w = u.attack.windup; u.attack.windup = null;
    if (!w || w.target.dead) return;
    const spec = this.attackSpec(u);
    u.stat.attacks++; this.emit('attack', { id: u.id, dst: w.target.id });
    if (spec.missile > 0) this.exec.spawnHoming(this, u, w.target, { speed: spec.missile, onHit: tg => this.exec.attackHit(this, u, tg), tag: 'AA' });
    else this.exec.attackHit(this, u, w.target);
  }

  /* ---------- passo de simulação ---------- */
  step() {
    this.t = +(this.t + this.dt).toFixed(6); this.tickN++;
    this.reindex();
    if (this.econ) this.econ.update();
    if (this.jungle) this.jungle.update();
    if (this.structures) this.structures.update();
    if (this.respawn) LIFE.update(this);
    if (this.supplies) require('../items/supplies').tick(this, this.dt);
    for (const b of this.brains) b.update();
    while (this.sched.length && this.sched[0].at <= this.t + 1e-9) this.sched.shift().fn();
    let dirty = false;
    for (const u of this.units) {
      if (u.dead) continue;
      const n = u.st.length; u.st = u.st.filter(s => s.until > this.t);
      u.shields = u.shields.filter(s => s.until > this.t && s.amount > 0);
      const nb = u.buffs.length; u.buffs = u.buffs.filter(b => b.until > this.t); if (u.buffs.length !== nb) dirty = true;
      if (dirty) { this.refresh(u); dirty = false; }
      if (u.helpers.armorShredUntil && u.helpers.armorShredUntil <= this.t) u.helpers.armorShred = 0;
      if (u.empower && u.empower.until <= this.t) u.empower = null;
      FX.tick(this, u); JB.tick(this, u);
      u.hp = Math.min(u.hpMax, u.hp + u.stats.hpRegen5.total / 5 * this.dt);
      u.mana = Math.min(u.manaMax, u.mana + u.stats.manaRegen5.total / 5 * this.dt);
    }
    for (const u of this.units) if (!u.dead && this.t >= u.ai.next && this.ai.enabled(u)) { this.ai.decide(this, u); u.ai.next = this.t + 0.15; }
    for (const u of this.units) if (!u.dead) { if (u.kind === 'minion') MIN.update(this, u); else if (u.kind === 'monster') MON.update(this, u); else this.updateUnit(u); }
    this.exec.updateProjectiles(this); this.exec.updateZones(this);
    this.zones = this.zones.filter(z => z.until > this.t);
    if (this.units.some(u => u.dead && (u.kind === 'minion' || u.kind === 'monster'))) this.units = this.units.filter(u => !(u.dead && (u.kind === 'minion' || u.kind === 'monster')));
  }
  /* índices por tick (desempenho): minions e campeões vivos por time */
  reindex() { const mi = [[], []], ch = [[], []]; for (const u of this.units) { if (u.dead || u.team > 1) continue; if (u.kind === 'minion') mi[u.team].push(u); else if (u.kind !== 'monster') ch[u.team].push(u); } this.idx = { minions: mi, champs: ch }; }
  updateUnit(u) {
    if (u.cast && this.t >= u.cast.until - 1e-9) this.completeCast(u);
    if (u.dead) return;
    if (u.attack.windup && this.t >= u.attack.windup.until - 1e-9) this.finishAttack(u);
    if (u.dash) { this.exec.stepDash(this, u); return; }
    const charm = u.st.find(s => s.kind === 'charm' && s.until > this.t), fear = u.st.find(s => s.kind === 'fear' && s.until > this.t);
    if (charm || fear) {
      const src = this.byId((charm || fear).src); if (src) { const a = Math.atan2(src.pos.y - u.pos.y, src.pos.x - u.pos.x) + (fear ? Math.PI : 0); this.moveBy(u, Math.cos(a), Math.sin(a), this.msOf(u) * this.dt); }
      return;
    }
    const o = u.order; if (!o || !this.canMove(u) && !(o.type === 'attack' && !u.cast)) { u.vel = { x: 0, y: 0 }; if (o && o.type === 'attack' && o.target.dead) u.order = null; return; }
    if (o.type === 'move') {
      const d = Math.hypot(o.x - u.pos.x, o.y - u.pos.y);
      if (d < 5) { u.order = null; u.vel = { x: 0, y: 0 }; return; }
      if (!this.canMove(u)) return;
      this.moveBy(u, (o.x - u.pos.x) / d, (o.y - u.pos.y) / d, Math.min(d, this.msOf(u) * this.dt));
    } else if (o.type === 'attack') {
      if (o.target.dead) { u.order = null; return; }
      if (this.inAttackRange(u, o.target)) { u.vel = { x: 0, y: 0 }; this.startAttack(u, o.target); }
      else if (this.canMove(u)) { const d = dist(u.pos, o.target.pos); this.moveBy(u, (o.target.pos.x - u.pos.x) / d, (o.target.pos.y - u.pos.y) / d, this.msOf(u) * this.dt); }
    }
  }
  moveBy(u, dx, dy, d) {
    u.pos.x = Math.max(0, Math.min(this.arena.w, u.pos.x + dx * d)); u.pos.y = Math.max(0, Math.min(this.arena.h, u.pos.y + dy * d));
    u.vel = { x: dx * d / this.dt, y: dy * d / this.dt }; u.face = Math.atan2(dy, dx);
  }
  run(seconds, until) {
    const end = this.t + seconds;
    while (this.t < end - 1e-9) { this.step(); if (until && until(this)) break; if (this.winner() !== null) break; }
    return this;
  }
  /* assinatura do log: igual para execuções idênticas (determinismo) */
  hash() { let h = 2166136261 >>> 0; const s = JSON.stringify(this.log); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
}
module.exports = { World, dist };
