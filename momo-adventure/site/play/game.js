'use strict';
// りなの大冒険 — Web 版
//
// Android 版（Kotlin + Compose Canvas）からの移植。物理定数とステージ
// データは Android 版と同じものを使っている（levels.js は Kotlin 版と
// 同じ tools/genlevels.py が生成する）。

// --- 物理定数 -----------------------------------------------------------
const GRAVITY = 44;
const MOVE_SPEED = 7.5;
const JUMP_VELOCITY = -17.5;
const AIR_JUMP_VELOCITY = -15;
const BOUNCE_VELOCITY = -26;
const JUMP_CUT = -7;
const MAX_FALL = 28;
const STOMP_BOUNCE = -12;

const STAR_TIME = 8;
const DASH_TIME = 10;
const DASH_MULTIPLIER = 1.45;
const FEATHER_TIME = 14;
const MAGNET_TIME = 10;
const MAGNET_RANGE = 4.5;
const HURT_TIME = 1.2;
const SPAWN_GRACE = 1.6;

const MOVER_AMP_X = 3;
const MOVER_AMP_Y = 2;
const MOVER_OMEGA = 0.9;
const MOVER_W = 2.4;
const MOVER_H = 0.45;

// 初見殺しの仕掛け
const CRUMBLE_WARN = 0.45;   // 乗ってから崩れ落ちるまで
const CRUMBLE_BACK = 3;      // 崩れてから戻ってくるまで
const TRAP_WARN = 0.35;      // 近づいてからトゲが出るまで
const TRAP_UP = 2.2;         // トゲが出ている時間
const TRAP_SENSE = 3.2;      // トゲが反応する距離
const DROP_SENSE = 1.5;      // どんぐりが落ちてくる距離

const BOSS_HP = 3;
const CLEAR_TIME_LIMIT = 90;
const VIEW_TILES_Y = 12;

const PLAYER_W = 0.72;
const PLAYER_H = 0.92;

// りなを見やすくするための「見た目だけ」の倍率。当たり判定は上の値のまま。
// 判定まで大きくすると狭い通路を抜けられなくなり、全ステージの到達可能性を
// 作り直すことになるため。
const PLAYER_DRAW_SCALE = 1.3;

const SOLID = '#=?x^F';
const isSolid = (c) => SOLID.indexOf(c) >= 0;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

