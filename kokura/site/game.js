// 小倉っ子クエスト。タイトル・フィールド・まち・はなし・おみせ・メニュー・セーブ。
// たたかいは battle.js。
//
// ★ セーブ（つづきから）
//   まちに 出入りした とき・たたかいの あと・やどや・とのさま・メニューの「きろく」、
//   それと 30歩ごとに じどうで きろくする。子どもは「セーブ」を わすれるので、
//   とちゅうで やめても かならず ちかい ところから つづけられる。

'use strict';

const SAVE_KEY = 'kokuraquest.v1';
const BOSSFLAG = { kani: 'boss1', tako: 'boss2', tengu: 'boss3', kurogane: 'boss4' };
const BACHI = { kani: 'あかい たいこの ばち', tako: 'あおい たいこの ばち', tengu: 'きいろい たいこの ばち' };

let S = null;          // セーブ される じょうたい
const G = {
  mode: 'title', map: null, rows: null, blocks: [], npcs: [], ents: [],
  moving: false, mt: 0, fx: 0, fy: 0, trail: [], path: [],
  dlg: null, menu: null, shop: null, fade: 0, fadeTo: null, msgT: 0,
  dpad: false, camX: 0, camY: 0, toast: null, walkT: 0, confirmNew: false, flash: 0,
};

// --- セーブ ------------------------------------------------------------------------

function newSave() {
  return {
    v: 1, map: 'kokura', x: 11, y: 5, dir: 3,
    party: [newMember('rina', 1), newMember('yui', 1)],
    gold: 50, items: { herb: 3, feather: 1 }, flags: {}, chests: {},
    lastTown: 'kokura', time: 0, steps: 0, enc: 16, cleared: 0,
  };
}
function saveGame() {
  if (!S) return;
  S.x = G.px; S.y = G.py; S.dir = G.dir; S.map = G.map;
  store.set(SAVE_KEY, S);
}
function loadGame() {
  const d = store.get(SAVE_KEY, null);
  if (!d || d.v !== 1 || !d.party) return null;
  return d;
}

// --- ちず --------------------------------------------------------------------------

function tileAt(x, y) {
  const r = G.rows[y];
  if (!r || x < 0 || x >= r.length) return '#';
  return r[x];
}
function mapKind() { return MAPS[G.map].kind; }

// いえ・しろ などの まとまりを さがす（まとめて 1つの 絵に する）
function findBlocks(rows) {
  const seen = {}, out = [];
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    const c = rows[y][x];
    if ('HKMFR'.indexOf(c) < 0 || seen[x + ',' + y]) continue;
    let w = 0; while (rows[y][x + w] === c && !seen[(x + w) + ',' + y]) w++;
    let h = 0; while (rows[y + h] && rows[y + h].slice(x, x + w) === c.repeat(w)) h++;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) seen[xx + ',' + yy] = 1;
    out.push({ c, x, y, w, h });
  }
  return out;
}

function enterMap(id, x, y, dir) {
  G.map = id;
  G.rows = MAP_ROWS[id];
  G.blocks = MAPS[id].kind === 'town' ? findBlocks(G.rows) : [];
  G.px = x; G.py = y; G.dir = dir === undefined ? G.dir : dir;
  G.moving = false; G.path = [];
  G.trail = [];
  for (let i = 0; i < 4; i++) G.trail.push({ x, y, dir: G.dir });
  // ひとびと
  G.npcs = [];
  for (const n of (NPCS[id] || [])) {
    if (n.role === 'join' && S.party.some((m) => m.id === n.join)) continue;
    G.npcs.push(Object.assign({ dir: 0, hx: n.x, hy: n.y, wt: rnd(1, 3) }, n));
  }
  // とおせんぼ・ボス
  G.ents = [];
  if (id === 'world') {
    for (let yy = 0; yy < G.rows.length; yy++) for (let xx = 0; xx < G.rows[yy].length; xx++) {
      const c = G.rows[yy][xx];
      if (BLOCKERS[c] && !S.flags[BLOCKERS[c].flag]) G.ents.push({ kind: 'block', x: xx, y: yy, key: c });
    }
  }
  const bk = MAPS[id].boss;
  if (bk && !S.flags[BOSSFLAG[bk]]) {
    for (let yy = 0; yy < G.rows.length; yy++) {
      const xx = G.rows[yy].indexOf('B');
      if (xx >= 0) G.ents.push({ kind: 'boss', x: xx, y: yy, key: bk });
    }
  }
  if (MAPS[id].kind === 'town') S.lastTown = id;
  S.map = id;
  saveGame();
  G.toast = { text: MAPS[id].name, t: 2.2 };
  playBgm(MAPS[id].bgm);
}

function placeOf(ch) {
  for (let y = 0; y < MAP_ROWS.world.length; y++) {
    const x = MAP_ROWS.world[y].indexOf(ch);
    if (x >= 0) return [x, y];
  }
  return [20, 13];
}
function findChar(rows, ch) {
  for (let y = 0; y < rows.length; y++) { const x = rows[y].indexOf(ch); if (x >= 0) return [x, y]; }
  return null;
}

function npcAt(x, y) { return G.npcs.find((n) => n.x === x && n.y === y); }
function entAt(x, y) { return G.ents.find((e) => e.x === x && e.y === y); }

function walkable(x, y) {
  const c = tileAt(x, y);
  const k = mapKind();
  if (npcAt(x, y) || entAt(x, y)) return false;
  if (k === 'world') {
    if ('.:Th=ABCD123'.indexOf(c) >= 0) return true;
    if (c === '4') return !!S.flags.boss3;
    if (BLOCKERS[c]) return !!S.flags[BLOCKERS[c].flag];
    return false;
  }
  if (k === 'town') return '.,f=E'.indexOf(c) >= 0;
  if (c === 'c') return false;
  return c !== '#';
}

// --- はなし（メッセージ）-------------------------------------------------------------
//  lines … 文字の ならび。choice … ['はい','いいえ'] と そのあとの しょり。

function say(lines, onEnd, choice) {
  G.dlg = { lines: Array.isArray(lines) ? lines : [lines], i: 0, ch: 0, onEnd, choice };
  tone(880, 0.04, 'square', 0.05);
}
function dlgNext() {
  const d = G.dlg;
  if (!d) return;
  const full = d.lines[d.i];
  if (d.ch < full.length) { d.ch = full.length; return; }
  if (d.i === d.lines.length - 1 && d.choice) return;   // えらぶ まで すすまない
  d.i++; d.ch = 0;
  tone(660, 0.03, 'square', 0.04);
  if (d.i >= d.lines.length) {
    G.dlg = null;
    if (d.onEnd) d.onEnd();
  }
}

// --- はなしかける ------------------------------------------------------------------

function interact(x, y) {
  const n = npcAt(x, y);
  if (n) {
    // こちらを むく
    n.dir = G.px < n.x ? 1 : G.px > n.x ? 2 : G.py < n.y ? 3 : 0;
    talkTo(n); return true;
  }
  const e = entAt(x, y);
  if (e) {
    if (e.kind === 'block') say(BLOCKERS[e.key].lines);
    else if (e.kind === 'boss') bossTalk(e);
    return true;
  }
  const c = tileAt(x, y);
  if (c === 'c' && mapKind() !== 'town' && mapKind() !== 'world') { openChest(x, y); return true; }
  if (c === '4' && mapKind() === 'world' && !S.flags.boss3) {
    say(['大きな てつの とびらが ある。', '3つの くぼみが ある……。「たいこの ばち」を はめるのかも しれない。']);
    return true;
  }
  return false;
}

