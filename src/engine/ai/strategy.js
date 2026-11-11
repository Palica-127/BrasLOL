'use strict';
/* Inteligencia estrategica coletiva (late game). Fica ACIMA do Brain (ai/brain.js), que continua dono dos objetivos de equipe (lane/obj/siege/defend),
   do combate local e da rota. Quatro niveis:
     1. Team Strategic AI  -> update(): le o estado do mapa e escolhe UM estado estrategico (STATES) por regras de prioridade.
     2. Role Assignment    -> assign(): reparte papeis (split, wave, vision, peel, init, carry, front, objective) entre os cinco, sem agrupar para sempre.
     3. Individual Player  -> act(p): cada um cumpre o papel (pressao lateral, ondas, visao, preparacao de objetivo, pickoff, recuo).
     4. Tactical Adaptation-> o estado e reavaliado a cada segundo: concede objetivo, cancela cerco, junta o split, recua apos perder gente.
   Reaproveita: Brain.goal/plan/fight/laneAct, Jungle.epics/nextAt, structures, supply_ai (sentinelas), econ. ESTIMADO: todos os limiares (cfg).
   Simplificacoes declaradas: o motor nao tem neblina de guerra nem Teleporte; "visao" vira viagem de sentinela e "TP" e aproximado pela distancia ate a rota. */
const { LaneAssign } = require('./lanes');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const X = (typeof __P !== 'undefined' && __P) || {};
const STATES = ['OBJECTIVE_SETUP', 'OBJECTIVE_CONTEST', 'OBJECTIVE_TAKE', 'SPLIT_PUSH', 'SIEGE', 'DEFENSIVE_HOLD', 'BASE_DEFENSE', 'PICK_SETUP', 'TEAMFIGHT', 'RESET', 'MAP_CONTROL', 'DISENGAGE', 'BASE_RACE', 'RECOVERY'];
/* linha do tempo da preparacao (s antes do nascimento) e demais limiares: configuraveis */
const CFG = { allowSplit: false, start: 840, wave: 90, move: 60, vision: 45, pos: 30, stage: [2800, 2200, 1700, 1400], concedeAlive: 3, lostFightDeaths: 2, retreatS: 10, splitMin: 1000, pickIso: 2500, tfR: 1300 };

class Strategy {
  constructor(brain, cfg) {
    this.b = brain; this.w = brain.w; this.cfg = { ...CFG, ...(cfg || {}) };
    this.state = 'MAP_CONTROL'; this.since = 0; this.formation = 'spread'; this.roles = new Map(); this.obj = null; this.concede = null; this.pick = null;
    this.split = null; this.split2 = null; this.splitLane = null; this.splitAt = -99; this.init = null; this.group = 'mid'; this.groupAt = -99;
    this.lanes = new LaneAssign(this); this.deaths = []; this.lastAlive = 5; this.retreatUntil = 0; this.stats = { states: {}, concedes: 0, picks: 0, setups: 0 };
  }
  active() { return this.w.t >= this.cfg.start && !!this.w.structures; }
  roleOf(p) { return this.roles.get(p) || 'flex'; }
  isSplit(p) { return !!this.split && (this.split === p || this.split2 === p); }

