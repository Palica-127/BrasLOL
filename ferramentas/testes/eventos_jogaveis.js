/* scrims e exibições jogáveis: usam o mesmo caminho das partidas oficiais, mas não tocam em tabela, forma nem histórico oficial */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx,`(function(){
 var o=[],ok=function(c,t){o.push((c?'OK  ':'FALHA ')+t)};
 S.opt=S.opt||{};S.opt.draft=1;S.opt.live=1;
 S.mgr={tid:3,dr:null,bench:[],acad:[],cash:50,sat:50,log:[],mor:60,rep:50,pool:{}};
 var t=mgrT();S.season.cev=null;S.phase=0;S.day=5;
 /* scrim de pré-temporada */
 var e=cevById('pre');e.cfg={foc:'comp',int:1,lu:1,ps:[],tr:''};cevGo('pre');
 ok(e.st===1,'scrims iniciadas');
 var pid=e.cfg.ps[0],mom=S.teams.map(function(x){return x.mom+'|'+x.fm+'|'+x.hot}).join();
 var rec=JSON.stringify(S.season.res)+JSON.stringify(S.season.perf);
 ok(cevPlayStart('sc','pre',pid),'scrim aberta');
 ok(!!LV&&LV.m.fr===1&&LV.m.n===3,'mapa ao vivo MD3 amistoso');
 /* joga a série inteira automaticamente pelo mesmo motor */
 var g=0;while(LV&&g++<20){lvAll();if(LV&&LV.state==='done')break}
 ok(LV&&LV.state==='done','série terminou');
 var fr=LV.m.fr;lvDone();cevFmEnd();
 ok(!S.season.fm&&e.hist&&e.hist.length===1,'resultado registrado no histórico do evento ('+(e.hist&&e.hist[0].sc)+')');
 ok(e.hist[0].gs.length>=2,'estatísticas por mapa guardadas');
 ok(rec===JSON.stringify(S.season.res)+JSON.stringify(S.season.perf),'sem efeito em resultados oficiais');
 ok(mom===S.teams.map(function(x){return x.mom+'|'+x.fm+'|'+x.hot}).join(),'sem efeito em forma e moral dos clubes');
 ok(!cevPlayStart('sc','pre',pid),'só uma scrim por dia');
 /* exibição jogável */
 S.day=20;var x=cevById('ami');ok(cevBlock()===true,'evento aguarda decisão');
 ok(cevPlayStart('ex','ami',0),'semifinal aberta');
 g=0;while(LV&&g++<20){lvAll();if(LV&&LV.state==='done')break}
 lvDone();cevFmEnd();
 ok(x.st===2||(x.pl&&x.pl.st==='fin'),'semifinal resolvida: '+(x.st===2?'derrota, campeão simulado':'na final'));
 if(x.pl&&x.pl.st==='fin'){ok(cevPlayStart('ex','ami',0),'final aberta');g=0;while(LV&&g++<20){lvAll();if(LV&&LV.state==='done')break}lvDone();cevFmEnd();ok(x.st===2&&x.res&&x.res.played,'torneio concluído com campeão '+T(x.res.champ).name)}
 /* nada acontece durante campeonato */
 S.season.sp={tag:'s1',lg:t.lg,stage:'rr',cur:[],rounds:[[]],ri:0,rec:{},last:[]};
 S.day=161;var y=cevById('mid');ok(cevChamp()&&!cevBlock(),'evento bloqueado com split em andamento');
 var st0=y.st;cevGo('mid');ok(y.st===st0,'cevGo recusado durante campeonato');
 S.season.sp=null;
 return o.join(" || ")})()`));
