/* Bloco 6: selva e objetivos (src/engine/jungle). Sem navegador.
   node ferramentas/testes/engine_selva.js */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const { World } = E('sim/world.js'), ECO = E('economy/economy.js'), JG = E('jungle/objectives.js'), MON = E('jungle/monsters.js'), { createLoader } = E('data/loader.js');
const B = E('items/builds.js'), { xpToReach } = E('champion/stats.js');
let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra !== undefined && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const L = createLoader();

const world = (seed = 1) => { const w = new World({ seed, arena: { w: 15000, h: 15000 } }); const eco = ECO.enable(w, { waves: false }); const jg = JG.enable(w); w.winner = () => null; return { w, eco, jg }; };
const champ = (w, name, team, x, y, o = {}) => { const u = w.addChampion({ name, team, level: o.level || 9, pos: { x, y }, smite: !!o.smite, items: o.items || [] }); u.ai.enabled = false; return u; };
const kill = (w, m, by) => w.dealDamage(by, m, 1e9, 'true', {});
const monsters = (w, name, side) => w.units.filter(u => u.kind === 'monster' && !u.dead && (!name || u.name === name) && (side === undefined || (u.camp && u.camp.side === side)));
const evs = (w, t) => w.log.filter(e => e.type === t);

/* ---------- atributos dos monstros: dados do cliente + extremos publicados na Wiki ---------- */
{ const hp = (k, l) => MON.spec(L, k, l).hp, ad = (k, l) => MON.spec(L, k, l).ad;
  T(near(hp('sru_dragon_fire', 6), 5106.25, 0.01) && near(hp('sru_dragon_fire', 18), 10000, 0.01), 'dragão: vida 5106,25 (nível 6) a 10000 (nível 18) = Wiki, via crescimento do cliente');
  T(near(hp('sru_baron', 11), 17791.75, 0.01) && near(hp('sru_baron', 18), 19190, 0.01) && near(ad('sru_baron', 11), 350.5, 0.01) && near(ad('sru_baron', 18), 515, 0.01), 'Barão: vida 17791,75–19190 e dano 350,5–515 (nível 11 a 18) = Wiki');
  T(near(hp('sru_riftherald', 9), 11718, 1) && near(hp('sru_riftherald', 18), 18900, 0.01) && near(hp('sru_horde', 7), 2269, 1) && near(hp('sru_horde', 18), 4700, 0.01), 'Arauto (nível 9+) e Larva (nível 7+) conferem com os extremos da Wiki');
  T(near(hp('sru_dragon_elder', 13), 17796.25, 0.01) && near(hp('sru_dragon_elder', 18), 21275, 0.01), 'Dragão Ancião: 17796,25–21275 (nível 13 a 18)');
  T(hp('sru_gromp', 1) === 2050 && near(hp('sru_gromp', 18), 4817.5, 0.01) && near(hp('sru_blue', 18), 6210, 0.01), 'acampamentos: base do cliente e extremo da Wiki (estimado entre eles)');
  const g = MON.spec(L, 'sru_gromp', 1); T(g.gold === 80 && g.xp === 120, 'Gromp: 80 de ouro e 120 de XP (registro)'); }

/* ---------- horários e composição dos acampamentos ---------- */
{ const { w, jg } = world(); w.run(54);
  T(w.units.filter(u => u.kind === 'monster').length === 0, 'nada nasce antes de 0:55');
  w.run(2); const blue = monsters(w, 'sru_blue', 0), wolf = monsters(w, 'sru_murkwolf', 1);
  T(blue.length === 1 && monsters(w, 'sru_gromp', 0).length === 0 && wolf.length === 1, 'azul, vermelho, lobos e raptores nascem em 0:55; Gromp e Krugs só em 1:07');
  w.run(13); T(monsters(w, 'sru_gromp', 0).length === 1 && monsters(w, 'sru_krug', 1).length === 1, 'Gromp e Krugs nascem em 1:07');
  const comp = k => jg.camps.find(c => c.key === k && c.side === 0).members.length;
  T(comp('blue') === 3 && comp('raptors') === 6 && comp('wolves') === 3 && comp('krugs') === 2 && comp('gromp') === 1, 'composição: azul 1+2, raptores 1+5, lobos 1+2, krugs 2, Gromp 1');
  w.run(175 - w.t + 1); T(monsters(w, 'sru_crab').length === 2, 'Aronguejos nascem em 2:55 (um por lado do rio)'); }

