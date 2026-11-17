/* Som ao iniciar o mapa depois do draft: nada de jingle de vitória/derrota (o mapa ainda não foi jogado).
   Antes tocava o resultado da rodada anterior e parecia que o vencedor já estava decidido. O som de resultado só vem quando o mapa acaba. */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;S.opt.snd=1;
 var calls=[];snd=function(k){calls.push(k)};
 var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 /* rodada anterior com resultado do seu time (é o que o sndAfter achava) */
 S.season.sp={tag:'s1',lg:'LCK',stage:'rr',ri:0,rounds:[[]],cur:[]};S.season.sp.last=[{a:3,b:9,res:{w:3,wa:1,wb:0}}];lastPlayed={k:'sp'};
 for(var i=0;i<6;i++){
  __M={a:3,b:40,n:1,res:null};S.mgr.dr=null;LV=null;calls=[];
  dvOpen();dvAll();act('dvGo');
  ok(LV&&LV.state!=='done','mapa aberto ao vivo');
  ok(calls.indexOf('win')<0&&calls.indexOf('lose')<0&&calls.indexOf('cheer')<0,'sem som de resultado ao iniciar: '+calls.join(','));
  lvDone();
 }
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
