# BLOCO 0 — Auditoria e Planejamento do Motor Realista

Data: 2026-11-08. Nenhum código do jogo foi alterado neste bloco (apenas este documento foi criado).

---

## 1. Resumo executivo

- O jogo é **um único `index.html` de 2,0 MB / 6.732 linhas** (HTML + CSS + um `<script>` de ~5.600 linhas; imagens em base64 embutidas). Não há build, módulos nem dependências. Persistência em `localStorage`. Há 17 testes em Node que carregam o script inteiro dentro de um `vm` (`ferramentas/testes/harness.js`) com PRNG com semente.
- O "motor ao vivo" já existe (`lvXxx`, linhas ~3243–4530, ~1.290 linhas) e é um **motor de agentes em nível estratégico**: 10 jogadores se movem num grafo de rotas, farmam, rotacionam, fazem ganks, objetivos e torres, com decisões a cada 4 s. **Mas o combate é abstrato**: cada jogador tem um único escalar de "poder" e as lutas são resolvidas por uma função (`lvBrawl`) que calcula o resultado inteiro de uma vez e depois agenda as mortes como eventos futuros. Não existem habilidades, itens, resistências, projéteis, controle de grupo nem escudos.
- Os 110 campeões existentes são **linhas de `CHDATA` com função, estilo, tags (E/K/P/S/B/X/F/O/C) e curva de força early/mid/late (-2..+2)**. Nenhum tem atributos, habilidades ou ícone de habilidade.
- Não existe sistema de itens, nem Q/W/E/R, nem fórmulas de dano.
- Conclusão: o que o projeto pede **não é uma evolução do `lvBrawl`; é um segundo motor (combate por tick, com entidades reais)** que reaproveita do atual a navegação, a IA estratégica (macro), o calendário de objetivos e toda a UI. O motor atual deve **continuar existindo** como "modo rápido" (ver §6, decisão D2).

---

## 2. Mapa do repositório

| Caminho | Papel |
|---|---|
| `index.html` | Jogo inteiro (CSS linhas 11–1209, JS 1213–6827). Contém `DATA` (elencos reais 2026), HoF/histórico, carreira, calendário, draft, motor ao vivo, telas. |
| `champs/*.webp` (111) | Ícones de campeões (baixados do Data Dragon por `ferramentas/champs_icones.py`, que reescreve `CHFILES` no HTML). |
| `ferramentas/testes/*.js` (17) + `harness.js` | Testes sem navegador. `harness.load()` executa o `<script>` num `vm` com DOM falso e **`Math.random` substituído por PRNG com semente** (`SEED` env). |
| `ferramentas/*.py` | Utilitários de assets (ícones, logos, troféus). |
| `auditoria/AUDITORIA.md` | Auditoria dos elencos reais contra a Liquipedia (outro assunto; não é do motor). |

Não há `.gitignore`, `package.json`, linter ou CI. Git limpo na `main`, 109 commits.

## 3. Mapa do `<script>` do `index.html` (por responsabilidade)

| Linhas | Bloco | Observação |
|---|---|---|
| 1214–1387 | Constantes, `DATA` (elencos), títulos históricos | dados reais 2026 |
| 1388–1610 | Utilidades, estado `S`, `freshGame`, `seed2026`, `effR` | `S` salvo em `localStorage` (3 slots) |
| 1610–1690 | Odds e `play()` — **resolução estatística de partidas** | `seriesP/perGame`, usada fora do ao vivo |
| 1691–1970 | Splits, MSI, Mundial, suíço, prêmios | |
| 1972–2460 | Modo treinador (finanças, contratos, base, eventos, moral, staff) | |
| 2461–2700 | **Banco de campeões (`CHDATA`), sinergias, counters, composições (`cmpOf`, `chMu`, `chFxP`, `lvCm`)**, Fearless | força de campeão vira multiplicador no motor |
| 2706–2750 | **Selva**: `JGC`, `JGS`, `JGB`, dragões | dados cadastrados à mão |
| 2751–3060 | Calendário de eventos/scrims/exibições | |
| 3059–3242 | Draft (meta, maestria, tela de draft) | |
| **3243–4530** | **Motor ao vivo + tela de transmissão** (`lv*`) | foco desta auditoria (§4) |
| 4529–4920 | Modo jogador (carreira de um jogador) | usa `LV.pcw` para modular o motor |
| 4920–5060 | Início do treinador (dashboards) | |
| 5060–5420 | Divisão de acesso, virada de ano | |
| 5420–6730 | Calendário, Copa, componentes, telas, fichas, ajustes, `render()`, `act()` | |

