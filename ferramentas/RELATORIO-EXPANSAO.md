# BrasLOL — Relatório da expansão (fases 1 a 6)

Todas as mudanças estão em `index.html`. Testes em `ferramentas/testes/` (lista em `LEIA-ME.txt`).

| Fase | Commit | Tema |
|---|---|---|
| 1 | `e3c2b75` | Correções: som do mapa, empréstimos, ex-jogador técnico, títulos por organização |
| 2 | `cc3e215` | Premiações por colocação e Golden Road |
| 3 | `0fa1d20` | Lendas como técnicos, atributos de treinador, ficha única; premiação = valor do campeão |
| 4 | `f8af705` | Economia sem inflação, tamanho do clube, resumo da proposta na negociação |
| 5 | `69c98a6` | Celular (X, Instagram, WhatsApp, Gmail), tom das reações e efeitos da torcida |
| 6 | (a publicar) | Equilíbrio regional e motor de partidas: relógio fixo, 1×/2×/30×, eventos, decisões, força única |

---

## Fase 1 — Correções

**1.1 Som que entregava o resultado.**
- **Antes:** ao abrir ou retomar um mapa ao vivo, o jogo tocava o som de vitória ou derrota antes da partida.
- **Agora:** toca só um clique ao abrir. O som do resultado vem só no fim do mapa.
- Teste: `som_partida.js`.

**1.2 Empréstimos.**
- O jogador emprestado passa a aparecer no elenco do clube que o recebeu, como titular ou reserva.
- O selo "emprestado" mostra o clube dono dos direitos (`p.ln={o,on,y,f}`) e o ano de volta.
- O jogador volta sozinho na virada de ano (`lnYear`).
- Saves antigos são migrados (`lnMigrate`).
- O jogador emprestado fica protegido de renovações, vendas e cortes da IA.
- **Modo jogador:** propostas de empréstimo (tipo `L`) e opção de pedir empréstimo.
- Teste: `emprestimos.js`.

**1.3 Ex-jogador que vira técnico.** Mantém a foto (`coImg` usa `jogadores/<slug>.webp`), o nome e o histórico, sem criar outra pessoa (`coWasPl`).

**1.4 Títulos por organização.**
- Novo cadastro `ORGS` com os nomes antigos de cada organização. Exemplo: Damwon e DWG KIA contam para a Dplus KIA.
- Samsung, KOO/ROX e RNG continuam separadas.
- A contagem de títulos (`ttCount`), as Lendas e o pódio usam a organização atual.
- Novo painel "Identidade da organização" na aba Títulos.
- Teste: `titulos_organizacao.js`.

## Fase 2 — Premiações e Golden Road

**Premiações** (`ECO`, `tourPrize`).
- Worlds US$ 5 mi, MSI 2 mi, EWC 2 mi e First Stand 1 mi.
- Esse é o valor do **campeão** (ajuste da Fase 3). As outras colocações recebem uma fração: vice 50%, semi ~27%, quartas ~13% e grupos/suíço 5%.
- Em Finanças aparecem o detalhe por torneio e a tabela de prêmios.

**Golden Road** (`grCheck`).
- O que conta: os 3 splits, o MSI e o Worlds na mesma temporada.
- Prêmio-base configurável (`ECO.gr.base`, US$ 25 mi), com +30% pelo First Stand e +30% pela EWC.
- Recebem só os jogadores e técnicos que de fato fizeram a campanha: estar no elenco do Worlds e em pelo menos 3 dos outros 4 títulos. O assistente precisa estar no clube desde o primeiro título da campanha.
- Visual: nome dourado em todo o jogo e brilho na logo, com respeito à redução de movimento.
- Aparece no histórico permanente do clube, nas fichas dos jogadores e técnicos e em Lendas › Times.
- Teste: `premios_golden_road.js`.

## Fase 3 — Lendas e treinadores

**Quem vira técnico.** Toda Lenda (60 pts ou mais) e todo jogador do Top 30 aposentado entra no mercado de técnicos (`coLegSeed`, `coLegPool`).
- Os clubes da IA podem contratá-las como técnico principal.
- No seu clube, entram como assistente.
- O antigo "assistente-lenda" foi unificado em `S.co`, com migração dos saves.

**Atributos de treinador** (`COAT`, `coAt`): Tática, Leitura de jogo, Motivação e Formação, ligados ao jogo:

| Atributo | Efeito |
|---|---|
| Tática e Leitura de jogo | Força na partida (`coBoost`, no máximo ~0,65 de OVR) |
| Motivação | Segura a má fase |
| Formação | Evolução anual dos jovens (`coDevB`), para todos os clubes |

O assistente rende 60% do que renderia como principal.

**Traços do Top 30** (`COTR`): Mentalidade de campeão, Formador, Cérebro do jogo e Exemplo de longevidade.
- São tirados da carreira de jogador.
- Dão um bônus moderado que cresce com o ranking.
- Nenhum atributo passou de 77 nos testes.

**Ficha única.**
- Abas "Carreira de jogador | Carreira de treinador", com a mesma foto, o mesmo nome e o mesmo histórico.
- A aba de treinador mostra a função atual, atributos e traços, estatísticas (temporadas, V-D, aproveitamento, títulos, melhor Worlds) e os clubes treinados.

Teste: `tecnicos_lendas.js`. Também ajustei o `tecnicos.js`: a força do técnico agora vem dos atributos.

## Fase 4 — Economia e mercado

**Valor de mercado sem inflação** (`ECOMV`, `mvRef`, `mvOf`).
- O valor do jogador usa o OVR relativo à elite do momento: média dos 50 melhores da 1ª divisão, comparada com a de 2026.

| Compra do melhor jogador | Antes | Agora |
|---|---|---|
| Em 2026 | US$ 68,6 mi | US$ 41,4 mi |
| Depois de 12 temporadas | até US$ 84 mi | US$ 32,2 mi |

- Salário = 22% do valor.

**Tamanho do clube** (`brandOf`, `clubRev`, `cashStart`).
- Calculado pelo mercado da liga e pelos títulos, com peso maior para os recentes e para a Golden Road.
- Puxa bilheteria, patrocínio e caixa inicial. Exemplo: Gen.G ~US$ 41 mi por ano, contra ~16 mi de um clube pequeno.

**Negociação.** Refinamento, sem redesenho: resumo da proposta nas telas de computador e de celular, com proposta, valor de mercado, salário e caixa depois.

Teste: `economia_mercado.js`.

## Fase 5 — Celular

**O botão.** "📱 Celular" no painel inicial, nos dois modos, com contador de mensagens e menções não lidas.

**Os apps:**
- **X:** feed, contas verificadas, respostas, posts em alta e Assuntos do momento.
- **Instagram:** perfil, seguidores, momentos e clima da torcida.
- **WhatsApp:** presidente, colegas, empresário e assessoria.
- **Gmail:** a caixa de e-mail que já existia.

**Ligação com o jogo.**
- Toda manchete (`news`) vira post de jornalista e/ou da conta oficial do clube.
- Cada série do seu time vira um post oficial.

**Tom das reações:** festa, tristeza, cobrança (`#Fora<Técnico>`), provocação de rivais, boato, despedida e lesão, conforme o contexto (título, sequência, zebra, placar).

**Efeitos.** O jogo mede a temperatura da torcida (`S.soc.hy`, de −100 a 100).
- Modo treinador:
  - Mexe na moral do elenco.
  - Com a torcida irritada, a diretoria cobra pelo WhatsApp e a satisfação cai. Com a torcida em festa, ela elogia.
  - Gera receita de engajamento, até ~US$ 3,5 mi por ano.
- Modo jogador: seguidores, posts virais e marcos de seguidores aumentam a fama, que pesa nas propostas.

**Cuidados.**
- A rede social tem um sorteio próprio e não altera o resultado das partidas.
- Histórico de no máximo 80 posts e 40 mensagens.
- Opção para desligar o contador.

**Correção encontrada no caminho:** a manchete do Worlds dizia "0º título do clube" (rótulo Worlds x título Mundial).

Teste: `rede_social.js`.

---

## Fase 6 — Equilíbrio regional e motor de partidas

### 6.1 Equilíbrio regional

**O problema** (medido em 20 temporadas):
- As ligas convergiam. O melhor time do CBLOL saía de 80,1 e passava a LCK (88,6) em 10 anos.
- Os Worlds se espalhavam: LPL 5, LCP 5, LCS 3, LEC 3, LCK 3, CBLOL 1.

**A causa:**
- Novatos com o mesmo piso de OVR (77), o mesmo potencial e a mesma chance de prodígio em todas as ligas.
- Evolução anual igual em todas as ligas.
- O bônus de desempenho inflava os jogadores das ligas fracas.

