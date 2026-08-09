// レトロ（8ビットふう）に 見せる ための どうぐ。3つの ゲームで 同じ ものを つかう。
//
// ★ むかしの ゲームは「四角い ドット」を ならべて 絵を 作って いた。
//   だから ここでは、絵を **文字の ならび**で 書いて、それを 四角で 描く。
//   たとえば
//       '.11.'
//       '1111'
//   と 書けば、1 の ところだけ 色が つく。curve（曲線）は つかわない。
//
// ★ そのうえで
//     ・よこじま（走査線）を うすく かさねる
//     ・画面の ふちを 少し 暗く する
//     ・数字は 3×5ドットの 手作り フォントで 出す
//   の 3つを すると、ブラウン管っぽく 見える。

'use strict';

// 8ビット機に あった ような、色数の 少ない パレット
const PAL = {
  k:  '#0B0B18',  // くろ
  w:  '#F8F8F8',  // しろ
  gy: '#9A9AB0',  // はいいろ
  dk: '#2A2A44',  // こい むらさき
  r:  '#F04848',  // あか
  o:  '#F08800',  // オレンジ
  y:  '#F8D800',  // きいろ
  g:  '#48C848',  // みどり
  dg: '#187818',  // こい みどり
  c:  '#48D8F8',  // みずいろ
  b:  '#3858F8',  // あお
  db: '#1830A8',  // こい あお
  p:  '#F878C8',  // ピンク
  v:  '#A858F8',  // むらさき
  br: '#8A5A28',  // ちゃいろ
  sk: '#F8C8A0',  // はだいろ
};

// 文字の ならびから 四角を 並べて 描く。
//   rows … ['.11.', '1111'] のような はいれつ
//   map  … { '1': PAL.r } のように 文字と 色を むすぶ
//   x, y … 左上（画面の ざひょう）
//   s    … ドット 1つの 大きさ
function drawSprite(rows, x, y, s, map) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const c = map[row[i]];
      if (!c) continue;
      ctx.fillStyle = c;
      // ★ 0.5 の ずれが 出ると 線が ぼやけるので、整数に そろえる
      ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s),
                   Math.ceil(s), Math.ceil(s));
    }
  }
}

// まん中を (cx, cy) にして 描く
function drawSpriteC(rows, cx, cy, s, map) {
  const w = rows[0].length * s, h = rows.length * s;
  drawSprite(rows, cx - w / 2, cy - h / 2, s, map);
}

// よこに はんてん（左右 むきの ちがう キャラに つかう）
function flipRows(rows) {
  return rows.map((r) => r.split('').reverse().join(''));
}
// 90どずつ まわす
function rotRows(rows) {
  const h = rows.length, w = rows[0].length;
  const out = [];
  for (let i = 0; i < w; i++) {
    let s = '';
    for (let j = h - 1; j >= 0; j--) s += rows[j][i];
    out.push(s);
  }
  return out;
}

// --- 3×5ドットの 数字（と すこしの 記号） --------------------------------------

const FONT35 = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '-': ['000', '000', '111', '000', '000'],
  '/': ['001', '001', '010', '100', '100'],
  'x': ['000', '101', '010', '101', '000'],
  ' ': ['000', '000', '000', '000', '000'],
};

// 数字を ドットで 描く。align: 'left' | 'right' | 'center'
function drawNum(s, x, y, size, col, align) {
  s = String(s);
  const w = s.length * 4 * size - size;
  let sx = x;
  if (align === 'right') sx = x - w;
  else if (align === 'center') sx = x - w / 2;
  for (let i = 0; i < s.length; i++) {
    const g = FONT35[s[i]] || FONT35[' '];
    drawSprite(g, sx + i * 4 * size, y, size, { '1': col });
  }
  return w;
}

// --- ブラウン管ふうの しあげ -------------------------------------------------------

// よこじま。2ドットごとに うすい 黒い 線を 引く。
function scanlines(alpha) {
  ctx.fillStyle = 'rgba(0,0,0,' + (alpha === undefined ? 0.11 : alpha) + ')';
  for (let y = 0; y < VH; y += 3) ctx.fillRect(0, y, VW, 1);
}

// 画面の ふちを 少し 暗く する
function vignette() {
  const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.30,
                                     VW / 2, VH / 2, Math.max(VW, VH) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}

// 画面ぜんたいの しあげ（毎コマ さいごに よぶ）
function crt() {
  scanlines();
  vignette();
}

// レトロっぽい 見出し（かげを 1ドット ずらして つける）
function retroText(s, x, y, size, col, shadow, align) {
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  if (shadow !== null) {
    ctx.fillStyle = shadow || PAL.dk;
    ctx.fillText(s, Math.round(x) + Math.max(2, size * 0.08), Math.round(y) + Math.max(2, size * 0.08));
  }
  ctx.fillStyle = col;
  ctx.fillText(s, Math.round(x), Math.round(y));
  ctx.textAlign = 'left';
}