  /* ---------- nivel 1: leitura do mapa e estado ---------- */
  objInfo(me, op) {
    const w = this.w, t = w.t, J = w.jungle; if (!J) return null; const E = J.epics, L = [];
    const add = (k, mons, pos, at, val) => { const alive = mons && mons.some(m => !m.dead); if (!alive && !(at > 0)) return; L.push({ k, alive: !!alive, pos: alive ? mons.find(m => !m.dead).pos : pos, spawnIn: alive ? 0 : at - t, val, mons: alive ? mons.filter(m => !m.dead) : [] }); };
    const dk = E.drake && E.drake.find(m => !m.dead);
    add('b', E.baron, J.layout.baron, J.nextAt.baron, 1.0);
    add(dk ? (dk.name === 'sru_dragon_elder' ? 'e' : 'd') : J.elderNext ? 'e' : 'd', E.drake, J.layout.drake, J.nextAt.drake, dk && dk.name === 'sru_dragon_elder' ? 1.05 : 0.7);
    const c = L.filter(o => o.spawnIn <= this.cfg.wave).sort((a, b) => (a.spawnIn - a.val * 25) - (b.spawnIn - b.val * 25))[0];
    if (!c) return null;
    c.meNear = me.filter(u => dist(u.pos, c.pos) < 2400); c.opNear = op.filter(u => dist(u.pos, c.pos) < 2400);
    const eta = (arr) => (arr.length ? arr.reduce((s, u) => s + dist(u.pos, c.pos), 0) / arr.length : 1e5);
    c.etaMe = eta(me), c.etaOp = eta(op); return c;
  }
  update() { try { this._update(); } finally { this.lanes.update(); } }
  _update() {
    const b = this.b, w = this.w, t = w.t, team = b.team;
    if (!this.active()) { this.state = 'MAP_CONTROL'; this.formation = 'spread'; this.split = this.split2 = null; this.obj = null; this.roles.clear(); return; }
    const me = b.alive(), op = b.alive(1 - team); if (!me.length) { this.set('RECOVERY'); return; }
    if (me.length < this.lastAlive) this.deaths.push(t); this.lastAlive = me.length; this.deaths = this.deaths.filter(x => t - x < 12);
    if (this.deaths.length >= this.cfg.lostFightDeaths && op.some(e => me.some(u => dist(u.pos, e.pos) < 2500))) this.retreatUntil = t + this.cfg.retreatS;
    const gd = b.gold(team) - b.gold(1 - team), S = w.structures, lost = S.byTeam[team].filter(s => s.dead && s.sub === 'turret').length, took = S.byTeam[1 - team].filter(s => s.dead && s.sub === 'turret').length;
    const power = require('./brain').power, pwr = us => us.reduce((s, u) => s + power(u), 0), pr = pwr(me) / Math.max(1, pwr(op));
    const obj = this.obj = this.objInfo(me, op), threat = b.homeThreat();
    const meNearTf = me.filter(u => op.some(e => dist(u.pos, e.pos) < this.cfg.tfR)), opNearTf = op.filter(e => me.some(u => dist(u.pos, e.pos) < this.cfg.tfR));
    const needReset = me.filter(u => u.hp < u.hpMax * 0.42 || (u.gold >= 2200 && u.items.length < 6 && !u.recall)).length;
    const f = 1 - team, opBase = S.fountain[f], opHome = op.filter(e => dist(e.pos, opBase) < 4500).length, deadOp = this.w.units.filter(u => u.team === f && u.dead && u.kind !== 'minion' && u.kind !== 'monster' && u.kind !== 'structure' && (u.respawnAt || 0) - t > 22).length;
    const eg = b.enemy && b.enemy.goal, enemyOnObj = obj && eg && (eg.kind === 'obj' || eg.kind === 'setup') && eg.k === obj.k;
    this.pick = this.findPick(me, op);
    let st = 'MAP_CONTROL';
    if (threat > 0 && (me.length <= op.length + 1 || threat >= 2)) st = 'BASE_DEFENSE';
    else if (meNearTf.length >= 3 && opNearTf.length >= 3) st = 'TEAMFIGHT';
    else if (!X.nodis && (t < this.retreatUntil || (op.length - me.length >= 2 && opNearTf.length >= 2))) st = 'DISENGAGE';
    else if (S.anyInhibitorDown(f) && opHome === 0 && me.length >= 2 && (deadOp >= 2 || op.length <= 2)) st = 'BASE_RACE';
    else if (needReset >= 2 && !meNearTf.length && !(obj && obj.spawnIn < 25)) st = 'RESET';
    else if (obj && obj.spawnIn <= this.cfg.wave) {
      if (obj.alive) {
        const dom = obj.opNear.length >= this.cfg.concedeAlive && (obj.opNear.length >= obj.meNear.length + 1 || obj.etaMe > obj.etaOp + 3000);
        if (dom && (!this.concede || this.concede.k !== obj.k)) { this.concede = { k: obj.k, until: t + 60 }; this.stats.concedes++; }
        if (this.concede && this.concede.k === obj.k && this.concede.until > t) st = this.pickTrade(me, op) || 'SIEGE';
        else st = enemyOnObj || obj.opNear.length ? 'OBJECTIVE_CONTEST' : 'OBJECTIVE_TAKE';
      } else st = 'OBJECTIVE_SETUP';
    } else if (this.pick) st = 'PICK_SETUP';
    else if (b.goal && b.goal.kind === 'defend') st = 'DEFENSIVE_HOLD';
    else if (gd < -3500 || lost - took >= 3) st = 'RECOVERY';
    else if (b.goal && b.goal.kind === 'siege') st = 'SIEGE';
    else st = 'MAP_CONTROL';
    if (this.concede && this.concede.until <= t) this.concede = null;
    this.set(st); this.assign(me, op, pr, gd);
    if (st === 'MAP_CONTROL' && this.split && b.styleNow().split + 0.1 > 0 && me.length >= 4) this.state = 'SPLIT_PUSH';
    this.stats.states[this.state] = (this.stats.states[this.state] || 0) + 1;
  }
  set(st) { if (st !== this.state) { this.state = st; this.since = this.w.t; } }
  pickTrade() { return this.split ? 'SPLIT_PUSH' : null; }
  /* adversario isolado, longe dos aliados dele e de torre, perto de pelo menos tres dos nossos */
  findPick(me, op) {
    const b = this.b; if (me.length < 3) return null;
    for (const e of op) {
      if (op.some(o => o !== e && dist(o.pos, e.pos) < this.cfg.pickIso)) continue;
      if (this.w.structures.byTeam[1 - b.team].some(s => !s.dead && s.sub === 'turret' && dist(s.pos, e.pos) < 1100)) continue;
      const close = me.filter(u => dist(u.pos, e.pos) < 4500 && u.hp > u.hpMax * 0.55); if (close.length >= 3) { if (!this.pick || this.pick.id !== e.id) this.stats.picks++; return e; }
    }
    return null;
  }