function talkTo(n) {
  const f = S.flags;
  if (n.role === 'shop') { openShop(n.shop); return; }
  if (n.role === 'inn') {
    const cost = n.price * S.party.length;
    say(['いらっしゃいませ。 たびびとの やどやです。', 'ひとばん ' + cost + ' ゴールドですが、とまって いきますか？'], null,
        { opts: ['はい', 'いいえ'], on: (i) => {
          if (i !== 0) { say('またの おこしを おまちして おります。'); return; }
          if (S.gold < cost) { say('おかねが たりない ようですね……。'); return; }
          S.gold -= cost;
          innRest();
        } });
    return;
  }
  if (n.role === 'king') { kingTalk(); return; }
  if (n.role === 'join') { joinTalk(n); return; }
  const lines = (n.after && f[n.after]) ? n.afterLines : n.lines;
  say(lines);
}

function innRest() {
  G.fadeTo = () => {
    for (const m of S.party) { const s = hstat(m); m.hp = s.mhp; m.mp = s.mmp; }
    saveGame();
    jingle([67, 72, 76, 79, 84], 0.18, 'triangle', 0.16);
  };
  G.fadeMsg = 'ぐっすり ねむった……';
  G.fade = 0.001;
  G.afterFade = () => say(['おはよう ございます。 ゆうべは よく ねむれましたか？', '（みんな げんきに なった！ ぼうけんを きろくしました）']);
}

function kingTalk() {
  const f = S.flags;
  let lines;
  if (!f.king) {
    f.king = 1;
    lines = ['とのさま「よく きてくれた、りな、ゆい。」',
      '「小倉祇園太鼓の ちからが、まおう くろがねに うばわれて しもうた。」',
      '「まおうは 西の くろがね城に おる。城の とびらは 3本の たいこの ばちが ないと ひらかぬ。」',
      '「ばちは 3びきの 大きな まものが もって おる。 たのんだぞ！」',
      '「まずは 川の むこうの 旦過市場へ ゆけ。 まさきが まっておる。」',
      '（とのさまから 50ゴールドを もらった！）'];
    S.gold += 50;
  } else if (!f.boss1) lines = ['とのさま「旦過市場の 南、紫川の どうくつに 大ガニが おる。」', '「HPが へったら やどやで やすむのじゃぞ。」'];
  else if (!f.boss2) lines = ['とのさま「北の 門司港へ ゆけ。 あおいが まっておる。」', '「関門トンネルの おくに 大ダコが おるそうじゃ。」'];
  else if (!f.boss3) lines = ['とのさま「西の 八幡へ ゆけ。 その 南の 皿倉山に テングまるが おる。」'];
  else if (!f.boss4) lines = ['とのさま「3本の ばちが そろったな！」', '「八幡の 北西、くろがね城へ いそぐのじゃ！」'];
  else lines = ['とのさま「ほんとうに ありがとう！ 小倉に 太鼓の おとが もどったぞ！」'];
  say(lines, () => {
    say(['「ぼうけんを きろく しておこう。」'], () => { saveGame(); say('（ぼうけんを きろくしました）'); });
  });
}

function joinTalk(n) {
  const id = n.join;
  const lines = id === 'masaki'
    ? ['まさき「おっ、りな と ゆい！ 大ガニ たいじに いくんだって？」', '「おれも いく！ ちからしごとは まかせとけ！」']
    : ['あおい「みんな！ まってたよ。」', '「関門トンネルの 大ダコ、わたしの まほうで やっつけよう！」'];
  say(lines, () => {
    const lv = Math.max(1, S.party[0].lv - 1);
    const m = newMember(id, lv);
    S.party.push(m);
    G.npcs = G.npcs.filter((x) => x !== n);
    jingle([72, 76, 79, 84], 0.14, 'square', 0.12);
    saveGame();
    say(HEROES[id].name + 'が なかまに くわわった！');
  });
}

function bossTalk(e) {
  const pre = {
    kani: ['大ガニ キング「ブクブク……ここは おれさまの どうくつだ！」', '「あかい ばちは わたさんぞ！」'],
    tako: ['大ダコ カンモン「タコタコ〜！ この トンネルは わしの ものじゃ！」'],
    tengu: ['テングまる「ハッハッハ！ この 山の 夜景は わしが ひとりじめ じゃ！」'],
    kurogane: ['まおう くろがね「よくぞ ここまで きたな、小倉っ子たち。」',
      '「太鼓の ちからで、この 国を てつで うめつくして くれるわ！」', '「かかって こい！」'],
  }[e.key];
  say(pre, () => startBattle([e.key], { boss: e }));
}

function openChest(x, y) {
  const id = G.map + ':' + x + ',' + y;
  if (S.chests[id]) { say('からっぽ だ。'); return; }
  // ちずの 中で なんばんめの 宝ばこか
  let idx = 0;
  for (let yy = 0; yy < G.rows.length; yy++) for (let xx = 0; xx < G.rows[yy].length; xx++) {
    if (G.rows[yy][xx] === 'c' && (yy < y || (yy === y && xx < x))) idx++;
  }
  const c = (CHESTS[G.map] || [])[idx] || { gold: 50 };
  S.chests[id] = 1;
  jingle([76, 79, 84], 0.1, 'square', 0.12);
  if (c.gold) { S.gold += c.gold; say('たからばこを あけた！ ' + c.gold + ' ゴールド てにいれた！'); }
  else if (c.item) { S.items[c.item] = (S.items[c.item] || 0) + c.n; say('たからばこを あけた！ ' + ITEMS[c.item].name + 'を ' + c.n + 'こ てにいれた！'); }
  else if (c.eq) {
    const E = EQUIP[c.eq];
    // いちばん うれしい 人が そうび する
    let best = null, gain = 0;
    for (const m of S.party) {
      if (E.who && E.who.indexOf(m.id) < 0) continue;
      const cur = EQUIP[m[E.slot]];
      const g = E.slot === 'wp' ? (E.atk + (E.mag || 0)) - (cur.atk + (cur.mag || 0)) : E.def - cur.def;
      if (g > gain) { gain = g; best = m; }
    }
    if (best) { best[E.slot] = c.eq; say(['たからばこを あけた！ ' + E.name + 'を てにいれた！', HEROES[best.id].name + 'が そうび した！']); }
    else { S.gold += Math.round(E.price / 2); say(['たからばこを あけた！ ' + E.name + 'が はいっていた。', 'つかわないので うって ' + Math.round(E.price / 2) + ' ゴールドに した。']); }
  }
  saveGame();
}

// --- あるく ------------------------------------------------------------------------

const DIRS = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // 下 左 右 上

function tryStep(d) {
  G.dir = d;
  const nx = G.px + DIRS[d][0], ny = G.py + DIRS[d][1];
  if (!walkable(nx, ny)) {
    G.path = [];
    if (!interact(nx, ny)) {
      // でぐち（まちの はし）
    }
    return false;
  }
  G.trail.unshift({ x: G.px, y: G.py, dir: G.dir });
  G.trail.length = 4;
  G.fx = G.px; G.fy = G.py;
  G.px = nx; G.py = ny;
  G.moving = true; G.mt = 0;
  return true;
}

