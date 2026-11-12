/* Modo jogador: nível/XP, árvore de habilidades, treino semanal, confiança do técnico e testes (scrim/torneio) */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
let falhas=0;
const ok=(c,m)=>{if(!c){falhas++;console.log('FALHOU:',m)}else console.log('ok:',m)};
const J=c=>JSON.parse(run(ctx,`JSON.stringify(${c})`));

run(ctx,`S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;`);
/* ---- criação: reserva, nível 1, confiança baixa ---- */
run(ctx,`var tid0=S.teams[0].id;var r0=pcCreate({name:'Novato Teste',team:tid0,role:2,arch:'eq'});`);
ok(J('r0')===true,'carreira criada');
ok(J('[S.pc.lv,S.pc.tr,S.pc.plan,Object.keys(S.pc.perks).length]').join()==='1,30,n,0','nível 1, confiança 30, plano normal, sem características');
ok(J('pcFind().bn')===true,'começa como reserva');

/* ---- XP e níveis ---- */
run(ctx,`var pts0=S.pc.pts||0;pcGain(pcNeed(1));`);
ok(J('S.pc.lv')===2&&J('S.pc.pts')===J('pts0')+1,'XP suficiente sobe o nível 1->2 e dá 1 ponto de status');
run(ctx,`pcGain(10000000);`);
ok(J('S.pc.lv')===100,'nível máximo 100');
run(ctx,`S.pc.lv=4;S.pc.xl=0;S.pc.pts=0;pcGain(pcNeed(4));`);
ok(J('S.pc.lv')===5&&J('S.pc.pts')===2,'nível 5 dá 2 pontos');

/* ---- árvore em losango: nível mínimo, ligações, custo e efeitos ---- */
ok(J('PERKS.length')===66&&J('PERKS.every(function(x){return x.pa.every(function(i){return PERKS.some(function(y){return y.id===i})})})'),'66 habilidades (22 por ramo) e todas as ligações apontam para habilidades que existem');
ok(J('["c","e","p"].every(function(b){return PERKS.filter(function(x){return x.br===b}).map(function(x){return x.r}).sort().join()==="0,1,1,2,2,2,2,3,3,3,4,5,5,6,6,6,6,7,7,7,8,9"})'),'cada ramo tem o formato 1-2-4-3-1 + 2-4-3-1-1');
run(ctx,`S.pc.lv=3;S.pc.tp=9;S.pc.perks={};pcLearn('c4');`);
ok(J('!S.pc.perks.c4'),'habilidade de nível 4 bloqueada no nível 3 e sem a ligada');
run(ctx,`pcLearn('c1');`);
ok(J('S.pc.perks.c1')===1&&J('S.pc.tp')===8,'aprende a raiz c1 por 1 ponto');
run(ctx,`pcLearn('c4');`);
ok(J('!S.pc.perks.c4'),'c4 ainda pede nível 4');
run(ctx,`S.pc.lv=7;var l0=S.pc.at[0];pcLearn('c4');`);
ok(J('S.pc.perks.c4')===1&&J('S.pc.at[0]')===J('l0')+2,'Duelista dá +2 de Lane ao aprender');
run(ctx,`pcLearn('c7');`);
ok(J('!S.pc.perks.c7'),'Outplay pede Reflexos afiados (ligação), não basta ter Duelista');
run(ctx,`pcLearn('c2');pcLearn('c2');`);
ok(J('S.pc.perks.c2')===1&&J('S.pc.tp')===5,'Decisivo (ligado a Duelista) custa 2 e não cobra duas vezes');
run(ctx,`S.pc.lv=15;S.pc.tp=20;pcLearn('c11');`);
ok(J('!S.pc.perks.c11'),'Lenda do Rift exige 2 das 3 habilidades ligadas');
run(ctx,`pcLearn('c5');pcLearn('c7');pcLearn('c3');pcLearn('c11');`);
ok(J('!S.pc.perks.c11')===true||J('S.pc.perks.c3')===1,'Carregador exige Decisivo ou Outplay');
run(ctx,`S.pc.perks.c9=1;S.pc.perks.c3=1;pcLearn('c11');`);
ok(J('S.pc.perks.c11')===1,'com 2 ligadas a Lenda do Rift libera');
ok(J('Math.abs(pcFx("adj")-0.02)<1e-9&&Math.abs(pcFx("bold")-0.15)<1e-9&&Math.abs(pcFx("pk")-0.12)<1e-9'),'efeitos somam (vitória/mapa, buscar o jogo, abates)');
run(ctx,`S.pc.perks={};S.pc.at[1]=60;S.pc.tp=5;S.pc.lv=7;pcLearn('c1');pcLearn('c5');`);
ok(J('S.pc.at[1]')===62,'Reflexos afiados +2 de Mecânica e o OVR é recalculado');
run(ctx,`S.pc.perks={};S.pc.pts=1;`);
run(ctx,`var a0=S.pc.at[1];S.pc.pts=1;pcSpend(1);`);
ok(J('S.pc.at[1]')===J('a0')+1,'ponto de status sobe o atributo');
/* efeitos de treino e confiança */
run(ctx,`S.pc.perks={e1:1,e9:1,p2:1};`);
ok(Math.abs(J('pcFx("xpw")')-0.35)<1e-9,'Dedicado + Professor: +35% de XP semanal');
run(ctx,`S.pc.tr=50;pcTrust(10);var up=S.pc.tr-50;S.pc.tr=50;pcTrust(-10);var dn=50-S.pc.tr;`);
ok(Math.abs(J('up')-13)<0.2&&Math.abs(J('dn')-7)<0.2,'Voz de liderança: confiança +30% / −30%');
run(ctx,`S.pc.perks={};`);

