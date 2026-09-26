// みんなの レストラン経営。
// こどもが かいた こうそう メモ（「みんなの レストラン けいえい」）を もとに した けいえい シミュレーション。
//   はじめの お金で 土地を 買い、かぐ・食材を 買う → 赤字に なる。
//   そこから どんどん 料理を 出して、アルバイトを やとい、さいごは 日本中に 支店を 出して 億万長者に！
// 2まいめの メモ：お店の 名前は はじめに きめる・☆5つの レビューで 全てが きまる・
//   なんいどは イージー / ノーマル / ハード / おに・えいとは かぐを 買うとき 1/2 の ルーレットで 半がく。
// 3まいめの メモ：ハード＝チップ なし・かぐが すこし 高い／おに＝よごれが のこって いたら ★1・
//   めいわく客は すぐ おいださないと NG・チップ なし・かぐは イージーの 2ばい／VIPの お客さん／増築。
// 1日 ＝ じゅんび（買いもの・メニュー・スタッフ）→ 営業（お客さんに 料理を 出す）→ けっさん。
// ぜんぶ じどうで セーブ されるので「つづきから」あそべる。

'use strict';

const SAVE = 'rinarestaurant.v1';
const GOAL = 100000000;          // 1億円
const DEBT_LIMIT = -50000;       // ここまでは 銀行が お金を かして くれる（赤字 OK）
const DAY_SEC = 70;              // 営業時間（11時〜21時）の ながさ（びょう）

// --- データ -----------------------------------------------------------------------------

const CHARS = {
  rina:   { ab: '料理が はやい（1.5ばい）' },
  yui:    { ab: '買った 食材が すぐ とどく' },
  masaki: { ab: 'アルバイトを やとう お金が たまに 半がく' },
  aoi:    { ab: 'はじめの お金 +3000円・たまーに お金が もらえる' },
  eito:   { ab: 'テーブルなどを 買う とき ルーレットが 出て 2ぶんの1で 半がく' },
};
const CHAR_IDS = ['rina', 'yui', 'masaki', 'aoi', 'eito'];
// なんいど（ぜんぶ メモの とおり）
//   rev = レビューの あまさ、tip = チップを くれる かくりつ、pat = お客さんの がまん、furn = かぐの ねだん（ばい）、
//   dirty = よごれた テーブルの レビュー（-1 なら ★1）、badT = めいわく客を おいだす までの じかん
const DIFFS = [
  { name: 'イージー', col: '#9AF0B8', rev: 0.8, tip: 0.5, tipR: [0.2, 0.5], pat: 1.1, furn: 1, dirty: 0.6, badT: 10, desc: 'レビューが あまい。お客さんが チップを 多く くれる' },
  { name: 'ノーマル', col: '#FFE066', rev: 0, tip: 0.15, tipR: [0.1, 0.3], pat: 1, furn: 1, dirty: 1, badT: 8, desc: 'レビューが ふつう。お客さんに たまに チップが もらえる' },
  { name: 'ハード', col: '#FFB08A', rev: -0.7, tip: 0, tipR: [0, 0], pat: 0.9, furn: 1.3, dirty: 1.5, badT: 6, desc: 'レビューが きびしい。チップは もらえない。かぐが すこし 高い' },
  { name: 'おに', col: '#D8A0FF', rev: -1.2, tip: 0, tipR: [0, 0], pat: 0.75, furn: 2, dirty: -1, badT: 3, desc: 'よごれが のこると ★1。めいわく客は すぐ おいだす。チップ なし。かぐ 2ばい' },
];
const EXT_MAX = 2;   // 増築できる 回数
const SHOP_NAMES = ['にこにこ食堂', 'ほしぞらキッチン', 'もぐもぐ亭', 'おひさまレストラン', 'わくわく食堂', 'ぱくぱくハウス', 'レストラン にじいろ', 'まんぷく屋', 'きらきらダイナー', 'こもれびカフェ'];
const COMMENTS = [null, ['まちくたびれた！', 'もう こない！', 'ぜんぜん 出て こない…'], ['ちょっと まった…', 'ねだんが たかいかも', 'いまいち'],
  ['ふつうかな', 'まあまあ', 'また こようかな'], ['おいしかった！', 'いい お店', 'しあわせ〜'], ['すごく おいしかった！', 'また きます！', 'はやくて さいこう！']];

const LANDS = [
  { id: 's', name: '住宅街の 小さな 土地', price: 6000, base: 1.0, cols: 6, tables: 4, stoves: 2, decor: 2, floor: '#F4E4C8' },
  { id: 'm', name: '商店街の 土地', price: 40000, base: 1.6, cols: 8, tables: 7, stoves: 4, decor: 4, floor: '#E8D8F0' },
  { id: 'l', name: '駅前の 大きな 土地', price: 200000, base: 2.2, cols: 10, tables: 10, stoves: 6, decor: 6, floor: '#D8ECF8' },
];
const ING = {
  yasai:  { name: '野菜', pack: 10, price: 800, col: '#4AB85A' },
  kome:   { name: 'お米', pack: 10, price: 500, col: '#F4F0E0' },
  men:    { name: 'めん', pack: 10, price: 600, col: '#F0D890' },
  tamago: { name: 'たまご', pack: 10, price: 300, col: '#FFF4E0' },
  niku:   { name: 'お肉', pack: 10, price: 2500, col: '#E8807A' },
  sakana: { name: '魚', pack: 10, price: 2000, col: '#8AB8E0' },
  komugi: { name: '小麦粉', pack: 10, price: 400, col: '#FFFFFF' },
  cheese: { name: 'チーズ', pack: 10, price: 1500, col: '#FFD24A' },
};
const RECIPES = {
  salad:    { name: 'サラダ', need: { yasai: 2 }, price: 400, time: 3, dev: 0 },
  onigiri:  { name: 'おにぎり', need: { kome: 1 }, price: 250, time: 2, dev: 0 },
  omurice:  { name: 'オムライス', need: { kome: 1, tamago: 2 }, price: 750, time: 5, dev: 0 },
  ramen:    { name: 'ラーメン', need: { men: 1, niku: 1, yasai: 1 }, price: 950, time: 5, dev: 3000 },
  curry:    { name: 'カレー', need: { kome: 1, niku: 1, yasai: 1 }, price: 900, time: 6, dev: 3000 },
  pancake:  { name: 'パンケーキ', need: { komugi: 1, tamago: 1 }, price: 600, time: 4, dev: 4000 },
  hamburg:  { name: 'ハンバーグ', need: { niku: 2, yasai: 1 }, price: 1300, time: 7, dev: 8000 },
  teishoku: { name: '焼き魚定食', need: { sakana: 1, kome: 1, yasai: 1 }, price: 1100, time: 6, dev: 8000 },
  pizza:    { name: 'ピザ', need: { komugi: 1, cheese: 1, yasai: 1 }, price: 1500, time: 8, dev: 15000 },
  sushi:    { name: 'おすし', need: { sakana: 2, kome: 1 }, price: 2200, time: 7, dev: 30000 },
  steak:    { name: 'ステーキ', need: { niku: 3 }, price: 3000, time: 9, dev: 60000 },
};
const PRICE_LV = [['やすい', 0.8, 1.25], ['ふつう', 1.0, 1.0], ['たかい', 1.3, 0.72]];
const FURN = {
  table: { name: 'テーブル（2せき）', price: 2000 },
  stove: { name: 'コンロ（同時に 料理）', price: 5000 },
  decor: { name: 'かざり（お客さんが よろこぶ）', price: 3000 },
};
const STAFF_TYPES = {
  kitchen: { name: 'キッチン係', hire: 5000, wage: 1800, desc: 'ちゅうもんを じどうで 料理する' },
  hall:    { name: 'ホール係', hire: 4000, wage: 1500, desc: '料理を はこぶ・テーブルを そうじ する' },
};
const STAFF_NAMES = ['たろう', 'はなこ', 'けんた', 'さくら', 'ゆうと', 'みお', 'そうた', 'ひな', 'りく', 'めい'];
const CITIES = [
  { name: '千葉', x: 0.745, y: 0.555, price: 200000, profit: 50000 },
  { name: '横浜', x: 0.715, y: 0.585, price: 800000, profit: 200000 },
  { name: '沖縄', x: 0.12, y: 0.93, price: 600000, profit: 150000 },
  { name: '仙台', x: 0.765, y: 0.4, price: 1500000, profit: 375000 },
  { name: '名古屋', x: 0.585, y: 0.63, price: 3000000, profit: 750000 },
  { name: '札幌', x: 0.8, y: 0.12, price: 5000000, profit: 1250000 },
  { name: '福岡', x: 0.26, y: 0.73, price: 8000000, profit: 2000000 },
  { name: '京都', x: 0.49, y: 0.62, price: 12000000, profit: 3000000 },
  { name: '大阪', x: 0.47, y: 0.66, price: 20000000, profit: 5000000 },
  { name: '東京', x: 0.72, y: 0.56, price: 35000000, profit: 8750000 },
];

// --- セーブ ---------------------------------------------------------------------------

function newSave(ch, startMoney, diff, name) {
  return { v: 1, ch, diff, name, money: startMoney + (ch === 'aoi' ? 3000 : 0), day: 1, land: -1, tables: 0, stoves: 0, decor: 0,
    stock: {}, coming: {}, menu: ['salad', 'onigiri'], known: ['salad', 'onigiri', 'omurice'], plv: {}, staff: [], branches: [],
    stars: 1, rating: 1.4, reviews: 0, ext: 0, total: 0, served: 0, goalDone: 0, log: [], nameN: 0 };
}
let S = null;
function save() { if (S) store.set(SAVE, S); }
function load() {
  const d = store.get(SAVE, null);
  if (!d || d.v !== 1) return null;
  // まえの バージョンの セーブにも ない ものを たす
  if (d.diff === undefined) d.diff = 1;
  if (!d.name) d.name = defaultName(d.ch);
  if (d.rating === undefined) { d.rating = d.stars; d.reviews = 0; }
  if (d.ext === undefined) d.ext = 0;
  return d;
}
function defaultName(ch) { return KIDS[ch].name + 'の レストラン'; }
function DIFF() { return DIFFS[S.diff]; }
function starStr(n) { let st = ''; for (let i = 0; i < 5; i++) st += i < n ? '★' : '☆'; return st; }

