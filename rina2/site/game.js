'use strict';
// りなの大冒険2 — あそびの中身（物理・敵・ボス・アイテム）
//
// 1作目（/play/）の あそびかたを ひきつぎつつ、こんなものを 足した。
//   ・全25ステージ。ぜんぶ 最初から えらべる
//   ・どのステージにも 大きい ボスが いて、ボスは こうげきしてくる
//   ・ケーキで 大きくなり、ぶきを 取ると たまが うてる（スーパーマリオの 花）
//   ・どかんで ちかへ ワープ、はしごで のぼりおり（マリオ／ドンキーコング）
//   ・たるが ころがってくる（ドンキーコング）
//   ・海は およぐ、宇宙は 体が かるい、くらやみ、オートスクロール
//
// ★ 大きくなっても 当たり判定は 変えない（見た目だけ 大きくする）。
//   判定まで 大きくすると せまい通路を 通れなくなり、25ステージ ぜんぶの
//   「ゴールまで 行けるか」を 作り直すことになるため。1作目と 同じ考え方。

// --- 物理 ---------------------------------------------------------------
const GRAVITY = 46;
const MOVE_SPEED = 7.6;
const JUMP_V = -17.8;
const JUMP_CUT = -6.5;
const AIR_JUMP_V = -15;
const MAX_FALL = 28;
const STOMP_BOUNCE = -12.5;
const SPRING_V = -26.5;
const CLIMB_SPEED = 5.4;
const CONVEY_SPEED = 3.2;
// ★ あたらしい しかけ
//   A … 上むきの かぜ（ふきあげ）。中に いると ふわっと 上がる
//   I … こおりの ゆか。すべって すぐには 止まれない
//   ( ) … よこむきの かぜ。おされる
const UPDRAFT = 120;          // ふきあげの つよさ
const UPDRAFT_MAX = 9.5;      // ふきあげで 上がる はやさの じょうげん
const WIND_PUSH = 3.4;        // よこかぜに おされる はやさ
const ICE_ACC = 15;           // こおりの 上で はやさが かわる はやさ

// 水の中。マリオの水面下と同じで、ジャンプは「ひとかき」になる。
const SWIM_GRAV = 13;
const SWIM_STROKE = -7.4;
const SWIM_MAX_FALL = 6.5;
const SWIM_SPEED = 5.4;

const PLAYER_W = 0.72;
const PLAYER_H = 0.92;
const VIEW_TILES_Y = 13;

const HURT_TIME = 1.6;
const SPAWN_GRACE = 1.6;
const STAR_TIME = 9;
const FEATHER_TIME = 14;
const MAGNET_TIME = 11;
const MAGNET_RANGE = 5;
const GROW_FREEZE = 0.5;      // 大きくなる／ちぢむ ときの 止まる時間

const CRUMBLE_WARN = 0.45;
const CRUMBLE_BACK = 3;
const TRAP_WARN = 0.35;
const TRAP_UP = 2.2;
const TRAP_SENSE = 3.2;
const DROP_SENSE = 1.6;

const BOSS_INTRO_TIME = 2.6;
const BOSS_INTRO_RANGE = 12;
const BOSS_HIT_INVULN = 1.15;

const FREEZE_TIME = 6.5;      // こおりだまで こおっている 時間
const SHOT_LIFE = 4.0;
const SHOT_MAX = 4;
const HAMMER_SWING = 0.32;
const HAMMER_COOL = 0.42;
const BOOM_RANGE = 10.5;

const PIPE_TIME = 0.55;       // どかんに 入る 演出の 長さ

const CLEAR_TIME_LIMIT = 150;

const SOLID = '#=?!XN^FDO><I';
const isSolid = (c) => SOLID.indexOf(c) >= 0;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- ぶき ---------------------------------------------------------------
// 取ると ずっと 持っていられる。やられると 1つ 下がる（ぶき→大きい→ちび）。
const WEAPONS = {
  HEART: { name: 'ハートだま', col: '#FF6FA8', sub: '#FFD0E2', hint: 'ぽんぽん はずむ たま' },
  ICE: { name: 'こおりだま', col: '#8AD8F0', sub: '#E4F8FF', hint: '敵を こおらせる（足場になる）' },
  BOOM: { name: 'ブーメラン', col: '#FFD24A', sub: '#FFF0B8', hint: '行って もどる。何体でも たおす' },
  HAMMER: { name: 'ハンマー', col: '#FF8A3A', sub: '#FFD6B0', hint: '目の前を なぐる。トゲも たおせる' },
};
const WEAPON_KEYS = ['HEART', 'ICE', 'BOOM', 'HAMMER'];

// --- 敵の大きさ ---------------------------------------------------------
// 1作目より ひとまわり 大きくして、小さい画面でも 見えるようにした。
const ENEMY_SIZE = {
  WALKER: { w: 1.25, h: 1.25 },
  SPIKY: { w: 1.2, h: 1.2 },
  FLYER: { w: 1.45, h: 1.25 },
  JUMPER: { w: 1.25, h: 1.35 },
  CHASER: { w: 1.35, h: 1.3 },
  HOPPER: { w: 1.35, h: 1.2 },
  DROPPER: { w: 1.2, h: 1.25 },
  GHOST: { w: 1.45, h: 1.45 },
  FISH: { w: 1.5, h: 1.15 },
  ROBO: { w: 1.25, h: 1.55 },
  BARRELER: { w: 1.35, h: 1.6 },
  BARREL: { w: 1.1, h: 1.1 },
  MINION: { w: 1.05, h: 1.05 },
  BOSS: { w: 2.6, h: 2.4 },
};

const ENEMY_CHAR = {
  w: 'WALKER', k: 'SPIKY', p: 'FLYER', j: 'JUMPER', c: 'CHASER',
  S: 'HOPPER', d: 'DROPPER', y: 'BARRELER', z: 'GHOST', e: 'FISH', r: 'ROBO',
};

// 踏めない敵。ぶきか スターで たおす。
const NO_STOMP = { SPIKY: true, BARREL: true, ROBO: true };

const PICKUP_CHAR = {
  o: 'COIN', g: 'GEM', h: 'LIFE', '*': 'STAR', f: 'FEATHER', M: 'MAGNET',
  1: 'CAKE', 2: 'W_HEART', 3: 'W_ICE', 4: 'W_BOOM', 5: 'W_HAMMER',
};

// --- ステージの 読みこみ -----------------------------------------------
class Area {
  constructor(data, level) {
    this.title = data.title || level.title;
    this.theme = data.theme || level.theme;
    this.grav = data.grav === undefined ? 1 : data.grav;
    this.scroll = data.scroll || 0;
    this.dark = !!data.dark;
    this.height = data.rows.length;
    this.width = Math.max(...data.rows.map((r) => r.length));
    this.tiles = data.rows.map((r) => r.padEnd(this.width, '.').split(''));
    this.base = data.rows.map((r) => r.padEnd(this.width, '.').split(''));

    this.startX = 2; this.startY = this.height - 3;
    this.goalX = -1; this.goalY = 0;
    this.enemySpawns = [];
    this.pickupSpawns = [];
    this.checkpointSpawns = [];
    this.moverSpawns = [];
    this.crumbleSpawns = [];
    this.trapSpawns = [];
    this.bossSpawn = null;

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const c = this.tiles[row][col];
        if (c === '@') { this.startX = col; this.startY = row + 1 - PLAYER_H; }
        else if (c === 'G') { this.goalX = col; this.goalY = row + 1; }
        else if (c === 'C') this.checkpointSpawns.push([col, row + 1]);
        else if (c === 'B') this.bossSpawn = [col, row + 1];
        else if (c === 'm') this.moverSpawns.push([col, row, false]);
        else if (c === 'v') this.moverSpawns.push([col, row, true]);
        else if (c === 'F') this.crumbleSpawns.push([col, row]);
        else if (c === 'T') this.trapSpawns.push([col, row]);
        else if (c === 'E') {
          // 水の中の さかな。しるしを 消したあとは 水に もどす。
          const s2 = ENEMY_SIZE.FISH;
          this.enemySpawns.push(['FISH', col, row + 1 - s2.h]);
        } else if (c === 'Q') {
          this.pickupSpawns.push(['COIN', col, row]);
        } else if (ENEMY_CHAR[c]) {
          const kind = ENEMY_CHAR[c];
          const s = ENEMY_SIZE[kind];
          this.enemySpawns.push([kind, col, row + 1 - s.h]);
        } else if (PICKUP_CHAR[c]) {
          this.pickupSpawns.push([PICKUP_CHAR[c], col, row]);
        }
        // 地形として のこす文字 いがいは 空にする。
        // ★ 水の中に 置いた しるし（E さかな / Q コイン）は、消したあと
        //   水に もどす。ふつうに 消すと そこだけ 水に あなが あき、
        //   およいで いる とちゅうで 急に 落ちて しまう。
        if (c === 'E' || c === 'Q') this.tiles[row][col] = 'W';
        else if ('#=?!XN^FTsH><DOWAI()'.indexOf(c) < 0) this.tiles[row][col] = '.';
        this.base[row][col] = this.tiles[row][col];
      }
    }
  }
}

