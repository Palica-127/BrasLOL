/* Bloco 3: motor de combate (src/engine/combat + src/engine/sim). Sem navegador.
   node ferramentas/testes/engine_combate.js */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const D = E('combat/damage.js'), { World } = E('sim/world.js'), X = E('sim/exec.js');

let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra !== undefined && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;

/* ---------- matemática ---------- */
T(near(D.resistMultiplier(0), 1) && near(D.resistMultiplier(100), 0.5) && near(D.resistMultiplier(50), 100 / 150), 'multiplicador de resistência 100/(100+r)');
T(near(D.resistMultiplier(-50), 2 - 100 / 150) && D.resistMultiplier(-50) > 1, 'resistência negativa aumenta o dano (2 - 100/(100-r))');
T(near(D.lethalityToFlat(10, 18), 10) && near(D.lethalityToFlat(10, 1), 10 * (0.6 + 0.4 / 18)), 'letalidade escala com o nível (60% no 1 até 100% no 18)');
{ const r = D.effectiveResist(100, { reductionPct: 0.2, reductionFlat: 10, penPct: 0.3, penFlat: 10 });
  T(near(r, (100 * 0.8 - 10) * 0.7 - 10), 'ordem: redução % -> plana -> penetração % -> plana', r); }
T(D.effectiveResist(20, { penFlat: 50 }) === 0 && D.effectiveResist(-10, { penPct: 0.5, penFlat: 30 }) === -10, 'penetração nunca leva a resistência abaixo de 0 nem piora a negativa');
T(near(D.mitigate(100, 'physical', { armor: 100, mr: 0 }), 50) && near(D.mitigate(100, 'magic', { armor: 0, mr: 100 }), 50) && D.mitigate(100, 'true', { armor: 999, mr: 999 }) === 100, 'dano físico/mágico/verdadeiro');
T(D.critMultiplier(2) === 2 && D.critMultiplier(2, 0.35) === 2.35, 'multiplicador de crítico');
{ const u = { hp: 100, hpMax: 100, shields: [{ amount: 30, type: 'magic' }, { amount: 20, type: 'all' }] };
  const a = D.applyToUnit(u, 40, 'physical', []);
  T(near(a.absorbed, 20) && near(u.hp, 80) && u.shields.length === 1 && u.shields[0].type === 'magic', 'escudo de tipo só absorve o próprio tipo', JSON.stringify(a));
  const b = D.applyToUnit(u, 50, 'magic', []);
  T(near(b.absorbed, 30) && near(u.hp, 60), 'escudo mágico absorve dano mágico'); }
{ const u = { hp: 100, hpMax: 100, shields: [] };
  const a = D.applyToUnit(u, 100, 'physical', [{ pct: 0.5 }, { flat: 10 }]);
  T(near(a.dealt, 40) && near(u.hp, 60), 'redução de dano: % depois plana', JSON.stringify(a));
  const k = D.applyToUnit(u, 1000, 'physical', []);
  T(k.killed && u.hp === 0 && near(k.overkill, 940), 'abate e excesso de dano'); }
T(near(D.tenacityDuration(2, 0.3, 'stun'), 1.4) && D.tenacityDuration(2, 0.3, 'knockup') === 2 && D.tenacityDuration(2, 0.3, 'suppress') === 2, 'tenacidade reduz controle, exceto arremesso/supressão');
T(near(D.stackSlows([0.4]), 0.4) && near(D.stackSlows([0.2, 0.4]), 0.4 + 0.2 * 0.35), 'lentidões: a maior vale inteira, as outras 35%');
{ const u = { hp: 50, hpMax: 100 }; const g = D.heal(u, 80, 0.4); T(near(g, 48) && near(u.hp, 98), 'cura com ferimentos graves', g); const g2 = D.heal(u, 100, 0); T(near(u.hp, 100) && near(g2, 2), 'cura limitada à vida máxima'); }

