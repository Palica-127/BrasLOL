'use strict';
/* IA de macro (Bloco 8): decide o que cada jogador faz e executa sobre o estado REAL do mundo (campeões, minions, torres, objetivos).
   Estrutura portada do motor legado (lvAssess / lvRisk / lvPlan / lvGankScore / estilos LVSTY), agora com: caminhos de rota, último golpe real,
   torres que atiram, recall e compras, objetivos com HP real. Cada jogador tem 5 atributos (Lane, Mecânica, Macro, Equipe, Mental) que
   viram parâmetros em `attributes.js`. Micro de luta (mira, esquiva, habilidades) continua em `sim/ai.js`.
   ESTIMADO (calibrar no Bloco 10): pesos de pontuação, raios de decisão, limiares de recall/retirada, função de poder, nomes de rota por papel.
   Simplificação declarada: IA onisciente (sem névoa de guerra; visão/sentinelas ficam pendentes) e sem feitiços de invocador. */
const LAY = require('../map/layout'), AI = require('../sim/ai'), SHOP = require('../items/shop'), B = require('../items/builds'), A = require('./attributes');
const { TURRET } = require('../map/structures'), SUPAI = require('./supply_ai'), SUP = require('../items/supplies');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* estilos de equipe (valores do motor legado LVSTY) */
const STYLES = {
  ag: { n: 'Agressivo', agg: 0.30, gank: 0.35, roam: 0.30, obj: -0.05, inv: 0.20, split: 0, def: 0, fight: -0.12 },
  ma: { n: 'Macro', agg: -0.05, gank: 0, roam: 0.05, obj: 0.30, inv: 0.05, split: 0.25, def: 0.10, fight: 0.05 },
  es: { n: 'Escalonamento', agg: -0.22, gank: -0.15, roam: -0.10, obj: 0.05, inv: -0.10, split: 0, def: 0.15, fight: 0.10 },
  ca: { n: 'Caótico', agg: 0.38, gank: 0.25, roam: 0.35, obj: -0.10, inv: 0.40, split: 0.05, def: -0.10, fight: -0.20 },
  re: { n: 'Reativo', agg: -0.25, gank: -0.05, roam: -0.05, obj: 0, inv: -0.15, split: 0, def: 0.35, fight: 0.02 }
};
const LANE_OF = { top: 'top', mid: 'mid', adc: 'bot', support: 'bot', jungle: null };
const OBJ_VALUE = { g: 0.62, h: 0.66, d: 0.70, b: 1.0, e: 1.05 };               /* LVOBV */
const OBJ_NEED = { g: 3, h: 3, d: 3, b: 4, e: 4 };
const TIERS = ['outer', 'inner', 'inhibTurret', 'inhibitor'];

/* polilinha com comprimento acumulado: projeta pontos e devolve pontos por distância percorrida */
class Path {
  constructor(pts) { this.pts = pts; this.cum = [0]; for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + dist(pts[i - 1], pts[i])); this.len = this.cum[this.cum.length - 1]; }
  project(p) {
    let best = { s: 0, d: 1e9 };
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
      const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1), q = { x: a.x + dx * t, y: a.y + dy * t }, d = dist(p, q);
      if (d < best.d) best = { s: this.cum[i - 1] + t * Math.sqrt(l2), d };
    }
    return best;
  }
  at(s) {
    s = clamp(s, 0, this.len);
    for (let i = 1; i < this.pts.length; i++) if (s <= this.cum[i]) { const a = this.pts[i - 1], b = this.pts[i], t = (s - this.cum[i - 1]) / Math.max(1e-9, this.cum[i] - this.cum[i - 1]); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
    return { ...this.pts[this.pts.length - 1] };
  }
}

/* poder de um campeão: vida efetiva x dano por segundo (proxy ESTIMADO) */
function power(u) {
  const S = u.stats, ehp = Math.max(1, u.hp) * (1 + (S.armor.total + S.mr.total) / 200);
  const dps = S.ad.total * Math.min(2.5, S.as.total) * (1 + S.crit * (S.critDamage - 1)) + S.ap.total * 0.45 + 40 + 14 * u.level;
  return Math.sqrt(ehp * dps);
}
const isChamp = u => u.kind !== 'minion' && u.kind !== 'monster' && u.kind !== 'structure';

