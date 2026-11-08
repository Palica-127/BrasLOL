#!/usr/bin/env node
/* Gera data/<patch>/ a partir de fontes oficiais da Riot.
   uso: node ferramentas/dados/gerar.js [patch=16.22.1] [--refresh]
   Fontes:  Data Dragon (ddragon.leagueoflegends.com)  -> riot-ddragon
            CommunityDragon (raw.communitydragon.org)   -> riot-cdragon  (dados brutos do cliente, extraidos do .bin)
   Cache local em ferramentas/dados/.cache/<patch>/ (nao versionado). Sem --refresh, usa o cache. */
const fs = require('fs'), path = require('path');
const PATCH = process.argv.slice(2).find(a => !a.startsWith('--')) || '16.22.1';
const REFRESH = process.argv.includes('--refresh');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', PATCH);
const CACHE = path.join(__dirname, '.cache', PATCH);
const SHORT = PATCH.split('.').slice(0, 2).join('.');           /* 16.22.1 -> 16.22 (pasta do CommunityDragon) */
const DD = `https://ddragon.leagueoflegends.com/cdn/${PATCH}/data/pt_BR`;
const CD = `https://raw.communitydragon.org/${SHORT}`;
const UA = 'BrasLOL-data-pipeline/1.0 (projeto de simulador; leitura de dados publicos)';
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });

async function get(url, cacheName, { optional = false } = {}) {
  const f = path.join(CACHE, cacheName);
  if (!REFRESH && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 404 && optional) return null;
      if (!r.ok) throw new Error(r.status + ' ' + url);
      const txt = await r.text();
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, txt);
      return JSON.parse(txt);
    } catch (e) { if (i === 3) { if (optional) return null; throw e; } await new Promise(r => setTimeout(r, 800 * (i + 1))); }
  }
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const num = x => (typeof x === 'number' ? Math.round(x * 1e5) / 1e5 : x);
/* remove ruido visual/UI mantendo toda a parte de mecanica; arredonda floats de 32 bits */
const DROP = new Set(['mClientData', 'mImgIconName', 'mAnimationName', 'mFloatVarsDecimals', 'mVFXResourceResolver', 'mItemDataClient', 'castRangeValues', 'manaValues', 'mTooltipData', 'mSpellTags_unused']);
function trim(o) {
  if (Array.isArray(o)) return o.map(trim);
  if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) { if (DROP.has(k)) continue; r[k] = trim(o[k]); } return r; }
  return num(o);
}
const val = o => num(o && typeof o === 'object' && 'baseValue' in o ? o.baseValue : o);
const val0 = o => (o === undefined ? 0 : val(o));                       /* campo omitido no cliente = 0 */
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data, null, 1)); return f; };

