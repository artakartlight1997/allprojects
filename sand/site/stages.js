// 15この ミニゲーム。ぜんぶ リズムに あわせて「1つの ボタンを たたく」だけ。
//
// pats … 1小節ぶんの 8こま（8分音符）。1小節 = 4拍 = 8こま。
//   'o' … たたく
//   'h' … おしっぱなし はじめ（1拍 のばす）
//   'H' … おしっぱなし はじめ（2拍 のばす）
//   'c' … コックさんの お手本（見るだけ。たたかない）
//   '.' … なにも なし
//
// kind … 料理の しゅるい（見た目と 音が かわる）
//   cut きる / grill やく / spread ぬる / place のせる /
//   mix まぜる / shake ふる / squeeze しぼる / wrap つつむ
//
// food … クリアすると もらえる ざいりょう

'use strict';

// VH は foods.js で きめている

const KIND_TEXT = {
  cut:     { verb: 'きる',   how: 'トン、トン。リズムに 合わせて ほうちょうを おろそう' },
  grill:   { verb: 'やく',   how: 'ジュー…… いい 色に なった しゅんかんに ひっくり返す' },
  spread:  { verb: 'ぬる',   how: 'シャッ、シャッ。すべらせる リズムで ぬろう' },
  place:   { verb: 'のせる', how: 'ポン、ポン。おちてくる ざいりょうを パンに のせる' },
  mix:     { verb: 'まぜる', how: 'クルクル。ボウルが 一しゅうする たびに たたく' },
  shake:   { verb: 'ふる',   how: 'サッ、サッ。ふりかける リズムを 合わせて' },
  squeeze: { verb: 'しぼる', how: 'ニュルー。ながく おしっぱなしに する ところが あるよ' },
  wrap:    { verb: 'つつむ', how: 'クシャッ。さいごに きゅっと つつもう' },
};

