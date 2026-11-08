'use strict';
/* Adaptador motor realista <-> contrato `LV` do jogo (Bloco 9). SEM DOM e sem Math.random: roda em Node (testes) e no navegador (motor.js).
   O adaptador NAO escreve em `LV`: ele conduz uma partida do motor e devolve "snapshots" no formato que o jogo ja le (posicoes em %, vida 0..1,
   estruturas vivas, objetivos, abates, log em portugues). A cola em index.html copia o snapshot para o `LV`. Assim o motor legado continua intacto como fallback.
   Convencoes: lado 'blue' = time 0 (Order, canto inferior esquerdo); 'red' = time 1. Papel 0..4 = top, selva, meio, atirador, suporte. */
const M = require('../ai/match'), LAY = require('../map/layout');
const { KITS } = require('../champion/kits/index');
const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
const DEFAULT_CHAMP = [['Garen', 'Malphite'], ['Amumu', 'Amumu'], ['Ahri', 'Annie'], ['Ezreal', 'Ezreal'], ['Leona', 'Morgana']];   /* usados quando o draft nao definiu o campeao */
const DRAKE = { sru_dragon_fire: 'inf', sru_dragon_earth: 'mon', sru_dragon_water: 'oce', sru_dragon_air: 'nuv', sru_dragon_hextech: 'hex', sru_dragon_chemtech: 'qui' };
const DRAKE_PT = { inf: 'Infernal', mon: 'Montanha', oce: 'Oceano', nuv: 'Nuvem', hex: 'Hextec', qui: 'Químico' };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const STYLE = { ag: 'ag', eq: 'ma', co: 're' };            /* instrucoes do jogo -> estilos da IA (Agressivo, Macro, Reativo) */

const hasKit = name => !!name && Object.prototype.hasOwnProperty.call(KITS, name);
/* campeoes (10, ou null = sem draft) -> o motor realista suporta? null conta como suportado (usa o campeao padrao do papel) */
const supported = champs => (champs || []).every(c => c == null || c === '' || hasKit(c));
/* o time 1 repete o campeao do time 0 em varias funcoes (ex. Amumu x2, Ezreal x2): o motor permite, entao so a existencia do kit importa */

function lvPos(p) { return [clamp(p.x / LAY.W * 100, 1, 99), clamp(100 - p.y / LAY.H * 100, 1, 99)]; }

/* opts: {seed, teams:[blue,red]} ; cada time {name, style:'ag|eq|co', players:[{name, champ|null, attrs:{lane,mec,macro,team,mental}, level?}] x5 em ordem de papel} */
function create(opts) {
  const teams = opts.teams.map((t, ti) => ({
    name: t.name, style: STYLE[t.style] || t.style || undefined,
    roster: t.players.map((p, r) => ({ name: hasKit(p.champ) ? p.champ : DEFAULT_CHAMP[r][ti], player: p.name, role: ROLES[r], attrs: p.attrs, level: p.level }))
  }));
  const g = M.createGame({ seed: opts.seed || 1, teams, cap: opts.cap || 3600 });
  const S = { g, w: g.w, teams, names: teams.map(t => t.roster.map(p => p.name)), cursor: 0, logOut: [], over: null, steps: 0 };
  const w = g.w, nm = id => { const u = w.units.find(x => x.id === id); return u ? u : null; };
    const side = team => (team === 0 ? 'blue' : 'red');
  /* os campeoes de cada time na ordem de papel */
  S.champs = [0, 1].map(ti => g.brains[ti].players.map(p => p.u));
  const pname = (ti, r) => teams[ti].roster[r].player;
  const nameOf = u => { for (let ti = 0; ti < 2; ti++) { const r = S.champs[ti].indexOf(u); if (r >= 0) return { ti, r, n: pname(ti, r), ch: teams[ti].roster[r].name }; } return null; };
  const tnm = ti => teams[ti].name;
  const say = (t, text, k, ti) => S.logOut.push({ m: t, t: text, k: k || 'sys', ti });
  /* traducao do log estruturado -> linhas do jogo */
  S.cnt = {}; w.listeners.push(e => { if (e.team === 0 || e.team === 1) { const k = e.type + e.team; S.cnt[k] = (S.cnt[k] || 0) + 1; } });
  S.translate = e => {
    switch (e.type) {
      case 'first-blood': { const a = nameOf(nm(e.id)); if (a) say(e.t, `Primeiro abate! ${a.n} (${a.ch}) abre o placar.`, 'kill', a.ti); break; }
      case 'kill': {
        const v = nameOf(nm(e.dst)); if (!v) break;
        const a = e.src != null ? nameOf(nm(e.src)) : null;
        say(e.t, a ? `${a.n} (${a.ch}) abate ${v.n} (${v.ch}).` : `${v.n} (${v.ch}) morre.`, 'kill', a ? a.ti : 1 - v.ti); break;
      }
      case 'structure-fall': {
        if (e.sub === 'inhibitor') say(e.t, `${tnm(1 - e.team)} derruba um inibidor ${e.lane ? 'na rota ' + ({ top: 'superior', mid: 'do meio', bot: 'inferior' })[e.lane] : ''}.`, 'tower', 1 - e.team);
        else if (e.sub === 'turret') say(e.t, `${tnm(1 - e.team)} derruba uma torre${e.lane ? ' ' + ({ top: 'do topo', mid: 'do meio', bot: 'inferior' })[e.lane] : ' do Nexus'}.`, 'tower', 1 - e.team);
        break;
      }
      case 'drake-kill': say(e.t, `${tnm(e.team)} abate o Dragão ${DRAKE_PT[DRAKE[e.mkey]] || ''}.`, 'obj', e.team); break;
      case 'soul': say(e.t, `${tnm(e.team)} conquista a Alma do Dragão!`, 'obj', e.team); break;
      case 'elder-kill': say(e.t, `${tnm(e.team)} abate o Dragão Ancião!`, 'obj', e.team); break;
      case 'baron-kill': say(e.t, `${tnm(e.team)} abate o Barão Nashor!`, 'obj', e.team); break;
      case 'herald-kill': say(e.t, `${tnm(e.team)} abate o Arauto do Vale.`, 'obj', e.team); break;
      case 'grub-stack': say(e.t, `${tnm(e.team)} abate uma Vastilarva (${e.n}).`, 'obj', e.team); break;
      case 'epic-spawn': say(e.t, ({ baron: 'O Barão Nashor nasceu.', herald: 'O Arauto do Vale nasceu.', grubs: 'As larvas do Vazio nasceram.', drake: 'Um Dragão nasceu.' })[e.epic] || null, 'sys'); break;
      case 'inhibitor-up': say(e.t, `Um inibidor de ${tnm(e.team)} renasceu.`, 'sys'); break;
      case 'gank': { const a = nameOf(nm(e.id)); if (a) say(e.t, `${a.n} (${a.ch}) faz gank ${e.lane === 'top' ? 'no topo' : e.lane === 'mid' ? 'no meio' : 'na rota inferior'}.`, 'sys', a.ti); break; }
      case 'game-end': say(e.t, `${tnm(e.winner)} destrói o Nexus!`, 'end', e.winner); break;
      default: break;
    }
  };
  w.listeners.push(e => S.translate(e));
  S.logOut = S.logOut.filter(l => l.t);
  return S;
}

