'use strict';
/* Lê data/<patch>/ (gerado por ferramentas/dados/gerar.js). Em Node usa fs; no build do navegador (Bloco 9) troque `read`. */
const fs = require('fs'), path = require('path');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function createLoader({ patch = '16.22.1', root = path.join(__dirname, '..', '..', '..', 'data'), read } = {}) {
  const dir = path.join(root, patch);
  const rd = read || (f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const cache = {};
  const once = (k, fn) => (k in cache ? cache[k] : (cache[k] = fn()));
  const index = () => once('idx', () => {
    const list = rd('champions.json'), by = {};
    list.forEach(c => { by[norm(c.id)] = c.id; by[norm(c.nome)] = c.id; });
    return { list, by };
  });
  return {
    patch,
    championIds: () => index().list.map(c => c.id),
    /* aceita id do Data Dragon ("MonkeyKing"), nome ("Wukong") ou apelido do jogo ("Kai'Sa") */
    resolveId: name => index().by[norm(name)] || null,
    champion(name) {
      const id = index().by[norm(name)];
      if (!id) throw new Error('campeao desconhecido: ' + name);
      return once('c:' + id, () => rd('champions/' + id + '.json'));
    },
    items: () => once('items', () => rd('items.json')),
    item: id => once('items', () => rd('items.json'))[String(id)] || null,
    rules: () => once('rules', () => rd('rules.json')),
    monsters: () => once('mon', () => rd('monstros.json')),
    minions: () => once('min', () => rd('minions.json')),
    structures: () => once('str', () => rd('estruturas.json'))
  };
}
module.exports = { createLoader, norm };
