'use strict';
/* Bloco 10 — balanceamento: simulações em massa do motor realista e relatório contra alvos de referência de partidas profissionais.
   Uso: node ferramentas/balanceamento.js [partidas=1000] [rotulo=base] [attrA=70] [attrB=70]
   Cada partida: campeões sorteados por função (do patch 16.22.1), semente própria, 10 jogadores com os atributos dados. Roda em paralelo (worker_threads).
   Saída: ferramentas/balanceamento/<rotulo>.json (dados) e docs/BLOCO10_BALANCEAMENTO.md (relatório quando rotulo=base).
   ALVOS: médias APROXIMADAS de ligas profissionais (LCK/LEC/LPL, temporadas recentes), de conhecimento geral — NÃO são dados do projeto nem de fonte citável;
   servem como régua de calibração e estão declarados como estimativa. */
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = path.join(__dirname, '..');
const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
const TAGS = { top: ['Fighter', 'Tank'], jungle: ['Fighter', 'Assassin', 'Tank'], mid: ['Mage', 'Assassin'], adc: ['Marksman'], support: ['Support', 'Tank', 'Mage'] };

function simOne(seed, attrA, attrB, pool) {
  const M = require(path.join(ROOT, 'src/engine/ai/match'));
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const used = new Set(), pick = r => { const p = pool[r]; let c; do { c = p[Math.floor(rnd() * p.length)]; } while (used.has(c)); used.add(c); return c; };
  const mk = (nm, a) => ({ name: nm, style: 'ma', roster: ROLES.map(role => ({ name: pick(role), player: nm[0] + role, role, attrs: { lane: a, mec: a, macro: a, team: a, mental: a } })) });
  const CAP = (+process.env.CAL_CAP || 60) * 60;                 /* CAL_CAP=min limita a partida (afinacao rapida; metricas de duracao perdem sentido) */
  const g = M.createGame({ seed, teams: [mk('A', attrA), mk('B', attrB)], cap: CAP });
  if (process.env.CAL_JGMUL) { const q = process.env.CAL_JGMUL.split(',').map(Number); g.w.jungle.mul = { gold: q[0], xp: q[1] }; }      /* varredura da compensacao da selva */
  if (process.env.CAL_CLASSICO) g.w.econ.farmClassico = true;      /* mede o modo que o jogo usa (adapter.js): CS por tempo na rota */
  const w = g.w; while (w.winner() === null && w.t < CAP) w.run(10);
  const ev = t => w.log.filter(e => e.type === t);
  const per = ti => g.brains[ti].players.map(p => ({ cs: p.u.stat.cs || 0, k: p.u.stat.kills || 0, d: p.u.stat.deaths || 0, a: p.u.stat.assists || 0, gold: p.u.stat.goldEarned || 0, lv: p.u.level, dmg: p.u.stat.dmgDealt || 0, items: p.u.items.length }));
  const cnt = (t, ti) => ev(t).filter(e => e.team === ti).length;
  const fb = ev('first-blood')[0], ft = ev('structure-fall').find(e => e.sub === 'turret');
  return {
    seed, dur: w.t, winner: w.winner(), champs: [0, 1].map(ti => g.brains[ti].players.map(p => p.u.name)),
    p: [per(0), per(1)], dragons: [cnt('drake-kill', 0), cnt('drake-kill', 1)], herald: [cnt('herald-kill', 0), cnt('herald-kill', 1)], baron: [cnt('baron-kill', 0), cnt('baron-kill', 1)], grubs: [cnt('grub-stack', 0), cnt('grub-stack', 1)],
    soul: ev('soul').length, towers: [0, 1].map(ti => ev('structure-fall').filter(e => e.sub === 'turret' && e.team === ti).length), inhibs: [0, 1].map(ti => ev('structure-fall').filter(e => e.sub === 'inhibitor' && e.team === ti).length),
    fbT: fb ? fb.t : null, ftT: ft ? ft.t : null, ganks: ev('gank').length, potions: w.units.filter(u => u.sup).reduce((a, u) => a + u.sup.potions, 0), wards: w.units.filter(u => u.sup).reduce((a, u) => a + u.sup.placed, 0)
  };
}

