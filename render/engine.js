// Sticker-explainer engine: every frame is a pure function of t. Runs in the browser (drawing) and
// in a node vm (cue export for the sound mix; no canvas there, so draw code is never called).
const W = 1920, H = 1080, FPS = 30;
const C = {
  bg: '#E9EEF2', card: '#F7F9FB', ink: '#1F2A36', ink2: '#33414F', mid: '#5B6B7A', light: '#8C9AA8', line: '#CDD6DE',
  accent: '#FF5A36', red: '#E5484D', gold: '#F2B705', goldD: '#C98F00', white: '#FFFFFF', shadow: 'rgba(22,34,46,',
  genshin: '#20A4E8', lads: '#F2559A', whiteout: '#3E5BF2', justice: '#9A55D9',
  hok: '#E8B100', delta: '#12B07A', wukong: '#6B4A1E', landlord: '#FF6A1F',
};
const GAMES = {
  genshin: { zh: '原神', en: 'Genshin Impact' }, lads: { zh: '恋与深空', en: 'Love and Deepspace' },
  whiteout: { zh: '无尽冬日', en: 'Whiteout Survival' }, justice: { zh: '逆水寒', en: 'Justice Online' },
  hok: { zh: '王者荣耀', en: 'Honor of Kings' }, delta: { zh: '三角洲行动', en: 'Delta Force' },
  wukong: { zh: '黑神话：悟空', en: 'Black Myth: Wukong' }, landlord: { zh: '欢乐斗地主', en: 'Happy Landlord' },
};
const ICON_FILE = { wukong: 'wukong.png' };

// ---------------------------------------------------------------- timeline + cues
let TL = null;
const SFX = [];
const MISSING = [];
const sfx = (name, t, o = {}) => { if (t != null && isFinite(t)) SFX.push(Object.assign({ name, t }, typeof o === 'number' ? { gain: o } : o)); };
const IMPACTS = [];                       // camera punches: {t, amp}
const impact = (t, amp = 1) => IMPACTS.push({ t, amp });

// ---------------------------------------------------------------- math & easing
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, t0, d) => clamp((t - t0) / d);
const eOut = k => 1 - Math.pow(1 - k, 3);
const eOut5 = k => 1 - Math.pow(1 - k, 5);
const eIn = k => k * k * k;
const eInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = (k, s = 1.7) => { const c3 = s + 1; return 1 + c3 * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
const spring = (k, f = 10, d = 7) => k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-d * k) * Math.cos(f * k);
function rnd(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i + seed * 57.3), rnd(i + 1 + seed * 57.3), u) * 2 - 1; }
// keyframes [[t, v], ...] -> value (numbers or arrays), eased between keys
function kf(t, keys, ease = eInOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [ta, a] = keys[i - 1], [tb, b] = keys[i], k = (keys[i][2] || ease)((t - ta) / (tb - ta));
      return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
    }
  }
  return keys[keys.length - 1][1];
}
// element life: slap-in (overshoot + settle rotation), peel-out
function slap(t, tin, tout = 1e9, o = {}) {
  if (t < tin || t > tout + 0.3) return { s: 0, a: 0, r: 0, lift: 0, on: false };
  const din = o.din || 0.42, k = prog(t, tin, din), q = prog(t, tout, 0.28);
  const s = (o.from ?? 1.35) + (1 - (o.from ?? 1.35)) * spring(k, 13, 6.5);
  const r = (o.rot || 0) + (o.wob ?? 6) * (rnd(tin * 7.1) - 0.5) * 2 * Math.exp(-6 * k) * Math.cos(9 * k);
  const lift = Math.max(0, 1 - k * 2.2) + q * 0.8;
  return { s: s * (1 - 0.6 * eIn(q)), a: clamp(k * 5) * (1 - eIn(q)), r: r * Math.PI / 180, lift, on: true, k, q };
}
// pop (no overshoot rotation), for small UI
function pop(t, tin, tout = 1e9, d = 0.3) {
  if (t < tin || t > tout + 0.25) return { s: 0, a: 0, on: false };
  const k = prog(t, tin, d), q = prog(t, tout, 0.22);
  return { s: eBack(k, 2.2) * (1 - 0.5 * eIn(q)), a: clamp(k * 4) * (1 - q), on: true, k, q };
}
function fade(t, tin, tout = 1e9, din = 0.3, dout = 0.3) { return prog(t, tin, din) * (1 - prog(t, tout, dout)); }