// --- 配色 ---------------------------------------------------------------
const RINA_BODY = '#FF9EC4', RINA_DARK = '#E979AC', RINA_FOOT = '#FFE0EC';
const INK = '#41303A', CHEEK = '#FF6F9C';
const PUNI_BODY = '#86DC64', PUNI_DARK = '#5FB841';
const TOGE_BODY = '#B289E8', TOGE_DARK = '#8A5FC9';
const PATA_BODY = '#7BD5F2', PATA_DARK = '#4FB2D6';
const PYON_BODY = '#FFC163', PYON_DARK = '#E0913A';
const OIKA_BODY = '#FF7F6B', OIKA_DARK = '#D9553F';
const BOSS_BODY = '#6E5BA6', BOSS_DARK = '#473772';
const COIN_A = '#FFD84D', COIN_B = '#FFF3B0', COIN_C = '#E0A81E';
const GEM_A = '#6BE3E0', GEM_B = '#B6FFFD';
const HEART_A = '#FF6B8A', STAR_A = '#FFE066';
const DASH_A = '#4FC3F7', FEATHER_A = '#B2F5C4';
const SHIELD_A = '#7FB5FF', MAGNET_A = '#FF7A7A';

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const PALETTES = {
  GRASS: { skyTop: '#7EC8F5', skyBottom: '#D6F0FF', hillBack: '#9AD98C', hillFront: '#6FC162',
           dirt: '#B5793F', dirtDark: '#8E5A2B', surface: '#6FC162', platform: '#CE9A5E',
           cloud: '#FFFFFF', cloudA: 0.75, hazard: '#D6DDE6', hazardBase: '#9AA6B5', night: false },
  MEADOW: { skyTop: '#8FD9F0', skyBottom: '#FFF0D8', hillBack: '#C7E89B', hillFront: '#8FCF6E',
            dirt: '#C08A54', dirtDark: '#98673A', surface: '#8FCF6E', platform: '#DCA96D',
            cloud: '#FFFFFF', cloudA: 0.75, hazard: '#D6DDE6', hazardBase: '#9AA6B5', night: false },
  CAVE: { skyTop: '#241B3D', skyBottom: '#48336B', hillBack: '#3A2B57', hillFront: '#2C2043',
          dirt: '#6B5A8A', dirtDark: '#4A3D63', surface: '#8E79B5', platform: '#7C6AA0',
          cloud: '#B79CFF', cloudA: 0.3, hazard: '#D6DDE6', hazardBase: '#9AA6B5', night: true },
  WATER: { skyTop: '#1E6B8C', skyBottom: '#7ED4E0', hillBack: '#3E9CB0', hillFront: '#2A7E96',
           dirt: '#5E9CA8', dirtDark: '#3F7484', surface: '#8FE3E8', platform: '#79C4CE',
           cloud: '#DFF7FF', cloudA: 0.7, hazard: '#B9EAF2', hazardBase: '#6FA8B5', night: false },
  SKY: { skyTop: '#FFA46B', skyBottom: '#FFE3C4', hillBack: '#FFC48A', hillFront: '#FFB073',
         dirt: '#E8E0F5', dirtDark: '#C9BEE0', surface: '#FFFFFF', platform: '#EDE4FA',
         cloud: '#FFFFFF', cloudA: 0.8, hazard: '#D6DDE6', hazardBase: '#9AA6B5', night: false },
  SNOW: { skyTop: '#9FC8E8', skyBottom: '#EAF6FF', hillBack: '#CFE4F2', hillFront: '#B4D4E8',
          dirt: '#DCE9F2', dirtDark: '#B9CEDE', surface: '#FFFFFF', platform: '#DDEAF5',
          cloud: '#FFFFFF', cloudA: 0.85, hazard: '#CFE8FF', hazardBase: '#8FAEC4', night: false },
  DESERT: { skyTop: '#F7C877', skyBottom: '#FFF0CC', hillBack: '#E8B978', hillFront: '#D9A055',
            dirt: '#D9A863', dirtDark: '#B4813F', surface: '#E8C182', platform: '#CFA167',
            cloud: '#FFF6E0', cloudA: 0.7, hazard: '#E8DCC0', hazardBase: '#B09A6E', night: false },
  LAVA: { skyTop: '#3A1B22', skyBottom: '#8C3A2E', hillBack: '#5E2A2A', hillFront: '#421F20',
          dirt: '#6B4038', dirtDark: '#4A2A26', surface: '#8F5240', platform: '#7A4536',
          cloud: '#FFB37A', cloudA: 0.3, hazard: '#FF9E3D', hazardBase: '#CF5320', night: false },
  NIGHT: { skyTop: '#141A3A', skyBottom: '#3A3A72', hillBack: '#232A55', hillFront: '#1A1F42',
           dirt: '#4C4E85', dirtDark: '#34365F', surface: '#7E80C4', platform: '#6567A8',
           cloud: '#C6C9FF', cloudA: 0.3, hazard: '#D6DDE6', hazardBase: '#9AA6B5', night: true },
  CASTLE: { skyTop: '#2E2440', skyBottom: '#6B4E7A', hillBack: '#453255', hillFront: '#33253F',
            dirt: '#7A6A88', dirtDark: '#574A63', surface: '#9C89AD', platform: '#8A7799',
            cloud: '#E0C8FF', cloudA: 0.3, hazard: '#FF9E3D', hazardBase: '#CF5320', night: true },
};

