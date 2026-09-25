// 小倉っ子クエスト の データ。まち・ひと・まもの・じゅもん・どうぐ・そうび。
// ぶたいは 千葉市 若葉区の 小倉台（おぐらだい）と その まわり。
//
// ★ なかの なまえ（kokura / tanga / moji / yahata、kani / tako / tengu / kurogane）は
//   さいしょに 作った ときの まま。セーブ（つづきから）が こわれない ように かえて いない。
//     kokura=小倉台  tanga=千城台  moji=都賀  yahata=桜木
//     cave1=大草谷津田  tunnel=モノレールの レール  mount=加曽利貝塚  castle=やみの 御殿
//
// ★ 数字（つよさ・けいけんち・ねだん）は sim.js で じどうで あそばせて、
//   「ふつうに すすめば ボスに かてる」ように ととのえた。
//   かえる ときは sim.js も いっしょに 回すこと。

'use strict';

const TS = 36;   // 1マスの 大きさ（かそうの ピクセル）

// --- まち（手で かいた ちず）------------------------------------------------------
//  # かべ  . じめん  , いしだたみ  H いえ  K モノレールの えき  M おみせ
//  w 水  = はし  t 木  s さくら  f 花  F たてあな じゅうきょ  R 都賀駅  j せんろ  E でぐち

const TOWN_ROWS = {
  kokura: [
    '########################',
    '#s..KKKKKKKKKKKKKKKK..s#',
    '#...KKKKKKKKKKKKKKKK...#',
    '#...KKKKKKKKKKKKKKKK...#',
    '#.........,,,,.........#',
    '#.HHHH....,,,,....HHHH.#',
    '#.HHHH....,,,,....HHHH.#',
    '#.........,,,,.........#',
    '#..ff.....,,,,.....ff..#',
    '#.......ww,,,,ww.......#',
    '#.......ww,,,,ww.......#',
    '#.HHHH....,,,,....HHHH.#',
    '#.HHHH....,,,,....HHHH.#',
    '#s........,,,,........s#',
    '#s........,,,,........s#',
    '##########EEEE##########',
  ],
  tanga: [
    '########################',
    '#s..MMMM..MMMM..MMMM..s#',
    '#...MMMM..MMMM..MMMM...#',
    '#......................#',
    '#..........,,..........#',
    '#.HHHH.....,,.....HHHH.#',
    '#.HHHH.....,,.....HHHH.#',
    '#..........,,..........#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#..........,,..........#',
    '#..MMMM....,,....MMMM..#',
    '#..MMMM....,,....MMMM..#',
    '#t.........,,.........t#',
    '#t.........,,.........t#',
    '##########EEEE##########',
  ],
  moji: [
    '########################',
    '#jjjjjjjjjjjjjjjjjjjjjj#',
    '#jjjjjjjjjjjjjjjjjjjjjj#',
    '#jjjjjjjjjjjjjjjjjjjjjj#',
    '#......................#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#.RRRRRR.......HHHH....#',
    '#.RRRRRR.......HHHH....#',
    '#.RRRRRR...,,..........#',
    '#..........,,..........#',
    '#..ff......,,......ff..#',
    '#.HHHH.....,,.....HHHH.#',
    '#.HHHH.....,,.....HHHH.#',
    '#t.........,,.........t#',
    '#t.........,,.........t#',
    '##########EEEE##########',
  ],
  yahata: [
    '########################',
    '#..FF.....FF.....FF....#',
    '#..FF.....FF.....FF....#',
    '#..FF.....FF.....FF....#',
    '#......................#',
    '#.HHHH.....,,.....HHHH.#',
    '#.HHHH.....,,.....HHHH.#',
    '#..........,,..........#',
    '#..tt......,,.......tt.#',
    '#..........,,..........#',
    '#.HHHH.....,,.....HHHH.#',
    '#.HHHH.....,,.....HHHH.#',
    '#..........,,..........#',
    '#t.........,,.........t#',
    '#t.........,,.........t#',
    '##########EEEE##########',
  ],
};
for (const k in TOWN_ROWS) MAP_ROWS[k] = TOWN_ROWS[k];

// --- ばしょ の じょうほう -------------------------------------------------------------

