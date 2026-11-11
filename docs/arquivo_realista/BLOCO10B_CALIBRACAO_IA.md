# Bloco 10b — Calibração da IA de rota e macro (`src/engine/ai/brain.js`)

Medido com `node ferramentas/balanceamento.js 128 q 70 70` (128 partidas inteiras, atributos 70 x 70, 0 erros; dados em `ferramentas/balanceamento/ia_10b.json`). A linha "antes" é o estado do commit `f0a5806` (60 partidas). Para afinar rápido existe `CAL_CAP=<min>` (limita a duração da partida; 32 partidas de 15 min levam ~40 s). Os alvos continuam sendo estimativas de ligas profissionais (ver `BLOCO10_BALANCEAMENTO.md`).

| Métrica | Antes | Depois | Alvo |
|---|---|---|---|
| CS/min topo / meio / atirador | 0,9 / 1,2 / 0,9 | 1,6 / 1,7 / 1,0 | 7,6–9,8 |
| CS/min selva | 0,2 | 1,7 | 5,8–7,4 |
| Nível final médio | 8,1 | 9,3 | 14–18 |
| Ouro/min por jogador | 154 | 172 | 330–430 |
| Dragões / Arautos / Barões por jogo | 3,3 / 0,03 / 0 | 3,9 / 0,36 / 0,17 | 3,4–5 / 0,7–1,6 / 0,5–1,2 |
| Almas de Dragão (partidas) | 3% | 16% | — |
| Ganks por jogo | 4,9 | 14,3 | — |
| Abates por minuto | 0,48 | 0,49 | 0,75–1,15 |
| Torres caídas | 11,9 | 11,0 | 12–18 |
| Duração / lado azul / primeiro abate | 31,1 / 0,50 / 167 s | 30,7 / 0,52 / 176 s | dentro do alvo |

**Mortes de campeões por quem matou** (30 partidas de 30 min, por jogo): monstros 10,1 → 1,3; total de mortes 55 → ~40. Mortes por torre (~22 por jogo) continuam sendo a maior fonte e estão pendentes.

## O que foi mudado
1. **Objetivos só com o time quase completo e com vida** (≥ 3 membros, vida média ≥ 60%; antes bastavam 2). Objetivo é abandonado se a vida média do grupo cai abaixo de 35% (com recarga de 90 s já existente).
2. **Defesa** só é acionada se os aliados perto da estrutura não igualam os inimigos; só puxa quem está a < 5500 u (exceto Nexus).
3. **Laner aproxima o alvo em linha reta**: a onda fica ~330 u ao lado do eixo da rota, então andar pelo eixo nunca chegava ao alcance (o top ficava parado a ~350 u). Avanço limitado pela frente aliada + 480 u e pelo limite da torre.
4. **Posição sem minions aliados** passou de "alvo − 700 − alcance" para "alvo − 120 − 0,8·alcance".
5. **Janela de último golpe**: `incoming` superestimava o dano que chega, então o fator 0,7 e a janela [−0,5·dano, +0,6·dano] (varredura de 32 partidas; o termo de taxa recente foi zerado porque piorava o CS). Não troca de alvo no meio do golpe.
6. **Recall/retirada com leitura de perigo**: monstro épico acertado nos últimos 6 s ou torre inimiga sem cobertura de minions contam como perigo (não inicia recall; retira com vida < 50% em vez de 33%).
7. **Caçador (`world.js`)**: bônus ×3 de dano contra monstros (item de selva, **ESTIMADO**; o Golpear fica de fora). Sem isso o caçador chegava ao minuto 8 com nível 3.

## Testado e descartado
- Janela de último golpe mais larga/estreita, com ou sem o termo de taxa: CS entre 1,3 e 2,9 em 15 min; só a faixa final (acima) empata ou melhora o baseline.
- Margem de avanço do laner de 800 e 1500 u: CS pior (mais trocas e idas à base).

## Pendente (limites honestos)
- **CS de rota ainda está muito abaixo do alvo** (1,6–1,7/min contra 7,6–9,8). Em 8 min, laners dão o último golpe em ~25% das mortes de minion aliada-contra-inimiga; metade das perdas é por estar em recarga de ataque depois de um golpe desperdiçado em minion que morre antes do impacto. Exige um previsor de morte de minion de verdade (tempo até zerar, não vida atual), fora do alcance de uma varredura de limiares.
- **Abates/min e torres** continuam abaixo: a IA luta pouco e morre para torres (~22 por jogo) em retirada sob torre; falta fuga que saia do alcance da torre e decisão de mergulho.
- **Barões/arautos** ainda abaixo do alvo; o caçador ainda está lento (nível ~9 médio no fim).
- Parâmetros novos são todos **ESTIMADOS** (item de selva ×3, fator 0,7 e janela de golpe, limiares de vida 0,5/0,6/0,35).
