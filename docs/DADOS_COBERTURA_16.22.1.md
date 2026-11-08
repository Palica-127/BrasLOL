# Cobertura dos dados — patch 16.22.1

Gerado em 2026-11-08 por `ferramentas/dados/gerar.js`; validado por `ferramentas/dados/validar.js`.

## Contagens

```json
{
 "campeoes": {
  "total": 173,
  "habilidadesQWER": 692,
  "calculos": 1226,
  "divergenciasStats": 0,
  "ddragonAdPorNivelZerado": 172,
  "dataValuesSemValores": 87,
  "calculosComReferenciaOrfa": 0
 },
 "itens": {
  "total": 863,
  "noMapa11": 315,
  "naLojaMapa11": 254,
  "comHabilidadeCdragon": 185,
  "divergenciasPreco": 0,
  "divergenciasStats": 0
 },
 "mundo": {
  "monstros": 28,
  "minions": 8,
  "estruturas": 3
 },
 "pendente": [
  "Cronometros de selva e objetivos (nascimento/respawn) - so em scripts da Riot; conferir via Wiki no Bloco 6",
  "HP/dano/armadura/RM de torres, inibidores e Nexus por tier, placas de torre - ver registros em structures.json e conferir na Wiki no Bloco 7",
  "Crescimento de stats de minions por onda e ouro/XP por tipo - Bloco 5",
  "Ouro passivo e ambient gold do mapa 11 (GameModeConstants possui varios modos; modo Classic precisa ser identificado)"
 ]
}
```

Campeões do jogo (CHMAP) com dados: **110/110**

## Resultado da validação

- Erros: **0**
- Avisos: **18**

  - avisos `habilidade`: 12
  - avisos `campeao`: 1
  - avisos `fonte-divergente`: 1
  - avisos `item`: 4

### Exemplos de avisos

- [habilidade] Annie E: recarga nao numerica
- [habilidade] Jayce W: recarga nao numerica
- [habilidade] Locke E: recarga nao numerica
- [habilidade] Lux Q: recarga nao numerica
- [habilidade] MasterYi W: recarga nao numerica
- [habilidade] Milio Q: recarga nao numerica
- [habilidade] Morgana Q: recarga nao numerica
- [habilidade] Nami W: recarga nao numerica
- [habilidade] Rell W: recarga nao numerica
- [habilidade] Sona W: recarga nao numerica
- [campeao] Udyr: passiva nao identificada
- [habilidade] Yunara W: recarga nao numerica
- [habilidade] Yuumi E: recarga nao numerica
- [fonte-divergente] Data Dragon 16.22.1 traz attackdamageperlevel=0 em 172 campeoes; o CommunityDragon (cliente) traz o valor real e e a fonte autoritativa para esse campo
- [item] 2008: sem nome (item fora da loja/mapa 11)
- [item] 226660: sem nome (item fora da loja/mapa 11)
- [item] 772139: sem nome (item fora da loja/mapa 11)
- [item] 772140: sem nome (item fora da loja/mapa 11)

## Fontes e proveniência

| Dado | Fonte (`src`) | Observação |
|---|---|---|
| Stats base/crescimento, ataque, tempos | `riot-cdragon` (+ `riot-ddragon` para conferência) | duas fontes oficiais conferidas entre si |
| Habilidades: recarga, custo, alcance, largura, velocidade de projétil, `DataValues`, `mSpellCalculations` | `riot-cdragon` | dados brutos do cliente; nomes de alguns campos aparecem como hash (`{xxxxxxxx}`) por não terem sido decodificados pela CommunityDragon |
| Nome/descrição/tooltip (pt_BR) | `riot-ddragon` | texto, não executável |
| Itens: stats, preço, receita | `riot-ddragon` + `riot-cdragon` | conferidos entre si |
| Itens: passivas/ativas (`habilidades`, `dados`, `calculos`) | `riot-cdragon` | lógica de execução será código (Bloco 4) |
| Monstros, minions, estruturas (registro-base) | `riot-cdragon` | HP/dano por tier e por tempo vêm de scripts — ver pendências |
| Curva de XP | `riot-cdragon` (map11) | |
| Fórmulas de resistência/penetração/crescimento; ondas de minions | `wiki` | a Wiki cita V26.01 para o ouro; conferir no Bloco 5 |

## Pendências conhecidas (nenhum valor foi inventado)

- Cronometros de selva e objetivos (nascimento/respawn) - so em scripts da Riot; conferir via Wiki no Bloco 6
- HP/dano/armadura/RM de torres, inibidores e Nexus por tier, placas de torre - ver registros em structures.json e conferir na Wiki no Bloco 7
- Crescimento de stats de minions por onda e ouro/XP por tipo - Bloco 5
- Ouro passivo e ambient gold do mapa 11 (GameModeConstants possui varios modos; modo Classic precisa ser identificado)

## Simplificações/observações

- `sru_atakhan` existe nos dados do cliente mas **não está** na lista de objetivos pedida; será avaliado no Bloco 6 se está ativo no patch.
- O jogo tem hoje 110 campeões; o patch tem 173. Os 110 estão todos cobertos (ver acima); os demais ficam disponíveis para as ondas do Bloco 2.