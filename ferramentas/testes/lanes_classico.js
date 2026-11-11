/* Classico: preparo de onda antes de dragao/Barao e rotacao do ADC pelo kit (portados do motor realista). */
const { load, run } = require('./harness.js');
const path = require('path');
const ctx = load(path.join(__dirname, '..', '..', 'index.html'));
let bad = 0; const T = (ok, m) => { console.log((ok ? 'OK  ' : 'FALHA ') + m); if (!ok) bad++; };
const r = JSON.parse(run(ctx, `(function(){
  S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
  __M={a:3,b:7,n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();lvTacApply('auto');
  var o={};
  LV.sec=1000;LV.dn.d=1060;LV.dn.b=1e9;o.dragao=lvPrepLanes();
  LV.dn.d=1100;o.longe=lvPrepLanes();
  LV.dn.d=1e9;LV.dn.b=1050;o.barao=lvPrepLanes();
  LV.dn.b=1e9;o.nada=lvPrepLanes();
  /* lider em ouro prepara */
  LV.dn.d=1060;LV.pp.me.forEach(function(P){P.gt=5000});LV.pp.op.forEach(function(P){P.gt=100});o.lider=lvPrepLanes()[0].s;
  LV.pp.me.forEach(function(P){P.gt=100});LV.pp.op.forEach(function(P){P.gt=5000});o.lider2=lvPrepLanes()[0].s;
  /* a onda da rota do objetivo anda para o lado do time que prepara */
  LV.lw.me={0:'top',2:'mid',3:'bot',4:'bot'};LV.pp.me.forEach(function(P){P.gt=5000});LV.pp.op.forEach(function(P){P.gt=100});
  LV.dn.b=1050;LV.dn.d=1060;o.ambos=lvPrepLanes().map(function(q){return q.L}).sort().join(',');
  LV.dn.b=1e9;
  LV.ln.bot.u=.5;LV.dn.d=1060;LV.sec=1000;var u0=LV.ln.bot.u;for(var i=0;i<30;i++){lvWave(1)}o.du=(LV.ln.bot.u-u0)*(LV.us==='a'?1:-1);
  LV.ln.top.u=.5;var t0=LV.ln.top.u;for(var j=0;j<30;j++){lvWave(1)}o.duTop=(LV.ln.top.u-t0)*(LV.us==='a'?1:-1);
  return JSON.stringify(o)})()`));
T(r.dragao.length === 1 && r.dragao[0].L === 'bot', 'dragao nasce em <=80 s: prepara a rota inferior');
T(r.longe.length === 0, 'dragao a 100 s: ainda nao prepara');
T(r.barao.length === 1 && r.barao[0].L === 'top', 'Barao em <=80 s: prepara a rota superior');
T(r.nada.length === 0, 'sem objetivo proximo: nenhum preparo');
T(r.ambos === 'bot,top', 'dragao e Barao na mesma janela: prepara as duas rotas');
T(r.lider === 'me' && r.lider2 === 'op', 'quem esta na frente em ouro e quem prepara');
T(r.du > r.duTop + 0.01, 'a onda da rota do objetivo avanca para o lado de quem prepara (' + r.du.toFixed(3) + ' vs ' + r.duTop.toFixed(3) + ')');
console.log(bad ? '\nHA FALHAS' : '\nTODOS OS TESTES PASSARAM'); process.exit(bad ? 1 : 0);
