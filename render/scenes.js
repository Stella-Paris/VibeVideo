// Shot choreography. Each shot: setup(S) registers cue times (sound + camera punches),
// draw(ctx, t, S) paints its overlay. Chart states are per chapter so the chart stays continuous.
const FULL = [110, 140, 1700, 690], LEFT = [80, 140, 1080, 690], MINI = [60, 118, 600, 320], CENTER = [260, 150, 1400, 650];
const VIEW_ALL = [U0, 5.35, -8, 118];
const RC = 1530;                       // right-column centre x when the chart sits LEFT
const SH = {};                          // shot id -> {setup, draw}
const E = (S, i, dt = 0) => S.L[i] + dt;
const fmt = n => Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- shared pieces
function infoCard(ctx, t, tin, tout, x, y, w, h, o = {}) {
  const p = slap(t, tin, tout, { rot: o.rot || 0, wob: 4 });
  if (!p.on) return p;
  at(ctx, x, y, { s: p.s, a: p.a, r: p.r }, () => {
    card(ctx, -w / 2, -h / 2, w, h, { r: 24, fill: o.fill || C.card, lift: p.lift, ow: 9 });
    if (o.bar) { ctx.fillStyle = o.bar; rrect(ctx, -w / 2, -h / 2, 14, h, 7); ctx.fill(); }
    if (o.fn) o.fn(w, h, p);
  });
  return p;
}
function priceTag(ctx, t, tin, tout, x, y, top, big, o = {}) {
  const w = o.w || 300, h = o.h || 150;
  return infoCard(ctx, t, tin, tout, x, y, w, h, Object.assign({}, o, { fn: (w, h) => {
    if (o.g) icon(ctx, o.g, -w / 2 + 46, -h / 2 + 44, 54, { sa: 0.15 });
    if (o.em) emoji(ctx, o.em, w / 2 - 40, -h / 2 + 34, 80, { r: 0.15 });
    txt(ctx, top, o.g ? -w / 2 + 84 : -w / 2 + 28, -h / 2 + 44, { font: F.zh(o.ts || 26, 800), color: C.mid, align: 'left' });
    txt(ctx, big, -w / 2 + 28, h / 2 - 46, { font: o.bf || F.num(o.bs || 54, 900), color: o.color || C.ink, align: 'left' });
  } }));
}
function bigWord(ctx, t, tin, tout, s, x, y, o = {}) {
  const p = slap(t, tin, tout, { rot: o.rot ?? -3, from: o.from ?? 1.6 });
  if (!p.on) return p;
  at(ctx, x, y, { s: p.s, a: p.a, r: p.r }, () => {
    stext(ctx, s, 0, 0, { font: o.font || F.zh(o.size || 96, 900), color: o.color || C.ink, ow: o.ow ?? 16, ls: o.ls });
    if (o.sub) txt(ctx, o.sub, 0, (o.size || 96) * 0.5 + 34, { font: F.en(o.subSize || 28, 800), color: o.subColor || C.mid, ls: 3 });
  });
  return p;
}
function progressBar(ctx, x, y, w, h, k, col, o = {}) {
  ctx.save(); ctx.fillStyle = '#fff'; rrect(ctx, x - 6, y - 6, w + 12, h + 12, (h + 12) / 2); ctx.fill();
  ctx.fillStyle = 'rgba(31,42,54,0.12)'; rrect(ctx, x, y, w, h, h / 2); ctx.fill();
  if (k > 0.001) { ctx.fillStyle = col; rrect(ctx, x, y, Math.max(h, w * clamp(k)), h, h / 2); ctx.fill(); }
  if (o.marks) for (const [mk, lab] of o.marks) { const mx = x + w * mk; ctx.fillStyle = C.ink; ctx.fillRect(mx - 2, y - 12, 4, h + 24); txt(ctx, lab, mx, y + h + 30, { font: F.num(22, 800), color: C.ink }); }
  ctx.restore();
}
function vsOpener(ctx, t, S, g1, g2, n, o = {}) {
  const a = S.t0, out = S.t1 - 0.35, k = prog(t, a, 0.5), q = prog(t, out, 0.35);
  // diagonal colour split slides in
  ctx.save(); ctx.globalAlpha *= 1 - q;
  const sx = lerp(-W, 0, eOut5(k)), c1 = o.c1 || C[g1], c2 = o.c2 || C[g2];
  ctx.fillStyle = hexA(c1 === C.wukong ? '#2B2B2B' : c1, 0.92); ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + W * 0.58, 0); ctx.lineTo(sx + W * 0.42, H); ctx.lineTo(sx, H); ctx.fill();
  const rx = lerp(2 * W, W, eOut5(k));
  ctx.fillStyle = hexA(c2, 0.92); ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx - W * 0.42, 0); ctx.lineTo(rx - W * 0.58, H); ctx.lineTo(rx, H); ctx.fill();
  // speed streaks
  ctx.globalAlpha *= 0.18; ctx.fillStyle = '#fff';
  for (let i = 0; i < 14; i++) { const yy = rnd(i + n * 10) * H, len = 200 + rnd(i * 3) * 500, xx = ((t - a) * (900 + rnd(i) * 900) + rnd(i * 7) * W) % (W + len) - len; ctx.fillRect(xx, yy, len, 4); }
  ctx.restore();
  const hit = a + 0.55;
  const p1 = slap(t, a + 0.25, out, { rot: -6, from: 2 }), p2 = slap(t, a + 0.4, out, { rot: 6, from: 2 });
  icon(ctx, g1, 560, 470, 330, { s: p1.s, a: p1.a, r: p1.r, lift: p1.lift });
  icon(ctx, g2, 1360, 470, 330, { s: p2.s, a: p2.a, r: p2.r, lift: p2.lift });
  for (const [g, x, p] of [[g1, 560, p1], [g2, 1360, p2]]) {
    at(ctx, x, 720, { s: p.s, a: p.a }, () => { stext(ctx, GAMES[g].zh, 0, 0, { font: F.zh(64, 900), color: C.ink, ow: 12 });
      txt(ctx, GAMES[g].en.toUpperCase(), 0, 64, { font: F.en(26, 800), color: '#fff', ls: 3 }); });
  }
  const pv = slap(t, hit, out, { from: 3, rot: -8 });
  at(ctx, 960, 470, { s: pv.s, a: pv.a, r: pv.r }, () => {
    ctx.fillStyle = C.accent; ctx.beginPath();
    for (let i = 0; i < 24; i++) { const an = i / 24 * Math.PI * 2, r = i % 2 ? 92 : 140; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    ctx.closePath(); ctx.lineWidth = 16; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
    stext(ctx, 'VS', 0, 4, { font: F.num(96, 900), color: '#fff', outline: C.ink, ow: 8, shadow: false });
  });
  const pt = pop(t, a + 0.1, out, 0.35);
  at(ctx, 960, 190, { s: pt.s, a: pt.a }, () => {
    pill(ctx, `ROUND ${n} · 第${'一二三四'[n - 1]}组`, 0, 0, { font: F.zh(36, 900), h: 70, padx: 30, fill: C.ink });
  });
  return hit;
}
function chartMode(t, keys) { return kf(t, keys); }
const miniFade = rect => 1 - clamp((LEFT[2] - rect[2]) / (LEFT[2] - MINI[2]));