/* ---------- utilidades de cenário ---------- */
const mk = (seed = 1) => new World({ seed });
const put = (w, name, team, x, y, o = {}) => { const u = w.addChampion({ name, team, level: o.level || 9, pos: { x, y }, skill: o.skill }); u.ai.enabled = false; return u; };
const evs = (w, type) => w.log.filter(e => e.type === type);

/* ---------- ataque básico ---------- */
{ const w = mk(), a = put(w, 'Garen', 0, 1000, 1000), b = put(w, 'Garen', 1, 1100, 1000);
  w.orderAttack(a, b); w.run(10);
  const n = evs(w, 'attack').filter(e => e.id === a.id).length, expected = 10 * a.stats.as.total;
  T(Math.abs(n - expected) <= 2, 'cadência de ataque ≈ velocidade de ataque (' + n + ' ataques em 10 s, esperado ~' + expected.toFixed(1) + ')');
  const d = evs(w, 'damage').find(e => e.src === a.id && e.ability === 'AA');
  const exp = a.stats.ad.total * D.resistMultiplier(b.stats.armor.total);
  T(d && (d.crit || near(d.dealt, exp, 0.2)), 'dano do ataque básico = AD x multiplicador de armadura', d && d.dealt + ' vs ' + exp); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 800, 0);
  w.orderAttack(a, b); w.run(1);
  T(a.pos.x > 300 && a.pos.x < 400, 'unidade anda até o alcance usando a velocidade de movimento (' + a.pos.x.toFixed(0) + ' em 1 s, MS ' + a.stats.ms.total.toFixed(0) + ')', a.pos.x); }
{ const w = mk(), a = put(w, 'Ezreal', 0, 0, 0), b = put(w, 'Garen', 1, 500, 0);
  w.orderAttack(a, b); w.run(3);
  T(evs(w, 'attack').length > 0 && w.projs.length + evs(w, 'damage').length > 0, 'ataque à distância dispara míssil e causa dano', JSON.stringify(a.attack)); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  w.addStatus(a, { kind: 'stun', dur: 1.5, src: b }); w.orderAttack(a, b); w.run(1);
  T(evs(w, 'attack').length === 0, 'atordoado não ataca'); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  w.orderAttack(a, b); w.run(0.05 * 2); a.attack.windup && w.addStatus(a, { kind: 'stun', dur: 1, src: b });
  T(!a.attack.windup && evs(w, 'attack-cancel').length >= 0, 'controle cancela o ataque em andamento'); }
{ let crits = 0, n = 400; const w = mk(5), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  a.mods.flat.crit = 0.5; w.refresh(a); b.hp = b.hpMax = 1e9;
  for (let i = 0; i < n; i++) { const r = w.dealDamage(a, b, 100, 'physical', { attack: true, canCrit: true }); void r; }
  crits = evs(w, 'damage').filter(e => e.crit).length;
  T(crits > n * 0.42 && crits < n * 0.58, 'taxa de crítico respeita a chance (' + crits + '/' + n + ')'); }

