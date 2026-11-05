const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=0;S.mgr={tid:3,dr:null,bench:[],acad:[]};`);
const r=run(ctx,`(function(){var bad=0,rec=0,N=200,wins=0,lens={};
 for(var k=0;k<N;k++){var m=mk(T(3),T(40),5);S.mgr.dr=null;play(m);
  var f=m.fl;if(!f||!f.g.length){continue}rec++;
  ['a','b'].forEach(function(sd){var seen={};f.g.forEach(function(g){g[sd].forEach(function(c){if(seen[c])bad++;seen[c]=1})})});
  lens[f.g.length]=(lens[f.g.length]||0)+1;if(m.res.w===3)wins++}
 return JSON.stringify({rec:rec,bad:bad,lens:lens,winsMine:wins/N,pa:mk(T(3),T(40),5).pa})})()`);
console.log(r);
// AI vs AI depth effect: nenhum erro e não grava
console.log(run(ctx,`(function(){var m=mk(T(10),T(20),5);play(m);return JSON.stringify({fl:m.fl||null,res:m.res})})()`));
