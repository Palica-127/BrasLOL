/* Bloco 8: IA e macro (src/engine/ai) + ciclo de vida do campeão (morte, renascimento, recall). Sem navegador.
   node ferramentas/testes/engine_ia.js */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const { World } = E('sim/world.js'), LIFE = E('sim/lifecycle.js'), A = E('ai/attributes.js'), BR = E('ai/brain.js'), M = E('ai/match.js'), LAY = E('map/layout.js');
const ECO = E('economy/economy.js'), STR = E('map/structures.js'), SHOP = E('items/shop.js');
let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra !== undefined && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- atributos -> parâmetros ---------- */
{ const lo = A.fromAttributes({ lane: 20, mec: 20, macro: 20, team: 20, mental: 20 }), hi = A.fromAttributes({ lane: 95, mec: 95, macro: 95, team: 95, mental: 95 }), df = A.fromAttributes({});
  T(hi.aim > lo.aim && hi.dodge > lo.dodge && hi.react < lo.react && hi.lastHit > lo.lastHit && hi.noise < lo.noise && hi.sync > lo.sync && hi.composure > lo.composure && hi.greed < lo.greed, 'atributos melhores -> mira, esquiva, reação, último golpe, leitura de mapa, sincronia e frieza melhores');
  T(hi.aim <= 0.97 && lo.aim >= 0.2 && hi.dodge <= 0.7 && lo.react <= 0.5 && hi.noise >= 0.03, 'parâmetros ficam dentro dos limites');
  T(near(df.lastHit, A.fromAttributes(A.DEFAULT).lastHit), 'sem atributos usa o padrão (60)');
  const a = A.fromAttributes({ mec: 100, lane: 0 }); T(a.aim > 0.9 && a.lastHit < 0.45, 'Mecânica e Lane são independentes (mira alta, último golpe baixo)'); }

/* ---------- tempo de morte (tabela da Wiki do motor legado) ---------- */
{ T(LIFE.deathTime(1, 0) === 10 && LIFE.deathTime(18, 0) === 52.5 && LIFE.deathTime(9, 0) === 28, 'tempo de morte base por nível: 10 s (nv 1), 28 s (nv 9), 52,5 s (nv 18)');
  T(near(LIFE.deathTime(10, 20 * 60), 32.5 * (1 + 4.25 / 100), 1e-9) && near(LIFE.deathTime(10, 35 * 60), 32.5 * (1 + 15.75 / 100), 1e-9), 'fator por minuto: +4,25% aos 20 min e +15,75% aos 35 min');
  T(near(LIFE.deathTime(18, 90 * 60), 52.5 * 1.5, 1e-9), 'o acréscimo tem teto de 50%'); }
{ const w = new World({ seed: 1, arena: { w: LAY.W, h: LAY.H } }); ECO.enable(w, { lanes: LAY.lanes(), waves: false }); STR.enable(w); w.respawn = true; w.winner = () => null;
  const u = w.addChampion({ name: 'Garen', team: 0, level: 5, pos: { x: 8000, y: 8000 } }), k = w.addChampion({ name: 'Garen', team: 1, level: 5, pos: { x: 8100, y: 8000 } }); u.ai.enabled = false; k.ai.enabled = false;
  w.dealDamage(k, u, 1e9, 'true', {}); const dt = LIFE.deathTime(5, w.t);
  T(u.dead && near(u.respawnAt - w.t, dt, 0.01) && w.log.some(e => e.type === 'death-timer' && e.id === u.id), 'morte agenda o renascimento no tempo da tabela (' + dt.toFixed(1) + ' s)');
  w.run(dt - 0.5); T(u.dead, 'continua morto antes do tempo'); w.run(1); T(!u.dead && u.hp === u.hpMax && dist(u.pos, w.structures.fountain[0]) < 1, 'renasce na fonte com vida cheia');
  T(w.log.some(e => e.type === 'respawn' && e.id === u.id), 'evento "respawn" registrado'); }