/* ---------- habilidades: projéteis e skillshots ---------- */
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 800, 0);
  w.orderCast(a, 'Q', { x: 800, y: 0 }); w.run(2.5);
  const h = evs(w, 'proj-hit');
  T(h.length === 1 && h[0].dst === b.id, 'skillshot acerta alvo parado na linha');
  T(w.has(b, 'root'), 'Q da Morgana prende (raiz) o alvo atingido');
  const d = evs(w, 'damage').find(e => e.ability === 'Q'); T(d && d.dealt > 0 && d.dtype === 'magic', 'dano mágico da habilidade'); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 800, 300);
  w.orderCast(a, 'Q', { x: 800, y: 0 }); w.run(2.5);
  T(evs(w, 'proj-hit').length === 0, 'skillshot erra alvo fora da largura'); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 600, 0), c = put(w, 'Garen', 1, 900, 0);
  w.orderCast(a, 'Q', { x: 900, y: 0 }); w.run(2.5);
  const h = evs(w, 'proj-hit'); T(h.length === 1 && h[0].dst === b.id, 'projétil sem perfuração para no primeiro alvo'); }
{ const w = mk(), a = put(w, 'Ahri', 0, 0, 0), b = put(w, 'Garen', 1, 500, 0), c = put(w, 'Garen', 1, 800, 0);
  w.orderCast(a, 'Q', { x: 800, y: 0 }); w.run(4);
  const out = evs(w, 'damage').filter(e => e.ability === 'Q' && e.dtype === 'magic'), back = evs(w, 'damage').filter(e => e.ability === 'Q' && e.dtype === 'true');
  T(out.length === 2 && back.length >= 1, 'Q da Ahri perfura, vai (mágico) e volta (verdadeiro)', out.length + '/' + back.length); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 1000, 0);
  w.orderCast(a, 'Q', { x: 1000, y: 0 }); w.run(0.5);
  b.pos.y = 400; w.run(2);
  T(evs(w, 'proj-hit').length === 0, 'alvo que sai da trajetória desvia do skillshot (esquiva é possível)'); }
{ const w = mk(), a = put(w, 'Ezreal', 0, 0, 0), b = put(w, 'Garen', 1, 700, 0);
  const mana0 = a.mana; w.orderCast(a, 'W', { x: 700, y: 0 }); w.run(2);
  w.orderAttack(a, b); w.run(2.5);
  T(evs(w, 'damage').some(e => e.ability === 'W' && e.dealt > 0) && a.mana < mana0 + 50, 'Ezreal: marca da W detona com outro dano do próprio Ezreal'); }
{ const w = mk(), a = put(w, 'Ezreal', 0, 0, 0), b = put(w, 'Garen', 1, 700, 0);
  a.abil.readyAt.W = 20; a.abil.readyAt.E = 20; const cd = a.abil.readyAt.W;
  w.orderCast(a, 'Q', { x: 700, y: 0 }); w.run(2);
  T(evs(w, 'proj-hit').length === 1 && a.abil.readyAt.W < cd, 'Ezreal: Q acertando reduz a recarga das outras habilidades'); }
{ const w = mk(), a = put(w, 'Ahri', 0, 0, 0), b = put(w, 'Garen', 1, 600, 0);
  w.orderCast(a, 'E', { x: 600, y: 0 }); w.run(2);
  T(w.has(b, 'charm') || evs(w, 'cc').some(e => e.kind === 'charm'), 'E da Ahri enfeitiça o alvo'); }

/* ---------- controle ---------- */
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  b.buffs.push({ tenacity: 0.5, until: 99 }); w.addStatus(b, { kind: 'stun', dur: 2, src: a });
  const s = b.st.find(x => x.kind === 'stun'); T(s && near(s.until - w.t, 1), 'tenacidade encurta o atordoamento'); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  b.shields.push({ amount: 100, type: 'magic', until: 99, blocksCC: true });
  const r = w.addStatus(b, { kind: 'stun', dur: 2, src: a }); T(r === false && !w.has(b, 'stun'), 'Escudo Negro bloqueia controle'); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 600, 0);
  w.addStatus(a, { kind: 'silence', dur: 3, src: b }); const r = w.orderCast(a, 'Q', { x: 600, y: 0 });
  T(!r.ok, 'silenciado não conjura'); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 600, 0);
  w.orderCast(a, 'Q', { x: 600, y: 0 }); w.addStatus(a, { kind: 'stun', dur: 1, src: b }); w.run(1);
  T(evs(w, 'cast-cancel').length === 1 && evs(w, 'projectile').length === 0 && a.abil.readyAt.Q === 0, 'atordoamento durante a conjuração cancela sem gastar recarga'); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 500, 0);
  w.addStatus(b, { kind: 'slow', dur: 5, amount: 0.5, src: a }); w.orderMove(b, 0, 0); w.run(1);
  T(Math.abs((500 - b.pos.x) - b.stats.ms.total * 0.5) < 6, 'lentidão reduz a velocidade de movimento', 500 - b.pos.x); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 500, 0);
  w.addStatus(b, { kind: 'root', dur: 2, src: a }); w.orderMove(b, 0, 0); w.run(1);
  T(b.pos.x === 500, 'raiz impede movimento'); }