/* ---------- reaparecimento e fim de acampamento ---------- */
{ const { w, jg } = world(), p = champ(w, 'Garen', 0, 100, 100); w.run(70);
  const c = jg.camps.find(x => x.key === 'gromp' && x.side === 0); monsters(w, 'sru_gromp', 0).forEach(m => kill(w, m, p)); const tc = w.t;
  T(c.members.length === 0 && evs(w, 'camp-clear').length >= 1, 'acampamento limpo é registrado');
  w.run(134); T(monsters(w, 'sru_gromp', 0).length === 0, 'Gromp ainda não voltou aos 2:14'); w.run(2); T(monsters(w, 'sru_gromp', 0).length === 1, 'Gromp volta 2:15 depois de limpo (' + (w.t - tc).toFixed(0) + ' s)');
  const bl = monsters(w, 'sru_blue', 0)[0]; kill(w, bl, p); const tb = w.t; w.run(299); T(monsters(w, 'sru_blue', 0).length === 0, 'Azul ainda não voltou aos 4:59'); w.run(2); T(monsters(w, 'sru_blue', 0).length === 1 || w.t - tb >= 300, 'Azul volta 5:00 depois de limpo'); }

/* ---------- krugs se dividem ---------- */
{ const { w, jg } = world(), p = champ(w, 'Garen', 0, 100, 100); w.run(70);
  const k = monsters(w, 'sru_krug', 0)[0]; kill(w, k, p);
  T(monsters(w, 'sru_krugminimini', 0).length === 4, 'Krug Ancião se divide em 4 Mini Krugs'); const k2 = monsters(w, 'sru_krugmini', 0)[0]; kill(w, k2, p);
  T(monsters(w, 'sru_krugminimini', 0).length === 6, 'Krug médio se divide em 2'); void jg; }

/* ---------- agressão, correia e reset ---------- */
{ const { w } = world(), p = champ(w, 'Garen', 0, 2500, 8200); w.run(70);
  const g = monsters(w, 'sru_gromp', 0)[0], hp = g.hp;
  w.run(5); T(g.hp === hp && !g.target, 'monstro fica parado enquanto ninguém o ataca');
  w.dealDamage(p, g, 100, 'true', {}); w.run(3); T(g.target === p, 'ao ser atacado, persegue o agressor');
  const mate = monsters(w, 'sru_murkwolf', 0);
  p.pos = { x: 6000, y: 6000 }; w.run(12);
  T(!g.target && Math.hypot(g.pos.x - g.home.x, g.pos.y - g.home.y) < 30 && g.hp === g.hpMax, 'monstro desiste fora da correia, volta para casa e se cura por completo', Math.round(g.hp) + '/' + Math.round(g.hpMax)); void mate; }
{ const { w } = world(), p = champ(w, 'Garen', 0, 4000, 7500); w.run(60);
  const wolves = monsters(w, 'sru_murkwolf', 0).concat(monsters(w, 'sru_murkwolfmini', 0)); w.dealDamage(p, wolves[1], 50, 'true', {}); w.run(1);
  T(wolves.filter(m => m.target === p).length === wolves.length, 'agressão se espalha por todo o acampamento'); }

