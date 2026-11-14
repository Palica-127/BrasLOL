/* Recorta as fotos novas dos jogadores no padrão do jogo (240x300, rosto e ombros, fundo transparente, webp)
   e cadastra os nomes no PHOTOS do index.html.

   Uso (dentro de ferramentas/fotos):
     npm install                      (uma vez; não precisa aprovar scripts de instalação)
     node recortar.js [pasta]         (padrão: D:\Projeto\BrasLOL\fotos_novas)
   O nome do arquivo é o nick do jogador (ex.: pollu.png, Pollu.jpg); vira jogadores/pollu.webp.
   O modelo de recorte (u2net_human_seg.onnx, do rembg) fica em .cache/ e é baixado na primeira vez. */
const fs = require('fs'), path = require('path');
const sharp = require('sharp');
const ort = require('onnxruntime-web');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.resolve(process.argv[2] || path.join(ROOT, 'fotos_novas'));
const TESTE = process.env.SAIDA;  /* teste: grava em outra pasta e não mexe no index.html */
const OUT = TESTE ? path.resolve(TESTE) : path.join(ROOT, 'jogadores');
const HTML = path.join(ROOT, 'index.html');
const MODEL = path.join(__dirname, '.cache', 'u2net_human_seg.onnx');
const MODEL_URL = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx';
const W = 240, H = 300, S = 320;
const slug = n => String(n).toLowerCase().replace(/[^a-z0-9]/g, '');

async function model() {
  if (!fs.existsSync(MODEL)) {
    console.log('Baixando o modelo de recorte (176 MB)...');
    fs.mkdirSync(path.dirname(MODEL), { recursive: true });
    const r = await fetch(MODEL_URL);
    if (!r.ok) throw new Error('não consegui baixar o modelo: ' + r.status);
    fs.writeFileSync(MODEL, Buffer.from(await r.arrayBuffer()));
  }
  ort.env.wasm.numThreads = 1;
  return ort.InferenceSession.create(fs.readFileSync(MODEL));
}

/* máscara da pessoa (0..255) no tamanho da imagem, pelo mesmo pré-processamento do rembg */
async function mask(sess, img, w, h) {
  const { data } = await sharp(img).removeAlpha().resize(S, S, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let mx = 0; for (const v of data) if (v > mx) mx = v;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225], t = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) t[c * S * S + i] = (data[i * 3 + c] / mx - mean[c]) / std[c];
  const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', t, [1, 3, S, S]) });
  const m = out[sess.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity; for (const v of m) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const u8 = Buffer.alloc(S * S); for (let i = 0; i < S * S; i++) u8[i] = Math.round((m[i] - lo) / (hi - lo || 1) * 255);
  return sharp(u8, { raw: { width: S, height: S, channels: 1 } }).resize(w, h, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
}

async function one(sess, file) {
  const img = sharp(file).rotate();
  const { width: w, height: h } = await img.metadata();
  const buf = await img.toBuffer();
  const a = await mask(sess, buf, w, h);
  /* caixa da pessoa */
  let x0 = w, x1 = 0, y0 = h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  if (x1 <= x0) throw new Error('não achei a pessoa na foto');
  /* enquadramento: largura da pessoa (ombros), topo da cabeça com folga, proporção 4:5 */
  const cx = (x0 + x1) / 2;
  let cw = Math.min(w, (x1 - x0) * 1.04), ch = cw * H / W;
  if (ch > h) { ch = h; cw = ch * W / H; }
  const left = Math.round(Math.max(0, Math.min(w - cw, cx - cw / 2)));
  const top = Math.round(Math.max(0, Math.min(h - ch, y0 - ch * .04)));
  const rgb = await sharp(buf).removeAlpha().raw().toBuffer();
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { px[i * 4] = rgb[i * 3]; px[i * 4 + 1] = rgb[i * 3 + 1]; px[i * 4 + 2] = rgb[i * 3 + 2]; px[i * 4 + 3] = a[i]; }
  const rgba = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const name = slug(path.parse(file).name);
  await sharp(rgba).extract({ left, top, width: Math.min(w - left, Math.round(cw)), height: Math.min(h - top, Math.round(ch)) })
    .resize(W, H, { fit: 'fill' }).webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(OUT, name + '.webp'));
  return name;
}

(async () => {
  if (!fs.existsSync(SRC)) { console.error('Pasta não encontrada: ' + SRC); process.exit(1); }
  const files = fs.readdirSync(SRC).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  if (!files.length) { console.error('Nenhuma imagem em ' + SRC); process.exit(1); }
  const sess = await model(), done = [], fail = [];
  for (const f of files) {
    try { done.push(await one(sess, path.join(SRC, f))); process.stdout.write('.'); }
    catch (e) { fail.push(f + ': ' + e.message); }
  }
  /* cadastra no PHOTOS do index.html */
  if (TESTE) { console.log(`\n${done.length} recortada(s) em ${OUT}` + (fail.length ? '\n' + fail.join('\n') : '')); return; }
  let html = fs.readFileSync(HTML, 'utf8');
  const re = /\/\*PHOTOS\*\/const PHOTOS=new Set\((\[[^\]]*\])\);/;
  const m = html.match(re);
  if (m) {
    const set = new Set(JSON.parse(m[1])); done.forEach(n => set.add(n));
    html = html.replace(re, '/*PHOTOS*/const PHOTOS=new Set(' + JSON.stringify([...set].sort()) + ');');
    fs.writeFileSync(HTML, html);
  } else fail.push('não achei a lista PHOTOS no index.html');
  console.log(`\n${done.length} foto(s) recortada(s) em jogadores/.` + (fail.length ? '\nProblemas:\n  ' + fail.join('\n  ') : ''));
})();
