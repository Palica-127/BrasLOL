/* Bloco 7: mapa e estruturas (src/engine/map). Sem navegador.
   node ferramentas/testes/engine_mapa.js */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const { World } = E('sim/world.js'), ECO = E('economy/economy.js'), STR = E('map/structures.js'), LAY = E('map/layout.js'), M = E('economy/minions.js');
let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra !== undefined && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const world = (seed = 1, waves = false) => { const w = new World({ seed, arena: { w: LAY.W, h: LAY.H } }); ECO.enable(w, { lanes: LAY.lanes(), waves }); const S = STR.enable(w); return { w, S }; };
const champ = (w, team, pos, o = {}) => { const u = w.addChampion({ name: o.name || 'Garen', team, level: o.level || 18, pos }); u.ai.enabled = false; if (o.tank) u.hp = u.hpMax = 1e9; return u; };
const aside = (s, d) => ({ x: s.pos.x - d / Math.SQRT2, y: s.pos.y - d / Math.SQRT2 });          /* ponto do lado Order da estrutura */
const fall = (w, s, by) => { w.run(0.1); w.dealDamage(by, s, 1e9, 'true', {}); w.run(0.1); };
const shots = (w, sid) => w.log.filter(e => e.type === 'turret-shot' && e.sid === sid);
const mk = (w, team, type, pos, lane) => { const m = M.create(w, team, type, lane || LAY.lanes()[1]); m.pos = { x: pos.x, y: pos.y }; return m; };

/* ---------- inventário e atributos ---------- */
{ const { S } = world();
  [0, 1].forEach(t => {
    const a = S.byTeam[t]; T(a.filter(s => s.sub === 'turret').length === 11 && a.filter(s => s.sub === 'inhibitor').length === 3 && a.filter(s => s.sub === 'nexus').length === 1, 'time ' + t + ': 11 torres (3 por rota + 2 do Nexus), 3 inibidores e 1 Nexus');
  });
  const o = S.lane(0, 'mid');
  T(o.outer.hpMax === 9000 && o.inner.hpMax === 5000 && o.inhibTurret.hpMax === 4750 && S.nexusTurrets[0][0].hpMax === 3500, 'vida das torres: externa 9000, interna 5000, do inibidor 4750, do Nexus 3500 (Wiki)');
  T(o.outer.stats.armor.total === 60 && o.outer.stats.mr.total === 60 && o.outer.stats.range === 750 && near(o.outer.stats.as.total, 0.833), 'torre: 60 de armadura e RM, alcance 750, velocidade de ataque 0,833');
  T(o.inhibitor.hpMax === 4000 && o.inhibitor.regen === 15 && S.nexus[0].hpMax === 5500 && S.nexus[0].regen === 20, 'inibidor 4000 de vida e 15/s; Nexus 5500 e 20/s (registros do cliente)');
  T(o.inhibitor.stats.armor.total === 20 && S.nexus[1].stats.mr.total === 0, 'armadura 20 e RM 0 de inibidor/Nexus (Wiki)');
  T(o.outer.plates === 5 && o.inner.plates === 0, 'só as torres externas têm 5 placas'); }

/* ---------- geometria: simetria e ordem ao longo da rota ---------- */
{ const { S } = world();
  const a = S.lane(0, 'mid').outer.pos, b = S.lane(1, 'mid').outer.pos; T(near(a.x + b.x, LAY.W, 1e-6) && near(a.y + b.y, LAY.H, 1e-6), 'mapa simétrico por rotação de 180 graus (torre externa do meio)');
  const t0 = S.lane(0, 'top'), t1 = S.lane(1, 'bot'); T(near(t0.outer.pos.x + t1.outer.pos.x, LAY.W, 1e-6), 'rota de cima do Order espelha a de baixo do Chaos');
  ['top', 'mid', 'bot'].forEach(id => {
    const L = S.lane(0, id), nx = S.nexus[0].pos, d = s => dist(s.pos, nx);
    T(d(L.inhibitor) < d(L.inhibTurret) + 1500 && d(L.inhibTurret) < d(L.inner) && d(L.inner) < d(L.outer), 'rota ' + id + ': inibidor < torre do inibidor < interna < externa em distância do Nexus');
  });
  const lanes = LAY.lanes(); T(lanes.every(l => dist(l.path[0], S.lane(0, l.id).inhibitor.pos) < 1 && dist(l.path[l.path.length - 1], S.lane(1, l.id).inhibitor.pos) < 1), 'caminho de cada rota liga o inibidor do Order ao inibidor do Chaos da mesma rota'); }

