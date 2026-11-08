'use strict';
/* Relatorio de cobertura dos kits automaticos: docs/KITS_AUTO_16.22.1.md. Uso: node ferramentas/dados/relatorio_kits_auto.js */
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..', '..');
const auto = require(path.join(ROOT, 'src/engine/champion/kits/auto.json'));
const ids = Object.keys(auto).sort(), cnt = {}, gp = {};
let acts = 0, full = [];
ids.forEach(id => { const k = auto[id]; const n = ['Q', 'W', 'E', 'R'].filter(s => k[s]).length; acts += n; if (n === 4) full.push(id);
  k.gaps.forEach(g => { const t = g.replace(/^[QWER]: /, '').replace(/passiva .* não modelada/, 'passiva não modelada').replace(/não modelados?: .*/, 'não modelado').replace(/controle (\w+) .*/, 'controle $1'); gp[t] = (gp[t] || 0) + 1; });
  ['Q', 'W', 'E', 'R'].forEach(s => { if (k[s]) cnt[k[s].shape] = (cnt[k[s].shape] || 0) + 1; }); });
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(x => '| ' + x[0] + ' | ' + x[1] + ' |').join('\n');
fs.writeFileSync(path.join(ROOT, 'docs', 'KITS_AUTO_16.22.1.md'), `# Kits automáticos — patch 16.22.1

Rascunhos gerados por \`node ferramentas/dados/gerar_kits_auto.js\` a partir de \`data/16.22.1/kits_info.json\` (patch + estrutura da Wiki). Arquivo: \`src/engine/champion/kits/auto.json\`.
Os **8 kits escritos à mão** (\`kits/wave1.js\`) têm prioridade; os outros **${ids.length}** campeões usam estes rascunhos.

- **Habilidades com ação:** ${acts}/${ids.length * 4} (${full.length} campeões com Q, W, E e R todas com ação).
- **Números:** sempre referências a DataValues/cálculos reais do patch; cada efeito é validado (resolve em todos os ranks/níveis, finito) antes de entrar.
- **Dano sem cálculo oficial:** usa \`{dmg}\` = DataValue base + razões AP/AD dos DataValues (declarado em \`gaps\`).
- **Fica de fora (declarado em \`gaps\` de cada kit):** passivas, reconjuração/transformação, cura, empurrão/puxão/provocação/sono/cegueira, escudo/velocidade misturados a dano, efeitos de invocação. Refinar à mão os mais jogados.

## Formas de habilidade
| forma | habilidades |
|---|---|
${top(cnt)}

## Lacunas mais comuns
| lacuna | ocorrências |
|---|---|
${top(gp)}
`);
console.log('ok', ids.length, acts);
