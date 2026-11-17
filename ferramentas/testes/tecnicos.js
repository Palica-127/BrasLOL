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
 /* estante de jogador e reforço pequeno para quem tem títulos */
 var g2=S.teams.find(function(t){return t.name==='G2'});
 if(g2&&coOf(g2)&&COTIT[coOf(g2).n]){var b=coBoost(g2);ok(b>0&&b<=.65,'reforço do técnico com títulos pequeno e positivo: '+b);ok(vCoach(coOf(g2).n).indexOf('Estante da época de jogador')>=0,'estante de jogador na ficha')}
 var semT=ALLT().find(function(t){var c=coOf(t);return c&&!COTIT[c.n]&&!c.ex&&!coTitles(c).length&&!(S.mgr&&S.mgr.tid===t.id)});
 /* Fase 3: a força vem dos atributos de treinador (Tática/Leitura/Motivação), não só dos títulos; continua pequena */
 ok(!semT||(coBoost(semT)>=0&&coBoost(semT)<=.65),'técnico sem títulos: reforço pelos atributos, pequeno');
 /* aposentado vira técnico e é contratado */
 var rt=S.teams[3],rp=rt.pl[2],R=Math.random;Math.random=function(){return 0};coFromPlayer(rp,rt);Math.random=R;
 ok(S.co[rp.n]&&S.co[rp.n].ex===1&&S.co[rp.n].t==null,'aposentado entra no mercado de técnicos');
 var vt=S.teams.find(function(t){return !(S.mgr&&S.mgr.tid===t.id)&&t.id!==rt.id});var oc=coOf(vt);oc.t=null;vt.co=null;
 Object.values(S.co).forEach(function(c){if(c.t==null&&c.n!==rp.n)c.ret=c.ret||1});
 var o2=[];coHire(vt,o2);ok(coOf(vt)&&coOf(vt).n===rp.n,'clube contrata o ex-jogador');ok(o2.join(' ').indexOf('aposentado como jogador')>=0,'notícia do ex-jogador virando técnico: '+o2);
 /* seu jogador se aposenta: propostas para ser técnico */
 S.pc={n:'Teste PC',ended:S.year,leg:{v:95,r:'Imortal'},hist:[{team:S.teams[0].name}],fame:50,cash:0,log:[]};
 var offs=pcCoOffers();ok(offs.length===3,'lenda recebe 3 propostas: '+offs.length);S.pc.coOff=offs;
 ok(pcCoOffersHTML().indexOf('Propostas para ser técnico')>=0,'tela de propostas');
 pcCoAccept(offs[0]);ok(!S.pc&&S.mgr&&S.mgr.tid===offs[0]&&S.mgr.exp&&S.mgr.exp.n==='Teste PC','aceitar abre o modo treinador no clube');
 ok(coBoost(T(offs[0]))>0,'ex-jogador lenda dá reforço ao próprio time');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM ('+Object.keys(S.co).length+' técnicos, '+real+' reais, '+ev+' movimentos)';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
