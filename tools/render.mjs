// Parallel render: each worker = headless Chrome page rendering a contiguous frame range, piped to ffmpeg.
// usage: node render.mjs <out.mp4> [workers] [t0] [t1] [scale]
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url'; import { serve } from './server.mjs';
const FF = process.env.FFMPEG || 'ffmpeg';
const [out, nw = '24', T0 = '0', T1 = '', SC = '1'] = process.argv.slice(2);
const port = 18900 + Math.floor(Math.random() * 90); const srv = await serve(port);
const FPS = 30, ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, ''), tmp = `${ROOT}/out/seg`; fs.mkdirSync(tmp, { recursive: true });
const probe = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--no-proxy-server'] });
let pg = await probe.newPage(); await pg.goto(`http://127.0.0.1:${port}/render/index.html`); const info = await pg.evaluate(() => init()); await probe.close();
const f0 = Math.round(+T0 * FPS), f1 = T1 ? Math.round(+T1 * FPS) : Math.floor(info.duration * FPS);
const W = Math.round(1920 * +SC / 2) * 2, H = Math.round(1080 * +SC / 2) * 2;
const n = +nw, per = Math.ceil((f1 - f0) / n); let done = 0; const t00 = Date.now();
async function worker(k) {
  const a = f0 + k * per, b = Math.min(f1, a + per); if (a >= b) return null;
  const br = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--no-proxy-server', '--disable-gpu'] });
  const p = await br.newPage(); await p.setViewport({ width: 1920, height: 1080 });
  p.on('pageerror', e => console.log('[err]', k, e.message));
  await p.goto(`http://127.0.0.1:${port}/render/index.html`); await p.evaluate(() => init());
  const seg = `${tmp}/s${String(k).padStart(3, '0')}.mp4`;
  const ff = spawn(FF, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    const d = await p.evaluate(t => renderAt(t, 'image/jpeg', 0.94), f / FPS);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 300 === 0) console.log(`${done}/${f1 - f0} frames  ${((Date.now() - t00) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close(); return seg;
}
const segs = (await Promise.all([...Array(n).keys()].map(worker))).filter(Boolean);
fs.writeFileSync(`${tmp}/list.txt`, segs.map(s => `file '${s}'`).join('\n'));
await new Promise(r => spawn(FF, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${tmp}/list.txt`, '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
console.log('video done', out, ((Date.now() - t00) / 1000).toFixed(0) + 's'); srv.close();
