/* Copa do Mundo jogável: o técnico da seleção joga as partidas do país por draft + mapa ao vivo e o resultado entra na tabela. */
const {load,run}=require('./harness.js');
const path=require('path');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else fail++;console.log((c?'ok   ':'FALHA ')+m)};
const ctx=load(path.join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;S.mgr=null;S.pc=null;
 S.year=2026;S.day=1;S.phase=PHASES.findIndex(function(p){return p.k==='cg1'});startCup();
 S.nm={code:S.season.cup.teams[0].id,titles:0,cups:[]};
 var drive=function(){var g=0;while(LV&&LV.state!=='done'&&g++<4000){if(LV.state==='ckpt')lvTacApply('auto');else if(LV.state==='between'){if(sdNeed(LV.m,LV.gi,LV.ia))LV.m.sd[LV.gi]=(Math.random()<.5)===LV.ia;lvNext(true);if(DV){dvAll();dvGo();lvResume()}}else lvTick(5)}};
 var playOne=function(){ if(DV){dvAll();var sn=ldSnap();dvGo();ldStart(sn,function(){if(lvNeeded())lvOpen()})} drive(); var fr=!!LV.m.fr||!!LV.m.cup; lvDone(); fmEnd(); };`);
ok(run(ctx,`!!cupMine()`),'a seleção do técnico tem partida pendente na rodada 1');
ok(run(ctx,`(function(){step();return !!S.season.fm&&!!DV&&S.mgr&&S.mgr.tid===S.nm.code&&S.phase===PHASES.findIndex(function(p){return p.k==='cg1'})})()`),'step abre o draft da Copa sem avançar a fase');
ok(run(ctx,`T(S.nm.code).id===S.nm.code&&dvTeam('b')&&dvTeam('r')`),'T() resolve seleções');
const r=JSON.parse(run(ctx,`(function(){var m=S.season.fm.m,a=m.a,b=m.b;dvAll();var sn=ldSnap();dvGo();ldStart(sn,function(){lvOpen()});drive();var maps=LV.gi,fx=m.fx;lvDone();fmEnd();
  return JSON.stringify({maps:maps,fx:fx,res:m.res,mgr:S.mgr,fm:S.season.fm,gi:S.season.cup.gi,rec:S.season.cup.rec[S.nm.code],ph:S.phase,msg:msg})})()`));
ok(r.maps===2&&r.fx&&r.fx.wa+r.fx.wb===2,'partida de grupos tem 2 mapas ('+JSON.stringify(r.fx)+')');
ok(r.res&&r.res.wa===r.fx.wa&&r.res.wb===r.fx.wb,'resultado do mapa ao vivo vai para a partida da Copa');
ok(r.mgr===null&&r.fm===null,'S.mgr e a partida temporária são restaurados');
ok(r.gi===1&&r.rec.j===1,'a rodada avançou e a tabela registrou o jogo ('+r.msg+')');
/* joga a Copa inteira como técnico */
const o=JSON.parse(run(ctx,`(function(){var gg=0,mine=0;while(S.season.cup.champ==null&&gg++<80){
   var before=S.phase;step();
   if(S.season.fm){mine++;playOne()}
 }
 var c=S.season.cup;return JSON.stringify({mine:mine,champ:c.champ,nm:S.nm.cups,mgr:S.mgr,rec:c.rec[S.nm.code]})})()`));
ok(o.champ!=null,'a Copa termina com campeão jogando as partidas do país ('+o.champ+')');
ok(o.mine>=2,'o técnico jogou '+(o.mine+1)+' partidas');
ok(o.nm&&o.nm.length===1,'histórico do técnico gravado: '+JSON.stringify(o.nm));
ok(o.mgr===null,'S.mgr fica nulo no fim');
/* com S.mgr de clube: restaura */
const q=JSON.parse(run(ctx,`(function(){S.year=2030;S.season=freshSeason();S.phase=PHASES.findIndex(function(p){return p.k==='cg1'});startCup();S.mgr={tid:3,dr:null,bench:[],acad:[],keep:1};S.nm={code:S.season.cup.teams[0].id,titles:0,cups:[]};
  step();var inMatch=S.mgr.tid===S.nm.code;dvAll();var sn=ldSnap();dvGo();ldStart(sn,function(){lvOpen()});drive();lvDone();fmEnd();return JSON.stringify({inMatch:inMatch,keep:S.mgr&&S.mgr.keep,tid:S.mgr&&S.mgr.tid})})()`));
ok(q.inMatch&&q.keep===1&&q.tid===3,'S.mgr do clube volta intacto depois da partida');
/* simular tudo não trava */
const z=JSON.parse(run(ctx,`(function(){S.mgr=null;S.year=2034;S.season=freshSeason();S.phase=PHASES.findIndex(function(p){return p.k==='cg1'});startCup();S.nm={code:S.season.cup.teams[0].id,titles:0,cups:[]};
  CUPSIM=1;var gg=0;while(S.season.cup.champ==null&&gg++<30)step();CUPSIM=0;return JSON.stringify({champ:S.season.cup.champ,fm:S.season.fm})})()`));
ok(z.champ!=null&&!z.fm,'modo simular (CUPSIM) não abre partidas');
/* sem draft/ao vivo: resolve direto */
const w=JSON.parse(run(ctx,`(function(){S.opt.draft=0;S.opt.live=0;S.year=2038;S.season=freshSeason();S.phase=PHASES.findIndex(function(p){return p.k==='cg1'});startCup();S.nm={code:S.season.cup.teams[0].id,titles:0,cups:[]};
  step();return JSON.stringify({gi:S.season.cup.gi,fm:S.season.fm,mgr:S.mgr,rec:S.season.cup.rec[S.nm.code].j})})()`));
ok(w.gi===1&&!w.fm&&w.mgr===null&&w.rec===1,'sem draft e sem ao vivo a partida é resolvida direto');
console.log(`\n${pass} ok, ${fail} falhas`);process.exit(fail?1:0);