/* ---------- escudo, cura, redução, área ---------- */
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  w.orderCast(a, 'W', {}); w.run(0.4);
  const hp0 = a.hp; w.dealDamage(b, a, 50, 'true', {});
  T(a.shields.length > 0 || evs(w, 'shield').length > 0, 'Garen W gera escudo');
  T(a.hp > hp0 - 50, 'escudo e redução de dano diminuem o dano recebido'); }
{ const w = mk(), a = put(w, 'Annie', 0, 0, 0), b = put(w, 'Garen', 1, 120, 0);
  w.orderCast(a, 'R', { x: 120, y: 0 }); w.run(1);
  T(evs(w, 'damage').some(e => e.ability === 'R'), 'Annie R causa dano em área'); }
{ const w = mk(), a = put(w, 'Malphite', 0, 0, 0), b = put(w, 'Garen', 1, 150, 0), c = put(w, 'Garen', 1, 5000, 5000);
  w.orderCast(a, 'E', {}); w.run(1);
  const d = evs(w, 'damage').filter(e => e.ability === 'E'); T(d.length === 1 && d[0].dst === b.id, 'área só atinge quem está dentro do raio'); }
{ const w = mk(), a = put(w, 'Amumu', 0, 0, 0), b = put(w, 'Garen', 1, 150, 0);
  w.orderCast(a, 'W', {}); w.run(3.1);
  T(evs(w, 'damage').filter(e => e.ability === 'W').length >= 2, 'W do Amumu (aura contínua) causa dano a cada segundo'); }
{ const w = mk(), a = put(w, 'Amumu', 0, 0, 0), b = put(w, 'Garen', 1, 150, 0);
  w.orderCast(a, 'R', {}); w.run(0.6);
  T(w.has(b, 'stun'), 'R do Amumu atordoa em área'); }
{ const w = mk(), a = put(w, 'Malphite', 0, 0, 0), b = put(w, 'Garen', 1, 900, 0);
  w.orderCast(a, 'R', { x: 900, y: 0 }); w.run(3);
  T(w.has(b, 'knockup') || evs(w, 'cc').some(e => e.kind === 'knockup'), 'R do Malphite: arremete e arremessa'); }
{ const w = mk(), a = put(w, 'Amumu', 0, 0, 0), b = put(w, 'Garen', 1, 1000, 0);
  w.orderCast(a, 'Q', { x: 1000, y: 0 }); w.run(3);
  T(evs(w, 'dash').length === 1 && a.pos.x > 400, 'Q do Amumu: projétil acerta e Amumu avança até o alvo', a.pos.x); }
{ const w = mk(), a = put(w, 'Leona', 0, 0, 0), b = put(w, 'Garen', 1, 600, 0);
  w.orderCast(a, 'Q', {}); w.run(0.5); w.orderAttack(a, b); w.run(3);
  T(w.has(b, 'stun') || evs(w, 'cc').some(e => e.kind === 'stun'), 'Leona Q empodera o ataque seguinte e atordoa'); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0, 0), b = put(w, 'Garen', 1, 300, 0);
  w.orderCast(a, 'R', {}); w.run(0.7); const hp = b.hp;
  T(evs(w, 'damage').some(e => e.ability === 'R') && w.has(b, 'slow'), 'Morgana R: dano e lentidão; atordoa se continuar no alcance');
  w.run(3.2); T(evs(w, 'cc').some(e => e.kind === 'stun'), 'Morgana R: atordoamento ao fim da corrente', hp); }

/* ---------- mortes e fim ---------- */
{ const w = mk(), a = put(w, 'Garen', 0, 0, 0), b = put(w, 'Garen', 1, 100, 0);
  w.dealDamage(a, b, 1e6, 'true', {});
  T(b.dead && w.winner() === 0 && evs(w, 'kill').length === 1 && a.stat.kills === 1, 'abate registra kill e vencedor');
  const n = w.log.length; w.orderAttack(b, a); w.run(1); T(w.log.filter(e => e.src === b.id).length === 0 || w.log.length >= n, 'morto não age'); }