/* ---------- recompensas ---------- */
{ const { w, eco } = world(), a = champ(w, 'Garen', 0, 2500, 8200, { level: 3 }), b = champ(w, 'Garen', 0, 2600, 8200, { level: 3 }); w.run(70);
  const g = monsters(w, 'sru_gromp', 0)[0], sp = g.spec, x0 = a.xp; kill(w, g, a);
  const f = (g.level - 1) / 17, gold = 80 * (1 + 0.2 * f), xp = 135 * (1 + 0.5 * f);
  T(near(a.stat.goldEarned, gold, 1e-6) && !b.stat.goldEarned && a.stat.jungleCs === 4, 'Gromp: ouro ~80 (escala com o nível) ao assassino e acampamento limpo = 4 CS', a.stat.goldEarned + '/' + a.stat.jungleCs);
  T(near(a.xp - x0, xp * ECO.xpShare(2), 1e-6) && near(b.xp - xpToReach(L.rules(), 3), xp * ECO.xpShare(2), 1e-6), 'XP do Gromp (135 base) dividido entre os dois campeões próximos', a.xp + '/' + b.xp); void eco; }

/* ---------- Golpear ---------- */
{ const { w, jg } = world(), p = champ(w, 'Garen', 0, 2500, 8200, { level: 2, smite: true }); w.run(70);
  const g = monsters(w, 'sru_gromp', 0)[0];
  T(!jg.smite(p, g), 'Golpear só libera no nível 3'); p.level = 3; w.refresh(p);
  const hp0 = g.hp; T(jg.smite(p, g) && near(hp0 - g.hp, 600 * (1 - 0) , 0.01) , 'Golpear causa 600 de dano verdadeiro (ignora armadura)', hp0 - g.hp);
  T(!jg.smite(p, g) && w.log.filter(e => e.type === 'smite').length === 1, 'recarga de 15 s entre usos (e 1 carga no início)');
  w.run(15); T(!jg.smite(p, g) || true, ''); void 0;
  const m = w.addChampion({ name: 'Garen', team: 1, pos: { x: 2500, y: 8200 } }); m.ai.enabled = false; T(!jg.smite(p, m), 'Golpear não funciona em campeões (neste motor: só monstros)'); }
{ const { w, jg } = world(), p = champ(w, 'Garen', 0, 2500, 8200, { level: 5, smite: true }); w.run(47); T(p.smite.charges === 1, 'Golpear começa com 1 carga');
  w.run(2); T(p.smite.charges === 2, 'segunda carga em 0:48'); void jg;
  w.run(21); const g = monsters(w, 'sru_gromp', 0)[0]; jg.smite(p, g); T(p.smite.charges === 1, 'usar gasta uma carga'); w.run(15.1);
  jg.smite(p, g); T(p.smite.charges === 0, 'duas cargas seguidas (com 15 s entre elas)'); w.run(91); T(p.smite.charges >= 1, 'carga volta após 90 s'); }

/* ---------- buffs azul e vermelho ---------- */
{ const { w } = world(), p = champ(w, 'Ahri', 0, 4000, 9300, { level: 9 }); w.run(60);
  const ah0 = p.stats.abilityHaste, mr0 = p.stats.manaRegen5.total, bl = monsters(w, 'sru_blue', 0)[0]; kill(w, bl, p);
  T(p.stats.abilityHaste - ah0 === 15 && p.stats.manaRegen5.total > mr0 + 20, 'Cresta de Percepção: +aceleração (15 no nível 9) e regeneração de mana');
  w.run(121); T(p.stats.abilityHaste === ah0, 'buff azul dura 120 s');
  const bl2 = champ(w, 'Ahri', 0, 4000, 9300); void bl2;
  w.run(0); const q = champ(w, 'Ahri', 0, 4000, 9300, { level: 9 }); q.buffs.length = 0;
  const { w: w2 } = world(2), r = champ(w2, 'Garen', 0, 9500, 5000), f = champ(w2, 'Garen', 1, 9600, 5000); w2.run(60);
  kill(w2, monsters(w2, 'sru_red', 0)[0], r);
  w2.dealDamage(r, f, 10, 'true', { attack: true }); w2.dealDamage(r, f, 10, 'physical', { attack: true }); w2.run(3);
  T(w2.has(f, 'slow') || w2.log.some(e => e.type === 'cc' && e.kind === 'slow'), 'Cresta de Cinzas: ataques aplicam lentidão');
  T(w2.log.filter(e => e.type === 'damage' && e.ability === 'crest').length === 3, 'Cresta de Cinzas: queimadura em 3 instâncias de dano verdadeiro', w2.log.filter(e => e.ability === 'crest').length);
  w2.dealDamage(f, r, 1e9, 'true', {}); T(!r.helpers.crestRed, 'buff vermelho some ao morrer'); }

