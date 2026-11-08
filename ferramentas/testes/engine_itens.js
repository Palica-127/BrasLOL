/* Bloco 4: itens e builds (src/engine/items). Sem navegador.
   node ferramentas/testes/engine_itens.js [--relatorio]   (escreve docs/ITENS_COBERTURA_<patch>.md) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = p => require(path.join(ROOT, 'src', 'engine', p));
const { catalog, components, byName } = E('items/catalog.js'), shop = E('items/shop.js'), FX = E('items/effects.js'), B = E('items/builds.js');
const { World } = E('sim/world.js'), { createLoader } = E('data/loader.js'), D = E('combat/damage.js');
let ok = true; const T = (c, m, extra) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m + (extra !== undefined && !c ? '  ' + extra : '')); if (!c) ok = false; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const cat = catalog(), items = Object.values(cat), L = createLoader();
const I = n => { const i = byName(cat, n); if (!i) throw new Error('item ' + n); return i.id; };

/* ---------- catálogo ---------- */
{ const cls = {}; items.forEach(i => { cls[i.cls] = (cls[i.cls] || 0) + 1; });
  T(items.length > 180 && cls.legendary >= 100 && cls.boots >= 10 && cls.epic > 30 && cls.component > 10, "catálogo da Summoner's Rift carregado", JSON.stringify(cls));
  console.log('     ' + JSON.stringify(cls));
  T(new Set(items.map(i => i.name)).size === items.length, 'sem itens duplicados por nome (Arena e variantes removidas)');
  T(items.every(i => i.from.every(c => cat[c]) && i.into.every(c => cat[c])), 'receitas só apontam para itens do catálogo');
  const bad = items.filter(i => i.from.length && i.from.reduce((s, c) => s + cat[c].price, 0) + i.combine !== i.price);
  T(bad.length === 0, 'preço = componentes + custo de combinar em todos os itens com receita', bad.map(i => i.name).join());
  const mism = [];
  items.forEach(i => {
    const d = i.raw.stats_ddragon || {}, m = i.mods;
    const chk = (k, g, n) => { if (d[k] !== undefined && !near(d[k], (m[g][n] || 0), 1e-6)) mism.push(i.name + ' ' + k + ' ' + d[k] + ' vs ' + (m[g][n] || 0)); };
    chk('FlatPhysicalDamageMod', 'flat', 'ad'); chk('FlatMagicDamageMod', 'flat', 'ap'); chk('FlatArmorMod', 'flat', 'armor'); chk('FlatSpellBlockMod', 'flat', 'mr');
    chk('FlatHPPoolMod', 'flat', 'hp'); chk('FlatMPPoolMod', 'flat', 'mana'); chk('FlatCritChanceMod', 'flat', 'crit'); chk('PercentAttackSpeedMod', 'pct', 'as'); chk('FlatMovementSpeedMod', 'flat', 'ms');
  });
  T(mism.length === 0, 'atributos do cliente conferem com o Data Dragon (AD, AP, armadura, RM, vida, mana, crítico, AS, MS)', mism.slice(0, 3).join(' | ')); }
{ const g = byName(cat, 'Gume do Infinito');
  T(g.mods.flat.ad === 75 && near(g.mods.flat.crit, 0.25) && near(g.mods.extra.critDamage, 0.3), 'Gume do Infinito: 75 AD, 25% crítico, +30% dano crítico');
  T(components(cat, g.id).length === 3, 'receita recursiva do Gume do Infinito (3 componentes)');
  T(byName(cat, 'Brutalizador').mods.flat.lethality === 5, 'letalidade lida do DataValue (Brutalizador = 5)'); }

