'use strict';
/* ONDA 1 de kits: 8 campeões que cobrem as primitivas do motor (skillshot linear, projétil mirado, cone, área, dash/blink,
   escudo, controle de grupo, ataque empoderado, aura, invocação, execução, reconjuração, passivas de pilha/marca).
   Cada kit é DADO: descreve O QUE a habilidade faz usando nomes REAIS de DataValues/cálculos do patch ({dv}, {calc}).
   Números nunca são escritos aqui; geometria (alcance, largura, raio, velocidade do míssil, tempo de conjuração) vem dos dados.
   O motor de combate (Bloco 3) interpreta estes efeitos no mundo. `gaps` lista o que os dados oficiais ainda não deixam avaliar.
   Tipos de efeito: damage, shield, heal, cc, buff, debuff, dash, blink, empower (próximo ataque), aura, summon, execute,
   recast, resetCooldown, passive, mark, ms (velocidade de movimento).  Tipos de dano: physical | magic | true. */
const dv = n => ({ dv: n }), calc = n => ({ calc: n });

module.exports = [
  { id: 'Garen',
    P: { effects: [{ t: 'passive', name: 'Perseverança', regen: { pctMaxHp: 'text:Vida total por segundo' }, unlessDamagedFor: dv('DamageTimer') }] },
    Q: { shape: 'self', effects: [
      { t: 'removeSlows' }, { t: 'ms', amount: dv('MovementSpeedAmount'), dur: dv('MovementSpeedDuration') },
      { t: 'empower', window: dv('AttackWindow'), onHit: [{ t: 'cc', kind: 'silence', dur: dv('SilenceDuration') }, { t: 'damage', calc: calc('TotalDamage'), type: 'physical' }] }] },
    W: { shape: 'self', effects: [
      { t: 'tenacity', amount: dv('UpfrontTenacity'), dur: dv('UpfrontDuration') }, { t: 'shield', calc: calc('TotalShield'), dur: dv('UpfrontDuration') },
      { t: 'damageReduction', amount: dv('DRPercent'), dur: dv('DRDuration') }] ,
      passive: { onKillStacks: dv('BuffCounterPerKill'), resistPerStack: dv('ResistGainOnKill'), max: dv('ResistMax') } },
    E: { shape: 'selfAoe', effects: [
      { t: 'aura', ticks: dv('NumTicks'), over: dv('Duration'), tickDamage: { calc: calc('TotalDamage'), type: 'physical' }, canCrit: true, critMod: dv('CritMod') },
      { t: 'debuff', stat: 'armor', pct: dv('ShredAmount'), stacksNeeded: dv('StacksToShred'), dur: dv('ShredDuration') }] },
    R: { shape: 'target', effects: [{ t: 'execute', type: 'true', base: dv('BaseDamage'), missingHealthRatio: dv('ExecuteDamage'), reveal: dv('RevealDuration') }] } },

  { id: 'Annie',
    P: { effects: [{ t: 'passive', name: 'Piromania', stacks: dv('MaxStacks'), onFull: { t: 'cc', kind: 'stun', dur: calc('StunDuration') } }] },
    Q: { shape: 'target', effects: [{ t: 'damage', calc: calc('TotalDamage'), type: 'magic' }, { t: 'refundManaOnKill', amount: 'cost' }] },
    W: { shape: 'cone', effects: [{ t: 'damage', calc: calc('TotalDamage'), type: 'magic' }] },
    E: { shape: 'targetAlly', effects: [
      { t: 'shield', calc: calc('ShieldBlockTotal'), dur: dv('ShieldDuration') }, { t: 'ms', amount: calc('MoveSpeedCalc'), dur: dv('MovementSpeedDuration') },
      { t: 'reflect', onHitBy: ['attack', 'ability'], damage: calc('DamageReturn'), type: 'magic' }] },
    R: { shape: 'area', effects: [
      { t: 'damage', calc: calc('InitialBurstDamage'), type: 'magic' },
      { t: 'summon', name: 'Tibbers', life: dv('TibbersLifetime'), aura: { calc: calc('TibbersAuraDamage'), type: 'magic' }, attack: { calc: calc('TibbersAADamage'), type: 'magic' },
        hp: calc('TibbersTotalHP'), resists: calc('TibbersTotalResists') }] },
    gaps: ['TibbersTotalHP', 'TibbersTotalResists'] },

  { id: 'Ahri',
    P: { effects: [{ t: 'passive', name: 'Roubo de Essência', healAfterMinionKills: dv('MaxStacks'), takedownWindow: dv('TakedownWindow') }] },
    Q: { shape: 'skillshot', proj: { pierce: true, returns: true }, effects: [{ t: 'damage', calc: calc('TotalDamage'), type: 'magic', leg: 'out' }, { t: 'damage', calc: calc('TotalDamage'), type: 'true', leg: 'return' }] },
    W: { shape: 'self', effects: [
      { t: 'ms', amount: dv('MovementSpeed'), dur: dv('MovementSpeedDuration') },
      { t: 'homingMissiles', count: 3, damage: { calc: calc('SingleFireDamage'), type: 'magic' }, extraHitFactor: dv('RepeatDamageMod'), life: dv('FlameDuration') }] },
    E: { shape: 'skillshot', effects: [{ t: 'damage', calc: calc('TotalDamage'), type: 'magic' }, { t: 'cc', kind: 'charm', dur: dv('CharmDuration'), interruptsDash: true }] },
    R: { shape: 'dash', effects: [
      { t: 'dash', dist: dv('RDashDistance'), speed: dv('RBaseDashSpeed') },
      { t: 'damage', calc: calc('RCalculatedDamage'), type: 'magic', maxTargetsPerCast: dv('RMaxTargetsPerCast') },
      { t: 'recast', casts: dv('RMaxCasts'), window: dv('RRecastWindow'), cooldown: dv('RDashCooldown') }] } },

  { id: 'Ezreal',
    P: { effects: [{ t: 'passive', name: 'Foco Ressonante', onAbilityHit: { t: 'buff', stat: 'attackSpeed', amount: dv('AttackSpeedPerStack'), maxStacks: dv('MaxStacks'), dur: dv('StackDuration') } }] },
    Q: { shape: 'skillshot', effects: [{ t: 'damage', calc: calc('Damage'), type: 'physical', onHit: true }, { t: 'resetCooldown', all: true, by: dv('CDRefund'), onHit: true }] },
    W: { shape: 'skillshot', effects: [{ t: 'mark', dur: dv('DetonationTimeout'), detonate: { t: 'damage', calc: calc('Damage'), type: 'magic' }, manaReturn: dv('ManaReturn') }] },
    E: { shape: 'blink', effects: [{ t: 'blink', range: 'spell' }, { t: 'homingMissile', damage: { calc: calc('Damage'), type: 'magic' }, prefers: 'markedByW' }] },
    R: { shape: 'globalLine', effects: [
      { t: 'damage', calc: calc('Damage'), type: 'magic', reducedPerHit: dv('DamageReductionPerHit'), minPct: dv('MinimumDamagePercent') },
      { t: 'damage', calc: calc('DamageMinionMonster'), type: 'magic', vs: 'minionMonster' }] } },

  { id: 'Leona',
    P: { effects: [{ t: 'mark', name: 'Luz do Sol', dur: dv('MarkDuration'), detonateByAlly: { t: 'damage', calc: calc('TotalDamage'), type: 'magic' } }] },
    Q: { shape: 'self', effects: [{ t: 'empower', onHit: [{ t: 'damage', calc: calc('TotalDamageTooltip'), type: 'magic' }, { t: 'cc', kind: 'stun', dur: dv('StunDuration') }] }] },
    W: { shape: 'self', effects: [
      { t: 'buff', stat: 'armor', amount: calc('BonusArmorTooltip'), dur: dv('ArmorMRDuration') }, { t: 'buff', stat: 'mr', amount: calc('BonusMRTooltip'), dur: dv('ArmorMRDuration') },
      { t: 'damageReduction', flat: dv('FlatDamageReduction'), maxPct: dv('FlatDamageReductionMax') },
      { t: 'damage', calc: calc('TotalDamageTooltip'), type: 'magic', when: 'end', ifEnemiesNear: true, extendsDuration: true }] },
    E: { shape: 'skillshot', proj: { dashToHit: true }, effects: [{ t: 'damage', calc: calc('TotalDamageTooltip'), type: 'magic' }, { t: 'dash', toLastChampionHit: true }, { t: 'cc', kind: 'root', dur: dv('RootDuration'), lastHit: true }] },
    R: { shape: 'area', effects: [
      { t: 'damage', calc: calc('ExplosionCalculatedDamage'), type: 'magic' }, { t: 'cc', kind: 'stun', dur: dv('CCDuration'), zone: 'center' },
      { t: 'cc', kind: 'slow', amount: dv('SlowPercent'), dur: dv('CCDuration'), zone: 'edge' }] } },

  { id: 'Amumu',
    P: { effects: [{ t: 'curse', onAttack: true, dur: dv('DebuffDuration'), magicToTrueFraction: dv('DamageAmp') }] },
    Q: { shape: 'skillshot', proj: { dashToHit: true }, effects: [{ t: 'damage', calc: calc('TotalDamage'), type: 'magic' }, { t: 'dash', speed: dv('DashSpeed'), toHit: true }, { t: 'cc', kind: 'stun', dur: dv('StunDuration') }] },
    W: { shape: 'toggleAura', effects: [{ t: 'aura', tickEvery: 1, damage: { calc: calc('TotalHealthDamage'), type: 'magic' } }] },
    E: { shape: 'selfAoe', textTypeIgnore: ['physical'] /* o texto oficial cita Dano Físico só na redução recebida */, effects: [
      { t: 'damageReduction', physicalFlat: calc('DamageReduction'), passive: true }, { t: 'damage', calc: calc('TantrumDamage'), type: 'magic' },
      { t: 'cooldownReductionWhenHit', seconds: dv('CDROnHit') }] },
    R: { shape: 'selfAoe', effects: [{ t: 'damage', calc: calc('RCalculatedDamage'), type: 'magic' }, { t: 'cc', kind: 'stun', dur: dv('RDuration') }, { t: 'curse' }] } },

  { id: 'Malphite',
    P: { effects: [{ t: 'passive', name: 'Muralha de Pedra', shield: 'text:10% da Vida maxima', renewsAfterNotHit: 'text:alguns segundos' }] },
    Q: { shape: 'target', effects: [{ t: 'damage', calc: calc('QDamageCalc'), type: 'magic' }, { t: 'cc', kind: 'slow', amount: dv('SpeedSteal'), dur: dv('SlowDuration'), stealsMoveSpeed: true }] },
    W: { shape: 'self', effects: [{ t: 'empower', attacks: 'window', window: dv('ThunderclapBuffDuration'),
      onHit: [{ t: 'damage', calc: calc('TotalBonusDamage'), type: 'physical' }, { t: 'splash', damage: calc('ThunderclapSplash'), range: dv('ThunderClapSplashRange') }] }] },
    E: { shape: 'selfAoe', effects: [{ t: 'damage', calc: calc('EDamageCalc'), type: 'magic' }, { t: 'debuff', stat: 'attackSpeed', pct: dv('ASReduction'), dur: dv('Duration') }] },
    R: { shape: 'dash', effects: [{ t: 'dash', toLocation: true, speed: 'spell' }, { t: 'damage', calc: calc('TotalDamage'), type: 'magic' }, { t: 'cc', kind: 'knockup', dur: dv('KnockupDuration') }] } },

  { id: 'Morgana',
    P: { effects: [{ t: 'passive', name: 'Espiritualidade', healFromDamage: dv('HealPercent') }] },
    Q: { shape: 'skillshot', effects: [{ t: 'damage', calc: calc('TotalDamage'), type: 'magic' }, { t: 'cc', kind: 'root', dur: dv('RootDuration') }] },
    W: { shape: 'area', effects: [{ t: 'aura', tickEvery: dv('TickRate'), over: dv('WDuration'), damage: { calc: calc('TotalMinDamage'), maxCalc: calc('TotalMaxDamage'), type: 'magic', scalesWithMissingHealth: dv('MissingHealthAmpPercent') } }] },
    E: { shape: 'targetAlly', effects: [{ t: 'shield', calc: calc('TotalShieldStrength'), dur: dv('ShieldDuration'), absorbs: 'magic', blocksCC: true }] },
    R: { shape: 'selfAoe', effects: [
      { t: 'damage', calc: calc('TotalDamage'), type: 'magic' }, { t: 'cc', kind: 'slow', amount: dv('SlowPercent'), dur: dv('ChainDuration') },
      { t: 'ms', amount: dv('HastePercent'), dur: dv('ChainDuration') }, { t: 'cc', kind: 'stun', dur: dv('StunDuration'), after: dv('ChainDuration'), ifStillInRange: true }] } }
];
