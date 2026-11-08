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
