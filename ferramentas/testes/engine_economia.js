/* Bloco 5: farm, ouro e experiência (src/engine/economy). Sem navegador.
   node ferramentas/testes/engine_economia.js */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const { World } = E('sim/world.js'), ECO = E('economy/economy.js'), M = E('economy/minions.js'), { createLoader } = E('data/loader.js'), { xpToReach } = E('champion/stats.js');
let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra !== undefined && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const L = createLoader(), rules = L.rules();

/* ---------- minions: dados e crescimento ---------- */
{ const m = M.spec(L, 0, 'melee', 0), r = M.spec(L, 0, 'ranged', 0), s = M.spec(L, 1, 'siege', 0);
  T(m.hp === 430 && m.xp === 62 && m.gold === 20 && m.range === 110, 'melee: 430 PV, 62 XP, 20 de ouro, alcance 110 (registro do cliente)');
  T(r.hp === 275 && r.xp === 31 && r.gold === 14 && r.range === 550, 'caster: 275 PV, 31 XP, 14 de ouro, alcance 550');
  T(s.hp === 750 && s.xp === 75 && s.gold === 49, 'siege: 750 PV, 75 XP, 49 de ouro (time caos usa o mesmo registro)');
  T(M.upgrades(29) === 0 && M.upgrades(30) === 1 && M.upgrades(119) === 1 && M.upgrades(120) === 2 && M.upgrades(99999) === M.PARAMS.upgradesToCap, 'melhorias: a partir de 0:30, a cada 90 s, com teto');
  const a = M.spec(L, 0, 'melee', 600), b = M.spec(L, 0, 'melee', 1800), z = M.spec(L, 0, 'melee', 99999);
  T(a.hp > m.hp && b.hp > a.hp && near(z.hp, 430 + M.PARAMS.growth.melee.hp) && b.ad > a.ad, 'atributos crescem com o tempo até o teto (estimado, Wiki)');
  const g = t => M.spec(L, 0, 'siege', t).gold;
  T(g(840) === 59 && g(1500) === 66 && g(1800) === 69, 'ouro do siege = 49 + melhorias: 59 em 14:00, 66 em 25:00, 69 em 30:00 (confere com a tabela das regras)', g(840) + '/' + g(1500) + '/' + g(1800)); }

/* ---------- ondas ---------- */
{ const w = new World({ seed: 1 }), eco = ECO.enable(w), wt = eco.waveTimes;
  T(wt[0] === 30 && wt[1] === 60 && wt.filter(t => t < 840).every((t, i) => t === 30 + 30 * i), 'ondas: primeira em 0:30, a cada 30 s');
  const after = wt.filter(t => t >= 840), d1 = after[1] - after[0], l = wt.filter(t => t >= 1800);
  T(d1 === 25 && l.length > 2 && l[1] - l[0] === 20, 'ondas: a cada 25 s depois de 14:00 e a cada 20 s depois de 30:00', d1);
  const c = i => eco.composition(i, wt[i]);
  T(c(0).siege === 0 && c(1).siege === 0 && c(2).siege === 1 && c(5).siege === 1 && c(3).siege === 0 && c(0).melee === 3 && c(0).ranged === 3, 'composição: 3 melee + 3 caster; siege a partir de 1:30, a cada 3 ondas até 14:00');
  const late = wt.length - 1; T(eco.composition(late, wt[late]).siege === 1 && eco.composition(late, wt[late]).melee === 2 && eco.composition(late, wt[late]).ranged === 2, 'composição tardia: siege em toda onda, 1 melee e 1 caster a menos');
  w.run(33);
  T(w.units.filter(u => u.kind === 'minion').length > 0 && w.log.filter(e => e.type === 'wave').length === 1, 'onda nasce aos 30 s'); w.run(5);
  const mi = w.units.filter(u => u.kind === 'minion');
  T(mi.filter(u => u.team === 0).length === 6 && mi.filter(u => u.team === 1).length === 6, 'onda com 6 minions por time, nascendo com 0,792 s de intervalo');
  const t0 = w.log.filter(e => e.type === 'minion' && e.team === 0).map(e => e.t); T(near(t0[1] - t0[0], 0.792, 0.06), 'intervalo entre minions da onda', t0.join()); }

