'use strict';
/* Executor de habilidades (Bloco 3): interpreta os efeitos dos kits (dados) no mundo.
   Geometria vem dos dados oficiais (alcance, raio, largura, velocidade do míssil, tempo de conjuração).
   PARÂMETROS ESTIMADOS (não existem nos dados extraídos; declarados aqui e na documentação):
   - CONE_DEG: abertura do cone da W da Annie (Wiki: 50 graus).
   - LEONA_R_OUTER: raio externo da lentidão da R da Leona = 2,5x o raio de atordoamento dos dados.
   - INSTANT_SPEED: velocidade de míssil <= 50 nos dados significa "sem míssil" (resolve na hora).
   Tibbers (R da Annie), passiva da Ahri e escudo da passiva do Malphite ficam como PENDENTES (sem dados avaliáveis). */
const { resolveSlot } = require('../champion/kits');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const CONE_DEG = 50, LEONA_R_OUTER = 2.5, INSTANT_SPEED = 50, GLOBAL = 20000;
const pct = v => (v > 1.5 ? v / 100 : v);
const TARGET_FX = new Set(['damage', 'cc', 'debuff', 'mark', 'execute']);

function res(w, u, slot, rank) { return resolveSlot(u.defs, u.kit, slot, { rank: rank || u.abil.rank[slot] || 1, level: u.level, S: u.stats }); }
function val(w, x) {                                              /* número ou {unsupported}: pendente -> 0 + evento */
  if (typeof x === 'number') return x;
  if (x && x.unsupported) { w.emit('pending', { calc: x.calc, why: x.unsupported }); return 0; }
  return 0;
}
function proj(u, slot) { return (u.kit[slot] && u.kit[slot].proj) || {}; }

/* ---------- consultas geométricas ---------- */
function inCircle(w, u, c, r, foes = true) { return w.units.filter(x => !x.dead && (foes ? x.team !== u.team : x.team === u.team) && dist(x.pos, c) <= r + x.radius); }
function inCone(w, u, dirAng, range) {
  const half = (CONE_DEG / 2) * Math.PI / 180;
  return w.units.filter(x => {
    if (x.dead || x.team === u.team) return false;
    const d = dist(u.pos, x.pos); if (d > range + x.radius) return false;
    let a = Math.atan2(x.pos.y - u.pos.y, x.pos.x - u.pos.x) - dirAng; a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(a) <= half + (x.radius / Math.max(d, 1));
  });
}
function distSegPoint(a, b, p) {
  const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2)) : 0;
  return { d: Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy)), t };
}

