# Balance Check — motor realista (método do `/balance-check` do Claude-Code-Game-Studios)

Dados: `node ferramentas/balanceamento.js 64 gscheck 70 70` (63 partidas válidas, atributos 70 x 70; bruto em `ferramentas/balanceamento/gscheck.json`).
Alvos: os de `docs/BLOCO10_BALANCEAMENTO.md` (ESTIMADOS, médias aproximadas de ligas profissionais, sem fonte citável). Não há GDD nem registry no projeto.

**Health Summary: CRITICAL ISSUES** (progressão de ouro/XP/CS não chega perto do alvo).

## Outliers Detected
| Métrica | Alvo | Medido | Situação |
|---|---|---|---|
| CS/min topo / meio / atirador | 7,6–9,8 | 1,8 / 1,7 / 1,4 | crítico |
| CS/min selva | 5,8–7,4 | 3,2 | melhorou (era 1,7 no 10b) |
| CS/min suporte | 0,8–2 | 0,2 | abaixo |
| Ouro/min por jogador | 330–430 | 198 | crítico |
| Nível final médio | 14–18 | 9,3 | crítico |
| Abates/min | 0,75–1,15 | 0,94 | **dentro** (era 0,49) |
| Dragões / Arautos / Barões | 3,4–5 / 0,7–1,6 / 0,5–1,2 | 3,78 / 0,46 / 0,43 | dragão ok; arauto e barão abaixo |
| Torres caídas | 12–18 | 11,3 | levemente abaixo |
| Duração / lado azul | 29–35 / 0,46–0,54 | 30,2 / 0,476 | dentro |
| Primeiro abate | 150–330 s | 303 s | dentro (no limite) |

## Degenerate Strategies / falhas estruturais
- **Economia sem torneira suficiente:** CS ~1,7/min é a causa raiz do ouro e do nível baixos (ouro 198 vs 330+). Nada na economia se corrige enquanto o CS de rota não subir.
- **Ganks 14,4 por jogo** (era 5,5 no Bloco 10): o caçador gasta tempo em gank e a rota perde CS; vale conferir se o aumento rouba farm.
- **Poções 82/jogo, sentinelas 54/jogo:** consumo alto, talvez sink de ouro grande demais frente ao ouro gerado.

## Bug encontrado e corrigido
- `src/engine/items/passivas.js`: a Hidra Raivosa lia o DataValue `CleaverRadius`, que não existe (o dado do patch é `CleaveRadius`). Derrubava a partida com erro (semente 1046). Corrigido.

## Recomendações
| Prioridade | Problema | Correção sugerida | Impacto |
|---|---|---|---|
| 1 | CS de rota ~1,7/min | previsor de morte de minion por tempo até zerar a vida (já apontado no 10b) | ouro, nível, itens |
| 2 | Tempo em rota do laner no meio de jogo | histerese entre luta e retirada; reduzir idas à base | CS e nível |
| 3 | Mortes por torre (~22/jogo no 10b) | fuga que saia do alcance da torre e regra de mergulho | abates, torres |
| 4 | Arauto/Barão baixos | revisar condição de "time quase completo" (>=3 e vida >=60%) | objetivos |
| 5 | Ganks 14,4 | limitar gank por tempo de recarga e custo de CS | CS da rota |

Re-rodar `node ferramentas/balanceamento.js 64 gscheck 70 70` após cada ajuste e comparar com este arquivo.
