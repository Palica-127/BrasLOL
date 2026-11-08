'use strict';
/* Estruturas (Bloco 7): torres, inibidores e Nexus. Ficam em `w.structs` (fora de `w.units`) para nao serem confundidas com campeoes
   nos sistemas anteriores; sao alvos de ataques basicos, minions e torres. Habilidades de area ainda nao as acertam (pendente).
   Fonte: Wiki do LoL (v26.x == Data Dragon 16.x) para vida/armadura/RM/alcance/velocidade de ataque por tipo, placas, Bulwark, Warming Up,
   Reinforced Armor, prioridade de alvo, ouro e regras de invulnerabilidade; registros do cliente (estruturas.json) para raio de colisao,
   regeneracao do inibidor (15/s) e do Nexus (20/s) e velocidade de ataque da torre (0,833).
   ESTIMADOS (declarados): dano da torre por minuto (so os extremos sao publicados), raio da Reinforced Armor, escala do Bulwark pelo numero
   de campeoes, dano da torre contra minions (=dano cheio), fonte (cura), posicoes (ver layout.js). PENDENTES: Crystalline Overgrowth, Toque/Fome do
   Vazio e carga do Arauto contra torres, dano de fonte, paredes, dano de habilidades em estruturas. */
const LAY = require('./layout');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const v = x => (x && typeof x === 'object' && 'baseValue' in x ? x.baseValue : x);

const TURRET = {                                        /* Wiki */
  outer: { hp: 9000, adMin: 182, adMax: 350, gold: 50 }, inner: { hp: 5000, adMin: 187, adMax: 427, gold: 25 },
  inhib: { hp: 4750, adMin: 187, adMax: 427, gold: 25 }, nexusT: { hp: 3500, adMin: 165, adMax: 405, gold: 50 },
  armor: 60, mr: 60, range: 750, as: 0.833, projSpeed: 1200, sight: 1350
};
const P = {
  adRampFrom: 90, adRampTo: 840,                        /* ESTIMADO: o AD sobe linear entre 1:30 e 14:00 (a Wiki so da os extremos; 168 de bonus ate 14:00 na externa) */
  decayFrom: 660, decayTo: 900, decayArmorPerMin: 10, decayMrPerMin: 15,   /* Wiki: externa perde ate 40 armadura / 60 RM entre 11:00 e 15:00 */
  warmStep: 0.5, warmMax: 1.5, warmReset: 5, ohmPen: 0.30,                 /* Wiki: Warming Up */
  reinforced: 0.8, reinforcedDelay: 3, reinforcedRadius: 800,              /* Wiki: 80%, 3 s; raio ESTIMADO (alcance da torre + folga) */
  meleeBonus: 0.2,                                                         /* Wiki: +20% de dano de campeoes corpo a corpo */
  plateThresholds: [0.10, 0.25, 0.45, 0.70], plateGold: 120, bulwarkDur: 20, bulwarkMin: 30, bulwarkMax: 50, bulwarkRadius: 850,   /* Wiki; escala 30..50 pelo numero de campeoes ESTIMADA */
  localRadius: 1200, assistWindow: 10, firstTurretBonus: 300, inhibKillGold: 50, nexusKillGold: 50,
  inhibRespawn: 300, superWaves: 8,
  fountainRadius: 900, fountainHealPct: 0.085, meleeRange: 250                  /* fonte: ESTIMADO */
};

class Structures {
  constructor(w, opts = {}) {
    this.w = w; this.P = P; this.all = []; this.byTeam = [[], []]; this.over = null; this.firstTurretDone = false; this.fountain = [null, null];
    this.lanes = {};
    [0, 1].forEach(team => this.build(team));
    w.structs = this.all;
  }
  mk(team, sub, lane, tier, pos) {
    const w = this.w, rec = w.loader.structures();
    let hp, armor, mr, regen, radius, ad = 0;
    if (sub === 'turret') { const T = TURRET[tier]; hp = T.hp; armor = TURRET.armor; mr = TURRET.mr; regen = v(rec.turret.registro.baseStaticHPRegenModifiable) || 0; radius = rec.turret.registro.overrideGameplayCollisionRadius || 88.4; ad = T.adMin; }
    else if (sub === 'inhibitor') { const r = rec.inhibitor.registro; hp = v(r.baseHPModifiable); armor = 20; mr = 0; regen = v(r.baseStaticHPRegenModifiable); radius = r.pathfindingCollisionRadius; }   /* armadura 20 / RM 0: Wiki */
    else { const r = rec.nexus.registro; hp = v(r.baseHPModifiable); armor = 20; mr = 0; regen = v(r.baseStaticHPRegenModifiable); radius = r.pathfindingCollisionRadius; }
    const s = {
      id: w.nextId++, kind: 'structure', sub, tier, lane, name: `${team === 0 ? 'O' : 'C'}_${lane || 'base'}_${tier}`, team, level: 1, pos: { x: pos.x, y: pos.y }, vel: { x: 0, y: 0 }, face: 0, radius,
      hp, hpMax: hp, mana: 0, manaMax: 0, regen,
      stats: { hp: { base: hp, bonus: 0, total: hp }, ad: { base: ad, bonus: 0, total: ad }, ap: { total: 0, bonus: 0, base: 0 }, armor: { base: armor, bonus: 0, total: armor }, mr: { base: mr, bonus: 0, total: mr },
        as: { total: TURRET.as }, ms: { base: 0, bonus: 0, total: 0 }, range: sub === 'turret' ? TURRET.range : 0, crit: 0, critDamage: 2, abilityHaste: 0, lethality: 0, hpRegen5: { base: 0, bonus: 0, total: 0 }, manaRegen5: { base: 0, bonus: 0, total: 0 } },
      shields: [], st: [], dr: [], buffs: [], marks: {}, helpers: sub === 'turret' ? { penPct: P.ohmPen } : {}, items: [], itemCd: {}, itemState: {}, zonesOwned: {}, recast: {},
      attack: { readyAt: 0, windup: null }, cast: null, dash: null, order: null, empower: null, dead: false, lastHit: -99, lastDamageAt: -99, target: null,
      ai: { enabled: false, next: 0, aim: 0, dodge: 0, react: 0, dodgeUntil: 0 }, stat: { kills: 0, deaths: 0, assists: 0, dmgDealt: 0, dmgTaken: 0, healed: 0, shielded: 0, ccTime: 0, casts: 0, hits: 0, attacks: 0 },
      invuln: true, plates: sub === 'turret' && tier === 'outer' ? 5 : 0, warm: 0, warmUntil: 0, lastMinionNear: -99, bulwark: [], baseArmor: armor, baseMr: mr
    };
    this.all.push(s); this.byTeam[team].push(s); return s;
  }
  build(team) {
    const pos = LAY.structurePositions(team), L = this.lanes[team] = {};
    ['top', 'mid', 'bot'].forEach(id => {
      const p = pos.lanes[id];
      L[id] = { outer: this.mk(team, 'turret', id, 'outer', p.outer), inner: this.mk(team, 'turret', id, 'inner', p.inner), inhibTurret: this.mk(team, 'turret', id, 'inhib', p.inhibTurret), inhibitor: this.mk(team, 'inhibitor', id, 'inhibitor', p.inhibitor), superWaves: 0 };
    });
    this.nexus = this.nexus || [];
    this.nexus[team] = this.mk(team, 'nexus', null, 'nexus', pos.nexus);
    this.nexusTurrets = this.nexusTurrets || []; this.nexusTurrets[team] = pos.nexusTurrets.map(p => this.mk(team, 'turret', null, 'nexusT', p));
    this.fountain[team] = pos.fountain;
  }

  /* ---------- consultas ---------- */
  lane(team, id) { return this.lanes[team][id]; }
  inhibitors(team) { return Object.values(this.lanes[team]).map(l => l.inhibitor); }
  allInhibitorsDown(team) { return this.inhibitors(team).every(i => i.dead); }
  anyInhibitorDown(team) { return this.inhibitors(team).some(i => i.dead); }
  targetable(s) { return !s.dead && !s.invuln; }
  vulnerable(s) {
    if (s.dead) return false;
    const L = s.lane ? this.lanes[s.team][s.lane] : null;
    if (s.sub === 'turret') {
      if (s.tier === 'outer') return true;
      if (s.tier === 'inner') return L.outer.dead;
      if (s.tier === 'inhib') return L.inner.dead;
      return this.anyInhibitorDown(s.team);                                                  /* torres do Nexus: Wiki */
    }
    if (s.sub === 'inhibitor') return L.inhibTurret.dead;
    return !this.nexusTurrets[s.team].some(t => !t.dead) && this.anyInhibitorDown(s.team);   /* Nexus: invulneravel com torre do Nexus viva ou com os 3 inibidores de pe (Wiki) */
  }
  winner() { return this.over ? this.over.winner : null; }
  /* ondas: quantos super minions o time `team` ganha na rota (o inibidor inimigo caiu) */
  consumeSuper(team, laneId) {
    const L = this.lanes[1 - team][laneId]; if (!L) return 0;
    const all = this.allInhibitorsDown(1 - team);
    if (L.superWaves > 0 || all) { if (L.superWaves > 0) L.superWaves--; return all ? 2 : 1; }
    return 0;
  }

