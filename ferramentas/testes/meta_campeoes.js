/* Meta: estatísticas de campeões da temporada, ficha de campeão, loja de itens, herança Samsung → Gen.G,
   nomes da época nas Lendas e adornos só no Golden Road mais recente */
const {load,run}=require('./harness.js');const fs=require('fs'),path=require('path');
const ctx=load(path.join(__dirname,'..','..','index.html'));
run(ctx,fs.readFileSync(path.join(__dirname,'..','..','itens.js'),'utf8').replace('var BRASITENS','BRASITENS'));
console.log(run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 /* registro dos mapas sem consumir o sorteio do jogo */
 var A=S.teams[0],B=S.teams[1],R=Math.random,cnt=0;Math.random=function(){cnt++;return R()};
 csMap({a:A.id,b:B.id},0,null,null,true);csMap({a:A.id,b:B.id},1,null,null,false);Math.random=R;
 ok(cnt===0,'registro não usa o Math.random do jogo: '+cnt);
 var cs=csS();ok(cs.n===2&&Object.keys(cs.k).length>=2,'dois mapas registrados');
 var c0=Object.keys(cs.c)[0];ok(cs.c[c0].g>=1&&cs.c[c0].r.some(function(x){return x>0}),'campeão com jogos e rota');
 ok(Object.keys(cs.p).length>=10&&Object.keys(cs.v).length>=10&&Object.keys(cs.s).length>=20,'jogador, duelo e sinergia registrados');
 /* mesmos picks para o mesmo mapa (sorteio próprio e determinístico) */
 var k1=Object.keys(cs.k)[0];S.cs=null;csMap({a:A.id,b:B.id},0,null,null,true);ok(Object.keys(csS().k)[0]===k1,'picks determinísticos');
 /* uma série inteira grava os mapas */
 S.cs=null;var m=mk(A,B,5);play(m);ok(csS().n===m.res.wa+m.res.wb,'série grava cada mapa: '+csS().n);
 /* virada de temporada guarda o resumo */
 S.year++;csMap({a:A.id,b:B.id},0,null,null,true);ok(S.csP&&S.csP.n>0&&S.cs.n===1,'temporada anterior vira resumo');S.year--;
 /* limite de tamanho */
 S.cs=null;for(var i=0;i<400;i++)csMap({a:S.teams[i%20].id,b:S.teams[(i+7)%20].id},i,null,null,i%3>0);
 var z=csS();ok(Object.keys(z.k).length<=CSCAP.k+300&&Object.keys(z.s).length<=CSCAP.s+3000,'tabelas com teto');
 /* telas */
 metaV='ch';metaR=2;metaF=null;var h=vMeta();ok(/class="mzrow tS"/.test(h)&&/Destaques/.test(h)&&/data-act="metaC"/.test(h),'tier list com destaques');
 var top=Object.keys(z.c).sort(function(a,b){return z.c[b].g-z.c[a].g})[0];act('metaC',top);h=vMeta();
 ok(/Melhores jogadores/.test(h)&&/Melhores sinergias/.test(h)&&/Counters/.test(h)&&/Composições mais vitoriosas/.test(h)&&/Onde é mais jogado/.test(h),'ficha de campeão completa');
 act('metaBack');ok(metaF===null,'volta para a tier list');
 metaV='it';itSel=3031;h=vMeta();ok(/class="itgrid"/.test(h)&&/itens\\/3031\\.webp/.test(h)&&/Receita/.test(h),'loja de itens com ícones e receita');
 /* herança Samsung → Gen.G e nome da época com o atual entre parênteses */
 var g=S.teams.find(function(x){return x.name==='Gen.G'});ok(ttCount(g).wc>=2,'Gen.G soma os Worlds do Samsung: '+ttCount(g).wc);
 h=cupHistHTML('wc');ok(/Samsung White <small class="orgp">\\(/.test(h.replace(/<\\/button>/g,''))||/Samsung White<\\/button> <small class="orgp">/.test(h),'Samsung White com (Gen.G)');
 ok(/Damwon Gaming<\\/button> <small class="orgp">\\(/.test(h),'DAMWON com (Dplus KIA)');
 ok(/data-act="lteam" data-v="samsung-white"/.test(h),'Samsung White segue com ficha própria');
 /* adornos só no Golden Road mais recente */
 var t1=S.teams.find(function(x){return x.name==='T1'});t1.gr=[{y:2026,r:t1.pl.map(function(p){return p.n})}];g.gr=[{y:2027,r:g.pl.map(function(p){return p.n})}];
 S.grH=[{y:2026,t:t1.id,tn:'T1',r:t1.pl.map(function(p){return p.n})},{y:2027,t:g.id,tn:'Gen.G',r:g.pl.map(function(p){return p.n})}];
 ok(/class="grw/.test(crest(g,'lg'))&&!/class="grw/.test(crest(t1,'lg')),'louro só no time do Golden Road mais recente');
 ok(grN(g.pl[0].n)&&!grN(t1.pl[0].n),'moldura só para quem fez o Golden Road mais recente');
 ok(grOf(t1)&&grOf(t1).length===1,'histórico do Golden Road antigo continua');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM'})()`));