/* ---- treino semanal: processa semanas decorridas, dá XP e energia ---- */
run(ctx,`S.pc.lv=1;S.pc.xl=0;S.pc.en=100;S.pc.plan='i';S.pc.wd=pcAbs()-14;S.pc.tr=40;var xt0=S.pc.xt;pcDaily();`);
ok(J('S.pc.xt')>J('xt0'),'duas semanas de treino dão XP');
ok(J('S.pc.en')<100,'treino intenso gasta energia');
ok(J('pcAbs()-S.pc.wd')<7,'semanas consumidas');
run(ctx,`S.pc.plan='d';S.pc.en=20;S.pc.wd=pcAbs()-7;pcDaily();`);
ok(J('S.pc.en')>=70,'folga recupera energia');

/* ---- confiança: promoção e rebaixamento pelo técnico ---- */
run(ctx,`var f=pcFind(),st=f.t.pl[f.p.role];f.p.r=st.r;S.pc.tr=80;pcCoach();`);
ok(J('!pcFind().bn')===true,'confiança 80 + OVR próximo do titular: vira titular');
ok(J('S.pc.tr')===55,'confiança volta a 55 depois da promoção');
run(ctx,`var f2=pcFind(),t2=f2.t,role2=f2.p.role;t2.bn=t2.bn||[];t2.bn.push({n:'Reserva Fake',role:role2,r:f2.p.r+1,age:20,pot:80,f:0,d:0});S.pc.tr=10;pcCoach();`);
ok(J('pcFind().bn')===true,'confiança <=15 e reserva à altura: perde a vaga');
run(ctx,`ptSwapOut();var f3=pcFind();f3.t.bn=f3.t.bn.filter(function(x){return x.n!=='Reserva Fake'});`);

/* ---- sem reserva de função forte, o titular com pouca confiança segue ---- */
run(ctx,`var f4=pcFind();if(f4.bn){var st4=f4.t.pl[f4.p.role];f4.t.bn.splice(f4.t.bn.indexOf(f4.p),1);f4.t.pl[f4.p.role]=f4.p;f4.t.bn.push(st4)}f4.t.bn=f4.t.bn.filter(function(x){return x.role!==f4.p.role||x.pc});S.pc.tr=5;pcCoach();`);
ok(J('!pcFind().bn')===true,'sem reserva da função, o titular mantém a vaga');