/* ---------- minions lutam e andam ---------- */
{ const w = new World({ seed: 5 }); ECO.enable(w); w.addChampion({ name: 'Garen', team: 0, pos: { x: 100, y: 100 } }).ai.enabled = false; w.addChampion({ name: 'Garen', team: 1, pos: { x: 5900, y: 5900 } }).ai.enabled = false;
  w.run(36); const before = w.units.filter(u => u.kind === 'minion' && u.team === 0).map(u => u.pos.x); w.run(1);
  const after = w.units.filter(u => u.kind === 'minion' && u.team === 0).map(u => u.pos.x);
  T(after.length === before.length && after.every((x, i) => x > before[i]), 'minions marcham pela rota rumo à base inimiga');
  w.run(60);
  const dead = w.log.filter(e => e.type === 'minion-lost').length;
  T(dead > 6 && w.units.some(u => u.kind === 'minion' && !u.dead), 'ondas se encontram e trocam dano (minions morrem sem ouro para ninguém: ' + dead + ')'); }

/* ---------- XP e níveis ---------- */
{ const w = new World({ seed: 1 }), eco = ECO.enable(w), u = w.addChampion({ name: 'Garen', team: 0, level: 1 }); u.ai.enabled = false;
  const hp1 = u.stats.hp.total, pts = u.abil.points;
  eco.grantXp(u, 279); T(u.level === 1, 'XP 279: continua no nível 1');
  eco.grantXp(u, 1); T(u.level === 2 && u.xp === 280, 'XP 280: sobe para o nível 2 (curva do cliente)');
  T(u.stats.hp.total > hp1 && u.abil.points === pts + 1 || u.abil.rank.Q + u.abil.rank.W + u.abil.rank.E + u.abil.rank.R === 2, 'subir de nível aumenta atributos e dá ponto de habilidade');
  eco.grantXp(u, xpToReach(rules, 6) - u.xp); T(u.level === 6 && u.abil.rank.R === 1, 'nível 6 libera a ultimate (autodistribuição)', u.abil.rank.R);
  eco.grantXp(u, 1e6); T(u.level === 18, 'nível máximo 18'); }
{ const w = new World({ seed: 1 }), eco = ECO.enable(w), a = w.addChampion({ name: 'Garen', team: 0, pos: { x: 1000, y: 1000 } }), b = w.addChampion({ name: 'Garen', team: 0, pos: { x: 1100, y: 1000 } }), far = w.addChampion({ name: 'Garen', team: 0, pos: { x: 4000, y: 1000 } }), foe = w.addChampion({ name: 'Garen', team: 1, pos: { x: 5000, y: 5000 } });
  [a, b, far, foe].forEach(u => { u.ai.enabled = false; });
  const mk = (t, team, x) => { const m = M.create(w, team, t, eco.lanes[0]); m.pos = { x, y: 1000 }; return m; };
  const m = mk('melee', 1, 1050); w.dealDamage(a, m, 1e6, 'true', {});
  T(near(a.stat.goldEarned, 20) && a.stat.cs === 1 && !b.stat.goldEarned, 'último golpe: só quem matou recebe o ouro (20) e conta CS');
  T(near(a.xp - xpToReach(rules, 1), 62 * ECO.xpShare(2), 1e-6) && near(b.xp, 62 * ECO.xpShare(2), 1e-6) && far.xp === 0, 'XP dividido só entre campeões ao alcance (2 campeões: ' + (62 * ECO.xpShare(2)).toFixed(2) + ' cada)', a.xp + '/' + b.xp);
  T(near(ECO.xpShare(1), 1) && near(ECO.xpShare(5), 0.217, 0.002), 'divisão de XP: 100% sozinho, 21,7% com 5 (âncoras da Wiki)');
  const m2 = mk('ranged', 1, 1050), g = a.stat.goldEarned; const ally = mk('melee', 0, 1050); w.dealDamage(ally, m2, 1e6, 'true', {});
  T(a.stat.goldEarned === g && w.log.some(e => e.type === 'minion-lost'), 'minion morto por outro minion: sem ouro para ninguém (XP continua)');
  const m3 = mk('siege', 1, 1050); w.dealDamage(a, m3, 1e6, 'true', {}); T(near(a.stat.goldEarned - g, 49), 'siege vale 49 de ouro no início'); }