function arrive() {
  G.moving = false;
  S.steps++;
  const c = tileAt(G.px, G.py);
  const k = mapKind();
  // でいり
  if (k === 'world') {
    const dest = { A: 'kokura', B: 'tanga', C: 'moji', D: 'yahata', 1: 'cave1', 2: 'tunnel', 3: 'mount', 4: 'castle1' }[c];
    if (dest) { goMap(dest); return; }
  } else if (k === 'town' && c === 'E') {
    const [wx, wy] = placeOf(MAPS[G.map].from);
    goWorld(wx, wy, 0); return;
  } else if (c === '<') {
    if (G.map === 'castle2') { const p = findChar(MAP_ROWS.castle1, '>'); goMapAt('castle1', p[0], p[1] + 0, 0); return; }
    const [wx, wy] = placeOf(MAPS[G.map].from);
    goWorld(wx, wy, 0); return;
  } else if (c === '>') {
    const p = findChar(MAP_ROWS.castle2, '<'); goMapAt('castle2', p[0], p[1], 0); return;
  }
  if (S.steps % 30 === 0) saveGame();
  // てきに であう
  let zone = null, w = 1;
  if (k === 'world') { zone = worldZone(G.px, G.py); w = c === ':' ? 0.4 : c === 'T' ? 1.5 : 1; if (c === '=' || 'ABCD1234'.indexOf(c) >= 0) zone = null; }
  else if (MAPS[G.map].zone) zone = MAPS[G.map].zone;
  if (zone) {
    S.enc -= w;
    if (S.enc <= 0) {
      const z = ZONES[zone];
      S.enc = irnd(z.rate[0], z.rate[1]);
      G.path = [];
      startBattle(encounter(zone, S.party.length), {});
    }
  }
}

function goMap(id) {
  const M = MAPS[id];
  let x, y;
  if (M.start) [x, y] = M.start;
  else { const p = findChar(MAP_ROWS[id], '<'); x = p[0]; y = p[1]; }
  goMapAt(id, x, y, 3);
}
function goMapAt(id, x, y, dir) {
  G.fade = 0.001;
  G.fadeMsg = null;
  G.fadeTo = () => enterMap(id, x, y, dir);
  noise(0.2, 0.08, 600);
}
function goWorld(x, y, dir) {
  G.fade = 0.001;
  G.fadeMsg = null;
  G.fadeTo = () => enterMap('world', x, y, dir);
}

// タップした ところまで あるく（みちを さがす）
function findPath(tx, ty) {
  if (tx === G.px && ty === G.py) return [];
  const key = (x, y) => x + ',' + y;
  const prev = {}; const q = [[G.px, G.py]]; prev[key(G.px, G.py)] = null;
  let found = false, target = [tx, ty];
  // たどりつけない マス（人・たからばこ）は その となりまで
  const goal = (x, y) => x === tx && y === ty;
  const adjGoal = !walkable(tx, ty);
  while (q.length) {
    const [x, y] = q.shift();
    if ((adjGoal && Math.abs(x - tx) + Math.abs(y - ty) === 1) || (!adjGoal && goal(x, y))) { found = true; target = [x, y]; break; }
    if (Object.keys(prev).length > 900) break;
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (prev[key(nx, ny)] !== undefined) continue;
      if (!walkable(nx, ny)) continue;
      prev[key(nx, ny)] = [x, y, d];
      q.push([nx, ny]);
    }
  }
  if (!found) return [];
  const path = [];
  let cur = target;
  while (prev[key(cur[0], cur[1])]) { const p = prev[key(cur[0], cur[1])]; path.unshift(p[2]); cur = [p[0], p[1]]; }
  if (adjGoal) {
    // さいごに その ほうを むいて はなしかける
    const dx = tx - target[0], dy = ty - target[1];
    path.push({ face: DIRS.findIndex((v) => v[0] === dx && v[1] === dy) });
  }
  return path.slice(0, 40);
}

// --- おみせ ------------------------------------------------------------------------

function openShop(key) {
  G.shop = { key, msg: 'いらっしゃい！ なにを かって いくかい？', pick: null, scroll: 0 };
  G.mode = 'shop';
}
function eqGain(m, e) {
  const E = EQUIP[e], cur = EQUIP[m[E.slot]];
  return E.slot === 'wp' ? (E.atk + (E.mag || 0)) - (cur.atk + (cur.mag || 0)) : E.def - cur.def;
}
function buyEq(e, m) {
  const E = EQUIP[e];
  if (S.gold < E.price) { G.shop.msg = 'おかねが たりないよ！'; tone(200, 0.15, 'square', 0.08); return; }
  const old = EQUIP[m[E.slot]];
  S.gold -= E.price;
  const back = Math.floor(old.price / 2);
  S.gold += back;
  m[E.slot] = e;
  G.shop.msg = HEROES[m.id].name + 'は ' + E.name + 'を そうび した！' + (back ? '（ふるいのは ' + back + 'Gで ひきとったよ）' : '');
  G.shop.pick = null;
  jingle([72, 79], 0.08, 'square', 0.1);
  saveGame();
}
function buyItem(k) {
  const I = ITEMS[k];
  if (S.gold < I.price) { G.shop.msg = 'おかねが たりないよ！'; tone(200, 0.15, 'square', 0.08); return; }
  if ((S.items[k] || 0) >= 20) { G.shop.msg = 'それ いじょうは もてないよ。'; return; }
  S.gold -= I.price;
  S.items[k] = (S.items[k] || 0) + 1;
  G.shop.msg = I.name + 'を かった！（' + S.items[k] + 'こ もっている）';
  tone(1200, 0.06, 'square', 0.08);
  saveGame();
}