// ======================================================================== CH0  建立标尺
SH.S01 = {
  setup(S) {
    S.e = { coin: E(S, 0, 0.1), big: E(S, 0, 1.25), q: E(S, 1, 0.1) };
    sfx('coin', S.e.coin); for (let i = 0; i < 5; i++) sfx('stack', S.e.big - 0.5 + i * 0.1, { i });
    sfx('vault', S.e.big); impact(S.e.big, 1.4); sfx('question', S.e.q); sfx('slap', S.e.q + 0.3);
  },
  draw(ctx, t, S) {
    const { coin, big, q } = S.e, out = S.t1 - 0.3;
    // left: ¥10
    const pl = slap(t, coin - 0.15, out, { rot: -4 });
    at(ctx, 520, 430, { s: pl.s, a: pl.a, r: pl.r }, () => {
      stext(ctx, '¥10', 0, 0, { font: F.num(190, 900), color: C.ink, ow: 18 });
      txt(ctx, '十块钱', 0, 150, { font: F.zh(40, 800), color: C.mid });
    });
    emoji(ctx, 'coin', 330, 270, 170, Object.assign({ lift: pl.lift }, slap(t, coin, out, { rot: -14, from: 2.2 })));
    // right: ¥100,000 count-up
    const pr = slap(t, big - 0.6, out, { rot: 3 });
    const v = lerp(10, 100000, eOut5(prog(t, big - 0.6, 0.6)));
    at(ctx, 1380, 430, { s: pr.s, a: pr.a, r: pr.r }, () => {
      stext(ctx, '¥' + fmt(v), 0, 0, { font: F.num(150, 900), color: C.accent, ow: 18 });
      txt(ctx, '十万块', 0, 140, { font: F.zh(40, 800), color: C.mid });
    });
    for (let i = 0; i < 5; i++) { const p = slap(t, big - 0.5 + i * 0.1, out, { rot: (i - 2) * 8, from: 2 });
      emoji(ctx, i === 4 ? 'bank' : 'moneybag', 1130 + i * 125, 255 - (i % 2) * 30, i === 4 ? 170 : 140, Object.assign(p, { r: p.r })); }
    // centre ? and controller
    const pq = slap(t, q, out, { from: 2.5, rot: 8 });
    at(ctx, 960, 690, { s: pq.s, a: pq.a, r: pq.r }, () => stext(ctx, '?', 0, 0, { font: F.num(150, 900), color: C.ink, ow: 16 }));
    emoji(ctx, 'game', 960, 520, 150, Object.assign({ }, slap(t, q + 0.3, out, { rot: -10 })));
    const pv = pop(t, coin + 0.4, out);
    at(ctx, 960, 400, { s: pv.s, a: pv.a }, () => txt(ctx, 'OR', 0, 0, { font: F.en(54, 900), color: C.light }));
  },
};
SH.S02 = {
  setup(S) {
    S.e = { w: [0, 1, 2, 3].map(i => E(S, 0, 0.05 + i * 0.32)), icons: E(S, 1, 0.1) };
    S.e.w.forEach((x, i) => sfx('slap', x, { i })); sfx('swish', E(S, 0, 1.4));
    for (let i = 0; i < 8; i++) sfx('pluck', S.e.icons + i * 0.09, { i });
  },
  draw(ctx, t, S) {
    const out1 = S.e.icons - 0.1, out = S.t1 - 0.25;
    const wins = [['gwish', 520, 310, -4, '原神 · 抽卡'], ['jsky', 1400, 300, 3, '逆水寒 · 烟花'], ['delta3', 520, 640, 3, '三角洲 · 撤离'], ['ll2', 1400, 650, -3, '斗地主 · 输豆']];
    wins.forEach(([n, x, y, r, lab], i) => { const p = slap(t, S.e.w[i], out1, { rot: r }); clipWin(ctx, n, t - S.e.w[i], x, y, 640, { s: p.s, a: p.a, r: p.r, lift: p.lift, label: lab }); });
    // danmaku
    const dm = ['二游一单648太贵了', 'MMO才是真无底洞', '斗地主才是吞金兽吧', '零氪也能玩？', '月卡党路过', '十万起步罢了'];
    dm.forEach((s, i) => { const t0 = S.t0 + 0.6 + i * 0.55, x = W + 50 - (t - t0) * 520; if (t < t0 || x < -500 || t > out1 + 0.3) return;
      ctx.save(); ctx.globalAlpha *= 1 - prog(t, out1, 0.3); stext(ctx, s, x, 150 + (i % 3) * 300 + 90, { font: F.zh(40, 900), color: '#fff', outline: C.ink, ow: 5, shadow: false, align: 'left' }); ctx.restore(); });
    // 8 icons line up
    const gs = Object.keys(GAMES);
    gs.forEach((g, i) => { const p = slap(t, S.e.icons + i * 0.09, out, { rot: (i % 2 ? 6 : -6) }); const x = 260 + i * 200, y = 470 + (i % 2 ? 26 : -26);
      icon(ctx, g, x, y, 170, { s: p.s, a: p.a, r: p.r, lift: p.lift });
      if (p.on) at(ctx, x, y + 135, { a: p.a }, () => txt(ctx, GAMES[g].zh, 0, 0, { font: F.zh(26, 800), color: C.ink })); });
    const pb = slap(t, S.e.icons + 0.9, out, { rot: -3 });
    at(ctx, 960, 230, { s: pb.s, a: pb.a, r: pb.r }, () => stext(ctx, '8款游戏 · 同一张图', 0, 0, { font: F.zh(64, 900), color: C.ink, ow: 14 }));
  },
};
// chapter 0 chart: builds in S03/S04, used under S05
function chart0(t) {
  const s3 = TL.shots.S03, s4 = TL.shots.S04, s5 = TL.shots.S05, s6 = TL.shots.S06;
  if (t < s3.t0 || t > s6.t0 + 0.8) return null;
  const a = fade(t, s3.t0, s6.t0, 0.4, 0.5);
  const st = { rect: FULL, view: VIEW_ALL, a, curves: {}, floor: clamp(prog(t, E(s4, 1, 0), 0.6) * 2), floorK: eOut(prog(t, E(s4, 1, 0), 0.7)),
    ceil: clamp(prog(t, E(s4, 1, 1.2), 0.6) * 2), ceilK: eOut(prog(t, E(s4, 1, 1.2), 0.7)), ticks: 0, yLabels: 1, labelX: 120 };
  st.dim = fade(t, s5.t0 + 0.2, 1e9, 0.5) * 0.7;
  return st;
}
SH.S03 = {
  setup(S) {
    S.e = { ticks: [0, 1, 2, 3, 4].map(i => E(S, 0, 0.6 + i * 0.42)), log: E(S, 1, 0.05) };
    S.e.ticks.forEach((x, i) => sfx('step', x, { i })); sfx('stamp', S.e.log + 0.2); impact(S.e.log + 0.2, 0.6);
    [0, 1, 2, 3, 4].forEach(i => sfx('tick', S.e.log + 0.6 + i * 0.3, { i }));
  },
  draw(ctx, t, S) {
    const st = chart0(t); if (!st) return;
    const M = chartMap(st), y = FULL[1] + FULL[3] + 4, out = TL.shots.S05.t1;
    PRICE_TICKS.forEach(([u, s], i) => {
      const p = slap(t, S.e.ticks[i], out + 3, { rot: (i % 2 ? 4 : -4), from: 1.8 });
      const fl = (t > S.e.log + 0.6 + i * 0.3 && t < S.e.log + 0.9 + i * 0.3) ? 1.18 : 1;
      at(ctx, M.X(u), y, { s: p.s * fl, a: p.a * st.a, r: p.r }, () => pill(ctx, s, 0, 0, { font: F.num(30, 900), h: 56, padx: 18, fill: i === 4 ? C.accent : C.ink }));
      if (i > 0) { const px = (M.X(u) + M.X(u - 1)) / 2, pb = pop(t, S.e.ticks[i] - 0.1, out + 3);
        const hop = Math.sin(clamp(prog(t, S.e.ticks[i] - 0.25, 0.35)) * Math.PI) * 40;
        at(ctx, px, y - 70 - hop, { s: pb.s, a: pb.a * st.a, r: -0.08 }, () => pill(ctx, '×10', 0, 0, { font: F.num(28, 900), h: 48, padx: 14, fill: C.red }));
        if (pb.on) { ctx.save(); ctx.globalAlpha *= pb.a * st.a * (1 - (st.dim || 0)); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(M.X(u - 1) + 40, y - 34); ctx.quadraticCurveTo(px, y - 120, M.X(u) - 40, y - 34); ctx.stroke(); ctx.restore(); }
      }
    });
    if (t < S.t1 + 0.3) {
      const pb = slap(t, S.e.log + 0.2, S.t1 - 0.2, { rot: -4, from: 2 });
      at(ctx, 960, 420, { s: pb.s, a: pb.a, r: pb.r }, () => { stext(ctx, '对数坐标', 0, 0, { font: F.zh(120, 900), color: C.ink, ow: 18 });
        txt(ctx, 'LOGARITHMIC SCALE · EACH STEP ×10', 0, 100, { font: F.en(30, 800), color: C.accent, ls: 3 }); });
      emoji(ctx, 'abacus', 1330, 330, 150, slap(t, S.e.log + 0.4, S.t1 - 0.2, { rot: 12 }));
    }
  },
};
SH.S04 = {
  setup(S) {
    S.e = { y: E(S, 0, 0.2), floor: E(S, 1, 0), ceil: E(S, 1, 1.2) };
    sfx('rise', S.e.y); sfx('floor', S.e.floor); sfx('ceil', S.e.ceil + 0.1); impact(S.e.floor, 0.5);
  },
  draw(ctx, t, S) {
    const st = chart0(t); if (!st) return; const M = chartMap(st), out = S.t1 - 0.2;
    const k = eOut(prog(t, S.e.y, 0.8));
    if (k > 0) { arrow(ctx, FULL[0] + 70, M.Y(0), FULL[0] + 70, lerp(M.Y(0), M.Y(105), k), { color: C.ink, lw: 8, head: 26 });
      const p = pop(t, S.e.y + 0.5, out);
      at(ctx, FULL[0] + 250, M.Y(55), { s: p.s, a: p.a, r: -0.04 }, () => { stext(ctx, '真实体验', 0, 0, { font: F.zh(58, 900), ow: 12 }); txt(ctx, 'EXPERIENCE', 0, 52, { font: F.en(24, 800), color: C.mid, ls: 3 }); }); }
    emoji(ctx, 'sob', 1500, M.Y(0) - 110, 150, slap(t, S.e.floor + 0.5, out, { rot: -10 }));
    emoji(ctx, 'starstruck', 1500, M.Y(100) + 110, 150, slap(t, S.e.ceil + 0.5, out, { rot: 10 }));
    emoji(ctx, 'crown', 1610, M.Y(100) + 40, 110, slap(t, S.e.ceil + 0.7, out, { rot: 20 }));
    bigWord(ctx, t, S.e.floor + 0.3, out, '氪了白氪', 1180, M.Y(0) - 90, { size: 66, color: C.red, sub: 'MONEY WASTED', rot: -3 });
    bigWord(ctx, t, S.e.ceil + 0.3, out, '彻底氪穿', 1180, M.Y(100) + 100, { size: 66, color: C.goldD, sub: 'MAXED OUT', rot: 3 });
  },
};
const PAIRS = [['genshin', 'lads'], ['whiteout', 'justice'], ['hok', 'delta'], ['wukong', 'landlord']];
SH.S05 = {
  setup(S) {
    S.e = { fly: E(S, 0, 0.1), pairs: PAIRS.map((_, i) => E(S, 0, 0.9 + i * 0.3)), math: E(S, 1, 0.2) };
    for (let i = 0; i < 8; i++) sfx('pluck', S.e.fly + i * 0.07, { i: i + 2 });
    S.e.pairs.forEach((x, i) => sfx('lock', x, { i })); ['pi', 'sum', 'log'].forEach((_, i) => sfx('blip', S.e.math + i * 0.25, { i }));
    sfx('swish', S.t1 - 0.3);
  },
  draw(ctx, t, S) {
    const out = S.t1 - 0.2, gs = PAIRS.flat();
    // dim the chart beneath
    ctx.save(); ctx.globalAlpha = 0.55 * fade(t, S.t0, S.t1 + 0.5, 0.4, 0.4); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.restore();
    PAIRS.forEach(([a, b], i) => {
      const cx = 290 + i * 447, cy = 470, p = slap(t, S.e.pairs[i], out, { rot: (i % 2 ? 3 : -3), wob: 3 });
      at(ctx, cx, cy, { s: p.s, a: p.a, r: p.r }, () => {
        card(ctx, -195, -190, 390, 380, { r: 30, fill: '#fff', lift: p.lift });
        txt(ctx, `ROUND ${i + 1}`, 0, -150, { font: F.en(24, 900), color: C.accent, ls: 3 });
        txt(ctx, 'VS', 0, -10, { font: F.num(54, 900), color: C.ink });
        txt(ctx, `${GAMES[a].zh} × ${GAMES[b].zh}`, 0, 150, { font: F.zh(26, 800), color: C.mid });
      });
      // icons fly from the chart origin into their card slots
      [a, b].forEach((g, j) => {
        const t0 = S.e.fly + gs.indexOf(g) * 0.07, k = eInOut(prog(t, t0, 0.8));
        if (t < t0) return; const x0 = FULL[0] + 40, y0 = FULL[1] + FULL[3] - 40, x1 = cx + (j ? 90 : -90), y1 = cy - 20;
        const x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 260;
        icon(ctx, g, x, y, lerp(70, 140, k), { a: 1 - prog(t, out, 0.25), r: (1 - k) * 2 * (j ? 1 : -1), lift: Math.sin(k * Math.PI) });
      });
    });
    ['∑', 'log₁₀', 'π'].forEach((s, i) => { const p = slap(t, S.e.math + i * 0.25, out, { rot: (i - 1) * 12 });
      at(ctx, 520 + i * 440, 820 - (i % 2) * 40, { s: p.s, a: p.a, r: p.r }, () => stext(ctx, s, 0, 0, { font: F.num(70, 900), color: [C.genshin, C.accent, C.delta][i], ow: 12 })); });
    emoji(ctx, 'abacus', 1660, 230, 120, slap(t, S.e.math + 0.8, out, { rot: 12 }));
  },
};
SH.S06 = {
  setup(S) { S.e = { hit: S.t0 + 0.55 }; sfx('vs', S.e.hit); sfx('swish', S.t0 + 0.2); impact(S.e.hit, 1.2); sfx('sparkle', S.e.hit + 0.15); },
  draw(ctx, t, S) { vsOpener(ctx, t, S, 'genshin', 'lads', 1); },
};