/* ---------- loja ---------- */
const mk = (seed = 1) => new World({ seed });
const put = (w, name, team, x, o = {}) => { const u = w.addChampion({ name, team, level: o.level || 11, pos: { x, y: 0 }, items: o.items || [], gold: o.gold || 0 }); u.ai.enabled = false; return u; };
{ const w = mk(), u = put(w, 'Garen', 0, 0, { gold: 10000 }); const r = shop.buy(w, u, I('Cota de Malha'));
  T(r.ok && u.gold === 10000 - 800 && u.items.length === 1, 'compra componente');
  T(near(u.stats.armor.bonus, 40), 'item aumenta a armadura em 40 (Cota de Malha)', u.stats.armor.bonus);
  shop.buy(w, u, I('Manto Anula-Magia'));
  const sun = I('Égide de Fogo Solar'), q = shop.quote(u, sun);
  const have = components(cat, sun).filter(c => u.items.includes(c)), expected = cat[sun].price - have.reduce((s, c) => s + cat[c].price, 0);
  T(q.ok && q.cost === expected && have.length >= 1, 'receita consome componentes possuídos e abate o preço (custo ' + q.cost + ' de ' + cat[sun].price + ')');
  const g0 = u.gold; shop.buy(w, u, sun);
  T(u.items.includes(sun) && g0 - u.gold === q.cost && have.every(c => !u.items.includes(c)), 'compra do item completo remove os componentes usados');
  const v = shop.sell(w, u, sun); T(v.ok && v.gold === cat[sun].sell && !u.items.includes(sun), 'venda devolve o valor de revenda do cliente'); }
{ const w = mk(), u = put(w, 'Garen', 0, 0, { gold: 99999 });
  for (let i = 0; i < 6; i++) shop.buy(w, u, I('Espada Longa'));
  T(u.items.length === 6 && shop.buy(w, u, I('Espada Longa')).reason === 'inventario-cheio', 'limite de 6 itens');
  const u2 = put(w, 'Annie', 0, 0, { gold: 99999 }); shop.buy(w, u2, I('Botas')); shop.buy(w, u2, I('Grevas do Berserker'));
  T(u2.items.length === 1 && u2.items[0] === I('Grevas do Berserker') && shop.quote(u2, I('Sapatos do Feiticeiro')).reason === 'botas-unicas', 'botas são únicas; botas básicas viram avançadas');
  const u3 = put(w, 'Annie', 0, 0, { gold: 100 }); T(shop.buy(w, u3, I('Cota de Malha')).reason === 'ouro', 'sem ouro não compra');
  const u4 = put(w, 'Annie', 0, 0, { gold: 99999 }); shop.buy(w, u4, I('Gume do Infinito')); T(shop.buy(w, u4, I('Gume do Infinito')).reason === 'duplicado', 'item lendário não pode ser duplicado'); }

/* ---------- atributos no combate ---------- */
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [I('Gume do Infinito')] }), plain = put(w, 'Garen', 0, 0);
  T(near(a.stats.ad.total - plain.stats.ad.total, 75) && near(a.stats.crit, 0.25) && near(a.stats.critDamage - plain.stats.critDamage, 0.3), 'Gume do Infinito soma AD/crítico/dano crítico ao campeão');
  const n = 600, x = put(w, 'Garen', 1, 9); x.hp = x.hpMax = 1e9;
  for (let i = 0; i < n; i++) w.dealDamage(a, x, 100, 'physical', { attack: true, canCrit: true });
  const dm = w.log.filter(e => e.type === 'damage' && e.src === a.id), cr = dm.filter(e => e.crit);
  T(cr.length > n * 0.19 && cr.length < n * 0.31 && cr[0].dealt / dm.find(e => !e.crit).dealt > 2.2, 'crítico de item: ~25% de chance e dano 230%', cr.length); }
{ const w = mk(), r = put(w, 'Annie', 0, 0, { items: [I('Tomo Amplificador'), I('Capuz da Morte de Rabadon')] }), n = put(w, 'Annie', 0, 0, { items: [I('Tomo Amplificador'), I('Varinha Explosiva')] });
  const ap = cat[I('Tomo Amplificador')].mods.flat.ap + cat[I('Capuz da Morte de Rabadon')].mods.flat.ap;
  T(near(r.stats.ap.total, ap * 1.3, 1e-6) && near(n.stats.ap.total, cat[I('Tomo Amplificador')].mods.flat.ap + cat[I('Varinha Explosiva')].mods.flat.ap), 'Rabadon: PA total x1,3', r.stats.ap.total); }
{ const w = mk(), v = put(w, 'Garen', 0, 0, { items: [I('Brutalizador')] }), plain = put(w, 'Garen', 0, 0), t = put(w, 'Garen', 1, 50);
  t.hp = t.hpMax = 1e9; w.dealDamage(v, t, 100, 'physical', {}); w.dealDamage(plain, t, 100, 'physical', {});
  const d = w.log.filter(e => e.type === 'damage'); T(d[0].dealt > d[1].dealt, 'letalidade aumenta o dano físico', d[0].dealt + ' vs ' + d[1].dealt); }
{ const w = mk(), v = put(w, 'Annie', 0, 0, { items: [I('Cajado do Vazio')] }), plain = put(w, 'Annie', 0, 0), t = put(w, 'Garen', 1, 50);
  t.hp = t.hpMax = 1e9; w.dealDamage(v, t, 100, 'magic', {}); w.dealDamage(plain, t, 100, 'magic', {});
  const d = w.log.filter(e => e.type === 'damage'); T(d[0].dealt > d[1].dealt, 'penetração mágica % aumenta o dano mágico', d[0].dealt + ' vs ' + d[1].dealt); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [I('Cetro Vampírico')] }), t = put(w, 'Garen', 1, 50); a.hp = 100; t.hp = t.hpMax = 1e9;
  w.dealDamage(a, t, 200, 'physical', { attack: true }); const exp = 200 * D.resistMultiplier(t.stats.armor.total) * 0.07;
  T(near(a.hp, 100 + exp, 0.01), 'roubo de vida de item cura em ataques (7%)', a.hp); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [I('Passos de Mercúrio')] });
  T(near(a.helpers.itemTenacity, 0.3), 'tenacidade de item (Passos de Mercúrio = 30%)', a.helpers.itemTenacity); }

