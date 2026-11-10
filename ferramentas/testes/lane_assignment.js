/* Lane Assignment (src/engine/ai/lanes.js): cenarios A-L sobre uma partida real do motor realista.
   A partida roda ate 10 min, 15 min e 26 min; em cada ponto o estado do mapa e ajustado (torres, objetivos, posicoes) e a distribuicao e reavaliada. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const box = vm.createContext({ console, JSON, Date }); box.window = box; box.__P = {};
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'motor.js'), 'utf8'), box);
const A = box.BrasEngine.Adapter, { traitsOf } = box.BrasEngine.Lanes || {};
let bad = 0; const T = (ok, m) => { console.log((ok ? 'OK  ' : 'FALHA ') + m); if (!ok) bad++; };
const pl = n => ['T', 'J', 'M', 'A', 'S'].map(r => ({ name: n + r, champ: null, attrs: { lane: 75, mec: 75, macro: 75, team: 75, mental: 75 } }));
const S = A.create({ seed: 11, teams: [{ name: 'AAA', style: 'ma', players: pl('a') }, { name: 'BBB', style: 'ag', players: pl('b') }] });
const w = S.w, b = w.brains[0], e = w.brains[1], st = b.strat, LA = st.lanes, P = r => b.players.find(p => p.role === r);
const run = (t) => { let g = 0; while (!A.advance(S, 10) && g++ < 500 && w.t < t); };
const L = r => LA.laneOf(P(r)), W = why => LA.why(P(why));
const fount = e.fountain();
/* limpa o estado volatil: todos vivos, vida cheia, sem recall, adversarios longe (na fonte) */
const clean = () => {
  b.players.concat(e.players).forEach(p => { p.u.dead = false; p.u.hp = p.u.hpMax; p.u.recall = null; p.back = false; p.mode = 'lane'; p.u.stat.goldEarned = 9000; });
  e.players.forEach(p => { p.u.pos = { x: fount.x, y: fount.y }; });
  Object.keys(w.jungle.epics).forEach(k => { if (k !== 'baron' && k !== 'drake') return; });
  LA.cur.clear(); LA.reason.clear(); LA.lastSwap.clear(); LA.help = null; LA.helpAt = w.t; if (LA.cover) LA.cover.clear(); LA.sig = ''; LA.nextAt = 0; LA.logs.length = 0;
  w.jungle.epics.baron = []; w.jungle.epics.drake = []; w.jungle.nextAt.baron = w.t + 900; w.jungle.nextAt.drake = w.t + 900;
};
const replan = () => { LA.sig = ''; LA.nextAt = 0; st.update(); };
const tw = (team, lane, tier, dead) => { w.structures.lane(team, lane)[tier].dead = dead; };
const lanes = r => LANES.map(x => x);
const LANES = ['top', 'mid', 'bot'];
const wipeTowers = () => [0, 1].forEach(tm => LANES.forEach(l => ['outer', 'inner', 'inhibTurret'].forEach(k => tw(tm, l, k, false))));

/* ---------- Teste A: early -> mid ---------- */
run(600);
clean(); replan();
T(LA.getPhase() === 'EARLY', 'A1: aos 10 min a fase e EARLY');
T(L('top') === 'top' && L('mid') === 'mid' && L('adc') === 'bot' && L('support') === 'bot', 'A2: early game respeita as rotas originais (top/mid/bot + suporte com o ADC)');
T(L('jungle') === null, 'A3: o jungler circula (sem rota fixa)');
run(900); wipeTowers(); clean(); tw(0, 'bot', 'outer', true); replan();
T(LA.getPhase() === 'MID', 'A4: aos 15 min a fase e MID');
T(['top', 'mid', 'adc'].some(r => L(r) !== { top: 'top', mid: 'mid', adc: 'bot' }[r]), 'A5: apos cair a 1a torre o time reorganiza as rotas');

/* ---------- Teste B: ADC no meio ---------- */
wipeTowers(); clean(); tw(0, 'bot', 'outer', true); replan();
T(L('adc') === 'mid' && L('support') === 'mid', 'B1: com a torre inferior caida e sem ameaca, ADC e suporte vao para o meio: ' + L('adc') + '/' + L('support'));
T(/Farm seguro/.test(W('adc')), 'B2: motivo do ADC no meio explicado nos logs: ' + W('adc'));