// ======================================================================== CH1  原神 vs 恋与深空
function chart1(t) {
  const sh = TL.shots, a = sh.S07.t0, z = sh.S13.t1;
  if (t < a - 0.2 || t > z + 0.4) return null;
  const rect = kf(t, [[a, LEFT], [sh.S09.t0 - 0.2, LEFT], [sh.S09.t0 + 0.4, MINI], [sh.S10.t0 - 0.2, MINI], [sh.S10.t0 + 0.4, LEFT],
    [sh.S12.t0 - 0.2, LEFT], [sh.S12.t0 + 0.4, MINI], [sh.S13.t0 - 0.2, MINI], [sh.S13.t0 + 0.4, FULL]]);
  const view = kf(t, [[a, [U0, 2.35, -8, 118]], [sh.S08.t0, [U0, 2.35, -8, 118]], [sh.S08.t0 + 1, [0.75, 2.6, -8, 118]], [sh.S10.t0, [0.75, 2.6, -8, 118]],
    [sh.S10.t0 + 1.2, [1.4, 3.7, -8, 118]], [sh.S11.t0, [1.4, 3.7, -8, 118]], [sh.S11.t0 + 1, [2.2, 4.5, -8, 118]], [sh.S13.t0, [2.2, 4.5, -8, 118]], [sh.S13.t0 + 1.2, [U0, 5.35, -8, 128]]]);
  const gTo = kf(t, [[E(sh.S07, 0), U0 + 0.01], [E(sh.S07, 0, 2.2), 1.05], [E(sh.S08, 1, -0.2), 1.05], [E(sh.S08, 1, 0.9), 2.05],
    [E(sh.S10, 2, 0), 2.05], [E(sh.S10, 2, 1.2), 3.0], [E(sh.S11, 0, 0.2), 3.0], [E(sh.S11, 0, 1.8), 4.05], [sh.S13.t0 + 0.6, 4.05], [E(sh.S13, 0, 0.5), 5.2]], eInOut);
  const lTo = kf(t, [[E(sh.S07, 0), U0 + 0.01], [E(sh.S07, 0, 2.2), 1.05], [E(sh.S08, 1, -0.2), 1.05], [E(sh.S08, 1, 0.9), 2.05],
    [E(sh.S10, 2, 0), 2.05], [E(sh.S10, 2, 1.2), 3.0], [sh.S12.t1 - 0.5, 3.0], [E(sh.S13, 0, 0.3), 3.0], [E(sh.S13, 1, 0.6), 5.2]], eInOut);
  const foc = t > sh.S10.t0 && t < sh.S12.t0 ? 1 : 0;
  return { rect, view, a: fade(t, a - 0.2, z, 0.4, 0.4) * miniFade(rect), floor: 1, ceil: 1, curves: {
    genshin: { to: gTo, a: 1, hl: 0 }, lads: { to: lTo, a: foc ? 0.35 : 1 } }, tickSize: rect[2] < 700 ? 18 : 26, yLabels: rect[2] < 700 ? 0 : 1 };
}
SH.S07 = {
  setup(S) { S.e = { c1: E(S, 1, 0.05), c2: E(S, 1, 0.35), bar: E(S, 2, 0.1), st: E(S, 2, 1.4) };
    sfx('slap', S.e.c1); sfx('slap', S.e.c2); sfx('fill', S.e.bar); sfx('stamp', S.e.st); impact(S.e.st, 0.6); sfx('tick', E(S, 0, 0.4)); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    priceTag(ctx, t, S.e.c1, out, RC, 270, '原神 · 1抽 = 160原石', '≈ ¥16', { g: 'genshin', em: 'shooting', w: 560, h: 160, color: C.genshin, rot: -2 });
    priceTag(ctx, t, S.e.c2, out, RC, 470, '恋与深空 · 1抽 = 150钻', '≈ ¥15', { g: 'lads', em: 'gem', w: 560, h: 160, color: C.lads, rot: 2 });
    const p = slap(t, S.e.bar, out, { rot: -1 });
    at(ctx, RC, 690, { s: p.s, a: p.a, r: p.r }, () => {
      card(ctx, -280, -80, 560, 160, { r: 24, fill: C.card, lift: p.lift });
      txt(ctx, '¥10 能抽几发？', -250, -40, { font: F.zh(28, 800), color: C.mid, align: 'left' });
      progressBar(ctx, -250, 0, 400, 30, 0.63 * eOut(prog(t, S.e.bar + 0.2, 1)), C.accent);
      txt(ctx, (0.63 * eOut(prog(t, S.e.bar + 0.2, 1))).toFixed(2) + ' 抽', 250, 15, { font: F.num(36, 900), align: 'right' });
    });
    emoji(ctx, 'coin', RC - 300, 640, 110, slap(t, S.e.bar, out, { rot: -18 }));
    { const st = chart1(t); if (st) { const M = chartMap(st), x = M.X(1), y = M.Y(4), pf = pop(t, S.t0 + 0.4, out);
      if (pf.on) { ctx.save(); ctx.globalAlpha *= pf.a; const r = 70 + 10 * Math.sin(t * 5); ctx.strokeStyle = C.accent; ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); ctx.arc(x, y, r * pf.s, 0, 7); ctx.stroke(); ctx.restore();
        at(ctx, x + 40, y - 150, { s: pf.s, a: pf.a, r: -0.05 }, () => { pill(ctx, '¥10 档位 · ≈0%', 0, 0, { font: F.zh(32, 900), h: 62, fill: C.accent }); });
        arrow(ctx, x + 40, y - 112, x + 8, y - 60, { color: C.accent, lw: 5, head: 18, k: pf.k }); } } }
    stamp(ctx, '凑不齐', RC + 140, 700, prog(t, S.e.st, 0.35) * (1 - prog(t, out, 0.2)), { sub: 'NOT EVEN ONE PULL' });
  },
};
SH.S08 = {
  setup(S) { S.e = { tk: [0, 1, 2, 3].map(i => E(S, 0, 0.1 + i * 0.25)), surge: E(S, 1, -0.1) };
    S.e.tk.forEach((x, i) => sfx('slap', x, { i })); sfx('gliss', S.e.surge + 0.9); sfx('rocket', S.e.surge + 0.2); impact(S.e.surge + 0.9, 0.5); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    const items = [['genshin', '空月祝福', '¥30', 'calendar'], ['genshin', '纪行', '¥68', 'ticket'], ['lads', '月卡', '¥30', 'calendar'], ['lads', '特别密约', '¥68', 'gift']];
    items.forEach(([g, n, p, em], i) => priceTag(ctx, t, S.e.tk[i], out, RC + (i % 2 ? 150 : -150), 290 + Math.floor(i / 2) * 210, `${GAMES[g].zh} · ${n}`, p,
      { g, em, w: 285, h: 170, color: C[g], ts: 22, rot: (i % 2 ? 3 : -3) }));
    const st = chart1(t); if (!st) return; const M = chartMap(st);
    const k = prog(t, S.e.surge + 0.2, 1.0);
    if (k > 0 && k < 1) emoji(ctx, 'rocket', M.X(lerp(1.05, 2.05, eInOut(k))) + 40, M.Y(CURVE.genshin(lerp(1.05, 2.05, eInOut(k)))) - 70, 120, { r: -0.6 });
    bigWord(ctx, t, S.e.surge + 1.0, out, '+35%', M.X(1.6), M.Y(55), { font: F.num(80, 900), color: C.accent, rot: -6 });
    bigWord(ctx, t, S.e.surge + 1.3, out, '第一次猛冲', RC, 760, { size: 58, color: C.ink, sub: 'FIRST BIG JUMP', subSize: 22 });
  },
};
SH.S09 = {
  setup(S) { S.e = { cal: S.t0 + 0.35, chain: E(S, 0, 0.9), tax: E(S, 0, 0.3), warn: E(S, 1, 0.1), dau: E(S, 1, 1.0) };
    sfx('slap', S.e.cal); for (let i = 0; i < 12; i++) sfx('tick', S.e.cal + 0.3 + i * 0.09, { i }); sfx('chain', S.e.chain); impact(S.e.chain, 0.5);
    sfx('stamp', S.e.tax + 1.6); sfx('alarm', S.e.warn); sfx('gliss', S.e.dau + 0.3); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    // calendar sticker
    const p = slap(t, S.e.cal, out, { rot: -4 });
    at(ctx, 1040, 470, { s: p.s, a: p.a, r: p.r }, () => {
      card(ctx, -300, -260, 600, 520, { r: 30, fill: '#fff', lift: p.lift });
      ctx.fillStyle = C.red; rrect(ctx, -300, -260, 600, 100, 30); ctx.fill(); ctx.fillRect(-300, -200, 600, 40);
      txt(ctx, '30天 · 月卡', 0, -210, { font: F.zh(40, 900), color: '#fff' });
      for (let i = 0; i < 30; i++) { const cx = -240 + (i % 6) * 96, cy = -110 + Math.floor(i / 6) * 76; const on = t > S.e.cal + 0.3 + i * 0.04;
        ctx.fillStyle = on ? hexA(C.genshin, 0.18) : 'rgba(31,42,54,0.06)'; rrect(ctx, cx - 40, cy - 30, 80, 60, 12); ctx.fill();
        txt(ctx, String(i + 1), cx - 22, cy - 12, { font: F.num(16, 700), color: C.light });
        if (on) txt(ctx, '✓', cx + 6, cy + 6, { font: F.num(34, 900), color: C.genshin }); }
    });
    emoji(ctx, 'chain', 1330, 300, 200, slap(t, S.e.chain, out, { rot: 20, from: 2.4 }));
    emoji(ctx, 'phone', 1450, 420, 150, slap(t, S.e.chain + 0.15, out, { rot: -12 }));
    emoji(ctx, 'alarm', 740, 260, 150, Object.assign(slap(t, S.e.chain + 0.3, out, { rot: -10 }), t > S.e.warn && t < S.e.warn + 1.2 ? { r: Math.sin(t * 60) * 0.12 } : {}));
    bigWord(ctx, t, S.e.tax + 1.6, out, '时间赎买税', 1040, 830, { size: 76, color: C.accent, sub: 'TIME TAX', rot: -2 });
    // warning popup
    const pw = pop(t, S.e.warn, out, 0.35);
    at(ctx, 1560, 640, { s: pw.s, a: pw.a, r: 0.04 }, () => {
      card(ctx, -230, -80, 460, 160, { r: 20, fill: '#fff', stroke: C.red, sw: 5 });
      txt(ctx, '⚠ 今日未登录', -200, -36, { font: F.zh(32, 900), color: C.red, align: 'left' });
      txt(ctx, '−90 原石  ·  −100 钻石', -200, 22, { font: F.zh(30, 800), color: C.ink, align: 'left' });
    });
    // DAU mini chart
    const pd = slap(t, S.e.dau, out, { rot: 3 });
    at(ctx, 1560, 860 - 40, { s: pd.s, a: pd.a, r: pd.r }, () => {
      card(ctx, -200, -90, 400, 170, { r: 20, fill: '#fff' }); txt(ctx, 'DAU 日活', -175, -60, { font: F.en(24, 800), color: C.mid, align: 'left' });
      const k = eOut(prog(t, S.e.dau + 0.3, 1.2)); ctx.strokeStyle = C.delta; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i <= 30 * k; i++) { const x = -170 + i * 11.3, y = 50 - i * 2.8 - Math.sin(i * 1.3) * 8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      txt(ctx, '↑', 160, -40, { font: F.num(50, 900), color: C.delta });
    });
  },
};
SH.S10 = {
  setup(S) { S.e = { mark: E(S, 0, 0.2), pity: E(S, 1, 0.1), kink: E(S, 2, 1.2), clip: E(S, 2, 0.2) };
    sfx('ceilplate', S.e.mark + 0.2); sfx('fill', S.e.pity + 0.2); sfx('star', S.e.pity + 1.1); sfx('star', S.e.pity + 1.8, { i: 1 });
    sfx('gold5', S.e.kink); impact(S.e.kink, 0.6); sfx('slap', S.e.clip); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart1(t); if (!st) return; const M = chartMap(st);
    // ¥1,000 glowing column
    const k = eOut(prog(t, S.e.mark, 0.7));
    if (k > 0) { ctx.save(); ctx.globalAlpha *= (1 - prog(t, out, 0.3)); const x = M.X(3);
      const gr = ctx.createLinearGradient(x - 60, 0, x + 60, 0); gr.addColorStop(0, hexA(C.accent, 0)); gr.addColorStop(0.5, hexA(C.accent, 0.22)); gr.addColorStop(1, hexA(C.accent, 0));
      ctx.fillStyle = gr; ctx.fillRect(x - 60, st.rect[1] + 10, 120, st.rect[3] * k - 20);
      // translucent pity ceiling plate dropping
      const py = lerp(st.rect[1] - 40, M.Y(80) - 16, eOut5(prog(t, S.e.mark + 0.2, 0.6)));
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.strokeStyle = C.genshin; ctx.lineWidth = 4; rrect(ctx, x - 200, py - 14, 400, 28, 14); ctx.fill(); ctx.stroke();
      ctx.restore();
      bigWord(ctx, t, S.e.mark + 0.5, out, '¥1,000 分水岭', M.X(3) - 30, st.rect[1] + 70, { size: 50, color: C.accent, rot: -2 }); }
    // pity meter in right column
    const p = slap(t, S.e.pity, out, { rot: 2 });
    at(ctx, RC, 300, { s: p.s, a: p.a, r: p.r }, () => {
      card(ctx, -300, -110, 600, 220, { r: 26, fill: '#fff', lift: p.lift });
      txt(ctx, '保底 PITY', -270, -64, { font: F.zh(34, 900), color: C.ink, align: 'left' });
      txt(ctx, '抽数 pulls', 270, -64, { font: F.en(22, 700), color: C.light, align: 'right' });
      const kk = eInOut(prog(t, S.e.pity + 0.2, 1.8));
      progressBar(ctx, -260, -6, 520, 34, kk, C.genshin, { marks: [[0.5, '90'], [1, '180']] });
      if (t > S.e.pity + 1.1) emoji(ctx, 'star', -2, -50, 60, pop(t, S.e.pity + 1.1));
      if (t > S.e.pity + 1.8) emoji(ctx, 'glowstar', 258, -50, 70, pop(t, S.e.pity + 1.8));
    });
    clipWin(ctx, 'gdiluc', t - S.e.clip, RC, 600, 560, Object.assign({ label: '0命新角色 · C0' }, slap(t, S.e.clip, out, { rot: -2 })));
    // kink point
    const pk = pop(t, S.e.kink, out, 0.4);
    if (pk.on) { const x = M.X(3), y = M.Y(80);
      ctx.save(); ctx.globalAlpha *= pk.a; ctx.fillStyle = hexA(C.gold, 0.35); ctx.beginPath(); ctx.arc(x, y, 40 + 14 * Math.sin(t * 6), 0, 7); ctx.fill(); ctx.restore();
      at(ctx, x - 190, y + 90, { s: pk.s, a: pk.a, r: -0.05 }, () => pill(ctx, '80% 核心体验', 0, 0, { font: F.zh(32, 900), h: 62, fill: C.genshin })); }
  },
};
SH.S11 = {
  setup(S) { S.e = { c6: E(S, 0, 0.3), clip: E(S, 1, 0.0), kill: E(S, 1, 0.9), meh: E(S, 1, 1.8) };
    sfx('slap', S.e.c6); sfx('slap', S.e.clip); sfx('kill', S.e.kill); impact(S.e.kill, 1); sfx('deflate', S.e.meh); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart1(t); if (!st) return; const M = chartMap(st);
    const pc = pop(t, S.e.c6 + 1.2, out); at(ctx, M.X(4) - 120, M.Y(88) - 80, { s: pc.s, a: pc.a, r: 0.04 }, () => pill(ctx, '6命 ≈ 600抽 ≈ ¥10,000', 0, 0, { font: F.zh(28, 900), h: 58, fill: C.ink }));
    priceTag(ctx, t, S.e.c6, out, RC, 250, '花费 COST', '×10', { w: 300, h: 150, color: C.red, em: 'flymoney', rot: -3 });
    clipWin(ctx, 'gfight2', t - S.e.clip, RC, 540, 560, Object.assign({ label: '满命 · C6' }, slap(t, S.e.clip, out, { rot: 2 })));
    // boss bar melting
    const pb = pop(t, S.e.clip + 0.2, out);
    at(ctx, RC, 740, { s: pb.s, a: pb.a }, () => {
      txt(ctx, 'BOSS', -270, 0, { font: F.en(26, 900), color: C.ink, align: 'left' });
      progressBar(ctx, -180, -14, 380, 28, 1 - eIn(prog(t, S.e.kill - 0.2, 0.35)), C.red);
      if (t > S.e.kill) txt(ctx, '0:03', 255, 0, { font: F.num(30, 900), color: C.red });
    });
    if (t > S.e.kill && t < S.e.kill + 0.25) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - prog(t, S.e.kill, 0.25)); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    emoji(ctx, 'boom', RC + 210, 470, 160, slap(t, S.e.kill, S.e.kill + 0.9, { rot: 10, from: 2.5 }));
    emoji(ctx, 'melting', RC - 240, 720, 140, slap(t, S.e.meh, out, { rot: -10 }));
    bigWord(ctx, t, S.e.meh + 0.1, out, '边际效用↓', M.X(3.6), M.Y(40), { size: 60, color: C.red, sub: 'DIMINISHING RETURNS', subSize: 22, rot: 3 });
  },
};
const LADS_LEADS = ['沈星回', '黎深', '祁煜', '秦彻', '夏以昼'];
SH.S12 = {
  setup(S) { S.e = { wall: S.t0 + 0.4, five: E(S, 1, 0.1) };
    for (let i = 0; i < 10; i++) sfx('block', S.e.wall + i * 0.07, { i }); for (let i = 0; i < 5; i++) sfx('heart', S.e.five + 0.4 + i * 0.4, { i }); sfx('slap', S.e.five); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    // left: team-building block wall
    const cols = ['#20A4E8', '#7C5CF5', '#F2B705', '#12B07A', '#FF6A1F', '#E5484D', '#2BC4C4'];
    for (let i = 0; i < 56; i++) { const r = Math.floor(i / 8), c = i % 8, t0 = S.e.wall + (r * 8 + c) * 0.025;
      const p = slap(t, t0, out, { rot: (rnd(i) - 0.5) * 10, from: 1.8, wob: 3 }); const x = 175 + c * 92, y = 300 + r * 70;
      at(ctx, x, y, { s: p.s, a: p.a, r: p.r }, () => { card(ctx, -40, -28, 80, 56, { r: 10, ow: 4, fill: cols[Math.floor(rnd(i * 3.3) * 7)], sa: 0.15 });
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-16, -28, 9, 0, 7); ctx.arc(16, -28, 9, 0, 7); ctx.fill(); }); }
    icon(ctx, 'genshin', 140, 225, 110, slap(t, S.e.wall, out, { rot: -8 }));
    bigWord(ctx, t, S.e.wall + 1.6, out, '横向配队积木', 500, 830, { size: 58, color: C.genshin, sub: '~100 CHARACTERS · TEAM BLOCKS', subSize: 22 });
    // right: 5 leads, close & personal
    clipWin(ctx, 'lads2', t - S.e.five, 1390, 400, 560, Object.assign({ label: '第一人称 · 超近距离' }, slap(t, S.e.five, out, { rot: 2 })));
    LADS_LEADS.forEach((n, i) => { const p = slap(t, S.e.five + 0.4 + i * 0.4, out, { rot: (i - 2) * 5 }); const x = 1150 + i * 120, y = 690;
      const beat = t > S.e.five + 0.4 + i * 0.4 ? 1 + 0.08 * Math.max(0, Math.sin((t - S.e.five) * 7.5)) : 1;
      emoji(ctx, 'pinkheart', x, y, 100, { s: p.s * beat, a: p.a, r: p.r, lift: p.lift });
      if (p.on) at(ctx, x, y + 70, { a: p.a }, () => txt(ctx, n, 0, 0, { font: F.zh(24, 900), color: C.lads })); });
    icon(ctx, 'lads', 1110, 225, 110, slap(t, S.e.five, out, { rot: 8 }));
    bigWord(ctx, t, S.e.five + 2.3, out, '排他的恋爱深度', 1390, 830, { size: 58, color: C.lads, sub: 'ONLY 5 LEADS · EXCLUSIVE ROMANCE', subSize: 22 });
    // divider
    const kd = eOut(prog(t, S.t0, 0.5)) * (1 - prog(t, out, 0.3));
    ctx.save(); ctx.globalAlpha *= kd; ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.moveTo(960, 170); ctx.lineTo(960, 860); ctx.stroke(); ctx.restore();
  },
};
SH.S13 = {
  setup(S) { S.e = { tags: [0, 1, 2].map(i => E(S, 0, 0.6 + i * 0.6)), burst: E(S, 1, 0.6), love: E(S, 1, 1.2) };
    S.e.tags.forEach((x, i) => sfx('slap', x, { i })); for (let i = 0; i < 6; i++) sfx('shutter', S.e.tags[2] + 0.1 + i * 0.08, { i });
    sfx('gliss', S.e.burst - 0.6); sfx('burst', S.e.burst); impact(S.e.burst, 0.8); sfx('stamp', S.e.love); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart1(t); if (!st) return; const M = chartMap(st);
    const tags = [[3.05, '150抽 日卡成套', 'cards'], [3.6, '叠阶 · 幻色换装', 'dress'], [4.25, '生贺应援 · 商圈大屏', 'cake']];
    tags.forEach(([u, s, em], i) => { const p = slap(t, S.e.tags[i], out, { rot: (i % 2 ? 3 : -3) }); const x = M.X(u), y = M.Y(CURVE.lads(u));
      at(ctx, x - 40, y - 120 - i * 10, { s: p.s, a: p.a, r: p.r }, () => pill(ctx, s, 0, 0, { font: F.zh(28, 900), h: 58, fill: C.lads }));
      if (em !== 'cards') emoji(ctx, em, x - 40 + (i === 2 ? -220 : 160), y - 125, 90, slap(t, S.e.tags[i] + 0.1, out, { rot: 10 })); });
    // billboard + hearts burst out of the top
    const pb = slap(t, S.e.burst, out, { rot: -4, from: 2 });
    emoji(ctx, 'billboard', M.X(5.0) - 110, M.Y(118), 170, Object.assign({}, pb));
    for (let i = 0; i < 14; i++) { const d = t - S.e.burst; if (d < 0) break; const an = -Math.PI / 2 + (rnd(i) - 0.5) * 2.2, v = 400 + rnd(i * 3) * 500;
      const x = M.X(5.15) + Math.cos(an) * v * d, y = M.Y(110) + Math.sin(an) * v * d + 500 * d * d; if (d > 2) continue;
      emoji(ctx, i % 3 ? 'pinkheart' : 'camera', x, y, 60, { a: 1 - prog(d, 1.4, 0.6), r: d * 3 * (rnd(i) - 0.5) }); }
    stamp(ctx, '爱的证明', 960, 470, prog(t, S.e.love, 0.35) * (1 - prog(t, out, 0.2)), { color: C.lads, sub: 'PROOF OF LOVE', font: F.zh(72, 900), h: 120 });
    const pg = pop(t, S.e.love + 0.3, out); at(ctx, M.X(4.6), M.Y(CURVE.genshin(4.05)) + 70, { s: pg.s, a: pg.a }, () => pill(ctx, '原神：趋平', 0, 0, { font: F.zh(26, 900), h: 50, fill: C.genshin }));
  },
};

