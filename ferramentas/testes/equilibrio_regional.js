/* Fase 6.1: equilíbrio regional. Novatos e evolução dependem da liga (LGT); depois de 10 temporadas
   LCK/LPL seguem acima das ligas menores (sem convergência), mas sem diferença absurda. */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const bad=[],ok=(c,t)=>{if(!c)bad.push(t)};
const u=JSON.parse(run(ctx,`(function(){var a=function(lg){var s=0,p=0;for(var i=0;i<400;i++){var r=rookie(2,{r:80,avg:78,lg:lg});s+=r.r;p+=r.pot-r.r}return [s/400,p/400]};
 var t=S.teams.find(function(x){return x.lg==='CBLOL'&&x.d!==2}),k=S.teams.find(function(x){return x.lg==='LCK'&&x.d!==2});
 return JSON.stringify({lck:a('LCK'),cb:a('CBLOL'),dk:lgDev(k,{r:92}),dc:lgDev(t,{r:92})})})()`));
ok(u.lck[0]>u.cb[0]+3&&u.lck[1]>u.cb[1],'novatos da LCK melhores que os do CBLOL: '+u.lck.map(x=>x.toFixed(1))+' x '+u.cb.map(x=>x.toFixed(1)));
ok(u.dk>0&&u.dc<-1,'teto regional: estrela no CBLOL evolui menos ('+u.dk.toFixed(2)+' x '+u.dc.toFixed(2)+')');
run(ctx,`S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;`);
for(let i=0;i<10;i++)run(ctx,`(function(){var y=S.year,g=0;while(S.year===y&&g++<6000)step()})()`);
const r=JSON.parse(run(ctx,`(function(){var top=function(l){var ts=S.teams.filter(function(t){return t.lg===l&&t.d!==2}).map(baseOvr).sort(function(a,b){return b-a});return (ts[0]+ts[1]+ts[2])/3};
 return JSON.stringify({maj:(top('LCK')+top('LPL'))/2,min:(top('LCS')+top('LCP')+top('CBLOL'))/3})})()`));
ok(r.maj-r.min>=1.2,'sem convergência: top 3 LCK/LPL '+r.maj.toFixed(1)+' x ligas menores '+r.min.toFixed(1));
ok(r.maj-r.min<=8,'sem diferença absurda');
const out=bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM | top3 maiores '+r.maj.toFixed(1)+' x menores '+r.min.toFixed(1);
console.log(out);if(bad.length)process.exit(1);
