/* Títulos reais (Leaguepedia, até 2025) e passagens por times na ficha do jogador */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 var f=hofOf('Faker');ok(f.wc===6&&f.msi===2&&f.lg===10,'Faker 6 Worlds, 2 MSI, 10 ligas: '+[f.wc,f.msi,f.lg]);
 var b=hofOf('Bengi');ok(b.wc===3&&b.msi===0,'Bengi sem MSI que não jogou: '+[b.wc,b.msi]);
 ok(pd('Faker').tl.some(function(e){return /^Torneio · IEM/.test(e.t)}),'torneio IEM do Faker');
 var L=carList('Faker',pd('Faker'));ok(L.length>=2&&L.some(function(x){return /SK Telecom T1 K/.test(x.t)}),'passagens do Faker: '+JSON.stringify(L));
 var K=carList('Kiin',pd('Kiin'));ok(K.some(function(x){return /Gen\\.G/.test(x.t)&&!x.y1}),'Kiin atual na Gen.G');
 ok(carHTML('Kiin',pd('Kiin')).indexOf('Times')>=0,'seção Times na ficha');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM ('+Object.keys(RTIT).length+' jogadores com títulos, '+Object.keys(RCAR).length+' com passagens)';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
