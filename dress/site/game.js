// きせかえの なかみ。えらんだ もの と 色を おぼえて おくだけ。
//
// ★ お題モードの 点は「ほしい タグが いくつ そろったか」で つける。
//   えらんだ 4つ（かみ・ふく・くつ・かざり）の タグを ぜんぶ あつめて、
//   お題の ほしい タグと 見くらべる。

'use strict';

const SAVE_KEY = 'yui-dress-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      star: o.star || {},        // お題ごとの 星（1〜3）
      open: o.open || 1,
      saved: o.saved || null,    // じゆうモードの コーデを 1つ 保存
    };
  } catch (e) {
    return { star: {}, open: 1, saved: null };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',      // title / howto / play / result
  mode: 'free',         // free / quest
  quest: 0, Q: null,
  pick: null,           // えらんで いる もの
  tab: 'wear',          // hair / wear / shoes / item / back
  msg: '', msgT: 0,
  result: null,
  t: 0,
  sparkle: [],
};

// ★ 色を -1 に して おくと「その ふくが もともと 持って いる 色」に なる。
//   さいしょから ぜんぶ 同じ 色だと、どれも 同じに 見えて しまう。
function defaultPick() {
  return {
    hair: 0, hairCol: 0,
    wear: 0, wearCol: -1,
    shoes: 0, shoesCol: -1,
    item: 0, itemCol: -1,
    back: 0,
  };
}

function startFree() {
  G.mode = 'free';
  G.pick = save.saved ? Object.assign(defaultPick(), save.saved) : defaultPick();
  G.Q = null;
  G.screen = 'play';
  G.tab = 'wear';
  G.result = null;
  say('すきに 着せかえて あそぼう！');
  bgmStart(0);
}

function startQuest(i) {
  G.mode = 'quest';
  G.quest = i;
  G.Q = QUESTS[i];
  G.pick = defaultPick();
  // お題の ばしょに はいけいを 合わせて おく
  const bi = BACK.findIndex((b) => b.k === G.Q.back);
  G.pick.back = bi < 0 ? 0 : bi;
  G.screen = 'play';
  G.tab = 'wear';
  G.result = null;
  say(G.Q.say);
  bgmStart(i + 1);
}

function say(s) { G.msg = s; G.msgT = 3.4; }

function sparkle(x, y, n) {
  for (let i = 0; i < (n || 10); i++) {
    G.sparkle.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 180, vy: -40 - Math.random() * 160,
      t: 0, life: 0.7 + Math.random() * 0.6,
      col: PALETTE[(Math.random() * PALETTE.length) | 0],
    });
  }
}

// いま えらんで いる もの
function curList(tab) {
  return tab === 'hair' ? HAIR : tab === 'wear' ? WEAR
       : tab === 'shoes' ? SHOES : tab === 'item' ? ITEM : BACK;
}
function curIndex(tab) {
  const p = G.pick;
  return tab === 'hair' ? p.hair : tab === 'wear' ? p.wear
       : tab === 'shoes' ? p.shoes : tab === 'item' ? p.item : p.back;
}
function setIndex(tab, i) {
  const p = G.pick;
  // えらび直したら 色は その ふくの もとの 色に もどす
  if (tab === 'hair') p.hair = i;
  else if (tab === 'wear') { p.wear = i; p.wearCol = -1; }
  else if (tab === 'shoes') { p.shoes = i; p.shoesCol = -1; }
  else if (tab === 'item') { p.item = i; p.itemCol = -1; }
  else p.back = i;
  sfxTap();
  const o = curList(tab)[i];
  if (o && o.tags && o.tags.length) say(o.name + '　… ' + o.tags.join('・'));
  else if (o) say(o.name);
}
function curColIndex(tab) {
  const p = G.pick;
  return tab === 'hair' ? p.hairCol : tab === 'wear' ? p.wearCol
       : tab === 'shoes' ? p.shoesCol : p.itemCol;
}
function setCol(tab, i) {
  const p = G.pick;
  if (tab === 'hair') p.hairCol = i;
  else if (tab === 'wear') p.wearCol = i;
  else if (tab === 'shoes') p.shoesCol = i;
  else if (tab === 'item') p.itemCol = i;
  sfxPop();
}

// えらんだ ものが 持って いる タグを ぜんぶ あつめる
function pickedTags() {
  const p = G.pick;
  const t = [];
  for (const o of [HAIR[p.hair], WEAR[p.wear], SHOES[p.shoes], ITEM[p.item]]) {
    for (const g of (o.tags || [])) if (t.indexOf(g) < 0) t.push(g);
  }
  return t;
}

function finish() {
  if (G.mode === 'free') {
    save.saved = Object.assign({}, G.pick);
    storeSave();
    sparkle(0, 0, 26);
    sfxGet();
    say('コーデを おぼえた！ つぎも ここから はじまるよ');
    return;
  }
  const want = G.Q.want;
  const got = pickedTags();
  const hit = want.filter((w) => got.indexOf(w) >= 0);
  // ★ ぴったり じゃない ものが 多いと 少し へらす（ちぐはぐ ふせぎ）
  const miss = got.filter((g) => want.indexOf(g) < 0 &&
    ['あたたかい', 'すずしい', 'あめ', 'スポーツ'].indexOf(g) >= 0).length;
  let star = hit.length >= want.length ? 3 : hit.length >= 1 ? 2 : 1;
  if (star === 3 && miss >= 2) star = 2;
  save.star[G.quest] = Math.max(save.star[G.quest] || 0, star);
  save.open = Math.max(save.open, Math.min(QUESTS.length, G.quest + 2));
  storeSave();
  G.result = { star: star, hit: hit, want: want, got: got };
  G.screen = 'result';
  sparkle(0, 0, 30);
  bgmStop();
  sfxClear(star === 3);
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (let i = G.sparkle.length - 1; i >= 0; i--) {
    const s = G.sparkle[i];
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt;
    if (s.t > s.life) G.sparkle.splice(i, 1);
  }
  bgmPump();
}
