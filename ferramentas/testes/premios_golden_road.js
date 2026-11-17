/* Premiações (valor da tabela = campeão; demais colocações recebem uma fração) e Golden Road (3 splits + MSI + Worlds; +30% por First Stand e por EWC;
   só jogadores e técnicos da campanha; nome dourado e logo com aro; prêmio no caixa do seu clube) */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)},near=function(a,b){return Math.abs(a-b)<.02};
 var Y=S.year;
 /* ano fictício: 17 times no Worlds, 11 no MSI, 12 na EWC, 8 no First Stand */
 var ts=S.teams.slice(0,17),codes={wc:['C','F','SF','SF','QF','QF','QF','QF','G','G','G','G','G','G','G','G','G'],msi:['C','F','SF','SF','QF','QF','G','G','G','G','G'],ewc:['C','F','SF','SF','QF','QF','QF','QF','G','G','G','G'],fs:['C','F','SF','SF','QF','QF','QF','QF']};
 S.teams.forEach(function(t,i){t.yh=(t.yh||[]).filter(function(x){return x.y!==Y});t.yh.push({y:Y,s1:0,s2:0,s3:0,fs:codes.fs[i]||'-',msi:codes.msi[i]||'-',ewc:codes.ewc[i]||'-',wc:codes.wc[i]||'-',gw:0,gl:0})});
 var EXP={wc:5,msi:2,ewc:2,fs:1};['wc','msi','ewc','fs'].forEach(function(k){ok(near(tourPrize(k,'C'),EXP[k]),PZN[k]+': campeão recebe '+EXP[k]+' (recebeu '+tourPrize(k,'C')+')')});
 ok(tourPrize('wc','C')>tourPrize('wc','F')&&tourPrize('wc','F')>tourPrize('wc','SF')&&tourPrize('wc','G')>0,'colocação melhor ganha mais e todos recebem');
 ok(near(tourPrize('wc','F'),2.5)&&tourPrize('wc','F')<tourPrize('wc','C'),'vice do Worlds recebe metade do campeão');
 ok(near(grPrize({}),ECO.gr.base)&&near(grPrize({fs:1}),ECO.gr.base*1.3)&&near(grPrize({ewc:1}),ECO.gr.base*1.3)&&near(grPrize({fs:1,ewc:1}),ECO.gr.base*1.6),'bônus de 30% por First Stand e por EWC');
 /* Golden Road do time 0 (campeão de tudo), com um jogador que chegou só para o Worlds */
 var t=S.teams[0],y=t.yh[t.yh.length-1],lk_=function(s){return t.lg+' '+splitNm(s)};
 y.s1=1;y.s2=1;y.s3=1;
 var base=t.pl.map(function(p){return p.n}),late=base.slice(0,4).concat(['Recém Chegado']);
 var co=coOf(t),cn=co?co.n:null;
 t.tt=t.tt.filter(function(x){return x.y!==Y});
 [lk_('s1'),lk_('s2'),lk_('s3'),'MSI','First Stand'].forEach(function(k,i){t.tt.push({y:Y,k:k,r:base.slice(),co:cn,ph:i*3})});
 t.tt.push({y:Y,k:'Mundial',r:late,co:cn,ph:30});
 S.teams[1].yh[S.teams[1].yh.length-1].s1=1;/* time que não fecha tudo */
 grCheck();
 ok(t.gr&&t.gr.length===1&&t.gr[0].y===Y,'Golden Road registrada no clube');
 var g=t.gr[0];
 ok(g.fs===true&&g.ewc===true&&near(g.pz,ECO.gr.base*1.6),'campanha com First Stand e EWC: prêmio-base + 60% ('+g.pz+')');
 ok(g.r.length===4&&g.r.indexOf('Recém Chegado')<0&&g.r.indexOf(base[4])<0,'só quem jogou a campanha: '+g.r.join(','));
 ok(!cn||g.co.indexOf(cn)>=0,'técnico da campanha');
 ok(S.pdb[base[0]].tl.some(function(x){return x.t==='Golden Road'&&x.y===Y}),'ficha do jogador da campanha');
 ok(!(S.pdb['Recém Chegado']||{tl:[]}).tl.some(function(x){return x.t==='Golden Road'}),'quem chegou no fim não ganha');
 ok(!(S.teams[1].gr||[]).length,'sem os 5 títulos, sem Golden Road');
 grCheck();ok(t.gr.length===1,'não registra duas vezes');
 ok(/grn/.test(tlk(t))&&/grw/.test(crest(t,'sm'))&&!/grn/.test(tlk(S.teams[2])),'nome dourado e aro na logo só para quem conquistou');
 ok(vPlayer(base[0]).indexOf('Golden Road')>=0,'ficha do jogador mostra');
 ok(pshelfHTML(base[0],S.pdb[base[0]],S.hof[base[0]]||{lg:0}).indexOf('Golden Road')<0,'não conta como título de liga');
 tvw='ti';ok(vTeam(t.id).indexOf('Golden Road')>=0,'ficha do clube mostra');
 if(cn&&S.co[cn])ok(vCoach(cn).indexOf('Golden Road')>=0,'ficha do técnico mostra');
 hofView='teams';ok(vHof().indexOf('Golden Road')>=0,'Lendas > Times lista');
 /* seu clube: prêmio da campanha no caixa */
 coF={name:'Chefe GR',nat:'BRA',age:40,sty:'eq',ph:''};menuV='mgr';act('meCreate');mgrPick=t.id;act('mgrStart');
 var m=S.mgr,c0=m.cash;mgrSeasonEnd();
 var h=m.hist[m.hist.length-1];
 ok(h&&h.pz&&near(h.pz.gr,g.pz)&&h.pz.wc>0&&h.pz.msi>0&&h.pz.ewc>0&&h.pz.fs>0,'balanço com cada premiação: '+JSON.stringify(h&&h.pz));
 ok(near(h.prize,Object.keys(h.pz).reduce(function(a,k){return a+h.pz[k]},0)),'prêmio total = soma');
 ok(finHTML(t,m).indexOf('Golden Road')>=0&&finHTML(t,m).indexOf('Premiações')>=0,'tela de finanças');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
