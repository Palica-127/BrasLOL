/* Gestão > Solo Queue: 10 por região, dados íntegros, contratação pela janela, ficha do contratado e persistência */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 var L=slqList();
 ok(L.length===60,'60 jogadores, veio '+L.length);
 SLQR.forEach(function(g){ok(SLQ[g].length===10,'10 em '+g)});
 var seen={};
 L.forEach(function(x){
  ok(!seen[x.n.toLowerCase()],'nick repetido '+x.n);seen[x.n.toLowerCase()]=1;
  ok(!S.pdb[x.n],'nick já existe no jogo: '+x.n);
  ok(x.ok,'indisponível no começo: '+x.n+' ('+x.st+')');
  ok(x.role>=0&&x.role<=4,'função '+x.n);
  ok(x.chs.length===3&&x.chs.every(function(c){return !!CHIMG[c]}),'campeão sem ícone: '+x.n+' '+x.chs.join('/'));
  ok(x.r>=70&&x.r<=86&&x.pot>=x.r&&x.pot<=95,'OVR/potencial fora da faixa: '+x.n+' '+x.r+'/'+x.pot);
  ok(x.age>=16&&x.age<=31,'idade '+x.n+' '+x.age);
  ok(!!ISO2[x.nat],'país sem código: '+x.n+' '+x.nat);
  ok(phSlug(x.n).length>0,'nick sem slug de foto: '+x.n);
 });
 SLQR.forEach(function(g){var l=slqList(g);for(var i=1;i<l.length;i++)ok(l[i].r<=l[i-1].r+1,'ordem de OVR em '+g)});
 /* os titulares dos elencos reais não podem estar na lista */
 var names={};ALLT().forEach(function(t){t.pl.forEach(function(p){names[p.n.toLowerCase()]=1})});
 L.forEach(function(x){ok(!names[x.n.toLowerCase()],'já é titular de um time: '+x.n)});
 /* tela */
 mgrStart(3);S.mgr.cash=30;mgrView='soloq';
 SLQR.forEach(function(g){slqReg=g;var h=vMgr();ok(h.indexOf('Solo Queue')>0&&(h.match(/class="slr/g)||[]).length===10,'tela '+g);ok(!/undefined|NaN/.test(h),'undefined/NaN na tela '+g)});
 /* janela fechada: não contrata */
 var x=slqList('BR')[2],c0=S.mgr.cash,open0=mOpen();
 if(!open0){slqSign(x.id);ok(S.mgr.cash===c0&&!S.pdb[x.n],'contratou com a janela fechada')}
 /* com a janela aberta (cheat abre a janela e zera a taxa; depois confere a taxa sem cheat) */
 var fee=slqFee(x);ok(fee>0&&fee<10,'taxa estranha '+fee);
 S.mgr.cheat=true;ok(slqFee(x)===0,'cheat deveria zerar a taxa');
 var b0=S.mgr.bench.length;slqSign(x.id);
 var p=S.mgr.bench[S.mgr.bench.length-1];
 ok(S.mgr.bench.length===b0+1&&p&&p.n===x.n,'não foi para as reservas');
 ok(p&&Math.abs(p.r-x.r)<=3&&p.pot>=p.r&&p.ctr===2,'OVR de palco/contrato: '+(p&&p.r)+' vs '+x.r);
 ok(S.pdb[x.n]&&S.pdb[x.n].nat===x.nat,'sem registro do jogador');
 ok(slqP('BR',2).st==='out','não ficou marcado como contratado');
 var b1=S.mgr.bench.length;slqSign(x.id);ok(S.mgr.bench.length===b1,'contratou duas vezes');
 slqReg='BR';ok(/Contratado/.test(vMgr()),'botão Contratado');
 openProf('p',x.n);var pr=vProf();ok(pr.indexOf(x.n)>0&&!/undefined|NaN/.test(pr),'ficha do contratado');prof=null;pstack=[];tab='mgr';
 mgrPromote(x.n);ok(mgrT().pl[x.role].n===x.n,'não virou titular');
 /* sem caixa */
 S.mgr.cheat=false;S.mgr.cash=0;var y=slqList('KR')[0];
 if(mOpen()){slqSign(y.id);ok(!S.pdb[y.n],'contratou sem caixa')}
 /* persistência */
 save();S=JSON.parse(JSON.stringify(S));ok(slqP('BR',2).st==='out','contratado some ao recarregar');
 /* envelhece e sai da lista */
 var yr=S.year;S.year=2040;var o=slqList().filter(function(z){return z.st==='ret'}).length;S.year=yr;ok(o>50,'em 2040 quase todos deveriam ter parado, pararam '+o);
 return bad.length?'FALHAS: '+bad.join(' || '):'TODOS OS TESTES PASSARAM (60 jogadores, 6 regiões)';
})()`);
console.log(out);
if(/FALHAS/.test(out))process.exit(1);
