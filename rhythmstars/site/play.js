// あそびの しんぱん。「いつ たたいたか」を 音の 時計で くらべる。
//
// 画面の コマ送りは 1コマで 16ms も ずれるので、はんていには つかわない。
// ゆびが ついた 時こく を AudioContext の 時計に なおして、音符の 時こく と くらべる。

'use strict';

const SAVE_KEY = 'rhythmstars.v1';

const save = {
  rank: {},          // 面ごとの さいこう（0=もういちど 1=クリア 2=オールスター）
  lat: -1,           // 音が 耳に とどくまでの ずれ（びょう）。-1 は まだ 決めてない
  plays: 0,
  seen: {},          // 「あそびかた」を 見おわった 面
};

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (o.rank && typeof o.rank === 'object') save.rank = o.rank;
    if (o.seen && typeof o.seen === 'object') save.seen = o.seen;
    if (typeof o.lat === 'number' && o.lat > -0.5 && o.lat < 0.5) save.lat = o.lat;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function latency() { return save.lat >= 0 ? save.lat : outLatency(); }

// 面ごとの 記ろく の かぎ。「はやい」は べつの 記ろく に する。
function rankKey(st, fast) { return st.key + (fast ? ':f' : ''); }
function bestRank(st, fast) { const r = save.rank[rankKey(st, fast)]; return r === undefined ? -1 : r; }
function clearedCount() {
  let n = 0;
  for (const st of STAGES) if (bestRank(st, 0) >= 1) n++;
  return n;
}
function starCount() {
  let n = 0;
  for (const st of STAGES) { if (bestRank(st, 0) >= 2) n++; if (bestRank(st, 1) >= 2) n++; }
  return n;
}

// --- はんていの まど（びょう）------------------------------------------------------
//
// 同じ 面で なんども クリアできない ときは、まどを すこしずつ ひろげる。
// 「ぜんぜん できない」まま おわるのが いちばん つらいので。

const WIN_PERFECT = 0.072;
const WIN_GOOD = 0.155;

let failStage = '', failStreak = 0;
function assistLevel() { return Math.min(2, Math.floor(failStreak / 2)); }
function assistMul() { return [1, 1.4, 1.8][assistLevel()]; }
function winP() { return WIN_PERFECT * assistMul(); }
function winG() { return WIN_GOOD * assistMul(); }
function clearLine() { return 0.66 - assistLevel() * 0.08; }

const RG = {
  screen: 'title',
  st: null,
  fast: 0,
  notes: [],
  byScene: {},
  si: 0,
  hitB: -9, missB: -9, hitLane: 2,
  holding: null,
  perfect: 0, good: 0, miss: 0, extra: 0,
  combo: 0, maxCombo: 0,
  pops: [],
  endB: 0,
  done: false,
  rank: 0,
  score: 0,
  cal: null,
  pending: null,      // 「あそびかた」を 見せている 面
  pendFast: 0,
  errs: [],
  autoFixed: 0,
  assist: 0,
  scroll: 0,
};

// --- 音符を ならべる --------------------------------------------------------------

function makeNotes(st) {
  const notes = [];
  let hold = null;
  for (let bar = 0; bar < st.pats.length; bar++) {
    const e = st.pats[bar];
    const p = typeof e === 'string' ? e : e.p;
    const g = typeof e === 'string' ? st.scene : e.g;
    for (let i = 0; i < 16; i++) {
      const ch = p.charAt(i);
      if (ch === '' || ch === '.') continue;
      const b = (st.intro + bar) * 4 + i * 0.25;
      if (ch === 'H') { hold = { k: 'hold', hb: b, b: b + 1, g: g }; continue; }
      if (ch === 'R') { if (hold) { hold.b = b; notes.push(hold); hold = null; } continue; }
      notes.push({ k: ch === 'x' ? 'tap' : ch === 'c' ? 'call' : 'skip', b: b, g: g });
    }
  }
  if (hold) { notes.push(hold); }
  notes.sort((a, b) => a.b - b.b);
  notes.forEach((n, i) => initNote(st, n, i));
  return notes;
}

