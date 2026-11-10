'use strict';
/* Lane Assignment dinamico (early / mid / late). Pertence a Strategy (ai/strategy.js) e substitui o "cada um na sua rota" do Brain:
   Brain.act chama Strategy.laneFor(p) -> LaneAssign.laneOf(p), e o laneAct/farm/ondas existentes executam na rota designada.
   Entradas reaproveitadas: structures (torres/inibidores por rota), minions por rota, Strategy.obj (objetivo e tempo de nascimento), Strategy.formation
   (late: 5g, 4-1, 1-3-1, spread), brain.paths, power(). Nada aqui move campeoes diretamente: so decide QUEM ocupa QUAL rota e por que (logs em this.logs).
   Fases: EARLY (<14 min): rotas originais, com excecoes (ajuda a rota em desvantagem, cobertura de recall). MID (14-25): reorganiza (ADC no meio quando seguro,
   mid/top nas laterais) por pontuacao de permutacoes + histerese. LATE (25+): formacao da Strategy; sem formacao, atribuicao defensiva por ameaca/super tropas.
   ESTIMADO: pesos/limiares (CFG, FIT). Simplificacoes: sem Teleporte no motor (u.tp opcional), sem visao real (usa o adversario onisciente do Brain). */
const X = (typeof __P !== 'undefined' && __P) || {};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const LANES = ['top', 'mid', 'bot'], TI = ['outer', 'inner', 'inhibTurret'];
const HOME = { top: 'top', mid: 'mid', adc: 'bot', support: 'bot' };
const CFG = { midStart: 840, lateStart: 1500, replan: 14, swapGain: 0.45, swapCd: 75, stick: 0.3, helpCd: 150, helpMin: 240, helpDur: 45, farmW: { adc: 1.0, mid: 0.8, top: 0.75, support: 0.2 } };

/* ---------- compatibilidade campeao x rota: tracos derivados das funcoes/estatisticas, com excecoes por nome (extensivel) ---------- */
const OVR = {
  fiora: { split: 1, duel: 0.95, siege: 0.9, escape: 0.55, clear: 0.55, protect: 0.1 },
  jax: { split: 0.85, duel: 0.9, siege: 0.8, escape: 0.45, clear: 0.55, protect: 0.1 },
  tryndamere: { split: 0.95, duel: 0.9, siege: 0.95, escape: 0.6, clear: 0.5, protect: 0.1 },
  azir: { split: 0.3, duel: 0.4, siege: 0.4, escape: 0.55, clear: 1, protect: 0.35 },
  jinx: { split: 0.15, duel: 0.35, siege: 0.7, escape: 0.2, clear: 0.7, protect: 1 },
  twistedfate: { split: 0.65, duel: 0.4, siege: 0.4, escape: 0.55, clear: 0.9, protect: 0.4, global: 1 }
};
const norm = n => String(n || '').toLowerCase().replace(/[^a-z]/g, '');
function traitsOf(u) {
  if (u._lt) return u._lt;
  const tags = new Set((u.ch && u.ch.funcoes) || []), has = k => tags.has(k), mx = (...a) => Math.max(0, ...a);
  const rng = (u.stats && u.stats.range) || (u.ch && u.ch.stats_cdragon && u.ch.stats_cdragon.alcance_ataque) || 175, ms = (u.ch && u.ch.stats_cdragon && u.ch.stats_cdragon.velocidade_mov) || 340;
  const duel = mx(has('Fighter') && 0.8, has('Assassin') && 0.7, has('Tank') && 0.45, has('Mage') && 0.3, has('Marksman') && 0.3, 0.15);
  const clear = mx(has('Mage') && 0.9, has('Marksman') && 0.6, has('Fighter') && 0.5, has('Tank') && 0.35, has('Assassin') && 0.35, 0.3);
  const escape = clamp(mx(has('Assassin') && 0.8, has('Fighter') && 0.45, has('Mage') && 0.4, has('Marksman') && 0.35, has('Tank') && 0.2, 0.15) + (ms - 340) / 150, 0, 1);
  const protect = mx(has('Marksman') && 0.9, has('Mage') && (rng >= 550 ? 0.6 : 0.45), has('Support') && 0.2, has('Assassin') && 0.15, has('Fighter') && 0.15, has('Tank') && 0.05, 0.1);
  const siege = mx(has('Marksman') && 0.6, has('Fighter') && 0.6, has('Assassin') && 0.4, has('Mage') && 0.35, has('Tank') && 0.3, 0.2);
  let t = { duel, clear, escape, protect, siege, split: clamp(duel * 0.55 + escape * 0.3 + siege * 0.3 - protect * 0.3, 0, 1), tp: u.tp ? 1 : 0, global: 0 };
  const o = OVR[norm(u.name)]; if (o) t = { ...t, ...o };
  return (u._lt = t);
}

