# Bloco 10 — Balanceamento do motor realista (patch 16.22.1)

Gerado por `node ferramentas/balanceamento.js 1000 base 70 70`. **1000 partidas simuladas** (0 com erro), campeões sorteados por função entre os 173 do patch, atributos 70 x 70, semente por partida. Dados brutos em `ferramentas/balanceamento/base.json`.

**Sobre os alvos:** são médias APROXIMADAS de ligas profissionais, de conhecimento geral (sem fonte citável dentro do projeto). Servem de régua para calibrar; não são dados do patch.

| Métrica | Medido | Alvo | Estado |
|---|---|---|---|
| Duração (min) | 30.9 | 29–35 | dentro |
| Abates por minuto (10 jogadores) | 0.45 | 0.75–1.15 | abaixo |
| CS/min topo | 0.9 | 7.6–9 | abaixo |
| CS/min selva | 0.2 | 5.8–7.4 | abaixo |
| CS/min meio | 1.2 | 8–9.4 | abaixo |
| CS/min atirador | 0.9 | 8.3–9.8 | abaixo |
| CS/min suporte | 0.1 | 0.8–2 | abaixo |
| Dragões por jogo (total) | 3.25 | 3.4–5 | abaixo |
| Barões por jogo | 0.05 | 0.5–1.2 | abaixo |
| Arautos por jogo | 0.07 | 0.7–1.6 | abaixo |
| Torres caídas por jogo | 11.8 | 12–18 | abaixo |
| Ouro/min por jogador | 153 | 330–430 | abaixo |
| Primeiro abate (s) | 178 | 150–330 | dentro |
| Nível final médio | 8.1 | 14–18 | abaixo |
| Vitórias do lado azul | 0.494 | 0.46–0.54 | dentro |

## Outros números
- Duração P10/P90: 29.5 / 33.7 min · partidas sem vencedor (limite de 60 min): 0.
- Partidas "massacre" (diferença > 20 abates): 0.014.
- Almas de Dragão em 4% das partidas · Vastilarvas por jogo: 2.99.
- Primeira torre aos 1469 s · ganks por jogo 5.5 · poções usadas 71 · sentinelas colocadas 63.2 · itens finais médios 5.9.

## Diagnóstico e correções aplicadas neste bloco
- **Causa principal do CS/nível baixos:** depois dos primeiros ~5 min a macro da IA alterna entre objetivo/defesa/rota; o laner passa pouco tempo em rota (modo "lane" ~35% do tempo entre 5 e 10 min) e sem CS não há ouro nem XP, o que alimenta mais idas à base. Nos 4 primeiros minutos o CS é ~5/min por laner (próximo do real).
- **Correção 1:** só campeão inimigo perto de uma estrutura aciona a meta "defend" (antes, 5 minions bastavam e o time inteiro largava a rota).
- **Correção 2:** objetivo cuja tentativa falha entra em recarga de 90 s antes de ser tentado de novo.
- **Testado e descartado:** limiar de decisão de meta (0,34 / 0,5 / 0,65) e fator de último golpe (0,06–1,8): efeito pequeno ou negativo no CS.
- **Pendente (ver abaixo):** histerese entre luta e retirada (centenas de trocas por partida), previsão do último golpe quando há muitos minions, tempo em rota dos laners no meio de jogo.

Limites: sem névoa de guerra; kits automáticos (rascunhos) para 165 campeões; alvos estimados.
