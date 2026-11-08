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
| `combat/damage.js` | matemática pura: resistências, penetração (ordem da Wiki), letalidade, crítico, escudos tipados, redução, tenacidade, lentidões, cura | 3 |
| `sim/world.js` | mundo com tick fixo de 20 Hz: unidades, ataque básico (pré-ataque), status/CC, escudos, abates, log de eventos + hash | 3 |
| `sim/exec.js` | executa os efeitos dos kits: skillshots (colisão segmento x círculo), míssil teleguiado, áreas, cone, dash, zonas, ganchos de passivas | 3 |
| `sim/ai.js` | micro-IA só para testes (mira com erro, esquiva, rotação de habilidades). A IA de verdade é o Bloco 5 | 3 |
| `items/catalog.js` | catálogo da Summoner's Rift (214 itens) a partir do Data Dragon + cliente: preço, receita, classe, atributos | 4 |
| `items/shop.js` | loja e inventário: 6 espaços, receita consome componentes, botas únicas, venda, ouro por unidade | 4 |
| `items/effects.js` | passivas/ativas implementadas (Rabadon, Cutelo Negro, Eclipse, Zhonya, Anjo Guardião, Banshee, Égide de Fogo Solar, Lembrete Mortal) | 4 |
| `items/builds.js` | arquétipo do campeão pelos dados, build de 6 itens por eficiência em ouro, adaptação ao inimigo, ordem de compra | 4 |
| `economy/minions.js` | minions de rota: atributos/XP/ouro do cliente, crescimento por melhoria (estimado), IA de marcha e ataque | 5 |
| `economy/economy.js` | ondas (horários e composição), CS, ouro (último golpe, passivo, abates), XP compartilhado e níveis | 5 |
| `jungle/monsters.js` | monstros neutros: atributos/crescimento do cliente, niveis minimos derivados da Wiki, agro, correia e reset | 6 |
| `jungle/objectives.js` | acampamentos e reaparecimento, larvas, Arauto, Dragoes (pilhas, alma, Anciao), Barao, Golpear, recompensas | 6 |
| `jungle/buffs.js` | Cresta azul/vermelha, bonus por pilha, almas, Aspecto do Anciao, Rancor Ancestral | 6 |
| `map/layout.js` | geometria do mapa: posicoes de estruturas, caminho das rotas e simetria (posicoes ESTIMADAS) | 7 |
| `map/structures.js` | torres, inibidores e Nexus: atributos, ataque e prioridade de alvo, placas/Bulwark, Warming Up, armadura reforcada, invulnerabilidade em cadeia, ouro, super minions, fim de partida | 7 |
| `sim/lifecycle.js` | tempo de morte (tabela Wiki do legado), renascimento na fonte, recall de 8 s | 8 |
| `ai/attributes.js` | 5 atributos do jogador (Lane, Mecanica, Macro, Equipe, Mental) -> mira, esquiva, reacao, ultimo golpe, ruido de decisao (ESTIMADO) | 8 |
| `ai/brain.js` | IA de macro por time: avaliacao, risco, estilos (LVSTY), metas (lane/objetivo/torre/defesa), luta/recuo, farm por caminho de rota, selva e gank, recall e compras, adaptacao | 8 |
| `ai/match.js` | monta uma partida 5x5 completa (mundo, economia, selva, estruturas, renascimento, duas IAs) | 8 |

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
- **Bloco 3**: arena plana sem paredes nem colisão entre unidades (mapa/terreno no Bloco 7); sem minions, torres, itens, runas, XP (Blocos 4+). Custo e recarga são cobrados ao **fim** da conjuração (conjuração interrompida por CC não gasta nada).
- **Estimados** (não existem nos dados extraídos): abertura do cone da W da Annie = 50° (Wiki); raio externo da lentidão da R da Leona = 2,5x o raio do atordoamento; velocidades de dash/míssil sem dado usam valores fixos em `exec.js` (Ahri W/R, Leona E dash, Ezreal E).
- **Pendentes**: Tibbers (R da Annie), passiva da Ahri, escudo da passiva do Malphite, regeneração da passiva do Garen, passivas Annie/Garen-W-resist; dados sem avaliação oficial emitem evento `pending` e valem 0 (nunca chutados).
- Lentidões: maior inteira + 35% das demais (Wiki; conferir no Bloco 10).
- Avaliador: 88,6% dos cálculos oficiais; faltam `mStat` 3/5/8/9/10/14/15/18/29/31, `mBonusPerLevelAtAndAfter`, condicionais por buff e nomes em hash (ver `docs/CAMPEOES_COBERTURA_16.22.1.md`).
- Mana e regeneração vêm do Data Dragon (o extrato do cliente não traz). Recarga ausente no cliente cai para o Data Dragon (`cooldownSrc`).
- **Bloco 4**: todos os atributos numéricos dos itens valem; só 8 passivas/ativas estão implementadas (as ~132 restantes estão listadas em `docs/ITENS_COBERTURA_16.22.1.md`, sem chute). Builds usam a tabela de eficiência em ouro da Wiki (referência, só para escolher itens). Sem ouro por tempo/CS/abates ainda (Bloco 5); itens consumíveis, amuletos e pets de selva ficam fora da loja do motor.
- **Bloco 5**: o crescimento dos minions por melhoria **não existe nos dados extraídos**; usamos os tetos da Wiki com interpolação linear (ESTIMADO, ver `PARAMS` em `minions.js`, calibrar no Bloco 10). Wiki: ouro passivo 20,4/10 s desde 1:50, abate 300 (+100 primeiro sangue). Estimados: divisão de XP entre campeões (âncoras 1 = 100%, 5 = 21,7%), ouro de assistência (metade de 300 dividida). Pendentes: sequência/encerrar sequência, multiplicador de XP por diferença de nível (o dado 0,16 existe mas a semântica não está confirmada), renascimento, minions super e empurrão (precisam de inibidores/torres, Bloco 7), ouro de torre/placas. Sem torres, a onda vencedora chega à base e mata o campeão: por isso o laboratório de rota é limitado a poucos minutos.

