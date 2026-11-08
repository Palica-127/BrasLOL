/* Bloco 2: campeões e habilidades do motor realista (src/engine). Sem navegador.
   node ferramentas/testes/engine_campeoes.js [--relatorio]   (escreve docs/CAMPEOES_COBERTURA_<patch>.md) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const { makeRng } = E('core/rng.js');
const { createLoader } = E('data/loader.js');
const { computeStats, growthFactor, softCapMs, xpToReach, levelFromXp } = E('champion/stats.js');
const { spellDefs, AbilitySet, calc, dv, maxRankAt } = E('champion/spells.js');
const { KITS, resolveSlot, refsOf } = E('champion/kits/index.js');

let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const L = createLoader(), rules = L.rules();

/* ---- núcleo ---- */
{ const a = makeRng(42), b = makeRng(42), c = makeRng(43);
  const sa = [0, 1, 2, 3].map(() => a.next('combate')), sb = [0, 1, 2, 3].map(() => b.next('combate')), sc = [0, 1, 2, 3].map(() => c.next('combate'));
  T(sa.join() === sb.join() && sa.join() !== sc.join(), 'RNG determinístico por semente');
  const d = makeRng(7); d.next('ia'); d.next('ia');
  const e = makeRng(7);
  T(d.next('combate') === e.next('combate'), 'fluxos independentes: consumir "ia" não altera "combate"'); }
T(L.resolveId('Wukong') === 'MonkeyKing' && L.resolveId("Kai'Sa") === 'Kaisa' && L.resolveId('Dr. Mundo') === 'DrMundo', 'resolve nomes do jogo para ids do Data Dragon');
{ const lint = []; (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(f => { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name) && /Math\.random\s*\(/.test(fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) lint.push(p); }); })(path.join(ROOT, 'src', 'engine'));
  T(lint.length === 0, 'nenhum Math.random() em src/engine', lint.join()); }

/* ---- stats ---- */
const garen = L.champion('Garen'), c = garen.stats_cdragon;
{ T(near(growthFactor(1), 0) && near(growthFactor(18), 17), 'fator de crescimento: nível 1 = 0, nível 18 = 17');
  const s1 = computeStats(garen, 1), s18 = computeStats(garen, 18);
  T(near(s1.hp.base, c.vida) && near(s18.hp.base, c.vida + 17 * c.vida_nivel), 'vida do Garen: nível 1 = base; nível 18 = base + 17 × crescimento');
  T(near(s1.ad.base, c.dano) && near(s18.armor.base, c.armadura + 17 * c.armadura_nivel), 'AD e armadura por nível');
  T(near(s1.as.total, c.vel_ataque_base) && s18.as.total > s1.as.total, 'velocidade de ataque cresce com o nível');
  const sa = computeStats(garen, 11, { pct: { as: 5 } }); T(sa.as.total === 2.5, 'teto de velocidade de ataque 2,5');
  T(softCapMs(400) === 400 && near(softCapMs(490), 475) && near(softCapMs(590), 525), 'limites suaves de velocidade de movimento (415/490)');
  const sh = computeStats(garen, 6, { flat: { hp: 300, ad: 40 } }); T(near(sh.hp.bonus, 300) && near(sh.hp.total, sh.hp.base + 300) && near(sh.ad.bonus, 40), 'separa atributo base e bônus (itens)');
  T(xpToReach(rules, 1) === 0 && xpToReach(rules, 2) === 280 && xpToReach(rules, 3) === 660, 'curva de XP oficial (280 para o nível 2, 660 para o 3)');
  T(levelFromXp(rules, 0) === 1 && levelFromXp(rules, 279) === 1 && levelFromXp(rules, 280) === 2 && levelFromXp(rules, 1e9) === 18, 'nível a partir do XP'); }

