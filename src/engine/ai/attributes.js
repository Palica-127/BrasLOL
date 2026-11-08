'use strict';
/* Atributos do jogador -> parâmetros da IA (Bloco 8). Os cinco atributos do jogo (0-100) são os do motor legado:
   Lane, Mecânica, Macro, Equipe e Mental. TODA a tabela abaixo é ESTIMADA (não existe fonte externa): serve para que jogadores
   melhores errem menos; os coeficientes serão calibrados no Bloco 10. */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const n = x => clamp((x === undefined ? 60 : x) / 100, 0, 1);

function fromAttributes(a = {}) {
  const lane = n(a.lane), mec = n(a.mec != null ? a.mec : a.mecanica), mac = n(a.macro), team = n(a.team != null ? a.team : a.equipe), mental = n(a.mental);
  return {
    aim: clamp(0.35 + 0.6 * mec, 0.2, 0.97),                 /* precisão da mira dos skillshots */
    dodge: clamp(0.08 + 0.55 * mec, 0, 0.7),                 /* chance de esquivar de skillshots */
    react: clamp(0.5 - 0.32 * mec, 0.12, 0.5),               /* tempo de reação (s) */
    lastHit: clamp(0.4 + 0.58 * lane, 0.3, 0.98),            /* acerto do último golpe */
    noise: clamp(0.45 * (1 - mac), 0.03, 0.45),              /* ruído nas decisões de macro: menor = lê melhor o mapa */
    sync: team,                                              /* sincronia com o time (0..1): reduz a dispersão de chegada em objetivos/lutas */
    composure: mental,                                       /* 0..1: quanto o jogador mantém o nível quando está atrás */
    greed: clamp(0.5 - 0.35 * mental, 0.1, 0.5)              /* tendência a continuar na rota com pouca vida */
  };
}
const DEFAULT = { lane: 60, mec: 60, macro: 60, team: 60, mental: 60 };
module.exports = { fromAttributes, DEFAULT };
