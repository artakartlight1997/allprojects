// あそびの しんぱん。いつ たたいたか を 音の 時計で くらべる。
//
// 画面の コマ送りでは 1コマ 16ms も ずれるので、はんていには つかわない。
// ゆびが 画面に ついた 時こく を AudioContext の 時計に なおして、
// 音符の 時こく と くらべる。

'use strict';

const SAVE_KEY = 'rhythm.v1';

const save = {
  rank: {},          // 面ごとの さいこう（0=もういちど 1=クリア 2=ハイレベル）
  lat: -1,           // 音が 耳に とどくまでの ずれ（びょう）。-1 は まだ 決めてない
  plays: 0,
};

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (o.rank && typeof o.rank === 'object') save.rank = o.rank;
    if (typeof o.lat === 'number' && o.lat > -0.5 && o.lat < 0.5) save.lat = o.lat;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function latency() { return save.lat >= 0 ? save.lat : outLatency(); }

// どこまで あそべるか（1つ クリアすると つぎが あく）
function clearedCount() {
  let n = 0;
  for (const st of STAGES) if ((save.rank[st.key] || -1) >= 1) n++;
  return n;
}
function stageOpen(i) {
  if (i === 0) return true;
  // 1つ 前を クリアしていれば あく
  return (save.rank[STAGES[i - 1].key] || -1) >= 1;
}

// --- はんていの まど（びょう）-----------------------------------------------------

const WIN_PERFECT = 0.070;
const WIN_GOOD = 0.150;

const RG = {
  screen: 'title',
  st: null,
  notes: [],
  si: 0,              // つぎに 音を 予約する 音符
  hitB: -9, missB: -9, callB: -9,
  hitLane: 1,
  shoutB: -9,
  holding: null,      // いま ながおし ちゅうの 音符
  poseI: 0,
  perfect: 0, good: 0, miss: 0, extra: 0,
  combo: 0, maxCombo: 0,
  pops: [],
  endB: 0,
  done: false,
  rank: 0,
  cal: null,          // ずれ合わせ の とちゅうの データ
  pending: 0,         // 「あそびかた」を 出している ミニゲーム
};

// ミニゲームを はじめる まえに 遊びかたを 見せる。
// リズム天国と 同じで、なにを すれば いいか わからないまま 始まるのが いちばん つらい。
function showRule(i) {
  audioStart();
  RG.pending = Math.max(0, Math.min(STAGES.length - 1, i));
  RG.screen = 'rule';
}

function startStage(i) {
  audioStart();
  const st = STAGES[Math.max(0, Math.min(STAGES.length - 1, i))];
  RG.st = st;
  RG.notes = makeNotes(st);
  if (st.fixNotes) st.fixNotes(RG.notes);
  RG.si = 0;
  RG.hitB = RG.missB = RG.callB = -9;
  RG.shoutB = -9;
  RG.holding = null;
  RG.poseI = 0;
  RG.perfect = RG.good = RG.miss = RG.extra = 0;
  RG.combo = RG.maxCombo = 0;
  RG.pops = [];
  RG.done = false;
  RG.rank = 0;
  const bars = st.intro + st.pats.length + 1;
  RG.endB = (st.intro + st.pats.length) * 4 + 2;
  songStart(st, bars, 0.5);
  RG.screen = 'play';
  save.plays++;
  storeSave();
}

function stopStage() { songStop(); }

function pop(text, col) {
  RG.pops.push({ text, col, b: beatNow() });
  if (RG.pops.length > 4) RG.pops.shift();
}

// --- 音符の 音を 先に 予約する ----------------------------------------------------

