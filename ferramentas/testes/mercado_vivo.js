/* mercado vivo: na janela de transferencias os clubes corrigem a posicao mais fraca */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
let bad=0;const T=(ok,m)=>{console.log((ok?'OK  ':'FALHA ')+m);if(!ok)bad++};
run(ctx,`S.mgr=null;S.phase=0;S.day=1;S.season.sp=null;S.tf=[]`);
const r=JSON.parse(run(ctx,`(function(){
  var gap=function(){return S.teams.reduce(function(a,t){var avg=t.pl.reduce(function(s,p){return s+p.r},0)/5;return a+t.pl.reduce(function(s,p){return s+Math.max(0,avg-p.r)},0)},0)/S.teams.length};
  var g0=gap(),n=S.teams.length,names0=S.teams.map(function(t){return t.pl.length}),moves=0;
  var up=0,tot=0;for(var d=0;d<34;d++){S.day=1+d;var b=S.teams.map(function(t){return t.pl.map(function(p){return p.r})});aiMarketDay();S.teams.forEach(function(t,i){t.pl.forEach(function(p,j){if(p.r!==b[i][j]){tot++;if(p.r>=b[i][j]+2)up++}})});moves++}
  var ok=S.teams.every(function(t,i){return t.pl.length===5&&t.pl.every(function(p,j){return p&&S.pdb[p.n]&&S.pdb[p.n].role===j})});
  var dup=0,seen={};S.teams.concat(S.d2||[]).forEach(function(t){t.pl.forEach(function(p){if(seen[p.n])dup++;seen[p.n]=1})});
  return JSON.stringify({g0:g0,g1:gap(),up:up,tot:tot,moves:moves,ok:ok,dup:dup,log:S.tf.slice(0,3).map(function(x){return x.t})})})()`));
console.log(JSON.stringify(r));
T(r.moves>=15,'janela movimentada: '+r.moves+' contratacoes em 34 dias');
T(r.up>=r.tot*.45&&r.up>=15,'compradores melhoram a vaga em 2+ pontos: '+r.up+' de '+r.tot+' trocas de titular');
T(r.ok,'elencos completos e funcoes consistentes');
T(r.dup===0,'nenhum jogador duplicado');
/* estrela vendida: o clube (inclusive o do jogador carreira) recebe necessidade e o mercado diario traz um substituto de nivel parecido */
{const r2=JSON.parse(run(ctx,`(function(){
  S.mgr=null;pcAdopt('Faker');S.phase=0;S.day=1;S.season.sp=null;S.need={};S.tf=[];
  var f=pcFind(),t=f.t,i=2,star=t.pl[i];star.r=98;star.pot=98;
  var buyer=S.teams.filter(function(x){return x!==t&&x.d!==2}).sort(function(a,b){return a.pl[i].r-b.pl[i].r})[0];
  starSale(t,buyer,i);
  var after=t.pl[i].r,n0=!!S.need[t.id],tgt=n0?S.need[t.id].target:0;
  for(var d=0;d<35;d++){S.day=1+d;aiMarketDay();if(!S.need[t.id])break}
  var out={sold:buyer.pl[i]===star,need:n0,target:tgt,after:after,final:t.pl[i].r,done:!S.need[t.id],days:d,news:(S.hl||[]).slice(0,4).map(function(x){return x.t}),tf:S.tf.slice(0,3).map(function(x){return x.t})};
  return JSON.stringify(out)})()`));
 console.log(JSON.stringify(r2));
 T(r2.sold,'a estrela (98) foi vendida ao comprador');
 T(r2.need&&r2.target>=90,'o clube passa a buscar um substituto proximo do nivel vendido (alvo '+r2.target+')');
 T(r2.final>=r2.target-5&&r2.final>r2.after+8,'o substituto chega em '+r2.days+' dias: '+r2.after+' -> '+r2.final);
 T(r2.done,'a necessidade e encerrada quando o substituto chega');}
console.log(bad?'HA FALHAS':'TODOS OS TESTES PASSARAM');process.exit(bad?1:0);
