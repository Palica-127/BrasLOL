'use strict';
/* Atributos do campeão por nível.
   Fórmula de crescimento (Wiki do LoL): stat(n) = base + crescimento * (n-1) * (0,7025 + 0,0175 * (n-1)).
   Velocidade de ataque: AS = AS_base + razão * (bônus%/100), com bônus% = crescimento_por_nivel_fator + itens/buffs; teto 2,5 (Wiki).
   Velocidade de movimento: (base + plano) * (1 + %) com limites suaves 415 -> 80% e 490 -> 50% (Wiki).
   Fonte dos números do campeão: CommunityDragon (cliente); mana e regeneração: Data Dragon (o extrato do cliente não as traz). */
const growthFactor = n => (n - 1) * (0.7025 + 0.0175 * (n - 1));
const MAX_LEVEL = 18, AS_CAP = 2.5;

/* regra: ate 415 integral; 415-490 conta 80%; acima de 490 conta 50% */
function softCapMs(raw) {
  if (raw <= 415) return raw;
  if (raw <= 490) return 415 + (raw - 415) * 0.8;
  return 415 + 75 * 0.8 + (raw - 490) * 0.5;
}

/* mods = { flat:{hp,mana,ad,ap,armor,mr,ms,crit,lethality,abilityHaste,hpRegen5,manaRegen5}, pct:{as,ms,hp,ad,armor,mr}, bonusAS }
   (preenchido por itens/buffs nos blocos seguintes). Retorna {total,base,bonus} para os atributos que escalam habilidades. */
function computeStats(ch, level, mods) {
  level = Math.max(1, Math.min(MAX_LEVEL, level | 0));
  const f = (mods && mods.flat) || {}, p = (mods && mods.pct) || {};
  const c = ch.stats_cdragon, d = ch.stats_ddragon, g = growthFactor(level);
  const pair = (base, bonus) => ({ base, bonus, total: base + bonus });
  const hpB = c.vida + c.vida_nivel * g, mpB = d.mp + d.mpperlevel * g;
  const adB = c.dano + c.dano_nivel * g, arB = c.armadura + c.armadura_nivel * g, mrB = c.rm + c.rm_nivel * g;
  const hpBonus = (f.hp || 0) + (p.hp ? (hpB + (f.hp || 0)) * p.hp : 0);
  const asLevelBonus = c.vel_ataque_nivel * g / 100;                 /* fração */
  const asBonus = asLevelBonus + (p.as || 0);
  const asTotal = Math.min(AS_CAP, c.vel_ataque_base + c.vel_ataque_razao * asBonus);
  const msRaw = (c.velocidade_mov + (f.ms || 0)) * (1 + (p.ms || 0));
  return {
    level,
    hp: pair(hpB, hpBonus),
    mana: pair(mpB, f.mana || 0),
    hpRegen5: pair(d.hpregen + d.hpregenperlevel * g, f.hpRegen5 || 0),
    manaRegen5: pair(d.mpregen + d.mpregenperlevel * g, f.manaRegen5 || 0),
    ad: pair(adB, (f.ad || 0) + (p.ad ? adB * p.ad : 0)),
    ap: pair(0, f.ap || 0),
    armor: pair(arB, (f.armor || 0) + (p.armor ? arB * p.armor : 0)),
    mr: pair(mrB, (f.mr || 0) + (p.mr ? mrB * p.mr : 0)),
    as: { base: c.vel_ataque_base, ratio: c.vel_ataque_razao, bonus: asBonus, total: asTotal },   /* bonus em fracao */
    ms: { base: c.velocidade_mov, bonus: msRaw - c.velocidade_mov, total: softCapMs(msRaw) },
    range: c.alcance_ataque,
    crit: Math.min(1, f.crit || 0), critDamage: c.dano_critico,
    abilityHaste: f.abilityHaste || 0, lethality: f.lethality || 0
  };
}

/* XP acumulado necessário para atingir o nível n. A curva do cliente é cumulativa: [0]=280 (nível 2), [1]=660 (nível 3)... */
function xpToReach(rules, level) { return level <= 1 ? 0 : rules.experiencia.xp_para_subir_do_nivel[level - 2]; }
function levelFromXp(rules, xp) { let n = 1; while (n < MAX_LEVEL && xp >= xpToReach(rules, n + 1)) n++; return n; }

module.exports = { computeStats, growthFactor, softCapMs, xpToReach, levelFromXp, MAX_LEVEL, AS_CAP };