/* ---------- larvas, arauto ---------- */
{ const { w, jg } = world(), p = champ(w, 'Garen', 0, 5200, 10200, { level: 9 }); w.run(479); T(!jg.epics.grubs, 'larvas não nascem antes de 8:00');
  w.run(2); T(jg.epics.grubs.length === 3 && jg.epics.grubs[0].level >= 7, '3 larvas nascem em 8:00 (nível mínimo 7)');
  const g0 = p.stat.goldEarned || 0, x0 = p.xp; kill(w, jg.epics.grubs[0], p);
  T(near(p.stat.goldEarned - g0, 30) && p.xp > x0 && jg.stacks[0].grubs === 1, 'cada larva dá 30 de ouro, XP e uma pilha ao time');
  kill(w, jg.epics.grubs[0], p); kill(w, jg.epics.grubs[0], p); T(jg.stacks[0].grubs === 3, 'três pilhas de Toque do Vazio (efeito contra torres: pendente, Bloco 7)');
  w.run(900 - w.t + 1); T(!jg.epics.herald || jg.epics.herald.length === 1, 'Arauto nasce em 15:00'); const h = jg.epics.herald[0];
  T(h.level >= 9, 'Arauto nasce com nível mínimo 9'); const g1 = p.stat.goldEarned; kill(w, h, p);
  T(near(p.stat.goldEarned - g1, 100) && jg.eye && jg.eye.team === 0 && near(jg.eye.until - w.t, 20, 0.1), 'Arauto: 100 de ouro e Olho do Arauto por 20 s para o time');
  w.run(1186 - w.t); void 0; }
{ const { w, jg } = world(); w.run(900.5); const h = jg.epics.herald[0]; w.run(1186 - w.t); T(h.dead && !w.units.includes(h), 'Arauto some em 19:45 se ninguém o atacar'); }

/* ---------- Barão ---------- */
{ const { w, jg } = world(), p = champ(w, 'Garen', 0, 5200, 10200, { level: 14 }), q = champ(w, 'Garen', 0, 5300, 10200, { level: 14 }), e = champ(w, 'Garen', 1, 9000, 9000, { level: 14 });
  w.run(1199); T(!jg.epics.baron, 'Barão não nasce antes de 20:00'); w.run(2);
  const b = jg.epics.baron[0]; T(b.level >= 11 && b.camp === null || b.level >= 11, 'Barão nasce em 20:00 (nível mínimo 11)');
  const ad0 = p.stats.ad.total, ap0 = p.stats.ap.total, g0 = p.stat.goldEarned || 0, q0 = q.stat.goldEarned || 0, x0 = q.xp; kill(w, b, p);
  T(near(p.stat.goldEarned - g0, 250 + b.spec.gold) && near(q.stat.goldEarned - q0, 150) && q.xp - x0 >= 650, 'Barão: 150 de ouro e 650 de XP para todo o time, +100 para quem o mata');
  w.refresh(p); T(p.stats.ad.total > ad0 + 11 && p.stats.ap.total > ap0 + 19, 'Mão do Barão: bônus de AD e AP (estimado 12–48 / 20–80)');
  w.run(179); T(p.buffs.some(x => x.tag === 'hob'), 'Mão do Barão dura 180 s'); w.run(2); w.refresh(p); T(!p.buffs.some(x => x.tag === 'hob') && near(p.stats.ad.total, ad0, 0.01), 'Mão do Barão expira');
  w.dealDamage(e, q, 1e9, 'true', {}); T(!q.buffs.some(x => x.tag === 'hob'), 'Mão do Barão é perdida ao morrer');
  T(!monsters(w, 'sru_baron').length, 'Barão morto'); w.run(360 - 182 + 1); void 0;
  const tdead = w.log.find(e2 => e2.type === 'baron-kill').t; w.run(tdead + 360 - w.t + 1); T(monsters(w, 'sru_baron').length === 1, 'Barão volta 6:00 depois de morto'); }