if (!isMainThread) {
  const { seeds, attrA, attrB } = workerData; const L = require(path.join(ROOT, 'src/engine/data/loader')).createLoader();
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/16.22.1/champions.json'), 'utf8')), pool = {};
  ROLES.forEach(r => { pool[r] = list.filter(c => (c.funcoes || []).some(f => TAGS[r].includes(f))).map(c => c.id); }); void L;
  seeds.forEach(sd => { try { parentPort.postMessage({ ok: simOne(sd, attrA, attrB, pool) }); } catch (e) { parentPort.postMessage({ err: String(e.stack || e).split('\n').slice(0, 3).join(' | '), seed: sd }); } });
  parentPort.postMessage({ done: true });
} else {
  const N = +process.argv[2] || 1000, label = process.argv[3] || 'base', attrA = +process.argv[4] || 70, attrB = +process.argv[5] || 70;
  const nw = Math.min(os.cpus().length - 1 || 1, 30), seeds = Array.from({ length: N }, (_, i) => 1000 + i), res = [], errs = []; let done = 0, t0 = Date.now();
  const chunks = Array.from({ length: nw }, (_, i) => seeds.filter((_, k) => k % nw === i));
  chunks.forEach(sd => {
    const wk = new Worker(__filename, { workerData: { seeds: sd, attrA, attrB } });
    wk.on('message', m => { if (m.ok) { res.push(m.ok); if (res.length % 100 === 0) console.log(res.length + '/' + N, ((Date.now() - t0) / 1000).toFixed(0) + 's'); } else if (m.err) errs.push(m); else if (m.done && ++done === nw) fin(); });
    wk.on('error', e => { errs.push({ err: String(e) }); if (++done === nw) fin(); });
  });
  function fin() {
    const dir = path.join(__dirname, 'balanceamento'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, label + '.json'), JSON.stringify({ N, attrA, attrB, res, errs: errs.length }));
    const R = summarize(res); console.log(JSON.stringify(R.resumo, null, 1)); console.log('erros', errs.length, errs.slice(0, 2));
    if (label === 'base') fs.writeFileSync(path.join(ROOT, 'docs', 'BLOCO10_BALANCEAMENTO.md'), R.md(N, attrA, attrB, res.length, errs.length));
  }
}

