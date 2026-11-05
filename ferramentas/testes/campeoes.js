const {load,run}=require('./harness.js');
const ctx=load(require('path').join(__dirname,'..','..','index.html'));
console.log(run(ctx,`JSON.stringify({n:CH.map(r=>r.length),tot:CH.flat().length,chd:Object.keys(CHD).length,
 bad:CH.flat().filter(([n,a])=>!CHD[n]||!['eq','ag','co'].includes(a)).map(x=>x[0]),
 roleMis:CH.flatMap((r,i)=>r.filter(([n])=>CHD[n].r!==i).map(x=>x[0])),
 synBad:CHSYN.flat().filter(n=>!CHD[n]),ctrBad:CHCTR.flat().filter(n=>!CHD[n]),
 ctrRole:CHCTR.filter(([a,b])=>CHD[a]&&CHD[b]&&CHD[a].r!==CHD[b].r)})`));
console.log(run(ctx,`(function(){S=newState();var o={};['Faker','Keria','Ruler'].forEach(n=>{o[n]=CH[2].map(([c])=>Math.round(mastOf(n,c)*100)).sort((a,b)=>b-a).slice(0,5).join(',')});
 var pk=['Renekton','Lee Sin','Syndra','Caitlyn','Leona'],pk2=['Ornn','Sejuani','Azir','Jinx','Lulu'];
 o.a=JSON.stringify(cmpOf(pk));o.b=JSON.stringify(cmpOf(pk2));o.fx=cmpFx(pk,pk2);o.fx2=cmpFx(pk2,pk);return JSON.stringify(o)})()`));
