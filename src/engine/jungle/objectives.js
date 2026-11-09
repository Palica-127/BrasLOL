'use strict';
/* Selva e objetivos (Bloco 6): acampamentos, Aronguejo, Larvas do Vazio, Arauto, Dragões (pilhas, alma, Ancião), Barão, Golpear.
   HORÁRIOS e BUFFS vêm da Wiki do LoL (v. 26.x == Data Dragon 16.x), pois só existem em scripts da Riot; os ATRIBUTOS dos monstros vêm do cliente.
   ESTIMADO (declarado): posições (layout abstrato; o mapa real é o Bloco 7), faixas de nível dos buffs azul/vermelho, escala por minuto do Barão/Ancião,
   raios das almas, duração do escudo da alma da Montanha, cura em 1 tick da alma do Oceano.
   PENDENTE: efeito das pilhas "Toque do Vazio"/"Fome do Vazio" (precisam de torres, Bloco 7), investida do Arauto contra torres, empoderamento de minions do Barão,
   fuga do Aronguejo, recuperação do buff vermelho por abate. */
const MON = require('./monsters');
const BUF = require('./buffs');
const { xpShare } = require('../economy/economy');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const T = {                                                    /* Wiki */
  camps: { blue: [55, 300], red: [55, 300], gromp: [67, 135], wolves: [55, 135], raptors: [55, 135], krugs: [67, 135] },
  scuttle: [175, 150], grubs: { spawn: 480, despawn: 885 }, herald: { spawn: 900, despawn: 1185 }, baron: { spawn: 1200, respawn: 360 }, drake: { spawn: 300, respawn: 300 }, elder: { respawn: 300 }
};
/* Dragões (especificação do projeto): o 1º nasce aos 5:00 e cada um renasce 5 min depois de abatido; os 2 primeiros são aleatórios, o 3º define o ELEMENTO DO MAPA
   (os seguintes e a Alma seguem esse elemento); com a Alma, os elementais param e o Ancião passa a nascer a cada 5 min. Efeitos de terreno ESTIMADOS: Nuvem = zonas de
   velocidade no rio e nos covis; Oceano = Frutas-Mel de cura no rio. Infernal/Montanha/Hextec/Quimtec alteram paredes e portais: PENDENTE (precisa da malha de navegação). */
const RIFT_FX = { cloudMs: 0.1, cloudR: 750, fruitHeal: [120, 0.15], fruitCd: 150, fruitR: 140 };
const DRAKES = ['sru_dragon_fire', 'sru_dragon_water', 'sru_dragon_earth', 'sru_dragon_air', 'sru_dragon_hextech', 'sru_dragon_chemtech'];
const SMITE = { dmg: 600, cd: 15, range: 500, level: 3, firstExtra: 48, every: 90, max: 2 };            /* Wiki */
const BARON = { buff: 180, globalGold: 150, killGold: 100, globalXp: 650 }, ELDER = { buff: 150, globalGold: 150, globalXp: 650 };
const camp = (key, mem) => ({ key, members: mem });
const COMPOSITION = {
  blue: ['sru_blue', 'sru_bluemini', 'sru_bluemini2'], red: ['sru_red', 'sru_redmini', 'sru_redmini'], gromp: ['sru_gromp'],
  wolves: ['sru_murkwolf', 'sru_murkwolfmini', 'sru_murkwolfmini'], raptors: ['sru_razorbeak', 'sru_razorbeakmini', 'sru_razorbeakmini', 'sru_razorbeakmini', 'sru_razorbeakmini', 'sru_razorbeakmini'],
  krugs: ['sru_krug', 'sru_krugmini']
};
/* layout ABSTRATO (arena 15000 x 15000): só para os testes; o Bloco 7 traz o mapa */
const LAYOUT = {
  0: { blue: { x: 4000, y: 9500 }, red: { x: 9500, y: 5000 }, gromp: { x: 2500, y: 8200 }, wolves: { x: 4000, y: 7500 }, raptors: { x: 7000, y: 5500 }, krugs: { x: 10500, y: 3500 } },
  1: { blue: { x: 11000, y: 5500 }, red: { x: 5500, y: 10000 }, gromp: { x: 12500, y: 6800 }, wolves: { x: 11000, y: 7500 }, raptors: { x: 8000, y: 9500 }, krugs: { x: 4500, y: 11500 } },
  crab: [{ x: 5000, y: 5000 }, { x: 10000, y: 10000 }], grubs: { x: 5200, y: 10200 }, herald: { x: 5200, y: 10200 }, baron: { x: 5200, y: 10200 }, drake: { x: 9800, y: 4800 }
};