**O que mudou** (`LGT`, `lgT`, `lgDev`, `rookie`):
- Cada liga tem piso, escala de potencial, chance de prodígio, evolução anual (nível dos treinos) e um teto regional.
- Acima do teto, o jogador evolui menos se continuar na liga.
- O bônus de desempenho passou a ser escalado pela liga.

**Resultado em 20 temporadas:**
- Worlds: LCK 7, LPL 7, LEC 3, CBLOL 1, LCP 1, LCS 1. LCK e LPL ficam com 70%.
- MSI: LCK e LPL com 16 de 20.
- A hierarquia se mantém e as zebras continuam possíveis.

Teste: `equilibrio_regional.js`.

### 6.2 Relógio fixo, sorteio por mapa e velocidades
- A simulação avança só em segundos inteiros (`LV.acc`) e usa um sorteio próprio, semeado por mapa (`m.lsd`, estado em `LV.rs`, aplicado por `lvSeed`).
- **O mesmo mapa dá o mesmo resultado em qualquer velocidade.** Testado com passos de 0,5 s, 1 s, 5 s e 30 s.
- Velocidades **1×, 2× e 30×** (`LVSPD`). A 20× foi removida, e saves antigos em 20× passam para 30×.
- A tela só lê o estado: o desenho do mapa já era separado e continua assim.

### 6.3 Barramento de eventos
- `lvEmit` e `lvOn` registram abate (com multiabate e primeiro sangue), ACE, torre, inibidor, objetivos (dragão, alma, arauto, Barão, ancião) e Nexus em `LV.evs`.
- Quem ouve os eventos:
  - **Momentos-chave** no fim do mapa.
  - **Rede social**: posts de quadra e pentakill, e de virada depois de o rival pegar o Barão.
  - **Fama e seguidores** no modo jogador, quando o multiabate é seu.

### 6.4 Camada de decisões
- **Leitura de jogo:** cada time avalia o valor das jogadas com uma margem de erro que cai com a Leitura de jogo e a Tática do técnico (Fase 3) e com o nível do elenco (`lvIq`). Times e técnicos melhores escolhem melhor.
- **Vantagem numérica:** depois de abates, o time puxa objetivo ou estrutura.
- Continuam valendo os comportamentos que já existiam: preparar o objetivo antes de nascer, contestar ou entregar, defesa da base, invasões, caça a jogador isolado e cerco de torre.

### 6.5 Força única
- **Antes:**
  - A partida rápida usava a chance calculada pelo OVR, mas o mapa ao vivo era decidido por detalhes fixos (campeões, estilo) e aplicava essa chance de forma muito fraca.
  - Resultado: um mesmo confronto dava 43% num jogo e 100% em outro.
  - Achei ainda um bug: a semente usava `m.sd`, que já guarda o lado do mapa.
- **Agora:**
  - Uma função só, `mQa`, serve à partida rápida (`play`), aos amistosos (`frResolve`) e ao mapa ao vivo (`lvP`).
  - Ela considera OVR do dia, técnico, moral, química, bônus da partida (`m.qb`, play-off), desconto de clássico, draft/plano e preparação.
  - No mapa ao vivo, os elencos são igualados em força bruta; o elenco só define quem carrega dentro do time.
  - A diferença entre os times vem da chance única (`LVCFG.kap=0,2`), mais uma variação de dia por mapa (`LVCFG.form=0,25`), sorteada com a semente do mapa.
- **Calibração** (40 a 80 jogos por confronto):

| Chance calculada | Resultado ao vivo |
|---|---|
| 54% | 60% |
| 70% | 69% |
| 76% | 73% |
| 79% | 70–78% |

Teste: `motor_calibracao.js`.

### 6.6 Limpeza
- Removi do motor o código que ficou sem uso: `LVST`, `lvAlive`, `lvKdaTot`, a velocidade 20× e os três cálculos de chance duplicados, que viraram o `mQa`.
- Ficou um só motor, evoluído no lugar, sem cópia paralela.
- Normalizei as quebras de linha do `index.html` para CRLF.
- Ficaram de fora 25 funções sem uso fora do motor (ex.: `bidsHTML`, `calHTML`). Não removi para preservar o que não fazia parte do escopo.

## Estado dos testes
- 28 baterias de teste.
- Todas passam, menos a falha antiga do `mercado_vivo` ("o substituto chega em 1 dias"), que já existia antes da expansão.

## Próximos passos sugeridos
- Ajuste fino da sensação nas velocidades 1× e 2× (ritmo da narração, duração das animações), jogando de verdade.
- Opcional: limpar as 25 funções sem uso fora do motor.
