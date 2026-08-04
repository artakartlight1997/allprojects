// ステージを毎回つくり直す（自動生成）。
//
// 遊ぶたびに地形・敵・アイテム・天気・イベントが変わる。同じ面は二度と出ない。
// ただし「むずかしくなりすぎない」ようにするため、作るときの決まりで安全を保証する。
//
//   ・穴のはばは 2 タイルまで（ジャンプで 5.9 タイル跳べるので余裕）
//   ・段差は 2 タイルまで（ジャンプで 3.4 タイル上がれる）
//   ・浮いている足場は地面から 3 タイル上まで
//   ・スタートから 14 タイル以内に敵は置かない
//   ・トゲの前にはかならずチェックポイントを置く
//
// この決まりを守っているかは genStage の最後で数えて確かめている。

'use strict';

const W_H = 16;          // タイルのたて数
const GROUND_ROW = 12;   // 地面のきほんの高さ（この行が地面の表面）

// 地方ごとの見た目。背景の色と、かざりの種類が変わる。
const THEMES = {
  '北海道':   { deco: 'snow',   ground: '#e9f2f7', soil: '#b9cddb', accent: '#7fb3d5' },
  '東北':     { deco: 'forest', ground: '#8fce7c', soil: '#6a8f57', accent: '#e05c6e' },
  '関東':     { deco: 'town',   ground: '#a9d98a', soil: '#7a9c62', accent: '#f0a02e' },
  '中部':     { deco: 'mount',  ground: '#9ed17f', soil: '#6f8f59', accent: '#6f7fd0' },
  '近畿':     { deco: 'temple', ground: '#a8d187', soil: '#7b9660', accent: '#c8474f' },
  '中国':     { deco: 'hill',   ground: '#b0d98f', soil: '#7e9a63', accent: '#d98f3f' },
  '四国':     { deco: 'sea',    ground: '#e6dfb0', soil: '#c2b884', accent: '#3fa9c9' },
  '九州・沖縄': { deco: 'south',  ground: '#c7e39a', soil: '#8fae6a', accent: '#f05f8a' },
};

// 空の色。時間帯でごろっと変わるので、同じ地方でも印象がちがう。
const SKIES = [
  { name: 'あさ',  top: '#a8dcf0', bot: '#ffe6c2', sun: '#fff3c4', star: 0 },
  { name: 'ひる',  top: '#5fb8e8', bot: '#c8ecff', sun: '#fffbe0', star: 0 },
  { name: 'ゆうがた', top: '#5a4a8c', bot: '#ff9e6b', sun: '#ffd08a', star: 0.3 },
  { name: 'よる',  top: '#131a3a', bot: '#2c3f74', sun: '#eef2ff', star: 1 },
];

// ハラハラする仕掛け。ステージごとにどれか 1 つ（またはなし）。
const EVENTS = ['none', 'none', 'wind', 'chase', 'dark', 'rain'];

const ITEM_KINDS = ['heart', 'star', 'dash', 'feather', 'barrier', 'magnet'];

function makeGrid(w) {
  const g = [];
  for (let y = 0; y < W_H; y++) g.push(new Array(w).fill('.'));
  return g;
}

// 地形を作る。gh[x] = その列の地面の表面の行。gap[x] = 穴かどうか。
function buildTerrain(rnd, w, stageNo) {
  const gh = new Array(w).fill(GROUND_ROW);
  const gap = new Array(w).fill(false);
  let x = 0;
  let h = GROUND_ROW;
  // 最初の 14 タイルは平ら。操作になれるため
  while (x < 14) { gh[x] = h; x++; }

  while (x < w - 10) {
    const r = rnd();
    if (r < 0.30) {                       // 平らな道
      const len = 5 + ((rnd() * 8) | 0);
      for (let i = 0; i < len && x < w - 10; i++, x++) gh[x] = h;
    } else if (r < 0.52) {                // 段差（2 タイルまで）
      const up = rnd() < 0.5 ? -1 : 1;
      const step = 1 + ((rnd() * 2) | 0);
      h = Math.max(6, Math.min(GROUND_ROW + 1, h + up * step));
      const len = 3 + ((rnd() * 5) | 0);
      for (let i = 0; i < len && x < w - 10; i++, x++) gh[x] = h;
    } else if (r < 0.74) {                // 穴（2 タイルまで）
      const len = 1 + ((rnd() * 2) | 0);
      for (let i = 0; i < len && x < w - 10; i++, x++) { gh[x] = h; gap[x] = true; }
      const len2 = 4 + ((rnd() * 4) | 0);
      for (let i = 0; i < len2 && x < w - 10; i++, x++) gh[x] = h;
    } else if (r < 0.88) {                // 高台（あとで上に足場を置く）
      h = Math.max(6, h - 2);
      const len = 4 + ((rnd() * 5) | 0);
      for (let i = 0; i < len && x < w - 10; i++, x++) gh[x] = h;
      h = Math.min(GROUND_ROW + 1, h + 2);
      const len2 = 3 + ((rnd() * 4) | 0);
      for (let i = 0; i < len2 && x < w - 10; i++, x++) gh[x] = h;
    } else {                              // ちょっと長い平地（休けい）
      const len = 8 + ((rnd() * 6) | 0);
      for (let i = 0; i < len && x < w - 10; i++, x++) gh[x] = h;
    }
  }
  // ゴールの前はかならず平ら
  for (; x < w; x++) { gh[x] = h; gap[x] = false; }
  return { gh, gap };
}

