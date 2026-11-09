'use strict';
/* Builds CURADAS por campeão (Bloco 4b). ESTIMADO: escritas à mão a partir de conhecimento geral do meta recente (NÃO são estatística do patch
   16.22.1 nem de fonte citável dentro do projeto). Cada campeão tem: k = classe de adaptação, c = itens de núcleo em ordem de compra,
   f = opções padrão para as vagas finais, b = botas (se não for a padrão da classe). As vagas finais são trocadas conforme a partida:
   cura inimiga (Lembrete Mortal / Morellonomicon / Espinhos), dano inimigo AP ou AD (resistência), alvos resistentes (penetração).
   Ids são do catálogo do patch (items.json); `check()` valida que existem e são itens completos. Campeão sem entrada cai no analisador por arquétipo. */
const BOOTS = { speed: 3170, ionian: 3171, merc: 3173, plated: 3174, sorc: 3175 };
const DEF_BOOTS = { fighter: 3174, tank: 3174, adc: 3170, mage: 3175, assassin: 3171, enchanter: 3171 };

/* situações: heal = inimigo com cura; ap/ad = maioria do dano inimigo; tank = 2+ alvos resistentes. Listas em ordem de preferência. */
const SIT = {
  fighter:   { heal: [6609, 3075], ap: [3156, 3065, 4401], ad: [6333, 3026, 3143], tank: [3071, 6694, 3036] },
  tank:      { heal: [3075, 2502], ap: [4401, 2504, 3065], ad: [3075, 3143, 3110], tank: [] },
  adc:       { heal: [3033], ap: [3156, 3139, 3102], ad: [3026, 6333, 3814], tank: [3036, 3033, 3302] },
  mage:      { heal: [3165], ap: [3102, 3157], ad: [3157, 3026], tank: [3135, 3137, 6653] },
  assassin:  { heal: [6609, 3033], ap: [3814, 3156, 3102], ad: [3026, 6333, 3814], tank: [6694, 3036, 6609] },
  enchanter: { heal: [3165], ap: [3222, 3102, 4401], ad: [3190, 3050, 3157], tank: [] }
};
/* campeões com cura/escudo relevante contra quem vale levar anticura */
const HEAL = new Set(['Soraka', 'Aatrox', 'Warwick', 'Vladimir', 'Sylas', 'Briar', 'Yuumi', 'Nami', 'Sona', 'Seraphine', 'DrMundo', 'Swain', 'Olaf', 'Trundle', 'Nidalee', 'Milio', 'Illaoi', 'Fiora', 'Tryndamere', 'Samira', 'Kayn', 'Irelia', 'Renata']);