  /* ---------- tempo ---------- */
  adNow(s, t) { const T = TURRET[s.tier]; return T.adMin + (T.adMax - T.adMin) * Math.max(0, Math.min(1, (t - P.adRampFrom) / (P.adRampTo - P.adRampFrom))); }
  update() {
    const w = this.w, t = w.t;
    for (const s of this.all) {
      if (s.dead) continue;
      s.invuln = !this.vulnerable(s);
      if (s.regen && s.hp < s.hpMax) s.hp = Math.min(s.hpMax, s.hp + s.regen * w.dt);
      if (s.sub === 'turret') this.updateTurret(s);
    }
    /* fonte: cura rapida de campeoes aliados (ESTIMADO) */
    [0, 1].forEach(team => w.units.forEach(u => {
      if (u.dead || u.team !== team || u.kind === 'minion' || u.kind === 'monster' || dist(u.pos, this.fountain[team]) > P.fountainRadius) return;
      u.hp = Math.min(u.hpMax, u.hp + u.hpMax * P.fountainHealPct * w.dt); u.mana = Math.min(u.manaMax, u.mana + u.manaMax * P.fountainHealPct * w.dt);
    }));
  }
  updateTurret(s) {
    const w = this.w, t = w.t;
    /* armadura e RM: decaimento da externa (11:00-15:00) e Bulwark */
    let ar = s.baseArmor, mr = s.baseMr;
    if (s.tier === 'outer') { const k = Math.max(0, Math.min(1, (t - P.decayFrom) / (P.decayTo - P.decayFrom))), mins = k * (P.decayTo - P.decayFrom) / 60; ar -= P.decayArmorPerMin * mins; mr -= P.decayMrPerMin * mins; }
    s.bulwark = s.bulwark.filter(b => b.until > t);
    if (s.bulwark.length) { ar += s.bulwark.reduce((a, b) => a + b.amount, 0); mr += s.bulwark.reduce((a, b) => a + b.amount, 0); }
    s.stats.armor.total = ar; s.stats.mr.total = mr;
    /* Reinforced Armor: 80% de reducao (inclusive dano verdadeiro) sem minions inimigos por perto; religa 3 s depois */
    if (w.idx.minions[1 - s.team].some(x => !x.dead && dist(x.pos, s.pos) <= P.reinforcedRadius)) s.lastMinionNear = t;
    s.reinforced = t - s.lastMinionNear >= P.reinforcedDelay;
    s.dr = s.reinforced ? [{ pct: P.reinforced, until: t + 1 }] : [];
    if (t > s.warmUntil) s.warm = 0;
    s.stats.ad.total = this.adNow(s, t);
    /* ataque */
    if (s.attack.windup && t >= s.attack.windup.until - 1e-9) {
      const tg = s.attack.windup.target; s.attack.windup = null;
      if (!tg.dead) this.fire(s, tg);
    }
    if (s.attack.windup) return;
    if (!s.target || !this.validTarget(s, s.target)) s.target = this.pickTarget(s);
    if (s.target && t >= s.attack.readyAt) { s.attack.windup = { target: s.target, until: t + 0.139 * (1 / TURRET.as) }; s.attack.readyAt = t + 1 / TURRET.as; s.face = Math.atan2(s.target.pos.y - s.pos.y, s.target.pos.x - s.pos.x); }
  }
  validTarget(s, x) { return !x.dead && x.team !== s.team && !this.w.has(x, 'stasis') && dist(s.pos, x.pos) <= TURRET.range + x.radius; }
  /* prioridade (Wiki): siege/super > corpo a corpo > caster > campeoes */
  pickTarget(s) {
    const w = this.w, rank = x => x.kind === 'minion' ? (x.name === 'siege' || x.name === 'super' ? 1 : x.name === 'melee' ? 2 : 3) : 4;
    let best = null, br = 9, bd = 1e9;
    for (const x of w.idx.minions[1 - s.team].concat(w.idx.champs[1 - s.team])) {
      if (x.dead || !this.validTarget(s, x)) continue;
      const r = rank(x), d = dist(s.pos, x.pos);
      if (r < br || r === br && d < bd) { best = x; br = r; bd = d; }
    }
    return best;
  }
  fire(s, tg) {
    const w = this.w; s.stat.attacks++;
    const champ = tg.kind !== 'minion';
    let mult = 1;
    if (champ) { mult += s.warm; s.warm = Math.min(P.warmMax, s.warm + P.warmStep); s.warmUntil = w.t + P.warmReset; }
    /* a primeira pancada em campeao vale 100%; cada tiro seguinte soma +50% (ate +150%) */
    const dmg = s.stats.ad.total * mult;
    w.exec.spawnHoming(w, s, tg, { speed: TURRET.projSpeed, tag: 'AA', onHit: t => { if (!t.dead) w.dealDamage(s, t, dmg, 'physical', { attack: true, turret: true }); } });
    w.emit('turret-shot', { sid: s.id, dst: tg.id, dmg: +dmg.toFixed(1) });
  }
  /* um campeao ferindo um campeao aliado de uma torre dentro de 1400 faz a torre trocar de alvo (Wiki) */
  onChampionDamage(src, dst) {
    for (const s of this.byTeam[dst.team]) {
      if (s.dead || s.sub !== 'turret' || dist(s.pos, dst.pos) > 1400 || !this.validTarget(s, src)) continue;
      s.target = src;
    }
  }