## 4. Auditoria do motor ao vivo atual

### 4.1 Estado e ciclo
- Estado central: global **`LV`** (um objeto). `LV.pp[side][role]` = jogador (`x,y,hp(0..1),gt,bg,xp,lv,cs,ch,ar,b0,...`), `LV.kd` = KDA/morte, `LV.tw` = vida de torres/nexus (vetores numéricos), `LV.str` = flags de estruturas vivas, `LV.cm/LV.cr` = timers de acampamentos, `LV.q` = **fila de eventos agendados** (`lvQ(t, fn)`), `LV.log`.
- Lados são `'me'`/`'op'` (não azul/vermelho; o mapeamento vem de `lvBlue`).
- Relógio: `lvStep(dt)` anda em **passos de 1 s** (`lvSecond`), roda `lvThink()` a cada **4 s** (`LVCFG.cyc`). Velocidade de reprodução 20× ou 30× (`lvSpd`), via `requestAnimationFrame` (`lvLoop`). A UI (`lvPaint`) lê `LV` e interpola posições a cada quadro.
- Pausas em 10 min e 20 min (`cpA=600`, `cpB=1200`) para instruções do técnico/jogador.

### 4.2 O que já existe e é reaproveitável
1. **Navegação por grafo** (`lvNavInit`, `lvPath`): rotas, rio e selva; nada atravessa o mapa em linha reta. Coordenadas em % do mapa (0–100).
2. **IA macro** (`lvAssess`, `lvRisk`, `lvPlan`, `lvOrders`, `lvGankScore`, `lvRotate`): decide objetivo, torre, defesa, invasão, caça, gank, recall e split com base em risco/vantagem e no estilo do time (`LVSTY`: agressivo/macro/escalonamento/caótico/reativo). É a parte mais valiosa e mais próxima do Bloco 8.
3. **Selva e objetivos** com nascimento/respawn parametrizados (`JGC`, `LVCFG`): larvas (8:00), arauto (15:00), dragão (5:00, tipos), Barão (20:00), anciões; roubo de acampamento; buffs.
4. **Ondas de minions simplificadas** (`lvWave`): uma "wave" por rota com posição `u` em [0,1]; sem minions individuais.
5. **Morte/ressurgimento** com tabela da Wiki (`lvDeathT`, `LVBRW`).
6. **Integração**: draft → `lvOpen` → mapa → `lvGameEnd` → tabela/histórico; modos treinador e jogador; séries MD3/MD5 com Fearless.
7. **Testes automáticos** de ritmo (abates/min, duração ~32 min, taxa de vitória do favorito).

### 4.3 Limitações (relevantes para o objetivo)
| # | Limitação | Evidência |
|---|---|---|
| L1 | **Combate sem entidades**: poder escalar `lvPw` (nota do jogador × nível × ouro × multiplicadores). Rodadas de 2,4 s retiram "fração de vida". | `lvBrawl` 3541, `lvPw` 3427 |
| L2 | **Resultado decidido antes da animação**: o brawl calcula todas as mortes e as agenda no futuro (`lvQ`). Não há ação→consequência observável. | `lvBrawl` (`evs`, `lvQ`) |
| L3 | **Vida em fração (0..1)**: sem HP, mana, armadura, RM, escudos, curas. Dano para estatística é inventado (`560+92*lv`). | `lvDmg` 3269 |
| L4 | **Sem habilidades/itens**: "ouro" só multiplica o poder (`1+bg/9000`). Não há compras. | `lvPw` |
| L5 | **Campeão = tags + curva**: `CHD[c]={r,t,p,cl}`. Sem stats base, sem kit. | `CHDATA` 2471 |
| L6 | **Minions agregados**: sem CS real por unidade, sem tipos de minion, sem last-hit, sem controle de wave por jogador (usa `LVRCS`, `LVXPR` por papel). | `lvWave`, `lvEco` |
| L7 | **Visão** é uma checagem de raio (`lvSees`) e lista de sentinelas `LV.wd`; sem névoa/arbustos/varredura. | `lvSees` |
| L8 | **Aleatoriedade não injetável**: 105 usos de `Math.random()` no arquivo (30 no motor). Os testes só são determinísticos porque o harness troca `Math` inteiro. No navegador, partidas não são reproduzíveis. | grep |
| L9 | **Sem replay**: `LV.log` guarda textos (300 últimas); `LV.gh` guarda gráfico de ouro. Não há log estruturado de eventos nem snapshot por tick. | `lvSay` |
| L10 | **Estado em globais mutáveis** (`LV`, `S`) e UI no mesmo arquivo → módulos não são testáveis isoladamente sem o `vm` do harness. | arquitetura |
| L11 | **Dados cadastrados à mão e sem proveniência** (selva, dragões, tempos). O código afirma "valores de referência da temporada atual" mas não registra patch nem fonte. | 2706 |
| L12 | Mapa de 110 campeões, mas o Data Dragon traz mais (ver §5). Faltam 60+ a cadastrar para "todos". | consulta DDragon |

