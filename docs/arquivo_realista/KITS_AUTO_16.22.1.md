# Kits automáticos — patch 16.22.1

Rascunhos gerados por `node ferramentas/dados/gerar_kits_auto.js` a partir de `data/16.22.1/kits_info.json` (patch + estrutura da Wiki). Arquivo: `src/engine/champion/kits/auto.json`.
Os **8 kits escritos à mão** (`kits/wave1.js`) têm prioridade; os outros **165** campeões usam estes rascunhos.

- **Habilidades com ação:** 519/660 (75 campeões com Q, W, E e R todas com ação).
- **Números:** sempre referências a DataValues/cálculos reais do patch; cada efeito é validado (resolve em todos os ranks/níveis, finito) antes de entrar.
- **Dano sem cálculo oficial:** usa `{dmg}` = DataValue base + razões AP/AD dos DataValues (declarado em `gaps`).
- **Fica de fora (declarado em `gaps` de cada kit):** passivas, reconjuração/transformação, cura, empurrão/puxão/provocação/sono/cegueira, escudo/velocidade misturados a dano, efeitos de invocação. Refinar à mão os mais jogados.

## Formas de habilidade
| forma | habilidades |
|---|---|
| skillshot | 187 |
| target | 97 |
| selfAoe | 89 |
| area | 53 |
| dash | 44 |
| self | 20 |
| cone | 12 |
| globalLine | 11 |
| targetAlly | 4 |
| blink | 2 |