function drawShop() {
  const sh = G.shop, SH = SHOPS[sh.key];
  fillRR(20, 20, VW - 40, VH - 40, 14, 'rgba(18,14,40,0.94)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; rr(20, 20, VW - 40, VH - 40, 14); ctx.stroke();
  text(SH.name, 44, 52, 26, '#FFE066');
  text('もっている おかね ' + S.gold + ' G', VW - 180, 52, 22, '#FFFFFF', 'right');
  btn(VW - 160, 32, 120, 44, 'とじる', () => { G.mode = 'field'; G.shop = null; }, { col: '#D8D0F0' });
  const list = (SH.eq || []).map((e) => ({ eq: e })).concat((SH.items || []).map((k) => ({ it: k })));
  const rowH = 52, top = 84;
  list.forEach((row, i) => {
    const y = top + i * (rowH + 6);
    if (row.eq) {
      const E = EQUIP[row.eq];
      const who = S.party.filter((m) => !E.who || E.who.indexOf(m.id) >= 0);
      const stat = E.slot === 'wp' ? 'こうげき+' + E.atk + (E.mag ? ' まほう+' + E.mag : '') : 'しゅび+' + E.def;
      btn(40, y, VW * 0.52, rowH, '', () => {
        if (!who.length) { sh.msg = 'いまの なかまは そうび できないよ。'; return; }
        if (who.length === 1) { buyEq(row.eq, who[0]); return; }
        sh.pick = row.eq; sh.msg = 'だれが そうび する？';
      }, { col: sh.pick === row.eq ? '#FFE066' : '#F4F0FF' });
      text(E.name, 56, y + rowH / 2, 22, '#2A2440', 'left', true, VW * 0.22);
      text(stat, 40 + VW * 0.26, y + rowH / 2, 17, '#5A4A7A', 'left', false, VW * 0.17);
      text(E.price + ' G', 40 + VW * 0.52 - 12, y + rowH / 2, 20, '#8A4A10', 'right');
      // だれに うれしいか
      let xx = 40 + VW * 0.52 + 14;
      for (const m of S.party) {
        const ok = !E.who || E.who.indexOf(m.id) >= 0;
        drawFace(m.id, xx + 16, y + rowH / 2 - 2, 15, !ok);
        if (ok) {
          const g = eqGain(m, row.eq);
          text(g > 0 ? '+' + g : g === 0 ? '＝' : String(g), xx + 16, y + rowH - 4, 13, g > 0 ? '#7FE0A0' : '#C8B8E0', 'center');
        }
        xx += 40;
      }
    } else {
      const I = ITEMS[row.it];
      btn(40, y, VW * 0.52, rowH, '', () => buyItem(row.it), { col: '#F4F0FF' });
      text(I.name, 56, y + rowH / 2, 22, '#2A2440', 'left', true, VW * 0.2);
      text(I.desc, 40 + VW * 0.22, y + rowH / 2, 15, '#5A4A7A', 'left', false, VW * 0.2);
      text(I.price + ' G', 40 + VW * 0.52 - 12, y + rowH / 2, 20, '#8A4A10', 'right');
      text('もち ' + (S.items[row.it] || 0), 40 + VW * 0.52 + 20, y + rowH / 2, 18, '#FFFFFF');
    }
  });
  // だれが そうび するか
  if (sh.pick) {
    const E = EQUIP[sh.pick];
    const who = S.party.filter((m) => !E.who || E.who.indexOf(m.id) >= 0);
    who.forEach((m, i) => {
      const g = eqGain(m, sh.pick);
      btn(VW - 250, 100 + i * 64, 210, 56, HEROES[m.id].name, () => buyEq(sh.pick, m),
          { col: g > 0 ? '#9AF0B8' : '#D8D0F0', sub: g > 0 ? 'つよくなる +' + g : 'いまと おなじか よわい' });
    });
  }
  fillRR(40, VH - 92, VW - 80, 52, 10, 'rgba(255,255,255,0.1)');
  text(sh.msg, 60, VH - 66, 20, '#FFFFFF', 'left', true, VW - 120);
}

// --- メニュー ----------------------------------------------------------------------

function openMenu() { G.menu = { tab: 0, pick: null, msg: '' }; G.mode = 'menu'; tone(700, 0.05, 'square', 0.06); }

function useFieldItem(k, m) {
  const I = ITEMS[k];
  if (!S.items[k]) return;
  if (I.kind === 'warp') {
    S.items[k]--;
    G.mode = 'field'; G.menu = null;
    const town = S.lastTown || 'kokura';
    say('もどりの はねを なげた！ ' + MAPS[town].name + 'へ とんでいく！', () => goMap(town));
    return;
  }
  const s = hstat(m);
  if (I.kind === 'heal') {
    if (m.hp <= 0) { G.menu.msg = 'たおれて いる なかまには きかない。'; return; }
    if (m.hp >= s.mhp) { G.menu.msg = 'HPは まんたん だよ。'; return; }
    m.hp = Math.min(s.mhp, m.hp + I.pow);
  } else if (I.kind === 'mp') {
    if (m.mp >= s.mmp) { G.menu.msg = 'MPは まんたん だよ。'; return; }
    m.mp = Math.min(s.mmp, m.mp + I.pow);
  } else if (I.kind === 'revive') {
    if (m.hp > 0) { G.menu.msg = 'げんきな なかまには つかえない。'; return; }
    m.hp = Math.round(s.mhp / 2);
  }
  S.items[k]--;
  G.menu.msg = HEROES[m.id].name + 'に ' + I.name + 'を つかった！';
  tone(1000, 0.1, 'triangle', 0.1, 1600);
  saveGame();
}
function castField(caster, sk, m) {
  const sp = SPELLS[sk], s = hstat(caster);
  if (caster.hp <= 0) { G.menu.msg = 'たおれて いて つかえない。'; return; }
  if (caster.mp < sp.mp) { G.menu.msg = 'MPが たりない！'; return; }
  const targets = sp.tgt === 'allies' ? S.party.filter((x) => x.hp > 0) : [m];
  if (sp.kind === 'revive') { if (m.hp > 0) { G.menu.msg = 'げんきな なかまには つかえない。'; return; } m.hp = Math.round(hstat(m).mhp / 2); }
  else if (sp.kind === 'heal') {
    if (targets.every((t) => t.hp <= 0 || t.hp >= hstat(t).mhp)) { G.menu.msg = 'かいふくする ひつようは ないよ。'; return; }
    for (const t of targets) if (t.hp > 0) t.hp = Math.min(hstat(t).mhp, t.hp + healAmt(sp.pow, sp.sc, s.mag));
  }
  caster.mp -= sp.mp;
  G.menu.msg = HEROES[caster.id].name + 'は ' + sp.name + 'を となえた！';
  tone(900, 0.2, 'sine', 0.1, 1800);
  saveGame();
}

function drawMenu() {
  const mn = G.menu;
  fillRR(16, 16, VW - 32, VH - 32, 14, 'rgba(18,14,40,0.95)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; rr(16, 16, VW - 32, VH - 32, 14); ctx.stroke();
  const tabs = ['つよさ', 'どうぐ', 'じゅもん', 'きろく'];
  const tw = Math.min(150, (VW - 220) / 4);
  tabs.forEach((t, i) => btn(34 + i * (tw + 8), 30, tw, 46, t, () => { mn.tab = i; mn.pick = null; mn.msg = ''; },
                              { col: mn.tab === i ? '#FFE066' : '#D8D0F0' }));
  btn(VW - 150, 30, 118, 46, 'とじる', () => { G.mode = 'field'; G.menu = null; }, { col: '#FFB0C0' });
  const top = 92;
  if (mn.tab === 0) {
    const cw = (VW - 80) / Math.max(2, S.party.length);
    S.party.forEach((m, i) => {
      const s = hstat(m), x = 40 + i * cw;
      fillRR(x, top, cw - 12, 330, 10, 'rgba(255,255,255,0.08)');
      drawFace(m.id, x + 34, top + 38, 22, m.hp <= 0);
      text(HEROES[m.id].name, x + 66, top + 28, 24, HEROES[m.id].col);
      text('レベル ' + m.lv, x + 66, top + 56, 18, '#FFFFFF');
      const rows = [['HP', m.hp + ' / ' + s.mhp], ['MP', m.mp + ' / ' + s.mmp], ['こうげき', s.atk], ['しゅび', s.def],
                    ['すばやさ', s.agi], ['まほう', s.mag], ['つぎの Lvまで', needXp(m.lv) - m.xp]];
      rows.forEach((r, j) => {
        text(r[0], x + 14, top + 92 + j * 26, 16, '#C8B8E0');
        text(String(r[1]), x + cw - 26, top + 92 + j * 26, 18, '#FFFFFF', 'right');
      });
      text(EQUIP[m.wp].name, x + 14, top + 290, 15, '#FFE0B0', 'left', false, cw - 36);
      text(EQUIP[m.ar].name, x + 14, top + 312, 15, '#FFE0B0', 'left', false, cw - 36);
    });
    text('もっている おかね ' + S.gold + ' G　　ぼうけん じかん ' + fmtTime(S.time), 40, VH - 50, 20, '#FFFFFF');
    const bachi = ['boss1', 'boss2', 'boss3'].filter((f) => S.flags[f]).length;
    text('たいこの ばち ' + bachi + ' / 3', VW - 40, VH - 50, 20, '#FFE066', 'right');
  } else if (mn.tab === 1) {
    const keys = Object.keys(ITEMS).filter((k) => S.items[k] > 0);
    if (!keys.length) text('なにも もっていない。', 60, top + 40, 22, '#C8B8E0');
    keys.forEach((k, i) => {
      const y = top + i * 56;
      btn(40, y, VW * 0.42, 48, '', () => {
        if (ITEMS[k].kind === 'warp') { useFieldItem(k, null); return; }
        mn.pick = k; mn.msg = 'だれに つかう？';
      }, { col: mn.pick === k ? '#FFE066' : '#F4F0FF' });
      text(ITEMS[k].name + '　× ' + S.items[k], 58, y + 24, 20, '#2A2440', 'left', true, VW * 0.26);
      text(ITEMS[k].desc, 40 + VW * 0.42 - 12, y + 24, 14, '#5A4A7A', 'right', false, VW * 0.15);
    });
    if (mn.pick) memberPick((m) => useFieldItem(mn.pick, m));
  } else if (mn.tab === 2) {
    const casters = S.party.filter((m) => learned(m).some((k) => SPELLS[k].field));
    if (!casters.length) text('まだ つかえる じゅもんが ない。', 60, top + 40, 22, '#C8B8E0');
    let y = top;
    for (const c of casters) {
      text(HEROES[c.id].name + '（MP ' + c.mp + '）', 44, y + 16, 20, HEROES[c.id].col);
      y += 34;
      for (const k of learned(c).filter((k) => SPELLS[k].field)) {
        const sp = SPELLS[k];
        const sel = mn.pick && mn.pick.c === c && mn.pick.k === k;
        btn(40, y, VW * 0.42, 44, '', () => {
          if (sp.tgt === 'allies') { castField(c, k, null); return; }
          mn.pick = { c, k }; mn.msg = 'だれに つかう？';
        }, { col: sel ? '#FFE066' : '#F4F0FF' });
        text(sp.name + '（MP ' + sp.mp + '）', 58, y + 22, 19, '#2A2440', 'left', true, VW * 0.22);
        text(sp.desc, 40 + VW * 0.42 - 12, y + 22, 13, '#5A4A7A', 'right', false, VW * 0.17);
        y += 50;
      }
      y += 6;
    }
    if (mn.pick) memberPick((m) => castField(mn.pick.c, mn.pick.k, m));
  } else if (mn.tab === 3) {
    text('ぼうけんを きろくすると、つぎに ひらいた とき「つづきから」あそべるよ。', 44, top + 30, 20, '#FFFFFF', 'left', false, VW - 90);
    text('（まちに 出入りした とき や たたかいの あとにも じどうで きろく しているよ）', 44, top + 64, 17, '#C8B8E0', 'left', false, VW - 90);
    btn(VW / 2 - 150, top + 110, 300, 70, 'きろくする', () => { saveGame(); mn.msg = 'ぼうけんを きろくしました！'; jingle([72, 76, 79], 0.1, 'square', 0.1); });
    text('いる ところ： ' + MAPS[G.map].name, 44, top + 220, 20, '#FFE0B0');
    text('ぼうけん じかん： ' + fmtTime(S.time), 44, top + 252, 20, '#FFE0B0');
    btn(VW / 2 - 150, top + 290, 300, 56, 'タイトルに もどる', () => { saveGame(); G.menu = null; G.mode = 'title'; playBgm('title'); }, { col: '#D8D0F0' });
  }
  if (mn.msg) {
    fillRR(40, VH - 96, VW - 80, 44, 10, 'rgba(255,255,255,0.12)');
    text(mn.msg, 60, VH - 74, 20, '#FFFFFF', 'left', true, VW - 120);
  }
}
function memberPick(on) {
  S.party.forEach((m, i) => {
    const s = hstat(m);
    btn(VW * 0.5 + 20, 96 + i * 64, VW * 0.5 - 70, 56, HEROES[m.id].name, () => on(m),
        { col: m.hp > 0 ? '#9AF0B8' : '#D8D0F0', sub: 'HP ' + m.hp + '/' + s.mhp + '  MP ' + m.mp + '/' + s.mmp });
  });
}
function fmtTime(t) { const m = Math.floor(t / 60); return Math.floor(m / 60) + 'じかん ' + (m % 60) + 'ふん'; }

// --- フィールドを かく -------------------------------------------------------------

function drawField(t) {
  const k = mapKind();
  // カメラ（あるいている とちゅうも なめらかに）
  const wx = (G.moving ? lerp(G.fx, G.px, G.mt) : G.px) * TS + TS / 2;
  const wy = (G.moving ? lerp(G.fy, G.py, G.mt) : G.py) * TS + TS / 2;
  const mw = G.rows[0].length * TS, mh = G.rows.length * TS;
  let cx = wx - VW / 2, cy = wy - VH / 2 - 10;
  const mg = TS * 3;
  cx = clamp(cx, Math.min(-mg, (mw - VW) / 2), Math.max(mw - VW + mg, (mw - VW) / 2));
  cy = clamp(cy, Math.min(-mg, (mh - VH) / 2), Math.max(mh - VH + mg, (mh - VH) / 2));
  G.camX = cx; G.camY = cy;
  fillR(0, 0, VW, VH, k === 'world' ? '#3A86D0' : k === 'town' ? '#5A7A4A' : '#0A0810');
  ctx.save();
  ctx.translate(-Math.round(cx), -Math.round(cy));
  const x0 = Math.max(0, Math.floor(cx / TS)), x1 = Math.min(G.rows[0].length - 1, Math.ceil((cx + VW) / TS));
  const y0 = Math.max(0, Math.floor(cy / TS)), y1 = Math.min(G.rows.length - 1, Math.ceil((cy + VH) / TS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ch = G.rows[y][x], px = x * TS, py = y * TS;
    if (k === 'world') drawWorldTile(ch, x, y, px, py, t);
    else if (k === 'town') drawTownTile('HKMFR'.indexOf(ch) >= 0 ? '.' : ch, x, y, px, py, t, G.map);
    else drawDungeonTile(ch === 'B' ? '.' : ch, x, y, px, py, t, k, S.chests[G.map + ':' + x + ',' + y]);
  }
  for (const b of G.blocks) drawBlock(b.c, b.x, b.y, b.w, b.h, t);
  // ひと と なかまを 下から じゅんに かく（手前が うえに かさなる）
  const draws = [];
  for (const n of G.npcs) draws.push({ y: n.y, f: () => drawPerson(n.look, n.x * TS + TS / 2, n.y * TS + TS - 2, n.dir, Math.floor(t * 2 + n.x) % 2) });
  for (const e of G.ents) {
    if (e.kind === 'block') draws.push({ y: e.y, f: () => drawPerson('soldier', e.x * TS + TS / 2, e.y * TS + TS - 2, 0, 0) });
    else draws.push({ y: e.y + 0.5, f: () => drawMon(MONS[e.key].art, e.x * TS + TS / 2, e.y * TS + TS / 2 - 10, 34, MONS[e.key].col, t, 1) });
  }
  const step = Math.floor(G.walkT * 6) % 2;
  const members = S.party;
  for (let i = members.length - 1; i >= 0; i--) {
    let px, py, dir;
    if (i === 0) { px = wx; py = wy; dir = G.dir; }
    else {
      // うしろの 人は 1つ 前の 人が いた マスへ むかって あるく
      const to = G.trail[i - 1], from = G.trail[i] || to;
      const k2 = G.moving ? G.mt : 1;
      px = lerp(from.x, to.x, k2) * TS + TS / 2;
      py = lerp(from.y, to.y, k2) * TS + TS / 2;
      dir = to.dir;
    }
    const m = members[i];
    if (i > 0 && Math.abs(px - wx) < 2 && Math.abs(py - wy) < 2) continue;
    draws.push({ y: py / TS - 0.5 + (i === 0 ? 0.01 : 0), f: () => drawPerson(m.id, px, py + TS / 2 - 2, dir, G.moving ? step : 0) });
  }
  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) d.f();
  // くらい ダンジョンは まわりを くらく
  if (k === 'cave' || k === 'tunnel' || k === 'castle' || k === 'mount') {
    const g = ctx.createRadialGradient(wx, wy, TS * 2.5, wx, wy, TS * 9);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.7)');
    ctx.fillStyle = g; ctx.fillRect(cx, cy, VW, VH);
  }
  ctx.restore();
}

function drawHud(t) {
  // うえの ステータス
  const n = S.party.length, w = Math.min(190, (VW - 170) / n);
  S.party.forEach((m, i) => {
    const s = hstat(m), x = 10 + i * (w + 6), y = 8;
    fillRR(x, y, w, 50, 8, 'rgba(18,14,40,0.78)');
    drawFace(m.id, x + 22, y + 25, 15, m.hp <= 0);
    text(HEROES[m.id].name + ' Lv' + m.lv, x + 42, y + 14, 15, '#FFFFFF', 'left', true, w - 48);
    const bw = w - 50;
    fillRR(x + 42, y + 26, bw, 8, 4, 'rgba(255,255,255,0.2)');
    fillRR(x + 42, y + 26, bw * clamp(m.hp / s.mhp, 0, 1), 8, 4, m.hp < s.mhp * 0.3 ? '#FF6A6A' : '#7FE0A0');
    if (s.mmp > 0) { fillRR(x + 42, y + 38, bw, 6, 3, 'rgba(255,255,255,0.2)'); fillRR(x + 42, y + 38, bw * clamp(m.mp / s.mmp, 0, 1), 6, 3, '#7FC8F8'); }
  });
  text(S.gold + ' G', VW - 150, 30, 20, '#FFE066', 'right');
  btn(VW - 136, 8, 126, 50, 'メニュー', openMenu, { col: '#FFE066', size: 22 });
  // じゅうじキー
  const dp = dpadRect();
  ctx.globalAlpha = 0.55;
  for (let d = 0; d < 4; d++) {
    const r = dpadKey(d);
    const on = G.dpad && G.dpadDir === d;
    fillRR(r.x, r.y, r.w, r.h, 12, on ? '#FFE066' : 'rgba(255,255,255,0.85)');
    ctx.fillStyle = '#2A2440';
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, a = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][d];
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
    ctx.lineTo(cx + Math.cos(a + 2.3) * 12, cy + Math.sin(a + 2.3) * 12);
    ctx.lineTo(cx + Math.cos(a - 2.3) * 12, cy + Math.sin(a - 2.3) * 12);
    ctx.fill();
  }
  fillC(dp.cx, dp.cy, 16, 'rgba(255,255,255,0.5)');
  ctx.globalAlpha = 1;
  btn(VW - 130, VH - 128, 112, 112, 'しらべる', () => { if (!G.moving) { const d = DIRS[G.dir]; if (!interact(G.px + d[0], G.py + d[1])) say('なにも ない ようだ。'); } },
      { col: 'rgba(255,224,102,0.9)', size: 22 });
  if (G.toast && G.toast.t > 0) {
    ctx.globalAlpha = clamp(G.toast.t, 0, 1);
    textO(G.toast.text, VW / 2, 92, 30, '#FFFFFF');
    ctx.globalAlpha = 1;
  }
  void t;
}
function dpadRect() { return { cx: 110, cy: VH - 110 }; }
function dpadKey(d) {
  const { cx, cy } = dpadRect(), s = 62, o = 58;
  const off = [[0, o], [-o, 0], [o, 0], [0, -o]][d];
  return { x: cx + off[0] - s / 2, y: cy + off[1] - s / 2, w: s, h: s };
}
function dpadDirAt(x, y) {
  const { cx, cy } = dpadRect();
  const dx = x - cx, dy = y - cy;
  if (dx * dx + dy * dy > 140 * 140) return -1;
  if (dx * dx + dy * dy < 12 * 12) return -1;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
}

