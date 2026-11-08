# src/engine — motor realista (em construção por blocos)

Código JS puro (CommonJS), sem DOM, sem globais e **sem `Math.random()`** (um teste falha se aparecer). O `index.html` ainda não usa este motor; a integração com o mapa ao vivo é o Bloco 9, e o motor legado continua sendo o que roda no jogo.

| Pasta | Conteúdo | Bloco |
|---|---|---|
| `core/rng.js` | PRNG por semente com fluxos independentes (`combate`, `ia`, `mundo`...) | 2 |
| `data/loader.js` | lê `data/<patch>/`; resolve nome do jogo → id do Data Dragon | 2 |
| `champion/stats.js` | atributos por nível (fórmula da Wiki), AS, MS com limites suaves, XP/nível | 2 |
| `champion/calc.js` | avaliador dos `mSpellCalculations` do cliente; **nunca chuta**: o que não entende lança `Unsupported` | 2 |
| `champion/spells.js` | definições normalizadas de Q/W/E/R/P e `AbilitySet` (rank, recarga, custo, Ability Haste, bloqueios) | 2 |
| `champion/kits/` | kits por campeão: **dados** que referenciam `DataValues`/cálculos reais e o resolvedor | 2 |

## Convenções confirmadas contra o Data Dragon
- `cooldownTime[rank]` e `DataValues[nome].values[rank]`: índice 0 é sentinela. `mana[rank-1]`.
- Nomes de DataValue são comparados sem diferenciar maiúsculas.
- `mStat`: ausente=AP, 1=armadura, 2=AD, 4=vel. de ataque, 6=RM, 7=vel. de movimento, 12=vida máxima. `mStatFormula`: ausente=total, 2=bônus.

## Como adicionar um campeão (a regra é um kit por campeão, nada de habilidade genérica)
1. Garantir os dados: `node ferramentas/dados/gerar.js` (já cobre os 173 do patch).
2. Em `champion/kits/waveN.js`, descrever Q/W/E/R/P com os tipos de efeito (`damage`, `cc`, `shield`, `dash`, `empower`, `summon`, `recast`...), referenciando **nomes reais**: `{dv:'BaseDamage'}`, `{calc:'TotalDamage'}`. Números nunca são escritos à mão.
3. Se o cálculo oficial ainda não é suportado, declarar em `gaps` (o teste exige que seja explícito) e estender `calc.js` **só com evidência nos dados**.
4. `node ferramentas/testes/engine_campeoes.js`: confere referências, resolução em todos os ranks/níveis e o tipo de dano contra o texto oficial.

## Limitações atuais (honestas)
- Os kits **descrevem** o que cada habilidade faz; quem as executa no mundo (colisão de skillshot, CC, escudos, dano em área) é o Bloco 3.
- Avaliador: 88,6% dos cálculos oficiais; faltam `mStat` 3/5/8/9/10/14/15/18/29/31, `mBonusPerLevelAtAndAfter`, condicionais por buff e nomes em hash (ver `docs/CAMPEOES_COBERTURA_16.22.1.md`).
- Mana e regeneração vêm do Data Dragon (o extrato do cliente não traz). Recarga ausente no cliente cai para o Data Dragon (`cooldownSrc`).