/* RECOMPENSA POR ACAMPAMENTO (nível 1; especificação do projeto): [ouro, XP] do acampamento inteiro, repartido entre os monstros pelo peso do registro
   (`tree` = todos os monstros que o campo gera, incluindo as divisões dos Krugs). Limpar o acampamento todo vale exatamente 4 CS, não importa quantos monstros morram.
   ESTIMADO (sem fonte): escala com a média de nível dos campeões (ouro até x1,2 e XP até x1,5 no nível 18), bônus de XP do caçador nos monstros grandes (+15%),
   penalidade de rota do caçador antes de completar o item de selva (x0,5 de ouro e XP dos minions) e a contagem do item (35 = `totalcounters` do filhote). */
const CAMP_REWARD = { blue: [90, 100], red: [90, 100], gromp: [80, 135], wolves: [85, 95], raptors: [85, 95], krugs: [80, 135], crab: [55, 115] };
const CAMP_TREE = {
  blue: ['sru_blue', 'sru_bluemini', 'sru_bluemini2'], red: ['sru_red', 'sru_redmini', 'sru_redmini'], gromp: ['sru_gromp'], wolves: ['sru_murkwolf', 'sru_murkwolfmini', 'sru_murkwolfmini'],
  raptors: ['sru_razorbeak', ...Array(5).fill('sru_razorbeakmini')], krugs: ['sru_krug', 'sru_krugmini', ...Array(6).fill('sru_krugminimini')], crab: ['sru_crab']
};
const BIG = new Set(['sru_blue', 'sru_red', 'sru_gromp', 'sru_murkwolf', 'sru_razorbeak', 'sru_krug', 'sru_crab']);
const JUNGLE_RULE = { csPerCamp: 4, goldScale: 0.2, xpScale: 0.5, hunterXp: 0.15, laneMinionPenalty: 0.5, itemStacks: 35 };
const campKind = c => (c && c.key ? c.key.replace(/\d+$/, '') : null);
const isHunter = u => !!(u && u.smite);
const hunterDone = u => !isHunter(u) || (u.jgStacks || 0) >= JUNGLE_RULE.itemStacks;

class Jungle {
  constructor(w, opts = {}) {
    this.w = w; this.layout = opts.layout || LAYOUT; this.camps = []; this.epics = {}; this.stacks = [[], []]; this.soul = [null, null]; this.rift = null; this.drakeN = 0; this.elderNext = false;
    this.aspect = [null, null]; this.hob = [null, null]; this.log = []; this.riftOn = false; this.fruits = null;
    Object.keys(T.camps).forEach(k => [0, 1].forEach(side => this.addCamp(k, side, T.camps[k][0], T.camps[k][1])));
    LAYOUT.crab.forEach((p, i) => this.addCamp('crab' + i, null, T.scuttle[0], T.scuttle[1], ['sru_crab'], p));
    w.schedule(T.grubs.spawn, () => this.spawnGrubs()); w.schedule(T.grubs.despawn, () => this.despawn('grubs'));
    w.schedule(T.herald.spawn, () => this.spawnEpic('herald', 'sru_riftherald', this.layout.herald)); w.schedule(T.herald.despawn, () => this.despawn('herald'));
    w.schedule(T.baron.spawn, () => this.spawnEpic('baron', 'sru_baron', this.layout.baron));
    w.schedule(T.drake.spawn, () => this.spawnDrake());
  }
  avgLevel() { const c = this.w.units.filter(u => u.kind !== 'minion' && u.kind !== 'monster' && !u.dead); return c.length ? Math.floor(c.reduce((s, u) => s + u.level, 0) / c.length) : 1; }
  lvl(key) { return Math.max(MON.MIN_LEVEL[key] || 1, this.avgLevel()); }

