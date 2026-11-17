/* Fase 6: motor de partidas. Mesmo mapa = mesmo resultado em qualquer velocidade (relógio fixo + sorteio por mapa),
   velocidades 1×/2×/30×, barramento de eventos (momentos-chave) e força única: a chance ao vivo segue a da simulação rápida. */
const {load,run}=require('./harness.js');
const F=require('path').join(__dirname,'..','..','index.html');
const N=+process.argv[2]||40;
const bad=[],ok=(c,t)=>{if(!c)bad.push(t)};
const game=(step,sd)=>run(load(F),`(function(){S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 __M={a:3,b:7,n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5,lsd:[${sd}]};lvOpen();lvTacApply('auto');var q=0;while(LV&&q++<40000){if(LV.state==='ckpt')lvTacApply('auto');else if(LV.state!=='run')break;lvTick(${step})}
 return JSON.stringify({r:LV.res[0]+'|'+(LV.sec|0)+'|'+LV.st.me.k+'-'+LV.st.op.k+'|'+LV.log.length,ev:(LV.evs||[]).map(function(e){return e.t}),mo:lvMoments().length,post:lvPostHTML('','').indexOf('Momentos-chave')>=0})})()`);
[4242,9001].forEach(sd=>{const a=JSON.parse(game(5,sd)),b=JSON.parse(game(1,sd)),c=JSON.parse(game(30,sd)),d=JSON.parse(game(.5,sd));
  ok(a.r===b.r&&b.r===c.r&&c.r===d.r,'mesmo mapa em qualquer velocidade (semente '+sd+'): '+[a.r,b.r,c.r,d.r].join(' / '));
  ok(a.ev.indexOf('kill')>=0&&a.ev.indexOf('end')>=0&&a.ev.indexOf('tower')>=0,'barramento registra abates, torres e o Nexus');
  ok(a.mo>0&&a.post,'momentos-chave no fim do mapa')});
const ctx=load(F);
const r=JSON.parse(run(ctx,`(function(){var o={};o.spd=LVSPD.join(',');S.opt=S.opt||{};S.opt.lvs=20;o.old=lvSpd();
 S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 var ids=S.teams.filter(function(t){return t.d!==2}).map(function(t){return t.id}).sort(function(a,b){return eff(T(b))-eff(T(a))});
 o.cal=[2,12,ids.length-1].map(function(j){var A=ids[0],B=ids[j],w=0,pp=0;for(var i=0;i<${N};i++){S.mgr.tid=A;__M={a:A,b:B,n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();pp+=lvP();lvTacApply('auto');var q=0;while(LV.state!=='done'&&LV.state!=='between'&&q++<4000){if(LV.state==='ckpt')lvTacApply('auto');lvTick(5)}if(LV.res[0])w++}
  return [Math.round(pp/${N}*100),Math.round(w/${N}*100)]});
 var m=mk(T(ids[0]),T(ids[12]),1);S.mgr=null;o.same=Math.abs(mQa(m,false).qa-mQa(m,true).qa)<1e-9;
 var po=poMk({down:T(ids[5]),up:T(ids[20])});o.qb=po.qb===.16;
 return JSON.stringify(o)})()`));
ok(r.spd==='1,2,30'&&r.old===30,'velocidades 1×, 2× e 30× (save antigo em 20× vai para 30×)');
ok(r.same,'mesma força na simulação rápida e no mapa ao vivo');
ok(r.qb,'bônus do play-off de acesso guardado na partida');
r.cal.forEach(([a,b])=>ok(Math.abs(a-b)<=15,'ao vivo segue a força: alvo '+a+'% real '+b+'%'));
ok(r.cal[2][1]>r.cal[0][1],'favorito claro vence mais que em confronto parelho');
const out=bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM | calibração '+r.cal.map(x=>x[0]+'→'+x[1]).join(', ');
console.log(out);if(bad.length)process.exit(1);