// ---------------------------------------------------------------- fonts
const F = {
  zh: (s, w = 800) => `${w} ${s}px NotoSC`,
  fun: s => `${s}px Smiley, NotoSC`,
  en: (s, w = 600) => `${w} ${s}px Poppins, NotoSC`,
  num: (s, w = 900) => `${w} ${s}px Poppins, NotoSC`,
};

// ---------------------------------------------------------------- images & sticker cache (browser only)
const IMG = {}, PENDING = new Set(), STK = {};
function img(src) {
  let i = IMG[src]; if (i) return i.complete && i.naturalWidth ? i : null;
  if (typeof Image === 'undefined') return null;
  i = new Image(); IMG[src] = i; PENDING.add(src);
  i.onload = i.onerror = () => PENDING.delete(src); i.src = src; return null;
}
function dropImgs(prefix) { for (const k of Object.keys(IMG)) if (k.startsWith(prefix)) delete IMG[k]; }
const canvasMake = (w, h) => { const c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; };
// die-cut sticker: white silhouette dilation + the art + a pre-blurred shadow silhouette
function sticker(key, src, o = {}) {
  if (STK[key]) return STK[key];
  const im = img(src); if (!im) return null;
  const S = o.size || 360, ow = o.ow ?? Math.round(S * 0.055), pad = ow + 24;
  const ar = im.naturalWidth / im.naturalHeight, w = ar >= 1 ? S : S * ar, h = ar >= 1 ? S / ar : S;
  const cw = Math.ceil(w + pad * 2), ch = Math.ceil(h + pad * 2);
  const art = canvasMake(cw, ch), a = art.getContext('2d');
  if (o.round != null) { a.save(); rrect(a, pad, pad, w, h, o.round * Math.min(w, h)); a.clip(); a.drawImage(im, pad, pad, w, h); a.restore(); }
  else a.drawImage(im, pad, pad, w, h);
  const sil = canvasMake(cw, ch), s = sil.getContext('2d');
  for (let r of [ow, ow * 0.7, ow * 0.35]) for (let i = 0; i < 28; i++) { const an = i / 28 * Math.PI * 2; s.drawImage(art, Math.cos(an) * r, Math.sin(an) * r); }
  s.drawImage(art, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#fff'; s.fillRect(0, 0, cw, ch);
  const out = canvasMake(cw, ch), q = out.getContext('2d'); q.drawImage(sil, 0, 0); q.drawImage(art, 0, 0);
  const sh = canvasMake(cw, ch), z = sh.getContext('2d'); z.filter = `blur(${Math.round(S * 0.03)}px)`; z.drawImage(sil, 0, 0);
  z.filter = 'none'; z.globalCompositeOperation = 'source-in'; z.fillStyle = 'rgba(22,34,46,1)'; z.fillRect(0, 0, cw, ch);
  return (STK[key] = { c: out, sh, w: cw, h: ch, S: Math.max(w, h) + pad * 2 });
}
const emojiSrc = n => `/assets/emoji/${n}.png`;
const iconSrc = g => `/assets/icons/${ICON_FILE[g] || g + '.jpg'}`;
// draw a cached sticker centred at x,y with size = drawn width of the art box
function drawStk(ctx, st, x, y, size, o = {}) {
  if (!st || (o.a ?? 1) <= 0.003 || (o.s ?? 1) <= 0.003) return;
  const sc = size / st.S * (o.s ?? 1), lift = o.lift ?? 0;
  ctx.save(); ctx.translate(x, y); if (o.r) ctx.rotate(o.r); ctx.scale(sc * (o.sx || 1), sc * (o.sy || 1));
  ctx.globalAlpha *= (o.a ?? 1);
  const dy = (8 + 26 * lift) / sc, sa = (o.sa ?? 0.3) * (1 - 0.35 * lift);
  ctx.save(); ctx.globalAlpha *= sa; ctx.drawImage(st.sh, -st.w / 2, -st.h / 2 + dy, st.w, st.h * 1.02); ctx.restore();
  ctx.drawImage(st.c, -st.w / 2, -st.h / 2); ctx.restore();
}
function emoji(ctx, name, x, y, size, o = {}) { drawStk(ctx, sticker('e:' + name, emojiSrc(name), { size: 300 }), x, y, size, o); }
function icon(ctx, g, x, y, size, o = {}) { drawStk(ctx, sticker('i:' + g, iconSrc(g), { size: 300, round: 0.22, ow: 18 }), x, y, size, o); }
function photo(ctx, key, src, x, y, size, o = {}) { drawStk(ctx, sticker('p:' + key, src, { size: o.res || 480, round: o.round ?? 0.06, ow: o.ow || 18 }), x, y, size, o); }

// ---------------------------------------------------------------- vector primitives
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function at(ctx, x, y, o, fn) {
  if ((o.s ?? 1) <= 0.003 || (o.a ?? 1) <= 0.003) return;
  ctx.save(); ctx.translate(x, y); if (o.r) ctx.rotate(o.r); const s = o.s ?? 1; ctx.scale(s * (o.sx || 1), s * (o.sy || 1));
  ctx.globalAlpha *= (o.a ?? 1); fn(); ctx.restore();
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mix(h1, h2, k) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, k)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
  return `rgb(${r},${g},${bl})`;
}
function measure(ctx, s, font) { ctx.save(); ctx.font = font; const w = ctx.measureText(s).width; ctx.restore(); return w; }
// plain text
function txt(ctx, s, x, y, o = {}) {
  ctx.save(); ctx.font = o.font || F.zh(40); ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillStyle = o.color || C.ink; ctx.fillText(s, x, y); ctx.restore();
}
// die-cut text sticker: thick white outline + soft shadow + fill
function stext(ctx, s, x, y, o = {}) {
  ctx.save(); ctx.font = o.font || F.zh(60, 900); ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const ow = o.ow ?? 14;
  if (o.shadow !== false) {
    ctx.save(); ctx.shadowColor = 'rgba(22,34,46,0.28)'; ctx.shadowBlur = o.sb ?? 18; ctx.shadowOffsetY = o.sy ?? 8;
    ctx.strokeStyle = o.outline || '#fff'; ctx.lineWidth = ow * 2; ctx.strokeText(s, x, y); ctx.restore();
  }
  ctx.strokeStyle = o.outline || '#fff'; ctx.lineWidth = ow * 2; ctx.strokeText(s, x, y);
  if (o.inner) { ctx.strokeStyle = o.inner; ctx.lineWidth = o.iw || 6; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || C.ink; ctx.fillText(s, x, y); ctx.restore();
}
// rounded sticker card (white outline ring + shadow)
function card(ctx, x, y, w, h, o = {}) {
  const r = o.r ?? 22, ow = o.ow ?? 8, lift = o.lift || 0;
  ctx.save();
  ctx.shadowColor = `rgba(22,34,46,${(o.sa ?? 0.22) * (1 - 0.3 * lift)})`; ctx.shadowBlur = 18 + 30 * lift; ctx.shadowOffsetY = 7 + 20 * lift;
  ctx.fillStyle = o.ring || '#fff'; rrect(ctx, x - ow, y - ow, w + ow * 2, h + ow * 2, r + ow); ctx.fill(); ctx.restore();
  ctx.fillStyle = o.fill || C.card; rrect(ctx, x, y, w, h, r); ctx.fill();
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 3; rrect(ctx, x, y, w, h, r); ctx.stroke(); }
}
// pill label sticker centred at x,y
function pill(ctx, s, x, y, o = {}) {
  const font = o.font || F.zh(30, 800), padx = o.padx ?? 22, h = o.h ?? 54;
  const w = measure(ctx, s, font) + padx * 2 + (o.icon ? h * 0.8 : 0);
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  card(ctx, x0, y - h / 2, w, h, { r: h / 2, fill: o.fill || C.ink, ow: o.ow ?? 6, sa: o.sa, lift: o.lift });
  let tx = x0 + padx;
  if (o.icon) { o.icon(tx + h * 0.3, y, h * 0.62); tx += h * 0.8; }
  txt(ctx, s, tx, y + (o.dy ?? 1), { font, color: o.color || '#fff', align: 'left' });
  return w;
}
function arrow(ctx, x1, y1, x2, y2, o = {}) {
  const col = o.color || C.ink, lw = o.lw || 6, hd = o.head || 22, k = o.k ?? 1;
  const ex = lerp(x1, x2, k), ey = lerp(y1, y2, k), an = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [c, w] of [['#fff', lw + 10], [col, lw]]) {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w; if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex - Math.cos(an) * hd * 0.6, ey - Math.sin(an) * hd * 0.6); ctx.stroke(); ctx.setLineDash([]);
    if (k > 0.05) { const e = (c === '#fff') ? 6 : 0; ctx.beginPath(); ctx.moveTo(ex + Math.cos(an) * e, ey + Math.sin(an) * e);
      ctx.lineTo(ex - Math.cos(an - 0.5) * (hd + e), ey - Math.sin(an - 0.5) * (hd + e)); ctx.lineTo(ex - Math.cos(an + 0.5) * (hd + e), ey - Math.sin(an + 0.5) * (hd + e)); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
// rubber stamp
function stamp(ctx, s, x, y, k, o = {}) {
  if (k <= 0) return; const sc = lerp(2.2, 1, eOut5(clamp(k * 1.6))), a = clamp(k * 6);
  at(ctx, x, y, { s: sc, a: a * (o.a ?? 1), r: (o.rot ?? -8) * Math.PI / 180 }, () => {
    const font = o.font || F.zh(54, 900), w = measure(ctx, s, font) + 56, h = o.h || 96, col = o.color || C.red;
    ctx.strokeStyle = col; ctx.lineWidth = 7; rrect(ctx, -w / 2, -h / 2, w, h, 14); ctx.stroke();
    ctx.lineWidth = 3; rrect(ctx, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 9); ctx.stroke();
    txt(ctx, s, 0, 2, { font, color: col });
    if (o.sub) txt(ctx, o.sub, 0, h / 2 + 26, { font: F.en(22, 700), color: col, ls: 2 });
  });
}
// video clip sticker window (frames are jpg sequences at 30fps)
const CLIPLEN = {};
function clipFrame(name, t) { const n = CLIPLEN[name] || 150, i = (Math.floor(t * FPS) % n + n) % n; return `/assets/clips/${name}/${String(i + 1).padStart(4, '0')}.jpg`; }
function clipWin(ctx, name, lt, x, y, w, o = {}) {
  const h = w * 9 / 16, im = img(clipFrame(name, lt + (o.off || 0)));
  at(ctx, x, y, o, () => {
    card(ctx, -w / 2, -h / 2, w, h, { r: 18, ow: o.ow ?? 12, fill: '#222', lift: o.lift || 0, sa: 0.3 });
    if (im) { ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 18); ctx.clip(); ctx.drawImage(im, -w / 2, -h / 2, w, h);
      if (o.gray) { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${o.gray})`; ctx.fillRect(-w / 2, -h / 2, w, h); }
      ctx.restore(); }
    if (o.label) pill(ctx, o.label, -w / 2 + 14, -h / 2 + 4, { font: F.zh(22, 800), h: 40, padx: 14, align: 'left', fill: o.lc || C.ink, ow: 5 });
  });
}

// ---------------------------------------------------------------- background, camera shake
let GRAIN = null, VIG = null;
function bg(ctx, t, o = {}) {
  ctx.fillStyle = o.color || C.bg; ctx.fillRect(-60, -60, W + 120, H + 120);
  const ox = (o.px || 0) % 40, oy = (o.py || 0) % 40;
  ctx.fillStyle = o.dot || 'rgba(31,42,54,0.10)';
  for (let y = -40 + oy; y < H + 40; y += 40) for (let x = -40 + ox; x < W + 40; x += 40) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
}
function vignette(ctx, t) {
  if (!VIG) {
    VIG = canvasMake(W, H); const g = VIG.getContext('2d');
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    gr.addColorStop(0, 'rgba(22,34,46,0)'); gr.addColorStop(1, 'rgba(22,34,46,0.13)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    GRAIN = canvasMake(256, 256); const q = GRAIN.getContext('2d'), id = q.createImageData(256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = rnd(i * 0.731 + 3) * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    q.putImageData(id, 0, 0);
  }
  ctx.drawImage(VIG, 0, 0);
  ctx.save(); ctx.globalAlpha = 0.035; ctx.globalCompositeOperation = 'overlay';
  const f = Math.floor(t * FPS), ox = Math.floor(rnd(f) * 256), oy = Math.floor(rnd(f + 0.5) * 256);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.translate(-ox, -oy); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
}
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const im of IMPACTS) { const d = t - im.t; if (d < 0 || d > 0.6) continue; const e = Math.exp(-d * 9) * im.amp;
    x += Math.sin(d * 63 + im.t) * 9 * e; y += Math.cos(d * 71 + im.t * 3) * 11 * e; r += Math.sin(d * 50) * 0.004 * e; }
  return { x, y, r };
}

// ---------------------------------------------------------------- curves (u = log10(price), y in %)
const U0 = 0.55, U268 = Math.log10(268);
function mono(pts) {   // monotone cubic (Fritsch–Carlson)
  const n = pts.length, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const tt = 3 / Math.sqrt(s); m[i] = tt * a * d[i]; m[i + 1] = tt * b * d[i]; } }
  return u => {
    if (u <= xs[0]) return ys[0]; if (u >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (u - xs[n - 1]);
    let i = 0; while (u > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], k = (u - xs[i]) / h, k2 = k * k, k3 = k2 * k;
    return (2 * k3 - 3 * k2 + 1) * ys[i] + (k3 - 2 * k2 + k) * h * m[i] + (-2 * k3 + 3 * k2) * ys[i + 1] + (k3 - k2) * h * m[i + 1];
  };
}
const CURVE = {
  genshin: mono([[U0, 4], [1, 5], [1.48, 22], [2, 45], [2.5, 62], [3, 80], [3.5, 85], [4, 88], [4.6, 91], [5.2, 93]]),
  lads: mono([[U0, 3], [1, 4], [1.48, 20], [2, 40], [2.5, 54], [3, 68], [3.5, 78], [4, 88], [4.5, 98], [5.0, 108], [5.2, 113]]),
  whiteout: mono([[U0, 2], [1, 2.5], [2, 3.5], [3, 5], [3.5, 12], [4, 42], [4.5, 85], [5.0, 125], [5.2, 140]]),
  justice: mono([[U0, 4], [1, 5], [2, 7], [3, 9], [3.5, 16], [4, 50], [4.5, 88], [5.0, 122], [5.2, 136]]),
  hok: u => { const steps = [[U0, 40], [0.78, 48], [1.59, 60], [1.95, 64], [2.7, 72], [3.18, 77], [4.28, 86], [4.65, 92], [5.0, 100]];
    let y = 40; for (const [x, v] of steps) if (u >= x) y = v; return y; },
  delta: (u, A = 1) => { const base = mono([[U0, 40], [1, 45], [1.5, 54], [2, 60], [2.5, 62], [3, 64], [3.5, 66], [4, 70], [5.2, 72]])(u);
    const amp = A * clamp((u - 2.6) / 1.4) * 34, w = Math.sin(u * 37) * 0.6 + Math.sin(u * 61 + 1) * 0.4; return base + amp * w; },
  wukong: u => u < U268 ? 0 : 100,
  landlord: (u, A = 1) => { const base = mono([[U0, 6], [0.78, 30], [1.5, 42], [2, 50], [3, 55], [4, 58], [5.2, 60]])(u);
    const amp = A * clamp((u - 2.4) / 1.6) * 42, w = Math.sin(u * 29 + 2) * 0.55 + Math.sin(u * 53) * 0.45; return Math.max(0, base + amp * w); },
};
const STEPPED = { hok: true, wukong: true };
const PRICE_TICKS = [[1, '¥10'], [2, '¥100'], [3, '¥1,000'], [4, '¥10,000'], [5, '¥100,000']];

// chart: st = {rect:[x,y,w,h], view:[u0,u1,y0,y1], a, curves:{g:{to,a,w,hl,from}}, labels, floor, ceil, ticks}
function chartMap(st) {
  const [x, y, w, h] = st.rect, [u0, u1, y0, y1] = st.view;
  return { X: u => x + (u - u0) / (u1 - u0) * w, Y: p => y + h - (p - y0) / (y1 - y0) * h, U: px => u0 + (px - x) / w * (u1 - u0) };
}
function drawChart(ctx, t, st) {
  if ((st.a ?? 1) <= 0.003) return;
  const [x, y, w, h] = st.rect, M = chartMap(st);
  ctx.save(); ctx.globalAlpha *= st.a ?? 1;
  card(ctx, x, y, w, h, { r: 30, ow: 10, fill: C.card, sa: 0.18 });
  ctx.save(); rrect(ctx, x, y, w, h, 30); ctx.clip();
  // minor/major gridlines
  for (let d = 0; d <= 5; d++) for (let k = 1; k < 10; k++) {
    const u = d + Math.log10(k), px = M.X(u); if (px < x - 2 || px > x + w + 2) continue;
    ctx.fillStyle = k === 1 ? 'rgba(31,42,54,0.14)' : 'rgba(31,42,54,0.05)'; ctx.fillRect(px - (k === 1 ? 1.5 : 1), y, k === 1 ? 3 : 2, h);
  }
  for (let p = 0; p <= 100; p += 25) { const py = M.Y(p); ctx.fillStyle = 'rgba(31,42,54,0.06)'; ctx.fillRect(x, py - 1, w, 2); }
  // red floor / gold ceiling
  const fy = M.Y(0), cy = M.Y(100), fl = st.floor ?? 1, ce = st.ceil ?? 1;
  if (fl > 0) { ctx.save(); ctx.globalAlpha *= fl; ctx.fillStyle = hexA(C.red, 0.10); ctx.fillRect(x, fy, w, h); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.setLineDash([22, 12]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x + w * (st.floorK ?? 1), fy); ctx.stroke(); ctx.restore(); }
  if (ce > 0) { ctx.save(); ctx.globalAlpha *= ce; const g = ctx.createLinearGradient(0, cy - 60, 0, cy); g.addColorStop(0, hexA(C.gold, 0)); g.addColorStop(1, hexA(C.gold, 0.16));
    ctx.fillStyle = g; ctx.fillRect(x, cy - 60, w, 60); ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w * (st.ceilK ?? 1), cy); ctx.stroke();
    if (st.ceilBreak) { const k = st.ceilBreak; ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.setLineDash([16, 14]); ctx.globalAlpha *= k; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke(); }
    ctx.restore(); }
  // extra in-chart decorations (bands, zones) drawn under curves
  if (st.under) st.under(ctx, M);
  // curves
  for (const g of Object.keys(st.curves || {})) drawCurve(ctx, t, g, st.curves[g], M, st);
  if (st.over) st.over(ctx, M);
  ctx.restore();
  // tick labels (outside clip, along the bottom edge)
  if ((st.ticks ?? 1) > 0) for (const [u, s] of PRICE_TICKS) {
    const px = M.X(u); if (px < x + 30 || px > x + w - 30) continue;
    ctx.save(); ctx.globalAlpha *= st.ticks ?? 1; pill(ctx, s, px, y + h + 4, { font: F.num(st.tickSize || 26, 800), h: 46, padx: 16, fill: C.ink }); ctx.restore();
  }
  if (st.yLabels ?? 1) {
    ctx.save(); ctx.globalAlpha *= (st.yLabels ?? 1);
    if (fl > 0.05 && fy < y + h + 2) { ctx.globalAlpha *= fl; pill(ctx, '氪了白氪 · WASTED', x + (st.labelX ?? 22), fy - 34, { font: F.zh(22, 800), h: 40, padx: 14, align: 'left', fill: C.red, ow: 5 }); ctx.globalAlpha /= fl; }
    if (ce > 0.05 && cy > y - 2) { ctx.globalAlpha *= ce; pill(ctx, '彻底氪穿 · MAXED', x + (st.labelX ?? 22), cy + 32, { font: F.zh(22, 800), h: 40, padx: 14, align: 'left', fill: C.goldD, ow: 5 }); }
    ctx.restore();
  }
  ctx.restore();
}
function curvePts(g, from, to, M, n = 220, A = 1) {
  const f = CURVE[g], pts = [];
  if (g === 'wukong') {
    const a = Math.min(to, U268);
    pts.push([from, 0], [a, 0]); if (to > U268) { pts.push([U268, 0], [U268, Math.min(100, (to - U268) / 0.02 * 100)]); if (to > U268 + 0.02) pts.push([to, 100]); }
    return pts.map(([u, p]) => [M.X(u), M.Y(p)]);
  }
  for (let i = 0; i <= n; i++) {
    const u = lerp(from, to, i / n), p = f(u, A);
    if (STEPPED[g] && i > 0) { const pu = lerp(from, to, (i - 1) / n), pp = f(pu, A); if (pp !== p) pts.push([M.X(u), M.Y(pp)]); }
    pts.push([M.X(u), M.Y(p)]);
  }
  return pts;
}
function drawCurve(ctx, t, g, c, M, st) {
  if ((c.a ?? 1) <= 0.003 || c.to <= (c.from ?? U0)) return;
  const pts = curvePts(g, c.from ?? U0, c.to, M, 220, c.amp ?? 1), lw = c.w || 9, col = c.color || C[g];
  ctx.save(); ctx.globalAlpha *= c.a ?? 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = () => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); };
  if (c.band) { // volatility band for chip games
    ctx.save(); ctx.globalAlpha *= 0.16 * c.band; ctx.fillStyle = col; ctx.beginPath();
    const f = CURVE[g], n = 80, from = c.from ?? U0;
    for (let i = 0; i <= n; i++) { const u = lerp(from, c.to, i / n), amp = clamp((u - 2.5) / 1.5) * 48 + 4; const b = (g === 'delta' ? 60 : 52) + (u - 2) * 3; ctx.lineTo(M.X(u), M.Y(Math.min(110, b + amp))); }
    for (let i = n; i >= 0; i--) { const u = lerp(from, c.to, i / n), amp = clamp((u - 2.5) / 1.5) * 48 + 4; const b = (g === 'delta' ? 60 : 52) + (u - 2) * 3; ctx.lineTo(M.X(u), M.Y(Math.max(0, b - amp))); }
    ctx.fill(); ctx.restore();
  }
  ctx.shadowColor = 'rgba(22,34,46,0.22)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = lw + 10; path(); ctx.stroke(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = col; ctx.lineWidth = lw; if (c.dash) ctx.setLineDash(c.dash); path(); ctx.stroke(); ctx.setLineDash([]);
  if (c.hl) { ctx.globalAlpha *= c.hl * (0.5 + 0.5 * Math.sin(t * 8)); ctx.strokeStyle = '#fff'; ctx.lineWidth = lw * 0.35; path(); ctx.stroke(); }
  ctx.restore();
  // pen head: the game's icon sticker riding the tip
  if (c.head !== false) {
    const [hx, hy] = pts[pts.length - 1];
    icon(ctx, g, hx, hy, c.headSize || 64, { a: (c.a ?? 1) * (c.headA ?? 1), lift: 0.2, r: Math.sin(t * 3 + g.length) * 0.05 });
  }
}

// ---------------------------------------------------------------- top rail + subtitles
function rail(ctx, t) {
  const ch = chapterAt(t), cs = TL.chStart, x0 = 64, y0 = 52;
  ctx.save();
  ctx.fillStyle = C.accent; ctx.fillRect(x0, y0 - 9, 18, 18);
  txt(ctx, '10块到10万', x0 + 32, y0, { font: F.zh(24, 900), align: 'left', color: C.ink });
  txt(ctx, 'FROM ¥10 TO ¥100K', x0 + 172, y0 + 1, { font: F.en(17, 700), align: 'left', color: C.light, ls: 2 });
  const segW = 150, gx = W - 64 - segW * 6 - 10 * 5;
  for (let i = 0; i < 6; i++) {
    const sx = gx + i * (segW + 10), a = cs[i], b = cs[i + 1] ?? TL.duration, k = clamp((t - a) / (b - a));
    ctx.fillStyle = 'rgba(31,42,54,0.12)'; ctx.fillRect(sx, y0 + 16, segW, 4);
    ctx.fillStyle = i === ch ? C.accent : C.ink; ctx.fillRect(sx, y0 + 16, segW * k, 4);
    txt(ctx, `0${i + 1} ${CHAPTERS[i].zh}`, sx, y0 - 4, { font: F.zh(19, i === ch ? 900 : 600), align: 'left', color: i === ch ? C.ink : C.light });
  }
  ctx.restore();
}
function chapterAt(t) { let c = 0; TL.chStart.forEach((s, i) => { if (t >= s - 0.001) c = i; }); return c; }
function subtitles(ctx, t) {
  for (const s of TL.subs) {
    if (t < s.t0 - 0.05 || t > s.t1 + 0.2) continue;
    const k = prog(t, s.t0 - 0.05, 0.22), q = prog(t, s.t1, 0.18), a = eOut(k) * (1 - q);
    const fz = F.zh(42, 800), fe = F.en(25, 500);
    const wz = measure(ctx, s.zh, fz), we = measure(ctx, s.en, fe), bw = Math.max(wz, we) + 64, bh = 118, cx = W / 2, cy = H - 92 + (1 - eOut(k)) * 14;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(22,34,46,0.3)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(31,42,54,0.94)'; rrect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 22); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.accent; ctx.fillRect(cx - bw / 2 + 22, cy - bh / 2, 46, 5);
    txt(ctx, s.zh, cx, cy - 20, { font: fz, color: '#fff' });
    txt(ctx, s.en, cx, cy + 30, { font: fe, color: '#C3CED8' });
    ctx.restore();
  }
}

if (typeof module !== 'undefined') module.exports = {};
