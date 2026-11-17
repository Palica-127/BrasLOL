/* Lendas aposentadas como técnicos: todas no mercado (principal na IA, assistente no seu clube), atributos de treinador
   ligados ao jogo, traços do Top 30 sem exagero, mesma identidade (foto, nome, histórico) e ficha com abas jogador/treinador */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 coEnsure();
 var pool=coLegPool();ok(pool.length>=10,'lendas aposentadas: '+pool.length);
 ok(pool.every(function(n){return S.co[n]&&S.co[n].ex&&S.co[n].leg}),'toda lenda aposentada está no universo dos técnicos');
 var top=hofRank().slice(0,30).filter(function(n){return S.co[n]&&S.co[n].leg});
 ok(top.length>=8,'Top 30 aposentados: '+top.length);
 ok(top.every(function(n){return coTr(S.co[n]).length>=1&&coTr(S.co[n]).length<=2}),'cada Top 30 tem 1 ou 2 traços');
 var sig={};top.forEach(function(n){sig[JSON.stringify(coAt(S.co[n]))]=1});ok(Object.keys(sig).length===top.length,'atributos diferentes entre as lendas');
 var tr={};top.forEach(function(n){tr[coTr(S.co[n]).join('+')]=1});ok(Object.keys(tr).length>=3,'traços variados: '+Object.keys(tr).join(' / '));
 var mx=0,avgL=0,avgR=0,nr=0;top.forEach(function(n){var a=coAt(S.co[n]);COAT.forEach(function(q){mx=Math.max(mx,a[q[0]]);avgL+=a[q[0]]/4/top.length})});
 Object.values(S.co).filter(function(c){return !c.leg&&!c.gen&&c.t!=null}).forEach(function(c){var a=coAt(c);COAT.forEach(function(q){avgR+=a[q[0]]/4});nr++});avgR/=nr;
 ok(mx<=90,'nenhum atributo exagerado: máximo '+mx);
 ok(avgL>avgR&&avgL-avgR<12,'lenda vale a contratação sem bônus exagerado: lendas '+avgL.toFixed(1)+' x técnicos '+avgR.toFixed(1));
 /* aposentou como lenda: sempre entra no mercado (sem sorteio) */
 var t0=S.teams[0],p=t0.pl[2];S.hof[p.n]=S.hof[p.n]||{pts:0};S.hof[p.n].pts=200;delete S.co[p.n];
 var R=Math.random;Math.random=function(){return .999};coFromPlayer(p,t0);Math.random=R;
 ok(S.co[p.n]&&S.co[p.n].leg&&S.co[p.n].ex,'lenda que se aposenta vira técnico disponível');
 ok(!coFreePool().length||Object.values(S.co).some(function(c){return c.leg&&c.t==null}),'lendas livres no mercado');
 /* IA contrata lenda como técnico principal */
 var L=S.co[top[0]],tv=S.teams[5],oc=coOf(tv);if(oc){oc.t=null;tv.co=null}
 Object.values(S.co).forEach(function(c){if(c.t==null&&c!==L)c.ret=c.ret||9999});L.t=null;L.ret=null;
 coHire(tv,[]);ok(coOf(tv)===L&&!L.as,'IA contrata a lenda como técnico principal');
 Object.values(S.co).forEach(function(c){if(c.ret===9999)c.ret=null});
 /* seu clube: lenda como assistente, com efeito na partida e na evolução */
 coF={name:'Chefe Lenda',nat:'BRA',age:40,sty:'eq',ph:''};menuV='mgr';act('meCreate');
 var t=S.teams[8];mgrPick=t.id;act('mgrStart');S.mgr.cash=50;
 if(S.mgr.coach)mgrCoach('-');
 var b0=coBoost(t),d0=coDevB(t);
 var leg=coachPool()[0];
 ok(staffHTML(S.mgr).indexOf('Lendas aposentadas')>=0&&staffHTML(S.mgr).indexOf('co:'+leg.n)>=0,'lenda na lista de contratação com atributos');
 mgrCoach(leg.n);
 ok(S.mgr.coach&&S.mgr.coach.co&&S.mgr.coach.n===leg.n&&leg.t===t.id&&leg.as===1,'lenda contratada como assistente: '+msg);
 ok(coBoost(t)>=b0&&coDevB(t)>=d0,'assistente reforça partida/evolução: '+b0.toFixed(2)+'->'+coBoost(t).toFixed(2)+' / '+d0+'->'+coDevB(t));
 ok(coBoost(t)<.7,'reforço pequeno');
 /* save antigo: assistente-lenda fora do S.co migra */
 mgrCoach('-');var old=Object.values(S.co).filter(function(c){return c.leg&&c.t==null&&!c.ret})[0];S.mgr.coach={n:old.n,since:S.year};
 coLegSeed();ok(S.mgr.coach.co&&old.t===t.id&&old.as===1,'assistente-lenda do save antigo migrado');
 /* ficha única */
 var n=top[0];
 ok(vPlayer(n).indexOf('Carreira de treinador')>=0,'ficha de jogador tem a aba de treinador');
 act('player',n);act('pswap','c|'+n);ok(prof&&prof.k==='c'&&prof.id===n,'troca de aba');
 var vc=vCoach(n);
 ok(vc.indexOf('Atributos de treinador')>=0&&vc.indexOf('Estatísticas como técnico')>=0&&vc.indexOf('Carreira de jogador')>=0,'aba de treinador com atributos e estatísticas');
 ok(vc.indexOf(COTR[coTr(S.co[n])[0]].n)>=0,'traços na ficha');
 if(PHOTOS.has(phSlug(n)))ok(vc.indexOf('jogadores/'+phSlug(n))>=0,'mesma foto de jogador');
 ok(S.pdb[n]&&S.co[n].n===n,'mesma identidade (mesmo nome no histórico de jogador e de técnico)');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