// その 拍で どの ミニゲームの え を 出すか
function sceneKeyAt(st, b) {
  const bar = Math.floor(b / 4) - st.intro;
  const e = st.pats[Math.max(0, Math.min(st.pats.length - 1, bar))];
  return typeof e === 'string' ? st.scene : e.g;
}

// --- 面を はじめる ---------------------------------------------------------------

function showRule(key, fast) {
  audioStart();
  RG.pending = key;
  RG.pendFast = fast ? 1 : 0;
  RG.screen = 'rule';
}

function startStage(key, fast) {
  audioStart();
  const st = STAGE_BY[key] || STAGES[0];
  const fk = rankKey(st, fast);
  if (failStage !== fk) { failStage = fk; failStreak = 0; }
  RG.assist = assistLevel();
  RG.errs = [];
  RG.autoFixed = 0;
  RG.st = st;
  RG.fast = fast ? 1 : 0;
  RG.notes = makeNotes(st);
  RG.byScene = {};
  for (const n of RG.notes) (RG.byScene[n.g] || (RG.byScene[n.g] = [])).push(n);
  RG.si = 0;
  RG.hitB = RG.missB = -9;
  RG.hitLane = 2;
  RG.holding = null;
  RG.perfect = RG.good = RG.miss = RG.extra = 0;
  RG.combo = RG.maxCombo = 0;
  RG.pops = [];
  RG.done = false;
  RG.rank = 0;
  const bars = st.intro + st.pats.length + 1;
  RG.endB = (st.intro + st.pats.length) * 4 + 2;
  // 「はやい」は 2わりましの はやさ
  songStart({ bpm: Math.round(st.bpm * (fast ? 1.2 : 1)), drum: st.drum, root: st.root,
              prog: st.prog, min: st.min, intro: st.intro }, bars, 0.6);
  RG.screen = 'play';
  save.plays++;
  save.seen[st.key] = 1;
  storeSave();
}

function stopStage() { songStop(); RG.holding = null; }

function pop(text, col) {
  RG.pops.push({ text: text, col: col, b: beatNow() });
  if (RG.pops.length > 4) RG.pops.shift();
}

// --- 音を 先に 予約する ------------------------------------------------------------

// 「たたく ところ」の おてほん の 高さ。メロディに 聞こえるように する。
const GUIDE = [0, 4, 7, 4, 9, 7, 4, 2];

function schedNote(n) {
  const t = timeOfBeat(n.b);
  const g = n.g;
  if (n.k === 'call') {
    if (t < anow()) return;
    if (g === 'tap') { nzHit(t, 0.035, 0.44, 2600, 9000, A.music); tom(t, 260, 0.3, A.music); }
    else { kick(t, 0.9, A.music); nzHit(t, 0.06, 0.3, 900, 4200, A.music); }
    return;
  }
  // 「くるよ」の しらせ。1拍まえに 鳴る。
  const tc = timeOfBeat(n.b - 1);
  if (tc > anow()) {
    if (g === 'mojya') glide(tc, 480, 980, 0.09, 0.14, 'sine');
    else if (g === 'ninja') swish(tc, 0.2);
    else if (g === 'obake') pluck(tc, n.k === 'skip' ? 55 : 74, 0.2, 0.13, A.music);
  }
  if (n.k === 'hold') {
    const th = timeOfBeat(n.hb);
    if (th > anow()) riser(th, Math.max(0.2, (n.b - n.hb) * 60 / S.bpm), 52, 66, 0.13);
    return;
  }
  if (t < anow()) return;
  // うっすら おてほん の 音（メロディに なる）
  if (n.k === 'tap') pluck(t, S.song.root + GUIDE[n.i % GUIDE.length], 0.26, 0.085, A.music);
}

function pumpNotes() {
  const ahead = beatNow() + 5;
  while (RG.si < RG.notes.length && RG.notes[RG.si].b < ahead) {
    schedNote(RG.notes[RG.si]);
    RG.si++;
  }
}

// --- 1 コマ ---------------------------------------------------------------------

