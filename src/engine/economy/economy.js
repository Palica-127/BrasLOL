'use strict';
/* Economia (Bloco 5): ondas de minions, CS, ouro, experiência e níveis.
   DADOS: XP necessário por nível e XP de abate de campeão (rules.json, do cliente), XP/ouro/atributos base dos minions (minions.json), intervalos de ondas.
   WIKI (referência, não existem nos dados extraídos): ouro passivo 20,4 a cada 10 s a partir de 1:50; recompensa base de abate 300; primeiro abate +100.
   ESTIMADO (declarado): divisão do XP entre campeões próximos (âncoras da Wiki: 1 campeão = 100%, 5 campeões = 21,7% cada; intermediários interpolados),
   ouro de assistência (metade da recompensa dividida entre assistentes). PENDENTE: bônus por sequência/encerrar sequência, multiplicador de XP por diferença de nível,
   tempo de morte/renascimento (Bloco 7/9), minions super (precisam de inibidores, Bloco 7), empurrão de minions, ouro de torre/placas. */
const { xpToReach } = require('../champion/stats');
const M = require('./minions');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const WIKI = { passiveStart: 110, passivePer10s: 20.4, championBounty: 300, firstBlood: 100, assistShare: 0.5, xpShareTotalPerExtra: 0.02125 };
/* Recompensas por campeão (regra do projeto): base 300 (cai até 100 em mortes seguidas sem abate); bounty = sequência de abates [0,0,150,300,400,500,600,700]
   + 50 a cada 150 de ouro de farm acima da média do time rival; paga no máximo 700 por abate e o excedente fica para a próxima morte. Ouro de farm ~ 21 por CS. */
const BTY = [0, 0, 150, 300, 400, 500, 600, 700];
const xpShare = n => (n <= 0 ? 0 : (1 + WIKI.xpShareTotalPerExtra * (n - 1)) / n);        /* n=1 -> 1; n=5 -> 0,217 */

class Economy {
  constructor(w, { lanes, waves = true } = {}) {
    this.w = w; this.rules = w.rules; this.lanes = lanes || [{ a: { x: 400, y: 3000 }, b: { x: w.arena.w - 400, y: 3000 } }];
    this.waveN = 0; this.firstBlood = false; this.cs = {}; this.timeline = [];
    this.waveTimes = this.computeWaveTimes(3600);
    if (waves) this.waveTimes.forEach((t, i) => w.schedule(t, () => this.spawnWave(i, t)));
  }
  computeWaveTimes(end) {
    const R = this.rules.ondas_de_minions, out = []; let t = R.primeira_onda_s;
    while (t <= end) { out.push(t); const iv = R.intervalos.find(x => t >= x.de_s && (x.ate_s === null || t < x.ate_s)); t += iv.intervalo_s; }
    return out;
  }
  /* composição de uma onda: 3 melee + 3 caster; siege a partir de 1:30 (a cada 3 ondas até 14:00, a cada 2 até 25:00, depois toda onda) */
  composition(i, t) {
    let siege = false;
    if (t >= 90) { if (t < 900) siege = (i - 2) % 3 === 0; else if (t < 1500) siege = (i % 2 === 0) || false; else siege = true; }
    const c = { melee: 3, ranged: 3, siege: siege ? 1 : 0 };
    if (siege && t >= 840) c.melee = 2;                                              /* Wiki: 1 melee a menos quando o siege nasce depois de 14:00 */
    if (siege && t >= 1800) c.ranged = 2;                                            /* Wiki: 1 caster a menos depois de 30:00 */
    return c;
  }
  spawnWave(i, t) {
    const w = this.w, c = this.composition(i, t), gap = this.rules.ondas_de_minions.intervalo_entre_minions_s;
    this.waveN++; w.emit('wave', { n: i + 1, comp: c });
    this.lanes.forEach(lane => [0, 1].forEach(team => {
      const sup = w.structures && lane.id ? w.structures.consumeSuper(team, lane.id) : 0, order = [];     /* inibidor inimigo caido: super minion no lugar do siege (nunca junto) */
      for (let k = 0; k < c.melee; k++) order.push('melee'); const nSiege = sup ? 0 : c.siege; for (let k = 0; k < nSiege; k++) order.push('siege'); for (let k = 0; k < sup; k++) order.push('super'); for (let k = 0; k < c.ranged; k++) order.push('ranged');
      order.forEach((type, k) => w.schedule(w.t + k * gap, () => M.create(w, team, type, lane)));
    }));
  }

  /* ---------- XP e níveis ---------- */
  grantXp(u, xp, why) {
    if (!(xp > 0) || u.dead && why !== 'kill') return;
    u.xp += xp; u.stat.xp = (u.stat.xp || 0) + xp;
    while (u.level < 18 && u.xp >= xpToReach(this.rules, u.level + 1) - 1e-9) this.levelUp(u);
  }
  levelUp(u) {
    const w = this.w; u.level++; u.abil.points++;
    if (u.autoRank) w.autoRank(u);
    w.refresh(u); w.emit('levelup', { id: u.id, level: u.level });
  }
  giveGold(u, g, why) { if (!(g > 0)) return; u.gold += g; u.stat.goldEarned = (u.stat.goldEarned || 0) + g; this.w.emit('gold', { id: u.id, amount: +g.toFixed(2), why }); }