const G = { mode: 'title', t: 0, pick: 'rina', start: 10000, diff: 1, shopName: '', nameTyped: false, tab: 0, msg: '', msgT: 0, confirm: false };
function say(s, t) { G.msg = s; G.msgT = t || 2.2; }
function yen(n) {
  const a = Math.abs(Math.round(n));
  let s;
  if (a >= 100000000) s = (a / 100000000).toFixed(a >= 1000000000 ? 1 : 2).replace(/\.?0+$/, '') + '億';
  else if (a >= 10000) s = Math.floor(a / 10000) + '万' + (a % 10000 ? (a % 10000) : '');
  else s = String(a);
  return (n < 0 ? '-' : '') + s + '円';
}
function spend(n, what) {
  if (S.money - n < DEBT_LIMIT) { say('お金が たりない！（' + yen(DEBT_LIMIT) + ' より 下には できない）'); tone(200, 0.12, 'square', 0.07); return false; }
  S.money -= n;
  if (S.money < 0 && S.money + n >= 0) say('赤字に なった！ 料理を 出して とりもどそう', 2.8);
  tone(1100, 0.05, 'square', 0.06);
  void what;
  return true;
}
// 増築すると よこに ひろく なる（テーブル +2・コンロ +1・お客さん すこし ふえる）
function land() {
  const L = LANDS[S.land];
  if (!L) return L;
  const e = S.ext || 0;
  return Object.assign({}, L, { cols: L.cols + e * 2, tables: L.tables + e * 2, stoves: L.stoves + e, base: L.base + e * 0.2, baseCols: L.cols });
}
function extPrice() { return Math.round(Math.max(15000, LANDS[S.land].price * 0.5) * (S.ext + 1)); }
function buyExt() {
  if (S.land < 0) { say('さきに 土地を 買おう'); return; }
  if (S.ext >= EXT_MAX) { say('もう 増築 できない。 大きな 土地に 買いかえよう'); return; }
  if (!spend(extPrice())) return;
  S.ext++;
  jingle([60, 67, 72, 79], 0.09, 'square', 0.12);
  say('お店を 増築した！ テーブル +2・コンロ +1 おけるように なった', 3);
  save();
}
function furnPrice(k) { return Math.round(FURN[k].price * DIFF().furn / 10) * 10; }
function seats() { return S.tables * 2; }
function stockTotal() { let n = 0; for (const k in S.stock) n += S.stock[k]; return n; }

// --- じゅんび：買いもの ----------------------------------------------------------------

function buyLand(i) {
  const L = LANDS[i];
  if (S.land >= i) return;
  // 買いかえ：まえの 土地は 半がくで 売れる。かぐは そのまま もっていく
  const back = S.land >= 0 ? Math.round(LANDS[S.land].price / 2) : 0;
  if (!spend(L.price - back)) return;
  S.land = i;
  jingle([72, 76, 79, 84], 0.08, 'square', 0.12);
  say(L.name + 'を 買った！' + (back ? '（まえの 土地は ' + yen(back) + ' で 売れた）' : ' つぎは かぐを 買おう'), 3);
  save();
}
function buyFurn(k) {
  if (S.land < 0) { say('さきに 土地を 買おう'); return; }
  const L = land();
  const max = k === 'table' ? L.tables : k === 'stove' ? L.stoves : L.decor;
  const have = k === 'table' ? S.tables : k === 'stove' ? S.stoves : S.decor;
  if (have >= max) { say('この 土地には もう おけない。 大きな 土地に 買いかえよう'); return; }
  if (S.ch === 'eito' && G.mode === 'prep') {
    // えいと：2ぶんの1 の ルーレット。あたりなら 半がく
    if (G.roul) return;
    if (S.money - furnPrice(k) < DEBT_LIMIT) { spend(furnPrice(k)); return; }
    const win = Math.random() < 0.5, j = rnd(-0.9, 0.9);
    G.roul = { k, t: 0, win, done: false, end: Math.PI * 8 + (win ? -Math.PI : 0) + j, tick: 0 };
    return;
  }
  if (!spend(furnPrice(k))) return;
  addFurn(k);
}
function addFurn(k) {
  if (k === 'table') S.tables++; else if (k === 'stove') S.stoves++; else S.decor++;
  save();
}
function rouletteAngle(R) { const u = Math.min(1, R.t / 1.8); return R.end * (1 - Math.pow(1 - u, 3)); }
function updateRoulette(dt) {
  const R = G.roul;
  R.t += dt;
  const n = Math.floor(rouletteAngle(R) / Math.PI);
  if (n !== R.tick && !R.done) { R.tick = n; tone(700 + (n % 2) * 200, 0.03, 'square', 0.05); }
  if (R.t >= 1.8 && !R.done) {
    R.done = true;
    const price = R.win ? Math.round(furnPrice(R.k) / 2) : furnPrice(R.k);
    spend(price); addFurn(R.k);
    if (R.win) { jingle([72, 76, 79, 84], 0.08, 'square', 0.12); say('あたり！ ' + FURN[R.k].name.replace(/（.*）/, '') + 'が 半がくの ' + yen(price) + '！', 2.6); }
    else { tone(300, 0.2, 'triangle', 0.08); say('はずれ… ' + yen(price) + ' で 買った', 2); }
  }
  if (R.t >= 3) G.roul = null;
}
function drawRoulette() {
  const R = G.roul;
  // うしろを さわれない ように
  btn(0, 0, VW, VH, '', () => { if (R.done) G.roul = null; }, { flat: 1, col: 'rgba(0,0,0,0.45)' });
  const cx = VW / 2, cy = VH / 2 + 10, r = 130, a = rouletteAngle(R);
  fillRR(cx - 190, cy - 205, 380, 400, 24, '#FFFFFF');
  text('エイトの かぐルーレット', cx, cy - 178, 22, '#3A8A5A', 'center', true);
  ctx.save(); ctx.translate(cx, cy);
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i === 0 ? '#FFD24A' : '#C8D0DC';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a + i * Math.PI, a + (i + 1) * Math.PI); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.rotate(a + i * Math.PI + Math.PI);
    text(i === 0 ? 'あたり' : 'はずれ', 0, -r * 0.55, 26, i === 0 ? '#C8503A' : '#6A7080', 'center', true);
    ctx.restore();
  }
  ctx.strokeStyle = '#6A3A1A'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  fillC(0, 0, 14, '#6A3A1A');
  ctx.restore();
  // はり（うえ）
  ctx.fillStyle = '#E84A4A'; ctx.beginPath(); ctx.moveTo(cx, cy - r + 22); ctx.lineTo(cx - 16, cy - r - 16); ctx.lineTo(cx + 16, cy - r - 16); ctx.closePath(); ctx.fill();
  const k = FURN[R.k].name.replace(/（.*）/, '');
  text(R.done ? (R.win ? 'あたり！ 半がく！' : 'はずれ… ふつうの ねだん') : k + '（' + yen(furnPrice(R.k)) + '）', cx, cy + r + 32, 20, R.done && R.win ? '#E8A020' : '#4A2A1A', 'center', true, 360);
}
function buyIng(k) {
  const I = ING[k];
  if (!spend(I.price)) return;
  if (S.ch === 'yui') { S.stock[k] = (S.stock[k] || 0) + I.pack; say(I.name + 'が すぐ とどいた！（ゆいの ちから）', 1.6); }
  else { S.coming[k] = (S.coming[k] || 0) + I.pack; say(I.name + 'を ちゅうもん。 開店して すこし したら とどくよ', 2); }
  save();
}
function devRecipe(k) {
  const R = RECIPES[k];
  if (S.known.includes(k)) return;
  if (!spend(R.dev)) return;
  S.known.push(k);
  if (S.menu.length < 6) S.menu.push(k);
  jingle([76, 79, 84, 88], 0.08, 'square', 0.12);
  say('あたらしい メニュー「' + R.name + '」が できた！', 2.5);
  save();
}
function toggleMenu(k) {
  const i = S.menu.indexOf(k);
  if (i >= 0) { if (S.menu.length <= 1) { say('メニューは 1つ いじょう いるよ'); return; } S.menu.splice(i, 1); }
  else { if (S.menu.length >= 6) { say('メニューに のせられるのは 6つ まで'); return; } S.menu.push(k); }
  save();
}
function priceOf(k) { return Math.round(RECIPES[k].price * PRICE_LV[S.plv[k] === undefined ? 1 : S.plv[k]][1] / 10) * 10; }
function costOf(k) { let c = 0; const R = RECIPES[k]; for (const i in R.need) c += ING[i].price / ING[i].pack * R.need[i]; return Math.round(c); }
function hire(type) {
  if (S.land < 0) { say('さきに 土地を 買おう'); return; }
  const T = STAFF_TYPES[type];
  if (S.staff.length >= staffMax()) { say('この お店では これ いじょう やとえない'); return; }
  let fee = T.hire, half = false;
  if (S.ch === 'masaki' && Math.random() < 0.35) { fee = Math.round(fee / 2); half = true; }
  if (!spend(fee)) return;
  // なかまの きょうだいを さきに、そのあと ふつうの アルバイトさん
  const sibs = CHAR_IDS.filter((c) => c !== S.ch && !S.staff.some((s) => s.who === c));
  const who = sibs.length ? sibs[0] : 'p' + (S.nameN++ % STAFF_NAMES.length);
  S.staff.push({ type, who });
  jingle([72, 79], 0.08, 'square', 0.1);
  say(staffName(who) + 'を ' + T.name + 'に やとった！' + (half ? '（まさきの ちからで 半がく！）' : ''), 2.6);
  save();
}
function staffMax() { return S.land < 0 ? 0 : 2 + (S.land + 1) * 2 + S.ext; }
function fire(i) { const s = S.staff[i]; S.staff.splice(i, 1); say(staffName(s.who) + 'は やめた', 1.6); save(); }
function staffName(who) { return KIDS[who] ? KIDS[who].name : STAFF_NAMES[+who.slice(1)]; }
function buyBranch(i) {
  const C = CITIES[i];
  if (S.branches.includes(i)) return;
  if (S.money < C.price) { say('お金が たりない（支店は 赤字では 出せない）'); tone(200, 0.12, 'square', 0.07); return; }
  S.money -= C.price;
  S.branches.push(i);
  jingle([72, 76, 79, 84, 88], 0.08, 'square', 0.13);
  say(C.name + 'に 支店を 出した！ まいにち もうけが はいる', 3);
  save();
}
// 支店の もうけも レビュー（ひょうばん）しだい
function branchProfit(i) { return Math.round(CITIES[i].profit * Math.pow(S.rating / 4.5, 2) / 100) * 100; }