  /* ---------- dano recebido ---------- */
  preDamage(src, dst, amount) {
    if (dst.invuln) return 0;
    if (src.kind !== 'minion' && src.kind !== 'monster' && src.kind !== 'structure' && src.stats.range <= P.meleeRange) amount *= 1 + P.meleeBonus;
    return amount;
  }
  afterDamage(src, dst) {
    if (dst.dead || !dst.plates) return;
    const lost = 1 - dst.hp / dst.hpMax, n = P.plateThresholds.filter(x => lost >= x - 1e-9).length;
    while (5 - dst.plates < n && dst.plates > 1) { this.plateFall(dst, src); dst.plates--; }
  }
  plateFall(s, src) {
    const w = this.w, enemies = w.units.filter(x => !x.dead && x.team !== s.team && x.kind !== 'minion' && x.kind !== 'monster' && dist(x.pos, s.pos) <= P.bulwarkRadius).length;
    s.bulwark.push({ until: w.t + P.bulwarkDur, amount: Math.min(P.bulwarkMax, P.bulwarkMin + 5 * Math.max(0, enemies - 1)) });
    w.emit('plate', { sid: s.id, left: s.plates - 1, bulwark: s.bulwark.length });
    this.localGold(s, P.plateGold, src, 'plate');
  }
  /* ouro local: dividido entre campeoes vivos a 1200; quem deu o golpe/assistiu nos ultimos 10 s sempre recebe (Wiki) */
  localGold(s, amount, killer, why) {
    const w = this.w, team = 1 - s.team, set = new Set();
    w.units.forEach(u => { if (!u.dead && u.team === team && u.kind !== 'minion' && u.kind !== 'monster' && dist(u.pos, s.pos) <= P.localRadius) set.add(u); });
    if (killer && killer.team === team && killer.kind !== 'minion' && killer.kind !== 'monster') set.add(killer);
    Object.keys(s.assisters || {}).forEach(id => { const u = w.byId(+id); if (u && u.team === team && u.kind !== 'minion' && u.kind !== 'monster' && w.t - s.assisters[id] < P.assistWindow) set.add(u); });
    if (!set.size) return;
    [...set].forEach(u => this.gold(u, amount / set.size, why));
  }
  gold(u, g, why) { if (this.w.econ) this.w.econ.giveGold(u, g, why); else { u.gold += g; u.stat.goldEarned = (u.stat.goldEarned || 0) + g; } }
  teamGold(team, g, why) { this.w.units.forEach(u => { if (u.team === team && u.kind !== 'minion' && u.kind !== 'monster') this.gold(u, g, why); }); }

  onDeath(s, killer) {
    const w = this.w, foe = 1 - s.team;
    w.emit('structure-fall', { sid: s.id, sname: s.name, team: s.team, sub: s.sub, tier: s.tier, lane: s.lane, src: killer && killer.id });
    if (s.sub === 'turret') {
      this.teamGold(foe, TURRET[s.tier].gold, 'turret');
      if (s.tier === 'outer') this.localGold(s, P.plateGold, killer, 'plate');
      if (!this.firstTurretDone) { this.firstTurretDone = true; this.localGold(s, P.firstTurretBonus, killer, 'first-turret'); }
    } else if (s.sub === 'inhibitor') {
      if (killer && killer.team === foe && killer.kind !== 'minion' && killer.kind !== 'monster') this.gold(killer, P.inhibKillGold, 'inhibitor');
      this.lanes[s.team][s.lane].superWaves = P.superWaves;
      w.schedule(w.t + P.inhibRespawn, () => { s.dead = false; s.hp = s.hpMax; w.emit('inhibitor-up', { sid: s.id, team: s.team, lane: s.lane }); });
    } else {
      if (killer && killer.team === foe && killer.kind !== 'minion' && killer.kind !== 'monster') this.gold(killer, P.nexusKillGold, 'nexus');
      this.over = { winner: foe, t: w.t }; w.emit('game-end', { winner: foe, nexus: s.id });
    }
  }
}
function enable(w, opts) { w.structures = new Structures(w, opts); return w.structures; }
module.exports = { enable, Structures, TURRET, P };