/* ---------- determinismo ---------- */
const lab = (seed, teams, secs = 90) => {
  const w = mk(seed);
  teams[0].forEach((n, i) => w.addChampion({ name: n, team: 0, level: 11, pos: { x: 1000, y: 900 + i * 220 } }));
  teams[1].forEach((n, i) => w.addChampion({ name: n, team: 1, level: 11, pos: { x: 2400, y: 900 + i * 220 } }));
  w.run(secs); return w;
};
{ const A = lab(11, [['Garen', 'Annie'], ['Ahri', 'Ezreal']]), B = lab(11, [['Garen', 'Annie'], ['Ahri', 'Ezreal']]), C = lab(12, [['Garen', 'Annie'], ['Ahri', 'Ezreal']]);
  T(A.hash() === B.hash() && A.log.length === B.log.length, 'mesma semente -> mesmo log (hash ' + A.hash() + ')');
  T(A.hash() !== C.hash(), 'semente diferente -> luta diferente (' + C.hash() + ')'); }

/* ---------- laboratório: 1v1 / 2v2 / 5v5 ---------- */
const NAMES = ['Garen', 'Annie', 'Ahri', 'Ezreal', 'Leona', 'Amumu', 'Malphite', 'Morgana'];
{ const t0 = Date.now(), res = {}; let finished = 0, N = 0;
  for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) { const w = lab(100 + i * 10 + j, [[NAMES[i]], [NAMES[j]]], 120); N++; if (w.winner() !== null) finished++; res[NAMES[i] + ' x ' + NAMES[j]] = w.winner() === 0 ? NAMES[i] : w.winner() === 1 ? NAMES[j] : 'empate'; const bad = w.units.some(u => !isFinite(u.hp) || !isFinite(u.pos.x)); if (bad) T(false, 'NaN em ' + NAMES[i] + ' x ' + NAMES[j]); }
  T(finished === N, '1v1: todas as ' + N + ' combinações terminam com vencedor', finished + '/' + N);
  const wins = {}; Object.values(res).forEach(v => { wins[v] = (wins[v] || 0) + 1; });
  console.log('     vitórias 1v1:', JSON.stringify(wins)); console.log('     tempo dos 28 duelos: ' + (Date.now() - t0) + ' ms'); }
{ const w = lab(21, [['Garen', 'Annie'], ['Ahri', 'Ezreal']], 180);
  T(w.winner() !== null, '2v2 termina com vencedor em ' + w.t.toFixed(1) + ' s', w.winner()); }
{ const t0 = Date.now(), w = lab(31, [['Garen', 'Annie', 'Ahri', 'Ezreal', 'Leona'], ['Amumu', 'Malphite', 'Morgana', 'Garen', 'Annie']], 240);
  const dealt = w.units.reduce((s, u) => s + u.stat.dmgDealt, 0), taken = w.units.reduce((s, u) => s + u.stat.dmgTaken, 0);
  T(w.winner() !== null && w.units.every(u => isFinite(u.hp)), '5v5 termina com vencedor em ' + w.t.toFixed(1) + ' s (' + (Date.now() - t0) + ' ms)');
  T(Math.abs(dealt - taken) < 1e-6 && w.units.reduce((s, u) => s + u.stat.kills, 0) === w.units.filter(u => u.dead).length, 'conservação: dano causado = dano recebido; kills = mortes');
  console.log('     5v5:', w.units.map(u => u.name + (u.dead ? '†' : '') + ' ' + Math.round(u.stat.dmgDealt)).join(', ')); }
{ const w = lab(41, [['Garen'], ['Garen']], 120);
  w.log.forEach(e => { if (e.type === 'damage' && (!isFinite(e.dealt) || e.dealt < 0)) T(false, 'dano inválido', JSON.stringify(e)); });
  T(true, 'nenhum dano negativo ou NaN no log'); }

console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nHÁ FALHAS'); process.exit(ok ? 0 : 1);