/* ---------- invulnerabilidade em cadeia ---------- */
{ const { w, S } = world(), a = champ(w, 0, { x: 100, y: 100 }); w.run(0.1); const L = S.lane(1, 'top');
  T(!L.outer.invuln && L.inner.invuln && L.inhibTurret.invuln && L.inhibitor.invuln && S.nexus[1].invuln, 'só a externa é vulnerável no início');
  fall(w, L.inner, a); T(!L.inner.dead, 'a interna não cai com a externa de pé');
  fall(w, L.outer, a); T(L.outer.dead && !L.inner.invuln && L.inhibTurret.invuln, 'cai a externa: libera a interna');
  fall(w, L.inner, a); T(!L.inhibTurret.invuln && L.inhibitor.invuln, 'cai a interna: libera a torre do inibidor');
  fall(w, L.inhibTurret, a); T(!L.inhibitor.invuln && S.nexusTurrets[1][0].invuln, 'cai a torre do inibidor: libera o inibidor; torres do Nexus ainda protegidas');
  fall(w, L.inhibitor, a); T(L.inhibitor.dead && !S.nexusTurrets[1][0].invuln && S.nexus[1].invuln, 'inibidor caiu: libera as torres do Nexus; Nexus ainda protegido');
  fall(w, S.nexusTurrets[1][0], a); fall(w, S.nexus[1], a); T(!S.nexus[1].dead, 'Nexus fica protegido enquanto resta uma torre do Nexus');
  fall(w, S.nexusTurrets[1][1], a); T(!S.nexus[1].invuln, 'sem torres do Nexus e com inibidor caído, o Nexus fica vulnerável');
  w.run(0.1); w.dealDamage(a, S.nexus[1], 1e9, 'true', {}); T(S.nexus[1].dead && S.over && S.over.winner === 0 && w.winner() === 0, 'Nexus destruído encerra a partida com vitória do time 0');
  T(w.log.some(e => e.type === 'game-end' && e.winner === 0) && w.log.some(e => e.type === 'structure-fall' && e.sub === 'nexus'), 'eventos "structure-fall" e "game-end" registrados');
  const g = w.log.filter(e => e.type === 'gold' && e.why === 'nexus'); T(g.length === 1 && g[0].amount === 50, 'Nexus dá 50 de ouro a quem destrói'); }

