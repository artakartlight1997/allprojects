// 10 めんの 中身。てきの しゅるいと、どの じゅんばんで 出てくるか。
//
// てきの ならびは「たね」から 毎回 おなじに 作る。だから
// 何回 あそんでも 同じ 面は 同じ かたち。おぼえて うまく なれる。

'use strict';

const VH = 450;                     // ゲームの 中の たての 大きさ（画面に 合わせて のばす）

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- てき ---------------------------------------------------------------------
//
// vx は「よこに 流れる ぶんに 足す 速さ」。マイナスほど こっちに 速く 来る。

const FOE = {
  tori:   { name: 'とり',     hp: 1, r: 20, vx: -30,  pat: 'wave', amp: 22, col: '#F0A050', pts: 10 },
  komori: { name: 'こうもり', hp: 1, r: 18, vx: -60,  pat: 'wave', amp: 62, col: '#9A78D8', pts: 15 },
  kumo:   { name: 'くも',     hp: 2, r: 31, vx: -20,  pat: 'flat', amp: 0,  col: '#D4E4F4', pts: 25 },
  hoshi:  { name: 'ほし',     hp: 2, r: 22, vx: -24,  pat: 'zig',  amp: 90, col: '#FFD166', pts: 20 },
  roke:   { name: 'ロケット', hp: 1, r: 20, vx: -115, pat: 'flat', amp: 0,  col: '#E8506A', pts: 20 },
  ufo:    { name: 'ユーフォー', hp: 2, r: 26, vx: -18, pat: 'wave', amp: 40, col: '#6FE0C0',
            pts: 30, shoot: 3.0 },
};

const BOSS = {
  kumoking: { name: 'にゅうどうぐも', hp: 14, r: 74, col: '#C8D8EC', shoot: 2.5, spd: 55,
              rule: '大きな くもの ぼす。あわを たくさん ぶつけろ！' },
  dragon:   { name: 'かみなりドラゴン', hp: 24, r: 82, col: '#9A6AE8', shoot: 2.0, spd: 72,
              rule: 'かみなりを よけながら あわを ぶつけろ！' },
};

// --- 10 めん -------------------------------------------------------------------

const STAGES = [
  { name: 'あおぞら',       sky: ['#8ED6FF', '#D8F0FF'], len: 36, spd: 190, gap: 2.3,
    kinds: ['tori'] },
  { name: 'くもの うえ',    sky: ['#7FC8F8', '#EAF6FF'], len: 38, spd: 200, gap: 2.1,
    kinds: ['tori', 'kumo'] },
  { name: 'ゆうやけ',       sky: ['#F5A65B', '#FFE0B0'], len: 40, spd: 210, gap: 2.3,
    kinds: ['tori', 'komori'] },
  { name: 'よぞら',         sky: ['#243A6E', '#5E7BC0'], len: 42, spd: 220, gap: 2.2,
    kinds: ['komori', 'hoshi'], stars: true },
  { name: 'くもの ぬし',    sky: ['#5E8ECF', '#CFE4FA'], len: 26, spd: 210, gap: 2.4,
    kinds: ['tori', 'kumo'], boss: 'kumoking' },
  { name: 'うちゅうへ',     sky: ['#1B1040', '#4A2E7A'], len: 42, spd: 235, gap: 2.1,
    kinds: ['roke', 'tori'], stars: true },
  { name: 'きらきら星雲',   sky: ['#2A1350', '#7A3E9E'], len: 44, spd: 245, gap: 2.2,
    kinds: ['hoshi', 'komori', 'roke'], stars: true },
  { name: 'ユーフォーの むれ', sky: ['#10303A', '#2E7A82'], len: 44, spd: 255, gap: 2.15,
    kinds: ['ufo', 'roke', 'tori'], stars: true },
  { name: 'あらしの そら',  sky: ['#2A2A3E', '#6A6A88'], len: 46, spd: 265, gap: 2.05,
    kinds: ['komori', 'hoshi', 'roke', 'ufo', 'kumo'] },
  { name: 'そらの おうさま', sky: ['#3A1040', '#8A3060'], len: 28, spd: 240, gap: 2.2,
    kinds: ['komori', 'roke', 'ufo'], boss: 'dragon', stars: true },
];

// --- てきの ならびを 作る -------------------------------------------------------

function makeWaves(si) {
  const st = STAGES[si];
  const rn = rng(1000 + si * 7919);
  const out = [];
  const end = st.boss ? st.len - 8 : st.len - 4;
  let t = 2.0;
  let i = 0;
  while (t < end) {
    const kind = st.kinds[(rn() * st.kinds.length) | 0];
    const f = FOE[kind];
    // 上下 まんべんなく 出す（同じ 高さが つづくと たいくつ）
    const band = i % 3;
    const y = 70 + band * ((VH - 150) / 3) + rn() * ((VH - 150) / 3);
    out.push({ t, kind, y: Math.max(f.r + 20, Math.min(VH - f.r - 20, y)) });
    // 3つ に 1つ くらいは 2ひき まとめて
    if (rn() < 0.14) {
      out.push({ t: t + 0.45, kind, y: Math.max(f.r + 20, Math.min(VH - f.r - 20, y + 70)) });
    }
    t += st.gap * (0.75 + rn() * 0.5);
    i++;
  }
  // アイテム。ハートは たいりょく、ほしは 3ほうこう しゃげき。
  const items = [];
  for (let k = 1; k * 9 < end; k++) {
    items.push({ t: k * 9 + 1, kind: k % 2 ? 'star' : 'heart',
                 y: 80 + rng(si * 31 + k)() * (VH - 160) });
  }
  // ボスの まえには かならず ハートと ほしを 置く（そうしないと ボスで 詰む）
  if (st.boss) {
    items.push({ t: st.len - 11.5, kind: 'heart', y: VH * 0.4 });
    items.push({ t: st.len - 9.5, kind: 'star', y: VH * 0.6 });
  }
  items.sort((a, b) => a.t - b.t);
  return { foes: out, items };
}

// 面の あんない（はじめる まえに 出す）
function stageRule(si) {
  const st = STAGES[si];
  if (st.boss) return BOSS[st.boss].rule;
  if (si === 0) return '画面を タップすると ふわっと 上がる。あわは かってに 出るよ';
  const names = st.kinds.map((k) => FOE[k].name);
  return names.join('・') + ' が 出てくる。ぶつからないように あわを あてよう';
}
