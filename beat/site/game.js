// ゆいの 超高速リズム
//
// ★ 音符が 右から 左へ ながれて くる。左の たて線に 重なった しゅんかんに
//   その れつを タップする。だんだん 曲が 速く なって いく。
//
// ★ 音と 音符が ずれない ように、じかんは ぜんぶ **音の とけい**
//   （AudioContext の currentTime）で かぞえる。
//   タップも「さわった しゅんかんの 音の とけい」で しらべるので、
//   画面の コマ（16ミリびょう）より こまかく はんていできる。
//
// ★ 曲は その場で 作る。ならんで いる 音符が そのまま メロディに なる ので、
//   見えて いる ものと 聞こえて いる ものが かならず 一致する。

'use strict';

const GAME_VER = 1;
const HUD = 26;
const LANES = 4;

// れつの 色（上から）
const LCOL = ['#FF6FA8', '#FFC63A', '#7ADCB0', '#8AB4FF'];
const LKEY = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];

// 1しょうせつ（16こま）の かた。'.' 休み / '1'〜'4' その れつ
// 'a'=1と3 / 'b'=2と4 / 'c'=1と4 / 'd'=2と3 の 同時おし
const PATS = {
  easy: [
    '1...2...3...4...',
    '1...1...2...2...',
    '4...3...2...1...',
    '1...3...1...3...',
    '2...4...2...4...',
    '1.......3...4...',
  ],
  mid: [
    '1...2...3.4.....',
    '1.1.2...3...4...',
    '4...3.2...1.....',
    '1...2...a.......',
    '2.3...4.....2.1.',
    '1.2...3.4.......',
  ],
  hard: [
    '1.2.3.4.........',
    '1...1.2.3...4...',
    'a...2.3.........',
    '1.2.....3.4.....',
    '4.3.2.1.........',
    '1...12..3...4...',
    '1.3.2.4.........',
    '12..34..1.......',
  ],
  ultra: [
    '1234....a.......',
    '1.2.3.4.........',
    'a...1234........',
    '12..34..........',
    '1.2.3.4.a.......',
    '1.1.2.2.........',
    'a.b.1.2.........',
    '1234....b.......',
  ],
};

// 曲。だんだん はやく なる。
const SONGS = [
  { name: 'あさのしたく', bpm: 120, tier: 'easy',  key: 0 },
  { name: 'スキップ',     bpm: 140, tier: 'easy',  key: 2 },
  { name: 'おかしのくに', bpm: 160, tier: 'mid',   key: 5 },
  { name: 'かけっこ',     bpm: 182, tier: 'mid',   key: 7 },
  { name: 'しんかんせん', bpm: 205, tier: 'hard',  key: 3 },
  { name: 'なぞのマシン', bpm: 228, tier: 'hard',  key: 8 },
  { name: 'ほしのスピード', bpm: 250, tier: 'ultra', key: 10 },
  { name: '超高速！',     bpm: 276, tier: 'ultra', key: 5 },
];

// 音符が 右から 左へ わたる じかん（びょう）。小さいほど 速い＝むずかしい。
const SPEEDS = [2.30, 1.90, 1.55, 1.25, 1.00];
const SPEED_NAME = ['ゆっくり', 'すこし はやい', 'ふつう', 'はやい', '超高速'];

// はんていの まど（びょう）
const W_PERFECT = 0.055, W_GOOD = 0.115;

const SAVE_KEY = 'beat.save.v1';
const save = { open: 1, best: {}, rank: {}, speed: 2, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = s.open;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (s.rank && typeof s.rank === 'object') save.rank = s.rank;
  if (typeof s.speed === 'number') save.speed = Math.max(0, Math.min(4, s.speed));
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, song: 0, S: SONGS[0],
  chart: [], hitI: 0, schedI: 0, drumI: 0,
  t0: 0, useAudio: true, wall0: 0,
  perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0,
  gauge: 60, over: false, endT: 0,
  judge: '', judgeT: 0, judgeCol: '#FFF',
  flash: [0, 0, 0, 0], hitFx: [], bars: 0, songLen: 0,
};

// --- ふりつけ（チャート）を つくる ---------------------------------------------------

