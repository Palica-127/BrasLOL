/* todo campeão do jogo precisa ter ícone existente em champs/ e sem arquivo duplicado */
const {load,run}=require('./harness.js');const fs=require('fs'),path=require('path');
const ctx=load(path.join(__dirname,'..','..','index.html'));
const r=JSON.parse(run(ctx,`JSON.stringify({names:CH.flat().map(function(x){return x[0]}),files:CHFILES,map:CHMAP})`));
const dir=path.join(__dirname,'..','..','champs');
const sem=r.names.filter(n=>!r.files[n]),ausentes=r.names.filter(n=>r.files[n]&&!fs.existsSync(path.join(dir,r.files[n])));
const usados=Object.values(r.files),dup=usados.filter((f,i)=>usados.indexOf(f)!==i);
const semMapa=r.names.filter(n=>!r.map[n]);
console.log('campeões',r.names.length,'| sem ícone',sem.length,sem,'| arquivo ausente',ausentes,'| arquivos repetidos',dup,'| sem id Data Dragon',semMapa);
