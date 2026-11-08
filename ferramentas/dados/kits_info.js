'use strict';
/* Reúne, por campeão e habilidade (P/Q/W/E/R), o que as fontes dizem sobre o KIT, para apoiar a escrita/validação dos kits do motor realista:
   - PATCH (data/16.22.1/champions/*.json, extraído do cliente + Data Dragon): recarga, custo, alcance, tempo de conjuração, raio, largura, velocidade do míssil,
     nomes dos DataValues/cálculos e os rótulos do tooltip (tipos de dano, escudo, cura, status).
   - WIKI/Meraki Analytics (cdn.merakianalytics.com, dados estruturados da Wiki do LoL; baixado para ferramentas/dados/.cache/meraki.json): tipo de alvo
     (Direction/Location/Unit/Auto/Proximity), afeta quem, tipo de dano, projétil, e os controles de grupo/mobilidade citados na descrição.
   Os NÚMEROS vêm sempre do patch. A Wiki/Meraki está num patch mais antigo (patchLastChanged por campeão fica registrado): serve só para a ESTRUTURA
   (forma, tipo de efeito) e cada divergência é sinalizada em `avisos`. Saída: data/16.22.1/kits_info.json e docs/KITS_FONTES_16.22.1.md.
   Uso: node ferramentas/dados/kits_info.js   (baixa o Meraki se faltar) */
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = path.join(__dirname, '..', '..'), PATCH = '16.22.1', DIR = path.join(ROOT, 'data', PATCH);
const CACHE = path.join(__dirname, '.cache', 'meraki.json');
const SLOTS = ['P', 'Q', 'W', 'E', 'R'];

function baixar() {
  return new Promise((res, rej) => {
    if (fs.existsSync(CACHE)) return res();
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    https.get('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json', r => {
      const ch = []; r.on('data', d => ch.push(d)); r.on('end', () => { fs.writeFileSync(CACHE, Buffer.concat(ch)); res(); });
    }).on('error', rej);
  });
}
/* controles de grupo e mobilidade citados no texto/atributos (inglês, Wiki) */
const CC = [['stun', /\bstun/i], ['root', /\broot|\bsnare|\bimmobiliz/i], ['slow', /\bslow/i], ['knockup', /knock(s|ed)? (\w+ )?up|airborne|knock up/i], ['knockback', /knock(s|ed)? (\w+ )?back|\bpush(es|ed)?\b|\bknockback/i],
  ['pull', /\bpull|\bdrag(s)? |\bdraw/i], ['charm', /\bcharm/i], ['fear', /\bfear|\bflee|terrif/i], ['taunt', /\btaunt/i], ['silence', /\bsilenc/i], ['suppress', /\bsuppress/i], ['sleep', /\bsleep|\bdrowsy/i],
  ['blind', /\bblind|\bcripple/i], ['polymorph', /\bpolymorph/i], ['ground', /\bgrounded\b/i], ['disarm', /\bdisarm/i], ['cleanse', /\bcleans/i], ['untargetable', /untargetable|\bstasis/i]];
const MOVE = [['dash', /\bdash(es)?\b|\blunge|\bcharge(s)? (toward|forward)|\bleap/i], ['blink', /\bblink|\bteleport|\bflash/i], ['stealth', /\bcamouflage|\bstealth|\binvisib/i], ['speed', /movement speed/i]];
const tags = s => { const o = []; String(s || '').replace(/<(\w+)>/g, (_, t) => { if (!o.includes(t)) o.push(t); }); return o; };
const arr = (a, n = 5) => (Array.isArray(a) ? a.slice(0, n) : a == null ? null : [a]);

function patchSlot(ch, slot) {
  if (slot === 'P') { const pt = ch.passiva_texto || {}; return { nome: pt.nome || (ch.passiva_ref && ch.passiva_ref.nome) || null, chaves: ch.passiva_chaves || [], dataValues: [], calculos: [], spellTags: [], rotulosTooltip: tags(pt.tooltip || pt.descricao) }; }
  const i = SLOTS.indexOf(slot) - 1, key = (ch.habilidades_chaves || [])[i], o = key && ch.objetos_habilidade && ch.objetos_habilidade[key];
  const tx = (ch.habilidades_texto || []).find(t => t.slot === slot) || {};
  const sp = o && o.mSpell || {};
  const dvs = (sp.DataValues || []).map(d => d.name), calcs = Object.keys(sp.mSpellCalculations || {});
  return {
    chave: key || null, nome: tx.nome || null, recarga: arr(tx.recarga), custo: arr(tx.custo), alcance: arr(tx.alcance),
    tempoConjuracao: sp.mCastTime != null ? sp.mCastTime : sp.spellCastTime != null ? sp.spellCastTime : null,
    raio: arr(sp.castRadius, 1), larguraLinha: sp.mLineWidth != null ? sp.mLineWidth : null, velocidadeMissil: sp.missileSpeed != null ? sp.missileSpeed : null,
    alvoTipo: sp.mTargetingTypeData && sp.mTargetingTypeData.__type || null, spellTags: sp.mSpellTags || [],
    dataValues: dvs, calculos: calcs, rotulosTooltip: tags(tx.tooltip)
  };
}
function merakiSlot(m, slot) {
  const a = m && m.abilities && m.abilities[slot];
  if (!a || !a.length) return null;
  const forma = a[0], txt = a.map(x => (x.effects || []).map(e => e.description || '').join(' ') + ' ' + (x.blurb || '') + ' ' + (x.notes || '')).join(' ');
  const attrs = []; a.forEach(x => (x.effects || []).forEach(e => (e.leveling || []).forEach(l => { if (l.attribute && !attrs.includes(l.attribute)) attrs.push(l.attribute); })));
  const todo = txt + ' ' + attrs.join(' ');
  return {
    nome: forma.name, formas: a.length, alvo: forma.targeting || null, afeta: forma.affects || null, tipoDano: forma.damageType || null, projetil: forma.projectile || null,
    velocidade: forma.speed != null ? +forma.speed || forma.speed : null, largura: forma.width != null ? +forma.width || forma.width : null, angulo: forma.angle != null ? +forma.angle || forma.angle : null,
    raioEfeito: forma.effectRadius != null ? +forma.effectRadius || forma.effectRadius : null, tempoConjuracao: forma.castTime != null ? +forma.castTime || forma.castTime : null,
    recarga: forma.cooldown && forma.cooldown.modifiers && forma.cooldown.modifiers[0] ? forma.cooldown.modifiers[0].values : null,
    atributos: attrs, controles: CC.filter(([, re]) => re.test(todo)).map(x => x[0]), mobilidade: MOVE.filter(([, re]) => re.test(todo)).map(x => x[0]),
    escudo: /shield/i.test(todo), cura: /\bheal/i.test(todo) || attrs.some(x => /heal/i.test(x)), reconjuracao: /recast|re-cast|second cast|reactivat|cast again/i.test(txt)
  };
}