  /* ---------- nivel 2: papeis ---------- */
  assign(me, op, pr, gd) {
    const b = this.b, w = this.w, t = w.t, P = b.players.filter(p => !p.u.dead), roles = new Map();
    const tank = u => u.hpMax * (1 + (u.stats.armor.total + u.stats.mr.total) / 200), tags = p => (p.u.ch && p.u.ch.funcoes) || [];
    /* iniciador: campeao mais resistente que nao e carregador nem suporte */
    const front = P.filter(p => p.role !== 'adc' && p.role !== 'support' && p.role !== 'jungle' || (p.role === 'jungle' && tags(p).some(x => x === 'Tank' || x === 'Fighter')));
    const ini = (front.length ? front : P).slice().sort((a, c) => tank(c.u) - tank(a.u))[0]; this.init = ini || null;
    /* pressao lateral: so com time sem pressa e pelo menos 4 vivos */
    const calm = ['MAP_CONTROL', 'OBJECTIVE_SETUP', 'OBJECTIVE_TAKE', 'SIEGE', 'SPLIT_PUSH', 'DEFENSIVE_HOLD'].includes(this.state) || (this.state === 'SIEGE'), ok = P.length >= 4 && me.length >= op.length && pr >= 1.05 && calm && t >= this.cfg.splitMin && this.state !== 'RECOVERY';
    if (!ok || X.nosplit || !this.cfg.allowSplit) { this.split = this.split2 = null; }
    else if (!this.split || this.split.u.dead || t - this.splitAt > 80 || this.split.u.hp < this.split.u.hpMax * 0.4) {
      const sc = p => (p.role === 'top' ? 1 : p.role === 'mid' ? 0.35 : p.role === 'adc' ? 0.1 : -9) + (tags(p).some(x => x === 'Fighter' || x === 'Assassin') ? 0.6 : 0) - (tags(p).some(x => x === 'Support') ? 0.8 : 0) + (p.u.hp / p.u.hpMax - 0.5) - (p === ini && this.state === 'OBJECTIVE_TAKE' ? 0.6 : 0);
      const c = P.filter(p => p.role !== 'jungle' && p.role !== 'support' && p.u.hp > p.u.hpMax * 0.55).sort((a, d) => sc(d) - sc(a))[0];
      if (c && sc(c) > 0.7 && (b.styleNow().split > 0 || t > 1500 || pr > 1)) {
        this.split = c; this.splitAt = t; this.splitLane = this.pickSplitLane(c, op);
      } else { this.split = null; }
    }
    /* 1-3-1: com estilo de macro, o carregador tambem pressiona a rota do outro lado */
    const adc = P.find(p => p.role === 'adc');
    this.split2 = this.split && gd > 3000 && b.styleNow().split >= 0.2 && adc && adc !== this.split && adc.u.hp > adc.u.hpMax * 0.7 && this.splitLane && this.state !== 'OBJECTIVE_TAKE' && this.state !== 'OBJECTIVE_SETUP' && me.length >= 5 ? adc : null;
    if (this.split && !this.splitLane) this.splitLane = this.pickSplitLane(this.split, op);
    this.formation = this.split2 ? '1-3-1' : this.split ? '4-1' : (['RECOVERY', 'DEFENSIVE_HOLD'].includes(this.state) ? 'spread' : '5g');
    P.forEach(p => {
      let r = 'flex';
      if (p === this.split || p === this.split2) r = 'split';
      else if (p.role === 'support') r = ['OBJECTIVE_SETUP', 'MAP_CONTROL', 'SPLIT_PUSH'].includes(this.state) ? 'vision' : 'peel';
      else if (p.role === 'adc') r = 'carry';
      else if (p.role === 'jungle') r = 'objective';
      else if (p === ini) r = 'init';
      else if (p.role === 'mid') r = 'wave';
      else r = 'front';
      if (this.state === 'PICK_SETUP' && this.pick && r !== 'split' && me.filter(u => dist(u.pos, this.pick.pos) < 4500).includes(p.u)) r = 'pick';
      roles.set(p, r);
    });
    this.roles = roles;
    this.group = this.groupLane(); this.waves();
  }
  goalLane() { const g = this.b.goal; if (!g || (g.kind !== 'siege' && g.kind !== 'defend')) return null; return g.kind === 'siege' ? g.lane : g.where === 'nx' ? 'mid' : g.where; }      /* rota do cerco/defesa em curso: o split nao vai para la */
  pickSplitLane(p, op) {
    const b = this.b, t = this.w.t; let best = null;
    ['top', 'bot', 'mid'].forEach(id => {
      if (id === this.group || id === this.goalLane()) return;      /* split na rota do proprio grupo nao e split (antes so o meio era excluido) */
      const T = b.frontTurret(id); if (!T) return;
      const foes = op.filter(e => dist(e.pos, T.pos) < 5200).length; if (foes) return;
      const sc = (p.role === 'top' && id === 'top' ? 0.6 : 0) + (p.role === 'adc' && id === 'bot' ? 0.5 : 0) - 0.5 * foes + (id === 'mid' ? -0.4 : 0) + this.w.rng.gauss('ia') * 0.03;
      if (!best || sc > best.sc) best = { id, sc };
    });
    return best ? best.id : null;
  }
  /* rota onde o grupo se reune: a mais empurrada (torres inimigas caidas), ou a do cerco/defesa em curso */
  groupLane() {
    const b = this.b, w = this.w, t = w.t, g = b.goal;
    if (g && (g.kind === 'siege' || g.kind === 'defend')) { const ln = g.kind === 'siege' ? g.lane : g.where === 'nx' ? 'mid' : g.where; if (ln) { this.groupAt = t; this.groupCur = ln; return ln; } }
    if (this.groupCur && t - this.groupAt < 40 && !(this.split && this.groupCur === this.splitLane)) return this.groupCur;      /* a retencao de 40 s nao vale se o grupo ficaria na rota do split */
    const S = w.structures, foe = 1 - b.team, TI = ['outer', 'inner', 'inhibTurret', 'inhibitor']; let best = 'mid', bs = -1;
    ['mid', 'top', 'bot'].forEach(id => { const L = S.lane(foe, id), own = S.lane(b.team, id), dead = TI.reduce((n, k) => n + (L[k].dead ? 1 : 0), 0), lost = TI.reduce((n, k) => n + (own[k].dead ? 1 : 0), 0); const sc = dead + lost * 0.6 + (id === 'mid' ? 0.35 : 0) - (id === this.splitLane && this.split ? 2 : 0); if (sc > bs) { bs = sc; best = id; } });
    this.groupCur = best; this.groupAt = t; return best;
  }
  laneFor(p) {
    const L = this.lanes.laneOf(p); if (L !== undefined) return L || p.homeLane;
    if (!this.active() || p.role === 'jungle') return p.homeLane;
    if (this.formation === 'spread') return p.homeLane;
    if (p === this.split || p === this.split2) return p === this.split2 ? (this.splitLane === 'bot' ? 'top' : 'bot') : (this.splitLane || p.homeLane);
    if (this.formation === '1-3-1' && p === this.split2) return 'bot';
    return this.group;
  }
  /* ---------- gerenciamento de ondas: fast / slow / hold por jogador ---------- */
  waves() {
    const o = this.obj, c = this.cfg; this.b.players.forEach(p => {
      let wv = 'last';
      if (o && !o.alive && o.spawnIn <= c.wave && o.spawnIn > c.move && !this.isSplit(p)) wv = 'fast';                 /* ~90 s: organiza/empurra a onda antes de sair da rota */
      else if (this.isSplit(p)) wv = this.state === 'SIEGE' ? 'fast' : 'slow';                                          /* pressao lateral: onda grande e lenta */
      else if (['SIEGE', 'BASE_RACE', 'SPLIT_PUSH'].includes(this.state) && p.lane === this.group) wv = 'fast';
      else if (['RECOVERY', 'DEFENSIVE_HOLD', 'BASE_DEFENSE'].includes(this.state)) wv = 'hold';
      p.wv = wv;
    });
  }
  /* ---------- fatores usados pelo Brain na pontuacao de metas ---------- */
  objFactor(ob) {
    const s = this.state; if (!this.active()) return 1;
    if (this.concede && this.concede.k === ob.k) return 0.12;
    if (['BASE_DEFENSE', 'DISENGAGE', 'RESET', 'RECOVERY', 'TEAMFIGHT'].includes(s)) return 0.3;
    if (s === 'OBJECTIVE_TAKE' || s === 'OBJECTIVE_CONTEST') return 1.25;
    return 1;
  }
  /* cerco/backdoor so com janela real: inimigos mortos ou longe, ou o time quase todo junto */
  siegeFactor(T, memN) {
    if (!this.active() || !this.b.isBase(T)) return 1;
    const op = this.b.alive(1 - this.b.team), f = 1 - this.b.team, base = this.w.structures.fountain[f], away = op.filter(e => dist(e.pos, base) > 5500).length;
    const window = op.length <= 2 || away >= op.length || memN >= 4;
    return window ? 1 : 0.3;
  }
  tradeBonus(lane) { return this.concede && lane && lane !== this.group ? 0.3 : (this.concede ? 0.15 : 0); }