class Brain {
  constructor(w, team, { style = 'ma', roster, name } = {}) {
    this.w = w; this.team = team; this.style = style; this.name = name || 'T' + team; this.players = []; this.goal = null; this.nextPlan = 0; this.enemy = null;
    this.paths = {}; LAY.lanes().forEach(l => { this.paths[l.id] = new Path(team === 0 ? l.path : l.path.slice().reverse()); });
    this.stats = { objStarts: 0, sieges: 0, defends: 0, ganks: 0, recalls: 0, fights: 0, retreats: 0, goals: {} }; this.adapt = null;
    roster.forEach((r, i) => this.add(r, i));
    w.brains.push(this);
  }
  add(r, i) {
    const w = this.w, f = w.structures ? w.structures.fountain[this.team] : { x: 400, y: 400 };
    const u = w.addChampion({ name: r.name, team: this.team, level: r.level || 1, pos: { x: f.x + (i % 3) * 60, y: f.y + Math.floor(i / 3) * 60 }, gold: r.gold !== undefined ? r.gold : 500, smite: r.role === 'jungle' });
    const par = A.fromAttributes({ ...A.DEFAULT, ...(r.attrs || {}) });
    u.ai = { ...u.ai, enabled: false, brain: true, farm: false, aim: par.aim, dodge: par.dodge, react: par.react, lastHit: par.lastHit, next: 0 };
    if (r.role === 'jungle') u.ai.jungle = { route: r.route || ['blue', 'gromp', 'wolves', 'raptors', 'red', 'krugs'] };
    const p = { u, role: r.role, lane: LANE_OF[r.role], par, attrs: { ...A.DEFAULT, ...(r.attrs || {}) }, next: 0, mode: 'start', build: null, gankUntil: 0, gankCd: 0, back: false };
    if (w.supplies) SUP.init(w, u, r.role);
    this.players.push(p); return p;
  }
  /* builds dependem do time inimigo */
  setEnemy(brain) {
    this.enemy = brain;
    const prof = brain.players.map(q => B.profile(q.u.ch));
    this.players.forEach(p => { const lane = brain.players.findIndex(q => q.role === p.role); p.build = B.makeBuild(p.u.ch, prof, { lane: lane >= 0 ? prof[lane] : null }); });      /* Bloco 4b: rival direto de rota pesa em dobro */
  }
  styleNow() { return STYLES[this.adapt && this.adapt.until > this.w.t ? this.adapt.key : this.style]; }

  /* ---------- leitura do estado ---------- */
  alive(team = this.team) { return this.w.units.filter(u => !u.dead && u.team === team && isChamp(u)); }
  gold(team) { return this.w.units.filter(u => u.team === team && isChamp(u)).reduce((s, u) => s + (u.stat.goldEarned || 0), 0); }
  risk() {
    const st = this.styleNow(), a = this.alive(), o = this.alive(1 - this.team), gd = this.gold(this.team) - this.gold(1 - this.team);
    let r = st.agg; const gdn = clamp(gd / 5000, -1, 1); r -= 0.22 * gdn; if (gdn < -0.6) r += 0.1; r += 0.07 * clamp(a.length - o.length, -3, 3);
    if (this.w.t / 60 > 28) r += 0.06; return r;
  }
  theta() { return clamp(0.9 - 0.5 * this.risk() + this.styleNow().fight * 0.5, 0.55, 1.4); }                  /* limiar de poder para lutar (lvTheta) */
  eligible(p, k, extra = {}) {
    const u = p.u; if (u.dead || u.hp < u.hpMax * 0.4 || u.recall || p.mode === 'recall' || p.back) return false;
    if (p.role === 'top' && !(extra.topOk || this.w.t / 60 >= 24)) return false;
    return true;
  }

