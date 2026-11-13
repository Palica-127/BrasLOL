/* Simulação de carreira até o nível 100: quantas temporadas leva e quantos pontos de habilidade/status o jogador junta.
   Usa o código real do jogo (pcWeek, pcGain, árvore, investimentos). Partidas são aproximadas: MAPAS por temporada, com XP médio de um mapa disputado.
   node ferramentas/testes/simulacao_nivel100.js [mapas_por_temporada=60] */
const {load,run}=require('./harness.js');
const MAPAS=+process.argv[2]||60;
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const J=c=>JSON.parse(run(ctx,`JSON.stringify(${c})`));
run(ctx,`S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;`);

/* prioridade de compra do jogador "otimizado": primeiro o que acelera o XP */
const PRIO=['e1','e3','e9','e12','e13','e16','e19','e21','e22','e4','e6','e8','e14','e18','p1','p2','p4'];
function sim(nome,opts){
  run(ctx,`pcCreate({name:'Sim ${nome}',team:S.teams[0].id,role:2,arch:'eq'});S.pc.sal=2;S.pc.cash=0;var f0=pcFind();f0.p.age=18;`);
  const saida={nome,lv:{},ano100:null};
  for(let ano=1;ano<=30&&!saida.ano100;ano++){
    run(ctx,`var f1=pcFind();f1.p.age=${17+ano};`);
    for(let w=0;w<52;w++){
      run(ctx,`S.pc.plan=${opts.mix?`(S.pc.en>=${opts.limite||70}?'i':'n')`:`'n'`};pcWeek();`);
      /* mapas do ano espalhados pelas semanas (XP de partida: 30 + vitória 24*50% + nota 7,5 -> ~+18) */
      const n=Math.round(MAPAS/52+(w<MAPAS%52?0:0));
      for(let i=0;i<n;i++)run(ctx,`pcGain(${30+12+18},1+pcFx('xpm'))`);
    }
    /* fim de temporada: nota boa (~120), metas (média 1 por ano, 120) e salário */
    run(ctx,`pcGain(120);pcGain(${ano<=8?120:40});S.pc.cash=r1(S.pc.cash+S.pc.sal*(1+pcFx('inc')));`);
    if(opts.compra){
      /* gasta pontos de habilidade na ordem de prioridade, depois no que estiver disponível mais barato */
      for(let g=0;g<80;g++){
        const id=J(`(function(){var pc=S.pc;var all=${JSON.stringify(PRIO)}.concat(PERKS.map(function(x){return x.id}));for(var i=0;i<all.length;i++){var d=PERKS.find(function(x){return x.id===all[i]});if(d&&pcPerkSt(d)==='can')return d.id}return null})()`);
        if(!id)break;run(ctx,`pcLearn('${id}')`);
      }
    }
    if(opts.inv){
      for(const id of ['ic','ia','ic','ia','ic','ia','ic','ic']){const c=J(`pcInvCost(INV.find(function(x){return x.id==='${id}'}))`);if(c!=null&&J('S.pc.cash')>=c)run(ctx,`pcInvBuy('${id}')`)}
    }
    const lv=J('S.pc.lv');saida.lv[ano]=lv;
    if(lv>=100)saida.ano100=ano;
  }
  const r=J(`(function(){var pc=S.pc,gasto=0;PERKS.forEach(function(x){if(pc.perks[x.id])gasto+=x.c});return {lv:pc.lv,tpLivre:pc.tp,gasto:gasto,total:gasto+pc.tp-(pc.bt||0),status:pc.pts,sw:pc.swp||0,perks:Object.keys(pc.perks).length}})()`);
  /* troca no nível 99+: tudo que sobrou de status vira habilidade */
  run(ctx,`pcSwap(true)`);
  const t=J(`(function(){var pc=S.pc;return {tp:pc.tp,sw:pc.swp||0,pts:pc.pts}})()`);
  Object.assign(saida,{nivelFinal:r.lv},r,{lv:saida.lv,trocados:t.sw,tpAposTroca:t.tp});
  return saida;
}
const saidas=[sim('Casual (treino Normal, habilidades de XP, sem investir)',{mix:false,compra:true}),sim('Misto (alterna Intenso/Normal, habilidades de XP, sem investir)',{mix:true,compra:true,limite:70}),sim('Otimizado (Intenso/Normal, habilidades de XP e investimentos de XP)',{mix:true,compra:true,inv:true,limite:70})];
console.log(`Mapas por temporada: ${MAPAS}. Custo total da árvore: ${J('PERKS.reduce(function(a,x){return a+x.c},0)')} pontos (${J('PERKS.length')} habilidades).`);
console.log(`XP total para o nível 100: ${J('(function(){var s=0;for(var l=1;l<100;l++)s+=pcNeed(l);return s})()')}`);
for(const s of saidas){
  console.log(`\n== ${s.nome} ==  nível 100 na temporada ${s.ano100||'(não chegou em 30)'}`);
  console.log('nível por temporada:',Object.entries(s.lv).filter(([a])=>a%2===0||+a===s.ano100).map(([a,l])=>`T${a}:${l}`).join(' '));
  console.log(`pontos de habilidade ganhos só por nível: ${s.total} (gastos ${s.gasto}, livres ${s.tpLivre}); status sobrando: ${s.status}; trocados na troca 3:1: ${s.trocados}`);
}
