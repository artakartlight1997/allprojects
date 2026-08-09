// リナパパの たまごキャッチ
//
// ★ むかしの「ポケットに 入る 液晶ゲーム」が もと。
//   おおかみの かわりに リナパパが 4つの ばしょを 行ったり来たり して、
//   といを ころがって くる たまごを かごで うける。
//
// ★ 液晶ゲームと 同じで、時間は「カチッ カチッ」と すすむ。
//   たまごは 1カチで 1つぶん 進む。だから 見て から でも まにあう。
//   どこに たまごが 来るかは、うすい かげ（ゴースト）で 先に わかる。
//
// ★ そうさ … 行きたい ばしょ（画面の 4つの かど）を さわるだけ。
//   ゆびを つけた まま すべらせても よい。やじるしキーでも 動く。
//   ねらう ところが 画面の 4ぶんの1 も ある ので、ぜったいに 外れない。

'use strict';

const GAME_VER = 1;
const HUD = 26;
const STEPS = 5;             // といの 上を 何カチで すべり落ちるか
const MISS_MAX = 3;
const FORGIVE = 60;          // なんてん ごとに ミスを 1つ 消して あげるか

// 液晶の 色
const LCD_A = '#B3C39C', LCD_B = '#93A67C';
const INK = '#26301F';
const GHOST = 'rgba(38,48,31,0.17)';

const SAVE_KEY = 'catch.save.v1';
const save = { hi: 0, plays: 0, eggs: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.hi === 'number') save.hi = s.hi;
  if (typeof s.plays === 'number') save.plays = s.plays;
  if (typeof s.eggs === 'number') save.eggs = s.eggs;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0,
  slot: 1, eggs: [], tick: 0.6, tickLen: 0.6, phase: 0,
  score: 0, caught: 0, miss: 0, level: 0, over: false,
  msg: '', msgT: 0, hurt: 0, joy: 0, forgive: FORGIVE, warned: false,
};

// --- ばしょ の けいさん -------------------------------------------------------------
//
//   slot 0 = 左上   1 = 左下   2 = 右上   3 = 右下
//   （slot = よこ * 2 + たて。画面を 4つに わった ところと そのまま おなじ）

function geo() {
  const cx = VW / 2;
  return {
    cx: cx,
    nx: cx, ny: HUD + 40,
    dx1: Math.min(300, VW * 0.30),
    dx2: Math.min(400, VW * 0.42),
    y1: Math.round(VH * 0.40),
    y2: Math.round(VH * 0.70),
  };
}
function slotSide(i) { return i < 2 ? -1 : 1; }
function slotUp(i) { return (i % 2) === 0; }

