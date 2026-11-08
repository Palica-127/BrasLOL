const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;S.mgr=null;
var ok=pcAdopt('Faker');var f=pcFind();var tid=f.t.id,role=f.p.role;
var other=(tid===3?40:3);
var __M={a:tid,b:other,n:3,res:null};pcMatch=function(){return __M};`);
console.log(run(ctx,`JSON.stringify([ok,tid,role,pcAct(),!!pcMatch()])`));
const chk=(l)=>{try{const h=run(ctx,l);console.log('ok',l.slice(0,50),String(h).length)}catch(e){console.log('ERRO',l.slice(0,50),e.message,e.stack.split('\n')[1])}};
run(ctx,`dvOpen();`);chk('vDraft()');
// jogador escolhe só a sua função; IA preenche o resto
run(ctx,`var gg=0;while(DV.i<SEQ.length&&gg++<60){var t=SEQ[DV.i];if(t[1]===DV.us){if(t[0]==='ban'){var c=CH[0].find(function(x){return !dvTaken(x[0])})[0];DV.bans[DV.us].push(c);DV.i++}else{var cc=CH[DV.prole].find(function(x){return !dvTaken(x[0])&&!dvLk(x[0],DV.us)})[0];DV.pk[DV.us][DV.prole]=cc;DV.i++}}else{dvAI()}}DV.done=true;`);
run(ctx,`dvGo();lvOpen();`);
console.log(run(ctx,`JSON.stringify([LV.state,LV.ch,S.pc.dr])`));
run(ctx,`lvPosture('sf');`);
let g=0;
for(let k=0;k<3000&&run(ctx,`LV&&LV.state!=='done'`);k++){
  const st=run(ctx,'LV.state');
  if(st==='run')run(ctx,'lvTick(5)');
  else if(st==='ckpt')run(ctx,"lvPosture('sf')");
  else if(st==='between'){run(ctx,"if(sdNeed(LV.m,LV.gi,LV.ia))act('lvSide','b');lvNext()");if(run(ctx,'!!DV')){chk('vDraft()');run(ctx,`var g2=0;while(DV.i<SEQ.length&&g2++<60){var t=SEQ[DV.i];if(t[1]===DV.us){if(t[0]==='ban'){var c=CH[0].find(function(x){return !dvTaken(x[0])})[0];DV.bans[DV.us].push(c);DV.i++}else{var cc=CH[DV.prole].find(function(x){return !dvTaken(x[0])&&!dvLk(x[0],DV.us)})[0];DV.pk[DV.us][DV.prole]=cc;DV.i++}}else{dvAI()}}DV.done=true;var lvc=DV.lv;dvGo();if(lvc)lvResume();`)}}
  else if(st==='pick')run(ctx,'lvPick(pcAuto())');
}
console.log(run(ctx,`JSON.stringify({state:LV.state,gi:LV.gi,fl:__M.fl?__M.fl.g.length:0,locksA:__M.fl&&__M.fl.a.length})`));