/* ---------- efeitos ---------- */
function applyTargetFx(w, u, r, tg, ctx = {}) {
  r.effects.forEach(e => {
    if (!TARGET_FX.has(e.t)) return;
    if (e.leg && e.leg !== (ctx.leg || 'out')) return;
    if (e.vs === 'minionMonster') return;
    if (e.zone === 'edge' && ctx.zone !== 'edge') return;
    if (e.zone === 'center' && ctx.zone === 'edge') return;
    if (e.lastHit && !ctx.last) return;
    if (e.after !== undefined) return;                                       /* Morgana R: atordoamento posterior tratado em launch */
    switch (e.t) {
      case 'damage': {
        let a = val(w, e.calc);
        if (e.reducedPerHit) { const f = Math.max(pct(val(w, e.minPct)), 1 - (ctx.nHit || 0) * pct(val(w, e.reducedPerHit))); a *= f; }
        w.dealDamage(u, tg, a, e.type, { ability: r.slot, canCrit: false });
        break;
      }
      case 'cc': {
        const d = val(w, e.dur);
        if (e.kind === 'slow') w.addStatus(tg, { kind: 'slow', dur: d, amount: pct(val(w, e.amount)), src: u, tag: r.slot });
        else w.addStatus(tg, { kind: e.kind, dur: d, src: u, tag: r.slot });
        break;
      }
      case 'debuff':
        if (e.stat === 'attackSpeed') w.addStatus(tg, { kind: 'asSlow', dur: val(w, e.dur), amount: pct(val(w, e.pct)), src: u, tag: r.slot });
        break;
      case 'mark':
        tg.marks[u.name + r.slot] = { until: w.t + val(w, e.dur), owner: u.id, slot: r.slot, rank: r.rank }; w.emit('mark', { id: tg.id, src: u.id, slot: r.slot });
        break;
      case 'execute': {
        const miss = 1 - tg.hp / tg.hpMax, base = val(w, e.base), ratio = val(w, e.missingHealthRatio);
        w.dealDamage(u, tg, base + ratio * (tg.hpMax - tg.hp), 'true', { ability: r.slot }); void miss;
        break;
      }
    }
  });
}
function applySelfFx(w, u, r, ctx = {}) {
  r.effects.forEach(e => {
    switch (e.t) {
      case 'removeSlows': u.st = u.st.filter(s => s.kind !== 'slow'); break;
      case 'ms': w.addBuff(u, { dur: val(w, e.dur), pct: { ms: pct(val(w, e.amount)) }, tag: r.slot }); break;
      case 'tenacity': w.addBuff(u, { dur: val(w, e.dur), tenacity: pct(val(w, e.amount)), tag: r.slot }); break;
      case 'damageReduction':
        if (e.amount !== undefined) u.dr.push({ pct: pct(val(w, e.amount)), until: w.t + (ctx.drDur || 2), tag: r.slot });
        break;
      case 'buff':
        if (e.stat === 'armor' || e.stat === 'mr') w.addBuff(u, { dur: val(w, e.dur), flat: { [e.stat]: val(w, e.amount) }, tag: r.slot });
        break;
      case 'shield':
        if (r.shape === 'self') w.addShield(u, val(w, e.calc), { dur: val(w, e.dur), src: u, type: e.absorbs || 'all', blocksCC: !!e.blocksCC });
        break;
      case 'empower': u.empower = { slot: r.slot, rank: r.rank, until: w.t + (val(w, e.window) || 6), onHit: e.onHit, fx: r }; w.emit('empower', { id: u.id, slot: r.slot }); break;
    }
  });
  if (u.name === 'Garen' && r.slot === 'W') { const e = r.effects.find(x => x.t === 'damageReduction'); if (e) u.dr[u.dr.length - 1].until = w.t + val(w, e.dur); }
}
/* efeito de ataque empoderado (próximo ataque) */
function consumeEmpower(w, u, tg) {
  const em = u.empower; if (!em) return false;
  u.empower = null;
  em.onHit.forEach(e => {
    if (e.t === 'damage') w.dealDamage(u, tg, val(w, e.calc), e.type, { ability: em.slot, empowered: true });
    else if (e.t === 'cc') w.addStatus(tg, { kind: e.kind, dur: val(w, e.dur), src: u, tag: em.slot });
    else if (e.t === 'splash') {
      const a = val(w, e.damage), rg = val(w, e.range);
      inCircle(w, u, tg.pos, rg).filter(x => x !== tg).forEach(x => w.dealDamage(u, x, a, 'magic', { ability: em.slot }));
    }
  });
  if (u.name === 'Garen' && em.slot === 'Q') u.abil.reduceCooldown('Q', 0);
  if (u.name === 'Leona' && em.slot === 'Q') tg.marks.LeonaP = { until: w.t + 3.5, owner: u.id };
  return true;
}
function attackHit(w, u, tg) {
  if (tg.dead) return;
  const ad = u.stats.ad.total;
  const onFx = consumeEmpower(w, u, tg);
  w.dealDamage(u, tg, ad, 'physical', { attack: true, canCrit: true, empowered: onFx });
  if (u.name === 'Amumu') tg.marks.AmumuCurse = { until: w.t + val(w, resP(w, u).effects[0].dur), owner: u.id, frac: val(w, resP(w, u).effects[0].magicToTrueFraction) };
}
const resP = (w, u) => res(w, u, 'P', 1);