/* ---------- ouro passivo ---------- */
{ const w = new World({ seed: 1 }), eco = ECO.enable(w), u = w.addChampion({ name: 'Garen', team: 0, gold: 500, pos: { x: 1000, y: 1000 } }); u.ai.enabled = false; w.addChampion({ name: 'Garen', team: 1, pos: { x: 5900, y: 5900 } }).ai.enabled = false;
  w.run(100); T(u.gold === 500, 'sem ouro passivo antes de 1:50'); w.run(100);
  T(near(u.gold - 500, (200 - 110) * 2.04, 0.5), 'ouro passivo: 20,4 a cada 10 s depois de 1:50 (' + (u.gold - 500).toFixed(1) + ')', u.gold); void eco; }

/* ---------- abate de campeão ---------- */
{ const w = new World({ seed: 1 }), eco = ECO.enable(w), k = w.addChampion({ name: 'Garen', team: 0, level: 5 }), as = w.addChampion({ name: 'Garen', team: 0, level: 5 }), v = w.addChampion({ name: 'Garen', team: 1, level: 6 }), v2 = w.addChampion({ name: 'Garen', team: 1, level: 6 });
  [k, as, v, v2].forEach(u => { u.ai.enabled = false; });
  w.dealDamage(as, v, 50, 'true', {}); w.dealDamage(k, v, 1e6, 'true', {});
  T(near(k.stat.goldEarned, 400) && near(as.stat.goldEarned, 150) , 'primeiro abate: 300 + 100 de primeiro sangue; assistente recebe metade da recompensa', k.stat.goldEarned + '/' + as.stat.goldEarned);
  const xpTab = rules.experiencia.xp_ao_matar_campeao_por_nivel[5];
  T(near(k.xp - xpToReach(rules, 5), xpTab / 2, 1e-6) && near(as.xp - xpToReach(rules, 5), xpTab / 2, 1e-6), 'XP de abate vem da tabela do cliente (nível 6 = ' + xpTab + '), dividido com o assistente');
  w.dealDamage(k, v2, 1e6, 'true', {}); T(near(k.stat.goldEarned, 700), 'segundo abate: 300 (sem primeiro sangue)', k.stat.goldEarned); }

/* ---------- recompensas por campeão (bounty) ---------- */
{ const w = new World({ seed: 2 }), eco = ECO.enable(w), k = w.addChampion({ name: 'Garen', team: 0, level: 9 }), v = w.addChampion({ name: 'Garen', team: 1, level: 6 }); [k, v].forEach(u => { u.ai.enabled = false; });
  k.stat.goldEarned = 0; const kill = n => { v.dead = false; v.hp = v.hpMax; v.streak = n; v.dsr = 0; v.cbty = 0; const g0 = k.stat.goldEarned || 0; w.dealDamage(k, v, 1e6, 'true', {}); return Math.round((k.stat.goldEarned || 0) - g0); };
  kill(0); const g = [1, 2, 3, 4, 5, 6, 7, 9].map(n => kill(n));
  T(g[0] === 300 && g[1] === 450 && g[2] === 600 && g[3] === 700 && g[4] === 800 && g[5] === 900 && g[6] === 1000 && g[7] === 1000, 'bounty por sequência da vítima: 1 abate 300, 2 abates 450, 3 abates 600 ... teto de 1000 por abate (300 + 700)', g.join(','));
  const k2 = w.addChampion({ name: 'Garen', team: 0, level: 5 }); k2.ai.enabled = false; v.dead = false; v.hp = v.hpMax; const f = eco.bountyOf(v); T(f.base === 100 || f.base === 300 - 50 * (v.dsr || 0) || f.base >= 100, 'valor base nunca cai abaixo de 100');
  const w2 = new World({ seed: 3 }), e2 = ECO.enable(w2), a = w2.addChampion({ name: 'Garen', team: 0 }), b = w2.addChampion({ name: 'Garen', team: 1 }); a.dsr = 9; T(e2.bountyOf(a).base === 100, 'feeder: depois de várias mortes seguidas o abate vale no mínimo 100');
  a.stat.cs = 100; b.stat.cs = 0; T(e2.bountyOf(a).tot === Math.floor(2100 / 150) * 50, 'farm: +50 de bounty a cada 150 de ouro de farm acima da média rival', e2.bountyOf(a).tot);
  a.streak = 7; a.cbty = 400; T(e2.bountyOf(a).pay === 700 && e2.bountyOf(a).tot > 700, 'pagamento limitado a 700 e o excedente fica acumulado'); }