class LaneAssign {
  constructor(strat) {
    this.s = strat; this.b = strat.b; this.w = strat.w; this.cur = new Map(); this.reason = new Map(); this.phase = 'EARLY'; this.nextAt = 0; this.lastSwap = new Map();
    this.help = null; this.helpAt = -999; this.logs = []; this.sig = ''; this.stats = { swaps: 0, replans: 0, helps: 0, covers: 0 };
  }
  getPhase() { const t = this.w.t; return t < CFG.midStart ? 'EARLY' : t < CFG.lateStart ? 'MID' : 'LATE'; }
  laneOf(p) { if (p.role === 'jungle') return null; return this.cur.has(p) ? this.cur.get(p) : undefined; }
  why(p) { return this.reason.get(p) || ''; }
  quality() { const P = this.b.players; return P.reduce((s, p) => s + (p.attrs.macro + p.attrs.team + p.attrs.mental) / 300, 0) / Math.max(1, P.length); }

  /* ---------- contexto por rota ---------- */
  ctx() {
    const w = this.w, b = this.b, S = w.structures, team = b.team, op = b.alive(1 - team), C = {};
    const o = this.s.obj, side = o && o.spawnIn <= 120 ? (o.k === 'b' || o.k === 'h' || o.k === 'g' ? 'top' : 'bot') : null, wob = o ? clamp(1 - Math.max(0, o.spawnIn) / 120, 0.2, 1) : 0;
    LANES.forEach(L => {
      const own = S.lane(team, L), foe = S.lane(1 - team, L), alive = TI.filter(k => !own[k].dead);
      const front = alive.length ? own[alive[0]] : own.inhibitor.dead ? null : own.inhibitor;
      const mins = w.units.filter(x => x.kind === 'minion' && !x.dead && x.lane && x.lane.id === L), am = mins.filter(x => x.team === team).length, em = mins.length - am;
      const threat = front ? op.filter(e => dist(e.pos, front.pos) < 3500) : [];
      C[L] = { L, front, ownAlive: alive.length, foeAlive: TI.filter(k => !foe[k].dead).length, am, em, threat, tN: threat.length, sup: own.inhibitor.dead ? 1 : 0, fell: own.outer.dead || foe.outer.dead, ownOuter: !own.outer.dead,
        obj: side === L ? wob : 0 };
      C[L].imp = 0.5 + 0.3 * (alive.length > 0) + 0.9 * Math.min(2, C[L].tN) + 0.8 * C[L].sup + 0.6 * C[L].obj + (L === 'mid' ? 0.2 : 0);
    });
    /* leitura do adversario: onde cada inimigo esta (por rota) */
    const en = { top: 0, mid: 0, bot: 0 }; op.forEach(e => { let best = null; LANES.forEach(L => { const d = b.paths[L].project(e.pos).d; if (d < 1800 && (!best || d < best.d)) best = { L, d }; }); if (best) en[best.L]++; });
    C.enemyLanes = en; C.enemyAdcMid = !!op.find(e => b.enemy && b.enemy.players.find(q => q.u === e && q.role === 'adc') && b.paths.mid.project(e.pos).d < 1800);
    return C;
  }
  /* ---------- pontuacao ---------- */
  fit(p, L, C, duo, noise) {
    const t = traitsOf(p.u), c = C[L], lat = L !== 'mid', F = CFG, home = HOME[p.role] === L;
    let f = home ? F.stick : 0;
    if (!lat) f += 0.35 * t.clear + 0.25 * (1 - t.protect * 0.4); else f += 0.55 * t.split + 0.25 * t.duel + 0.2 * t.escape + 0.15 * t.clear + 0.3 * t.tp;
    const iso = duo ? 0.5 : 1.1; f -= t.protect * c.tN * iso;
    if (lat && !duo) f -= t.protect * 0.35;
    if (p.role === 'adc') {
      if (L === 'mid') f += 0.35 + 0.35 * (C.bot.fell ? 1 : 0) + 0.15 * (C.mid.ownAlive > 0 ? 1 : 0);
      else if (L === 'bot') f += 0.2 * (C.bot.ownAlive > 0 ? 1 : 0) - 0.3 * (C.bot.fell ? 1 : 0);
      else f -= 0.4;
      if (lat && t.escape < 0.4 && !duo) f -= 0.8;                                                    /* ADC sem mobilidade nao fica isolado em lateral */
    }
    if (c.tN > 0 && lat) f += 0.3 * t.duel;                                                            /* lateral ameacada pede um duelista */
    const q = this.quality(); f += noise * (1 - q) * 0.4;
    return f;
  }
  total(assign, C, supOn, noise) {          /* assign: Map lane -> player */
    let s = 0; const gold = this.b.players.map(p => p.u.stat.goldEarned || 0), avg = gold.reduce((a, x) => a + x, 0) / Math.max(1, gold.length);
    assign.forEach((p, L) => {
      const c = C[L], duo = !!supOn && supOn === L && p.role === 'adc', need = clamp(1 + (avg - (p.u.stat.goldEarned || 0)) / 4000, 0.6, 1.4);
      const farm = CFG.farmW[p.role] * need * clamp(0.3 + 0.05 * (c.am + c.em), 0.3, 1.1) - 0.35 * (c.tN >= 2 ? 1 : 0);
      s += this.fit(p, L, C, duo, noise(p, L)) * (0.6 + 0.4 * c.imp) + farm;
      if (duo) s += 0.15;
    });
    return s;
  }
  perms(a) { if (a.length <= 1) return [a]; const o = []; a.forEach((x, i) => this.perms(a.filter((_, j) => j !== i)).forEach(r => o.push([x, ...r]))); return o; }
  presentLaners() { return this.b.players.filter(p => !p.u.dead && p.role !== 'jungle' && p.role !== 'support' && !p.u.recall && !p.back && p.mode !== 'recall' && p.u.hp > p.u.hpMax * 0.25); }

