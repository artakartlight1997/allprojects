// まさきの ボールふえふえ 大くずし。
//
// ボールが「×2」「×3」で どんどん ふえて、ブロックが 一気に くずれる ブロックくずし。
//   ・アイテム … ×2 / ×3（いま ある ボール ぜんぶが ふえる）、+8、ワイド、ファイア
//   ・ゲート … とおりぬけた ボールが ふえる バー（1つの ボールは 1つの ゲートで 1回だけ）
//   ・5めんごとに ボス（うごく でかブロック）
// ボールは 1200こ まで。アイテムは たくさん 出る（シールド・ボール ばくはつ も）。
// ふえる たびに 大きな もじ・コンボ・「〇〇こ とっぱ！」・フィーバーで もりあげる。

'use strict';

const SAVE = 'ballsfuefue.v1';
const MAXB = 1200;
const MILES = [50, 100, 200, 300, 500, 800, 1000, 1200];
const COLS = 14;

// --- めん --------------------------------------------------------------------------
//  1〜9 … かたさ   x … ×2が でる   X … ×3が でる   p … +8が でる   b … ばくだん
//  s … スチール（こわれない。クリアに いらない）   ? … ふしぎ ブロック（こわすと アイテム 3こ）
//  gates … [よこの いち(0〜1), たての いち(0〜1), はば(0〜1), ばいりつ, うごく はやさ]