function drawDialog() {
  const d = G.dlg;
  const h = 132, y = VH - h - 14, x = 180, w = VW - 180 - 150;
  fillRR(x, y, w, h, 12, 'rgba(10,8,30,0.92)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; rr(x + 4, y + 4, w - 8, h - 8, 10); ctx.stroke();
  const full = d.lines[d.i] || '';
  const shown = full.slice(0, Math.floor(d.ch));
  const lines = wrap(shown, w - 50, 22);
  lines.slice(0, 4).forEach((l, i) => text(l, x + 24, y + 30 + i * 30, 22, '#FFFFFF', 'left', false));
  if (d.ch >= full.length) {
    if (d.i === d.lines.length - 1 && d.choice) {
      d.choice.opts.forEach((o, i) => btn(x + w - 150, y - 60 - i * 58, 140, 50, o, () => {
        const c = d.choice; G.dlg = null; c.on(i);
      }, { col: i === 0 ? '#9AF0B8' : '#FFC0C0' }));
    } else if (Math.floor(TIME * 3) % 2) {
      ctx.fillStyle = '#FFE066';
      ctx.beginPath(); ctx.moveTo(x + w - 34, y + h - 30); ctx.lineTo(x + w - 22, y + h - 30); ctx.lineTo(x + w - 28, y + h - 22); ctx.fill();
    }
  }
}

// --- タイトル -----------------------------------------------------------------------

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#1A2A5A', '#E88A5A');
  ctx.fillRect(0, 0, VW, VH);
  // 夜空の ほし
  for (let i = 0; i < 40; i++) {
    const x = (i * 137) % VW, y = (i * 71) % (VH * 0.5);
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t + i));
    fillC(x, y, 1.6, '#FFF6C8');
  }
  ctx.globalAlpha = 1;
  // 小倉城の シルエット
  ctx.save();
  ctx.translate(VW / 2 - 108, VH * 0.62 - 176);
  drawBlock('K', 0, 0, 6, 5, t, 1);
  ctx.restore();
  fillR(0, VH * 0.62, VW, VH * 0.38, '#3A5A3A');
  // はなび
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.35 + i / 3) % 1;
    const hx = VW * (0.18 + i * 0.32), hy = VH * 0.25;
    if (u > 0.3) {
      const r = (u - 0.3) * 120;
      ctx.globalAlpha = 1 - u;
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * Math.PI * 2;
        fillC(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 3, ['#FFE066', '#FF6FA8', '#7FE0F0'][i]);
      }
      ctx.globalAlpha = 1;
    }
  }
  textO('小倉っ子クエスト', VW / 2, 80, 64, '#FFE066', '#3A1A0A');
  text('〜 きえた 祇園太鼓 〜', VW / 2, 136, 24, '#FFFFFF', 'center');
  // 4きょうだい
  ['rina', 'yui', 'masaki', 'aoi'].forEach((id, i) => drawPerson(id, VW / 2 - 90 + i * 60, VH * 0.66 + Math.abs(Math.sin(t * 4 + i)) * -6, 0, Math.floor(t * 3 + i) % 2, 1.6));
  const sv = loadGame();
  const bw = 300, bx = VW / 2 - bw / 2;
  if (sv) {
    btn(bx, VH * 0.7 + 20, bw, 64, 'つづきから', () => { fullScreen(); startFromSave(sv); }, {
      sub: HEROES.rina.name + ' Lv' + sv.party[0].lv + '・' + MAPS[sv.map].name + '・' + fmtTime(sv.time) + (sv.cleared ? '・クリア★' : ''),
      col: '#FFE066' });
    btn(bx, VH * 0.7 + 94, bw, 50, 'はじめから', () => { G.confirmNew = true; }, { col: '#D8D0F0' });
  } else {
    btn(bx, VH * 0.7 + 30, bw, 70, 'はじめる', () => { fullScreen(); startNew(); }, { col: '#FFE066' });
  }
  if (G.confirmNew) {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.6)');
    fillRR(VW / 2 - 260, VH / 2 - 110, 520, 220, 16, '#1E1A40');
    text('はじめから あそぶと、いまの きろくは', VW / 2, VH / 2 - 62, 22, '#FFFFFF', 'center');
    text('きえて しまいます。 いいですか？', VW / 2, VH / 2 - 30, 22, '#FFFFFF', 'center');
    btn(VW / 2 - 230, VH / 2 + 20, 210, 64, 'はじめから', () => { G.confirmNew = false; fullScreen(); startNew(); }, { col: '#FFB0B0' });
    btn(VW / 2 + 20, VH / 2 + 20, 210, 64, 'やめる', () => { G.confirmNew = false; }, { col: '#9AF0B8' });
  }
}