// ======================================================================== CH2  无尽冬日 vs 逆水寒
function chart2(t) {
  const sh = TL.shots, a = sh.S15.t0, z = sh.S20.t1;
  if (t < a - 0.2 || t > z + 0.4) return null;
  const rect = kf(t, [[a, FULL], [sh.S16.t0 - 0.2, FULL], [sh.S16.t0 + 0.4, MINI], [sh.S17.t0 - 0.2, MINI], [sh.S17.t0 + 0.4, FULL],
    [sh.S18.t0 - 0.2, FULL], [sh.S18.t0 + 0.4, MINI], [sh.S20.t0 - 0.2, MINI], [sh.S20.t0 + 0.4, FULL]]);
  const view = kf(t, [[a, [U0, 3.4, -8, 118]], [sh.S17.t0, [U0, 3.4, -8, 118]], [sh.S17.t0 + 1.2, [2.3, 5.35, -8, 150]], [sh.S20.t0, [2.3, 5.35, -8, 150]], [sh.S20.t0 + 1.2, [2.8, 5.35, -8, 170]]]);
  const to = kf(t, [[E(sh.S15, 0, 0), U0 + 0.01], [E(sh.S15, 1, 0.8), 3.05], [E(sh.S17, 0, 1.0), 3.05], [E(sh.S17, 0, 2.4), 4.05], [E(sh.S17, 1, 0), 4.05], [E(sh.S17, 1, 1.4), 5.2]], eInOut);
  return { rect, view, a: fade(t, a - 0.2, z, 0.4, 0.4) * miniFade(rect), floor: 1, ceil: 1, ceilBreak: clamp(prog(t, E(sh.S20, 0, 0.3), 0.3)),
    curves: { whiteout: { to, a: 1 }, justice: { to, a: 1 } }, tickSize: rect[2] < 700 ? 18 : 26, yLabels: rect[2] < 700 ? 0 : 1,
    under: (ctx, M) => { const k = fade(t, E(sh.S15, 1, 0.6), sh.S16.t0 + 0.2, 0.5, 0.3); if (k <= 0) return;
      ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = hexA(C.red, 0.12); ctx.fillRect(M.X(1), M.Y(16), M.X(3) - M.X(1), M.Y(0) - M.Y(16));
      ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.strokeRect(M.X(1), M.Y(16), M.X(3) - M.X(1), M.Y(0) - M.Y(16)); ctx.restore(); } };
}
SH.S14 = {
  setup(S) { S.e = { hit: S.t0 + 0.55, s: E(S, 1, 0.3) }; sfx('vs', S.e.hit); sfx('gate', S.e.hit + 0.02); impact(S.e.hit, 1.4); sfx('swish', S.t0 + 0.2); sfx('drumroll', S.e.s + 0.8, { dur: 0.8 }); },
  draw(ctx, t, S) {
    vsOpener(ctx, t, S, 'whiteout', 'justice', 2);
    const k = eInOut(prog(t, S.e.s, 1.4)), out = S.t1 - 0.35;
    if (k > 0) { ctx.save(); ctx.globalAlpha *= 1 - prog(t, out, 0.3); ctx.lineCap = 'round';
      const pts = []; for (let i = 0; i <= 60 * k; i++) { const u = i / 60; pts.push([700 + u * 520, 900 - 110 / (1 + Math.exp(-(u - 0.62) * 14))]); }
      for (const [c, w] of [['#fff', 22], [C.ink, 10]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      ctx.restore(); }
    const p = pop(t, S.e.s + 1.0, out); at(ctx, 1400, 860, { s: p.s, a: p.a, r: -0.05 }, () => pill(ctx, 'S型修罗场 · S-CURVE', 0, 0, { font: F.zh(30, 900), h: 60, fill: C.red }));
  },
};
SH.S15 = {
  setup(S) { S.e = { flat: E(S, 1, 0.2), zone: E(S, 1, 0.6) }; sfx('flatline', S.e.flat); sfx('stamp', S.e.zone + 0.3); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart2(t); if (!st) return; const M = chartMap(st);
    bigWord(ctx, t, S.e.zone + 0.3, out, '无效氪金区', M.X(2), M.Y(40), { size: 74, color: C.red, sub: '¥10 ~ ¥1,000 · DEAD ZONE', rot: -2 });
    emoji(ctx, 'dizzy', M.X(1.5), M.Y(5) - 80, 110, slap(t, S.e.flat + 0.4, out, { rot: -10 }));
    emoji(ctx, 'melting', M.X(2.6), M.Y(5) - 80, 110, slap(t, S.e.flat + 0.7, out, { rot: 10 }));
  },
};
SH.S16 = {
  setup(S) { S.e = { l: E(S, 0, 0.0), rally: E(S, 0, 1.6), r: E(S, 1, 0.0), bar: E(S, 1, 0.4), no: E(S, 1, 2.0), npc: E(S, 2, 0.3), mask: E(S, 2, 0.7) };
    sfx('slap', S.e.l); sfx('drumroll', S.e.rally - 0.1, { dur: 0.6 }); sfx('kill', S.e.rally + 0.5); impact(S.e.rally + 0.5, 1.2); sfx('slap', S.e.r); sfx('fill', S.e.bar);
    sfx('stamp', S.e.no); sfx('stamp', S.e.npc); impact(S.e.npc, 0.6); sfx('stamp', S.e.mask); impact(S.e.mask, 0.6); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    // left: whiteout city flattened
    clipWin(ctx, 'wo1', t - S.e.l, 520, 420, 700, Object.assign({ label: '无尽冬日 · 大地图', gray: t > S.e.rally + 0.5 ? 0.8 : 0 }, slap(t, S.e.l, out, { rot: -2 })));
    const cs = slap(t, S.e.l + 0.3, out, { rot: -6 }), hit = t > S.e.rally + 0.5;
    emoji(ctx, hit ? 'boom' : 'castle', 520, 470, hit ? 230 : 170, hit ? slap(t, S.e.rally + 0.5, out, { rot: 8, from: 2 }) : cs);
    if (!hit && t > S.e.l + 0.5) at(ctx, 520, 590, { a: cs.a }, () => pill(ctx, '充了 ¥1,000 的城', 0, 0, { font: F.zh(26, 900), h: 50, fill: C.whiteout }));
    for (let i = 0; i < 6; i++) { const k = prog(t, S.e.rally + i * 0.06, 0.5); if (k <= 0 || k >= 1) continue; const an = Math.PI * (0.15 + i * 0.12);
      arrow(ctx, 520 + Math.cos(an) * 520, 470 - Math.sin(an) * 420, 520 + Math.cos(an) * 60, 470 - Math.sin(an) * 50, { k: eIn(k), color: C.red, lw: 7 }); }
    // right: Tianshang Stone pity bar
    clipWin(ctx, 'jcity', t - S.e.r, 1400, 380, 700, Object.assign({ label: '逆水寒 · 汴京' }, slap(t, S.e.r, out, { rot: 2 })));
    const pb = slap(t, S.e.bar, out, { rot: -1 });
    at(ctx, 1400, 700, { s: pb.s, a: pb.a, r: pb.r }, () => {
      card(ctx, -330, -70, 660, 140, { r: 22, fill: '#fff' });
      txt(ctx, '天赏石保底 ≈ ¥2,000+', -300, -32, { font: F.zh(28, 900), color: C.justice, align: 'left' });
      const k = 0.5 * eOut(prog(t, S.e.bar + 0.2, 1.2)); progressBar(ctx, -300, 4, 470, 30, k, C.justice);
      txt(ctx, '¥' + fmt(k * 2000), 300, 18, { font: F.num(34, 900), align: 'right' });
    });
    stamp(ctx, '保底不了', 1580, 560, prog(t, S.e.no, 0.35) * (1 - prog(t, out, 0.2)), { sub: 'NOT EVEN ONE' });
    // both stamped
    stamp(ctx, 'NPC', 520, 800, prog(t, S.e.npc, 0.35) * (1 - prog(t, out, 0.2)), { color: C.ink, font: F.num(70, 900), sub: '免费的高智能NPC', rot: -6 });
    stamp(ctx, '气氛组', 1400, 800, prog(t, S.e.mask, 0.35) * (1 - prog(t, out, 0.2)), { color: C.ink, sub: 'FREE EXTRAS', rot: 5 });
    emoji(ctx, 'robot', 760, 790, 110, slap(t, S.e.npc + 0.2, out, { rot: 12 }));
    emoji(ctx, 'masks', 1650, 790, 110, slap(t, S.e.mask + 0.2, out, { rot: -12 }));
  },
};
SH.S17 = {
  setup(S) { S.e = { gate: E(S, 0, 0.4), boom: E(S, 1, 0.5) }; sfx('gate', S.e.gate + 0.3); impact(S.e.gate + 0.3, 0.7); sfx('swell', S.e.boom); sfx('boomhit', S.e.boom + 0.15); impact(S.e.boom + 0.15, 1.6); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart2(t); if (!st) return; const M = chartMap(st);
    const k = eOut5(prog(t, S.e.gate + 0.3, 0.5)), x = M.X(4);
    if (k > 0) { ctx.save(); ctx.globalAlpha *= 1 - prog(t, TL.shots.S20.t1, 0.3); ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.setLineDash([20, 12]);
      ctx.beginPath(); ctx.moveTo(x, st.rect[1] + 20); ctx.lineTo(x, st.rect[1] + 20 + (st.rect[3] - 40) * k); ctx.stroke(); ctx.restore();
      const p = pop(t, S.e.gate + 0.5, TL.shots.S17.t1 - 0.2); at(ctx, x, st.rect[1] + 60, { s: p.s, a: p.a, r: -0.04 }, () => pill(ctx, '服务器前排阈值 · ELITE LINE', 0, 0, { font: F.zh(28, 900), h: 58, fill: C.red })); }
    if (t > S.e.boom) { const d = t - S.e.boom; for (let i = 0; i < 2; i++) { const g = ['whiteout', 'justice'][i];
      emoji(ctx, 'rocket', M.X(4.6 + i * 0.15), M.Y(CURVE[g](4.6 + i * 0.15)) - 40 - d * 30, 110, Object.assign(slap(t, S.e.boom + 0.3 + i * 0.15, out, { rot: -30 }))); } }
    bigWord(ctx, t, S.e.boom + 0.4, out, '垂直起飞', M.X(3.2), M.Y(90), { size: 84, color: C.accent, sub: 'TAKE-OFF', rot: -4 });
    // speed lines on the boom
    if (t > S.e.boom + 0.1 && t < S.e.boom + 0.9) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - prog(t, S.e.boom + 0.1, 0.8)); ctx.fillStyle = '#fff';
      for (let i = 0; i < 24; i++) { const y = rnd(i * 9) * H, l = 300 + rnd(i) * 600; ctx.fillRect(((t * 4000 + rnd(i * 5) * W) % (W + l)) - l, y, l, 5); } ctx.restore(); }
  },
};
SH.S18 = {
  setup(S) { S.e = { train: S.t0 + 0.4, coal: E(S, 1, 0.2), crash: E(S, 1, 2.6) };
    sfx('whistle', S.e.train + 0.3); sfx('chug', S.e.train); for (let i = 0; i < 8; i++) sfx('coal', S.e.coal + 0.3 + i * 0.22, { i });
    sfx('kill', S.e.crash); impact(S.e.crash, 1.5); sfx('stamp', S.e.coal + 0.1); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, d = t - S.e.train;
    clipWin(ctx, 'wo3', t - S.t0, 1530, 300, 520, Object.assign({ label: '联盟集结 · RALLY' }, slap(t, S.t0 + 0.2, out, { rot: 3 })));
    // track
    ctx.save(); ctx.globalAlpha *= fade(t, S.t0, out, 0.3, 0.3); ctx.fillStyle = C.ink2; ctx.fillRect(0, 730, W, 10);
    for (let x = -((t * 400) % 80); x < W; x += 80) ctx.fillRect(x, 742, 40, 14); ctx.restore();
    const tx = lerp(-200, 1160, eOut(prog(t, S.e.train, 1.4))) + (t > S.e.crash - 0.4 ? lerp(0, 220, eIn(prog(t, S.e.crash - 0.4, 0.4))) : 0);
    const bob = Math.sin(t * 22) * 3;
    emoji(ctx, 'train', tx, 640 + bob, 300, { a: fade(t, S.e.train, out, 0.2, 0.3), lift: 0.2, sx: -1 });
    emoji(ctx, 'fire', tx - 90, 600, 120, { a: fade(t, S.e.coal, out, 0.3, 0.3) * (0.85 + 0.15 * Math.sin(t * 20)) });
    if (t > S.e.train + 0.8) at(ctx, tx, 470, { a: fade(t, S.e.train + 0.8, out) }, () => pill(ctx, '车头 · ¥300,000', 0, 0, { font: F.zh(30, 900), h: 60, fill: C.whiteout, icon: (x, y, s) => icon(ctx, 'whiteout', x + 6, y, s * 1.1, { sa: 0 }) }));
    // coal = players, shovelled into the firebox
    for (let i = 0; i < 8; i++) { const t0 = S.e.coal + 0.3 + i * 0.22, k = prog(t, t0 - 0.5, 0.5); if (t < t0 - 0.5) continue;
      const x0 = 120 + i * 50, y0 = 880, x1 = tx - 90, y1 = 610; const x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 200;
      if (k < 1) emoji(ctx, 'coal', x, y, 70, { r: k * 6 }); }
    for (let i = 0; i < 9; i++) { const pp = pop(t, S.e.coal - 0.2 + i * 0.03, out); emoji(ctx, 'coal', 100 + i * 46, 900, 64, { s: pp.s, a: pp.a * (t > S.e.coal + 0.3 + i * 0.22 - 0.5 ? 0 : 1) }); }
    bigWord(ctx, t, S.e.coal + 0.1, out, '平民 = 煤炭', 420, 820, { size: 50, color: C.ink, sub: 'F2P PLAYERS AS COAL', subSize: 20, rot: -3 });
    const hit = t > S.e.crash;
    emoji(ctx, hit ? 'boom' : 'castle', 1700, 650, hit ? 300 : 200, hit ? slap(t, S.e.crash, out, { from: 2.2, rot: 10 }) : slap(t, S.t0 + 0.5, out, { rot: 4 }));
    bigWord(ctx, t, S.e.train + 0.6, out, '丛林暴力', 600, 260, { size: 92, color: C.whiteout, sub: 'JUNGLE POWER', rot: -3 });
  },
};
SH.S19 = {
  setup(S) { S.e = { rule: E(S, 0, 0.3), sky: E(S, 1, 0.1), dragon: E(S, 1, 0.6), env: E(S, 1, 1.2), crowd: E(S, 2, 0.2), morph: E(S, 2, 1.4) };
    sfx('slap', S.e.rule); sfx('slap', S.e.sky); sfx('dragon', S.e.dragon); impact(S.e.dragon + 0.3, 0.8); sfx('envelopes', S.e.env);
    for (let i = 0; i < 10; i++) sfx('shutter', S.e.crowd + 0.2 + i * 0.13, { i }); sfx('swish', S.e.morph); sfx('lock', S.e.morph + 0.4); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    const pr = slap(t, S.e.rule, out, { rot: -3 });
    at(ctx, 420, 240, { s: pr.s, a: pr.a, r: pr.r }, () => { card(ctx, -280, -70, 560, 140, { r: 22, fill: '#fff' });
      txt(ctx, '✅ 官方承诺：不卖数值', -250, -24, { font: F.zh(32, 900), color: C.delta, align: 'left' });
      txt(ctx, 'NO PAY-TO-WIN · 只卖外观', -250, 28, { font: F.en(24, 800), color: C.mid, align: 'left' }); });
    clipWin(ctx, 'jsky', t - S.e.sky, 1180, 450, 860, Object.assign({ label: '逆水寒 · 神赐顶奢 改变天相' }, slap(t, S.e.sky, out, { rot: 1.5 })));
    // dragon + phoenix flying across
    const dk = prog(t, S.e.dragon, 2.4);
    if (dk > 0 && dk < 1) { emoji(ctx, 'dragon', lerp(600, 1900, dk), 330 - Math.sin(dk * Math.PI) * 120, 220, { r: -0.15 + Math.sin(t * 6) * 0.05, lift: 0.5 });
      emoji(ctx, 'phoenix', lerp(450, 1800, dk), 520 - Math.sin(dk * Math.PI) * 140, 170, { r: 0.1, lift: 0.5 }); }
    for (let i = 0; i < 16; i++) { const t0 = S.e.env + rnd(i) * 1.6, d = t - t0; if (d < 0 || d > 2.4 || t > out + 0.2) continue;
      emoji(ctx, 'redenv', 760 + rnd(i * 7) * 900, 140 + d * 320, 64, { r: Math.sin(d * 4 + i) * 0.4, a: 1 - prog(d, 2, 0.4) }); }
    priceTag(ctx, t, E(S, 1, 1.6), out, 420, 470, '神赐顶奢外观', '¥150K–¥1M+', { w: 520, h: 160, color: C.justice, em: 'kimono', rot: -2, bs: 52 });
    // crowd of phones/cameras
    for (let i = 0; i < 10; i++) { const p = slap(t, S.e.crowd + 0.2 + i * 0.13, out, { rot: (rnd(i) - 0.5) * 30 }); const x = 760 + i * 92, y = 820 - (i % 2) * 30;
      emoji(ctx, i % 2 ? 'camera' : 'selfie', x, y, 100, p);
      if (p.on && Math.floor((t - S.e.crowd) * 6 + i) % 5 === 0) { ctx.save(); ctx.globalAlpha = 0.6 * p.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 20, y - 30, 36, 0, 7); ctx.fill(); ctx.restore(); } }
    // fodder -> extras
    const pm = slap(t, S.e.morph, out, { rot: -2 });
    at(ctx, 420, 690, { s: pm.s, a: pm.a, r: pm.r }, () => { card(ctx, -280, -80, 560, 160, { r: 22, fill: '#fff' });
      emoji(ctx, 'skull', -210, 0, 80, {}); txt(ctx, '炮灰', -120, 0, { font: F.zh(38, 900), color: C.mid, align: 'left' });
      arrow(ctx, -20, 0, 50, 0, { lw: 6, head: 18, k: eOut(prog(t, S.e.morph + 0.2, 0.3)) });
      emoji(ctx, 'camera', 110, 0, 80, { a: prog(t, S.e.morph + 0.4, 0.2) }); txt(ctx, '群演', 170, 0, { font: F.zh(38, 900), color: C.justice, align: 'left', alpha: prog(t, S.e.morph + 0.4, 0.2) }); });
    bigWord(ctx, t, S.e.sky + 0.5, out, '审美景观霸权', 1180, 118, { size: 60, color: C.justice, rot: 2, ow: 12 });
  },
};
SH.S20 = {
  setup(S) { S.e = { brk: E(S, 0, 0.3), warn: E(S, 0, 0.8) }; sfx('shatter', S.e.brk); impact(S.e.brk, 1.4); sfx('alarm', S.e.warn); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.2, st = chart2(t); if (!st) return; const M = chartMap(st), cy = M.Y(100);
    // shards flying from the ceiling
    for (let i = 0; i < 18; i++) { const d = t - S.e.brk; if (d < 0 || d > 1.6) break; const x0 = M.X(4.4 + rnd(i) * 0.9), vx = (rnd(i * 3) - 0.5) * 600, vy = -300 - rnd(i * 5) * 500;
      ctx.save(); ctx.globalAlpha = 1 - prog(d, 1, 0.6); ctx.translate(x0 + vx * d, cy + vy * d + 900 * d * d); ctx.rotate(d * 8 * (rnd(i) - 0.5)); ctx.fillStyle = i % 2 ? C.gold : '#fff';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 10); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    const p = slap(t, S.e.warn, out, { rot: -3, from: 2 });
    at(ctx, 1000, 470, { s: p.s, a: p.a, r: p.r }, () => { card(ctx, -360, -110, 720, 220, { r: 26, fill: '#FFF4E5', stroke: C.red, sw: 6 });
      emoji(ctx, 'warning', -270, 0, 120, {}); txt(ctx, '此曲线无上限', 40, -30, { font: F.zh(56, 900), color: C.red });
      txt(ctx, 'NO CEILING — THERE\'S ALWAYS A RICHER WHALE', 40, 40, { font: F.en(22, 800), color: C.ink }); });
    emoji(ctx, 'siren', 1440, 320, 120, Object.assign(slap(t, S.e.warn + 0.2, out, { rot: 10 }), {}));
  },
};