## Lacunas mais comuns
| lacuna | ocorrências |
|---|---|
| cura não modelada | 260 |
| passiva não modelada | 165 |
| reconjuração/transformação não modelada (só a 1ª conjuração) | 154 |
| lentidão sem par valor+duração identificável | 113 |
| velocidade de movimento sem par valor+duração | 97 |
| sem efeito modelável (forma/valores); habilidade sem ação | 79 |
| controle root | 77 |
| controle blind | 56 |
| controle knockback | 49 |
| controle pull | 48 |
| controle ground | 43 |
| controle knockup | 41 |
| efeito damage não avaliável nos dados: descartado | 40 |
| controle stun | 34 |
| efeito sobre si (escudo/velocidade) misturado a dano: não aplicado nesta forma | 31 |
| dash sem distância/velocidade validada | 29 |
| escudo sem valor+duração identificável | 19 |
| controle silence | 17 |
| nenhum efeito validou; habilidade sem ação | 17 |
| recarga inválida em algum rank nos dados; habilidade sem ação | 16 |
| controle fear | 15 |
| controle suppress | 15 |
| dano sem DataValue/cálculo identificável | 14 |
| controle sleep | 10 |
| controle polymorph | 9 |
| controle taunt | 9 |
| efeito sobre si misturado ao dash: não aplicado | 7 |
| tipo de dano assumido magic (sem rótulo) | 6 |
| outras partes do dano não modeladas: MaxDamage | 5 |
| outras partes do dano não modeladas: MinionDamage | 4 |
| outras partes do dano não modeladas: EmpoweredDamage | 4 |
| outras partes do dano não modeladas: MaxDamageTooltip | 4 |
| outras partes do dano não modeladas: SecondaryDamage | 3 |
| outras partes do dano não modeladas: InitialDamage | 3 |
| outras partes do dano não modeladas: MegaTotalDamage | 3 |
| outras partes do dano não modeladas: TotalEmpoweredDamage | 3 |
| outras partes do dano não modeladas: DamagePerSecond | 3 |
| controle charm | 2 |
| outras partes do dano não modeladas: CritDamage | 2 |
| outras partes do dano não modeladas: QDamage | 2 |
| outras partes do dano não modeladas: WallDamage | 2 |
| outras partes do dano não modeladas: MissileDamage | 2 |
| efeito cc slow não avaliável nos dados: descartado | 2 |
| outras partes do dano não modeladas: TotalDamageCrit | 2 |
| outras partes do dano não modeladas: EmpoweredDamageTooltip | 2 |
| outras partes do dano não modeladas: SecondaryTargetDamage | 2 |
| outras partes do dano não modeladas: ReducedDamage | 2 |
| efeito dash não avaliável nos dados: descartado | 2 |
| outras partes do dano não modeladas: BasicDamage | 2 |
| outras partes do dano não modeladas: CriticalDamageCalc | 2 |
| outras partes do dano não modeladas: MaxDamageTotal | 2 |
| outras partes do dano não modeladas: ExplosionDamage | 2 |
| outras partes do dano não modeladas: QMinionDamage, QEdgeDamage | 1 |
| outras partes do dano não modeladas: E2DamageCalc | 1 |
| outras partes do dano não modeladas: Cast2DamageMin, Cast2DamageMax | 1 |
| outras partes do dano não modeladas: DamagePerBulletWithCrit | 1 |
| outras partes do dano não modeladas: AttackBonusDamage | 1 |
| outras partes do dano não modeladas: Calc_Damage_1_Max, Calc_Damage_1_Percent_Max, Calc_Damage_2_Max, Calc_Damage_2_Percent_Max, Calc_Damage_2_Min_Ratio, Calc_Damage_Monster_Flat_Bonus, Calc_Damage_Monster_Percent_Cap | 1 |
| outras partes do dano não modeladas: Calc_Damage_High | 1 |
| outras partes do dano não modeladas: TotalPassthroughDamage | 1 |
| outras partes do dano não modeladas: EmpoweredDamagePerSecondTooltipOnly | 1 |
| outras partes do dano não modeladas: MaxDamage, InfernumRBonusDamage | 1 |
| outras partes do dano não modeladas: DamagePerSecond, BurstBonusTrueDamageToChamps | 1 |
| outras partes do dano não modeladas: MaxDamageTooltip, ShockwaveDamage | 1 |
| outras partes do dano não modeladas: Q2DamageMax | 1 |
| outras partes do dano não modeladas: SecondaryTargetDamageMod | 1 |
| outras partes do dano não modeladas: MaxDamagePerStrikeTooltip | 1 |
| outras partes do dano não modeladas: FinalOnHitDamage | 1 |
| outras partes do dano não modeladas: PassiveDamage | 1 |
| outras partes do dano não modeladas: TotalAttackBonusDamage | 1 |
| outras partes do dano não modeladas: WallHitDamage | 1 |
| outras partes do dano não modeladas: DamageConversionPercentage, EmpoweredBonusDamage | 1 |
| outras partes do dano não modeladas: MonsterHealthDamageCap | 1 |
| outras partes do dano não modeladas: BonusPoisonedDamage | 1 |
| outras partes do dano não modeladas: RMonsterDamage | 1 |
| outras partes do dano não modeladas: RSmallMissileDamage | 1 |
| outras partes do dano não modeladas: HandleDamage | 1 |
| outras partes do dano não modeladas: MaximumDamage | 1 |
| outras partes do dano não modeladas: TotalMaxDamage | 1 |
| outras partes do dano não modeladas: MaxDamageAmpTooltip | 1 |
| outras partes do dano não modeladas: RPassiveTrueDamage | 1 |
| outras partes do dano não modeladas: SpiderlingTotalDamage | 1 |
| outras partes do dano não modeladas: TotalBonusDamage | 1 |
| dano só por DataValues base/razão (sem cálculo oficial) | 1 |
| outras partes do dano não modeladas: TotalPercentHealthDamageFeared | 1 |
| outras partes do dano não modeladas: DamageDone | 1 |
| outras partes do dano não modeladas: ActiveDamage, OnHitBuffDamage | 1 |
| outras partes do dano não modeladas: SmallSharkDamage | 1 |
| outras partes do dano não modeladas: PercentSuperQDamageTT, SuperQMonsterMaxDamageTotal | 1 |
| outras partes do dano não modeladas: MagicDamageReduction, PhysicalDamageReduction, MaxTotalDamage | 1 |
| outras partes do dano não modeladas: PVEDamage | 1 |
| outras partes do dano não modeladas: OneWaveDamage, DeathsDaughterDamage | 1 |
| outras partes do dano não modeladas: DamageReduction | 1 |
| outras partes do dano não modeladas: TotalDetonationDamage | 1 |
| outras partes do dano não modeladas: FalloffDamage | 1 |
| outras partes do dano não modeladas: FinalSwipeDamage, MaxDamage | 1 |
| outras partes do dano não modeladas: MaxDamage, TotalDamage3, TotalDamage5 | 1 |
| outras partes do dano não modeladas: MinionDamage, RampageBonusDamagePerc | 1 |
| outras partes do dano não modeladas: DamageBeam | 1 |
| outras partes do dano não modeladas: Damage, ExtraHitDamage, ExtraHitDamageMinions | 1 |
| outras partes do dano não modeladas: QUltDamageBeam, WUltDamage, WUltTotalDamage, EUltDamage | 1 |
| outras partes do dano não modeladas: Tooltip_QWDamage, Tooltip_QWBonusDamage, Tooltip_QEDamage, Tooltip_QEDamagePerSecond | 1 |
| outras partes do dano não modeladas: Tooltip_WWShieldAmount, Tooltip_WWStartShieldAmount | 1 |
| outras partes do dano não modeladas: Tooltip_EWDamage, Tooltip_EEDamage | 1 |
| outras partes do dano não modeladas: DamageOverTime, TotalMaxDamage | 1 |
| outras partes do dano não modeladas: DamageIncreaseTooltip | 1 |
| outras partes do dano não modeladas: MaxDamageCalc | 1 |
| outras partes do dano não modeladas: TotalAllyDamage | 1 |
| outras partes do dano não modeladas: ExtraDamagePerSecondCharged, MaxDamage | 1 |
| outras partes do dano não modeladas: FinalDamage | 1 |
| outras partes do dano não modeladas: MaxDamage, MaxPercentHealthDamage, MonsterDamageCap | 1 |
| outras partes do dano não modeladas: SwingDamageTotal, FinalDamage | 1 |
| outras partes do dano não modeladas: DamageMax | 1 |
| outras partes do dano não modeladas: MaxDamageTotal, MaxDamageDisplay | 1 |
| outras partes do dano não modeladas: AdditionalDamage | 1 |
| outras partes do dano não modeladas: RQImpactDamage | 1 |
| outras partes do dano não modeladas: QSingleTargetDamage | 1 |
| outras partes do dano não modeladas: ActiveDamage | 1 |
| outras partes do dano não modeladas: BonusDamage | 1 |
| outras partes do dano não modeladas: DamageCalc, ADDamageCalc, TotalADDamageCalc | 1 |
| outras partes do dano não modeladas: ActiveTotalExecuteDamage | 1 |
| outras partes do dano não modeladas: DarkinPercentDamage, DarkinFlatDamage | 1 |
| outras partes do dano não modeladas: SlayerDamage | 1 |
| outras partes do dano não modeladas: TotalDamageActive, TotalDamagePassiveCrit | 1 |
| outras partes do dano não modeladas: BaseDamage | 1 |
| outras partes do dano não modeladas: PercentWolfDamage | 1 |
| outras partes do dano não modeladas: BaseBiteDamage, PercentBiteDamage | 1 |
| outras partes do dano não modeladas: TotalYankDamage, DismountedQDamage | 1 |
| outras partes do dano não modeladas: MaximumChargeDamage | 1 |
| outras partes do dano não modeladas: BaseDamageCalc, MaxDamageCalc | 1 |
| outras partes do dano não modeladas: MarkDamage, BonusMinionDamage | 1 |
| outras partes do dano não modeladas: DelayedDamage | 1 |
| outras partes do dano não modeladas: RQ1Damage, RQ2Damage, RE1Damage, RE2Damage | 1 |
| outras partes do dano não modeladas: InitialDamage, EmpoweredDamage | 1 |
| outras partes do dano não modeladas: BonusTrueDamage | 1 |
| outras partes do dano não modeladas: FlatDamageSweetSpot | 1 |
| outras partes do dano não modeladas: OnHitDamage | 1 |
| outras partes do dano não modeladas: DamagePerBullet | 1 |
| outras partes do dano não modeladas: BonusMissileDamage | 1 |
| outras partes do dano não modeladas: ZoneDamageTooltip | 1 |
| outras partes do dano não modeladas: SubesquentDamage, SingleTotalDamage, SingleCritTotalDamage | 1 |
| outras partes do dano não modeladas: AreaDamagePerSecond | 1 |
| outras partes do dano não modeladas: PassiveStackDamage, PassiveFlatDamage, UltStackDamage | 1 |
| outras partes do dano não modeladas: TotalDamagePerSecond | 1 |
| outras partes do dano não modeladas: PhysicalDamagePerWave, CritDamagePerWave | 1 |
| outras partes do dano não modeladas: BonusDamageTT | 1 |
| outras partes do dano não modeladas: TotalDamageMonsters | 1 |
| outras partes do dano não modeladas: DamagePerSecondTotal, PercentHPDamageTT | 1 |
| outras partes do dano não modeladas: TotalMinDamageSecondCast, TotalBleedDamage, TotalMaxDamageSecondCast | 1 |
| outras partes do dano não modeladas: TotalDamageSecondSlash | 1 |
| outras partes do dano não modeladas: PackmateDamage | 1 |
| outras partes do dano não modeladas: SecondDamage | 1 |
| outras partes do dano não modeladas: HumanMaximumDamage | 1 |
| outras partes do dano não modeladas: TotalSwipeDamage, TotalTakedownDamage | 1 |
| outras partes do dano não modeladas: AttackTotalDamageTooltip | 1 |
| outras partes do dano não modeladas: DamagePerTickCalc, DamagePerTickCalcTooltip | 1 |
| outras partes do dano não modeladas: MaximumSnowballDamage | 1 |
| outras partes do dano não modeladas: TotalRootDamage | 1 |
| outras partes do dano não modeladas: MaximumDamage, MinDamage | 1 |
| efeito shield não avaliável nos dados: descartado | 1 |
| outras partes do dano não modeladas: TotalMonsterDamageCap | 1 |
| outras partes do dano não modeladas: HoldDamageCalc, EmpoweredDamageCalc, ExecuteDamageCalcModified | 1 |
| outras partes do dano não modeladas: EmpoweredDamageMultCalcModified, MaxHealthDamageCalc | 1 |
| outras partes do dano não modeladas: ShieldDamageCalc, EmpoweredDamageCalc | 1 |
| outras partes do dano não modeladas: DamageCalc | 1 |
| outras partes do dano não modeladas: HalfDamage | 1 |
| outras partes do dano não modeladas: RADDamage, RLethalityDamage, RBaseDamage, ReducedDamageFinal | 1 |
| outras partes do dano não modeladas: EnchantedDamage, VanillaDamage, FalloffDamage | 1 |
| outras partes do dano não modeladas: CleaveDamage, TremorDamage | 1 |
| outras partes do dano não modeladas: MissingHealthDamageRock | 1 |
| outras partes do dano não modeladas: TotalDamageMonster | 1 |
| outras partes do dano não modeladas: RecastDamageTooltip | 1 |
| outras partes do dano não modeladas: InitialDamageCalc, TooltipMaxDamageCalc | 1 |
| outras partes do dano não modeladas: BurrowDamageTooltip | 1 |
| outras partes do dano não modeladas: EmpoweredDamageCalculation | 1 |
| outras partes do dano não modeladas: DismountDamage | 1 |
| outras partes do dano não modeladas: PercentHealthDamageCap | 1 |
| outras partes do dano não modeladas: BasicTotalDamage, EmpTotalDamage | 1 |
| outras partes do dano não modeladas: QBonusDamage, EmpoweredQTotalDamage | 1 |
| outras partes do dano não modeladas: BonusMonsterDamage, TotalDamageEmpowered | 1 |
| outras partes do dano não modeladas: MinionDamage, EmpoweredDamage | 1 |
| outras partes do dano não modeladas: EmpDamage | 1 |
| outras partes do dano não modeladas: SecondHitDamageTooltip | 1 |
| outras partes do dano não modeladas: MinorDamageTooltip | 1 |
| outras partes do dano não modeladas: BonusEnemyMaxHealthDamage | 1 |
| outras partes do dano não modeladas: DamageConversion, MaxDamage | 1 |
| outras partes do dano não modeladas: MaxHealthDamageCalc | 1 |
| outras partes do dano não modeladas: QCritDamageMod | 1 |
| outras partes do dano não modeladas: AoEDamage | 1 |
| outras partes do dano não modeladas: TotalExecuteDamage | 1 |
| outras partes do dano não modeladas: AoEDamage, ExplosionTotalDamage | 1 |
| outras partes do dano não modeladas: TowerDamageCalc | 1 |
| outras partes do dano não modeladas: Calc_Max_Health_Damage, Calc_Dragon_Form_Damage | 1 |
| outras partes do dano não modeladas: DamagePerSecond, Calc_Dragon_Damage, Calc_Max_Health_Damage, Calc_Max_Health_Dragon_Damage | 1 |
| efeito cc fear não avaliável nos dados: descartado | 1 |
| outras partes do dano não modeladas: PreCritDamage | 1 |
| outras partes do dano não modeladas: FirstTargetDamage, TotalMaxDamage | 1 |
| outras partes do dano não modeladas: TooltipOnly_TotalSweetspotDamage | 1 |
| outras partes do dano não modeladas: TotalOnHitDamage, TotalStaccatoDamage | 1 |
| outras partes do dano não modeladas: ExtraBoltDamage, MaxDamage | 1 |
| outras partes do dano não modeladas: DemonflareDamageTotal | 1 |
| outras partes do dano não modeladas: PassiveBonusDamage | 1 |
| outras partes do dano não modeladas: MinDamageCalc, MaxDamageCalc | 1 |
| outras partes do dano não modeladas: BigRockDamage, MaxDamageTooltip, TotalBonusFlatMonsterDamage | 1 |
| outras partes do dano não modeladas: DetonationDamage, MaxDetonationDamageTooltip | 1 |
| outras partes do dano não modeladas: CriticalDamage | 1 |
| outras partes do dano não modeladas: TotalReturnDamage | 1 |
| outras partes do dano não modeladas: TickCalculatedDamage, ImpactCalculatedDamage | 1 |
| outras partes do dano não modeladas: PAttackDamageMin, PAttackDamageMax | 1 |
| outras partes do dano não modeladas: PassiveDamage, ActiveMaxDamage | 1 |
| outras partes do dano não modeladas: BlueDamage, GoldDamage, ttBlueDamage, ttRedDamage, ttGoldDamage | 1 |
| outras partes do dano não modeladas: PhysicalDamagePerStack, MagicDamagePerStack, MaxPhysicalDamage | 1 |
| outras partes do dano não modeladas: Q2TotalOnHitHPDamage, LightningDamageToMinionsMin | 1 |
| outras partes do dano não modeladas: PulseDamage, DamageToMinions_Scaling | 1 |
| outras partes do dano não modeladas: EmpoweredDamageTT | 1 |
| outras partes do dano não modeladas: RecastDamageCalc | 1 |
| outras partes do dano não modeladas: SecondAttackDamage, HealthCritDamage | 1 |
| outras partes do dano não modeladas: AttackTotalDMG | 1 |
| outras partes do dano não modeladas: AftershockDamage | 1 |
| outras partes do dano não modeladas: SubsequentBurstDamage | 1 |
| outras partes do dano não modeladas: CalculatedDamage, MonsterDamageCap | 1 |
| outras partes do dano não modeladas: SweetSpotDamageTooltip | 1 |
| outras partes do dano não modeladas: MultiHitDamage | 1 |
| outras partes do dano não modeladas: SweetSpotTotalDamage | 1 |
| outras partes do dano não modeladas: TooltipTotalDamage | 1 |
| outras partes do dano não modeladas: ThrustDamage | 1 |
| outras partes do dano não modeladas: BonusDamagePerStack | 1 |
| outras partes do dano não modeladas: MinimumDamageMinions, MonsterDamageCap | 1 |
| outras partes do dano não modeladas: TooltipDamage | 1 |
| outras partes do dano não modeladas: Calc_MinimumDamage, Calc_MonsterCapDamage | 1 |
| outras partes do dano não modeladas: Calc_Passive_Damage, Calc_Damage_Spread | 1 |
| outras partes do dano não modeladas: Calc_Damage_Per_Second, Calc_Minion_Damage_Mod | 1 |
| outras partes do dano não modeladas: TotalMissileDamageEmpowered, OnHitDamageCalc | 1 |
| outras partes do dano não modeladas: TotalSingleTargetDamage | 1 |
| outras partes do dano não modeladas: SecondHitDamage | 1 |
| outras partes do dano não modeladas: BonusDamageCalc | 1 |
| outras partes do dano não modeladas: DamagePerSubsequentBounce, MaxDamageTooltip | 1 |
| outras partes do dano não modeladas: PassThroughDamage | 1 |
| outras partes do dano não modeladas: ActiveDamageThatCanCrit, CurrentCritDamage, PassiveMaxDamage | 1 |
| outras partes do dano não modeladas: TotalBonusDamage, ChainPhysicalDamage | 1 |
| outras partes do dano não modeladas: BreakDamageTooltip | 1 |
