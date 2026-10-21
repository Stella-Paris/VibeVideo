// Bilingual subtitle script (no voice-over). Line timing is derived from reading speed so the
// picture and the sound effects both read the same clock (see buildTimeline).
const CHAPTERS = [
  { zh: '建立标尺', en: 'THE SCALE' },
  { zh: '二游双雄', en: 'GACHA DUEL' },
  { zh: '多人修罗场', en: 'THE ARENA' },
  { zh: '国民竞技', en: 'FAIR PLAY?' },
  { zh: '极致两端', en: 'EXTREMES' },
  { zh: '终局总图', en: 'BIG PICTURE' },
];

const SCRIPT = [
  // ---------------------------------------------------------------- 01 建立标尺
  { id: 'S01', ch: 0, pre: 0.6, lines: [
    ['给你10块钱，或者给你10万块——', 'Give you ¥10, or give you ¥100,000 —'],
    ['在游戏里，你到底能买到什么？', 'what can you actually buy in a game?'],
  ] },
  { id: 'S02', ch: 0, lines: [
    ['很多人觉得：二游抽卡贵，MMO是无底洞。', 'People say gacha is pricey and MMOs are bottomless pits.'],
    ['那就把8款热门游戏，放进同一张图里比一比。', "So let's put 8 hit games on one chart."],
  ] },
  { id: 'S03', ch: 0, lines: [
    ['横轴是花的钱：从10块起步，每一格翻10倍。', 'X-axis: money spent. From ¥10, every step is ×10.'],
    ['这叫对数坐标：10、100、1000、1万、10万。', "That's a log scale: 10, 100, 1K, 10K, 100K."],
  ] },
  { id: 'S04', ch: 0, lines: [
    ['纵轴是你换来的真实体验。', 'Y-axis: the experience you actually get.'],
    ['底部红线叫"氪了白氪"，顶部金线叫"彻底氪穿"。', 'Red floor: "money wasted". Gold ceiling: "maxed out".'],
  ] },
  { id: 'S05', ch: 0, lines: [
    ['8款游戏，两两分组，四场对决。', '8 games. 4 head-to-head matchups.'],
    ['每条曲线背后，都是一套精心设计的数学。', 'Behind every curve is carefully designed math.'],
  ] },
  { id: 'S06', ch: 1, post: 0.4, lines: [
    ['第一组：同为抽卡二游的《原神》和《恋与深空》。', 'Round 1: Genshin Impact vs Love and Deepspace.'],
  ] },
  // ---------------------------------------------------------------- 02 二游双雄
  { id: 'S07', ch: 1, lines: [
    ['在10块钱档位，两条线都贴着红线。', 'At ¥10, both curves hug the red floor.'],
    ['原神1抽160原石≈16元，恋与深空1抽150钻≈15元。', 'One Genshin pull ≈ ¥16. One Deepspace pull ≈ ¥15.'],
    ['10块钱，连一发单抽都凑不齐。', "¥10 can't even buy a single pull."],
  ] },
  { id: 'S08', ch: 1, lines: [
    ['到了100块：30元月卡 + 68元通行证，', 'At ¥100: a ¥30 monthly pass + a ¥68 battle pass —'],
    ['两条曲线第一次猛冲。', 'both curves make their first big jump.'],
  ] },
  { id: 'S09', ch: 1, lines: [
    ['但月卡的本质，是一笔"时间赎买税"。', 'But the monthly pass is really a "time tax".'],
    ['一天不上线就少拿90原石——它买的是你的日活。', "Miss a day, lose 90 Primogems. It's buying your daily logins."],
  ] },
  { id: 'S10', ch: 1, lines: [
    ['真正的分水岭，在1000块。', 'The real turning point: ¥1,000.'],
    ['二游有"保底"：90抽小保底，180抽大保底。', 'Gacha has pity: 90 pulls soft, 180 pulls guaranteed.'],
    ['1000块左右拿下0命新角色，已拿走80%核心体验。', '~¥1,000 lands a new C0 character: 80% of the core experience.'],
  ] },
  { id: 'S11', ch: 1, lines: [
    ['再砸到1万块抽满6命，花费涨了十倍，', 'Spend ¥10,000 for C6 — ten times the cost —'],
    ['换来的只是怪活不过三秒的数值溢出。', 'and all you get is overkill: bosses melt in 3 seconds.'],
  ] },
  { id: 'S12', ch: 1, lines: [
    ['《原神》有近百个角色，卖的是"横向配队积木"；', 'Genshin sells ~100 characters as team-building blocks;'],
    ['《恋与深空》只有5位男主，卖的是"排他的恋爱深度"。', 'Deepspace has just 5 leads — it sells exclusive romance.'],
  ] },
  { id: 'S13', ch: 1, lines: [
    ['日卡成套、叠阶换色，再包下商圈大屏为他庆生——', 'Card sets, upgrades, birthday billboards downtown —'],
    ['当氪金变成"爱的证明"，曲线就被一路拉直。', 'when spending is "proof of love", the curve never flattens.'],
  ] },
  // ---------------------------------------------------------------- 03 修罗场
  { id: 'S14', ch: 2, pre: 0.5, lines: [
    ['第二组：SLG《无尽冬日》对决MMO《逆水寒》手游。', 'Round 2: Whiteout Survival vs Justice Online Mobile.'],
    ['如果说二游是平行宇宙，这里就是"S型修罗场"。', 'If gacha is a parallel universe, this is an S-curve arena.'],
  ] },
  { id: 'S15', ch: 2, lines: [
    ['从10块、100块，一直到1000块——', 'From ¥10 to ¥100, all the way to ¥1,000 —'],
    ['两条曲线几乎贴着地板爬行。', 'both curves barely leave the floor.'],
  ] },
  { id: 'S16', ch: 2, lines: [
    ['《无尽冬日》：充了1000块的城，被大佬一次集结夷为平地。', 'Whiteout: a ¥1,000 city, flattened by one whale rally.'],
    ['《逆水寒》：1000块，连一颗天赏石都保底不了。', "Justice: ¥1,000 can't even guarantee one Tianshang Stone."],
    ['微氪玩家不是消费者，而是免费的"NPC和气氛组"。', "Light spenders aren't customers. They're free NPCs and extras."],
  ] },
  { id: 'S17', ch: 2, lines: [
    ['只有冲过1万、迈向10万，跨过"服务器前排"阈值线，', 'Only past ¥10K, toward ¥100K, over the "server elite" line,'],
    ['曲线才会垂直起飞。', 'does the curve finally take off.'],
  ] },
  { id: 'S18', ch: 2, lines: [
    ['《无尽冬日》卖的是旧时代的"丛林暴力"：', 'Whiteout sells old-school jungle power:'],
    ['花30万当"车头"，把几百个平民当煤炭烧。', '¥300K makes you the engine, burning hundreds of players as coal.'],
  ] },
  { id: 'S19', ch: 2, lines: [
    ['《逆水寒》官方承诺不卖数值，卖的是"审美景观"：', 'Justice promises no pay-to-win. It sells spectacle:'],
    ['十几万到上百万的神赐顶奢外观，能改变全服天相。', '¥150K–¥1M+ luxury outfits that change the whole sky.'],
    ['零氪玩家从"被砍的炮灰"，变成"帮大佬截图的群演"。', 'Free players go from cannon fodder to extras taking photos.'],
  ] },
  { id: 'S20', ch: 2, lines: [
    ['而这两条线，永远没有真正的上限。', 'And these two curves have no real ceiling.'],
  ] },
  // ---------------------------------------------------------------- 04 国民竞技
  { id: 'S21', ch: 3, pre: 0.5, lines: [
    ['第三组：《王者荣耀》对决《三角洲行动》。', 'Round 3: Honor of Kings vs Delta Force.'],
    ['主打公平竞技，不卖攻击力——所以曲线从40%起步。', "They sell fairness, not firepower — so they start at 40%."],
  ] },
  { id: 'S22', ch: 3, lines: [
    ['100块以内体验极佳：6元皮肤、38元战令，手感拉满；', 'Under ¥100 it feels great: a ¥6 skin, a ¥38 battle pass.'],
    ['三角洲买的是安全箱：撤离失败，也能保住一件大红。', 'Delta sells the safe box: die, and your best loot still survives.'],
  ] },
  { id: 'S23', ch: 3, lines: [
    ['到了1000块，王者的单英雄体验就到头了：', 'At ¥1,000, one hero is maxed out:'],
    ['一局只能穿一件皮肤，第5件的边际效用≈0。', 'One skin per match — the 5th one adds ≈ nothing.'],
  ] },
  { id: 'S24', ch: 3, lines: [
    ['于是王者发明了"社交货币通胀"：', 'So HoK invented social-currency inflation:'],
    ['史诗、无双、荣耀典藏、V10，再到无双V10、荣耀V10……', 'Epic, Legend, Glory Collection, V10, then Unrivaled & Glory V10…'],
    ['直到10万块全皮肤，彻底氪穿。', 'until ¥100K buys every skin. Fully maxed.'],
  ] },
  { id: 'S25', ch: 3, lines: [
    ['三角洲：买完北极星刀皮，再把1万块换成哈夫币，', 'Delta: buy the Polaris knife, turn ¥10K into Hafu coins,'],
    ['满改M7、六套甲、金弹，杀进绝密航天。', 'full-mod M7, tier-6 armor, gold ammo — into Top-Secret Space Base.'],
  ] },
  { id: 'S26', ch: 3, lines: [
    ['曲线变成心电图：被草丛老六一梭子修脚，', 'The curve turns into an ECG: one ambush from a bush camper,'],
    ['全套装备1秒清零，成了别人的战利品。', 'and your whole kit is gone in a second — someone else\'s loot.'],
  ] },
  // ---------------------------------------------------------------- 05 极致两端
  { id: 'S27', ch: 4, pre: 0.5, lines: [
    ['最后一组：买断制单机《黑神话：悟空》，', 'Final round: buy-to-play Black Myth: Wukong'],
    ['对决国民棋牌《欢乐斗地主》。', 'vs the national card game, Happy Landlord.'],
  ] },
  { id: 'S28', ch: 4, lines: [
    ['10块钱：《黑神话》连游戏都买不到；', "At ¥10: you can't even buy Wukong;"],
    ['《欢乐斗地主》6元首充，当场开局。', 'Landlord gets you playing with a ¥6 first top-up.'],
  ] },
  { id: 'S29', ch: 4, pre: 0.4, lines: [
    ['但到了268元——', 'But at ¥268 —'],
    ['《黑神话》一棒子90度拉满，直接捅穿天花板！', "Wukong's curve shoots straight up and smashes the ceiling!"],
    ['没有月卡，没有保底，没有排位焦虑。', 'No passes. No pity. No ranked anxiety.'],
  ] },
  { id: 'S30', ch: 4, lines: [
    ['1万块，够一个Steam玩家买下几十部3A大作。', '¥10K buys a Steam player dozens of AAA games.'],
  ] },
  { id: 'S31', ch: 4, lines: [
    ['而《欢乐斗地主》才刚露出獠牙：豆子不是商品，是筹码。', "Landlord is just getting started: beans aren't goods, they're chips."],
    ['抢地主、明牌、超级加倍、炸弹、春天……倍数一路翻。', 'Bid, show hand, super double, bombs, spring… the stakes multiply.'],
  ] },
  { id: 'S32', ch: 4, lines: [
    ['十万块的豆子，3分钟就能输得一干二净——', '¥100K of beans can vanish in three minutes —'],
    ['然后系统贴心地弹出：6元破产救济礼包。', 'then a friendly pop-up: "¥6 bankruptcy rescue pack!"'],
  ] },
  // ---------------------------------------------------------------- 06 终局总图
  { id: 'S33', ch: 5, pre: 0.5, lines: [
    ['现在，把8条曲线叠在同一张图上。', 'Now, stack all 8 curves on one chart.'],
  ] },
  { id: 'S34', ch: 5, lines: [
    ['垂直线：买断制，268元一步到位。', 'The vertical line: buy-to-play, done at ¥268.'],
    ['对数线：二游用30元买时间，1000元交出80%体验。', 'The log curves: gacha buys your time at ¥30, gives 80% at ¥1K.'],
    ['阶梯与心电图：一个卖排面，一个卖心跳。', 'Stairs and heartbeats: one sells status, one sells adrenaline.'],
    ['S型无底洞：千元以下当群演，十万以上买特权。', 'The S-curves: extras below ¥1K, privileges above ¥100K.'],
  ] },
  { id: 'S35', ch: 5, lines: [
    ['百元以内，你买的是时间；', 'Under ¥100, you buy time.'],
    ['千元档位，你买的是内容和陪伴；', 'Around ¥1,000, you buy content and companionship.'],
    ['十万以上，你买的是凌驾于他人之上的目光与权力。', 'Above ¥100K, you buy attention — and power over others.'],
  ] },
  { id: 'S36', ch: 5, post: 2.2, lines: [
    ['你的游戏预算，停在哪条曲线的哪个刻度？', 'Where does your gaming budget sit on these curves?'],
    ['评论区打出你的坐标！', 'Drop your coordinates in the comments!'],
  ] },
];

