/* Bloco 1: banco de dados versionado. Valida data/<patch>/ (esquema, integridade, conferencia Data Dragon x CommunityDragon)
   e confere que todo campeao do jogo (CHMAP) tem dados. Falha se houver ERROS (avisos sao listados no relatorio). */
const { validar, cobreJogo } = require('../dados/validar.js');
const patch = process.argv[2] || '16.22.1';
const r = validar(patch), j = cobreJogo(patch);
let ok = true; const T = (c, m) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + m); if (!c) ok = false; };
T(r.erros.length === 0, `validacao sem erros (${r.erros.length} erros, ${r.avisos.length} avisos)`); r.erros.slice(0, 20).forEach(e => console.log('   ' + e));
T(j.faltam.length === 0, `campeoes do jogo com dados: ${j.total - j.faltam.length}/${j.total}`);
T(r.info.campeoes.total >= 170, `campeoes no patch: ${r.info.campeoes.total}`);
T(r.info.campeoes.habilidadesQWER === r.info.campeoes.total * 4, `habilidades Q/W/E/R completas: ${r.info.campeoes.habilidadesQWER}`);
T(r.info.itens.naLojaMapa11 > 200, `itens na loja do mapa 11: ${r.info.itens.naLojaMapa11}`);
T(r.info.itens.divergenciasPreco === 0, 'precos = soma dos componentes + combinar');
T(r.info.campeoes.divergenciasStats === 0, 'stats do Data Dragon = CommunityDragon (exceto AD/nivel zerado no DDragon)');
/* valores conhecidos do jogo (indice = rank da habilidade; indice 0 e' sentinela) */
const fs = require('fs'), path = require('path');
const D = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', patch, f), 'utf8'));
const aat = D('champions/Aatrox.json'), q = aat.objetos_habilidade[aat.habilidades_chaves[0]].mSpell;
T(JSON.stringify(q.cooldownTime.slice(1, 6)) === '[14,12,10,8,6]', 'ouro: recarga do Q do Aatrox por rank = 14/12/10/8/6');
T(aat.stats_cdragon.vida === 650 && aat.stats_cdragon.alcance_ataque === 175 && aat.stats_cdragon.velocidade_mov === 345, 'ouro: Aatrox vida 650, alcance 175, velocidade 345');
const ie = D('items.json')['3031'];
T(ie.preco === 3500 && ie.cdragon.stats.mFlatPhysicalDamageMod === 75, 'ouro: Gume do Infinito custa 3500 e da 75 de AD');
T(D('rules.json').experiencia.xp_para_subir_do_nivel[0] === 280, 'ouro: 280 de XP para o nivel 2');
process.exit(ok ? 0 : 1);
