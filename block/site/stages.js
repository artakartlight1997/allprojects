// ブロックの ならびかた。
//
// 1文字 = 1つの ブロック。よこは 13こ。
//   .  なし
//   n  ふつう（1回）
//   h  かたい（2回）
//   H  もっと かたい（3回）
//   s  はがね（こわれない。かたちを 作る ため）
//   b  ばくだん（まわりも いっしょに こわれる）
//   ?  ふしぎ（かならず アイテムが 出る）
//
// ★ **はがね だけで かこまれた ところに ふつうの ブロックを 置かない**。
//   たまが 入れない ところに ブロックが のこると、いつまでも クリアできない。
//   （ならべた あと、ロボットで ぜんぶ こわせるか しらべて いる）

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;
const COLS = 13;

const LAYOUTS = [
  // 1
  ['.nnnnnnnnnnn.',
   '.nnnnnnnnnnn.',
   '.nnnnnnnnnnn.'],
  // 2
  ['nn.nn.nn.nn.n',
   '.nnnnnnnnnnn.',
   'n.nn.nn.nn.nn',
   '.nnnnnnnnnnn.'],
  // 3 ピラミッド
  ['......n......',
   '.....nnn.....',
   '....nnhnn....',
   '...nnhnhnn...',
   '..nnnnnnnnn..'],
  // 4 ★ リナパパ が 上を うろうろ
  ['.n.n.n.n.n.n.',
   'nnnnnnnnnnnnn',
   '.h.h.h.h.h.h.',
   'nnnnnnnnnnnnn'],
  // 5 トンネル
  ['nnnnn.n.nnnnn',
   'nnnnn.n.nnnnn',
   '.s...b.b...s.',
   'nnnhhhhhhhnnn',
   'nnnnnnnnnnnnn'],
  // 6 ハート
  ['..nnn...nnn..',
   '.nnnnn.nnnnn.',
   '.nnnnnnnnnnn.',
   '..nnnhhhnnn..',
   '...nnnnnnn...',
   '....nnnnn....',
   '.....nnn.....'],
  // 7 かべ の むこう
  ['nnnnnnnnnnnnn',
   '.s.n.s.n.s.n.',
   'hhhhhbhhhhhhh',
   '.nnnnnnnnnnn.',
   '..nn?nnn?nn..'],
  // 8 ★ リナパパ 2かい目
  ['nnn.nnnnn.nnn',
   'nHn.nnnnn.nHn',
   'nnn.nnnnn.nnn',
   '.n.nnnhnnn.n.',
   'nnnnnnnnnnnnn'],
  // 9 しま
  ['nn..HHHHH..nn',
   'nn..H???H..nn',
   'nn..HHHHH..nn',
   '.n.s.....s.n.',
   'nnnnnbnbnnnnn',
   '.nnnnnnnnnnn.'],
  // 10 ちどり
  ['n.n.n.n.n.n.n',
   '.h.h.h.h.h.h.',
   'n.n.n.n.n.n.n',
   '.H.H.H.H.H.H.',
   'n.n.n.n.n.n.n',
   '.n.n.n.n.n.n.'],
  // 11 とりで
  ['sHHHHHHHHHHHs',
   'n?nnnnnnnnn?n',
   'nnnbnnnnnbnnn',
   'hhhhhhhhhhhhh',
   '.nnnnnnnnnnn.',
   '..nnnnnnnnn..'],
  // 12 ★ さいごの リナパパ
  ['HHHHHHHHHHHHH',
   'n?nnnbnbnnn?n',
   'nnnnnnnnnnnnn',
   'hhh.hhhhh.hhh',
   'nnnnnnnnnnnnn',
   '.nn?nnnnn?nn.'],
];

// papa … リナパパの たいりょく（0 なら 出ない）
// spd  … たまの はやさ
const STAGES = [
  { name: '1. はじめての ブロックくずし', spd: 340, papa: 0 },
  { name: '2. すきま に 気をつけて',      spd: 354, papa: 0 },
  { name: '3. ピラミッド',                spd: 368, papa: 0 },
  { name: '4. リナパパ とうじょう！',     spd: 379, papa: 8 },
  { name: '5. トンネル と ばくだん',      spd: 393, papa: 0 },
  { name: '6. ハート',                    spd: 405, papa: 0 },
  { name: '7. かべの むこう',             spd: 416, papa: 0 },
  { name: '8. リナパパ ふたたび',         spd: 428, papa: 12 },
  { name: '9. しま めぐり',               spd: 439, papa: 0 },
  { name: '10. ちどり',                   spd: 451, papa: 0 },
  { name: '11. とりで',                   spd: 462, papa: 0 },
  { name: '12. さいごの リナパパ',        spd: 474, papa: 16 },
].map((s, i) => ({ ...s, map: LAYOUTS[i] }));

// ブロックの しゅるい
const BRICK = {
  n: { hp: 1, pt: 100, col: '#FF8FA0', name: 'ふつう' },
  h: { hp: 2, pt: 200, col: '#FFC46A', name: 'かたい' },
  H: { hp: 3, pt: 320, col: '#B98FE0', name: 'もっと かたい' },
  s: { hp: 99, pt: 0, col: '#8A93A8', name: 'はがね' },
  b: { hp: 1, pt: 250, col: '#5A5468', name: 'ばくだん' },
  '?': { hp: 1, pt: 150, col: '#6ACB6A', name: 'ふしぎ' },
};