const MAPS = {
  world:   { name: 'わかばく', kind: 'world', bgm: 'field' },
  kokura:  { name: '小倉台（おぐらだい）', kind: 'town', bgm: 'town', from: 'A', start: [11, 14] },
  tanga:   { name: '千城台（ちしろだい）', kind: 'town', bgm: 'town', from: 'B', start: [11, 14] },
  moji:    { name: '都賀（つが）', kind: 'town', bgm: 'town', from: 'C', start: [11, 14] },
  yahata:  { name: '桜木（さくらぎ）', kind: 'town', bgm: 'town', from: 'D', start: [11, 14] },
  cave1:   { name: '大草谷津田（おおくさ やつだ）', kind: 'cave', bgm: 'dungeon', from: '1', zone: 'cave1', boss: 'kani' },
  tunnel:  { name: 'よるの モノレール レール', kind: 'tunnel', bgm: 'dungeon', from: '2', zone: 'tunnel', boss: 'tako' },
  mount:   { name: '加曽利貝塚（かそり かいづか）', kind: 'mount', bgm: 'dungeon', from: '3', zone: 'mount', boss: 'tengu' },
  castle1: { name: 'やみの 御殿 1かい', kind: 'castle', bgm: 'castle', from: '4', zone: 'castle' },
  castle2: { name: 'やみの 御殿 おく', kind: 'castle', bgm: 'castle', zone: 'castle', boss: 'kurogane' },
};

// 宝ばこ の 中身（ちずを 左上から 読んだ じゅん）
const CHESTS = {
  cave1:   [{ item: 'herb', n: 3 }, { gold: 120 }, { eq: 'leather' }],
  tunnel:  [{ item: 'water', n: 2 }, { eq: 'bellrod' }, { gold: 400 }],
  mount:   [{ item: 'herb2', n: 3 }, { eq: 'steel' }, { gold: 900 }, { item: 'phoenix', n: 1 }],
  castle1: [{ item: 'phoenix', n: 2 }, { eq: 'light' }, { item: 'water', n: 3 }],
  castle2: [{ item: 'herb2', n: 4 }, { gold: 1500 }],
};

// --- ひとびと ---------------------------------------------------------------------
//  look … 見た目 / role … talk（はなす）shop（おみせ）inn（やどや）king（えきちょうさん）join（なかまに なる）
//  lines … はなす こと。{ if: 'flag', lines } が あれば じょうけんで かわる。
//  ★ まめちしきは 小倉台・若葉区の 本当の こと だけを 書く（しらべた ところは README）。

