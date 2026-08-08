// ちずと てき と とう の 数字。
//
// みちは「マスの ならび」で 書く。とうは みち以外の マスに おける。
// 敵は みちの まん中を つないだ 線の 上を すすむ ので、
// 「あと どれだけ すすんだか」で ならべ かえれば いちばん 先の 敵が わかる。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;
const GW = 12, GH = 8;      // マスの 数

// --- てき ------------------------------------------------------------------------

const FOES = {
  slime: { name: 'スライム', hp: 34,  spd: 1.35, yen: 11, col: '#6ACB6A', r: 0.30, air: false, dmg: 1 },
  fast:  { name: 'はやいの', hp: 22,  spd: 2.55, yen: 12, col: '#FFD166', r: 0.26, air: false, dmg: 1 },
  tank:  { name: 'かたいの', hp: 100, spd: 0.85, yen: 26, col: '#8A8AA8', r: 0.38, air: false, dmg: 2 },
  bat:   { name: 'こうもり', hp: 40,  spd: 1.95, yen: 17, col: '#B98FE0', r: 0.28, air: true,  dmg: 1 },
  boss:  { name: 'ボス',     hp: 450, spd: 0.72, yen: 170, col: '#FF6A6A', r: 0.48, air: false, dmg: 5 },
};

// --- とう ------------------------------------------------------------------------

const TOWERS = {
  punch: { name: 'パンチ', cost: 60,  dmg: 16, rate: 0.55, range: 2.2, air: false,
           col: '#FF9C5A', about: '近くを 早く なぐる' },
  bomb:  { name: 'ばくだん', cost: 110, dmg: 25, rate: 1.15, range: 2.4, air: false, splash: 1.15,
           col: '#FF6A6A', about: 'まとめて どーん' },
  ice:   { name: 'こおり', cost: 90,  dmg: 11, rate: 0.75, range: 2.6, air: true, slow: 0.45,
           col: '#5AC8E8', about: 'おそく する。そらも うてる' },
  laser: { name: 'レーザー', cost: 170, dmg: 56, rate: 1.45, range: 3.7, air: true,
           col: '#B98FE0', about: '遠くまで つよい。そらも うてる' },
};
const TKEYS = ['punch', 'bomb', 'ice', 'laser'];

// レベルを 上げると つよく なる（3レベルまで）
function upCost(t) { return Math.round(TOWERS[t.k].cost * (0.8 + t.lv * 0.5)); }
function tDmg(t) { return TOWERS[t.k].dmg * (1 + (t.lv - 1) * 0.55); }
function tRange(t) { return TOWERS[t.k].range * (1 + (t.lv - 1) * 0.16); }
function tRate(t) { return TOWERS[t.k].rate * (1 - (t.lv - 1) * 0.12); }

// --- ちず ------------------------------------------------------------------------
//
// path は マスの ならび（[列, 行]）。となりどうしで つないでいく。

function line(a, b) {
  const out = [];
  const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
  let x = a[0], y = a[1];
  out.push([x, y]);
  while (x !== b[0] || y !== b[1]) {
    if (x !== b[0]) x += dx; else y += dy;
    out.push([x, y]);
  }
  return out;
}
// かどを つないで 1本の みちに する
function road(pts) {
  let out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = line(pts[i], pts[i + 1]);
    if (i) seg.shift();
    out = out.concat(seg);
  }
  return out;
}

