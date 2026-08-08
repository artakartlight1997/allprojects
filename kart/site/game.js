// レースの中身。
//
// ★ 作り直し。前は真上から見おろす形で「小さい・スピード感がない」と
//   言われたので、**後ろから見る立体の道**にした。
//   カートは道にそって pos（何メートル進んだか）と px（左右のずれ）で持つ。
//   道そのものが向こうから流れてくるので、速さがそのまま画面に出る。
//
// ★ 操作は「左・右」だけ。アクセルは自動。
//   同じ向きに曲がりつづけると火花がたまり、はなすとダッシュ（ドリフト）。

'use strict';

const SAVE_KEY = 'kart.v2';

const save = { clear: [], best: {}, diff: 1, fails: {}, who: 0, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (Number.isFinite(o.diff)) save.diff = Math.max(0, Math.min(2, o.diff | 0));
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (Number.isFinite(o.who)) save.who = o.who | 0;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function opened(i) {
  if (i === 0) return true;
  if (save.clear[i - 1]) return true;
  return (save.fails['s' + (i - 1)] || 0) >= 3;
}
// 3回まけると自分だけ少し速くなる（つまずいたままにしない）
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function myBoost() { return [1, 1.03, 1.06, 1.10][assistLevel(G.stage)]; }

const DIFFS = [
  { key: 'e', name: 'やさしい', col: '#A8E0A8', ai: 0.945, band: 0.05, about: 'はじめてでも3位に入れる' },
  { key: 'n', name: 'ふつう',   col: '#8FD6FF', ai: 1.005, band: 0.07, about: 'ちょうどよい強さ' },
  { key: 'h', name: 'つよい',   col: '#FF9C5A', ai: 1.04, band: 0.10, about: 'ぬかれたら追いつけない' },
];
function diffNow() { return DIFFS[Math.max(0, Math.min(2, save.diff | 0))]; }

const DRIVERS = [
  { key: 'masaki', name: 'まさき', col: '#4A9CE8', top: 1.00, acc: 1.00, grip: 1.00 },
  { key: 'rina',   name: 'りな',   col: '#FF6A8A', top: 0.97, acc: 1.06, grip: 1.06 },
  { key: 'aoi',    name: 'あおい', col: '#5AC87A', top: 0.98, acc: 1.03, grip: 1.03 },
  { key: 'papa',   name: 'パパ',   col: '#FFB03A', top: 1.04, acc: 0.94, grip: 0.94 },
  { key: 'mama',   name: 'ママ',   col: '#C86AA8', top: 1.01, acc: 0.99, grip: 1.01 },
];

// --- 走る力 ------------------------------------------------------------------------

const MAXS = 13000;      // 道の上での最高速度（1秒に進むきょり）
const ACC = 5200;        // 加速
const BRK = 9000;        // 草の上での減速
const OFF_MAX = 0.55;    // 草の上での最高速度（わりあい）
// ★ 草に出すぎて 道が 画面から 消え、どっちへ もどれば いいか 分からなく
//   なる、と 言われた。外に 出られる はばを せまくして、さらに
//   外にいるほど 内へ もどす 力（見えない ガードレール）を かける。
const OFF_MAX_X = 1.42;  // これより 外へは 出られない
const OFF_PULL = 2.2;    // 草の上で 内へ もどる 力
const TURN = 2.7;        // ハンドルの効き（左右のずれ／秒）
// ★ カーブで外へふくらむ力。強すぎるとハンドルを最大に切っても
//   曲がりきれず、ずっと草の上になる。いちばんきついカーブ（7）でも
//   ハンドル（2.7）の6割くらいで止める。
const CENTRIF = 0.20;
const BOOST = 1.42;      // ダッシュ中の最高速度のばい率

const G = {
  screen: 'title',
  stage: 0,
  C: null,               // コース定義
  segs: [],              // セグメント
  len: 0,                // コース全体の長さ
  karts: [],
  me: 0,
  t: 0, count: 3.2,
  started: false,
  over: false, win: false, endT: 0,
  place: 1,
  shake: 0,
  msg: '', msgT: 0,
  steer: 0,              // -1 / 0 / +1
  best: 0, lapT: 0, lapTimes: [],
};

function say(s) { G.msg = s; G.msgT = 2.0; }

// pos を 0〜コース長 に そろえる
function wrapPos(pos) { return ((pos % G.len) + G.len) % G.len; }
function segIndexOf(pos) {
  return Math.min(G.segs.length - 1, Math.floor(wrapPos(pos) / SEG_LEN));
}
function segAt(pos) { return G.segs[segIndexOf(pos)]; }

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(COURSES.length - 1, i));
  G.C = COURSES[G.stage];
  G.segs = buildTrack(G.C.plan);
  G.len = G.segs.length * SEG_LEN;
  // ダッシュパネル（コースごとに決まった場所）
  for (const s of G.segs) s.pad = 0;
  for (let k = 0; k < 6; k++) {
    const s = G.segs[Math.floor(G.segs.length * (0.12 + k * 0.145)) % G.segs.length];
    s.pad = (k % 2) ? 1 : -1;
  }

  const others = DRIVERS.filter((d, k) => k !== (save.who | 0));
  G.karts = [];
  for (let k = 0; k < 6; k++) {
    const drv = k === 0 ? DRIVERS[save.who | 0] : others[(k - 1) % others.length];
    G.karts.push({
      drv, isMe: k === 0,
      // ★ グリッド。自分（k=0）は いちばん後ろから。ぬくのが 楽しい。
      pos: (5 - k) * 260, px: ((k % 2) ? 0.42 : -0.42) + (k >= 3 ? (k % 2 ? -0.16 : 0.16) : 0),
      spd: 0, lap: 0, place: k + 1,
      steer: 0, driftT: 0, driftDir: 0, boostT: 0, hitT: 0,
      aiT: Math.random() * 3, aiX: 0, aiRel: 0, bump: 0,
      // ★ みんな同じ線を走ると だんごに なるので、1台ずつ 好きな 位置を 変える
      lane: (k - 2.5) * 0.13,
    });
  }
  G.me = 0;
  G.t = 0; G.count = 3.2; G.started = false;
  G.over = false; G.win = false; G.endT = 0;
  G.place = 6;
  G.shake = 0; G.msg = ''; G.msgT = 0; G.steer = 0;
  G.lapT = 0; G.lapTimes = [];
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

