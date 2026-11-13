/* CS aos 10 e 15 minutos por função: laners 90-110, caçador 75-100, suporte baixo; e se o farm continua depois dos 15 */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
function __game(a,b){
  __M={a:a,b:b,n:1,res:null};S.mgr.dr=null;
  dvOpen();dvAll();dvGo();lvOpen();LV.cp=0;lvTacApply('auto');
  var s10=null,s15=null,s20=null,s25=null;
  var cs=function(){return [0,1,2,3,4].map(function(r){return (LV.pp.me[r].cs+LV.pp.op[r].cs)/2})};
  while(LV.state==='run'||LV.state==='ckpt'){
    if(LV.state==='ckpt'){lvTacApply('auto');continue}
    lvTick(1);
    if(!s10&&LV.sec>=600)s10=cs();if(!s15&&LV.sec>=900)s15=cs();if(!s20&&LV.sec>=1200)s20=cs();if(!s25&&LV.sec>=1500)s25=cs();
  }
  return {len:LV.sec/60,s10:s10,s15:s15,s20:s20,s25:s25};
}`);
const N=+process.argv[2]||24;const R=[];
for(let i=0;i<N;i++)R.push(JSON.parse(run(ctx,`JSON.stringify(__game(${[3,10,20,40][i%4]},${[40,12,25,5][i%4]}))`)));
const mean=(a)=>a.reduce((x,y)=>x+y,0)/(a.length||1);
['s10','s15','s20','s25'].forEach(k=>{const rs=R.filter(r=>r[k]);console.log(k,'(n='+rs.length+')','TOP/JG/MID/ADC/SUP',[0,1,2,3,4].map(i=>mean(rs.map(r=>r[k][i])).toFixed(0)).join(' / '))});
console.log('duração média',mean(R.map(r=>r.len)).toFixed(1));
