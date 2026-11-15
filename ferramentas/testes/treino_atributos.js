/* Gestão: os 5 atributos (Lane, Mecânica, Macro, Equipe, Mental) aparecem no Treino individual com o treino que mais rende;
   treinar um atributo sobe ele e o OVR na proporção do peso na função. Seu técnico só conta títulos ganhos depois de chegar ao clube */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 /* atributos da base batem com o OVR */
 S.teams.slice(0,10).forEach(function(t){t.pl.forEach(function(p){var a=atBase(p);ok(Math.abs(pcOvr(p.role,a)-p.r)<=1,'base de '+p.n+' '+a+' ovr '+p.r)})});
 menuV='mgr';tab='menu';coF={name:'Tite Rift',nat:'BRA',age:41,sty:'ag',ph:''};act('meCreate');
 var t=S.teams.find(function(x){return x.lg==='CBLOL'});mgrPick=t.id;act('mgrStart');
 var m=S.mgr,p=t.pl[1];
 mgrView='inicio';var v=vMgr();ok(v.indexOf('class="tat"')>=0&&v.indexOf('rende mais')>=0,'atributos na Gestão');
 var b=trBest(p),k=Object.keys(TRA).find(function(x){return TRA[x]===b});m.tr[p.n]=k;
 var a0=pAt(p)[b],r0=effR(p,t);for(var i=0;i<20;i++)mgrDay();
 ok(pAt(p)[b]>a0&&effR(p,t)>r0,'treino sobe atributo e OVR: '+a0+'→'+pAt(p)[b]);
 var ta=m.ta[p.n],dp=ta.reduce(function(s,x,i){return s+x*PCW[p.role][i]},0);ok(Math.abs(dp-m.tp[p.n])<1e-6,'atributos e nível coerentes');
 m.tr[p.n]='';var tp=m.tp[p.n];mgrDay();ok(m.tp[p.n]<tp&&Math.abs(m.ta[p.n].reduce(function(s,x,i){return s+x*PCW[p.role][i]},0)-m.tp[p.n])<1e-6,'sem foco cai junto');
 /* título antes da chegada não conta */
 var c=meCo();
 t.tt.push({y:S.year,k:'CBLOL Split 1',r:[]});
 c.jp={y:S.year,ph:PHI('aw')};
 var off=[];coYear(off);
 ok(!coTitles(c).some(function(x){return x.k==='CBLOL Split 1'}),'Split 1 ganho antes da chegada não conta: '+JSON.stringify(coTitles(c)));
 /* título novo grava o técnico */
 S.year++;award(t,'lg','CBLOL Split 1');var e=t.tt[t.tt.length-1];ok(e.co==='Tite Rift','título grava o técnico: '+e.co);
 /* migração: contratado depois do Split 3 (sem metas abertas) */
 delete c.jp;c.hist.forEach(function(h){delete h.f});S.cjV=0;m.since=S.year-1;m.log=['Contratado pelo '+m.tn+' em '+m.since+'.'];
 fixCoJoin();ok(c.jp&&c.jp.ph===PHI('s3')+1&&!coTitles(c).some(function(x){return x.y===m.since}),'migração do save antigo');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
