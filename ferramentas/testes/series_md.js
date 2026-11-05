/* MD3 e MD5 ao vivo: caminho manual (lvNext abre o draft do próximo mapa; depois dvGo + lvResume) e placares finais possíveis */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx,`(function(){
 var o=[],ok=function(c,t){o.push((c?'OK  ':'FALHA ')+t)};
 S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};
 S.mgr={tid:3,dr:null,bench:[],acad:[]};
 function runSeries(n){
  __M={a:3,b:(i%2?7:3+0*7+(S.teams.length>20?8:8)),n:n,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};S.mgr.tid=3;lvOpen();
  var maps=0,g=0,draftOpened=0,lastWins=[0,0];
  var tr=[];while(LV&&g++<60){tr.push(LV.state+':'+LV.gi);
   if(LV.state==='ckpt')lvTacApply('auto');
   else if(LV.state==='run'){var q=0;while(LV.state==='run'&&q++<20000)lvTick(5)}
   else if(LV.state==='between'){
     var gi=LV.gi,me=LV.me,op=LV.op;
     lvNext();/* clique em "Draft do próximo mapa" */
     if(!DV){ok(false,'draft nao abriu');return null}
     draftOpened++;
     if(!DV.lv)ok(false,'draft sem flag lv');
     dvAll();dvGo();
     if(LV.gi!==gi||LV.me!==me||LV.op!==op)ok(false,'placar mudou ao abrir o draft');
     lvResume();
   }
   else if(LV.state==='done')break;else if(LV.state==='pick')lvPick(pcAuto());else break;
  }
  var r=[LV.me,LV.op,draftOpened,LV.gi,LV.res.length];
  /* série encerrada: nao pode abrir outro mapa */
  var st=LV.state;lvNext();var after=LV.state;DV=null;
  lvDone();
  return {r:r,st:st,after:after};
 }
 var seen={3:{},5:{}};
 for(var i=0;i<40;i++)[3,5].forEach(function(n){var x=runSeries(n);if(!x)return;var k=x.r[0]+'-'+x.r[1];seen[n][k]=(seen[n][k]||0)+1;
  var need=Math.ceil(n/2);
  if(!((x.r[0]===need&&x.r[1]<need)||(x.r[1]===need&&x.r[0]<need)))ok(false,'placar invalido MD'+n+' '+k);
  if(x.r[3]!==x.r[0]+x.r[1]||x.r[4]!==x.r[3])ok(false,'historico de mapas incoerente '+k);
  /* no Node não há timers: lvResume joga mapas seguidos sem parar, então só exigimos pelo menos um draft quando houve mais de um mapa */
  if(x.r[3]>1&&x.r[2]<1)ok(false,'nenhum draft aberto em serie de '+x.r[3]+' mapas');
  if(x.st!=='done'||x.after!=='done')ok(false,'serie encerrada reabriu: '+x.st+'/'+x.after);
 });
 o.push('placares MD3 '+JSON.stringify(seen[3]));o.push('placares MD5 '+JSON.stringify(seen[5]));
 ok(!o.some(function(l){return l.indexOf('FALHA')===0}),'nenhuma falha de progressao');
 return o.join(' || ')})()`));
