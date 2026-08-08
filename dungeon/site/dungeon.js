// ダンジョンの 作りかたと、てき・どうぐ の 数字。
//
// ★ 階は そのつど 作りなおす（ランダム）。ただし
//   「かならず 入口から 出口まで 歩いて 行ける」ことが 大事。
//   へやを 作って → となりどうしを 通路で つなぐ、の じゅんで 作れば、
//   つながって いない へやが できない。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;
const MW = 33, MH = 21;      // ちずの 大きさ（マス）
const FLOORS = 10;

// マスの しゅるい
const WALL = 0, FLOOR = 1, STAIR = 2;

// --- てき ------------------------------------------------------------------------
//
// spd は「1ターンに 何回 うごくか」。2 なら 2回 うごく（＝はやい）。

const FOES = {
  slime: { name: 'スライム', hp: 12, atk: 4,  def: 0, exp: 4,  col: '#6ACB6A', spd: 1, from: 1 },
  bat:   { name: 'コウモリ', hp: 9,  atk: 3,  def: 0, exp: 5,  col: '#B98FE0', spd: 2, from: 2, wander: true },
  gob:   { name: 'ゴブリン', hp: 20, atk: 7,  def: 2, exp: 10, col: '#C8884A', spd: 1, from: 3 },
  armor: { name: 'よろい',   hp: 34, atk: 9,  def: 6, exp: 18, col: '#8A98B0', spd: 1, from: 5 },
  mage:  { name: 'まほうつかい', hp: 18, atk: 12, def: 1, exp: 22, col: '#FF6A8A', spd: 1, from: 6, far: 4 },
  boss:  { name: 'ドラゴン', hp: 130, atk: 18, def: 8, exp: 200, col: '#FF5A3A', spd: 1, from: 10, boss: true },
};
const FKEYS = ['slime', 'bat', 'gob', 'armor', 'mage'];

// --- どうぐ ----------------------------------------------------------------------

const ITEMS = {
  herb:  { name: 'やくそう',   col: '#7FD86A', about: 'たいりょくが 30 かいふく' },
  herb2: { name: 'とくやくそう', col: '#3AA85A', about: 'たいりょくが ぜんぶ かいふく' },
  sword: { name: 'つよい けん', col: '#FFD166', about: 'こうげき +3（ずっと）' },
  shield:{ name: 'かたい たて', col: '#8FD6FF', about: 'まもり +2（ずっと）' },
  bomb:  { name: 'かみなりの まき', col: '#FF9C5A', about: 'まわりの てき ぜんぶに 20' },
  wing:  { name: 'かえりの つばさ', col: '#E8D0F8', about: 'すぐ つぎの かいへ' },
};
const IKEYS = ['herb', 'herb', 'herb', 'herb2', 'sword', 'shield', 'bomb', 'wing'];

// --- ちずを 作る -----------------------------------------------------------------

function rnd(n) { return (Math.random() * n) | 0; }

function makeFloor(depth) {
  const m = [];
  for (let y = 0; y < MH; y++) m.push(new Array(MW).fill(WALL));

  // へやを おく（かさならない ように）
  const rooms = [];
  const want = 5 + Math.min(4, Math.floor(depth / 2));
  for (let tries = 0; tries < 220 && rooms.length < want; tries++) {
    const w = 4 + rnd(5), h = 3 + rnd(4);
    const x = 1 + rnd(MW - w - 2), y = 1 + rnd(MH - h - 2);
    let ok = true;
    for (const r of rooms) {
      if (x - 1 < r.x + r.w + 1 && x + w + 1 > r.x - 1 &&
          y - 1 < r.y + r.h + 1 && y + h + 1 > r.y - 1) { ok = false; break; }
    }
    if (!ok) continue;
    rooms.push({ x, y, w, h, cx: (x + w / 2) | 0, cy: (y + h / 2) | 0 });
  }
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) m[y][x] = FLOOR;
    }
  }
  // ★ へやを じゅんばんに つなぐ。こう すれば かならず ぜんぶ つながる。
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.cx, y = a.cy;
    while (x !== b.cx) { m[y][x] = FLOOR; x += Math.sign(b.cx - x); }
    while (y !== b.cy) { m[y][x] = FLOOR; y += Math.sign(b.cy - y); }
    m[y][x] = FLOOR;
  }
  // ときどき ぐるっと まわれる 道も つける（いきどまりばかりだと つまらない）
  if (rooms.length > 3 && Math.random() < 0.7) {
    const a = rooms[0], b = rooms[rooms.length - 1];
    let x = a.cx, y = a.cy;
    while (y !== b.cy) { m[y][x] = FLOOR; y += Math.sign(b.cy - y); }
    while (x !== b.cx) { m[y][x] = FLOOR; x += Math.sign(b.cx - x); }
  }
  return { m, rooms };
}

// その マスに 立てるか
function walkable(m, x, y) {
  return x >= 0 && y >= 0 && x < MW && y < MH && m[y][x] !== WALL;
}