### 4.4 Acoplamentos que não podem quebrar (Bloco 9)
- `lvPaint`/`vLive`/`lvMapHTML` leem diretamente `LV.pp[*].x/y/hp/st/go/lv/cs/gt`, `LV.tw`, `LV.str`, `LV.kd`, `LV.st`, `LV.log`, `LV.wd`, `LV.dn`, `LV.ob`, `LV.hd`, `LV.bb`, `LV.elder`, `LV.soul`. **Esse conjunto é o contrato de leitura da UI.**
- `lvGameEnd`, `lvNext`, `lvSub`, `pcGameEnd` escrevem resultado em `m.res`, `S.rv`, perf., moral etc.
- Modo jogador altera o motor por `LV.pcw` e `LV.pcrole` (lvPw, lvBrawl).
- Testes existentes patcham funções do motor por nome (`lvBrawl = ...`, `mgrMatch = ...`). Renomear/remover `lvBrawl` quebra `motor_abates.js` até migrar.

### 4.5 Baseline medido hoje (pontos de partida para o Bloco 10)
- `campeoes.js`: 110 campeões, 22 por rota, íntegros.
- `jungle.js 40`: duração média 36,5 min; nível do jungler aos 10 min 5,8; 56 camps/jogo; ~2,9 roubos/jogo.
- (os demais testes ficam como linha de base; serão rodados completos no início do Bloco 1 para registrar "antes").

---

## 5. Fontes de dados (verificado hoje)

| Fonte | Verificação feita | Serve para | Limitação |
|---|---|---|---|
| **Data Dragon** (`ddragon.leagueoflegends.com`) | `versions.json` acessível; **última versão = 16.22.1**; `champion.json` (pt_BR) lista 173 entradas; `item.json` tem 864 itens (inclui Arena/ARAM/modos antigos). | Stats base e crescimento de campeões, ícones, nomes dos feitiços, custos/recargas/alcance (arrays), preços e componentes de itens, atributos de itens (`stats`). | **Não traz fórmulas de dano estruturadas.** Os coeficientes de habilidades só existem em texto de tooltip (`effectBurn`, `leveltip`). Passivas de itens também só em texto. |
| **CommunityDragon** (`raw.communitydragon.org`) | Não consultado ainda (primeira tarefa do Bloco 1). | Dados brutos do cliente (`.bin` convertidos): cálculos de habilidades, coeficientes, velocidades de projétil, tempo de conjuração, larguras. | Formato interno do cliente, muda entre patches; exige parser e validação. |
| **Wiki do LoL** | Não consultada ainda. | Conferência de regras (minion, selva, morte, objetivos), valores históricos. | Texto, não estruturado; não é "oficial Riot". |

**Regra proposta de proveniência** (cada dado leva `src`): `riot-ddragon` | `riot-cdragon` | `wiki` | `codigo` (mecânica implementada) | `estimado` (parâmetro de calibração) | `simplificacao`. Nada estimado pode aparecer como oficial.