const STAGES = [
  { name: 'はじめの いっぽ', rows: [
    '..............',
    '.111111111111.',
    '.111x1111x111.',
    '.111111111111.',
    '.222222222222.',
    '.1111111X1111.',
    '.111111111111.',
    '.222222222222.',
  ], gates: [[0.5, 0.62, 0.3, 2, 0]] },
  { name: 'ふえる たのしさ', rows: [
    '22222222222222',
    '21111111111112',
    '21111x11x11112',
    '21111111111112',
    '22222222222222',
  ], gates: [[0.3, 0.6, 0.22, 2, 0], [0.7, 0.6, 0.22, 2, 0]] },
  { name: 'ハート', rows: [
    '..222....222..',
    '.22222..22222.',
    '222x222222x222',
    '22222222222222',
    '.222222222222.',
    '..2222222222..',
    '...22222222...',
    '....222X22....',
    '.....2222.....',
    '......22......',
  ], gates: [[0.5, 0.7, 0.34, 3, 0]] },
  { name: 'ばくだん しましま', rows: [
    '33333333333333',
    '1b1111b1111b11',
    '33333333333333',
    '11b1111b1111b1',
    '33333x33x33333',
  ], gates: [[0.5, 0.64, 0.25, 2, 60]] },
  { name: 'ボス：でかブロック', boss: 400, rows: [
    '..............',
    '..............',
    '..............',
    '11p11111111p11',
  ], gates: [[0.5, 0.66, 0.3, 2, 0]] },
  { name: 'ピラミッド', rows: [
    '......44......',
    '.....4444.....',
    '....43x334....',
    '...33333333...',
    '..3333X333333.',
    '.222222222222.',
    '22222222222222',
    '11111b11b11111',
  ], gates: [[0.25, 0.66, 0.2, 2, 0], [0.75, 0.66, 0.2, 2, 0]] },
  { name: 'チェック', rows: [
    '4.4.4.4.4.4.4.',
    '.4.4.4X4.4.4.4',
    '4.4.4.4.4.4.4.',
    '.3.3.3.3.3.3.3',
    '3.3x3.3.3x3.3.',
    '.3.3.3.3.3.3.3',
  ], gates: [[0.5, 0.62, 0.3, 3, 80]] },
  { name: 'ほし', rows: [
    '......55......',
    '......55......',
    '.....5555.....',
    '55555555555555',
    '.555555X55555.',
    '..5555555555..',
    '...55555555...',
    '..555x..x555..',
    '.5555....5555.',
    '555........555',
  ], gates: [[0.5, 0.72, 0.22, 2, 0], [0.2, 0.6, 0.16, 2, 0], [0.8, 0.6, 0.16, 2, 0]] },
  { name: '小倉城', rows: [
    '.....6666.....',
    '....666666....',
    '.......6......',
    '...55555555...',
    '..5555X55555..',
    '.....4444.....',
    '..4444444444..',
    '.44x44444x444.',
    '33333333333333',
    '3333b3333b3333',
  ], gates: [[0.5, 0.74, 0.34, 3, 0]] },
  { name: 'ボス：ぐるぐるブロック', boss: 900, rows: [
    '..............',
    '..............',
    '..............',
    '..............',
    '22p2222222p222',
    '33333b33b33333',
  ], gates: [[0.3, 0.68, 0.2, 2, 90], [0.7, 0.68, 0.2, 2, -90]] },
  { name: 'かべ', rows: [
    '66666666666666',
    '66666666666666',
    '5555X5555X5555',
    '55555555555555',
    '44444444444444',
    '4b44444444444b',
  ], gates: [[0.5, 0.62, 0.5, 3, 0]] },
  { name: 'にっこり', rows: [
    '...77777777...',
    '..7777777777..',
    '.777.7777.777.',
    '.777.7777.777.',
    '.777777777777.',
    '.77x777777X77.',
    '.777.....7777.',
    '..777....777..',
    '...77777777...',
  ], gates: [[0.5, 0.74, 0.24, 3, 120]] },
  { name: 'ぐるぐる', rows: [
    '88888888888888',
    '8............8',
    '8.6666666666.8',
    '8.6........6.8',
    '8.6.44X444.6.8',
    '8.6.4....x.6.8',
    '8.6.444444.6.8',
    '8.6........6.8',
    '8.666666666b.8',
  ], gates: [[0.5, 0.78, 0.4, 2, 100]] },
  { name: 'とりで', rows: [
    '9.9.9.9.9.9.9.',
    '99999999999999',
    '8888X8888X8888',
    '77777777777777',
    '66b66666666b66',
    '55555555555555',
    '4444x4444x4444',
  ], gates: [[0.25, 0.7, 0.2, 3, 0], [0.75, 0.7, 0.2, 3, 0]] },
  { name: 'ボス：キングブロック', boss: 1800, rows: [
    '..............',
    '..............',
    '..............',
    '..............',
    '55p5555555p555',
    '4444b4444b4444',
    '33X33333333X33',
  ], gates: [[0.5, 0.72, 0.3, 3, 110]] },
  // --- 16〜40めん：あたらしい ブロック s＝スチール（こわれない）・?＝ふしぎ（アイテム 3こ） ---
  { name: "スチールの かべ", rows: [
    '22222222222222',
    '2x2222222222X2',
    '22222222222222',
    'sss.ssssss.sss',
    '11111111111111',
    '1111p1111p1111',
  ], gates: [[0.5, 0.62, 0.3, 2, 0]] },
  { name: "ふしぎ ブロック", rows: [
    '..?........?..',
    '.333333333333.',
    '.3?33333333?3.',
    '.333333333333.',
    '..2222x22222..',
    '...22222222...',
    '....2?22?2....',
  ], gates: [[0.3, 0.64, 0.22, 2, 0], [0.7, 0.64, 0.22, 2, 0]] },
  { name: "ジグザグ", rows: [
    '4.............',
    '44............',
    '444x..........',
    '.4444.........',
    '..44444.......',
    '...444444?....',
    '....44444444..',
    '.....444X44444',
    '......44444444',
  ], gates: [[0.5, 0.7, 0.34, 2, 90]] },
  { name: "さかな", rows: [
    '....55555.....',
    '..555555555..5',
    '.555s5555555.5',
    '555555x5555555',
    '55555555555555',
    '.5555555X5555.',
    '..555555555..5',
    '....55555.....',
  ], gates: [[0.5, 0.72, 0.3, 3, 0]] },
  { name: "ボス：スチール ガード", boss: 4000, rows: [
    '..............',
    '..............',
    '..............',
    's..s..ss..s..s',
    '33p333333333p3',
    '44444b44b44444',
    '?............?',
  ], gates: [[0.3, 0.7, 0.22, 3, 80], [0.7, 0.7, 0.22, 3, -80]] },
  { name: "ダイヤ", rows: [
    '......66......',
    '.....6666.....',
    '....66?666....',
    '...66666X66...',
    '..6666666666..',
    '...66x66666...',
    '....666666....',
    '.....6666.....',
    '......66......',
  ], gates: [[0.5, 0.74, 0.4, 2, 0]] },
  { name: "はしご", rows: [
    '5............5',
    '55555555555555',
    '5..s......s..5',
    '555555x5555555',
    '5............5',
    '5555555X555555',
    '5..s......s..5',
    '55555555555555',
  ], gates: [[0.25, 0.7, 0.2, 3, 0], [0.75, 0.7, 0.2, 3, 0]] },
  { name: "ばくだん だらけ", rows: [
    '6b6b6b6b6b6b6b',
    'b6b6b6b6b6b6b6',
    '6b6b6x6b6b6b6b',
    'b6b6b6b6bX6b6b',
    '6b6b6b6b6b6b6b',
    '77777777777777',
  ], gates: [[0.5, 0.66, 0.3, 3, 100]] },
  { name: "ロケット", rows: [
    '......77......',
    '.....7777.....',
    '.....7?77.....',
    '.....7777.....',
    '....777777....',
    '....77X777....',
    '...77777777...',
    '..777.77.777..',
    '..ss..ss..ss..',
  ], gates: [[0.5, 0.76, 0.3, 3, 0]] },
  { name: "ボス：はやい ブロック", boss: 6000, rows: [
    '..............',
    '..............',
    '..............',
    '..............',
    '55p555555555p5',
    '6666?6666?6666',
    'ss.ss.ss.ss.ss',
  ], gates: [[0.5, 0.72, 0.3, 3, 130]] },
  { name: "めいろ", rows: [
    '77777777777777',
    'sssss.ssss.sss',
    '7777?777777777',
    's.ssssss.sssss',
    '77X7777777x777',
    'sss.sssss.ssss',
    '77777777777777',
  ], gates: [[0.5, 0.76, 0.4, 3, 0]] },
  { name: "にじ", rows: [
    '77777777777777',
    '66666666666666',
    '55555x55555555',
    '44444444X44444',
    '33333333333333',
    '222?22222222?2',
    '11111111111111',
  ], gates: [[0.2, 0.7, 0.2, 3, 0], [0.5, 0.62, 0.2, 2, 0], [0.8, 0.7, 0.2, 3, 0]] },
  { name: "ねこ", rows: [
    '.8..........8.',
    '.88........88.',
    '.888888888888.',
    '.88.88888.888.',
    '.88?88888?888.',
    '.888888888888.',
    '.8888X88x8888.',
    '..8888888888..',
    '...88888888...',
  ], gates: [[0.5, 0.76, 0.36, 3, 110]] },
  { name: "うずまき", rows: [
    '88888888888888',
    '.............8',
    '.99999999999.8',
    '.9.........9.8',
    '.9.77X77?..9.8',
    '.9.7ssssss.9.8',
    '.9.7777777x9.8',
    '.9999999999..8',
  ], gates: [[0.5, 0.78, 0.44, 3, 0]] },
  { name: "ボス：ダブル ガード", boss: 8000, rows: [
    '..............',
    '..............',
    '..............',
    'ss..........ss',
    '77p77777777p77',
    '888?888888?888',
    'ss.ssss.ssss.s',
  ], gates: [[0.25, 0.72, 0.2, 3, 120], [0.75, 0.72, 0.2, 3, -120]] },
  { name: "おしろ", rows: [
    '9.9.9....9.9.9',
    '999999..999999',
    '9?9999..9999?9',
    '99999999999999',
    '888888X8888888',
    '88888ssss88888',
    '8888s....s8888',
    '8x88s....s88X8',
  ], gates: [[0.5, 0.76, 0.3, 3, 0]] },
  { name: "ほしぞら", rows: [
    '?.....?......?',
    '...?......?...',
    '.7.......7....',
    '....?.7.....?.',
    '7.......?...7.',
    '..?..7....7...',
    '....7...?.....',
    '.?.....7.....?',
  ], gates: [[0.3, 0.66, 0.22, 3, 90], [0.7, 0.66, 0.22, 3, -90]] },
  { name: "かいだん", rows: [
    '9.............',
    '99............',
    '999...........',
    '9999x.........',
    '99999?........',
    '999999X.......',
    '9999999?......',
    '99999999s.....',
    '999999999s....',
    '9999999999s...',
  ], gates: [[0.65, 0.72, 0.3, 3, 0]] },
  { name: "モザイク", rows: [
    '98989898989898',
    '89898989898989',
    '989?89898?8989',
    '898989X8989898',
    '98989898x89898',
    'ssss.ssss.ssss',
    '76767676767676',
  ], gates: [[0.5, 0.7, 0.5, 3, 0]] },
  { name: "ボス：メガ ブロック", boss: 12000, rows: [
    '..............',
    '..............',
    '..............',
    's.s.s.ss.s.s.s',
    '88p8888888p888',
    '999?9999?99999',
    '9999b9999b9999',
  ], gates: [[0.2, 0.74, 0.18, 3, 140], [0.5, 0.66, 0.2, 4, 0], [0.8, 0.74, 0.18, 3, -140]] },
  { name: "まさきの かお", rows: [
    '...88888888...',
    '..8888888888..',
    '.888s8888s888.',
    '.888s8888s888.',
    '.88888?888888.',
    '.888x8888X888.',
    '.8888ssss8888.',
    '..8888888888..',
    '...88888888...',
  ], gates: [[0.5, 0.78, 0.34, 3, 0]] },
  { name: "ドラゴン", rows: [
    '99..........99',
    '999........999',
    '.999.9999.999.',
    '..9999999999..',
    '..99s9999s99..',
    '..999X9?9999..',
    '...99999999...',
    '....9x99x9....',
    '.....9999.....',
  ], gates: [[0.3, 0.74, 0.22, 3, 120], [0.7, 0.74, 0.22, 3, -120]] },
  { name: "さいごの とりで 1", rows: [
    '99999999999999',
    '9s9s9s9s9s9s9s',
    '99999?99999999',
    '88888888X88888',
    '8s8s8s8s8s8s8s',
    '88x88888888?88',
    '77777777777777',
    '7s7s7b7s7s7b7s',
  ], gates: [[0.5, 0.76, 0.36, 4, 110]] },
  { name: "さいごの とりで 2", rows: [
    'ssssss..ssssss',
    's9999999999999',
    's9?999999999?s',
    's99999X9999999',
    's8888888888888',
    's888x88888X88s',
    's7777777777777',
    'ssss..ssss..ss',
  ], gates: [[0.25, 0.76, 0.22, 4, 0], [0.75, 0.76, 0.22, 4, 0]] },
  { name: "ラスボス：キング オブ ブロック", boss: 20000, rows: [
    '..............',
    '..............',
    '..............',
    'ss.ss.ss.ss.ss',
    '99p9999999p999',
    '999?99bb99?999',
    '8888X8888X8888',
    'ss.ss.ss.ss.ss',
  ], gates: [[0.2, 0.76, 0.2, 4, 150], [0.5, 0.68, 0.2, 3, 0], [0.8, 0.76, 0.2, 4, -150]] },
];