// reading-speed timing: Chinese drives it (~5 chars/s) plus a beat to glance at the English
function lineDur(zh) {
  const n = [...zh.replace(/[，。：；、！？—…《》"“”（）\s]/g, '')].length;
  return Math.max(2.3, 0.9 + n * 0.18);
}
// optional per-shot extra time for visual beats that need room (seconds added after the last line)
const SHOT_HOLD = { S03: 1.2, S04: 0.6, S05: 1.0, S10: 0.8, S13: 0.8, S17: 0.6, S20: 0.8, S24: 0.8, S26: 0.8, S29: 0.6, S32: 0.8, S33: 0.6, S34: 0.6, S35: 1.2 };

function buildTimeline() {
  let t = 0; const shots = {}, order = [], subs = [], chStart = [];
  for (const s of SCRIPT) {
    const t0 = t; let c = t0 + (s.pre || 0.25); const L = [];
    for (const [zh, en] of s.lines) { const d = lineDur(zh); L.push(c); subs.push({ t0: c, t1: c + d - 0.12, zh, en, shot: s.id }); c += d; }
    c += (s.post || 0) + (SHOT_HOLD[s.id] || 0) + 0.15;
    shots[s.id] = { id: s.id, ch: s.ch, t0, t1: c, L, Lend: L.map((x, i) => (L[i + 1] ?? (c - (s.post || 0) - (SHOT_HOLD[s.id] || 0) - 0.15))) };
    if (chStart[s.ch] == null) chStart[s.ch] = t0;
    order.push(s.id); t = c;
  }
  return { shots, order, subs, chStart, duration: t };
}
if (typeof module !== 'undefined') module.exports = { SCRIPT, CHAPTERS, buildTimeline };