const MAPS = [
  // 1 まっすぐ
  road([[-1, 4], [12, 4]]),
  // 2 コの字
  road([[-1, 1], [8, 1], [8, 6], [12, 6]]),
  // 3 ジグザグ
  road([[-1, 1], [3, 1], [3, 6], [8, 6], [8, 1], [12, 1]]),
  // 4 うずまき ふう
  road([[-1, 0], [10, 0], [10, 7], [1, 7], [1, 3], [12, 3]]),
  // 5 W
  road([[-1, 6], [2, 6], [2, 1], [5, 1], [5, 6], [8, 6], [8, 1], [12, 1]]),
  // 6 ながい S
  road([[-1, 7], [9, 7], [9, 4], [2, 4], [2, 1], [12, 1]]),
  // 7 かいだん
  road([[-1, 0], [2, 0], [2, 2], [5, 2], [5, 4], [8, 4], [8, 6], [12, 6]]),
  // 8 ぐるり
  road([[-1, 3], [1, 3], [1, 0], [10, 0], [10, 7], [3, 7], [3, 5], [12, 5]]),
  // 9 二重
  road([[-1, 0], [11, 0], [11, 3], [0, 3], [0, 6], [12, 6]]),
  // 10 ながい ジグザグ
  road([[-1, 7], [1, 7], [1, 1], [4, 1], [4, 6], [7, 6], [7, 1], [10, 1], [10, 7], [12, 7]]),
  // 11 めいろ ふう
  road([[-1, 4], [2, 4], [2, 0], [6, 0], [6, 5], [9, 5], [9, 1], [12, 1]]),
  // 12 さいご
  road([[-1, 0], [3, 0], [3, 6], [6, 6], [6, 1], [9, 1], [9, 7], [12, 7]]),
];

// --- ステージ ---------------------------------------------------------------------
//
// wave は「なみ」1つぶん。 { f: てきの しゅるい, n: 数, gap: 何びょう おき }
// 1つの なみに 2しゅるい 出す ときは はいれつで 書く。

// ★ もとは W という 名前だったが、ui.js の「画面の よこはば W」と
//   ぶつかって ui.js が まるごと よみこまれなく なっていた。
//   みんなが 見る ところに おく なまえに 1文字は つかわない。
function WV(f, n, gap) { return { f, n, gap }; }

// なみは 手で 書かずに、めんの ばんごうから 作る。
// 手書きだと「8めん目の 1なみ目 が いきなり 20ひき」の ように、
// **なみが だんだん つよく なる** かたちが かんたんに くずれる。
function makeWaves(stage) {
  const n = 5 + Math.min(6, Math.floor(stage * 0.6));   // 5〜11 なみ
  const hard = 1 + stage * 0.11;
  const out = [];
  for (let i = 0; i < n; i++) {
    const w = [];
    const base = Math.round((5 + i * 1.9) * hard);
    const gap = Math.max(0.34, 1.05 - i * 0.055);
    const kind = i % 4;
    if (kind === 0) {
      w.push(WV('slime', base, gap));
    } else if (kind === 1) {
      w.push(WV('fast', Math.round(base * 0.95), gap * 0.75));
    } else if (kind === 2) {
      // ★ そらの てき **だけ** の なみは 作らない。
      //   こおり／レーザーを 1つも 持って いない 子は 手も 足も 出ず、
      //   その なみで ♥が ぜんぶ なくなって しまう。
      //   じめんの てきと まぜて、「こおりが 要る」ことに 気づける ように する。
      if (stage >= 1) {
        w.push(WV('bat', Math.round(base * 0.5), gap));
        w.push(WV('slime', Math.round(base * 0.5), gap));
      } else {
        w.push(WV('slime', base, gap));
      }
    } else {
      w.push(WV('tank', Math.max(2, Math.round(base * 0.32)), gap * 2.2));
      w.push(WV('slime', Math.round(base * 0.6), gap));
    }
    // ボスは 4めん目から、おわりの ほうの なみに
    if (stage >= 3 && i >= n - 2) {
      w.push(WV('boss', Math.max(1, Math.floor((stage - 2) / 3) + (i === n - 1 ? 1 : 0)), 2.4));
    }
    out.push(w);
  }
  return out;
}

const S_NAMES = [
  '1. はじめての ぼうえい', '2. コの字', '3. ジグザグ', '4. うずまき',
  '5. W の みち', '6. ながい S', '7. かいだん', '8. ぐるり',
  '9. 二重の みち', '10. ながい ジグザグ', '11. めいろ', '12. さいごの まもり',
];

const STAGES = S_NAMES.map((name, i) => ({
  name,
  map: i,
  yen: 200 + i * 18,
  life: 20 - Math.floor(i / 4),
  waves: makeWaves(i),
}));
