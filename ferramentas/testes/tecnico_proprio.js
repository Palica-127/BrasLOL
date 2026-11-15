/* Seu técnico: criado ao começar o modo treinador, tem ficha (estante, carreira, estilo), aparece na comissão técnica e na busca,
   nunca é contratado pela IA nem se aposenta sozinho; ex-jogador que vira técnico ganha a ficha com a estante de jogador */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 menuV='mgr';tab='menu';
 ok(vMenu().indexOf('Criar técnico')>=0,'menu do treinador pede para criar o técnico');
 coF={name:'Faker',nat:'BRA',age:35,sty:'ag',ph:''};ok(!meCreate(coF),'nome repetido recusado');
 coF={name:'Tite Rift',nat:'BRA',age:41,sty:'ag',ph:''};act('meCreate');
 var c=meCo();ok(c&&c.n==='Tite Rift'&&c.u===1&&c.nat==='BRA'&&coAge(c)===41&&c.sty==='ag','perfil criado: '+JSON.stringify(c));
 ok(vMenu().indexOf('Escolha o clube')>=0,'depois de criar mostra os clubes');
 var t=S.teams[4];mgrPick=t.id;act('mgrStart');
 ok(S.mgr&&S.mgr.tid===t.id&&S.mgr.plan==='ag','assumiu o clube com o plano do estilo');
 var v=vCoach('Tite Rift');ok(v.indexOf('seu técnico')>=0&&v.indexOf('Estante de troféus como técnico')>=0&&v.indexOf(esc(t.name))>=0,'ficha do seu técnico');
 ok(vTeam(t.id).indexOf('Tite Rift')>=0,'comissão técnica do time mostra seu técnico');
 ok(vMgr().indexOf('data-act="coach" data-v="Tite Rift"')>=0,'link para a ficha no modo treinador');
 psQ='Tite Rift';ok(psResults().some(function(r){return r.k==='c'&&r.id==='Tite Rift'}),'busca encontra seu técnico');psQ='';
 /* virada de ano: registra o ano, IA não contrata nem aposenta */
 for(var y=0;y<3;y++){var off=[];coYear(off);S.year++;}
 ok(c.hist.length===3&&c.hist.every(function(h){return h.tid===t.id}),'carreira registrada: '+JSON.stringify(c.hist));
 ok(c.t==null&&!c.ret&&!ALLT().some(function(x){return x.co==='Tite Rift'}),'IA não contrata seu técnico');
 t.tt=(t.tt||[]).concat([{y:c.hist[0].y,k:'LCK'}]);COLC={k:''};
 ok(coTitles(c).length>=1&&coBoost(t)>0,'título como técnico conta na ficha e dá reforço');
 /* criar outro: o antigo se aposenta */
 act('meNew');ok(vMenu().indexOf('Criar técnico')>=0,'criar outro técnico abre o formulário');
 coF.name='Novo Coach';act('meCreate');ok(meCo().n==='Novo Coach'&&S.co['Tite Rift'].ret&&!S.co['Tite Rift'].u,'troca de técnico');
 /* ex-jogador */
 S.pc={n:'Teste PC',age:33,ended:S.year,leg:{v:95,r:'Imortal'},hist:[{team:S.teams[0].name}],fame:50,cash:0,log:[]};
 var offs=pcCoOffers();S.pc.coOff=offs;pcCoAccept(offs[0]);
 ok(meCo()&&meCo().n==='Teste PC'&&meCo().ex===1&&coAge(meCo())===33,'ex-jogador vira seu técnico com ficha');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