/* ---------- laboratório de rota ---------- */
const lane = (seed, s0, s1, secs, champs = ['Ezreal', 'Ezreal']) => {
  const w = new World({ seed }); ECO.enable(w);
  const a = w.addChampion({ name: champs[0], team: 0, level: 1, pos: { x: 2000, y: 3000 }, gold: 500 }), b = w.addChampion({ name: champs[1], team: 1, level: 1, pos: { x: 4000, y: 3000 }, gold: 500 });
  a.ai.lastHit = s0; b.ai.lastHit = s1; [a, b].forEach(u => { u.ai.farm = true; u.ai.skip = ['Q', 'W', 'E', 'R']; }); w.run(secs); return { w, a, b };
};
{ let cs = 0, lv = 0, n = 6, gold = 0; const rs = [];
  for (let s = 1; s <= n; s++) { const { w, a, b } = lane(s, 1, 1, 300); cs += a.stat.cs + b.stat.cs; lv += a.level + b.level; gold += a.stat.goldEarned + b.stat.goldEarned; rs.push(w); }
  const csMin = cs / (2 * n) / 5, lvl = lv / (2 * n);
  T(csMin >= 2.5 && csMin <= 8, 'farm de rota (mirror, 5 min): ' + csMin.toFixed(1) + ' CS/min (faixa plausível 2,5–8)');
  T(lvl >= 4 && lvl <= 7, 'nível médio aos 5 min: ' + lvl.toFixed(1), lvl);
  console.log('     CS por campeão em 5 min: ' + (cs / (2 * n)).toFixed(1) + '; ouro ganho: ' + (gold / (2 * n)).toFixed(0)); }
{ let A = 0, B = 0; const n = 8; for (let s = 1; s <= n; s++) { const { a, b } = lane(s, 1, 0, 300); A += a.stat.cs; B += b.stat.cs; }
  T(A > B, 'habilidade de last hit importa: jogador preciso faz mais CS (' + (A / n).toFixed(1) + ' vs ' + (B / n).toFixed(1) + ')'); }
{ const { w, a, b } = lane(9, 1, 1, 240), g = w.log.filter(e => e.type === 'gold');
  const sum = id => g.filter(e => e.id === id).reduce((s, e) => s + e.amount, 0);
  const csGold = id => w.log.filter(e => e.type === 'gold' && e.id === id && e.why === 'cs').reduce((s, e) => s + e.amount, 0);
  T(near(sum(a.id) + (a.stat.passiveGold || 0), a.stat.goldEarned, 1e-3) && csGold(a.id) > 0, 'contabilidade de ouro: eventos + passivo = ouro ganho', sum(a.id) + ' ' + a.stat.goldEarned); void b; }
{ const A = lane(11, 1, 0.5, 200), B = lane(11, 1, 0.5, 200);
  T(A.w.hash() === B.w.hash() && A.w.hash().length > 0, 'laboratório de rota determinístico (hash ' + A.w.hash() + ')');
  T(A.w.units.every(u => isFinite(u.hp) && isFinite(u.pos.x)), 'nenhum NaN'); }

console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nHÁ FALHAS'); process.exit(ok ? 0 : 1);