const CHORD = { a: [0, 2], b: [1, 3], c: [0, 3], d: [1, 2] };
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];

function buildChart(S) {
  const spb = 60 / S.bpm;             // 1はく の びょうすう
  const step = spb / 4;               // 16ぶおんぷ
  const pats = PATS[S.tier];
  // 50びょう くらいに なる ように しょうせつ数を きめる
  const bars = Math.max(12, Math.min(48, Math.round(50 / (spb * 4))));
  const notes = [];
  let seed = S.bpm * 7919 + S.key * 104729;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let b = 0; b < bars; b++) {
    // 4しょうせつ ごとに 同じ かたを くりかえす と 曲らしく なる
    const pi = (b % 4 < 2) ? Math.floor(rnd() * pats.length) : Math.floor(rnd() * pats.length);
    const pat = pats[(pi + (b >> 2)) % pats.length];
    for (let i = 0; i < 16; i++) {
      const ch = pat[i];
      if (ch === '.') continue;
      const t = (b * 16 + i) * step;
      const lanes = CHORD[ch] ? CHORD[ch] : [parseInt(ch, 10) - 1];
      for (const ln of lanes) {
        if (ln < 0 || ln >= LANES) continue;
        notes.push({ t: t, lane: ln, hit: 0,
                     mid: 60 + S.key + SCALE[(ln + (i % 2) * 3) % SCALE.length] });
      }
    }
  }
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  return { notes: notes, bars: bars, len: bars * 16 * step + 2.2, spb: spb };
}

// --- はじめる ----------------------------------------------------------------------

function startSong(i) {
  audioStart();
  G.song = i; G.S = SONGS[i];
  const c = buildChart(G.S);
  G.chart = c.notes; G.bars = c.bars; G.songLen = c.len;
  G.hitI = 0; G.schedI = 0; G.drumI = 0;
  G.perfect = 0; G.good = 0; G.miss = 0; G.combo = 0; G.maxCombo = 0; G.score = 0;
  G.gauge = 60; G.over = false; G.endT = 0;
  G.judge = ''; G.judgeT = 0; G.hitFx = [];
  G.useAudio = soundOK();
  G.t0 = (G.useAudio ? anow() : 0) + 2.2;      // 2.2びょう まってから はじまる
  G.wall0 = performance.now() / 1000 + 2.2;
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStop();
}

function soundOK() { return !!(A.ctx && A.ctx.state === 'running'); }
function songTime() {
  return (G.useAudio && A.ctx) ? anow() - G.t0 : performance.now() / 1000 - G.wall0;
}
function tapTime(tp) {
  if (G.useAudio && A.ctx && tp.at) return tp.at - G.t0;
  return songTime();
}

// --- 音（見えて いる 音符が そのまま メロディ） ---------------------------------------

function schedule() {
  if (!G.useAudio || !A.ctx) return;
  const now = songTime();
  // メロディ＝音符
  while (G.schedI < G.chart.length && G.chart[G.schedI].t < now + 1.3) {
    const n = G.chart[G.schedI];
    tone(G.t0 + n.t, n.mid, G.S.tier === 'ultra' ? 0.10 : 0.14, 0.085, 'square', A.mus);
    G.schedI++;
  }
  // ドラムと ベース
  const spb = 60 / G.S.bpm;
  while (G.drumI * spb < now + 1.3 && G.drumI * spb < G.songLen) {
    const t = G.t0 + G.drumI * spb;
    const b = G.drumI % 4;
    if (b === 0 || b === 2) kick(t, 0.55);
    if (b === 1 || b === 3) nz(t, 0.06, 0.12, 1200, 5000, A.mus);
    nz(t + spb / 2, 0.024, 0.045, 6000, 12000, A.mus);
    const root = 36 + G.S.key + [0, 0, 5, 7][Math.floor(G.drumI / 4) % 4];
    tone(t, root, spb * 0.45, 0.11, 'square', A.mus);
    tone(t + spb / 2, root + 12, spb * 0.25, 0.07, 'square', A.mus);
    G.drumI++;
  }
}

// --- はんてい ----------------------------------------------------------------------

