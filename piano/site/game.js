// りなの ピアノきょうしつ
//
// ★ おと ファイルは 1つも つかわない。けんばんを おした とき その場で 音を 作る。
//
// ★ ふたつの あそびかた
//     じゆう … すきに ひく。まちがいは ない。
//     れんしゅう … つぎに おす けんばんが 光る。おすと 先へ すすむ。
//        時間で 追いたてない ので、ゆっくりでも かならず 1曲 ひける。
//        （小さい 子が いちばん うれしいのは「さいごまで ひけた」こと）

'use strict';

const GAME_VER = 1;
const HUD = 26;

// けんばん … ド(C4=60) から 2オクターブ ちょっと
const WHITE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84];
const NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'];
// くろい けん（しろい けん 何ばんめの 右に つくか）
const BLACK = [[0, 61], [1, 63], [3, 66], [4, 68], [5, 70],
               [7, 73], [8, 75], [10, 78], [11, 80], [12, 82]];

const SONGS = [
  { name: 'きらきらぼし', notes: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60,
                                  67, 67, 65, 65, 64, 64, 62, 67, 67, 65, 65, 64, 64, 62,
                                  60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60] },
  { name: 'ちょうちょう', notes: [67, 64, 64, 65, 62, 62, 60, 62, 64, 65, 67, 67, 67,
                                  67, 64, 64, 65, 62, 62, 60, 64, 67, 67, 64, 60] },
  { name: 'かえるのがっしょう', notes: [60, 62, 64, 65, 64, 62, 60, 64, 65, 67, 69, 67, 65, 64,
                                        60, 60, 60, 60, 60, 62, 64, 65, 64, 62, 60] },
  { name: 'メリーさんのひつじ', notes: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67,
                                        64, 62, 60, 62, 64, 64, 64, 64, 62, 62, 64, 62, 60] },
  { name: 'ロンドンばし', notes: [67, 69, 67, 65, 64, 65, 67, 62, 64, 65, 64, 65, 67,
                                  67, 69, 67, 65, 64, 65, 67, 62, 67, 64, 60] },
  { name: 'よろこびのうた', notes: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62,
                                    64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60] },
  { name: 'ジングルベル', notes: [64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64,
                                  65, 65, 65, 65, 65, 64, 64, 64, 64, 62, 62, 64, 62, 67] },
  { name: 'ハッピーバースデー', notes: [60, 60, 62, 60, 65, 64, 60, 60, 62, 60, 67, 65,
                                        60, 60, 72, 69, 65, 64, 62, 70, 70, 69, 65, 67, 65] },
];

const SAVE_KEY = 'piano.save.v1';
const save = { done: {}, best: {}, notes: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.done && typeof s.done === 'object') save.done = s.done;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (typeof s.notes === 'number') save.notes = s.notes;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, song: -1,
  at: 0, miss: 0, done: false, hit: {}, labels: true,
  msg: '', msgT: 0, sparks: [],
};

// --- おと ---------------------------------------------------------------------------

function noteHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function playNote(m, vol) {
  audioStart();
  if (!A.ctx) return;
  const t = A.ctx.currentTime + 0.002;
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.30, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  g.connect(A.sfx);
  const o1 = A.ctx.createOscillator();
  o1.type = 'triangle'; o1.frequency.value = noteHz(m);
  const o2 = A.ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = noteHz(m + 12);
  const g2 = A.ctx.createGain(); g2.gain.value = 0.34;
  o1.connect(g); o2.connect(g2); g2.connect(g);
  o1.start(t); o2.start(t);
  o1.stop(t + 1.6); o2.stop(t + 1.6);
}

function noteName(m) {
  const k = ((m % 12) + 12) % 12;
  const map = { 0: 'ド', 2: 'レ', 4: 'ミ', 5: 'ファ', 7: 'ソ', 9: 'ラ', 11: 'シ',
                1: 'ド#', 3: 'レ#', 6: 'ファ#', 8: 'ソ#', 10: 'ラ#' };
  return map[k];
}

// --- けんばん -----------------------------------------------------------------------

function board() {
  const top = VH * 0.46;
  const h = VH - top - 8;
  const w = (VW - 16) / WHITE.length;
  return { x: 8, y: top, w: w, h: h };
}
function whiteBox(B, i) { return { x: B.x + i * B.w, y: B.y, w: B.w - 2, h: B.h }; }
function blackBox(B, i) {
  const bw = B.w * 0.62;
  return { x: B.x + (BLACK[i][0] + 1) * B.w - bw / 2 - 1, y: B.y, w: bw, h: B.h * 0.62 };
}