function startNew() {
  S = newSave();
  store.set(SAVE_KEY, S);
  G.mode = 'prologue';
  G.pro = { i: 0, t: 0 };
  playBgm('title');
}
function startFromSave(sv) {
  S = sv;
  G.mode = 'field';
  enterMap(S.map, S.x, S.y, S.dir);
}

const PROLOGUE = [
  'ここは 九州の いちばん 北、北九州の 小倉。',
  'まいとし 夏に ひびく「小倉祇園太鼓」の おとが、ことしは きこえない。',
  'まおう くろがねが 太鼓の ちからを うばい、まちから げんきが きえて しまったのだ。',
  'りな と ゆいは、小倉城の とのさまに よばれた——',
];
function drawPrologue(t) {
  fillR(0, 0, VW, VH, '#0E0A20');
  const p = G.pro;
  p.t += 1 / 60;
  const line = PROLOGUE[p.i];
  ctx.globalAlpha = clamp(p.t * 1.5, 0, 1);
  const ls = wrap(line, VW - 200, 28);
  ls.forEach((l, i) => text(l, VW / 2, VH / 2 - (ls.length - 1) * 20 + i * 40, 28, '#FFFFFF', 'center', false));
  ctx.globalAlpha = 1;
  text('タップで つぎへ', VW / 2, VH - 50, 18, 'rgba(255,255,255,0.5)', 'center', false);
  void t;
}
function prologueNext() {
  G.pro.i++; G.pro.t = 0;
  tone(520, 0.05, 'triangle', 0.08);
  if (G.pro.i >= PROLOGUE.length) {
    G.mode = 'field';
    enterMap('kokura', 11, 5, 3);
    setTimeout(() => { if (G.mode === 'field' && !G.dlg) kingTalk(); }, 600);
  }
}