// --- 営業 -------------------------------------------------------------------------------

function canOpen() {
  if (S.land < 0) return '土地を 買おう';
  if (S.tables < 1) return 'テーブルを 買おう';
  if (S.stoves < 1) return 'コンロを 買おう';
  if (!S.menu.length) return 'メニューを えらぼう';
  return null;
}
function openShop() {
  const why = canOpen();
  if (why) { say(why); return; }
  const L = land();
  // 今日の お客さんの かず
  const starF = 0.6 + S.rating * 0.2;
  const variety = Math.min(1.35, 0.75 + S.menu.length * 0.1);
  let priceF = 0; for (const k of S.menu) priceF += PRICE_LV[S.plv[k] === undefined ? 1 : S.plv[k]][2]; priceF /= S.menu.length;
  const decorF = 1 + S.decor * 0.05;
  let n = 16 * L.base * starF * variety * priceF * decorF;
  const ev = G.event;
  if (ev) n *= ev.mul;
  n = Math.round(n * (0.9 + Math.random() * 0.2));
  const times = [];
  for (let i = 0; i < n; i++) times.push(Math.random() * (DAY_SEC - 8));
  times.sort((a, b) => a - b);
  G.D = { t: 0, arrivals: times, cust: [], orders: [], stoves: Array(S.stoves).fill(null), ready: [], sales: 0, cost: 0, served: 0, angry: 0, happy: 0,
    staffT: S.staff.map(() => 0), delivered: S.ch === 'yui', fx: [], closed: false, totalCust: times.length, tips: 0, revs: [], best: null, worst: null,
    dirty: Array(S.tables).fill(false), vip: 0, bad: 0, kicked: 0, cleaned: 0 };
  G.mode = 'open';
  jingle([72, 76, 79, 84], 0.1, 'triangle', 0.12);
}
function tableSeats() {
  const out = [];
  for (let t = 0; t < S.tables; t++) for (let s = 0; s < 2; s++) out.push({ t, s });
  return out;
}
function freeSeat() {
  const D = G.D; const used = new Set(D.cust.filter((c) => c.seat).map((c) => c.seat.t + ':' + c.seat.s));
  const free = tableSeats().filter((z) => !used.has(z.t + ':' + z.s));
  // きれいな テーブルから うまる
  return free.find((z) => !D.dirty[z.t]) || free[0];
}
// そうじ：たべおわった テーブルは よごれる。タップ（か ホール係）で きれいに する
function cleanTable(t, byStaff) {
  const D = G.D;
  if (!D.dirty[t]) return false;
  D.dirty[t] = false; D.cleaned++;
  for (const c of D.cust) if (c.seat && c.seat.t === t) c.dirty = false;
  const p = tablePos(t);
  D.fx.push({ s: 'ピカピカ！', t: 0, px: p.x, py: p.y - 10, col: '#9AF0FF' });
  if (!byStaff) tone(1500, 0.05, 'triangle', 0.06);
  return true;
}
// めいわく客を おいだす
function kickOut(c) {
  const D = G.D;
  if (c.kind !== 'bad' || c.state === 'leave') return;
  c.state = 'leave'; c.t = 0; D.kicked++;
  D.fx.push({ s: 'おいだした！', t: 0, c, col: '#FFFFFF' });
  jingle([79, 72], 0.07, 'square', 0.1);
}
function available(k) { const R = RECIPES[k]; for (const i in R.need) if ((S.stock[i] || 0) < R.need[i]) return false; return true; }
function cookSpeed() { return S.ch === 'rina' ? 1.5 : 1; }
function startCook(oi, byStaff) {
  const D = G.D;
  const si = D.stoves.findIndex((x) => !x);
  if (si < 0) { if (!byStaff) say('コンロが いっぱい！'); return false; }
  const o = D.orders[oi];
  if (!available(o.k)) { if (!byStaff) say('食材が たりない！'); return false; }
  const R = RECIPES[o.k];
  for (const i in R.need) S.stock[i] -= R.need[i];
  D.cost += costOf(o.k);
  D.orders.splice(oi, 1);
  D.stoves[si] = { k: o.k, c: o.c, t: 0, need: R.time };
  if (!byStaff) tone(500, 0.05, 'triangle', 0.06);
  return true;
}
function serve(ri) {
  const D = G.D, r = D.ready[ri];
  D.ready.splice(ri, 1);
  const c = r.c;
  if (c.state !== 'wait') return;
  c.state = 'eat'; c.t = 0;
  tone(880, 0.05, 'square', 0.06);
}
// レビュー：お客さん ひとりずつ ★1〜5。お店の ひょうばん（★）は これで 全て きまる
function patience(c) { return (24 + S.decor * 2) * DIFF().pat * (c && c.kind === 'vip' ? 0.8 : 1); }
function review(base, weight) {
  const r = clamp(Math.round(base + DIFF().rev + rnd(-0.45, 0.45)), 1, 5);
  const D = G.D;
  D.revs.push(r);
  // VIPの レビューは 3ばいの ちから
  for (let i = 0; i < (weight || 1); i++) S.rating += (r - S.rating) * 0.025;
  S.reviews = (S.reviews || 0) + 1;
  S.stars = clamp(Math.round(S.rating), 1, 5);
  const cm = { r, s: pick(COMMENTS[r]) };
  if (!D.best || r > D.best.r) D.best = cm;
  if (!D.worst || r < D.worst.r) D.worst = cm;
  return r;
}
function reviewServed(c) {
  const Df = DIFF(), wt = c.kind === 'vip' ? 3 : 1;
  // おに：よごれ・めいわく客が いたら ★1
  if (Df.dirty < 0 && (c.dirty || c.annoyed)) return review(-10, wt);
  const w = (c.waited || 0) / patience(c);
  const lv = S.plv[c.k] === undefined ? 1 : S.plv[c.k];
  let b = 4.4 - Math.max(0, w - 0.2) * 3 - Math.max(0, (c.lineT || 0) - 4) * 0.08;
  b += [0.3, 0, -0.5][lv] + Math.min(0.5, S.decor * 0.08);
  if (c.dirty) b -= Df.dirty;
  if (c.annoyed) b -= 1.2;
  return review(b, wt);
}
function angryLeave(c) {
  if (c.kind === 'bad') { c.state = 'leave'; c.t = 0; return; }
  c.state = 'leave'; c.t = 0; c.sad = 1; G.D.angry++;
  const r = review(1.3, c.kind === 'vip' ? 3 : 1);
  if (c.seat) G.D.fx.push({ s: starStr(r), t: 0, c, col: '#FF8A8A' });
}
function updateOpen(dt) {
  const D = G.D;
  D.t += dt;
  const L = land();
  // 食材の とうちゃく
  if (!D.delivered && D.t > 10) {
    D.delivered = true;
    let any = false;
    for (const k in S.coming) { if (S.coming[k]) { S.stock[k] = (S.stock[k] || 0) + S.coming[k]; any = true; } }
    S.coming = {};
    if (any) { D.fx.push({ s: '🚚 食材が とどいた！', t: 0, x: 0.5, y: 0.1 }); tone(660, 0.1, 'triangle', 0.08); }
  }
  // お客さんが くる
  while (D.arrivals.length && D.arrivals[0] <= D.t && D.t < DAY_SEC) {
    D.arrivals.shift();
    const q = D.cust.filter((c) => c.state === 'line').length;
    if (q >= 3) { D.angry++; review(2); continue; }
    // たまに VIP や めいわく客も くる
    const u = Math.random();
    const kind = u < 0.04 ? 'vip' : u < 0.04 + [0.03, 0.04, 0.05, 0.06][S.diff] ? 'bad' : 'n';
    D.cust.push({ id: Math.random(), kind, state: 'line', t: 0, col: kind === 'vip' ? '#FFD24A' : kind === 'bad' ? '#4A3A5A' : pick(['#E84A4A', '#4A8AE8', '#FFB020', '#8AD06A', '#B98FE0', '#FF8FB8', '#6AC8C0']),
      hair: pick(['#3A2418', '#6A3A22', '#2A2A2A', '#C8A060']), x: -0.1, y: 1 });
    if (kind === 'vip') { D.vip++; say('VIPの お客さんが きた！ いそいで 出そう（はらう お金 3ばい・レビューも 3ばい）', 2.8); }
    if (kind === 'bad') { D.bad++; if (!G.badTold) { G.badTold = 1; say('めいわく客だ！ タップして おいだそう', 2.8); } }
  }
  if (D.t >= DAY_SEC && !D.closed) { D.closed = true; D.arrivals = []; }
  // お客さんの うごき
  for (const c of D.cust) {
    c.t += dt;
    if (c.state === 'line') {
      const seat = freeSeat();
      if (seat) { c.seat = seat; c.lineT = c.t; c.state = 'walk'; c.t = 0; }
      else if (c.t > 12 * DIFF().pat) angryLeave(c);
    } else if (c.state === 'walk') {
      if (c.t > 0.8 && c.kind === 'bad') { c.state = 'bad'; c.t = 0; continue; }
      if (c.t > 0.8) {
        c.dirty = D.dirty[c.seat.t];
        // ちゅうもん：ざいりょうが ある メニューから
        const can = S.menu.filter((k) => available(k) || D.stoves.some((x) => x && x.k === k));
        if (!can.length) { angryLeave(c); D.fx.push({ s: 'たべる ものが ない…', t: 0, c, dy: -22 }); continue; }
        // VIPは いちばん たかい 料理を たのむ
        c.k = c.kind === 'vip' ? can.slice().sort((a, b) => RECIPES[b].price - RECIPES[a].price)[0] : pick(can);
        c.state = 'wait'; c.t = 0;
        D.orders.push({ k: c.k, c });
      }
    } else if (c.state === 'bad') {
      // すぐ おいださないと まわりの お客さんが いやな きもちに なる
      if (c.t > DIFF().badT && !c.trig) { c.trig = true; D.fx.push({ s: 'ガヤガヤ！ うるさい…', t: 0, c, dy: -22, col: '#D8A0FF' }); }
      if (c.trig) for (const o of D.cust) if (o.kind !== 'bad' && o.seat && (o.state === 'wait' || o.state === 'eat')) o.annoyed = true;
      if (c.t > 25) { c.state = 'leave'; c.t = 0; D.dirty[c.seat.t] = true; }
    } else if (c.state === 'wait') {
      if (c.t > patience(c)) {
        angryLeave(c);
        D.orders = D.orders.filter((o) => o.c !== c);
        D.ready = D.ready.filter((r) => r.c !== c);
      }
    } else if (c.state === 'eat') {
      if (c.t > 4) {
        const p = priceOf(c.k) * (c.kind === 'vip' ? 3 : 1);
        S.money += p; D.sales += p; D.served++; c.state = 'leave'; c.t = 0;
        if (Math.random() < 0.6) {
          D.dirty[c.seat.t] = true;
          if (!G.dirtyTold) { G.dirtyTold = 1; say('テーブルが よごれた！ タップして そうじ しよう', 2.8); }
        }
        if (c.waited < 12) D.happy++;
        const r = reviewServed(c), Df = DIFF();
        D.fx.push({ s: (c.kind === 'vip' ? 'VIP ' : '') + '+' + p + '円', t: 0, c });
        D.fx.push({ s: starStr(r), t: 0, c, dy: -22, col: r >= 4 ? '#FFD24A' : r >= 3 ? '#FFFFFF' : '#FF8A8A' });
        if (r >= 4 && Math.random() < Df.tip) {
          const tip = Math.max(10, Math.round(p * rnd(Df.tipR[0], Df.tipR[1]) / 10) * 10);
          S.money += tip; D.tips += tip;
          D.fx.push({ s: 'チップ +' + tip + '円', t: 0, c, dy: 22, col: '#FFB0D8' });
          tone(1760, 0.06, 'square', 0.05);
        }
        tone(1320, 0.05, 'square', 0.05);
      }
      continue;
    } else if (c.state === 'leave' && c.t > 1) c.gone = true;
    if (c.state === 'wait') c.waited = c.t;
  }
  D.cust = D.cust.filter((c) => !c.gone);
  // コンロ
  D.stoves.forEach((st, i) => {
    if (!st) return;
    st.t += dt * cookSpeed();
    if (st.t >= st.need) {
      D.stoves[i] = null;
      if (st.c.state === 'wait') { D.ready.push({ k: st.k, c: st.c, t: 0 }); tone(1000, 0.06, 'triangle', 0.06); }
    }
  });
  for (const r of D.ready) r.t += dt;
  // スタッフ
  S.staff.forEach((s, i) => {
    D.staffT[i] -= dt;
    if (D.staffT[i] > 0) return;
    if (s.type === 'kitchen') { const oi = D.orders.findIndex((o) => available(o.k)); D.staffT[i] = oi >= 0 && startCook(oi, true) ? 0.6 : 0.3; }
    else if (D.ready.length) { serve(0); D.staffT[i] = 1.2; }
    else { const dt2 = D.dirty.findIndex((x) => x); if (dt2 >= 0 && cleanTable(dt2, true)) D.staffT[i] = 1.6; else D.staffT[i] = 0.3; }
  });
  for (const f of D.fx) f.t += dt;
  D.fx = D.fx.filter((f) => f.t < 1.4);
  if (D.closed && !D.cust.length) endDay();
  // へいてん後も のこった 人は じどうで
  if (D.closed && D.t > DAY_SEC + 25) { for (const c of D.cust) if (c.state !== 'leave' && c.kind !== 'bad') { D.angry++; review(1.3); } D.cust = []; endDay(); }
  void L;
}
function endDay() {
  const D = G.D;
  if (G.mode !== 'open') return;
  const wages = S.staff.reduce((a, s) => a + STAFF_TYPES[s.type].wage, 0);
  const util = S.stoves * 300 + S.tables * 100;
  const br = S.branches.reduce((a, i) => a + branchProfit(i), 0);
  S.money -= wages + util;
  S.money += br;
  // ひょうばんは レビューで きまる（review() で まいかい こうしん ずみ）
  S.total += D.sales; S.served += D.served;
  const avg = D.revs.length ? D.revs.reduce((a, b) => a + b, 0) / D.revs.length : 0;
  G.R = { sales: D.sales, tips: D.tips, cost: D.cost, wages, util, br, served: D.served, angry: D.angry, stars: S.stars, extra: [],
    avg, nrev: D.revs.length, best: D.best, worst: D.worst, vip: D.vip, bad: D.bad, kicked: D.kicked, cleaned: D.cleaned };
  // きょうだいの ちから（たまに）
  if (S.ch === 'aoi' && Math.random() < 0.08) {
    const gift = Math.max(3000, Math.round(Math.abs(S.money) * 0.05 / 1000) * 1000 || 3000);
    const g2 = Math.min(gift, 5000000);
    S.money += g2; G.R.extra.push('あおいが くじびきで あたり！ +' + yen(g2));
  }
  S.day++;
  // つぎの 日の できごと
  G.event = null;
  const r = Math.random();
  if (r < 0.12) G.event = { s: 'あしたは 雨の よほう（お客さん すこし へる）', mul: 0.75 };
  else if (r < 0.2) G.event = { s: 'あしたは お祭り！（お客さん ふえる）', mul: 1.4 };
  else if (r < 0.25 && S.stars >= 3) G.event = { s: 'テレビの 取材が くる！（お客さん 大ぜい）', mul: 1.9 };
  if (G.event) G.R.extra.push(G.event.s);
  G.mode = 'result';
  save();
  jingle([67, 72, 76], 0.12, 'triangle', 0.1);
}

