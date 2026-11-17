/* Títulos por organização: DAMWON Gaming (Worlds 2020) e Dplus KIA são o mesmo clube em todas as telas;
   organizações diferentes (Samsung x Gen.G) continuam separadas */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 var dk=S.teams.find(function(t){return t.name==='Dplus KIA'});ok(!!dk,'Dplus KIA no jogo');
 ok(orgCur('Damwon Gaming')==='Dplus KIA'&&orgCur('DAMWON Gaming')==='Dplus KIA'&&orgCur('DWG KIA')==='Dplus KIA','nomes antigos da Dplus');
 ok(orgCur('Samsung White')==='Samsung White'&&orgCur('Samsung Galaxy')==='Samsung Galaxy','Samsung não vira Gen.G');
 ok(orgCur('Edward Gaming')==='EDward Gaming','maiúsculas não separam o clube');
 ok(ttCount(dk).wc===1,'jogo novo: 1 Worlds (2020 como DAMWON): '+ttCount(dk).wc);
 /* Worlds ganho no jogo pela Dplus KIA */
 dk.tt.push({y:2027,k:'Mundial',r:dk.pl.map(function(p){return p.n}),n:'Dplus KIA'});
 S.hist.push({y:2027,top:[{n:dk.pl[2].n,team:'Dplus KIA'}],champs:{wc:'Dplus KIA',wcv:'T1',mvp:dk.pl[2].n,msi:'Gen.G',msiv:'T1'}});
 ok(ttCount(dk).wc===2,'ficha conta os dois: '+ttCount(dk).wc);
 var h=cupHistHTML('wc');
 var m=/<div class="chips">([\\s\\S]*?)<\\/div>/.exec(h),chips=m?m[1]:'';
 ok(/<b class="num">2<\\/b>Dplus KIA/.test(chips),'pódio do Worlds: Dplus KIA com 2 títulos');
 ok(!/Damwon Gaming<\\/span>/.test(chips),'Damwon não aparece separado no pódio');
 var v=vTeam(dk.id);
 ok(/<b class="num">2<\\/b><small>Worlds/.test(v)||v.indexOf('2</b>')>=0,'cabeçalho da ficha');
 tvw='ti';
 var vt=vTeam(dk.id);
 ok(vt.indexOf('Identidade da organização')>=0&&vt.indexOf('DAMWON Gaming')>=0,'ficha mostra nomes anteriores');
 ok(/DAMWON Gaming<\\/b>[\\s\\S]*?Worlds 2020/.test(vt),'Worlds 2020 no período DAMWON');
 ok(/Dplus KIA<\\/b> <small[^>]*>nome atual[\\s\\S]*?Worlds 2027/.test(vt),'Worlds 2027 no período Dplus KIA');
 var hof=(function(){hofView='teams';return vHof()})();
 ok(/Dplus KIA[\\s\\S]{0,400}?2 Worlds/.test(hof),'Lendas > Times conta 2 Worlds');
 var gg=S.teams.find(function(t){return t.name==='Gen.G'});ok(ttCount(gg).wc===0,'Gen.G sem os Worlds da Samsung: '+ttCount(gg).wc);
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
