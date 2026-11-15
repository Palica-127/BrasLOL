/* Foto do seu jogador (criação e troca) aparece em todo lugar; ao se aposentar sem aceitar proposta, ele vira técnico livre
   no mercado (IA pode contratar e você pode contratá-lo como assistente no modo treinador) */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;
 menuV='pcNew';tab='menu';
 ok(vMenu().indexOf('id="pc-photo"')>=0,'formulário do jogador tem foto');
 var FOTO='data:image/jpeg;base64,AAAA';
 pcF={name:'Foto Kid',role:2,arch:'eq',nat:'BRA',team:String(D2L()[0].id),ph:FOTO};act('pcCreate');
 ok(S.pc&&S.pc.n==='Foto Kid'&&S.uph['Foto Kid']===FOTO,'foto guardada no save');
 ok(phHas('Foto Kid')&&phImg('Foto Kid').indexOf(FOTO)>=0,'foto usada nas cartas');
 ok(vPc().indexOf(FOTO)>=0&&vPc().indexOf('pc-photo-me')>=0,'tela da carreira mostra a foto e o botão de trocar');
 ok(vPlayer('Foto Kid').indexOf(FOTO)>=0,'ficha do jogador mostra a foto');
 /* aposenta e passa a virada sem aceitar proposta */
 var f=pcFind();f.p.age=33;pcRetireNow(false);
 ok(vPc().indexOf('mercado como técnico livre')>=0,'aviso do mercado de técnicos');
 nextSeason();
 var c=S.co['Foto Kid'];
 ok(c&&c.mine&&c.ex&&!c.ret&&c.ph===FOTO,'virou técnico livre com a foto: '+JSON.stringify(c&&{t:c.t,mine:c.mine,ret:c.ret}));
 ok(!ALLT().some(function(t){return t.pl.concat(t.bn||[]).some(function(p){return p.n==='Foto Kid'})}),'saiu do elenco');
 ok(vCoach('Foto Kid').indexOf(FOTO)>=0,'ficha de técnico com a foto');
 ok(vPc().indexOf('Técnico')>=0,'tela da carreira encerrada mostra o card de técnico');
 /* modo treinador: aparece para contratar como assistente */
 if(c.t!=null){var ot=T(c.t);ot.co=null;c.t=null;c.as=0;}
 coF={name:'Chefe Teste',nat:'BRA',age:40,sty:'eq',ph:''};menuV='mgr';act('meCreate');
 var t=S.teams[3];mgrPick=t.id;act('mgrStart');S.mgr.cash=50;
 if(S.mgr.coach)mgrCoach('-');
 ok(coFreePool().some(function(x){return x.n==='Foto Kid'})&&coFreePool()[0].n==='Foto Kid','ex-jogador primeiro no mercado');
 ok(staffHTML(S.mgr).indexOf('co:Foto Kid')>=0,'botão de contratar no modo treinador');
 mgrCoach('co:Foto Kid');
 ok(S.mgr.coach&&S.mgr.coach.n==='Foto Kid'&&S.mgr.coach.co&&c.t===t.id&&c.as===1&&t.co==='Foto Kid','contratado como assistente');
 coSync();ok(c.t===t.id&&c.as===1,'continua no clube depois do coSync');
 ok(vTeam(t.id).indexOf('Foto Kid')>=0,'aparece na comissão técnica');
 /* IA também contrata técnico livre */
 mgrCoach('-');ok(c.t==null,'dispensado volta ao mercado');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