// ======================================================================== CH3  王者荣耀 vs 三角洲
function chart3(t) {
  const sh = TL.shots, a = sh.S21.t0 + 1.0, z = sh.S26.t1;
  if (t < a - 0.2 || t > z + 0.4) return null;
  const rect = kf(t, [[a, FULL], [sh.S22.t0 - 0.2, FULL], [sh.S22.t0 + 0.4, LEFT], [sh.S23.t0 - 0.2, LEFT], [sh.S23.t0 + 0.4, MINI], [sh.S24.t0 - 0.2, MINI], [sh.S24.t0 + 0.4, FULL],
    [sh.S25.t0 - 0.2, FULL], [sh.S25.t0 + 0.4, LEFT], [sh.S26.t0 - 0.2, LEFT], [sh.S26.t0 + 0.4, FULL]]);
  const view = kf(t, [[a, VIEW_ALL], [sh.S22.t0, VIEW_ALL], [sh.S22.t0 + 1, [U0, 2.5, -8, 118]], [sh.S24.t0, [U0, 2.5, -8, 118]], [sh.S24.t0 + 1, [1.4, 5.35, -8, 118]],
    [sh.S25.t0, [1.4, 5.35, -8, 118]], [sh.S25.t0 + 1, [2.4, 4.4, -8, 118]], [sh.S26.t0, [2.4, 4.4, -8, 118]], [sh.S26.t0 + 1, [2.4, 5.35, -8, 118]]]);
  const hTo = kf(t, [[E(sh.S21, 1, 0.8), U0 + 0.01], [E(sh.S22, 0, 0.5), U0 + 0.01], [E(sh.S22, 0, 2.2), 2.0], [E(sh.S24, 1, 0), 2.0], [E(sh.S24, 2, 0.9), 5.05]], k => k);
  const dTo = kf(t, [[E(sh.S21, 1, 0.8), U0 + 0.01], [E(sh.S22, 1, 0.0), U0 + 0.01], [E(sh.S22, 1, 1.5), 2.0], [E(sh.S25, 0, 0.5), 2.0], [E(sh.S25, 1, 1.0), 4.0], [E(sh.S26, 0, 0.0), 4.0], [E(sh.S26, 1, 0.5), 4.6]], eInOut);
  const crash = sh.S26.e ? sh.S26.e.crash : 1e9;
  const st = { rect, view, a: fade(t, a - 0.2, z, 0.4, 0.4) * miniFade(rect), floor: 1, ceil: 1, tickSize: rect[2] < 700 ? 18 : 26, yLabels: rect[2] < 700 ? 0 : 1,
    curves: { hok: { to: hTo, a: t > sh.S25.t0 && t < sh.S26.t1 ? 0.3 : 1 }, delta: { to: dTo, a: t > sh.S23.t0 && t < sh.S25.t0 ? 0.3 : 1 } } };
  // start line at 40%
  st.under = (ctx, M) => { const k = fade(t, E(sh.S21, 1, 0.5), sh.S22.t0 + 1, 0.5, 0.4); if (k <= 0) return; ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = hexA(C.delta, 0.12);
    ctx.fillRect(st.rect[0], M.Y(40), st.rect[2], M.Y(0) - M.Y(40)); ctx.strokeStyle = C.delta; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(st.rect[0], M.Y(40)); ctx.lineTo(st.rect[0] + st.rect[2], M.Y(40)); ctx.stroke(); ctx.restore(); };
  if (t > crash) { // the ECG crash: delta curve replaced by a vertical drop to zero
    const k = eIn(prog(t, crash, 0.25)); st.curves.delta.to = 4.6; st.over = (ctx, M) => { const x = M.X(4.6), y0 = M.Y(CURVE.delta(4.6));
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, lerp(y0, M.Y(0), k)); ctx.stroke();
      ctx.strokeStyle = C.red; ctx.lineWidth = 10; ctx.stroke(); ctx.restore(); };
    st.curves.delta.headA = 1 - k;
  }
  return st;
}
SH.S21 = {
  setup(S) { S.e = { hit: S.t0 + 0.55, base: E(S, 1, 0.5) }; sfx('vs', S.e.hit); sfx('cock', S.e.hit + 0.3); impact(S.e.hit, 1.2); sfx('swish', S.t0 + 0.2); sfx('lock', S.e.base + 0.5); },
  draw(ctx, t, S) {
    if (t < S.L[1]) { vsOpener(ctx, t, Object.assign({}, S, { t1: S.L[1] + 0.35 }), 'hok', 'delta', 3); return; }
    const st = chart3(t); if (!st) return; const M = chartMap(st), out = S.t1 - 0.2;
    const p = slap(t, S.e.base + 0.5, out, { rot: -2 });
    at(ctx, M.X(1.6), M.Y(40) + 70, { s: p.s, a: p.a, r: p.r }, () => pill(ctx, '零氪公平基础线 · 40%', 0, 0, { font: F.zh(32, 900), h: 64, fill: C.delta }));
    emoji(ctx, 'shield', M.X(1.6) - 280, M.Y(40) + 60, 110, slap(t, S.e.base + 0.7, out, { rot: -12 }));
    emoji(ctx, 'swords', M.X(3.7), M.Y(68), 130, slap(t, S.e.base + 0.9, out, { rot: 10 }));
    bigWord(ctx, t, S.e.base + 0.9, out, '不卖攻击力', M.X(3.7), M.Y(68) + 120, { size: 56, color: C.ink, sub: 'NO PAY-TO-WIN', subSize: 22 });
  },
};
SH.S22 = {
  setup(S) { S.e = { clip: E(S, 0, 0.0), p6: E(S, 0, 0.5), p38: E(S, 0, 0.9), box: E(S, 1, 0.1), die: E(S, 1, 1.0), lock: E(S, 1, 1.5) };
    sfx('slap', S.e.clip); sfx('coin', S.e.p6); sfx('coin', S.e.p38, { i: 1 }); sfx('slap', S.e.box); sfx('thud', S.e.die); impact(S.e.die, 0.6); sfx('safelock', S.e.lock); impact(S.e.lock, 0.8); },
  draw(ctx, t, S) {
    const out1 = S.L[1] - 0.1, out = S.t1 - 0.25;
    clipWin(ctx, 'hok2', t - S.e.clip, RC, 380, 600, Object.assign({ label: '王者荣耀 · 皮肤' }, slap(t, S.e.clip, out1, { rot: -2 })));
    priceTag(ctx, t, S.e.p6, out1, RC - 150, 680, '勇者皮肤', '¥6', { w: 280, h: 150, color: C.hok, em: 'dress', rot: -3 });
    priceTag(ctx, t, S.e.p38, out1, RC + 150, 680, '进阶战令', '¥38.8', { w: 280, h: 150, color: C.hok, em: 'ticket', rot: 3 });
    // safe box 2x3
    const p = slap(t, S.e.box, out, { rot: 2 });
    at(ctx, RC, 430, { s: p.s, a: p.a, r: p.r }, () => {
      card(ctx, -270, -200, 540, 400, { r: 28, fill: '#2C3A47', lift: p.lift });
      txt(ctx, '安全箱 SAFE BOX · 2×3', 0, -160, { font: F.zh(30, 900), color: '#fff' });
      const items = [['gem', '海洋之泪'], ['brick', '大金条'], ['package', ''], ['key', ''], ['gem', ''], ['package', '']];
      for (let i = 0; i < 6; i++) { const cx = -160 + (i % 3) * 160, cy = -40 + Math.floor(i / 3) * 150;
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; rrect(ctx, cx - 70, cy - 65, 140, 130, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
        if (i < 2) { emoji(ctx, items[i][0], cx, cy - 8, 90, pop(t, S.e.box + 0.3 + i * 0.15)); txt(ctx, items[i][1], cx, cy + 48, { font: F.zh(20, 800), color: '#FFD86B' }); } }
      const lk = slap(t, S.e.lock, out, { from: 2.5, rot: -8 }); emoji(ctx, 'lock', 210, 150, 130, lk);
    });
    const pd = slap(t, S.e.die, out, { rot: -6 });
    at(ctx, RC - 20, 770, { s: pd.s, a: pd.a, r: pd.r }, () => pill(ctx, '💀 撤离失败，大红还在！', 0, 0, { font: F.zh(30, 900), h: 62, fill: C.delta }));
  },
};
SH.S23 = {
  setup(S) { S.e = { cards: [0, 1, 2, 3, 4].map(i => E(S, 0, 0.2 + i * 0.25)), bars: E(S, 1, 0.1), zero: E(S, 1, 1.6) };
    S.e.cards.forEach((x, i) => sfx('slap', x, { i })); for (let i = 0; i < 5; i++) sfx('marimbaDown', S.e.bars + i * 0.3, { i }); sfx('clunk', S.e.zero); sfx('stamp', S.e.zero + 0.4); impact(S.e.zero + 0.4, 0.6); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    const tiers = [['伴生', C.light, '+50%', 0.5], ['勇者', '#5BB0E8', '+20%', 0.2], ['史诗', '#A06BE8', '+10%', 0.1], ['传说', '#F2A33A', '+3%', 0.03], ['荣耀典藏', '#E5484D', '+0%', 0]];
    tiers.forEach(([n, col, v, k], i) => { const x = 420 + i * 270, p = slap(t, S.e.cards[i], out, { rot: (i - 2) * 3 });
      at(ctx, x, 400, { s: p.s, a: p.a, r: p.r }, () => {
        card(ctx, -115, -170, 230, 340, { r: 22, fill: col, lift: p.lift });
        const im = img(clipFrame(i % 2 ? 'hok3' : 'hok2', 2 + i * 1.3)); if (im) { ctx.save(); rrect(ctx, -100, -155, 200, 250, 16); ctx.clip(); ctx.drawImage(im, -230, -155, 460, 259); ctx.restore(); }
        txt(ctx, n, 0, 130, { font: F.zh(34, 900), color: '#fff' });
      });
      const kb = eOut(prog(t, S.e.bars + i * 0.3, 0.5));
      if (kb > 0) { const bh = 200 * k / 0.5 * kb; ctx.save(); ctx.globalAlpha *= 1 - prog(t, out, 0.25); ctx.fillStyle = '#fff'; rrect(ctx, x - 50, 820 - bh - 6, 100, bh + 12, 12); ctx.fill();
        ctx.fillStyle = C.hok; rrect(ctx, x - 44, 820 - bh, 88, bh, 8); ctx.fill(); txt(ctx, v, x, 820 - bh - 34, { font: F.num(34, 900), color: i === 4 ? C.red : C.ink }); ctx.restore(); }
    });
    stamp(ctx, '单局仅可穿戴1件', 960, 205, prog(t, S.e.zero + 0.4, 0.35) * (1 - prog(t, out, 0.2)), { sub: 'ONE SKIN PER MATCH', color: C.red, rot: -3 });
    txt(ctx, '边际效用', 140, 760, { font: F.zh(26, 900), color: C.mid, alpha: fade(t, S.e.bars, out) });
    emoji(ctx, 'shrug', 1690, 690, 120, slap(t, S.e.zero, out, { rot: 10 }));
  },
};
SH.S24 = {
  setup(S) { const sh = TL.shots; const a = E(S, 1, 0), b = E(S, 2, 0.9);
    S.e = { word: E(S, 0, 0.2), steps: HOK_STEPS.map(s => lerp(a, b, (s[0] - 2.0) / (5.05 - 2.0))), crown: E(S, 2, 1.0) };
    sfx('stamp', S.e.word + 0.3); S.e.steps.forEach((x, i) => sfx('stair', x, { i })); sfx('crown', S.e.crown); impact(S.e.crown, 1.0); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart3(t); if (!st) return; const M = chartMap(st);
    bigWord(ctx, t, S.e.word + 0.3, S.L[1] + 1.5, '社交货币通胀', 900, 330, { size: 86, color: C.hok, sub: 'SOCIAL-CURRENCY INFLATION', rot: -2 });
    HOK_STEPS.forEach(([u, lab, y], i) => { const p = slap(t, S.e.steps[i], out, { rot: (i % 2 ? 3 : -3), from: 1.6 }); if (!p.on) return;
      const x = M.X(u), yy = M.Y(CURVE.hok(u + 0.01));
      at(ctx, x, yy - 52 - (i % 2) * 54, { s: p.s, a: p.a, r: p.r }, () => pill(ctx, lab, 0, 0, { font: F.zh(24, 900), h: 48, padx: 14, fill: i >= 4 ? C.accent : C.ink })); });
    emoji(ctx, 'crown', M.X(5.05) - 30, M.Y(100) - 70, 130, slap(t, S.e.crown, out, { rot: -10, from: 2.4 }));
    if (t > S.e.crown && t < S.e.crown + 0.4) { ctx.save(); ctx.globalAlpha = 0.4 * (1 - prog(t, S.e.crown, 0.4)); ctx.fillStyle = C.gold; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  },
};
const HOK_STEPS = [[1.95, '¥88 史诗'], [2.7, '¥500 无双'], [3.18, '¥1,500 荣耀典藏'], [4.28, '¥18,888 V10'], [4.65, '无双V10'], [5.0, '¥100K+ 荣耀V10']];
SH.S25 = {
  setup(S) { S.e = { knife: E(S, 0, 0.1), coins: E(S, 0, 1.3), kit: E(S, 1, 0.1), go: E(S, 1, 1.4) };
    sfx('blade', S.e.knife + 0.1); for (let i = 0; i < 8; i++) sfx('coinroll', S.e.coins + i * 0.08, { i }); [0, 1, 2].forEach(i => sfx('gear', S.e.kit + 0.2 + i * 0.3, { i })); sfx('slap', S.e.go); },
  draw(ctx, t, S) {
    const out1 = S.L[1] - 0.1, out = S.t1 - 0.25;
    const pk = slap(t, S.e.knife, out1, { rot: -4 });
    at(ctx, RC, 290, { s: pk.s, a: pk.a, r: pk.r }, () => { card(ctx, -290, -110, 580, 220, { r: 26, fill: '#fff', lift: pk.lift });
      emoji(ctx, 'dagger', -180, 0, 170, { r: Math.sin(t * 3) * 0.1 }); txt(ctx, '北极星 刀皮', -60, -40, { font: F.zh(40, 900), align: 'left' });
      txt(ctx, 'T0 · ≈ ¥520+', -60, 30, { font: F.num(40, 900), color: C.delta, align: 'left' }); });
    const pc = slap(t, S.e.coins, out1, { rot: 3 });
    at(ctx, RC, 580, { s: pc.s, a: pc.a, r: pc.r }, () => { card(ctx, -290, -100, 580, 200, { r: 26, fill: '#fff' });
      emoji(ctx, 'yen', -200, 0, 110, {}); arrow(ctx, -120, 0, -30, 0, { lw: 6, head: 18 }); emoji(ctx, 'coin', 40, 0, 110, {});
      const v = 10000 * eOut(prog(t, S.e.coins, 0.9)); txt(ctx, '¥' + fmt(v), 260, -30, { font: F.num(40, 900), align: 'right' });
      txt(ctx, '→ 哈夫币', 260, 30, { font: F.zh(28, 900), color: C.delta, align: 'right' }); });
    // loadout
    clipWin(ctx, 'delta1', t - S.e.kit, RC, 360, 600, Object.assign({ label: '绝密 · 航天基地' }, slap(t, S.e.kit, out, { rot: 2 })));
    [['helmet', '6级头甲'], ['shield', '6级重甲'], ['sparkles', '金弹'], ['target', '满改M7']].forEach(([em, lab], i) => {
      const p = slap(t, S.e.kit + 0.2 + i * 0.3, out, { rot: (i - 1.5) * 6 }); const x = RC - 225 + i * 150, y = 690;
      emoji(ctx, em, x, y, 110, p); if (p.on) at(ctx, x, y + 75, { a: p.a }, () => txt(ctx, lab, 0, 0, { font: F.zh(24, 900), color: C.ink })); });
  },
};
SH.S26 = {
  setup(S) { S.e = { ecg: E(S, 0, 0.2), bush: E(S, 0, 1.4), crash: E(S, 1, 0.4) };
    for (let i = 0; i < 4; i++) sfx('heart', S.e.ecg + i * 0.6, { i: 7 }); sfx('smg', S.e.crash - 0.5); sfx('crash', S.e.crash); impact(S.e.crash, 1.8); sfx('deflate', S.e.crash + 0.5); sfx('flatline', S.e.crash + 0.5); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart3(t); if (!st) return; const M = chartMap(st);
    const pe = pop(t, S.e.ecg, S.e.crash); at(ctx, M.X(3.4), st.rect[1] + 70, { s: pe.s, a: pe.a }, () => pill(ctx, '♥ 心电图模式 · ECG MODE', 0, 0, { font: F.zh(30, 900), h: 60, fill: C.delta }));
    emoji(ctx, 'tree', M.X(4.35), M.Y(10) - 40, 150, slap(t, S.e.bush, out, { rot: -6 }));
    const pb = pop(t, S.e.bush + 0.3, out); at(ctx, M.X(4.35), M.Y(10) + 50, { s: pb.s, a: pb.a }, () => pill(ctx, '草丛老六', 0, 0, { font: F.zh(26, 900), h: 50, fill: C.ink }));
    emoji(ctx, 'target', M.X(4.35) + 90, M.Y(10) - 90, 70, pop(t, S.e.crash - 0.5, out));
    if (t > S.e.crash) {
      const k = prog(t, S.e.crash, 0.2); ctx.save(); ctx.globalAlpha = 0.45 * (1 - prog(t, S.e.crash + 0.1, 0.5)); ctx.fillStyle = C.red; ctx.fillRect(0, 0, W, H); ctx.restore();
      const pg = slap(t, S.e.crash + 0.2, out, { from: 1.8, rot: -2 });
      at(ctx, 960, 470, { s: pg.s, a: pg.a, r: pg.r }, () => { card(ctx, -420, -100, 840, 200, { r: 20, fill: '#3A3F45' });
        txt(ctx, '撤离失败 · 装备全损', 0, -26, { font: F.zh(62, 900), color: '#fff' }); txt(ctx, 'MISSING IN ACTION — ALL GEAR LOST', 0, 50, { font: F.en(26, 800), color: '#FF8A8A', ls: 2 }); });
      emoji(ctx, 'skull', 560, 360, 140, slap(t, S.e.crash + 0.35, out, { rot: -14 }));
      emoji(ctx, 'chartdown', 1370, 360, 130, slap(t, S.e.crash + 0.5, out, { rot: 12 }));
    }
  },
};

// ======================================================================== CH4  黑神话 vs 斗地主
function chart4(t) {
  const sh = TL.shots, a = sh.S28.t0, z = sh.S32.t1;
  if (t < a - 0.2 || t > z + 0.4) return null;
  const rect = kf(t, [[a, LEFT], [sh.S29.t0 - 0.2, LEFT], [sh.S29.t0 + 0.4, FULL], [sh.S31.t0 - 0.2, FULL], [sh.S31.t0 + 0.4, LEFT], [sh.S32.t0 - 0.2, LEFT], [sh.S32.t0 + 0.4, FULL]]);
  const view = kf(t, [[a, [U0, 2.3, -8, 118]], [sh.S29.t0, [U0, 2.3, -8, 118]], [sh.S29.t0 + 1, [U0, 4.2, -8, 125]], [sh.S30.t0, [U0, 4.2, -8, 125]], [sh.S30.t0 + 1.2, [1.6, 4.6, -8, 125]],
    [sh.S31.t0, [1.6, 4.6, -8, 125]], [sh.S31.t0 + 1, [1.6, 4.6, -8, 125]], [sh.S32.t0, [1.6, 4.6, -8, 125]], [sh.S32.t0 + 1, [1.6, 5.35, -8, 125]]]);
  const hero = sh.S29.e.hero;
  const wTo = kf(t, [[E(sh.S28, 0, 0.1), U0 + 0.01], [E(sh.S28, 0, 1.5), 2.2], [E(sh.S29, 0, 0.0), 2.2], [hero - 0.05, U268 - 0.001], [hero + 0.18, U268 + 0.02], [E(sh.S30, 0, 0.2), U268 + 0.02], [E(sh.S30, 0, 1.6), 4.05]],
    (k) => k);
  const lTo = kf(t, [[E(sh.S28, 1, 0.1), U0 + 0.01], [E(sh.S28, 1, 1.2), 1.5], [E(sh.S31, 0, 0.3), 1.5], [E(sh.S31, 1, 1.5), 4.2], [E(sh.S32, 0, 0.0), 4.2], [E(sh.S32, 0, 1.0), 5.0]], eInOut);
  const crash = sh.S32.e.crash;
  const st = { rect, view, a: fade(t, a - 0.2, z, 0.4, 0.4), floor: 1, ceil: 1, ceilBreak: 0, tickSize: rect[2] < 700 ? 18 : 26,
    curves: { wukong: { to: wTo, a: t > sh.S31.t0 ? 0.35 : 1, w: 10, head: t < hero }, landlord: { to: lTo, a: t > sh.S29.t0 && t < sh.S31.t0 ? 0.3 : 1, band: t > sh.S31.t0 ? fade(t, sh.S31.t0, 1e9) : 0 } } };
  // the golden staff
  st.over = (ctx, M) => {
    if (t >= hero - 0.05) { const k = eOut5(prog(t, hero - 0.05, 0.25)), x = M.X(U268), y0 = M.Y(0), y1 = lerp(y0, M.Y(100) - 140, k);
      ctx.save(); ctx.globalAlpha *= t > sh.S31.t0 ? 0.5 : 1;
      ctx.shadowColor = hexA(C.gold, 0.9); ctx.shadowBlur = 40 * (1 + 0.3 * Math.sin(t * 8));
      ctx.fillStyle = '#fff'; rrect(ctx, x - 22, y1 - 6, 44, y0 - y1 + 12, 20); ctx.fill(); ctx.shadowColor = 'transparent';
      const g = ctx.createLinearGradient(x - 16, 0, x + 16, 0); g.addColorStop(0, '#B8860B'); g.addColorStop(0.45, '#FFE27A'); g.addColorStop(1, '#C8960C');
      ctx.fillStyle = g; rrect(ctx, x - 16, y1, 32, y0 - y1, 14); ctx.fill();
      ctx.fillStyle = '#C0392B'; ctx.fillRect(x - 16, y1, 32, 40); ctx.fillRect(x - 16, y0 - 40, 32, 40); ctx.restore(); }
  };
  if (t > crash) { const k = eIn(prog(t, crash, 0.3)); st.curves.landlord.to = 5.0; st.curves.landlord.headA = 1 - k;
    const prev = st.over; st.over = (ctx, M) => { prev(ctx, M); const x = M.X(5.0), y0 = M.Y(CURVE.landlord(5.0));
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, lerp(y0, M.Y(-6), k)); ctx.stroke(); ctx.strokeStyle = C.red; ctx.lineWidth = 10; ctx.stroke(); ctx.restore(); }; }
  return st;
}
SH.S27 = {
  setup(S) { S.e = { hit: S.t0 + 0.55 }; sfx('vs', S.e.hit); sfx('templebell', S.e.hit + 0.05); sfx('tamb', S.e.hit + 0.6); impact(S.e.hit, 1.2); sfx('swish', S.t0 + 0.2); },
  draw(ctx, t, S) {
    vsOpener(ctx, t, S, 'wukong', 'landlord', 4, { c1: '#2B2B2B' });
    const out = S.t1 - 0.35;
    emoji(ctx, 'temple', 300, 880, 150, slap(t, E(S, 0, 0.6), out, { rot: -6 })); emoji(ctx, 'bell', 450, 860, 110, slap(t, E(S, 0, 0.8), out, { rot: 8 }));
    emoji(ctx, 'joker', 1500, 870, 130, slap(t, E(S, 1, 0.1), out, { rot: 8 })); emoji(ctx, 'slot', 1650, 860, 120, slap(t, E(S, 1, 0.3), out, { rot: -8 }));
    const p = pop(t, E(S, 0, 1.2), out); at(ctx, 960, 880, { s: p.s, a: p.a }, () => pill(ctx, '买断制 vs 筹码制', 0, 0, { font: F.zh(32, 900), h: 62, fill: C.ink }));
  },
};
SH.S28 = {
  setup(S) { S.e = { store: E(S, 0, 0.05), err: E(S, 0, 1.0), gift: E(S, 1, 0.05) };
    sfx('slap', S.e.store); sfx('error', S.e.err); impact(S.e.err, 0.4); sfx('slap', S.e.gift); sfx('happy', S.e.gift + 0.4); for (let i = 0; i < 4; i++) sfx('card', S.e.gift + 0.8 + i * 0.1, { i }); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    const ps = slap(t, S.e.store, out, { rot: -2 });
    at(ctx, RC, 300, { s: ps.s, a: ps.a, r: ps.r }, () => { card(ctx, -300, -130, 600, 260, { r: 24, fill: '#1B2838', lift: ps.lift });
      icon(ctx, 'wukong', -200, -10, 150, { sa: 0.1 }); txt(ctx, 'Black Myth: Wukong', -100, -70, { font: F.en(28, 800), color: '#fff', align: 'left' });
      txt(ctx, '标准版 ¥268', -100, -15, { font: F.zh(34, 900), color: '#A4D007', align: 'left' }); txt(ctx, '豪华版 ¥328', -100, 35, { font: F.zh(26, 800), color: '#8F98A0', align: 'left' });
      emoji(ctx, 'cart', 230, 80, 80, {}); });
    const pe = pop(t, S.e.err, out); at(ctx, RC + 60, 420, { s: pe.s, a: pe.a, r: 0.05 }, () => pill(ctx, '✕ 余额不足 · 钱包 ¥10', 0, 0, { font: F.zh(30, 900), h: 62, fill: C.red }));
    clipWin(ctx, 'll1', t - S.e.gift, RC - 80, 640, 470, Object.assign({ label: '欢乐斗地主' }, slap(t, S.e.gift, out, { rot: 2 })));
    priceTag(ctx, t, S.e.gift + 0.3, out, RC + 210, 720, '首充礼包', '¥6', { w: 240, h: 150, color: C.landlord, em: 'gift', rot: -4 });
  },
};
SH.S29 = {
  setup(S) { S.e = { mark: E(S, 0, 0.1), hero: E(S, 1, 0.15), wins: [0, 1, 2].map(i => E(S, 1, 0.7 + i * 0.25)), x: [0, 1, 2].map(i => E(S, 2, 0.2 + i * 0.4)) };
    sfx('drumroll', S.e.mark + 0.2, { dur: S.e.hero - S.e.mark - 0.2 }); sfx('hero', S.e.hero); impact(S.e.hero, 2.2); sfx('shatter', S.e.hero + 0.12); S.e.wins.forEach((x, i) => sfx('slap', x, { i }));
    S.e.x.forEach((x, i) => sfx('xhit', x, { i })); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart4(t); if (!st) return; const M = chartMap(st), x = M.X(U268);
    const pm = pop(t, S.e.mark, out); at(ctx, x, M.Y(0) + 60, { s: pm.s * (1 + 0.06 * Math.sin(t * 10)), a: pm.a }, () => pill(ctx, '¥268', 0, 0, { font: F.num(34, 900), h: 60, fill: C.accent }));
    if (t > S.e.mark && t < S.e.hero) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 16); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.moveTo(x, M.Y(0)); ctx.lineTo(x, M.Y(100)); ctx.stroke(); ctx.restore(); }
    if (t > S.e.hero) {
      const d = t - S.e.hero;
      if (d < 0.35) { ctx.save(); ctx.globalAlpha = 0.6 * (1 - d / 0.35); ctx.fillStyle = '#FFF3C4'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      // radial gold burst + shards at the ceiling
      const cy = M.Y(100);
      ctx.save(); ctx.globalAlpha *= (1 - prog(d, 0.6, 1.2)); ctx.translate(x, cy); ctx.fillStyle = hexA(C.gold, 0.35);
      for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -500 * eOut(clamp(d * 3))); ctx.lineTo(30, -500 * eOut(clamp(d * 3))); ctx.fill(); } ctx.restore();
      for (let i = 0; i < 20; i++) { if (d > 1.6) break; const vx = (rnd(i * 3) - 0.5) * 900, vy = -400 - rnd(i * 5) * 600;
        ctx.save(); ctx.globalAlpha = 1 - prog(d, 1, 0.6); ctx.translate(x + vx * d, cy + vy * d + 1000 * d * d); ctx.rotate(d * 9 * (rnd(i) - 0.5)); ctx.fillStyle = i % 2 ? C.gold : '#fff';
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16, 12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      emoji(ctx, 'monkey', x + 110, M.Y(100) - 40, 140, slap(t, S.e.hero + 0.2, out, { rot: -10, from: 2.4 }));
      bigWord(ctx, t, S.e.hero + 0.1, out, '100% 一步到位', 1420, 300, { size: 74, color: C.goldD, sub: '¥268 · FULLY MAXED', rot: -3 });
      [['wk4', 1150, -4], ['wk1', 1420, 3], ['wk3', 1690, -2]].forEach(([n, wx, r], i) =>
        clipWin(ctx, n, t - S.e.wins[i], wx, 520, 250, Object.assign({ off: n === 'wk4' ? 2.5 : 0 }, slap(t, S.e.wins[i], E(S, 2, -0.1), { rot: r }))));
      ['月卡', '保底', '排位焦虑'].forEach((s, i) => { const p = slap(t, S.e.x[i], out, { rot: (i - 1) * 4 }); if (!p.on) return;
        at(ctx, 1150 + i * 270, 560, { s: p.s, a: p.a, r: p.r }, () => { const w = pill(ctx, s, 0, 0, { font: F.zh(38, 900), h: 74, padx: 28, fill: C.light });
          const k = eOut(prog(t, S.e.x[i] + 0.15, 0.25)); ctx.strokeStyle = C.red; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-w / 2 + 14, 2); ctx.lineTo(-w / 2 + 14 + (w - 28) * k, 2); ctx.stroke();
          if (k > 0.5) { ctx.fillStyle = C.red; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2 - 6, -34, 22, 0, 7); ctx.fill(); ctx.stroke(); txt(ctx, '✕', w / 2 - 6, -33, { font: F.num(26, 900), color: '#fff' }); } }); });
    }
  },
};
SH.S30 = {
  setup(S) { S.e = { covers: E(S, 0, 1.4) }; for (let i = 0; i < 12; i++) sfx('plus1', S.e.covers + i * 0.12, { i }); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart4(t); if (!st) return; const M = chartMap(st);
    const cols = ['#C0392B', '#2C3E50', '#8E44AD', '#16A085', '#D35400', '#2980B9', '#7F8C8D', '#27AE60', '#E67E22', '#34495E', '#9B59B6', '#1ABC9C'];
    const names = ['开放世界', 'ARPG', '魂系', 'CRPG', '射击', '赛车', '恐怖', '动作', '冒险', '解谜', '策略', '模拟'];
    for (let i = 0; i < 12; i++) { const p = slap(t, S.e.covers + i * 0.12, out, { rot: (rnd(i) - 0.5) * 14, from: 1.8 }); const x = M.X(4.0) - 330 + (i % 6) * 110, y = 300 + Math.floor(i / 6) * 160;
      at(ctx, x, y, { s: p.s, a: p.a, r: p.r }, () => { card(ctx, -46, -64, 92, 128, { r: 10, ow: 5, fill: cols[i], sa: 0.2 }); txt(ctx, '3A', 0, -18, { font: F.num(30, 900), color: '#fff' });
        txt(ctx, names[i], 0, 30, { font: F.zh(18, 800), color: 'rgba(255,255,255,0.85)' }); }); }
    const pc = pop(t, S.e.covers + 1.5, out);
    at(ctx, M.X(4.0) - 60, 640, { s: pc.s, a: pc.a, r: -0.03 }, () => pill(ctx, '¥10,000 ≈ 35~40 部 3A 大作', 0, 0, { font: F.zh(34, 900), h: 66, fill: C.wukong }));
    emoji(ctx, 'game', M.X(4.0) + 330, 230, 120, slap(t, S.e.covers + 1.4, out, { rot: 12 }));
  },
};
const MULTS = [['抢地主', 2], ['明牌', 2], ['超级加倍', 4], ['炸弹', 2], ['王炸', 2], ['春天', 2]];
SH.S31 = {
  setup(S) { S.e = { chips: E(S, 0, 0.6), m: MULTS.map((_, i) => E(S, 1, 0.1 + i * 0.42)) };
    sfx('beans', S.e.chips); sfx('stamp', S.e.chips + 1.4); S.e.m.forEach((x, i) => { sfx('mult', x, { i }); impact(x, 0.25 + i * 0.12); }); sfx('crash', S.e.m[5] + 0.15); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25;
    const pb = slap(t, S.e.chips, S.L[1] - 0.1, { rot: -2 });
    at(ctx, RC, 380, { s: pb.s, a: pb.a, r: pb.r }, () => { card(ctx, -300, -150, 600, 300, { r: 26, fill: '#fff' });
      for (let i = 0; i < 9; i++) emoji(ctx, 'bean', -200 + (i % 3) * 60 + Math.floor(i / 3) * 20, 40 - Math.floor(i / 3) * 40, 70, { r: rnd(i) * 2 });
      txt(ctx, '亿万欢乐豆', 120, -60, { font: F.zh(36, 900), color: C.landlord }); txt(ctx, '= 筹码', 120, 0, { font: F.zh(52, 900), color: C.ink });
      txt(ctx, 'BEANS = CHIPS', 120, 60, { font: F.en(24, 800), color: C.mid, ls: 2 }); });
    stamp(ctx, '不是商品', RC + 160, 560, prog(t, S.e.chips + 1.4, 0.35) * (1 - prog(t, S.L[1] - 0.1, 0.2)), { sub: 'NOT A PRODUCT' });
    let total = 1; MULTS.forEach(([n, m], i) => { if (t > S.e.m[i]) total *= m;
      const p = slap(t, S.e.m[i], out, { rot: (rnd(i) - 0.5) * 16, from: 2.2 }); const x = RC - 200 + (i % 3) * 200, y = 330 + Math.floor(i / 3) * 140;
      at(ctx, x, y, { s: p.s, a: p.a, r: p.r }, () => pill(ctx, `${n} ×${m}`, 0, 0, { font: F.zh(30, 900), h: 64, padx: 18, fill: i === 2 ? C.red : C.landlord })); });
    if (t > S.e.m[0]) { const k = prog(t, S.e.m[MULTS.length - 1], 0.3);
      at(ctx, RC, 690, { s: 1 + 0.15 * Math.exp(-(t - S.e.m.filter(x => x <= t).pop()) * 8), a: 1 - prog(t, out, 0.2) }, () => {
        stext(ctx, '×' + total, 0, 0, { font: F.num(140, 900), color: C.red, ow: 16 }); txt(ctx, '倍数一路翻', 0, 100, { font: F.zh(30, 900), color: C.mid }); }); }
  },
};
SH.S32 = {
  setup(S) { S.e = { up: E(S, 0, 0.1), crash: E(S, 0, 1.2), popup: E(S, 1, 0.3) };
    sfx('crash', S.e.crash); impact(S.e.crash, 1.8); sfx('drain', S.e.crash + 0.1); sfx('popup', S.e.popup); impact(S.e.popup, 0.4); },
  draw(ctx, t, S) {
    const out = S.t1 - 0.25, st = chart4(t); if (!st) return; const M = chartMap(st);
    // bean counter rolling to zero
    const v = t < S.e.crash ? 100000000 * eOut(prog(t, S.e.up, 1.0)) : 100000000 * (1 - eInOut(prog(t, S.e.crash + 0.1, 2.2)));
    const pc = pop(t, S.e.up, out);
    at(ctx, 1240, 250, { s: pc.s, a: pc.a }, () => { card(ctx, -340, -70, 680, 140, { r: 22, fill: '#fff' }); emoji(ctx, 'bean', -270, 0, 90, {});
      txt(ctx, fmt(v), 300, 0, { font: F.num(64, 900), color: v < 1e6 && t > S.e.crash ? C.red : C.ink, align: 'right' }); });
    if (t > S.e.crash) { const k = prog(t, S.e.crash, 0.6); ctx.save(); ctx.globalAlpha = 0.35 * (1 - k); ctx.fillStyle = C.red; ctx.fillRect(0, 0, W, H); ctx.restore();
      emoji(ctx, 'zap', M.X(5.0) + 60, M.Y(40), 150, slap(t, S.e.crash, S.e.popup, { rot: 12, from: 2.4 }));
      emoji(ctx, 'sob', M.X(4.4), M.Y(20), 120, slap(t, S.e.crash + 0.5, out, { rot: -12 })); }
    // pink rescue popup
    const pp = slap(t, S.e.popup, out, { from: 0.4, rot: 0, wob: 2 });
    if (pp.on) { ctx.save(); ctx.globalAlpha = 0.45 * pp.a; ctx.fillStyle = '#1F2A36'; ctx.fillRect(0, 0, W, H); ctx.restore();
      at(ctx, 960, 470, { s: pp.s, a: pp.a }, () => {
        card(ctx, -420, -230, 840, 460, { r: 36, fill: '#FFE4EE', ow: 12 });
        txt(ctx, '豆子输光啦！', 0, -150, { font: F.zh(60, 900), color: C.lads });
        emoji(ctx, 'gift', -250, 10, 170, { r: Math.sin(t * 8) * 0.08 });
        txt(ctx, '特惠', 40, -50, { font: F.zh(34, 900), color: C.mid }); stext(ctx, '¥6', 40, 30, { font: F.num(110, 900), color: C.red, ow: 10 });
        txt(ctx, '破产回血救济金', 250, 0, { font: F.zh(30, 900), color: C.ink });
        const bp = 1 + 0.05 * Math.sin(t * 9); at(ctx, 0, 160, { s: bp }, () => pill(ctx, '立即再战 PLAY AGAIN', 0, 0, { font: F.zh(36, 900), h: 76, padx: 40, fill: C.accent }));
      }); }
  },
};

