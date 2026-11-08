/* Lados da série e draft do primeiro mapa: sorteio no mapa 1, perdedor escolhe nos seguintes, draft desde o início. */
const {load,run}=require('./harness.js');
const path=require('path');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else fail++;console.log((c?'ok   ':'FALHA ')+m)};
const ctx=load(path.join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
var drive=function(){var g=0;while(LV&&LV.state!=='done'&&g++<4000){if(LV.state==='ckpt')lvTacApply('auto');else if(LV.state==='between'){if(sdNeed(LV.m,LV.gi,LV.ia))LV.m.sd[LV.gi]=(Math.random()<.5)===LV.ia;lvNext(true)}else lvTick(5)}}`);
/* 1. o draft do primeiro mapa NÃO é automático: dvNeeded fica verdadeiro e o jogo espera o jogador */
ok(run(ctx,`(function(){__M={a:3,b:40,n:3,res:null};return dvNeeded()&&!__M.dd})()`),'primeiro mapa: draft necessário (nada de campeões automáticos)');
/* 2. sorteio do lado: os dois lados aparecem; DV e LV concordam */
let blue=0,tot=60,coh=0;
for(let k=0;k<tot;k++){
  const r=JSON.parse(run(ctx,`(function(){__M={a:3,b:40,n:1,res:null};S.mgr.dr=null;dvOpen();var us=DV.us,ba=DV.ba,mine=dvTeam(us).id;dvAll();dvGo();lvOpen();var o={us:us,lvBlue:lvBlue('me'),mine:mine,sd0:__M.sd[0]};lvDone();return JSON.stringify(o)})()`));
  if(r.us==='b')blue++;
  if(r.mine===3&&((r.us==='b')===r.lvBlue)&&((r.sd0===true)===(r.us==='b')))coh++;
}
ok(blue>15&&blue<45,`sorteio do lado no mapa 1 (azul ${blue}/${tot})`);
ok(coh===tot,'draft e mapa ao vivo concordam sobre o lado');
/* 3. séries: o perdedor escolhe o lado do mapa seguinte */
let prefBlue=0,nAI=0,humanBlock=0,humanN=0,sideOk=0,sideN=0;
for(let k=0;k<30;k++){
  const o=JSON.parse(run(ctx,`(function(){__M={a:3,b:40,n:5,res:null};S.mgr.dr=null;dvOpen();dvAll();dvGo();lvOpen();
    var out={ai:[],hum:[],sides:[]};var g=0;
    while(LV&&LV.state!=='done'&&g++<4000){
      if(LV.state==='ckpt')lvTacApply('auto');
      else if(LV.state==='between'){
        var gi=LV.gi,lo=__M.lo[gi-1];
        if(sdNeed(LV.m,gi,LV.ia)){out.hum.push(__M.sd&&__M.sd[gi]===undefined);var before=LV.state;lvNext();out.hum.push(LV.state===before&&!DV);__M.sd[gi]=(${k%2===0})===LV.ia;out.sides.push([gi,${k%2===0}])}
        else{var ba=sdBlueA(__M,gi);out.ai.push([lo,ba===(lo==='a')])}
        lvNext(true);
        if(DV){dvAll();dvGo();lvResume()}
        out.sides.push(['real',gi,lvBlue('me')===(__M.sd[gi]===LV.ia)])
      }else lvTick(5)
    }
    return JSON.stringify(out)})()`));
  o.ai.forEach(([lo,b])=>{nAI++;if(b)prefBlue++});
  humanN+=o.hum.filter((x,i)=>i%2===1).length;humanBlock+=o.hum.filter((x,i)=>i%2===1&&x).length;
  o.sides.filter(s=>s[0]==='real').forEach(s=>{sideN++;if(s[2])sideOk++});
}
ok(nAI>10&&prefBlue/nAI>.5&&prefBlue/nAI<.9,`IA que perdeu escolhe o lado azul na maioria (${prefBlue}/${nAI})`);
ok(humanN>5&&humanBlock===humanN,`jogador que perdeu: o próximo mapa espera a escolha (${humanBlock}/${humanN})`);
ok(sideN>20&&sideOk===sideN,`lado do mapa ao vivo = lado escolhido (${sideOk}/${sideN})`);
/* 4. ao escolher, o lado vale */
const r4=JSON.parse(run(ctx,`(function(){__M={a:3,b:40,n:3,res:null};S.mgr.dr=null;dvOpen();dvAll();dvGo();lvOpen();lvTacApply('auto');
  var g=0;while(LV.state!=='between'&&LV.state!=='done'&&g++<4000)LV.state==='ckpt'?lvTacApply('auto'):lvTick(5);
  if(LV.state!=='between')return JSON.stringify({skip:1});
  var lost=!LV.res[0];if(!lost)return JSON.stringify({skip:1});
  var need=sdNeed(LV.m,LV.gi,LV.ia);act('lvSide','r');var red=__M.sd[1]===!LV.ia;var need2=sdNeed(LV.m,LV.gi,LV.ia);
  return JSON.stringify({need:need,red:red,need2:need2,html:nextBtnHTML().indexOf('lvNext')>0})})()`));
if(!r4.skip)ok(r4.need&&r4.red&&!r4.need2&&r4.html,'escolher o lado vermelho: guarda a escolha e libera o próximo mapa');
console.log(`\n${pass} ok, ${fail} falhas`);process.exit(fail?1:0);