function press(m) {
  playNote(m);
  save.notes++;
  G.hit[m] = 0.25;
  const B = board();
  for (let i = 0; i < WHITE.length; i++) {
    if (WHITE[i] !== m) continue;
    const b = whiteBox(B, i);
    for (let k = 0; k < 6; k++) {
      G.sparks.push({ x: b.x + b.w / 2, y: b.y, vx: (Math.random() - 0.5) * 120,
                      vy: -60 - Math.random() * 120, t: 0.6 });
    }
  }
  if (G.song >= 0 && !G.done) {
    const want = SONGS[G.song].notes[G.at];
    if (m === want) {
      G.at++;
      if (G.at >= SONGS[G.song].notes.length) finishSong();
    } else {
      G.miss++;
      G.msg = 'つぎは ' + noteName(want);
      G.msgT = 1.0;
    }
  }
  if (save.notes % 20 === 0) storeSave();
}

function finishSong() {
  G.done = true;
  const key = 's' + G.song;
  save.done[key] = true;
  if (save.best[key] === undefined || G.miss < save.best[key]) save.best[key] = G.miss;
  storeSave();
  sfxClear(G.miss === 0);
}

function startSong(i) {
  G.song = i; G.at = 0; G.miss = 0; G.done = false;
  G.screen = 'play';
  save.plays++; storeSave();
  audioStart();
}
function startFree() {
  G.song = -1; G.at = 0; G.miss = 0; G.done = false;
  G.screen = 'play';
  audioStart();
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (const k in G.hit) { G.hit[k] -= dt; if (G.hit[k] <= 0) delete G.hit[k]; }
  for (let i = G.sparks.length - 1; i >= 0; i--) {
    const s = G.sparks[i];
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt;
    if (s.t <= 0) G.sparks.splice(i, 1);
  }
  if (G.screen !== 'play') return;
  const B = board();
  for (const t of IN.taps) {
    let done = false;
    for (let i = 0; i < BLACK.length; i++) {
      const b = blackBox(B, i);
      if (t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h) {
        press(BLACK[i][1]); done = true; break;
      }
    }
    if (done) continue;
    for (let i = 0; i < WHITE.length; i++) {
      const b = whiteBox(B, i);
      if (t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h) { press(WHITE[i]); break; }
    }
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawKeys() {
  const B = board();
  const want = G.song >= 0 && !G.done ? SONGS[G.song].notes[G.at] : -1;
  for (let i = 0; i < WHITE.length; i++) {
    const m = WHITE[i], b = whiteBox(B, i);
    const on = G.hit[m] !== undefined;
    const guide = m === want;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(b.x + 2, b.y + 3, b.w, b.h, 6); ctx.fill();
    ctx.fillStyle = on ? '#FFE9A8' : (guide ? '#FFF2B8' : '#FFFDF6');
    rr(b.x, b.y + (on ? 3 : 0), b.w, b.h, 6); ctx.fill();
    if (guide) {
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(G.t * 6);
      ctx.strokeStyle = '#FF6FA8'; ctx.lineWidth = 4;
      rr(b.x, b.y, b.w, b.h, 6); ctx.stroke();
      ctx.restore();
    }
    if (G.labels) {
      const nm = NAMES[[0, 2, 4, 5, 7, 9, 11].indexOf(((m % 12) + 12) % 12)];
      bigText(nm, b.x + b.w / 2, b.y + b.h - 16, fitSize(nm, b.w - 6, 15), '#8A7A90', null);
    }
    if (m === 60 || m === 72 || m === 84) {
      ctx.fillStyle = '#E8B0C8';
      circle(b.x + b.w / 2, b.y + b.h - 32, 3.5); ctx.fill();
    }
  }
  for (let i = 0; i < BLACK.length; i++) {
    const m = BLACK[i][1], b = blackBox(B, i);
    const on = G.hit[m] !== undefined;
    const guide = m === want;
    ctx.fillStyle = on ? '#6A5A78' : (guide ? '#7A4A66' : '#2E2838');
    rr(b.x, b.y + (on ? 3 : 0), b.w, b.h, 5); ctx.fill();
    if (guide) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.t * 6);
      ctx.strokeStyle = '#FF6FA8'; ctx.lineWidth = 3;
      rr(b.x, b.y, b.w, b.h, 5); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(b.x + 2, b.y + 2, b.w - 4, b.h * 0.28, 3); ctx.fill();
  }
  for (const s of G.sparks) {
    ctx.globalAlpha = clamp(s.t * 1.6, 0, 1);
    ctx.fillStyle = ['#FFD24A', '#FF9AC0', '#8AD8F0'][Math.floor(s.x) % 3];
    circle(s.x, s.y, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPlay() {
  bgGrad('#4A3266', '#160E24');
  // がくふ（つぎの 音の ならび）
  if (G.song >= 0) {
    const S = SONGS[G.song];
    const y = HUD + 40;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    rr(10, HUD + 8, VW - 20, 64, 10); ctx.fill();
    const show = 11;
    const from = Math.max(0, Math.min(G.at - 3, S.notes.length - show));
    for (let i = 0; i < show; i++) {
      const k = from + i;
      if (k >= S.notes.length) break;
      const x = 30 + i * ((VW - 60) / show);
      const cur = k === G.at;
      const past = k < G.at;
      ctx.fillStyle = cur ? '#FFD24A' : (past ? 'rgba(140,240,168,0.55)' : 'rgba(255,255,255,0.20)');
      circle(x, y, cur ? 15 : 11); ctx.fill();
      bigText(noteName(S.notes[k]), x, y, cur ? 13 : 10, cur ? '#3A2A18' : '#F0EAFF', null);
    }
    bigText(S.name, VW / 2, HUD + 20, 15, '#FFC0DC', null);
    ctx.textAlign = 'left';
  } else {
    bigText('じゆうに ひいて みよう', VW / 2, HUD + 40, 24, '#FFD24A');
    bigText('けんばんを タップすると 音が 出る', VW / 2, HUD + 66, 15, '#DCC8F0', null);
  }
  drawKeys();
  drawHud();
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH * 0.40, 22, '#FF9AC0');
    ctx.globalAlpha = 1;
  }
  if (G.done) {
    drawResult(true, G.miss === 0 ? 'かんぺき！' : 'ひけた！',
      [SONGS[G.song].name + ' さいごまで ひけた',
       'まちがえ ' + G.miss + 'かい' + (G.miss === 0 ? '　すごい！' : '')],
      G.song < SONGS.length - 1
        ? [{ label: 'つぎの きょく', on: () => startSong(G.song + 1) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startSong(G.song) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(G.song >= 0 ? SONGS[G.song].name : 'じゆうに ひく', 10, HUD / 2);
  if (G.song >= 0) {
    ctx.fillStyle = '#E8E0FF';
    ctx.fillText('すすんだ ' + G.at + ' / ' + SONGS[G.song].notes.length + '　まちがえ ' + G.miss,
                 176, HUD / 2);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(VW - 196, 2, 88, HUD - 4, () => { G.labels = !G.labels; }),
             G.labels ? 'ドレミ ON' : 'ドレミ OFF', 'rgba(255,255,255,0.8)');
  drawButton(button(VW - 100, 2, 90, HUD - 4, () => { G.screen = 'title'; }), 'メニュー', 'rgba(255,255,255,0.8)');
}

function drawTitle() {
  bgGrad('#4A3266', '#160E24');
  bigText('りなの', VW / 2, 34, 20, '#FFC0DC');
  bigText('ピアノきょうしつ', VW / 2, 70, fitSize('ピアノきょうしつ', VW * 0.6, 42), '#FFD24A');
  bigText('つぎに おす けんばんが 光る。ゆっくりでも さいごまで ひける', VW / 2, 108, 16, '#E8DCFF', null);
  const cols = VW > 820 ? 4 : 3;
  const cw = Math.min(190, (VW - 60 - (cols - 1) * 10) / cols), ch = 44;
  let by = 132;
  for (let i = 0; i < SONGS.length; i++) {
    const x = (VW - (cols * cw + (cols - 1) * 10)) / 2 + (i % cols) * (cw + 10);
    const y = by + Math.floor(i / cols) * (ch + 8);
    const b = button(x, y, cw, ch, () => startSong(i));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(b.x + 3, b.y + 3, cw, ch, 9); ctx.fill();
    ctx.fillStyle = save.done['s' + i] ? '#FFD24A' : '#6A5A9A';
    rr(b.x, b.y, cw, ch, 9); ctx.fill();
    bigText(SONGS[i].name, b.x + cw / 2, b.y + 16, fitSize(SONGS[i].name, cw - 12, 16),
            save.done['s' + i] ? '#2A2038' : '#FFF', null);
    const bs = save.best['s' + i];
    bigText(bs === undefined ? SONGS[i].notes.length + '音' : 'まちがえ ' + bs,
            b.x + cw / 2, b.y + 32, 12,
            save.done['s' + i] ? 'rgba(42,32,56,0.8)' : 'rgba(255,255,255,0.7)', null);
  }
  by += Math.ceil(SONGS.length / cols) * (ch + 8) + 8;
  const bw = Math.min(240, VW * 0.3);
  drawButton(button(VW / 2 - bw / 2, by, bw, 42, () => startFree()), 'じゆうに ひく', '#8AD8F0');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, by + 50, sw, 30, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, by + 50, sw, 30, () => { playNote(60); playNote(64); playNote(67); }),
             '♪ おと', '#C8BCE8');
  bigText('これまでに ' + save.notes + '音 ひいた', VW / 2, VH - 14, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#4A3266', '#160E24');
  bigText('あそびかた', VW / 2, 38, 26, '#FFD24A');
  const lines = [
    '① けんばんを タップすると 音が 出る。じゆうに ひいて よい',
    '② きょくを えらぶと、つぎに おす けんばんが ピンクに 光る',
    '③ 時間で 追われない。ゆっくり おしても だいじょうぶ',
    '④ ちがう けんばんを おしても 先に すすまないだけ。こわくない',
    '⑤ さいごまで ひけたら クリア。まちがえ 0回を めざそう',
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
