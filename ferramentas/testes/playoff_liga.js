/* Playoffs da liga: 6 times, chave winner/loser, escolha do 1º colocado. */
const {load,run}=require('./harness.js');const path=require('path');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else fail++;console.log((c?'ok   ':'FALHA ')+m)};
const ctx=load(path.join(__dirname,'..','..','index.html'));
/* 1. simulação automática de todas as ligas, várias vezes */
const a=JSON.parse(run(ctx,`(function(){var bad=0,n=0,first=0;for(var k=0;k<40;k++){LGS.forEach(function(lg){var r=runLeagueFull(lg,'t');n++;var b=r.br;if(!r.champ||!r.runner||r.third.length<1||!b)bad++;if(r.champ===r.runner)bad++})}return JSON.stringify({n:n,bad:bad})})()`));
ok(a.bad===0,`40 simulações de todas as ligas sem erro (${a.n} ligas)`);
/* 2. carreira: usuário é o 1º colocado e escolhe */
const b=JSON.parse(run(ctx,`(function(){var o={};act('ttlNew','0');var lg='LCK';var t=S.teams.filter(function(x){return x.lg===lg})[0];S.mgr={tid:t.id,dr:null,bench:[],acad:[]};S.mode='mgr';
S.season.res={};spStart('t');var sp=S.season.sp;o.lg=sp.lg;var g=0;
while(sp.stage==='rr'&&g++<100){spStep()}
/* força o usuário como 1º */
o.stage=sp.stage;o.seed1=sp.po.s[0]===myTid();
if(!o.seed1){sp.po.s=[myTid()].concat(sp.po.s.filter(function(x){return x!==myTid()}).slice(0,5));sp.cur=poMake(sp.po,0)}
spStep();spStep();/* quartas -> pede escolha */
o.ask=sp.ask?sp.ask.length:0;o.r=sp.r;
var pick=sp.ask&&sp.ask[0];plPick(pick);o.pk=sp.po.pk===pick;
var g2=0;while(S.season.sp&&g2++<20)spStep();
var rs=S.season.res.t.find(function(x){return x.lg===o.lg});
o.done=!S.season.sp;o.br=!!(rs&&rs.br);o.champ=rs&&rs.champ;
o.html=poBracketHTML(rs.br,false).length;
return JSON.stringify(o)})()`));
console.log(JSON.stringify(b));
ok(b.ask===2,'1º colocado recebe 2 opções de adversário');
ok(b.pk,'escolha registrada');
ok(b.done&&b.br&&b.champ,'liga encerra com campeão e bracket');
ok(b.html>500,'bracket renderiza');
console.log(pass+' ok, '+fail+' falhas');
/* 3. recarregar o save entre as rodadas (JSON) não pode quebrar a chave */
const c=JSON.parse(run(ctx,`(function(){var o={};try{S.season.res={};spStart('t');var sp=S.season.sp,z=0;while(sp.stage==='rr'&&z++<100)spStep();var k=0;CUPSIM=1;while(S.season.sp&&k++<10){S=JSON.parse(JSON.stringify(S));spStep()}CUPSIM=0;o.ok=!S.season.sp}catch(e){o.err=String(e)}return JSON.stringify(o)})()`));
ok(c.ok&&!c.err,'chave sobrevive a salvar/carregar entre as rodadas '+(c.err||''));
console.log(pass+' ok, '+fail+' falhas');