function chuteEnd(i) {
  const g = geo(), s = slotSide(i), up = slotUp(i);
  return { x: g.cx + s * (up ? g.dx1 : g.dx2), y: up ? g.y1 : g.y2, s: s };
}
// といの 上の k ばんめ（0 が いちばん 上、STEPS が はしっこ）
function chutePt(i, k) {
  const g = geo(), e = chuteEnd(i);
  const t = k / STEPS;
  const x0 = g.cx + e.s * 24, y0 = g.ny + 14;
  return {
    x: x0 + (e.x - x0) * t,
    y: y0 + (e.y - y0) * t + Math.sin(t * Math.PI) * 16,
  };
}
function basketPt(i) {
  const e = chuteEnd(i);
  return { x: e.x + e.s * 14, y: e.y + 30 };
}
function papaPt(i) {
  const b = basketPt(i), e = chuteEnd(i);
  return { x: b.x - e.s * 30, y: b.y + 42 };
}
function eggPos(e) {
  const p = clamp(G.phase, 0, 1);
  if (e.k >= STEPS) {
    const a = chutePt(e.i, STEPS), b = basketPt(e.i);
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  }
  const a = chutePt(e.i, e.k), b = chutePt(e.i, e.k + 1);
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

// --- はやさ -------------------------------------------------------------------------

function tickLenOf(lv) { return Math.max(0.20, 0.60 - lv * 0.042); }
function spawnP(lv) { return Math.min(0.94, 0.46 + lv * 0.055); }

// --- ゲームの なかみ ----------------------------------------------------------------

function setSlot(i) {
  if (i === G.slot) return;
  G.slot = i;
  sfxTap();
}
function setSlotAt(x, y) {
  const side = x < VW / 2 ? 0 : 1;
  const lev = y < VH * 0.52 ? 0 : 1;
  setSlot(side * 2 + lev);
}

function readInput() {
  for (const t of IN.taps) setSlotAt(t.x, t.y);
  if (IN.hold) setSlotAt(IN.x, IN.y);
  const side = G.slot >= 2 ? 1 : 0, lev = G.slot % 2;
  if (KEYS.ArrowLeft) setSlot(0 * 2 + lev);
  if (KEYS.ArrowRight) setSlot(1 * 2 + lev);
  if (KEYS.ArrowUp) setSlot(side * 2 + 0);
  if (KEYS.ArrowDown) setSlot(side * 2 + 1);
}

function trySpawn() {
  // ★ たいせつ：1カチに 出す たまごは かならず 1つだけ。
  //   おなじ カチで 2つ 落ちて くると、どんなに うまくても 片方は とれない。
  //   たまごは みんな 同じ 速さで 進む ので、出す ときに ずらせば ずっと ずれた まま。
  for (const e of G.eggs) if (e.k === 0) return;
  if (Math.random() > spawnP(G.level)) return;
  const free = [];
  for (let i = 0; i < 4; i++) {
    let busy = false;
    for (const e of G.eggs) if (e.i === i && e.k <= 1) busy = true;
    if (!busy) free.push(i);
  }
  if (!free.length) return;
  const i = free[Math.floor(Math.random() * free.length)];
  G.eggs.push({ i: i, k: 0, chick: Math.random() < 0.13 });
}

function resolve(e) {
  if (G.slot === e.i) {
    const pt = e.chick ? 3 : 1;
    G.score += pt;
    G.caught++;
    save.eggs++;
    G.joy = 0.36;
    G.level = Math.min(9, Math.floor(G.caught / 12));
    if (e.chick) { say('ひよこ！ +3'); sfxPop(); } else sfxGet();
    if (G.score >= G.forgive) {
      G.forgive += FORGIVE;
      if (G.miss > 0) { G.miss--; say('ミスが 1つ もどった！'); sfxClear(false); }
    }
  } else {
    G.miss++;
    G.hurt = 0.6;
    sfxNg();
    if (G.miss >= MISS_MAX) endGame();
  }
}

function doTick() {
  G.tickLen = tickLenOf(G.level);
  for (let i = G.eggs.length - 1; i >= 0; i--) {
    const e = G.eggs[i];
    e.k++;
    if (e.k > STEPS) { resolve(e); G.eggs.splice(i, 1); }
  }
  if (G.over) return;
  trySpawn();
  let drop = false;
  for (const e of G.eggs) if (e.k >= STEPS) drop = true;
  if (drop && A.ctx) tone(anow(), 84, 0.035, 0.06, 'square');
}

function say(s) { G.msg = s; G.msgT = 1.1; }

function startRun() {
  G.eggs = [];
  G.slot = 1; G.score = 0; G.caught = 0; G.miss = 0; G.level = 0;
  G.over = false; G.forgive = FORGIVE; G.msgT = 0; G.hurt = 0; G.joy = 0;
  G.tickLen = tickLenOf(0); G.tick = G.tickLen; G.phase = 0;
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(1); bgmHeat(0);
}

function endGame() {
  G.over = true;
  bgmStop(); sfxOver();
  if (G.score > save.hi) save.hi = G.score;
  storeSave();
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.hurt > 0) G.hurt -= dt;
  if (G.joy > 0) G.joy -= dt;
  if (G.screen !== 'play' || G.over) return;

  readInput();
  bgmHeat(Math.min(1, G.level / 9));

  G.tick -= dt;
  G.phase = 1 - clamp(G.tick / G.tickLen, 0, 1);
  if (G.tick <= 0) { G.tick += G.tickLen; if (G.tick < 0) G.tick = G.tickLen; doTick(); }
}

// --- 絵 -----------------------------------------------------------------------------

function lcdBg() {
  const g = ctx.createLinearGradient(0, -VOY, 0, VH + VOB);
  g.addColorStop(0, LCD_A); g.addColorStop(1, LCD_B);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // 液晶っぽい よこすじ
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 0; y < VH; y += 6) ctx.fillRect(-VW, y, VW * 3, 2);
}

