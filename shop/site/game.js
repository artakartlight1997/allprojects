// りなの おかいものさんすう
//
// ★ おみせで かいものを して、ぜんぶで いくら？ おつりは いくら？
//   ぴったり はらうには どの お金？ を 絵で かんがえる。
//
// ★ お金は ほんものと 同じ ならび（1・5・10・50・100・500円）。
//   数字だけの 計算より、お金の 絵で 見た ほうが ずっと わかりやすい。

'use strict';

const GAME_VER = 1;
const HUD = 26;

const COINS = [500, 100, 50, 10, 5, 1];

// kinds … total=ぜんぶでいくら change=おつり pay=ぴったりはらう
const STAGES = [
  { kinds: ['total'], items: 2, max: 100, step: 10, name: '1めん' },
  { kinds: ['total'], items: 3, max: 100, step: 10, name: '2めん' },
  { kinds: ['total', 'change'], items: 2, max: 100, step: 10, name: '3めん' },
  { kinds: ['change'], items: 2, max: 200, step: 10, name: '4めん' },
  { kinds: ['pay'], items: 1, max: 100, step: 10, name: '5めん' },
  { kinds: ['total', 'pay'], items: 3, max: 200, step: 10, name: '6めん' },
  { kinds: ['change', 'pay'], items: 3, max: 300, step: 5, name: '7めん' },
  { kinds: ['total', 'change'], items: 4, max: 500, step: 5, name: '8めん' },
  { kinds: ['change', 'pay'], items: 4, max: 800, step: 1, name: '9めん' },
  { kinds: ['total', 'change', 'pay'], items: 4, max: 1200, step: 1, name: 'さいご' },
];

const N_Q = 4;

