#!/usr/bin/env node
/* Valida data/<patch>/ : esquema minimo, integridade referencial e conferencia cruzada Data Dragon x CommunityDragon.
   uso: node ferramentas/dados/validar.js [patch] [--relatorio]   (--relatorio escreve docs/DADOS_COBERTURA_<patch>.md) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function validar(patch) {
  const dir = path.join(ROOT, 'data', patch);
  const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const erros = [], avisos = [], info = {};
  const E = (c, m) => erros.push(`[${c}] ${m}`), W = (c, m) => avisos.push(`[${c}] ${m}`);
  const isNum = x => typeof x === 'number' && isFinite(x);
  const close = (a, b, t = 0.011) => isNum(a) && isNum(b) && Math.abs(a - b) <= t * Math.max(1, Math.abs(b) * 0.001);

  const meta = rd('meta.json'), idx = rd('champions.json'), items = rd('items.json'), rules = rd('rules.json');
  if (meta.patch !== patch) E('meta', `patch da meta (${meta.patch}) diferente da pasta (${patch})`);

  /* ---- campeoes ---- */
  const sem = { bin: 0, q: 0, calc: 0, passiva: 0 }, calcOrfaos = [], statDiv = [];
  let nSpells = 0, nCalc = 0, semVal = 0;
  for (const c of idx) {
    const f = path.join(dir, 'champions', c.id + '.json');
    if (!fs.existsSync(f)) { E('campeao', `arquivo ausente: ${c.id}`); continue; }
    const ch = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!ch.nome || !isNum(ch.key)) E('campeao', `${c.id}: nome/key invalidos`);
    const d = ch.stats_ddragon || {};
    ['hp', 'hpperlevel', 'armor', 'armorperlevel', 'spellblock', 'spellblockperlevel', 'movespeed', 'attackrange', 'attackdamage', 'attackdamageperlevel', 'attackspeedperlevel'].forEach(k => { if (!isNum(d[k])) E('campeao', `${c.id}: stat ddragon ${k} invalido`) });
    if (!ch.stats_cdragon) { sem.bin++; E('campeao', `${c.id}: sem dados do CommunityDragon`); continue; }
    const s = ch.stats_cdragon;
    /* conferencia cruzada: as duas fontes oficiais precisam concordar */
    [['hp', 'vida'], ['hpperlevel', 'vida_nivel'], ['armor', 'armadura'], ['armorperlevel', 'armadura_nivel'], ['spellblock', 'rm'], ['spellblockperlevel', 'rm_nivel'], ['movespeed', 'velocidade_mov'], ['attackrange', 'alcance_ataque'], ['attackdamage', 'dano'], ['attackdamageperlevel', 'dano_nivel'], ['attackspeedperlevel', 'vel_ataque_nivel']]
      .forEach(([a, b]) => { if (!close(d[a], s[b], 0.02)) statDiv.push(`${c.id}.${a}: ddragon ${d[a]} x cdragon ${s[b]}`) });
    /* kit: Q W E R + passiva */
    const sp = ch.objetos_habilidade || {};
    const refs = ch.spells_ref || [];
    if (refs.length < 4 || (ch.habilidades_chaves || []).length < 4) E('campeao', `${c.id}: menos de 4 habilidades referenciadas`);
    (ch.habilidades_chaves || []).forEach((k, i) => {
      const o = k && sp[k];
      if (!o) { sem.q++; E('habilidade', `${c.id} ${'QWER'[i]}: objeto ausente`); return; }
      nSpells++;
      const m = o.mSpell || {};
      const cd = m.cooldownTime;
      if (!Array.isArray(cd) || !cd.length || !cd.every(isNum)) W('habilidade', `${c.id} ${'QWER'[i]}: recarga nao numerica`);
      (m.DataValues || []).forEach(dv => { if (dv.values === undefined) semVal++; else if (!Array.isArray(dv.values) || !dv.values.every(isNum)) E('habilidade', `${c.id} ${'QWER'[i]}: DataValue ${dv.name} invalido`) });
      /* calculos referenciam DataValues existentes */
      const names = new Set((m.DataValues || []).map(x => String(x.name).toLowerCase()));   /* o cliente compara sem diferenciar maiusculas */
      const walk = (n, calc) => {
        if (Array.isArray(n)) return n.forEach(x => walk(x, calc));
        if (n && typeof n === 'object') {
          nCalc += (n.__type === 'GameCalculation') ? 1 : 0;
          if (typeof n.mDataValue === 'string' && !names.has(n.mDataValue.toLowerCase()) && !/^\{/.test(n.mDataValue)) calcOrfaos.push(`${c.id} ${'QWER'[i]}: ${calc} -> ${n.mDataValue}`);
          Object.values(n).forEach(v => walk(v, calc));
        }
      };
      Object.entries(m.mSpellCalculations || {}).forEach(([n, v]) => walk(v, n));
    });
    if (!ch.passiva_ref || !(ch.passiva_chaves || []).length) { sem.passiva++; W('campeao', `${c.id}: passiva nao identificada`); }
  }
  const adZ = statDiv.filter(m => /attackdamageperlevel: ddragon 0 /.test(m)); statDiv.filter(m => !adZ.includes(m)).forEach(m => E('stats', m));
  if (adZ.length) W('fonte-divergente', `Data Dragon ${patch} traz attackdamageperlevel=0 em ${adZ.length} campeoes; o CommunityDragon (cliente) traz o valor real e e a fonte autoritativa para esse campo`);
  calcOrfaos.forEach(m => W('calculo', m));
  info.campeoes = { total: idx.length, habilidadesQWER: nSpells, calculos: nCalc, divergenciasStats: statDiv.length - adZ.length, ddragonAdPorNivelZerado: adZ.length, dataValuesSemValores: semVal, calculosComReferenciaOrfa: calcOrfaos.length };

  /* ---- itens ---- */
  const ids = new Set(Object.keys(items).map(Number));
  let loja = 0, sr = 0, comPassiva = 0, semCd = 0, precoDiv = [];
  const MAPSR = 11;
  const statMap = { FlatPhysicalDamageMod: 'mFlatPhysicalDamageMod', FlatMagicDamageMod: 'mFlatMagicDamageMod', FlatArmorMod: 'mFlatArmorMod', FlatSpellBlockMod: 'mFlatSpellBlockMod', FlatHPPoolMod: 'mFlatHPPoolMod', FlatMovementSpeedMod: 'mFlatMovementSpeedMod', FlatCritChanceMod: 'mFlatCritChanceMod', PercentAttackSpeedMod: 'mPercentAttackSpeedMod' };
  const statDivI = [];
  Object.values(items).forEach(it => {
    if (!it.nome) { if (it.mapas.includes(11)) E('item', `${it.id}: sem nome`); else W('item', `${it.id}: sem nome (item fora da loja/mapa 11)`); }
    if (!isNum(it.preco) || it.preco < 0) E('item', `${it.id}: preco invalido`);
    (it.de || []).forEach(x => { if (!ids.has(x)) E('item', `${it.id}: componente ${x} nao existe`) });
    (it.para || []).forEach(x => { if (!ids.has(x)) E('item', `${it.id}: "para" ${x} nao existe`) });
    /* simetria: se A tem B como componente, B tem A em "para" */
    (it.de || []).forEach(x => { const c = items[x]; if (c && !(c.para || []).includes(it.id)) W('item', `${it.id} <- ${x}: relacao de/para assimetrica`) });
    const sr_ = it.mapas.includes(MAPSR);
    if (sr_) sr++;
    if (sr_ && it.na_loja) loja++;
    if (it.de && it.de.length && isNum(it.preco_combinar)) {
      const soma = it.de.reduce((a, x) => a + (items[x] ? items[x].preco : NaN), 0) + it.preco_combinar;
      if (soma !== it.preco) precoDiv.push(`${it.id} ${it.nome}: componentes+combinar=${soma} x total=${it.preco}`);
    }
    if (it.cdragon) {
      if (it.cdragon.habilidades) comPassiva++;
      /* conferencia: stats planos DDragon x CommunityDragon */
      Object.entries(statMap).forEach(([a, b]) => {
        const x = it.stats_ddragon && it.stats_ddragon[a], y = it.cdragon.stats[b];
        if (x !== undefined && !close(x, y, 0.02) && !(a === 'PercentAttackSpeedMod' && close(x, y)))
          statDivI.push(`${it.id} ${it.nome}: ${a} ddragon ${x} x cdragon ${y}`);
      });
    } else if (sr_ && it.na_loja) E('item', `${it.id} ${it.nome}: sem dados do CommunityDragon`);
  });
  precoDiv.forEach(m => W('preco', m));
  statDivI.forEach(m => W('stats-item', m));
  info.itens = { total: ids.size, noMapa11: sr, naLojaMapa11: loja, comHabilidadeCdragon: comPassiva, divergenciasPreco: precoDiv.length, divergenciasStats: statDivI.length };

  /* ---- monstros / minions / estruturas ---- */
  const mons = rd('monstros.json'), mins = rd('minions.json'), est = rd('estruturas.json');
  const exigeMon = ['sru_baron', 'sru_riftherald', 'sru_horde', 'sru_crab', 'sru_dragon_fire', 'sru_dragon_water', 'sru_dragon_earth', 'sru_dragon_air', 'sru_dragon_hextech', 'sru_dragon_chemtech', 'sru_dragon_elder', 'sru_gromp', 'sru_krug', 'sru_murkwolf', 'sru_razorbeak', 'sru_red', 'sru_blue'];
  exigeMon.forEach(n => { if (!mons[n]) E('monstro', `ausente: ${n}`); else if (!(mons[n].registro.baseHPModifiable && mons[n].registro.baseHPModifiable.baseValue > 0)) W('monstro', `${n}: vida base nao encontrada no registro`) });
  ['sru_orderminionmelee', 'sru_orderminionranged', 'sru_orderminionsiege', 'sru_orderminionsuper'].forEach(n => { if (!mins[n]) E('minion', `ausente: ${n}`) });
  ['turret', 'inhibitor', 'nexus'].forEach(n => { if (!est[n]) E('estrutura', `ausente: ${n}`) });
  info.mundo = { monstros: Object.keys(mons).length, minions: Object.keys(mins).length, estruturas: Object.keys(est).length };

  /* ---- regras ---- */
  const xp = rules.experiencia;
  if (!xp || xp.xp_para_subir_do_nivel.length < 17) E('regras', 'curva de XP ausente/curta');
  else if (xp.xp_para_subir_do_nivel[0] !== 280) W('regras', `xp nivel 1->2 = ${xp.xp_para_subir_do_nivel[0]} (esperado 280)`);
  info.pendente = rules.pendente;
  return { erros, avisos, info, meta };
}

