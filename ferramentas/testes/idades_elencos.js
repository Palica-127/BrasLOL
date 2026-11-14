/* Idades reais e elencos da 2ª divisão: jogo novo já nasce certo e saves antigos são corrigidos uma vez (fixAges, fixD2P) */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 var find=function(n){var r=null;ALLT().forEach(function(t){t.pl.forEach(function(p){if(p.n===n)r={p:p,t:t}})});return r};
 ok(find('Ayu').p.age===21,'Ayu deveria ter 21 no jogo novo');
 ok(find('Faker').p.age===30,'Faker 30');
 ok(find('Pollu')&&find('Pollu').t.name==='KT Rolster Challengers','Pollu na KT Challengers');
 /* simula save antigo: um ano depois, idades velhas e elenco antigo da D2 */
 S.year=2027;delete S.ageV;delete S.d2pV;
 find('Ayu').p.age=27;find('Faker').p.age=31;
 var kt=S.d2.find(function(t){return t.name==='KT Rolster Challengers'});kt.pl[4]={n:'VelhoSup',role:4,r:72,age:22,pot:72,f:0,d:0};
 ensureD2();
 ok(find('Ayu').p.age===22,'Ayu no save antigo de 2027 deveria ter 22, tem '+find('Ayu').p.age);
 ok(find('Faker').p.age===31,'Faker 31 em 2027, tem '+find('Faker').p.age);
 ok(kt.pl[4].n==='Pollu','D2 aplicada no save antigo: '+kt.pl[4].n);
 ok(FA().some(function(p){return p.n==='VelhoSup'}),'quem saiu da D2 vira agente livre');
 var a=find('Ayu').p.age;ensureD2();ok(find('Ayu').p.age===a,'migração roda uma vez só');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