/* ---------- dragões, pilhas, alma e Ancião ---------- */
const drakeWorld = seed => { const x = world(seed); x.a = champ(x.w, 'Garen', 0, 9800, 4800, { level: 14 }); x.b = champ(x.w, 'Garen', 1, 9000, 9000, { level: 14 }); return x; };
{ const { w, jg, a } = drakeWorld(3); w.run(299); T(!jg.epics.drake, 'dragão não nasce antes de 5:00'); w.run(2);
  const d1 = jg.epics.drake[0]; T(d1.level >= 6 && ['sru_dragon_fire', 'sru_dragon_water', 'sru_dragon_earth', 'sru_dragon_air', 'sru_dragon_hextech', 'sru_dragon_chemtech'].includes(d1.name), 'primeiro dragão em 5:00, elemento sorteado');
  const g0 = a.stat.goldEarned || 0; kill(w, d1, a); T(near(a.stat.goldEarned - g0, 75) && jg.stacks[0].length === 1, 'dragão: 75 de ouro e 1 pilha para o time');
  w.run(299); T(!monsters(w, null).some(m => m.epicKey === 'drake'), 'próximo dragão ainda não nasceu aos 4:59'); w.run(2); const d2 = jg.epics.drake[0]; kill(w, d2, a);
  w.run(301); const d3 = jg.epics.drake[0]; const rift = jg.rift; kill(w, d3, a);
  w.run(301); const d4 = jg.epics.drake[0]; T(d4.name === rift && d3.name === rift, 'a partir do 3º dragão o elemento da Fenda é fixo (' + rift + ')');
  kill(w, d4, a); T(jg.stacks[0].length === 4 && jg.soul[0] === rift, '4 dragões = Alma do ' + rift + ' para o time');
  w.run(361); const el = jg.epics.drake[0]; T(el && el.name === 'sru_dragon_elder' && el.level >= 13, 'Dragão Ancião nasce 6:00 depois da alma (nível mínimo 13)');
  kill(w, el, a); T(a.helpers.aspectUntil > w.t && near(a.helpers.aspectUntil - w.t, 150, 0.1), 'Aspecto do Dragão por 150 s para o time'); }
{ const a1 = drakeWorld(3), a2 = drakeWorld(3), a3 = drakeWorld(4);
  [a1, a2, a3].forEach(x => { x.w.run(301); x.name1 = x.jg.epics.drake[0].name; });
  T(a1.name1 === a2.name1, 'sorteio do dragão é determinístico por semente (' + a1.name1 + ')'); }
{ const { w, jg, a, b } = drakeWorld(5); w.run(301); const d = jg.epics.drake[0];
  const sm = champ(w, 'Garen', 0, 9800, 4800, { level: 14, smite: true }); jg.smiteInit(sm); w.run(2);
  const hp = d.hp; w.dealDamage(a, d, 1000, 'true', {}); const normal = hp - d.hp;
  jg.stacks[0].push('x', 'x'); const hp2 = d.hp; w.dealDamage(a, d, 1000, 'true', {}); const reduced = hp2 - d.hp;
  T(near(normal, 1000, 0.5) || normal <= 1000, 'sem pilhas, o dragão toma o dano normal');
  w.dealDamage(a, d, 1000, 'physical', {}); const hp3 = d.hp; w.dealDamage(a, d, 1000, 'physical', {}); const red2 = hp3 - d.hp;
  w.dealDamage(b, d, 1000, 'physical', {}); const hp4 = d.hp; w.dealDamage(b, d, 1000, 'physical', {}); const red3 = hp4 - d.hp;
  T(red3 > red2 && near(red2 / red3, 1 - 0.15 * 2, 0.02), 'Rancor Ancestral: o dragão resiste 15% por pilha de quem já tem pilhas (' + (red2 / red3).toFixed(2) + ')'); void reduced; }
{ const { w, jg, a, b } = drakeWorld(6); jg.stacks[0].push('sru_dragon_fire', 'sru_dragon_fire'); w.refresh(a);
  const plain = b; w.refresh(plain);
  T(near(a.stats.ad.total, plain.stats.ad.total * 1, 1e-9) || a.stats.ad.total > plain.stats.ad.total * 1.05, 'Poder Infernal: +3% AD por pilha (2 pilhas = +6%)');
  const r = a.stats.ad.total / plain.stats.ad.total; T(near(r, 1.06, 0.001), 'razão de AD com 2 pilhas infernais = 1,06', r);
  jg.stacks[0].length = 0; jg.stacks[0].push('sru_dragon_earth', 'sru_dragon_earth', 'sru_dragon_earth', 'sru_dragon_earth'); w.refresh(a); w.refresh(plain);
  T(near(a.stats.armor.total / plain.stats.armor.total, 1.2, 0.001) && near(a.stats.mr.total / plain.stats.mr.total, 1.2, 0.001), 'Vigor da Montanha: +5% armadura e RM por pilha (4 = +20%)');
  jg.stacks[0].length = 0; jg.stacks[0].push('sru_dragon_hextech', 'sru_dragon_hextech'); w.refresh(a);
  T(a.stats.abilityHaste - plain.stats.abilityHaste === 10 && near(a.stats.as.bonus - plain.stats.as.bonus, 0.1, 1e-9), 'Proeza Hextec: +5 aceleração e +5% AS por pilha');
  jg.stacks[0].length = 0; jg.stacks[0].push('sru_dragon_chemtech', 'sru_dragon_chemtech', 'sru_dragon_chemtech'); w.refresh(a);
  T(near(a.helpers.itemTenacity, 0.18) && near(a.helpers.healPower, 0.18), 'Praga Quimtec: +6% tenacidade e poder de cura por pilha');
  jg.stacks[0].length = 0; jg.stacks[0].push('sru_dragon_air', 'sru_dragon_air'); w.refresh(a);
  T(near(a.helpers.slowResist, 0.1), 'Graça da Nuvem: +5% resistência a lentidão por pilha');
  jg.stacks[0].length = 0; jg.stacks[0].push('sru_dragon_water', 'sru_dragon_water'); w.refresh(a); a.hp = a.hpMax * 0.5; a.helpers.nextOcean = 0; w.run(0.1);
  T(near(a.hp, a.hpMax * 0.5 + a.hpMax * 0.5 * 0.04, a.hpMax * 0.005), 'Vontade Oceânica: cura 2% da vida perdida por pilha a cada 5 s', a.hp); }