function schedNote(n) {
  const t = timeOfBeat(n.b);
  if (n.pre) {
    // 「くるよ」の しらせ。面に よって 1拍まえ か 半拍まえ。
    const tp = timeOfBeat(n.b - (n.preAt === undefined ? 1 : n.preAt));
    if (tp > anow()) {
      if (n.preKind === 'swish') swish(tp, 0.24);
      else {
        nzHit(tp, 0.12, 0.16, 500, 2200, A.music);
        pluck(tp, n.p - 12, 0.16, 0.12, A.music);
      }
    }
  }
  if (n.k === 'hold') {
    const th = timeOfBeat(n.hb);
    if (th > anow()) {
      riser(th, (n.b - n.hb) * 60 / S.bpm, n.p - 12, n.p, 0.15);
      if (t > anow()) pluck(t, n.p, 0.26, 0.24, A.music);
    }
    return;
  }
  if (t < anow()) return;                     // もう すぎた 音は 鳴らさない
  if (n.k === 'call') {
    // パパの お手本
    tom(t, 165, 0.62, A.music);
    nzHit(t, 0.05, 0.24, 500, 3000, A.music);
  } else if (n.gd) {
    pluck(t, n.p, 0.3, 0.26, A.music);
  }
}

function pumpNotes() {
  const ahead = beatNow() + 5;
  while (RG.si < RG.notes.length && RG.notes[RG.si].b < ahead) {
    schedNote(RG.notes[RG.si]);
    RG.si++;
  }
}

// --- 1 コマ -------------------------------------------------------------------

function updatePlay() {
  songPump();
  pumpNotes();
  const b = beatNow();
  const missB = (WIN_GOOD * S.bpm) / 60;

  for (const n of RG.notes) {
    if (n.k === 'call') {
      if (n.b <= b && n.b > RG.callB) RG.callB = n.b;
      continue;
    }
    if (n.res) continue;
    if (b > n.b + missB) {
      if (RG.holding === n) RG.holding = null;
      n.res = 'miss';
      RG.miss++;
      RG.combo = 0;
      RG.missB = b;
      RG.poseI++;
      pop('ミス…', '#FF9C9C');
    }
  }
  RG.pops = RG.pops.filter((p) => b - p.b < 1.6);

  if (!RG.done && b > RG.endB) {
    RG.done = true;
    finishStage();
  }
}

function totalNotes() {
  let n = 0;
  for (const x of RG.notes) if (x.k !== 'call') n++;
  return n;
}

function finishStage() {
  songStop();
  const tot = Math.max(1, totalNotes());
  let sc = (RG.perfect + RG.good * 0.5) / tot - Math.min(0.15, RG.extra * 0.01);
  sc = Math.max(0, sc);
  RG.score = sc;
  RG.rank = sc >= 0.88 ? 2 : sc >= 0.65 ? 1 : 0;
  const k = RG.st.key;
  if ((save.rank[k] === undefined) || RG.rank > save.rank[k]) save.rank[k] = RG.rank;
  storeSave();
  RG.screen = 'result';
  sfxFanfare(RG.rank);
}

// --- たたいた ------------------------------------------------------------------