// ======================================================================== CH5  终局总图
const ALLG = Object.keys(GAMES);
function chart5(t) {
  const sh = TL.shots, a = sh.S33.t0, z = TL.duration;
  if (t < a - 0.2) return null;
  const k = eInOut(prog(t, a, 1.2)), sc = lerp(1.18, 1, k);
  const rect = [960 - FULL[2] * sc / 2, 140 + (1 - k) * -40, FULL[2] * sc, FULL[3] * sc];
  const hl = sh.S34.e ? sh.S34.e.hl : [];
  const grp = [['wukong'], ['genshin', 'lads'], ['hok', 'delta', 'landlord'], ['whiteout', 'justice']];
  let active = null; for (let i = 0; i < hl.length; i++) if (t >= hl[i] && t < (hl[i + 1] ?? sh.S34.t1 - 0.3)) active = grp[i];
  const curves = {};
  ALLG.forEach((g, i) => { const t0 = E(sh.S33, 0, 0.3) + i * 0.15; const to = lerp(U0 + 0.01, g === 'wukong' ? 5.2 : g === 'delta' || g === 'landlord' ? 5.2 : 5.2, eInOut(prog(t, t0, 1.6)));
    curves[g] = { to, a: active ? (active.includes(g) ? 1 : 0.15) : 1, w: active && active.includes(g) ? 12 : (g === 'delta' || g === 'landlord' || g === 'wukong') ? 6 : 8, headSize: 52, amp: (g === 'delta' || g === 'landlord') ? 0.28 : 1, band: (g === 'delta' || g === 'landlord') ? 0.6 : 0 }; });
  return { rect, view: [U0, 5.35, -8, 145], a: fade(t, a - 0.2, 1e9, 0.4), floor: 1, ceil: 1, curves };
}
SH.S33 = {
  setup(S) { S.e = { draw: E(S, 0, 0.3) }; sfx('swish', S.t0 + 0.2); for (let i = 0; i < 8; i++) sfx('pluck', S.e.draw + i * 0.15, { i }); sfx('gliss', S.e.draw + 1.2); },
  draw(ctx, t, S) {},
};
SH.S34 = {
  setup(S) { S.e = { hl: [0, 1, 2, 3].map(i => E(S, i, 0.1)) }; S.e.hl.forEach((x, i) => sfx('lock', x, { i })); },
  draw(ctx, t, S) {
    const st = chart5(t); if (!st) return; const M = chartMap(st), out = S.t1 - 0.25, h = S.e.hl;
    const tags = [
      [0, M.X(U268) + 30, M.Y(112), '① 买断制 · 纯粹内容锚点', C.wukong],
      [1, M.X(2.9), M.Y(95), '② 二游 · ¥30买时间，¥1,000拐点', C.lads],
      [2, M.X(3.6), M.Y(35), '③ 竞技与棋牌 · 排面通胀 vs 筹码方差', C.landlord],
      [3, M.X(4.2), M.Y(128), '④ S型无底洞 · 千元群演，十万特权', C.whiteout]];
    tags.forEach(([i, x, y, s, col]) => { const p = slap(t, h[i] + 0.1, (h[i + 1] ?? out) - 0.1, { rot: (i % 2 ? 2 : -2) }); at(ctx, Math.min(x, 1500), y, { s: p.s, a: p.a, r: p.r }, () => pill(ctx, s, 0, 0, { font: F.zh(30, 900), h: 62, fill: col })); });
  },
};
SH.S35 = {
  setup(S) { S.e = { p: [E(S, 0, 0.1), E(S, 1, 0.1), E(S, 1, 0.9), E(S, 2, 0.3)] }; S.e.p.forEach((x, i) => sfx('piano', x, { i })); impact(S.e.p[3], 0.8); },
  draw(ctx, t, S) {
    const st = chart5(t); if (!st) return; const M = chartMap(st), out = TL.duration;
    ctx.save(); ctx.globalAlpha = 0.25 * fade(t, S.t0, 1e9, 0.6); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.restore();
    const plaques = [[M.X(1.5), '买时间', 'TIME', '¥10~¥100'], [M.X(U268), '买内容', 'CONTENT', '¥268'], [M.X(3.5), '买陪伴', 'COMPANIONSHIP', '¥1K~¥10K'], [M.X(4.95), '买权力', 'POWER', '¥100K+']];
    plaques.forEach(([x, zh, en, rng], i) => { const p = slap(t, S.e.p[i], out, { rot: (i % 2 ? 3 : -3), from: 2 });
      at(ctx, Math.max(200, Math.min(x, 1720)), 300 + (i % 2) * 120, { s: p.s, a: p.a, r: p.r }, () => {
        card(ctx, -150, -85, 300, 170, { r: 24, fill: i === 3 ? C.ink : C.gold, lift: p.lift });
        txt(ctx, rng, 0, -52, { font: F.num(22, 800), color: i === 3 ? C.gold : C.ink, alpha: 0.8 });
        txt(ctx, zh, 0, 4, { font: F.zh(56, 900), color: i === 3 ? '#fff' : C.ink });
        txt(ctx, en, 0, 56, { font: F.en(20, 800), color: i === 3 ? C.gold : C.ink2, ls: 3 }); }); });
  },
};
SH.S36 = {
  setup(S) { S.e = { pins: [0, 1, 2].map(i => E(S, 0, 0.3 + i * 0.35)), end: E(S, 1, 2.2) }; S.e.pins.forEach((x, i) => sfx('ping', x, { i })); sfx('endhit', S.e.end); impact(S.e.end, 0.6); },
  draw(ctx, t, S) {
    const st = chart5(t); if (!st) return; const M = chartMap(st);
    const pins = [[Math.log10(30), 22], [U268, 100], [3, 80]];
    pins.forEach(([u, y], i) => { const p = slap(t, S.e.pins[i], S.e.end - 0.2, { from: 2.5, rot: 0 }); const bob = Math.sin(t * 4 + i) * 6;
      emoji(ctx, 'pin', M.X(u), M.Y(y) - 50 + bob, 100, p);
      if (p.on) { ctx.save(); ctx.globalAlpha = p.a * 0.5 * (1 - ((t * 1.2 + i * 0.3) % 1)); ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(M.X(u), M.Y(y), 30 + 60 * ((t * 1.2 + i * 0.3) % 1), 10 + 20 * ((t * 1.2 + i * 0.3) % 1), 0, 0, 7); ctx.stroke(); ctx.restore(); } });
    bigWord(ctx, t, E(S, 0, 1.4), S.e.end - 0.2, '你在哪？', 1500, 300, { size: 90, color: C.accent, sub: 'WHERE ARE YOU?', rot: -4 });
    // end card
    const k = prog(t, S.e.end - 0.3, 0.5);
    if (k > 0) { ctx.save(); ctx.globalAlpha = eOut(k); ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) ctx.fillRect(x - 1.5, y - 1.5, 3, 3); ctx.restore();
      const p = slap(t, S.e.end, 1e9, { from: 2, rot: -3 });
      at(ctx, 960, 430, { s: p.s, a: p.a, r: p.r }, () => { stext(ctx, '10块到10万', 0, 0, { font: F.zh(150, 900), color: C.accent, ow: 18, outline: '#F7F9FB' }); });
      const p2 = pop(t, S.e.end + 0.4, 1e9); at(ctx, 960, 600, { s: p2.s, a: p2.a }, () => { txt(ctx, '八大游戏 · 对数氪金曲线', 0, 0, { font: F.zh(44, 800), color: '#fff' });
        txt(ctx, 'THE LOG CURVE OF GAME SPENDING · 8 GAMES', 0, 60, { font: F.en(24, 700), color: '#9AA8B6', ls: 4 }); });
      const ic = ALLG; ic.forEach((g, i) => icon(ctx, g, 960 - 3.5 * 110 + i * 110, 790, 86, pop(t, S.e.end + 0.6 + i * 0.06, 1e9)));
    }
  },
};

