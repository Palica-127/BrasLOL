/* calendário anual: 3 splits, First Stand, MSI (Play-In + bracket), Mundial (Play-In + Suíço + playoffs). Classificação por resultado, vagas extras do MSI e reposição */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var L=[],bad=[];function ok(c,m){if(!c)bad.push(m)}
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;S.pc=null;
 var g0=0,y0=S.year;while(S.year===y0&&g0++<400)step();     /* termina o ano inicial (começa nas quartas do Mundial) */
 var seq=[];
 for(var yr=0;yr<8;yr++){
  var y1=S.year,g=0,keys=[],seen={};
  while(S.year===y1&&g++<6000){
   var p=PHASES[S.phase];if(p){if(keys[keys.length-1]!==p.k||p.k==='sw')keys.push(p.k)}
   var before=S.phase;step();
   /* conferências nos pontos de passagem */
   var A=S.season;
   if(A.fs&&!seen.fs){seen.fs=1;var fq=A.fsQ;ok(fq.length===8,'FS com '+fq.length+' times');
     LGS.forEach(function(lg){var n=fq.filter(function(x){return x.lg===lg}).length;ok(n===COMP.fsSlots[lg],'FS '+lg+' '+n);
       fq.filter(function(x){return x.lg===lg}).forEach(function(x,i){ok(A.rank['s1'+lg][i]===x.id,'FS vaga fora da ordem do Split 1 '+lg)})})}
   if(A.mQ&&!seen.mq){seen.mq=1;var q=A.mQ;ok(q.all.length===11,'MSI '+q.all.length);ok(q.playin.length===4,'MSI play-in '+q.playin.length);ok(q.direct.length===7,'MSI direto '+q.direct.length);
     var ids=q.playin.map(function(x){return x.id}).concat(q.direct.map(function(x){return x.id}));ok(new Set(ids).size===11,'MSI repete time');
     ok(q.playin.every(function(x){return x.seed>1}),'play-in com 1º seed');
     var fr=A.fsReg;if(fr&&COMP.fsBenefit.indexOf(fr)>=0)ok(q.direct.some(function(x){return x.lg===fr&&x.seed===2}),'benefício do First Stand não aplicado '+fr);
     if(fr&&COMP.fsBenefit.indexOf(fr)>=0)ok(!q.playin.some(function(x){return x.lg===fr}),'2º seed da região campeã no play-in');
     LGS.forEach(function(lg){var n=q.all.filter(function(x){return x.lg===lg}).length;ok(n===COMP.msiSlots[lg],'MSI vagas '+lg+' '+n);
       q.all.filter(function(x){return x.lg===lg}).forEach(function(x,i){ok(A.rank['s2'+lg][i]===x.id,'MSI vaga fora da ordem do Split 2 '+lg)})})}
   if(A.msi&&A.msi.de&&!seen.msi){seen.msi=1;ok(A.msi.teams.length===8,'bracket MSI '+A.msi.teams.length);ok(A.msi.teams.indexOf(A.mpi.champ)>=0,'vencedor do play-in fora da bracket')}
   if(A.wQ&&!seen.wq){seen.wq=1;var w=A.wQ;ok(w.all.length===19,'Mundial '+w.all.length);ok(w.playin.length===4,'WPI '+w.playin.length);ok(w.direct.length===15,'direto '+w.direct.length);
     var ids2=w.all.map(function(x){return x.id});ok(new Set(ids2).size===19,'Mundial repete time');
     ok(w.playin.every(function(x){return w.direct.indexOf(x)<0&&x.seed>1&&x.id!==w.msiChamp&&T(x.id).lg!==T(w.msiChamp).lg}),'play-in inelegível');
     LGS.forEach(function(lg){var n=w.all.filter(function(x){return x.lg===lg}).length;var ex=(lg===T(w.msiChamp).lg?COMP.msiChampRegion:0)+(lg===T(w.msiVice).lg?COMP.msiViceRegion:0);ok(n===COMP.wcSlots[lg]+ex,'vagas '+lg+' '+n+' esperado '+(COMP.wcSlots[lg]+ex))});
     var pos=A.rank['s3'+T(w.msiChamp).lg].indexOf(w.msiChamp);
     ok((pos>=0&&pos<COMP.playoffTop)===!w.perdeuVaga,'condição de playoffs do campeão do MSI');
     ok(w.all.some(function(x){return x.id===w.msiChamp})===(pos<COMP.playoffTop),'vaga do campeão do MSI')}
   if(A.wc&&A.wc.rec&&!seen.sw){seen.sw=1;ok(A.wc.teams.length===16,'Suíço '+A.wc.teams.length);ok(A.wc.teams.indexOf(A.wpi.champ)>=0,'classificado do play-in fora do Suíço');
     A.wQ.playin.forEach(function(x){if(x.id!==A.wpi.champ)ok(A.wc.teams.indexOf(x.id)<0,'eliminado do play-in no Suíço')})}
  }
  ok(S.year===y1+1,'virada de ano travou '+y1);
  var h=S.hist[S.hist.length-1];
  ok(h&&h.comp&&h.comp.fs&&h.comp.fs.c&&h.comp.msi.c&&h.comp.wc.c,'histórico sem campeões');
  ok(h.comp.msi.pi.length===4&&h.comp.wc.pi.length===4&&h.comp.wc.all.length===19,'histórico de participantes');
  ok(h.champs.s1.length>0&&h.champs.s2.length>0&&h.champs.s3.length>0,'campeões de split');
  var exp=['s1','f1','f2','f3','f4','f5','f6','s2','mp1','mp2','mp3','mp4','mb1','mb2','mb3','mb4','mb5','mb6','s3','wp1','wp2','wp3','wp4'].concat(['sw','wq','ws','wf','aw']);
  var got=keys.filter(function(k){return k!=='sw'||true});
  var idx=0;exp.forEach(function(k){var j=got.indexOf(k,idx);ok(j>=0,'fase '+k+' fora de ordem ('+y1+')');if(j>=0)idx=j});
  seq.push(y1+': FS '+h.comp.fs.c+' | MSI '+h.comp.msi.c+' (PI '+h.comp.msi.piw+') | Mundial '+h.comp.wc.c+' (PI '+h.comp.wc.piw+')'+(h.comp.perdeuVaga?' [campeão MSI perdeu a vaga]':''));
 }
 return seq.join(' ## ')+' ## PROBLEMAS: '+(bad.length?bad.slice(0,15).join(' || '):'nenhum')})()`);
console.log(out);

/* cenários de classificação do Mundial montados à mão: rank do Split 3 + resultado do MSI */
const out2=run(ctx,`(function(){
 var bad=[],R=[];function ok(c,m){if(!c)bad.push(m)}
 var base=S.teams.filter(function(t){return t.lg==='LCK'});
 function setRanks(){LGS.forEach(function(lg){S.season.rank['s3'+lg]=S.teams.filter(function(t){return t.lg===lg}).map(function(t){return t.id})})}
 function msi(champ,vice){S.season.msi={teams:[champ,vice],stages:[],elim:{},champ:champ};S.season.msi.elim[vice]='Final'}
 function pick(lg,i){return S.season.rank['s3'+lg][i]}
 function sc(nome,fn){setRanks();try{fn();}catch(e){bad.push(nome+': '+e.message)}}
 sc('campeão fora das vagas, nos playoffs',function(){var c=pick('LPL',4),v=pick('LEC',0);msi(c,v);var q=worldsQual();
   ok(q.all.length===19,'19 '+q.all.length);ok(q.all.some(function(x){return x.id===c&&x.why==='msiChamp'}),'campeão entra');
   ok(q.all.filter(function(x){return x.lg==='LPL'}).length===4,'LPL 4');ok(q.all.filter(function(x){return x.lg==='LEC'}).length===4,'LEC 4');
   ok(q.all.filter(function(x){return x.lg==='LEC'&&x.why==='msiVice'}).length===1,'vice extra')});
 sc('campeão fora dos playoffs: perde a vaga, reposição',function(){var c=pick('LPL',8),v=pick('LEC',0);msi(c,v);var q=worldsQual();
   ok(q.all.length===19,'19 '+q.all.length);ok(!q.all.some(function(x){return x.id===c}),'campeão não entra');ok(q.perdeuVaga,'flag');
   ok(q.all.some(function(x){return x.lg==='LPL'&&x.why==='reposicao'&&x.id===pick('LPL',3)}),'reposição é o próximo da LPL');
   ok(q.all.filter(function(x){return x.lg==='LEC'}).length===4,'vice mantém extra')});
 sc('campeão já está nas vagas regulares: extra vai ao próximo',function(){var c=pick('LCS',1),v=pick('LCP',2);msi(c,v);var q=worldsQual();
   ok(q.all.length===19,'19 '+q.all.length);ok(q.all.filter(function(x){return x.lg==='LCS'}).length===4,'LCS 4');ok(q.all.filter(function(x){return x.id===c}).length===1,'sem duplicar');
   ok(q.all.some(function(x){return x.lg==='LCS'&&x.id===pick('LCS',3)}),'4º da LCS')});
 sc('campeão e vice da mesma região',function(){var c=pick('LCK',5),v=pick('LCK',0);msi(c,v);var q=worldsQual();
   ok(q.all.length===19,'19 '+q.all.length);ok(q.all.filter(function(x){return x.lg==='LCK'}).length===5,'LCK 5 '+q.all.filter(function(x){return x.lg==='LCK'}).length);
   ok(q.playin.every(function(x){return x.lg!=='LCK'}),'LCK fora do play-in')});
 sc('campeão do MSI do CBLOL fora dos playoffs',function(){var c=pick('CBLOL',7),v=pick('LCK',1);msi(c,v);var q=worldsQual();
   ok(q.all.length===19,'19 '+q.all.length);ok(q.playin.length===4,'4');ok(q.direct.length===15,'15');
   ok(new Set(q.all.map(function(x){return x.id})).size===19,'sem repetidos')});
 sc('play-in: seeds mais baixos primeiro',function(){var c=pick('LEC',0),v=pick('LCS',0);msi(c,v);var q=worldsQual();
   var min=Math.min.apply(null,q.playin.map(function(x){return x.seed}));var maxDir=Math.max.apply(null,q.direct.filter(function(x){return x.seed>1&&x.lg!==T(c).lg}).map(function(x){return x.seed}));
   ok(min>=maxDir,'play-in tem seed menor que quem foi direto: '+min+' vs '+maxDir)});
 return 'cenários ok? '+(bad.length?bad.join(' || '):'sim')})()`);
console.log(out2);