/* ---- testes: scrim simulada, reserva entra e sai do lugar do titular ---- */
run(ctx,`var f5=pcFind();if(!f5.bn){var t5=f5.t,r5=f5.p.role,o5={n:'Titular Original',role:r5,r:f5.p.r+10,age:22,pot:90,f:0,d:0};t5.pl[r5]=o5;t5.bn.push(f5.p)}
 S.pc.test=null;S.pc.tr=50;S.season.fm=null;LV=null;DV=null;S.day=Math.max(S.day,3);`);
ok(J('pcFind().bn')===true,'preparado como reserva para o teste');
run(ctx,`var tit=pcFind().t.pl[pcFind().p.role].n;var nm=S.pc.n;ptNew('s');`);
ok(J('!!S.pc.test&&S.pc.test.k===\'s\'')===true,'scrim criada');
ok(J('mailN()>=1')===true,'e-mail avisa a convocação');
const h=run(ctx,`ptHTML()+ptHTML(true)`);ok(h.includes('Teste do técnico'),'HTML do teste renderiza');
run(ctx,`var trB=S.pc.tr,xtB=S.pc.xt;S.day=evDay();var rf=ptStart(true);`);
ok(J('rf')===false&&J('S.pc.test!==null'),'scrim em dia de jogo oficial é recusada');
run(ctx,`S.day=Math.max(1,evDay()-5);var started=ptStart(true);`);
ok(J('started')===true,'scrim simulada rodou');
ok(J('S.pc.test===null')===true,'convocação consumida');
ok(J('pcFind().bn')===true&&J('pcFind().t.pl[pcFind().p.role].n')===J('tit'),'titular original de volta ao lugar');
ok(J('S.pc.xt>xtB')===true,'scrim dá XP');
ok(J('S.pc.tr!==trB')===true,'scrim mexe na confiança');
ok(J('S.season.fm===null')===true,'sem partida pendurada');

/* ---- scrim jogada ao vivo (com draft e mapa ao vivo ligados) ---- */
run(ctx,`S.opt.draft=1;S.opt.live=1;S.pc.test=null;ptNew('s');S.day=Math.max(1,evDay()-5);ptStart(false);`);
ok(J('!!DV')===true,'scrim abre o draft');
ok(J('pcFind().bn')===false,'durante o teste a reserva ocupa a vaga');
run(ctx,`var g1=0;while(DV.i<SEQ.length&&g1++<60){var t=SEQ[DV.i];if(t[1]===DV.us){if(t[0]==='ban'){var c=CH[0].find(function(x){return !dvTaken(x[0])})[0];DV.bans[DV.us].push(c);DV.i++}else{var cc=CH[DV.prole].find(function(x){return !dvTaken(x[0])})[0];DV.pk[DV.us][DV.prole]=cc;DV.i++}}else dvAI()}DV.done=true;LOAD={};dvGo();lvOpen();LOAD=null;`);
ok(J('!!LV&&LV.m.fr===1')===true,'mapa ao vivo da scrim abre (não o jogo oficial)');
/* regressão: Barão/Ancião ativo no fim do mapa 1 não pode quebrar a tela do mapa 2 (lvGold com LV.pp vazio) */
run(ctx,`LV.bb={s:'me',until:99999,tot:180,t0:0,g0:0};LV.elder={s:'me',until:99999,tot:160,t0:0,g0:0};lvGameStart();`);
ok(J('LV.bb===null&&LV.elder===null')===true,'novo mapa limpa Barão e Ancião do mapa anterior');
ok(J('(function(){try{lvPowerHTML();return true}catch(e){return false}})()')===true,'tela do novo mapa não quebra com buffs do mapa anterior');
run(ctx,`lvGameStart();lvPick(pcAuto());lvPosture('sf');`);
for(let k=0;k<4000&&run(ctx,`LV&&LV.state!=='done'`);k++){
  const st=run(ctx,'LV.state');
  if(st==='run')run(ctx,'lvTick(5)');
  else if(st==='ckpt')run(ctx,"lvPosture('sf')");
  else if(st==='between'){run(ctx,"if(sdNeed(LV.m,LV.gi,LV.ia))act('lvSide','b');lvNext()");if(run(ctx,'!!DV'))run(ctx,`var g2=0;while(DV.i<SEQ.length&&g2++<60){var t=SEQ[DV.i];if(t[1]===DV.us){if(t[0]==='ban'){var c=CH[0].find(function(x){return !dvTaken(x[0])})[0];DV.bans[DV.us].push(c);DV.i++}else{var cc=CH[DV.prole].find(function(x){return !dvTaken(x[0])})[0];DV.pk[DV.us][DV.prole]=cc;DV.i++}}else dvAI()}DV.done=true;dvGo();lvResume();`)}
  else if(st==='pick')run(ctx,'lvPick(pcAuto())');
}
ok(J('LV.state')==='done','série ao vivo termina');

