'use strict';
/* Gera a build final de cada campeão (6 itens + preços) para o painel ao vivo do motor clássico, que não tem loja própria:
   usa o mesmo analisador de arquétipo do motor realista (src/engine/items/builds.js). ESTIMADO: build genérica sem adaptação ao inimigo.
   Uso: node ferramentas/gerar_builds.js  -> atualiza o bloco CHB do index.html e lista os ids de itens usados (champs/item/<id>.webp via champs_imagens.py). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { createLoader } = require('../src/engine/data/loader');
const B = require('../src/engine/items/builds'), { catalog } = require('../src/engine/items/catalog');
const L = createLoader({ patch: '16.22.1' }), cat = catalog();
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CM = JSON.parse(html.match(/const CHMAP=(\{.*?\});/s)[1]);
const out = {}, ids = new Set();
Object.keys(CM).forEach(nome => {
  try {
    const ch = L.champion(CM[nome]); const b = B.makeBuild(ch, []);
    const its = b.items.slice(0, 6); its.forEach(i => ids.add(i));
    out[nome] = its.map(i => [i, cat[i].price, cat[i].from.map(c => [c, cat[c].price])]);
  } catch (e) { console.error('sem build:', nome, e.message); }
});
const bloco = 'const CHB=' + JSON.stringify(out) + ';/*CHB*/';
let h = html;
if (/const CHB=\{.*?\};\/\*CHB\*\//s.test(h)) h = h.replace(/const CHB=\{.*?\};\/\*CHB\*\//s, () => bloco);
else h = h.replace('const CHFILES=', () => bloco + '\nconst CHFILES=');
fs.writeFileSync(path.join(ROOT, 'index.html'), h);
fs.mkdirSync(path.join(ROOT, 'champs', 'item'), { recursive: true });
/* itens do motor realista: tudo que a loja pode vender (completos, botas e componentes) */
Object.values(cat).forEach(i => ids.add(i.id));
fs.writeFileSync(path.join(ROOT, 'ferramentas', 'itens_usados.json'), JSON.stringify([...ids].sort((a, b) => a - b)));
console.log('builds:', Object.keys(out).length, 'itens distintos nas builds + loja:', ids.size);
