'use strict';
/* Gera RASCUNHOS de kits (src/engine/champion/kits/auto.json) para os campeões sem kit escrito à mão, a partir de data/16.22.1/kits_info.json
   (patch + estrutura da Wiki). Regras: números só por referência {dv}/{calc}/{dmg} aos DataValues e cálculos REAIS do patch; cada efeito é validado
   (resolve em rank 3, nível 11, sem erro e finito) e o que não valida vira `gaps`. O que o motor não modela (passivas, reconjuração, cura,
   empurrão/puxão/provocação/sono/cegueira...) é DECLARADO em `gaps`; não há dano inventado. Kits escritos à mão (wave1.js) têm prioridade.
   Uso: node ferramentas/dados/gerar_kits_auto.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'src', 'engine', 'champion', 'kits', 'auto.json');
const info = require(path.join(ROOT, 'data', '16.22.1', 'kits_info.json')).campeoes;
const { createLoader } = require(path.join(ROOT, 'src/engine/data/loader'));
const { spellDefs } = require(path.join(ROOT, 'src/engine/champion/spells'));
const { computeStats } = require(path.join(ROOT, 'src/engine/champion/stats'));
const { resolveSlot } = require(path.join(ROOT, 'src/engine/champion/kits/index'));
const wave1 = require(path.join(ROOT, 'src/engine/champion/kits/wave1'));
const L = createLoader(), hand = new Set(wave1.map(k => k.id));

const has = (dvs, re, not) => dvs.find(n => re.test(n) && !(not && not.test(n)));
const CCDUR = { stun: /^(max)?stun(duration|time)?$|stun.*dur/i, root: /root.*dur|^snare/i, knockup: /knock.?up.*dur|airborne.*dur|^knockup$/i, charm: /charm.*dur/i, fear: /fear.*dur/i, silence: /silence.*dur/i, suppress: /suppress.*dur/i };
const UNMODELED = ['knockback', 'pull', 'taunt', 'sleep', 'blind', 'polymorph', 'ground'];
const NO = /minion|monster|maxstacks|maxhealth|cap$/i;
const SHIELD_BASE = /^(base)?shield(amount|base)?$|^baseshield$/i;

function typeOf(p, w, txt) {
  const cited = [['magic', /Dano Mágico/i], ['physical', /Dano Físico/i], ['true', /Dano Verdadeiro/i]].filter(x => x[1].test(txt || '')).map(x => x[0]);
  if (cited.length === 1) return cited[0];                                  /* o texto oficial cita um só tipo: ele vence */
  const f = p.rotulosTooltip.find(x => ['magicDamage', 'physicalDamage', 'trueDamage'].includes(x));
  if (f) return { magicDamage: 'magic', physicalDamage: 'physical', trueDamage: 'true' }[f];
  return { MAGIC_DAMAGE: 'magic', PHYSICAL_DAMAGE: 'physical', TRUE_DAMAGE: 'true' }[w && w.tipoDano] || null;
}
function pickDamage(calcs, dvs) {
  const c = calcs.filter(n => !/^\{/.test(n) && /dam|dmg/i.test(n));
  const ok = c.filter(n => !/minion|monster|max|second|echo|bonus|empower|passthrough|extra|per|tick/i.test(n));
  const pool = ok.length ? ok : c;
  if (pool.length) {
    const best = pool.find(n => /^total_?damage$/i.test(n)) || pool.find(n => /^total/i.test(n)) || pool.slice().sort((a, b) => a.length - b.length)[0];
    return { ref: { calc: best }, rest: c.filter(n => n !== best) };
  }
  const base = has(dvs, /^(spell|r|q|w|e)?(base)?(magic|physical)?damage$/i, NO); if (!base) return null;
  const ap = has(dvs, /^(damage)?ap_?ratio$|^totalapratio$|^damageapratio$/i), ad = has(dvs, /^(total)?ad_?ratio$|^totaladratio$/i), bad = has(dvs, /^bonus_?ad_?ratio$/i);
  const o = { base }; if (ap) o.ap = ap; if (ad) o.ad = ad; if (bad) o.bad = bad;
  return { ref: { dmg: o }, rest: [], dvOnly: true };
}

function build(id) {
  const e = info[id], ch = L.champion(id), defs = spellDefs(ch), gaps = ['passiva ' + (e.habilidades.P.patch.nome || '') + ' não modelada'];
  const kit = { id, auto: true, P: { effects: [{ t: 'passive', name: e.habilidades.P.patch.nome || 'Passiva' }] }, gaps };
  for (const slot of ['Q', 'W', 'E', 'R']) {
    const h = e.habilidades[slot], p = h.patch, w = h.wiki || {}, d = defs[slot];
    if (!d || !p.chave) { gaps.push(slot + ': sem dados'); continue; }
    const dvsO = (ch.objetos_habilidade[p.chave].mSpell.DataValues || []).map(x => x.name), calcsO = p.calculos;
    const g = x => gaps.push(slot + ': ' + x), fx = [];
    const dmg = pickDamage(calcsO, dvsO), ty = typeOf(p, w, String((ch.habilidades_texto[['Q', 'W', 'E', 'R'].indexOf(slot)] || {}).descricao || '').replace(/<[^>]+>/g, ' '));
    if (dmg) {
      fx.push({ t: 'damage', calc: dmg.ref.dmg ? { dmg: dmg.ref.dmg } : dmg.ref, type: ty || 'magic' });
      if (!ty) g('tipo de dano assumido magic (sem rótulo)');
      if (dmg.dvOnly) g('dano só por DataValues base/razão (sem cálculo oficial)');
      if (dmg.rest.length) g('outras partes do dano não modeladas: ' + dmg.rest.join(', '));
    } else if (p.rotulosTooltip.some(x => /Damage$/.test(x))) g('dano sem DataValue/cálculo identificável');
    for (const [k, re] of Object.entries(CCDUR)) { const n = has(dvsO, re, /min|passive/i); if (n) fx.push({ t: 'cc', kind: k, dur: { dv: n } }); }
    {
      const am = has(dvsO, /^(base)?slow(amount|percent|percentage|potency|pct)?$|^baseslow(amount|percent)?$/i, /self|dur|ratio/i);
      const du = has(dvsO, /slow.*dur(ation)?$/i, /self|linger/i) || has(dvsO, /^(cc|debuff)duration$|^duration$/i);
      if (am && du) fx.push({ t: 'cc', kind: 'slow', amount: { dv: am }, dur: { dv: du } });
      else if ((w.controles || []).includes('slow')) g('lentidão sem par valor+duração identificável');
    }
    (w.controles || []).filter(x => UNMODELED.includes(x)).forEach(x => g('controle ' + x + ' não modelado'));
    (w.controles || []).filter(x => CCDUR[x] && !fx.some(f => f.kind === x)).forEach(x => g('controle ' + x + ' sem duração identificável'));
    if (w.reconjuracao || (p.spellTags || []).includes('Trait_RecastOrReplaceSpell')) g('reconjuração/transformação não modelada (só a 1ª conjuração)');
    if (w.cura || p.rotulosTooltip.includes('heal')) g('cura não modelada');
    /* efeitos sobre si */
    const self = [];
    if (p.rotulosTooltip.includes('shield')) {
      const c = calcsO.find(n => /shield/i.test(n) && !/^\{/.test(n)), b = has(dvsO, SHIELD_BASE), du = has(dvsO, /shield.*dur(ation)?$|^duration$/i);
      let calc = null;
      if (c) calc = { calc: c }; else if (b) { const ap = has(dvsO, /shield.*ap.?ratio|^apratio$/i), o = { base: b }; if (ap) o.ap = ap; calc = { dmg: o }; }
      if (calc && du) self.push({ t: 'shield', calc, dur: { dv: du } }); else g('escudo sem valor+duração identificável');
    }
    {
      const ms = has(dvsO, /^(bonus)?(move(ment)?_?speed|ms)(amount|mod|bonus|percent)?$|^haste$/i, /dur|ratio|max|min|slow|self/i);
      const du = has(dvsO, /(move(ment)?_?speed|ms|haste).*dur(ation)?$/i) || (ms ? has(dvsO, /^(buff)?duration$/i) : null);
      if (ms && du) self.push({ t: 'ms', amount: { dv: ms }, dur: { dv: du } });
      else if ((w.mobilidade || []).includes('speed')) g('velocidade de movimento sem par valor+duração');
    }
    /* forma */
    const tgt = fx.filter(f => f.t === 'damage' || f.t === 'cc'), tk = (w.alvo || '').split('/')[0].trim().toLowerCase(), pt = p.alvoTipo;
    const ally = /Allies/.test(w.afeta || '') && !/Enemies/.test(w.afeta || '');
    const rng = (p.alcance && p.alcance[0]) || 0, rad = (p.raio && p.raio[0]) || 0, wid = p.larguraLinha || 0, mis = p.velocidadeMissil || 0;
    const dashDv = has(dvsO, /dash.*(dist|range)|^(dash)?distance$|^blinkrange$|^leaprange$/i, /speed|dur/i), dashSp = has(dvsO, /dash.?speed|leapspeed/i);
    const mob = (w.mobilidade || []).filter(x => x === 'dash' || x === 'blink');
    const tags = p.spellTags || [];
    const isMove = mob.length && (dashDv || dashSp || tags.includes('PositiveEffect_Teleport') || tags.includes('Trait_PlayerSelectedDashDirection')) && !(mis > 800 && wid > 0);
    let shape = null, eff = [];
    if (isMove && rng) {
      if (mob.includes('blink') && !mob.includes('dash') && !tgt.length) { shape = 'blink'; eff = [{ t: 'blink', range: 'spell' }]; }
      else { shape = 'dash'; eff = [{ t: 'dash', ...(dashDv ? { dist: { dv: dashDv } } : {}), ...(dashSp ? { speed: { dv: dashSp } } : {}) }, ...tgt]; if (self.length) g('efeito sobre si misturado ao dash: não aplicado'); }
    } else if (tgt.length) {
      if (pt === 'Cone') shape = 'cone';
      else if (tk === 'unit' && rng) shape = 'target';
      else if ((pt === 'SelfAoe' || tk === 'proximity' || (tk === 'auto' && pt === 'Self')) && rad) shape = 'selfAoe';
      else if ((pt === 'Area' || pt === 'AreaClamped' || tk === 'location') && rad && !(mis > 0 && wid > 0)) shape = 'area';
      else if (rng >= 5000 && wid) shape = 'globalLine';
      else if (wid || mis || tk === 'direction' || pt === 'Direction') shape = rng ? 'skillshot' : null;
      else if (rng && rad) shape = 'area'; else if (rng) shape = 'target'; else if (rad) shape = 'selfAoe';
      if (shape) { eff = tgt.slice(); if (self.length) g('efeito sobre si (escudo/velocidade) misturado a dano: não aplicado nesta forma'); }
    } else if (self.length) {
      shape = ally && tk === 'unit' && rng ? 'targetAlly' : 'self'; eff = self;
    }
    if (!shape || !eff.length) { g('sem efeito modelável (forma/valores); habilidade sem ação'); continue; }
    /* validação: cada efeito precisa resolver (rank 3, nível 11) com números finitos */
    const S = computeStats(ch, 11, { flat: { ap: 100, ad: 60 } }), keep = [];
    for (const f of eff) {
      let ok = true;
      try {
        const r = resolveSlot(defs, { [slot]: { shape, effects: [f] } }, slot, { rank: Math.min(3, d.maxRank), level: 11, S });
        JSON.stringify(r.effects, (k, v) => { if (v && v.unsupported) ok = false; if (typeof v === 'number' && !Number.isFinite(v)) ok = false; return v; });
        if (!Number.isFinite(r.cooldown) || r.cooldown <= 0) ok = false;
      } catch (er) { ok = false; }
      if (ok) keep.push(f); else g('efeito ' + f.t + (f.kind ? ' ' + f.kind : '') + ' não avaliável nos dados: descartado');
    }
    let cdOk = true; for (let rk = 1; rk <= d.maxRank; rk++) { const c = d.cooldown(rk); if (!Number.isFinite(c) || c <= 0) cdOk = false; }
    if (!cdOk) { g('recarga inválida em algum rank nos dados; habilidade sem ação'); continue; }
    const useful = keep.filter(f => f.t !== 'dash' && f.t !== 'blink');
    if (!keep.length || (!useful.length && shape !== 'dash' && shape !== 'blink')) { g('nenhum efeito validou; habilidade sem ação'); continue; }
    if (shape === 'dash' && !keep.some(f => f.t === 'dash' && (f.dist || f.speed))) { g('dash sem distância/velocidade validada'); continue; }
    kit[slot] = { shape, effects: keep };
  }
  return kit;
}

const out = {}, rel = { n: 0, acts: 0, slots: 0, perShape: {}, noAction: [] };
L.championIds().filter(id => !hand.has(id) && info[id]).forEach(id => {
  const k = build(id); out[id] = k; rel.n++;
  ['Q', 'W', 'E', 'R'].forEach(s => { rel.slots++; if (k[s]) { rel.acts++; rel.perShape[k[s].shape] = (rel.perShape[k[s].shape] || 0) + 1; } else rel.noAction.push(id + s); });
});
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('kits', rel.n, '| habilidades com ação', rel.acts + '/' + rel.slots, JSON.stringify(rel.perShape), '| sem ação', rel.noAction.length);
