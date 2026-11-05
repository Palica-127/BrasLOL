/* o time mais forte deve vencer mais, sem virar certeza nem sorteio: confere a taxa de vitória por diferença de OVR */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const N=+process.argv[2]||30;
console.log(run(ctx,`(function(){
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 var ids=S.teams.map(function(t){return t.id}).sort(function(a,b){return eff(T(b))-eff(T(a))});
 var cases=[[ids[0],ids[2]],[ids[0],ids[12]],[ids[0],ids[30]],[ids[0],ids[ids.length-1]]],out=[];
 cases.forEach(function(c){var w=0,min=0;for(var i=0;i<${N};i++){S.mgr.tid=c[0];__M={a:c[0],b:c[1],n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();lvTacApply('auto');var q=0;while(LV.state==='run'&&q++<3000)lvTick(5);if(LV.res[0])w++;min+=LV.sec/60;lvDone()}
  out.push('OVR '+eff(T(c[0])).toFixed(1)+' vs '+eff(T(c[1])).toFixed(1)+': vitórias do mais forte '+Math.round(w/${N}*100)+'% · '+(min/${N}).toFixed(0)+' min')});
 return out.join(' | ')})()`));