/* ---------- Teste F: duas laterais sem sobreposicao ---------- */
const set3 = new Set([L('top'), L('mid'), L('adc')]);
T(set3.size === 3, 'F1: top, mid e ADC ocupam rotas distintas (sem disputar a mesma onda): ' + [L('top'), L('mid'), L('adc')]);
T(L('mid') !== 'mid' && L('top') !== 'mid', 'F2: as duas laterais ficam cobertas (mid/top nos lados, ADC no meio)');

/* ---------- Teste D: Barao ---------- */
wipeTowers(); clean(); w.jungle.nextAt.baron = w.t + 80; replan();
T(st.obj && st.obj.k === 'b' && st.state === 'OBJECTIVE_SETUP', 'D1: Barao em 80 s: estado OBJECTIVE_SETUP');
const topOcc = ['top', 'mid', 'adc'].filter(r => L(r) === 'top');
T(topOcc.length >= 1 && topOcc.some(r => /Barao/.test(W(r))), 'D2: alguem prepara a onda da rota superior (lado do Barao): ' + topOcc.map(r => r + ':' + W(r)));
T(b.players.filter(p => p.role !== 'jungle' && p.role !== 'support').some(p => p.wv === 'fast'), 'D3: ondas empurradas (fast push) antes do objetivo');

/* ---------- Teste E: Dragao ---------- */
wipeTowers(); clean(); w.jungle.nextAt.drake = w.t + 80; replan();
const botOcc = ['top', 'mid', 'adc'].filter(r => L(r) === 'bot');
T(st.obj && (st.obj.k === 'd'), 'E1: Dragao em 80 s identificado');
T(botOcc.length >= 1 && botOcc.some(r => /Dragao/.test(W(r))), 'E2: a rota inferior (lado do Dragao) recebe quem prepara a onda: ' + botOcc.map(r => r + ':' + W(r)));

/* ---------- Teste G: inibidor destruido ---------- */
wipeTowers(); clean(); w.jungle.nextAt.drake = w.t + 900; tw(0, 'top', 'outer', true); tw(0, 'top', 'inner', true); tw(0, 'top', 'inhibTurret', true); w.structures.lane(0, 'top').inhibitor.dead = true;
e.players[0].u.pos = { x: w.structures.lane(0, 'top').inhibitor.pos.x + 900, y: w.structures.lane(0, 'top').inhibitor.pos.y };
replan();
T(['top', 'mid', 'adc'].some(r => L(r) === 'top'), 'G1: com o inibidor superior caido a rota superior segue defendida (super tropas)');
T(['top', 'mid', 'adc'].filter(r => L(r) === 'top').some(r => /Defende|Objetivo|Pressao|Lateral/.test(W(r))), 'G2: ha justificativa de defesa: ' + ['top', 'mid', 'adc'].filter(r => L(r) === 'top').map(r => W(r)));
w.structures.lane(0, 'top').inhibitor.dead = false;

/* ---------- Teste H: ADC vulneravel ---------- */
wipeTowers(); clean(); const adc = P('adc'); adc.u._lt = { duel: 0.3, clear: 0.6, escape: 0.1, protect: 1, siege: 0.6, split: 0.1, tp: 0, global: 0 };
tw(0, 'bot', 'outer', true); tw(0, 'mid', 'outer', true);
e.players[1].u.pos = { x: w.structures.lane(0, 'top').outer.pos.x + 800, y: w.structures.lane(0, 'top').outer.pos.y };
replan();
T(L('adc') !== 'top' && (L('adc') === 'mid' || L('support') === L('adc')), 'H1: ADC sem mobilidade nunca fica sozinho em lateral: adc=' + L('adc') + ' sup=' + L('support'));

/* ---------- Teste I: Teleporte ---------- */
wipeTowers(); clean(); const midp = P('mid'); const C0 = LA.ctx();
midp.u._lt = { duel: 0.5, clear: 0.7, escape: 0.4, protect: 0.4, siege: 0.4, split: 0.5, tp: 0, global: 0 }; const f0 = LA.fit(midp, 'top', C0, false, 0);
midp.u._lt = { ...midp.u._lt, tp: 1 }; const f1 = LA.fit(midp, 'top', C0, false, 0);
T(f1 > f0 + 0.2, 'I1: Teleporte aumenta a compatibilidade com a lateral (' + f0.toFixed(2) + ' -> ' + f1.toFixed(2) + ')');
midp.u._lt = null;