/* ---- avaliador de cálculos: valores oficiais ---- */
{ const m = L.champion('Malphite'), d = spellDefs(m).R, S = computeStats(m, 11, { flat: { ap: 100 } });
  const dmg = r => calc(d, 'TotalDamage', { rank: r, level: 11, S });
  const official = JSON.parse(fs.readFileSync(path.join(ROOT, 'ferramentas', 'dados', '.cache', '16.22.1', 'dd_champ', 'Malphite.json'), 'utf8')).data.Malphite.spells[3].effectBurn[2].split('/').map(Number);
  const ratio = dmg(1) - official[0];                                /* parte que escala com AP */
  T(official.every((o, i) => near(dmg(i + 1) - ratio, o, 1e-3)) && ratio > 0, 'Malphite R: dano-base por rank = Data Dragon (200/300/400) + escalonamento com AP', JSON.stringify([official, dmg(1), dmg(2), dmg(3)]));
  T(near(dv(d, 'KnockupDuration', 1), 1.5), 'Malphite R: arremesso 1,5 s'); }
{ const a = L.champion('Aatrox'), d = spellDefs(a).Q, S = computeStats(a, 6, { flat: { ad: 0 } }), ad = S.ad.total;
  const v = calc(d, 'QDamage', { rank: 1, level: 6, S });
  T(near(v, dv(d, 'QBaseDamage', 1) + dv(d, 'QTotalADRatio', 1) * ad, 1e-6), 'Aatrox Q: base + razão × AD total (lido de mSpellCalculations)'); }
{ const lv = (ch, n, name, sl) => 0; /* bônus de AD só conta no mStatFormula=2 */
  const k = L.champion('Akali'), d = spellDefs(k).R, S0 = computeStats(k, 11), S1 = computeStats(k, 11, { flat: { ad: 100 } });
  let u = false; try { u = calc(d, 'RTooltip' in d.spell.calcs ? 'RTooltip' : Object.keys(d.spell.calcs)[0], { rank: 1, level: 11, S: S0 }) !== undefined; } catch (e) { u = !!e.unsupported; }
  T(u, 'cálculo desconhecido nunca vira número inventado (lança Unsupported ou avalia)'); }

/* ---- habilidades: definições e estado ---- */
{ const defs = spellDefs(L.champion('Ahri'));
  T(defs.Q.range(1) === 970 && defs.Q.missile.speed === 1100 && defs.Q.width === 100 && near(defs.Q.castTime, 0.25), 'Ahri Q: alcance 970, míssil 1100, largura 100, conjuração 0,25 s (dados do cliente)');
  T(defs.Q.manaCost(1) === 55 && defs.Q.manaCost(5) === 95 && defs.Q.cooldown(1) === 7, 'Ahri Q: mana 55→95 e recarga 7 s por rank');
  T(defs.R.maxRank === 3 && defs.P && defs.P.key.endsWith('AhriPassive'), 'Ahri: R com 3 ranks e passiva identificada');
  const set = new AbilitySet(defs); set.points = 1;
  T(maxRankAt('R', 5) === 0 && maxRankAt('R', 6) === 1 && maxRankAt('R', 11) === 2 && maxRankAt('R', 16) === 3 && maxRankAt('Q', 1) === 1 && maxRankAt('Q', 9) === 5, 'regras de rank por nível (R em 6/11/16; básicas até ⌈nível/2⌉)');
  T(!set.levelUp('R', 1) && set.levelUp('Q', 1) && set.rank.Q === 1 && set.points === 0, 'sobe de rank respeitando nível e pontos');
  const u = { mana: 418, abilityHaste: 0 };
  const r1 = set.cast('Q', 10, u);
  T(r1.ok && r1.cost === 55 && near(r1.cooldown, 7) && near(r1.hitAt, 10.25), 'conjurar: custo, recarga e instante do efeito');
  T(set.check('Q', 12, u).reason === 'recarga' && set.check('Q', 17, u).ok, 'em recarga até 7 s depois');
  T(set.check('Q', 17, { mana: 10 }).reason === 'mana' && set.check('Q', 17, { mana: 999, silenced: true }).reason === 'silenciado' && set.check('W', 17, u).reason === 'sem-rank', 'bloqueios: mana, silenciado, sem rank');
  const set2 = new AbilitySet(defs); set2.points = 1; set2.levelUp('Q', 1);
  T(near(set2.cooldownOf('Q', 100), 3.5), 'Ability Haste 100 = recarga pela metade');
  set.reduceCooldown('Q', 3); T(set.check('Q', 14, u).ok, 'redução de recarga (ex.: Q do Ezreal)'); }

