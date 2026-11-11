/* Aba Meta > Itens: lista, busca, filtros e detalhes (preço, venda, atributos, passiva, receita) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { load, run } = require('./harness.js');
const ROOT = path.join(__dirname, '..', '..');
const ctx = load(path.join(ROOT, 'index.html'));
vm.runInContext(fs.readFileSync(path.join(ROOT, 'itens.js'), 'utf8'), ctx, { filename: 'itens.js' });
let falhas = 0;
const ok = (c, m) => { if (!c) { falhas++; console.log('FALHOU:', m); } else console.log('ok:', m); };
const J = c => JSON.parse(run(ctx, `JSON.stringify(${c})`));

ok(J('BRASITENS.items.length') === 214, 'itens.js exporta os 214 itens');
run(ctx, `metaV='it';`);
let h = run(ctx, 'vMeta()');
ok(h.includes('Itens') && h.includes('Campeões') && h.includes('it-list'), 'aba Meta ganha a chave Campeões/Itens');
ok(h.includes('Capuz da Morte de Rabadon') && h.includes('3500'), 'lista lendários com preço (Rabadon 3500)');
run(ctx, `itC='boots';`); h = run(ctx, 'vMeta()');
ok(h.includes('Botas') && !h.includes('Capuz da Morte de Rabadon'), 'filtro de classe (botas)');
run(ctx, `itC='all';itQ='zzzxx';`); h = run(ctx, 'itListHTML()');
ok(h.includes('0 itens') && h.includes('Nenhum item'), 'busca por texto filtra a lista');
run(ctx, `itQ='fulgor';`); h = run(ctx, 'itListHTML()');
ok(h.includes('Fulgor'), 'busca por nome acha o Fulgor');
run(ctx, `itSel=3057;itQ='';`); h = run(ctx, 'vMeta()');
ok(h.includes('Venda') && h.includes('Aceleração de habilidade') && h.includes('Lâmina Arcana') && h.includes('Receita'), 'detalhe mostra preço, venda, atributos, passiva e receita');
run(ctx, `metaV='ch';`); h = run(ctx, 'vMeta()');
ok(h.includes('mtx') && !h.includes('it-list'), 'aba Campeões continua igual');
console.log(falhas ? falhas + ' falha(s)' : 'tudo certo'); process.exit(falhas ? 1 : 0);