function laneOf(y) {
  const B = laneBox();
  const i = Math.floor((y - B.y) / B.h);
  return (i < 0 || i >= LANES) ? -1 : i;
}

function judge(lane, tt) {
  // その れつの まだ たたいて いない 音符の うち、いちばん 近い もの
  let best = null, bd = 1e9;
  for (let i = G.hitI; i < G.chart.length; i++) {
    const n = G.chart[i];
    if (n.t - tt > W_GOOD + 0.05) break;
    if (n.hit || n.lane !== lane) continue;
    const d = Math.abs(n.t - tt);
    if (d < bd) { bd = d; best = n; }
  }
  G.flash[lane] = 0.14;
  if (!best || bd > W_GOOD) { sfxTap(); return; }   // からぶりは 減点なし
  best.hit = bd <= W_PERFECT ? 1 : 2;
  if (bd <= W_PERFECT) {
    G.perfect++; G.combo++; G.score += 300 + Math.min(200, G.combo * 2);
    G.gauge = Math.min(100, G.gauge + 1.2);
    say('パーフェクト！', '#FFD24A');
    sfxHit();
  } else {
    G.good++; G.combo++; G.score += 120 + Math.min(80, G.combo);
    G.gauge = Math.min(100, G.gauge + 0.6);
    say('グッド', '#7ADCB0');
    sfxTap();
  }
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  G.hitFx.push({ lane: lane, t: 0.3, big: best.hit === 1 });
}

function say(s, col) { G.judge = s; G.judgeT = 0.42; G.judgeCol = col; }

// --- まいコマ ----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.judgeT > 0) G.judgeT -= dt;
  for (let i = 0; i < LANES; i++) if (G.flash[i] > 0) G.flash[i] -= dt;
  for (const f of G.hitFx) f.t -= dt;
  G.hitFx = G.hitFx.filter((f) => f.t > 0);
  if (G.screen !== 'play') return;

  schedule();
  const now = songTime();

  // タップ
  for (const tp of IN.taps) {
    const ln = laneOf(tp.y);
    if (ln < 0) continue;
    judge(ln, tapTime(tp));
  }
  for (let i = 0; i < LANES; i++) {
    if (KEYS[LKEY[i]] && !G.kd0[i]) judge(i, now);
    G.kd0[i] = !!KEYS[LKEY[i]];
  }

  // のがした 音符
  while (G.hitI < G.chart.length) {
    const n = G.chart[G.hitI];
    if (n.hit) { G.hitI++; continue; }
    if (n.t + W_GOOD >= now) break;
    n.hit = 3;
    G.miss++; G.combo = 0;
    G.gauge = Math.max(0, G.gauge - 4);
    say('ミス', '#FF8AA8');
    G.hitI++;
  }

  if (!G.over && now > G.songLen) endSong();
}

function endSong() {
  G.over = true;
  const total = G.perfect + G.good + G.miss;
  const acc = total ? (G.perfect + G.good * 0.5) / total : 0;
  G.acc = acc;
  G.rank = acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.55 ? 'C' : 'D';
  G.score += G.maxCombo * 20;
  const k = 's' + G.song;
  if (!save.best[k] || G.score > save.best[k]) save.best[k] = G.score;
  const order = { D: 0, C: 1, B: 2, A: 3, S: 4 };
  if (!save.rank[k] || order[G.rank] > order[save.rank[k]]) save.rank[k] = G.rank;
  if (order[G.rank] >= 1) save.open = Math.max(save.open, Math.min(SONGS.length, G.song + 2));
  storeSave();
  if (order[G.rank] >= 3) sfxClear(G.rank === 'S'); else sfxGet();
  G.screen = 'result';
}

G.kd0 = [false, false, false, false];

// --- 絵 ---------------------------------------------------------------------------

function laneBox() {
  const top = HUD + 10, bot = 34;
  return { x: 0, y: top, w: VW, h: (VH - top - bot) / LANES };
}
function hitX() { return VW * 0.19; }