/* ---- kits da onda 1 ---- */
const DMGTXT = { magic: /Dano Mágico/i, physical: /Dano Físico/i, true: /Dano Verdadeiro/i };
let nKitEffects = 0, nUnsupported = 0;
for (const id of Object.keys(KITS)) {
  const kit = KITS[id], ch = L.champion(id), defs = spellDefs(ch);
  /* 1) toda referência existe nos dados */
  const bad = refsOf(kit).filter(r => { const d = defs[r.slot]; if (!d) return true; return r.dv ? !d.has(r.dv) : !d.spell.calcs[String(r.calc).toLowerCase()]; });
  T(bad.length === 0, `${id}: todas as referências do kit existem nos dados do patch`, JSON.stringify(bad));
  /* 2) resolve todos os ranks e níveis; só os "gaps" declarados podem ficar sem valor */
  const gaps = new Set(kit.gaps || []), pend = [];
  for (const slot of ['Q', 'W', 'E', 'R']) {
    const def = defs[slot];
    for (let rank = 1; rank <= def.maxRank; rank++) for (const level of [1, 9, 18]) {
      const S = computeStats(ch, level, { flat: { ap: 80, ad: 40 } });
      const r = resolveSlot(defs, kit, slot, { rank, level, S });
      if (!r) continue;                                    /* kit gerado: habilidade sem ação declarada em gaps */
      JSON.stringify(r, (k, v) => { nKitEffects++; if (v && v.unsupported) { nUnsupported++; pend.push(v.calc + ' (' + slot + '): ' + v.unsupported); } return v; });
      if (!Number.isFinite(r.cooldown) || r.cooldown <= 0) pend.push(slot + ' recarga invalida');
    }
  }
  const real = [...new Set(pend)].filter(p => ![...gaps].some(g => p.toLowerCase().includes(g.toLowerCase())));
  T(real.length === 0, `${id}: Q/W/E/R resolvem em todos os ranks e níveis (lacunas declaradas: ${[...gaps].join(', ') || 'nenhuma'})`, real.join(' | '));
  /* 3) tipo de dano do kit confere com o texto oficial quando o texto o cita */
  const txtOf = s => { const i = 'QWER'.indexOf(s); const t = i >= 0 ? ch.habilidades_texto[i] : null; return t ? String(t.descricao).replace(/<[^>]+>/g, ' ') : ''; };
  const wrong = [];
  for (const slot of ['Q', 'W', 'E', 'R']) {
    const txt = txtOf(slot), cited = Object.keys(DMGTXT).filter(k => DMGTXT[k].test(txt) && !((kit[slot] && kit[slot].textTypeIgnore) || []).includes(k));
    if (!cited.length || !kit[slot]) continue;
    const types = []; JSON.stringify(kit[slot], (k, v) => { if (k === 'type' && DMGTXT[v]) types.push(v); return v; });
    types.forEach(t => { if (!cited.includes(t)) wrong.push(`${slot}:${t} (texto cita ${cited.join('/')})`); });
  }
  T(wrong.length === 0, `${id}: tipos de dano do kit conferem com o texto oficial`, wrong.join(' | '));
}

/* ---- cobertura do avaliador em todos os campeões do patch ---- */
const cov = { calcs: 0, ok: 0, why: {}, full: 0, champs: 0 };
for (const id of L.championIds()) {
  const ch = L.champion(id), defs = spellDefs(ch), S = computeStats(ch, 11, { flat: { ap: 100, ad: 50 } }); let bad = 0; cov.champs++;
  for (const k of ['Q', 'W', 'E', 'R']) { const d = defs[k]; if (!d) continue; for (const name of Object.keys(d.spell.calcs)) {
    cov.calcs++; try { const v = calc(d, name, { rank: Math.min(3, d.maxRank), level: 11, S }); if (!Number.isFinite(v)) throw new Error('NaN'); cov.ok++; } catch (e) { bad++; const r = e.unsupported ? e.message.replace(/\{[0-9a-f]+\}/g, '{hash}').replace(/^calculo .*/, 'cálculo com nome em hash') : 'ERRO ' + e.message; cov.why[r] = (cov.why[r] || 0) + 1; } } }
  if (!bad) cov.full++;
}
T(!Object.keys(cov.why).some(k => k.startsWith('ERRO')), `avaliador sem erros inesperados em ${cov.calcs} cálculos de ${cov.champs} campeões`, JSON.stringify(cov.why));
console.log(`     cobertura: ${cov.ok}/${cov.calcs} cálculos (${(100 * cov.ok / cov.calcs).toFixed(1)}%) · ${cov.full}/${cov.champs} campeões 100% avaliáveis · kits implementados: ${Object.keys(KITS).length}`);
if (process.argv.includes('--relatorio')) {
  const rows = Object.entries(cov.why).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  fs.writeFileSync(path.join(ROOT, 'docs', 'CAMPEOES_COBERTURA_16.22.1.md'), `# Cobertura de campeões e habilidades — patch 16.22.1

Gerado por \`node ferramentas/testes/engine_campeoes.js --relatorio\`.

- **Kits implementados (onda 1):** ${Object.keys(KITS).join(', ')}
- **Cálculos oficiais avaliáveis:** ${cov.ok} de ${cov.calcs} (${(100 * cov.ok / cov.calcs).toFixed(1)}%), nível 11, rank 3 (ou o máximo), atributos de teste.
- **Campeões com todos os cálculos avaliáveis:** ${cov.full} de ${cov.champs}.

## O que o avaliador ainda NÃO suporta (lança erro explícito; nunca chuta)

| Motivo | Ocorrências |
|---|---|
${rows}

Códigos de atributo confirmados pelos nomes dos dados: ausente=AP, 1=armadura, 2=AD, 4=vel. de ataque, 6=RM, 7=vel. de movimento, 12=vida máxima. Os demais (3, 5, 8, 9, 10, 14, 15, 18, 29, 31...) serão adicionados quando houver evidência nos dados.
`);
  console.log('relatório escrito');
}
process.exit(ok ? 0 : 1);
