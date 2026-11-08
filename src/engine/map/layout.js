'use strict';
/* Geometria do mapa (Bloco 7).
   ATENCAO - ESTIMADO: o cliente (cdragon) NAO traz posicoes de estruturas nem a malha de navegacao (isso vive nos arquivos de cena do mapa,
   que nao estao nos dados extraidos), e a Wiki nao publica coordenadas. As posicoes abaixo sao aproximacoes de comunidade da Summoner's Rift
   (mapa 14870 x 14980, origem embaixo a esquerda, time 0 = Order no canto inferior esquerdo, time 1 = Chaos por simetria central).
   Nao ha paredes: o movimento continua em espaco livre. Substituir por dados oficiais quando houver extracao do mapa (pendente). */
const W = 14870, H = 14980;
const mirror = p => ({ x: W - p.x, y: H - p.y });

/* time 0 (Order). Cada rota: torre externa, interna, torre do inibidor e inibidor. */
const ORDER = {
  top: { outer: { x: 981, y: 10441 }, inner: { x: 1512, y: 6699 }, inhibTurret: { x: 1169, y: 4287 }, inhibitor: { x: 1171, y: 3571 } },
  mid: { outer: { x: 5846, y: 6396 }, inner: { x: 5048, y: 4812 }, inhibTurret: { x: 3651, y: 3696 }, inhibitor: { x: 3203, y: 3208 } },
  bot: { outer: { x: 10504, y: 1029 }, inner: { x: 6919, y: 1483 }, inhibTurret: { x: 4281, y: 1253 }, inhibitor: { x: 3452, y: 1236 } }
};
const ORDER_NEXUS = { x: 1600, y: 1600 }, ORDER_NEXUS_TURRETS = [{ x: 1748, y: 2270 }, { x: 2177, y: 1807 }], ORDER_FOUNTAIN = { x: 400, y: 400 };

/* caminho dos minions do time 0 (da rota do inibidor ate o inibidor inimigo); o time 1 percorre ao contrario */
const ORDER_PATH = {
  top: [{ x: 1171, y: 3571 }, { x: 1512, y: 6699 }, { x: 981, y: 10441 }, { x: 1200, y: 13500 }, { x: 4366, y: 13951 }, { x: 7951, y: 13497 }, { x: 11418, y: 13744 }],
  mid: [{ x: 3203, y: 3208 }, { x: 5048, y: 4812 }, { x: 5846, y: 6396 }, { x: 7435, y: 7490 }, { x: 9024, y: 8584 }, { x: 9822, y: 10168 }, { x: 11667, y: 11772 }],
  bot: [{ x: 3452, y: 1236 }, { x: 6919, y: 1483 }, { x: 10504, y: 1029 }, { x: 13500, y: 1200 }, { x: 13889, y: 4539 }, { x: 13358, y: 8281 }, { x: 13699, y: 11409 }]
};

function structurePositions(team) {
  const f = team === 0 ? p => ({ x: p.x, y: p.y }) : mirror, out = {};
  /* o time 1 e a rotacao de 180 graus: a rota "top" do Order encontra a "bot" do Chaos, entao a rota Chaos por nome recebe as posicoes espelhadas da rota oposta */
  const opp = { top: 'bot', mid: 'mid', bot: 'top' };
  Object.keys(ORDER).forEach(l => { const src = ORDER[team === 0 ? l : opp[l]]; out[l] = { outer: f(src.outer), inner: f(src.inner), inhibTurret: f(src.inhibTurret), inhibitor: f(src.inhibitor) }; });
  return { lanes: out, nexus: f(ORDER_NEXUS), nexusTurrets: ORDER_NEXUS_TURRETS.map(f), fountain: f(ORDER_FOUNTAIN) };
}
/* rotas nomeadas pela posicao no mapa: top = lado esquerdo/superior. O caminho do time 0 em "top" termina no inibidor Chaos da rota "top". */
function lanes() {
  /* depois do inibidor inimigo os minions seguem ate o Nexus inimigo (o time 1 percorre ao contrario, terminando no Nexus do Order) */
  const n0 = ORDER_NEXUS, n1 = mirror(ORDER_NEXUS);
  return ['top', 'mid', 'bot'].map(id => { const p = ORDER_PATH[id]; return { id, a: p[0], b: p[p.length - 1], path: p, end0: n1, end1: n0 }; });
}
module.exports = { W, H, mirror, ORDER, ORDER_PATH, structurePositions, lanes };