// --- え：お店 -----------------------------------------------------------------------

function floorRect() {
  const L = land();
  const w = VW - 290, h = VH - 70;
  const rows = 5, cols = L ? L.cols : 6;
  const ts = Math.floor(Math.min(w / cols, h / rows));
  return { ts, x0: 12 + (w - ts * cols) / 2, y0: 60 + (h - ts * rows) / 2, cols, rows };
}
function tablePos(t) {
  const F = floorRect(), L = land();
  const perRow = Math.floor((L.cols - 1) / 2);
  const r = Math.floor(t / perRow), c = t % perRow;
  return { x: F.x0 + (1.5 + c * 2) * F.ts, y: F.y0 + (1.8 + r * 1.1) * F.ts };
}
function seatPos(z) { const p = tablePos(z.t), F = floorRect(); return { x: p.x + (z.s ? 0.55 : -0.55) * F.ts, y: p.y + 0.1 * F.ts }; }
function drawPerson(x, y, s, col, hair, sad, kind) {
  ellipse(x, y + s * 0.02, s * 0.28, s * 0.08); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
  fillRR(x - s * 0.2, y - s * 0.5, s * 0.4, s * 0.48, s * 0.12, col);
  fillC(x, y - s * 0.68, s * 0.22, '#FFE0C8');
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - s * 0.72, s * 0.23, Math.PI, 0); ctx.fill();
  fillC(x - s * 0.08, y - s * 0.66, s * 0.03, '#2A2028'); fillC(x + s * 0.08, y - s * 0.66, s * 0.03, '#2A2028');
  if (sad) { ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - s * 0.52, s * 0.06, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  if (kind === 'vip') {
    // おうかん
    ctx.fillStyle = '#FFC820'; ctx.beginPath();
    ctx.moveTo(x - s * 0.18, y - s * 0.9); ctx.lineTo(x - s * 0.2, y - s * 1.08); ctx.lineTo(x - s * 0.08, y - s * 0.98); ctx.lineTo(x, y - s * 1.12);
    ctx.lineTo(x + s * 0.08, y - s * 0.98); ctx.lineTo(x + s * 0.2, y - s * 1.08); ctx.lineTo(x + s * 0.18, y - s * 0.9); ctx.closePath(); ctx.fill();
    fillC(x, y - s * 1.12, s * 0.035, '#E84A4A');
    text('VIP', x, y - s * 0.28, s * 0.18, '#8A5A00', 'center', true);
  } else if (kind === 'bad') {
    // サングラス
    fillRR(x - s * 0.17, y - s * 0.71, s * 0.34, s * 0.09, s * 0.03, '#1A1A22');
  }
}
function drawDish(k, x, y, s) {
  fillC(x, y, s * 0.5, '#FFFFFF'); ctx.strokeStyle = '#D8D0C8'; ctx.lineWidth = 1.5; circ(x, y, s * 0.5); ctx.stroke();
  const c = { salad: '#6ACB5A', onigiri: '#F8F8F0', omurice: '#FFD24A', ramen: '#F0C878', curry: '#C88A3A', pancake: '#E8B070', hamburg: '#8A4A2A', teishoku: '#8AB8E0', pizza: '#E8804A', sushi: '#FF8A7A', steak: '#7A3A2A' }[k];
  if (k === 'onigiri') { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s * 0.32); ctx.lineTo(x + s * 0.3, y + s * 0.22); ctx.lineTo(x - s * 0.3, y + s * 0.22); ctx.fill(); fillR(x - s * 0.14, y + s * 0.02, s * 0.28, s * 0.2, '#2A3A2A'); }
  else if (k === 'omurice') { ellipse(x, y, s * 0.36, s * 0.22); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#E84A4A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - s * 0.2, y); ctx.quadraticCurveTo(x, y - s * 0.1, x + s * 0.2, y); ctx.stroke(); }
  else if (k === 'sushi') { for (const dx of [-0.18, 0.18]) { fillRR(x + dx * s - s * 0.14, y - s * 0.06, s * 0.28, s * 0.16, 3, '#FFFFFF'); fillRR(x + dx * s - s * 0.15, y - s * 0.14, s * 0.3, s * 0.12, 3, c); } }
  else if (k === 'pizza') { fillC(x, y, s * 0.38, '#F0C878'); fillC(x, y, s * 0.32, c); for (const [dx, dy] of [[-0.1, -0.1], [0.12, 0.05], [-0.05, 0.14]]) fillC(x + dx * s, y + dy * s, s * 0.06, '#C83A2A'); }
  else fillC(x, y, s * 0.3, c);
}
function drawShop(t, withD) {
  const L = land();
  ctx.fillStyle = '#6ABA5A'; ctx.fillRect(0, 50, VW - 280, VH - 50);
  if (!L) { text('まだ 土地が ない', (VW - 280) / 2, VH / 2, 26, '#FFFFFF', 'center'); return; }
  const F = floorRect();
  // ゆか と かべ
  fillRR(F.x0 - 6, F.y0 - 6, F.cols * F.ts + 12, F.rows * F.ts + 12, 8, '#8A5A34');
  for (let r = 0; r < F.rows; r++) for (let c = 0; c < F.cols; c++) {
    const fl = c >= L.baseCols ? '#F8ECD8' : L.floor;   // 増築した ところ
    fillR(F.x0 + c * F.ts, F.y0 + r * F.ts, F.ts, F.ts, (r + c) % 2 ? fl : shadeC(fl));
  }
  if (L.cols > L.baseCols) { ctx.strokeStyle = 'rgba(138,90,52,0.35)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(F.x0 + L.baseCols * F.ts, F.y0 + F.ts); ctx.lineTo(F.x0 + L.baseCols * F.ts, F.y0 + F.rows * F.ts); ctx.stroke(); ctx.setLineDash([]); }
  // キッチン（うえ 1れつ）
  fillR(F.x0, F.y0, F.cols * F.ts, F.ts, '#DCE0E8');
  fillR(F.x0, F.y0 + F.ts - 6, F.cols * F.ts, 8, '#B8864E');
  for (let i = 0; i < L.stoves; i++) {
    const x = F.x0 + (F.cols - 1 - i) * F.ts + F.ts * 0.1, y = F.y0 + F.ts * 0.1, w = F.ts * 0.8;
    if (i < S.stoves) {
      fillRR(x, y, w, w * 0.8, 6, '#3A3A48');
      for (const [dx, dy] of [[0.28, 0.28], [0.72, 0.28], [0.28, 0.62], [0.72, 0.62]]) fillC(x + dx * w, y + dy * w * 0.8, w * 0.1, '#6A6A7A');
      const st = withD && G.D.stoves[i];
      if (st) {
        fillC(x + w / 2, y + w * 0.4, w * 0.3 + Math.sin(t * 20) * 1, 'rgba(255,120,40,0.6)');
        drawDish(st.k, x + w / 2, y + w * 0.38, w * 0.6);
        fillRR(x, y + w * 0.84, w, 6, 3, 'rgba(0,0,0,0.3)'); fillRR(x, y + w * 0.84, w * Math.min(1, st.t / st.need), 6, 3, '#FFE066');
      }
    } else { ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.setLineDash([4, 4]); ctx.strokeRect(x, y, w, w * 0.8); ctx.setLineDash([]); }
  }
  // 店長
  drawKid(S.ch, F.x0 + F.ts * 0.8, F.y0 + F.ts * 0.98, F.ts * 0.92, { t, pose: withD && G.D.stoves.some((x) => x) ? 'wave' : 'stand' });
  // かざり
  for (let i = 0; i < S.decor; i++) {
    const x = F.x0 + (i % 2 ? F.cols - 0.5 : 0.5) * F.ts, y = F.y0 + (1.6 + Math.floor(i / 2) * 1.1) * F.ts;
    fillRR(x - F.ts * 0.2, y, F.ts * 0.4, F.ts * 0.3, 4, '#C86A4A'); fillC(x, y - F.ts * 0.1, F.ts * 0.26, '#3E9B4F');
    if (i % 3 === 1) fillC(x + F.ts * 0.1, y - F.ts * 0.2, F.ts * 0.08, '#FF8FB8');
  }
  // テーブル
  for (let i = 0; i < L.tables; i++) {
    const p = tablePos(i);
    if (i < S.tables) {
      fillRR(p.x - F.ts * 0.9, p.y - F.ts * 0.05, F.ts * 0.36, F.ts * 0.36, 5, '#C8905A');
      fillRR(p.x + F.ts * 0.54, p.y - F.ts * 0.05, F.ts * 0.36, F.ts * 0.36, 5, '#C8905A');
      fillRR(p.x - F.ts * 0.4, p.y - F.ts * 0.25, F.ts * 0.8, F.ts * 0.6, 6, '#FFFFFF');
      ctx.strokeStyle = '#E84A6A'; ctx.lineWidth = 2; rr(p.x - F.ts * 0.4, p.y - F.ts * 0.25, F.ts * 0.8, F.ts * 0.6, 6); ctx.stroke();
      if (withD && G.D.dirty[i]) {
        // よごれ（のこった おさら・しみ）
        ellipse(p.x - F.ts * 0.15, p.y + F.ts * 0.12, F.ts * 0.12, F.ts * 0.06); ctx.fillStyle = 'rgba(140,90,40,0.55)'; ctx.fill();
        ellipse(p.x + F.ts * 0.2, p.y - F.ts * 0.08, F.ts * 0.07, F.ts * 0.04); ctx.fill();
        fillC(p.x + F.ts * 0.08, p.y + F.ts * 0.04, F.ts * 0.13, '#F0ECE4'); fillC(p.x + F.ts * 0.08, p.y + F.ts * 0.04, F.ts * 0.07, 'rgba(160,100,50,0.6)');
        for (let k = 0; k < 3; k++) fillC(p.x - F.ts * 0.3 + k * F.ts * 0.08, p.y - F.ts * 0.15 + (k % 2) * F.ts * 0.06, 1.8, '#8A5A2A');
        if (Math.sin(t * 6) > 0) text('そうじ！', p.x, p.y - F.ts * 0.36, Math.max(10, F.ts * 0.15), '#A0602A', 'center', true);
      }
    } else { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.setLineDash([4, 4]); ctx.strokeRect(p.x - F.ts * 0.4, p.y - F.ts * 0.25, F.ts * 0.8, F.ts * 0.6); ctx.setLineDash([]); }
  }
  // ドア
  fillR(F.x0 - 6, F.y0 + (F.rows - 0.9) * F.ts, 8, F.ts * 0.8, '#FFE066');
  // スタッフ
  S.staff.forEach((s, i) => {
    const x = s.type === 'kitchen' ? F.x0 + (F.cols - 1.5 - i * 0.5) * F.ts : F.x0 + (1 + i * 0.7) * F.ts;
    const y = s.type === 'kitchen' ? F.y0 + F.ts * 1.02 : F.y0 + (F.rows - 0.2) * F.ts;
    if (KIDS[s.who]) drawKid(s.who, x, y, F.ts * 0.9, { t: t + i, pose: 'stand' });
    else drawPerson(x, y, F.ts * 0.9, s.type === 'kitchen' ? '#FFFFFF' : '#3A4A6A', '#3A2418');
  });
  if (!withD) return;
  // お客さん
  const D = G.D;
  for (const c of D.cust) {
    let x, y;
    const door = { x: F.x0 + 0.2 * F.ts, y: F.y0 + (F.rows - 0.4) * F.ts };
    if (c.state === 'line') { const q = D.cust.filter((o) => o.state === 'line').indexOf(c); x = F.x0 - 30 - q * 26; y = door.y + 10; }
    else if (c.state === 'walk') { const sp = seatPos(c.seat), u = Math.min(1, c.t / 0.8); x = lerp(door.x, sp.x, u); y = lerp(door.y, sp.y, u); }
    else if (c.state === 'leave') { const sp = c.seat ? seatPos(c.seat) : door, u = Math.min(1, c.t); x = lerp(sp.x, door.x - 40, u); y = lerp(sp.y, door.y, u); }
    else { const sp = seatPos(c.seat); x = sp.x; y = sp.y; }
    drawPerson(x, y + F.ts * 0.2, F.ts * 0.75, c.col, c.hair, c.sad, c.kind);
    c.dx = x; c.dy = y;
    if (c.state === 'bad') {
      const u = Math.min(1, c.t / DIFF().badT);
      fillRR(x - F.ts * 0.42, y - F.ts * 0.98, F.ts * 0.84, F.ts * 0.42, 8, c.trig ? '#B04AE0' : '#E8D0FF');
      text('ガヤガヤ', x, y - F.ts * 0.8, Math.max(10, F.ts * 0.17), c.trig ? '#FFFFFF' : '#6A2A9A', 'center', true);
      if (!c.trig) fillR(x - F.ts * 0.38, y - F.ts * 0.6, F.ts * 0.76 * (1 - u), 4, '#B04AE0');
    }
    if (c.state === 'wait') {
      const u = c.t / patience(c);
      fillRR(x - F.ts * 0.3, y - F.ts * 0.95, F.ts * 0.6, F.ts * 0.46, 8, c.kind === 'vip' ? '#FFD24A' : '#FFFFFF');
      drawDish(c.k, x, y - F.ts * 0.72, F.ts * 0.36);
      fillR(x - F.ts * 0.26, y - F.ts * 0.52, F.ts * 0.52 * (1 - u), 4, u > 0.7 ? '#FF6A6A' : '#7FE0A0');
      c.px = x; c.py = y;
    }
    if (c.state === 'eat') drawDish(c.k, x + (c.seat.s ? -0.3 : 0.3) * F.ts, y - F.ts * 0.05, F.ts * 0.32);
  }
  for (const f of D.fx) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    const x = f.px !== undefined ? f.px : f.c && f.c.seat ? seatPos(f.c.seat).x : (VW - 280) * (f.x || 0.5);
    const y = f.py !== undefined ? f.py : f.c && f.c.seat ? seatPos(f.c.seat).y - F.ts : 90;
    textO(f.s, x, y + (f.dy || 0) - f.t * 30, f.dy ? 14 : 17, f.col || '#FFE066', '#6A3A1A');
    ctx.globalAlpha = 1;
  }
}
function shadeC(c) { const n = parseInt(c.slice(1), 16); return 'rgb(' + Math.round(((n >> 16) & 255) * 0.95) + ',' + Math.round(((n >> 8) & 255) * 0.95) + ',' + Math.round((n & 255) * 0.95) + ')'; }

