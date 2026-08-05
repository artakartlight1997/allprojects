// 材料と、混ぜた結果できるスライムの性質。
//
// 入れた「量」がぜんぶを決める。同じ材料でも量がちがえば別のスライムになる。
//   のり + 水      → かさ（大きさ）
//   ホウ砂水       → かたさ。少なすぎるとベタベタ、多すぎるとカチカチ
//   絵の具(赤黄青) → 色。絵の具と同じまざりかたをする
//   白・黒         → 明るさ
//   フォーム       → ふわふわ・つや消し
//   ラメ / ビーズ  → きらきら / つぶつぶ

'use strict';

const INGREDIENTS = [
  { key: 'glue',   name: 'のり',      col: '#EAF2F8', rate: 26, unit: 'ml' },
  { key: 'water',  name: 'みず',      col: '#BFE4F5', rate: 22, unit: 'ml' },
  { key: 'borax',  name: 'ホウ砂水',  col: '#DCE8F0', rate: 9,  unit: 'ml' },
  { key: 'foam',   name: 'フォーム',  col: '#FFFFFF', rate: 18, unit: 'ml' },
  { key: 'red',    name: 'あか',      col: '#E24B3F', rate: 7,  unit: 'てき' },
  { key: 'yellow', name: 'きいろ',    col: '#F2C33D', rate: 7,  unit: 'てき' },
  { key: 'blue',   name: 'あお',      col: '#3A6FD8', rate: 7,  unit: 'てき' },
  { key: 'white',  name: 'しろ',      col: '#FFFFFF', rate: 7,  unit: 'てき' },
  { key: 'black',  name: 'くろ',      col: '#2B2630', rate: 4,  unit: 'てき' },
  { key: 'glitter', name: 'ラメ',     col: '#F7E27A', rate: 10, unit: 'ふり' },
  { key: 'beads',  name: 'ビーズ',    col: '#F6A5C0', rate: 10, unit: 'つぶ' },
];

function emptyMix() {
  const m = {};
  for (const g of INGREDIENTS) m[g.key] = 0;
  m.stir = 0;      // かきまぜた量
  return m;
}

// --- 色（絵の具とおなじ まざりかた）--------------------------------------
//
// ふつうに RGB を平均すると「青＋黄＝灰色」になってしまう。
// 絵の具は赤・黄・青が三原色なので、RYB の立方体を使って
// 「青＋黄＝みどり」「赤＋青＝むらさき」になるようにしている。

const RYB_CORNERS = [
  [255, 255, 255],  // 000 なにも入れない＝白
  [255, 0, 0],      // 100 あか
  [255, 255, 0],    // 010 きいろ
  [255, 128, 0],    // 110 だいだい
  [0, 0, 255],      // 001 あお
  [128, 0, 255],    // 101 むらさき
  [0, 255, 0],      // 011 みどり
  [51, 25, 0],      // 111 こげ茶
];

function rybToRgb(r, y, b) {
  const out = [0, 0, 0];
  for (let i = 0; i < 8; i++) {
    const wr = (i & 1) ? r : 1 - r;
    const wy = (i & 2) ? y : 1 - y;
    const wb = (i & 4) ? b : 1 - b;
    const w = wr * wy * wb;
    for (let k = 0; k < 3; k++) out[k] += RYB_CORNERS[i][k] * w;
  }
  return out;
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function mixColor(m) {
  const paint = m.red + m.yellow + m.blue;
  let rgb;
  if (paint < 0.01) {
    rgb = [236, 240, 245];                       // 絵の具なし＝すきとおった白
  } else {
    // いちばん多い絵の具を 1 として比をとる。全体量が多いほど 色が濃くなる
    const mx = Math.max(m.red, m.yellow, m.blue);
    const strength = clamp01(paint / 26);
    rgb = rybToRgb(m.red / mx * strength, m.yellow / mx * strength,
                   m.blue / mx * strength);
  }
  // 白と黒とフォームで 明るさを動かす
  const light = clamp01((m.white + m.foam * 0.5) / 22);
  const dark = clamp01(m.black / 12);
  for (let k = 0; k < 3; k++) {
    rgb[k] = rgb[k] + (255 - rgb[k]) * light;
    rgb[k] = rgb[k] * (1 - dark * 0.85);
  }
  return rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))));
}

function rgbCss(rgb, a) {
  return a === undefined ? 'rgb(' + rgb.join(',') + ')'
                         : 'rgba(' + rgb.join(',') + ',' + a + ')';
}

function shade(rgb, k) {
  return rgb.map((v) => Math.round(Math.max(0, Math.min(255,
    k >= 0 ? v + (255 - v) * k : v * (1 + k)))));
}