// --- エンディング --------------------------------------------------------------------

function startEnding() {
  S.flags.boss4 = 1;
  S.cleared = 1;
  saveGame();
  G.mode = 'ending';
  G.end = { t: 0 };
  playBgm('ending');
}
const ENDING = [
  'まおう くろがねを たおした！',
  'うばわれていた 太鼓の ちからが、まちへ かえっていく——',
  'ドン、ドドン！ 小倉の まちに 祇園太鼓の おとが もどってきた。',
  'とのさま「りな、ゆい、まさき、あおい。ほんとうに ありがとう！」',
  '4人は まつりの 夜空の 下で、いつまでも 太鼓を たたいた。',
  '小倉っ子クエスト　おしまい',
];
function drawEnding(t) {
  const e = G.end;
  e.t += 1 / 60;
  ctx.fillStyle = grad(0, VH, '#0A1030', '#3A1A4A'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 5; i++) {
    const u = (t * 0.3 + i / 5) % 1;
    const hx = VW * (0.1 + i * 0.2), hy = VH * (0.2 + (i % 2) * 0.1);
    const r = u * 140;
    ctx.globalAlpha = 1 - u;
    for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2; fillC(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 3, ['#FFE066', '#FF6FA8', '#7FE0F0', '#9AF0B8', '#FFB020'][i]); }
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(VW / 2 - 108, VH * 0.5 - 150); drawBlock('K', 0, 0, 6, 5, t, 1); ctx.restore();
  // 太鼓を たたく 4人
  ['rina', 'yui', 'masaki', 'aoi'].forEach((id, i) => {
    const x = VW / 2 - 150 + i * 100, y = VH * 0.86;
    fillC(x + 22, y - 18, 16, '#8A4A2A'); fillC(x + 22, y - 18, 12, '#F4E8D0');
    drawPerson(id, x, y, 0, Math.floor(t * 4 + i) % 2, 1.4);
  });
  if (Math.floor(t * 2) % 2 === 0 && Math.floor(t * 60) % 30 === 0) { noise(0.25, 0.25, 180); }
  const idx = Math.min(ENDING.length - 1, Math.floor(e.t / 4));
  fillRR(VW / 2 - 380, 26, 760, 70, 12, 'rgba(0,0,0,0.5)');
  text(ENDING[idx], VW / 2, 61, 24, '#FFFFFF', 'center', true, 720);
  if (idx === ENDING.length - 1) {
    text('ぼうけん じかん ' + fmtTime(S.time), VW / 2, 120, 20, '#FFE066', 'center');
    btn(VW / 2 - 130, VH * 0.5 - 30, 260, 60, 'タイトルへ', () => { G.mode = 'title'; playBgm('title'); });
  }
}

// --- おんがく（かんたんな くりかえし）-------------------------------------------------

