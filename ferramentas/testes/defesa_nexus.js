/* quando o nexus cai, quantos defensores vivos estavam longe da base? (o rival não deve ficar no top deixando o nexus cair) */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx,`(function(){
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 var N=+(process_n||40),far=[],ge3=0,games=0;
 var oge=lvGameEnd;lvGameEnd=function(mine){
   var lo=mine?'op':'me',b=lvBase(lo),alive=lvLive(lo),f=alive.filter(function(P){return lvD(P.x,P.y,b[0],b[1])>38}).length;
   far.push(f+'/'+alive.length+' d='+alive.map(function(P){return Math.round(lvD(P.x,P.y,b[0],b[1]))+P.go.k[0]}).join(',')+' sg='+JSON.stringify(LV.sg[lo]&&{ln:LV.sg[lo].ln,nx:LV.sg[lo].nx,age:LV.sec-LV.sg[lo].t})+' min='+Math.round(LV.sec/60));if(f>=3)ge3++;games++;return oge(mine)};
 for(var i=0;i<N;i++){__M={a:3,b:(i%2?7:11),n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();lvTacApply('auto');var q=0;while(LV.state==='run'&&q++<3000)lvTick(5);(globalThis.__st=globalThis.__st||[]).push(LV.state+'/'+LV.res.length+'/'+Math.round(LV.sec/60));lvDone()}
 return 'estados '+(globalThis.__st||[]).slice(0,12).join(' ')+' | jogos '+games+' | com 3+ defensores vivos longe da base no fim: '+ge3+' | amostra '+far.slice(0,8).join(' ; ')})()`.replace('process_n','40')));
