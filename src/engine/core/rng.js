'use strict';
/* PRNG determinístico com fluxos nomeados. Mudar a IA não altera o resultado de um golpe: cada fluxo (combate, ia, mundo...)
   tem a própria sequência, derivada da semente da partida. Math.random() é proibido dentro de src/engine (ver testes/engine_lint). */
function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function makeRng(seed) {
  const fl = {};
  const stream = name => fl[name] || (fl[name] = mulberry32((seed ^ hash(name)) >>> 0));
  return {
    seed,
    next: name => stream(name)(),
    int: (name, n) => Math.floor(stream(name)() * n),
    pick: (name, a) => a[Math.floor(stream(name)() * a.length)],
    chance: (name, p) => stream(name)() < p,
    gauss: name => { const r = stream(name); let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  };
}
module.exports = { makeRng, mulberry32, hash };
