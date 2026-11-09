/* caixa de e-mail: ofertas graduais, pedido de scrim feito na aba Elencos com resposta por e-mail, resumo do ano, data dd/mm/aaaa */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
run(ctx,`S.opt=S.opt||{};S.mgr={tid:3,dr:null,bench:[],acad:[],cash:30,mor:60,rep:50,sat:60,fa:genFA(),offers:[],log:[],focus:'eq'};mEnsure();S.day=1;S.phase=0;S.season.sp=null;`);
let bad=0;const T=(ok,m)=>{console.log((ok?'OK  ':'FALHA ')+m);if(!ok)bad++};
T(run(ctx,`dFull(1)`)==='01/01/'+run(ctx,`S.year`),'1 de janeiro = 01/01/ano');
T(run(ctx,`dFull(365)`)==='31/12/'+run(ctx,`S.year`),'dia 365 = 31/12/ano');
T(run(ctx,`mailFA().length`)===0,'nenhum agente livre no e-mail no primeiro dia');
const seen=JSON.parse(run(ctx,`(function(){var L=[];for(var i=0;i<60;i++){mailFlow();L.push(mailFA().length)}return JSON.stringify(L)})()`));
T(seen[0]<=1&&seen[seen.length-1]<=3&&seen.some((v,i)=>i&&v>seen[i-1]),'agentes livres entram aos poucos: '+seen.filter((v,i)=>!i||v!==seen[i-1]).join('>'));
// scrim: pedir a qualquer time, resposta depois
const r=JSON.parse(run(ctx,`(function(){var q=sqS(),t=mgrT(),o=S.teams.find(function(x){return x!==t&&x.lg!==t.lg});
 q.out=[];q.rp=[];sqAsk(o.id);var a=q.out.length,m1=msg;sqAsk(o.id);var dup=q.out.length;
 var n0=mailN();S.day=2;var g=0;while(q.out.length&&g++<40){S.day++;sqTick()}
 return JSON.stringify([a,dup,q.out.length,q.rp.length,mailN()>n0,o.id,q.rp[0]&&q.rp[0].ok])})()`));
T(r[0]===1&&r[1]===1,'pedido enviado, duplicado ignorado');
T(r[2]===0&&r[3]===1&&r[4],'resposta chega depois e vira notificação no e-mail');
// aceita -> marcar
if(r[6]){const ok=JSON.parse(run(ctx,`(function(){var q=sqS();q.ok=null;q.pd=-1;var f=sqFree();sqAcc(${r[5]});return JSON.stringify([f,!!q.ok,q.rp.length])})()`));T(!ok[0]||(ok[1]&&ok[2]===0),'resposta positiva marca a scrim');}
// html
const h=run(ctx,`MAILO=true;hubHTML(PHASES[0],'','')`);
T(/class="mailw"/.test(h)&&/class="pn mail"/.test(h),'caixa de e-mail aberta como balão dentro do wrapper do ícone');
T(/\d\d\/\d\d\/\d{4}/.test(h)&&/de 365/.test(h),'data dd/mm/aaaa e dia X de 365 no cabeçalho');
T(!/Virada de ano<\/h2>/.test(run(ctx,`S.off=['x'];vSeason()`)),'painel "Virada de ano" removido');
// resumo no e-mail
run(ctx,`S.year++;S.recap={y:S.year-1,L:[['🏆','Mundial','Teste']]};S.phase=0;S.season.sp=null;MAILO=true;S.rcSeen=0`);
T(!/Resumo de /.test(run(ctx,`mailHTML()`))&&/class="pn recap"/.test(run(ctx,`vSeason()`)),'resumo do ano fica na tela, abaixo dos blocos, e não no e-mail');
// auto
T(run(ctx,`typeof autoToggle`)==='function','autoToggle existe');
process.exit(bad?1:0);