run(ctx,`var xtC=S.pc.xt;pcMatchEnd();lvDone();fmEnd();`);
ok(J('S.season.fm===null&&S.pc.test===null')===true,'teste encerrado');
ok(J('pcFind().bn&&pcFind().t.pl[pcFind().p.role].n')===J('tit'),'titular original de volta depois da série ao vivo');
ok(J('S.pc.xt>xtC')===true,'série ao vivo rendeu XP');

/* ---- torneio de meia temporada: semifinal e final ---- */
run(ctx,`S.opt.draft=0;S.opt.live=0;S.pc.test=null;ptNew('t');`);
ok(J('S.pc.test&&S.pc.test.k===\'t\'&&S.pc.test.o!==S.pc.test.o2')===true,'torneio criado com dois adversários');
run(ctx,`var tries=0;while(S.pc.test&&tries++<4){S.day=Math.max(1,evDay()-5);ptStart(true);}`);
ok(J('S.pc.test===null')===true,'torneio termina em no máximo 2 séries');
ok(J('S.season.fm===null&&!S.pc.sw')===true,'sem partida pendurada nem troca de vaga');

/* ---- recusar e expirar ---- */
run(ctx,`S.pc.test=null;S.pc.tr=50;ptNew('s');var trA=S.pc.tr;ptNo();`);
ok(J('S.pc.tr<trA&&S.pc.test===null')===true,'recusar a scrim derruba a confiança');
run(ctx,`S.pc.test=null;ptNew('s');S.pc.test.ax=pcAbs()-1;var trE=S.pc.tr;ptLife();`);
ok(J('S.pc.test===null&&S.pc.tr<trE')===true,'convite expirado derruba a confiança');

/* ---- pontos separados e treino de pool ---- */
run(ctx,`S.pc.lv=1;S.pc.xl=0;S.pc.pts=0;S.pc.tp=0;pcGain(pcNeed(1));`);
ok(J('S.pc.lv===2&&S.pc.pts===1&&S.pc.tp===1'),'nível 2: 1 ponto de status e 1 de habilidade, separados');
run(ctx,`S.pc.plan='p';S.pc.en=100;S.pc.pool={};var rl=pcFind().p.role;pcWeek();`);
ok(J('S.pc.wk.pl.length===5&&S.pc.wk.pl.every(function(c){return (S.pc.pool[c]||0)>0})'),'treino de pool: 5 campeões aleatórios ganham domínio');
run(ctx,`CH[rl].forEach(function(x){S.pc.pool[x[0]]=1});S.pc.en=100;pcWeek();`);
ok(J('S.pc.wk.pl.length===0'),'treino de pool ignora campeões já em 100%');
ok(run(ctx,'pcTreeHTML(pcFind())').includes('tdia')&&run(ctx,'pcTreeHTML(pcFind())').includes('<path d="M'),'árvore em losango com ligações');
run(ctx,`pcBr='e';`);ok(run(ctx,'pcTreeHTML(pcFind())').includes('Estudioso'),'troca de ramo');run(ctx,`pcBr='c';`);
run(ctx,'pcSub="hab";');ok(run(ctx,'vPc()').includes('tdia')&&run(ctx,'vPc()').includes('tbg'),'sub-aba Habilidades mostra a árvore com fundo');run(ctx,'pcSub="car";');ok(!run(ctx,'vPc()').includes('tdia')&&run(ctx,'vPc()').includes('pcsub'),'sub-aba Carreira não mostra a árvore');