// --- ステージ -----------------------------------------------------------
class Level {
  constructor(data) {
    this.title = data.title;
    this.theme = data.theme;
    this.height = data.rows.length;
    this.width = Math.max(...data.rows.map((r) => r.length));
    this.tiles = data.rows.map((r) => r.padEnd(this.width, '.').split(''));

    this.startX = 2; this.startY = 9;
    this.goalX = 0; this.goalY = 0;
    this.hasBoss = false;
    this.enemySpawns = [];
    this.pickupSpawns = [];
    this.checkpointSpawns = [];
    this.moverSpawns = [];
    this.crumbleSpawns = [];
    this.trapSpawns = [];

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const c = this.tiles[row][col];
        const ey = row + 0.2;
        switch (c) {
          case '@': this.startX = col; this.startY = row + 1 - PLAYER_H; break;
          case 'G': this.goalX = col; this.goalY = row + 1; break;
          case 'C': this.checkpointSpawns.push([col, row + 1]); break;
          case 'w': this.enemySpawns.push(['WALKER', col, ey]); break;
          case 'k': this.enemySpawns.push(['SPIKY', col, ey]); break;
          case 'p': this.enemySpawns.push(['FLYER', col, ey]); break;
          case 'j': this.enemySpawns.push(['JUMPER', col, ey]); break;
          case 'c': this.enemySpawns.push(['CHASER', col, ey]); break;
          case 'D': this.enemySpawns.push(['DROPPER', col, ey]); break;
          case 'F': this.crumbleSpawns.push([col, row]); break;
          case 'T': this.trapSpawns.push([col, row]); break;
          case 'B': this.enemySpawns.push(['BOSS', col, row + 1 - 1.5]); this.hasBoss = true; break;
          case 'm': this.moverSpawns.push([col, row, false]); break;
          case 'v': this.moverSpawns.push([col, row, true]); break;
          case 'o': this.pickupSpawns.push(['COIN', col, row]); break;
          case 'g': this.pickupSpawns.push(['GEM', col, row]); break;
          case 'h': this.pickupSpawns.push(['HEART', col, row]); break;
          case '*': this.pickupSpawns.push(['STAR', col, row]); break;
          case 'd': this.pickupSpawns.push(['DASH', col, row]); break;
          case 'f': this.pickupSpawns.push(['FEATHER', col, row]); break;
          case 'b': this.pickupSpawns.push(['SHIELD', col, row]); break;
          case 'M': this.pickupSpawns.push(['MAGNET', col, row]); break;
        }
        if ('#=?xs^FT'.indexOf(c) < 0) this.tiles[row][col] = '.';
      }
    }
  }
}

const ENEMY_SIZE = {
  BOSS: { w: 1.7, h: 1.5 },
  FLYER: { w: 0.86, h: 0.8 },
  DEFAULT: { w: 0.8, h: 0.8 },
};

class Enemy {
  constructor(kind, homeX, homeY) {
    this.kind = kind;
    this.homeX = homeX;
    this.homeY = homeY;
    this.x = homeX;
    this.y = homeY;
    // どんぐりは落ちてくるまで動かない
    this.vx = kind === 'SPIKY' ? -1.6 : kind === 'CHASER' ? -2.0
      : kind === 'BOSS' ? -2.2 : kind === 'DROPPER' ? 0 : -2.3;
    this.dropped = false;
    this.vy = 0;
    this.alive = true;
    this.squashT = 0;
    this.t = 0;
    this.hp = kind === 'BOSS' ? BOSS_HP : 1;
    this.invulnT = 0;
    this.actionT = 0;
    this.minX = -Infinity;
    this.maxX = Infinity;
    const s = ENEMY_SIZE[kind] || ENEMY_SIZE.DEFAULT;
    this.w = s.w;
    this.h = s.h;
  }
  get stompable() { return this.kind !== 'SPIKY'; }
}

// --- ゲーム本体 ---------------------------------------------------------
class Game {
  constructor() {
    this.phase = 'TITLE';
    this.lives = 3;
    this.score = 0;
    this.coinCount = 0;
    this.levelIndex = 0;
    this.lastBonus = 0;
    this.elapsed = 0;
    this.stageTime = 0;
    this.totalTime = 0;
    this.endingT = 0;
    this.combo = 0;
    this.cameraX = 0;
    this.phaseT = 0;
    this.bossRemaining = 0;
    this.playerViewX = 0.5;
    this.playerViewY = 0.5;

    this.player = {
      x: 0, y: 0, vx: 0, vy: 0, onGround: false, faceRight: true,
      starT: 0, dashT: 0, featherT: 0, magnetT: 0, hasShield: false,
      hurtT: 0, animT: 0, airJumps: 0,
    };
    this.enemies = [];
    this.pickups = [];
    this.checkpoints = [];
    this.movers = [];
    this.crumbles = [];
    this.traps = [];
    this.trapAt = new Map();
    this.pops = [];

    this.inputLeft = false;
    this.inputRight = false;
    this.jumpHeld = false;
    this.jumpQueued = false;

    this.loadLevel(0);
  }