class Level {
  constructor(data, index) {
    this.index = index;
    this.title = data.title;
    this.theme = data.theme;
    this.boss = data.boss;
    this.hint = data.hint || '';
    this.areas = data.areas.map((a) => new Area(a, data));
    this.warps = data.warps || [];
  }
}

class Enemy {
  constructor(kind, x, y, boss) {
    this.kind = kind;
    this.homeX = x; this.homeY = y;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.alive = true;
    this.squashT = 0;
    this.t = Math.random() * 3;
    this.actionT = 0;
    this.frozenT = 0;
    this.invulnT = 0;
    this.dropped = false;
    this.hp = 1;
    this.minX = -Infinity; this.maxX = Infinity;
    const s = ENEMY_SIZE[kind] || ENEMY_SIZE.WALKER;
    this.w = s.w; this.h = s.h;
    if (kind === 'BOSS') {
      this.boss = boss;
      this.w = boss.w; this.h = boss.h;
      this.hp = boss.hp;
      this.phase = 0;
      this.atkIndex = 0;
      this.atkT = 0;
      this.chargeT = 0;
      this.state = 'MOVE';
    }
    this.maxHp = this.hp;
    if (kind === 'WALKER') this.vx = -2.4;
    else if (kind === 'SPIKY') this.vx = -1.7;
    else if (kind === 'CHASER') this.vx = -2.2;
    else if (kind === 'BARREL') this.vx = -4.6;
  }
  get stompable() { return !NO_STOMP[this.kind]; }
}

// --- のこす記録 ---------------------------------------------------------
const SAVE_KEY = 'rina-adventure2.v1';
const save = { cleared: {}, best: 0, btn: 1, coins: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (o && typeof o === 'object') {
      if (o.cleared && typeof o.cleared === 'object') save.cleared = o.cleared;
      if (Number.isFinite(o.best)) save.best = Math.max(0, Math.floor(o.best));
      if (Number.isFinite(o.btn)) save.btn = o.btn;
      if (Number.isFinite(o.coins)) save.coins = Math.max(0, Math.floor(o.coins));
    }
  } catch (e) { /* こわれていても あそべなくはしない */ }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

const GAME_VER = 1;

// --- ゲーム本体 ---------------------------------------------------------
class Game {
  constructor() {
    this.phase = 'TITLE';
    this.levelIndex = 0;
    this.startIndex = 0;
    this.lives = 6;
    this.score = 0;
    this.coinCount = 0;
    this.stageTime = 0;
    this.totalTime = 0;
    this.elapsed = 0;
    this.phaseT = 0;
    this.endingT = 0;
    this.lastBonus = 0;
    this.combo = 0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.scrollX = 0;
    this.playerViewX = 0.5;
    this.playerViewY = 0.5;
    this.msg = null;
    this.msgT = 0;

    this.jumpK = 1;
    this.player = {
      x: 0, y: 0, vx: 0, vy: 0, onGround: false, faceRight: true,
      size: 0, weapon: null, starT: 0, featherT: 0, magnetT: 0,
      hurtT: 0, animT: 0, airJumps: 0, climbing: false, inWater: false,
      swimT: 0, growT: 0, hammerT: 0, coolT: 0, pipeT: 0, pipeTo: null, pipeLock: false,
    };

    this.enemies = [];
    this.pickups = [];
    this.checkpoints = [];
    this.movers = [];
    this.crumbles = [];
    this.traps = [];
    this.trapAt = new Map();
    this.pops = [];
    this.shots = [];       // りなの たま
    this.bolts = [];       // 敵・ボスの たま
    this.introT = 0;
    this.introBoss = null;
    this.introDone = false;
    this.bossAlive = false;

    this.inputLeft = false;
    this.inputRight = false;
    this.inputUp = false;
    this.inputDown = false;
    this.jumpHeld = false;
    this.jumpQueued = false;
    this.fireQueued = false;

    this.loadLevel(0);
  }

  get level() { return this.lv; }
  get area() { return this.lv.areas[this.areaIndex]; }
  get goalLocked() { return this.bossAlive; }

  pressJump() { this.jumpHeld = true; this.jumpQueued = true; }
  releaseJump() { this.jumpHeld = false; }
  pressFire() { this.fireQueued = true; }

  clearInput() {
    this.inputLeft = this.inputRight = this.inputUp = this.inputDown = false;
    this.jumpHeld = false; this.jumpQueued = false; this.fireQueued = false;
  }

  say(text, secs) { this.msg = text; this.msgT = secs || 2.4; }

  selectStage(i) {
    const n = clamp(i | 0, 0, LEVELS.length - 1);
    this.startIndex = n;
    if (this.phase === 'TITLE') this.loadLevel(n);
  }

  startGame(index) {
    const i = clamp(index | 0, 0, LEVELS.length - 1);
    this.lives = 6;
    this.score = 0;
    this.coinCount = 0;
    this.totalTime = 0;
    this.loadLevel(i);
    this.player.size = 0;
    this.player.weapon = null;
    this.phase = 'PLAYING';
  }

  advance() {
    switch (this.phase) {
      case 'TITLE': this.startGame(this.startIndex); break;
      case 'LEVEL_CLEAR':
        if (this.levelIndex + 1 >= LEVELS.length) { this.endingT = 0; this.phase = 'ENDING'; }
        else { this.loadLevel(this.levelIndex + 1); this.phase = 'PLAYING'; }
        break;
      case 'ENDING': this.phase = 'ALL_CLEAR'; break;
      case 'GAME_OVER':
      case 'ALL_CLEAR':
        this.startIndex = this.levelIndex;
        this.phase = 'TITLE';
        this.loadLevel(this.levelIndex);
        break;
    }
  }

  loadLevel(index) {
    this.levelIndex = clamp(index | 0, 0, LEVELS.length - 1);
    this.lv = new Level(LEVELS[this.levelIndex], this.levelIndex);
    this.stageTime = 0;
    this.spawnArea = 0;
    const a0 = this.lv.areas[0];
    this.spawnX = a0.startX;
    this.spawnY = a0.startY;
    this.checkpoints = [];
    const p = this.player;
    p.starT = 0; p.featherT = 0; p.magnetT = 0; p.hammerT = 0; p.coolT = 0;
    p.pipeT = 0; p.pipeTo = null; p.growT = 0;
    this.enterArea(0, a0.startX, a0.startY, true);
  }

  /** 別の エリア（ちか など）へ 入る。 */
  enterArea(index, px, py, reset) {
    this.areaIndex = clamp(index | 0, 0, this.lv.areas.length - 1);
    const ar = this.area;
    for (let y = 0; y < ar.height; y++) {
      for (let x = 0; x < ar.width; x++) ar.tiles[y][x] = ar.base[y][x];
    }
    this.enemies = [];
    this.bossAlive = false;
    for (const [kind, x, y] of ar.enemySpawns) this.enemies.push(new Enemy(kind, x, y));
    if (ar.bossSpawn && this.lv.boss) {
      const b = this.lv.boss;
      const e = new Enemy('BOSS', ar.bossSpawn[0], ar.bossSpawn[1] - b.h, b);
      this.computeArena(e);
      this.enemies.push(e);
      this.bossAlive = true;
    }
    this.pickups = ar.pickupSpawns.map(([kind, x, y]) => ({ kind, x, y, taken: false, t: 0 }));
    this.movers = ar.moverSpawns.map(([x, y, vertical]) => ({
      homeX: x, homeY: y, vertical,
      x: x - 0.7, y, prevX: x - 0.7, prevY: y, t: 0,
    }));
    this.crumbles = ar.crumbleSpawns.map(([tx, ty]) => ({ tx, ty, state: 0, t: 0 }));
    this.traps = ar.trapSpawns.map(([tx, ty]) => ({ tx, ty, state: 0, t: 0 }));
    this.trapAt = new Map();
    for (const tr of this.traps) this.trapAt.set(tr.ty * ar.width + tr.tx, tr);
    if (reset) this.checkpoints = ar.checkpointSpawns.map(([x, y]) => ({ x, y, active: false }));
    this.shots = [];
    this.bolts = [];
    this.pops = [];
    this.introT = 0;
    this.introBoss = null;
    this.introDone = false;

    const p = this.player;
    p.x = px; p.y = py;
    p.vx = 0; p.vy = 0;
    p.onGround = false; p.climbing = false;
    p.airJumps = 0;
    this.combo = 0;
    this.cameraX = clamp(px - 8, 0, Math.max(ar.width - 10, 0));
    // オートスクロールの 面で 死んだら、やりなおす ばしょから 画面も 動かす
    this.scrollX = this.cameraX;
    this.cameraY = 0;
    this.clearInput();
  }

