const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
ctx.__COMPS={en:['Ornn','Sejuani','Orianna','Samira','Nautilus'],pk:['Jayce','Nidalee','Xerath','Caitlyn','Karma'],pr:['Jax','Kindred','Azir','Jinx','Lulu'],sp:['Fiora',"Bel'Veth",'Ryze','Tristana','Janna'],sk:['Renekton','Lee Sin','LeBlanc','Draven','Pyke'],ne:['Gnar','Vi','Ahri',"Kai'Sa",'Thresh']};
run(ctx,`S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
var COMPS=__COMPS;
mastOf=function(){return .5};metaOf=function(){return 0};var best=null;for(var i=0;i<30;i++)for(var j=i+1;j<S.teams.length;j++){var d=Math.abs(eff(T(i))-eff(T(j)));if(d<.15&&!best)best=[i,j]}
function __g(a,b,pa,pb){__M={a:a,b:b,n:1,res:null,od:COMPS[pb].slice(),odm:'eq',hint:'eq',dd:1};S.mgr.tid=a;S.mgr.dr=COMPS[pa].slice();lvOpen();LV.cp=0;lvTacApply('auto');
 while(LV.state==='run'||LV.state==='ckpt'){if(LV.state==='ckpt'){lvTacApply('auto');continue}lvTick(2)}return LV.res[0]?1:0}
`);
const pair=JSON.parse(run(ctx,'JSON.stringify(best)'));console.log('times',pair);
const types=['en','pk','pr','sp','sk'],N=+process.argv[2]||60;
const tbl={};
for(const x of types){tbl[x]={};for(const y of types){let w=0;
  for(let k=0;k<N;k++){// metade com cada lado como "me" para neutralizar o lado azul/força
    if(k%2===0)w+=+run(ctx,`__g(${pair[0]},${pair[1]},'${x}','${y}')`);
    else w+=+run(ctx,`__g(${pair[1]},${pair[0]},'${x}','${y}')`);}
  tbl[x][y]=Math.round(w/N*100)}}
console.log('vitória % da linha contra a coluna');console.table(tbl);