// --- 41〜500めん：じどうで つくる めん --------------------------------------------------
// めんの ばんごうを「たね」に して つくるので、おなじ めんは いつも おなじ かたち。
// 50めんごとに ワールドが かわり、あとの めんほど かたく・スチールが ふえ・ゲートが はやい。
// 10めんごとに ボス。スチールで かこまれて とどかない ブロックが できたら スチールを あける。
const TOTAL = 500;
const WORLDS = [
  { name: 'はじまりの ひろば', boss: 'キング ブロック', col: '#241A5A' },
  { name: 'おかしの くに', boss: 'ケーキ ブロック', col: '#5A2A4A' },
  { name: 'うみの そこ', boss: 'クジラ ブロック', col: '#0A3A5A' },
  { name: 'もりの おく', boss: 'きのこ ブロック', col: '#1A4A2A' },
  { name: 'こおりの しま', boss: 'ゆきだるま ブロック', col: '#2A4A6A' },
  { name: 'かざんの まち', boss: 'マグマ ブロック', col: '#5A1A0A' },
  { name: 'そらの しろ', boss: 'くも ブロック', col: '#3A5A8A' },
  { name: 'うちゅう', boss: 'ユーフォー ブロック', col: '#0A0A2A' },
  { name: 'ゆめの せかい', boss: 'ユニコーン ブロック', col: '#4A2A6A' },
  { name: 'さいごの せかい', boss: 'ブロック だいまおう', col: '#2A0A1A' },
];
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// スチールで かこまれた ブロックを なくす（とどかない ところの となりの スチールを あける）
function openSteel(g) {
  const R = g.length, C = 14;
  for (let guard = 0; guard < 200; guard++) {
    const seen = Array.from({ length: R + 2 }, () => Array(C).fill(false));
    const q = [];
    for (let c = 0; c < C; c++) q.push([R, c]);
    while (q.length) {
      const [r, c] = q.pop();
      if (r < -1 || r > R || c < 0 || c >= C || seen[r + 1][c]) continue;
      if (r >= 0 && r < R && g[r][c] === 's') continue;
      seen[r + 1][c] = true;
      q.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
    let fixed = false, bad = false;
    for (let r = 0; r < R && !fixed; r++) for (let c = 0; c < C && !fixed; c++) {
      if (g[r][c] === '.' || g[r][c] === 's' || seen[r + 1][c]) continue;
      bad = true;
      // となりの スチールで、その むこうが とどく ところ → あける
      for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
        const rr2 = r + dr, cc = c + dc;
        if (rr2 >= 0 && rr2 < R && cc >= 0 && cc < C && g[rr2][cc] === 's') { g[rr2][cc] = '1'; fixed = true; break; }
      }
    }
    if (!bad) return g;
    if (!fixed) { for (const row of g) for (let c = 0; c < C; c++) if (row[c] === 's') { row[c] = '1'; } return g; }
  }
  return g;
}
function genStage(i) {
  const n = i + 1, R = seeded(n * 9973 + 17), w = Math.min(WORLDS.length - 1, Math.floor(i / 50));
  const boss = n % 10 === 0;
  const nr = boss ? 7 : Math.min(10, 5 + Math.floor(R() * 4) + Math.floor(n / 150));
  const hpBase = Math.min(8, 1 + Math.floor(n / 60));
  const pat = Math.floor(R() * 8), dens = 0.55 + R() * 0.35, ph = R() * 6;
  const g = Array.from({ length: nr }, () => Array(14).fill('.'));
  const top = boss ? 3 : 0;
  for (let r = top; r < nr; r++) for (let c = 0; c < 14; c++) {
    const m = c < 7 ? c : 13 - c;          // ひだりみぎ たいしょう
    const rr2 = r - top, cr = (nr - top) / 2;
    let on;
    if (pat === 0) on = seeded(n * 31 + rr2 * 7 + m)() < dens;
    else if (pat === 1) on = rr2 % 2 === 0 || m % 3 === 0;
    else if (pat === 2) on = (rr2 + m) % 2 === 0;
    else if (pat === 3) on = Math.abs(rr2 - cr) + Math.abs(m - 6.5) * 0.7 < cr + 2;
    else if (pat === 4) { const d = Math.hypot(rr2 - cr, (m - 6.5) * 0.6); on = d > 1.2 && d < cr + 1.5; }
    else if (pat === 5) on = Math.abs(Math.sin(m * 0.7 + ph) * 2 + cr - rr2) < 1.6;
    else if (pat === 6) on = m % 3 !== 1 || rr2 % 3 === 0;
    else on = Math.min(rr2, nr - top - 1 - rr2, m) % 2 === 0;
    if (!on) continue;
    const hp = Math.max(1, Math.min(9, hpBase + Math.floor(R() * 3) - 1 + (rr2 < 2 ? 1 : 0)));
    let ch = String(hp);
    const u = R();
    if (u < 0.03) ch = 'x'; else if (u < 0.045) ch = 'X'; else if (u < 0.055) ch = 'p'; else if (u < 0.07) ch = 'b'; else if (u < 0.085) ch = '?';
    g[r][c] = ch;
  }
  // スチール：よこの かべ（すきまつき）と ぽつぽつ
  const steelP = Math.min(0.12, 0.02 + n / 4000);
  for (let r = top; r < nr; r++) {
    if (R() < 0.18 + n / 3000) {
      const gap1 = Math.floor(R() * 6), gap2 = gap1 + 2 + Math.floor(R() * 3);
      for (let c = 0; c < 7; c++) if (c !== gap1 && c !== gap2 && g[r][c] !== '.') { g[r][c] = 's'; g[r][13 - c] = 's'; }
    }
    for (let c = 0; c < 7; c++) if (g[r][c] !== '.' && R() < steelP) { g[r][c] = 's'; g[r][13 - c] = 's'; }
  }
  openSteel(g);
  // こわせる ブロックが すくなすぎたら 1れつ たす
  if (g.flat().filter((ch) => ch !== '.' && ch !== 's').length < 14) for (let c = 0; c < 14; c++) g[nr - 1][c] = String(hpBase);
  const gates = [];
  const ng = boss ? 2 + Math.floor(R() * 2) : 1 + Math.floor(R() * 3);
  for (let k = 0; k < ng; k++) {
    const sp = R() < 0.5 ? 0 : Math.min(220, 60 + n * 0.3) * (R() < 0.5 ? -1 : 1);
    gates.push([0.2 + R() * 0.6, 0.6 + R() * 0.18, 0.16 + R() * 0.16, 2 + Math.floor(R() * 2) + (n > 200 ? 1 : 0), sp]);
  }
  return { name: boss ? 'ボス：' + WORLDS[w].boss : WORLDS[w].name + ' ' + (n - w * 50), boss: boss ? 20000 + (n - 40) * 400 : 0, rows: g.map((row) => row.join('')), gates, world: w };
}
const BOSS_COL = ['#7A3AB8', '#E86AA8', '#3A8AD8', '#8A5A2A', '#8AC8E8', '#E85A2A', '#F0F0FF', '#4AE8B0', '#C88AF0', '#2A2A3A'];
const _stageCache = {};
function stage(i) { return i < STAGES.length ? STAGES[i] : (_stageCache[i] = _stageCache[i] || genStage(i)); }
function worldOf(i) { return Math.min(WORLDS.length - 1, Math.floor(i / 50)); }

// --- じょうたい ----------------------------------------------------------------------