/* ---------- análise ---------- */
const TARGET = {                        /* ESTIMADO: médias aproximadas de ligas profissionais */
  dur: [29, 35], killsMin: [0.75, 1.15], csTop: [7.6, 9.0], csJg: [5.8, 7.4], csMid: [8.0, 9.4], csAdc: [8.3, 9.8], csSup: [0.8, 2.0],
  dragons: [3.4, 5.0], baron: [0.5, 1.2], herald: [0.7, 1.6], towers: [12, 18], goldMin: [330, 430], fb: [150, 330], lvEnd: [14, 18], blueWin: [0.46, 0.54], stompMax: 0.45
};
function summarize(res) {
  const av = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0), q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))] || 0; };
  const dur = res.map(r => r.dur / 60), kills = res.map(r => (r.p[0].reduce((s, x) => s + x.k, 0) + r.p[1].reduce((s, x) => s + x.k, 0)));
  const csRole = i => av(res.map(r => av([0, 1].map(t => r.p[t][i].cs / (r.dur / 60)))));
  const goldMin = av(res.map(r => av([0, 1].flatMap(t => r.p[t].map(x => x.gold / (r.dur / 60))))));
  const resumo = {
    partidas: res.length, duracaoMin: +av(dur).toFixed(1), duracaoP10: +q(dur, 0.1).toFixed(1), duracaoP90: +q(dur, 0.9).toFixed(1), killsTotal: +av(kills).toFixed(1), killsPorMin: +av(res.map((r, i) => kills[i] / (r.dur / 60))).toFixed(2),
    cs: { top: +csRole(0).toFixed(1), jungle: +csRole(1).toFixed(1), mid: +csRole(2).toFixed(1), adc: +csRole(3).toFixed(1), support: +csRole(4).toFixed(1) },
    ouroPorMinJogador: Math.round(goldMin), dragoesTotal: +av(res.map(r => r.dragons[0] + r.dragons[1])).toFixed(2), baraoTotal: +av(res.map(r => r.baron[0] + r.baron[1])).toFixed(2), arautoTotal: +av(res.map(r => r.herald[0] + r.herald[1])).toFixed(2),
    larvasTotal: +av(res.map(r => r.grubs[0] + r.grubs[1])).toFixed(2), torresCaidasTotal: +av(res.map(r => r.towers[0] + r.towers[1])).toFixed(1), almas: +(res.filter(r => r.soul).length / res.length).toFixed(2),
    primeiroAbateSeg: Math.round(av(res.filter(r => r.fbT != null).map(r => r.fbT))), primeiraTorreSeg: Math.round(av(res.filter(r => r.ftT != null).map(r => r.ftT))),
    nivelFinalMedio: +av(res.map(r => av([0, 1].flatMap(t => r.p[t].map(x => x.lv))))).toFixed(1), vitoriasAzul: +(res.filter(r => r.winner === 0).length / res.length).toFixed(3), semVencedor: +(res.filter(r => r.winner == null).length / res.length).toFixed(3),
    stomp: +(res.filter(r => { const d = Math.abs(r.p[0].reduce((s, x) => s + x.k, 0) - r.p[1].reduce((s, x) => s + x.k, 0)); return d > 20; }).length / res.length).toFixed(3), ganksPorJogo: +av(res.map(r => r.ganks)).toFixed(1), pocoesPorJogo: +av(res.map(r => r.potions)).toFixed(1), sentinelasPorJogo: +av(res.map(r => r.wards)).toFixed(1),
    itensFinaisMedio: +av(res.map(r => av([0, 1].flatMap(t => r.p[t].map(x => x.items))))).toFixed(1)
  };
  const rows = [
    ['Duração (min)', resumo.duracaoMin, TARGET.dur], ['Abates por minuto (10 jogadores)', resumo.killsPorMin, TARGET.killsMin], ['CS/min topo', resumo.cs.top, TARGET.csTop], ['CS/min selva', resumo.cs.jungle, TARGET.csJg], ['CS/min meio', resumo.cs.mid, TARGET.csMid],
    ['CS/min atirador', resumo.cs.adc, TARGET.csAdc], ['CS/min suporte', resumo.cs.support, TARGET.csSup], ['Dragões por jogo (total)', resumo.dragoesTotal, TARGET.dragons], ['Barões por jogo', resumo.baraoTotal, TARGET.baron], ['Arautos por jogo', resumo.arautoTotal, TARGET.herald],
    ['Torres caídas por jogo', resumo.torresCaidasTotal, TARGET.towers], ['Ouro/min por jogador', resumo.ouroPorMinJogador, TARGET.goldMin], ['Primeiro abate (s)', resumo.primeiroAbateSeg, TARGET.fb], ['Nível final médio', resumo.nivelFinalMedio, TARGET.lvEnd], ['Vitórias do lado azul', resumo.vitoriasAzul, TARGET.blueWin]];
  const md = (N, a, b, n, e) => `# Bloco 10 — Balanceamento do motor realista (patch 16.22.1)

Gerado por \`node ferramentas/balanceamento.js ${N} base ${a} ${b}\`. **${n} partidas simuladas** (${e} com erro), campeões sorteados por função entre os 173 do patch, atributos ${a} x ${b}, semente por partida. Dados brutos em \`ferramentas/balanceamento/base.json\`.

**Sobre os alvos:** são médias APROXIMADAS de ligas profissionais, de conhecimento geral (sem fonte citável dentro do projeto). Servem de régua para calibrar; não são dados do patch.

| Métrica | Medido | Alvo | Estado |
|---|---|---|---|
${rows.map(([n2, v, t]) => `| ${n2} | ${v} | ${t[0]}–${t[1]} | ${v >= t[0] && v <= t[1] ? 'dentro' : v < t[0] ? 'abaixo' : 'acima'} |`).join('\n')}

## Outros números
- Duração P10/P90: ${resumo.duracaoP10} / ${resumo.duracaoP90} min · partidas sem vencedor (limite de 60 min): ${resumo.semVencedor}.
- Partidas "massacre" (diferença > 20 abates): ${resumo.stomp}.
- Almas de Dragão em ${resumo.almas * 100}% das partidas · Vastilarvas por jogo: ${resumo.larvasTotal}.
- Primeira torre aos ${resumo.primeiraTorreSeg} s · ganks por jogo ${resumo.ganksPorJogo} · poções usadas ${resumo.pocoesPorJogo} · sentinelas colocadas ${resumo.sentinelasPorJogo} · itens finais médios ${resumo.itensFinaisMedio}.

## Diagnóstico e correções aplicadas neste bloco
- **Causa principal do CS/nível baixos:** depois dos primeiros ~5 min a macro da IA alterna entre objetivo/defesa/rota; o laner passa pouco tempo em rota (modo "lane" ~35% do tempo entre 5 e 10 min) e sem CS não há ouro nem XP, o que alimenta mais idas à base. Nos 4 primeiros minutos o CS é ~5/min por laner (próximo do real).
- **Correção 1:** só campeão inimigo perto de uma estrutura aciona a meta "defend" (antes, 5 minions bastavam e o time inteiro largava a rota).
- **Correção 2:** objetivo cuja tentativa falha entra em recarga de 90 s antes de ser tentado de novo.
- **Testado e descartado:** limiar de decisão de meta (0,34 / 0,5 / 0,65) e fator de último golpe (0,06–1,8): efeito pequeno ou negativo no CS.
- **Pendente (ver abaixo):** histerese entre luta e retirada (centenas de trocas por partida), previsão do último golpe quando há muitos minions, tempo em rota dos laners no meio de jogo.

Limites: sem névoa de guerra; kits automáticos (rascunhos) para 165 campeões; alvos estimados.
`;
  return { resumo, md, rows };
}