const NPCS = {
  kokura: [
    { x: 11, y: 4, look: 'king', role: 'king' },
    { x: 3, y: 7, look: 'inn', role: 'inn', price: 6 },
    { x: 20, y: 7, look: 'shop', role: 'shop', shop: 'kokura_eq' },
    { x: 3, y: 13, look: 'shop2', role: 'shop', shop: 'kokura_it' },
    { x: 20, y: 13, look: 'oba', lines: ['小倉台公園には さくらの 木が たくさん あってね。', 'はるに なると おはなみの ひとで にぎわうんだよ。'] },
    { x: 7, y: 8, look: 'boy', walk: 1, lines: ['千葉の モノレールは レールに ぶらさがって はしる「けんすいしき」。', 'けんすいしきで いちばん ながい モノレールとして、ギネス世界記録にも なってるんだ！'] },
    { x: 16, y: 11, look: 'oji', walk: 1, lines: ['小倉いちょう通りを すすむと 坂月川（さかつきがわ）の ビオトープが ある。', 'なつの よるには ホタルが 見られるんじゃよ。', 'まちの そとの 草むらには まものが でるぞ。 HPが へったら やどやで やすむんじゃ。'] },
    { x: 13, y: 13, look: 'girl', walk: 1, lines: ['たたかいで てきが こうげきして くる しゅんかんに', 'タップすると「ガード」できるよ！ ダメージが はんぶんに なるの。'] },
  ],
  tanga: [
    { x: 11, y: 4, look: 'masaki', role: 'join', join: 'masaki' },
    { x: 5, y: 3, look: 'shop2', role: 'shop', shop: 'tanga_it' },
    { x: 15, y: 3, look: 'shop', role: 'shop', shop: 'tanga_eq' },
    { x: 3, y: 7, look: 'inn', role: 'inn', price: 10 },
    { x: 6, y: 13, look: 'oba', lines: ['千城台は モノレール 2号線の おわりの えき。', 'えきに つながった 大きな おかいものの たてもの（イコアス千城台）も あるのよ。'] },
    { x: 18, y: 13, look: 'oji', lines: ['南の 大草谷津田（おおくさ やつだ）は、たんぼと もりの しぜんを のこした ところじゃ。', 'ホタルも とぶ いい ところ なのに、大ザリガニが すみついて しもうた。', 'あいつの せいで 北の 都賀への みちが とおれん。'],
      after: 'boss1', afterLines: ['大ザリガニを たおしたって!? これで 都賀へ いけるぞ！'] },
    { x: 8, y: 10, look: 'boy', walk: 1, lines: ['泉自然公園は あきの もみじが きれい なんだって。', 'あかい はしが めじるし なんだよ。'] },
  ],
  moji: [
    { x: 12, y: 9, look: 'aoi', role: 'join', join: 'aoi' },
    { x: 9, y: 4, look: 'girl', lines: ['都賀の えきは JRと モノレールの のりかえが できるの。', 'でも いまは モノレールが とまって いて、みんな こまってるの……'] },
    { x: 16, y: 8, look: 'shop', role: 'shop', shop: 'moji_eq' },
    { x: 6, y: 13, look: 'shop2', role: 'shop', shop: 'moji_it' },
    { x: 19, y: 13, look: 'inn', role: 'inn', price: 18 },
    { x: 4, y: 9, look: 'oji', walk: 1, lines: ['モノレールの レールの うえに 大ガラスが すを つくって おる。', 'あおい でんきだまを かかえて はなさんのじゃ……'],
      after: 'boss2', afterLines: ['大ガラスを おいはらったとは！ 西の 桜木への みちも ひらいた はずじゃ。'] },
    { x: 14, y: 10, look: 'boy', walk: 1, lines: ['千葉市動物公園は、2本の あしで たつ レッサーパンダの 風太（ふうた）くんで ゆうめいに なったんだよ。', '2016年には ライオンも やってきたんだ！'] },
  ],
  yahata: [
    { x: 6, y: 7, look: 'shop', role: 'shop', shop: 'yahata_eq' },
    { x: 17, y: 7, look: 'shop2', role: 'shop', shop: 'yahata_it' },
    { x: 3, y: 12, look: 'inn', role: 'inn', price: 30 },
    { x: 12, y: 4, look: 'oji', lines: ['加曽利貝塚（かそり かいづか）は、日本で いちばん 大きい くらいの 縄文（じょうもん）じだいの かいづか じゃ。', 'うえから 見ると 2つの かいづかが つながって「8」の かたちに なって おる。', '2017年に 国の「特別史跡（とくべつ しせき）」に なったんじゃよ。'] },
    { x: 20, y: 12, look: 'girl', walk: 1, lines: ['かいづかは むかしの ひとが たべた かいがらが つもった ところ なんだって。', 'いまは おくに どきまじんが いて ちかづけないの。'],
      after: 'boss3', afterLines: ['どきまじんが いなくなって、かいづかが しずかに なったね！'] },
    { x: 8, y: 10, look: 'boy', walk: 1, lines: ['若葉区の 御茶屋御殿（おちゃや ごてん）あとは、とくがわ いえやすが たかがりの とちゅうで やすむ ために つくられた ところ なんだって。', 'まおう ヤミタカは その なまえを まねて、北西に「やみの 御殿」を たてたんだ。', '3つの でんきだまが ないと とびらが ひらかないらしいよ。'] },
  ],
};

// ワールドの とおせんぼ
const BLOCKERS = {
  a: { flag: 'boss1', lines: ['ここから 先は 都賀（つが）。', 'でも 大草谷津田の 大ザリガニが あばれて いて あぶないんだ。', '大ザリガニを たおしたら とおして あげよう。'] },
  b: { flag: 'boss2', lines: ['この 先は 桜木（さくらぎ）。つよい まものが うろついて いる。', 'レールの 大ガラスを おいはらえる くらい つよく なったら とおしてあげよう。'] },
};

