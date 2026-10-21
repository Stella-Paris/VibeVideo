// render still frames at given times: node stills.mjs out_prefix t1 t2 ...
import puppeteer from 'puppeteer';
import fs from 'node:fs'; import { serve } from './server.mjs';
const [pre, ...ts] = process.argv.slice(2); const port = 18700 + Math.floor(Math.random() * 200);
const srv = await serve(port);
const br = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server'] });
const pg = await br.newPage(); await pg.setViewport({ width: 1920, height: 1080 });
pg.on('console', m => console.log('[page]', m.text())); pg.on('pageerror', e => console.log('[err]', e.message));
await pg.goto(`http://127.0.0.1:${port}/render/index.html`); const info = await pg.evaluate(() => init()); console.log(JSON.stringify(info));
for (const t of ts) { const d = await pg.evaluate(t => renderAt(+t, 'image/jpeg', 0.85), t); fs.writeFileSync(`${pre}_${(+t).toFixed(2)}.jpg`, Buffer.from(d.split(',')[1], 'base64')); }
await br.close(); srv.close();