(async () => {
  await baixar();
  const mer = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const lista = JSON.parse(fs.readFileSync(path.join(DIR, 'champions.json'), 'utf8'));
  const out = { patch: PATCH, fonteWiki: 'Meraki Analytics (dados estruturados da Wiki do LoL), patch mais antigo: apenas estrutura', campeoes: {} };
  const rel = { semWiki: [], semChaves: [], divTipoDano: [], total: 0, slots: 0, ccPorTipo: {}, formas: {} };
  lista.forEach(c => {
    const ch = JSON.parse(fs.readFileSync(path.join(DIR, 'champions', c.id + '.json'), 'utf8')), m = mer[c.id] || null, e = { nome: c.nome, funcoes: c.funcoes, recurso: c.recurso, wikiPatch: m ? m.patchLastChanged : null, habilidades: {}, avisos: [] };
    if (!m) { e.avisos.push('sem dados da Wiki/Meraki (campeão novo): estrutura só do patch'); rel.semWiki.push(c.id); }
    SLOTS.forEach(s => {
      const p = patchSlot(ch, s), w = m ? merakiSlot(m, s) : null;
      if (s !== 'P' && !p.chave) { e.avisos.push(s + ': sem chave de habilidade no patch'); rel.semChaves.push(c.id + s); }
      const tdPatch = p.rotulosTooltip.includes('magicDamage') ? 'MAGIC_DAMAGE' : p.rotulosTooltip.includes('physicalDamage') ? 'PHYSICAL_DAMAGE' : p.rotulosTooltip.includes('trueDamage') ? 'TRUE_DAMAGE' : null;
      if (w && w.tipoDano && tdPatch && w.tipoDano !== tdPatch && w.tipoDano !== 'MIXED_DAMAGE' && w.tipoDano !== 'OTHER_DAMAGE') { e.avisos.push(s + ': tipo de dano difere (patch ' + tdPatch + ' x Wiki ' + w.tipoDano + ')'); rel.divTipoDano.push(c.id + s); }
      e.habilidades[s] = { patch: p, wiki: w };
      rel.slots++; if (w) { w.controles.forEach(x => { rel.ccPorTipo[x] = (rel.ccPorTipo[x] || 0) + 1; }); rel.formas[w.alvo] = (rel.formas[w.alvo] || 0) + 1; }
    });
    out.campeoes[c.id] = e; rel.total++;
  });
  fs.writeFileSync(path.join(DIR, 'kits_info.json'), JSON.stringify(out));
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(x => x[0] + ' ' + x[1]).join(' · ');
  const md = `# Fontes dos kits — patch ${PATCH}

Gerado por \`node ferramentas/dados/kits_info.js\` (arquivo de dados: \`data/${PATCH}/kits_info.json\`).

- **Campeões:** ${rel.total} · **habilidades (P/Q/W/E/R):** ${rel.slots}
- **Patch (números):** cliente + Data Dragon, o mesmo usado pelo motor (recarga, custo, alcance, raio, largura, míssil, DataValues e cálculos oficiais).
- **Wiki (estrutura):** Meraki Analytics, dados estruturados da Wiki do LoL, **patch mais antigo** (\`wikiPatch\` por campeão); só forma, alvo, tipo de dano, controles e mobilidade. Nunca números.
- **Sem dados da Wiki:** ${rel.semWiki.join(', ') || 'nenhum'}
- **Habilidades sem chave no patch:** ${rel.semChaves.length ? rel.semChaves.join(', ') : 'nenhuma'}
- **Divergência de tipo de dano patch x Wiki:** ${rel.divTipoDano.length} (${rel.divTipoDano.slice(0, 25).join(', ')}${rel.divTipoDano.length > 25 ? '…' : ''}) — o patch vence; a divergência vira \`avisos\` do campeão.

## Controles de grupo e mobilidade encontrados (Wiki)
${top(rel.ccPorTipo)}

## Tipos de alvo (Wiki)
${top(rel.formas)}

Limite: a detecção de controle/mobilidade é por palavras na descrição da Wiki (inglês); serve para planejar e conferir os kits, não substitui a leitura do tooltip ao escrever cada kit.
`;
  fs.writeFileSync(path.join(ROOT, 'docs', 'KITS_FONTES_' + PATCH + '.md'), md);
  console.log('campeões', rel.total, '| slots', rel.slots, '| sem Wiki', rel.semWiki.length, '| sem chave', rel.semChaves.length, '| div. dano', rel.divTipoDano.length);
})();