// --- なかま -----------------------------------------------------------------------
//  つよさ ＝ もと ＋ のび × レベル（そうびは べつ）

const HEROES = {
  rina:   { name: 'りな',   col: '#FF6FA8', hair: '#5A3520',
            hp: [26, 8.6], mp: [2, 2.6], atk: [7, 3.1], def: [4, 2.0], agi: [6, 2.0], mag: [4, 1.8],
            learn: { 4: 'heal', 9: 'brave' }, wp: 'woodsw' },
  yui:    { name: 'ゆい',   col: '#8FD07A', hair: '#6A3A22',
            hp: [22, 6.8], mp: [8, 3.6], atk: [4, 1.8], def: [3, 1.6], agi: [5, 1.9], mag: [6, 2.5],
            learn: { 1: 'heal', 5: 'guard', 8: 'healall', 12: 'revive' }, wp: 'rod' },
  masaki: { name: 'まさき', col: '#4A8AE8', hair: '#2A1A10',
            hp: [34, 10.5], mp: [0, 0], atk: [10, 3.6], def: [6, 2.3], agi: [3, 1.5], mag: [0, 0],
            learn: { 1: 'charge', 7: 'spin' }, wp: 'club' },
  aoi:    { name: 'あおい', col: '#B98FE0', hair: '#3A2418',
            hp: [20, 6.0], mp: [10, 4.2], atk: [3, 1.5], def: [2, 1.4], agi: [7, 2.1], mag: [9, 3.1],
            learn: { 1: 'fire', 6: 'fireall', 11: 'thunder' }, wp: 'staff' },
};

// レベルアップに いる けいけんち（つぎの レベルまで）
function needXp(lv) { return Math.round(6 * Math.pow(lv, 2.05)); }

// --- じゅもん・わざ ------------------------------------------------------------------
//  tgt: ally（なかま1人）allies（みんな）dead（たおれた なかま）enemy / enemies / self

const SPELLS = {
  heal:    { name: 'なおれ',         mp: 3,  tgt: 'ally',    kind: 'heal', pow: 28, sc: 1.3, field: 1, desc: 'なかま 1人の HPを かいふく' },
  healall: { name: 'みんななおれ',   mp: 9,  tgt: 'allies',  kind: 'heal', pow: 34, sc: 1.0, field: 1, desc: 'みんなの HPを かいふく' },
  revive:  { name: 'いきかえれ',     mp: 14, tgt: 'dead',    kind: 'revive', field: 1, desc: 'たおれた なかまを いきかえらせる' },
  guard:   { name: 'まもれ',         mp: 4,  tgt: 'allies',  kind: 'defup', desc: 'みんなの みのまもりを 上げる' },
  fire:    { name: 'ぽかぽか',       mp: 3,  tgt: 'enemy',   kind: 'dmg', pow: 12, sc: 1.2, desc: 'てき 1ぴきに ほのお' },
  fireall: { name: 'どっかーん',     mp: 8,  tgt: 'enemies', kind: 'dmg', pow: 14, sc: 0.9, desc: 'てき ぜんぶに ばくはつ' },
  thunder: { name: 'ごろごろ',       mp: 11, tgt: 'enemy',   kind: 'dmg', pow: 34, sc: 2.1, desc: 'てき 1ぴきに かみなり' },
  charge:  { name: 'ちからため',     mp: 0,  tgt: 'self',    kind: 'charge', desc: 'つぎの こうげきが 2.5ばい' },
  spin:    { name: 'まわしげり',     mp: 0,  tgt: 'enemies', kind: 'phys', mult: 0.7, desc: 'てき ぜんぶに けり' },
  brave:   { name: 'ゆうきの いちげき', mp: 5, tgt: 'enemy', kind: 'phys', mult: 2.1, desc: 'ちからを こめた いちげき' },
};

// --- どうぐ -----------------------------------------------------------------------