**Patch de referência (proposta):** fixar **16.22.1** (último disponível hoje). Se quiser um patch competitivo específico (p.ex. o do Mundial 2026), é só trocar o número: o pipeline será parametrizado por patch.

---

## 6. Decisões de arquitetura propostas

### D1 — Como organizar o código num arquivo único
O jogo é distribuído como 1 arquivo. Proposta: **fontes modulares em `src/` + script de build (`node ferramentas/build.js`) que gera o `index.html` único**. O motor novo vai para `src/engine/*` (JS puro, sem DOM, sem globais, ES modules ou IIFEs concatenadas), com dados em `data/<patch>/*.json` embutidos no build. O harness de testes passa a importar os módulos diretamente (sem `vm`), mantendo o `vm` apenas para os testes legados.
*Alternativa:* continuar editando dentro do `index.html`. Funciona, mas um motor de ~10k+ linhas e dezenas de milhares de linhas de dados num arquivo de 2 MB prejudica revisão, testes e diff.

### D2 — Dois motores atrás da mesma interface
- **Motor legado** (atual) permanece para: simulação rápida de partidas que o usuário não assiste (centenas por split), modo "sem mapa ao vivo", e fallback.
- **Motor realista** (novo) é usado na partida ao vivo. Ao entrar no ao vivo, o `lvOpen` escolhe o motor por opção (padrão: novo quando estável).
- Ambos expõem o mesmo **contrato de visualização** (§4.4: `LV.pp/tw/str/kd/st/log...`), via um *adapter* que projeta o estado novo no formato que a UI já lê. Assim a UI não precisa ser reescrita e o requisito 15 ("não comprometa o mapa ao vivo") fica garantido.
- Motivo: o motor realista por tick é mais caro; simular milhares de partidas da temporada com ele seria inviável. Estimativa para 1 partida de 35 min a 20 Hz: ~42 mil ticks × (10 campeões + ~70 minions/monstros) — ok em tempo real (≈400 ticks/s a 20× de velocidade), mas ~1–3 s por partida em modo offline, o que é aceitável para a partida do jogador, não para a liga inteira.

### D3 — Estado centralizado e determinismo
- Um único **`MatchState`** serializável (JSON), sem funções dentro. Entidades por ID numérico: campeões, minions, monstros, estruturas, projéteis, efeitos, sentinelas.
- **PRNG com semente injetada** (mulberry32, já usado no harness) em fluxos separados (`combat`, `ai`, `world`, `cosmetic`) para que mudar a IA não altere o resultado de um golpe. **Proibido `Math.random()` dentro de `src/engine`** (teste de lint no build).
- **Tick fixo** (proposta: 50 ms = 20 Hz; combate de projéteis precisa de menos de 1 s por 1000 u de velocidade). Eventos com ordem estável (tick, prioridade, id).
- **Log de eventos estruturado** (`{t,tipo,ator,alvo,valor,...}`) = fonte única da verdade para replay, estatísticas, "investigar decisões" e para o log de texto da UI. Replay = semente + dados do patch + decisões de draft/instruções do usuário; ponto de verificação (snapshot) a cada 30 s para pular rápido.

### D4 — Módulos (mapeados aos seis motores do pedido)
```
src/engine/
  core/       rng, clock(tick), eventbus, matchstate, replay, ids
  data/       loader do patch, schemas, validação  (lê data/<patch>/)
  champion/   stats(nível), habilidades (executor de efeitos), passivas
  combat/     dano (físico/mágico/verdadeiro, pen, letalidade, crit), AA, projéteis,
              escudos/curas, CC/tenacidade, estados (imune/invulnerável), pilha de modificadores
  items/      stats, passivas/ativas (hooks), loja, componentes, política de build (IA)
  world/      minions (ondas, CS real), selva, objetivos, estruturas, visão/névoa, colisão/navmesh
  economy/    ouro, XP, níveis, bounties/shutdowns, assistências
  strategy/   percepção (o que o time "sabe"), macro (reaproveita lvPlan), micro (alvos/spells/posição),
              atributos do jogador (mecânica, decisão...) -> ruído/erro
  sim/        loop, orquestração, adapter p/ UI (LV-compat), estatísticas
data/16.22.1/ champions.json abilities.json items.json minions.json monsters.json structures.json rules.json meta.json(proveniência)
```