const BGM = {
  title:   { bpm: 92, n: [72, 76, 79, 84, 83, 79, 76, 79, 77, 81, 84, 81, 79, 76, 74, 72], b: [48, 55, 53, 55] },
  town:    { bpm: 110, n: [79, 81, 79, 76, 77, 79, 72, null, 76, 77, 76, 74, 72, 74, 76, null], b: [48, 53, 55, 48] },
  field:   { bpm: 124, n: [67, 72, 76, 79, 77, 76, 74, 72, 69, 72, 76, 74, 72, 71, 72, null], b: [48, 45, 53, 55] },
  dungeon: { bpm: 96, n: [69, null, 72, 71, 69, null, 64, null, 65, null, 69, 68, 64, null, null, null], b: [45, 44, 41, 40] },
  castle:  { bpm: 104, n: [64, 67, 70, 69, 67, null, 63, 64, 65, 68, 71, 70, 68, null, 64, null], b: [40, 39, 41, 40] },
  battle:  { bpm: 150, n: [76, 76, 79, 76, 74, 72, 74, 76, 77, 77, 81, 77, 76, 74, 72, 71], b: [45, 45, 41, 43] },
  boss:    { bpm: 160, n: [69, 72, 76, 72, 69, 72, 75, 72, 68, 71, 74, 71, 68, 71, 74, 76], b: [45, 45, 44, 44] },
  ending:  { bpm: 100, n: [72, 76, 79, 84, 81, 79, 76, 79, 77, 76, 74, 76, 72, null, null, null], b: [48, 53, 55, 48] },
};
const MUS = { cur: null, i: 0, next: 0, on: true };
function playBgm(k) { if (MUS.cur !== k) { MUS.cur = k; MUS.i = 0; MUS.next = 0; } }
function pumpBgm() {
  if (!SND.ctx || !MUS.cur || !MUS.on) return;
  const B = BGM[MUS.cur];
  const step = 60 / B.bpm / 2;
  const now = SND.ctx.currentTime;
  if (MUS.next < now) MUS.next = now + 0.05;
  while (MUS.next < now + 0.25) {
    const i = MUS.i % B.n.length;
    const m = B.n[i];
    const dl = MUS.next - now;
    if (m != null) tone(440 * Math.pow(2, (m - 69) / 12), step * 1.4, 'triangle', 0.045, 0, dl);
    if (i % 4 === 0) tone(440 * Math.pow(2, (B.b[(i / 4) % B.b.length] - 69) / 12), step * 3.2, 'square', 0.025, 0, dl);
    MUS.i++; MUS.next += step;
  }
}

// --- ゲーム本体 --------------------------------------------------------------------

const KQ = {
  bg: '#0E0A20',
  update(dt) {
    pumpBgm();
    if (S) S.time += dt;
    if (G.toast) G.toast.t -= dt;
    if (G.dlg) { G.dlg.ch += dt * 40; }
    // フェード
    if (G.fade > 0) {
      G.fade += dt * 2.6;
      if (G.fade >= 1 && G.fadeTo) { const f = G.fadeTo; G.fadeTo = null; f(); G.fadeHold = G.fadeMsg ? 1.0 : 0; }
      if (G.fade >= 1 && G.fadeHold > 0) { G.fadeHold -= dt; G.fade = 1; return; }
      if (G.fade >= 2) { G.fade = 0; if (G.afterFade) { const a = G.afterFade; G.afterFade = null; a(); } }
      return;
    }
    if (G.mode === 'battle') { battleUpdate(dt); return; }
    if (G.mode !== 'field') return;
    // ひとびとが すこし うろうろ する
    for (const n of G.npcs) {
      if (!n.walk) continue;
      n.wt -= dt;
      if (n.wt <= 0 && !G.dlg) {
        n.wt = rnd(1.5, 3.5);
        const d = irnd(0, 3), nx = n.x + DIRS[d][0], ny = n.y + DIRS[d][1];
        n.dir = d;
        if (Math.abs(nx - n.hx) <= 2 && Math.abs(ny - n.hy) <= 2 && '.,f'.indexOf(tileAt(nx, ny)) >= 0 &&
            !(nx === G.px && ny === G.py) && !npcAt(nx, ny) && !G.trail.some((p) => p.x === nx && p.y === ny)) { n.x = nx; n.y = ny; }
      }
    }
    if (G.dlg) return;
    if (G.moving) {
      G.mt += dt / 0.17;
      G.walkT += dt;
      if (G.mt >= 1) { G.mt = 1; arrive(); }
      return;
    }
    // つぎの 1歩
    let d = -1;
    if (KEYS.ArrowDown) d = 0; else if (KEYS.ArrowLeft) d = 1; else if (KEYS.ArrowRight) d = 2; else if (KEYS.ArrowUp) d = 3;
    if (d < 0 && G.dpad) { d = dpadDirAt(PTR.x, PTR.y); G.dpadDir = d; }
    if (d >= 0) { G.path = []; tryStep(d); return; }
    if (G.path.length) {
      const p = G.path.shift();
      if (typeof p === 'object') { G.dir = p.face; const dd = DIRS[p.face]; interact(G.px + dd[0], G.py + dd[1]); }
      else tryStep(p);
    }
  },
  draw(t) {
    if (G.mode === 'title') { drawTitle(t); return; }
    if (G.mode === 'prologue') { drawPrologue(t); return; }
    if (G.mode === 'ending') { drawEnding(t); return; }
    if (G.mode === 'battle') drawBattle(t);
    else {
      drawField(t);
      if (G.mode === 'field') { drawHud(t); if (G.dlg) drawDialog(); }
      if (G.mode === 'shop') drawShop();
      if (G.mode === 'menu') drawMenu();
    }
    if (G.fade > 0) {
      const a = G.fade < 1 ? G.fade : 2 - G.fade;
      fillR(0, 0, VW, VH, 'rgba(0,0,0,' + clamp(a, 0, 1) + ')');
      if (G.fadeMsg && G.fade >= 0.9 && G.fade <= 1.1) text(G.fadeMsg, VW / 2, VH / 2, 26, '#FFFFFF', 'center');
    }
    if (G.flash > 0) { fillR(0, 0, VW, VH, 'rgba(255,255,255,' + G.flash + ')'); G.flash -= 0.08; }
  },
  down(x, y) {
    if (G.fade > 0) return;
    if (G.mode === 'prologue') { prologueNext(); return; }
    if (G.mode === 'battle') { battleTap(x, y); return; }
    if (G.mode !== 'field') return;
    if (G.dlg) { dlgNext(); return; }
    const d = dpadDirAt(x, y);
    if (d >= 0) { G.dpad = true; G.dpadDir = d; G.path = []; return; }
    // タップした マスへ あるく
    const tx = Math.floor((x + G.camX) / TS), ty = Math.floor((y + G.camY) / TS);
    if (Math.abs(tx - G.px) + Math.abs(ty - G.py) === 1 && !walkable(tx, ty)) {
      G.dir = DIRS.findIndex((v) => v[0] === tx - G.px && v[1] === ty - G.py);
      interact(tx, ty); return;
    }
    G.path = findPath(tx, ty);
  },
  move(x, y) { if (G.dpad) G.dpadDir = dpadDirAt(x, y); },
  up() { G.dpad = false; },
  key(code, down) {
    if (!down) return;
    if (G.mode === 'prologue' && (code === 'Enter' || code === 'Space')) { prologueNext(); return; }
    if (G.mode === 'battle') { battleKey(code); return; }
    if (G.mode === 'field') {
      if (G.dlg && (code === 'Enter' || code === 'Space')) { dlgNext(); return; }
      if (!G.dlg && (code === 'Enter' || code === 'Space') && !G.moving) { const dd = DIRS[G.dir]; interact(G.px + dd[0], G.py + dd[1]); }
      if (!G.dlg && (code === 'Escape' || code === 'KeyM')) openMenu();
    } else if ((G.mode === 'menu' || G.mode === 'shop') && code === 'Escape') { G.mode = 'field'; G.menu = null; G.shop = null; }
  },
  pause() { if (S && G.mode !== 'title') saveGame(); },
};

window.addEventListener('pagehide', () => { if (S && G.mode !== 'title' && G.mode !== 'prologue') saveGame(); });
startGame(KQ);
playBgm('title');
