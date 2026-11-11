'use strict';
/* Gera o perfil de combate dos kits para o motor CLASSICO e o injeta no index.html (entre /*KITP-BEGIN*​/ e /*KITP-END*​/).
   Uso: node ferramentas/dados/gerar_perfil_classico.js [--dry]
   Entrada: kits (ferramentas/dados/fontes: 8 manuais + 165 rascunhos) e builds curadas e data/16.22.1/champions/*.json (textos pt_BR, alcance, recargas).
   Saida em index.html: const KITP = { 'Nome do jogo': { k:'bcsmr' (cinco digitos 0-9), h:[[slot,nome,descricao,recarga],...], b:[ids de item: botas, nucleo, finais] } }
   k = explosao, controle, sustentacao, mobilidade, alcance. Contagem de efeitos do kit ponderada pela recarga (nada de numeros inventados: so a estrutura dos kits e os dados do patch). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), HTML = path.join(ROOT, 'index.html');
const FONTES = path.join(__dirname, 'fontes'), DATA = path.join(ROOT, 'data', '16.22.1');
const KITS = {}; require(path.join(FONTES, 'wave1.js')).forEach(k => { KITS[k.id] = k; });
const AUTO = JSON.parse(fs.readFileSync(path.join(FONTES, 'auto.json'), 'utf8')); Object.keys(AUTO).forEach(id => { if (!KITS[id]) KITS[id] = AUTO[id]; });      /* rascunhos nunca substituem kit manual */
const { BUILDS } = require(path.join(FONTES, 'curated.js'));
const norm = x => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
const LIST = JSON.parse(fs.readFileSync(path.join(DATA, 'champions.json'), 'utf8')), BY = {};
LIST.forEach(c => { BY[norm(c.id)] = c.id; BY[norm(c.nome)] = c.id; });
const L = { resolveId: n => BY[norm(n)] || null, champion: id => JSON.parse(fs.readFileSync(path.join(DATA, 'champions', id + '.json'), 'utf8')) };
let html = fs.readFileSync(HTML, 'utf8');
const names = [...html.matchAll(/(?:^|`)[0-4]\|([^|\n]+)\|/gm)].map(m => m[1]);       /* linhas do CHDATA do index.html (a 1a comeca depois do acento grave) */
const HARD = { stun: 1, root: 1, snare: 1, knockup: 1, knockback: 0.9, suppress: 1.2, charm: 1, fear: 0.9, taunt: 0.9, sleep: 1, pull: 0.8, polymorph: 1, silence: 0.5, blind: 0.4, slow: 0.35, ground: 0.5 };
const clean = s => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\{\{[^}]+\}\}/g, '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const raw = {};
names.forEach(nm => {
  const id = L.resolveId(nm); if (!id) return;
  const kit = KITS[id], ch = L.champion(id); if (!kit) return;
  const hab = (ch.habilidades_texto || []).reduce((o, h) => { o[h.slot] = h; return o; }, {});
  let burst = 0, cc = 0, sus = 0, mob = 0;
  ['Q', 'W', 'E', 'R'].forEach(sl => {
    const k = kit[sl]; if (!k) return;
    const cd = (hab[sl] && hab[sl].recarga && (hab[sl].recarga[2] || hab[sl].recarga[0])) || 12, w = Math.max(0.35, Math.min(1.5, 14 / Math.max(3, cd))) * (sl === 'R' ? 1.4 : 1);
    (k.effects || []).forEach(e => {
      if (e.t === 'damage' || e.t === 'execute') burst += w * (e.t === 'execute' ? 1.3 : 1);
      else if (e.t === 'cc') cc += w * (HARD[e.kind] != null ? HARD[e.kind] : 0.6);
      else if (e.t === 'shield' || e.t === 'heal') sus += w * 0.9;
      else if (e.t === 'dash' || e.t === 'blink') mob += w;
      else if (e.t === 'ms') mob += w * 0.4;
      else if (e.t === 'summon') burst += w * 0.5;
    });
  });
  (kit.gaps || []).forEach(g => { if (/cura/i.test(g)) sus += 0.5; if (/lentid/i.test(g)) cc += 0.2; if (/pull|puxa|atordo|stun|imobil|enraiz/i.test(g)) cc += 0.4; if (/dash|blink|salto|teleport/i.test(g)) mob += 0.4; });
  const range = Math.max(0, Math.min(1, (((ch.stats_ddragon || {}).attackrange || 175) - 125) / 525));
  raw[nm] = { burst, cc, sus, mob, range, hab, ch };
});
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] || 1; };
const mx = k => q(Object.values(raw).map(r => r[k]), 0.95) || 1, M = { burst: mx('burst'), cc: mx('cc'), sus: mx('sus'), mob: mx('mob') };
const dig = (v, m) => Math.max(0, Math.min(9, Math.round(9 * v / m)));
const out = {};
Object.keys(raw).forEach(nm => {
  const r = raw[nm], h = [];
  const p = r.ch.passiva_texto; if (p && p.nome) h.push(['P', p.nome, cut(clean(p.descricao), 150), 0]);
  ['Q', 'W', 'E', 'R'].forEach(sl => { const x = r.hab[sl]; if (x) h.push([sl, x.nome, cut(clean(x.descricao || x.tooltip), 150), (x.recarga && (x.recarga[0] === x.recarga[x.recarga.length - 1] ? x.recarga[0] : x.recarga[0] + '→' + x.recarga[x.recarga.length - 1])) || 0]); });
  const inf = r.ch.info || {}, mix = (kit, v) => Math.max(0, Math.min(9, Math.round(0.65 * kit + 0.35 * v)));       /* o kit automatico subestima alguns campeoes: mistura 35% com o info do Data Dragon */
  const bu = mix(dig(r.burst, M.burst), 9 * Math.max(inf.attack || 0, inf.magic || 0) / 10), su = mix(dig(r.sus, M.sus), 9 * (inf.defense || 0) / 10);
  const bd = BUILDS[L.resolveId(nm)], build = bd ? [bd.b, ...bd.c, ...bd.f].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 7) : [];       /* botas + nucleo + finais (ESTIMADO, escritas a mao) */
  out[nm] = { k: '' + bu + dig(r.cc, M.cc) + su + dig(r.mob, M.mob) + Math.round(9 * r.range), h, b: build };
});
const lit = 'const KITP=' + JSON.stringify(out) + ';';
console.log('campeoes com perfil:', Object.keys(out).length, 'de', names.length, '| tamanho', Math.round(lit.length / 1024) + ' KB');
const ex = ['Leona', 'Ahri', 'Jinx', 'Lulu', 'Zed', 'Garen']; ex.forEach(n => out[n] && console.log(n, out[n].k, '(explosao controle sustentacao mobilidade alcance)'));
if (process.argv.includes('--dry')) process.exit(0);
const B = '/*KITP-BEGIN*/', E = '/*KITP-END*/', block = B + lit + E;
if (html.includes(B)) { const a = html.indexOf(B), b = html.indexOf(E) + E.length; html = html.slice(0, a) + block + html.slice(b); }
else html = html.replace('const CHD={},CHSY={},CHCT={};', () => '/* perfil de combate e habilidades dos kits (gerado por ferramentas/dados/gerar_perfil_classico.js) */\n' + block + '\nconst CHD={},CHSY={},CHCT={};');
fs.writeFileSync(HTML, html);
console.log('index.html atualizado');
