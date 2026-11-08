'use strict';
/* Kits automáticos (rascunhos gerados do patch): integridade e partidas de fumaça com TODOS os campeões. Roda: node ferramentas/testes/engine_kits_auto.js */
const M = require('../../src/engine/ai/match'), { KITS, refsOf } = require('../../src/engine/champion/kits/index');
const { createLoader } = require('../../src/engine/data/loader'), { spellDefs } = require('../../src/engine/champion/spells');
let ok = 0, bad = 0; const T = (c, m, x) => { if (c) { ok++; console.log('ok    ' + m); } else { bad++; console.log('FALHA ' + m + (x ? '  ' + x : '')); } };
const L = createLoader(), ids = L.championIds();
T(ids.every(id => KITS[id]), 'os ' + ids.length + ' campeões do patch têm kit');
const auto = ids.filter(id => KITS[id].auto);
T(auto.length >= 160, auto.length + ' kits automáticos (rascunhos declarados com `gaps`)');
T(auto.every(id => Array.isArray(KITS[id].gaps) && KITS[id].gaps.length), 'todo kit automático declara suas lacunas');
const miss = []; auto.forEach(id => { const defs = spellDefs(L.champion(id)); refsOf(KITS[id]).forEach(r => { const d = defs[r.slot]; if (!d || (r.dv ? !d.has(r.dv) : !d.spell.calcs[String(r.calc).toLowerCase()])) miss.push(id + r.slot); }); });
T(miss.length === 0, 'toda referência dos kits automáticos existe nos dados do patch', miss.slice(0, 5).join(','));
const acts = auto.reduce((s, id) => s + ['Q', 'W', 'E', 'R'].filter(k => KITS[id][k]).length, 0);
T(acts >= 0.7 * 4 * auto.length, 'pelo menos 70% das habilidades têm ação (' + acts + '/' + 4 * auto.length + ')');

/* partidas de fumaça: todos os campeões entram em campo, 4 minutos, sem erro/NaN e com habilidades lançadas */
const roles = ['top', 'jungle', 'mid', 'adc', 'support'], attrs = { lane: 60, mec: 60, macro: 60, team: 60, mental: 60 };
let games = 0, casts = 0, nan = 0, err = null;
for (let i = 0; i < ids.length; i += 10) {
  const pick = n => Array.from({ length: 10 }, (_, k) => ids[(i + k + n) % ids.length]);
  const ch = pick(0), mk = (off, nm) => ({ name: nm, roster: roles.map((role, r) => ({ name: ch[off + r], player: 'P' + r, role, attrs })) });
  try {
    const g = M.createGame({ seed: 100 + i, teams: [mk(0, 'A'), mk(5, 'B')], cap: 600 }); g.w.run(240); games++;
    g.w.units.filter(u => u.kit).forEach(u => { casts += u.stat.casts; if (![u.hp, u.mana, u.pos.x, u.pos.y].every(Number.isFinite)) nan++; });
  } catch (e) { err = err || (e.stack || e.message).split('\n').slice(0, 3).join(' | '); }
}
T(!err, 'partidas de fumaça com todos os campeões sem erro', err);
T(nan === 0, 'sem NaN nas unidades');
T(casts > games * 10, 'habilidades foram lançadas (' + casts + ' em ' + games + ' partidas)');
console.log(bad ? '\nHÁ FALHAS' : '\nTODOS OS TESTES PASSARAM'); process.exit(bad ? 1 : 0);
