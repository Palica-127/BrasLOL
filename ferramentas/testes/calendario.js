const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.mgr={tid:3,dr:null,bench:[],acad:[],cash:30,mor:60,rep:50,sat:60,fa:[],offers:[],log:[],focus:'eq'};mEnsure();`);
const out=[];
function log(k,v){out.push(k+': '+JSON.stringify(v))}
log('eventos',JSON.parse(run(ctx,`JSON.stringify(cevL().map(e=>e.id+':'+CEVT[e.id].d0+'-'+CEVT[e.id].d1))`)));
log('s1/s2/MSI',JSON.parse(run(ctx,`JSON.stringify([phDay(0,false),phDay(4,false),CAL.m0])`)));
// duração máxima do Split 1/2 com 12 clubes
/* o split se ajusta ao tamanho da liga e nunca passa do MSI/Mundial; eventos ficam nas folgas */
log('fim split1 / split2 por liga (LPL tem 22 rodadas)',run(ctx,`JSON.stringify([22,18,14].map(n=>[CAL.s1+Math.max(2,Math.floor(SPB.s1/(n+2)))*(n+2),CAL.s2+Math.max(2,Math.floor(SPB.s2/(n+2)))*(n+2)]))`));
// pré-temporada: a janela de scrims não trava mais o calendário; só o torneio (jogado na tela Jogar) e o bootcamp travam
run(ctx,`S.day=1;S.phase=0`);
let r=JSON.parse(run(ctx,`(function(){var o=[];var k=advDay(30);var e=cevById('pre');
 o.push(['dias andados',k,'dia',S.day,'bloqueado',cevBlock(),'torneio pendente',evNow()?evNow().id:null,'janela de scrims',e.st]);
 var q=sqS();o.push(['pedidos de scrim recebidos',q.rq.length,'expiram em 3 dias',q.rq.every(function(x){return S.day-x.d<=3})]);
 return JSON.stringify(o)})()`));
log('pré-temporada',r);
// scrim sob pedido: pedir, aceitar, simular; uma por dia; nunca contra o próximo adversário oficial
r=JSON.parse(run(ctx,`(function(){var o=[],q=sqS(),t=mgrT();q.ok=null;q.pd=-1;q.ask=-1;
 var c=sqCands(t);o.push(['candidatos',c.length,'sem o próprio time',c.every(function(x){return x!==t})]);
 q.rq=[{o:c[0].id,d:S.day}];sqAcc(c[0].id);o.push(['aceito',!!q.ok,'pedido removido',q.rq.length===0]);
 var p0=S.mgr.prep||0;sqStart(true);o.push(['jogada',q.h.length,'pd hoje',q.pd===S.day,'prep subiu',(S.mgr.prep||0)>p0,'sem partida aberta',!S.season.fm]);
 sqAsk(c[1].id);o.push(['segunda no dia recusada',!q.ok,msg]);return JSON.stringify(o)})()`));
log('scrims sob pedido',r);
r=JSON.parse(run(ctx,`(function(){var o=[];var e=cevById('ami');o.push(['ami bloqueia',cevBlock(),e.st,S.day]);var k=advDay(5);
 cevGo('ami');o.push(['campeão',T(e.res.champ).name,'st',e.st,'prep',+(S.mgr.prep||0).toFixed(3),'caixa',S.mgr.cash]);
 var b=cevById('boo');advDay(10);o.push(['boot dia',S.day,b.st]);S.mgr.cash=30;cevBoot(b,'LCK');o.push(['boot',b.st,'sy',+(S.mgr.sy||0).toFixed(3)]);return JSON.stringify(o)})()`));
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
