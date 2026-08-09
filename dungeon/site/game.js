// ダンジョンの ルール。
//
// ★ ターンせい。りなが 1マス うごく（か たたかう）と、
//   そのあと てき ぜんぶが 1回 うごく。
//   「じっと 見ていても やられない」ので、小学生でも あわてずに あそべる。
//
// ★ ぜんめつ しても 1かいめから では ない。
//   いちばん ふかく もぐった かいの 5の だんから やりなおせる。
//   さいしょから やりなおしだと、子どもは 2回目を あそばない。

'use strict';

const SAVE_KEY = 'dungeon.v1';

const save = { best: 1, clear: false, deaths: 0, wins: 0, plays: 0, check: 1 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Number.isFinite(o.best)) save.best = Math.max(1, Math.min(FLOORS, o.best));
    if (Number.isFinite(o.check)) save.check = Math.max(1, Math.min(FLOORS, o.check));
    save.clear = !!o.clear;
    if (Number.isFinite(o.deaths)) save.deaths = o.deaths;
    if (Number.isFinite(o.wins)) save.wins = o.wins;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

const G = {
  screen: 'title',
  m: null, rooms: [],
  seen: null,          // 一度でも 見た マス
  lit: null,           // いま 見えている マス
  depth: 1,
  me: null,
  foes: [],
  items: [],
  stair: null,
  chests: [],
  hasKey: false,
  log: [],
  over: false, win: false,
  anim: [],            // ぱっと 出る エフェクト
  turn: 0,
  busy: 0,
  startDepth: 1,
};

function newHero(depth) {
  // 5かいごとの やりなおしでは、その ぶん つよく しておく
  const lv = 1 + Math.floor((depth - 1) / 2);
  return {
    x: 0, y: 0, lv,
    hp: 40 + (lv - 1) * 12, max: 40 + (lv - 1) * 12,
    atk: 8 + (lv - 1) * 3, def: 2 + (lv - 1),
    exp: 0, next: 12,
    bag: depth > 1 ? ['herb', 'herb'] : ['herb'],
    dead: false,
  };
}

function startRun(depth) {
  audioStart();
  G.startDepth = depth;
  // ★ ここを わすれると、1回 ちからつきた あと
  //   「もう一度」を おしても すぐ おわった ことに なって うごかない。
  G.over = false;
  G.win = false;
  G.busy = 0;
  G.anim = [];
  G.me = newHero(depth);
  G.depth = depth;
  save.plays++;
  storeSave();
  buildFloor();
  G.screen = 'play';
  G.log = G.depth === 1 ? STORY.open.slice(-2) : ['地下 ' + G.depth + '階に おりた'];
  say(MAPS[Math.min(MAPS.length - 1, G.depth - 1)].story);
  bgmStart(G.depth);
}

// ★ 地図は floors.js に 文字で 書いてある（毎回 同じ 形）。
//   ここでは その 文字を よんで、かべ・ゆか・かいだん・とびら・敵・道具に する。
function buildFloor() {
  const rows = MAPS[Math.min(MAPS.length - 1, G.depth - 1)].map;
  G.m = [];
  G.seen = []; G.lit = [];
  G.foes = []; G.items = []; G.chests = [];
  G.stair = null;
  G.hasKey = false;
  for (let y = 0; y < MH; y++) {
    const line = rows[y] || '';
    const mrow = [], srow = [], lrow = [];
    for (let x = 0; x < MW; x++) {
      const c = line[x] || '#';
      let t = FLOOR;
      if (c === '#') t = WALL;
      else if (c === '>') { t = STAIR; G.stair = { x, y }; }
      else if (c === '+') t = DOOR;
      mrow.push(t);
      // ★ 形は はじめから ぜんぶ 見えている（ドルアーガの塔 と 同じ）。
      //   毎回 同じ 地図なので かくす いみが なく、かくすと 迷子に なる。
      srow.push(t !== WALL);
      lrow.push(false);
      if (c === '<') { G.me.x = x; G.me.y = y; }
      else if (FOE_OF[c]) G.foes.push(mkFoe(FOE_OF[c], x, y));
      else if (ITEM_OF[c]) G.items.push({ x, y, k: ITEM_OF[c] });
      else if (c === 'C') G.chests.push({ x, y, open: false });
    }
    G.m.push(mrow); G.seen.push(srow); G.lit.push(lrow);
  }
  G.rooms = [];
  G.turn = 0;
  look();
  if (G.depth >= FLOORS) sfxBoss();
}

function mkFoe(k, x, y) {
  const F = FOES[k];
  // ★ 深いほど 少し 強い。前は「その敵が 出はじめる 階」を 見て いたが、
  //   地図に 直接 置くように なって その数字を やめたので、階だけで きめる。
  const s = F.boss ? 1 : 1 + (G.depth - 1) * 0.07;
  return {
    k, x, y,
    hp: Math.round(F.hp * s), max: Math.round(F.hp * s),
    atk: Math.round(F.atk * s), def: F.def,
    hit: 0, moved: 0,
  };
}