function rTap() {
  if (RG.screen !== 'play') return;
  const t = anow() - latency();
  const b = beatAt(t);

  // ながおし は 「はなす ところ」で てんすうを つける。
  // おす ほうは ゆるく して、こどもが 早めに おさえても だいじょうぶに する。
  if (!RG.holding) {
    let h = null, hd = 1e9;
    for (const n of RG.notes) {
      if (n.k !== 'hold' || n.res) continue;
      const d = Math.abs(n.hb - b);
      if (d < hd) { hd = d; h = n; }
    }
    if (h && hd * 60 / S.bpm <= 0.35) {
      RG.holding = h;
      h.held = 1;
      RG.hitB = beatNow();
      nzHit(anow(), 0.06, 0.2, 800, 3000, A.sfx);
      return;
    }
  }

  let best = null, bd = 1e9;
  for (const n of RG.notes) {
    if (n.k === 'call' || n.k === 'hold' || n.res) continue;
    const d = Math.abs(n.b - b);
    if (d < bd) { bd = d; best = n; }
  }
  const sec = bd * 60 / S.bpm;
  const kind = (best && best.hit) || RG.st.hit;

  if (best && sec <= WIN_GOOD) {
    const perfect = sec <= WIN_PERFECT;
    best.res = perfect ? 'perfect' : 'good';
    if (perfect) { RG.perfect++; pop('ピッタリ！', '#FFE066'); }
    else { RG.good++; pop(b < best.b ? 'はやい' : 'おそい', '#A8E0FF'); }
    RG.combo++;
    RG.maxCombo = Math.max(RG.maxCombo, RG.combo);
    RG.hitB = beatNow();
    RG.hitLane = best.lane;
    if (best.kk === 'shout') RG.shoutB = beatNow();
    RG.poseI++;
    sfxHit(kind, perfect);
    return;
  }
  // 近いけれど ずれすぎ。その 音符は しっぱい あつかいに して、
  // 「あわてた」と ミス の 二重どり には しない。
  const near = Math.min(0.30, 60 / S.bpm * 0.55);
  if (best && sec <= near) {
    best.res = 'miss';
    RG.miss++;
    RG.combo = 0;
    RG.missB = beatNow();
    RG.poseI++;
    pop('ミス…', '#FF9C9C');
    sfxMiss();
    return;
  }
  if (best && sec < 0.7) {
    // 音符が ない ところで たたいた
    RG.extra++;
    RG.combo = 0;
    RG.missB = beatNow();
    pop('あわてた！', '#FFC0A0');
    sfxMiss();
  } else {
    sfxHit(kind, false);          // ひまなときは 音だけ 鳴らして あそべる
    RG.hitB = beatNow();
  }
}

// ゆびを はなした（ながおし の しんぱん）
function rRelease() {
  const n = RG.holding;
  if (!n || RG.screen !== 'play') { RG.holding = null; return; }
  RG.holding = null;
  const b = beatAt(anow() - latency());
  const sec = Math.abs(n.b - b) * 60 / S.bpm;
  RG.hitB = beatNow();
  RG.poseI++;
  if (sec <= WIN_GOOD) {
    const perfect = sec <= WIN_PERFECT;
    n.res = perfect ? 'perfect' : 'good';
    if (perfect) { RG.perfect++; pop('ピッタリ！', '#FFE066'); }
    else { RG.good++; pop(b < n.b ? 'はやい' : 'おそい', '#A8E0FF'); }
    RG.combo++;
    RG.maxCombo = Math.max(RG.maxCombo, RG.combo);
    sfxHit(n.hit || RG.st.hit, perfect);
    return;
  }
  n.res = 'miss';
  RG.miss++;
  RG.combo = 0;
  RG.missB = beatNow();
  pop('ミス…', '#FF9C9C');
  sfxMiss();
}

// --- ずれ合わせ ----------------------------------------------------------------
//
// スマホは 音を 出してから 耳に とどくまで 30〜150ms かかる。
// そこを 合わせないと「合ってるのに ミス」に なって、いちばん しらける。

function calStart() {
  audioStart();
  RG.cal = { taps: [], t0: anow() + 0.6, n: 0, sched: 0 };
  RG.screen = 'cal';
}

function calPump() {
  const c = RG.cal;
  if (!c) return;
  const spb = 0.5;                      // 120 BPM
  while (c.sched < 24 && c.t0 + c.sched * spb < anow() + 1.2) {
    const t = c.t0 + c.sched * spb;
    if (c.sched % 4 === 0) { kick(t, 0.8); stickAt(t, 0.5); }
    else stickAt(t, 0.28);
    c.sched++;
  }
}

function calTap() {
  const c = RG.cal;
  if (!c) return;
  const spb = 0.5;
  const t = anow();
  const k = Math.round((t - c.t0) / spb);
  if (k < 2) return;                    // はじめの 2つは ならし
  const d = t - (c.t0 + k * spb);
  if (Math.abs(d) > 0.3) return;
  c.taps.push(d);
  stick(anow(), 0.5);
  if (c.taps.length >= 8) {
    const s = c.taps.slice().sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)];
    save.lat = Math.max(0, Math.min(0.3, med));
    storeSave();
    c.doneB = anow();
  }
}

function calCount() { return RG.cal ? RG.cal.taps.length : 0; }
