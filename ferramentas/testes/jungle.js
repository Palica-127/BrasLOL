const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
var __R=[];
function __game(a,b){
  __M={a:a,b:b,n:1,res:null};S.mgr.dr=null;
  dvOpen();dvAll();dvGo();lvOpen();LV.cp=0;lvTacApply('auto');
  var snap=null,fb={me:null,op:null};
  while(LV.state==='run'||LV.state==='ckpt'){
    if(LV.state==='ckpt'){lvTacApply('auto');continue}
    lvTick(1);
    ['me','op'].forEach(function(s){if(fb[s]==null&&LV.jc[s].bf>0)fb[s]=LV.sec});
    if(!snap&&LV.sec>=600)snap={jl:[LV.pp.me[1].lv,LV.pp.op[1].lv],jg:[LV.pp.me[1].gt,LV.pp.op[1].gt],cl:[LV.jc.me.cl,LV.jc.op.cl],st:[LV.jc.me.st,LV.jc.op.st]};
  }
  var jc=LV.jc,dt=LV.dt;
  return {len:LV.sec/60,snap:snap,fb:fb,jc:jc,dt:dt,soul:LV.soul,win:LV.res[0],cr:LV.cr,cmp:LV.cmp&&[LV.cmp.me.ty,LV.cmp.op.ty]};
}
`);
const N=+process.argv[2]||40;const R=[];
for(let i=0;i<N;i++){R.push(JSON.parse(run(ctx,`JSON.stringify(__game(${[3,10,20,40][i%4]},${[40,12,25,5][i%4]}))`)))}
const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
console.log('jogos',R.length,'dur média',mean(R.map(r=>r.len)).toFixed(1));
console.log('10min: nível jungle',mean(R.map(r=>r.snap&&r.snap.jl[0]).filter(Boolean)).toFixed(1),'ouro jg',mean(R.map(r=>r.snap&&r.snap.jg[0]).filter(Boolean)).toFixed(0),'camps limpos',mean(R.map(r=>r.snap&&r.snap.cl[0]).filter(Boolean)).toFixed(1),'roubados',mean(R.map(r=>r.snap&&r.snap.st[0]).filter(x=>x!=null)).toFixed(2));
console.log('1º buff (s) me',mean(R.map(r=>r.fb.me).filter(Boolean)).toFixed(0),'op',mean(R.map(r=>r.fb.op).filter(Boolean)).toFixed(0));
console.log('totais/jogo: camps',mean(R.map(r=>r.jc.me.cl+r.jc.op.cl)).toFixed(1),'roubos',mean(R.map(r=>r.jc.me.st+r.jc.op.st)).toFixed(2),'perdidos',mean(R.map(r=>r.jc.me.lost+r.jc.op.lost)).toFixed(2),'buffs',mean(R.map(r=>r.jc.me.bf+r.jc.op.bf)).toFixed(1),'crabs',mean(R.map(r=>r.jc.me.cr+r.jc.op.cr)).toFixed(1));
const ty={};R.forEach(r=>[0,1].forEach(i=>{const t=r.cmp&&r.cmp[i];if(t)ty[t]=(ty[t]||0)+1}));console.log('tipos de comp',ty);
const dtc={};R.forEach(r=>['me','op'].forEach(s=>Object.entries(r.dt[s]).forEach(([k,v])=>dtc[k]=(dtc[k]||0)+v)));console.log('dragões por tipo',dtc);
console.log('vitórias do time1 (fraco ou forte alternando):',R.map(r=>r.win?1:0).join(''));
