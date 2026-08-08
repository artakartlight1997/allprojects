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
  G.log = ['ちかしつ ' + G.depth + 'かい に おりた'];
  bgmStart(G.depth);
}

function buildFloor() {
  const f = makeFloor(G.depth);
  G.m = f.m; G.rooms = f.rooms;
  G.seen = []; G.lit = [];
  for (let y = 0; y < MH; y++) {
    G.seen.push(new Array(MW).fill(false));
    G.lit.push(new Array(MW).fill(false));
  }
  // りなは 1つ目の へや、かいだんは さいごの へや
  const a = G.rooms[0], b = G.rooms[G.rooms.length - 1];
  G.me.x = a.cx; G.me.y = a.cy;
  G.stair = { x: b.cx, y: b.cy };
  G.m[b.cy][b.cx] = STAIR;

  // てき
  G.foes = [];
  const isBoss = G.depth >= FLOORS;
  if (isBoss) {
    G.foes.push(mkFoe('boss', b.cx - 2, b.cy));
    for (let i = 0; i < 4; i++) spawnFoe();
    sfxBoss();
  } else {
    const n = 4 + Math.floor(G.depth * 1.1);
    for (let i = 0; i < n; i++) spawnFoe();
  }

  // どうぐ
  G.items = [];
  const ni = 3 + rnd(3);
  for (let i = 0; i < ni; i++) {
    const p = freeSpot();
    if (!p) break;
    G.items.push({ x: p.x, y: p.y, k: IKEYS[rnd(IKEYS.length)] });
  }
  G.turn = 0;
  look();
}

function mkFoe(k, x, y) {
  const F = FOES[k];
  const up = 1 + (G.depth - F.from) * 0.10;
  const s = Math.max(1, up);
  return {
    k, x, y,
    hp: Math.round(F.hp * s), max: Math.round(F.hp * s),
    atk: Math.round(F.atk * s), def: F.def,
    hit: 0, moved: 0,
  };
}

function freeSpot(minDist) {
  for (let t = 0; t < 300; t++) {
    const r = G.rooms[rnd(G.rooms.length)];
    const x = r.x + rnd(r.w), y = r.y + rnd(r.h);
    if (G.m[y][x] === WALL) continue;
    if (G.stair && x === G.stair.x && y === G.stair.y) continue;
    if (G.me && x === G.me.x && y === G.me.y) continue;
    if (minDist && Math.abs(x - G.me.x) + Math.abs(y - G.me.y) < minDist) continue;
    if (G.foes.some((f) => f.x === x && f.y === y)) continue;
    if (G.items.some((f) => f.x === x && f.y === y)) continue;
    return { x, y };
  }
  return null;
}

function spawnFoe() {
  const ok = FKEYS.filter((k) => FOES[k].from <= G.depth);
  const k = ok.length ? ok[rnd(ok.length)] : 'slime';
  const p = freeSpot(7);
  if (!p) return;
  G.foes.push(mkFoe(k, p.x, p.y));
}

// --- 見える はんい ---------------------------------------------------------------
//
// へやの 中に いれば その へや ぜんぶ、通路なら まわり 1マスだけ。

function look() {
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) G.lit[y][x] = false;
  const inRoom = G.rooms.find((r) =>
    G.me.x >= r.x && G.me.x < r.x + r.w && G.me.y >= r.y && G.me.y < r.y + r.h);
  if (inRoom) {
    for (let y = inRoom.y - 1; y <= inRoom.y + inRoom.h; y++) {
      for (let x = inRoom.x - 1; x <= inRoom.x + inRoom.w; x++) {
        if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        G.lit[y][x] = true; G.seen[y][x] = true;
      }
    }
  }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = G.me.x + dx, y = G.me.y + dy;
      if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      G.lit[y][x] = true; G.seen[y][x] = true;
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
  const i = G.items.findIndex((q) => q.x === G.me.x && q.y === G.me.y);
  if (i < 0) return;
  const it = G.items.splice(i, 1)[0];
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
    say(FOES[a.k].name + ' の こうげき ' + dm);
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
  if (k === 'herb') { me.hp = Math.min(me.max, me.hp + 30); say('やくそう。30 かいふく'); sfxHeal(); }
  else if (k === 'herb2') { me.hp = me.max; say('とくやくそう！ ぜんぶ かいふく'); sfxHeal(); }
  else if (k === 'sword') { me.atk += 3; say('こうげきが 3 あがった！'); sfxLevel(); }
  else if (k === 'shield') { me.def += 2; say('まもりが 2 あがった！'); sfxLevel(); }
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
    say('かみなり！ ' + n + 'たいに 20');
    sfxHit(true);
  } else if (k === 'wing') {
    say('つばさで つぎの かいへ！');
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
  if (!G.over && G.depth < FLOORS && G.turn % 26 === 25 && G.foes.length < 12) spawnFoe();
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
  say('ちかしつ ' + G.depth + 'かい に おりた');
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
  say('ちからつきた…');
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