function drawYui(x, y, s, beat, mood) {
  const bob = Math.sin(beat * Math.PI * 2) * s * 0.10;
  y += bob;
  ctx.fillStyle = '#503323';
  rr(x - s * 1.05, y - s * 0.2, s * 2.1, s * 1.0, s * 0.3); ctx.fill();
  circle(x, y - s * 0.04, s * 1.10); ctx.fill();
  ctx.fillStyle = '#FFE0C8';
  circle(x, y, s); ctx.fill();
  ctx.fillStyle = '#503323';
  ctx.beginPath(); ctx.arc(x, y - s * 0.14, s * 0.99, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill();
  const ey = y + s * 0.12, ex = s * 0.38;
  if (mood === 'ng') {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(2, s * 0.10); ctx.lineCap = 'round';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * ex - s * 0.13, ey); ctx.lineTo(x + sg * ex + s * 0.13, ey);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2A2028';
    for (const sg of [-1, 1]) { circle(x + sg * ex, ey, s * 0.17); ctx.fill(); }
    ctx.fillStyle = '#FFF';
    for (const sg of [-1, 1]) { circle(x + sg * ex - s * 0.05, ey - s * 0.06, s * 0.07); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.63, y + s * 0.32, s * 0.16); ctx.fill(); }
  ctx.strokeStyle = '#B4485E'; ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.beginPath(); ctx.arc(x, y + s * 0.36, s * 0.26, 0.2, Math.PI - 0.2); ctx.stroke();
  // リボン
  ctx.fillStyle = '#FFC63A';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.80, y - s * 0.78);
  ctx.lineTo(x + s * 1.22, y - s * 0.98); ctx.lineTo(x + s * 1.22, y - s * 0.54);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.80, y - s * 0.78);
  ctx.lineTo(x + s * 0.40, y - s * 0.98); ctx.lineTo(x + s * 0.40, y - s * 0.54);
  ctx.closePath(); ctx.fill();
  circle(x + s * 0.80, y - s * 0.78, s * 0.15); ctx.fill();
}

function drawPlay() {
  const B = laneBox(), hx = hitX();
  const now = songTime();
  const appr = SPEEDS[save.speed];
  const pps = (VW - hx) / appr;        // 1びょうに すすむ ながさ
  const beat = now / (60 / G.S.bpm);

  bgGrad('#2A1240', '#0C0618');
  // うしろで ひかる
  const pulse = Math.max(0, 1 - (beat - Math.floor(beat)));
  ctx.fillStyle = 'rgba(255,120,200,' + (0.05 + pulse * 0.06) + ')';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  // れつ
  for (let i = 0; i < LANES; i++) {
    const y = B.y + i * B.h;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.075)';
    ctx.fillRect(0, y, VW, B.h - 2);
    if (G.flash[i] > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (G.flash[i] * 2.2) + ')';
      ctx.fillRect(0, y, VW, B.h - 2);
    }
    // 左はしの れつ色
    ctx.fillStyle = LCOL[i];
    ctx.fillRect(0, y, 6, B.h - 2);
  }

  // たたく 線
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(hx - 2, B.y, 4, B.h * LANES - 2);
  for (let i = 0; i < LANES; i++) {
    const cy = B.y + i * B.h + B.h / 2;
    ctx.strokeStyle = LCOL[i]; ctx.lineWidth = 3;
    circle(hx, cy, B.h * 0.34); ctx.stroke();
  }

  // 音符
  for (let i = Math.max(0, G.hitI - 8); i < G.chart.length; i++) {
    const n = G.chart[i];
    const dx = (n.t - now) * pps;
    if (dx > VW - hx + 40) break;
    if (n.hit || dx < -hx - 40) continue;
    const x = hx + dx, cy = B.y + n.lane * B.h + B.h / 2;
    const r = B.h * 0.30;
    ctx.fillStyle = LCOL[n.lane];
    circle(x, cy, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    circle(x - r * 0.3, cy - r * 0.32, r * 0.3); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    circle(x, cy, r); ctx.stroke();
  }

  // たたいた あとの わ
  for (const f of G.hitFx) {
    const cy = B.y + f.lane * B.h + B.h / 2;
    const k = 1 - f.t / 0.3;
    ctx.strokeStyle = (f.big ? 'rgba(255,210,74,' : 'rgba(122,220,176,') + (1 - k) + ')';
    ctx.lineWidth = 4;
    circle(hx, cy, B.h * (0.34 + k * 0.5)); ctx.stroke();
  }

  // ゆい
  drawYui(hx * 0.45, B.y + B.h * LANES * 0.5, Math.min(34, B.h * 0.5), beat,
          G.combo === 0 && G.miss > 0 ? 'ng' : 'happy');

  // コンボ
  if (G.combo >= 3) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    bigText(String(G.combo), VW * 0.60, B.y + B.h * LANES * 0.30, 52, '#FFD24A');
    bigText('コンボ', VW * 0.60, B.y + B.h * LANES * 0.30 + 38, 16, '#FFE8B0', null);
    ctx.restore();
  }
  if (G.judgeT > 0) {
    ctx.globalAlpha = Math.min(1, G.judgeT * 3);
    bigText(G.judge, hx + VW * 0.16, B.y + B.h * LANES * 0.66, 26, G.judgeCol);
    ctx.globalAlpha = 1;
  }

  // はじまる まえの カウント
  if (now < 0) {
    const c = Math.ceil(-now / (60 / G.S.bpm) / 1);
    bigText(now > -0.5 ? 'スタート！' : String(Math.min(9, Math.ceil(-now))),
            VW / 2, VH * 0.45, 56, '#FFF');
  }

  drawHud(now);
}