/* ---------- projéteis ---------- */
let pid = 1;
function spawnLine(w, u, r, aim, o = {}) {
  const ang = aim.ang !== undefined ? aim.ang : Math.atan2(aim.y - u.pos.y, aim.x - u.pos.x);
  const g = r.geometry, sp = (g.missile && g.missile.speed) || 0, range = Math.min(o.range || g.range || GLOBAL, GLOBAL);
  const P = { id: w.nextId++, kind: 'line', owner: u, slot: r.slot, r, x: u.pos.x, y: u.pos.y, ox: u.pos.x, oy: u.pos.y, ang, speed: sp, range, travelled: 0,
    width: (g.missile && g.missile.width) || g.width || 60, pierce: !!o.pierce, hit: new Set(), nHit: 0, leg: 'out', returns: !!o.returns, firstDash: !!o.dashToHit, global: !!o.global };
  w.projs.push(P); w.emit('projectile', { id: P.id, src: u.id, slot: r.slot, ang: +ang.toFixed(3), speed: sp, range: Math.round(range), width: P.width });
  if (sp <= INSTANT_SPEED) { const sp2 = Object.assign(P, { speed: 1e9 }); void sp2; }
  return P;
}
function spawnHoming(w, u, tg, o) {
  const P = { id: w.nextId++, kind: 'homing', owner: u, target: tg, x: u.pos.x, y: u.pos.y, speed: o.speed, onHit: o.onHit, tag: o.tag || '' };
  w.projs.push(P); return P;
}
function updateProjectiles(w) {
  const keep = [];
  for (const P of w.projs) {
    if (P.dead) continue;
    if (P.kind === 'homing') {
      const tg = P.target; if (tg.dead || P.owner.dead && P.tag !== 'AA') continue;
      const d = dist(P, tg.pos), step = P.speed * w.dt;
      if (d <= step + tg.radius * 0.5) { P.onHit(tg); continue; }
      P.x += (tg.pos.x - P.x) / d * step; P.y += (tg.pos.y - P.y) / d * step; keep.push(P); continue;
    }
    const step = Math.min(P.speed * w.dt, P.range - P.travelled), a = { x: P.x, y: P.y };
    let dx = Math.cos(P.ang), dy = Math.sin(P.ang);
    if (P.leg === 'return') { const o = P.owner, d = dist(a, o.pos) || 1; dx = (o.pos.x - a.x) / d; dy = (o.pos.y - a.y) / d; }
    const b = { x: a.x + dx * step, y: a.y + dy * step };
    const cands = [];
    for (const x of w.units) {
      if (x.dead || x.team === P.owner.team || P.hit.has(x.id)) continue;
      const s = distSegPoint(a, b, x.pos);
      if (s.d <= P.width / 2 + x.radius) cands.push({ x, t: s.t });
    }
    cands.sort((p, q) => p.t - q.t || p.x.id - q.x.id);
    let stop = false;
    for (const c of cands) {
      P.hit.add(c.x.id); P.nHit++;
      P.owner.stat.hits++;
      w.emit('proj-hit', { proj: P.id, src: P.owner.id, dst: c.x.id, slot: P.slot });
      onProjHit(w, P, c.x);
      if (!P.pierce) { stop = true; break; }
    }
    P.x = b.x; P.y = b.y; P.travelled += step;
    if (stop) continue;
    if (P.leg === 'return') { if (dist(P, P.owner.pos) < 60) continue; keep.push(P); continue; }
    if (P.travelled >= P.range - 1e-6) {
      if (P.returns) { P.leg = 'return'; P.hit.clear(); P.nHit = 0; P.travelled = 0; P.range = GLOBAL; keep.push(P); }
      continue;
    }
    keep.push(P);
  }
  w.projs = keep;
}
function onProjHit(w, P, tg) {
  const u = P.owner, r = P.r;
  applyTargetFx(w, u, r, tg, { leg: P.leg, nHit: P.nHit - 1, last: true });
  if (u.name === 'Ezreal' && r.slot === 'Q') {
    const e = r.effects.find(x => x.t === 'resetCooldown'); if (e) ['Q', 'W', 'E', 'R'].forEach(s => { if (s !== 'Q' || true) u.abil.reduceCooldown(s, val(w, e.by)); });
  }
  if (P.firstDash && !u.dash) startDash(w, u, { to: tg.pos, speed: 1400, stopAt: u.radius + tg.radius + 5, cancelable: false, onEnd: () => { if (u.name === 'Leona' && r.slot === 'E') inCircle(w, u, u.pos, 0).length; } });
  afterAbilityHit(w, u, tg, r);
}
function afterAbilityHit(w, u, tg, r) {
  if (u.name === 'Ezreal') {
    const P = resP(w, u).effects[0].onAbilityHit;
    const b = u.buffs.filter(x => x.tag === 'EzP');
    const st = Math.min(val(w, P.maxStacks), b.length + 1);
    u.buffs = u.buffs.filter(x => x.tag !== 'EzP');
    w.addBuff(u, { dur: val(w, P.dur), pct: { as: st * val(w, P.amount) }, tag: 'EzP' });
  }
  if (u.name === 'Leona' && r.slot !== 'P') tg.marks.LeonaP = { until: w.t + val(w, resP(w, u).effects[0].dur), owner: u.id };
}

/* ---------- dash ---------- */
function startDash(w, u, d) {
  const to = d.to, dd = dist(u.pos, to); if (dd < 1) return;
  u.dash = { to: { x: to.x, y: to.y }, speed: d.speed, stopAt: d.stopAt || 0, cancelable: d.cancelable !== false, onEnd: d.onEnd };
  u.cast = null; u.attack.windup = null; w.emit('dash', { id: u.id, to: [Math.round(to.x), Math.round(to.y)], speed: d.speed });
}
function stepDash(w, u) {
  const d = u.dash, left = dist(u.pos, d.to) - d.stopAt, step = d.speed * w.dt;
  if (left <= step) { const k = Math.max(left, 0) / (dist(u.pos, d.to) || 1); u.pos.x += (d.to.x - u.pos.x) * k; u.pos.y += (d.to.y - u.pos.y) * k; u.dash = null; if (d.onEnd) d.onEnd(); return; }
  const k = step / dist(u.pos, d.to); u.pos.x += (d.to.x - u.pos.x) * k; u.pos.y += (d.to.y - u.pos.y) * k;
}

/* ---------- lançamento ---------- */
function aimPoint(u, aim, range) {
  if (aim && aim.target) return { x: aim.target.pos.x, y: aim.target.pos.y };
  const a = aim || { x: u.pos.x + 1, y: u.pos.y };
  const d = dist(u.pos, a); if (!range || d <= range) return { x: a.x, y: a.y };
  return { x: u.pos.x + (a.x - u.pos.x) / d * range, y: u.pos.y + (a.y - u.pos.y) / d * range };
}
function launch(w, u, { slot, rank, aim }) {
  const r = res(w, u, slot, rank), g = r.geometry, pr = proj(u, slot);
  const rng = g.range && g.range < GLOBAL ? g.range : 0;
  const hitAll = (list, ctx) => list.forEach((t, i) => applyTargetFx(w, u, r, t, { ...ctx, nHit: i, last: i === list.length - 1 }));
  const instantTarget = tg => {
    if (!tg || tg.dead) return;
    const sp = (g.missile && g.missile.speed) || 0;
    if (sp > INSTANT_SPEED) spawnHoming(w, u, tg, { speed: sp, tag: r.slot, onHit: t => { applyTargetFx(w, u, r, t); afterAbilityHit(w, u, t, r); } });
    else { applyTargetFx(w, u, r, tg); afterAbilityHit(w, u, tg, r); }
  };
  switch (r.shape) {
    case 'skillshot': case 'globalLine':
      spawnLine(w, u, r, aim, { pierce: pr.pierce || r.shape === 'globalLine', returns: pr.returns, dashToHit: pr.dashToHit, global: r.shape === 'globalLine', range: r.shape === 'globalLine' ? GLOBAL : undefined });
      if (slot === 'W' && u.name === 'Ezreal') { /* marca é aplicada em applyTargetFx (kit) */ }
      break;
    case 'target': { const tg = aim && aim.target; if (tg && !tg.dead && dist(u.pos, tg.pos) <= (rng || 1e9) + tg.radius) instantTarget(tg); break; }
    case 'targetAlly': {
      const tg = (aim && aim.target) || u;
      r.effects.forEach(e => {
        if (e.t === 'shield') w.addShield(tg, val(w, e.calc), { dur: val(w, e.dur), src: u, type: e.absorbs || 'all', blocksCC: !!e.blocksCC });
        else if (e.t === 'ms') w.addBuff(tg, { dur: val(w, e.dur), pct: { ms: pct(val(w, e.amount)) }, tag: r.slot });
      });
      break;
    }
    case 'self': applySelfFx(w, u, r, {}); if (u.name === 'Ahri' && slot === 'W') ahriW(w, u, r); break;
    case 'toggleAura': toggleAura(w, u, r); break;
    case 'selfAoe': {
      const list = inCircle(w, u, u.pos, g.radius);
      if (u.name === 'Amumu' && slot === 'W') { toggleAura(w, u, r); break; }
      if (u.name === 'Amumu' && slot === 'E') { hitAll(list, {}); u.abil.readyAt.E = u.abil.readyAt.E; break; }
      if (u.name === 'Morgana' && slot === 'R') { morganaR(w, u, r, list); break; }
      const au = r.effects.find(x => x.t === 'aura' && x.tickDamage);
      if (au) { const n = val(w, au.ticks) || 1, over = val(w, au.over) || 1, a = val(w, au.tickDamage.calc); w.zones.push({ owner: u, slot, follow: true, radius: g.radius, every: over / n, next: w.t + over / n, until: w.t + over + 1e-6, min: a, max: a, amp: 0, dieWithOwner: true, type: au.tickDamage.type || 'magic' }); w.emit('zone', { src: u.id, slot, radius: g.radius }); break; }
      hitAll(list, {}); applySelfFx(w, u, r, {});
      break;
    }
    case 'area': {
      const c = aimPoint(u, aim, rng);
      if (u.name === 'Morgana' && slot === 'W') { zone(w, u, r, c, g.radius); break; }
      if (u.name === 'Leona' && slot === 'R') {
        const near = inCircle(w, u, c, g.radius * LEONA_R_OUTER);
        near.forEach(t => { const inner = dist(t.pos, c) <= g.radius + t.radius; applyTargetFx(w, u, r, t, { zone: inner ? 'center' : 'edge', last: true }); afterAbilityHit(w, u, t, r); });
        break;
      }
      const list = inCircle(w, u, c, g.radius); hitAll(list, {}); list.forEach(t => afterAbilityHit(w, u, t, r));
      if (u.name === 'Annie' && slot === 'R') w.emit('pending', { calc: 'Tibbers', why: 'invocação não implementada neste bloco' });
      break;
    }
    case 'cone': {
      const ang = Math.atan2((aim.target ? aim.target.pos.y : aim.y) - u.pos.y, (aim.target ? aim.target.pos.x : aim.x) - u.pos.x);
      const list = inCone(w, u, ang, g.range); hitAll(list, {}); list.forEach(t => afterAbilityHit(w, u, t, r)); break;
    }
    case 'dash': {
      const e = r.effects.find(x => x.t === 'dash');
      if (u.name === 'Ahri') { const d = val(w, e.dist), sp = val(w, e.speed) || 1200, to = aimPoint(u, aim, d); startDash(w, u, { to, speed: sp, onEnd: () => ahriRBolts(w, u, r) }); }
      else if (u.kit.auto) {                                              /* kit gerado: avanca a distancia/velocidade dos dados e acerta quem estiver perto ao chegar */
        const d = e.dist ? val(w, e.dist) : (rng || 450), sp = (e.speed && val(w, e.speed)) || (g.missile && g.missile.speed) || 1200, to = aimPoint(u, aim, d || 450);
        startDash(w, u, { to, speed: sp, onEnd: () => { const list = inCircle(w, u, u.pos, g.radius || 300); hitAll(list, {}); list.forEach(t => afterAbilityHit(w, u, t, r)); } });
      }
      else if (u.name === 'Malphite') { const to = aimPoint(u, aim, rng), sp = (g.missile && g.missile.speed) || 1000; startDash(w, u, { to, speed: sp, cancelable: false, onEnd: () => { const list = inCircle(w, u, u.pos, g.radius); hitAll(list, {}); } }); }
      break;
    }
    case 'blink': {
      const to = aimPoint(u, aim, rng || 475); u.pos.x = to.x; u.pos.y = to.y; w.emit('blink', { id: u.id, to: [Math.round(to.x), Math.round(to.y)] });
      const foes = w.foes(u).filter(x => dist(x.pos, u.pos) <= 750 + x.radius).sort((a, b) => (b.marks.EzrealW && b.marks.EzrealW.until > w.t ? 1 : 0) - (a.marks.EzrealW && a.marks.EzrealW.until > w.t ? 1 : 0) || dist(a.pos, u.pos) - dist(b.pos, u.pos));
      const tg = foes[0], e = r.effects.find(x => x.t === 'homingMissile');
      if (tg && e) spawnHoming(w, u, tg, { speed: 1600, tag: 'E', onHit: t => { w.dealDamage(u, t, val(w, e.damage.calc), 'magic', { ability: 'E' }); afterAbilityHit(w, u, t, r); } });
      break;
    }
    default: break;
  }
  void instantTarget;
}
function ahriRBolts(w, u, r) {
  const e = r.effects.find(x => x.t === 'damage'), max = val(w, e.maxTargetsPerCast) || 3;
  w.foes(u).filter(x => dist(x.pos, u.pos) <= 550).sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos)).slice(0, max).forEach(t => spawnHoming(w, u, t, { speed: 1400, tag: 'R', onHit: x => w.dealDamage(u, x, val(w, e.calc), 'magic', { ability: 'R' }) }));
}
function ahriW(w, u, r) {
  const e = r.effects.find(x => x.t === 'homingMissiles'), a = val(w, e.damage.calc);
  w.foes(u).filter(x => dist(x.pos, u.pos) <= 700).sort((p, q) => dist(p.pos, u.pos) - dist(q.pos, u.pos)).slice(0, e.count).forEach(t => spawnHoming(w, u, t, { speed: 1800, tag: 'W', onHit: x => w.dealDamage(u, x, a, 'magic', { ability: 'W' }) }));
}
function morganaR(w, u, r, list) {
  const ch = r.effects.find(x => x.t === 'cc' && x.kind === 'slow'), st = r.effects.find(x => x.t === 'cc' && x.kind === 'stun');
  const dur = val(w, ch.dur), R = r.geometry.radius, a = val(w, r.effects.find(x => x.t === 'damage').calc);
  list.forEach(t => { w.dealDamage(u, t, a, 'magic', { ability: 'R' }); w.addStatus(t, { kind: 'slow', dur, amount: pct(val(w, ch.amount)), src: u, tag: 'R' }); });
  w.addBuff(u, { dur, pct: { ms: pct(val(w, r.effects.find(x => x.t === 'ms').amount)) }, tag: 'R' });
  const sd = val(w, st.dur); const targets = list.slice();
  w.schedule(w.t + dur, () => { if (u.dead) return; targets.forEach(t => { if (!t.dead && dist(t.pos, u.pos) <= R + t.radius) w.addStatus(t, { kind: 'stun', dur: sd, src: u, tag: 'R' }); }); });
}

