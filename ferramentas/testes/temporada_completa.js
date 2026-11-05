/* uma temporada inteira com gestor: eventos só nas folgas, splits terminam antes do MSI/Mundial, sem travar, play-offs de acesso resolvidos */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx,`(function(){
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;mgrStart(3);S.mgr.cash=50;
 var bad=[],ev=[],g=0,y0=S.year;
 while(S.year===y0&&g++<400){step()}/* leva o jogo até a virada: o save inicial começa no meio da temporada */
 y0=S.year;g=0;
 while(S.year===y0&&g++<4000){
  var k=advDay(400);
  if(cevBlock()){var e=cevL().find(function(x){return x.st===0&&S.day>=CEVT[x.id].d0&&S.day<=CEVT[x.id].d1});if(e){ev.push(e.id+'@'+S.day);if(cevChamp())bad.push('evento em campeonato '+e.id+'@'+S.day);if(CEVT[e.id].k==='sc'){e.cfg=e.cfg||{foc:'comp',int:1,lu:1,ps:[],tr:''};cevGo(e.id)}else cevSkip(e.id)}continue}
  if(S.season.sp&&cevL().some(function(x){return x.st===1&&CEVT[x.id].k==='sc'}))bad.push('scrim ativa durante split @'+S.day);
  step();
 }
 return 'ano '+y0+'->'+S.year+' passos '+g+' | eventos '+ev.join(' ')+' | problemas '+(bad.length?bad.join('; '):'nenhum')})()`));