function updatePlay() {
  songPump();
  pumpNotes();
  const b = beatNow();
  const missB = (winG() * S.bpm) / 60;

  for (const n of RG.notes) {
    if (n.k === 'call' || n.res) continue;
    if (n.k === 'skip') {
      // たたかずに やりすごせたら せいかい
      if (b > n.b + missB) {
        n.res = 'safe'; n.jb = b;
        RG.perfect++;
        RG.combo++;
        RG.maxCombo = Math.max(RG.maxCombo, RG.combo);
        pop('がまん できた！', '#B8E8FF');
      }
      continue;
    }
    // おしっぱなしで 行きすぎた ときも ミスに して、ゆびを 自由に する
    if (n.k === 'hold' && RG.holding === n) {
      if (b > n.b + missB) {
        RG.holding = null;
        n.res = 'miss'; n.jb = b;
        RG.miss++;
        RG.combo = 0;
        RG.missB = b;
        pop('はなすのが おそい…', '#FF9C9C');
      }
      continue;
    }
    if (b > n.b + missB) {
      n.res = 'miss'; n.jb = b;
      RG.miss++;
      RG.combo = 0;
      RG.missB = b;
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
  RG.holding = null;
  const tot = Math.max(1, totalNotes());
  let sc = (RG.perfect + RG.good * 0.5) / tot - Math.min(0.15, RG.extra * 0.01);
  sc = Math.max(0, sc);
  RG.score = sc;
  RG.rank = sc >= 0.90 ? 2 : sc >= clearLine() ? 1 : 0;
  if (RG.rank >= 1) failStreak = 0; else failStreak++;
  const k = rankKey(RG.st, RG.fast);
  if ((save.rank[k] === undefined) || RG.rank > save.rank[k]) save.rank[k] = RG.rank;
  storeSave();
  RG.screen = 'result';
  sfxFanfare(RG.rank);
}

// --- たたいた --------------------------------------------------------------------

function rTap() {
  if (RG.screen !== 'play') return;
  const t = anow() - latency();
  const b = beatAt(t);

  // ながおし は 「はなす ところ」で てんすうを つける。
  // おす ほうは ゆるく して、早めに おさえても だいじょうぶに する。
  if (!RG.holding) {
    let h = null, hd = 1e9;
    for (const n of RG.notes) {
      if (n.k !== 'hold' || n.res) continue;
      const d = Math.abs(n.hb - b);
      if (d < hd) { hd = d; h = n; }
    }
    if (h && hd * 60 / S.bpm <= 0.38) {
      RG.holding = h;
      RG.hitB = beatNow();
      nzHit(anow(), 0.06, 0.2, 800, 3000, A.sfx);
      sfxHit('ribbit', false);
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
  const near = Math.max(winG() + 0.06, Math.min(0.34, 60 / S.bpm * 0.62));

  // たたいちゃ だめ な やつ（青おばけ）
  if (best && best.k === 'skip' && sec <= near) {
    best.res = 'miss'; best.jb = beatNow();
    RG.miss++;
    RG.combo = 0;
    RG.missB = beatNow();
    RG.hitLane = best.lane;
    pop('あおは たたかない！', '#FF9C9C');
    sfxMiss();
    return;
  }

  if (best && best.k === 'tap' && sec <= winG()) {
    autoFixLatency((b - best.b) * 60 / S.bpm);
    const perfect = sec <= winP();
    best.res = perfect ? 'perfect' : 'good';
    best.jb = beatNow();
    if (perfect) { RG.perfect++; pop('ピッタリ！', '#FFE066'); }
    else { RG.good++; pop(b < best.b ? 'はやい' : 'おそい', '#A8E0FF'); }
    RG.combo++;
    RG.maxCombo = Math.max(RG.maxCombo, RG.combo);
    RG.hitB = beatNow();
    RG.hitLane = best.lane;
    sfxHit(hitKind(best), perfect);
    return;
  }

  if (best && best.k === 'tap' && sec <= near) {
    // 近いけれど ずれすぎ。ミスと「あわてた」の 二重どり には しない。
    autoFixLatency((b - best.b) * 60 / S.bpm);
    best.res = 'miss'; best.jb = beatNow();
    RG.miss++;
    RG.combo = 0;
    RG.missB = beatNow();
    RG.hitLane = best.lane;
    pop('ミス…', '#FF9C9C');
    sfxMiss();
    return;
  }

  if (best && sec < 0.7) {
    autoFixLatency((b - best.b) * 60 / S.bpm);
    RG.extra++;
    RG.combo = 0;
    RG.missB = beatNow();
    pop('あわてた！', '#FFC0A0');
    sfxMiss();
  } else {
    // ひまな ときは 音だけ 鳴らして あそべる
    sfxHit(RG.st ? RG.st.hit : 'pop', false);
    RG.hitB = beatNow();
  }
}

function hitKind(n) {
  const g = n.g;
  if (g === 'mojya') return 'weed';
  if (g === 'ninja') return 'slice';
  if (g === 'tap') return 'stomp';
  if (g === 'frog') return 'ribbit';
  if (g === 'robo') return 'stamp';
  if (g === 'obake') return 'ghost';
  return RG.st ? RG.st.hit : 'pop';
}

// ずっと 同じだけ ずれている とき（スマホの 音の おくれが 合っていない）は
// だまって 直す。子どもは「ずれ合わせ」を じぶんでは やらないので、
// これが 無いと「合ってるのに ミス」が つづいて 投げ出して しまう。
function autoFixLatency(err) {
  RG.errs.push(err);
  const need = RG.autoFixed ? 8 : 5;
  if (RG.errs.length < need) return;
  const a = RG.errs.slice().sort((x, y) => x - y);
  const med = a[a.length >> 1];
  const same = RG.errs.filter((e) => (e > 0) === (med > 0)).length;
  RG.errs = [];
  if (Math.abs(med) < 0.035 || same < Math.ceil(need * 0.75)) return;
  const base = save.lat >= 0 ? save.lat : outLatency();
  save.lat = Math.max(0, Math.min(0.40, base + med));
  storeSave();
  if (!RG.autoFixed) {
    RG.autoFixed = 1;
    pop('タイミングを 合わせたよ！', '#A8E0FF');
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
  n.jb = beatNow();
  if (sec <= winG()) {
    autoFixLatency((b - n.b) * 60 / S.bpm);
    const perfect = sec <= winP();
    n.res = perfect ? 'perfect' : 'good';
    if (perfect) { RG.perfect++; pop('ピッタリ！', '#FFE066'); }
    else { RG.good++; pop(b < n.b ? 'はやい' : 'おそい', '#A8E0FF'); }
    RG.combo++;
    RG.maxCombo = Math.max(RG.maxCombo, RG.combo);
    sfxHit('ribbit', perfect);
    return;
  }
  n.res = 'miss';
  RG.miss++;
  RG.combo = 0;
  RG.missB = beatNow();
  pop('ミス…', '#FF9C9C');
  sfxMiss();
}

// --- ずれ合わせ ------------------------------------------------------------------
//
// スマホは 音を 出してから 耳に とどくまで 30〜150ms かかる。
// そこを 合わせないと「合ってるのに ミス」に なって、いちばん しらける。

function calStart() {
  audioStart();
  RG.cal = { taps: [], t0: anow() + 0.8, n: 0, sched: 0, done: 0 };
  RG.screen = 'cal';
}

function calPump() {
  const c = RG.cal;
  if (!c) return;
  const spb = 0.5;                      // 120 BPM
  while (c.sched < 32 && c.t0 + c.sched * spb < anow() + 1.2) {
    const t = c.t0 + c.sched * spb;
    if (c.sched % 4 === 0) { kick(t, 0.8); stickAt(t, 0.5); }
    else stickAt(t, 0.28);
    c.sched++;
  }
}

function calTap() {
  const c = RG.cal;
  if (!c || c.done) return;
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
    save.lat = Math.max(0, Math.min(0.40, med));
    storeSave();
    c.done = 1;
    sfxFanfare(2);
  }
}