  /* ---------- planejamento de equipe (1 s) ---------- */
  plan() {
    const w = this.w, t = w.t, st = this.styleNow(), me = this.alive(), op = this.alive(1 - this.team); if (!me.length) { this.goal = null; return; }
    const noise = () => 1 + this.avgNoise() * w.rng.gauss('ia');
    const pr = clamp(me.reduce((s, u) => s + power(u), 0) / Math.max(1, op.reduce((s, u) => s + power(u), 0)), 0.2, 3);
    const C = [], risk = this.risk(), rk = 1 + 0.5 * clamp(risk, -0.6, 0.8), mn = t / 60;
    C.push({ kind: 'lane', sc: (mn < 6 ? 0.6 : mn < 9 ? 0.5 : clamp(0.45 - 0.012 * (mn - 9), 0.2, 0.45)) * 0.8 });
    /* objetivos */
    const J = w.jungle, objs = [];
    if (J) {
      const E = J.epics;
      if (E.grubs && E.grubs.some(m => !m.dead)) objs.push({ k: 'g', mons: E.grubs.filter(m => !m.dead), pit: 'b' });
      if (E.herald && E.herald.some(m => !m.dead)) objs.push({ k: 'h', mons: E.herald.filter(m => !m.dead), pit: 'b' });
      if (E.drake && E.drake.some(m => !m.dead)) { const m = E.drake.find(x => !x.dead); objs.push({ k: m.name === 'sru_dragon_elder' ? 'e' : 'd', mons: [m], pit: 'd' }); }
      if (E.baron && E.baron.some(m => !m.dead)) objs.push({ k: 'b', mons: E.baron.filter(m => !m.dead), pit: 'b' });
    }
    this.objCd = this.objCd || {};
    objs.forEach(ob => {
      if ((this.objCd[ob.k] || 0) > t) return;                      /* Bloco 10: tentativa recente falhou: volta a farmar antes de tentar de novo */
      const pos = ob.mons[0].pos, mem = me.map(u => this.players.find(p => p.u === u)).filter(p => p && this.eligible(p, 'obj', { topOk: ob.pit === 'b' })), need = OBJ_NEED[ob.k];
      if (mem.length < Math.min(need, 3) || mem.reduce((a, p) => a + p.u.hp / p.u.hpMax, 0) / mem.length < 0.6) return;      /* Bloco 10b: so tenta objetivo com o time quase completo e com vida */
      const nF = mem.length >= need ? 1 : 0.25 + (mem.length / need) * 0.35, hpF = 0.6 + 0.4 * (mem.reduce((s, p) => s + p.u.hp / p.u.hpMax, 0) / mem.length);
      const near = op.filter(u => dist(u.pos, pos) < 1500), prw = mem.reduce((s, p) => s + power(p.u), 0) / Math.max(1, near.reduce((s, u) => s + power(u), 0) * 0.8 + op.reduce((s, u) => s + power(u), 0) * 0.2);
      const etaMe = mem.reduce((s, p) => s + dist(p.u.pos, pos), 0) / mem.length, etaOp = op.length ? op.reduce((s, u) => s + dist(u.pos, pos), 0) / op.length : 1e5;
      const reach = clamp(0.5 + (etaOp - etaMe) / 12000, 0.2, 1);
      let V = OBJ_VALUE[ob.k] * (1 + st.obj) * (this.pressing() ? 0.55 : 1); if (ob.k === 'b' && this.gold(this.team) - this.gold(1 - this.team) < -2500) V += 0.15;
      const sc = V * nF * hpF * reach * clamp(0.55 + 0.45 * (prw - 0.7), 0.2, 1.15) * (1 - 0.14 * near.length) * rk;
      C.push({ kind: 'obj', k: ob.k, mons: ob.mons, pos, pit: ob.pit, sc, need });
    });
    /* torres: a estrutura vulnerável mais externa de cada rota (e a base) */
    const S = w.structures;
    if (S) {
      const enemyT = 1 - this.team;
      ['top', 'mid', 'bot', 'nx'].forEach(id => {
        let T = null, tier = 0;
        if (id === 'nx') { T = S.nexusTurrets[enemyT].find(s => !s.dead && !s.invuln) || (!S.nexus[enemyT].invuln && !S.nexus[enemyT].dead ? S.nexus[enemyT] : null); tier = 3; }
        else { const L = S.lane(enemyT, id); for (let i = 0; i < 4; i++) if (!L[TIERS[i]].dead) { T = L[TIERS[i]]; tier = i; break; } if (T && T.invuln) T = null; }
        if (!T) return;
        const lane = id === 'nx' ? 'mid' : id, mem = me.map(u => this.players.find(p => p.u === u)).filter(p => p && this.eligible(p, 'siege', { topOk: lane === 'top' }));
        if (mem.length < 2) return;
        const mine = w.units.filter(x => x.kind === 'minion' && !x.dead && x.team === this.team && dist(x.pos, T.pos) < 1100).length, theirs = w.units.filter(x => x.kind === 'minion' && !x.dead && x.team !== this.team && dist(x.pos, T.pos) < 1100).length;
        const press = clamp(0.35 + 0.1 * (mine - theirs), 0.15, 1.1), need = tier === 0 && mn < 14 ? 2 : 3, nF = mem.length >= need ? 1 : 0.35;
        const V = [0.5, 0.62, 0.8, 0.9][tier] || 0.9, hp = T.hp / T.hpMax;
        const sc = V * nF * press * clamp(0.5 + 0.5 * (pr - 0.6), 0.25, 1.2) * (0.7 + 0.3 * hp) * (1 + 0.15 * clamp(me.length - op.length, 0, 3)) * (1 + st.agg * 0.25 + st.obj * 0.1) * rk * (this.pressing() ? (id === 'nx' ? 2 : 1.5) : 1);
        C.push({ kind: 'siege', lane, T, id, sc });
      });
      /* defesa: inimigos perto de uma estrutura nossa */
      this.defendCandidates(C, op, st);
    }
    C.forEach(c => { c.sc *= noise(); if (this.goal && this.goal.kind === c.kind && this.sameGoal(this.goal, c)) c.sc += 0.12; });
    const best = C.reduce((b, c) => (c.sc > b.sc ? c : b), C[0]);
    if (!this.goal || !this.goalValid(this.goal) || (t - this.goal.since >= 8 && best !== undefined && !this.sameGoal(this.goal, best) && best.sc > this.goal.sc + 0.05) || t - this.goal.since > 150) {
      const thr = best.kind === 'lane' ? 0 : 0.34;
      const g = best.sc >= thr ? best : C[0];
      if (this.goal && this.goal.kind === 'obj' && !this.sameGoal(this.goal, g) && this.goal.mons.some(m => !m.dead)) this.objCd[this.goal.k] = t + 90;
      if (!this.goal || !this.sameGoal(this.goal, g)) { this.goal = { ...g, since: t }; this.stats.goals[g.kind] = (this.stats.goals[g.kind] || 0) + 1; if (g.kind === 'obj') this.stats.objStarts++; if (g.kind === 'siege') this.stats.sieges++; if (g.kind === 'defend') this.stats.defends++; w.emit('goal', { team: this.team, gk: g.kind, obj: g.k, lane: g.lane }); }
    } else {
      const cur = C.find(c => c.kind === this.goal.kind && this.sameGoal(this.goal, c)); if (cur) { this.goal.sc = cur.sc; this.goal.T = cur.T || this.goal.T; this.goal.mons = cur.mons || this.goal.mons; this.goal.pos = cur.pos || this.goal.pos; }
    }
    this.setMembers();
    this.adaptStyle();
  }
  /* fim de jogo: com inibidor inimigo caído o time prioriza derrubar a base em vez de objetivos */
  pressing() { return this.w.structures.anyInhibitorDown(1 - this.team); }
  avgNoise() { return this.players.reduce((s, p) => s + p.par.noise, 0) / Math.max(1, this.players.length); }
  sameGoal(a, b) { return a.kind === b.kind && (a.kind === 'lane' || (a.kind === 'obj' ? a.k === b.k : a.kind === 'siege' ? a.id === b.id : a.where === b.where)); }
  goalValid(g) {
    if (g.kind === 'obj') { if (!g.mons.some(m => !m.dead && this.w.units.includes(m))) return false; const ms = g.mem ? [...g.mem].filter(q => !q.u.dead) : []; return !(g.go && ms.length && ms.reduce((a, q) => a + q.u.hp / q.u.hpMax, 0) / ms.length < 0.35); }
    if (g.kind === 'siege') return !g.T.dead && !g.T.invuln;
    if (g.kind === 'defend') return this.w.t - g.since < 40 && this.w.units.some(u => !u.dead && u.team !== this.team && isChamp(u) && dist(u.pos, g.pos) < 1900);
    return true;
  }
  defendCandidates(C, op, st) {
    const S = this.w.structures, mine = S.byTeam[this.team].filter(s => !s.dead && !s.invuln);
    mine.forEach(s => {
      const en = op.filter(u => dist(u.pos, s.pos) < 1300).length, em = this.w.units.filter(x => x.kind === 'minion' && !x.dead && x.team !== this.team && dist(x.pos, s.pos) < 1000).length;
      if (!en) return;                                         /* Bloco 10: so inimigo campeao perto puxa o time; onda empurrando a torre e da conta o laner (antes o time inteiro largava a rota) */
      const fr = this.alive().filter(u => dist(u.pos, s.pos) < 1300).length;
      if (fr >= en && s.sub !== 'nexus') return;                  /* Bloco 10b: aliados ja la bastam: nao chama o time todo */
      const sc = (0.3 + 0.2 * Math.min(en, 3) + 0.03 * em) * (1 + st.def) * (s.sub === 'nexus' ? 1.5 : 1) * (fr >= en + 1 ? 0.6 : 1);
      if (!C.some(c => c.kind === 'defend' && c.where === s.lane)) C.push({ kind: 'defend', where: s.lane || 'nx', pos: s.pos, sc });
    });
  }
  setMembers() {
    const g = this.goal; if (!g) return;
    g.mem = new Set(); if (g.kind === 'lane') return;
    this.players.forEach(p => {
      if (!this.eligible(p, g.kind, { topOk: g.kind === 'obj' ? g.pit === 'b' : g.kind === 'siege' ? g.lane === 'top' : true })) return;
      if (p.mode === 'gank' && this.w.t < p.gankUntil) return;
      if (g.kind === 'defend' && g.where !== 'nx' && dist(p.u.pos, g.pos) > 5500) return;      /* Bloco 10b: defesa so com quem esta perto */
      g.mem.add(p);
    });
  }
  adaptStyle() {
    const gd = this.gold(this.team) - this.gold(1 - this.team), t = this.w.t;
    if (this.adapt && this.adapt.until > t) return;
    const avgC = this.players.reduce((s, p) => s + p.par.composure, 0) / this.players.length;
    if (gd < -3500 && t > 600) this.adapt = { key: avgC > 0.55 ? 'es' : 're', until: t + 240 };         /* atrás: defende e escala */
    else if (gd > 4000) this.adapt = { key: this.style === 'es' || this.style === 're' ? 'ma' : this.style === 'ma' ? 'ag' : this.style, until: t + 240 };
  }