- **Bloco 6**: valores de monstros/epicos vem do cliente e dos extremos da Wiki (checados no teste). ESTIMADOS: crescimento dos monstros de acampamento (razao da Wiki), faixas de nivel dos buffs azul/vermelho, escala por minuto do Barao e do Anciao, raios das almas, duracao do escudo da alma da Montanha, cura da alma do Oceano em um unico tique, razao de dano/XP de acampamentos, alcance 175 quando faltante, e o mapa de selva ABSTRATO (o mapa real chega no Bloco 7). PENDENTES: Toque/Fome do Vazio e carga do Arauto (precisam de torres), fortalecimento de minions pelo Barao, fuga/santuario do Aronguejo, transferencia do buff vermelho, passivas dos pets de selva. Limpeza de selva por nivel baixo e dura (campeoes de nivel 9 com 2 itens as vezes morrem); calibrar no Bloco 10.
- **Bloco 7**: valores de torre (vida 9000/5000/4750/3500, armadura/RM 60, alcance 750, ataque 0,833, ouro, placas 5x120, Bulwark, Warming Up, Reinforced Armor 80%/3 s, +20% de campeoes corpo a corpo, decaimento 11:00-15:00) vem da Wiki; inibidor/Nexus (vida, regeneracao 15/20) vem do cliente e armadura 20 / RM 0 da Wiki. ESTIMADOS: **posicoes das estruturas e caminho das rotas** (o cliente nao traz geometria; coordenadas de comunidade, nao verificadas), curva de AD da torre por minuto (so os extremos sao publicados; linear 1:30-14:00), raio da Reinforced Armor, escala do Bulwark pelo numero de campeoes, dano da torre contra minions, ordem minion/campeao/estrutura na escolha de alvo dos minions, fonte (cura 8,5%/s). Estruturas ficam em `w.structs` (fora de `w.units`) e so recebem ataques basicos, minions e torres. PENDENTES: paredes/malha de navegacao, habilidades em estruturas, Crystalline Overgrowth, dano da fonte e portao da base, Toque/Fome do Vazio e carga do Arauto, fortalecimento de minions pelo Barao, renascimento de campeoes, placas de torre com HP proprio.
- **Bloco 8**: a estrutura da IA foi portada do motor legado (lvAssess/lvRisk/lvPlan/lvGankScore, estilos LVSTY, limiar de luta lvTheta, valores de objetivos LVOBV) para o estado real do mundo. Os pesos de pontuacao, raios de decisao, limiares de recall/retirada, a funcao de poder (vida efetiva x dano), o mapeamento atributos->parametros e a margem de ultimo golpe sao ESTIMADOS (calibrar no Bloco 10). Simplificacoes: IA onisciente (sem nevoa de guerra, visao e sentinelas), sem feiticos de invocador, sem Teleporte, sem divisao de rota (split) nem invasao de selva, so 8 campeoes tem kit (elenco fixo em ai/match.js), companheiro de selva estimado (-50% de dano de monstros, 7% de vampirismo contra monstros) para o cacador sobreviver no inicio. Kills por partida ainda baixos (poucas lutas): calibrar. Layout da selva continua abstrato (Bloco 6) e as rotas/estruturas usam coordenadas estimadas (Bloco 7). PENDENTES: integracao com o jogo (Bloco 9), visao, itens de selva, dano de habilidade em estruturas, Toque do Vazio.
## Bloco 9 — integração com o jogo (index.html)
- `node ferramentas/build_motor.js` empacota `src/engine` (CommonJS) + os dados do patch dos 8 campeões com kit (itens, regras, monstros, minions, estruturas) em **`motor.js`** (~2 MB, gerado; faz parte do repositório porque o jogo é estático e não tem build). `index.html` o carrega com `<script src="motor.js" onerror>`: se o arquivo faltar, o jogo funciona só com o motor clássico.
- `src/engine/integracao/adapter.js` (sem DOM, sem `Math.random`) conduz uma partida do motor (`create`, `advance`, `snapshot`, `drainLog`, `setStyle`) e entrega o estado no formato que a tela já lê: posições em %, vida 0..1, estruturas vivas, objetivos, KDA, log em português.
- Em `index.html` (seção "motor realista"): `engInit` (chamado no fim de `lvInit`) decide o motor; `engSecond` substitui `lvSecond` e copia o snapshot para `LV` (`pp`, `kd`, `str`, `st`, `dt`, `dn`, `log`); o fim de mapa passa por `lvGameEnd`, então séries MD3/MD5, Fearless, histórico e modo jogador seguem o mesmo caminho do motor clássico. As instruções dos checkpoints (Agressivo/Equilibrado/Controle) viram o estilo da IA (Agressivo/Macro/Reativo).
- **Opt-in**: Opções → "Motor da partida" (Clássico / Realista beta; padrão Clássico, `S.opt.eng`). O motor realista só é usado quando todos os campeões escolhidos têm kit (hoje 8); sem draft, entram os campeões padrão do papel. Qualquer outro caso cai no motor clássico (decisão D2/D5 do plano).
- Atributos dos jogadores: do rating `p.r` + viés por função (`RBIAS`); no modo jogador, os atributos reais da carreira (`S.pc.at`).
- Limitações declaradas: 8 kits escritos à mão + 165 rascunhos gerados do patch (docs/KITS_AUTO_16.22.1.md); as camadas do motor clássico que não existem no realista (vigias, invasões, `LV.ev` detalhado) ficam zeradas na tela de fim de mapa; o motor clássico só roda se o usuário escolher; o mapa dos pontos de jogador usa as coordenadas estimadas do Bloco 7.

## Atualizações pós-Bloco 9
- **Suprimentos** (`items/supplies.js`, `ai/supply_ai.js`): kit inicial por função, poções, sentinelas, Sentinela de Controle, Lente do Oráculo (docs/ITENS_COMPRA_LEAGUEOFGRAPHS.md). Teste: `engine_suprimentos.js`.
- **Kits automáticos** (`champion/kits/auto.json`, gerado por `ferramentas/dados/gerar_kits_auto.js`): 165 rascunhos validados contra os dados do patch; os 8 kits manuais têm prioridade. Cobertura e lacunas: docs/KITS_AUTO_16.22.1.md. Teste: `engine_kits_auto.js`.
- **Mapa 3D** na partida ao vivo (`lib/lv3d.js` + `lib/three.min.js`, carregados sob demanda): botão "Mapa 3D/2D"; só desenha o estado do jogo. Arraste gira, Shift/botão direito move, roda aproxima, duplo clique restaura.
- **Barras de vida** no mapa: torre da frente de cada rota e monstros da selva (snapshot do adaptador: `hpS`, `mons`).
- **Bloco 10** (`ferramentas/balanceamento.js`): simulação em massa paralela e relatório em docs/BLOCO10_BALANCEAMENTO.md.
