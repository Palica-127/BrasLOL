/* Empréstimos: o emprestado aparece no elenco de quem o recebeu (titular ou reserva), com o dono dos direitos identificado;
   volta na virada de ano; saves antigos (m.loan[i].p) migram; modo jogador pede/aceita empréstimo e volta ao clube dono */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 /* ---------- modo treinador ---------- */
 coF={name:'Chefe Emp',nat:'BRA',age:40,sty:'eq',ph:''};menuV='mgr';act('meCreate');
 var t=S.teams[3];mgrPick=t.id;act('mgrStart');mEnsure();S.mgr.cheat=1;
 ok(mOpen(),'janela aberta');
 var m=S.mgr,p=m.bench[0]||m.acad[0];ok(!!p,'tem reserva para emprestar');
 var nm=p.n;mgrLoan(nm);
 var w=lnWhere(nm);
 ok(w&&w.t!==t,'emprestado está no elenco de outro clube: '+(w&&w.t.name));
 ok(w&&w.p.ln&&w.p.ln.o===t.id&&lnOwnNm(w.p)===t.name,'direitos com o dono');
 ok(m.loan.length===1&&m.loan[0].n===nm&&!m.loan[0].p,'dono guarda só o vínculo');
 var vt=vTeam(w.t.id);
 ok(vt.indexOf(nm)>=0,'aparece na ficha do clube que recebeu');
 ok(vt.indexOf('Emprestado pelo '+t.name)>=0||vt.indexOf('direitos do '+t.name)>=0,'ficha do clube que recebeu identifica o empréstimo');
 ok(vTeam(t.id).indexOf('Cedidos por empréstimo')>=0&&vTeam(t.id).indexOf(nm)>=0,'ficha do dono lista o cedido');
 ok(vPlayer(nm).indexOf('emprestado pelo '+t.name)>=0,'ficha do jogador mostra o empréstimo');
 ok(elencoHTML(t,m,false,null).indexOf(nm)>=0,'gestão lista o emprestado');
 /* a IA não compra nem dispensa o emprestado: várias viradas de contrato */
 var off=[];aiContracts(off);faSeed();ensureBn(w.t);
 ok(!!lnWhere(nm)&&lnWhere(nm).p.ln,'continua emprestado depois de contratos/limpeza do banco');
 /* virada de ano: volta */
 nextSeason();
 var back=m.bench.concat(m.acad).some(function(x){return x.n===nm});
 ok(back,'voltou para o dono na virada');
 ok(!ALLT().some(function(x){return x.pl.concat(x.bn||[]).some(function(q){return q.n===nm})}),'saiu do clube que o recebeu');
 ok(m.loan.length===0,'lista de emprestados vazia');
 /* save antigo: m.loan com o objeto do jogador */
 var q=m.bench[0]||m.acad[0];dropFrom(q);m.loan=[{p:q,to:S.teams[7].name,from:'bench'}];
 mEnsure();
 var w2=lnWhere(q.n);ok(w2&&w2.p.ln&&m.loan[0].n===q.n&&!m.loan[0].p,'save antigo migrado para o elenco do clube que recebeu');
 /* ---------- modo jogador ---------- */
 var mt=S.mgr.tid;S.mgr=null;
 pcF={name:'Emprestado Kid',role:2,arch:'eq',nat:'BRA',team:String(S.teams[5].id),ph:''};act('pcCreate');
 S.phase=0;S.day=2;S.season.sp=null;
 var f=pcFind();ok(!!f,'jogador criado');
 /* força ser reserva */
 if(!f.bn){var tt=f.t,me=f.p,sub=(tt.bn||[]).find(function(x){return x.role===me.role})||bnPlayer(tt,me.role);tt.bn=(tt.bn||[]).filter(function(x){return x!==sub});tt.pl[me.role]=sub;tt.bn.push(me);me.r=Math.max(me.r,70)}
 f=pcFind();ok(f.bn,'jogador é reserva');
 var own=f.t;
 ok(vPc().indexOf('Pedir empréstimo')>=0,'botão de pedir empréstimo');
 pcLoanAsk();
 var lo=(S.pc.offers||[]).filter(function(o){return o.k==='L'});
 ok(lo.length>=1,'propostas de empréstimo chegam: '+msg);
 pcLoanAsk();ok(/já ouviu/.test(msg),'um pedido por janela');
 var i=S.pc.offers.indexOf(lo[0]),dest=lo[0].tn;pcAccept(i);
 f=pcFind();
 ok(f&&f.t.name===dest&&f.p.ln&&lnOwnNm(f.p)===own.name,'jogando pelo clube que recebeu, direitos com o dono');
 ok(vTeam(f.t.id).indexOf('Emprestado Kid')>=0,'aparece na ficha do clube que recebeu');
 ok(vPc().indexOf('emprestado pelo')>=0,'tela da carreira mostra o empréstimo');
 pcOffers();ok(!(S.pc.pend||[]).length,'emprestado não recebe propostas de transferência');
 S.pc.ctr=5;nextSeason();
 f=pcFind();
 ok(f&&f.t===own&&!f.p.ln,'voltou ao clube dono na virada: '+(f&&f.t.name));
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