  respawn() {
    const p = this.player;
    p.hurtT = SPAWN_GRACE;
    p.size = 0;
    p.weapon = null;
    p.starT = 0; p.featherT = 0; p.magnetT = 0; p.hammerT = 0;
    p.faceRight = true;
    this.enterArea(this.spawnArea, this.spawnX, this.spawnY, false);
  }

  // --- タイル ------------------------------------------------------------
  tileAt(tx, ty) {
    const ar = this.area;
    if (tx < 0 || tx >= ar.width) return '#';
    if (ty < 0) return '.';
    if (ty >= ar.height) return '.';
    return ar.tiles[ty][tx];
  }
  setTile(tx, ty, c) {
    const ar = this.area;
    if (tx < 0 || tx >= ar.width || ty < 0 || ty >= ar.height) return;
    ar.tiles[ty][tx] = c;
  }
  solidAt(tx, ty) { return isSolid(this.tileAt(tx, ty)); }
  waterAt(x, y) { return this.tileAt(Math.floor(x), Math.floor(y)) === 'W'; }
  ladderAt(x, y) { return this.tileAt(Math.floor(x), Math.floor(y)) === 'H'; }
  trapUp(tx, ty) {
    const tr = this.trapAt.get(ty * this.area.width + tx);
    return !!tr && tr.state === 2;
  }
  crumbleAt(tx, ty) { return this.crumbles.find((c) => c.tx === tx && c.ty === ty); }

  // --- ループ ------------------------------------------------------------
  update(dt, viewTilesX) {
    this.elapsed += dt;
    this.viewTilesX = viewTilesX;
    for (const pop of this.pops) pop.t += dt;
    this.pops = this.pops.filter((pop) => pop.t <= 0.9);
    for (const pk of this.pickups) pk.t += dt;
    if (this.msgT > 0) this.msgT -= dt;

    if (this.phase === 'PLAYING') {
      this.stageTime += dt;
      if (this.introT > 0) {
        this.introT -= dt;
        this.player.animT += dt;
        for (const e of this.enemies) e.t += dt;
        this.updateCamera(viewTilesX, dt);
        this.jumpQueued = false; this.fireQueued = false;
        return;
      }
      if (this.player.pipeT > 0) {
        this.player.pipeT -= dt;
        this.player.animT += dt;
        if (this.player.pipeT <= 0) this.finishPipe();
        this.updateCamera(viewTilesX, dt);
        this.jumpQueued = false; this.fireQueued = false;
        return;
      }
      this.updateMovers(dt);
      this.updateTraps(dt);
      this.updateItems(dt);
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateShots(dt);
      this.updateBolts(dt);
      this.checkBossIntro();
      this.collide();
      this.updateCamera(viewTilesX, dt);
    } else if (this.phase === 'DYING') {
      this.phaseT += dt;
      this.player.animT += dt;
      this.player.vy = Math.min(this.player.vy + GRAVITY * dt, MAX_FALL);
      this.player.y += this.player.vy * dt;
      if (this.phaseT > 1.5) {
        if (this.lives <= 0) this.phase = 'GAME_OVER';
        else { this.respawn(); this.phase = 'PLAYING'; }
      }
    } else if (this.phase === 'ENDING') {
      this.endingT += dt;
      this.player.animT += dt;
    } else {
      this.player.animT += dt;
      this.updateMovers(dt);
      for (const e of this.enemies) e.t += dt;
    }
    this.jumpQueued = false;
    this.fireQueued = false;
  }

  updateMovers(dt) {
    for (const m of this.movers) {
      m.prevX = m.x; m.prevY = m.y;
      m.t += dt;
      const off = Math.sin(m.t * 0.9);
      if (m.vertical) m.y = m.homeY + off * 2.2;
      else m.x = m.homeX - 0.7 + off * 3.2;
    }
  }

  updateTraps(dt) {
    const p = this.player;
    for (const c of this.crumbles) {
      c.t += dt;
      if (c.state === 0) {
        const standing = p.onGround &&
          p.y + PLAYER_H > c.ty - 0.3 && p.y + PLAYER_H < c.ty + 0.4 &&
          p.x + PLAYER_W > c.tx && p.x < c.tx + 1;
        if (standing) { c.state = 1; c.t = 0; }
      } else if (c.state === 1) {
        if (c.t > CRUMBLE_WARN) { c.state = 2; c.t = 0; this.setTile(c.tx, c.ty, '.'); }
      } else if (c.t > CRUMBLE_BACK) {
        const overlap = p.x + PLAYER_W > c.tx && p.x < c.tx + 1 &&
          p.y + PLAYER_H > c.ty && p.y < c.ty + 1;
        if (!overlap) { c.state = 0; c.t = 0; this.setTile(c.tx, c.ty, 'F'); }
      }
    }
    for (const tr of this.traps) {
      tr.t += dt;
      if (tr.state === 0) {
        const near = Math.abs(p.x + PLAYER_W / 2 - (tr.tx + 0.5)) < TRAP_SENSE &&
          Math.abs(p.y - tr.ty) < 3;
        if (near) { tr.state = 1; tr.t = 0; }
      } else if (tr.state === 1) {
        if (tr.t > TRAP_WARN) { tr.state = 2; tr.t = 0; }
      } else if (tr.t > TRAP_UP) { tr.state = 0; tr.t = 0; }
    }
  }

  // --- りな --------------------------------------------------------------
  updatePlayer(dt) {
    const p = this.player;
    const ar = this.area;
    p.animT += dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.starT > 0) p.starT -= dt;
    if (p.featherT > 0) p.featherT -= dt;
    if (p.magnetT > 0) p.magnetT -= dt;
    if (p.coolT > 0) p.coolT -= dt;
    if (p.hammerT > 0) p.hammerT -= dt;
    if (p.growT > 0) {
      p.growT -= dt;
      p.vx = 0;
      p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
      this.moveY(dt);
      return;
    }

    p.inWater = this.waterAt(p.x + PLAYER_W / 2, p.y + PLAYER_H * 0.6);
    const grav = GRAVITY * ar.grav;
    // ★ 重力の 軽い 面（宇宙など）で ジャンプの 力を そのままに すると、
    //   高さ 7タイル・よこ 13タイルも とんで しまい、画面の 外に 出るし
    //   とんでいる あいだ 何も できずに 穴に 落ちる。
    //   √重力 を かけると 高さは いつもと 同じ まま、ふわっと 長く とべる。
    this.jumpK = Math.sqrt(ar.grav);
    const dir = (this.inputRight ? 1 : 0) - (this.inputLeft ? 1 : 0);
    if (dir > 0) p.faceRight = true;
    if (dir < 0) p.faceRight = false;

    // はしご
    const onLadderTile = this.ladderAt(p.x + PLAYER_W / 2, p.y + PLAYER_H * 0.5) ||
      this.ladderAt(p.x + PLAYER_W / 2, p.y + PLAYER_H * 0.95);
    if (onLadderTile && (this.inputUp || this.inputDown)) p.climbing = true;
    if (!onLadderTile) p.climbing = false;

    if (p.climbing) {
      p.vx = dir * MOVE_SPEED * 0.55;
      p.vy = ((this.inputDown ? 1 : 0) - (this.inputUp ? 1 : 0)) * CLIMB_SPEED;
      if (this.jumpQueued) { p.climbing = false; p.vy = JUMP_V * 0.82 * Math.sqrt(this.area.grav); }
      this.moveX(dt);
      this.moveYClimb(dt);
      if (p.climbing) { p.onGround = false; p.airJumps = 0; }
      this.afterMove(dt);
      return;
    }