  /* ---------- execução por jogador ---------- */
  update() {
    const w = this.w; if (w.winner() !== null) return;
    if (w.t >= this.nextPlan) { this.plan(); this.nextPlan = w.t + 1; }
    for (const p of this.players) if (w.t >= p.next) { this.act(p); p.next = w.t + (p.mode === "lane" ? 0.08 + (1 - p.par.lastHit) * 0.35 : 0.2); }
  }
  go(u, d, tol = 60) { const w = this.w; if (dist(u.pos, d) > tol) { if (!(u.order && u.order.type === 'move' && Math.abs(u.order.x - d.x) < 40 && Math.abs(u.order.y - d.y) < 40)) w.orderMove(u, d.x, d.y); } else if (!u.attack.windup && u.order && u.order.type === 'move') u.order = null; }
  home(p) { const P = this.paths[p.lane || 'mid'], s = P.project(p.u.pos).s; return P.at(Math.max(0, s - 1800)); }
  fountain() { return this.w.structures.fountain[this.team]; }
  shopping(p) {
    const u = p.u, w = this.w; let g = 0;
    SUPAI.shop(this, p);
    while (p.build && g++ < 10) {
      let n = B.nextPurchase(u, p.build.items); if (!n) n = this.cheapestStep(u, p.build.items);
      if (!n || !SHOP.buy(w, u, n.id).ok) break;
    }
  }
  /* quando nem o maior componente cabe no ouro, compra o item mais caro da árvore da receita que cabe (componentes de componentes) */
  cheapestStep(u, build) {
    const cat = require('../items/catalog').catalog();
    for (const id of build) {
      if (u.items.includes(id)) continue;
      let best = null; const seen = new Set();
      (function walk(i) { if (seen.has(i)) return; seen.add(i); if (i !== id && u.items.includes(i)) return;       /* Bloco 4b: não desce em componente que já temos */
    if (!u.items.includes(i) || i !== id) { const q = SHOP.quote(u, i, cat); if (q.ok && i !== id && (!best || q.cost > best.cost)) best = { id: i, cost: q.cost }; } cat[i].from.forEach(walk); })(id);
      if (best) return best;
    }
    return null;
  }

