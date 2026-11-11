# Bloco 10c — Calibração do modo que o jogo usa (farm clássico)

O jogo (`integracao/adapter.js`) liga `farmClassico`: CS, ouro e XP de rota vêm do tempo na rota, não do último golpe. O `balanceamento.js` agora mede esse modo com `CAL_CLASSICO=1` (`CAL_CLASSICO=1 node ferramentas/balanceamento.js 64 cl_fin 70 70`; dados em `ferramentas/balanceamento/cl_fin.json`).

| Métrica (64 partidas, 70 x 70) | Antes | Depois | Alvo |
|---|---|---|---|
| CS/min topo / meio / atirador | 5,1 / 3,8 / 3,1 | 9,8 / 8,5 / 8,3 | 7,6–9,8 / 8–9,4 / 8,3–9,8 |
| CS/min suporte | 1,3 | 1,7 | 0,8–2 |
| Ouro/min por jogador | 240 | 342 | 330–430 |
| Nível final médio | 7,3 | 13,4 (laners 12,5–14,6; caçador 14,1) | 14–18 |
| Abates/min | 0,99 | 1,01 | 0,75–1,15 |
| Barões / Arautos por jogo | 0,25 / 0,34 | 0,91 / 0,67 | 0,5–1,2 / 0,7–1,6 |
| Torres caídas | 11,2 | 12,0 | 12–18 |

## O que mudou (tudo ESTIMADO, sem fonte)
- `ai/brain.js`: taxa de CS do farm clássico por função (topo x1,75, meio x2,1, atirador x2,5, suporte x1,2) e XP do farm x2,8 (atirador 5,0 base). Os valores antigos davam a metade da XP esperada.
- `ai/match.js`: `w.jungle.mul = { gold: 2.2, xp: 3.2 }` compensa o ritmo de limpeza da IA (~1,3 acampamento/min). O padrão em `jungle/objectives.js` continua 1, então `engine_selva` não muda.
- Previsor de morte de minion (`futureMinionDmg`): só vale no modo de último golpe real.

- `ai/strategy.js`: `pickSplitLane` não escolhe mais a rota do grupo nem a do cerco/defesa em curso (`goalLane`), e a retenção de 40 s de `groupLane` não vale se o grupo ficaria na rota do split. Era um defeito real: split e grupo podiam cair na mesma rota (teste C1 do `lane_assignment`).
- Mortes por torre deixaram de ser problema neste modo: 15 de 137 abates em 6 partidas.
- `CAL_JGMUL=ouro,xp` no `balanceamento.js` varre a compensação da selva.

## Pendente
- Nível médio (13,4) logo abaixo do alvo; torres (12,0) e arautos (0,67) no limite inferior da faixa.
- `engine_selva` tem 4 falhas que já existiam antes deste bloco (Golpear).
- Ganks ~14 por jogo (sem alvo definido).