function drawHud(now) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A'; ctx.fillText(String(G.score), 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#E8DFFF';
  ctx.fillText(G.S.name + '  ' + G.S.bpm + 'BPM', 110, HUD / 2);
  ctx.fillText('さいこう ' + G.maxCombo + 'コンボ', 300, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText(SPEED_NAME[save.speed], VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // ゲージ と すすみぐあい
  const gw = Math.min(220, VW * 0.26);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(VW - gw - 130, 5, gw, 8, 4); ctx.fill();
  ctx.fillStyle = G.gauge > 55 ? '#7ADCB0' : G.gauge > 25 ? '#FFD24A' : '#FF7A9A';
  rr(VW - gw - 130, 5, gw * (G.gauge / 100), 8, 4); ctx.fill();
  const k = Math.max(0, Math.min(1, now / G.songLen));
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, HUD - 3, VW, 3);
  ctx.fillStyle = '#FF6FA8';
  ctx.fillRect(0, HUD - 3, VW * k, 3);
}

// --- タイトル ----------------------------------------------------------------------

function drawTitle() {
  bgGrad('#3A1450', '#0C0618');
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.3 * Math.abs(Math.sin(G.t * 2 + i))) + ')';
    ctx.fillRect((i * 71) % VW, (i * 43) % VH, 3, 3);
  }
  bigText('ゆいの', VW / 2, 44, 24, '#FFC0DC');
  bigText('超高速リズム', VW / 2, 82, fitSize('超高速リズム', VW * 0.6, 48), '#FFD24A');
  bigText('右から くる 音符を、線に 重なった しゅんかんに タップ！', VW / 2, 120, 16, '#EADFFF', null);

  drawYui(VW * 0.11, 150, 30, G.t * 2, 'happy');

  // 曲えらび
  const cols = VW > 820 ? 4 : 3;
  const cw = Math.min(150, (VW - 48 - (cols - 1) * 10) / cols), ch = 50;
  const y0 = 172;
  for (let i = 0; i < SONGS.length; i++) {
    const x = 24 + (i % cols) * (cw + 10), y = y0 + Math.floor(i / cols) * (ch + 8);
    const ok = i < save.open;
    const b = button(x, y, cw, ch, ok ? () => startSong(i) : null);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    rr(b.x + 3, b.y + 3, cw, ch, 9); ctx.fill();
    ctx.fillStyle = ok ? (save.rank['s' + i] ? '#5A3A86' : '#3E2C60') : '#241A38';
    rr(b.x, b.y, cw, ch, 9); ctx.fill();
    const nm = ok ? SONGS[i].name : '？？？';
    bigText(nm, b.x + cw / 2, b.y + 16, fitSize(nm, cw - 12, 15), ok ? '#FFF' : '#6A5F8A', null);
    if (ok) {
      bigText(SONGS[i].bpm + ' BPM', b.x + cw * 0.34, b.y + 36, 12, '#C8BCE8', null);
      const rk = save.rank['s' + i];
      if (rk) bigText(rk, b.x + cw * 0.80, b.y + 34, 20,
                      rk === 'S' ? '#FFD24A' : rk === 'A' ? '#7ADCB0' : '#8AB4FF');
    }
  }
  const yy = y0 + Math.ceil(SONGS.length / cols) * (ch + 8) + 4;

  bigText('ながれる はやさ', VW * 0.5, yy + 10, 14, '#C8BCE8', null);
  const sw = Math.min(96, VW * 0.115);
  for (let i = 0; i < SPEEDS.length; i++) {
    const x = VW / 2 - (sw * 5 + 4 * 4) / 2 + i * (sw + 4);
    const on = save.speed === i;
    const b = button(x, yy + 22, sw, 32, () => { save.speed = i; storeSave(); sfxTap(); });
    ctx.fillStyle = on ? '#FFD24A' : 'rgba(255,255,255,0.14)';
    rr(b.x, b.y, sw, 32, 8); ctx.fill();
    bigText(SPEED_NAME[i], b.x + sw / 2, b.y + 16, fitSize(SPEED_NAME[i], sw - 8, 13),
            on ? '#2A2038' : '#DDD3F0', null);
  }
  const bw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - bw - 8, yy + 62, bw, 34, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, yy + 62, bw, 34, () => sfxTest()), '♪ おと', '#C8BCE8');
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#2A1240', '#0C0618');
  bigText('あそびかた', VW / 2, 42, 28, '#FFD24A');
  const lines = [
    '① 右から 音符が ながれて くる',
    '② 左の 白い 線に 重なった しゅんかんに、その れつを タップ',
    '③ れつの どこを さわっても OK（よこ 1本ぜんぶが ボタン）',
    '④ ぴったりだと パーフェクト。つづけると コンボが たまる',
    '⑤ ながれる はやさは タイトルで えらべる。「超高速」は 本気の 速さ',
    '　 パソコンは D F J K キー',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 92 + i * 32, fitSize(s, VW * 0.86, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 62, bw, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function drawResult() {
  bgGrad('#3A1450', '#0C0618');
  const rk = G.rank || 'D';
  bigText(G.S.name, VW / 2, 44, 24, '#EADFFF');
  bigText(rk, VW / 2, 108, 76, rk === 'S' ? '#FFD24A' : rk === 'A' ? '#7ADCB0' : rk === 'B' ? '#8AB4FF' : '#C8BCE8');
  bigText('せいかくさ ' + Math.round((G.acc || 0) * 100) + '%', VW / 2, 162, 20, '#FFF', null);
  const line = 'パーフェクト ' + G.perfect + '　グッド ' + G.good + '　ミス ' + G.miss;
  bigText(line, VW / 2, 196, fitSize(line, VW * 0.8, 17), '#DDD3F0', null);
  bigText('スコア ' + G.score + '　さいこう ' + G.maxCombo + 'コンボ', VW / 2, 226, 18, '#FFD24A', null);
  const best = save.best['s' + G.song] || 0;
  bigText('ハイスコア ' + best, VW / 2, 254, 15, '#A99CC4', null);

  const nx = G.song + 1;
  const btns = [];
  if (nx < SONGS.length && nx < save.open) btns.push({ label: 'つぎの 曲', on: () => startSong(nx) });
  btns.push({ label: 'もういちど', on: () => startSong(G.song), col: '#8AD8F0' });
  btns.push({ label: '曲を えらぶ', on: () => { G.screen = 'title'; }, col: '#C8BCE8' });
  const bw = Math.min(190, VW * 0.22);
  const total = btns.length * bw + (btns.length - 1) * 14;
  btns.forEach((b, i) => {
    const x = VW / 2 - total / 2 + i * (bw + 14);
    drawButton(button(x, VH - 62, bw, 44, b.on), b.label, b.col || '#FFD24A');
  });
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'result') drawResult();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