  act(p) {
    const w = this.w, u = p.u;
    if (u.dead) { p.mode = 'dead'; p.back = false; return; }
    const F = this.fountain(), atBase = dist(u.pos, F) < 850;
    if (atBase) { this.shopping(p); if (u.hp < u.hpMax * 0.93 || u.mana < u.manaMax * 0.6) { p.mode = 'base'; if (dist(u.pos, F) > 300) this.go(u, F, 100); else if (u.order) u.order = null; return; } p.back = false; if (p.mode === 'base' || p.mode === 'recall' || p.mode === 'dead' || p.mode === 'start') p.mode = 'lane'; }
    if (u.recall) {
      const threat = this.w.units.some(x => !x.dead && x.team !== u.team && isChamp(x) && dist(x.pos, u.pos) < 1100);
      if (threat) { w.life.cancelRecall(w, u, 'ameaca'); } else { p.mode = 'recall'; return; }
    }
    const st = this.styleNow(), foes = w.units.filter(x => !x.dead && x.team !== u.team && isChamp(x)), allies = w.units.filter(x => !x.dead && x.team === u.team && isChamp(x));
    const near = foes.filter(x => dist(x.pos, u.pos) < 1500);
    /* Bloco 10b: a maioria das mortes era durante recall/retirada, para torre ou monstro epico (nao havia leitura desses perigos); agora conta como perigo tambem monstro epico por perto e torre inimiga sem cobertura de minions */
    const monNear = p.role !== 'jungle' && w.units.some(x => x.kind === 'monster' && !x.dead && x.spec && x.spec.epic && dist(x.pos, u.pos) < 1500 && w.t - (x.lastDamageAt || -99) < 6);
    const underT = this.underEnemyTurret(u.pos) && !this.covered(u.pos), danger = near.length > 0 || monNear || underT;
    /* retirada e recall */
    const lowHp = u.hp < u.hpMax * (underT || monNear ? 0.5 : 0.33);
    const nxt = p.build ? B.nextPurchase({ ...u, gold: 1e9 }, p.build.items) : null;
    const gate = nxt ? Math.min(1500, nxt.cost) : 1400, wantShop = u.gold >= Math.max(1000, gate * 0.95) && u.items.length < 6;
    const inGoal = this.goal && this.goal.kind !== 'lane' && this.goal.mem && this.goal.mem.has(p);
    if ((lowHp || (wantShop && (!inGoal || u.gold >= 1800) && w.t - (p.lastRecall || -999) > 60)) && !p.back) {
      if (!danger || !lowHp) { if (!danger && w.life.startRecall(w, u)) { p.mode = 'recall'; p.lastRecall = w.t; p.back = true; this.stats.recalls++; return; } }
      if (lowHp && danger) { this.retreat(p, near); return; }
    }
    if (p.back && !u.recall) { /* recall falhou/cancelado: tenta de novo fora de perigo; senão volta andando */ if (!danger && w.t - u.lastDamageAt > 2.5 && u.hp < u.hpMax * 0.9 && dist(u.pos, F) > 1500 && w.life.startRecall(w, u)) { p.mode = 'recall'; return; } if (u.hp < u.hpMax * 0.7 || wantShop) { this.go(u, F, 200); return; } p.back = false; }
    if (SUPAI.act(this, p, danger)) return;
    /* luta */
    if (this.fight(p, near, allies)) return;
    /* objetivo de equipe */
    if (inGoal && this.goalAct(p)) return;
    if (p.role === 'jungle') this.jungleAct(p, foes); else this.laneAct(p, foes, allies);
  }
  retreat(p, near) { const u = p.u; this.stats.retreats++; p.mode = 'retreat'; u.ai.focus = null; const d = this.home(p); this.go(u, near.some(x => dist(x.pos, u.pos) < 500) ? this.fountain() : d, 40); }