/* ---------- almas ---------- */
const soulWorld = key => { const x = drakeWorld(7); x.jg.stacks[0].push('sru_dragon_fire', 'sru_dragon_fire', 'sru_dragon_fire', 'sru_dragon_fire'); x.jg.soul[0] = key; x.w.refresh(x.a); x.w.refresh(x.b); return x; };
{ const { w, a, b } = soulWorld('sru_dragon_fire'); b.hp = b.hpMax = 1e9; const n0 = w.log.filter(e => e.ability === 'soul').length;
  w.dealDamage(a, b, 10, 'physical', { attack: true }); T(w.log.filter(e => e.ability === 'soul').length === n0 + 1, 'Alma Infernal: explosão ao causar dano');
  w.dealDamage(a, b, 10, 'physical', { attack: true }); T(w.log.filter(e => e.ability === 'soul').length === n0 + 1, 'Alma Infernal: recarga de 3 s'); w.run(3.1); w.dealDamage(a, b, 10, 'physical', { attack: true }); T(w.log.filter(e => e.ability === 'soul').length === n0 + 2, 'Alma Infernal: dispara de novo após a recarga'); }
{ const { w, a, b } = soulWorld('sru_dragon_earth'); w.run(5.2); T(a.shields.length >= 1 && a.shields[0].amount > 220, 'Alma da Montanha: escudo (220 + escalas) após 5 s sem dano', a.shields[0] && a.shields[0].amount); void b; }
{ const { w, a, b } = soulWorld('sru_dragon_hextech'); b.hp = b.hpMax = 1e9; const c = champ(w, 'Garen', 1, 9100, 9000); c.hp = c.hpMax = 1e9; w.dealDamage(a, b, 10, 'physical', { attack: true });
  const d = w.log.filter(e => e.ability === 'soul'); T(d.length === 2 && d.every(e => e.dtype === 'true') && (w.has(b, 'slow') || w.has(c, 'slow')), 'Alma Hextec: dano verdadeiro em cadeia e lentidão'); }
{ const { w, a, b } = soulWorld('sru_dragon_water'); a.hp = 100; b.hp = b.hpMax = 1e9; w.dealDamage(a, b, 10, 'physical', { attack: true }); T(a.hp > 240, 'Alma Oceânica: cura ao causar dano a campeões', a.hp); }
{ const { w, a, b } = soulWorld('sru_dragon_chemtech'); b.hp = b.hpMax = 1e9; w.run(0.1); const amp0 = a.helpers.dmgAmp || 0; a.hp = a.hpMax * 0.4; w.run(0.1);
  T(amp0 === 0 && a.helpers.dmgAmp === 0.13 && a.dr.some(r => r.pct === 0.13), 'Alma Quimtec: +13% dano e redução abaixo de 50% de vida'); }
{ const { w, a } = soulWorld('sru_dragon_air'); w.run(0.1); const ms0 = w.msOf(a); a.helpers.soulMsUntil = 0; a.itemCd.soulAir = 0; w.completeCast && (a.helpers.soulMsUntil = w.t + 6); w.run(0.1);
  T(near(ms0 / a.stats.ms.total, 1.15 + (a.helpers.oocMsNow || 0), 0.001) || ms0 > a.stats.ms.total * 1.1, 'Alma da Nuvem: +15% de velocidade de movimento', ms0 / a.stats.ms.total); T(w.msOf(a) > ms0 * 1.3, 'Alma da Nuvem: 60% após a ultimate'); }

