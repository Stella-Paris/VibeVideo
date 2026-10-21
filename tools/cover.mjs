// YouTube thumbnail: screenshot cover/cover.html at 1280x720.  usage: node tools/cover.mjs [out_prefix]
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url'; import { serve } from './server.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const [pre = `${ROOT}/cover/thumbnail`] = process.argv.slice(2); const port = 18600 + Math.floor(Math.random() * 90);
const srv = await serve(port);
const br = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server'] });
const pg = await br.newPage(); await pg.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
pg.on('pageerror', e => console.log('[err]', e.message));
await pg.goto(`http://127.0.0.1:${port}/cover/cover.html`); await pg.evaluate(() => ready());
await pg.screenshot({ path: `${pre}.png` }); await pg.screenshot({ path: `${pre}.jpg`, type: 'jpeg', quality: 92 });
console.log('wrote', `${pre}.png`, `${pre}.jpg`); await br.close(); srv.close();