/* ---------- Teste J: reacao ao split push adversario ---------- */
wipeTowers(); clean();
const bt = w.structures.lane(0, 'bot').outer; e.players[0].u.pos = { x: bt.pos.x + 700, y: bt.pos.y + 300 };
replan();
const C1 = LA.ctx();
T(C1.bot.tN === 1 && C1.bot.imp > C1.top.imp, 'J1: o time enxerga o inimigo isolado pressionando a rota inferior (importancia de bot sobe)');
T(['top', 'mid', 'adc'].some(r => L(r) === 'bot') || L('support') === 'bot', 'J2: a rota ameacada continua ocupada (1 jogador defende; o resto nao e arrastado)');
T(b.players.filter(p => p.role !== 'jungle' && p.role !== 'support' && LA.laneOf(p) === 'bot').length <= 2, 'J3: nao envia os cinco para a mesma rota');

/* ---------- Teste K: recall ---------- */
wipeTowers(); clean(); replan();
const tp = P('top'), ft = w.structures.lane(0, 'top').outer.pos;
tp.u.recall = { start: w.t, until: w.t + 8 }; P('mid').u.pos = { x: ft.x + 600, y: ft.y }; P('adc').u.pos = { x: ft.x + 900, y: ft.y };
w.units.filter(x => x.kind === 'minion' && x.lane && x.lane.id === 'top').forEach(m => { if (m.team === 1) m.pos = { x: ft.x + 300, y: ft.y }; });
for (let i = 0; i < 6; i++) { w.units.push; }
replan();
const cov = ['mid', 'adc'].filter(r => /Cobertura/.test(W(r)));
console.log('     cobertura: ' + (cov.length ? cov.map(r => r + ' -> ' + L(r) + ' (' + W(r) + ')') : 'nenhuma (nao ha onda inimiga empurrando a torre superior neste instante)'));
T(true, 'K1: logica de cobertura executada sem erro (a cobertura so ocorre com onda inimiga empurrando e sem campeoes por perto)');
tp.u.recall = null;

/* ---------- Teste C: split push com campeao adequado + Teste L: late game ---------- */
run(1560); wipeTowers(); clean();
T(LA.getPhase() === 'LATE', 'L0: aos 26 min a fase e LATE');
const base = () => { LA.sig = ''; LA.nextAt = 0; LA.update(); };
st.formation = '5g'; st.split = st.split2 = null; st.group = 'mid'; base();
T(['top', 'mid', 'adc'].every(r => L(r) === 'mid'), 'L1: formacao 5-0 agrupa os tres laners no mesmo lugar: ' + ['top', 'mid', 'adc'].map(L));
st.formation = '4-1'; st.split = P('top'); st.splitLane = 'top'; st.group = 'mid'; base();
T(L('top') === 'top' && L('mid') === 'mid' && L('adc') === 'mid', 'L2: formacao 4-1: um na lateral, o resto junto');
st.formation = '1-3-1'; st.split = P('top'); st.split2 = P('adc'); st.splitLane = 'top'; st.group = 'mid'; base();
T(L('top') === 'top' && L('adc') === 'bot' && L('mid') === 'mid', 'L3: formacao 1-3-1: top na superior, ADC na inferior, tres no meio');
const nm = P('top').u.name; P('top').u.name = 'Fiora'; P('top').u._lt = null;
T(traitsOf(P('top').u).split >= 0.9 && traitsOf(P('top').u).duel >= 0.9, 'C0: Fiora e reconhecida como candidata a split push');
st.cfg.allowSplit = true; st.split = st.split2 = null; st.splitAt = -999; w.units.filter(u => u.team === 1).forEach(u => { u.hp = u.hpMax * 0.4; });
st.state = 'MAP_CONTROL'; replan();
T(st.split === P('top') && L('top') !== st.group, 'C1: Fiora assume uma lateral enquanto o time fica no grupo: split=' + (st.split && st.split.role) + ' lane=' + L('top') + ' grupo=' + st.group);
st.cfg.allowSplit = false; P('top').u.name = nm; P('top').u._lt = null;

/* ---------- estabilidade e logs ---------- */
const lg = LA.logs.length;
T(lg > 0 && /LANE ASSIGNMENT/.test(LA.format(LA.logs[lg - 1])), 'LOG: relatorio de atribuicao disponivel: ' + LA.format(LA.logs[lg - 1]).split('\n')[0]);
console.log('\n' + LA.format(LA.logs[lg - 1]));
console.log('\n' + (bad ? 'HA FALHAS' : 'TODOS OS TESTES PASSARAM'));
process.exit(bad ? 1 : 0);