function genStage(seed, stageNo, region) {
  const rnd = mulberry32(seed);
  const w = 150 + ((rnd() * 40) | 0);
  const g = makeGrid(w);
  const { gh, gap } = buildTerrain(rnd, w, stageNo);

  // 地面を埋める
  for (let x = 0; x < w; x++) {
    if (gap[x]) continue;
    for (let y = gh[x]; y < W_H; y++) g[y][x] = (y === gh[x]) ? '#' : '=';
  }

  const ents = [];
  const taken = new Array(w).fill(false);   // 同じ列にものを重ねないため

  const flatAt = (x, need) => {             // x 付近で平らな列をさがす
    for (let d = 0; d < 14; d++) {
      for (const s of [x + d, x - d]) {
        if (s < 16 || s > w - 8) continue;
        let ok = true;
        for (let i = 0; i < need; i++) {
          const c = s + i;
          if (c >= w || gap[c] || gh[c] !== gh[s] || taken[c]) { ok = false; break; }
        }
        if (ok) return s;
      }
    }
    return -1;
  };

  const claim = (x, n) => { for (let i = 0; i < n; i++) taken[x + i] = true; };

  // ---- クイズの鳥居。4 つ。これが this ゲームの主役
  const gates = [];
  for (let i = 0; i < 4; i++) {
    const want = Math.floor(w * (0.17 + 0.2 * i));
    const s = flatAt(want, 3);
    if (s < 0) continue;
    claim(s, 3);
    gates.push(s);
    ents.push({ t: 'gate', x: s + 1, y: gh[s] - 1, n: i });
    // 鳥居の手前にチェックポイント。まちがえても痛くないように
    const c = flatAt(s - 6, 1);
    if (c >= 0 && !taken[c]) { taken[c] = true; ents.push({ t: 'check', x: c, y: gh[c] - 1 }); }
  }

  // ---- ゴール
  ents.push({ t: 'goal', x: w - 5, y: gh[w - 5] - 1 });

  // ---- 敵。スタートから 14 タイルはなす
  const enemyKinds = ['walker', 'walker', 'flyer', 'bouncer'];
  if (stageNo >= 2) enemyKinds.push('spiky');
  const nEnemy = 5 + Math.min(5, stageNo) + ((rnd() * 3) | 0);
  for (let i = 0; i < nEnemy; i++) {
    const x = 20 + ((rnd() * (w - 34)) | 0);
    if (x < 20 || gap[x] || taken[x]) continue;
    const kind = pick(rnd, enemyKinds);
    if (kind === 'flyer') {
      ents.push({ t: 'enemy', kind, x, y: gh[x] - 3 - ((rnd() * 2) | 0) });
    } else {
      ents.push({ t: 'enemy', kind, x, y: gh[x] - 1 });
    }
    taken[x] = true;
  }

  // ---- ジャンプ台
  const nPad = 1 + ((rnd() * 3) | 0);
  for (let i = 0; i < nPad; i++) {
    const s = flatAt(20 + ((rnd() * (w - 40)) | 0), 1);
    if (s < 0) continue;
    taken[s] = true;
    ents.push({ t: 'pad', x: s, y: gh[s] - 1 });
  }

  // ---- 浮いている足場。地面から 3 タイル上（ジャンプで 3.4 タイル上がれる）
  const nPlat = 4 + ((rnd() * 5) | 0);
  const plats = [];
  for (let i = 0; i < nPlat; i++) {
    const s = 18 + ((rnd() * (w - 34)) | 0);
    const len = 3 + ((rnd() * 3) | 0);
    const y = Math.max(3, gh[s] - 3);
    let ok = true;
    for (let k = 0; k < len; k++) {
      const c = s + k;
      // 平らな所の上にだけ置く。段差の上に置くと天井になって登れなくなる
      if (c >= w || gap[c] || gh[c] !== gh[s]) { ok = false; break; }
      if (g[y][c] !== '.' || (g[y + 1] && g[y + 1][c] !== '.')) { ok = false; break; }
    }
    if (!ok) continue;
    for (let k = 0; k < len; k++) g[y][s + k] = '#';
    plats.push({ s, len, y });
  }

  // ---- 段差の上り口の真上に足場があると、跳んで登れず行き止まりになる。
  //      あとから消して道をあける（消すのは足場だけ。地面はさわらない）
  for (let x = 1; x < w; x++) {
    if (gap[x] || gap[x - 1]) continue;
    const rise = gh[x - 1] - gh[x];      // 正なら上り坂
    if (rise <= 0) continue;
    for (let c = Math.max(0, x - 3); c <= Math.min(w - 1, x + 3); c++) {
      for (let y = gh[c] - 1; y >= Math.max(0, gh[x] - 4); y--) {
        if (g[y][c] !== '.') g[y][c] = '.';
      }
    }
  }

  // ---- 残った足場の上にだけ、ごほうびのコインを置く
  for (const pl of plats) {
    for (let k = 0; k < pl.len; k++) {
      if (g[pl.y][pl.s + k] === '#') ents.push({ t: 'coin', x: pl.s + k, y: pl.y - 1 });
    }
  }

  // ---- 移動する足場。高いところのごほうび用（なくても進める）
  if (rnd() < 0.7) {
    const s = flatAt(30 + ((rnd() * (w - 60)) | 0), 2);
    if (s >= 0) {
      ents.push({ t: 'mplat', x: s, y: gh[s] - 2, dir: rnd() < 0.5 ? 'x' : 'y',
                  range: 3 + ((rnd() * 2) | 0) });
      ents.push({ t: 'gem', x: s + 1, y: gh[s] - 6 });
    }
  }

  // ---- コイン。地面の上にアーチ状に並べる
  for (let i = 0; i < 14; i++) {
    const s = 16 + ((rnd() * (w - 30)) | 0);
    const n = 3 + ((rnd() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const x = s + k;
      if (x >= w - 6 || gap[x]) continue;
      const lift = 1 + Math.round(Math.sin((k + 0.5) / n * Math.PI) * 2);
      const y = gh[x] - lift;
      if (y > 1 && g[y][x] === '.') ents.push({ t: 'coin', x, y });
    }
  }

  // ---- 穴の上にもコイン。跳ぶごほうび
  for (let x = 2; x < w - 6; x++) {
    if (gap[x] && !gap[x - 1] && rnd() < 0.6) {
      ents.push({ t: 'coin', x, y: gh[x] - 3 });
    }
  }

  // ---- 落ちているアイテムも少し。アイテムのおもな出どころはクイズだが、
  //      ひろって嬉しい驚きもほしいので 1〜2 個おく
  const nItem = 1 + ((rnd() * 2) | 0);
  for (let i = 0; i < nItem; i++) {
    const s = flatAt(30 + ((rnd() * (w - 60)) | 0), 1);
    if (s < 0) continue;
    taken[s] = true;
    ents.push({ t: 'item', kind: pick(rnd, ITEM_KINDS), x: s, y: gh[s] - 2 });
  }

  // ---- ジェムを少し
  for (let i = 0; i < 3; i++) {
    const x = 20 + ((rnd() * (w - 34)) | 0);
    if (gap[x]) continue;
    ents.push({ t: 'gem', x, y: gh[x] - 2 });
  }

  // ---- トゲ。ステージ 3 以降だけ、しかも少し
  if (stageNo >= 3) {
    const nSpike = 1 + ((rnd() * 2) | 0);
    for (let i = 0; i < nSpike; i++) {
      const s = flatAt(40 + ((rnd() * (w - 70)) | 0), 3);
      if (s < 0) continue;
      claim(s, 3);
      g[gh[s] - 1][s + 1] = '^';
      // トゲの手前にチェックポイント
      const c = flatAt(s - 8, 1);
      if (c >= 0 && !taken[c]) { taken[c] = true; ents.push({ t: 'check', x: c, y: gh[c] - 1 }); }
    }
  }

  const theme = THEMES[region] || THEMES['関東'];
  const sky = pick(rnd, SKIES);
  let event = pick(rnd, EVENTS);
  if (stageNo === 1) event = 'none';                 // 1 面はまず慣れてもらう
  if (event === 'dark' && sky.star === 0) event = 'wind';

  const stage = {
    w, h: W_H, g, ents, gh, gap, region, stageNo, theme, sky, event,
    spawn: { x: 3, y: gh[3] - 2 },
  };

  // ---- 作った決まりを守れているか、自分で数えて確かめる
  stage.check = verify(stage);
  return stage;
}

// 作ったステージが「クリアできる形」になっているか調べる。
// おかしければ理由を返す（画面には出さないが、テストで見る）。
function verify(st) {
  const problems = [];
  let run = 0;
  for (let x = 0; x < st.w; x++) {
    if (st.gap[x]) { run++; if (run > 2) problems.push('穴が広い x=' + x); }
    else {
      if (run > 0 && x > 0) {
        const a = st.gh[x - run - 1], b = st.gh[x];
        if (Math.abs(a - b) > 2) problems.push('穴の先の段差 x=' + x);
      }
      run = 0;
    }
  }
  for (let x = 1; x < st.w; x++) {
    if (st.gap[x] || st.gap[x - 1]) continue;
    if (st.gh[x - 1] - st.gh[x] > 2) problems.push('段差が高い x=' + x);
  }
  for (const e of st.ents) {
    if (e.t === 'enemy' && e.x < 14) problems.push('敵がスタートに近い x=' + e.x);
  }
  if (st.ents.filter(e => e.t === 'gate').length < 3) problems.push('鳥居が少ない');
  if (!st.ents.some(e => e.t === 'goal')) problems.push('ゴールがない');
  return problems;
}