// たいまつの あかり。★ 地図の 形は はじめから 見えていて、
// ここで きめるのは「明るい ところ」だけ。
const LAMP = 4.6;
function look() {
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const d = Math.hypot(x - G.me.x, y - G.me.y);
      G.lit[y][x] = d <= LAMP;
    }
  }
}

// --- ターン ---------------------------------------------------------------------

function say(s) {
  G.log.push(s);
  if (G.log.length > 5) G.log.shift();
}

function foeAt(x, y) { return G.foes.find((f) => f.x === x && f.y === y); }

// りなが 1手 うごく。うごけたら true。
function act(dx, dy) {
  if (G.screen !== 'play' || G.over || G.busy > 0) return false;
  const nx = G.me.x + dx, ny = G.me.y + dy;
  if (dx === 0 && dy === 0) { endTurn(); return true; }   // その場で まつ
  const f = foeAt(nx, ny);
  if (f) { attack(G.me, f, true); endTurn(); return true; }
  // ★ とびら。カギを 持って いれば あけられる。
  if (G.m[ny] && G.m[ny][nx] === DOOR) {
    if (G.hasKey || G.me.bag.indexOf('key') >= 0) {
      const i = G.me.bag.indexOf('key');
      if (i >= 0) G.me.bag.splice(i, 1);
      G.hasKey = false;
      G.m[ny][nx] = FLOOR;
      say('カギで とびらを 開けた！');
      sfxPick();
      endTurn();
      return true;
    }
    say('カギが かかって いる。カギを さがそう');
    return false;
  }
  if (!walkable(G.m, nx, ny)) return false;
  G.me.x = nx; G.me.y = ny;
  sfxStep();
  look();
  pickHere();
  if (G.m[ny][nx] === STAIR) { descend(); return true; }
  endTurn();
  return true;
}

function pickHere() {
  // たからばこ
  const c = G.chests.find((q) => q.x === G.me.x && q.y === G.me.y && !q.open);
  if (c) {
    c.open = true;
    const k = CHEST[Math.min(CHEST.length - 1, G.depth - 1)];
    if (G.me.bag.length < 8) {
      G.me.bag.push(k);
      say('宝箱！ ' + ITEMS[k].name + ' が 出た');
    } else {
      G.items.push({ x: c.x, y: c.y, k });
      say('宝箱！ でも もちものが いっぱい');
    }
    sfxPick();
  }
  const i = G.items.findIndex((q) => q.x === G.me.x && q.y === G.me.y);
  if (i < 0) return;
  const it = G.items.splice(i, 1)[0];
  // ★ カギは もちものに 入れない ので、いっぱいでも 先に ひろう。
  //   ここを あとに すると、もちものが いっぱいの とき カギが
  //   ひろえず、とびらが 一生 あかなく なる。
  if (it.k === 'key') {
    G.hasKey = true;
    say('カギを 見つけた！ とびらへ 行こう');
    sfxPick();
    return;
  }
  if (G.me.bag.length >= 8) { say('もちものが いっぱい！'); G.items.push(it); return; }
  G.me.bag.push(it.k);
  say(ITEMS[it.k].name + ' を ひろった');
  sfxPick();
}

function dmgCalc(a, d) {
  const base = a.atk - d.def * 0.5;
  return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3)));
}

function attack(a, d, byMe) {
  const dm = dmgCalc(a, d);
  d.hp -= dm;
  d.hit = 1;
  if (byMe) {
    sfxHit(dm > 14);
    say(FOES[d.k].name + ' に ' + dm);
    G.anim.push({ x: d.x, y: d.y, n: dm, t: 0, me: false });
    if (d.hp <= 0) {
      say(FOES[d.k].name + ' を たおした！');
      sfxKill();
      gainExp(FOES[d.k].exp);
      G.foes = G.foes.filter((q) => q !== d);
      if (FOES[d.k].boss) winRun();
    }
  } else {
    sfxHurt();
    say(FOES[a.k].name + ' の 攻撃 ' + dm);
    G.anim.push({ x: d.x, y: d.y, n: dm, t: 0, me: true });
    if (d.hp <= 0) { d.hp = 0; die(); }
  }
}

function gainExp(n) {
  const me = G.me;
  me.exp += n;
  while (me.exp >= me.next) {
    me.exp -= me.next;
    me.lv++;
    me.next = Math.round(me.next * 1.55);
    me.max += 10; me.hp = me.max;
    me.atk += 3; me.def += 1;
    say('レベル ' + me.lv + ' に なった！');
    sfxLevel();
  }
}

