/* Copa do Mundo no modo jogador (o jogador convocado joga pela seleção) e Fearless draft nas séries da Copa. */
const {load,run}=require('./harness.js');
const path=require('path');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else fail++;console.log((c?'ok   ':'FALHA ')+m)};
const ctx=load(path.join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;S.mgr=null;S.nm=null;
 S.year=2026;S.phase=PHASES.findIndex(function(p){return p.k==='cg1'});startCup();
 var cupT=S.season.cup.teams[0],pn=cupT.pl[2].n;pcAdopt(pn);`);
ok(run(ctx,`pcAct()&&cupMy()&&cupMy().code===cupT.id&&cupMy().pc===pn`),'jogador convocado controla a seleção na Copa');
const r=JSON.parse(run(ctx,`(function(){
  step();var f=pcFind();var o={fm0:!!S.season.fm,dv:!!DV,pcT:f&&f.t.id===cupT.id,role:f&&f.p.role,my:myTid()===cupT.id,mgr:S.mgr,fl0:DV&&DV.fl?1:0};
  dvAll();if(!DV.pk[DV.us][DV.prole])DV.pk[DV.us][DV.prole]=CH[DV.prole].find(function(x){return !dvTaken(x[0])})[0];
  var sn=ldSnap();dvGo();ldStart(sn,function(){lvOpen()});o.lv=!!LV&&LV.pc;
  lvAll();o.maps=LV.gi;o.state=LV.state;var m=LV.m;o.fx=m.fx;o.fl=m.fl&&m.fl.g.length;
  lvDone();fmEnd();o.res=m.res;o.gi=S.season.cup.gi;o.fm=!!S.season.fm;o.mgr2=S.mgr;o.rec=S.season.cup.rec[cupT.id].j;return JSON.stringify(o)})()`));
ok(r.fm0&&r.dv&&r.pcT&&r.my&&r.mgr===null,'step abre o draft com o jogador pela seleção (sem trocar S.mgr) '+JSON.stringify(r));
ok(r.lv,'partida ao vivo em modo jogador');
ok(r.maps===2&&r.fx&&r.fx.wa+r.fx.wb===2,'grupos: 2 mapas ('+JSON.stringify(r.fx)+')');
ok(r.fl===2,'Fearless registrou os campeões dos 2 mapas da série');
ok(r.res&&r.gi===1&&!r.fm&&r.rec===1&&r.mgr2===null,'resultado entra na tabela e a rodada avança');
/* fearless: nenhum campeão repete entre os mapas da mesma série (mata-mata MD3), no modo técnico */
const f=JSON.parse(run(ctx,`(function(){
  S.pc=null;S.year=2030;S.season=freshSeason();S.phase=PHASES.findIndex(function(p){return p.k==='cg1'});startCup();S.nm={code:S.season.cup.teams[1].id,titles:0,cups:[]};
  var rep=0,series=0,sides=0;
  var gg=0;while(S.season.cup.champ==null&&gg++<80){
    step();
    if(S.season.fm){var m=S.season.fm.m;
      dvAll();var sn=ldSnap();dvGo();ldStart(sn,function(){lvOpen()});
      var g2=0;while(LV&&LV.state!=='done'&&g2++<4000){
        if(LV.state==='ckpt')lvTacApply('auto');
        else if(LV.state==='between'){if(sdNeed(LV.m,LV.gi,LV.ia))LV.m.sd[LV.gi]=(Math.random()<.5)===LV.ia;lvNext(true);if(DV){dvAll();dvGo();lvResume()}}
        else lvTick(5)}
      var gs=m.fl?m.fl.g:[];series++;var seen={};
      gs.forEach(function(g){[].concat(g.a,g.b).forEach(function(c){if(!c)return;if(seen[c])rep++;seen[c]=1})});
      lvDone();fmEnd();
    }
  }
  return JSON.stringify({rep:rep,series:series,champ:S.season.cup.champ})})()`));
ok(f.series>=3&&f.rep===0,`Fearless na Copa: ${f.series} séries, ${f.rep} campeões repetidos`);
console.log(`\n${pass} ok, ${fail} falhas`);process.exit(fail?1:0);
