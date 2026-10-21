// Run script+engine+scenes in a VM (no canvas) and dump timeline + SFX cues for the mixer.
import fs from 'node:fs'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const ctx = vm.createContext({ console, Math, JSON, Object, Array });
for (const f of ['data/script.js', 'render/engine.js', 'render/scenes.js']) vm.runInContext(fs.readFileSync(`${ROOT}/${f}`, 'utf8'), ctx, { filename: f });
const res = vm.runInContext('(() => { const tl = buildTimeline(); const r = setupAll(tl, {}); return { tl, sfx: r.sfx, missing: r.missing, impacts: IMPACTS.slice() }; })()', ctx);
const out = { duration: res.tl.duration, chStart: res.tl.chStart, shots: {}, sfx: res.sfx, subs: res.tl.subs };
for (const id of res.tl.order) { const s = res.tl.shots[id]; out.shots[id] = { t0: s.t0, t1: s.t1, L: s.L, e: s.e }; }
fs.writeFileSync(`${ROOT}/data/cues.json`, JSON.stringify(out, null, 1));
const names = {}; for (const c of res.sfx) names[c.name] = (names[c.name] || 0) + 1;
console.log('duration', out.duration.toFixed(2), 'cues', res.sfx.length, 'missing', res.missing, JSON.stringify(names));