  /* combate local: lutar, atrair ou recuar */
  fight(p, near, allies) {
    const w = this.w, u = p.u, R = 1400, A_ = allies.filter(a => dist(a.pos, u.pos) < R), E_ = near.filter(x => dist(x.pos, u.pos) < R);
    const skirmish = A_.length >= 2 || E_.length >= 2 || (this.goal && this.goal.kind !== 'lane' && this.goal.mem && this.goal.mem.has(p)) || p.role === 'jungle';
    const reach = skirmish ? Math.max(u.stats.range, 450) + 350 : u.stats.range + 110, tgs = near.filter(x => dist(x.pos, u.pos) <= reach); if (!tgs.length) { u.ai.focus = null; return false; }
    let ratio = A_.reduce((s, a) => s + power(a), 0) / Math.max(1, E_.reduce((s, e) => s + power(e), 0));
    ratio *= 1 + this.avgNoise() * 0.5 * w.rng.gauss('ia');
    /* ajuste por torre inimiga: sob torre sem minions aliados por perto é muito arriscado */
    const weak = tgs.filter(x => x.hp < x.hpMax * 0.3);
    const under = tgs.some(x => this.underEnemyTurret(x.pos) && !this.covered(x.pos));
    const siege = this.goal && this.goal.kind === 'siege';
    let theta = this.theta() * (1 + 0.1 * (1 - p.par.composure) * (this.risk() < 0 ? 1 : 0));
    if (under && !siege) theta += weak.length ? 0.3 : 0.9;
    if (p.role === 'support' && this.laneMate(p)) theta *= 0.95;
    if (!skirmish) { const t0 = tgs[0], mine = u.hp / u.hpMax, his = t0.hp / t0.hpMax; if (!(ratio >= theta * 1.8 || (ratio >= theta * 1.1 && (his < 0.55 || mine > his + 0.1)))) { u.ai.focus = null; if (ratio < theta * 0.8 && E_.some(x => dist(x.pos, u.pos) < Math.max(x.stats.range, 450) + 100)) { this.retreat(p, near); return true; } return false; } }
    if (ratio >= theta) {
      const f = tgs.reduce((b, x) => { const k = (x.hp + (x.shields[0] ? x.shields[0].amount : 0)) * (1 + (x.stats.armor.total + x.stats.mr.total) / 200); return k < b.k ? { x, k } : b; }, { x: null, k: 1e12 }).x;
      p.mode = 'fight'; u.ai.focus = f; this.stats.fights++; AI.decide(w, u); return true;
    }
    if (ratio < theta * 0.8 && E_.some(x => dist(x.pos, u.pos) < Math.max(x.stats.range, 450) + 250)) { this.retreat(p, near); return true; }
    u.ai.focus = null; return false;
  }
  laneMate(p) { return this.players.find(q => q !== p && q.lane && q.lane === p.lane && !q.u.dead); }
  underEnemyTurret(pos) { const S = this.w.structures; return S.byTeam[1 - this.team].some(s => !s.dead && s.sub === 'turret' && dist(s.pos, pos) <= TURRET.range + s.radius + 40); }
  covered(pos) { const S = this.w.structures, T = S.byTeam[1 - this.team].find(s => !s.dead && s.sub === 'turret' && dist(s.pos, pos) <= TURRET.range + s.radius + 40); if (!T) return true; return this.w.units.filter(m => m.kind === 'minion' && !m.dead && m.team === this.team && dist(m.pos, T.pos) < 700).length >= 3; }

  /* rota: último golpe e posição na onda */
  laneAct(p, foes, allies) {
    const w = this.w, u = p.u, P = this.paths[p.lane], S = w.structures; u.ai.focus = null;
    if (p.role === 'support') { const adc = this.players.find(q => q.role === 'adc' && !q.u.dead); if (adc && dist(adc.u.pos, u.pos) < 3500 || adc) { const s = P.project(adc.u.pos).s; const stand = P.at(Math.max(0, s - 250)); p.mode = 'lane'; this.go(u, stand, 80); return; } }
    const mins = w.units.filter(x => !x.dead && x.kind === 'minion' && x.lane && x.lane.id === p.lane);
    const am = mins.filter(x => x.team === u.team), em = mins.filter(x => x.team !== u.team);
    const own = S.lane(this.team, p.lane).outer, ownS = P.project(own.pos).s;
    const eFront = em.length ? Math.min(...em.map(m => P.project(m.pos).s)) : null, fight = am.filter(m => eFront === null || P.project(m.pos).s <= eFront + 300);
    let s = fight.length ? Math.max(...fight.map(m => P.project(m.pos).s)) - 80 - u.stats.range * 0.25 : eFront !== null ? eFront - 120 - u.stats.range * 0.8 : (am.length ? Math.max(...am.map(m => P.project(m.pos).s)) - 80 : ownS + 300);
    s = Math.max(s, ownS - 100);
    const T = this.frontTurret(p.lane); if (T) s = Math.min(s, P.project(T.pos).s - (TURRET.range + T.radius + 110));
    s = Math.max(0, s); const stand = P.at(s); p.mode = 'lane';
    const R = u.stats.range + 15, ens = em.filter(x => dist(x.pos, u.pos) <= 1400).sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos));
    if (!ens.length) { this.go(u, stand, 80); return; }
    const sk = u.ai.lastHit, spec = w.attackSpec(u), flight = d => (spec.missile > 0 ? d / spec.missile : 0), mine = d => spec.windupFrac / w.asOf(u) + flight(d);
    const dmg = u.stats.ad.total * 100 / (100 + Math.max(0, ens[0].stats.armor.total));
    const inRange = ens.filter(x => dist(x.pos, u.pos) <= R + x.radius);
    const incoming = x => { const tIm = w.t + mine(dist(u.pos, x.pos)); const raw = w.units.reduce((acc, m) => (m.kind === 'minion' && !m.dead && m.team !== x.team && m.attack.windup && m.attack.windup.target === x && m.attack.windup.until <= tIm + 0.05 ? acc + m.stats.ad.total * (m.spec.missile ? 1 : 1) : acc), 0) + w.projs.reduce((acc, q) => (q.kind === 'homing' && q.target === x && !q.owner.dead && q.owner.kind === 'minion' && w.t + Math.hypot(q.x - x.pos.x, q.y - x.pos.y) / q.speed <= tIm + 0.05 ? acc + q.owner.stats.ad.total : acc), 0);; return raw * 100 / (100 + Math.max(0, x.stats.armor.total)); };
    const rate = x => (x.dmgWin || []).filter(e => w.t - e.t < 1).reduce((a, e) => a + e.a, 0);                    /* dano recebido no último segundo (taxa) */
    /* Bloco 10b (ESTIMADO, varredura de 32 partidas): `incoming` superestima o dano que chega (0,7); janela de golpe = vida prevista entre -0,5 e +0,6 do dano; o termo de taxa recente foi zerado (piorava o CS) */
    const IS = 0.7, KW = 0.6, LO = -0.5, hImp = x => (x.hp - IS * incoming(x)) * (1 + this.lhError(u, x) * (1 - sk));
    const pick = inRange.map(x => ({ x, h: hImp(x) })).filter(c => c.h > LO * dmg && c.h <= dmg * KW).sort((a, b) => a.h - b.h)[0];
    if (pick) { if (!(u.order && u.order.type === 'attack' && u.order.target === pick.x)) w.orderAttack(u, pick.x); return; }
    const reachS = s + 150 + 330;                                  /* Bloco 10b: margem de avanço para alcançar a onda inimiga (antes o laner ficava parado a ~350 do alvo) */
    if (P.project(u.pos).s > reachS) { this.go(u, stand, 60); return; }                          /* nunca à frente dos próprios minions / sob a torre */
    /* Bloco 10b: minion quase no ponto de abate fora do alcance (ex.: conjurador atras da onda): avanca ate o alcance, dentro do limite da torre */
    const soon = ens.find(x => !inRange.includes(x) && (x.hp - incoming(x)) <= dmg * 1.6);
    if (soon && !(w.units.some(f => isChamp(f) && !f.dead && f.team !== u.team && dist(f.pos, soon.pos) < 900))) { const lim2 = T ? P.project(T.pos).s - (TURRET.range + T.radius + 110) : 1e9; this.go(u, P.at(Math.min(P.project(soon.pos).s - R * 0.9, lim2, s + 380)), 30); return; }
    if (!inRange.length) {       /* Bloco 10b: aproxima em linha reta do alvo (a onda fica ~330 ao lado do eixo da rota: andar pelo eixo nao chegava) */
      const t = ens[0], lim = T ? P.project(T.pos).s - (TURRET.range + T.radius + 110) : 1e9, d0 = dist(t.pos, u.pos) || 1, want = Math.max(0, u.stats.range * 0.8 + t.radius * 0.5);
      let d = { x: t.pos.x + (u.pos.x - t.pos.x) / d0 * want, y: t.pos.y + (u.pos.y - t.pos.y) / d0 * want }; const sd = P.project(d).s, cap = Math.min(reachS - 20, lim);
      if (sd > cap) d = P.at(cap);
      this.go(u, d, 40); return;
    }    if (!u.attack.windup) u.order = null;
  }
  /* erro de estimativa fixo por (jogador, minion): sorteado uma vez, senão o mínimo de vários sorteios faz acertar cedo demais */
  lhError(u, x) { x.lhErr = x.lhErr || {}; if (x.lhErr[u.id] === undefined) x.lhErr[u.id] = this.w.rng.gauss("ia") * 1.0; return x.lhErr[u.id]; }
  frontTurret(lane) { const S = this.w.structures, L = S.lane(1 - this.team, lane); for (const k of TIERS.slice(0, 3)) if (!L[k].dead) return L[k]; return null; }

  /* selva e gank */
  jungleAct(p, foes) {
    const w = this.w, u = p.u, J = w.jungle; p.mode = 'jungle';
    /* gank */
    if (u.level >= 3 && w.t >= p.gankCd && u.hp > u.hpMax * 0.6) {
      const st = this.styleNow(); let best = null;
      ['top', 'mid', 'bot'].forEach(id => {
        const en = foes.filter(x => { const q = this.enemy.players.find(z => z.u === x); return q && q.lane === id; }); if (!en.length) return;
        const tgt = en.reduce((b, x) => (x.hp < b.hp ? x : b)), eta = dist(u.pos, tgt.pos) / Math.max(300, w.msOf(u));
        if (eta > 22) return;
        const ally = this.players.filter(q => q.lane === id && !q.u.dead);
        const sc = 0.12 + st.gank + 0.5 * (1 - tgt.hp / tgt.hpMax) + 0.1 * ally.length + 0.015 * u.level - 0.012 * eta + 0.1 * w.rng.gauss('ia') * p.par.noise * 3 - (this.underEnemyTurret(tgt.pos) ? 0.3 : 0);
        if (!best || sc > best.sc) best = { sc, tgt, id };
      });
      if (best && best.sc > 0.55) { p.gankUntil = w.t + 14; p.gankCd = w.t + 70; p.gankT = best.tgt; this.stats.ganks++; w.emit('gank', { id: u.id, lane: best.id }); }
    }
    if (w.t < p.gankUntil && p.gankT && !p.gankT.dead) { p.mode = 'gank'; u.ai.focus = p.gankT; if (dist(u.pos, p.gankT.pos) > Math.max(u.stats.range, 500) + 200) { this.go(u, p.gankT.pos, 100); return; } AI.decide(w, u); return; }
    u.ai.jungle.route = u.level < 3 ? ['gromp', 'wolves', 'raptors', 'krugs'] : u.level < 5 ? ['gromp', 'blue', 'wolves', 'raptors', 'red', 'krugs'] : ['blue', 'gromp', 'wolves', 'raptors', 'red', 'krugs'];
    const tg = AI.jungleTarget(w, u);
    if (tg) { u.ai.focus = tg; AI.decide(w, u); return; }
    u.ai.focus = null;
    const c = J && J.camps.find(x => x.side === u.team); if (c) this.go(u, c.pos, 200);
  }

  /* ações de objetivo de equipe */
  goalAct(p) {
    const w = this.w, u = p.u, g = this.goal; u.ai.focus = null;
    if (g.kind === 'obj') {
      const mon = g.mons.find(m => !m.dead); if (!mon) return false; const pos = mon.pos;
      p.mode = 'obj';
      const here = [...g.mem].filter(q => dist(q.u.pos, pos) < 1700).length;
      if (!g.go && here >= Math.min(g.need, g.mem.size)) g.go = true;
      const wait = { x: pos.x + (this.fountain().x - pos.x) * (1500 / Math.max(1, dist(pos, this.fountain()))), y: pos.y + (this.fountain().y - pos.y) * (1500 / Math.max(1, dist(pos, this.fountain()))) };
      if (!g.go && dist(u.pos, pos) < 1700 ) { this.go(u, wait, 400); if (!g.wait0) g.wait0 = w.t; if (w.t - g.wait0 > 25) g.go = true; return true; }
      if (!g.go) { this.go(u, wait, 200); return true; }
      if (dist(u.pos, pos) > 650 && !u.attack.windup) { this.go(u, pos, 300); return true; }
      u.ai.focus = mon; AI.decide(w, u); return true;
    }
    if (g.kind === 'siege') {
      const T = g.T; p.mode = 'siege'; const P = this.paths[g.lane];
      const tank = w.units.filter(m => m.kind === 'minion' && !m.dead && m.team === u.team && dist(m.pos, T.pos) < 800).length;
      const foesN = w.units.filter(x => !x.dead && x.team !== u.team && isChamp(x) && dist(x.pos, T.pos) < 1300).length;
      const safeS = P.project(T.pos).s - (TURRET.range + T.radius + 110), hold = g.lane && T.sub !== 'nexus' ? P.at(Math.max(0, safeS)) : { x: T.pos.x + (this.fountain().x - T.pos.x) * 0.45, y: T.pos.y + (this.fountain().y - T.pos.y) * 0.45 };
      const near = dist(u.pos, T.pos) <= u.stats.range + T.radius + 20;
      if (tank >= 2 && (foesN <= Math.max(1, g.mem.size - 2) || tank >= 5)) {
        if (T.sub === 'turret' && (!w.structs.includes(T) || T.dead)) return false;
        u.ai.focus = T; if (near) { if (!(u.order && u.order.type === 'attack' && u.order.target === T)) w.orderAttack(u, T); } else if (!(u.order && u.order.type === 'attack' && u.order.target === T)) w.orderAttack(u, T); return true;
      }
      this.go(u, hold, 120); return true;
    }
    if (g.kind === 'defend') { p.mode = 'defend'; const em = w.units.filter(x => !x.dead && x.team !== u.team && (x.kind === 'minion' || isChamp(x)) && dist(x.pos, g.pos) < 1300).sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos))[0]; if (em) { u.ai.focus = em; AI.decide(w, u); return true; } this.go(u, g.pos, 300); return true; }
    return false;
  }
}

