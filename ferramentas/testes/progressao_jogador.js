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
run(ctx,`pcGain(100000);`);
ok(J('S.pc.lv')===60,'nível máximo 60');
run(ctx,`S.pc.lv=4;S.pc.xl=0;S.pc.pts=0;pcGain(pcNeed(4));`);
ok(J('S.pc.lv')===5&&J('S.pc.pts')===2,'nível 5 dá 2 pontos');

/* ---- árvore: requisitos de nível, pré-requisito e custo ---- */
run(ctx,`S.pc.lv=3;S.pc.tp=5;pcLearn('c2');`);
ok(J('!S.pc.perks.c2'),'característica de nível 6 bloqueada no nível 3');
run(ctx,`pcLearn('c1');`);
ok(J('S.pc.perks.c1')===1&&J('S.pc.tp')===4,'aprende c1 por 1 ponto');
run(ctx,`S.pc.lv=6;pcLearn('c3');`);
ok(J('!S.pc.perks.c3'),'c3 pede c2 antes');
run(ctx,`pcLearn('c2');`);
ok(J('S.pc.perks.c2')===1&&J('S.pc.tp')===2,'aprende c2 por 2 pontos');
run(ctx,`pcLearn('c1');`);
ok(J('S.pc.tp')===2,'não paga duas vezes pela mesma característica');
run(ctx,`var a0=S.pc.at[1];S.pc.pts=1;pcSpend(1);`);
ok(J('S.pc.at[1]')===J('a0')+1,'ponto de status sobe o atributo');

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
run(ctx,`lvPick(pcAuto());lvPosture('sf');`);
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
run(ctx,`pcTreeOpen=true;`);
ok(run(ctx,'vPc()').includes('Fechar árvore de habilidades'),'botão abre a árvore');

/* ---- telas ---- */
for(const e of ['vPc()','pcSummary()','mailHTML()','pcTreeHTML(pcFind())','pcTrainHTML(pcFind())','pcTrustHTML(pcFind())','pcLvHTML()','pcStatusHTML(pcFind())','pcTreeBtnHTML()']){
  try{const x=run(ctx,e);ok(String(x).length>40,'renderiza '+e)}catch(err){ok(false,'renderiza '+e+' -> '+err.message)}
}

/* ---- save antigo (sem os campos novos) ---- */
run(ctx,`var old=S.pc;delete old.lv;delete old.xl;delete old.xt;delete old.tr;delete old.plan;delete old.perks;delete old.wd;delete old.test;delete old.tcd;pcEnsure();`);
ok(J('[S.pc.lv>=1,S.pc.tr>0,S.pc.plan,typeof S.pc.perks]').join()==='true,true,n,object','migra save antigo');

/* ---- virada de ano com o sistema novo ---- */
try{run(ctx,`pcYear();`);ok(true,'pcYear roda')}catch(e){ok(false,'pcYear -> '+e.message)}

console.log(falhas?`\n${falhas} falha(s)`:'\ntudo certo');
process.exit(falhas?1:0);
