/* Negociação em conversa (computador entre clubes, celular com o jogador) e agentes livres por fim de contrato */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)},info=[];
 var noUndef=function(h,t){ok(typeof h==='string'&&!/undefined|NaN|\\[object/.test(h),t+' com undefined/NaN')};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 mgrStart(3);var m=S.mgr,t=mgrT();m.cash=200;
 /* janela aberta: pré-temporada */
 var ph0=S.phase,sp0=S.season.sp;S.season.sp=null;S.phase=0;S.day=2;ok(winOpen(),'janela deveria abrir');
 /* ---------- pool de livres existe e é gente real (com pdb, fora dos times) ---------- */
 ok(FA().length>=20,'pool de livres pequeno: '+FA().length);
 var inTeam={};ALLT().forEach(function(x){x.pl.concat(x.bn||[]).forEach(function(p){inTeam[p.n]=x.name})});
 FA().forEach(function(p){ok(!inTeam[p.n],'livre também está no '+inTeam[p.n]+': '+p.n);ok(!!S.pdb[p.n],'livre sem pdb '+p.n)});
 /* ---------- computador: comprar de outro clube pagando a pedida ---------- */
 var alvo=S.teams.filter(function(x){return x!==t})[5].pl[2];
 ngClub(alvo.n);ok(NGO&&NGO.k==='club','computador não abriu');
 ok(NGO.msgs.some(function(x){return x.w==='them'&&/pedimos/.test(x.t)}),'clube não disse a pedida');
 noUndef(negoHTML(),'tela do computador');ok(/pcs/.test(negoHTML()),'não é a tela de computador');
 var iPay=NGO.opts.findIndex(function(o){return o.v===100});var c0=m.cash;ngPick(iPay);
 ok(NGO.stage==='pp'&&m.cash===c0&&!m.bench.some(function(p){return p.n===alvo.n}),'clube aceitou mas já fechou/cobrou antes do jogador');
 var iCall=NGO.opts.findIndex(function(o){return o.f==='call'});ok(iCall>=0,'sem botão de ligar para o jogador');ngPick(iCall);
 ok(NGO.k==='pp'&&/class="phn"/.test(negoHTML()),'ligação não abriu o celular');noUndef(negoHTML(),'celular do jogador');
 if(NGO.st==='open'){ngPick(NGO.opts.findIndex(function(o){return o.f==='sign'}));ok(NGO.st==='done'&&m.bench.some(function(p){return p.n===alvo.n}),'fechar com o jogador falhou')}else info.push('jogador recusou o '+mgrT().name);NGO=null;
 /* time fraco: craque recusa; time médio: pede luvas */
 var keepT=m.tid;m.tid=S.teams.slice().sort(function(a,b){return baseOvr(a)-baseOvr(b)})[0].id;var weak=mgrT();var star=S.teams.slice().sort(function(a,b){return baseOvr(b)-baseOvr(a)})[0].pl[2];
 ok(ngWill(star,S.teams.find(function(x){return x.pl.includes(star)}))<.3,'craque deveria rejeitar time fraco (vontade '+ngWill(star,null).toFixed(2)+')');
 var bfa=FA().slice().sort(function(a,b){return b.r-a.r})[0];m.cash=200;ngPlayer('fa',bfa.n);info.push('livre '+bfa.n+' ('+bfa.r+') x '+weak.name+': vontade '+NGO.will.toFixed(2)+' '+NGO.st+' pede '+NGO.base);
 ok(NGO.will<.55?(NGO.st==='fail'||NGO.base>faFee(bfa)):true,'jogador sem vontade cobrou o normal');NGO=null;m.tid=keepT;t=mgrT();m.pblk={};
 /* contraproposta: oferta baixa até o clube responder com valor ou encerrar */
 var cont=0,fech=0,venc=0;
 S.teams.filter(function(x){return x!==t}).slice(10,40).forEach(function(x){var p=x.pl[1];if(!canBuy(p,x).ok)return;ngClub(p.n);if(!NGO||NGO.st!=='open'){NGO=null;return}
  ngPick(0);if(NGO.st==='done')venc++;else if(NGO.st==='fail')fech++;else if(NGO.opts[0].v===-1){cont++;ngPick(0);ok(NGO.stage==='pp','aceitar contraproposta não levou ao jogador')}else if(NGO.stage==='pp')venc++;NGO=null});
 ok(cont>0,'nunca houve contraproposta');info.push('clubes: contra '+cont+' aceitaram '+venc+' encerraram '+fech);
 /* ---------- computador: proposta recebida ---------- */
 m.offers=[{n:t.pl[0].n,to:9,price:3}];m.bench.push(Object.assign({},t.pl[0],{n:'ReservaTop',role:0}));S.pdb.ReservaTop={role:0,seasons:[],tl:[]};
 ngOff(0);ok(NGO&&NGO.k==='off','proposta recebida não abriu');noUndef(negoHTML(),'tela da proposta');
 var iUp=NGO.opts.findIndex(function(o){return o.f==='up'});ok(iUp>=0,'sem opção de pedir mais');ngPick(iUp);
 ok(NGO.st==='fail'||NGO.ask>=3.4||NGO.ask===3,'pedir mais com resultado estranho');
 if(NGO.st==='open'){var who=t.pl[0].n;ngPick(NGO.opts.findIndex(function(o){return o.f==='acc'}));ok(NGO.st==='done'&&!t.pl.some(function(p){return p.n===who}),'venda pela conversa falhou')}
 NGO=null;
 /* ---------- celular: agente livre ---------- */
 m.cash=200;var fa=FA().slice().sort(function(a,b){return b.r-a.r})[0];
 ngPlayer('fa',fa.n);ok(NGO&&NGO.k==='fa','celular não abriu');var hp=negoHTML();ok(/class="phn"/.test(hp),'não é a tela de celular');noUndef(hp,'tela do celular');
 var base=NGO.base,c1=m.cash;ngPick(NGO.opts.findIndex(function(o){return o.f==='pay'}));
 ok(NGO.st==='done'&&m.bench.some(function(p){return p.n===fa.n})&&!FA().some(function(p){return p.n===fa.n}),'contratar livre pelo celular falhou');
 ok(Math.abs(m.cash-(c1-base))<.05,'cobrou errado: '+(c1-m.cash)+' vs '+base);NGO=null;
 /* oferta baixa: aceita, contrapropõe ou se ofende (bloqueia na janela) */
 m.cash=200;var r={ac:0,ct:0,of:0};FA().slice(0,25).forEach(function(p){ngPlayer('fa',p.n);if(!NGO||NGO.st!=='open'){NGO=null;return}ngPick(0);if(NGO.st==='done')r.ac++;else if(NGO.st==='fail')r.of++;else if(NGO.cnt!=null)r.ct++;NGO=null});
 ok(r.ac+r.ct+r.of>0,'nenhuma oferta baixa avaliada');info.push('livres oferta baixa: '+JSON.stringify(r));
 /* ---------- celular: Solo Queue com peneira ---------- */
 m.cash=200;var sq=slqList().find(function(x){return x.ok&&x.sc==null});ngPlayer('sq',sq.id);
 var iSc=NGO.opts.findIndex(function(o){return o.f==='sc'});ok(iSc>=0,'sem opção de peneira');ngPick(iSc);
 ok(NGO.msgs.some(function(x){return x.w==='sys'&&/Peneira/.test(x.t)}),'peneira não apareceu na conversa');
 ok(NGO.opts.every(function(o){return o.f!=='sc'}),'peneira continua como opção');
 ngPick(NGO.opts.findIndex(function(o){return o.f==='pay'}));var x2=slqP(sq.reg,sq.i);
 ok(NGO.st==='done'&&x2.st==='out','Solo Queue pelo celular falhou');NGO=null;
 /* janela fechada: dá para conversar, não para assinar */
 S.phase=ph0;S.season.sp=sp0;ok(!winOpen(),'janela deveria fechar');
 var fb=FA()[0];ngPlayer('fa',fb.n);ok(NGO.opts.filter(function(o){return o.f==='pay'||o.f==='off'}).every(function(o){return o.dis}),'assinar com janela fechada');ok(NGO.msgs.some(function(x){return /janela/.test(x.t)}),'sem aviso de janela');NGO=null;
 /* ---------- contratos: virada de ano libera, o pool envelhece e os clubes contratam do pool ---------- */
 var n0=FA().length,off=[];faYear(off);aiContracts(off);
 ok(off.some(function(l){return /Fim de contrato/.test(l)}),'nenhum contrato venceu: '+off.join(' | '));
 info.push('virada: '+off.join(' | ').slice(0,180)+' | pool '+n0+' -> '+FA().length);
 inTeam={};var dup=0;ALLT().forEach(function(x){x.pl.concat(x.bn||[]).forEach(function(p){if(inTeam[p.n])dup++;inTeam[p.n]=1})});
 FA().forEach(function(p){if(inTeam[p.n])dup++});ok(dup===0,'jogador duplicado entre times e pool: '+dup);
 ok(FA().length<=FAMAX,'pool acima do limite');
 /* seu jogador sem renovação vai para o pool */
 S.phase=0;S.season.sp=null;var mine=t.pl[3];mine.exp=true;mExpire();
 ok(FA().some(function(p){return p.n===mine.n})||S.teams.some(function(x){return x.pl.some(function(p){return p.n===mine.n})}),'jogador sem renovação sumiu');
 ok(!t.pl.some(function(p){return p.n===mine.n}),'jogador sem renovação continua no time');
 ok(m.log.some(function(l){return /sem renovação/.test(l)}),'diário sem o fim de contrato');
 /* tela de livres e ficha de um livre */
 mgrView='livres';mgrRole=5;var hl=vMgr();ok(/Agentes livres/.test(hl)&&/Negociar/.test(hl),'tela de livres');noUndef(hl,'tela de livres');
 openProf('p',FA()[0].n);var pr=vProf();ok(/Sem clube/.test(pr),'ficha do livre');noUndef(pr,'ficha do livre');prof=null;pstack=[];tab='mgr';
 return (bad.length?'FALHAS: '+bad.join(' || '):'TODOS OS TESTES PASSARAM')+' | '+info.join(' | ');
})()`);
console.log(out);
if(/FALHAS/.test(out))process.exit(1);
