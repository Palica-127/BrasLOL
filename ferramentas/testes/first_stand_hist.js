/* Lendas: histórico de campeões e vices do First Stand com as edições reais (2025 Hanwha Life x KC; 2026 BLG x G2, MVP Bin),
   títulos no time e nos jogadores, sem duplicar, e migração de save antigo já em 2027 */
const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
const out=run(ctx,`(function(){
 var bad=[],ok=function(c,t){if(!c)bad.push(t)};
 var tx=function(){return cupHistHTML('fs').replace(/<[^>]+>/g,' ').split(String.fromCharCode(10)).join(' ').replace(/ +/g,' ')};
 var h=tx();ok(/2026 BLG Vice: G2 · MVP: Bin/.test(h)&&/2025 Hanwha Life Vice: Karmine Corp · MVP: Zeka/.test(h),'histórico: '+h.slice(0,300));
 var b=S.teams.find(function(t){return t.name==='BLG'}),hl=S.teams.find(function(t){return t.name==='Hanwha Life'});
 ok(b.tt.filter(function(x){return x.k==='First Stand'&&x.y===2026}).length===1,'BLG com 1 First Stand 2026');
 ok(hl.tt.some(function(x){return x.k==='First Stand'&&x.y===2025&&x.r.indexOf('Viper')>=0}),'Hanwha Life com o First Stand 2025');
 ok(pd('Viper').tl.filter(function(e){return e.t==='First Stand'}).length===2,'Viper bicampeão do First Stand');
 ok(hofOf('Bin').fs===1,'Bin com 1 First Stand');
 /* save antigo em 2027: sem o First Stand 2026 */
 var R=['Bin','Xun','Knight','Viper','ON'];
 R.forEach(function(n){pd(n).tl=pd(n).tl.filter(function(e){return !(e.y===2026&&/First Stand/.test(e.t))});hofOf(n).fs=Math.max(0,(hofOf(n).fs||0)-1)});
 b.tt=b.tt.filter(function(x){return !(x.y===2026&&x.k==='First Stand')});
 S.hist.push({y:2026,champs:{wc:'BLG',fs:'',msi:'Hanwha Life'},top:[]});S.year=2027;S.season.fs=null;S.fsV=0;
 fixFS();
 ok(b.tt.filter(function(x){return x.k==='First Stand'&&x.y===2026}).length===1&&pd('Viper').tl.some(function(e){return e.y===2026&&e.t==='First Stand'}),'migração do save');
 h=tx();ok(/2026 BLG Vice: G2 · MVP: Bin/.test(h),'histórico depois da migração');
 fixFS();ok(b.tt.filter(function(x){return x.k==='First Stand'&&x.y===2026}).length===1,'migração não duplica');
 return bad.length?'FALHAS: '+bad.join(' | '):'TODOS OS TESTES PASSARAM';
})()`);
console.log(out);if(out.indexOf('FALHAS')===0)process.exit(1);
