/* Fase 5: celular (X, Instagram, WhatsApp, Gmail) ligado aos eventos do jogo, com tom e efeitos */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.soc=null;
 /* modo treinador */
 coF={name:'Chefe Redes',nat:'BRA',age:40,sty:'eq',ph:''};menuV='mgr';act('meCreate');
 var t=S.teams[4];mgrPick=t.id;act('mgrStart');var m=S.mgr;
 news(t.name+' contrata Fulano, que estava sem clube.');
 ok(S.soc&&S.soc.ps.length>=1,'manchete vira post: '+(S.soc&&S.soc.ps.length));
 ok(S.soc.ps.some(function(p){return p.a.k==='c'&&p.a.tid===t.id&&/Bem-vindo/.test(p.t)&&p.cd&&p.cd.k==='sign'}),'contratação: post oficial com arte de boas-vindas');
 var n1=S.soc.ps.length;news('Fulano (X) se lesiona e fica de fora do próximo ciclo.');news('LCK ganha uma vaga regular no Worlds.');ok(S.soc.ps.length===n1,'lesões e notas gerais não viram post');
 ok(S.soc.ps.some(function(p){return p.rp&&p.rp.length}),'torcida reage');
 ok(socCat('X é campeão do MSI 2026.')==='title'&&socCat('Y se lesiona e fica de fora do próximo ciclo.')==='injury'&&socCat('Z deixa o A e assina com o B.')==='sign'&&socCat('A vendeu Z e procura um substituto à altura.')==='sell','classificação dos eventos');
 /* sorteio do jogo não muda por causa da rede social */
 /* séries do seu time: tom e temperatura */
 var sat0=m.sat,o=S.teams[5],hy0=S.soc.hy,mor0=m.mor==null?60:m.mor;
 var n2=S.soc.ps.length;S.phase=0;t.fm='';socMatch({a:t.id,b:o.id,pa:.6,n:1},t.id,1,0);ok(S.soc.ps.length===n2,'jogo comum da liga não vira post');
 S.phase=PHI('wf');socMatch({a:t.id,b:o.id,pa:.6,n:5,po:1},t.id,3,1);ok(S.soc.ps.some(function(p){return p.cd&&p.cd.k==='gd'})&&S.soc.ps.some(function(p){return p.cd&&p.cd.k==='res'&&p.cd.w===1}),'jogo importante: game day e resultado com arte');
 S.phase=0;for(var i=0;i<6;i++){t.fm=(t.fm||'')+'D';socMatch({a:t.id,b:o.id,pa:.7},o.id,0,2)}
 ok(S.soc.hy<hy0-20,'derrotas esfriam a torcida: '+hy0+' -> '+S.soc.hy);
 ok(S.soc.ps.some(function(p){return p.rp.some(function(r){return r.tn==='angry'})}),'tom de cobrança após sequência ruim');
 ok(S.soc.ps.some(function(p){return /^#Fora/.test(p.tag||'')}),'hashtag de pressão');
 for(var i=0;i<8;i++){t.fm=(t.fm||'')+'D';socMatch({a:t.id,b:o.id,pa:.8},o.id,0,2)}
 ok(S.soc.hy<=-55&&S.soc.dm.some(function(d){return d.fk==='board'}),'diretoria manda mensagem quando a torcida pressiona');
 ok(m.sat<sat0||m.sat===0,'pressão pesa na diretoria');
 for(var i=0;i<30&&S.soc.hy<0;i++){t.fm=(t.fm||'')+'V';socMatch({a:t.id,b:o.id,pa:.4},t.id,2,0)}
 var mor1=m.mor;
 for(var i=0;i<14;i++){t.fm=(t.fm||'')+'V';socMatch({a:t.id,b:o.id,pa:.4},t.id,2,0)}
 ok(S.soc.hy>=50,'vitórias esquentam a torcida: '+S.soc.hy);
 ok(m.mor>mor1,'torcida animada reforça a moral: '+mor1+' -> '+m.mor+' hy '+S.soc.hy);
 ok(S.soc.ps.some(function(p){return p.tn==='hype'&&p.me}),'post de vitória do clube');
 var cr=clubRev(t,m);ok(cr.mc>0&&finHTML(t,m).indexOf('engajamento nas redes')>=0,'engajamento vira receita: '+cr.mc);
 news(t.name+' é campeão do MSI '+S.year+'.');
 ok(S.soc.dm.some(function(d){return d.fk==='mate'}),'colega manda mensagem no título');
 /* celular */
 act('phone');ok(PHO&&PHO.app==='home','abre o celular');
 var h=phoneHTML();ok(/ai-x/.test(h)&&/ai-ig/.test(h)&&/ai-wa/.test(h)&&/ai-gm/.test(h)&&/Instagram/.test(h)&&/WhatsApp/.test(h)&&/Gmail/.test(h),'tela inicial com X, Instagram, WhatsApp e Gmail');
 var n0=socNew();ok(n0>0,'contador de novidades');
 act('phApp','x');h=phoneHTML();ok(/Para você/.test(h)&&/O que está acontecendo/.test(h)&&/spst/.test(h)&&/class="scd k-/.test(h),'X: feed com artes e assuntos do momento');act('phTab','s');ok(/Seguindo/.test(phoneHTML()),'X: aba Seguindo');
 act('phApp','ig');h=phoneHTML();ok(/igst/.test(h)&&/igpo/.test(h)&&/Curtido por/.test(h),'Instagram: stories e posts com arte');act('phTab','me');h=phoneHTML();ok(/seguidores/.test(h)&&/Clima da torcida/.test(h),'Instagram: perfil e clima');
 act('phApp','wa');h=phoneHTML();ok(/wac/.test(h),'WhatsApp: conversas');
 var f=S.soc.dm[0].f;act('phChat',f);h=phoneHTML();ok(/ngm them/.test(h)&&S.soc.dm.filter(function(d){return d.f===f}).every(function(d){return d.rd}),'conversa aberta e lida');
 /* WhatsApp com respostas e efeitos */
 ok(S.soc.dm.some(function(d){return d.q==='bp'}),'diretoria pergunta e espera resposta');
 var gq=0;for(var i=0;i<40&&!gq;i++){S.soc.fx.wq=null;socMatch({a:t.id,b:o.id,pa:.6},o.id,0,1);gq=S.soc.dm.some(function(d){return d.q==='bad'&&d.ans==null})}ok(gq,'derrota: jogador pede conversa');
 var pp=t.pl[1];pp.f=-2;var dq=waAsk(pp.n,'pl','Tô sem confiança.','bad',pp.n);act('phChat',pp.n);h=phoneHTML();ok(/class="waq"/.test(h)&&/data-act="waAns"/.test(h)&&/Confio em você/.test(h),'opções de resposta na conversa');
 act('waAns',dq.i+':0');ok(Math.abs(pp.f-(-1.2))<1e-9&&dq.ans===0&&/recupera a confiança/.test(dq.rs),'resposta de apoio sobe a confiança: '+pp.f);
 act('waAns',dq.i+':2');ok(dq.ans===0&&Math.abs(pp.f-(-1.2))<1e-9,'não dá para responder duas vezes');
 h=phoneHTML();ok(/ngm me/.test(h)&&/ngm sys/.test(h)&&!/class="waq"/.test(h),'resposta e efeito aparecem no chat');
 var mo0=S.mgr.mor,mm0=t.mom||0,dl=waAsk(t.pl[0].n,'pl','Libera?','fest',t.pl[0].n);waAns(dl.i,1);ok(S.mgr.mor===Math.max(10,mo0-1)&&t.mom>mm0,'focar: momento sobe, moral cai um pouco');
 var x1=waAsk('Teste','pl','a','bad',t.pl[2].n),x2=waAsk('Teste','pl','b','bad',t.pl[2].n);ok(x1.ex===1&&!x2.ex,'pergunta antiga expira quando chega outra');
 act('phApp','gm');h=phoneHTML();ok(/Gmail/.test(h)&&/Caixa de entrada/.test(h),'Gmail com a caixa de e-mail');
 S.opt=S.opt||{};S.opt.socn=0;ok(socNew()===0,'aviso desligado');S.opt.socn=1;
 act('phone');ok(!PHO,'fecha o celular');
 for(var i=0;i<200;i++)news('Notícia '+i);ok(S.soc.ps.length<=SOCMAX&&S.soc.dm.length<=40,'histórico limitado');
 /* modo jogador: seguidores e fama */
 /* a rede social não consome o sorteio do jogo */
 var R=Math.random,cnt=0;Math.random=function(){cnt++;return R()};news(t.name+' vendeu X e procura um substituto à altura.');socMatch({a:t.id,b:o.id,pa:.5},t.id,2,1);Math.random=R;
 ok(cnt===0,'sem chamadas ao Math.random do jogo: '+cnt);
 ok(/data-act="phone"/.test(hubHTML(null,function(){return ''},'')),'botão do celular no painel');
 /* modo jogador: seguidores, menções e fama */
 S.mgr=null;S.soc=null;pcF={name:'Craque Viral',role:2,arch:'eq',nat:'BRA',team:String(S.teams[6].id),ph:''};act('pcCreate');
 var pc=S.pc,pt=pcFind().t,f0=pc.fame||0;
 S.phase=PHI('wf');for(var i=0;i<40;i++){pt.fm=(pt.fm||'')+'V';socMatch({a:pt.id,b:S.teams[7].id,pa:.3,n:5,po:1},pt.id,3,0)}
 ok(S.soc.fol>=10000&&S.soc.dm.some(function(d){return d.fk==='agent'}),'seguidores crescem e o empresário avisa: '+S.soc.fol);
 ok((pc.fame||0)>f0,'fama sobe com as redes: '+f0+' -> '+pc.fame);
 ok(S.soc.ps.some(function(p){return p.me&&p.a.k==='j'&&p.t.indexOf('Craque Viral')>=0})||S.soc.ps.some(function(p){return p.me}),'posts sobre você');
 var c0=S.pc.cash||0,dp=waAsk('Seu empresário','agent','Post pago?','pago');waAns(dp.i,0);ok(S.pc.cash>c0,'jogador: post pago rende dinheiro');
 var ft=pcFind(),en0=S.pc.en,dc=waAsk('Técnico','coach','Mais de você.','coach');waAns(dc.i,1);ok(en0==null||S.pc.en>=en0,'jogador: pedir descanso devolve energia');
 act('phone');act('phApp','ig');act('phTab','me');ok(/Craque Viral/.test(phoneHTML())&&/Jogador profissional/.test(phoneHTML()),'Instagram do jogador');act('phone');
 var js=JSON.stringify(S.soc);ok(js.length<200000,'save leve: '+js.length);
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM | posts '+S.soc.ps.length+' seguidores '+S.soc.fol;
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