/* ---------- passivas e ativas ---------- */
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [FX.ID.CLEAVER] }), t = put(w, 'Garen', 1, 50); t.hp = t.hpMax = 1e9;
  const ar0 = w.armorOf(t); w.dealDamage(a, t, 100, 'physical', { attack: true }); w.dealDamage(a, t, 100, 'physical', { attack: true });
  const f = cat[FX.ID.CLEAVER].dv.shredperstack[1];
  T(near(w.armorOf(t), ar0 * (1 - 2 * f), 1e-6), 'Cutelo Negro: cada acerto reduz 6% da armadura (acumula)', w.armorOf(t));
  T(a.buffs.some(b => b.tag === 'cleaverMS') && a.stats.ms.bonus >= 20 - 1e-6, 'Cutelo Negro: Fervor concede velocidade de movimento');
  w.run(7); T(w.armorOf(t) === ar0, 'redução de armadura expira após 6 s', w.armorOf(t)); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [FX.ID.LEMBRETE] }), t = put(w, 'Garen', 1, 50); t.hp = 100; t.hpMax = 1e9;
  w.dealDamage(a, t, 10, 'physical', {}); const hp0 = t.hp, h = w.heal(t, 100, null); T(near(h, 60), 'Lembrete Mortal: ferimentos graves (-40% de cura)', h + ' hp0 ' + hp0); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [FX.ID.ECLIPSE] }), t = put(w, 'Garen', 1, 50); t.hp = t.hpMax = 1e9;
  w.dealDamage(a, t, 10, 'physical', { attack: true }); T(a.shields.length === 0, 'Eclipse: um golpe não basta');
  w.run(0.5); w.dealDamage(a, t, 10, 'physical', { attack: true });
  const it = cat[FX.ID.ECLIPSE], want = it.dv.meleebaseshield[1] + it.dv.meleebonusadshieldratio[1] * a.stats.ad.bonus;
  T(a.shields.length === 1 && near(a.shields[0].amount, want, 0.01), 'Eclipse: dois golpes em 2 s concedem escudo (150 + 40% AD adicional)', a.shields[0] && a.shields[0].amount + ' vs ' + want);
  w.run(0.5); w.dealDamage(a, t, 10, 'physical', { attack: true }); w.dealDamage(a, t, 10, 'physical', { attack: true }); T(a.shields.length === 1, 'Eclipse: recarga de 6 s'); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [FX.ID.ZHONYA] }), t = put(w, 'Garen', 1, 50);
  T(FX.use(w, a, FX.ID.ZHONYA) && w.has(a, 'stasis'), 'Zhonya: ativa entra em estase');
  const hp = a.hp; w.dealDamage(t, a, 500, 'true', {}); T(a.hp === hp, 'estase: invulnerável');
  w.orderAttack(a, t); w.run(1); T(w.log.filter(e => e.type === 'attack' && e.id === a.id).length === 0, 'estase: não age');
  w.run(2); w.dealDamage(t, a, 500, 'true', {}); T(a.hp < hp, 'estase termina após a duração'); T(!FX.use(w, a, FX.ID.ZHONYA), 'Zhonya em recarga'); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [FX.ID.GA] }), t = put(w, 'Garen', 1, 50);
  w.dealDamage(t, a, 1e6, 'true', {}); T(!a.dead && w.has(a, 'stasis'), 'Anjo Guardião: dano letal -> estase em vez de morrer');
  w.run(4.2); T(!a.dead && near(a.hp, a.stats.hp.base * 0.5, 1), 'Anjo Guardião: volta com 50% da vida base', a.hp);
  w.dealDamage(t, a, 1e6, 'true', {}); T(a.dead, 'Anjo Guardião em recarga: morre normalmente'); }
{ const w = mk(), a = put(w, 'Morgana', 0, 0), v = put(w, 'Garen', 1, 600, { items: [FX.ID.BANSHEE] });
  w.orderCast(a, 'Q', { x: 600, y: 0 }); w.run(2.5);
  T(w.log.some(e => e.type === 'spell-shield') && !w.has(v, 'root') && !w.log.some(e => e.type === 'damage' && e.ability === 'Q'), 'Véu da Banshee: bloqueia a primeira habilidade (dano e raiz)');
  a.abil.readyAt.Q = 0; a.mana = a.manaMax; w.orderCast(a, 'Q', { x: v.pos.x, y: 0 }); w.run(2.5);
  T(w.log.some(e => e.type === 'damage' && e.ability === 'Q'), 'Véu da Banshee em recarga: a segunda habilidade acerta'); }
{ const w = mk(), a = put(w, 'Garen', 0, 0, { items: [FX.ID.SUNFIRE] }), t = put(w, 'Garen', 1, 150); put(w, 'Garen', 1, 3000);
  w.dealDamage(t, a, 10, 'true', {}); w.run(3.1);
  const d = w.log.filter(e => e.type === 'damage' && e.ability === 'item');
  T(d.length >= 2 && d.every(e => e.dst === t.id), 'Égide de Fogo Solar: dano em aura só a inimigos próximos', d.length); }

