# data/<patch>/ — banco de dados do League of Legends (gerado, não editar à mão)

Gerar: `node ferramentas/dados/gerar.js 16.22.1` (usa cache em `ferramentas/dados/.cache/`; `--refresh` baixa de novo).
Validar: `node ferramentas/dados/validar.js 16.22.1 --relatorio` (escreve `docs/DADOS_COBERTURA_16.22.1.md`). Teste: `node ferramentas/testes/dados.js`.
Trocar de patch = rodar o gerador com outro número; nenhum código muda.

| Arquivo | Conteúdo | `src` |
|---|---|---|
| `champions.json` | índice dos 173 campeões | riot-ddragon |
| `champions/<Id>.json` | stats (`stats_ddragon`, `stats_cdragon`), textos pt_BR, `objetos_habilidade` (Q/W/E/R, passiva, mísseis, ataques básicos), `objetos_buff`, `habilidades_chaves` (Q,W,E,R -> chave em `objetos_habilidade`), `passiva_chaves` | riot-ddragon (texto) / riot-cdragon (mecânica) |
| `items.json` | 863 itens: preço, receita, tags, mapas, stats planos, `cdragon.{dados,calculos,habilidades}` das passivas/ativas | riot-ddragon + riot-cdragon |
| `monstros.json` `minions.json` `estruturas.json` | registro-base e objetos de habilidade/buff dos monstros da selva, objetivos, minions, torre/inibidor/Nexus | riot-cdragon |
| `rules.json` | curva de XP (Riot), fórmulas e ondas de minions (Wiki), lista de pendências | riot-cdragon / wiki |
| `meta.json` | patch, data, fontes, lacunas de download | — |

## Convenções do cliente (importantes para os próximos blocos)
- Arrays por rank (`cooldownTime`, `mana`, `DataValues[].values`): **o índice 0 é sentinela; o rank 1 está no índice 1**. Ex.: Q do Aatrox `[14,14,12,10,8,6,4]` → ranks 1–5 = 14/12/10/8/6.
- Alcance `25000` = "direcional, sem limite de conjuração"; o alcance real está em `castRangeDisplayOverride` ou no `mMissileSpec` do míssil.
- `mSpellCalculations` descreve a fórmula (partes `NamedDataValue`, `StatByNamedDataValue` com `mStat` = tipo de atributo, `ByCharLevelBreakpoints`...). Nomes de DataValue são comparados **sem diferenciar maiúsculas**.
- Alguns nomes de campo aparecem como hash `{xxxxxxxx}` (a CommunityDragon não os decodificou). Foram preservados como estão.
- `stats_ddragon.attackdamageperlevel` vem **zerado** em 16.22.1; use `stats_cdragon.dano_nivel`.
- O cliente mistura maiúsculas nos caminhos (`Fiddlesticks`/`FiddleSticks`); use `habilidades_chaves`.
- Campo omitido no cliente = 0 (crescimento zero).

## Proveniência
`riot-ddragon`, `riot-cdragon` = dados oficiais; `wiki` = Wiki do LoL (não oficial Riot); `codigo` = mecânica implementada; `estimado` = parâmetro de calibração; `simplificacao`. Nenhum valor estimado é gravado aqui.