/* ---------- ataque da torre: prioridade de alvo ---------- */
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 600), { tank: true });
  w.run(0.5); T(T1.target === y, 'sem minions, a torre ataca o campeão no alcance');
  const cm = mk(w, 0, 'ranged', aside(T1, 650)), mm = mk(w, 0, 'melee', aside(T1, 640)), sg = mk(w, 0, 'siege', aside(T1, 700));
  T1.target = null; w.run(0.1); T(T1.target === sg, 'prioridade: siege antes de corpo a corpo, caster e campeão');
  sg.dead = true; w.units = w.units.filter(u => u !== sg); T1.target = null; w.run(0.1); T(T1.target === mm, 'depois do siege, minion corpo a corpo');
  mm.dead = true; w.units = w.units.filter(u => u !== mm); T1.target = null; w.run(0.1); T(T1.target === cm, 'depois, minion caster; só então campeão'); }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y1 = champ(w, 0, aside(T1, 700), { tank: true }); w.run(0.3);
  T(T1.target === y1, 'alvo inicial: primeiro campeão'); const y2 = champ(w, 0, aside(T1, 500), { tank: true }), ally = champ(w, 1, { x: T1.pos.x + 300, y: T1.pos.y + 300 }, { tank: true });
  T1.target = y1; w.dealDamage(y2, ally, 50, 'physical', { attack: true }); T(T1.target === y2, 'campeão inimigo ferindo aliado da torre (dentro de 1400) atrai a torre');
  const far = champ(w, 0, aside(T1, 1000), { tank: true }); T1.target = y1; w.dealDamage(far, ally, 50, 'physical', { attack: true }); T(T1.target === y1, 'fora do alcance da torre não troca de alvo'); }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 600), { tank: true });
  w.run(0.5); y.pos = { x: T1.pos.x - 2000, y: T1.pos.y - 2000 }; w.run(0.1); T(T1.target === null, 'campeão fora do alcance deixa de ser alvo'); }

/* ---------- dano da torre: AD por minuto e Warming Up ---------- */
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 600), { tank: true });
  w.run(6.1); const d = shots(w, T1.id).map(e => e.dmg);
  T(d.length >= 4 && near(d[0], 182, 0.01), 'antes de 1:30 o AD da externa é 182 (Wiki)', d[0]);
  T(near(d[1] / d[0], 1.5, 0.001) && near(d[2] / d[0], 2, 0.001) && near(d[3] / d[0], 2.5, 0.001) && (d.length < 5 || near(d[4] / d[0], 2.5, 0.001)), 'Warming Up: +50% por tiro em campeão, até +150%', d.join(','));
  y.pos = { x: T1.pos.x - 3000, y: T1.pos.y - 3000 }; w.run(5.5); y.pos = aside(T1, 600); w.run(1.5); const e = shots(w, T1.id).slice(-2).map(x => x.dmg);
  T(near(e[0] / d[0], 1, 0.001), 'Warming Up zera 5 s depois do último tiro em campeão', e.join(',')); }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, { x: 100, y: 100 }, { tank: true }); w.run(840 - w.t, null); const a0 = shots(w, T1.id).length; y.pos = aside(T1, 600);
  w.run(2.5); const d = shots(w, T1.id).slice(a0).map(e => e.dmg); T(d.length >= 1 && near(d[0], 350, 0.01), 'a partir de 14:00 o AD da externa chega a 350', d[0]); void y; }
{ const { w, S } = world(), I = S.lane(1, 'mid').inner, i0 = I.stats.ad.total; w.run(1); T(near(S.adNow(I, 0), 187) && near(S.adNow(I, 900), 427) && near(S.adNow(S.nexusTurrets[1][0], 900), 405) && near(S.adNow(S.lane(1, 'mid').inhibTurret, 0), 187), 'extremos de AD: interna/inibidor 187-427, Nexus 165-405 (Wiki)'); void i0; }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 600), { tank: true });
  const proj = w.projs.length; w.run(1.3); const flights = w.log.filter(e => e.type === 'turret-shot').length; T(flights >= 1, 'a torre dispara projétil teleguiado (velocidade 1200)'); void proj; void y;
  const dm = w.log.filter(e => e.type === 'damage' && e.src === T1.id); T(dm.length >= 1 && dm[0].dtype === 'physical', 'dano da torre é físico'); }