/* ---------- recall ---------- */
{ const w = new World({ seed: 1, arena: { w: LAY.W, h: LAY.H } }); ECO.enable(w, { lanes: LAY.lanes(), waves: false }); STR.enable(w); w.respawn = true; w.winner = () => null;
  const u = w.addChampion({ name: 'Garen', team: 0, level: 5, pos: { x: 8000, y: 8000 } }), e = w.addChampion({ name: 'Garen', team: 1, level: 5, pos: { x: 12000, y: 12000 } }); u.ai.enabled = false; e.ai.enabled = false;
  T(LIFE.startRecall(w, u), 'recall começa'); w.run(7.5); T(u.recall && dist(u.pos, w.structures.fountain[0]) > 1000, 'a canalização leva 8 s'); w.run(1); T(!u.recall && dist(u.pos, w.structures.fountain[0]) < 1 && w.log.some(e2 => e2.type === 'recall'), 'recall completo leva à fonte');
  u.pos = { x: 8000, y: 8000 }; LIFE.startRecall(w, u); w.run(3); w.dealDamage(e, u, 10, 'true', {}); w.run(0.2); T(!u.recall && w.log.some(e2 => e2.type === 'recall-cancel'), 'dano interrompe o recall');
  LIFE.startRecall(w, u); w.run(2); w.orderMove(u, 8500, 8000); w.run(0.2); T(!u.recall, 'mover-se cancela o recall'); }

/* ---------- caminhos ---------- */
{ const P = new BR.Path([{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }]);
  T(P.len === 2000 && near(P.project({ x: 500, y: 300 }).s, 500) && near(P.project({ x: 1300, y: 500 }).s, 1500) && near(P.at(1500).y, 500) && near(P.at(-5).x, 0) && near(P.at(1e9).y, 1000), 'Path: projeção, ponto por distância e limites'); }

/* ---------- montagem da partida ---------- */
const mkGame = (seed = 1, teams) => M.createGame({ seed, teams });
{ const g = mkGame(); const [a, b] = g.brains;
  T(a.players.length === 5 && b.players.length === 5 && a.players.map(p => p.role).join() === 'top,jungle,mid,adc,support', 'cada time tem 5 jogadores (top, selva, meio, atirador, suporte)');
  T(a.players.map(p => p.lane).join() === 'top,,mid,bot,bot' && a.players[1].u.smite, 'rotas: top/meio/bot; só o caçador tem Golpear');
  T(a.players.every(p => dist(p.u.pos, g.w.structures.fountain[0]) < 300) && b.players.every(p => dist(p.u.pos, g.w.structures.fountain[1]) < 300), 'todos começam na fonte do próprio time');
  T(a.players.every(p => p.build && p.build.items.length >= 4 && p.u.items.length > 0 && p.u.gold < 500), 'compra inicial feita com o ouro de partida (500)');
  T(a.players.every(p => p.u.ai.brain && p.u.ai.enabled === false), 'campeões da IA de macro não usam a micro-IA de teste sozinha'); }

