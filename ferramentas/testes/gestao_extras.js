/* Gestão: peneira da Solo Queue, rivais garimpando a fila, audiência dos streamers, filtros do mercado e ultimato da diretoria */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)},got=[];
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 mgrStart(3);S.mgr.cash=30;
 /* 1) peneira: cobra, revela o OVR de palco, e a contratação respeita o valor revelado */
 var x=slqList('EUW')[0],c0=S.mgr.cash;
 slqScout(x.id);var x2=slqP('EUW',0);
 ok(x2.sc!=null&&x2.sc>=-3&&x2.sc<=2,'peneira não revelou');
 ok(Math.abs(S.mgr.cash-(c0-slqScFee()))<.01,'peneira não cobrou');
 var c1=S.mgr.cash;slqScout(x.id);ok(S.mgr.cash===c1,'peneira cobrou duas vezes');
 mgrView='soloq';slqReg='EUW';var h=vMgr();ok(/palco/.test(h)&&/Peneira/.test(h),'tela da peneira');ok(!/undefined|NaN/.test(h),'undefined na tela');
 S.mgr.cheat=true;slqSign(x.id);S.mgr.cheat=false;
 var p=S.mgr.bench.find(function(b){return b.n===x.n});
 ok(p&&p.r===Math.max(60,Math.min(95,x.r+x2.sc)),'contratação ignorou a peneira: '+(p&&p.r)+' vs '+(x.r+x2.sc));
 /* 2) streamer: patrocínio extra no fechamento e na projeção */
 var st=slqList().find(function(z){return z.ok&&z.tag==='str'});
 S.mgr.cheat=true;slqSign(st.id);S.mgr.cheat=false;
 var t=mgrT(),sb=strBon(t,S.mgr);ok(sb>0,'streamer na reserva sem bônus');
 S.mgr.cheat=true;mgrPromote(st.n);S.mgr.cheat=false;var sb2=strBon(t,S.mgr);ok(sb2>sb,'titular deveria render mais que reserva: '+sb+' -> '+sb2);
 mgrView='fin';ok(/Audiência dos streamers/.test(vMgr()),'linha de audiência nas finanças');
 /* 3) rivais: durante a janela, clubes ficam de olho e assinam */
 /* o save inicial está no fim do ano (janela fechada): simula várias janelas de pré-temporada, dia a dia */
 var ph0=S.phase,day0=S.day,sp0=S.season.sp,sawInt=false;S.season.sp=null;S.phase=0;
 for(var w=0;w<8;w++){for(S.day=0;S.day<CAL.s1;S.day++){ok(winOpen(),'janela deveria estar aberta no dia '+S.day);slqAIDay();if(Object.keys(slqS().int).length)sawInt=true}}
 S.phase=ph0;S.day=day0;S.season.sp=sp0;
 var q=slqS(),ai=Object.keys(q.out).filter(function(id){return q.by[id]!==S.mgr.tid});
 ok(sawInt,'nenhum clube ficou de olho');
 ok(ai.length>0,'nenhum clube assinou da fila');
 ai.forEach(function(id){var reg=id.replace(/\\d+$/,''),z=slqP(reg,+id.slice(reg.length)),tm=T(q.by[id]);
  ok(tm&&tm.pl[z.role].n===z.n||tm.pl.some(function(pp){return pp.n===z.n})||(tm.bn||[]).some(function(pp){return pp.n===z.n}),'contratado pela IA não está no time '+z.n);
  ok(!!S.pdb[z.n],'sem pdb '+z.n);got.push(z.n+'→'+tm.name)});
 mgrView='soloq';slqReg=ai[0].replace(/\\d+$/,'');ok(/No /.test(vMgr()),'botão mostra o clube que contratou');
 /* 4) filtros do mercado */
 mgrView='mercado';mgrRole=2;MF={age:1,pot:0,max:0,sort:'r'};var hm=mlistHTML();
 var ages=(hm.match(/· (\\d+) anos/g)||[]).map(function(s){return +s.match(/\\d+/)[0]});
 ok(ages.length&&ages.every(function(a){return a<=22}),'filtro de idade: '+ages.join(','));
 MF={age:0,pot:90,max:0,sort:'pot'};hm=mlistHTML();ok(/potencial 9\\d/.test(hm)||/Nenhum jogador/.test(hm),'filtro de potencial');
 MF={age:0,pot:0,max:0,sort:'r'};ok(/Idade/.test(vMgr())&&/Potencial/.test(vMgr()),'barra de filtros');
 /* 5) ultimato: confiança baixa + split ruim -> ultimato; falhar o seguinte demite na hora */
 var m=S.mgr;S.phase=0;sgInit();S.phase=ph0;ok(m.sg.s1&&m.sg.s2&&m.sg.s3,'metas no começo do ano');m.sat=28;t.cs=t.cs||{};t.cs.s1=10;m.sg.s1.t=2;sgEnd('s1');
 ok(m.ult&&m.ult.k==='s2','ultimato não foi dado (sat '+m.sat+')');
 ok(/Ultimato/.test((mgrView='inicio',vMgr())),'ultimato não aparece no painel');
 t.cs.s2=9;m.sg.s2.t=2;sgEnd('s2');
 ok(m.fired&&m.tid==null,'não foi demitido ao falhar o ultimato');
 ok(/Sem time/.test(vMgr()),'tela de sem time');
 /* novo clube no meio do ano: metas só dos splits que faltam */
 S.phase=PHI('s3');mgrStart(7);ok(!m.ult&&S.mgr.sg&&!S.mgr.sg.s1&&!S.mgr.sg.s2&&S.mgr.sg.s3,'metas do novo clube: '+JSON.stringify(S.mgr.sg));
 /* ultimato cumprido */
 var m2=S.mgr;m2.sat=29;m2.ult={k:'s3',t:4,y:S.year};var t2=mgrT();t2.cs=t2.cs||{};t2.cs.s3=2;sgEnd('s3');
 ok(!m2.ult&&!m2.fired&&m2.sat>=35,'ultimato cumprido deveria salvar o cargo');
 return (bad.length?'FALHAS: '+bad.join(' || '):'TODOS OS TESTES PASSARAM')+' | IA contratou: '+got.slice(0,6).join(', ');
})()`);
console.log(out);
if(/FALHAS/.test(out))process.exit(1);
