'use strict';
/* Balanceamento do motor CLASSICO (index.html): mesmas metricas do balanceamento.js (motor realista), medidas em partidas completas.
   Uso: node ferramentas/balanceamento_classico.js [partidas=60] [rotulo=classico]   (SEED=<n> muda a semente base do harness)
   Alvos: os mesmos de docs/BLOCO10_BALANCEAMENTO.md (ESTIMADOS, medias aproximadas de ligas profissionais, sem fonte citavel). */
const path = require('path'), fs = require('fs');
const { load, run } = require('./testes/harness.js');
const N = +process.argv[2] || 60, LABEL = process.argv[3] || 'classico';
const ctx = load(path.join(__dirname, '..', 'index.html'));
const out = run(ctx, `(function(){
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=1;var __M=null;mgrMatch=function(){return __M};S.mgr={tid:3,dr:null,bench:[],acad:[]};
 var pairs=[[3,7],[3,11],[3,40],[0,50],[2,55],[5,6],[8,20],[12,30]],rows=[];
 for(var i=0;i<${N};i++){var pr=pairs[i%pairs.length];S.mgr.tid=pr[0];__M={a:pr[0],b:pr[1],n:1,res:null,od:null,dd:0,qa:.5,d:0,pa:.5};lvOpen();lvTacApply('auto');var q=0;while(LV.state==='run'&&q++<3000)lvTick(5);
  var min=LV.sec/60,r={min:min,k:LV.st.me.k+LV.st.op.k,blueWin:null,ganks:LV.ev.ganks,ev:JSON.parse(JSON.stringify(LV.ev)),dr:LV.st.me.d+LV.st.op.d,her:LV.st.me.h+LV.st.op.h,bar:LV.st.me.b+LV.st.op.b,tw:LV.st.me.t+LV.st.op.t,roles:[]};
  var win=LV.res[0];r.blueWin=(win===(LV.us==='a'))?1:0;
  ['me','op'].forEach(function(s){LV.pp[s].forEach(function(P){r.roles[P.r]=r.roles[P.r]||[];r.roles[P.r].push({cs:(P.cs||0)/min,gold:(P.gt||0)/min,lv:P.lv})})});
  rows.push(r);lvDone()}
 return JSON.stringify(rows)})()`);
const rows = JSON.parse(out), avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), f = (a, d = 2) => +avg(a).toFixed(d);
const names = ['top', 'jungle', 'mid', 'adc', 'support'], cs = {}, lv = {}, gold = {};
names.forEach((n, r) => { const all = rows.flatMap(x => x.roles[r]); cs[n] = f(all.map(p => p.cs), 1); lv[n] = f(all.map(p => p.lv), 1); gold[n] = f(all.map(p => p.gold), 0); });
const res = { partidas: rows.length, duracaoMin: f(rows.map(r => r.min), 1), killsPorMin: f(rows.map(r => r.k / r.min)), cs, nivelPorFuncao: lv, ouroPorMinPorFuncao: gold,
  ouroPorMinJogador: f(rows.flatMap(r => r.roles.flat().map(p => p.gold)), 0), nivelFinalMedio: f(rows.flatMap(r => r.roles.flat().map(p => p.lv)), 1),
  dragoesTotal: f(rows.map(r => r.dr)), arautoTotal: f(rows.map(r => r.her)), baraoTotal: f(rows.map(r => r.bar)), torresCaidasTotal: f(rows.map(r => r.tw), 1), ganksPorJogo: f(rows.map(r => r.ganks), 1), vitoriasAzul: f(rows.map(r => r.blueWin)) };
const evk = Object.keys(rows[0].ev); res.eventos = {}; evk.forEach(k => { res.eventos[k] = f(rows.map(r => r.ev[k]), 1); });
console.log(JSON.stringify(res, null, 1));
fs.mkdirSync(path.join(__dirname, 'balanceamento'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'balanceamento', LABEL + '.json'), JSON.stringify({ N, res, rows }));