// ======================================================================== frame
function chartAt(t) { return chart0(t) || chart1(t) || chart2(t) || chart3(t) || chart4(t) || chart5(t); }
function setupAll(tl, cliplen) {
  TL = tl; SFX.length = 0; IMPACTS.length = 0; MISSING.length = 0; Object.assign(CLIPLEN, cliplen || {});
  for (const id of TL.order) { const S = TL.shots[id]; if (SH[id] && SH[id].setup) SH[id].setup(S); }
  SFX.sort((a, b) => a.t - b.t);
  return { sfx: SFX.slice(), missing: MISSING.slice(), duration: TL.duration };
}
function drawFrame(ctx, t) {
  const sk = shake(t);
  ctx.save(); ctx.translate(W / 2 + sk.x, H / 2 + sk.y); ctx.rotate(sk.r); ctx.scale(1.012, 1.012); ctx.translate(-W / 2, -H / 2);
  bg(ctx, t, { px: -t * 6, py: -t * 3 });
  const st = chartAt(t);
  if (st) { drawChart(ctx, t, st); if (st.dim) { ctx.save(); ctx.globalAlpha = st.dim * 0; ctx.restore(); } }
  for (const id of TL.order) { const S = TL.shots[id]; if (t >= S.t0 - 0.05 && t <= S.t1 + 0.45 && SH[id]) { ctx.save(); SH[id].draw(ctx, t, S); ctx.restore(); } }
  ctx.restore();
  const endK = TL.shots.S36.e ? prog(t, TL.shots.S36.e.end - 0.3, 0.4) : 0;
  if (endK < 1) { ctx.save(); ctx.globalAlpha = 1 - endK; rail(ctx, t); ctx.restore(); }
  subtitles(ctx, t);
  vignette(ctx, t);
  // whole-film fade in/out
  const fi = 1 - prog(t, 0, 0.35), fo = prog(t, TL.duration - 0.6, 0.6);
  if (fi > 0 || fo > 0) { ctx.save(); ctx.globalAlpha = Math.max(fi, fo); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
