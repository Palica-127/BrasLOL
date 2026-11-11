# Motor clássico: kits e calibração (Bloco 10c)

O jogo tem um único motor de partida ao vivo: o clássico (`lv*` no `index.html`). O motor realista foi removido (ver `docs/arquivo_realista/`). Tudo abaixo é ESTIMADO (sem fonte citável), calibrado contra alvos de ligas profissionais que também são estimativas.

## Kits no clássico
- **Perfil de combate** (`KITP`, gerado por `node ferramentas/dados/gerar_perfil_classico.js`): para cada um dos 173 campeões, cinco valores de 0 a 9 (explosão, controle, sustentação, mobilidade, alcance) contados a partir da estrutura dos kits (8 manuais + 165 rascunhos em `ferramentas/dados/fontes/`) e misturados 35% com o `info` do Data Dragon.
- **Uso nas lutas** (`lvBrawl`): poder individual (explosão e sustentação), vantagem de controle de equipe e chance de fuga/perseguição. Pesos `KPW`, `KCC`, `KESC`, `KCH`.
- **Ficha do campeão** (Meta > Campeões): barras do perfil, habilidades (Q/W/E/R/passiva com recarga e texto pt_BR) e build sugerida (`chKitHtml`). As builds são escritas à mão (`fontes/curated.js`), não são estatística do patch.
- **Itens** (Meta > Itens) agora vêm de `itens.js` (extraído do `motor.js` antes da remoção).

## Melhorias portadas
- **Economia**: CS por funcao (`LVRCS`) e XP (`LVXPR`) ajustados para ~8–9 CS/min nas rotas e nível final ~13.
- **Selva**: `JGM` (ouro x1,7, XP x2,6, 9 CS por acampamento) compensa o ritmo de limpeza do caçador.
- **Lutas**: letalidade `LVLET` e chance base de fuga `LVESC`; valor do Barão `LVOBV.b`.
- **Lanes**: preparo de onda 80 s antes de dragão (rota inferior) e Barão (rota superior) por quem está na frente em ouro (`lvPrepLane`); o ADC pouco móvel (kit) roda para o meio com mais frequência; ADC móvel pode fazer split depois dos 14 min.
- Gank seletivo **não** foi portado: o clássico já converte 39% dos ganks (4,7 certos contra 7,3 errados por jogo).

## Medição (`node ferramentas/balanceamento_classico.js 100 rotulo`)
| Métrica | Antes | Depois | Alvo |
|---|---|---|---|
| CS/min topo / meio / atirador | 3,7 / 2,9 / 3,4 | 8,6 / 8,7 / 7,5 | 7,6–9,8 / 8–9,4 / 8,3–9,8 |
| CS/min selva | 2,7 | 5,5 | 5,8–7,4 |
| Nível final médio | 11,7 | 12,7 (laners e caçador ~13,5; suporte 9,7) | 14–18 |
| Ouro/min por jogador | 288 | 375 | 330–430 |
| Abates/min | 1,32 | 1,23 | 0,75–1,15 |
| Barões / Arautos | 1,58 / 0,42 | 1,69 / 0,61 | 0,5–1,2 / 0,7–1,6 |
| Torres caídas | 8,3 | 9,0 | 12–18 |
| Duração (min) | 27,7 | 27,9 | 29–35 |
| Vitórias do lado azul | 0,46 | 0,47 | 0,46–0,54 |

## Pendente
- Abates, Barões, torres e duração continuam fora da faixa: são propriedades estruturais do clássico (vitória rápida após o Barão).
- Nível médio abaixo de 14 por causa do suporte.
- Não foi possível ver a ficha no navegador neste ambiente; foi testado o HTML gerado (`ferramentas/testes/kits_classico.js`).
