# Dragões: regras no jogo

Implementado em `src/engine/jungle/objectives.js` e `buffs.js` (motor realista) e em `index.html` (motor clássico da partida ao vivo). Testes: `ferramentas/testes/engine_selva.js`.

## Cronograma
- O 1º dragão nasce aos **5:00**; depois de abatido, o próximo nasce **5 min** depois.
- Os 2 primeiros dragões têm elemento aleatório. O **3º dragão define o elemento do mapa**: ele e todos os seguintes são desse elemento, e o 3º abatido transforma o mapa (evento `rift` e mensagem "O mapa se transforma: Terras ...").
- **Alma:** o primeiro time com 4 dragões conquista a Alma do elemento do mapa. Depois disso os elementais param e o **Dragão Ancião** nasce a cada **5 min** (antes eram 6 min).

## Buffs por pilha (motor realista)
- Infernal: +3% AD e AP. Montanha: +5% armadura e resistência mágica. Oceano: regeneração de vida perdida. Nuvem: +5% velocidade fora de combate e resistência a lentidão.
- Hextec: +5% velocidade de ataque e +5 aceleração de habilidade.
- Quimtec (conforme a especificação): +5 aceleração de habilidade e +2% AD/AP. Antes era tenacidade e poder de cura.

## Almas e Ancião
Almas (Infernal: explosão em área; Montanha: escudo; Oceano: cura e mana; Nuvem: velocidade ao usar a ultimate; Hextec: dano em cadeia com lentidão; Quimtec: bônus de combate abaixo de 50% de vida) e o buff do Ancião (queimadura e execução abaixo de 20% de vida) já existiam e seguem iguais.

## Efeitos no mapa
- **Nuvem:** zonas de velocidade (+10%, ESTIMADO) no rio e nos covis, para os dois times.
- **Oceano:** Frutas-Mel no rio que curam quem passa ferido (120 + 15% da vida perdida, recarga de 150 s; ESTIMADO).
- **PENDENTE:** paredes e arbustos novos (Infernal, Montanha, Oceano), portais (Hextec, Quimtec) e plantas da selva. Dependem da malha de navegação do mapa, que o motor ainda não tem.