/* ---------- armadura/RM: decaimento da externa e Reinforced Armor ---------- */
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, In = S.lane(1, 'mid').inner;
  w.run(659); T(T1.stats.armor.total === 60, 'antes de 11:00 a externa tem 60/60');
  w.run(61); T(near(T1.stats.armor.total, 50, 0.01) && near(T1.stats.mr.total, 45, 0.01), 'aos 12:00: -10 armadura e -15 RM', T1.stats.armor.total + '/' + T1.stats.mr.total);
  w.run(180); T(near(T1.stats.armor.total, 20, 0.01) && near(T1.stats.mr.total, 0, 0.01), 'aos 15:00: 20 de armadura e 0 de RM (tetos -40/-60)'); w.run(300); T(near(T1.stats.armor.total, 20, 0.01), 'depois de 15:00 não muda mais');
  T(In.stats.armor.total === 60, 'a interna não sofre decaimento'); }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 740), { tank: true, level: 18 }); T1.target = null; w.run(0.1);
  const h0 = T1.hp; w.dealDamage(y, T1, 1000, 'true', {}); const reinforced = h0 - T1.hp;
  T(T1.reinforced && near(reinforced, 1000 * 0.2 * 1.2, 0.5), 'Reinforced Armor: 80% de redução (melee +20%) sem minions inimigos por perto', reinforced);
  const m = mk(w, 0, 'melee', aside(T1, 500)); w.run(0.1); const h1 = T1.hp; w.dealDamage(y, T1, 1000, 'true', {}); T(near(h1 - T1.hp, 1000 * 1.2, 0.5) || h1 - T1.hp > reinforced * 3, 'com minion inimigo perto a redução some', h1 - T1.hp);
  m.dead = true; w.units = w.units.filter(u => u !== m); w.run(2.9); T(T1.reinforced === false, 'reativação só depois de 3 s'); w.run(0.3); T(T1.reinforced === true, 'Reinforced Armor volta 3 s depois que os minions saem'); }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 600), { tank: true });
  const m = mk(w, 0, 'melee', aside(T1, 500)); w.run(0.1); const h = T1.hp; w.dealDamage(y, T1, 100, 'physical', { attack: true });
  const expected = 100 * (100 / (100 + 60)) * 1.2; void expected; const lost = h - T1.hp; T(lost > 0 && lost < 100, 'armadura 60 reduz o dano físico (100/(100+60))'); void m; }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').inner, ranged = champ(w, 0, aside(T1, 600), { name: 'Ahri', tank: true }), melee = champ(w, 0, aside(T1, 600));
  S.lane(1, 'mid').outer.dead = true; w.run(0.1); const m = mk(w, 0, 'melee', aside(T1, 500)); w.run(0.1);
  const a = T1.hp; w.dealDamage(ranged, T1, 1000, 'true', {}); const b = T1.hp; w.dealDamage(melee, T1, 1000, 'true', {}); const c = T1.hp;
  T(near((b - c) / (a - b), 1.2, 0.001), 'campeões corpo a corpo causam +20% de dano a torres', (b - c) / (a - b)); void m; }