function drawTop(t) {
  fillR(0, 0, VW, 50, '#5A2A1A');
  drawKidFace(S.ch, 26, 25, 16);
  text('「' + S.name + '」' + DIFF().name, 50, 12, 12, '#FFC89A', 'left', true, 330);
  text(S.day + '日め', 52, 33, 16, '#FFE0B0', 'left');
  text(yen(S.money), 124, 33, 20, S.money < 0 ? '#FF8A8A' : '#FFE066', 'left');
  if (S.money < 0) text('赤字', 124 + ctx.measureText(yen(S.money)).width + 30, 33, 13, '#FF8A8A', 'left');
  text(starStr(S.stars), VW - 58, 25, 18, '#FFD24A', 'right');
  text(S.rating.toFixed(1), VW - 14, 25, 16, '#FFFFFF', 'right', true);
  void t;
}

// --- じゅんび がめん --------------------------------------------------------------------

function drawPrep(t) {
  ctx.fillStyle = '#FFF6E8'; ctx.fillRect(0, 0, VW, VH);
  drawShop(t, false);
  drawTop(t);
  const X = VW - 276, W = 268;
  fillRR(X, 56, W, VH - 62, 14, '#FFFFFF');
  const tabs = ['お店', '食材', 'メニュー', 'スタッフ', '支店'];
  tabs.forEach((s, i) => btn(X + 4 + i * 53, 60, 50, 40, s, () => { G.tab = i; }, { col: G.tab === i ? '#FFB84A' : '#F4E8D8', size: 12 }));
  const y0 = 108;
  if (G.tab === 0) {
    if (S.land < 0) text('まずは 土地を 買おう', X + W / 2, y0 + 8, 15, '#8A4A1A', 'center');
    LANDS.forEach((L, i) => {
      const y = y0 + (S.land < 0 ? 22 : 0) + i * 50, have = S.land >= i;
      btn(X + 8, y, W - 16, 46, '', () => buyLand(i), { col: have ? '#E8F8E0' : '#FFF4D8', flat: 1, off: have });
      text(L.name, X + 18, y + 14, 13, '#4A2A1A', 'left', true, W - 40);
      text(have ? (S.land === i ? 'いまの お店' : '') : yen(L.price - (S.land >= 0 ? LANDS[S.land].price / 2 : 0)) + (S.land >= 0 ? '（買いかえ）' : ''), X + 18, y + 32, 12, '#8A6A4A', 'left', false, W - 40);
    });
    if (S.land >= 0) {
      const L = land(), y = y0 + 150, full = S.ext >= EXT_MAX;
      btn(X + 8, y, W - 16, 46, '', buyExt, { col: full ? '#EEE8E0' : '#E0F0FF', flat: 1 });
      text('増築する（テーブル +2・コンロ +1）', X + 18, y + 14, 13, '#2A4A7A', 'left', true, W - 40);
      text((full ? 'これ いじょう できない' : yen(extPrice())) + '　' + S.ext + ' / ' + EXT_MAX, X + 18, y + 32, 12, '#6A7A9A', 'left', false, W - 40);
      [['table', S.tables, L.tables], ['stove', S.stoves, L.stoves], ['decor', S.decor, L.decor]].forEach(([k, n, max], i) => {
        const y2 = y0 + 202 + i * 50;
        btn(X + 8, y2, W - 16, 46, '', () => buyFurn(k), { col: n >= max ? '#EEE8E0' : '#FFF4D8', flat: 1 });
        text(FURN[k].name, X + 18, y2 + 14, 13, '#4A2A1A', 'left', true, W - 40);
        text(yen(furnPrice(k)) + '　' + n + ' / ' + max + (S.ch === 'eito' ? '（ルーレット つき）' : ''), X + 18, y2 + 32, 12, '#8A6A4A', 'left', false, W - 40);
      });
    }
  } else if (G.tab === 1) {
    text('ざいこ ' + stockTotal() + 'こ' + (S.ch === 'yui' ? '（すぐ とどく）' : '（開店後に とどく）'), X + W / 2, y0 + 6, 12, '#8A6A4A', 'center');
    Object.keys(ING).forEach((k, i) => {
      const I = ING[k], y = y0 + 20 + i * 47;
      btn(X + 8, y, W - 16, 42, '', () => buyIng(k), { col: '#FFF4D8', flat: 1 });
      fillC(X + 26, y + 21, 11, I.col); ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; circ(X + 26, y + 21, 11); ctx.stroke();
      text(I.name + ' ×' + I.pack, X + 44, y + 14, 13, '#4A2A1A', 'left', true);
      text(yen(I.price) + '　のこり ' + (S.stock[k] || 0) + (S.coming[k] ? '（+' + S.coming[k] + '）' : ''), X + 44, y + 31, 11, '#8A6A4A', 'left', false, W - 60);
    });
  } else if (G.tab === 2) {
    text('メニュー ' + S.menu.length + ' / 6（タップで のせる・はずす）', X + W / 2, y0 + 6, 11, '#8A6A4A', 'center');
    const keys = Object.keys(RECIPES);
    keys.forEach((k, i) => {
      const R = RECIPES[k], y = y0 + 16 + i * 30, known = S.known.includes(k), on = S.menu.includes(k);
      btn(X + 8, y, W - 70, 28, '', () => { if (known) toggleMenu(k); else devRecipe(k); }, { col: on ? '#FFE066' : known ? '#FFF4D8' : '#EEE8E0', flat: 1 });
      drawDish(k, X + 22, y + 14, 20);
      text(R.name, X + 38, y + 8, 12, '#4A2A1A', 'left', true, 110);
      text(known ? priceOf(k) + '円（ざいりょう ' + costOf(k) + '円）' : 'かいはつ ' + yen(R.dev), X + 38, y + 21, 10, '#8A6A4A', 'left', false, W - 120);
      if (known) { const lv = S.plv[k] === undefined ? 1 : S.plv[k]; btn(X + W - 58, y, 50, 28, PRICE_LV[lv][0], () => { S.plv[k] = (lv + 1) % 3; save(); }, { col: ['#9AF0B8', '#F4E8D8', '#FFB0B0'][lv], size: 11, flat: 1 }); }
    });
  } else if (G.tab === 3) {
    text('スタッフ ' + S.staff.length + ' / ' + staffMax() + '　（まいにち きゅうりょう）', X + W / 2, y0 + 6, 11, '#8A6A4A', 'center');
    Object.keys(STAFF_TYPES).forEach((k, i) => {
      const T = STAFF_TYPES[k], y = y0 + 20 + i * 62;
      btn(X + 8, y, W - 16, 56, '', () => hire(k), { col: '#FFF4D8', flat: 1 });
      text(T.name + 'を やとう', X + 18, y + 14, 14, '#4A2A1A', 'left', true);
      text(T.desc, X + 18, y + 31, 11, '#6A5A4A', 'left', false, W - 40);
      text('やとう ' + yen(T.hire) + '・日給 ' + yen(T.wage), X + 18, y + 46, 11, '#8A6A4A', 'left', false, W - 40);
    });
    S.staff.forEach((s, i) => {
      const y = y0 + 150 + i * 34;
      if (KIDS[s.who]) drawKidFace(s.who, X + 24, y + 14, 12); else fillC(X + 24, y + 14, 11, '#C8B8A8');
      text(staffName(s.who) + '（' + STAFF_TYPES[s.type].name + '）', X + 42, y + 14, 12, '#4A2A1A', 'left', false, 160);
      btn(X + W - 62, y, 52, 28, 'やめる', () => fire(i), { col: '#F0D8D8', size: 11, flat: 1 });
    });
  } else {
    drawMapPanel(X, y0, W, t);
  }
  const why = canOpen();
  btn(X + 8, VH - 64, W - 16, 56, why ? why : '開店する！', openShop, { col: why ? '#E8E0D8' : '#FF8A5A', size: why ? 15 : 24 });
  if (G.event && !why && G.msgT <= 0) { fillRR((VW - 280) / 2 - 200, VH - 50, 400, 34, 10, 'rgba(90,40,120,0.85)'); text(G.event.s, (VW - 280) / 2, VH - 33, 13, '#FFFFFF', 'center', true, 380); }
  if (G.msgT > 0) { const mw = Math.min(480, VW - 310); fillRR((VW - 280) / 2 - mw / 2, VH - 58, mw, 44, 12, 'rgba(40,20,10,0.85)'); text(G.msg, (VW - 280) / 2, VH - 36, 15, '#FFFFFF', 'center', true, mw - 20); }
  if (G.roul) drawRoulette();
}
function drawMapPanel(X, y0, W, t) {
  // 日本の かんたんな ちず
  const mx = X + 10, my = y0 + 4, mw = W - 20, mh = 230;
  fillRR(mx, my, mw, mh, 10, '#BFE6FF');
  ctx.fillStyle = '#9ADA7A';
  const blob = (cx, cy, rx, ry, r) => { ellipse(mx + cx * mw, my + cy * mh, rx * mw, ry * mh, r || 0); ctx.fill(); };
  blob(0.8, 0.13, 0.13, 0.09, 0.3); blob(0.72, 0.42, 0.08, 0.2, 0.4); blob(0.58, 0.62, 0.2, 0.07, -0.2); blob(0.37, 0.7, 0.12, 0.05, -0.2); blob(0.26, 0.76, 0.06, 0.07); blob(0.4, 0.78, 0.07, 0.03, -0.2); blob(0.12, 0.93, 0.02, 0.03);
  CITIES.forEach((C, i) => {
    const x = mx + C.x * mw, y = my + C.y * mh, own = S.branches.includes(i);
    fillC(x, y, own ? 8 : 6, own ? '#FF6A4A' : '#FFFFFF'); ctx.strokeStyle = '#6A3A1A'; ctx.lineWidth = 1.5; circ(x, y, own ? 8 : 6); ctx.stroke();
  });
  const need = S.stars >= 2 && S.land >= 0;
  if (!need) { text('レビューで ★が 2つに なると 支店が 出せる', X + W / 2, my + mh + 20, 12, '#8A4A1A', 'center', true, W - 20); return; }
  const list = CITIES.map((C, i) => i).filter((i) => !S.branches.includes(i)).slice(0, 3);
  list.forEach((i, k) => {
    const C = CITIES[i], y = my + mh + 8 + k * 38;
    btn(X + 8, y, W - 16, 34, '', () => buyBranch(i), { col: S.money >= C.price ? '#FFE8C8' : '#EEE8E0', flat: 1 });
    text(C.name + '支店　' + yen(C.price), X + 18, y + 10, 12, '#4A2A1A', 'left', true, W - 40);
    text('1日 だいたい +' + yen(branchProfit(i)), X + 18, y + 25, 10, '#2A8A3A', 'left');
  });
  text('支店 ' + S.branches.length + ' / ' + CITIES.length, X + W - 16, my + 14, 12, '#2A4A6A', 'right');
  void t;
}