const E = (k, c, f, b) => ({ k, c, f: f || [], b: b || DEF_BOOTS[k] });
const BUILDS = {
  /* topo */
  Aatrox: E('fighter', [6610, 3071, 3053], [6333, 3026]), Camille: E('fighter', [3078, 6610, 3053], [6333, 3026], BOOTS.ionian),
  Darius: E('fighter', [3071, 3053, 6333], [3156, 6694]), Fiora: E('fighter', [3078, 3074, 3053], [3156, 6694]), Garen: E('fighter', [3078, 3053, 6333], [3026, 3156]),
  Gnar: E('tank', [3068, 3143, 3084], [3075, 4401]), Gwen: E('mage', [4633, 3115, 3089], [3157, 3102]), Illaoi: E('fighter', [6610, 3053, 3071], [6333, 3156]),
  Irelia: E('fighter', [3078, 3153, 3053], [3156, 6333], BOOTS.ionian), Jax: E('fighter', [3124, 3078, 6333], [3156, 3026]), Jayce: E('fighter', [6692, 6699, 6694], [3156, 3026], BOOTS.ionian),
  KSante: E('tank', [3068, 3084, 3143], [3075, 4401]), Kayle: E('mage', [3124, 3115, 3089], [3157, 3102], BOOTS.speed), Kled: E('fighter', [6631, 3053, 6333], [3156, 3026]),
  Malphite: E('tank', [3068, 3075, 3143], [4401, 2504]), Maokai: E('tank', [3068, 3084, 2504], [3110, 3143]), Mordekaiser: E('mage', [4633, 6653, 3089], [3157, 3102]),
  Nasus: E('fighter', [3078, 3065, 3110], [3075, 6333]), Olaf: E('fighter', [6610, 3053, 6333], [3071, 3026]), Ornn: E('tank', [3068, 3110, 3083], [3075, 4401, 3143]),
  Pantheon: E('fighter', [6610, 3071, 3053], [6333, 3026]), Poppy: E('tank', [3068, 3075, 3143], [4401, 3110]), Quinn: E('assassin', [3142, 6676, 6694], [3026, 3814]),
  Renekton: E('fighter', [6631, 3053, 6333], [3156, 3026], BOOTS.ionian), Riven: E('fighter', [6692, 3053, 6694], [3156, 3026], BOOTS.ionian), Rumble: E('mage', [6653, 4645, 3089], [3157, 3102]),
  Sett: E('fighter', [3078, 3071, 3053], [6333, 3156]), Shen: E('tank', [3068, 3084, 3110], [3075, 4401]), Singed: E('tank', [6653, 3068, 3110], [4401, 3075]),
  Sion: E('tank', [3084, 3068, 3110], [3075, 4401]), Teemo: E('mage', [6653, 4645, 3089], [3157, 3102]), Tryndamere: E('adc', [6673, 3031, 3087], [3026, 3072]),
  Urgot: E('fighter', [6610, 3071, 6333], [3156, 3026]), Volibear: E('fighter', [6610, 3068, 3053], [6333, 3156]), MonkeyKing: E('fighter', [6610, 3071, 3053], [6333, 3026]),
  Yorick: E('fighter', [3078, 3068, 3053], [3156, 6333]), Yone: E('adc', [6673, 3031, 3072], [3026, 6333]), Yasuo: E('adc', [6673, 3031, 3087], [3026, 3072]),
  DrMundo: E('tank', [3068, 3083, 3065], [3075, 4401]), Chogath: E('tank', [6653, 3068, 3083], [4401, 3075]),
  /* selva */
  Amumu: E('tank', [3068, 6653, 3110], [2504, 4401]), Belveth: E('adc', [3153, 6672, 3124], [3026, 3156]), Briar: E('fighter', [3074, 6610, 3053], [6333, 3026]),
  Diana: E('mage', [6655, 3089, 4645], [3157, 3102]), Ekko: E('mage', [6655, 4645, 3089], [3157, 3102]), Elise: E('mage', [6653, 4645, 3089], [3157, 3102]),
  Evelynn: E('mage', [6655, 4645, 3089], [3157, 3102]), Fiddlesticks: E('mage', [6653, 3089, 4645], [3157, 3135]), Gragas: E('mage', [6653, 3157, 3089], [3102, 3135]),
  Graves: E('assassin', [3142, 6676, 6694], [3026, 3814]), Hecarim: E('fighter', [6610, 3053, 6333], [3156, 3026]), Ivern: E('enchanter', [6617, 3504, 6620], [3107, 3222]),
  JarvanIV: E('fighter', [6610, 3071, 3053], [6333, 3026]), Karthus: E('mage', [6653, 3089, 3157], [3135, 3102]), Kayn: E('fighter', [3078, 3071, 3053], [6333, 3026]),
  Kindred: E('adc', [6672, 6676, 3031], [3026, 3033]), Khazix: E('assassin', [3142, 6676, 6694], [3814, 3026]), LeeSin: E('fighter', [6692, 6610, 3053], [6333, 3026]),
  Lillia: E('mage', [4645, 3089, 6653], [3157, 3102]), MasterYi: E('adc', [6672, 3124, 3031], [3026, 3156]), Nidalee: E('mage', [6655, 4645, 3089], [3157, 3135]),
  Nocturne: E('fighter', [6692, 3071, 3053], [6333, 3026], BOOTS.ionian), Nunu: E('tank', [3068, 3110, 3084], [2504, 3075]), Rammus: E('tank', [3075, 6665, 3143], [3110, 2504]),
  RekSai: E('fighter', [6692, 3071, 6694], [6333, 3026]), Rengar: E('assassin', [3142, 6692, 6694], [3814, 3026]), Sejuani: E('tank', [3068, 3075, 3110], [4401, 3143]),
  Shaco: E('assassin', [3142, 6692, 3814], [3026, 6694]), Shyvana: E('fighter', [3078, 3053, 3143], [6333, 3156]), Skarner: E('tank', [3084, 3068, 3110], [3075, 4401]),
  Taliyah: E('mage', [6655, 3089, 6653], [3157, 3135]), Trundle: E('fighter', [3078, 3068, 3053], [6333, 3156]), Udyr: E('tank', [3068, 3084, 3075], [4401, 3143]),
  Vi: E('fighter', [3078, 3071, 3053], [6333, 3026]), Viego: E('fighter', [6692, 3153, 3053], [3156, 3026]), Warwick: E('fighter', [3153, 6631, 3053], [3156, 3026]),
  XinZhao: E('fighter', [3078, 3071, 3053], [6333, 3026]), Zac: E('tank', [3084, 3068, 3075], [4401, 3143]),
  /* meio */
  Ahri: E('mage', [6655, 4645, 3089], [3157, 3135, 3102]), Akali: E('mage', [3152, 4645, 3089], [3157, 3135]), Akshan: E('adc', [6676, 3031, 3033], [3026, 3814]),
  Anivia: E('mage', [6657, 6653, 3089], [3157, 3135]), Annie: E('mage', [4645, 6655, 3089], [3157, 3135]), AurelionSol: E('mage', [6657, 4645, 3089], [3157, 3135]),
  Aurora: E('mage', [6655, 4645, 3089], [3157, 3135]), Azir: E('mage', [3115, 6653, 3089], [3157, 3135]), Brand: E('mage', [6653, 4645, 3089], [3157, 3135]),
  Cassiopeia: E('mage', [6657, 6653, 3089], [3157, 3135]), Fizz: E('mage', [3152, 4645, 3089], [3157, 3135]), Heimerdinger: E('mage', [6655, 3089, 4645], [3157, 3135]),
  Hwei: E('mage', [6655, 4645, 3089], [3157, 3135]), Kassadin: E('mage', [3003, 3100, 3089], [3157, 3102]), Katarina: E('mage', [4645, 3152, 3089], [3157, 3135]),
  Kennen: E('mage', [6655, 3116, 3157], [3089, 3135]), Leblanc: E('mage', [6655, 4645, 3089], [3157, 3135]), Lissandra: E('mage', [6653, 3116, 3157], [3089, 3102]),
  Lux: E('mage', [6655, 4645, 3089], [3157, 3135]), Malzahar: E('mage', [6653, 4628, 3089], [3157, 3135]), Naafiri: E('assassin', [3142, 6676, 6694], [3026, 3814]),
  Neeko: E('mage', [6653, 6655, 3089], [3157, 3135]), Orianna: E('mage', [6655, 3157, 3089], [4645, 3135]), Qiyana: E('assassin', [3142, 6676, 6694], [3026, 3814]),
  Ryze: E('mage', [3003, 3116, 3089], [3157, 3102]), Swain: E('mage', [6653, 3116, 3157], [3089, 3102]), Sylas: E('mage', [4633, 6653, 3089], [3157, 3102]),
  Syndra: E('mage', [6655, 4645, 3089], [3157, 3135]), Talon: E('assassin', [3142, 6676, 6694], [3026, 3814]), TwistedFate: E('mage', [3100, 3089, 3115], [3157, 3135]),
  Veigar: E('mage', [6655, 4645, 3089], [3157, 3135]), Velkoz: E('mage', [6655, 4628, 3089], [3157, 3135]), Vex: E('mage', [6655, 4645, 3089], [3157, 3102]),
  Viktor: E('mage', [4633, 3089, 4645], [3157, 3135]), Vladimir: E('mage', [4633, 3116, 3089], [3157, 3102]), Xerath: E('mage', [6655, 4645, 3089], [3157, 3135]),
  Zed: E('assassin', [3142, 6696, 6694], [3814, 3026]), Ziggs: E('mage', [6655, 4645, 3089], [3157, 3135]), Zoe: E('mage', [6655, 4645, 3089], [3157, 3135]),
  /* atirador */
  Ashe: E('adc', [3032, 3031, 3036], [3026, 3033]), Aphelios: E('adc', [6676, 3031, 3036], [3026, 3033]), Caitlyn: E('adc', [3031, 3094, 3036], [3026, 3033]),
  Draven: E('adc', [6676, 3031, 3072], [3026, 3033]), Ezreal: E('adc', [3004, 3078, 3508], [3156, 3026], BOOTS.ionian), Jhin: E('adc', [6676, 3031, 3036], [3026, 3033]),
  Jinx: E('adc', [6672, 3031, 3085], [3026, 3033]), Kaisa: E('adc', [6672, 3031, 3036], [3026, 3033]), Kalista: E('adc', [6672, 3153, 3031], [3026, 3033]),
  KogMaw: E('adc', [3124, 3153, 3302], [3026, 3033]), Lucian: E('adc', [3508, 3031, 3036], [3026, 3033]), MissFortune: E('adc', [6676, 3031, 3033], [3026, 3036]),
  Nilah: E('adc', [6673, 3031, 3036], [3026, 3033]), Samira: E('adc', [6676, 3031, 3036], [3026, 3033]), Senna: E('adc', [3031, 6676, 3036], [3026, 3033]),
  Sivir: E('adc', [3087, 3031, 3036], [3026, 3033]), Tristana: E('adc', [3031, 3094, 3036], [3026, 3033]), Twitch: E('adc', [3153, 3085, 3031], [3026, 3033]),
  Varus: E('adc', [6676, 3031, 3036], [3026, 3033]), Vayne: E('adc', [6672, 3153, 3302], [3026, 3033]), Xayah: E('adc', [6676, 3031, 3036], [3026, 3033]),
  Zeri: E('adc', [6672, 3087, 3032], [3026, 3033]),
  /* suporte */
  Alistar: E('tank', [3190, 3050, 3143], [3075, 2504]), Bard: E('enchanter', [2065, 3504, 3107], [3222, 3157]), Blitzcrank: E('tank', [3190, 3050, 3143], [3075, 2504]),
  Braum: E('tank', [3109, 3190, 3050], [3143, 3075]), Janna: E('enchanter', [6617, 3504, 2065], [3107, 3222]), Karma: E('enchanter', [2065, 4629, 3504], [3157, 3107]),
  Leona: E('tank', [3109, 3190, 3143], [3075, 2504]), Lulu: E('enchanter', [6617, 2065, 3504], [3107, 3222]), Milio: E('enchanter', [6617, 3504, 3107], [3222, 6620]),
  Morgana: E('mage', [6653, 4645, 3157], [3089, 3135]), Nami: E('enchanter', [6617, 3504, 6620], [3107, 3222]), Nautilus: E('tank', [3190, 3068, 3143], [3075, 2504]),
  Pyke: E('assassin', [3142, 6676, 6694], [3814, 3026]), Rakan: E('enchanter', [2065, 3190, 3050], [3107, 3222]), Rell: E('tank', [3109, 3190, 3143], [3075, 2504]),
  Renata: E('enchanter', [2065, 6617, 3504], [3107, 3222]), Seraphine: E('enchanter', [6617, 3504, 4629], [3107, 3157]), Sona: E('enchanter', [6617, 3504, 4629], [3107, 3222]),
  Soraka: E('enchanter', [6617, 3504, 3107], [3222, 6620]), TahmKench: E('tank', [3109, 3190, 3084], [3075, 4401]), Taric: E('tank', [3109, 3190, 3143], [3075, 2504]),
  Thresh: E('tank', [3190, 3109, 3143], [3075, 2504]), Yuumi: E('enchanter', [6617, 3504, 3107], [3222, 6620]), Zilean: E('mage', [4629, 6617, 3157], [3089, 3102]),
  Zyra: E('mage', [6653, 4645, 3089], [3157, 3135])
};

/* valida ids contra o catálogo (usado pelos testes) */
function check(cat) {
  const bad = [];
  Object.entries(BUILDS).forEach(([n, b]) => [...b.c, ...b.f].forEach(id => { const i = cat[id]; if (!i || i.cls !== 'legendary') bad.push(n + ':' + id); }));
  Object.entries(BUILDS).forEach(([n, b]) => { const i = cat[b.b]; if (!i || i.cls !== 'boots') bad.push(n + ':boots:' + b.b); });
  Object.entries(SIT).forEach(([k, s]) => Object.values(s).flat().forEach(id => { const i = cat[id]; if (!i || i.cls !== 'legendary') bad.push('SIT.' + k + ':' + id); }));
  return bad;
}
module.exports = { BUILDS, SIT, HEAL, BOOTS, DEF_BOOTS, check };
