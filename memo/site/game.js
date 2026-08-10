// りなの カードめくり（しんけいすいじゃく）
//
// ★ りな 対 パパ の こうたい せい。2まい めくって 同じなら もらえて もう1回。
//   パパは「見た カードを おぼえて いる ちから」が めんごとに 強く なる。
//   ぜんぶ めくり おわった とき、多い ほうの かち。
//
// ★ 小さい 子でも わかる ように
//     ・いま だれの ばん かを 大きく 出す
//     ・パパは わざと 1びょう 考えてから めくる（見て おぼえる 時間）
//     ・そろった カードは その場に のこして 数が 見えるように する

'use strict';

const GAME_VER = 1;
const HUD = 26;

// cols x rows と パパの おぼえる ちから（0〜1）
const STAGES = [
  { c: 4, r: 3, mem: 0.15, name: '1めん' },
  { c: 4, r: 4, mem: 0.30, name: '2めん' },
  { c: 5, r: 4, mem: 0.45, name: '3めん' },
  { c: 6, r: 4, mem: 0.60, name: '4めん' },
  { c: 6, r: 4, mem: 0.78, name: '5めん' },
  { c: 6, r: 4, mem: 0.95, name: 'さいご' },
];

const SAVE_KEY = 'memo.save.v1';
const save = { open: 1, clear: {}, win: 0, lose: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(STAGES.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (typeof s.win === 'number') save.win = s.win;
  if (typeof s.lose === 'number') save.lose = s.lose;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  cards: [], open: [], turn: 0,        // 0=りな 1=パパ
  score: [0, 0], waitT: 0, cpuT: 0, cpuPick: [],
  memory: {}, over: false, msg: '', msgT: 0, lockT: 0, left: 0,
};

function box() {
  const S = STAGES[G.stage];
  const top = HUD + 34, bot = 10, side = 96;
  const cw = Math.floor(Math.min((VW - side * 2 - (S.c + 1) * 8) / S.c, (VH - top - bot - (S.r + 1) * 8) / S.r * 0.78));
  const w = S.c * (cw + 8) + 8, h = S.r * (cw / 0.78 + 8) + 8;
  return { cw: cw, ch: cw / 0.78, x: Math.round((VW - w) / 2), y: top + Math.max(0, (VH - top - bot - h) / 2) };
}
function cardBox(B, i) {
  const S = STAGES[G.stage];
  const cx = i % S.c, cy = Math.floor(i / S.c);
  return { x: B.x + 8 + cx * (B.cw + 8), y: B.y + 8 + cy * (B.ch + 8), w: B.cw, h: B.ch };
}

function buildStage(n) {
  const S = STAGES[n];
  const total = S.c * S.r;
  const pairs = total / 2;
  const bag = ITEMS.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    const t = bag[i]; bag[i] = bag[k]; bag[k] = t;
  }
  const list = [];
  for (let i = 0; i < pairs; i++) {
    const it = bag[i % bag.length];
    const col = it.cols[Math.floor(i / bag.length) % it.cols.length];
    const kind = it.key + '|' + col;
    list.push({ kind: kind, item: it, col: col });
    list.push({ kind: kind, item: it, col: col });
  }
  for (let i = list.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    const t = list[i]; list[i] = list[k]; list[k] = t;
  }
  G.cards = list.map((c, i) => ({ i: i, kind: c.kind, item: c.item, col: c.col, up: false, gone: false, owner: -1, flip: 0 }));
  G.open = []; G.turn = 0; G.score = [0, 0];
  G.waitT = 0; G.cpuT = 0; G.cpuPick = []; G.memory = {};
  G.over = false; G.left = total / 2; G.lockT = 0;
}

function startStage(n) {
  G.stage = n;
  buildStage(n);
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(n); bgmHeat(0.15);
}

function say(s) { G.msg = s; G.msgT = 1.4; }

// --- めくる -------------------------------------------------------------------------

function remember(c) {
  const S = STAGES[G.stage];
  if (Math.random() < S.mem) G.memory[c.i] = c.kind;
}