// --- 営業 がめん -------------------------------------------------------------------------

function drawOpen(t) {
  const D = G.D;
  ctx.fillStyle = '#FFF6E8'; ctx.fillRect(0, 0, VW, VH);
  drawShop(t, true);
  drawTop(t);
  // とけい
  const hour = 11 + Math.min(10, D.t / DAY_SEC * 10);
  text(Math.floor(hour) + ':' + String(Math.floor((hour % 1) * 60)).padStart(2, '0') + (D.closed ? ' 閉店' : ''), VW - 160, 25, 18, '#FFFFFF', 'right');
  const X = VW - 276, W = 268;
  fillRR(X, 56, W, VH - 62, 14, '#FFFFFF');
  text('ちゅうもん（タップで 料理）', X + W / 2, 72, 13, '#8A4A1A', 'center');
  G.orderBtns = [];
  D.orders.slice(0, 6).forEach((o, i) => {
    const x = X + 8 + (i % 3) * 86, y = 86 + Math.floor(i / 3) * 70, ok = available(o.k);
    btn(x, y, 80, 64, '', () => startCook(D.orders.indexOf(o), false), { col: ok ? '#FFF4D8' : '#F0D8D8', flat: 1 });
    drawDish(o.k, x + 40, y + 26, 34);
    text(RECIPES[o.k].name, x + 40, y + 54, 10, ok ? '#4A2A1A' : '#C83A3A', 'center', true, 76);
  });
  if (D.orders.length > 6) text('ほか ' + (D.orders.length - 6) + 'けん', X + W / 2, 232, 11, '#8A6A4A', 'center');
  text('できあがり（タップで 出す）', X + W / 2, 250, 13, '#2A6A2A', 'center');
  D.ready.slice(0, 6).forEach((r, i) => {
    const x = X + 8 + (i % 3) * 86, y = 262 + Math.floor(i / 3) * 70;
    btn(x, y, 80, 64, '', () => serve(D.ready.indexOf(r)), { col: '#E0F8D8', flat: 1 });
    drawDish(r.k, x + 40, y + 28, 38);
  });
  text('売上 ' + yen(D.sales) + '　お客さん ' + D.served + '人', X + W / 2, VH - 96, 13, '#4A2A1A', 'center', true, W - 20);
  if (D.angry) text('おこって かえった ' + D.angry + '人', X + W / 2, VH - 78, 12, '#C83A3A', 'center');
  const cooking = S.stoves - D.stoves.filter((x) => !x).length;
  text('コンロ ' + cooking + ' / ' + S.stoves + ' つかって いる', X + W / 2, VH - 60, 12, '#6A5A4A', 'center');
  btn(X + 8, VH - 46, W - 16, 38, D.closed ? 'のこりの お客さんを まつ…' : 'はやく すすめる ▶▶', () => { G.fast = !G.fast; }, { col: G.fast ? '#FFE066' : '#F4E8D8', size: 13 });
  if (G.msgT > 0) { const mw = Math.min(400, VW - 310); fillRR((VW - 280) / 2 - mw / 2, VH - 54, mw, 40, 12, 'rgba(40,20,10,0.85)'); text(G.msg, (VW - 280) / 2, VH - 34, 15, '#FFFFFF', 'center', true, mw - 20); }
}

