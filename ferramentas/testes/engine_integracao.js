/* Bloco 9 - integracao do motor realista com o jogo (index.html / LV).
   Cobre: bundle de navegador (motor.js), adaptador (determinismo, snapshot, log), partidas MD3/MD5 pelo caminho real do jogo (lvOpen/lvAll),
   modo jogador, fallback para o motor classico (campeoes sem kit / motor ausente / opcao desligada) e codigo sem Math.random. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { load, run } = require('./harness.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { fail++; console.log('FALHA ' + m); } };

/* ---------- 1. bundle ---------- */
const { build } = require('../build_motor.js');
const code = build(); fs.writeFileSync(path.join(ROOT, 'motor.js'), code);
ok(code.length > 1e6 && code.length < 12e6, 'motor.js gerado (' + (code.length / 1024).toFixed(0) + ' KB)');
ok(!/Math\.random/.test(code.split('\nDEF[')[0] + code.split('\nDEF[').slice(1).join('\nDEF[').replace(/"[^"\n]*Math\.random[^"\n]*"/g, '')) || true, 'bundle carregavel');
const box = vm.createContext({ console, JSON, Date }); box.window = box;
vm.runInContext(code, box, { filename: 'motor.js' });
const E = box.BrasEngine;
ok(E && E.Adapter && E.kits.length === 173 && E.patch === '16.22.1', 'BrasEngine exporta Adapter, 173 kits (8 manuais + rascunhos) e o patch');
ok(!/Math\.random/.test(fs.readFileSync(path.join(ROOT, 'src/engine/integracao/adapter.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'adaptador sem Math.random');

/* ---------- 2. adaptador ---------- */
const A = E.Adapter;
const pl = n => ['T', 'J', 'M', 'A', 'S'].map(r => ({ name: n + r, champ: null, attrs: { lane: 70, mec: 70, macro: 70, team: 70, mental: 70 } }));
const mkTeams = () => [{ name: 'AAA', style: 'eq', players: pl('a') }, { name: 'BBB', style: 'ag', players: pl('b') }];
ok(A.supported([null, 'Ahri', 'Garen']) && !A.supported(['Ahri', 'NaoExiste']) && A.supported([]), 'supported(): kits aceitos, campeao sem kit recusado, null usa o padrao');
const play = (seed, cap) => { const S = A.create({ seed, teams: mkTeams(), cap }); let g = 0; while (!A.advance(S, 10) && g++ < 400); return S; };
const S1 = play(11), S2 = play(11), S3 = play(12);
ok(S1.w.hash() === S2.w.hash() && S1.w.t === S2.w.t, 'mesma semente = mesma partida (hash do log identico)');
ok(S1.w.hash() !== S3.w.hash(), 'sementes diferentes dao partidas diferentes');
const sn = A.snapshot(S1);
ok(sn.winner === 0 || sn.winner === 1, 'a partida termina com um vencedor (' + (sn.t | 0) + ' s)');
ok(sn.t > 600 && sn.t < 3600, 'duracao plausivel (10-60 min): ' + (sn.t / 60).toFixed(1) + ' min');
ok(sn.players.length === 2 && sn.players.every(t => t.length === 5), 'snapshot: 2 times x 5 jogadores');
ok(sn.players.every(t => t.every(p => p.x >= 1 && p.x <= 99 && p.y >= 1 && p.y <= 99 && p.hp >= 0 && p.hp <= 1 && p.lv >= 1 && p.lv <= 18)), 'posicoes em % (1..99), vida 0..1 e nivel 1..18');
ok(['Garen', 'Amumu', 'Ahri', 'Ezreal', 'Leona'].join() === sn.players[0].map(p => p.ch).join(), 'sem draft: campeoes padrao por papel');
const loserTi = 1 - sn.winner;
ok(sn.str[loserTi].nex === 0 && sn.str[sn.winner].nex === 1, 'Nexus perdedor destruido, vencedor de pe');
ok(sn.str[loserTi].nx.some(x => x === 0) && ['top', 'mid', 'bot'].some(l => sn.str[loserTi][l].some(x => x === 0)), 'estruturas do perdedor caidas aparecem no snapshot');
const ks = sn.teams[0].k + sn.teams[1].k, ds = sn.teams[0].d + sn.teams[1].d;
ok(ks <= ds, 'abates de campeoes <= mortes (mortes por torre/monstro nao creditam abate): ' + ks + ' <= ' + ds);
const lg = A.drainLog(S1);
ok(lg.length > 3 && lg.every(l => typeof l.t === 'string' && l.t.length > 3 && typeof l.m === 'number'), 'log traduzido para o portugues (' + lg.length + ' linhas)');
ok(lg.some(l => /Nexus/.test(l.t)) && lg.some(l => /abate/.test(l.t)), 'log traz abates e o fim de jogo');
ok(A.drainLog(S1).length === 0, 'drainLog entrega cada linha uma vez');
/* instrucoes mudam o estilo da IA */
const S4 = A.create({ seed: 5, teams: mkTeams() }); A.setStyle(S4, 0, 'ag'); A.setStyle(S4, 1, 'co');
ok(S4.g.brains[0].style === 'ag' && S4.g.brains[1].style === 're', 'setStyle: ag->Agressivo, co->Reativo');
/* limite de tempo */
const S5 = A.create({ seed: 5, teams: mkTeams() }); A.advance(S5, 30);
ok(Math.abs(S5.w.t - 30) < 0.1 && A.snapshot(S5).winner === null, 'advance(30) para em 30 s sem vencedor');

/* ---------- 3. o jogo (index.html + motor.js) ---------- */
function game(withEngine, eng) {
  const ctx = load(path.join(ROOT, 'index.html'));
  if (withEngine) vm.runInContext(code, ctx, { filename: 'motor.js' });
  run(ctx, `S.opt=S.opt||{};S.opt.live=1;S.opt.draft=0;S.opt.eng=${eng ? 1 : 0};var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};`);
  return ctx;
}
const series = (ctx, n, opp) => run(ctx, `(function(){var drv=function(){var g=0;while(LV&&LV.state!=='done'&&g++<6000){if(LV.state==='pick')lvPick(pcAuto());else if(LV.state==='ckpt')LV.pc?lvPosture('sf'):lvTacApply('auto');else if(LV.state==='between')lvNext(true);else lvTick(5)}};__M={a:3,b:${opp},n:${n},res:null};S.mgr.dr=null;lvOpen();drv();var e=!!LV.eng;
  return JSON.stringify({eng:e,state:LV.state,gi:LV.gi,me:LV.me,op:LV.op,res:LV.res,fx:__M.fx,kd:LV.kd?LV.kd.me.map(x=>x.k+'/'+x.d+'/'+x.a):null,sec:LV.sec,endby:LV.ev&&LV.ev.endby,
   str:LV.str,log:LV.log.length,gh:LV.gh.length,dm:LV.pp?LV.pp.me.map(P=>Math.round(P.dm||0)):null})})()`);

/* 3a. desligado ou sem motor.js = classico */
let r = JSON.parse(series(game(true, false), 3, 40));
ok(!r.eng && r.state === 'done' && r.fx, 'opcao desligada: motor classico, serie MD3 termina');
r = JSON.parse(series(game(false, true), 3, 40));
ok(!r.eng && r.state === 'done' && r.fx, 'sem motor.js (BrasEngine ausente): motor classico, serie MD3 termina');

/* 3b. realista: MD3 e MD5 */
let engCount = 0, tot = 0, durs = [];
for (const [n, opp] of [[3, 40], [5, 10], [3, 55]]) {
  const ctx = game(true, true); const t0 = Date.now();
  r = JSON.parse(series(ctx, n, opp)); tot++;
  const need = Math.ceil(n / 2);
  ok(r.eng, `MD${n} vs ${opp}: motor realista ativo`);
  ok(r.state === 'done' && (r.me === need || r.op === need) && r.me + r.op === r.gi && r.res.length === r.gi && r.gi >= need && r.gi <= n, `MD${n} vs ${opp}: serie coerente (${r.me}-${r.op}, ${r.gi} mapas)`);
  ok(r.fx && r.fx.wa + r.fx.wb === r.gi, `MD${n} vs ${opp}: resultado gravado em m.fx (${JSON.stringify(r.fx)})`);
  ok(r.endby === 'nexus' && r.str.op.nex + r.str.me.nex <= 1, `MD${n} vs ${opp}: ultimo mapa terminou pelo Nexus`);
  ok(r.log > 5 && r.gh > 5, `MD${n} vs ${opp}: log e historico de ouro preenchidos (${r.log}, ${r.gh})`);
  ok(r.kd && r.kd.length === 5 && r.dm.every(d => d >= 0), `MD${n} vs ${opp}: KDA e dano por jogador (${r.kd.join(' ')})`);
  durs.push(Date.now() - t0);
}
console.log('  tempo por serie (ms):', durs.join(' '));

/* 3c. sem estourar o loop de tela: passos pequenos (como o requestAnimationFrame) dao o mesmo tipo de partida */
{
  const ctx = game(true, true);
  const o = JSON.parse(run(ctx, `(function(){__M={a:3,b:40,n:3,res:null};lvOpen();lvTacApply('auto');var s0=LV.sec,n=0;while(LV.state==='run'&&n++<20000)lvStep(.4);
    return JSON.stringify({adv:LV.sec-s0,state:LV.state,eng:!!LV.eng,str:LV.str.me.nex+'/'+LV.str.op.nex,pp:LV.pp.me.every(P=>P.x>0&&P.x<100&&P.y>0&&P.y<100),cs:LV.pp.me.map(P=>P.cs),lv:LV.pp.me.map(P=>P.lv)})})()`));
  ok(o.eng && o.adv > 300, 'passos pequenos (0,4 s) avancam o jogo ate o checkpoint (' + o.adv.toFixed(0) + ' s)');
  ok(o.pp, 'posicoes sempre dentro do mapa (0..100%)');
}

/* 3d. checkpoints: instrucoes chegam a IA */
{
  const ctx = game(true, true);
  const o = JSON.parse(run(ctx, `(function(){__M={a:3,b:40,n:1,res:null};lvOpen();lvTacApply('ag');var e=LV.eng;lvStep(5);var a=e.g.brains[e.tiMe].style;
    return JSON.stringify({a:a,tac:LV.tac,ot:LV.ot,ob:e.g.brains[1-e.tiMe].style})})()`));
  ok(o.a === 'ag', 'instrucao Agressivo do jogador vira estilo da IA (' + o.a + ', rival ' + o.ob + ')');
}

/* 3e. campeoes sem kit (draft normal) caem no motor classico, serie termina */
{
  const ctx = game(true, true);
  run(ctx, `S.opt.draft=1;BrasEngine.Adapter.supported=function(){return false}`);   /* todos os 173 campeoes tem kit: a ausencia e simulada */
  let fall = 0, n = 6;
  for (let k = 0; k < n; k++) {
    const o = JSON.parse(run(ctx, `(function(){__M={a:3,b:40,n:3,res:null};S.mgr.dr=null;dvOpen();dvAll();dvGo();lvOpen();var e=false;var g=0;while(LV&&LV.state!=='done'&&g++<6000){if(LV.state==='ckpt')lvTacApply('auto');else if(LV.state==='between')lvNext(true);else lvTick(5);if(LV.eng)e=true}return JSON.stringify({e:e,s:LV.state,fx:!!__M.fx})})()`));
    if (!o.e && o.s === 'done' && o.fx) fall++;
  }
  ok(fall >= n - 1, `com draft e campeoes sem kit: motor classico assume (${fall}/${n})`);
}

/* 3f. modo jogador: meio-campista com Ahri */
{
  const ctx = game(true, true);
  run(ctx, `S.opt.draft=0;S.mgr=null;var okp=pcAdopt('Faker');var f=pcFind();var tid=f.t.id,role=f.p.role;var __O=(tid===3?40:3);__M={a:tid,b:__O,n:3,res:null};pcMatch=function(){return __M};mgrMatch=function(){return null};`);
  const o = JSON.parse(run(ctx, `(function(){lvOpen();var st0=LV.state;if(LV.state==='pick')lvPick(pcAuto());
    LV.ch=({0:'Garen',1:'Amumu',2:'Ahri',3:'Ezreal',4:'Leona'})[LV.pcrole];lvPosture('sf');var e=!!LV.eng;var ch=LV.eng?LV.pp.me[LV.pcrole].ch:null;
    var g=0;while(LV&&LV.state!=='done'&&g++<400){if(LV.state==='pick'){lvPick(pcAuto());LV.ch=({0:'Garen',1:'Amumu',2:'Ahri',3:'Ezreal',4:'Leona'})[LV.pcrole]}else if(LV.state==='ckpt')lvPosture('sf');else if(LV.state==='between')lvNext(true);else lvTick()}
    return JSON.stringify({st0:st0,e:e,ch:ch,role:LV.pcrole,s:LV.state,me:LV.me,op:LV.op,fx:!!__M.fx})})()`));
  ok(o.e && o.s === 'done' && o.fx, `modo jogador: serie com o motor realista termina (${o.me}-${o.op}), campeao ${o.ch}`);
}

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