/* ---------- zonas (Morgana W, Amumu W) ---------- */
function zone(w, u, r, c, radius) {
  const e = r.effects.find(x => x.t === 'aura'), every = val(w, e.tickEvery) || 0.5, over = val(w, e.over) || 5;
  const min = val(w, e.damage.calc), max = e.damage.maxCalc ? val(w, e.damage.maxCalc) : min;
  const z = { owner: u, slot: r.slot, c, radius, every, next: w.t + every, until: w.t + over, min, max, amp: e.damage.scalesWithMissingHealth ? pct(val(w, e.damage.scalesWithMissingHealth)) : 0 };
  w.zones.push(z); w.emit('zone', { src: u.id, slot: r.slot, radius });
}
function toggleAura(w, u, r) {
  if (u.zonesOwned.W) { u.zonesOwned.W.until = w.t; u.zonesOwned.W = null; u.abil.readyAt.W = w.t + 1; w.emit('toggle', { id: u.id, on: false }); return; }
  const e = r.effects.find(x => x.t === 'aura'); const z = { owner: u, slot: 'W', follow: true, radius: r.geometry.radius, every: 1, next: w.t + 1, until: 1e9, min: val(w, e.damage.calc), max: val(w, e.damage.calc), amp: 0, dieWithOwner: true, manaPerSec: 0 };
  u.zonesOwned.W = z; w.zones.push(z); w.emit('toggle', { id: u.id, on: true });
}
function updateZones(w) {
  for (const z of w.zones) {
    if (z.until <= w.t || z.owner.dead) { if (z.owner.dead) z.until = w.t; continue; }
    if (w.t + 1e-9 < z.next) continue;
    z.next += z.every;
    const c = z.follow ? z.owner.pos : z.c;
    inCircle(w, z.owner, c, z.radius).forEach(t => {
      let a = z.min; if (z.amp) a = Math.min(z.max, a * (1 + z.amp * (1 - t.hp / t.hpMax)));
      w.dealDamage(z.owner, t, a, z.type || 'magic', { ability: z.slot, tick: true });
    });
  }
}

