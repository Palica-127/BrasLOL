# Cobertura de campeões e habilidades — patch 16.22.1

Gerado por `node ferramentas/testes/engine_campeoes.js --relatorio`.

- **Kits implementados (onda 1):** Garen, Annie, Ahri, Ezreal, Leona, Amumu, Malphite, Morgana
- **Cálculos oficiais avaliáveis:** 1277 de 1442 (88.6%), nível 11, rank 3 (ou o máximo), atributos de teste.
- **Campeões com todos os cálculos avaliáveis:** 96 de 173.

## O que o avaliador ainda NÃO suporta (lança erro explícito; nunca chuta)

| Motivo | Ocorrências |
|---|---|
| mStat 8 | 31 |
| mInitialBonusPerLevel (semantica nao validada) | 25 |
| mStat 9 | 23 |
| {hash} | 15 |
| mBonusPerLevelAtAndAfter (semantica nao validada) | 15 |
| GameCalculationConditional | 10 |
| CooldownMultiplierCalculationPart | 9 |
| AbilityResourceByCoefficientCalculationPart | 8 |
| breakpoints sem mLevel1Value | 5 |
| mStat 29 | 3 |
| mStat 14 | 3 |
| mEffectAmount[1] | 2 |
| PercentageOfBuffNameElapsed | 2 |
| ByCharLevelFormulaCalculationPart | 2 |
| mStat 18 | 1 |
| DataValue GravityIncPerBreakpoint | 1 |
| mStat 15 | 1 |
| mEffectAmount[2] | 1 |
| mStat 10 | 1 |
| mStat 13 | 1 |
| mStatFormula 1 | 1 |
| DataValue ModesBonusMaxTraps | 1 |
| mStat 16 | 1 |
| DataValue PulseBaseDamage | 1 |
| DataValue BonusDamageMultiplier | 1 |
| mStat 31 | 1 |

Códigos de atributo confirmados pelos nomes dos dados: ausente=AP, 1=armadura, 2=AD, 4=vel. de ataque, 6=RM, 7=vel. de movimento, 12=vida máxima. Os demais (3, 5, 8, 9, 10, 14, 15, 18, 29, 31...) serão adicionados quando houver evidência nos dados.