// 色の名前（できあがりの名前に使う）
function colorName(rgb) {
  const [r, g, b] = rgb;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2 / 255;
  if (mx - mn < 26) return l > 0.78 ? 'しろ' : l < 0.3 ? 'くろ' : 'グレー';
  let h = 0;
  const d = mx - mn;
  if (mx === r) h = ((g - b) / d + 6) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  const names = [[15, 'あか'], [45, 'オレンジ'], [70, 'きいろ'], [100, 'きみどり'],
                 [160, 'みどり'], [200, 'みずいろ'], [250, 'あお'],
                 [290, 'むらさき'], [335, 'ピンク'], [360, 'あか']];
  let base = 'あか';
  for (const [deg, n] of names) { if (h <= deg) { base = n; break; } }
  // 絵の具を ぜんぶ まぜると こげ茶になる。「ダークオレンジ」より
  // 「ちゃいろ」のほうが 見たとおり
  if (h >= 15 && h <= 55 && l < 0.42) return l < 0.2 ? 'こげちゃ' : 'ちゃいろ';
  if (l > 0.8) return 'パステル' + base;
  if (l < 0.28) return 'ダーク' + base;
  return base;
}

// --- 性質 -----------------------------------------------------------------
//
// ratio（ホウ砂水 ÷ のり+水）が すべての手ざわりを決める。
//   〜0.14  ベタベタ（手にくっつく。のびるけど ちぎれる）
//   0.14〜0.5 ちょうどいい（よくのびる）
//   0.5〜   カチカチ（のびないが よくはずむ）

function analyze(m) {
  const liquid = m.glue + m.water * 0.6;
  const volume = m.glue + m.water * 0.6 + m.foam * 0.9 + m.beads * 0.3;
  const ratio = liquid > 0.5 ? m.borax / liquid : 0;
  const rgb = mixColor(m);

  // のびは ratio 0.3 あたりが いちばん良い（山なり）
  const stretch = clamp01(Math.exp(-Math.pow((ratio - 0.30) / 0.20, 2)));
  const bounce = clamp01((ratio - 0.12) / 0.55);
  const soft = clamp01(1 - ratio / 0.6);
  const foamRatio = volume > 0.5 ? clamp01(m.foam / volume) : 0;
  const gloss = clamp01(1 - foamRatio * 1.3);
  const sparkle = volume > 0.5 ? clamp01(m.glitter / volume * 2.2) : 0;
  const crunch = volume > 0.5 ? clamp01(m.beads / volume * 2.2) : 0;
  const stir = clamp01(m.stir / 100);

  let state = 'good';
  if (ratio < 0.14) state = 'sticky';
  else if (ratio > 0.55) state = 'hard';
  if (volume < 12) state = 'tiny';

  // できばえ。ちょうどよさ・かさ・まぜ具合 から
  const balance = clamp01(1 - Math.abs(ratio - 0.32) / 0.34);
  const sizeOk = clamp01(volume / 55);
  const grade = clamp01(balance * 0.55 + sizeOk * 0.25 + stir * 0.20);

  return { volume, ratio, rgb, stretch, bounce, soft, gloss, sparkle, crunch,
           stir, state, grade, foamRatio, marble: m.marble || null };
}

// 手ざわりの名前
function textureName(p) {
  if (p.state === 'tiny') return 'ちいさな';
  if (p.state === 'sticky') return 'ベタベタ';
  if (p.state === 'hard') return 'カチカチ';
  if (p.foamRatio > 0.35) return 'ふわふわ';
  if (p.crunch > 0.35) return 'つぶつぶ';
  if (p.stretch > 0.85) return 'びよーん';
  if (p.bounce > 0.6) return 'ぷりぷり';
  return 'もちもち';
}

function slimeName(m, p) {
  const tex = textureName(p);
  let extra = '';
  if (p.sparkle > 0.45) extra = 'ラメ';
  else if (p.crunch > 0.45 && tex !== 'つぶつぶ') extra = 'つぶ';
  else if (p.stir < 0.25 && (m.red + m.yellow + m.blue) > 3) extra = 'マーブル';
  return tex + extra + colorName(p.rgb) + 'スライム';
}

// とくべつな組み合わせ
function rareTitle(m, p) {
  if (p.sparkle > 0.5 && p.stretch > 0.7 && p.rgb[2] > 120 && p.rgb[0] < 120) {
    return 'ギャラクシー';
  }
  if (p.foamRatio > 0.4 && p.sparkle > 0.4) return 'ゆきのくに';
  if (p.crunch > 0.5 && p.bounce > 0.5) return 'あられ';
  if (p.stretch > 0.93 && p.grade > 0.8) return 'めいじん';
  if (p.rgb[0] > 220 && p.rgb[1] > 200 && p.rgb[2] < 120 && p.sparkle > 0.3) {
    return 'はちみつ';
  }
  return null;
}

// できあがりの ひとこと
function advice(p) {
  if (p.state === 'tiny') return 'のりを もっと 入れてみよう';
  if (p.state === 'sticky') return 'ホウ砂水を すこし 足すと まとまるよ';
  if (p.state === 'hard') return 'ホウ砂水が 多すぎ。のりか 水を 足そう';
  if (p.stir < 0.3) return 'もっと かきまぜると なめらかになる';
  if (p.grade > 0.85) return 'かんぺきな 手ざわり！';
  return 'いい かんじ！ ほかの 配合も ためしてみよう';
}