    // どかんに 入る。
    // ★ 出た さきにも どかんが あるので、▼を おしっぱなしに して いると
    //   行ったり きたり を くりかえして しまう。一度 はなすまで 入らない。
    if (!this.inputDown) p.pipeLock = false;
    if (this.inputDown && p.onGround && !p.pipeLock) this.tryPipe();

    if (p.inWater) {
      p.vx = dir * SWIM_SPEED;
      if (this.jumpQueued) { p.vy = SWIM_STROKE; p.swimT = 0.35; }
      p.vy = Math.min(p.vy + SWIM_GRAV * dt, SWIM_MAX_FALL);
      if (p.swimT > 0) p.swimT -= dt;
    } else {
      // こおりの ゆかの 上では すぐに 止まれない（すべる）
      const iceRow = Math.floor(p.y + PLAYER_H + 0.05);
      const onIce = p.onGround &&
        this.tileAt(Math.floor(p.x + PLAYER_W / 2), iceRow) === 'I';
      const want = dir * MOVE_SPEED;
      if (onIce) p.vx += clamp(want - p.vx, -ICE_ACC * dt, ICE_ACC * dt);
      else p.vx = want;
      if (this.jumpQueued) {
        if (p.onGround) { p.vy = JUMP_V * this.jumpK; p.onGround = false; }
        else if (p.featherT > 0 && p.airJumps < 1) {
          p.vy = AIR_JUMP_V * this.jumpK; p.airJumps += 1;
          this.pops.push({ x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H, kind: 'FEATHER', t: 0 });
        }
      }
      if (!this.jumpHeld && p.vy < JUMP_CUT * this.jumpK) p.vy = JUMP_CUT * this.jumpK;
      p.vy = Math.min(p.vy + grav * dt, MAX_FALL);
    }