const ITEMS = {
  herb:    { name: 'やくそう',       price: 8,   tgt: 'ally',  kind: 'heal', pow: 35, desc: 'HPを 35 かいふく' },
  herb2:   { name: 'じょうやくそう', price: 30,  tgt: 'ally',  kind: 'heal', pow: 110, desc: 'HPを 110 かいふく' },
  water:   { name: 'まほうの みず',  price: 40,  tgt: 'ally',  kind: 'mp', pow: 25, desc: 'MPを 25 かいふく' },
  phoenix: { name: 'いのちの はね',  price: 150, tgt: 'dead',  kind: 'revive', desc: 'たおれた なかまを いきかえらせる' },
  feather: { name: 'もどりの はね',  price: 25,  tgt: 'none',  kind: 'warp', field: 1, battle: 0, desc: 'さいごに よった まちへ もどる' },
};

// --- そうび -----------------------------------------------------------------------
//  who … だれが つかえるか（空なら みんな）

const EQUIP = {
  woodsw:    { name: 'きの けん',        slot: 'wp', atk: 3,  who: ['rina'], price: 0 },
  dousw:     { name: 'どうの つるぎ',     slot: 'wp', atk: 10, who: ['rina'], price: 90 },
  hagane:    { name: 'はがねの けん',     slot: 'wp', atk: 21, who: ['rina'], price: 480 },
  kokurasw:  { name: 'おぐらの けん',     slot: 'wp', atk: 36, who: ['rina'], price: 1600 },
  club:      { name: 'こんぼう',          slot: 'wp', atk: 5,  who: ['masaki'], price: 0 },
  ono:       { name: 'いしの おの',       slot: 'wp', atk: 13, who: ['masaki'], price: 110 },
  hammer:    { name: 'てつの ハンマー',   slot: 'wp', atk: 25, who: ['masaki'], price: 560 },
  kuroono:   { name: 'やみきりの おの',   slot: 'wp', atk: 42, who: ['masaki'], price: 1800 },
  staff:     { name: 'まほうの つえ',     slot: 'wp', atk: 2, mag: 3,  who: ['aoi'], price: 0 },
  starstaff: { name: 'ほしの つえ',       slot: 'wp', atk: 4, mag: 10, who: ['aoi'], price: 320 },
  galaxy:    { name: 'ぎんがの つえ',     slot: 'wp', atk: 7, mag: 20, who: ['aoi'], price: 1300 },
  rod:       { name: 'ひのきの ぼう',     slot: 'wp', atk: 2, mag: 2,  who: ['yui'], price: 0 },
  bellrod:   { name: 'すずの つえ',       slot: 'wp', atk: 6, mag: 8,  who: ['yui'], price: 280 },
  moonrod:   { name: 'つきの つえ',       slot: 'wp', atk: 9, mag: 16, who: ['yui'], price: 1150 },
  cloth:     { name: 'ぬのの ふく',       slot: 'ar', def: 2,  price: 0 },
  leather:   { name: 'かわの よろい',     slot: 'ar', def: 7,  price: 75 },
  chain:     { name: 'くさりかたびら',    slot: 'ar', def: 13, price: 320 },
  steel:     { name: 'はがねの よろい',   slot: 'ar', def: 21, price: 950 },
  light:     { name: 'ひかりの よろい',   slot: 'ar', def: 31, price: 2500 },
};

const SHOPS = {
  kokura_eq: { name: '小倉台の ぶきや', eq: ['dousw', 'ono', 'leather'] },
  kokura_it: { name: '小倉台の どうぐや', items: ['herb', 'feather'] },
  tanga_eq:  { name: '千城台の ぶきや', eq: ['dousw', 'ono', 'bellrod', 'leather', 'chain'] },
  tanga_it:  { name: '千城台の どうぐや', items: ['herb', 'water', 'feather'] },
  moji_eq:   { name: '都賀の ぶきや', eq: ['hagane', 'hammer', 'starstaff', 'bellrod', 'chain', 'steel'] },
  moji_it:   { name: '都賀の どうぐや', items: ['herb', 'herb2', 'water', 'phoenix', 'feather'] },
  yahata_eq: { name: '桜木の ぶきや', eq: ['kokurasw', 'kuroono', 'galaxy', 'moonrod', 'steel', 'light'] },
  yahata_it: { name: '桜木の どうぐや', items: ['herb2', 'water', 'phoenix', 'feather'] },
};

// --- まもの -----------------------------------------------------------------------
//  art … 見た目の かた / acts … こうどう（w は えらばれやすさ）
//    atk: ふつうの こうげき  all: みんなに  multi: 2かい  heal: なかまを かいふく
//    fire: ほのお（みんな） guard: みのまもり アップ  two: 1ターンに 2かい うごく（ボス）

