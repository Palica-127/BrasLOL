/* Pool real dos jogadores (RPOOL, Leaguepedia): campeões jogados de verdade no topo, e pool mais ampla para quem tem mais anos de carreira */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 var top=function(n,k){var r=pd(n).role;return CH[r].map(function(x){return {c:x[0],v:mastOf(n,x[0])}}).sort(function(a,b){return b.v-a.v}).slice(0,k).map(function(x){return x.c})};
 var forte=function(n){var r=pd(n).role;return CH[r].filter(function(x){return mastOf(n,x[0])>=.8}).length};
 ok(top('Faker',5).indexOf('Azir')>=0,'Azir entre os 5 melhores do Faker: '+top('Faker',5));
 ok(top('Keria',5).indexOf('Rakan')>=0||top('Keria',5).indexOf('Nautilus')>=0,'Rakan/Nautilus no topo do Keria: '+top('Keria',5));
 ok(top('Zeus',3).indexOf('Gnar')>=0,'Gnar no topo do Zeus: '+top('Zeus',3));
 ok(forte('Faker')>forte('Ayu'),'veterano com pool mais ampla: Faker '+forte('Faker')+' x Ayu '+forte('Ayu'));
 ok(forte('Keria')>forte('Bluffing'),'Keria '+forte('Keria')+' x Bluffing '+forte('Bluffing'));
 /* todo campeão do RPOOL existe na lista da função do jogador */
 Object.keys(RPOOL).forEach(function(n){var d=S.pdb[n];if(!d)return;var l=CH[d.role].map(function(x){return x[0]});Object.keys(RPM[n].c).forEach(function(c){if(l.indexOf(c)<0)bad.push(n+': '+c+' fora da função')})});
 /* escolhas automáticas nunca repetem campeão no mesmo time */
 S.teams.forEach(function(t){var pk=bestPicks(t,1.2);if(new Set(pk).size<5)bad.push('campeão repetido em '+t.name+': '+pk)});
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
