'use strict';
/* Empacota o motor realista (src/engine, CommonJS) + os dados do patch num unico script de navegador: motor.js.
   Uso: node ferramentas/build_motor.js            (gera motor.js na raiz)
   O script define window.BrasEngine = { M (ai/match), LAY, kits: [...], patch }. Sem build/CDN: o jogo continua funcionando sem ele (motor legado). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src', 'engine'), PATCH = '16.22.1';
const DATA = path.join(ROOT, 'data', PATCH);

function build() {
  const mods = {}; const order = [];
  const visit = file => {
    const key = path.relative(ROOT, file).replace(/\\/g, '/');
    if (mods[key]) return key;
    let code = fs.readFileSync(file, 'utf8'); mods[key] = { code, deps: {} }; order.push(key);
    const re = /require\(\s*'([^']+)'\s*\)/g; let m;
    while ((m = re.exec(code))) {
      const r = m[1]; if (!r.startsWith('.')) continue;
      let f = path.resolve(path.dirname(file), r); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = fs.existsSync(f + '.js') ? f + '.js' : path.join(f, 'index.js');
      mods[key].deps[r] = visit(f);
    }
    return key;
  };
  const entry = visit(path.join(SRC, 'ai', 'match.js')), entryA = visit(path.join(SRC, 'integracao', 'adapter.js'));
  /* kits: quais campeoes tem kit implementado */
  const kitsIdx = require(path.join(SRC, 'champion', 'kits', 'index.js'));
  const kitNames = kitsIdx.kitIds();
  const loader = require(path.join(SRC, 'data', 'loader.js')).createLoader({ patch: PATCH, root: path.join(ROOT, 'data') });
  const ids = kitNames.map(n => loader.resolveId(n)).filter(Boolean);
  const data = {};
  ['champions.json', 'items.json', 'rules.json', 'monstros.json', 'minions.json', 'estruturas.json'].forEach(f => { data[f] = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); });
  ids.forEach(id => { data['champions/' + id + '.json'] = JSON.parse(fs.readFileSync(path.join(DATA, 'champions', id + '.json'), 'utf8')); });
  const out = [];
  out.push('/* GERADO por ferramentas/build_motor.js - nao edite. Motor realista do BrasLOL (patch ' + PATCH + '). */');
  out.push('(function(g){"use strict";');
  out.push('var DATA=' + JSON.stringify(data) + ';');
  out.push('var FS={readFileSync:function(p){var k=String(p).replace(/\\\\/g,"/");var i=k.lastIndexOf("/' + PATCH + '/");k=i>=0?k.slice(i+' + (PATCH.length + 2) + '):k;if(!(k in DATA))throw new Error("dado ausente: "+k);return JSON.stringify(DATA[k])},existsSync:function(p){return true}};');
  out.push('var PATH={join:function(){return Array.prototype.slice.call(arguments).join("/")},resolve:function(){return Array.prototype.slice.call(arguments).join("/")},dirname:function(p){return String(p).replace(/\\/[^\\/]*$/,"")}};');
  out.push('var DEF={},CACHE={};');
  order.forEach(k => {
    out.push('DEF[' + JSON.stringify(k) + ']={deps:' + JSON.stringify(mods[k].deps) + ',fn:function(module,exports,require,__dirname){' + mods[k].code + '\n}};');
  });
  out.push('function load(k){if(CACHE[k])return CACHE[k].exports;var d=DEF[k],m={exports:{}};CACHE[k]=m;d.fn(m,m.exports,function(r){if(r==="fs")return FS;if(r==="path")return PATH;return load(d.deps[r])},"/data/' + PATCH + '/x");return m.exports}');
  out.push('var M=load(' + JSON.stringify(entry) + ');');
  out.push('g.BrasEngine={Adapter:load(' + JSON.stringify(entryA) + '),patch:' + JSON.stringify(PATCH) + ',M:M,LAY:load("src/engine/map/layout.js"),kits:' + JSON.stringify(kitNames) + ',ids:' + JSON.stringify(ids) + '};');
  out.push('})(typeof window!=="undefined"?window:globalThis);');
  return out.join('\n');
}
if (require.main === module) {
  const code = build(); fs.writeFileSync(path.join(ROOT, 'motor.js'), code);
  console.log('motor.js gerado: ' + (code.length / 1024).toFixed(0) + ' KB');
}
module.exports = { build };