  get goalLocked() { return this.level.hasBoss && this.bossRemaining > 0; }

  pressJump() { this.jumpHeld = true; this.jumpQueued = true; }
  releaseJump() { this.jumpHeld = false; }

  // ゴールに触れるとボタンが消えるため、押しっぱなしの入力を捨てる。
  clearInput() {
    this.inputLeft = false;
    this.inputRight = false;
    this.jumpHeld = false;
    this.jumpQueued = false;
  }

  startGame() {
    this.lives = 3;
    this.score = 0;
    this.coinCount = 0;
    this.levelIndex = 0;
    this.totalTime = 0;
    this.loadLevel(0);
    this.phase = 'PLAYING';
  }

  advance() {
    switch (this.phase) {
      case 'TITLE': this.startGame(); break;
      case 'LEVEL_CLEAR':
        if (this.levelIndex + 1 >= LEVELS.length) {
          this.endingT = 0;
          this.phase = 'ENDING';
        } else {
          this.levelIndex += 1;
          this.loadLevel(this.levelIndex);
          this.phase = 'PLAYING';
        }
        break;
      case 'ENDING': this.phase = 'ALL_CLEAR'; break;
      case 'GAME_OVER':
      case 'ALL_CLEAR':
        this.phase = 'TITLE';
        this.levelIndex = 0;
        this.loadLevel(0);
        break;
    }
  }

  loadLevel(index) {
    this.level = new Level(LEVELS[index]);
    this.spawnX = this.level.startX;
    this.spawnY = this.level.startY;
    this.stageTime = 0;
    this.checkpoints = this.level.checkpointSpawns.map(([x, y]) => ({ x, y, active: false }));
    this.pickups = this.level.pickupSpawns.map(([kind, x, y]) => ({ kind, x, y, taken: false, t: 0 }));
    this.movers = this.level.moverSpawns.map(([x, y, vertical]) => ({
      homeX: x, homeY: y, vertical,
      x: x - (MOVER_W - 1) / 2, y, prevX: x - (MOVER_W - 1) / 2, prevY: y, t: 0,
    }));
    this.crumbles = this.level.crumbleSpawns.map(([tx, ty]) => ({ tx, ty, state: 0, t: 0 }));
    this.traps = this.level.trapSpawns.map(([tx, ty]) => ({ tx, ty, state: 0, t: 0 }));
    this.trapAt = new Map();
    for (const tr of this.traps) this.trapAt.set(tr.ty * this.level.width + tr.tx, tr);
    const p = this.player;
    p.hasShield = false; p.dashT = 0; p.featherT = 0; p.magnetT = 0;
    this.respawn();
  }

  respawn() {
    const p = this.player;
    p.x = this.spawnX; p.y = this.spawnY;
    p.vx = 0; p.vy = 0; p.starT = 0;
    p.hurtT = SPAWN_GRACE;
    p.faceRight = true; p.airJumps = 0;
    this.combo = 0;
    this.enemies = [];
    this.bossRemaining = 0;
    for (const [kind, x, y] of this.level.enemySpawns) {
      const e = new Enemy(kind, x, y);
      this.enemies.push(e);
      if (kind === 'BOSS') { this.bossRemaining += 1; this.computeArena(e); }
    }
    this.pops = [];
    for (const c of this.crumbles) {
      c.state = 0; c.t = 0;
      this.level.tiles[c.ty][c.tx] = 'F';
    }
    for (const tr of this.traps) { tr.state = 0; tr.t = 0; }
    this.cameraX = 0;
    this.phaseT = 0;
    this.clearInput();
  }