function useItem(i) {
  if (G.screen !== 'play' || G.over) return;
  const k = G.me.bag[i];
  if (!k) return;
  const me = G.me;
  if (k === 'herb') { me.hp = Math.min(me.max, me.hp + 30); say('やくそう。30 回復'); sfxHeal(); }
  else if (k === 'herb2') { me.hp = me.max; say('とくやくそう！ ぜんぶ 回復'); sfxHeal(); }
  else if (k === 'sword') { me.atk += 3; say('攻撃が 3 上がった！'); sfxLevel(); }
  else if (k === 'shield') { me.def += 2; say('守りが 2 上がった！'); sfxLevel(); }
  else if (k === 'bomb') {
    let n = 0;
    for (const f of G.foes.slice()) {
      if (Math.abs(f.x - me.x) <= 3 && Math.abs(f.y - me.y) <= 3) {
        f.hp -= 20; f.hit = 1; n++;
        G.anim.push({ x: f.x, y: f.y, n: 20, t: 0, me: false });
        if (f.hp <= 0) {
          gainExp(FOES[f.k].exp);
          G.foes = G.foes.filter((q) => q !== f);
          if (FOES[f.k].boss) winRun();
        }
      }
    }
    say('かみなり！ ' + n + '体に 20');
    sfxHit(true);
  } else if (k === 'wing') {
    say('つばさで 次の 階へ！');
    G.me.bag.splice(i, 1);
    descend();
    return;
  }
  G.me.bag.splice(i, 1);
  endTurn();
}

// てきが うごく
function endTurn() {
  G.turn++;
  for (const f of G.foes.slice()) {
    const times = FOES[f.k].spd;
    for (let n = 0; n < times; n++) {
      if (G.over) return;
      foeMove(f);
    }
  }
  // ときどき 1ぴき ふえる（のんびり しすぎない ように）
  // ★ とちゅうで 敵が わいてくるのは やめた。地図に 置いた 敵だけ。
  //   「かたづけた はずの ところに また いる」と 分かりにくい。
  bgmHeat(G.me.hp / G.me.max < 0.3 ? 1 : 0);
}

function foeMove(f) {
  const me = G.me;
  const dx = me.x - f.x, dy = me.y - f.y;
  const dist = Math.abs(dx) + Math.abs(dy);
  // となりに いれば こうげき
  if (dist === 1) { attack(f, me, false); return; }
  // まほうつかいは はなれていても うつ
  const F = FOES[f.k];
  if (F.far && dist <= F.far && (dx === 0 || dy === 0) && clearLine(f, me)) {
    attack(f, me, false);
    return;
  }
  // 見えて いない ときは ふらふら
  const chase = G.lit[f.y][f.x] || dist < 7;
  let bx = 0, by = 0;
  if (chase && !F.wander) {
    if (Math.abs(dx) > Math.abs(dy)) bx = Math.sign(dx); else by = Math.sign(dy);
    if (!canGo(f, bx, by)) {
      if (bx) { bx = 0; by = Math.sign(dy) || (Math.random() < 0.5 ? 1 : -1); }
      else { by = 0; bx = Math.sign(dx) || (Math.random() < 0.5 ? 1 : -1); }
    }
  } else {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const d = dirs[rnd(4)];
    bx = d[0]; by = d[1];
    if (chase && F.wander && Math.random() < 0.55) {
      if (Math.abs(dx) > Math.abs(dy)) { bx = Math.sign(dx); by = 0; }
      else { by = Math.sign(dy); bx = 0; }
    }
  }
  if (canGo(f, bx, by)) { f.x += bx; f.y += by; }
}

function canGo(f, dx, dy) {
  if (!dx && !dy) return false;
  const nx = f.x + dx, ny = f.y + dy;
  if (!walkable(G.m, nx, ny)) return false;
  if (G.me.x === nx && G.me.y === ny) return false;
  if (G.foes.some((q) => q !== f && q.x === nx && q.y === ny)) return false;
  return true;
}

function clearLine(a, b) {
  const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
  let x = a.x + dx, y = a.y + dy;
  while (x !== b.x || y !== b.y) {
    if (!walkable(G.m, x, y)) return false;
    if (G.foes.some((q) => q.x === x && q.y === y)) return false;
    x += dx; y += dy;
  }
  return true;
}

function descend() {
  if (G.depth >= FLOORS) return;
  G.depth++;
  save.best = Math.max(save.best, G.depth);
  // 5かいごとの チェックポイント
  if (G.depth % 5 === 1 || G.depth === FLOORS) save.check = Math.max(save.check, G.depth);
  storeSave();
  buildFloor();
  say('地下 ' + G.depth + '階に おりた');
  say(MAPS[Math.min(MAPS.length - 1, G.depth - 1)].story);
  sfxStair();
  bgmStart(G.depth);
}

function die() {
  if (G.over) return;
  G.over = true; G.win = false;
  G.me.dead = true;
  save.deaths++;
  storeSave();
  bgmStop();
  sfxDown();
  say('力つきた…');
}

function winRun() {
  if (G.over) return;
  G.over = true; G.win = true;
  save.clear = true;
  save.wins++;
  save.check = FLOORS;
  storeSave();
  bgmStop();
  sfxWin();
  say('ドラゴンを たおした！！');
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  for (const f of G.foes) f.hit = Math.max(0, f.hit - dt * 4);
  for (const a of G.anim) a.t += dt;
  G.anim = G.anim.filter((a) => a.t < 0.8);
  if (G.over) {
    G.busy += dt;
    if (G.busy > 1.6) G.screen = 'result';
  }
}
