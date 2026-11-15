/* Mundial ganho no jogo aparece nas estantes de times e jogadores (era gravado como "Worlds" e as estantes procuravam "Mundial") */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 var t=S.teams.find(function(x){return x.name==='BLG'});
 ok(t.tt.some(function(x){return x.y===2026&&x.k==='Mundial'}),'BLG com o Mundial 2026: '+JSON.stringify(t.tt.slice(-3)));
 t.pl.forEach(function(p){ok(pd(p.n).tl.some(function(e){return e.y===2026&&e.t==='Mundial'}),p.n+' com o Mundial 2026')});
 var vt=vTeam(t.id);ok(/Worlds[^]*2026/.test(vt),'estante do time mostra o Worlds 2026');
 var vp=vPlayer('Knight');ok(vp.indexOf('2026')>=0,'ficha do Knight');
 /* save antigo com o rótulo velho */
 t.tt.forEach(function(x){if(x.k==='Mundial'&&x.y===2026)x.k='Worlds'});pd('Bin').tl.forEach(function(e){if(e.t==='Mundial'&&e.y===2026)e.t='Worlds'});
 S.wclV=0;fixWcLbl();
 ok(t.tt.some(function(x){return x.y===2026&&x.k==='Mundial'})&&pd('Bin').tl.some(function(e){return e.y===2026&&e.t==='Mundial'}),'migração do rótulo');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
