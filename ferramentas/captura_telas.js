'use strict';
/* Captura de telas do index.html em Chrome headless (CDP puro, sem dependencias). Uso: node ferramentas/captura_telas.js [pasta_saida] [largura] [altura]
   Cada tela e' montada pelas proprias funcoes do jogo (act/tab) apos criar um save de teste no navegador. Serve para conferir o visual do redesign. */
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'capturas')), W = +process.argv[3] || 1440, H = +process.argv[4] || 900;
const HTML = 'file:///' + path.resolve(__dirname, '..', 'index.html').split(path.sep).join('/');
const CH = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const STEPS = process.env.STEPS_FILE ? JSON.parse(fs.readFileSync(process.env.STEPS_FILE, 'utf8')) : null;
fs.mkdirSync(OUT, { recursive: true });
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'brascap-')), port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + udd, '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let list; for (let i = 0; i < 50; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.length) break; } catch (e) {} await sleep(200); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) console.log('ERRO JS:', JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 300)); return r.result.result && r.result.result.value; };
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  await send('Page.navigate', { url: HTML }); await sleep(2500);
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); console.log('ok', name); };
  const steps = STEPS || [['menu', '']];
  for (const [name, js] of steps) { if (js) { const v = await ev(js); if (typeof v === 'string' && v) console.log('  ->', v); } await sleep(700); await shot(name); }
  ws.close(); proc.kill();
  try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });
