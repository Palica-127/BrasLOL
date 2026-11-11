# Compra de itens, suprimentos e visão — leagueofgraphs.com (patch 16.22)

O motor realista agora compra e usa itens além da build: **item inicial, poções, Sentinela Invisível (trinket), Sentinela de Controle (pink), Poção com Refil e Lente do Oráculo**.

## O que veio de cada fonte
- **Patch 16.22.1 (`data/16.22.1/items.json`)**: preço, cura, duração, cargas e recarga de 2003, 2031, 2055, 3340, 3364, 3865, 1054, 1055, 1056, 1086, 1101–1103, 1120.
- **leagueofgraphs.com (partidas reais)**: *comportamento* — o que cada função compra no início. Quase todos levam Sentinela Invisível + Poção de Vida.

| Função | Item inicial | Poções |
|---|---|---|
| Suporte | Atlas Mundial | 2 |
| Selva | Filhote (Musgo/Fogo/Vento conforme o arquétipo) | 1 |
| Atirador | Arco de Doran | 2 |
| Meio mago/controle | Anel de Doran | 2 |
| Meio assassino/lutador | Lâmina de Doran | 1 |
| Topo tanque | Escudo de Doran | 1 |
| Topo demais | Lâmina de Doran | 1 |

## Regras no motor (`src/engine/items/supplies.js`, `src/engine/ai/supply_ai.js`)
- Poção de Vida: 120 PV em 15 s; Poção com Refil: 100 PV em 12 s, 2 cargas, recarregam na base. Usadas abaixo de ~55% de vida (ou ~72% após dano recente fora de luta).
- Trinket: Sentinela Invisível, 2 cargas, recarga cai de 210 s a 90 s até os 14 min. Suporte e selva trocam para a **Lente do Oráculo** no nível 9 (varredura revela e permite destruir sentinelas inimigas).
- Sentinela de Controle: suporte mantém até 2, selva 1 (a partir de 4 min), demais 1 (a partir de 8 min).
- Inimigos perto de uma sentinela revelada a destroem (1,5 s invisível, 4 s controle). Pontuação de visão entra nas estatísticas.

## ESTIMADO (sem fonte) — declarado
Pontos onde cada jogador coloca sentinelas, cadência de compra por viagem à base, vida das sentinelas, tempo de limpeza, limiares de uso de poção. **Não há névoa de guerra**: a visão não muda as decisões de luta, só gera estatísticas.

Teste: `node ferramentas/testes/engine_suprimentos.js`.
