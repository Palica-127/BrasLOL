const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};
S.mgr={tid:3,dr:null,bench:[],acad:[]};`);
let rep=[];
for(let k=0;k<30;k++){
  const r=run(ctx,`(function(){
    __M={a:3,b:40,n:${k%2?5:3},res:null};S.mgr.dr=null;
    dvOpen();dvAll();dvGo();lvOpen();lvAll();
    var m=__M,f=m.fl||{a:[],b:[],g:[]},bad=[];
    var cnt=function(side){var seen={};f.g.forEach(function(g,i){g[side].forEach(function(c){if(c&&seen[c])bad.push(side+':'+c+'@'+(i+1));seen[c]=1})})};
    cnt('a');cnt('b');
    return JSON.stringify({n:m.n,games:LV?LV.gi:null,rec:f.g.length,bad:bad,lockA:f.a.length,lockB:f.b.length,fx:m.fx})})()`);
  rep.push(JSON.parse(r));
}
console.log(rep.slice(0,3));
console.log('violações:',rep.filter(x=>x.bad.length).length,' recGames==games:',rep.every(x=>x.rec===x.games),' séries:',rep.length);
