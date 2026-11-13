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