async function main() {
  const vers = await get('https://ddragon.leagueoflegends.com/api/versions.json', '_versions.json');
  if (!vers.includes(PATCH)) throw new Error('patch inexistente no Data Dragon: ' + PATCH);
  const prov = { generatedAt: new Date().toISOString().slice(0, 10), patch: PATCH, sources: { ddragon: DD, cdragon: CD }, gaps: [] };

  /* ---------------- campeoes ---------------- */
  const list = (await get(`${DD}/champion.json`, 'dd_champion.json')).data;
  const ids = Object.keys(list).sort();
  console.log('campeoes no Data Dragon:', ids.length);
  const champIndex = [];
  await pool(ids, 8, async id => {
    const dd = (await get(`${DD}/champion/${id}.json`, `dd_champ/${id}.json`)).data[id];
    const low = id.toLowerCase();
    let bin = await get(`${CD}/game/data/characters/${low}/${low}.bin.json`, `cd_champ/${low}.json`, { optional: true });
    if (!bin) { prov.gaps.push({ tipo: 'campeao-sem-bin', id }); }
    const res = {
      id, key: +dd.key, nome: dd.name, titulo: dd.title, funcoes: dd.tags, recurso: dd.partype, info: dd.info,
      stats_ddragon: dd.stats, src_stats: 'riot-ddragon',
      passiva_texto: { nome: dd.passive.name, descricao: dd.passive.description },
      habilidades_texto: dd.spells.map((s, i) => ({ slot: 'QWER'[i], id: s.id, nome: s.name, descricao: s.description, tooltip: s.tooltip, recarga: s.cooldown, custo: s.cost, tipo_custo: s.costType, alcance: s.range, nivel_max: s.maxrank, efeito: s.effectBurn })),
      src_texto: 'riot-ddragon'
    };
    if (bin) {
      const nome = Object.keys(bin).find(k => /^Characters\/[^/]+\/CharacterRecords\/Root$/.test(k));
      const root = bin[nome];
      const pre = nome.replace(/CharacterRecords\/Root$/, '');
      const preL = pre.toLowerCase();                                    /* o cliente mistura Fiddlesticks/FiddleSticks nos caminhos */           /* Characters/Aatrox/ */
      const g = k => val(root[k]), g0 = k => val0(root[k]);
      res.stats_cdragon = {
        vida: g('baseHPModifiable'), vida_nivel: g0('hpPerLevelModifiable'), regen_vida: g('baseStaticHPRegenModifiable'), regen_vida_nivel: g0('hpRegenPerLevelModifiable'),
        dano: g('baseDamageModifiable'), dano_nivel: g0('damagePerLevelModifiable'), armadura: g('baseArmorModifiable'), armadura_nivel: g0('armorPerLevelModifiable'),
        rm: g('baseMR'), rm_nivel: g0('mrPerLevel'), velocidade_mov: g('baseMoveSpeedModifiable'), alcance_ataque: g('attackRangeModifiable'),
        vel_ataque_base: g('attackSpeedModifiable'), vel_ataque_razao: g('attackSpeedRatioModifiable'), vel_ataque_nivel: g0('attackSpeedPerLevelModifiable'),
        dano_critico: root.critDamageMultiplier, alcance_aquisicao: root.acquisitionRange,
        raio_selecao: root.selectionRadius, raio_colisao: root.pathfindingCollisionRadius,
        recurso_tipo: root.primaryAbilityResource && root.primaryAbilityResource.arType,
        ataque_basico: root.basicAttack, ataques_extras: root.extraAttacks, ataques_criticos: root.critAttacks,
        mana_regen_base: g('baseStaticMPRegenModifiable'), mana_regen_nivel: g('mpRegenPerLevelModifiable'), mana_base: g('baseMPModifiable'), mana_nivel: g('mpPerLevelModifiable')
      };
      res.src_stats_cdragon = 'riot-cdragon';
      res.spells_ref = root.spells; res.abilities_ref = root.mAbilities;
      /* todos os objetos de habilidade do campeao (Q/W/E/R, passiva, misseis, filhos) */
      const sp = {};
      Object.keys(bin).filter(k => k.toLowerCase().startsWith(preL + 'spells/') && !/Skin\d+/i.test(k) && bin[k] && bin[k].__type === 'SpellObject').forEach(k => { sp[k.slice(pre.length)] = trim(bin[k]); });
      res.objetos_habilidade = sp; res.src_habilidades = 'riot-cdragon';
      /* buffs do campeao (efeitos persistentes e passivas por buff) */
      const bf = {};
      Object.keys(bin).filter(k => k.toLowerCase().startsWith(preL) && !k.toLowerCase().startsWith(preL + 'spells/') && bin[k] && /^(BuffScript|ItemModifier)$/.test(bin[k].__type || '')).forEach(k => { bf[k.slice(pre.length)] = trim(bin[k]); });
      res.objetos_buff = bf;
      /* resolve QWER por nome (sem diferenciar maiusculas) e a passiva = habilidade de mAbilities que nao e uma das 4 */
      const lowKeys = {}; Object.keys(sp).forEach(k => lowKeys[k.toLowerCase()] = k);
      const rel = r => r.split('/').slice(2).join('/').toLowerCase();             /* Characters/X/Spells/... -> spells/... */
      res.habilidades_chaves = (root.spells || []).slice(0, 4).map(r => lowKeys[rel(r)] || null);
      const dirs = new Set((root.spells || []).map(r => r.toLowerCase().split('/').slice(0, -1).join('/')));
      res.passiva_ref = (root.mAbilities || []).find(a => !dirs.has(a.toLowerCase())) || null;
      const pk = res.passiva_ref && rel(res.passiva_ref);
      res.passiva_chaves = pk ? Object.keys(sp).filter(k => k.toLowerCase().startsWith(pk + '/')) : [];
    }
    write(`champions/${id}.json`, res);
    champIndex.push({ id, key: res.key, nome: res.nome, funcoes: res.funcoes, recurso: res.recurso, temBin: !!bin });
  });
  champIndex.sort((a, b) => a.id.localeCompare(b.id));
  write('champions.json', champIndex);

  /* ---------------- itens ---------------- */
  const ddItems = (await get(`${DD}/item.json`, 'dd_item.json')).data;
  const cdItems = await get(`${CD}/game/items.cdtb.bin.json`, 'cd_items.json');
  const byId = {}, spellsOf = {};
  Object.keys(cdItems).forEach(k => {
    const o = cdItems[k];
    if (o.__type === 'ItemData' && /^Items\/\d+$/.test(k)) byId[k.slice(6)] = o;
    const m = /^Items\/(\d+)\/Spells\//.exec(k);
    if (m && o.__type === 'SpellObject') (spellsOf[m[1]] = spellsOf[m[1]] || {})[k.split('/Spells/')[1]] = trim(o);
  });
  const items = {};
  Object.keys(ddItems).forEach(id => {
    const d = ddItems[id], c = byId[id];
    const it = {
      id: +id, nome: d.name, descricao: d.description, texto_simples: d.plaintext, preco: d.gold.total, preco_combinar: d.gold.base, vendavel: d.gold.sell, na_loja: d.gold.purchasable,
      de: (d.from || []).map(Number), para: (d.into || []).map(Number), tags: d.tags, mapas: Object.keys(d.maps).filter(m => d.maps[m]).map(Number),
      stats_ddragon: d.stats, profundidade: d.depth || 1, src: 'riot-ddragon'
    };
    if (c) {
      const stats = {};
      Object.keys(c).filter(k => /^m(Flat|Percent)/.test(k) || k === 'mAbilityHasteMod').forEach(k => stats[k] = num(c[k]));
      it.cdragon = {
        stats, grupos: c.mItemGroups, categorias: c.mCategories, atributos: c.mItemAttributes, nivel_requerido: c.mRequiredLevel,
        receita: (c.recipeItemLinks || []).map(s => +s.replace('Items/', '')), preco_combinar: c.price, empilhamento_max: c.maxStack,
        dados: trim(c.mDataValues || null), calculos: trim(c.mItemCalculations || null), efeitos: trim(c.mEffectAmount || null), efeitos_por_nivel: trim(c.mEffectByLevelAmount || null),
        modificadores: c.mItemModifiers || null, campeao_requerido: c.mRequiredChampion || null, feitico_requerido: c.mRequiredSpellName || null,
        disponibilidade: c.mItemDataAvailability, habilidades: spellsOf[id] || null, src: 'riot-cdragon'
      };
    } else prov.gaps.push({ tipo: 'item-sem-cdragon', id: +id });
    items[id] = it;
  });
  write('items.json', items);

  /* ---------------- monstros, minions, estruturas ---------------- */
  const chars = {
    monstros: ['sru_baron', 'sru_baronspawn', 'sru_dragon', 'sru_dragon_air', 'sru_dragon_chemtech', 'sru_dragon_earth', 'sru_dragon_elder', 'sru_dragon_fire', 'sru_dragon_hextech', 'sru_dragon_water',
      'sru_riftherald', 'sru_horde', 'sru_horde_mini', 'sru_crab', 'sru_gromp', 'sru_krug', 'sru_krugmini', 'sru_krugminimini', 'sru_murkwolf', 'sru_murkwolfmini', 'sru_razorbeak', 'sru_razorbeakmini', 'sru_red', 'sru_redmini', 'sru_blue', 'sru_bluemini', 'sru_bluemini2', 'sru_atakhan'],
    minions: ['sru_orderminionmelee', 'sru_orderminionranged', 'sru_orderminionsiege', 'sru_orderminionsuper', 'sru_chaosminionmelee', 'sru_chaosminionranged', 'sru_chaosminionsiege', 'sru_chaosminionsuper'],
    estruturas: ['turret', 'inhibitor', 'nexus']
  };
  for (const [grupo, nomes] of Object.entries(chars)) {
    const out = {};
    await pool(nomes, 6, async n => {
      const bin = await get(`${CD}/game/data/characters/${n}/${n}.bin.json`, `cd_char/${n}.json`, { optional: true });
      if (!bin) { prov.gaps.push({ tipo: grupo + '-nao-encontrado', id: n }); return; }
      const rk = Object.keys(bin).find(k => /\/CharacterRecords\/Root$/i.test(k));
      const root = bin[rk] || {};
      const keep = {};
      Object.keys(bin).filter(k => bin[k] && /^(SpellObject|BuffScript)$/.test(bin[k].__type || '')).forEach(k => keep[k] = trim(bin[k]));
      out[n] = { id: n, registro: trim(root), objetos: keep, src: 'riot-cdragon' };
    });
    write(`${grupo}.json`, out);
  }

  /* ---------------- regras do mapa (Riot) ---------------- */
  const map = await get(`${CD}/game/data/maps/shipping/map11/map11.bin.json`, 'cd_map11.json');
  const xp = Object.values(map).find(o => o.__type === 'ExperienceCurveData' && o.mExperienceGrantedForKillPerLevel);
  const rules = {
    patch: PATCH,
    experiencia: xp ? {
      xp_para_subir_do_nivel: xp.mExperienceRequiredPerLevel, xp_ao_matar_campeao_por_nivel: xp.mExperienceGrantedForKillPerLevel,
      multiplicador_por_diferenca_de_nivel: xp.LevelDifferenceExperienceMultiplierPerLevel, src: 'riot-cdragon', origem: 'map11 ExperienceCurveData'
    } : null,
    formulas: {
      crescimento_stat: { descricao: 'stat(n) = base + crescimento * (n-1) * (0.7025 + 0.0175*(n-1))', src: 'wiki', obs: 'vale para vida, mana, dano, armadura, RM, regen; vel. ataque usa bonus% = crescimento*(n-1)*(0.7025+0.0175*(n-1))' },
      reducao_por_resistencia: { descricao: 'multiplicador = 100/(100+res) se res>=0; 2-100/(100-res) se res<0', src: 'wiki' },
      ordem_penetracao: { descricao: 'reducao % -> reducao plana -> penetracao % (armadura bonus antes) -> penetracao plana/letalidade', src: 'wiki' },
      letalidade: { descricao: 'penetracao plana de armadura = letalidade * (0.6 + 0.4*nivel_atacante/18)', src: 'wiki' },
      vel_ataque_max: { valor: 2.5, src: 'wiki' }
    },
    ondas_de_minions: {
      primeira_onda_s: 30, intervalo_entre_minions_s: 0.792,
      intervalos: [{ de_s: 30, ate_s: 840, intervalo_s: 30 }, { de_s: 840, ate_s: 1800, intervalo_s: 25 }, { de_s: 1800, ate_s: null, intervalo_s: 20 }],
      composicao: { melee: 3, caster: 3, siege: 'a partir de 1:30; a cada 3 ondas ate 14:00, a cada 2 ate 25:00, depois toda onda; nunca junto de super', super: '1/rota se 1 inibidor caiu; 2/rota se todos' },
      ouro: { melee: 20, caster: 14, siege_0030: 50, siege_1400: 59, siege_2500: 66, siege_3000: 69, ref: 'V26.01 (Wiki)' },
      src: 'wiki', obs: 'a Wiki cita V26.01 (nomenclatura nova de temporadas); pode divergir de 16.22 em ouro/tempo. Conferir no Bloco 5.'
    },
    pendente: [
      'Cronometros de selva e objetivos (nascimento/respawn) - so em scripts da Riot; conferir via Wiki no Bloco 6',
      'HP/dano/armadura/RM de torres, inibidores e Nexus por tier, placas de torre - ver registros em structures.json e conferir na Wiki no Bloco 7',
      'Crescimento de stats de minions por onda e ouro/XP por tipo - Bloco 5',
      'Ouro passivo e ambient gold do mapa 11 (GameModeConstants possui varios modos; modo Classic precisa ser identificado)'
    ]
  };
  write('rules.json', rules);

  prov.counts = { campeoes: ids.length, itens: Object.keys(items).length, monstros: Object.keys(JSON.parse(fs.readFileSync(path.join(OUT, 'monstros.json')))).length };
  write('meta.json', prov);
  console.log('ok ->', OUT, JSON.stringify(prov.counts), 'lacunas:', prov.gaps.length);
}
main().catch(e => { console.error(e); process.exit(1); });