function flip(i, who) {
  const c = G.cards[i];
  if (!c || c.up || c.gone || G.open.length >= 2 || G.waitT > 0) return;
  c.up = true; c.flip = 0.28;
  G.open.push(c);
  G.memory[c.i] = c.kind;      // 見た ものは おぼえる（りなも パパも）
  sfxTap();
  if (G.open.length === 2) {
    const [a, b] = G.open;
    if (a.kind === b.kind) {
      a.gone = true; b.gone = true; a.owner = who; b.owner = who;
      G.score[who]++; G.left--;
      delete G.memory[a.i]; delete G.memory[b.i];
      G.open = [];
      sfxPop();
      say(who === 0 ? 'そろった！ もう1回' : 'パパが そろえた…');
      G.waitT = 0.35;
      if (G.left <= 0) finish();
      else if (who === 1) G.cpuT = 0.9;
    } else {
      G.waitT = 1.1;
    }
  }
}

function closeOpen() {
  for (const c of G.open) c.up = false;
  G.open = [];
  G.turn = 1 - G.turn;
  if (G.turn === 1) G.cpuT = 0.9;
}

function finish() {
  G.over = true;
  const win = G.score[0] > G.score[1];
  if (win) {
    save.win++;
    save.clear[G.stage] = true;
    if (G.stage + 1 >= save.open) save.open = Math.min(STAGES.length, G.stage + 2);
  } else save.lose++;
  storeSave();
  bgmStop();
  if (win) sfxClear(true); else sfxOver();
}