/* ---------- rota: posição, torres e último golpe ---------- */
{ const g = mkGame(1); const w = g.w; g.brains.forEach(b => { b.plan = function () { this.goal = { kind: 'lane', sc: 1, mem: new Set() }; }; });
  w.run(90); let on = 0, tot = 0;
  for (let i = 0; i < 40; i++) { w.run(3); [0, 1].forEach(t => g.brains[t].players.filter(p => p.lane && !p.u.dead).forEach(p => { tot++; if (g.brains[t].paths[p.lane].project(p.u.pos).d < 700) on++; })); }
  T(on / tot > 0.75, 'entre 1:30 e 3:30 os laners ficam perto da própria rota (' + (100 * on / tot).toFixed(0) + '% das amostras)');
  const jg = g.brains[0].players[1]; T(jg.mode === 'jungle' || jg.mode === 'base' || jg.mode === 'recall', 'o caçador está na selva ou se curando', jg.mode);
  let under = 0, n = 0; for (let i = 0; i < 160; i++) { w.run(3); g.brains.forEach((b, t) => b.players.filter(p => p.lane && p.role !== 'support' && !p.u.dead).forEach(p => { n++; if (b.underEnemyTurret(p.u.pos)) under++; })); }
  T(under / n < 0.03, 'laners ficam fora do alcance da torre inimiga (' + (100 * under / n).toFixed(1) + '% do tempo sob torre em 8 min)');
  const cs = [0, 1].map(t => g.brains[t].players.filter(p => ['top', 'mid', 'adc'].includes(p.role)).reduce((s, p) => s + (p.u.stat.cs || 0), 0) / 3 / (w.t / 60));
  T(cs[0] >= 1 && cs[1] >= 1, 'laners acertam último golpe: ' + cs.map(x => x.toFixed(1)).join(' e ') + ' CS/min (Bloco 10 calibra a meta)');
  console.log('     recalls: ' + g.brains.map(b => b.stats.recalls).join('/') + '; compras: ' + w.log.filter(e => e.type === 'buy').length); }

/* ---------- atributos mudam o resultado do farm ---------- */
{ const run = (seed, lane) => { const rosters = A_ => M.ROSTERS.A.map(r => ({ ...r, attrs: { lane: A_, mec: 60, macro: 60, team: 60, mental: 60 } }));
    const g = mkGame(seed, [{ roster: rosters(lane) }, { roster: M.ROSTERS.B }]); g.brains.forEach(b => { b.plan = function () { this.goal = { kind: 'lane', sc: 1, mem: new Set() }; }; }); g.w.run(480);
    return g.brains[0].players.filter(p => ['top', 'mid', 'adc'].includes(p.role)).reduce((s, p) => s + (p.u.stat.cs || 0), 0); };
  const hi = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(s => run(s, 95)), lo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(s => run(s, 15)), sum = a => a.reduce((x, y) => x + y, 0);
  T(sum(hi) > sum(lo), 'Lane alto faz mais CS que Lane baixo (' + sum(hi) + ' vs ' + sum(lo) + ' CS em 16 sementes, 8 min)'); }

/* ---------- decisão de luta ---------- */
{ const g = mkGame(1); const w = g.w, b = g.brains[0], p = b.players[2], u = p.u; w.winner = () => null;
  const e = g.brains[1].players[2].u; u.pos = { x: 7000, y: 7000 }; e.pos = { x: 7400, y: 7000 };
  const strong = lvl => { u.level = lvl; w.refresh(u); u.hp = u.hpMax; };
  e.level = 3; w.refresh(e); e.hp = e.hpMax; strong(14);
  b.fight(p, [e], [u]); T(p.mode === 'fight' && u.ai.focus === e, 'com poder muito maior, o jogador entra na luta e mira o inimigo');
  u.level = 2; w.refresh(u); u.hp = u.hpMax * 0.5; e.level = 14; w.refresh(e); e.hp = e.hpMax; p.mode = 'lane'; u.ai.focus = null;
  b.fight(p, [e], [u]); T(p.mode === 'retreat', 'com poder muito menor, o jogador recua'); }
{ const g = mkGame(1), a = g.brains[0], rA = a.risk(); g.brains[0].style = 'ag'; const thAg = a.theta(); g.brains[0].style = 'es'; const thEs = a.theta();
  T(thAg < thEs, 'estilo agressivo aceita lutar com menos vantagem que o de escalonamento (limiar ' + thAg.toFixed(2) + ' < ' + thEs.toFixed(2) + ')');
  g.brains[0].style = 'ma'; const r0 = a.risk(); a.players.forEach(p => { p.u.stat.goldEarned = 9000; }); T(a.risk() < r0, 'estar à frente em ouro reduz o risco assumido? (lê gd como vantagem: ' + a.risk().toFixed(2) + ' vs ' + r0.toFixed(2) + ')'); void rA; }
{ const names = ['Garen', 'Amumu', 'Ahri', 'Ezreal', 'Leona'], L = M.ROSTERS; const w = new World({ seed: 1 });
  const a = BR.styleFromComp(['Garen', 'Amumu', 'Malphite', 'Leona', 'Morgana'].map(n => w.loader.champion(n)), 2), b = BR.styleFromComp(['Ahri', 'Annie', 'Ezreal', 'Morgana', 'Leona'].map(n => w.loader.champion(n)), 0);
  T(Object.keys(BR.STYLES).includes(a) && Object.keys(BR.STYLES).includes(b), 'estilo pela composição devolve um estilo válido (' + a + ', ' + b + ')'); void names; void L; }