### D5 — Como tratar "110/172 campeões × Q/W/E/R sem habilidades genéricas"
É o maior risco do projeto e precisa ser dito com franqueza. **Dados oficiais estruturados cobrem stats, custos, recargas e alcances; não cobrem a *lógica* de cada kit.** Há três caminhos:

1. **DSL de efeitos + dados por habilidade + *hooks* de código para exceções.** Cada habilidade é um objeto de dados composto de primitivas reais do jogo (skillshot linear/circular/cone, dash, alvo, buff/debuff, escudo, cura, invocação, mudança de forma, marcas/passivas empilháveis) com números do patch. Mecânicas únicas (Yasuo, Aphelios, Viego, Sylas...) ganham um *script* próprio. **Cada campeão tem identidade própria; nada é compartilhado por tipo**, mas boa parte da implementação é dado, não código.
2. Escrever os 172 kits 100% em código. Máxima liberdade, custo e risco de bugs enormes, difícil de atualizar por patch.
3. Kit "médio" por arquétipo (rejeitado: viola a regra 8 do pedido).

**Recomendação: caminho 1, em ondas.** Bloco 2 entrega a infraestrutura e a **onda 1 (~12 campeões que cobrem todas as primitivas, 2–3 por rota)** com validação; as demais ondas entram por lotes, cada campeão só fica "ativo" no motor novo quando passa nos testes do seu kit. Campeões ainda sem kit usam **o motor legado** (e ficam fora do draft do motor novo) — nada "parece pronto sem estar".

### D6 — Fidelidade dos números
- Dano: `dano = bruto × 100/(100+resistência efetiva)`; ordem real (redução percentual → resistência plana → % pen → letalidade → escudos → vida) e testes numéricos contra casos conhecidos da Wiki.
- Valores de crescimento: fórmula real `stat = base + crescimento × (n-1) × (0,7025 + 0,0175 × (n-1))`.
- Minions, selva, objetivos, torres: tabelas do patch com `src` e conferência contra a Wiki.
- Itens: stats (DDragon) automáticos; **passivas e ativas por código**, por prioridade (itens comprados por IA > nicho). Itens de outros modos (Arena, Aram-only) excluídos pelo filtro de mapa `11` e pela lista de lojas.
- **Parâmetros de calibração** (ex.: atraso de reação, erro de mira por atributo) ficam em `rules.json` marcados `estimado`.

---

## 7. Ordem de implementação (plano por blocos)

Cada bloco termina com o protocolo da §19: o que foi feito, arquivos, testes, resultados, pendências, compatibilidade e **parada para sua autorização**.

