/* Técnicos: cada time tem um; no modo treinador o técnico real vira assistente e volta ao comando quando você sai;
   mercado na virada (demissões, contratações, aposentadorias) nunca deixa time sem técnico nem técnico em dois times; ficha e busca */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 var semTec=function(){return ALLT().filter(function(t){return !(S.mgr&&S.mgr.tid===t.id)&&!coOf(t)}).map(function(t){return t.name})};
 var dup=function(){var v={},d=[];ALLT().forEach(function(t){var c=coOf(t);if(!c)return;if(v[c.n])d.push(c.n);v[c.n]=1});return d};
 ok(semTec().length===0,'time sem técnico no começo: '+semTec());
 ok(dup().length===0,'técnico em dois times: '+dup());
 var real=Object.keys(COACH).length;
 if(real){var g=S.teams.find(function(t){return t.name==='Gen.G'});ok(coOf(g)&&coOf(g).n===COACH['Gen.G'][0],'técnico real da Gen.G');}
 /* modo treinador: o técnico real vira assistente */
 var t=S.teams[5],c0=coOf(t).n;
 mgrStart(t.id);
 ok(S.mgr.coach&&S.mgr.coach.co&&S.mgr.coach.n===c0,'técnico real vira assistente ao assumir o time');
 ok(S.co[c0].as===1&&S.co[c0].t===t.id,'assistente segue no clube');
 ok(vTeam(t.id).indexOf('Técnico: você')>=0,'ficha do time mostra você como técnico');
 /* troca de clube: o antigo volta ao comando */
 var t2=S.teams[12],c2=coOf(t2).n;
 mgrStart(t2.id);
 ok(S.co[c0].t===t.id&&S.co[c0].as===0&&coOf(t)&&coOf(t).n===c0,'técnico volta ao comando quando você sai');
 ok(S.mgr.coach&&S.mgr.coach.n===c2,'novo clube: novo assistente');
 /* dispensar o assistente: fica livre; o time continua sem ninguém além de você */
 mgrCoach('-');
 ok(S.co[c2].t==null,'dispensado fica sem clube');
 ok(!S.mgr.coach,'sem assistente depois de dispensar');
 /* demissão: o time contrata outro técnico */
 mgrFire('teste');
 ok(coOf(t2),'time que te demitiu tem técnico');
 /* virada de ano várias vezes */
 var ev=0;
 for(var y=0;y<6;y++){
  ALLT().forEach(function(x){x.yh=x.yh||[];x.yh.push({y:S.year,s1:1+Math.floor(Math.random()*10),s2:1+Math.floor(Math.random()*10)})});
  var off=[];coYear(off);ev+=off.length;S.year++;
  ok(semTec().length===0,'ano '+S.year+': time sem técnico '+semTec());
  ok(dup().length===0,'ano '+S.year+': técnico em dois times '+dup());
 }
 ok(ev>0,'mercado de técnicos teve movimento em 6 anos');
 ok(Object.values(S.co).some(function(c){return c.hist.length>=3}),'histórico registrado');
 /* ficha e busca */
 var any=Object.values(S.co).find(function(c){return c.t!=null});
 var h=vCoach(any.n);ok(h.indexOf('Carreira')>=0&&h.indexOf(esc(any.n))>=0,'ficha do técnico');
 psQ=any.n;ok(psResults().some(function(r){return r.k==='c'&&r.id===any.n}),'busca encontra técnico');psQ='';
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM ('+Object.keys(S.co).length+' técnicos, '+real+' reais, '+ev+' movimentos)';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