/* ---- telas ---- */
for(const e of ['vPc()','pcSummary()','mailHTML()','pcTreeHTML(pcFind())','pcTrainHTML(pcFind())','pcTrustHTML(pcFind())','pcLvHTML()','pcStatusHTML(pcFind())','pcInvHTML()']){
  try{const x=run(ctx,e);ok(String(x).length>40,'renderiza '+e)}catch(err){ok(false,'renderiza '+e+' -> '+err.message)}
}

/* ---- save antigo (sem os campos novos) ---- */
run(ctx,`var old=S.pc;delete old.lv;delete old.xl;delete old.xt;delete old.tr;delete old.plan;delete old.perks;delete old.wd;delete old.test;delete old.tcd;pcEnsure();`);
ok(J('[S.pc.lv>=1,S.pc.tr>0,S.pc.plan,typeof S.pc.perks]').join()==='true,true,n,object','migra save antigo');

/* ---- virada de ano com o sistema novo ---- */
try{run(ctx,`pcYear();`);ok(true,'pcYear roda')}catch(e){ok(false,'pcYear -> '+e.message)}

/* ---- troca 3:1 (nível 99), investimentos e segunda metade da árvore ---- */
run(ctx,`S.pc.lv=98;S.pc.pts=9;S.pc.tp=0;pcSwap(false);`);
ok(J('[S.pc.pts,S.pc.tp].join()')==='9,0','antes do nível 99 a troca não funciona');
run(ctx,`S.pc.lv=99;pcSwap(false);`);
ok(J('[S.pc.pts,S.pc.tp].join()')==='6,1','nível 99: 3 de status viram 1 de habilidade');
run(ctx,`pcSwap(true);`);
ok(J('[S.pc.pts,S.pc.tp].join()')==='0,3','"trocar tudo" converte de 3 em 3');
run(ctx,`S.pc.pts=2;pcSwap(true);`);
ok(J('[S.pc.pts,S.pc.tp].join()')==='2,3','com menos de 3 pontos de status não troca');
run(ctx,`S.pc.cash=0.1;S.pc.inv={};pcInvBuy('ic');`);
ok(J('!S.pc.inv.ic')===true,'investimento sem dinheiro é recusado');
run(ctx,`S.pc.cash=5;pcInvBuy('ic');`);
ok(J('S.pc.inv.ic')===1&&Math.abs(J('S.pc.cash')-4.6)<.05,'investimento cobra o dinheiro e sobe de nível');
ok(Math.abs(J('pcFx("xpw")')-0.08)<1e-9,'Treinador particular dá +8% de XP semanal');
run(ctx,`S.pc.cash=50;S.pc.bt=0;S.pc.tp=0;pcBuyPts('t');pcBuyPts('t');`);
ok(J('S.pc.tp')===2&&J('S.pc.bt')===2&&J('S.pc.cash')<50,'compra de pontos de habilidade com dinheiro');
run(ctx,`S.pc.perks={c11:1};S.pc.lv=20;S.pc.tp=5;pcLearn('c12');`);
ok(J('S.pc.perks.c12')===1,'2ª metade: Instinto assassino (nível 20) sai do nó final c11');
run(ctx,`S.pc.perks={};S.pc.lv=100;S.pc.tp=9;pcLearn('c12');`);
ok(J('!S.pc.perks.c12')===true,'2ª metade exige o nó final da 1ª');
run(ctx,`S.pc.perks={};S.pc.cap=80;var cp0=pcCap();S.pc.perks={e22:1};`);
ok(J('pcCap()')===J('cp0')+2,'Onisciente (+2 de teto) aumenta o limite de atributo');

console.log(falhas?`\n${falhas} falha(s)`:'\ntudo certo');
process.exit(falhas?1:0);