const STAGES = [
  { key: 'g1', name: 'パンを きろう', kind: 'cut', food: 'bread',
    bpm: 96, drum: 'basic', root: 62, prog: [0, 0, 5, 7], min: [],
    intro: 2, hit: 'cut',
    pats: ['o...o...', 'o...o...', 'o...o...', 'o.o.o...'] },

  { key: 'g2', name: 'バターを ぬろう', kind: 'spread', food: 'butter',
    bpm: 100, drum: 'basic', root: 64, prog: [0, 5, 7, 5], min: [],
    intro: 2, hit: 'spread',
    pats: ['o.o.o.o.', 'o.o.o.o.', 'o...o.o.', 'o.o.o.o.'] },

  { key: 'g3', name: 'レタスを ちぎろう', kind: 'place', food: 'lettuce',
    bpm: 104, drum: 'march', root: 60, prog: [0, 7, 5, 7], min: [],
    intro: 2, hit: 'place',
    pats: ['o..o..o.', 'o..o..o.', 'o..o..o.', 'o.o.o.o.'] },

  { key: 'g4', name: 'トマトを きろう', kind: 'cut', food: 'tomato',
    bpm: 108, drum: 'basic', root: 62, prog: [0, 9, 5, 7], min: [1],
    intro: 2, hit: 'cut',
    pats: ['oo..oo..', 'oo..oo..', 'o.o.oo..', 'oo.oo.o.'] },

  { key: 'g5', name: 'チーズを のせよう', kind: 'place', food: 'cheese',
    bpm: 104, drum: 'disco', root: 65, prog: [0, 5, 0, 7], min: [],
    intro: 2, hit: 'place',
    pats: ['c...o...', 'c...o...', 'c.c.o.o.', 'o...o...'] },

  { key: 'g6', name: 'ハムを ならべよう', kind: 'place', food: 'ham',
    bpm: 112, drum: 'funk', root: 60, prog: [0, 3, 8, 7], min: [0, 1, 2, 3],
    intro: 2, hit: 'place',
    pats: ['o.o..o..', 'o.o..o..', 'o.o.o.o.', 'o..o..o.'] },

  { key: 'g7', name: 'たまごを まぜよう', kind: 'mix', food: 'egg',
    bpm: 100, drum: 'basic', root: 63, prog: [0, 5, 7, 5], min: [0, 2],
    intro: 2, hit: 'mix',
    pats: ['h...h...', 'h...h...', 'o.o.h...', 'H.......'] },

  { key: 'g8', name: 'きゅうりを きろう', kind: 'cut', food: 'cucumber',
    bpm: 116, drum: 'march', root: 64, prog: [0, 7, 9, 5], min: [],
    intro: 2, hit: 'cut',
    pats: ['oo.oo.o.', 'oo.oo.o.', 'ooo.oo..', 'oo.o.oo.'] },

  { key: 'g9', name: 'チキンを やこう', kind: 'grill', food: 'chicken',
    bpm: 96, drum: 'taiko', root: 60, prog: [0, 0, 5, 7], min: [0, 1],
    intro: 2, hit: 'grill', pre: true,
    pats: ['o...o...', 'o.....o.', 'o...o...', 'o..o..o.'] },

  { key: 'g10', name: 'ベーコンを やこう', kind: 'grill', food: 'bacon',
    bpm: 108, drum: 'funk', root: 62, prog: [0, 5, 3, 7], min: [2],
    intro: 2, hit: 'grill', pre: true,
    pats: ['o..o..o.', 'o..o..o.', 'o.o..o..', 'o..o.o.o'] },

  { key: 'g11', name: 'アボカドを つぶそう', kind: 'mix', food: 'avocado',
    bpm: 112, drum: 'disco', root: 65, prog: [0, 9, 5, 7], min: [1],
    intro: 2, hit: 'mix',
    pats: ['o.o.o.o.', 'h...o.o.', 'o.o.o.o.', 'H.......'] },

  { key: 'g12', name: 'ツナを まぜよう', kind: 'mix', food: 'tuna',
    bpm: 120, drum: 'funk', root: 60, prog: [0, 3, 7, 8], min: [0, 1, 2, 3],
    intro: 2, hit: 'mix',
    pats: ['c...o...', 'c.c.o.o.', 'ooo.o.o.', 'o.oo.oo.'] },

  { key: 'g13', name: 'たまねぎを きろう', kind: 'cut', food: 'onion',
    bpm: 124, drum: 'march', root: 63, prog: [0, 7, 5, 9], min: [0, 3],
    intro: 2, hit: 'cut',
    pats: ['oooo....', 'oooo....', 'oo.oo.oo', 'oooo.oo.'] },

  { key: 'g14', name: 'マヨネーズを しぼろう', kind: 'squeeze', food: 'mayo',
    bpm: 112, drum: 'basic', root: 65, prog: [0, 5, 9, 7], min: [],
    intro: 2, hit: 'squeeze',
    pats: ['H.......', 'o.o.h...', 'H.......', 'o.o.o.o.'] },

  { key: 'g15', name: 'さいごに つつもう', kind: 'wrap', food: 'jam',
    bpm: 128, drum: 'funk', root: 62, prog: [0, 9, 5, 7], min: [1, 3],
    intro: 2, hit: 'wrap',
    pats: ['o.o.o.o.', 'oo.oo.o.', 'c...o...', 'ooo.oo.o'] },
];

// サンドイッチの つみかた（下から 上）。ざいりょうが そろった ぶんだけ つむ。
const STACK = ['bread', 'butter', 'lettuce', 'tomato', 'cheese', 'ham', 'egg',
               'cucumber', 'chicken', 'bacon', 'avocado', 'tuna', 'onion',
               'mayo', 'jam', 'bread'];

// あそびかたの ことば
function stageHow(i) {
  const st = STAGES[i];
  return KIND_TEXT[st.kind].how;
}
function stageVerb(i) { return KIND_TEXT[STAGES[i].kind].verb; }

// pats（もじ）から 音符の りすとを 作る。
// b は 「ビート」（1拍 = 1）。1小節 = 4拍、1こま = 半拍。
function makeNotes(st) {
  const out = [];
  st.pats.forEach((pat, bar) => {
    for (let i = 0; i < 8; i++) {
      const c = pat[i];
      if (!c || c === '.') continue;
      const b = (st.intro + bar) * 4 + i * 0.5;
      if (c === 'c') { out.push({ b, k: 'call' }); continue; }
      if (c === 'h' || c === 'H') {
        out.push({ b: b + (c === 'H' ? 2 : 1), hb: b, k: 'hold', gd: 1, p: st.root + 12 });
        continue;
      }
      out.push({ b, k: 'tap', gd: 1, p: st.root + 12, pre: st.pre });
    }
  });
  out.sort((a, b) => a.b - b.b);
  return out;
}