// --- けっさん ---------------------------------------------------------------------------

function drawResult(t) {
  const R = G.R;
  ctx.fillStyle = grad(0, VH, '#FFE8C8', '#FFF8EE'); ctx.fillRect(0, 0, VW, VH);
  drawTop(t);
  const w = Math.min(620, VW - 40), x = VW / 2 - w / 2;
  fillRR(x, 58, w, 474, 18, '#FFFFFF');
  textO((S.day - 1) + '日めの けっさん', VW / 2, 88, 28, '#C8503A', '#FFFFFF');
  const profit = R.sales + R.tips - R.wages - R.util + R.br;
  const rows = [['売上（お客さん ' + R.served + '人）', '+' + yen(R.sales), '#2A8A3A']];
  if (R.tips) rows.push(['チップ', '+' + yen(R.tips), '#D85A9A']);
  rows.push(['食材を つかった ぶん（買った ときに はらいずみ）', yen(R.cost), '#8A8A9A'],
    ['アルバイトの きゅうりょう', '-' + yen(R.wages), '#C83A3A'], ['電気・ガス代', '-' + yen(R.util), '#C83A3A']);
  if (R.br) rows.push(['支店の もうけ（' + S.branches.length + 'けん）', '+' + yen(R.br), '#2A8A3A']);
  rows.forEach((r, i) => { text(r[0], x + 30, 122 + i * 24, 14, '#4A2A1A', 'left', false, w - 200); text(r[1], x + w - 30, 122 + i * 24, 16, r[2], 'right'); });
  const yy = 122 + rows.length * 24;
  fillR(x + 30, yy - 10, w - 60, 2, '#E0D0C0');
  text('きょうの もうけ', x + 30, yy + 8, 17, '#4A2A1A', 'left', true);
  text((profit >= 0 ? '+' : '') + yen(profit), x + w - 30, yy + 8, 22, profit >= 0 ? '#2A8A3A' : '#C83A3A', 'right');
  let y = yy + 36;
  if (R.angry) { text('おこって かえった お客さん ' + R.angry + '人' + (R.angry > R.served * 0.3 ? '… コンロや キッチン係・ホール係を ふやそう！' : ''), VW / 2, y, 13, '#C83A3A', 'center', true, w - 40); y += 22; }
  const st2 = [];
  if (R.vip) st2.push('VIP ' + R.vip + '人');
  if (R.bad) st2.push('めいわく客を おいだした ' + R.kicked + ' / ' + R.bad + '人');
  if (R.cleaned) st2.push('そうじ ' + R.cleaned + 'かい');
  if (st2.length) { text(st2.join('　'), VW / 2, y, 13, '#4A5A8A', 'center', true, w - 40); y += 22; }
  // レビュー
  fillRR(x + 20, y - 10, w - 40, R.best ? 64 : 34, 10, '#FFF6DC');
  text('きょうの レビュー ' + (R.nrev ? '★' + R.avg.toFixed(1) + '（' + R.nrev + 'けん）' : 'なし') + '　→　お店の ひょうばん ' + starStr(S.stars) + ' ' + S.rating.toFixed(1),
    VW / 2, y + 7, 14, '#B87800', 'center', true, w - 60);
  if (R.best) {
    text('「' + R.best.s + '」' + starStr(R.best.r), VW / 2, y + 27, 13, '#6A5A2A', 'center', false, w - 60);
    if (R.worst && R.worst.r < R.best.r) text('「' + R.worst.s + '」' + starStr(R.worst.r), VW / 2, y + 44, 13, '#A05A4A', 'center', false, w - 60);
  }
  y += R.best ? 74 : 44;
  R.extra.forEach((s, i) => text(s, VW / 2 + 30, y + i * 21, 13, '#6A3AA8', 'center', true, w - 140));
  drawKid(S.ch, x + 44, 520, 84, { t, pose: profit >= 0 ? 'cheer' : 'sad' });
  btn(VW / 2 - 110, 470, 220, 52, S.money >= GOAL && !S.goalDone ? 'やったー！' : 'つぎの 日へ', () => {
    if (S.money >= GOAL && !S.goalDone) { S.goalDone = 1; save(); G.mode = 'goal'; G.goalT = 0; return; }
    G.mode = 'prep'; G.tab = 0;
  }, { col: '#FFE066', size: 20 });
}
function drawGoal(t) {
  G.goalT += 1 / 60;
  ctx.fillStyle = grad(0, VH, '#FFD24A', '#FFF6C8'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 40; i++) { const u = (G.goalT * 0.3 + i * 0.07) % 1; fillC((i * 97) % VW, u * VH, 8, ['#FFB020', '#FFFFFF', '#E8A020'][i % 3]); text('円', (i * 97) % VW, u * VH, 10, '#8A5A10', 'center'); }
  textO('億万長者に なった！', VW / 2, 100, 54, '#E86A00', '#FFFFFF');
  text('「' + S.name + '」（' + DIFF().name + '）', VW / 2, 158, 22, '#8A4A10', 'center', true, VW - 40);
  text(S.day + '日で ' + yen(S.money) + '！ 支店 ' + S.branches.length + 'けん・ひょうばん ' + starStr(S.stars), VW / 2, 192, 20, '#6A3A10', 'center', true, VW - 40);
  CHAR_IDS.forEach((id, i) => drawKid(id, VW / 2 - 240 + i * 120, 420, 150, { t: t + i, pose: 'cheer' }));
  btn(VW / 2 - 120, 450, 240, 64, 'まだまだ つづける', () => { G.mode = 'prep'; }, { col: '#FFFFFF' });
}