  update(dt, viewTilesX) {
    this.elapsed += dt;
    for (const pop of this.pops) pop.t += dt;
    this.pops = this.pops.filter((pop) => pop.t <= 0.8);
    for (const pk of this.pickups) pk.t += dt;

    if (this.phase === 'PLAYING') {
      this.stageTime += dt;
      this.updateMovers(dt);
      this.updateTraps(dt);
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.collide();
      this.updateCamera(viewTilesX);
    } else if (this.phase === 'DYING') {
      this.phaseT += dt;
      this.player.animT += dt;
      this.player.vy = Math.min(this.player.vy + GRAVITY * dt, MAX_FALL);
      this.player.y += this.player.vy * dt;
      if (this.phaseT > 1.4) {
        if (this.lives <= 0) this.phase = 'GAME_OVER';
        else { this.respawn(); this.phase = 'PLAYING'; }
      }
    } else if (this.phase === 'ENDING') {
      this.endingT += dt;
      this.player.animT += dt;
    } else {
      this.player.animT += dt;
      this.updateMovers(dt);
    }
    this.jumpQueued = false;
  }

  updateMovers(dt) {
    for (const m of this.movers) {
      m.prevX = m.x; m.prevY = m.y;
      m.t += dt;
      const offset = Math.sin(m.t * MOVER_OMEGA);
      if (m.vertical) m.y = m.homeY + offset * MOVER_AMP_Y;
      else m.x = m.homeX - (MOVER_W - 1) / 2 + offset * MOVER_AMP_X;
    }
  }

  trapUp(tx, ty) {
    const tr = this.trapAt.get(ty * this.level.width + tx);
    return !!tr && tr.state === 2;
  }

  crumbleAt(tx, ty) {
    return this.crumbles.find((c) => c.tx === tx && c.ty === ty);
  }