/* ---------- builds ---------- */
const names = ['Garen', 'Annie', 'Ahri', 'Ezreal', 'Leona', 'Amumu', 'Malphite', 'Morgana'];
const P = Object.fromEntries(names.map(n => [n, B.profile(L.champion(n))]));
T(P.Garen.arch === 'lutador' && P.Annie.arch === 'mago' && P.Ezreal.arch === 'atirador' && P.Leona.arch === 'tanque' && P.Malphite.arch === 'mago-tanque', 'arquétipo vem dos dados do campeão: ' + names.map(n => n + '=' + P[n].arch).join(', '));
{ const bad = [];
  names.forEach(n => {
    const b = B.makeBuild(L.champion(n), [P.Annie, P.Garen]), its = b.items.map(i => cat[i]);
    if (!(b.items.length === 6 && new Set(b.items).size === 6 && its.filter(i => i.cls === 'boots').length === 1 && its.every(i => i.cls !== 'consumable'))) bad.push(n);
  });
  T(bad.length === 0, 'cada campeão recebe 6 itens distintos, com exatamente 1 bota', bad.join());
  const g1 = B.makeBuild(L.champion('Garen'), [P.Annie, P.Morgana]), g2 = B.makeBuild(L.champion('Garen'), [P.Ezreal, P.Garen]);
  const mr = b => b.items.reduce((s, i) => s + (cat[i].mods.flat.mr || 0), 0), ar = b => b.items.reduce((s, i) => s + (cat[i].mods.flat.armor || 0), 0);
  T(mr(g1) > mr(g2) && ar(g2) > ar(g1), 'build se adapta ao inimigo: mais RM contra AP, mais armadura contra AD', 'MR ' + mr(g1) + '/' + mr(g2) + ' AR ' + ar(g1) + '/' + ar(g2));
  const j1 = B.makeBuild(L.champion('Ezreal'), [P.Garen, P.Leona, P.Malphite]), j2 = B.makeBuild(L.champion('Ezreal'), [P.Annie, P.Ahri, P.Morgana]);
  const pen = b => b.items.filter(i => cat[i].mods.extra.armorPenPct || cat[i].mods.flat.lethality).length;
  T(pen(j1) >= pen(j2), 'contra alvos resistentes, prioriza penetração', pen(j1) + ' vs ' + pen(j2));
  const am = B.makeBuild(L.champion('Annie'), [P.Garen]), ez = B.makeBuild(L.champion('Ezreal'), [P.Garen]);
  T(am.items.filter(i => cat[i].mods.flat.ap).length >= 4 && ez.items.filter(i => cat[i].mods.flat.ad).length >= 3, 'mago compra AP; atirador compra AD'); }
{ const w = mk(), u = put(w, 'Annie', 0, 0, { gold: 500 }), b = B.makeBuild(L.champion('Annie'), [P.Garen]); let guard = 0;
  while (b.items.some(i => !u.items.includes(i)) && guard++ < 400) {
    const p = B.nextPurchase(u, b.items);
    if (!p) { u.gold += 400; continue; }
    if (!shop.buy(w, u, p.id).ok) break;
  }
  T(b.items.every(i => u.items.includes(i)) && u.items.length === 6, 'compra progressiva (componentes -> itens) completa a build de 6 itens', u.items.map(i => cat[i].name).join()); }