// パパの ばん
function cpuMove() {
  const alive = G.cards.filter((c) => !c.gone && !c.up);
  if (!alive.length) return;
  // おぼえて いる 中に ペアが あるか
  const seen = {};
  for (const k in G.memory) {
    const c = G.cards[k];
    if (!c || c.gone) continue;
    (seen[G.memory[k]] = seen[G.memory[k]] || []).push(c);
  }
  for (const kind in seen) {
    if (seen[kind].length >= 2 && !seen[kind][0].up && !seen[kind][1].up) {
      G.cpuPick = [seen[kind][0].i, seen[kind][1].i];
      return;
    }
  }
  // 1まいめは 知らない カード、2まいめは おぼえて いれば それ
  const unknown = alive.filter((c) => G.memory[c.i] === undefined);
  const first = (unknown.length ? unknown : alive)[Math.floor(Math.random() * (unknown.length ? unknown.length : alive.length))];
  G.cpuPick = [first.i, -1];
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (const c of G.cards) if (c.flip > 0) c.flip -= dt;
  if (G.screen !== 'play' || G.over) return;

  if (G.waitT > 0) {
    G.waitT -= dt;
    if (G.waitT <= 0 && G.open.length === 2) closeOpen();
    return;
  }

  if (G.turn === 0) {
    const B = box();
    for (const t of IN.taps) {
      for (let i = 0; i < G.cards.length; i++) {
        const c = G.cards[i];
        if (c.gone) continue;
        const b = cardBox(B, i);
        if (t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h) { flip(i, 0); break; }
      }
    }
    return;
  }

  // パパ
  G.cpuT -= dt;
  if (G.cpuT > 0) return;
  if (G.open.length === 0) {
    cpuMove();
    if (!G.cpuPick.length) return;
    flip(G.cpuPick[0], 1);
    G.cpuT = 0.85;
  } else if (G.open.length === 1) {
    let second = G.cpuPick[1];
    if (second < 0 || G.cards[second].gone || G.cards[second].up) {
      const want = G.open[0].kind;
      second = -1;
      for (const k in G.memory) {
        const c = G.cards[k];
        if (!c || c.gone || c.up) continue;
        if (G.memory[k] === want) { second = c.i; break; }
      }
      if (second < 0) {
        const alive = G.cards.filter((c) => !c.gone && !c.up);
        second = alive[Math.floor(Math.random() * alive.length)].i;
      }
    }
    flip(second, 1);
    G.cpuT = 0.85;
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawCard(B, i) {
  const c = G.cards[i];
  const b = cardBox(B, i);
  const t = clamp(c.flip / 0.28, 0, 1);
  const k = c.up ? 1 - t : t;                 // 0..1 の めくり
  const sc = Math.abs(Math.cos(k * Math.PI / 2)) * 0.85 + 0.15;
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.scale(sc, 1);
  if (c.gone) ctx.globalAlpha = 0.5;
  if (c.up || c.gone) {
    ctx.fillStyle = c.owner === 0 ? '#FFE0EC' : (c.owner === 1 ? '#DCE8FF' : '#FFF8EC');
    rr(-b.w / 2, -b.h / 2, b.w, b.h, 8); ctx.fill();
    ctx.strokeStyle = c.owner === 0 ? '#FF6FA8' : (c.owner === 1 ? '#4A9BFF' : '#E8C89A');
    ctx.lineWidth = 3;
    rr(-b.w / 2, -b.h / 2, b.w, b.h, 8); ctx.stroke();
    c.item.draw(0, 0, Math.min(b.w, b.h) * 0.33, c.col);
  } else {
    ctx.fillStyle = '#6A4AA8';
    rr(-b.w / 2, -b.h / 2, b.w, b.h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, (b.h - 8) * 0.4, 6); ctx.fill();
    ctx.strokeStyle = '#C8A8F0'; ctx.lineWidth = 2;
    rr(-b.w / 2 + 5, -b.h / 2 + 5, b.w - 10, b.h - 10, 6); ctx.stroke();
    ctx.fillStyle = '#FFD24A';
    const s = Math.min(b.w, b.h) * 0.17;
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const a = -Math.PI / 2 + j * Math.PI / 5;
      const r = j % 2 ? s * 0.42 : s;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawPlay() {
  bgGrad('#3A2A5E', '#150F26');
  const B = box();
  for (let i = 0; i < G.cards.length; i++) drawCard(B, i);

  // 左右の プレイヤー
  const turnMe = G.turn === 0;
  const lx = Math.max(46, B.x / 2), rx = VW - Math.max(46, B.x / 2);
  const cy = VH * 0.52;
  ctx.save();
  ctx.globalAlpha = turnMe ? 1 : 0.5;
  drawRinaFace(lx, cy - 26, 26, G.over ? (G.score[0] > G.score[1] ? 'happy' : 'sad') : 'normal');
  ctx.restore();
  bigText('りな', lx, cy + 14, 15, turnMe ? '#FFD24A' : '#9A90B8', null);
  bigText(String(G.score[0]), lx, cy + 40, 26, '#FF9AC0');
  ctx.save();
  ctx.globalAlpha = turnMe ? 0.5 : 1;
  drawPapa(rx, cy - 12, 26, { dir: -1, walk: 0, shirt: '#4AA0E0' });
  ctx.restore();
  bigText('パパ', rx, cy + 14, 15, !turnMe ? '#FFD24A' : '#9A90B8', null);
  bigText(String(G.score[1]), rx, cy + 40, 26, '#8AC8FF');

  bigText(turnMe ? 'りなの ばん！' : 'パパの ばん…', VW / 2, HUD + 16, 20,
          turnMe ? '#FFD24A' : '#8AC8FF');

  drawHud();
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH - 18, 18, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    const win = G.score[0] > G.score[1];
    const draw2 = G.score[0] === G.score[1];
    drawResult(win, draw2 ? 'ひきわけ！' : (win ? 'りなの かち！' : 'パパの かち…'),
      ['りな ' + G.score[0] + '　—　パパ ' + G.score[1],
       win ? 'つぎの めんが ひらいたよ' : 'もういちど ちょうせん しよう'],
      win && G.stage < STAGES.length - 1
        ? [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startStage(G.stage) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
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
  ctx.fillText('のこり ' + G.left + 'くみ', 74, HUD / 2);
  ctx.fillText('パパの きおく ' + Math.round(STAGES[G.stage].mem * 100) + '%', 176, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('かち ' + save.win + '　まけ ' + save.lose, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#3A2A5E', '#150F26');
  bigText('りなの', VW / 2, 38, 20, '#FFC0DC');
  bigText('カードめくり', VW / 2, 74, fitSize('カードめくり', VW * 0.6, 44), '#FFD24A');
  bigText('2まい めくって 同じ 絵なら もらえる。パパと しょうぶ！', VW / 2, 114, 16, '#DDE8FF', null);
  bigText('めんが すすむと パパの きおく力が どんどん 強く なる', VW / 2, 138, 15, '#B8A8E8', null);
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 164,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 34, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 34, () => sfxTest()), '♪ おと', '#C8BCE8');
  bigText('りな ' + save.win + 'かち　パパ ' + save.lose + 'かち', VW / 2, VH - 16, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#3A2A5E', '#150F26');
  bigText('あそびかた', VW / 2, 38, 26, '#FFD24A');
  const lines = [
    '① じぶんの ばんに カードを 2まい タップして めくる',
    '② 同じ 絵なら もらえて、もう 1回 めくれる',
    '③ ちがったら うらに もどって パパの ばん',
    '④ 見た カードは おぼえて おこう。ばしょを おぼえる ゲーム',
    '⑤ ぜんぶ めくり おわった とき、多い ほうの かち',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 84 + i * 32, fitSize(s, VW * 0.88, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