const SAVE_KEY = 'shop.save.v1';
const save = { open: 1, clear: {}, right: 0, total: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(STAGES.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (typeof s.right === 'number') save.right = s.right;
  if (typeof s.total === 'number') save.total = s.total;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  qs: [], qi: 0, q: null, picked: -1, right: 0, done: false,
  tray: [], paid: [], shakeT: 0, popT: 0,
};

// --- もんだい ------------------------------------------------------------------------

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
// おつりを いちばん 少ない まいすうで
function breakDown(n) {
  const out = [];
  for (const c of COINS) {
    while (n >= c) { out.push(c); n -= c; }
  }
  return out;
}
function yen(n) { return n + '円'; }

function makeBasket(S) {
  const bag = shuffle(ITEMS.slice()).slice(0, S.items);
  const list = [];
  for (const it of bag) {
    let p = (1 + Math.floor(Math.random() * Math.floor(S.max / S.step / S.items))) * S.step;
    p = Math.max(S.step, p);
    list.push({ item: it, col: it.cols[0], price: p });
  }
  return list;
}

function choicesAround(ans, step) {
  const set = [ans];
  let guard = 0;
  while (set.length < 4 && guard++ < 80) {
    const d = (1 + Math.floor(Math.random() * 4)) * step * (Math.random() < 0.5 ? 1 : -1);
    const v = ans + d;
    if (v > 0 && set.indexOf(v) < 0) set.push(v);
  }
  // それでも たりない ときは かならず 1円より 上で かぶらない ものを たす
  let k = 1;
  while (set.length < 4) {
    const v = ans + k * step;
    if (v > 0 && set.indexOf(v) < 0) set.push(v);
    k++;
  }
  return shuffle(set);
}

function makeQ(S) {
  const kind = pick(S.kinds);
  const basket = makeBasket(S);
  let total = 0;
  for (const b of basket) total += b.price;
  if (kind === 'total') {
    const ch = choicesAround(total, S.step);
    return { kind: kind, basket: basket, total: total, ask: 'ぜんぶで いくら？',
             choices: ch, ans: ch.indexOf(total), why: basket.map((b) => b.price).join(' + ') + ' = ' + total };
  }
  if (kind === 'change') {
    // ★ ぴったりの お金を 出すと「おつり 0円」に なって もんだいに ならない。
    //   かならず ごうけいより 大きい お札／こう貨で はらう。
    const opts = [100, 500, 1000, 2000, 5000, 10000];
    let paid = 0;
    for (const v of opts) if (v > total) { paid = v; break; }
    if (!paid) paid = (Math.floor(total / 1000) + 1) * 1000;
    const ans = paid - total;
    const ch = choicesAround(ans, S.step);
    return { kind: kind, basket: basket, total: total, paid: paid, ask: yen(paid) + ' はらったら おつりは？',
             choices: ch, ans: ch.indexOf(ans), why: paid + ' − ' + total + ' = ' + ans };
  }
  // ぴったり はらう
  // ★ 1円たんいだと お金が 20まい ちかく ならんで 画面に 入らないし、
  //   数える のも たいへん。10円たんいに そろえる。
  let need = 0;
  for (const b of basket) { b.price = Math.max(10, Math.round(b.price / 10) * 10); need += b.price; }
  return { kind: 'pay', basket: basket, total: need, ask: 'ぴったり はらってね',
           need: need, why: 'ぴったり ' + yen(need) + ' に なれば せいかい' };
}

function startStage(n) {
  G.stage = n;
  const S = STAGES[n];
  G.qs = [];
  for (let i = 0; i < N_Q; i++) G.qs.push(makeQ(S));
  G.qi = 0; G.right = 0; G.done = false;
  G.screen = 'play';
  save.plays++; storeSave();
  setQ();
  bgmStart(n); bgmHeat(0.1);
}
function setQ() {
  G.q = G.qs[G.qi];
  G.picked = -1; G.shakeT = 0; G.popT = 0;
  G.paid = [];
  G.tray = [];
  if (G.q.kind === 'pay') {
    // ぴったり はらえる ぶん ＋ よけいな お金
    const need = breakDown(G.q.need);
    const extra = [];
    for (let i = 0; i < 4; i++) extra.push(pick(COINS));
    G.tray = shuffle(need.concat(extra)).map((v, i) => ({ v: v, i: i, used: false }));
  }
}
function paidSum() {
  let s = 0;
  for (const c of G.paid) s += c.v;
  return s;
}
function answer(i) {
  if (G.picked >= 0) return;
  G.picked = i;
  save.total++;
  const ok = i === G.q.ans;
  if (ok) { G.right++; save.right++; G.popT = 0.8; sfxGet(); }
  else { G.shakeT = 0.5; sfxNg(); }
  storeSave();
}
function answerPay() {
  if (G.picked >= 0) return;
  const s = paidSum();
  save.total++;
  if (s === G.q.need) { G.picked = 1; G.right++; save.right++; G.popT = 0.8; sfxGet(); }
  else { G.picked = 0; G.shakeT = 0.6; sfxNg(); }
  storeSave();
}
function nextQ() {
  G.qi++;
  if (G.qi >= G.qs.length) {
    G.done = true;
    if (G.right >= 3) {
      save.clear[G.stage] = true;
      if (G.stage + 1 >= save.open) save.open = Math.min(STAGES.length, G.stage + 2);
    }
    storeSave();
    bgmStop();
    if (G.right >= 3) sfxClear(G.right === N_Q); else sfxOver();
    return;
  }
  setQ();
}

function update(dt) {
  G.t += dt;
  if (G.shakeT > 0) G.shakeT -= dt;
  if (G.popT > 0) G.popT -= dt;
}

// --- 絵 -----------------------------------------------------------------------------

function drawCoin(x, y, v, s) {
  const gold = v === 500 || v === 5;
  const big = v >= 100;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  circle(x + 1.5, y + 2.5, s); ctx.fill();
  ctx.fillStyle = gold ? '#E8B84A' : (big ? '#D8DCE0' : '#C8A070');
  circle(x, y, s); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = Math.max(1, s * 0.08);
  circle(x, y, s * 0.86); ctx.stroke();
  if (v === 5 || v === 50) {
    ctx.fillStyle = '#2A2830';
    circle(x, y, s * 0.22); ctx.fill();
  }
  ctx.fillStyle = '#2A2830';
  bigText(String(v), x, y + (v === 5 || v === 50 ? s * 0.5 : 0), Math.round(s * (String(v).length > 2 ? 0.6 : 0.8)),
          '#3A3038', null);
}

function drawBasket(x, y, w) {
  const q = G.q;
  const n = q.basket.length;
  const cw = Math.min(120, w / n);
  const s = Math.min(30, cw * 0.30);
  for (let i = 0; i < n; i++) {
    const b = q.basket[i];
    const cx = x + w / 2 - (n - 1) * cw / 2 + i * cw;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    rr(cx - cw * 0.44, y - s * 1.6, cw * 0.88, s * 3.0, 10); ctx.fill();
    b.item.draw(cx, y - s * 0.35, s, b.col);
    ctx.fillStyle = '#FFD24A';
    rr(cx - cw * 0.34, y + s * 0.6, cw * 0.68, 22, 8); ctx.fill();
    bigText(yen(b.price), cx, y + s * 0.6 + 11, fitSize(yen(b.price), cw * 0.62, 15), '#3A2A18', null);
  }
}

function drawPlay() {
  bgGrad('#4A3266', '#1A1028');
  const q = G.q;
  drawHud();

  // おみせ
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  rr(14, HUD + 8, VW - 28, 118, 12); ctx.fill();
  bigText('おかいもの', VW / 2, HUD + 22, 15, '#FFC0DC', null);
  drawBasket(20, HUD + 74, VW - 40);
  drawRinaBody(VW - 46, HUD + 74, 22, { mood: G.picked >= 0 ? (isRight() ? 'happy' : 'sad') : 'normal' });

  // しつもん
  const shake = G.shakeT > 0 ? Math.sin(G.t * 50) * 5 : 0;
  bigText(q.ask, VW / 2 + shake, HUD + 146, fitSize(q.ask, VW * 0.8, 24), '#FFE9A8');
  if (q.kind === 'change') {
    bigText('ごうけい ' + yen(q.total), VW / 2, HUD + 172, 16, '#CFE0FF', null);
  }

  if (q.kind === 'pay') drawPay();
  else drawChoices();

  if (G.picked >= 0) {
    const ok = isRight();
    bigText(ok ? 'せいかい！' : 'おしい！', VW / 2, VH - 62, 22, ok ? '#8CF0A8' : '#FF9AA8');
    bigText(q.why, VW / 2, VH - 40, fitSize(q.why, VW * 0.8, 15), '#E8E0FF', null);
    const nb = Math.min(180, VW * 0.22);
    drawButton(button(VW / 2 - nb / 2, VH - 30, nb, 26, () => nextQ()),
               G.qi + 1 >= G.qs.length ? 'けっか' : 'つぎへ', '#8AD8F0');
  }

  if (G.popT > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(G.popT * 1.6, 0, 1);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + G.t;
      const r = (0.8 - G.popT) * 110 + 20;
      ctx.fillStyle = ['#FFD24A', '#FF7AA8', '#8AD8F0'][i % 3];
      circle(VW / 2 + Math.cos(a) * r, VH * 0.5 + Math.sin(a) * r, 6); ctx.fill();
    }
    ctx.restore();
  }

  if (G.done) {
    const ok = G.right >= 3;
    const last = G.stage >= STAGES.length - 1;
    drawResult(ok, ok ? 'おかいもの じょうず！' : 'もうすこし！',
      [G.right + ' / ' + N_Q + ' もん せいかい',
       ok ? (last ? 'ぜんぶ クリア！' : 'つぎの めんが ひらいたよ') : '3もん いじょうで つぎへ'],
      ok && !last
        ? [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startStage(G.stage) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function isRight() {
  return G.q.kind === 'pay' ? G.picked === 1 : G.picked === G.q.ans;
}

function drawChoices() {
  const q = G.q;
  const bw = Math.min(190, (VW - 60) / 4), bh = 52;
  const y = HUD + 200;
  for (let i = 0; i < q.choices.length; i++) {
    const x = VW / 2 - (4 * bw + 3 * 12) / 2 + i * (bw + 12);
    let col = '#FFD24A';
    if (G.picked >= 0) {
      if (i === q.ans) col = '#5ADC80';
      else if (i === G.picked) col = '#FF7A8A';
      else col = 'rgba(255,255,255,0.22)';
    }
    drawButton(button(x, y, bw, bh, G.picked < 0 ? () => answer(i) : null), yen(q.choices[i]), col);
  }
}

function drawPay() {
  const q = G.q;
  const y0 = HUD + 190;
  bigText('ほしい がく: ' + yen(q.need), VW / 2, y0 - 12, 18, '#FFD24A');
  // さいふ。★ 下から くみたてる ので、お金が 多くても 画面から はみ出さない。
  const cols = Math.min(G.tray.length, 11);
  const rows = Math.max(1, Math.ceil(G.tray.length / cols));
  const btnH = 40, payH = 52, margin = 10;
  const room = VH - 6 - btnH - margin - payH - margin - (y0 + 22);
  const s = Math.max(12, Math.min(24, VW * 0.028, room / (rows * 2.4)));
  for (let i = 0; i < G.tray.length; i++) {
    const c = G.tray[i];
    const cx = VW / 2 - (cols - 1) * s * 2.4 / 2 + (i % cols) * s * 2.4;
    const cy = y0 + 22 + Math.floor(i / cols) * s * 2.4;
    ctx.save();
    if (c.used) ctx.globalAlpha = 0.25;
    drawCoin(cx, cy, c.v, s);
    ctx.restore();
    if (!c.used && G.picked < 0) {
      button(cx - s, cy - s, s * 2, s * 2, () => {
        c.used = true; G.paid.push(c); sfxTap();
      });
    }
  }
  // はらう ところ（下から きめる）
  const py = VH - 6 - btnH - margin - payH;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(VW * 0.18, py, VW * 0.64, 52, 10); ctx.fill();
  bigText('はらう', VW * 0.18 + 34, py + 26, 14, '#CFE0FF', null);
  for (let i = 0; i < G.paid.length; i++) {
    const cx = VW * 0.18 + 74 + i * s * 2.0;
    if (cx > VW * 0.72) break;
    drawCoin(cx, py + 26, G.paid[i].v, s * 0.85);
    if (G.picked < 0) {
      button(cx - s * 0.85, py + 26 - s * 0.85, s * 1.7, s * 1.7, () => {
        G.paid[i].used = false; G.paid.splice(i, 1); sfxTap();
      });
    }
  }
  const sum = paidSum();
  bigText(yen(sum), VW * 0.78, py + 26, 20, sum === q.need ? '#8CF0A8' : '#FFE9A8');
  if (G.picked < 0) {
    const bw = Math.min(200, VW * 0.24);
    drawButton(button(VW / 2 - bw / 2, py + payH + margin, bw, btnH, () => answerPay()),
               'これで はらう', '#FFD24A');
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(STAGES[G.stage].name, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#E8E0FF';
  ctx.fillText('もんだい ' + Math.min(G.qi + 1, N_Q) + ' / ' + N_Q, 76, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('せいかい ' + G.right, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#4A3266', '#1A1028');
  bigText('りなの', VW / 2, 38, 20, '#FFC0DC');
  bigText('おかいものさんすう', VW / 2, 74, fitSize('おかいものさんすう', VW * 0.6, 42), '#FFD24A');
  bigText('ぜんぶで いくら？ おつりは？ ぴったり はらえる？', VW / 2, 114, 16, '#DDE8FF', null);
  bigText('お金の 絵で かんがえる ので 頭に のこる', VW / 2, 138, 15, '#C8B8E8', null);
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 162,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 6, sw, 34, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, y + 6, sw, 34, () => sfxTest()), '♪ おと', '#C8BCE8');
  const cs = 16;
  for (let i = 0; i < COINS.length; i++) drawCoin(VW / 2 - 5 * cs * 1.3 + i * cs * 2.6, VH - 40, COINS[i], cs);
  bigText('これまでに ' + save.right + ' / ' + save.total + ' もん せいかい', VW / 2, VH - 14, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#4A3266', '#1A1028');
  bigText('あそびかた', VW / 2, 38, 26, '#FFD24A');
  const lines = [
    '① 上の たなに ある ものと ねだんを 見る',
    '②「ぜんぶで いくら？」は たしざん。4つから えらぶ',
    '③「おつりは？」は ひきざん。はらった お金 − ごうけい',
    '④「ぴったり はらう」は お金を タップして ちょうどに する',
    '⑤ はらった お金を もう1回 タップすると もどせる',
    '⑥ 4もん中 3もん せいかいで つぎの めんへ',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 80 + i * 30, fitSize(s, VW * 0.88, 16), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 46, bw, 36, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