// --- 1コマ --------------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.shake = Math.max(0, G.shake - dt * 3);
  G.msgT = Math.max(0, G.msgT - dt);

  if (G.over) {
    G.endT += dt;
    for (const f of G.karts) stepKart(f, dt, true);
    if (G.endT > 2.6) { bgmStop(); G.screen = 'result'; }
    return;
  }

  if (!G.started) {
    G.count -= dt;
    if (G.count <= 0) { G.started = true; sfxCount(0); }
    // カウント中は走らない
    for (const f of G.karts) f.spd = Math.max(0, f.spd - BRK * dt);
    return;
  }

  G.t += dt;
  G.lapT += dt;
  for (const f of G.karts) stepKart(f, dt, false);
  bumpKarts();
  rankKarts();

  const me = G.karts[G.me];
  engSet(Math.min(1, me.spd / MAXS), Math.min(1, me.driftT * 0.8), me.boostT > 0);
  bgmHeat(me.lap >= G.C.laps - 1 ? 1 : 0);
}

function kartTop(f) {
  const D = diffNow();
  let top = MAXS * f.drv.top;
  if (f.isMe) top *= myBoost();
  else {
    top *= D.ai * (0.985 + ((f.drv.key.length * 7) % 5) * 0.006);
    // ★ ゴムひも。はなされたら 少し速く、勝ちすぎたら 少しおそく。
    //   ずっと ひとりぼっちの レースだと つまらないので。
    const me = G.karts[G.me];
    if (me) {
      const gap = (me.lap * G.len + me.pos) - (f.lap * G.len + f.pos);
      const k = Math.max(-1, Math.min(1, gap / (G.len * 0.12)));
      top *= 1 + k * D.band;
    }
  }
  if (f.boostT > 0) top *= BOOST;
  if (Math.abs(f.px) > 1) top *= OFF_MAX;
  return top;
}

function stepKart(f, dt, coast) {
  const seg = segAt(f.pos);
  const top = kartTop(f);

  // 加速・減速
  if (coast) f.spd = Math.max(0, f.spd - ACC * 0.5 * dt);
  else if (f.spd < top) f.spd = Math.min(top, f.spd + ACC * f.drv.acc * (f.boostT > 0 ? 2.4 : 1) * dt);
  else f.spd = Math.max(top, f.spd - BRK * dt);

  if (f.hitT > 0) { f.hitT -= dt; f.spd = Math.min(f.spd, MAXS * 0.45); }
  f.boostT = Math.max(0, f.boostT - dt);

  // ハンドル
  if (!f.isMe) aiSteer(f, dt);
  else f.steer = G.steer;

  const sp = f.spd / MAXS;
  // ★ 草の上でも ハンドルは しっかり きく（もどれない と こまる）
  f.px += f.steer * TURN * f.drv.grip * (0.62 + sp * 0.38) * dt;
  // カーブで外へふくらむ
  f.px -= seg.curve * sp * CENTRIF * dt;
  // ★ 見えない ガードレール。道から 外れた ぶんだけ 内へ もどされる。
  const out = Math.abs(f.px) - 1;
  if (out > 0) f.px -= Math.sign(f.px) * Math.min(out, 0.6) * OFF_PULL * dt;
  // 道の外へは出すぎない
  f.px = Math.max(-OFF_MAX_X, Math.min(OFF_MAX_X, f.px));

  // ドリフト（同じ向きにまがりつづけると火花がたまる）
  if (f.steer !== 0 && f.spd > MAXS * 0.55 && (f.driftDir === 0 || f.driftDir === f.steer)) {
    f.driftDir = f.steer;
    f.driftT = Math.min(2.4, f.driftT + dt);
  } else if (f.driftT > 0) {
    if (f.driftT > 0.6) {
      f.boostT = Math.min(1.6, 0.35 + f.driftT * 0.5);
      if (f.isMe) { sfxDash(); G.shake = 0.7; }
    }
    f.driftT = 0; f.driftDir = 0;
  }

  // すすむ
  f.pos += f.spd * dt;
  if (f.pos >= G.len) {
    f.pos -= G.len;
    f.lap++;
    if (f.isMe) {
      G.lapTimes.push(Math.round(G.lapT * 100) / 100);
      G.lapT = 0;
      if (f.lap < G.C.laps) { say('あと ' + (G.C.laps - f.lap) + '周！'); sfxLap(); }
      if (f.lap >= G.C.laps) finish();
    }
  }

  // ダッシュパネル
  const s2 = segAt(f.pos);
  if (s2.pad && Math.abs(f.px - s2.pad * 0.5) < 0.28 && f.boostT < 0.4) {
    f.boostT = 1.1;
    if (f.isMe) { sfxDash(); G.shake = 0.6; say('ダッシュ！'); }
  }

  // 草の上はガタガタ
  if (Math.abs(f.px) > 1) {
    if (f.isMe && f.spd > MAXS * 0.3) G.shake = Math.max(G.shake, 0.35);
    f.driftT = 0; f.driftDir = 0;
  }
}

