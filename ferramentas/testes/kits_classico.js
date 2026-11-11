/* Kits no motor classico: perfil de combate (KITP/kpOf) cobre os campeoes, entra em lvBrawl e cada eixo mexe na luta na direcao certa. */
const { load, run } = require('./harness.js');
const path = require('path');
const ctx = load(path.join(__dirname, '..', '..', 'index.html'));
let bad = 0; const T = (ok, m) => { console.log((ok ? 'OK  ' : 'FALHA ') + m); if (!ok) bad++; };
const r = JSON.parse(run(ctx, `(function(){
  var out={}; var names=Object.keys(CHD);
  out.semPerfil=names.filter(function(n){return !KITP[n]});
  out.fora=names.filter(function(n){var k=kpOf(n);return [k.b,k.c,k.s,k.m,k.r].some(function(v){return !(v>=0&&v<=1)})});
  out.ficha=names.filter(function(n){return KITP[n]&&KITP[n].h.length<4}).length;
  S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
  __M={a:3,b:7,n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();lvTacApply('auto');
  var A=LV.pp.me,B=LV.pp.op;
  function duelo(ka,kb,n){var w=0,tot=0;for(var i=0;i<n;i++){A.concat(B).forEach(function(P){P.hp=1;P.b0=1.2});A.forEach(function(P){P.kp=ka});B.forEach(function(P){P.kp=kb});LV.q=[];var res=lvBrawl(50,50,A,B,{});if(res.win===0)w++;if(res.win!==-1)tot++}return tot?w/tot:.5}
  var neutro=KP0,N=400;
  out.base=duelo(neutro,neutro,N);
  out.burst=duelo({b:1,c:.35,s:.35,m:.35,r:.4},neutro,N);
  out.controle=duelo({b:.5,c:1,s:.35,m:.35,r:.4},neutro,N);
  out.mobilidade=duelo({b:.5,c:.35,s:.35,m:1,r:.4},neutro,N);
  return JSON.stringify(out)})()`));
T(r.semPerfil.length === 0, 'todos os campeoes do CHDATA tem perfil de kit' + (r.semPerfil.length ? ': ' + r.semPerfil.join(',') : ''));
T(r.fora.length === 0, 'perfis dentro de 0..1');
T(r.ficha === 0, 'todo campeao tem ao menos 4 entradas de habilidade na ficha (' + r.ficha + ' sem)');
T(Math.abs(r.base - .5) < .08, 'lados neutros: luta equilibrada (' + r.base.toFixed(2) + ')');
T(r.burst > r.base + .03, 'explosao alta vence neutro (' + r.burst.toFixed(2) + ' vs base ' + r.base.toFixed(2) + ')');
T(r.controle > r.base + .02, 'controle alto vence neutro (' + r.controle.toFixed(2) + ')');
T(r.mobilidade > r.base - .02, 'mobilidade alta nao perde para neutro (' + r.mobilidade.toFixed(2) + ')');
console.log(bad ? '\nHA FALHAS' : '\nTODOS OS TESTES PASSARAM'); process.exit(bad ? 1 : 0);
