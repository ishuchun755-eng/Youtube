import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const [mode, spec, outDir, port] = [process.argv[2], process.argv[3], process.argv[4] || 'frames', +(process.argv[5] || 8800)];
const root = path.resolve('web');
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : p.endsWith('.otf') ? 'font/otf' : 'text/html' }); fs.createReadStream(p).pipe(s); }).listen(port);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: +(process.env.W||1920), height: +(process.env.H||1080) } });
pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
pg.on('pageerror', e => console.log('PAGEERR', e.message));
await pg.goto(`http://localhost:${port}/index.html?m=${process.env.M || 'story'}&${process.env.Q || ''}`); await pg.waitForFunction('window.ready', null, { timeout: 120000 });
const err = await pg.evaluate('window.err'); if (err) { console.log('ERR', err); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
let frames = [];
if (mode === 'stills') frames = spec.split(',').map(s => Math.round(parseFloat(s) * 30));
else { const [a, z] = spec.split('-').map(Number); for (let f = a; f <= z; f++) frames.push(f); }
const t0 = Date.now();
for (const [i, f] of frames.entries()) {
  const name = mode === 'stills' ? `${outDir}/s${String(i).padStart(3, '0')}.jpg` : `${outDir}/f${String(f).padStart(5, '0')}.jpg`;
  if (mode !== 'stills' && process.env.RESUME && fs.existsSync(name)) continue;
  const d = await pg.evaluate(f => renderFrame(f), f);
  fs.writeFileSync(name, Buffer.from(d.split(',')[1], 'base64'));
  if (i % 200 === 0) console.log(`${outDir} ${f} ${((Date.now() - t0) / (i + 1)).toFixed(0)}ms/f`);
}
console.log('done', outDir);
await b.close(); srv.close();