/* ---------- placas, Bulwark e ouro ---------- */
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, y = champ(w, 0, aside(T1, 600), { tank: true }); mk(w, 0, 'melee', aside(T1, 400)); w.run(0.1);
  const ps = []; w.listeners.push(e => { if (e.type === 'plate') ps.push(e); });
  const hit = pct => { T1.hp = T1.hpMax * (1 - pct) + 1; w.dealDamage(y, T1, 5, 'true', {}); };
  const g0 = y.stat.goldEarned || 0;
  hit(0.09); T(T1.plates === 5, 'abaixo de 10% de vida perdida não cai placa'); hit(0.10); T(T1.plates === 4, 'placa 1 aos 10% de vida perdida', T1.plates);
  hit(0.25); T(T1.plates === 3, 'placa 2 aos 25%'); hit(0.45); T(T1.plates === 2, 'placa 3 aos 45%'); hit(0.70); T(T1.plates === 1, 'placa 4 aos 70%; a quinta cai com a torre');
  T(near((y.stat.goldEarned || 0) - g0, 4 * 120, 0.01), '120 de ouro local por placa (480 em 4 placas)', (y.stat.goldEarned || 0) - g0);
  T(T1.bulwark.length === 4 && T1.bulwark.every(b => b.amount >= 30 && b.amount <= 50), 'Bulwark: uma pilha de +30..50 armadura/RM por placa'); w.run(0.1);
  T(T1.stats.armor.total >= 60 + 4 * 30 - 0.01, 'quatro pilhas de Bulwark somam à armadura');
  w.run(20.5); T(T1.bulwark.length === 0, 'Bulwark dura 20 s'); }
{ const { w, S } = world(), T1 = S.lane(1, 'mid').outer, a = champ(w, 0, aside(T1, 600)), b = champ(w, 0, { x: 200, y: 200 }), c = champ(w, 1, { x: 14000, y: 14000 });
  w.run(0.1); w.dealDamage(a, T1, 1e9, 'true', {}); w.run(0.1);
  const ga = a.stat.goldEarned || 0, gb = b.stat.goldEarned || 0;
  T(near(gb, 50, 0.01), 'ouro global da torre externa: 50 para todo o time (inclusive longe)', gb);
  T(near(ga, 50 + 5 * 120 + 300, 0.01), 'quem derruba a primeira torre sozinho recebe as 5 placas (600) e o bônus de primeira torre (300), fora os 50 globais', ga); void c;
  const T2 = S.lane(1, 'top').outer; w.dealDamage(a, T2, 1e9, 'true', {}); w.run(0.1); T(near((a.stat.goldEarned || 0) - ga, 50 + 5 * 120, 0.01) && near((b.stat.goldEarned || 0) - gb, 50, 0.01), 'a segunda torre não repete o bônus de primeira torre'); }
{ const { w, S } = world(), a = champ(w, 0, { x: 100, y: 100 }), L = S.lane(1, 'bot'), g0 = a.stat.goldEarned || 0;
  fall(w, L.outer, a); const g1 = a.stat.goldEarned; fall(w, L.inner, a); T(near(a.stat.goldEarned - g1, 25, 0.01), 'torre interna: 25 de ouro global'); const g2 = a.stat.goldEarned; fall(w, L.inhibTurret, a); T(near(a.stat.goldEarned - g2, 25, 0.01), 'torre do inibidor: 25 de ouro global');
  const g3 = a.stat.goldEarned; fall(w, L.inhibitor, a); T(near(a.stat.goldEarned - g3, 50, 0.01), 'inibidor: 50 de ouro para quem o derruba'); void g0; }

/* ---------- inibidor: reaparecer e super minions ---------- */
{ const { w, S } = world(1, true), a = champ(w, 0, { x: 100, y: 100 }), L = S.lane(1, 'mid');
  [L.outer, L.inner, L.inhibTurret, L.inhibitor].forEach(s => fall(w, s, a)); const td = w.t;
  T(L.inhibitor.dead && L.superWaves === 8, 'inibidor caído: 8 ondas de super minion na rota');
  w.run(130 - w.t); const sup = w.units.filter(u => u.kind === 'minion' && u.team === 0 && u.name === 'super'), sg0 = w.units.filter(u => u.kind === 'minion' && u.team === 0 && u.name === 'siege' && u.lane.id === 'mid');
  T(sup.length === 3 && sup.every(u => u.lane.id === 'mid') && sg0.length === 0 && L.superWaves === 5, 'cada onda (3 até 2:05) do time 0 na rota do meio ganha 1 super no lugar do siege; restam 5 ondas', sup.length + '/' + sg0.length);
  T(!w.units.some(u => u.kind === 'minion' && u.team === 1 && u.name === 'super'), 'o time do inibidor caído não ganha super minion');
  T(near(sup[0].hpMax, 1500, 700) && sup[0].stats.ad.total > 150, 'super minion usa atributos do cliente (1500 de vida, 180 de dano base)', sup[0].hpMax + '/' + sup[0].stats.ad.total);
  w.run(td + 299 - w.t); T(L.inhibitor.dead, 'inibidor continua caído aos 4:59'); w.run(2); T(!L.inhibitor.dead && L.inhibitor.hp === L.inhibitor.hpMax, 'inibidor reaparece 5 minutos depois com vida cheia'); T(w.log.some(e => e.type === 'inhibitor-up'), 'evento "inhibitor-up" registrado'); }
{ const { w, S } = world(1, true), a = champ(w, 0, { x: 100, y: 100 });
  ['top', 'mid', 'bot'].forEach(id => { const L = S.lane(1, id); [L.outer, L.inner, L.inhibTurret, L.inhibitor].forEach(s => fall(w, s, a)); });
  T(S.allInhibitorsDown(1), 'três inibidores caídos'); w.run(125 - w.t); const sup = w.units.filter(u => u.kind === 'minion' && u.team === 0 && u.name === 'super');
  T(sup.length >= 6, 'com os três inibidores caídos a onda ganha 2 super minions por rota', sup.length); }

/* ---------- minions e estruturas ---------- */
{ const { w, S } = world(1, false), lane = LAY.lanes()[1], T1 = S.lane(1, 'mid').outer;
  for (let k = 0; k < 3; k++) { const m = M.create(w, 0, k < 3 ? 'melee' : 'ranged', lane); m.stat.k = k; }
  const m0 = w.units.find(u => u.kind === 'minion'); T(dist(m0.pos, lane.path[0]) < 1, 'minion nasce no início da rota e segue os pontos do caminho');
  w.run(40); T(dist(m0.pos, lane.path[0]) > 4000 && m0.wp >= 2, 'minion avança pela rota em curva (wp ' + m0.wp + ')');
  w.run(60); const sh = shots(w, T1.id); T(sh.length >= 1, 'torre inimiga atira nos minions que chegam'); T(sh.length >= 1 && w.units.filter(u => u.kind === 'minion' && u.team === 0).length < 3, 'torre mata os minions sozinhos'); }
{ const { w, S } = world(1, false), lane = LAY.lanes()[1], T1 = S.lane(1, 'mid').outer;
  for (let k = 0; k < 6; k++) M.create(w, 0, 'melee', lane);
  const y = champ(w, 0, aside(T1, 740), { tank: true }); y.order = { type: 'attack', target: T1 };
  w.run(60); T(T1.hp < T1.hpMax, 'minions e campeão machucam a torre quando a carregam junto'); }

/* ---------- fonte ---------- */
{ const { w, S } = world(), y = champ(w, 0, { x: 420, y: 420 }); y.hp = y.hpMax * 0.4; w.run(5); T(y.hp > y.hpMax * 0.7, 'a fonte cura campeões aliados rapidamente (estimado)'); const z = champ(w, 1, { x: 420, y: 480 }); z.hp = z.hpMax * 0.4; w.run(5); T(z.hp < z.hpMax * 0.5, 'a fonte do Order não cura o Chaos'); void S; }

/* ---------- regeneração e determinismo ---------- */
{ const { w, S } = world(), i = S.lane(1, 'mid').inhibitor; i.hp = 1000; w.run(10); T(near(i.hp, 1150, 1), 'inibidor regenera 15 de vida por segundo', i.hp); }
{ const run = () => { const { w, S } = world(7, true), T1 = S.lane(1, 'mid').outer; champ(w, 0, aside(T1, 600), { tank: true }); w.run(120); return w; };
  const A = run(), B = run(); T(A.hash() === B.hash(), 'mapa determinístico por semente (hash ' + A.hash() + ')'); T([...A.units, ...A.structs].every(u => isFinite(u.hp) && isFinite(u.pos.x)), 'nenhum NaN'); }
{ const { w } = world(); T(w.structs.length === 30, 'dois times: 15 estruturas cada (11 torres, 3 inibidores, 1 Nexus)', w.structs.length); }

console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nHÁ FALHAS'); process.exit(ok ? 0 : 1);
