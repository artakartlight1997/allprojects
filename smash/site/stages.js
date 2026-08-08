// 10 の ステージ。あしばの ならびと、しかけ（ギミック）。
//
// あしばの x は「ステージの まん中から」の いち。だから 画面の 幅が
// かわっても まん中に そろう。
//   thru … 下から すりぬけられる あしば（下キーで おりられる）
//   spikes … ゆかの とげ [{x, w}]。ずっと 見えているので 2かい目からは よけられる
//   balls  … くさりで ゆれる とげボール [{x, y, len, r, sp, sw}]

'use strict';

// VH（たての 大きさ）は chars.js で 決めている

// しかけ の せつめい（はじめる まえに 出す）
const GIM_TEXT = {
  none:  '',
  move:  'あしばが 左右に うごく',
  fall:  'あしばに のると すこしで 落ちる！ すぐ つぎへ',
  wind:  'ときどき つよい かぜ。あおむけの やじるしが 出たら 気をつけて',
  lava:  '下から ようがんが 上がってくる！ 赤い しるしが 出たら 上へ にげろ',
  elec:  'ゆかの 一部が ビリビリする。光ったら はなれる',
  lowg:  'うちゅうなので ふわふわ。ジャンプが とんでもなく とぶ',
  belt:  'ゆかが 流れる。ときどき むきが かわる。じっとしてると 落ちる',
  fog:   'きりで 見えにくい。あしばも 出たり きえたり する',
  king:  'ぜんぶ 入り。かみなりも 落ちてくる！',
};

// とげ・とげボールが ある ステージで 出す ひとこと
const SPIKE_TEXT = 'ゆかの **とげ** に さわると いたい！';
const BALL_TEXT = 'ゆれる **とげボール** に 気をつけて！';

function ground(x, y, w) { return { x, y, w, h: 26, thru: false }; }
function shelf(x, y, w) { return { x, y, w, h: 12, thru: true }; }

const STAGES = [
  {
    name: 'こうていの ステージ', sky: ['#8ED6FF', '#DCF2FF'], gim: 'none',
    foes: ['kouta'], foeStocks: 2, ai: 0.45,
    plats: [ground(-250, 350, 500), shelf(-200, 252, 130), shelf(70, 252, 130),
             shelf(-65, 168, 130)],
  },
  {
    name: 'うごく あしば', sky: ['#7FC0F0', '#E8F4FF'], gim: 'move',
    foes: ['misaki'], foeStocks: 2, ai: 0.5,
    plats: [ground(-210, 350, 420), shelf(-230, 250, 120), shelf(110, 250, 120),
             shelf(-60, 160, 120)],
  },
  {
    name: 'おちる あしば', sky: ['#F5A65B', '#FFE6C0'], gim: 'fall',
    foes: ['pyon'], foeStocks: 2, ai: 0.55,
    plats: [ground(-140, 350, 280), shelf(-330, 262, 130), shelf(200, 262, 130),
             shelf(-70, 176, 140)],
    spikes: [{ x: -140, w: 46 }, { x: 94, w: 46 }],
  },
  {
    name: 'かぜの こうじょう', sky: ['#6A7A96', '#C8D6E8'], gim: 'wind',
    foes: ['gantetsu'], foeStocks: 2, ai: 0.55,
    plats: [ground(-240, 350, 480), shelf(-260, 244, 140), shelf(120, 244, 140)],
  },
  {
    name: 'ようがんの やま', sky: ['#8A3020', '#E8A060'], gim: 'lava',
    foes: ['doctor'], foeStocks: 2, ai: 0.6,
    plats: [ground(-230, 336, 460), shelf(-250, 236, 130), shelf(120, 236, 130),
             shelf(-65, 152, 130)],
    spikes: [{ x: -40, w: 80 }],
  },
  {
    name: 'でんきの ゆか', sky: ['#2A2A4A', '#5A5A8A'], gim: 'elec',
    foes: ['ninja'], foeStocks: 2, ai: 0.65,
    plats: [ground(-260, 350, 170), ground(-45, 350, 90), ground(90, 350, 170),
            shelf(-190, 248, 130), shelf(60, 248, 130)],
  },
  {
    name: 'うちゅう ていしゃじょう', sky: ['#150F35', '#4A2E7A'], gim: 'lowg',
    foes: ['robo'], foeStocks: 3, ai: 0.7, stars: true,
    plats: [ground(-190, 356, 380), shelf(-320, 250, 120), shelf(200, 250, 120),
            shelf(-60, 168, 120)],
    balls: [{ x: 0, y: 20, len: 190, r: 17, sp: 1.5, sw: 0.95 }],
  },
  {
    name: 'ベルトコンベア', sky: ['#2E4A3A', '#7AB08A'], gim: 'belt',
    foes: ['mahou', 'misaki'], foeStocks: 2, ai: 0.72,
    plats: [ground(-250, 350, 500), shelf(-230, 246, 130), shelf(100, 246, 130)],
    spikes: [{ x: -250, w: 54 }, { x: 196, w: 54 }],
  },
  {
    name: 'きりの もり', sky: ['#3A4A44', '#8AA898'], gim: 'fog',
    foes: ['kage', 'ninja'], foeStocks: 2, ai: 0.78,
    plats: [ground(-220, 350, 440), shelf(-300, 250, 120), shelf(180, 250, 120),
            shelf(-60, 164, 120)],
    spikes: [{ x: -60, w: 120 }],
  },
  {
    name: 'おうさまの アリーナ', sky: ['#3A1040', '#B04070'], gim: 'king',
    foes: ['king'], foeStocks: 4, ai: 0.9, stars: true,
    plats: [ground(-250, 352, 500), shelf(-270, 250, 130), shelf(140, 250, 130),
            shelf(-65, 162, 130)],
    spikes: [{ x: -250, w: 44 }, { x: 206, w: 44 }],
    balls: [{ x: 0, y: 6, len: 210, r: 16, sp: 1.15, sw: 0.9 }],
  },
];

// しかけの せつめい（とげ・とげボールも 入れて 2行目に 出す）
function stageHazard(si) {
  const st = STAGES[si];
  const a = [];
  if (GIM_TEXT[st.gim]) a.push(GIM_TEXT[st.gim]);
  if (st.spikes) a.push(SPIKE_TEXT.replace(/\*\*/g, ''));
  if (st.balls) a.push(BALL_TEXT.replace(/\*\*/g, ''));
  return a.join('　');
}

function stageRule(si) {
  const st = STAGES[si];
  const foes = st.foes.map((k) => CHARS[k].name).join('・');
  const g = stageHazard(si);
  return foes + ' と しょうぶ！' + (g ? '　' + g : '');
}
