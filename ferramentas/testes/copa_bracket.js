/* Bracket da Copa do Mundo no mesmo formato dos outros campeonatos: tela de jogar, bracket do topo e Eventos e placares (inclusive Copas passadas) */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 S.opt=S.opt||{};S.opt.draft=0;S.opt.live=0;CUPSIM=1;
 var n=0;while(!(PHASES[S.phase]&&PHASES[S.phase].g===7&&S.season.cup&&S.season.cup.groups)&&n++<3000){S.day=999;step()}
 var cup=S.season.cup;ok(cup&&cup.groups,'chegou na Copa '+S.year);
 brkO.cup=true;var h=cupHTML();
 ok(h.indexOf('class="pbw"')>=0&&h.indexOf('A definir')>=0,'bracket antes do mata-mata com vagas a definir');
 while(cup.gi<3){S.day=999;step()}
 ok(topBracketHTML(PHASES[S.phase],'',' open').indexOf('Copa do Mundo')>=0,'bracket da Copa no topo durante o mata-mata');
 while(cup.champ==null){S.day=999;step()}
 var y=cup.y||S.year;
 h=cupHTML();ok(h.indexOf('ti-c')>=0&&h.indexOf('Disputa do 3º lugar')>=0&&h.indexOf('pbch')>=0,'bracket final com troféu da Copa, campeão e 3º lugar');
 evSel={y:S.year,k:'cup',lg:''};ok(vEvents().indexOf('class="pbw"')>=0,'Eventos e placares da Copa atual');
 var c=S.cups[S.cups.length-1];ok(c.br&&c.br.ko.length>=3,'bracket salva no registro da Copa');
 n=0;var yr=S.year;while(S.year===yr&&n++<50){S.day=999;step()}
 ok(S.year===yr+1,'virou o ano');
 evSel={y:yr,k:'cup',lg:''};var ev=vEvents();ok(ev.indexOf('class="pbw"')>=0&&ev.indexOf(esc(c.champ))>=0,'Copa passada em Eventos e placares com bracket');
 evM={y:yr};ok(evMenuHTML().indexOf('Sem registro')<0,'menu não diz sem registro');evM=null;
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