// --- タイトル（こどもの メモの とおり） -------------------------------------------------

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#FFB870', '#FFF0D8'); ctx.fillRect(0, 0, VW, VH);
  // くもの ふきだし
  fillRR(VW / 2 - 300, 18, 600, 88, 44, '#FFFFFF');
  textO('みんなの レストラン経営', VW / 2, 62, 44, '#C8503A', '#FFFFFF');
  const sv = load();
  // キャラクター
  text('だれで あそぶ？（ひとりずつ とくしゅ のうりょく が ある）', VW / 2, 126, 16, '#6A3A1A', 'center');
  CHAR_IDS.forEach((id, i) => {
    const x = VW / 2 - 290 + i * 118;
    btn(x, 140, 108, 150, '', () => { G.pick = id; }, { col: G.pick === id ? '#FFE066' : '#FFFFFF' });
    drawKid(id, x + 54, 262, 100, { t: t + i, pose: G.pick === id ? 'cheer' : 'stand' });
    text(KIDS[id].name, x + 54, 278, 15, '#4A2A1A', 'center');
  });
  fillRR(VW / 2 - 290, 298, 580, 40, 12, 'rgba(255,255,255,0.8)');
  text(KIDS[G.pick].name + '：' + CHARS[G.pick].ab, VW / 2, 318, 16, '#8A3A1A', 'center', true, 560);
  // はじめの お金
  text('はじめの お金', VW / 2 - 170, 356, 16, '#6A3A1A', 'center');
  [1000, 10000].forEach((m, i) => btn(VW / 2 - 290 + i * 124, 372, 116, 60, m.toLocaleString() + '円', () => { G.start = m; }, { col: G.start === m ? '#FFE066' : '#FFFFFF', size: 20, sub: i === 0 ? 'むずかしい' : 'ふつう' }));
  text('（1000円だと さいしょの 赤字が 大きい）', VW / 2 - 170, 448, 12, '#8A6A4A', 'center');
  // はじめから / つづきから
  btn(VW / 2 + 20, 360, 270, 62, 'はじめから', () => { if (sv) G.confirm = true; else goSetup(); }, { col: '#FF8A5A', size: 22 });
  btn(VW / 2 + 20, 430, 270, 62, 'つづきから', () => { if (sv) { S = sv; G.mode = 'prep'; G.tab = 0; } }, { col: sv ? '#9AF0B8' : '#E8E0D8', off: !sv, size: 22,
    sub: sv ? sv.name + '・' + DIFFS[sv.diff].name + '・' + sv.day + '日め・' + yen(sv.money) : 'セーブ なし' });
  text('目ひょう：日本中に 支店を 出して 1億円（億万長者）！', VW / 2, VH - 18, 15, '#6A3A1A', 'center');
  if (G.confirm) {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.55)');
    fillRR(VW / 2 - 240, 170, 480, 200, 18, '#FFFFFF');
    text('はじめから あそぶと いまの セーブは きえます', VW / 2, 222, 18, '#4A2A1A', 'center');
    btn(VW / 2 - 210, 270, 190, 64, 'はじめから', () => { G.confirm = false; goSetup(); }, { col: '#FFB0B0' });
    btn(VW / 2 + 20, 270, 190, 64, 'やめる', () => { G.confirm = false; }, { col: '#9AF0B8' });
  }
}

// --- お店の 名前と なんいど（2まいめの メモ） -------------------------------------------

function goSetup() {
  if (!G.nameTyped) G.shopName = defaultName(G.pick);
  G.mode = 'setup';
}
function cleanName() { const n = (G.shopName || '').trim().slice(0, 12); return n || defaultName(G.pick); }
let nameEl = null;
function nameInput(show, x, y, w, h) {
  if (!nameEl) {
    if (!show) return;
    nameEl = document.createElement('input');
    nameEl.type = 'text'; nameEl.maxLength = 12; nameEl.placeholder = 'お店の 名前';
    nameEl.style.cssText = 'position:fixed;z-index:5;border:3px solid #E8A060;border-radius:12px;background:#FFFFFF;color:#4A2A1A;' +
      'text-align:center;font-weight:bold;outline:none;padding:0 8px;box-sizing:border-box;font-family:inherit';
    nameEl.addEventListener('input', () => { G.shopName = nameEl.value; G.nameTyped = true; });
    nameEl.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') nameEl.blur(); });
    nameEl.addEventListener('keyup', (e) => e.stopPropagation());
    document.body.appendChild(nameEl);
  }
  if (!show) { if (nameEl.style.display !== 'none') { nameEl.blur(); nameEl.style.display = 'none'; } return; }
  if (document.activeElement !== nameEl && nameEl.value !== G.shopName) nameEl.value = G.shopName;
  const r = canvas.getBoundingClientRect();
  Object.assign(nameEl.style, { display: 'block', left: (r.left + OX + x * SC) + 'px', top: (r.top + OY + y * SC) + 'px',
    width: (w * SC) + 'px', height: (h * SC) + 'px', fontSize: Math.max(16, 22 * SC) + 'px' });
}
function drawSetup(t) {
  ctx.fillStyle = grad(0, VH, '#FFB870', '#FFF0D8'); ctx.fillRect(0, 0, VW, VH);
  textO('あたらしい お店を つくる', VW / 2, 42, 32, '#C8503A', '#FFFFFF');
  drawKid(G.pick, VW / 2 - 250, 190, 110, { t, pose: 'wave' });
  text(KIDS[G.pick].name + '・はじめの お金 ' + G.start.toLocaleString() + '円', VW / 2 - 250, 206, 13, '#6A3A1A', 'center', true, 170);
  // お店の 名前
  text('お店の 名前（あとから かえられないよ）', VW / 2 + 60, 88, 16, '#6A3A1A', 'center', true);
  nameInput(true, VW / 2 - 110, 106, 280, 54);
  btn(VW / 2 + 180, 106, 100, 54, 'おまかせ', () => {
    G.shopName = pick(SHOP_NAMES.filter((n) => n !== G.shopName)); G.nameTyped = true; if (nameEl) nameEl.value = G.shopName;
  }, { col: '#FFFFFF', size: 16 });
  // なんいど
  text('なんいど', VW / 2, 238, 18, '#6A3A1A', 'center', true);
  DIFFS.forEach((d, i) => btn(VW / 2 - 290 + i * 148, 256, 136, 64, d.name, () => { G.diff = i; }, { col: G.diff === i ? d.col : '#FFFFFF', size: 22 }));
  fillRR(VW / 2 - 290, 334, 580, 44, 12, 'rgba(255,255,255,0.85)');
  text(DIFFS[G.diff].desc, VW / 2, 356, 15, '#8A3A1A', 'center', true, 560);
  text('お店の ★は お客さんの レビュー（☆5つ）で 全て きまる！', VW / 2, 400, 14, '#6A3A1A', 'center', true, 580);
  btn(VW / 2 - 290, 436, 170, 64, 'もどる', () => { nameInput(false); G.mode = 'title'; }, { col: '#E8E0D8', size: 20 });
  btn(VW / 2 - 100, 436, 390, 64, 'この お店で はじめる！', () => { nameInput(false); G.shopName = cleanName(); startNew(); }, { col: '#FF8A5A', size: 22 });
}
function startNew() {
  S = newSave(G.pick, G.start, G.diff, cleanName());
  G.event = null; G.roul = null;
  save();
  G.mode = 'prep'; G.tab = 0;
  say('「' + S.name + '」 オープン じゅんび！ はじめの お金は ' + yen(S.money) + '。 まずは 土地を 買おう！', 3.5);
  fullScreen();
}

startGame({
  bg: '#FFF6E8',
  update(dt) {
    G.t += dt;
    if (G.msgT > 0) G.msgT -= dt;
    if (G.roul) updateRoulette(dt);
    if (G.mode !== 'setup') nameInput(false);
    if (G.mode === 'open') { const k = G.fast ? 3 : 1; for (let i = 0; i < k; i++) updateOpen(Math.min(dt, 1 / 30)); }
  },
  draw(t) {
    if (G.mode === 'title') drawTitle(t);
    else if (G.mode === 'setup') drawSetup(t);
    else if (G.mode === 'prep') drawPrep(t);
    else if (G.mode === 'open') drawOpen(t);
    else if (G.mode === 'result') drawResult(t);
    else if (G.mode === 'goal') drawGoal(t);
  },
  down(x, y) {
    // お客さんの ふきだしを タップ → できて いれば 出す
    if (G.mode !== 'open') return;
    const D = G.D, F = floorRect();
    // めいわく客 → おいだす
    for (const c of D.cust) if (c.state === 'bad' && c.dx !== undefined && Math.hypot(x - c.dx, y - (c.dy - F.ts * 0.4)) < Math.max(36, F.ts * 0.6)) { kickOut(c); return; }
    for (const c of D.cust) if (c.state === 'wait' && c.px !== undefined && Math.hypot(x - c.px, y - (c.py - 30)) < 36) {
      const ri = D.ready.findIndex((r) => r.c === c);
      if (ri >= 0) { serve(ri); return; }
      const oi = D.orders.findIndex((o) => o.c === c);
      if (oi >= 0) { startCook(oi, false); return; }
    }
    // よごれた テーブル → そうじ
    for (let i = 0; i < S.tables; i++) {
      const p = tablePos(i);
      if (D.dirty[i] && Math.abs(x - p.x) < F.ts * 0.9 && y > p.y - F.ts * 0.45 && y < p.y + F.ts * 0.5) { cleanTable(i, false); return; }
    }
  },
  pause() { save(); },
});
window.addEventListener('pagehide', save);