const MONS = {
  // 小倉台の まわり
  pururin:  { name: 'ぷるりん',     art: 'slime', col: '#6EC6F5', hp: 9,  atk: 9,  def: 2,  agi: 3,  xp: 3,  g: 3 },
  koumori:  { name: 'こうもりん',   art: 'bat',   col: '#9A7AD8', hp: 11, atk: 11, def: 3,  agi: 9,  xp: 4,  g: 4 },
  karasu:   { name: 'いたずらカラス', art: 'bird', col: '#4A4458', hp: 14, atk: 13, def: 4, agi: 8,  xp: 5,  g: 6 },
  doro:     { name: 'どろんこだんご', art: 'slime', col: '#A0784A', hp: 20, atk: 14, def: 7, agi: 2,  xp: 7,  g: 7 },
  // 大草谷津田
  kanikani: { name: 'ザリザリ',     art: 'crab',  col: '#E8452D', hp: 26, atk: 20, def: 11, agi: 5,  xp: 11, g: 9 },
  yadokari: { name: 'タニシン',     art: 'shell', col: '#E8A060', hp: 30, atk: 21, def: 16, agi: 3,  xp: 13, g: 11 },
  kawauso:  { name: 'イタチっこ',   art: 'beast', col: '#8A6040', hp: 27, atk: 22, def: 9,  agi: 10, xp: 12, g: 10 },
  numapuru: { name: 'ぬまぷるりん', art: 'slime', col: '#6AB06A', hp: 24, atk: 18, def: 8,  agi: 6,  xp: 11, g: 9,
              acts: [{ w: 3, k: 'atk' }, { w: 1, k: 'heal', pow: 20 }] },
  kani:     { name: '大ザリガニ キング', art: 'crab', col: '#C8281E', hp: 340, atk: 36, def: 14, agi: 6, xp: 150, g: 200, boss: 1, big: 1.7,
              acts: [{ w: 3, k: 'atk' }, { w: 2, k: 'multi' }, { w: 1, k: 'all', pow: 0.6, say: 'どろを はねとばした！' }] },
  // 都賀の まわり
  kamome:   { name: 'ムクドリっち', art: 'bird',  col: '#7A6A60', hp: 34, atk: 27, def: 12, agi: 15, xp: 17, g: 14 },
  hitode:   { name: 'きらぼし',     art: 'star',  col: '#FF8A5C', hp: 40, atk: 28, def: 18, agi: 6,  xp: 19, g: 16 },
  umiushi:  { name: 'なめくじん',   art: 'slug',  col: '#E86AC0', hp: 44, atk: 26, def: 14, agi: 4,  xp: 18, g: 15,
              acts: [{ w: 3, k: 'atk' }, { w: 1, k: 'heal', pow: 30 }] },
  banana:   { name: 'イチョウン',   art: 'ginkgo', col: '#FFD24A', hp: 38, atk: 30, def: 13, agi: 11, xp: 21, g: 26 },
  // モノレールの レール
  utsubo:   { name: 'ケーブルへび', art: 'eel',   col: '#5A6A8A', hp: 55, atk: 36, def: 18, agi: 13, xp: 28, g: 22 },
  kurage:   { name: 'でんきおばけ', art: 'jelly', col: '#B8D8FF', hp: 48, atk: 32, def: 16, agi: 11, xp: 26, g: 20,
              acts: [{ w: 2, k: 'atk' }, { w: 1, k: 'all', pow: 0.55, say: 'ビリビリを はなった！' }] },
  fugu:     { name: 'ハトぽっぽ',   art: 'bird',  col: '#9AA0B0', hp: 62, atk: 35, def: 24, agi: 7,  xp: 30, g: 28,
              acts: [{ w: 3, k: 'atk' }, { w: 1, k: 'guard' }] },
  tako:     { name: '大ガラス ガーガー', art: 'bird', col: '#3A3448', hp: 820, atk: 55, def: 24, agi: 10, xp: 520, g: 500, boss: 1, big: 1.8,
              acts: [{ w: 3, k: 'atk' }, { w: 2, k: 'all', pow: 0.7, say: 'つばさで つよい かぜを おこした！' }, { w: 1, k: 'multi' }] },
  // 桜木の まわり
  kitsune:  { name: 'きつねび',     art: 'fox',   col: '#FF9A3A', hp: 66, atk: 44, def: 22, agi: 17, xp: 36, g: 30,
              acts: [{ w: 3, k: 'atk' }, { w: 1, k: 'fire', pow: 0.6, say: 'きつねびを はなった！' }] },
  kuma:     { name: 'おおイノシシ', art: 'beast', col: '#6A4A30', hp: 90, atk: 50, def: 26, agi: 8,  xp: 42, g: 34 },
  golem:    { name: 'つちくれ ゴーレム', art: 'golem', col: '#9A8468', hp: 80, atk: 46, def: 36, agi: 5, xp: 44, g: 40 },
  // 加曽利貝塚
  yozora:   { name: 'よぞらこうもり', art: 'bat',  col: '#3A3A7A', hp: 72, atk: 50, def: 24, agi: 21, xp: 48, g: 36 },
  oni:      { name: 'かいがらおに',     art: 'oni',   col: '#E05A4A', hp: 110, atk: 56, def: 30, agi: 9, xp: 56, g: 46 },
  seirei:   { name: 'ひかりの せいれい', art: 'fairy', col: '#FFF0A0', hp: 64, atk: 44, def: 28, agi: 19, xp: 52, g: 44,
              acts: [{ w: 2, k: 'atk' }, { w: 1, k: 'heal', pow: 50 }] },
  tengu:    { name: 'どきまじん',   art: 'pot', col: '#B87A4A', hp: 1400, atk: 69, def: 32, agi: 17, xp: 1100, g: 1000, boss: 1, big: 1.8,
              acts: [{ w: 3, k: 'atk' }, { w: 2, k: 'all', pow: 0.7, say: 'じめんを ゆらした！' }, { w: 1, k: 'multi' }], two: 1 },
  // やみの 御殿
  robo:     { name: 'からくり たか', art: 'robot', col: '#9AA8C0', hp: 130, atk: 62, def: 40, agi: 12, xp: 78, g: 64 },
  lava:     { name: 'やみスライム', art: 'slime', col: '#6A3A9A', hp: 110, atk: 58, def: 32, agi: 14, xp: 72, g: 60,
              acts: [{ w: 2, k: 'atk' }, { w: 1, k: 'fire', pow: 0.6, say: 'やみの きりを ふきだした！' }] },
  heishi:   { name: 'やみの さむらい', art: 'knight', col: '#5A6478', hp: 150, atk: 66, def: 44, agi: 11, xp: 86, g: 72 },
  kurogane: { name: 'まおう ヤミタカ', art: 'maou', col: '#3A3448', hp: 2400, atk: 70, def: 40, agi: 18, xp: 0, g: 0, boss: 1, big: 2.0, two: 1,
              acts: [{ w: 3, k: 'atk' }, { w: 2, k: 'fire', pow: 0.75, say: 'くろい ほのおを はいた！' }, { w: 1, k: 'multi' }] },
};

// どこで どの まものが でるか（なかまが ふえる ほど 1回に でる かずも ふえる）
const ZONES = {
  z1:     { mons: ['pururin', 'pururin', 'koumori', 'karasu', 'doro'], max: 3, rate: [14, 26] },
  cave1:  { mons: ['kanikani', 'yadokari', 'kawauso', 'numapuru'], max: 3, rate: [11, 20] },
  z2:     { mons: ['kamome', 'hitode', 'umiushi', 'banana'], max: 3, rate: [14, 26] },
  tunnel: { mons: ['utsubo', 'kurage', 'fugu'], max: 3, rate: [11, 20] },
  z3:     { mons: ['kitsune', 'kuma', 'golem'], max: 3, rate: [14, 26] },
  mount:  { mons: ['yozora', 'oni', 'seirei'], max: 3, rate: [11, 20] },
  castle: { mons: ['robo', 'lava', 'heishi'], max: 3, rate: [11, 20] },
};

// ワールドの どこが どの ゾーンか
function worldZone(x, y) {
  if (x >= 25 && y <= 8) return 'z2';
  if (x <= 14) return 'z3';
  return 'z1';
}