/* ---------- itens fazem diferença na luta ---------- */
const lab = (seed, a, b, ia, ib) => {
  const w = mk(seed);
  a.forEach((n, i) => w.addChampion({ name: n, team: 0, level: 13, pos: { x: 1000, y: 900 + i * 220 }, items: ia[i] || [] }));
  b.forEach((n, i) => w.addChampion({ name: n, team: 1, level: 13, pos: { x: 2400, y: 900 + i * 220 }, items: ib[i] || [] }));
  w.run(240); return w;
};
{ const T0 = ['Garen', 'Annie', 'Ahri', 'Ezreal', 'Leona'], T1 = ['Amumu', 'Malphite', 'Morgana', 'Garen', 'Annie'];
  const bld = (ns, foes) => ns.map(n => B.makeBuild(L.champion(n), foes.map(f => B.profile(L.champion(f)))).items);
  let wins = 0; const N = 12;
  for (let s = 0; s < N; s++) { const w = lab(300 + s, T0, T1, bld(T0, T1), []); if (w.winner() === 0) wins++; }
  T(wins >= N * 0.8, 'time 5v5 com builds completas vence o time sem itens (' + wins + '/' + N + ')');
  const A = lab(7, T0, T1, bld(T0, T1), bld(T1, T0)), Bb = lab(7, T0, T1, bld(T0, T1), bld(T1, T0));
  T(A.hash() === Bb.hash() && A.winner() !== null, '5v5 com itens: determinístico e termina (hash ' + A.hash() + ', ' + A.t.toFixed(1) + ' s)');
  T(A.units.every(u => isFinite(u.hp) && isFinite(u.stats.ad.total) && isFinite(u.stats.ms.total)), 'nenhum NaN nos atributos com itens'); }

/* ---------- relatório ---------- */
if (process.argv.includes('--relatorio')) {
  const rows = items.filter(i => ['legendary', 'epic', 'boots', 'starter'].includes(i.cls)).sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));
  const imp = new Set(FX.IMPLEMENTED), cls = {}; items.forEach(i => { cls[i.cls] = (cls[i.cls] || 0) + 1; });
  const withP = rows.filter(i => i.hasPassive), pend = withP.filter(i => !imp.has(i.id));
  let md = '# Cobertura de itens — patch 16.22.1\n\nGerado por `node ferramentas/testes/engine_itens.js --relatorio`.\n\n';
  md += `- Itens da Summoner's Rift no catálogo: **${items.length}** (${Object.entries(cls).map(([k, v]) => k + ' ' + v).join(', ')})\n`;
  md += '- Todos os atributos numéricos (AD, AP, armadura, RM, vida, mana, AS, crítico, dano crítico, aceleração, MS, roubo de vida, tenacidade, penetração, letalidade, regeneração, poder de cura) estão ativos em **todos** os itens.\n';
  md += `- Passivas/ativas implementadas (${imp.size}): ${[...imp].map(i => cat[i].name).join(', ')}.\n- Itens com passiva/ativa **pendente**: ${pend.length} de ${withP.length} (lista abaixo; têm só os atributos numéricos).\n\n## Pendentes\n\n${pend.map(i => '- ' + i.name + ' (' + i.id + ', ' + i.cls + ')').join('\n')}\n`;
  fs.writeFileSync(path.join(ROOT, 'docs', 'ITENS_COBERTURA_16.22.1.md'), md); console.log('relatório escrito: docs/ITENS_COBERTURA_16.22.1.md (' + pend.length + ' passivas pendentes)');
}

console.log(ok ? '\nTODOS OS TESTES PASSARAM' : '\nHÁ FALHAS'); process.exit(ok ? 0 : 1);