function drawEgg(x, y, chick, s) {
  s = s || 1;
  if (chick) {
    ctx.fillStyle = '#FFD24A';
    circle(x, y, 10 * s); ctx.fill();
    ctx.lineWidth = 1.6 * s; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#F08A3A';
    ctx.beginPath();
    ctx.moveTo(x + 8 * s, y); ctx.lineTo(x + 14 * s, y + 2.5 * s); ctx.lineTo(x + 8 * s, y + 5 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK;
    circle(x + 3.5 * s, y - 2.5 * s, 1.8 * s); ctx.fill();
  } else {
    ctx.fillStyle = '#FFFBF0';
    ctx.beginPath(); ctx.ellipse(x, y, 8.5 * s, 10.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.8 * s; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(x - 2.6 * s, y - 3.4 * s, 2.6 * s, 3.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBasket(x, y, ghost) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.22;
  ctx.fillStyle = ghost ? INK : '#C98A4A';
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 12); ctx.lineTo(x + 24, y - 12);
  ctx.lineTo(x + 17, y + 13); ctx.lineTo(x - 17, y + 13);
  ctx.closePath(); ctx.fill();
  if (!ghost) {
    ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 12 - 2, y - 12); ctx.lineTo(x + i * 12 * 0.75 - 1, y + 13);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x - 21, y + 1); ctx.lineTo(x + 21, y + 1); ctx.stroke();
    ctx.fillStyle = '#E8B070';
    rr(x - 25, y - 16, 50, 7, 3); ctx.fill();
  }
  ctx.restore();
}

// りな（下で 見て いる。うけたら よろこぶ）
function drawRina(x, y, s, mood) {
  ctx.fillStyle = '#4A2B1E';
  rr(x - s * 1.05, y - s * 0.2, s * 2.1, s * 1.05, s * 0.3); ctx.fill();
  circle(x, y - s * 0.04, s * 1.12); ctx.fill();
  ctx.fillStyle = '#FFE0C8';
  circle(x, y, s); ctx.fill();
  ctx.fillStyle = '#4A2B1E';
  ctx.beginPath(); ctx.arc(x, y - s * 0.14, s * 0.99, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A2028';
  if (mood === 'sad') {
    ctx.lineWidth = Math.max(1.4, s * 0.12); ctx.strokeStyle = '#2A2028';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * s * 0.38 - s * 0.16, y + s * 0.04);
      ctx.lineTo(x + sg * s * 0.38 + s * 0.16, y + s * 0.2);
      ctx.stroke();
    }
  } else {
    circle(x - s * 0.38, y + s * 0.12, s * 0.17); ctx.fill();
    circle(x + s * 0.38, y + s * 0.12, s * 0.17); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  circle(x - s * 0.66, y + s * 0.34, s * 0.16); ctx.fill();
  circle(x + s * 0.66, y + s * 0.34, s * 0.16); ctx.fill();
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1.2, s * 0.1);
  ctx.beginPath();
  if (mood === 'sad') ctx.arc(x, y + s * 0.72, s * 0.2, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y + s * 0.4, s * 0.22, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#FF6FA8';
  rr(x - s * 1.0, y + s * 1.0, s * 2.0, s * 1.1, s * 0.3); ctx.fill();
}

// にわとり小屋（たまごの 出どころ）
function drawCoop(g) {
  const x = g.nx, y = g.ny;
  ctx.fillStyle = '#7A4A2A';
  rr(x - 62, y - 30, 124, 46, 8); ctx.fill();
  ctx.fillStyle = '#A8552E';
  ctx.beginPath();
  ctx.moveTo(x - 74, y - 28); ctx.lineTo(x, y - 60); ctx.lineTo(x + 74, y - 28);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(x - 44, y - 22, 88, 30, 6); ctx.fill();
  // めんどり
  const bob = Math.sin(G.t * 3) * 3;
  ctx.fillStyle = '#FFFBF0';
  ctx.beginPath(); ctx.ellipse(x, y - 6 + bob, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFBF0';
  circle(x + 16, y - 18 + bob, 10); ctx.fill();
  ctx.fillStyle = '#E8564A';
  circle(x + 13, y - 27 + bob, 4); ctx.fill();
  circle(x + 19, y - 28 + bob, 4); ctx.fill();
  ctx.fillStyle = '#F0A030';
  ctx.beginPath();
  ctx.moveTo(x + 25, y - 17 + bob); ctx.lineTo(x + 33, y - 14 + bob); ctx.lineTo(x + 25, y - 11 + bob);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = INK;
  circle(x + 19, y - 20 + bob, 1.8); ctx.fill();
}

function drawPlay() {
  const g = geo();
  lcdBg();

  const shake = G.hurt > 0 ? Math.sin(G.t * 60) * G.hurt * 5 : 0;
  ctx.save();
  ctx.translate(shake, 0);

  // とい
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = 'rgba(38,48,31,0.55)';
    ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k <= STEPS; k++) {
      const p = chutePt(i, k);
      if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(210,225,190,0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let k = 0; k <= STEPS; k++) {
      const p = chutePt(i, k);
      if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // ゴースト（液晶ゲームの「消えて いる 絵」）
  ctx.save();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    for (let k = 1; k <= STEPS; k++) {
      const p = chutePt(i, k);
      ctx.fillStyle = GHOST;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 8.5, 10.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  drawCoop(g);

  // うける ばしょの めじるし
  for (let i = 0; i < 4; i++) {
    if (i === G.slot) continue;
    const b = basketPt(i);
    drawBasket(b.x, b.y, true);
  }

  // たまご
  for (const e of G.eggs) {
    const p = eggPos(e);
    drawEgg(p.x, p.y, e.chick, 1);
  }

  // パパ と かご
  const pp = papaPt(G.slot), bp = basketPt(G.slot), e0 = chuteEnd(G.slot);
  ctx.strokeStyle = '#FFD8B8'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pp.x + e0.s * 8, pp.y - 14);
  ctx.lineTo(bp.x - e0.s * 6, bp.y + 2);
  ctx.stroke();
  drawPapa(pp.x, pp.y, 30, {
    dir: e0.s, walk: 0, shirt: '#4AA0E0',
    face: G.hurt > 0 ? 'oops' : 'happy',
  });
  drawBasket(bp.x, bp.y, false);
  if (G.joy > 0) {
    ctx.globalAlpha = clamp(G.joy * 3, 0, 1);
    bigText('セーフ！', bp.x, bp.y - 34, 18, '#FFD24A');
    ctx.globalAlpha = 1;
  }

  // 下で 見て いる りな
  drawRina(g.cx, VH - 46, 20, G.hurt > 0 ? 'sad' : 'happy');
  bigText('×' + save.eggs, g.cx + 46, VH - 40, 15, INK, null);

  ctx.restore();

  drawHud();

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2.5);
    bigText(G.msg, VW / 2, HUD + 74, 24, '#FFF6C8');
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    drawResult(false, 'おしまい！',
      ['スコア ' + G.score + '　うけた たまご ' + G.caught,
       'さいこう ' + Math.max(save.hi, G.score) + '　レベル ' + (G.level + 1)],
      [{ label: 'もういちど', on: startRun },
       { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(38,48,31,0.30)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = INK;
  ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('さいこう ' + Math.max(save.hi, G.score), 120, HUD / 2);
  ctx.fillText('レベル ' + (G.level + 1), 232, HUD / 2);
  // ミス
  ctx.textAlign = 'right';
  ctx.fillText('ミス', VW - 78, HUD / 2);
  for (let i = 0; i < MISS_MAX; i++) {
    const x = VW - 62 + i * 20, y = HUD / 2;
    ctx.strokeStyle = i < G.miss ? '#B02A2A' : 'rgba(38,48,31,0.22)';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
    ctx.stroke();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  lcdBg();
  bigText('リナパパの', VW / 2, 44, 22, '#3C4A32', null);
  bigText('たまごキャッチ', VW / 2, 84, fitSize('たまごキャッチ', VW * 0.62, 46), INK, 'rgba(255,255,255,0.35)');
  bigText('といを ころがって くる たまごを かごで うけとめよう', VW / 2, 126, 16, '#3C4A32', null);
  bigText('行きたい ところを さわるだけ（画面の 4つの かど）', VW / 2, 150, 15, '#4A5A3E', null);

  // 4すみの みほん
  const bw = Math.min(150, VW * 0.19), bh = 44;
  for (let i = 0; i < 4; i++) {
    const px = VW / 2 + (i < 2 ? -1 : 1) * (bw / 2 + 6) - bw / 2;
    const py = 182 + (i % 2) * 52;
    ctx.fillStyle = 'rgba(38,48,31,0.14)';
    rr(px, py, bw, bh, 8); ctx.fill();
    bigText(['ひだり うえ', 'ひだり した', 'みぎ うえ', 'みぎ した'][i],
            px + bw / 2, py + bh / 2, fitSize('ひだり うえ', bw - 14, 15), INK, null);
  }

  const cw = Math.min(240, VW * 0.28);
  drawButton(button(VW / 2 - cw / 2, 296, cw, 50, startRun), 'はじめる', '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, 358, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#E8E0C0');
  drawButton(button(VW / 2 + 8, 358, sw, 36, () => sfxTest()), '♪ おと', '#E8E0C0');
  bigText('さいこう ' + save.hi + '　これまでに ' + save.eggs + 'こ うけた',
          VW / 2, VH - 20, 15, INK, null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(38,48,31,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  lcdBg();
  bigText('あそびかた', VW / 2, 40, 28, INK, 'rgba(255,255,255,0.35)');
  const lines = [
    '① たまごは 4本の といを「カチッ カチッ」と 1つずつ すべって くる',
    '② はしっこまで 来ると 下に 落ちる。そこに いれば うけとめられる',
    '③ 行きたい ばしょ（画面の 4つの かど）を さわるだけ。ゆびを つけた ままでも よい',
    '④ ひよこは 3てん。おとすと ミス。ミス 3つで おしまい',
    '⑤ 60てん ごとに ミスが 1つ もどる。うける ほど どんどん 速く なる',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 92 + i * 34, fitSize(s, VW * 0.88, 17), '#2E3A26', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 62, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'all' });