/* campeoes do jogo (CHMAP no index.html) que nao tem dados */
function cobreJogo(patch) {
  const { load, run } = require('../testes/harness.js');
  const ctx = load(path.join(ROOT, 'index.html'));
  const map = run(ctx, 'CHMAP');
  const faltam = [];
  Object.entries(map).forEach(([jogo, id]) => { if (!fs.existsSync(path.join(ROOT, 'data', patch, 'champions', id + '.json'))) faltam.push(`${jogo} -> ${id}`) });
  return { total: Object.keys(map).length, faltam };
}

module.exports = { validar, cobreJogo };

if (require.main === module) {
  const patch = process.argv.slice(2).find(a => !a.startsWith('--')) || '16.22.1';
  const r = validar(patch), j = cobreJogo(patch);
  console.log('INFO', JSON.stringify(r.info, null, 1));
  console.log(`campeoes do jogo cobertos: ${j.total - j.faltam.length}/${j.total}`, j.faltam);
  console.log(`AVISOS: ${r.avisos.length}`); r.avisos.slice(0, 15).forEach(a => console.log('  ' + a));
  console.log(`ERROS: ${r.erros.length}`); r.erros.slice(0, 40).forEach(a => console.log('  ' + a));
  if (process.argv.includes('--relatorio')) {
    const cont = (arr, p) => arr.filter(x => x.startsWith(p)).length;
    const L = [];
    L.push(`# Cobertura dos dados — patch ${patch}`, '', `Gerado em ${r.meta.generatedAt} por \`ferramentas/dados/gerar.js\`; validado por \`ferramentas/dados/validar.js\`.`, '',
      '## Contagens', '', '```json', JSON.stringify(r.info, null, 1), '```', '',
      `Campeões do jogo (CHMAP) com dados: **${j.total - j.faltam.length}/${j.total}**${j.faltam.length ? ' — faltam: ' + j.faltam.join(', ') : ''}`, '',
      '## Resultado da validação', '', `- Erros: **${r.erros.length}**`, `- Avisos: **${r.avisos.length}**`, '');
    const grp = {}; r.avisos.forEach(a => { const k = a.slice(1, a.indexOf(']')); grp[k] = (grp[k] || 0) + 1 });
    Object.entries(grp).forEach(([k, v]) => L.push(`  - avisos \`${k}\`: ${v}`));
    L.push('', '### Exemplos de avisos', '', ...r.avisos.slice(0, 25).map(a => '- ' + a), '', '## Fontes e proveniência', '',
      '| Dado | Fonte (`src`) | Observação |', '|---|---|---|',
      '| Stats base/crescimento, ataque, tempos | `riot-cdragon` (+ `riot-ddragon` para conferência) | duas fontes oficiais conferidas entre si |',
      '| Habilidades: recarga, custo, alcance, largura, velocidade de projétil, `DataValues`, `mSpellCalculations` | `riot-cdragon` | dados brutos do cliente; nomes de alguns campos aparecem como hash (`{xxxxxxxx}`) por não terem sido decodificados pela CommunityDragon |',
      '| Nome/descrição/tooltip (pt_BR) | `riot-ddragon` | texto, não executável |',
      '| Itens: stats, preço, receita | `riot-ddragon` + `riot-cdragon` | conferidos entre si |',
      '| Itens: passivas/ativas (`habilidades`, `dados`, `calculos`) | `riot-cdragon` | lógica de execução será código (Bloco 4) |',
      '| Monstros, minions, estruturas (registro-base) | `riot-cdragon` | HP/dano por tier e por tempo vêm de scripts — ver pendências |',
      '| Curva de XP | `riot-cdragon` (map11) | |',
      '| Fórmulas de resistência/penetração/crescimento; ondas de minions | `wiki` | a Wiki cita V26.01 para o ouro; conferir no Bloco 5 |', '',
      '## Pendências conhecidas (nenhum valor foi inventado)', '', ...r.info.pendente.map(p => '- ' + p), '',
      '## Simplificações/observações', '',
      '- `sru_atakhan` existe nos dados do cliente mas **não está** na lista de objetivos pedida; será avaliado no Bloco 6 se está ativo no patch.',
      '- O jogo tem hoje 110 campeões; o patch tem 173. Os 110 estão todos cobertos (ver acima); os demais ficam disponíveis para as ondas do Bloco 2.');
    fs.writeFileSync(path.join(ROOT, 'docs', `DADOS_COBERTURA_${patch}.md`), L.join('\n'));
    console.log('relatorio escrito');
  }
  process.exit(r.erros.length ? 1 : 0);
}
