/* ritmo de abates e duração: referência de LoL profissional ~ 25-30 abates no total em 30-33 min (cerca de 0,9/min), goleadas raramente passam de 30x5 */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const N=+process.argv[2]||40;
console.log(run(ctx,`(function(){
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 var nb=0,kb=0,sz={};var __ob=lvBrawl;lvBrawl=function(x,y,A,B,o){var r=__ob(x,y,A,B,o);nb++;kb+=r.evs;var key=(o&&o.tag||'-')+A.length+'v'+B.length;sz[key]=sz[key]||[0,0];sz[key][0]++;sz[key][1]+=r.evs;return r};
 var rows=[],pairs=[[3,7],[3,11],[3,40],[0,50],[2,55],[5,6]];
 for(var i=0;i<${N};i++){var pr=pairs[i%pairs.length];S.mgr.tid=pr[0];__M={a:pr[0],b:pr[1],n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();lvTacApply('auto');var q=0;while(LV.state==='run'&&q++<3000)lvTick(5);
  var a=LV.st.me.k,b=LV.st.op.k,w=LV.res[0];rows.push({min:LV.sec/60,k:a+b,hi:Math.max(a,b),lo:Math.min(a,b),gd:Math.round((lvGold('me')-lvGold('op'))/1000)});lvDone()}
 var m=function(f){return +(rows.reduce(function(s,r){return s+f(r)},0)/rows.length).toFixed(1)};
 var mx=rows.slice().sort(function(a,b){return b.hi-a.hi})[0];
 var big=Object.keys(sz).sort(function(a,b){return sz[b][1]-sz[a][1]}).slice(0,9).map(function(k){return k+':'+sz[k][0]+'x/'+(sz[k][1]/sz[k][0]).toFixed(1)}).join(' ');return 'amostra '+rows.slice(0,24).map(function(r,i){return pairs[i%pairs.length].join('v')+':'+r.hi+'x'+r.lo+'@'+Math.round(r.min)}).join(' ')+' || brawls/jogo '+(nb/rows.length).toFixed(1)+' mortes/brawl '+(kb/Math.max(1,nb)).toFixed(2)+' ['+big+'] | jogos '+rows.length+' | duração média '+m(function(r){return r.min})+' min | abates totais médios '+m(function(r){return r.k})+' | por minuto '+m(function(r){return r.k/r.min})+' | maior placar '+mx.hi+'x'+mx.lo+' em '+mx.min.toFixed(0)+' min | jogos com 45+ abates '+rows.filter(function(r){return r.k>=45}).length+' | jogos 40+ min '+rows.filter(function(r){return r.min>=40}).length})()`));