  /* penalidade de rota (ESTIMADO): o caçador que abate minions antes de completar o item de selva recebe menos ouro e XP */
  laneMul(u) { return u && u.smite && (u.jgStacks || 0) < 35 ? 0.5 : 1; }
  /* ---------- morte de minion / campeão ---------- */
  onMinionDeath(m, killer) {
    const w = this.w, sp = m.spec, foeTeam = 1 - m.team;
    if (this.farmClassico) { w.emit('minion-lost', { id: m.id, mtype: sp.type }); return; }          /* o farm vem do tempo na rota (update), nao do ultimo golpe */
    const near = w.units.filter(x => x.kind !== 'minion' && !x.dead && x.team === foeTeam && dist(x.pos, m.pos) <= sp.xpRadius);
    near.forEach(x => this.grantXp(x, sp.xp * xpShare(near.length) * this.laneMul(x), 'minion'));
    if (killer && killer.kind !== 'minion' && killer.team === foeTeam) {
      this.giveGold(killer, Math.max(0, sp.gold - (m.lane && m.lane.id === 'mid' && w.t < M.PARAMS.midGoldPenaltyUntil ? 1 : 0)) * this.laneMul(killer), 'cs'); killer.stat.cs = (killer.stat.cs || 0) + 1; w.emit('cs', { id: killer.id, mtype: sp.type });
    } else w.emit('minion-lost', { id: m.id, mtype: sp.type });
  }
  bountyOf(u) {
    const foes = this.w.units.filter(x => x.kind !== 'minion' && x.kind !== 'monster' && x.team !== u.team), farm = x => (x.stat.cs || 0) * 21;
    const avg = foes.reduce((a, x) => a + farm(x), 0) / Math.max(1, foes.length), fb = Math.floor(Math.max(0, farm(u) - avg) / 150) * 50;
    const tot = BTY[Math.min(7, u.streak || 0)] + fb + (u.cbty || 0);
    return { base: Math.max(100, 300 - 50 * (u.dsr || 0)), tot, pay: Math.min(700, tot) };
  }
  onChampionKill(dst, killer) {
    const w = this.w; if (!killer || killer.kind === 'minion' || killer.kind === 'monster') return;
    if (killer.smite) killer.jgStacks = (killer.jgStacks || 0) + 1;
    const assisters = Object.keys(dst.assisters || {}).map(Number).map(id => w.byId(id)).filter(x => x && x !== killer && x.kind !== 'minion' && x.team === killer.team && w.t - dst.assisters[x.id] < 10);
    const bt = this.bountyOf(dst); let bounty = bt.base + bt.pay; dst.cbty = bt.tot - bt.pay; dst.streak = 0; dst.dsr = (dst.dsr || 0) + 1; killer.streak = (killer.streak || 0) + 1; killer.dsr = 0;
    assisters.forEach(a => { a.dsr = Math.max(0, (a.dsr || 0) - 1); });
    if (bt.pay > 0) w.emit('bounty', { id: killer.id, victim: dst.id, amount: bt.pay });
    if (!this.firstBlood) { this.firstBlood = true; bounty += WIKI.firstBlood; w.emit('first-blood', { id: killer.id }); }
    this.giveGold(killer, bounty, 'kill');
    if (assisters.length) assisters.forEach(a => this.giveGold(a, WIKI.championBounty * WIKI.assistShare / assisters.length, 'assist'));
    const xp = this.rules.experiencia.xp_ao_matar_campeao_por_nivel[Math.min(dst.level, 18) - 1], group = [killer, ...assisters];
    group.forEach(x => this.grantXp(x, xp / group.length, 'kill'));
  }
  update() {
    const w = this.w;
    if (this.farmClassico && w.t >= 65) w.units.forEach(u => {
      if (u.dead || !u.farmRate || !(w.t - (u.farmAt || -9) < 0.7)) return;
      const cs = u.farmRate * 1.6 * w.dt * (0.9 + 0.2 * (u.level < 6 ? 0 : 1)), g = cs * 22;       /* taxas de CS/s por posicao e ouro por CS: mesmas do motor classico */
      u.stat.cs = (u.stat.cs || 0) + cs; u.gold += g; u.stat.goldEarned = (u.stat.goldEarned || 0) + g; this.grantXp(u, u.farmXp * 1.6 * w.dt, 'farm');
    });
    if (w.t >= WIKI.passiveStart) w.units.forEach(u => { if (u.kind !== 'minion' && !u.dead) this.giveGoldQuiet(u, WIKI.passivePer10s / 10 * w.dt); });
    if (w.tickN % Math.round(60 / w.dt) === 0) this.timeline.push({ t: Math.round(w.t), champs: w.units.filter(u => u.kind !== 'minion').map(u => ({ id: u.id, lvl: u.level, xp: Math.round(u.xp), gold: Math.round(u.stat.goldEarned || 0), cs: u.stat.cs || 0 })) });
  }
  giveGoldQuiet(u, g) { u.gold += g; u.stat.goldEarned = (u.stat.goldEarned || 0) + g; u.stat.passiveGold = (u.stat.passiveGold || 0) + g; }
}
function enable(w, opts) { w.econ = new Economy(w, opts); return w.econ; }
module.exports = { enable, Economy, WIKI, xpShare };