const sv = store.get(SAVE, { best: 0, stars: {} });
const W = { mode: 'title', stage: 0, balls: [], bricks: [], items: [], parts: [], gates: [], texts: [],
  pad: { x: 0, w: 110, wideT: 0 }, fireT: 0, lives: 3, score: 0, held: true, boss: null, t: 0,
  dragOff: 0, dragging: false, clearT: 0, sndT: 0, maxBalls: 0, shake: 0,
  pops: [], combo: 0, comboT: 0, bestCombo: 0, mile: 0, flash: 0, pulse: 0, shieldT: 0, gatePopT: 0 };

// ばめんの ひろさ（たて長：うえに じょうほう、のこり ぜんぶが あそぶ ところ）
const TOP = 84;
function field() {
  return { x: 10, y: TOP, w: VW - 20, h: VH - TOP - 10 };
}
function cellW() { return field().w / COLS; }
const CH = 24;

function startStage(i) {
  W.stage = i; W.mode = 'play';
  const F = field(), cw = cellW();
  const S = stage(i);
  W.bricks = [];
  S.rows.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const hp = /[1-9]/.test(ch) ? +ch : 1;
      W.bricks.push({ c, r, x: F.x + c * cw, y: F.y + 70 + r * CH, w: cw, h: CH, hp, mhp: hp,
                      kind: /[1-9]/.test(ch) ? 'n' : ch, hit: 0 });
    }
  });
  // ボスは あとの めんほど はやい
  W.boss = S.boss ? { x: F.x + F.w / 2 - cw * 2.5, y: F.y + 70, w: cw * 5, h: CH * 3, hp: S.boss, mhp: S.boss, vx: 90 + Math.min(250, Math.max(0, i - 14) * 5), hit: 0 } : null;
  // ゲートは ひろめ・ばいりつ +1（×2 → ×3、×3 → ×4）で どんどん ふえる
  W.gates = (S.gates || []).map((g, gi) => ({ id: gi, x: F.x + F.w * g[0], y: F.y + F.h * g[1], w: Math.min(F.w * 0.8, F.w * g[2] * 1.3), mult: g[3] + 1, vx: g[4], hit: 0 }));
  W.itemsDropped = 0;
  W.balls = []; W.items = []; W.parts = []; W.texts = [];
  W.pad = { x: F.x + F.w / 2, w: 110, wideT: 0 };
  W.fireT = 0; W.lives = 3; W.score = 0; W.held = true; W.maxBalls = 1;
  W.pops = []; W.combo = 0; W.comboT = 0; W.bestCombo = 0; W.mile = 0; W.flash = 0; W.pulse = 0; W.shieldT = 0;
  resetBall();
  text2('ステージ ' + (i + 1) + '：' + S.name, '#FFE066', 2.2);
}
function resetBall() {
  W.balls = [newBall(W.pad.x, padY() - 9, 0, -1)];
  W.held = true;
}
function padY() { return field().y + field().h - 40; }
// タップで うつ：5こ いっしょに ひろがって とぶ
function launch() {
  if (!W.held) return;
  W.held = false;
  const b = W.balls[0], a0 = -Math.PI / 2 + rnd(-0.2, 0.2);
  const nb = newBall(b.x, b.y, Math.cos(a0), Math.sin(a0)); b.vx = nb.vx; b.vy = nb.vy;
  for (const d of [-0.5, -0.25, 0.25, 0.5]) W.balls.push(newBall(b.x, b.y, Math.cos(a0 + d), Math.sin(a0 + d)));
  // さいしょの 6びょうは シールドで おちない（まず ふやす）
  W.shieldT = Math.max(W.shieldT, 6);
  tone(700, 0.08, 'square', 0.1);
}
function pop(s, x, y, size, col) { W.pops.push({ s, x, y, size, col, t: 0.9 }); if (W.pops.length > 12) W.pops.shift(); }
// 〇〇こ とっぱ！
function checkMile() {
  const n = W.balls.length;
  W.maxBalls = Math.max(W.maxBalls, n);
  let m = 0;
  while (W.mile < MILES.length && n >= MILES[W.mile]) m = MILES[W.mile++];
  if (m) {   // いっきに こえても いちばん 大きい 1つだけ 出す
    const F = field();
    W.pops = W.pops.filter((p) => !/とっぱ/.test(p.s));
    pop('ボール ' + m + 'こ とっぱ！', F.x + F.w / 2, F.y + F.h * 0.38, m >= 500 ? 40 : 34, m >= 500 ? '#FF6FC8' : '#FFE066');
    jingle(m >= 500 ? [72, 79, 84, 91, 96] : [79, 84, 91], 0.06, 'square', 0.12);
    W.flash = 0.35; W.shake = 0.3;
  }
}
function newBall(x, y, dx, dy) {
  const sp = 490;
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, vx: dx / l * sp, vy: dy / l * sp, gate: -1, gt: 0 };
}
function text2(s, col, t) { W.texts.push({ s, col, t: t || 1.4, t0: t || 1.4 }); if (W.texts.length > 3) W.texts.shift(); }

// ボールを ふやす（いまの ボール ぜんぶが mult ばいに）
function multiply(mult, only) {
  const src = only || W.balls.slice();
  const add = [];
  for (const b of src) {
    for (let k = 1; k < mult; k++) {
      if (W.balls.length + add.length >= MAXB) break;
      const a = Math.atan2(b.vy, b.vx) + (k % 2 ? 1 : -1) * (0.25 + 0.12 * Math.floor(k / 2)) + rnd(-0.05, 0.05);
      const nb = newBall(b.x, b.y, Math.cos(a), Math.sin(a));
      nb.gate = b.gate; nb.gt = b.gt;
      add.push(nb);
    }
  }
  W.balls.push(...add);
  if (add.length) W.pulse = 0.25;
  checkMile();
  return add.length;
}

// --- こうしん ------------------------------------------------------------------------

function hitSound(f) {
  if (W.t - W.sndT < 0.035) return;
  W.sndT = W.t;
  tone(f, 0.05, 'square', 0.06);
}

function damageBrick(br, dmg) {
  if (br.kind === 's') { br.hit = 0.08; hitSound(180); return; }   // スチールは こわれない
  br.hp -= dmg; br.hit = 0.15;
  W.score += 5;
  if (br.hp > 0) { hitSound(500 + br.hp * 60); return; }
  br.dead = true;
  W.score += 20 + Math.min(W.combo, 100);
  W.combo++; W.comboT = 1.1; W.bestCombo = Math.max(W.bestCombo, W.combo);
  hitSound(700 + Math.min(W.combo, 80) * 12);
  for (let i = 0; i < 6 && W.parts.length < 700; i++) {
    W.parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: rnd(-160, 160), vy: rnd(-200, 60), t: 0.6, col: brickCol(br) });
  }
  let item = null;
  if (br.kind === 'x') item = 'x2';
  else if (br.kind === 'X') item = 'x3';
  else if (br.kind === 'p') item = 'plus';
  // アイテムは たくさん 出る（4こに 1こ くらい）
  else if (Math.random() < 0.24) item = pick(['x2', 'x2', 'x2', 'x3', 'x3', 'x5', 'plus', 'plus', 'burst', 'shield', 'wide', 'fire']);
  if (item) { W.items.push({ k: item, x: br.x + br.w / 2, y: br.y + br.h / 2 }); W.itemsDropped = (W.itemsDropped || 0) + 1; }
  if (br.kind === '?') {
    // ふしぎ ブロック：アイテムが 3こ とびだす
    for (let i = 0; i < 3; i++) W.items.push({ k: pick(['x2', 'x3', 'x3', 'x5', 'burst', 'shield', 'plus']), x: br.x + br.w / 2 + (i - 1) * 50, y: br.y + br.h / 2 });
    pop('？', br.x + br.w / 2, br.y, 40, '#FFE066'); jingle([84, 91, 96], 0.05, 'square', 0.1);
  }
  // ブロックを こわすと 5こに 1こ ボールが ぶんれつして ふえる
  if (Math.random() < 0.2 && W.balls.length < MAXB) { const a = rnd(-2.6, -0.5); W.balls.push(newBall(br.x + br.w / 2, br.y + br.h + 8, Math.cos(a), Math.sin(a))); }
  if (br.kind === 'b') {
    // ばくだん：まわりを いっしょに こわす
    noise(0.3, 0.3, 300); W.shake = 0.25;
    for (const o of W.bricks) {
      if (o.dead || o === br) continue;
      if (Math.abs(o.c - br.c) <= 1 && Math.abs(o.r - br.r) <= 1) damageBrick(o, 99);
    }
    for (let i = 0; i < 16; i++) W.parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: rnd(-300, 300), vy: rnd(-300, 300), t: 0.5, col: '#FFB020' });
  }
}