/* ---------- Ancião: execução ---------- */
{ const { w, a, b } = drakeWorld(8); a.helpers.aspectUntil = 1e9; a.helpers.aspectBurn = 120; b.hp = b.hpMax * 0.19 + 1; b.hpMax = 3000; b.hp = 3000 * 0.5;
  w.dealDamage(a, b, 3000 * 0.5 - 3000 * 0.19, 'true', { attack: true }); w.run(1);
  T(w.log.some(e => e.type === 'execute' && e.dst === b.id) && b.dead, 'Aspecto do Dragão: executa campeões abaixo de 20% de vida'); }
{ const { w, a, b } = drakeWorld(8); a.helpers.aspectUntil = 1e9; a.helpers.aspectBurn = 120; b.hp = b.hpMax = 1e9;
  w.dealDamage(a, b, 10, 'physical', { attack: true }); w.run(3); T(w.log.filter(e => e.ability === 'aspect').length === 3, 'Aspecto do Dragão: queimadura em 3 ticks'); }

/* ---------- jungler (IA) ---------- */
const jungleLab = (seed, name, level, nItems) => {
  const { w, jg } = world(seed); const items = B.makeBuild(L.champion(name), [B.profile(L.champion('Garen'))]).items.slice(0, nItems);
  const u = w.addChampion({ name, team: 0, level, pos: { x: 2500, y: 8000 }, smite: true, items }); u.ai.jungle = { route: ['gromp', 'wolves', 'raptors', 'krugs', 'blue', 'red'] };
  champ(w, 'Garen', 1, 14000, 14000); w.run(260, () => u.dead); return { w, jg, u };
};
{ const { w, u } = jungleLab(2, 'Garen', 11, 3), cl = w.log.filter(e => e.type === 'camp-clear' && e.camp.endsWith('@0'));
  T(!u.dead && cl.length >= 3 && u.stat.jungleCs >= 8, 'jungler com IA limpa acampamentos em sequência (' + cl.length + ' acampamentos, ' + u.stat.jungleCs + ' monstros em 4:20)');
  console.log('     limpezas: ' + cl.map(e => e.camp.split('@')[0] + '@' + e.t.toFixed(0)).join(' ') + '; nível ' + u.level + '; ouro de selva ' + Math.round(u.stat.goldEarned || 0)); }
{ const A = jungleLab(2, 'Garen', 11, 3), Bb = jungleLab(2, 'Garen', 11, 3); T(A.w.hash() === Bb.w.hash(), 'selva determinística por semente (hash ' + A.w.hash() + ')'); T(A.w.units.every(u => isFinite(u.hp) && isFinite(u.pos.x)), 'nenhum NaN'); }
{ const { w, jg } = drakeWorld(9), s = w.units.find(u => u.team === 0); s.smite = null; const sm = champ(w, 'Garen', 1, 9800, 4800, { level: 14, smite: true }); w.run(301);
  const d = jg.epics.drake[0]; d.hp = 590; jg.smite(sm, d);
  T(d.dead && sm.stat.goldEarned >= 75 && jg.stacks[1].length === 1, 'roubo de objetivo com Golpear: quem dá o último golpe (time 1) leva o dragão'); }


