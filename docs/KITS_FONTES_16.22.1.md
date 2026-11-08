# Fontes dos kits — patch 16.22.1

Gerado por `node ferramentas/dados/kits_info.js` (arquivo de dados: `data/16.22.1/kits_info.json`).

- **Campeões:** 173 · **habilidades (P/Q/W/E/R):** 865
- **Patch (números):** cliente + Data Dragon, o mesmo usado pelo motor (recarga, custo, alcance, raio, largura, míssil, DataValues e cálculos oficiais).
- **Wiki (estrutura):** Meraki Analytics, dados estruturados da Wiki do LoL, **patch mais antigo** (`wikiPatch` por campeão); só forma, alvo, tipo de dano, controles e mobilidade. Nunca números.
- **Sem dados da Wiki:** Locke, Zaahen
- **Habilidades sem chave no patch:** nenhuma
- **Divergência de tipo de dano patch x Wiki:** 9 (BriarQ, IvernR, ShyvanaQ, SmolderW, SmolderE, TristanaE, TwitchE, VarusE, ZeriW) — o patch vence; a divergência vira `avisos` do campeão.

## Controles de grupo e mobilidade encontrados (Wiki)
slow 236 · untargetable 186 · cleanse 135 · root 113 · stun 100 · blind 92 · knockup 67 · knockback 53 · pull 52 · ground 47 · fear 29 · silence 23 · suppress 18 · polymorph 11 · taunt 11 · sleep 11 · disarm 9 · charm 7

## Tipos de alvo (Wiki)
Auto 187 · Direction 175 · Passive 170 · Location 127 · Unit 115 · Direction / Auto 23 · Proximity 10 · Auto / Direction 8 · Location / Auto 6 · Direction / Location 5 · Unit / Auto 4 · Location / Unit 4 · Vector 4 · Unit / Direction 3 · Auto / Location 3 · Auto / Unit 2 · N/A 1 · direction 1 · Direction / Proximity 1 · location 1 · unit 1 · Varied 1 · Unit / Location 1 · Unit / Proximity 1 · auto 1

Limite: a detecção de controle/mobilidade é por palavras na descrição da Wiki (inglês); serve para planejar e conferir os kits, não substitui a leitura do tooltip ao escrever cada kit.