/* ---------- ganchos de dano ---------- */
function onDamage(w, src, dst, info) {
  /* Ezreal W: detona a marca com outro dano do próprio Ezreal */
  const mk = dst.marks['EzrealW'];
  if (mk && mk.until > w.t && src.name === 'Ezreal' && info.ability !== 'W' && (info.ability || info.attack)) {
    delete dst.marks.EzrealW; const r = res(w, src, 'W', mk.rank), e = r.effects.find(x => x.t === 'mark');
    w.dealDamage(src, dst, val(w, e.detonate.calc), 'magic', { ability: 'W', detonation: true });
  }
  /* Leona P: aliado detona a marca */
  const lm = dst.marks.LeonaP;
  if (lm && lm.until > w.t && info.ability !== 'P') {
    const lo = w.byId(lm.owner);
    if (lo && src.team === lo.team && src !== lo && !lo.dead) { delete dst.marks.LeonaP; const e = resP(w, lo).effects[0]; w.dealDamage(lo, dst, val(w, e.detonateByAlly.calc), 'magic', { ability: 'P' }); }
  }
  /* Morgana P: cura por dano de habilidade */
  if (src.name === 'Morgana' && info.ability && info.ability !== 'P' && info.dealt > 0) w.heal(src, info.dealt * pct(val(w, resP(w, src).effects[0].healFromDamage)), src);
}
/* Amumu P: maldição converte parte do dano mágico em verdadeiro */
function preDamage(w, src, dst, amount, type) {
  const c = dst.marks.AmumuCurse;
  if (type === 'magic' && c && c.until > w.t && c.frac > 0) return [[amount * (1 - pct(c.frac)), 'magic'], [amount * pct(c.frac), 'true']];
  return null;
}

module.exports = { launch, updateProjectiles, updateZones, stepDash, onDamage, preDamage, spawnHoming, attackHit, inCircle, inCone, distSegPoint, res, val, CONE_DEG, LEONA_R_OUTER };
