/* o clube do gestor cai no play-off de acesso: a série precisa aparecer como jogo, ser jogável e só então mudar as divisões */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;S.mgr=null;var lg='LCK',o=[];
 S.phase=PHASES.findIndex(function(p){return p.k==='s1'});S.day=1;spStart('s1');var g=0;while(S.season.sp&&g++<300)spStep();
 var pr=poPair(lg,'s1');if(!pr)return 'sem par';
 var res=[];
 [['gestor no ultimo da D1',pr.down.id],['gestor campeao da D2',pr.up.id]].forEach(function(c){
  S.mgr={tid:c[1],dr:null,bench:[],acad:[],sat:50,log:[]};S.season.pom=null;
  var sp={tag:'s1',lg:lg,stage:'fin',cur:[],last:[],rec:{},rounds:[],ri:0};
  var m=poMine(sp);
  var line=[c[0],'serie criada='+!!m];
  if(m){S.season.sp={tag:'s1',lg:lg,stage:'po',cur:[m],last:[]};
   line.push('n='+m.n,'mgrMatch='+(mgrMatch()===m));
   var a=m.a,b=m.b,d0=T(a).d+'/'+T(b).d;
   spStep();line.push('serie jogada='+!!m.res,'sp encerrado='+!S.season.sp,'divisoes antes='+d0+' ainda='+T(a).d+'/'+T(b).d);
   var w=m.res.w;promoRel('s1');
   line.push('placar '+m.res.wa+'-'+m.res.wb,'vencedor '+T(w).name,'divisao do vencedor depois='+T(w).d);
  }
  res.push(line.join(' ; '));
  /* reaplica o play-off em outro cenário: restaura quem era D1/D2 não é necessário, o teste termina após o 1o cenário */
 });
 return res.join(' || ')})()`);
console.log(out);