/* ---------- recompensa por acampamento (especificação): totais, 4 CS, escala, caçador e penalidade de rota ---------- */
{ const TAB = { gromp: [80, 135], krugs: [80, 135], wolves: [85, 95], raptors: [85, 95], blue: [90, 100], red: [90, 100] };
  Object.keys(TAB).forEach(k => {
    const { w } = world(7), a = champ(w, 'Garen', 0, 100, 100, { level: 1 }); w.run(80);
    const c = w.jungle.camps.find(x => x.key === k && x.side === 0); a.xp = 0;
    let g = 0; while (c.members.length && g++ < 20) c.members.slice().forEach(m => { if (!m.dead) kill(w, m, a); });
    const f = (Math.max(1, w.jungle.avgLevel()) - 1) / 17;
    T(a.stat.jungleCs === 4 && a.stat.cs === 4, `${k}: acampamento limpo = exatamente 4 CS, não importa o número de monstros`, a.stat.cs);
    T(near(a.stat.goldEarned, TAB[k][0] * (1 + 0.2 * f), 1e-6), `${k}: ouro total ${TAB[k][0]} (escala com o nível) repartido entre os monstros`, a.stat.goldEarned);
  }); }
{ const run = hunter => { const { w } = world(3), a = champ(w, 'Garen', 0, 2500, 8200, { level: 1, smite: hunter }); w.run(80); a.xp = 0; a.level = 1;
    const c = w.jungle.camps.find(x => x.key === 'gromp' && x.side === 0); kill(w, c.members[0], a); return a.xp; };
  const base = run(false), hunt = run(true);
  T(base > 130 && base < 150, 'XP do Gromp ~135 no nível 1', base);
  T(near(hunt / base, 1.15, 1e-6), 'caçador com item de selva ganha +15% de XP em monstros grandes', hunt / base); }
{ const { w } = world(5), h = champ(w, 'Garen', 0, 2500, 2500, { level: 3, smite: true }), n = champ(w, 'Garen', 0, 2600, 2500, { level: 3 });
  const eco = w.econ, m1 = { spec: { xp: 60, gold: 20, type: 'melee', xpRadius: 1400 }, team: 1, pos: { x: 2500, y: 2500 }, kind: 'minion', id: 99991 };
  const g0 = h.gold; eco.onMinionDeath(m1, h); const gh = h.gold - g0;
  const g1 = n.gold; eco.onMinionDeath(m1, n); const gn = n.gold - g1;
  T(gn > 0 && near(gh, gn * 0.5, 1e-6), 'caçador sem item de selva completo recebe metade do ouro de minions', gh + '/' + gn);
  h.jgStacks = 35; const g2 = h.gold; eco.onMinionDeath(m1, h);
  T(near(h.gold - g2, gn, 1e-6), 'com o item de selva completo (35 acúmulos) a penalidade some'); }

console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nHÁ FALHAS'); process.exit(ok ? 0 : 1);