  /* ---------- acampamentos ---------- */
  addCamp(key, side, first, respawn, comp, pos) {
    const c = { key, side, first, respawn, comp: comp || COMPOSITION[key], pos: pos || this.layout[side][key], members: [], nextSpawn: first, name: side === null ? key : key + '@' + side };
    this.camps.push(c); this.w.schedule(first, () => this.spawnCamp(c));
  }
  spawnCamp(c) {
    const w = this.w, lvl = this.lvl(c.comp[0]);
    c.members = c.comp.map((k, i) => MON.create(w, k, { x: c.pos.x + (i % 3) * 60 - 60, y: c.pos.y + Math.floor(i / 3) * 60 }, c, lvl)); c.members.forEach(m => { m.camp = c; });
    c.alive = c.members.length; c.spawnedAt = w.t; w.emit('camp-spawn', { camp: c.name, n: c.members.length, level: lvl });
  }
  campOf(m) { return m.camp; }
  campCleared(c) {
    const w = this.w; c.cleared = w.t; c.members = [];
    if (c.respawn) w.schedule(w.t + c.respawn, () => this.spawnCamp(c));
    w.emit('camp-clear', { camp: c.name, next: +(w.t + c.respawn).toFixed(1) });
  }

  /* ---------- épicos ---------- */
  spawnGrubs() {
    const w = this.w, lvl = this.lvl('sru_horde'), P = this.layout.grubs, g = [];
    for (let i = 0; i < 3; i++) g.push(MON.create(w, 'sru_horde', { x: P.x + i * 90 - 90, y: P.y }, null, lvl));
    g.forEach(m => { m.epicKey = 'grubs'; m.camp = { members: g, epic: 'grubs' }; }); this.epics.grubs = g; w.emit('epic-spawn', { epic: 'grubs', n: 3, level: lvl });
  }
  spawnEpic(name, key, pos) {
    const w = this.w, m = MON.create(w, key, pos, null, this.lvl(key)); m.epicKey = name; this.epics[name] = [m]; w.emit('epic-spawn', { epic: name, level: m.level });
  }
  despawn(name) {
    const list = this.epics[name]; if (!list) return;
    if (list.some(m => !m.dead && (m.target || m.hp < m.hpMax))) { this.w.schedule(this.w.t + 10, () => this.despawn(name)); return; }                 /* 10 s extras se em combate (Wiki) */
    list.forEach(m => { if (!m.dead) { m.dead = true; this.w.emit('epic-despawn', { epic: name }); } });
  }
  spawnDrake() {
    const w = this.w, lvl = this.lvl('sru_dragon');
    let key;
    if (this.elderNext) key = 'sru_dragon_elder';
    else if (this.drakeN < 2) key = DRAKES[w.rng.int('mundo', 0, DRAKES.length - 1)];
    else { if (!this.rift) this.rift = DRAKES[w.rng.int('mundo', 0, DRAKES.length - 1)]; key = this.rift; }
    const m = MON.create(w, key, this.layout.drake, null, key === 'sru_dragon_elder' ? this.lvl(key) : lvl); m.epicKey = 'drake'; this.epics.drake = [m]; w.emit('epic-spawn', { epic: 'drake', mkey: key, level: m.level });
  }

