/* menu Eventos e placares: arquivo da temporada no histórico e telas de cada evento */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx,`(function(){
 var bad=[];function ok(c,m){if(!c)bad.push(m)}
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;S.pc=null;
 var y0=S.year,g=0;while(S.year===y0&&g++<400)step();
 var h=S.hist[S.hist.length-1];ok(h.y===y0,'hist do ano');ok(h.ev&&h.ev.wc&&h.ev.res.s1,'arquivo ev salvo');
 /* um ano completo para ter dois arquivos */
 var y1=S.year;g=0;while(S.year===y1&&g++<6000)step();
 ok(evYears().length>=2,'anos '+evYears());
 var sz=JSON.stringify(S.hist[S.hist.length-1].ev).length;
 var html=[];
 [[S.year,'s1','LCK'],[y1,'s1','LCK'],[y1,'s2','LPL'],[y1,'s3','LEC'],[y1,'fs',''],[y1,'msi',''],[y1,'wc',''],[S.year,'wc',''],[y1,'s1','LCK:2'],[y1,'s2','CBLOL:2'],[y1,'s3','LEC:2'],[S.year,'cup','']].forEach(function(e){
  act('evGo',e[0]+'|'+e[1]+'|'+e[2]);var r=vEvents();ok(r&&r.length>200,'vazio '+e.join('/'));ok(/Etapa|First Stand|MSI|Mundial|Copa/.test(r),'sem título '+e.join('/'));html.push(e.join('/')+':'+r.length)});
 var d2=S.hist[S.hist.length-1].ev.d2r;ok(d2&&d2.s1&&d2.s1.length===LGS.length&&d2.s1[0].sf.length===2&&d2.s1[0].f.w===d2.s1[0].champ,'d2r arquivado '+JSON.stringify(Object.keys(d2||{})));
 act('evT');ok(!!evM,'menu abre');var m=evMenuHTML();ok(/Etapa 1/.test(m)&&/Mundial/.test(m),'menu itens');
 act('evO','s1');ok(/LCK/.test(evMenuHTML()),'ligas');act('evY','1');ok(evM.y===evYears()[1],'ano anterior');
 render();
 return 'ev por ano ~'+Math.round(sz/1024)+'KB | '+html.join(' ')+' | PROBLEMAS: '+(bad.length?bad.join(' || '):'nenhum')})()`));
console.log(run(ctx,`(function(){var bad=[];function ok(c,m){if(!c)bad.push(m)}
 ok(nextCup(2027)===2030&&nextCup(2026)===2026&&nextCup(2031)===2034,'nextCup');
 S.year=2027;evM={y:2027,o:''};ok(/Próxima em 2030/.test(evMenuHTML()),'menu mostra próxima copa');
 act('evGo','2027|cup|');ok(/próxima será em 2030/.test(vEvents()),'tela da copa');
 return 'copa: '+(bad.length?bad.join(' || '):'ok')})()`));
/* bracket do topo do Jogar: só em andamento, ou até 5 dias após o campeão; liga acompanhada nos splits */
const ctx3=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx3,`(function(){var bad=[],log=[];function ok(c,m){if(!c)bad.push(m)}
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;S.pc=null;
 var top=function(){return vSeason().indexOf('class="pn det more2 dtop"')>=0};
 ok(top(),'Mundial em andamento sem bracket no topo');
 var gg=0,seen={};
 while(S.year<2028&&gg++<5000){
  var before=top(),k=PHASES[S.phase]&&PHASES[S.phase].k;
  step();
  var A=S.season,bd=A&&A.bd||{};
  /* sem evento em andamento nem campeão recente: nada no topo */
  var p=PHASES[S.phase],inT=p&&phTour(p)&&A[phTour(p)]&&A[phTour(p)].champ==null;
  var rec=Object.keys(bd).some(function(x){return dayNow()-bd[x]<=BRK_DAYS});
  var sp=A&&A.sp&&A.sp.po;
  if(!inT&&!rec&&p&&!(S.year===2026)){ if(top())bad.push('bracket sobrando em '+p.k+' dia '+S.day)}
  if(Object.keys(bd).length)seen.bd=1;
 }
 ok(seen.bd,'bd nunca marcado');
 return 'topo: '+(bad.length?bad.slice(0,6).join(' || '):'ok')})()`));
const ctx4=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx4,`(function(){var bad=[];S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;S.pc=null;
 var top=function(){return vSeason().indexOf('class="pn det more2 dtop"')>=0};
 var y=S.year,g2=0;while(S.year===y&&g2++<400)step();
 g2=0;while(!(S.season.bd&&S.season.bd.fs!=null)&&g2++<2000)step();
 var d0=S.season.bd.fs;S.day=d0;if(!top())bad.push('sem bracket no dia do campeão do First Stand');
 S.day=d0+5;if(!top())bad.push('sumiu antes de 5 dias');
 S.day=d0+6;var inT=PHASES[S.phase]&&phTour(PHASES[S.phase]);if(!inT&&top())bad.push('não sumiu depois de 5 dias');
 /* split: liga acompanhada */
 g2=0;while(!(S.season.bd&&S.season.bd.s2!=null)&&g2++<2000)step();
 var f=FLG();S.day=S.season.bd.s2;var h=vSeason();if(!/Etapa 2 · /.test(h)||h.indexOf(f.lg)<0)bad.push('bracket da liga acompanhada ausente');
 return 'janela de 5 dias: '+(bad.length?bad.join(' || '):'ok')})()`));