| Bloco | Entrega principal | Critério de aceite | Risco principal |
|---|---|---|---|
| **0** (este) | Auditoria + plano | Documento aprovado | — |
| **1 — Banco de dados** | `data/16.22.1/*` gerado por script reproduzível a partir do Data Dragon (+ CommunityDragon para coeficientes); schemas; validador; proveniência por campo; relatório de cobertura (o que ficou sem dado). Fórmulas/regras em `rules.json`. | Validador passa; 100% dos campeões do patch com stats; relatório lista exatamente o que falta; script atualiza para outro patch sem mexer em código. | Qualidade/estabilidade do CommunityDragon; coeficientes de habilidades |
| **2 — Campeões/habilidades** | `ChampionStats(nível)`, executor de habilidades (DSL), passivas, onda 1 de kits; mapa nome-do-jogo → id do DDragon (já existe `CHMAP`). | Testes de stats por nível = DDragon; cada habilidade da onda 1 testada isoladamente (dano, CD, custo, alcance, CC). | Escopo; manter DSL pequena |
| **3 — Combate** | Núcleo de dano, AA, projéteis/skillshots com colisão, CC/tenacidade, escudo/cura, tick fixo, 1v1, 2v2, 5v5 "de laboratório" (sem IA macro). | Testes matemáticos (tabela de dano, pen, crit, AS) e funcionais (esquivar, interromper, flash); lutas determinísticas por semente. | Micro-IA (alvo/habilidade/posição) é o que dá "cara de partida" |
| **4 — Itens** | Loja, componentes, stats, passivas/ativas dos itens relevantes por prioridade, política de build contextual. | Todo item da loja SR com stats; 100% dos itens "core" com passiva; build de cada campeão da onda 1 coerente. | Volume de passivas |
| **5 — Farm/ouro/XP** | Minions reais (melee/caster/siege/super), ondas, CS por unidade, XP compartilhado, ouro passivo, bounties/shutdown, controle de wave. | CS/min por função, ouro/min e XP dentro de faixas da Wiki/pro (com fonte). | Equilibrar com IA de lane |
| **6 — Selva/objetivos** | Acampamentos com HP/dano reais, Smite, buffs, Arauto, larvas, dragões, Barão, almas. | Tempos e recompensas conferem com a Wiki; jungle limpa em tempos reais por campeão. | Smite e roubo de objetivo exigem combate pronto |
| **7 — Mapa/estruturas** | Torres (dano/placas), inibidores, Nexus, visão e névoa, colisão/navmesh simplificada, recall. | Testes de pressão em torre, escudo de torre, super minions. | Parede/colisão fiel |
| **8 — IA e macro** | Atributos do jogador → decisão e execução; migração do `lvPlan/lvGankScore` para trabalhar sobre o estado real; composições; adaptação. | Comportamento macro compatível com o atual (não regredir) + métricas de Bloco 10. | Maior bloco de afinação |
| **9 — Integração** | Adapter ao contrato `LV`; `lvOpen` seleciona motor; histórico/estatísticas; replay. | Todos os 17 testes legados passam; novas telas/ log; partidas MD3/MD5/Fearless/modo jogador funcionam com o motor novo. | Quebrar a UI |
| **10 — Balanceamento** | Simulações em massa (≥1000/pares), relatório vs. alvos pro (duração, abates/min, CS, ouro, objetivos). | Documento de resultados + correções. | Calibração |

> Nota: a ordem do seu pedido põe a IA (8) depois de itens/farm/selva/mapa. Proponho **uma exceção**: no Bloco 3 incluir uma micro-IA mínima (mirar, usar habilidades, kitar) só para que os testes de combate sejam significativos; a macro continua no Bloco 8.

---

## 8. Plano de testes (padrão para todos os blocos)
1. **Unitários matemáticos** (fórmulas, sem simulação).
2. **Funcionais de cenário** (ex.: skillshot errado não causa dano; escudo absorve antes da vida; stun interrompe canalização).
3. **Determinismo**: mesma semente + mesmas entradas → log de eventos idêntico (hash comparado).
4. **Integridade de dados**: schemas + referências (item → componentes, campeão → habilidades).
5. **Regressão legada**: `ferramentas/testes/*.js` existentes continuam passando.
6. **Orçamento de desempenho**: ticks/s e ms por partida registrados.

## 9. Riscos gerais
1. **Escopo**: "todos os campeões e itens" com lógica real é um projeto de muitos meses; o plano o fatia em ondas verificáveis.
2. **Dados oficiais incompletos** (§5): coeficientes dependem do CommunityDragon e/ou conferência manual.
3. **Equilíbrio**: motor realista tende a produzir partidas pouco "naturais" até a IA ficar boa; mantemos o motor legado como fallback até o Bloco 10.
4. **Tamanho do arquivo único**: dados de 170 campeões + 800 itens somam alguns MB; sem minificação de dados, o `index.html` pode passar de 6–8 MB. Mitigação: carregar `data/<patch>/*.json` como arquivos separados quando hospedado, e embutir só no build "offline".
5. **Compatibilidade de saves**: nenhum estado de partida é salvo no `localStorage` (apenas o resultado), então o motor novo não invalida saves existentes. Campeões novos exigem apenas atualizar `CH/CHD`.

## 10. Decisões que preciso de você antes do Bloco 1
1. **Patch de referência**: fixo em 16.22.1 (recomendado) ou outro?
2. **D1**: migrar para `src/` + build para `index.html` (recomendado) ou continuar tudo dentro do `index.html`?
3. **D2**: manter o motor legado como "modo rápido"/fallback (recomendado)?
4. **D5**: aprovar DSL + hooks por campeão em ondas, com os campeões ainda sem kit ficando no motor legado?
5. **Escopo de campeões**: manter os 110 atuais primeiro (recomendado, é o que o draft usa) ou já cadastrar todos os do patch?