    this.zones(dt);
    this.moveX(dt);
    this.moveY(dt);
    this.rideMovers();
    this.conveyor(dt);
    this.afterMove(dt);
  }

  /** かぜと ふきあげ。中に いる あいだ ずっと きいている。 */
  zones(dt) {
    const p = this.player;
    const cx = Math.floor(p.x + PLAYER_W / 2);
    const my = Math.floor(p.y + PLAYER_H * 0.5);
    const c = this.tileAt(cx, my);
    if (c === 'A') {
      p.vy = Math.max(p.vy - UPDRAFT * dt, -UPDRAFT_MAX);
      p.airJumps = 0;
    } else if (c === '(') p.vx -= WIND_PUSH;
    else if (c === ')') p.vx += WIND_PUSH;
  }

  afterMove(dt) {
    const p = this.player;
    const ar = this.area;
    if (p.onGround) { p.airJumps = 0; this.combo = 0; }
    if (this.fireQueued) this.fire();
    // オートスクロールの 左はしから 出られない
    if (ar.scroll > 0) {
      const leftLimit = this.scrollX + 0.2;
      if (p.x < leftLimit) { p.x = leftLimit; if (p.vx < 0) p.vx = 0; }
    }
    if (p.y > ar.height + 2) { this.die(); }
  }

  /** ★ うすい あしば（= と F）は「下からは すりぬけ、上からは 乗る」。
   *  かたい かべに して いたので、あなの 上に ある あしばに 頭を ぶつけて
   *  そのまま あなへ 落ちて しまう ことが あった。 */
  oneWay(c) { return c === '=' || c === 'F'; }

  moveX(dt) {
    const p = this.player;
    p.x += p.vx * dt;
    const y0 = Math.floor(p.y + 0.05);
    const y1 = Math.floor(p.y + PLAYER_H - 0.05);
    if (p.vx > 0) {
      const tx = Math.floor(p.x + PLAYER_W);
      for (let ty = y0; ty <= y1; ty++) {
        const c = this.tileAt(tx, ty);
        if (isSolid(c) && !this.oneWay(c)) { p.x = tx - PLAYER_W; p.vx = 0; break; }
      }
    } else if (p.vx < 0) {
      const tx = Math.floor(p.x);
      for (let ty = y0; ty <= y1; ty++) {
        const c = this.tileAt(tx, ty);
        if (isSolid(c) && !this.oneWay(c)) { p.x = tx + 1; p.vx = 0; break; }
      }
    }
    p.x = clamp(p.x, 0, this.area.width - PLAYER_W);
  }

  moveY(dt) {
    const p = this.player;
    p.y += p.vy * dt;
    p.onGround = false;
    const x0 = Math.floor(p.x + 0.08);
    const x1 = Math.floor(p.x + PLAYER_W - 0.08);
    if (p.vy > 0) {
      const ty = Math.floor(p.y + PLAYER_H);
      const prevFeet = p.y + PLAYER_H - p.vy * dt;
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileAt(tx, ty);
        if (!isSolid(c)) continue;
        // うすい あしばは、まえの フレームで 上に いた ときだけ 乗る
        if (this.oneWay(c) && prevFeet > ty + 0.06) continue;
        p.y = ty - PLAYER_H;
        if (c === '^') {
          p.vy = SPRING_V * (this.jumpK || 1); p.airJumps = 0;
          this.pops.push({ x: tx + 0.5, y: ty, text: 'ぽよん', t: 0 });
          sfxSpring();
        } else { p.vy = 0; p.onGround = true; }
        break;
      }
      // こおった敵の上には 乗れる
      if (!p.onGround) this.rideFrozen();
    } else if (p.vy < 0) {
      const ty = Math.floor(p.y);
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileAt(tx, ty);
        if (!isSolid(c) || this.oneWay(c)) continue;   // うすい あしばは すりぬける
        p.y = ty + 1; p.vy = 0;
        this.headBump(tx, ty, c);
        break;
      }
    }
  }

  /** はしご中の たて移動。はしごの 上下は 突きぬけない。 */
  moveYClimb(dt) {
    const p = this.player;
    const ny = p.y + p.vy * dt;
    const x0 = Math.floor(p.x + 0.08);
    const x1 = Math.floor(p.x + PLAYER_W - 0.08);
    if (p.vy > 0) {
      const ty = Math.floor(ny + PLAYER_H);
      for (let tx = x0; tx <= x1; tx++) {
        if (this.solidAt(tx, ty)) {
          p.y = ty - PLAYER_H; p.vy = 0; p.onGround = true; p.climbing = false;
          return;
        }
      }
    } else if (p.vy < 0) {
      const ty = Math.floor(ny);
      for (let tx = x0; tx <= x1; tx++) {
        if (this.solidAt(tx, ty)) { p.y = ty + 1; p.vy = 0; return; }
      }
    }
    p.y = ny;
  }

  /** ？ブロック・レンガを 下から たたく。 */
  headBump(tx, ty, c) {
    if (c === '?') {
      this.setTile(tx, ty, 'X');
      this.coinCount += 1; this.score += 100;
      this.pops.push({ x: tx + 0.5, y: ty, kind: 'COIN', t: 0 });
      sfxCoin();
    } else if (c === '!') {
      this.setTile(tx, ty, 'X');
      this.spawnBlockItem(tx, ty);
    } else if (c === 'N') {
      if (this.player.size > 0 || this.player.starT > 0) {
        this.setTile(tx, ty, '.');
        this.score += 50;
        this.pops.push({ x: tx + 0.5, y: ty, text: 'ガシャン', t: 0 });
        sfxBreak();
      } else {
        this.pops.push({ x: tx + 0.5, y: ty, text: 'かたい！', t: 0 });
        sfxBump();
      }
    } else {
      sfxBump();
    }
  }

  /** ブロックから アイテムが 出る。
   *  ★ 出たまま ブロックの 上に うかんで いると、そのブロックが じゃまで
   *    とどかない。マリオの キノコと 同じで、ぽんと 出て 地面に 落ちてくる
   *    ように する。 */
  spawnBlockItem(tx, ty) {
    const kind = this.player.size === 0 ? 'CAKE' : 'W_' + this.lv.boss.weapon;
    this.pickups.push({
      kind, x: tx, y: ty - 1, taken: false, t: 0, walk: true,
      vx: this.player.faceRight ? 2.2 : -2.2, vy: -5.5, grounded: false,
    });
    this.pops.push({ x: tx + 0.5, y: ty, text: 'でた！', t: 0 });
    sfxItem();
  }

  /** ブロックから 出た アイテムは マリオの キノコと 同じで、
   *  ブロックの 上から 歩いて おりて きて、地面の 上を 行ったり きたり する。
   *  （出た ところに うかんで いると、その ブロックが じゃまで とどかない） */
  updateItems(dt) {
    for (const pk of this.pickups) {
      if (!pk.walk) continue;
      pk.vy = Math.min(pk.vy + GRAVITY * 0.72 * dt, 18);
      pk.y += pk.vy * dt;
      pk.grounded = false;
      if (pk.vy > 0) {
        const by = Math.floor(pk.y + 0.95);
        if (this.solidAt(Math.floor(pk.x + 0.15), by) || this.solidAt(Math.floor(pk.x + 0.85), by)) {
          pk.y = by - 0.95; pk.vy = 0; pk.grounded = true;
        }
      }
      const nx = pk.x + pk.vx * dt;
      const side = pk.vx > 0 ? Math.floor(nx + 0.9) : Math.floor(nx);
      if (this.solidAt(side, Math.floor(pk.y + 0.5))) { pk.vx = -pk.vx; continue; }
      if (pk.grounded) {
        const floorRow = Math.floor(pk.y + 0.95);
        const under = this.tileAt(side, floorRow);
        // じめん や あしばの はじでは 引きかえす。ブロックの 上からは おりる。
        if ((under === '#' || under === '=') === false && (under === '.' || under === 'W')) {
          const nowUnder = this.tileAt(Math.floor(pk.x + 0.5), floorRow);
          if (nowUnder === '#' || nowUnder === '=') { pk.vx = -pk.vx; continue; }
        }
      }
      pk.x = nx;
      if (pk.y > this.area.height + 2 || pk.x < -1 || pk.x > this.area.width + 1) pk.taken = true;
    }
  }

  rideMovers() {
    const p = this.player;
    if (p.vy < -0.5) return;
    const feet = p.y + PLAYER_H;
    for (const m of this.movers) {
      if (p.x + PLAYER_W <= m.x || p.x >= m.x + 2.4) continue;
      if (feet < m.y - 0.35 || feet > m.y + 0.75) continue;
      p.y = m.y - PLAYER_H;
      p.vy = 0; p.onGround = true;
      p.x += m.x - m.prevX;
      p.y += m.y - m.prevY;
      break;
    }
  }

  rideFrozen() {
    const p = this.player;
    const feet = p.y + PLAYER_H;
    for (const e of this.enemies) {
      if (!e.alive || e.frozenT <= 0) continue;
      if (p.x + PLAYER_W <= e.x || p.x >= e.x + e.w) continue;
      if (feet < e.y - 0.35 || feet > e.y + 0.6) continue;
      p.y = e.y - PLAYER_H;
      p.vy = 0; p.onGround = true;
      break;
    }
  }

  /** ベルトコンベア。上に 乗ると 流される。 */
  conveyor(dt) {
    const p = this.player;
    if (!p.onGround) return;
    const ty = Math.floor(p.y + PLAYER_H + 0.05);
    const tx = Math.floor(p.x + PLAYER_W / 2);
    const c = this.tileAt(tx, ty);
    if (c === '>') p.x += CONVEY_SPEED * dt;
    else if (c === '<') p.x -= CONVEY_SPEED * dt;
    else return;
    p.x = clamp(p.x, 0, this.area.width - PLAYER_W);
    // 押しこまれて 壁に めりこまないように 戻す
    const y0 = Math.floor(p.y + 0.05);
    const y1 = Math.floor(p.y + PLAYER_H - 0.05);
    for (let yy = y0; yy <= y1; yy++) {
      if (this.solidAt(Math.floor(p.x + PLAYER_W), yy)) p.x = Math.floor(p.x + PLAYER_W) - PLAYER_W;
      if (this.solidAt(Math.floor(p.x), yy)) p.x = Math.floor(p.x) + 1;
    }
  }

  // --- どかん ------------------------------------------------------------
  /** ★ 足の 左・まん中・右の どれかが どかんの 口に かかって いれば 入れる。
   *    まん中だけを 見て いたので、口の はしに 立って いると 入れなかった。 */
  tryPipe() {
    const p = this.player;
    const ty = Math.floor(p.y + PLAYER_H + 0.1);
    const cols = [Math.floor(p.x + PLAYER_W / 2), Math.floor(p.x + 0.12),
      Math.floor(p.x + PLAYER_W - 0.12)];
    let w = null, tx = -1;
    for (const c of cols) {
      if (this.tileAt(c, ty) !== 'O') continue;
      const hit = this.lv.warps.find((k) => k.a === this.areaIndex &&
        Math.abs(k.x - c) <= 1 && k.y === ty);
      if (hit) { w = hit; tx = c; break; }
    }
    if (!w) return;
    p.pipeT = PIPE_TIME;
    p.pipeTo = w.to;
    p.pipeX = tx;
    p.pipeY = ty;
    this.clearInput();
    sfxPipe();
  }

  finishPipe() {
    const p = this.player;
    const to = p.pipeTo;
    p.pipeTo = null;
    if (!to) return;
    const target = this.lv.areas[to.a];
    const px = to.x + 0.5 - PLAYER_W / 2;
    const py = to.y - PLAYER_H - 0.02;
    if (to.a !== this.areaIndex) this.enterArea(to.a, px, py, false);
    else { p.x = px; p.y = py; p.vx = 0; p.vy = 0; }
    p.pipeLock = true;
    if (target && target.title) this.say(target.title, 2.0);
  }

  // --- こうげき ----------------------------------------------------------
  fire() {
    const p = this.player;
    if (!p.weapon || p.coolT > 0) return;
    const cx = p.x + PLAYER_W / 2;
    const cy = p.y + PLAYER_H * 0.45;
    const d = p.faceRight ? 1 : -1;
    if (p.weapon === 'HAMMER') {
      p.hammerT = HAMMER_SWING;
      p.coolT = HAMMER_SWING + HAMMER_COOL;
      sfxHammer();
      return;
    }
    if (p.weapon === 'BOOM') {
      if (this.shots.some((s) => s.kind === 'BOOM')) return;
      this.shots.push({ kind: 'BOOM', x: cx, y: cy, vx: d * 15, vy: 0, t: 0, hit: [], dead: false, home: cx });
      p.coolT = 0.25;
      sfxThrow();
      return;
    }
    if (this.shots.length >= SHOT_MAX) return;
    if (p.weapon === 'HEART') {
      this.shots.push({ kind: 'HEART', x: cx, y: cy, vx: d * 14, vy: -3.5, t: 0, dead: false });
    } else {
      this.shots.push({ kind: 'ICE', x: cx, y: cy, vx: d * 16, vy: -1.2, t: 0, dead: false });
    }
    p.coolT = 0.3;
    sfxShoot();
  }

  updateShots(dt) {
    for (const s of this.shots) {
      s.t += dt;
      if (s.kind === 'BOOM') {
        // 行って もどる。もどってきたら 消える。
        const d = sign(s.vx || 1);
        s.x += s.vx * dt;
        s.vx -= d * 26 * dt;
        if (Math.abs(s.x - s.home) > BOOM_RANGE) s.vx -= d * 20 * dt;
        s.y += Math.sin(s.t * 9) * 0.6 * dt;
        if (s.t > 1.7) s.dead = true;
      } else {
        s.vy = Math.min(s.vy + GRAVITY * 0.42 * dt, 17);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const bx = Math.floor(s.x + sign(s.vx) * 0.16);
        if (this.solidAt(bx, Math.floor(s.y))) s.dead = true;
        const by = Math.floor(s.y + 0.18);
        if (this.solidAt(Math.floor(s.x), by) && s.vy > 0) {
          if (s.kind === 'HEART') { s.y = by - 0.18; s.vy = -10.5; }
          else s.dead = true;
        }
        if (s.t > SHOT_LIFE) s.dead = true;
      }
      if (s.x < this.cameraX - 6 || s.x > this.cameraX + (this.viewTilesX || 24) + 10) s.dead = true;
      if (s.y > this.area.height + 1) s.dead = true;
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  updateBolts(dt) {
    const ar = this.area;
    for (const b of this.bolts) {
      b.t += dt;
      if (b.grav) b.vy = Math.min(b.vy + GRAVITY * b.grav * dt, 20);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.wave) b.y += Math.sin(b.t * 6) * 1.6 * dt;
      if (b.ground) {
        // 地面を はしる しょうげき波
        const ty = Math.floor(b.y + 0.3);
        if (!this.solidAt(Math.floor(b.x), ty + 1)) b.dead = true;
      }
      if (b.solidStop && this.solidAt(Math.floor(b.x), Math.floor(b.y))) b.dead = true;
      if (b.t > (b.life || 5)) b.dead = true;
      if (b.x < -2 || b.x > ar.width + 2 || b.y > ar.height + 2 || b.y < -6) b.dead = true;
    }
    this.bolts = this.bolts.filter((b) => !b.dead);
  }

  // --- 敵 ----------------------------------------------------------------
  updateEnemies(dt) {
    const p = this.player;
    const view = this.viewTilesX || 24;
    for (const e of this.enemies) {
      if (!e.alive) { e.squashT += dt; continue; }
      e.t += dt;
      if (e.invulnT > 0) e.invulnT -= dt;
      if (e.frozenT > 0) {
        e.frozenT -= dt;
        e.vx = 0;
        if (e.kind !== 'FLYER' && e.kind !== 'GHOST' && e.kind !== 'FISH') {
          e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
          this.walkCollide(e, dt, false);
        }
        continue;
      }
      const far = e.x < this.cameraX - 8 || e.x > this.cameraX + view + 10;
      if (e.kind !== 'BOSS' && far) continue;
      switch (e.kind) {
        case 'WALKER': case 'SPIKY':
          e.x += e.vx * dt; this.walkCollide(e, dt, true); break;
        case 'CHASER': {
          const dx = p.x - e.x;
          if (Math.abs(dx) < 9 && Math.abs(p.y - e.y) < 3.2) e.vx = sign(dx) * 3.6;
          else if (Math.abs(e.vx) > 2.3) e.vx = sign(e.vx) * 2.2;
          e.x += e.vx * dt; this.walkCollide(e, dt, true); break;
        }
        case 'FLYER':
          e.x = e.homeX + Math.sin(e.t * 1.1) * 3.4;
          e.y = e.homeY + Math.sin(e.t * 2.3) * 1.2;
          e.vx = Math.cos(e.t * 1.1) >= 0 ? 1 : -1;
          break;
        case 'JUMPER':
          e.actionT += dt;
          if (e.actionT > 1.6 && e.vy === 0) { e.vy = -14.5; e.actionT = 0; }
          e.x += e.vx * 0.4 * dt;
          this.walkCollide(e, dt, true);
          break;
        case 'HOPPER':
          e.actionT += dt;
          if (e.vy === 0 && e.actionT > 1.25) {
            const dx = p.x - e.x;
            e.vx = Math.abs(dx) < 10 ? sign(dx) * 2.8 : (e.vx >= 0 ? -2.4 : 2.4);
            e.vy = -12.5; e.actionT = 0;
          }
          e.x += e.vx * dt;
          this.walkCollide(e, dt, false);
          if (e.vy === 0) e.vx = 0;
          break;
        case 'DROPPER':
          if (!e.dropped) {
            const dx = Math.abs((p.x + PLAYER_W / 2) - (e.x + e.w / 2));
            if (dx < DROP_SENSE && p.y + PLAYER_H > e.y) e.dropped = true;
          } else {
            e.x += e.vx * dt;
            this.walkCollide(e, dt, true);
            if (e.vy === 0 && e.vx === 0) e.vx = -2.4;
          }
          break;
        case 'GHOST': {
          // 目を あわせると 止まる（見ていない ときだけ 追ってくる）
          const dx = (p.x + PLAYER_W / 2) - (e.x + e.w / 2);
          const looking = (p.faceRight && dx < 0) || (!p.faceRight && dx > 0);
          e.shy = looking;
          if (!looking) {
            const dy = (p.y + PLAYER_H / 2) - (e.y + e.h / 2);
            const d = Math.hypot(dx, dy) || 1;
            e.x += (dx / d) * 2.5 * dt;
            e.y += (dy / d) * 2.5 * dt;
          }
          e.vx = dx > 0 ? 1 : -1;
          break;
        }
        case 'FISH':
          e.x = e.homeX + Math.sin(e.t * 0.85) * 4.2;
          e.y = e.homeY + Math.sin(e.t * 1.7) * 1.1;
          e.vx = Math.cos(e.t * 0.85) >= 0 ? 1 : -1;
          break;
        case 'ROBO':
          e.actionT += dt;
          e.vx = (p.x < e.x) ? -1 : 1;
          if (e.actionT > 2.1) {
            e.actionT = 0;
            if (Math.abs(p.x - e.x) < 15) {
              this.bolts.push({
                x: e.x + e.w / 2, y: e.y + e.h * 0.35, vx: sign(e.vx) * 7.5, vy: 0,
                r: 0.26, t: 0, life: 4, solidStop: true, col: '#FF7A3A', dead: false,
              });
              sfxEnemyShot();
            }
          }
          break;
        case 'BARRELER':
          // ドンキーコングの たる。ころがして よこしてくる。
          e.actionT += dt;
          e.vx = (p.x < e.x) ? -1 : 1;
          if (e.actionT > 2.4) {
            e.actionT = 0;
            const b = new Enemy('BARREL', e.x + (e.vx > 0 ? e.w : -0.9), e.y + e.h - 0.9);
            b.vx = sign(e.vx) * 4.6;
            this.enemies.push(b);
            sfxBarrel();
          }
          break;
        case 'BARREL':
          e.x += e.vx * dt;
          this.walkCollide(e, dt, false);
          if (e.x < -2 || e.x > this.area.width + 2) e.alive = false;
          break;
        case 'MINION':
          e.x += e.vx * dt;
          this.walkCollide(e, dt, true);
          break;
        case 'BOSS':
          this.updateBoss(e, dt);
          break;
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.squashT <= 0.75);
  }

  walkCollide(e, dt, turnAtLedge) {
    const ty0 = Math.floor(e.y + 0.05);
    const ty1 = Math.floor(e.y + e.h - 0.05);
    const aheadX = e.vx > 0 ? Math.floor(e.x + e.w) : Math.floor(e.x);
    let turn = false;
    for (let ty = ty0; ty <= ty1; ty++) if (this.solidAt(aheadX, ty)) turn = true;
    if (turnAtLedge && e.vy === 0) {
      const footY = Math.floor(e.y + e.h + 0.2);
      if (!this.solidAt(aheadX, footY)) turn = true;
    }
    if (turn) { e.vx = -e.vx; e.x += e.vx * dt; }
    e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
    e.y += e.vy * dt;
    const tx0 = Math.floor(e.x + 0.06);
    const tx1 = Math.floor(e.x + e.w - 0.06);
    if (e.vy > 0) {
      const ty = Math.floor(e.y + e.h);
      for (let tx = tx0; tx <= tx1; tx++) {
        if (this.solidAt(tx, ty)) { e.y = ty - e.h; e.vy = 0; break; }
      }
    }
  }

  computeArena(e) {
    const footRow = Math.floor(e.homeY + e.h + 0.2);
    let left = Math.floor(e.homeX);
    while (left - 1 >= 0 && this.solidAt(left - 1, footRow)) left -= 1;
    let right = Math.floor(e.homeX + e.w);
    while (right + 1 < this.area.width && this.solidAt(right + 1, footRow)) right += 1;
    e.minX = left;
    e.maxX = Math.max(right + 1 - e.w, left);
    e.floorY = footRow;
  }

  checkBossIntro() {
    if (this.introDone) return;
    const boss = this.enemies.find((e) => e.kind === 'BOSS' && e.alive);
    if (!boss) return;
    if (Math.abs(this.player.x - boss.x) > BOSS_INTRO_RANGE) return;
    this.introDone = true;
    this.introT = BOSS_INTRO_TIME;
    this.introBoss = boss;
    this.clearInput();
    bgmBoss();
  }

  // --- ボス --------------------------------------------------------------
  // どのボスも「うごく」＋「こうげきを 順ぐりに 出す」でできている。
  // こうげきの 中身は データ（levels.js の boss.attacks）で 決まる。
  updateBoss(e, dt) {
    const b = e.boss;
    const p = this.player;
    // ★ 登場の えんしゅつが 出るまでは 動かないし こうげきも しない。
    //   でないと、まだ 広場に 入って いないのに 画面の 外から たまが
    //   とんできて、わけも わからず やられて しまう。
    if (!this.introDone) {
      if (b.move !== 'FLY') this.walkCollide(e, dt, false);
      return;
    }
    e.actionT += dt;
    e.atkT += dt;
    const hurtRate = 1 + (1 - e.hp / e.maxHp) * 0.7;   // 減ると 少し 速くなる
    const dx = (p.x + PLAYER_W / 2) - (e.x + e.w / 2);

    // うごきかた
    if (e.state === 'CHARGE') {
      e.chargeT -= dt;
      if (e.chargeT <= 0) { this.bossFire(e); e.state = 'MOVE'; e.atkT = 0; }
      if (b.move === 'GROUND') this.walkCollide(e, dt, false);
      return;
    }
    if (e.state === 'DASH') {
      e.x += e.dashV * dt;
      if (b.move !== 'FLY') this.walkCollide(e, dt, false);
      if (e.x <= e.minX || e.x >= e.maxX || e.actionT > 1.6) {
        e.x = clamp(e.x, e.minX, e.maxX);
        e.state = 'MOVE'; e.atkT = 0;
      }
      return;
    }
    if (e.state === 'SLAM') {
      if (b.move !== 'FLY') this.walkCollide(e, dt, false);
      else { e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL); e.y += e.vy * dt; }
      if (e.y + e.h >= e.floorY - 0.02 || e.vy === 0) {
        e.y = e.floorY - e.h;
        e.vy = 0;
        e.state = 'MOVE'; e.atkT = 0;
        this.shockwave(e);
      }
      return;
    }

    if (b.move === 'FLY') {
      e.y = e.homeY + Math.sin(e.t * 1.15) * 1.5;
      e.x += sign(dx) * b.speed * hurtRate * dt;
      e.x = clamp(e.x, e.minX, e.maxX);
      e.vx = sign(dx);
    } else if (b.move === 'HOP') {
      if (e.vy === 0 && e.actionT > 1.5) { e.vy = -14; e.vx = sign(dx) * b.speed * hurtRate; e.actionT = 0; }
      e.x += e.vx * dt;
      this.walkCollide(e, dt, false);
      e.x = clamp(e.x, e.minX, e.maxX);
      if (e.vy === 0) e.vx = 0;
    } else if (b.move === 'PACE') {
      if (e.vx === 0) e.vx = -b.speed;
      e.x += e.vx * dt;
      this.walkCollide(e, dt, false);
      if (e.x <= e.minX || e.x >= e.maxX) e.vx = -e.vx;
      e.x = clamp(e.x, e.minX, e.maxX);
    } else {
      // GROUND: ゆっくり 近づいてくる
      e.vx = sign(dx) * b.speed * hurtRate;
      e.x += e.vx * dt;
      this.walkCollide(e, dt, false);
      e.x = clamp(e.x, e.minX, e.maxX);
    }

    // はなれすぎて いる ときは こうげきしない（画面の 外からの 不意うちを 防ぐ）
    if (e.atkT > b.gap / hurtRate && Math.abs(dx) < 17) {
      const atk = b.attacks[e.atkIndex % b.attacks.length];
      e.atkIndex += 1;
      e.pending = atk;
      if (atk === 'DASH') {
        e.state = 'DASH'; e.actionT = 0;
        e.dashV = sign(dx || 1) * (b.speed * 3.4);
        sfxBossRoar();
      } else if (atk === 'SLAM') {
        e.state = 'SLAM'; e.vy = -15.5; e.actionT = 0;
        sfxBossRoar();
      } else {
        e.state = 'CHARGE'; e.chargeT = 0.55;
      }
    }
  }

  shockwave(e) {
    sfxSlam();
    for (const d of [-1, 1]) {
      this.bolts.push({
        x: e.x + e.w / 2, y: e.floorY - 0.45, vx: d * 8.5, vy: 0,
        r: 0.42, t: 0, life: 3, ground: true, wave2: true,
        col: e.boss.col2 || '#FFD24A', dead: false,
      });
    }
  }

  bossFire(e) {
    const b = e.boss;
    const p = this.player;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h * 0.42;
    const dx = (p.x + PLAYER_W / 2) - cx;
    const d = sign(dx) || 1;
    const col = b.col2 || '#FF7A3A';
    const atk = e.pending;
    if (atk === 'ARC') {
      for (let i = 0; i < (b.hard ? 2 : 1); i++) {
        this.bolts.push({
          x: cx, y: cy, vx: d * (7 + i * 2.4), vy: -9.5, grav: 0.6,
          r: 0.34, t: 0, life: 5, col, dead: false,
        });
      }
      sfxThrow();
    } else if (atk === 'SPREAD') {
      for (const a of [-0.34, 0, 0.34]) {
        this.bolts.push({
          x: cx, y: cy, vx: d * 8 * Math.cos(a), vy: 8 * Math.sin(a),
          r: 0.28, t: 0, life: 4, col, dead: false,
        });
      }
      sfxEnemyShot();
    } else if (atk === 'RING') {
      const n = b.hard ? 10 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.bolts.push({
          x: cx, y: cy, vx: Math.cos(a) * 6.4, vy: Math.sin(a) * 6.4,
          r: 0.26, t: 0, life: 3.2, col, dead: false,
        });
      }
      sfxRing();
    } else if (atk === 'RAIN') {
      // 上から ふってくる。見てから よけられる はやさに する。
      const n = b.hard ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const x = clamp(p.x - 4 + i * 2.4 + Math.random() * 1.4, e.minX - 2, e.maxX + 4);
        this.bolts.push({
          x, y: this.cameraY - 0.5, vx: 0, vy: 5, grav: 0.28,
          r: 0.3, t: 0, life: 5, col, dead: false, rain: true,
        });
      }
      sfxRain();
    } else if (atk === 'BEAM') {
      this.bolts.push({
        x: cx + d * e.w * 0.55, y: cy, vx: d * 13.5, vy: 0,
        r: 0.45, t: 0, life: 2.4, col: b.col3 || '#FFF0B8', beam: true, dead: false,
      });
      sfxBeam();
    } else if (atk === 'SPAWN') {
      // こぶんが たまりすぎないように 上限を つける
      const live = this.enemies.filter((m) => m.kind === 'MINION' && m.alive).length;
      const n = Math.max(0, Math.min(b.hard ? 3 : 2, 4 - live));
      for (let i = 0; i < n; i++) {
        const m = new Enemy('MINION', cx - 0.4 + (i - 1) * 1.2, e.y + e.h - 0.9);
        m.vx = (i % 2 ? 1 : -1) * 2.8;
        this.enemies.push(m);
      }
      sfxSpawn();
    } else if (atk === 'WAVE') {
      for (const s of [-1, 1]) {
        this.bolts.push({
          x: cx, y: cy, vx: s * 6.5, vy: 0, wave: true,
          r: 0.3, t: 0, life: 4, col, dead: false,
        });
      }
      sfxEnemyShot();
    }
  }

  // --- あたり判定 --------------------------------------------------------
  overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  hammerBox() {
    const p = this.player;
    const d = p.faceRight ? 1 : -1;
    const w = 1.25, h = 1.15;
    return {
      x: p.x + PLAYER_W / 2 + (d > 0 ? 0.1 : -0.1 - w),
      y: p.y + PLAYER_H - h + 0.05, w, h,
    };
  }

  collide() {
    const p = this.player;
    const pcx = p.x + PLAYER_W / 2;
    const pcy = p.y + PLAYER_H / 2;

    if (p.magnetT > 0) {
      for (const pk of this.pickups) {
        if (pk.taken || (pk.kind !== 'COIN' && pk.kind !== 'GEM')) continue;
        const dx = pcx - (pk.x + 0.5);
        const dy = pcy - (pk.y + 0.5);
        const d = Math.hypot(dx, dy);
        if (d < MAGNET_RANGE && d > 0.01) {
          pk.x += (dx / d) * 0.42;
          pk.y += (dy / d) * 0.42;
        }
      }
    }

    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (!this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, pk.x + 0.05, pk.y + 0.05, 0.9, 0.9)) continue;
      pk.taken = true;
      this.takePickup(pk);
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);

    for (const cp of this.checkpoints) {
      if (cp.active) continue;
      if (this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, cp.x, cp.y - 3.5, 1, 3.5)) {
        cp.active = true;
        this.spawnArea = this.areaIndex;
        this.spawnX = cp.x; this.spawnY = cp.y - PLAYER_H;
        this.score += 150;
        this.pops.push({ x: cp.x + 0.5, y: cp.y - 3, text: 'ここから やりなおせる！', t: 0 });
        sfxCheck();
      }
    }

    // りなの たま と 敵
    for (const s of this.shots) {
      if (s.dead) continue;
      for (const e of this.enemies) {
        if (!e.alive || e.invulnT > 0) continue;
        if (!this.overlaps(s.x - 0.24, s.y - 0.24, 0.48, 0.48, e.x, e.y, e.w, e.h)) continue;
        if (s.kind === 'BOOM') {
          if (s.hit.indexOf(e) >= 0) continue;
          s.hit.push(e);
          this.hitEnemy(e, false, 1);
        } else if (s.kind === 'ICE') {
          s.dead = true;
          if (e.kind === 'BOSS') this.hitEnemy(e, false, 1);
          else { e.frozenT = FREEZE_TIME; e.vx = 0; sfxFreeze();
            this.pops.push({ x: e.x + e.w / 2, y: e.y, text: 'カチーン', t: 0 }); }
        } else {
          s.dead = true;
          this.hitEnemy(e, false, 1);
        }
      }
    }

    // ハンマー
    if (p.hammerT > 0) {
      const hb = this.hammerBox();
      for (const e of this.enemies) {
        if (!e.alive || e.invulnT > 0) continue;
        if (this.overlaps(hb.x, hb.y, hb.w, hb.h, e.x, e.y, e.w, e.h)) this.hitEnemy(e, false, 1);
      }
      for (const b of this.bolts) {
        if (!b.beam && this.overlaps(hb.x, hb.y, hb.w, hb.h, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2)) {
          b.dead = true;
        }
      }
    }

    // 敵と りな
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (!this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, e.x, e.y, e.w, e.h)) continue;
      if (e.frozenT > 0) {
        // こおった敵は 上から ふむと くだける
        if (p.vy > 1 && p.y + PLAYER_H < e.y + e.h * 0.8) this.hitEnemy(e, true, 99);
        continue;
      }
      const stomping = p.vy > 1 && p.y + PLAYER_H < e.y + e.h * 0.72;
      if (p.starT > 0) this.hitEnemy(e, false, 99);
      else if (e.invulnT > 0) continue;
      else if (e.stompable && stomping) this.hitEnemy(e, true, 1);
      else this.hurt();
    }

    // 敵の たま
    for (const b of this.bolts) {
      if (b.dead) continue;
      const r = b.r;
      if (this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, b.x - r, b.y - r, r * 2, r * 2)) {
        if (!b.beam) b.dead = true;
        this.hurt();
      }
    }

    // トゲ・ようがん
    const tx0 = Math.floor(p.x + 0.12);
    const tx1 = Math.floor(p.x + PLAYER_W - 0.12);
    const ty = Math.floor(p.y + PLAYER_H - 0.1);
    for (let tx = tx0; tx <= tx1; tx++) {
      const c = this.tileAt(tx, ty);
      if (c === 's' || (c === 'T' && this.trapUp(tx, ty))) this.hurt();
    }

    const ar = this.area;
    if (!this.goalLocked && ar.goalX >= 0 &&
        this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, ar.goalX, ar.goalY - 4.5, 1.2, 4.5)) {
      this.clearStage();
    }
  }

  takePickup(pk) {
    const p = this.player;
    this.pops.push({ x: pk.x + 0.5, y: pk.y, kind: pk.kind, t: 0 });
    switch (pk.kind) {
      case 'COIN': this.coinCount += 1; this.score += 100; sfxCoin(); break;
      case 'GEM': this.score += 600; this.coinCount += 5; sfxGem(); break;
      case 'LIFE': this.lives += 1; this.score += 300; sfxLife();
        this.pops.push({ x: pk.x + 0.5, y: pk.y - 0.6, text: 'のこり +1', t: 0 }); break;
      case 'STAR': p.starT = STAR_TIME; this.score += 400; sfxStar(); break;
      case 'FEATHER': p.featherT = FEATHER_TIME; this.score += 300; sfxItem(); break;
      case 'MAGNET': p.magnetT = MAGNET_TIME; this.score += 300; sfxItem(); break;
      case 'CAKE':
        this.score += 400;
        if (p.size === 0) { p.size = 1; p.growT = GROW_FREEZE; sfxGrow();
          this.pops.push({ x: pk.x + 0.5, y: pk.y - 0.6, text: 'おおきくなった！', t: 0 }); }
        else { this.lives += 1; this.pops.push({ x: pk.x + 0.5, y: pk.y - 0.6, text: 'のこり +1', t: 0 }); sfxLife(); }
        break;
      default: {
        if (pk.kind.slice(0, 2) !== 'W_') break;
        const key = pk.kind.slice(2);
        p.size = 1;
        p.weapon = key;
        p.growT = GROW_FREEZE;
        this.score += 600;
        sfxGrow();
        this.say(WEAPONS[key].name + ' を てにいれた！ ' + WEAPONS[key].hint, 3.2);
        break;
      }
    }
  }

  hitEnemy(e, bounce, dmg) {
    if (e.invulnT > 0 && e.frozenT <= 0) return;
    if (bounce) this.player.vy = STOMP_BOUNCE;
    if (e.kind === 'BOSS') {
      e.hp -= dmg >= 99 ? 1 : dmg;
      sfxBossHit();
      if (e.hp > 0) {
        e.invulnT = BOSS_HIT_INVULN;
        this.score += 400;
        this.pops.push({ x: e.x + e.w / 2, y: e.y, text: `のこり ${e.hp}`, t: 0 });
        return;
      }
      e.alive = false; e.squashT = 0;
      this.bossAlive = false;
      this.bolts = [];
      this.score += 5000;
      this.pops.push({ x: e.x + e.w / 2, y: e.y, text: `${e.boss.name} に かった！`, t: 0 });
      sfxWin();
      bgmStage();
      return;
    }
    e.alive = false;
    e.squashT = 0;
    e.frozenT = 0;
    this.combo += 1;
    const gained = 200 * Math.min(this.combo, 6);
    this.score += gained;
    this.pops.push({
      x: e.x + e.w / 2, y: e.y,
      text: this.combo > 1 ? `${gained} コンボ！` : `${gained}`, t: 0,
    });
    sfxStomp();
  }

  hurt() {
    const p = this.player;
    if (p.hurtT > 0 || p.starT > 0 || p.growT > 0) return;
    if (p.weapon) {
      p.weapon = null;
      p.hurtT = HURT_TIME;
      p.growT = GROW_FREEZE * 0.7;
      this.pops.push({ x: p.x + PLAYER_W / 2, y: p.y, text: 'ぶきを おとした！', t: 0 });
      sfxHurt();
      return;
    }
    if (p.size > 0) {
      p.size = 0;
      p.hurtT = HURT_TIME;
      p.growT = GROW_FREEZE * 0.7;
      this.pops.push({ x: p.x + PLAYER_W / 2, y: p.y, text: 'ちぢんだ！', t: 0 });
      sfxHurt();
      return;
    }
    this.die();
  }

  die() {
    if (this.phase !== 'PLAYING') return;
    this.lives -= 1;
    this.player.vy = -13;
    this.player.hurtT = HURT_TIME;
    this.phaseT = 0;
    this.clearInput();
    this.phase = 'DYING';
    sfxDie();
  }

  clearStage() {
    const bonus = Math.floor(Math.max(CLEAR_TIME_LIMIT - this.stageTime, 0) * 10);
    this.totalTime += this.stageTime;
    this.lastBonus = bonus;
    this.score += 1500 + bonus;
    this.clearInput();
    this.phase = 'LEVEL_CLEAR';
    save.cleared[this.levelIndex] = 1;
    if (this.score > save.best) save.best = this.score;
    save.coins = Math.max(save.coins, this.coinCount);
    storeSave();
    sfxClear();
  }

  updateCamera(viewTilesX, dt) {
    const ar = this.area;
    const p = this.player;
    if (ar.scroll > 0 && this.phase === 'PLAYING' && this.introT <= 0) {
      this.scrollX = Math.min(this.scrollX + ar.scroll * dt, Math.max(ar.width - viewTilesX, 0));
      this.cameraX = this.scrollX;
    } else {
      const target = p.x + PLAYER_W / 2 - viewTilesX / 2;
      this.cameraX = clamp(target, 0, Math.max(ar.width - viewTilesX, 0));
    }
    const maxY = Math.max(ar.height - VIEW_TILES_Y, 0);
    if (maxY > 0) {
      const ty = p.y + PLAYER_H / 2 - VIEW_TILES_Y * 0.55;
      this.cameraY = clamp(ty, 0, maxY);
    } else this.cameraY = 0;
    this.playerViewX = clamp((p.x + PLAYER_W / 2 - this.cameraX) / viewTilesX, 0, 1);
    this.playerViewY = clamp((p.y + PLAYER_H / 2 - this.cameraY) / VIEW_TILES_Y, 0, 1);
  }
}