function brickAt(x, y) {
  const F = field(), cw = cellW();
  const c = Math.floor((x - F.x) / cw), r = Math.floor((y - F.y - 70) / CH);
  if (c < 0 || c >= COLS || r < 0) return null;
  return W.grid[r * COLS + c] || null;
}

function update(dt) {
  W.t += dt;
  for (const t of W.texts) t.t -= dt;
  W.texts = W.texts.filter((t) => t.t > 0);
  if (W.shake > 0) W.shake -= dt;
  if (W.flash > 0) W.flash -= dt;
  if (W.pulse > 0) W.pulse -= dt;
  for (const p of W.pops) { p.t -= dt; p.y -= 30 * dt; }
  W.pops = W.pops.filter((p) => p.t > 0);
  if (W.mode !== 'play') return;
  if (W.comboT > 0) { W.comboT -= dt; if (W.comboT <= 0) W.combo = 0; }
  if (W.shieldT > 0) W.shieldT -= dt;
  if (W.gatePopT > 0) W.gatePopT -= dt;
  const F = field();
  // パドル
  if (W.pad.wideT > 0) W.pad.wideT -= dt;
  W.pad.w = W.pad.wideT > 0 ? 180 : 110;
  if (KEYS.ArrowLeft) W.pad.x -= 620 * dt;
  if (KEYS.ArrowRight) W.pad.x += 620 * dt;
  W.pad.x = clamp(W.pad.x, F.x + W.pad.w / 2, F.x + F.w - W.pad.w / 2);
  if (W.fireT > 0) W.fireT -= dt;
  // グリッド（ボールと ブロックの あたりを はやく しらべる）
  W.grid = {};
  for (const br of W.bricks) if (!br.dead) W.grid[br.r * COLS + br.c] = br;
  // ゲート と ボス
  for (const g of W.gates) {
    if (g.vx) { g.x += g.vx * dt; if (g.x - g.w / 2 < F.x || g.x + g.w / 2 > F.x + F.w) { g.vx *= -1; g.x = clamp(g.x, F.x + g.w / 2, F.x + F.w - g.w / 2); } }
    if (g.hit > 0) g.hit -= dt;
  }
  const bs = W.boss;
  if (bs && bs.hp > 0) {
    bs.x += bs.vx * dt;
    if (bs.x < F.x || bs.x + bs.w > F.x + F.w) { bs.vx *= -1; bs.x = clamp(bs.x, F.x, F.x + F.w - bs.w); }
    if (bs.hit > 0) bs.hit -= dt;
  }
  if (W.held) {
    const b = W.balls[0];
    b.x = W.pad.x; b.y = padY() - 9;
  } else {
    const keep = [];
    const steps = W.balls.length > 400 ? 2 : 3;
    for (const b of W.balls) {
      let alive = true;
      for (let s = 0; s < steps && alive; s++) {
        const px = b.x, py = b.y;
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        // かべ
        if (b.x < F.x + 7) { b.x = F.x + 7; b.vx = Math.abs(b.vx); }
        if (b.x > F.x + F.w - 7) { b.x = F.x + F.w - 7; b.vx = -Math.abs(b.vx); }
        if (b.y < F.y + 7) { b.y = F.y + 7; b.vy = Math.abs(b.vy); }
        // パドル
        const pw = W.pad.w, pyy = padY();
        if (b.vy > 0 && b.y > pyy - 8 && py <= pyy - 8 && Math.abs(b.x - W.pad.x) < pw / 2 + 8) {
          const u = clamp((b.x - W.pad.x) / (pw / 2), -1, 1);
          const a = -Math.PI / 2 + u * 1.05;
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
          b.y = pyy - 9;
          hitSound(300);
        }
        // シールド：した の かべで はねかえる
        if (W.shieldT > 0 && b.vy > 0 && b.y > pyy + 22) { b.vy = -Math.abs(b.vy); b.y = pyy + 22; }
        if (b.y > F.y + F.h + 10) { alive = false; break; }
        // ゲート（したから うえへ とおりぬけた とき だけ）
        for (const g of W.gates) {
          if (b.vy < 0 && py >= g.y && b.y < g.y && Math.abs(b.x - g.x) < g.w / 2 && !(b.gate === g.id && W.t - b.gt < 0.8)) {
            b.gate = g.id; b.gt = W.t;
            g.hit = 0.15;
            multiply(g.mult, [b]);
            if (W.gatePopT <= 0) { W.gatePopT = 0.25; pop('×' + g.mult, b.x, g.y - 18, 26, g.mult >= 3 ? '#FFB060' : '#FFFFFF'); }
            if (W.t - W.sndT > 0.05) { tone(1200 + g.mult * 200, 0.06, 'triangle', 0.08); W.sndT = W.t; }
          }
        }
        // ボス
        if (bs && bs.hp > 0 && b.x > bs.x - 6 && b.x < bs.x + bs.w + 6 && b.y > bs.y - 6 && b.y < bs.y + bs.h + 6) {
          bs.hp -= W.fireT > 0 ? 2 : 1; bs.hit = 0.1; W.score += 3;
          hitSound(200);
          const fromX = px < bs.x - 6 || px > bs.x + bs.w + 6;
          if (fromX) b.vx *= -1; else b.vy *= -1;
          b.x = px; b.y = py;
          if (bs.hp <= 0) {
            W.shake = 0.6; noise(0.6, 0.4, 250);
            for (let i = 0; i < 60; i++) W.parts.push({ x: bs.x + rnd(0, bs.w), y: bs.y + rnd(0, bs.h), vx: rnd(-300, 300), vy: rnd(-300, 200), t: 0.9, col: pick(['#FFB020', '#FF5A5A', '#FFE066']) });
            text2('ボスを たおした！', '#FFE066', 2);
            W.score += 2000;
          }
        }
        // ブロック
        const br = brickAt(b.x, b.y);
        if (br && !br.dead) {
          // たてに うごいて 入ったか、よこに うごいて 入ったかで はねかえる むきを きめる
          const byY = brickAt(px, b.y) === br, byX = brickAt(b.x, py) === br;
          damageBrick(br, W.fireT > 0 ? 3 : 1);
          if (W.fireT <= 0 || !br.dead) {
            if (byY && !byX) b.vy *= -1;
            else if (byX && !byY) b.vx *= -1;
            else { b.vx *= -1; b.vy *= -1; }
            b.x = px; b.y = py;
          }
          if (br.dead) W.grid[br.r * COLS + br.c] = null;
        }
      }
      // たてに ばかり うごかない / よこに ばかり うごかない ように
      if (Math.abs(b.vy) < 90) b.vy = (b.vy < 0 ? -1 : 1) * 90;
      if (Math.abs(b.vx) < 25) b.vx = (b.vx < 0 ? -1 : 1) * 25;   // まっすぐ うえ・した だけで とまらない ように
      if (alive) keep.push(b);
    }
    W.balls = keep;
    if (!W.balls.length) {
      W.mile = 0; W.combo = 0;
      W.lives--;
      noise(0.4, 0.25, 200);
      if (W.lives <= 0) { W.mode = 'over'; tone(300, 0.5, 'triangle', 0.15, 80); }
      else { text2('ボールが なくなった… のこり ' + W.lives, '#FFB0B0', 1.6); resetBall(); }
    }
  }
  // アイテム
  for (const it of W.items) {
    it.y += 170 * dt;
    if (it.y > padY() - 14 && it.y < padY() + 12 && Math.abs(it.x - W.pad.x) < W.pad.w / 2 + 16) {
      it.got = true; takeItem(it.k);
    }
  }
  W.items = W.items.filter((it) => !it.got && it.y < F.y + F.h + 20);
  // こなごな
  for (const p of W.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.t -= dt; }
  W.parts = W.parts.filter((p) => p.t > 0);
  for (const br of W.bricks) if (br.hit > 0) br.hit -= dt;
  W.bricks = W.bricks.filter((b) => !b.dead);
  // クリア
  if (!W.bricks.some((b) => b.kind !== 's') && (!bs || bs.hp <= 0)) {
    W.mode = 'clear';
    const stars = W.lives >= 3 ? 3 : W.lives === 2 ? 2 : 1;
    sv.stars[W.stage] = Math.max(sv.stars[W.stage] || 0, stars);
    sv.best = Math.max(sv.best, W.stage + 1);
    store.set(SAVE, sv);
    jingle([72, 76, 79, 84, 88], 0.1, 'square', 0.14);
  }
}