  /* ---------- ciclo ---------- */
  update() {
    const w = this.w, t = w.t, ph = this.getPhase(), b = this.b; if (!b.players.length) return;
    const present = this.presentLaners(), sig = ph + '|' + (this.s.obj ? this.s.obj.k + (this.s.obj.spawnIn <= 90 ? 'p' : '') : '') + '|' + this.s.formation + '|' + (this.s.state === 'BASE_DEFENSE');
    const forced = ph !== this.phase || sig !== this.sig; this.phase = ph;
    if (!forced && t < this.nextAt) return;
    this.sig = sig; const q = this.quality(); this.nextAt = t + CFG.replan * (1.6 - q);
    this.stats.replans++;
    const C = this.ctx(), next = new Map(), why = new Map();
    const noiseMap = new Map(), rng = w.rng, noise = (p, L) => { const k = p.role + L; if (!noiseMap.has(k)) noiseMap.set(k, rng.gauss('ia')); return noiseMap.get(k); };
    const adc = b.players.find(p => p.role === 'adc'), sup = b.players.find(p => p.role === 'support'), jg = b.players.find(p => p.role === 'jungle');
    if (jg) { next.set(jg, null); why.set(jg, this.jungleWhy()); }
    const supOnLane = {};
    if (ph === 'EARLY') this.early(next, why, C, present);
    else if (ph === 'LATE' && this.s.active() && ['5g', '4-1', '1-3-1'].includes(this.s.formation) && !this.s.concede) this.late(next, why, C, present);
    else this.mid(next, why, C, present, noise, ph);
    /* suporte: acompanha o ADC; sem ADC vivo/presente, assume a rota de maior importancia */
    if (sup) {
      const ad = adc && next.get(adc);
      if (this.help && this.help.p === sup && this.help.until > t) { next.set(sup, this.help.lane); why.set(sup, `Roam/ajuda: ${this.help.why}`); }
      else if (ad) { next.set(sup, ad); why.set(sup, ad === 'mid' ? 'Protege o ADC no meio e controla visao no rio' : 'Acompanha o ADC'); }
      else { const L = LANES.slice().sort((a, c) => C[c].imp - C[a].imp)[0]; next.set(sup, L); why.set(sup, 'ADC fora da rota: cobre a rota mais importante'); }
    }
    /* histerese: so troca quem ganha o suficiente, com cooldown por jogador (exceto mudanca forcada) */
    const old = this.cur; let changed = false;
    next.forEach((L, p) => {
      if (p.role === 'jungle') { this.cur.set(p, null); this.reason.set(p, why.get(p)); return; }
      const prev = old.get(p);
      if (prev !== undefined && prev !== L && !forced && !this.mustMove(p, L, why.get(p)) && t - (this.lastSwap.get(p) || -999) < (/Defende|Objetivo/.test(why.get(p) || '') ? 35 : CFG.swapCd)) { return; }
      if (prev !== L) { this.lastSwap.set(p, t); this.stats.swaps += prev === undefined ? 0 : 1; changed = true; }
      this.cur.set(p, L); this.reason.set(p, why.get(p));
    });
    if (changed || forced) this.log(ph, C);
  }
  mustMove(p, L, why) { return /Cobertura|Roam/.test(why || ''); }