  /* ---------- morte de monstro ---------- */
  onMonsterDeath(m, killer) {
    const w = this.w, sp = m.spec, team = killer && killer.kind !== 'minion' && killer.kind !== 'monster' ? killer.team : null;
    /* krugs se dividem */
    if (m.name === 'sru_krug' || m.name === 'sru_krugmini') { const n = m.name === 'sru_krug' ? 4 : 2; for (let i = 0; i < n; i++) { const k = MON.create(w, 'sru_krugminimini', { x: m.pos.x + i * 30, y: m.pos.y }, m.camp, m.level); k.pos = { x: m.pos.x + i * 30, y: m.pos.y }; k.camp = m.camp; if (m.camp) { m.camp.members.push(k); } k.target = m.target; } }
    const kind = m.camp && !m.epicKey ? campKind(m.camp) : null, rw = kind && CAMP_REWARD[kind];
    let gold = sp.gold, xp = sp.xp;
    if (rw) {
      const tree = CAMP_TREE[kind], sum = (f) => tree.reduce((a, k) => a + (f(MON.spec(w.loader, k, 1)) || 0), 0);
      const sg = sum(x => x.gold) || 1, sx = sum(x => x.xp) || 1, L = Math.max(m.level, this.avgLevel()), f = (L - 1) / 17;
      const me = MON.spec(w.loader, m.name, 1);
      gold = rw[0] * (1 + JUNGLE_RULE.goldScale * f) * me.gold / sg; xp = rw[1] * (1 + JUNGLE_RULE.xpScale * f) * me.xp / sx;
    }
    const near = team === null ? [] : w.units.filter(x => x.kind !== 'minion' && x.kind !== 'monster' && !x.dead && x.team === team && dist(x.pos, m.pos) <= sp.xpRadius);
    if (near.length) near.forEach(x => { const q = xp * xpShare(near.length) * (rw && BIG.has(m.name) && isHunter(x) ? 1 + JUNGLE_RULE.hunterXp : 1); w.econ ? w.econ.grantXp(x, q, 'monster') : this.xpNoEcon(x, q); });
    if (killer && team !== null) { this.gold(killer, gold, 'monster'); if (isHunter(killer)) killer.jgStacks = (killer.jgStacks || 0) + 1; if (!rw) { killer.stat.cs = (killer.stat.cs || 0) + 1; killer.stat.jungleCs = (killer.stat.jungleCs || 0) + 1; } }
    w.emit('monster-kill', { id: m.id, mkey: m.name, src: killer && killer.id, level: m.level });
    if (m.camp && !m.epicKey && m.camp.members) {
      const alive = m.camp.members.filter(x => !x.dead && x !== m);
      if (!alive.length) {
        if (m.camp.members.length) this.campOf(m).members.forEach(() => 0);
        if (m.name === 'sru_blue' || m.name === 'sru_red') { /* buff vai ao assassino */ }
        if (rw && killer && team !== null) { killer.stat.cs = (killer.stat.cs || 0) + JUNGLE_RULE.csPerCamp; killer.stat.jungleCs = (killer.stat.jungleCs || 0) + JUNGLE_RULE.csPerCamp; w.emit('cs', { id: killer.id, mtype: 'camp:' + kind, n: JUNGLE_RULE.csPerCamp }); }
        this.campCleared(m.camp);
      }
    }
    if (m.name === 'sru_blue' && team !== null) BUF.grantCrest(w, killer, 'blue');
    if (m.name === 'sru_red' && team !== null) BUF.grantCrest(w, killer, 'red');
    if (m.epicKey) this.onEpic(m, killer, team);
  }
  xpNoEcon() {}
  gold(u, g, why) { if (this.w.econ) this.w.econ.giveGold(u, g, why); else { u.gold += g; u.stat.goldEarned = (u.stat.goldEarned || 0) + g; } }
  teamGold(team, g, xp, why) {
    const w = this.w;
    w.units.filter(u => u.kind !== 'minion' && u.kind !== 'monster' && u.team === team && !u.dead).forEach(u => { this.gold(u, g, why); if (w.econ) w.econ.grantXp(u, xp, why); });
  }
  onEpic(m, killer, team) {
    const w = this.w, name = m.epicKey;
    if (name === 'grubs') {
      this.epics.grubs = this.epics.grubs.filter(x => x !== m);
      if (team !== null) {
        this.stacks[team].grubs = (this.stacks[team].grubs || 0) + 1;                        /* Toque do Vazio: efeito pendente (precisa de torres) */
        w.emit('grub-stack', { team, n: this.stacks[team].grubs });
      }
      return;
    }
    if (team === null) return;
    if (name === 'herald') { this.eye = { team, until: w.t + 20 }; w.emit('herald-kill', { team, eye: 20 }); return; }
    if (name === 'baron') {
      this.teamGold(team, BARON.globalGold, BARON.globalXp, 'baron'); this.gold(killer, BARON.killGold, 'baron-kill');
      const mins = w.t / 60, k = Math.max(0, Math.min(1, (mins - 20) / 20));                 /* ESTIMADO: 12-48 AD e 20-80 AP, de 20 a 40 min */
      const ad = 12 + 36 * k, ap = 20 + 60 * k;
      w.units.filter(u => u.kind !== 'minion' && u.kind !== 'monster' && u.team === team && !u.dead).forEach(u => w.addBuff(u, { dur: BARON.buff, flat: { ad, ap }, tag: 'hob', loseOnDeath: true }));
      this.hob[team] = w.t + BARON.buff; w.emit('baron-kill', { team, ad, ap });
      w.schedule(w.t + T.baron.respawn, () => this.spawnEpic('baron', 'sru_baron', this.layout.baron));
      return;
    }
    if (name === 'drake') {
      if (m.name === 'sru_dragon_elder') {
        this.teamGold(team, ELDER.globalGold, ELDER.globalXp, 'elder');
        const mins = w.t / 60, k = Math.max(0, Math.min(1, (mins - 25) / 20));              /* ESTIMADO: queimadura 75-225 por minuto de jogo */
        w.units.filter(u => u.kind !== 'minion' && u.kind !== 'monster' && u.team === team && !u.dead).forEach(u => { u.helpers.aspectUntil = w.t + ELDER.buff; u.helpers.aspectBurn = 75 + 150 * k; });
        this.aspect[team] = w.t + ELDER.buff; w.emit('elder-kill', { team }); this.elderNext = true; w.schedule(w.t + T.elder.respawn, () => this.spawnDrake()); return;
      }
      this.drakeN++; const st = this.stacks[team]; st.push(m.name);
      if (this.drakeN === 3 && this.rift && !this.riftOn) this.transformMap();
      w.emit('drake-kill', { team, mkey: m.name, stacks: st.length });
      if (st.length === 4 && !this.soul[team]) { this.soul[team] = this.rift || m.name; this.elderNext = true; w.emit('soul', { team, mkey: this.soul[team] }); w.schedule(w.t + T.elder.respawn, () => this.spawnDrake()); }
      else w.schedule(w.t + T.drake.respawn, () => this.spawnDrake());
      w.units.filter(u => u.kind !== 'minion' && u.kind !== 'monster' && u.team === team).forEach(u => w.refresh(u));
    }
  }

