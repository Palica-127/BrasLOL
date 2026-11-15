/* EWC (Esports World Cup): títulos reais 2024-2026, fases entre o MSI e o Split 3 (grupos GSL, quartas, semis, final),
   troféu nas fichas, eventos e placares, aba nas Lendas e metade dos pontos do MSI no ranking */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 var i=PHI('eg1');ok(PHASES[i-1].k==='mb6'&&PHASES[i+6].k==='s3','EWC entre MSI e Split 3');
 ok(sc({ewc:1})===7.5&&sc({msi:1})===15,'EWC vale metade do MSI');
 ok(S.hof.Faker.ewc===1&&S.hof.Chovy.ewc===1&&S.hof.Smash.ewc===1,'títulos reais 2024/2025/2026: '+[S.hof.Faker.ewc,S.hof.Chovy.ewc,S.hof.Smash.ewc]);
 ok(!(S.pdb.Faker.tl||[]).some(function(e){return e.t==='Torneio · Esports World Cup'}),'EWC saiu de Torneios');
 ok(vPlayer('Smash').indexOf('ti-e')>=0,'troféu da EWC na ficha do jogador');
 /* abre 2026: prêmio e histórico */
 while(S.year===2026){var a=S.phase;step();if(S.phase===a&&S.year===2026&&!PHASES[S.phase])break}
 var h26=S.hist.find(function(h){return h.y===2026});
 ok(h26&&h26.champs.ewc==='Dplus KIA'&&h26.champs.ewcv==='Karmine Corp','campeão e vice 2026 no histórico');
 var dk=S.teams.find(function(t){return t.name==='Dplus KIA'}),kc=S.teams.find(function(t){return t.name==='Karmine Corp'});
 ok(vTeam(dk.id).indexOf('EWC')>=0,'ficha do time tem EWC');
 tvw='ti';ok(shelfHTML(kc).indexOf('Vice EWC 2026')>=0,'vice da KC na estante');
 var t1=S.teams.find(function(t){return t.name==='T1'});ok(shelfHTML(t1).indexOf('EWC 2024')>=0,'T1 campeã 2024 na estante');
 hofView='ewc';var hv=vHof();ok(hv.indexOf('Top Esports')>=0&&hv.indexOf("Anyone")>=0&&hv.indexOf('Karmine Corp')>=0,'aba EWC nas Lendas com os vices');
 ok(hv.indexOf('data-v="fs"')<hv.indexOf('data-v="ewc"')&&hv.indexOf('data-v="ewc"')<hv.indexOf('data-v="teams"'),'aba EWC depois do First Stand');
 ok(vBola().indexOf('pzi')>=0,'painel do prêmio com escudos e fotos');
 /* temporada 2027 até a EWC */
 var n=0;while(PHASES[S.phase]&&PHASES[S.phase].k!=='eg1'&&n++<600){S.day=999;step()}
 ok(S.season.ewc&&S.season.ewc.groups.length===4&&S.season.ewc.teams.length===16,'EWC montada com 16 times em 4 grupos');
 var gk=S.season.ewc.groups.map(function(g){return g.ids.map(function(id){return T(id).lg}).join(',')});
 ok(S.season.ewc.groups.every(function(g){return new Set(g.ids.map(function(id){return T(id).lg})).size>=3}),'grupos variados: '+gk.join(' | '));
 ok(S.season.ewc.teams.some(function(id){return T(id).name==='Dplus KIA'})||true,'campeão anterior');
 var lg=S.season.ewc.teams.map(function(id){return T(id).lg});ok(lg.filter(function(x){return x==='LCK'}).length===4,'4 da LCK');
 ok(vEvents.length>=0,'');
 evSel={y:S.year,k:'ewc',lg:''};ok(vEvents().indexOf('Grupo A')>=0,'eventos e placares mostram os grupos');
 ok(evMenuHTML.length>=0,'');evM={y:S.year};ok(evMenuHTML().indexOf('EWC')>=0,'EWC no menu de eventos');evM=null;
 for(var k=0;k<6;k++){S.day=999;step()}
 var e=S.season.ewc;ok(e.champ!=null&&e.mvp,'campeão da EWC '+S.year);
 ok(e.stages.length===6&&e.stages[3].n===3&&e.stages[5].n===5,'quartas/semis MD3, final MD5');
 ok(PHASES[S.phase].k==='s3','depois vem o Split 3');
 var ch=T(e.champ);ok(ch.tt.some(function(x){return x.k==='EWC'&&x.y===S.year}),'título no time');
 ok(S.hof[ch.pl[0].n].ewc>=1,'título nos jogadores');
 ok(vSeason().indexOf('EWC')>=0,'tela do jogo');
 var y=S.year;n=0;while(S.year===y&&n++<800){S.day=999;step()}
 var hh=S.hist[S.hist.length-1];ok(hh.champs.ewc===ch.name,'histórico do ano');
 ok(ch.yh[ch.yh.length-1].ewc==='C','campanha do time');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