  /* ---------- EARLY: rotas originais + ajuda/cobertura ---------- */
  early(next, why, C, present) {
    this.b.players.forEach(p => { if (p.role === 'jungle' || p.role === 'support') return; next.set(p, HOME[p.role]); why.set(p, 'Rota original (early game)'); });
    this.helpAndCover(next, why, C, present, true);
  }
  /* ---------- MID: permutacoes top/mid/adc nas 3 rotas ---------- */
  mid(next, why, C, present, noise, ph) {
    if (X.nomid || (present.length < 3 && this.cur.size)) {                                        /* alguem fora (recall/morto): os outros ficam onde estao; a cobertura decide o resto */
      this.b.players.forEach(p => { if (p.role === 'jungle' || p.role === 'support') return; next.set(p, this.cur.get(p) || HOME[p.role]); why.set(p, this.reason.get(p) || 'Mantem a rota'); });
      this.helpAndCover(next, why, C, present, false); return;
    }
    const k = present.length, use = LANES;
    const adc = this.b.players.find(p => p.role === 'adc');
    let best = null, bestCur = null;
    this.perms(present).forEach(order => {
      const assign = new Map(); order.forEach((p, i) => assign.set(use[i], p));
      const adcL = adc && order.includes(adc) ? use[order.indexOf(adc)] : null, sc = this.total(assign, C, adcL, noise);
      if (!best || sc > best.sc) best = { sc, assign };
      if (order.every(p => this.cur.get(p) === use[order.indexOf(p)] || !this.cur.has(p))) { if (!bestCur || sc > bestCur.sc) bestCur = { sc, assign }; }
    });
    let pick = best;
    /* ganho minimo sobre a distribuicao atual (evita trocas constantes e sem motivo) */
    if (bestCur && best.sc - bestCur.sc < CFG.swapGain && this.cur.size) pick = bestCur;
    /* times fracos erram: as vezes mantem a 2a melhor (distribuicao incompatível) */
    pick.assign.forEach((p, L) => { next.set(p, L); why.set(p, this.explain(p, L, C, ph)); });
    this.b.players.forEach(p => { if (p.role === 'jungle' || p.role === 'support') return; if (!next.has(p)) { next.set(p, this.cur.get(p) || HOME[p.role]); why.set(p, 'Em recall/morto: mantem a rota'); } });
    this.helpAndCover(next, why, C, present, false);
  }
  /* ---------- LATE: formacoes da Strategy ---------- */
  late(next, why, C, present) {
    const s = this.s, f = s.formation, g = s.group || 'mid';
    this.b.players.forEach(p => {
      if (p.role === 'jungle' || p.role === 'support') return;
      let L = g, r = f === '5g' ? 'Agrupa (5-0): objetivo/cerco/luta' : 'Agrupado (4-1/1-3-1)';
      if (s.isSplit(p)) { L = p === s.split2 ? (s.splitLane === 'bot' ? 'top' : 'bot') : (s.splitLane || g); r = `Pressao lateral (${f})`; }
      next.set(p, L); why.set(p, r);
    });
  }
  /* ajuda a rota em desvantagem (early/mid) e cobertura de recall (todas as fases) */
  helpAndCover(next, why, C, present, early) {
    const w = this.w, t = w.t, b = this.b, P = b.players;
    const power = require('./brain').power;
    /* cobertura: rota sem ocupante (morto/recall) com ameaca real; dura pelo menos 30 s e so quem chega a tempo cobre */
    this.cover = this.cover || new Map();
    const occupied = new Set(); next.forEach((L, p) => { if (p.role !== 'jungle' && p.role !== 'support' && present.includes(p)) occupied.add(L); });
    this.cover.forEach((cv, L) => { const orig = P.find(q => q.role === cv.orig); if (cv.until <= t || cv.p.u.dead || !present.includes(cv.p) || (orig && present.includes(orig) && next.get(orig) === L && t > cv.since + 4)) this.cover.delete(L); });
    this.cover.forEach((cv, L) => { next.set(cv.p, L); why.set(cv.p, `Cobertura da rota ${L} enquanto ${cv.orig} faz recall`); occupied.add(L); });
    P.forEach(p => {
      if (p.role === 'jungle' || p.role === 'support' || present.includes(p)) return;
      const L = this.cur.get(p) || HOME[p.role], c = C[L]; if (!c || occupied.has(L) || this.cover.has(L)) return;
      if (X.nocover || c.tN > 0 || !(c.em > c.am + 3)) return;           /* cobre so onda inimiga empurrando (sem campeoes por perto); contra campeoes quem age e a meta defend do Brain */
      const ref = c.front ? c.front.pos : null; if (!ref) return;
      const cand = present.filter(x => !(this.help && this.help.p === x) && dist(x.u.pos, ref) < 7000).sort((a, d) => (a.role === 'mid' ? 0 : 1) - (d.role === 'mid' ? 0 : 1) || dist(a.u.pos, ref) - dist(d.u.pos, ref))[0];
      if (cand && next.get(cand) !== L) { this.cover.set(L, { p: cand, orig: p.role, since: t, until: t + 30 }); next.set(cand, L); why.set(cand, `Cobertura da rota ${L} enquanto ${p.role} faz recall`); occupied.add(L); this.stats.covers++; }
    });
    /* ajuda: rota em desvantagem numerica/de poder; quem ajuda paga o custo de largar a propria onda */
    if (this.help && this.help.until > t) return;
    if (this.help && this.help.until <= t) { this.help = null; this.helpAt = t; }
    if (X.nohelp || t < CFG.helpMin || t - this.helpAt < CFG.helpCd) return;
    const op = b.alive(1 - b.team); let target = null;
    LANES.forEach(L => {
      const mine = present.filter(p => next.get(p) === L && p.role !== 'support'), foes = op.filter(e => b.paths[L].project(e.pos).d < 1800), c = C[L];
      if (!c.front || c.tN === 0 && !foes.length) return;
      const mp = mine.reduce((s, p) => s + power(p.u), 0) + 1, fp = foes.reduce((s, e) => s + power(e), 0);
      const weak = fp > mp * 1.15 && (c.tN > 0 || c.em >= c.am), low = foes.length && foes.every(e => e.hp < e.hpMax * 0.45) && mine.length;
      if ((weak || low) && (!target || fp / mp > target.r)) target = { L, r: fp / mp, why: weak ? `rota ${L} em desvantagem` : `rota ${L}: oportunidade (inimigo com pouca vida)` };
    });
    if (!target) return;
    const sup = P.find(p => p.role === 'support'), adc = P.find(p => p.role === 'adc'), mid = P.find(p => p.role === 'mid');
    const adcL = adc && next.get(adc);
    let h = null;
    if (sup && !sup.u.dead && sup.u.hp > sup.u.hpMax * 0.65 && adcL && adcL !== target.L && C[adcL].tN === 0 && C[adcL].am >= C[adcL].em) h = sup;
    else if (mid && present.includes(mid) && next.get(mid) !== target.L && C[next.get(mid)] && C[next.get(mid)].am >= C[next.get(mid)].em + 3) h = mid;
    if (!h) return;
    this.help = { p: h, lane: target.L, until: t + CFG.helpDur, why: target.why }; this.stats.helps++;
    if (h !== sup) { next.set(h, target.L); why.set(h, `Roam/ajuda: ${target.why} (onda propria ja empurrada)`); }
  }
  explain(p, L, C, ph) {
    const t = traitsOf(p.u), c = C[L], home = HOME[p.role] === L;
    if (c.obj > 0.3 && L !== 'mid') return `Objetivo (${this.s.obj && this.s.obj.k === 'b' ? 'Barao' : 'Dragao'}): prepara onda lateral`;
    if (c.tN > 0) return `Defende rota ${L} (ameaca)`;
    if (p.role === 'adc' && L === 'mid') return 'Farm seguro e proximidade dos objetivos';
    if (L !== 'mid' && t.split >= 0.6) return 'Pressao lateral (bom duelo/split)';
    if (L !== 'mid') return 'Lateral: boa limpeza de onda e seguranca suficiente';
    if (home) return 'Mantem a rota (sem ganho em trocar)';
    return 'Controle do meio e prioridade de rota';
  }
  jungleWhy() { const o = this.s.obj; return o && o.spawnIn <= 90 ? `Preparo de objetivo (${o.k === 'b' ? 'Barao' : 'Dragao'}) e cobertura do mapa` : 'Rotacao pela selva, ganks e cobertura'; }
  /* ---------- logs para depuracao ---------- */
  log(ph, C) {
    const b = this.b, name = { top: 'TOP LANE', mid: 'MID LANE', bot: 'BOT LANE' }, R = { top: 'TOP', jungle: 'JUNGLE', mid: 'MID', adc: 'ADC', support: 'SUPPORT' };
    const e = { t: Math.round(this.w.t), team: b.team, name: b.name, phase: ph, st: this.s.state, form: this.s.formation, rows: {} };
    b.players.forEach(p => { const L = this.cur.get(p); e.rows[p.role] = { lane: L === null ? 'MAP ROTATION' : name[L], reason: this.reason.get(p) || '' }; });
    this.logs.push(e); if (this.logs.length > 80) this.logs.shift();
  }
  format(e) {
    const R = { top: 'TOP', jungle: 'JUNGLE', mid: 'MID', adc: 'ADC', support: 'SUPPORT' };
    return `[TEAM ${e.name} — LANE ASSIGNMENT] ${Math.floor(e.t / 60)}:${String(e.t % 60).padStart(2, '0')}\nPhase: ${e.phase}${e.phase === 'LATE' ? ' (' + e.form + ')' : ''}\n` + ['top', 'jungle', 'mid', 'adc', 'support'].map(r => `${R[r]}: ${e.rows[r].lane}\n  Reason: ${e.rows[r].reason}`).join('\n');
  }
}
module.exports = { LaneAssign, traitsOf, CFG, OVR };