  /* o 3º dragão abatido transforma o mapa no elemento dele */
  transformMap() {
    const w = this.w, L = this.layout; this.riftOn = true; w.emit('rift', { mkey: this.rift });
    if (this.rift === 'sru_dragon_water') this.fruits = [...L.crab, { x: (L.crab[0].x + L.drake.x) / 2, y: (L.crab[0].y + L.drake.y) / 2 }, { x: (L.crab[1].x + L.grubs.x) / 2, y: (L.crab[1].y + L.grubs.y) / 2 }].map(p => ({ x: p.x, y: p.y, ready: 0 }));
  }
  mapFx(u) {
    if (!this.riftOn || this.rift !== 'sru_dragon_air') return 0;
    const L = this.layout, pts = [...L.crab, L.drake, L.baron];
    return pts.some(p => dist(u.pos, p) <= RIFT_FX.cloudR) ? RIFT_FX.cloudMs : 0;
  }
  /* ---------- Golpear ---------- */
  smiteInit(u) { u.smite = { charges: 1, cdUntil: 0, nextCharge: SMITE.firstExtra }; }
  smiteUpdate(u) {
    const s = u.smite; if (!s) return;
    while (s.charges < SMITE.max && this.w.t >= s.nextCharge) { s.charges++; s.nextCharge += SMITE.every; }
    if (s.charges >= SMITE.max && this.w.t >= s.nextCharge) s.nextCharge = this.w.t + SMITE.every;
  }
  smite(u, target) {
    const w = this.w, s = u.smite;
    if (!s || u.dead || !w.canAct(u) || u.level < SMITE.level || s.charges < 1 || w.t < s.cdUntil || target.dead || !target.spec || !target.spec.smitable) return false;
    if (dist(u.pos, target.pos) > SMITE.range + target.radius) return false;
    const was = s.charges; s.charges--; s.cdUntil = w.t + SMITE.cd; if (was === SMITE.max) s.nextCharge = w.t + SMITE.every;
    w.emit('smite', { id: u.id, dst: target.id, charges: s.charges });
    w.dealDamage(u, target, SMITE.dmg, 'true', { ability: 'smite', smite: true });
    return true;
  }
  update() {
    const w = this.w, fr = this.riftOn && this.rift === 'sru_dragon_air';
    w.units.forEach(u => {
      if (u.smite) this.smiteUpdate(u);
      if (u.kind !== 'minion' && u.kind !== 'monster' && u.helpers) u.helpers.zoneMs = fr ? this.mapFx(u) : 0;
    });
    if (this.fruits) this.fruits.forEach(f => { if (w.t < f.ready) return; const u = w.units.find(x => x.kind !== 'minion' && x.kind !== 'monster' && !x.dead && x.hp < x.hpMax && dist(x.pos, f) <= RIFT_FX.fruitR); if (u) { f.ready = w.t + RIFT_FX.fruitCd; w.heal(u, RIFT_FX.fruitHeal[0] + RIFT_FX.fruitHeal[1] * (u.hpMax - u.hp), u); w.emit('fruit', { id: u.id }); } });
  }
}
function enable(w, opts) { w.jungle = new Jungle(w, opts); return w.jungle; }
module.exports = { enable, Jungle, RIFT_FX, T, SMITE, BARON, ELDER, DRAKES, COMPOSITION, LAYOUT, CAMP_REWARD, CAMP_TREE, JUNGLE_RULE, hunterDone };
