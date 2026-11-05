const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.mgr={tid:3,dr:null,bench:[],acad:[],cash:30,mor:60,rep:50,sat:60,fa:[],offers:[],log:[],focus:'eq'};mEnsure();`);
const out=[];
function log(k,v){out.push(k+': '+JSON.stringify(v))}
log('eventos',JSON.parse(run(ctx,`JSON.stringify(cevL().map(e=>e.id+':'+CEVT[e.id].d0+'-'+CEVT[e.id].d1))`)));
log('s1/s2/MSI',JSON.parse(run(ctx,`JSON.stringify([phDay(0,false),phDay(4,false),CAL.m0])`)));
// duração máxima do Split 1/2 com 12 clubes
log('fim split1 12 clubes',run(ctx,`CAL.s1+SPG.s1*(11+2)`));log('fim split2 12 clubes',run(ctx,`CAL.s2+SPG.s2*(11+2)`));
// ciclo da pré-temporada: bloqueio, configuração, passagem de dias
run(ctx,`S.day=1;S.phase=0`);
let r=JSON.parse(run(ctx,`(function(){var o=[];var k=advDay(30);o.push(['dias andados',k,'dia',S.day,'bloqueado',cevBlock()]);
 var e=cevById('pre');e.cfg={foc:'pool',int:2,lu:1,ps:[],tr:''};cevGo('pre');o.push(['st',e.st,'parceiros',e.cfg.ps.length]);
 k=advDay(40);o.push(['dias',k,'dia',S.day,'W-L',e.w+'-'+e.l,'prep',+S.mgr.prep.toFixed(3),'fat',+S.mgr.fat.toFixed(1),'sy',+S.mgr.sy.toFixed(3),'st',e.st]);
 o.push(['pool de',Object.keys(S.mgr.pool||{}).length,'jogadores']);return JSON.stringify(o)})()`));
log('pré-temporada',r);
r=JSON.parse(run(ctx,`(function(){var o=[];var e=cevById('ami');o.push(['ami bloqueia',cevBlock(),e.st,S.day]);var k=advDay(5);
 cevGo('ami');o.push(['campeão',T(e.res.champ).name,'st',e.st,'prep',+S.mgr.prep.toFixed(3),'caixa',S.mgr.cash]);
 var b=cevById('boo');advDay(10);o.push(['boot dia',S.day,b.st]);S.mgr.cash=30;cevBoot(b,'LCK');o.push(['boot',b.st,'sy',+S.mgr.sy.toFixed(3)]);return JSON.stringify(o)})()`));
log('amistoso/bootcamp',r);
// MSI e Worlds: restrição do adversário
r=JSON.parse(run(ctx,`(function(){var o=[];
 S.season.msi={teams:[3,5,8,12,20,25,30,35],stages:[{ms:[{a:3,b:35},{a:5,b:30},{a:8,b:25},{a:12,b:20}]}]};
 var e=cevById('scm'),c=cevCands(e,T(3));o.push(['cands MSI',c.length,'bloqueados',c.filter(function(x){return x.bl}).map(function(x){return x.t.id}),'inclui o adversário',c.some(function(x){return x.t.id===35})]);
 o.push(['elegível',cevElig(e,T(3)),'time fora',cevElig(e,T(40))]);
 var ids=[];for(var i=0;i<12;i++)ids.push(i);
 S.season.wc={teams:ids,stages:[{ms:[{a:0,b:7},{a:1,b:8},{a:2,b:9},{a:3,b:10},{a:4,b:11},{a:5,b:6}]}]};
 var w=cevById('scw'),cw=cevCands(w,T(3));o.push(['cands Worlds',cw.length,'bloqueados',cw.filter(function(x){return x.bl}).map(function(x){return x.t.id}),'3 vs 10 bloqueado',cw.find(function(x){return x.t.id===10}).bl]);
 return JSON.stringify(o)})()`));
log('restrições',r);
// pc/sim sem gestor: eventos passam sozinhos
run(ctx,`S.mgr=null;S.day=1;S.phase=0;`);
log('sem gestor',run(ctx,`(function(){var k=advDay(60);return JSON.stringify([k,S.day,cevL().map(function(e){return e.id+e.st}).join(' '),S.teams[0].pr])})()`));
console.log(out.join('\n'));