/* ---------- objetivos e estruturas ---------- */
{ const g = mkGame(2); const w = g.w; M.play(g, { until: 20 * 60 });
  const goals = w.log.filter(e => e.type === 'goal'); T(goals.some(e => e.gk === 'obj') && goals.some(e => e.gk === 'defend'), 'em 20 min a equipe escolhe objetivos e defesa como meta (' + goals.length + ' mudanças de meta)');
  const kills = w.log.filter(e => e.type === 'monster-kill' && /dragon|baron|riftherald|horde/.test(e.mkey)); T(kills.length >= 1, 'pelo menos um objetivo épico foi derrubado em 20 min (' + kills.length + ')');
}

/* ---------- partida completa ---------- */
{ const res = [1, 2, 3].map(s => { const g = mkGame(s), r = M.play(g, { until: 3600 }); return { g, r }; });
  T(res.every(x => x.r.winner !== null), 'todas as partidas terminam por Nexus antes de 60 min (' + res.map(x => Math.round(x.r.t / 60) + ' min').join(', ') + ')');
  T(res.every(x => x.g.w.log.filter(e => e.type === 'structure-fall' && e.sub === 'turret').length >= 4), 'torres caem ao longo de cada partida (' + res.map(x => x.g.w.log.filter(e => e.type === 'structure-fall' && e.sub === 'turret').length).join(', ') + ')');
  T(res.every(x => x.g.w.log.some(e => e.type === 'game-end') && x.g.w.structures.over.winner === x.r.winner), 'o vencedor é o dono do Nexus em pé (evento game-end)');
  T(res.every(x => x.r.t > 12 * 60), 'nenhuma partida acaba antes de 12 min (duração real: ' + res.map(x => (x.r.t / 60).toFixed(1)).join(', ') + ' min)');
  T(res.every(x => x.g.w.units.length < 300), 'não sobram centenas de minions parados no mapa (' + res.map(x => x.g.w.units.length).join(', ') + ' unidades)');
  const s1 = res[0].g.brains.map(b => b.stats);
  console.log('     partida 1: abates ' + res[0].g.brains.map(b => b.players.reduce((s, p) => s + p.u.stat.kills, 0)).join('-') + '; metas ' + JSON.stringify(s1.map(s => s.goals)) + '; ganks ' + s1.map(s => s.ganks).join('/') + '; recalls ' + s1.map(s => s.recalls).join('/') + '; ' + res[0].r.ms + ' ms');
  T(res.every(x => [...x.g.w.units, ...x.g.w.structs].every(u => isFinite(u.hp) && isFinite(u.pos.x) && isFinite(u.pos.y))), 'nenhum NaN no estado final');
  const a = M.createGame({ seed: 5 }), b = M.createGame({ seed: 5 }); M.play(a, { until: 900 }); M.play(b, { until: 900 }); T(a.w.hash() === b.w.hash(), 'partida determinística por semente (hash ' + a.w.hash() + ')');
  const c = M.createGame({ seed: 6 }); M.play(c, { until: 900 }); T(c.w.hash() !== a.w.hash(), 'sementes diferentes dão partidas diferentes'); }

console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nHÁ FALHAS'); process.exit(ok ? 0 : 1);