// AI … 先のカーブを見て内側を通る。速さは difficulty で決まる。
function aiSteer(f, dt) {
  f.aiT -= dt;
  const ahead = segAt(f.pos + SEG_LEN * 18);
  const now = segAt(f.pos);
  // カーブの内側をねらう
  let want = -Math.max(-1, Math.min(1, (ahead.curve + now.curve * 0.5) * 0.22)) * 0.55 + f.lane;
  // 前に他のカートがいたらよける
  for (const o of G.karts) {
    if (o === f) continue;
    const d = ((o.pos - f.pos) % G.len + G.len) % G.len;
    if (d < 460 && Math.abs(o.px - f.px) < 0.36) want += (f.px < o.px ? -0.5 : 0.5);
  }
  if (f.aiT <= 0) { f.aiT = 0.6 + Math.random() * 0.8; f.aiX = (Math.random() - 0.5) * 0.22; }
  // ダッシュパネルがあれば ねらう
  for (let k = 2; k < 9; k++) {
    const s2 = segAt(f.pos + SEG_LEN * k);
    if (s2.pad) { want = s2.pad * 0.5; break; }
  }
  want = Math.max(-0.85, Math.min(0.85, want + f.aiX));
  const d = want - f.px;
  f.steer = Math.abs(d) < 0.06 ? 0 : (d > 0 ? 1 : -1);
  // ★ 火花がたまったら 手をはなして ダッシュ（人と同じことをする）
  if (f.driftT > 1.1) { f.steer = 0; f.aiRel = 0.12; }
  if (f.aiRel > 0) { f.aiRel -= dt; f.steer = 0; }
}

// ぶつかり（前後に近くて横も近いと はじかれる）
function bumpKarts() {
  for (let i = 0; i < G.karts.length; i++) {
    for (let j = i + 1; j < G.karts.length; j++) {
      const a = G.karts[i], b = G.karts[j];
      let d = a.pos - b.pos;
      if (d > G.len / 2) d -= G.len;
      if (d < -G.len / 2) d += G.len;
      if (Math.abs(d) > 260) continue;
      const dx = a.px - b.px;
      if (Math.abs(dx) > 0.34) continue;
      const push = (dx >= 0 ? 1 : -1) * 0.5;
      a.px += push * 0.02; b.px -= push * 0.02;
      // うしろの方が少しおそくなる
      const back = d < 0 ? a : b;
      back.spd *= 0.985;
      if (back.isMe) G.shake = Math.max(G.shake, 0.3);
      if ((a.isMe || b.isMe) && Math.random() < 0.06) sfxShell();
    }
  }
}

function rankKarts() {
  const arr = G.karts.slice().sort((a, b) => (b.lap * G.len + b.pos) - (a.lap * G.len + a.pos));
  for (let i = 0; i < arr.length; i++) arr[i].place = i + 1;
  G.place = G.karts[G.me].place;
}

function finish() {
  if (G.over) return;
  G.over = true;
  G.endT = 0;
  rankKarts();
  const p = G.karts[G.me].place;
  G.win = p <= 3;
  const key = 's' + G.stage;
  const total = Math.round(G.lapTimes.reduce((a, b) => a + b, 0) * 100) / 100;
  G.total = total;
  if (G.win) {
    save.clear[G.stage] = true;
    if (!save.best[key] || total < save.best[key]) save.best[key] = total;
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxGoal(G.win);
}
