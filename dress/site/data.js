// ゆいのきせかえサロン。すきに 着せかえて あそぶ ほかに、
// 「お題」に 合わせた コーデを 考える モードが ある。
//
// ★ ふく には「タグ」を つけて ある（あたたかい／うごきやすい など）。
//   お題にも ほしい タグが 書いて あって、合うほど 星が ふえる。
//   だから「なんとなく」ではなく「なぜ それを えらんだか」で 点が つく。

'use strict';

const GAME_VER = 1;
const VH = 450;

// 色えんぴつ（どの ふくも この 中から 色を えらべる）
const PALETTE = ['#FF8FBB', '#FFD166', '#8FD6FF', '#A8E6CF', '#C9A9FF',
                 '#FFFFFF', '#FF7A6A', '#5A4A6A'];

// ★ かみの 色だけ 別に する。ふくと 同じ 色えんぴつだと
//   さいしょから ピンクの かみに なって しまう。
const HAIR_PAL = ['#5A3A2A', '#3A2A20', '#7A4A2A', '#2A2028', '#8A5A3A',
                  '#C9A9FF', '#FF8FBB', '#FFD166'];

// かみがた
const HAIR = [
  { k: 'bob',   name: 'ボブ',       col: '#5A3A2A', tags: [] },
  { k: 'long',  name: 'ロング',     col: '#3A2A20', tags: ['おしゃれ'] },
  { k: 'twin',  name: 'ツインテール', col: '#7A4A2A', tags: ['げんき'] },
  { k: 'pony',  name: 'ポニーテール', col: '#4A3020', tags: ['うごきやすい'] },
  { k: 'short', name: 'ショート',   col: '#2A2028', tags: ['うごきやすい'] },
  { k: 'curl',  name: 'まきげ',     col: '#8A5A3A', tags: ['おしゃれ'] },
];

// ふく
const WEAR = [
  { k: 'tshirt', name: 'Tシャツ',     col: '#8FD6FF', tags: ['うごきやすい', 'すずしい'] },
  { k: 'dress',  name: 'ワンピース',   col: '#FF8FBB', tags: ['おしゃれ', 'すずしい'] },
  { k: 'party',  name: 'ドレス',       col: '#C9A9FF', tags: ['おしゃれ', 'とくべつ'] },
  { k: 'coat',   name: 'コート',       col: '#5A4A6A', tags: ['あたたかい'] },
  { k: 'jersey', name: 'たいそうふく', col: '#FFFFFF', tags: ['うごきやすい', 'スポーツ'] },
  { k: 'raincoat', name: 'レインコート', col: '#FFD166', tags: ['あめ'] },
  { k: 'kimono', name: 'ゆかた',       col: '#FF7A6A', tags: ['なつ', 'とくべつ'] },
  { k: 'sweater', name: 'セーター',    col: '#A8E6CF', tags: ['あたたかい'] },
];

// くつ
const SHOES = [
  { k: 'sneaker', name: 'スニーカー', col: '#FFFFFF', tags: ['うごきやすい', 'スポーツ'] },
  { k: 'boots',   name: 'ながぐつ',   col: '#8FD6FF', tags: ['あめ'] },
  { k: 'pumps',   name: 'くつ',       col: '#FF8FBB', tags: ['おしゃれ'] },
  { k: 'sandal',  name: 'サンダル',   col: '#FFD166', tags: ['すずしい', 'なつ'] },
  { k: 'winter',  name: 'ブーツ',     col: '#5A4A6A', tags: ['あたたかい'] },
];

// かざり（あたま・手もと）
const ITEM = [
  { k: 'none',    name: 'なし',       col: '#FFFFFF', tags: [] },
  { k: 'ribbon',  name: 'リボン',     col: '#FF8FBB', tags: ['おしゃれ'] },
  { k: 'cap',     name: 'ぼうし',     col: '#8FD6FF', tags: ['スポーツ', 'うごきやすい'] },
  { k: 'straw',   name: 'むぎわら',   col: '#FFD166', tags: ['なつ', 'すずしい'] },
  { k: 'crown',   name: 'かんむり',   col: '#FFD166', tags: ['とくべつ', 'おしゃれ'] },
  { k: 'umbrella', name: 'かさ',      col: '#C9A9FF', tags: ['あめ'] },
  { k: 'muffler', name: 'マフラー',   col: '#FF7A6A', tags: ['あたたかい'] },
];

// はいけい
const BACK = [
  { k: 'room',  name: 'おへや',   sky: ['#FFE0EE', '#FFC7DC'] },
  { k: 'park',  name: 'こうえん', sky: ['#BFE8FF', '#DFF6E6'] },
  { k: 'night', name: 'よぞら',   sky: ['#2A2450', '#4A3A70'] },
  { k: 'sea',   name: 'うみ',     sky: ['#8FD6FF', '#BEEAF5'] },
  { k: 'snow',  name: 'ゆき',     sky: ['#DCEBFF', '#F4F8FF'] },
];

// お題 10こ
const QUESTS = [
  { name: '1. こうえんで あそぶ',     want: ['うごきやすい', 'スポーツ'], back: 'park',
    say: 'たくさん 走るよ！ うごきやすい かっこうで' },
  { name: '2. あめの 日の おでかけ',   want: ['あめ'],                    back: 'park',
    say: 'ざあざあ ふって いる。ぬれない ように' },
  { name: '3. たんじょうびパーティ',   want: ['おしゃれ', 'とくべつ'],     back: 'room',
    say: 'きょうは しゅやく！ とびきり おしゃれに' },
  { name: '4. うみへ 行く',           want: ['すずしい', 'なつ'],         back: 'sea',
    say: 'あつい！ すずしい かっこうが いいね' },
  { name: '5. ゆきの 日',             want: ['あたたかい'],               back: 'snow',
    say: 'とっても さむい。あたたかく しよう' },
  { name: '6. うんどうかい',          want: ['スポーツ', 'うごきやすい'], back: 'park',
    say: 'かけっこで 1い を ねらおう' },
  { name: '7. なつまつり',            want: ['なつ', 'とくべつ'],         back: 'night',
    say: 'はなびが 上がるよ。まつりの かっこうで' },
  { name: '8. おひるね まえの おさんぽ', want: ['すずしい', 'うごきやすい'], back: 'park',
    say: 'ゆっくり あるくだけ。らくな かっこうで' },
  { name: '9. ふゆの よぞら さんぽ',   want: ['あたたかい', 'おしゃれ'],   back: 'night',
    say: 'ほしが きれい。さむいけど おしゃれも したい' },
  { name: '10. はっぴょうかい',        want: ['とくべつ', 'おしゃれ'],     back: 'room',
    say: 'たくさんの 人の 前で うたうよ！' },
];

const TIPS = [
  '★ 「じゆうモード」は すきに 着せかえて あそぶ だけ。点は つかない',
  '★ 「お題モード」は そのばに 合う ふくを えらぶと 星が ふえる',
  '★ ふくを えらぶと 下に「どんな ふく か」が 出る。それを ヒントに しよう',
  '★ 色は 何度でも 変えられる。すきな 色に して よい',
  '★ できあがったら「かんせい！」を おす',
];