function takeItem(k) {
  if (k === 'x2' || k === 'x3' || k === 'x5') {
    const m = k === 'x2' ? 2 : k === 'x3' ? 3 : 5;
    if (W.held) launch();
    const n = multiply(m);
    const F = field();
    pop('×' + m + '！', F.x + F.w / 2, F.y + F.h * 0.55, m >= 5 ? 90 : m >= 3 ? 76 : 64, itemCol(k));
    text2('ボール +' + n + '！', '#FFE066', 1.2);
    jingle(m >= 5 ? [79, 84, 91, 96, 103] : [79, 84, 91], 0.06, 'square', 0.12);
    W.shake = 0.12 + m * 0.04; W.flash = 0.12 + m * 0.03;
    for (let i = 0; i < 30 && W.parts.length < 700; i++) { const a = rnd(0, Math.PI * 2); W.parts.push({ x: W.pad.x, y: padY(), vx: Math.cos(a) * 320, vy: Math.sin(a) * 320 - 100, t: 0.7, col: itemCol(k) }); }
  } else if (k === 'plus' || k === 'burst') {
    // +10：パドルから / ボール ばくはつ：パドルから 30こ いっせいに
    const n = k === 'plus' ? 10 : 30, spread = k === 'plus' ? 0.9 : 1.25;
    for (let i = 0; i < n && W.balls.length < MAXB; i++) { const a = -Math.PI / 2 + spread * (i / (n - 1) * 2 - 1); W.balls.push(newBall(W.pad.x, padY() - 12, Math.cos(a), Math.sin(a))); }
    if (W.held) W.held = false;
    W.pulse = 0.25; checkMile();
    pop(k === 'plus' ? '+10！' : 'ボール ばくはつ！', W.pad.x, padY() - 60, k === 'plus' ? 44 : 38, itemCol(k));
    jingle(k === 'plus' ? [72, 79] : [67, 72, 79, 84], 0.06, 'square', 0.12);
    if (k === 'burst') { W.shake = 0.2; W.flash = 0.15; }
  } else if (k === 'shield') { W.shieldT = 10; text2('シールド！ おちない（10びょう）', '#9AE0FF', 1.4); tone(500, 0.3, 'sine', 0.12, 1000); } else if (k === 'wide') { W.pad.wideT = 12; text2('ワイド パドル！', '#7FC8F8', 1.2); tone(600, 0.2, 'sine', 0.12, 900); }
  else if (k === 'fire') { W.fireT = 8; text2('ファイア ボール！ つきぬける！', '#FF8A5A', 1.4); tone(300, 0.3, 'sawtooth', 0.08, 900); }
  W.maxBalls = Math.max(W.maxBalls, W.balls.length);
}

// --- かく ----------------------------------------------------------------------------

const HPCOL = ['#7FE0A0', '#7FC8F8', '#B98FE0', '#FF8FC8', '#FFB020', '#FF6A4A', '#E04A6E', '#8A94A8', '#5A6478'];
function brickCol(br) {
  if (br.kind === 'x' || br.kind === 'X' || br.kind === 'p') return '#FFE066';
  if (br.kind === 'b') return '#3A3448';
  if (br.kind === 's') return '#E4EAF2';
  if (br.kind === '?') return '#FFB020';
  return HPCOL[Math.min(8, br.mhp - 1)];
}
function itemLabel(k) { return { x2: '×2', x3: '×3', x5: '×5', plus: '+10', burst: '+30', shield: 'シールド', wide: 'ワイド', fire: 'ファイア' }[k]; }
function itemCol(k) { return { x2: '#FFE066', x3: '#FF8A3A', x5: '#FF6FC8', plus: '#9AF0B8', burst: '#6AF0E0', shield: '#9AE0FF', wide: '#7FC8F8', fire: '#FF5A5A' }[k]; }
const RAINBOW = ['#FF6A6A', '#FFB84A', '#FFE066', '#7FE0A0', '#7FC8F8', '#C8A0FF'];