  /* ---------- nivel 3: execucao ---------- */
  stage(o, k) {
    const F = this.b.fountain(), d = Math.max(1, dist(o.pos, F)), r = this.cfg.stage[k];
    return { x: o.pos.x + (F.x - o.pos.x) * r / d, y: o.pos.y + (F.y - o.pos.y) * r / d };
  }
  /* devolve true se assumiu o comando do jogador neste tick (luta local e recall continuam antes no Brain.act) */
  act(p, foes) {
    if (!this.active() || X.noact) return false;
    const b = this.b, w = this.w, u = p.u, r = this.roleOf(p), st = this.state, o = this.obj;
    if (st === 'DISENGAGE' && p.role !== 'jungle') { p.mode = 'retreat'; b.go(u, this.safeSpot(u), 150); return true; }
    if (r === 'split') return this.splitAct(p, foes);
    if (st === 'PICK_SETUP' && this.pick && r === 'pick') { p.mode = 'pick'; b.go(u, this.pick.pos, 250); return true; }
    if (st === 'OBJECTIVE_SETUP' && o && !o.alive) return this.setupAct(p, o);
    return false;
  }
  /* ponto seguro para recuar: a torre aliada mais proxima (o inimigo que persegue toma tiro), ou a fonte */
  safeSpot(u) {
    const b = this.b, F = b.fountain(), Ts = this.w.structures.byTeam[b.team].filter(s => !s.dead && s.sub === 'turret'); let best = null;
    Ts.forEach(s => { const d = dist(s.pos, u.pos); if (dist(s.pos, F) < dist(u.pos, F) + 500 && (!best || d < best.d)) best = { s, d }; });
    if (!best) return F; const T = best.s.pos, k = 350 / Math.max(1, dist(T, F));
    return { x: T.x + (F.x - T.x) * k, y: T.y + (F.y - T.y) * k };
  }
  setupAct(p, o) {
    const b = this.b, w = this.w, u = p.u, c = this.cfg, r = this.roleOf(p), sp = o.spawnIn;
    if (sp > c.move) return false;                                                    /* ate ~60 s: so ondas (fast push) */
    if (u.hp < u.hpMax * 0.5) return false;
    p.mode = 'setup';
    const k = sp > c.vision ? 0 : sp > c.pos ? 1 : sp > 12 ? 2 : 3, stage = this.stage(o, k);
    if (sp <= c.vision && (r === 'vision' || r === 'objective') && w.supplies) {
      const SUPAI = require('./supply_ai'), pit = SUPAI.spots(b.team, 'pit').concat(SUPAI.spots(b.team, 'river')).sort((a, d) => dist(a, o.pos) - dist(d, o.pos))[0];
      if (pit && dist(u.pos, pit) > 320 && !(p.wardGo && p.wardGo.until > w.t)) p.wardGo = { s: pit, until: w.t + 12 };
    }
    /* lanes escalonam: quem esta longe da rota-grupo nao chega a tempo, entao mantem a onda ate ~45 s */
    if (r !== 'objective' && sp > c.vision && dist(u.pos, stage) > 6500) return false;
    b.go(u, stage, 260); return true;
  }
  splitAct(p, foes) {
    const b = this.b, w = this.w, u = p.u, lane = this.laneFor(p), P = b.paths[lane]; if (!P) return false;
    const T = b.frontTurret(lane); if (!T) { return false; }
    const near = foes.filter(x => dist(x.pos, u.pos) < 3200 || dist(x.pos, T.pos) < 2200);
    /* qualquer inimigo se aproximando => cancela a pressao e volta ao grupo (sem Teleporte nao ha fuga tardia) */
    if (near.length >= 1) { p.mode = 'retreat'; b.go(u, b.home(p), 120); this.splitAt = -99; this.split = null; this.split2 = null; return true; }
    const mine = w.units.filter(m => m.kind === 'minion' && !m.dead && m.team === u.team && dist(m.pos, T.pos) < 900).length;
    if (mine >= 3 && T.sub === 'turret' && !T.invuln) { p.mode = 'siege'; u.ai.focus = T; if (!(u.order && u.order.type === 'attack' && u.order.target === T)) w.orderAttack(u, T); return true; }
    return false;                                                                    /* senao: laneAct na rota dele (onda lenta/rapida via p.wv) */
  }
}
module.exports = { Strategy, STATES, CFG };