/* estilo pela composição (mesma ideia do legado: agressivos/AP burst vs escalonamento) */
function styleFromComp(champions, seed = 0) {
  const tags = champions.flatMap(c => c.funcoes || []), cnt = k => tags.filter(t => t === k).length;
  const ag = cnt('Assassin') + cnt('Fighter'), co = cnt('Marksman') + cnt('Mage') * 0.5, keys = ['ag', 'ma', 'es', 'ca', 're'];
  let k = keys[Math.abs(seed) % 5];
  if (ag >= 3 && (k === 'es' || k === 're')) k = seed % 2 ? 'ag' : 'ca';
  if (co >= 3 && (k === 'ag' || k === 'ca')) k = seed % 2 ? 'es' : 'ma';
  return k;
}

/* cria uma partida 5x5 pronta: cada time = { style?, name?, roster:[{name, role, attrs, level?}] } */
function createMatch(w, teams) {
  const brains = teams.map((t, i) => new Brain(w, i, { style: t.style || styleFromComp(t.roster.map(r => w.loader.champion(r.name)), i + 1), roster: t.roster, name: t.name }));
  brains[0].setEnemy(brains[1]); brains[1].setEnemy(brains[0]);
  brains.forEach(b => b.players.forEach(p => b.shopping(p)));
  return brains;
}
module.exports = { Brain, Path, STYLES, power, styleFromComp, createMatch, LANE_OF };