function drawPlay(t) {
  const F = field();
  const sx = W.shake > 0 ? rnd(-5, 5) : 0, sy = W.shake > 0 ? rnd(-4, 4) : 0;
  ctx.save(); ctx.translate(sx, sy);
  const fever = W.balls.length >= 300;
  ctx.fillStyle = fever ? grad(F.y, F.y + F.h, 'hsl(' + Math.round(t * 80) % 360 + ',55%,28%)', '#0E0A28') : grad(F.y, F.y + F.h, WORLDS[worldOf(W.stage)].col, '#0E0A28');
  rr(F.x, F.y, F.w, F.h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  // ほし
  for (let i = 0; i < 20; i++) fillC(F.x + (i * 97) % F.w, F.y + (i * 61) % F.h, 1.2, 'rgba(255,255,255,0.4)');
  // ブロック
  for (const br of W.bricks) {
    const col = brickCol(br);
    fillRR(br.x + 1.5, br.y + 1.5, br.w - 3, br.h - 3, 5, br.hit > 0 ? '#FFFFFF' : col);
    fillR(br.x + 4, br.y + 3, br.w - 8, 4, 'rgba(255,255,255,0.3)');
    if (br.kind === 'n' && br.mhp > 1) text(br.hp, br.x + br.w / 2, br.y + br.h / 2 + 1, 13, 'rgba(20,10,40,0.8)', 'center');
    else if (br.kind === 'x' || br.kind === 'X') text(br.kind === 'x' ? '×2' : '×3', br.x + br.w / 2, br.y + br.h / 2 + 1, 13, '#8A4A00', 'center');
    else if (br.kind === 'p') text('+8', br.x + br.w / 2, br.y + br.h / 2 + 1, 13, '#8A4A00', 'center');
    else if (br.kind === 'b') text('💣', br.x + br.w / 2, br.y + br.h / 2 + 1, 13, '#FFFFFF', 'center');
    else if (br.kind === 's') {
      // スチール：ぎんいろ・ななめの ひかり・ふちどり・びょう
      ctx.strokeStyle = '#5A6478'; ctx.lineWidth = 2; rr(br.x + 1.5, br.y + 1.5, br.w - 3, br.h - 3, 5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(br.x + br.w * 0.35, br.y + br.h - 4); ctx.lineTo(br.x + br.w * 0.6, br.y + 4); ctx.stroke();
      for (const dx of [6, br.w - 6]) fillC(br.x + dx, br.y + br.h / 2, 2.4, '#5A6478');
    }
    else if (br.kind === '?') text('?', br.x + br.w / 2, br.y + br.h / 2 + 1, 16 + Math.sin(t * 6) * 2, '#FFFFFF', 'center', true);
  }
  // ボス
  const bs = W.boss;
  if (bs && bs.hp > 0) {
    fillRR(bs.x, bs.y, bs.w, bs.h, 12, bs.hit > 0 ? '#FFFFFF' : BOSS_COL[worldOf(W.stage)]);
    fillRR(bs.x + 6, bs.y + 6, bs.w - 12, 10, 5, 'rgba(255,255,255,0.25)');
    for (const sg of [-1, 1]) { fillC(bs.x + bs.w / 2 + sg * bs.w * 0.2, bs.y + bs.h * 0.45, 11, '#FFFFFF'); fillC(bs.x + bs.w / 2 + sg * bs.w * 0.2 + Math.sin(t * 2) * 3, bs.y + bs.h * 0.47, 6, '#2A2028'); }
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bs.x + bs.w / 2, bs.y + bs.h * 0.62, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    fillRR(F.x + 20, F.y + 16, F.w - 40, 14, 7, 'rgba(0,0,0,0.5)');
    fillRR(F.x + 20, F.y + 16, (F.w - 40) * bs.hp / bs.mhp, 14, 7, '#FF5A8A');
    text('ボス', F.x + 26, F.y + 44, 16, '#FFB0D0');
  }
  // ゲート
  for (const g of W.gates) {
    const a = g.hit > 0 ? 0.95 : 0.7;
    ctx.fillStyle = g.mult >= 3 ? 'rgba(255,138,58,' + a + ')' : 'rgba(255,224,102,' + a + ')';
    rr(g.x - g.w / 2, g.y - 7, g.w, 14, 7); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    textO('×' + g.mult, g.x, g.y - 1, 18, g.mult >= 3 ? '#FFD0A0' : '#FFFFFF');
  }
  // アイテム
  for (const it of W.items) {
    const gl = 1 + Math.sin(t * 10 + it.x) * 0.08;
    fillC(it.x, it.y, 30 * gl, 'rgba(255,255,255,0.18)');
    fillRR(it.x - 30, it.y - 15, 60, 30, 15, itemCol(it.k));
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; rr(it.x - 30, it.y - 15, 60, 30, 15); ctx.stroke();
    text(itemLabel(it.k), it.x, it.y + 1, itemLabel(it.k).length > 3 ? 12 : 19, '#2A1A10', 'center', true, 56);
  }
  // ボール
  const fire = W.fireT > 0, many = W.balls.length >= 100;
  // ボールが 100こ いじょうで にじいろ（いろ ごとに まとめて かく）
  const nCol = fire || !many ? 1 : RAINBOW.length;
  for (let ci = 0; ci < nCol; ci++) {
    ctx.fillStyle = fire ? '#FF8A5A' : many ? RAINBOW[ci] : '#FFFFFF';
    ctx.beginPath();
    for (let i = ci; i < W.balls.length; i += nCol) { const b = W.balls[i]; ctx.moveTo(b.x + 6.5, b.y); ctx.arc(b.x, b.y, 6.5, 0, Math.PI * 2); }
    ctx.fill();
  }
  if (fire) { ctx.fillStyle = 'rgba(255,200,80,0.5)'; for (const b of W.balls) { ctx.beginPath(); ctx.arc(b.x - b.vx * 0.015, b.y - b.vy * 0.015, 5, 0, Math.PI * 2); ctx.fill(); } }
  for (const p of W.parts) { ctx.globalAlpha = clamp(p.t * 2, 0, 1); fillR(p.x - 3, p.y - 3, 6, 6, p.col); }
  ctx.globalAlpha = 1;
  // シールド
  if (W.shieldT > 0) {
    const sy2 = padY() + 24, a = W.shieldT < 2 ? (Math.sin(t * 20) > 0 ? 0.9 : 0.3) : 0.9;
    fillR(F.x + 4, sy2, F.w - 8, 5, 'rgba(154,224,255,' + a + ')');
    fillR(F.x + 4, sy2 - 4, F.w - 8, 13, 'rgba(154,224,255,0.18)');
  }
  // フラッシュ
  if (W.flash > 0) fillR(F.x, F.y, F.w, F.h, 'rgba(255,255,255,' + Math.min(0.45, W.flash) + ')');
  // コンボ
  if (W.combo >= 10) textO('コンボ ' + W.combo, F.x + F.w - 16 - 60, F.y + 30, Math.min(40, 18 + W.combo * 0.2), W.combo >= 50 ? '#FF6FC8' : '#FFE066');
  if (fever) textO('フィーバー！', F.x + 90, F.y + 30, 22, 'hsl(' + Math.round(t * 200) % 360 + ',90%,70%)');
  // パドル
  const py = padY();
  fillRR(W.pad.x - W.pad.w / 2, py, W.pad.w, 16, 8, W.pad.wideT > 0 ? '#7FC8F8' : '#FF6FA8');
  fillRR(W.pad.x - W.pad.w / 2 + 6, py + 3, W.pad.w - 12, 4, 2, 'rgba(255,255,255,0.5)');
  if (W.held) textO('タップで スタート！', F.x + F.w / 2, py - 60, 24, '#FFE066');
  // 大きな もじ（×3！ など）
  for (const p of W.pops) {
    const u = 1 - p.t / 0.9, sc = u < 0.15 ? 0.6 + u / 0.15 * 0.6 : 1.2 - Math.min(0.2, (u - 0.15));
    ctx.globalAlpha = clamp(p.t / 0.3, 0, 1);
    textO(p.s, p.x, p.y, p.size * sc, p.col);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // うえの じょうほう（たて長）
  fillRR(8, 6, VW - 16, TOP - 12, 12, 'rgba(255,255,255,0.07)');
  text('ステージ ' + (W.stage + 1) + ' / ' + TOTAL, 20, 24, 17, '#FFFFFF', 'left', true);
  text(stage(W.stage).name, 20, 46, 13, '#FFE0B0', 'left', true, 150);
  text('ブロック あと ' + W.bricks.filter((b) => b.kind !== 's').length, 20, 64, 12, '#C8B8E0', 'left', false, 150);
  text('ボール', 232, 18, 12, '#C8B8E0', 'center');
  textO(String(W.held ? 1 : W.balls.length), 232, 44, 30 * (1 + Math.max(0, W.pulse) * 1.2), W.balls.length >= 300 ? '#FF6FC8' : W.balls.length >= 100 ? '#FFB020' : '#FFFFFF');
  text('さいだい ' + W.maxBalls, 232, 66, 11, '#C8B8E0', 'center');
  for (let i = 0; i < 3; i++) fillC(318 + i * 22, 24, 8, i < W.lives ? '#FF6FA8' : 'rgba(255,255,255,0.2)');
  text('スコア ' + W.score, 340, 52, 14, '#FFE066', 'center', true, 110);
  if (W.fireT > 0) text('ファイア ' + Math.ceil(W.fireT), 340, 68, 11, '#FF8A5A', 'center');
  else if (W.shieldT > 0) text('シールド ' + Math.ceil(W.shieldT), 340, 68, 11, '#9AE0FF', 'center');
  btn(VW - 88, 16, 74, 52, 'やめる', () => { W.page = undefined; W.mode = 'select'; }, { col: '#D8D0F0', size: 16 });
  // もじ
  W.texts.forEach((tx, i) => {
    ctx.globalAlpha = clamp(tx.t / 0.4, 0, 1);
    textO(tx.s, F.x + F.w / 2, F.y + F.h * 0.45 + i * 38, 26, tx.col);
    ctx.globalAlpha = 1;
  });
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#2A1A6A', '#0E0A28'); ctx.fillRect(0, 0, VW, VH);
  // ふえる ボールの かざり
  for (let i = 0; i < 60; i++) {
    const a = i * 2.4 + t * 0.4, r = 40 + (i * 7 + t * 60) % 300;
    fillC(VW / 2 + Math.cos(a) * r * 0.8, VH * 0.45 + Math.sin(a) * r, 5, i % 3 ? '#FFFFFF' : '#FFE066');
  }
  const ty = VH * 0.2;
  textO('ボール ふえふえ', VW / 2, ty, 56, '#FFE066', '#3A1A0A');
  textO('大くずし', VW / 2, ty + 72, 56, '#FF8FC8', '#3A0A1A');
  text('×2 ×3 ×5 で ボールが 1000こ いじょうに！', VW / 2, ty + 132, 19, '#FFFFFF', 'center');
  text('ぜんぶで 500めん・10ワールド', VW / 2, ty + 162, 17, '#FFE0B0', 'center', true);
  btn(VW / 2 - 150, VH * 0.58, 300, 84, 'あそぶ', () => { fullScreen(); W.page = undefined; W.mode = 'select'; }, { col: '#FFE066' });
  text('クリア ' + sv.best + ' / ' + TOTAL, VW / 2, VH * 0.58 + 124, 20, '#C8B8E0', 'center');
}

function drawSelect(t) {
  ctx.fillStyle = grad(0, VH, '#2A1A6A', '#0E0A28'); ctx.fillRect(0, 0, VW, VH);
  btn(12, 16, 96, 50, 'もどる', () => { W.mode = 'title'; }, { col: '#D8D0F0', size: 18 });
  // 25めんずつ ページ（50めんで 1ワールド）
  const PER = 25, pages = Math.ceil(TOTAL / PER);
  const latest = Math.min(sv.best, TOTAL - 1);
  if (W.page === undefined) W.page = Math.floor(latest / PER);
  const w = worldOf(W.page * PER);
  fillRR(120, 14, VW - 132, 56, 12, WORLDS[w].col);
  text('ワールド ' + (w + 1) + '：' + WORLDS[w].name, 120 + (VW - 132) / 2, 34, 18, '#FFFFFF', 'center', true, VW - 150);
  text((W.page * PER + 1) + '〜' + Math.min(TOTAL, (W.page + 1) * PER) + 'めん', 120 + (VW - 132) / 2, 56, 13, '#E0D8F8', 'center');
  const cols = 5, rows = 5;
  const bw = (VW - 30) / cols - 8, bh = Math.min(110, (VH - 250) / rows - 8);
  for (let k = 0; k < PER; k++) {
    const i = W.page * PER + k;
    if (i >= TOTAL) break;
    const x = VW / 2 - (cols * (bw + 8) - 8) / 2 + (k % cols) * (bw + 8);
    const y = 84 + Math.floor(k / cols) * (bh + 8);
    const open = i <= sv.best, isBoss = (i + 1) % 10 === 0 || (i < STAGES.length && STAGES[i].boss);
    btn(x, y, bw, bh, '', () => { if (open) startStage(i); }, { col: open ? (isBoss ? '#FFB0C8' : '#F4F0FF') : 'rgba(120,110,140,0.4)', flat: 1 });
    text(open ? String(i + 1) : '🔒', x + bw / 2, y + bh * 0.36, open ? 24 : 20, '#2A2440', 'center', true);
    if (isBoss && open) text('ボス', x + bw / 2, y + bh * 0.62, 12, '#A02A5A', 'center', true);
    const st = sv.stars[i] || 0;
    if (open) for (let k2 = 0; k2 < 3; k2++) { ctx.fillStyle = k2 < st ? '#FFB020' : 'rgba(0,0,0,0.15)'; star(x + bw / 2 - 16 + k2 * 16, y + bh * 0.84, 6); ctx.fill(); }
  }
  const py = 84 + rows * (bh + 8) + 10;
  btn(12, py, 70, 56, '◀◀', () => { W.page = Math.max(0, W.page - 2); }, { col: '#C8C0E8', size: 18 });
  btn(88, py, 90, 56, '◀', () => { W.page = (W.page + pages - 1) % pages; }, { col: '#D8D0F0', size: 24 });
  btn(VW - 178, py, 90, 56, '▶', () => { W.page = (W.page + 1) % pages; }, { col: '#D8D0F0', size: 24 });
  btn(VW - 82, py, 70, 56, '▶▶', () => { W.page = Math.min(pages - 1, W.page + 2); }, { col: '#C8C0E8', size: 18 });
  text((W.page + 1) + ' / ' + pages, VW / 2, py + 28, 16, '#FFFFFF', 'center', true);
  btn(VW / 2 - 110, py + 70, 220, 50, 'さいしんの めんへ（' + (latest + 1) + '）', () => { W.page = Math.floor(latest / PER); }, { col: '#FFE066', size: 15 });
  void t;
}

function drawEnd(t) {
  drawPlay(t);
  fillR(0, 0, VW, VH, 'rgba(0,0,0,0.55)');
  const clear = W.mode === 'clear';
  const cy = VH * 0.3;
  textO(clear ? 'ステージ クリア！' : 'ゲームオーバー', VW / 2, cy, 48, clear ? '#FFE066' : '#FFB0B0');
  text('さいだい ボール ' + W.maxBalls + 'こ　さいだい コンボ ' + W.bestCombo, VW / 2, cy + 60, 20, '#FFFFFF', 'center', true, VW - 30);
  text('スコア ' + W.score, VW / 2, cy + 92, 22, '#FFFFFF', 'center');
  if (clear) {
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k < (W.lives >= 3 ? 3 : W.lives === 2 ? 2 : 1) ? '#FFB020' : 'rgba(255,255,255,0.2)'; star(VW / 2 - 60 + k * 60, cy + 150, 24); ctx.fill(); }
  }
  const bw = 300, bx = VW / 2 - bw / 2;
  let by = cy + 200;
  if (clear && W.stage + 1 < TOTAL) { btn(bx, by, bw, 70, 'つぎへ', () => startStage(W.stage + 1)); by += 86; }
  else if (clear) { text('ぜんぶ クリア！ すごい！', VW / 2, by + 30, 26, '#FFE066', 'center'); by += 70; }
  btn(bx, by, bw, 70, 'もういちど', () => startStage(W.stage), { col: '#D8D0F0' });
  btn(bx + 30, by + 86, bw - 60, 56, 'ステージ いちらん', () => { W.page = undefined; W.mode = 'select'; }, { col: '#D8D0F0', size: 20 });
}

// --- そうさ ------------------------------------------------------------------------

startGame({
  bg: '#0E0A28',
  update,
  draw(t) {
    if (W.mode === 'title') drawTitle(t);
    else if (W.mode === 'select') drawSelect(t);
    else if (W.mode === 'play') drawPlay(t);
    else drawEnd(t);
  },
  down(x) {
    if (W.mode !== 'play') return;
    W.dragging = true; W.dragOff = W.pad.x - x;
    if (W.held) launch();
  },
  move(x, y, drag) {
    if (W.mode !== 'play' || !drag) return;
    W.pad.x = x + W.dragOff;
  },
  up() { W.dragging = false; },
  key(code, down) {
    if (!down || W.mode !== 'play') return;
    if ((code === 'Space' || code === 'ArrowUp') && W.held) launch();
  },
});