/* avanca `sec` segundos de jogo (para quando o Nexus cai) */
function advance(S, sec) {
  const w = S.w; if (S.over) return S.over;
  const until = w.t + sec;
  while (w.t < until - 1e-9 && w.winner() === null) w.run(Math.min(1, until - w.t));
  S.steps++;
  if (w.winner() !== null && !S.over) S.over = { winner: w.winner(), t: w.t };
  return S.over;
}
/* troca o estilo do time (instrucoes dos checkpoints: ag/eq/co) */
function setStyle(S, ti, st) { S.g.brains[ti].style = STYLE[st] || st; }
/* novas linhas de log desde a ultima leitura (traduzidas) */
function drainLog(S) { S.logOut = S.logOut.filter(l => l.t); const o = S.logOut; S.logOut = []; return o; }

const alive = (s) => !s.dead;
function snapshot(S) {
  const w = S.w, sx = w.structures;
  const players = [0, 1].map(ti => S.champs[ti].map((u, r) => {
    const p = lvPos(u.pos), deadIn = u.dead ? Math.max(0, (u.respawnAt || w.t) - w.t) : 0;
    return { r, ch: S.names[ti][r], x: p[0], y: p[1], hp: clamp(u.hp / Math.max(1, u.hpMax), 0, 1), mana: u.manaMax ? clamp(u.mana / u.manaMax, 0, 1) : 0, lv: u.level, gold: Math.round((u.stat.goldEarned || 0) + 500),
      cs: u.stat.cs || 0, k: u.stat.kills || 0, d: u.stat.deaths || 0, a: u.stat.assists || 0, dead: u.dead, deadIn, dmg: Math.round(u.stat.dmgDealt || 0), items: (u.items || []).slice(0, 6), mn: u.manaMax ? clamp(u.mana / u.manaMax, 0, 1) : null };
  }));
  const str = [0, 1].map(ti => {
    const L = sx.lanes[ti], o = {};
    ['top', 'mid', 'bot'].forEach(id => { o[id] = [alive(L[id].outer) ? 1 : 0, alive(L[id].inner) ? 1 : 0, alive(L[id].inhibTurret) ? 1 : 0]; });
    o.inhib = { top: alive(L.top.inhibitor) ? 1 : 0, mid: alive(L.mid.inhibitor) ? 1 : 0, bot: alive(L.bot.inhibitor) ? 1 : 0 };
    o.nx = sx.nexusTurrets[ti].map(s => (alive(s) ? 1 : 0)); o.nex = alive(sx.nexus[ti]) ? 1 : 0; return o;
  });
  const jg = w.jungle, drakes = [0, 1].map(ti => { const c = {}; (jg.stacks[ti] || []).forEach(k => { const d = DRAKE[k]; if (d) c[d] = (c[d] || 0) + 1; }); return c; });
  const cnt = (type, ti) => S.cnt[type + ti] || 0;
  const obj = [0, 1].map(ti => ({ drakes: drakes[ti], grubs: (jg.stacks[ti] && jg.stacks[ti].grubs) || 0, herald: cnt('herald-kill', ti), baron: cnt('baron-kill', ti), elder: cnt('elder-kill', ti), soul: jg.soul[ti] ? 1 : 0 }));
  const team = ti => { const pl = players[ti]; return { k: pl.reduce((a, p) => a + p.k, 0), d: pl.reduce((a, p) => a + p.d, 0), gold: pl.reduce((a, p) => a + p.gold, 0), towers: 11 - (str[ti].top.concat(str[ti].mid, str[ti].bot, str[ti].nx).reduce((a, b) => a + b, 0)) }; };
  return { t: w.t, winner: S.over ? S.over.winner : null, players, str, obj, teams: [team(0), team(1)], drakeSpawned: !!jg.epics.drake, baronUp: !!(jg.epics.baron && jg.epics.baron.some(m => !m.dead)) };
}

module.exports = { create, advance, snapshot, setStyle, drainLog, supported, hasKit, lvPos, ROLES, DEFAULT_CHAMP, DRAKE };