  /** もろい足場ととつぜんトゲの状態を進める。 */
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
        if (c.t > CRUMBLE_WARN) {
          c.state = 2; c.t = 0;
          this.level.tiles[c.ty][c.tx] = '.';
        }
      } else if (c.t > CRUMBLE_BACK) {
        // プレイヤーが重なっている場所に戻すと埋まってしまう
        const overlap = p.x + PLAYER_W > c.tx && p.x < c.tx + 1 &&
          p.y + PLAYER_H > c.ty && p.y < c.ty + 1;
        if (!overlap) {
          c.state = 0; c.t = 0;
          this.level.tiles[c.ty][c.tx] = 'F';
        }
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
      } else if (tr.t > TRAP_UP) {
        tr.state = 0; tr.t = 0;
      }
    }
  }

  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.level.width) return '#';   // 左右端は見えない壁
    if (ty < 0 || ty >= this.level.height) return '.';
    return this.level.tiles[ty][tx];
  }

  updatePlayer(dt) {
    const p = this.player;
    p.animT += dt;
    if (p.starT > 0) p.starT -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.dashT > 0) p.dashT -= dt;
    if (p.featherT > 0) p.featherT -= dt;
    if (p.magnetT > 0) p.magnetT -= dt;

    const dir = (this.inputRight ? 1 : 0) - (this.inputLeft ? 1 : 0);
    const speed = p.dashT > 0 ? MOVE_SPEED * DASH_MULTIPLIER : MOVE_SPEED;
    p.vx = dir * speed;
    if (dir > 0) p.faceRight = true;
    if (dir < 0) p.faceRight = false;

    if (this.jumpQueued) {
      if (p.onGround) {
        p.vy = JUMP_VELOCITY;
        p.onGround = false;
      } else if (p.featherT > 0 && p.airJumps < 1) {
        p.vy = AIR_JUMP_VELOCITY;
        p.airJumps += 1;
        this.pops.push({ x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H, kind: 'FEATHER', text: null, t: 0 });
      }
    }
    if (!this.jumpHeld && p.vy < JUMP_CUT) p.vy = JUMP_CUT;

    this.moveX(dt);
    this.moveY(dt);
    this.rideMovers();

    if (p.onGround) { p.airJumps = 0; this.combo = 0; }
    if (p.y > this.level.height + 2) this.die();
  }

  moveX(dt) {
    const p = this.player;
    p.x += p.vx * dt;
    const y0 = Math.floor(p.y + 0.05);
    const y1 = Math.floor(p.y + PLAYER_H - 0.05);
    if (p.vx > 0) {
      const tx = Math.floor(p.x + PLAYER_W);
      for (let ty = y0; ty <= y1; ty++) {
        if (isSolid(this.tileAt(tx, ty))) { p.x = tx - PLAYER_W; p.vx = 0; break; }
      }
    } else if (p.vx < 0) {
      const tx = Math.floor(p.x);
      for (let ty = y0; ty <= y1; ty++) {
        if (isSolid(this.tileAt(tx, ty))) { p.x = tx + 1; p.vx = 0; break; }
      }
    }
  }

  moveY(dt) {
    const p = this.player;
    p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
    p.y += p.vy * dt;
    p.onGround = false;
    const x0 = Math.floor(p.x + 0.06);
    const x1 = Math.floor(p.x + PLAYER_W - 0.06);
    if (p.vy > 0) {
      const ty = Math.floor(p.y + PLAYER_H);
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileAt(tx, ty);
        if (isSolid(c)) {
          p.y = ty - PLAYER_H;
          if (c === '^') {
            p.vy = BOUNCE_VELOCITY;
            p.airJumps = 0;
            this.pops.push({ x: tx + 0.5, y: ty, kind: null, text: 'ぽよん', t: 0 });
          } else {
            p.vy = 0;
            p.onGround = true;
          }
          break;
        }
      }
    } else if (p.vy < 0) {
      const ty = Math.floor(p.y);
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileAt(tx, ty);
        if (isSolid(c)) {
          p.y = ty + 1;
          p.vy = 0;
          if (c === '?' && ty >= 0 && ty < this.level.height && tx >= 0 && tx < this.level.width) {
            this.level.tiles[ty][tx] = 'x';
            this.pops.push({ x: tx + 0.5, y: ty, kind: 'COIN', text: null, t: 0 });
            this.coinCount += 1;
            this.score += 100;
          }
          break;
        }
      }
    }
  }

  /** 移動床は上面だけ当たる。乗っているあいだは一緒に運ばれる。 */
  rideMovers() {
    const p = this.player;
    if (p.vy < -0.5) return;
    const feet = p.y + PLAYER_H;
    for (const m of this.movers) {
      if (p.x + PLAYER_W <= m.x || p.x >= m.x + MOVER_W) continue;
      if (feet < m.y - 0.3 || feet > m.y + 0.7) continue;
      p.y = m.y - PLAYER_H;
      p.vy = 0;
      p.onGround = true;
      p.x += m.x - m.prevX;
      break;
    }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive) { e.squashT += dt; continue; }
      e.t += dt;
      if (e.invulnT > 0) e.invulnT -= dt;
      if (e.kind !== 'BOSS' && (e.x < this.cameraX - 6 || e.x > this.cameraX + 34)) continue;
      if (e.kind === 'FLYER') {
        e.x = e.homeX + Math.sin(e.t * 1.1) * 3.2;
        e.y = e.homeY + Math.sin(e.t * 2.4) * 1.1;
        e.vx = Math.cos(e.t * 1.1) >= 0 ? 1 : -1;
      } else if (e.kind === 'JUMPER') {
        e.actionT += dt;
        if (e.actionT > 1.7 && e.vy === 0) { e.vy = -14; e.actionT = 0; }
        e.x += e.vx * 0.35 * dt;
        this.walkCollide(e, dt, true);
      } else if (e.kind === 'CHASER') {
        const dx = this.player.x - e.x;
        if (Math.abs(dx) < 8 && Math.abs(this.player.y - e.y) < 3) e.vx = sign(dx) * 3.4;
        else if (Math.abs(e.vx) > 2.1) e.vx = sign(e.vx) * 2.0;
        e.x += e.vx * dt;
        this.walkCollide(e, dt, true);
      } else if (e.kind === 'DROPPER') {
        if (!e.dropped) {
          // 真下を通りかかると落ちてくる
          const dx = Math.abs((this.player.x + PLAYER_W / 2) - (e.x + e.w / 2));
          if (dx < DROP_SENSE && this.player.y + PLAYER_H > e.y) e.dropped = true;
        } else {
          e.x += e.vx * dt;
          this.walkCollide(e, dt, true);
          if (e.vy === 0 && e.vx === 0) e.vx = -2.3;   // 着地したら歩き出す
        }
      } else if (e.kind === 'BOSS') {
        this.updateBoss(e, dt);
      } else {
        e.x += e.vx * dt;
        this.walkCollide(e, dt, true);
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.squashT <= 0.7);
  }

  walkCollide(e, dt, turnAtLedge) {
    const ty0 = Math.floor(e.y + 0.05);
    const ty1 = Math.floor(e.y + e.h - 0.05);
    const aheadX = e.vx > 0 ? Math.floor(e.x + e.w) : Math.floor(e.x);
    let turn = false;
    for (let ty = ty0; ty <= ty1; ty++) if (isSolid(this.tileAt(aheadX, ty))) turn = true;
    if (turnAtLedge && e.vy === 0) {
      const footY = Math.floor(e.y + e.h + 0.2);
      if (!isSolid(this.tileAt(aheadX, footY))) turn = true;
    }
    if (turn) { e.vx = -e.vx; e.x += e.vx * dt; }
    e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
    e.y += e.vy * dt;
    const tx0 = Math.floor(e.x + 0.06);
    const tx1 = Math.floor(e.x + e.w - 0.06);
    if (e.vy > 0) {
      const ty = Math.floor(e.y + e.h);
      for (let tx = tx0; tx <= tx1; tx++) {
        if (isSolid(this.tileAt(tx, ty))) { e.y = ty - e.h; e.vy = 0; break; }
      }
    }
  }

  /** ボスが落ちると倒せなくなりゴールが開かないので、足場の範囲を調べる。 */
  computeArena(e) {
    const footRow = Math.floor(e.homeY + e.h + 0.2);
    let left = Math.floor(e.homeX);
    while (left - 1 >= 0 && isSolid(this.tileAt(left - 1, footRow))) left -= 1;
    let right = Math.floor(e.homeX + e.w);
    while (right + 1 < this.level.width && isSolid(this.tileAt(right + 1, footRow))) right += 1;
    e.minX = left;
    e.maxX = Math.max(right + 1 - e.w, left);
  }

  updateBoss(e, dt) {
    e.actionT += dt;
    const dx = this.player.x - e.x;
    const speed = 2.0 + (BOSS_HP - e.hp) * 0.9;
    e.vx = sign(dx) * speed;
    if (e.actionT > 2.4 && e.vy === 0) { e.vy = -15; e.actionT = 0; }
    e.x += e.vx * dt;
    this.walkCollide(e, dt, false);
    e.x = clamp(e.x, e.minX, e.maxX);
  }

  overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
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
          const pull = 9 * (1 - d / MAGNET_RANGE) * 0.016;
          pk.x += (dx / d) * pull * 3;
          pk.y += (dy / d) * pull * 3;
        }
      }
    }

    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (!this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, pk.x + 0.1, pk.y + 0.1, 0.8, 0.8)) continue;
      pk.taken = true;
      this.pops.push({ x: pk.x + 0.5, y: pk.y, kind: pk.kind, text: null, t: 0 });
      switch (pk.kind) {
        case 'COIN': this.coinCount += 1; this.score += 100; break;
        case 'GEM': this.score += 500; break;
        case 'HEART': this.lives += 1; this.score += 200; break;
        case 'STAR': p.starT = STAR_TIME; this.score += 300; break;
        case 'DASH': p.dashT = DASH_TIME; this.score += 300; break;
        case 'FEATHER': p.featherT = FEATHER_TIME; this.score += 300; break;
        case 'SHIELD': p.hasShield = true; this.score += 300; break;
        case 'MAGNET': p.magnetT = MAGNET_TIME; this.score += 300; break;
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);

    for (const cp of this.checkpoints) {
      if (cp.active) continue;
      if (this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, cp.x, cp.y - 3, 1, 3)) {
        cp.active = true;
        this.spawnX = cp.x;
        this.spawnY = cp.y - PLAYER_H;
        this.score += 100;
        this.pops.push({ x: cp.x + 0.5, y: cp.y - 3, kind: null, text: 'チェックポイント!', t: 0 });
      }
    }

    for (const e of this.enemies) {
      if (!e.alive || e.invulnT > 0) continue;
      if (!this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, e.x, e.y, e.w, e.h)) continue;
      const stomping = p.vy > 1 && p.y + PLAYER_H < e.y + e.h * 0.7;
      if (p.starT > 0) this.hitEnemy(e, false);
      else if (e.stompable && stomping) this.hitEnemy(e, true);
      else this.hurt();
    }

    const tx0 = Math.floor(p.x + 0.1);
    const tx1 = Math.floor(p.x + PLAYER_W - 0.1);
    const ty = Math.floor(p.y + PLAYER_H - 0.1);
    for (let tx = tx0; tx <= tx1; tx++) {
      const c = this.tileAt(tx, ty);
      if (c === 's' || (c === 'T' && this.trapUp(tx, ty))) this.hurt();
    }

    if (!this.goalLocked &&
        this.overlaps(p.x, p.y, PLAYER_W, PLAYER_H, this.level.goalX, this.level.goalY - 4, 1, 4)) {
      this.clearStage();
    }
  }

  hitEnemy(e, bounce) {
    if (e.invulnT > 0) return;
    if (bounce) this.player.vy = STOMP_BOUNCE;
    e.hp -= 1;
    if (e.hp > 0) {
      e.invulnT = 1.2;
      this.score += 300;
      this.pops.push({ x: e.x + e.w / 2, y: e.y, kind: null, text: `のこり ${e.hp}`, t: 0 });
      return;
    }
    e.alive = false;
    e.squashT = 0;
    if (e.kind === 'BOSS') {
      this.bossRemaining -= 1;
      this.score += 3000;
      this.pops.push({ x: e.x + e.w / 2, y: e.y, kind: null, text: 'ボス撃破!', t: 0 });
    } else {
      this.combo += 1;
      const gained = 200 * Math.min(this.combo, 5);
      this.score += gained;
      this.pops.push({
        x: e.x + e.w / 2, y: e.y, kind: null,
        text: this.combo > 1 ? `${gained} コンボ!` : `${gained}`, t: 0,
      });
    }
  }

  hurt() {
    const p = this.player;
    if (p.hurtT > 0 || p.starT > 0) return;
    if (p.hasShield) {
      p.hasShield = false;
      p.hurtT = HURT_TIME;
      p.vy = -8;
      this.pops.push({ x: p.x + PLAYER_W / 2, y: p.y, kind: 'SHIELD', text: 'セーフ!', t: 0 });
      return;
    }
    this.die();
  }

  die() {
    if (this.phase !== 'PLAYING') return;
    this.lives -= 1;
    this.player.vy = -12;
    this.player.hurtT = HURT_TIME;
    this.phaseT = 0;
    this.clearInput();
    this.phase = 'DYING';
  }

  clearStage() {
    const bonus = Math.floor(Math.max(CLEAR_TIME_LIMIT - this.stageTime, 0) * 10);
    this.totalTime += this.stageTime;
    this.lastBonus = bonus;
    this.score += 1000 + bonus;
    this.clearInput();
    this.phase = 'LEVEL_CLEAR';
  }

  updateCamera(viewTilesX) {
    const target = this.player.x + PLAYER_W / 2 - viewTilesX / 2;
    const maxX = Math.max(this.level.width - viewTilesX, 0);
    this.cameraX = clamp(target, 0, maxX);
    this.playerViewX = clamp((this.player.x + PLAYER_W / 2 - this.cameraX) / viewTilesX, 0, 1);
    this.playerViewY = clamp((this.player.y + PLAYER_H / 2) / this.level.height, 0, 1);
  }
}
