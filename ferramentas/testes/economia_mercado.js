/* Fase 4: valores de mercado realistas e sem inflação ao longo das temporadas, salário ligado ao valor,
   tamanho do clube (marca) puxando receita e caixa inicial, e resumo da proposta nas telas de negociação */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const snap=`(function(){var P=[];S.teams.forEach(function(t){if(t.d!==2)t.pl.forEach(function(p){P.push(p)})});P.sort(function(a,b){return b.r-a.r});
 return JSON.stringify({top:mvOf(P[0]),buyTop:r1(mvOf(P[0])*(P[0].r>=88?1.4:1.15)*PM()),med:mvOf(P[Math.floor(P.length/2)]),medR:P[Math.floor(P.length/2)].r,top10:P.slice(0,10).reduce(function(a,p){return a+mvOf(p)},0)/10})})()`;
const a=JSON.parse(run(ctx,snap));
const bad=[],ok=(c,t)=>{if(!c)bad.push(t)};
ok(a.buyTop<=50&&a.buyTop>=25,'craque custa entre 25 e 50 mi (custa '+a.buyTop+')');
ok(a.med>=2&&a.med<=12,'titular mediano vale 2 a 12 mi ('+a.med+')');
const r=JSON.parse(run(ctx,`(function(){var out={},bad=[];
 var g=S.teams.find(function(t){return t.name==='Gen.G'||t.name==='T1'}),sm=S.teams.filter(function(t){return t.d!==2&&(t.lg==='CBLOL'||t.lg==='LCP')}).sort(function(a,b){return brandOf(a)-brandOf(b)})[0];
 out.bg=brandOf(g);out.bs=brandOf(sm);out.rg=clubRev(g,null);out.rs=clubRev(sm,null);out.cg=cashStart(g);out.cs=cashStart(sm);
 var p=g.pl[0];out.sal=salOf(p);out.mv=mvOf(p);
 coF={name:'Chefe Eco',nat:'BRA',age:40,sty:'eq',ph:''};menuV='mgr';act('meCreate');mgrPick=sm.id;act('mgrStart');
 out.cash0=S.mgr.cash;S.mgr.cash=200;
 var tgt=S.teams.filter(function(t){return t.id!==sm.id&&t.d!==2})[3],pl=tgt.pl[1];
 S.mgr.cheat=1;ngClub(pl.n);S.mgr.cheat=0;out.pc=NGO?negoHTML():'SEM '+msg;
 NGO=null;var fa=FA()[0];if(fa){S.mgr.cheat=1;ngPlayer('fa',fa.n);S.mgr.cheat=0;out.ph=NGO?negoHTML():''}
 out.fin=finHTML(mgrT(),S.mgr);
 return JSON.stringify(out)})()`));
ok(r.bg>r.bs,'clube grande tem marca maior ('+r.bg+' x '+r.bs+')');
ok(r.rg.gate+r.rg.spons>r.rs.gate+r.rs.spons,'clube grande fatura mais');
ok(r.cg>r.cs&&r.cash0===r.cs,'caixa inicial pelo tamanho do clube ('+r.cg+' x '+r.cs+')');
ok(Math.abs(r.sal-Math.max(.2,Math.round(r.mv*.22*10)/10))<.01,'salário = 22% do valor');
ok(/ngsum/.test(r.pc)&&/Valor de mercado/.test(r.pc)&&/Caixa depois/.test(r.pc)&&/Pedida do clube/.test(r.pc),'computador mostra resumo da proposta: '+r.pc.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,200));
ok(!r.ph||(/ngsum/.test(r.ph)&&/Luvas pedidas/.test(r.ph)&&/Salário/.test(r.ph)),'celular mostra resumo da proposta');
ok(/tamanho do clube/.test(r.fin),'finanças mostram o tamanho do clube');
/* inflação: 12 temporadas */
run(ctx,`S.mgr=null;S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;`);
for(let i=0;i<12;i++)run(ctx,`(function(){var y=S.year,g=0;while(S.year===y&&g++<5000)step()})()`);
const b=JSON.parse(run(ctx,snap));
ok(b.top10<=a.top10*1.35,'top 10 sem inflação: '+a.top10.toFixed(1)+' -> '+b.top10.toFixed(1)+' (OVR mediano '+a.medR+' -> '+b.medR+')');
ok(b.buyTop<=55,'craque continua abaixo de 55 mi depois de 12 anos ('+b.buyTop+')');
const out=bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM | craque '+a.buyTop+' -> '+b.buyTop+' · top10 '+a.top10.toFixed(1)+' -> '+b.top10.toFixed(1);
console.log(out);if(bad.length)process.exit(1);
