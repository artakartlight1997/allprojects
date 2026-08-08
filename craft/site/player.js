// プレイヤー。歩く・落ちる・ぶつかる・掘る・置く・持ちもの。

'use strict';

const PW = 0.30;        // からだの はば（中心から）
const PH = 1.80;        // 身長
const EYE = 1.62;       // 目の高さ

const P = {
  x: 0, y: 40, z: 0,
  vx: 0, vy: 0, vz: 0,
  yaw: 0, pitch: 0,
  onGround: false,
  inWater: false,
  fly: false,
  creative: false,
  // 持ちもの。0..8 が 下のバー、9..35 が しまってあるぶん
  inv: new Array(36).fill(null),
  slot: 0,
  // 掘っているところ
  digX: 0, digY: -1, digZ: 0, digT: 0, digNeed: 1,
  hurtT: 0,
  hp: 10,
  swing: 0,        // なぐった あとの まち時間
  hurtFlash: 0,    // やられた ときの あかい ふち
};

function eyeY() { return P.y + EYE; }

// --- 持ちもの ---------------------------------------------------------------

const STACK = 99;

function invAdd(id, n) {
  if (!id) return 0;
  let left = n === undefined ? 1 : n;
  for (let i = 0; i < P.inv.length && left > 0; i++) {
    const s = P.inv[i];
    if (s && s.id === id && s.n < STACK) {
      const put = Math.min(left, STACK - s.n);
      s.n += put; left -= put;
    }
  }
  for (let i = 0; i < P.inv.length && left > 0; i++) {
    if (!P.inv[i]) {
      const put = Math.min(left, STACK);
      P.inv[i] = { id, n: put }; left -= put;
    }
  }
  return (n === undefined ? 1 : n) - left;
}

function invCount(id) {
  let c = 0;
  for (const s of P.inv) if (s && s.id === id) c += s.n;
  return c;
}

function invTake(id, n) {
  let left = n;
  for (let i = 0; i < P.inv.length && left > 0; i++) {
    const s = P.inv[i];
    if (!s || s.id !== id) continue;
    const t = Math.min(left, s.n);
    s.n -= t; left -= t;
    if (s.n <= 0) P.inv[i] = null;
  }
  return left === 0;
}

function heldId() {
  const s = P.inv[P.slot];
  return s ? s.id : 0;
}

function useHeld() {
  const s = P.inv[P.slot];
  if (!s) return;
  if (P.creative) return;      // そうぞうモードでは 減らない
  s.n--;
  if (s.n <= 0) P.inv[P.slot] = null;
}

// そうぞうモードは 全部のブロックを 持っている
function fillCreative() {
  for (let i = 0; i < P.inv.length; i++) P.inv[i] = null;
  const list = [];
  for (let i = 1; i < BLOCKS.length; i++) {
    if (BLOCKS[i].hard === Infinity && BLOCKS[i].key !== 'water') continue;
    list.push(i);
  }
  for (let i = 0; i < Math.min(36, list.length); i++) P.inv[i] = { id: list[i], n: STACK };
  P.creativeAll = list;
}

// --- ぶつかり判定 -----------------------------------------------------------

function solidAt(x, y, z) {
  const id = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return id !== 0 && BLOCKS[id].solid;
}

// からだ（四角い箱）が どこかに めりこんでいるか
function hits(x, y, z) {
  const x0 = Math.floor(x - PW), x1 = Math.floor(x + PW);
  const y0 = Math.floor(y), y1 = Math.floor(y + PH - 0.001);
  const z0 = Math.floor(z - PW), z1 = Math.floor(z + PW);
  for (let yy = y0; yy <= y1; yy++) {
    for (let zz = z0; zz <= z1; zz++) {
      for (let xx = x0; xx <= x1; xx++) {
        const id = getBlock(xx, yy, zz);
        if (id !== 0 && BLOCKS[id].solid) return true;
      }
    }
  }
  return false;
}

// 木の中や 岩の中に わいて しまったら、出られるまで 上に あげる
function unstick() {
  let n = 0;
  while (hits(P.x, P.y, P.z) && P.y < CY - 3 && n++ < 40) P.y += 1;
}

function liquidAt(x, y, z) {
  const id = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return id !== 0 && BLOCKS[id].liquid ? id : 0;
}

// --- うごく -----------------------------------------------------------------

const GRAV = 26;
const JUMP = 8.6;
const WALK = 4.6;
const RUN = 6.6;
const FLY_SPD = 11;

function movePlayer(dt, inp) {
  const inLiq = liquidAt(P.x, P.y + 0.4, P.z);
  P.inWater = inLiq === ID.water;
  const inLava = inLiq === ID.lava;

  // よこの うごき
  const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
  let mx = inp.mx, mz = inp.mz;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  let spd = P.fly ? FLY_SPD : (inp.run ? RUN : WALK);
  if (P.inWater && !P.fly) spd *= 0.62;
  // mz は「まえ」、mx は「よこ」。
  // よこは カメラの 右（= 前×上）に あわせる
  const wx = (sy * mz - cy * mx) * spd;
  const wz = (cy * mz + sy * mx) * spd;

  if (P.fly) {
    P.vx = wx; P.vz = wz;
    P.vy = (inp.up ? FLY_SPD : 0) - (inp.down ? FLY_SPD : 0);
  } else {
    // 空中では 曲がりにくい（マイクラっぽさ）
    const acc = P.onGround ? 1 : 0.22;
    P.vx += (wx - P.vx) * Math.min(1, acc * dt * 18);
    P.vz += (wz - P.vz) * Math.min(1, acc * dt * 18);
    if (P.inWater) {
      P.vy -= GRAV * 0.28 * dt;
      if (P.vy < -3.2) P.vy = -3.2;
      if (inp.up) P.vy = 4.2;                 // 水の中は ジャンプで 上がる
    } else {
      P.vy -= GRAV * dt;
      if (P.vy < -48) P.vy = -48;
      if (inp.up && P.onGround) { P.vy = JUMP; P.onGround = false; }
    }
  }

  // 1 フレームで たくさん動くと すりぬけるので こまかく 分ける
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(P.vx), Math.abs(P.vy),
                                               Math.abs(P.vz)) * dt / 0.4));
  const sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    // よこ（X）
    let nx = P.x + P.vx * sdt;
    if (hits(nx, P.y, P.z)) {
      // 1 ブロックまでなら のぼる（かいだんを のぼる感じ）
      if (P.onGround && !hits(nx, P.y + 1.02, P.z) && !P.fly) P.y += 1.02;
      else { P.vx = 0; nx = P.x; }
    }
    P.x = nx;
    // おく（Z）
    let nz = P.z + P.vz * sdt;
    if (hits(P.x, P.y, nz)) {
      if (P.onGround && !hits(P.x, P.y + 1.02, nz) && !P.fly) P.y += 1.02;
      else { P.vz = 0; nz = P.z; }
    }
    P.z = nz;
    // たて（Y）
    const ny = P.y + P.vy * sdt;
    if (hits(P.x, ny, P.z)) {
      if (P.vy < 0) {
        // 下にぶつかった。ブロックの 上の面に ぴったり そろえる
        let g = Math.floor(ny) + 1;
        for (let k = 0; k < 4 && hits(P.x, g, P.z); k++) g++;
        P.y = g;
      }
      P.vy = 0;                     // 上にぶつかった ときは そこで 止まる
    } else {
      P.y = ny;
    }
  }
  // 足もとに 何か あるか（ジャンプできるか）
  P.onGround = !P.fly && hits(P.x, P.y - 0.06, P.z) && P.vy <= 0.0001;
  if (P.y < -8) { const s = spawnPoint(); P.x = s.x; P.y = s.y; P.z = s.z; P.vy = 0; }

  // ようがんは あつい
  if (inLava && !P.creative) {
    P.hurtT -= dt;
    if (P.hurtT <= 0) { P.hurtT = 0.6; P.hp = Math.max(0, P.hp - 1); }
  } else if (P.hp < 10) {
    P.healT = (P.healT || 0) + dt;
    if (P.healT > 3) { P.healT = 0; P.hp = Math.min(10, P.hp + 1); }
  }
  if (P.hp <= 0) {
    const s = spawnPoint();
    P.x = s.x; P.y = s.y; P.z = s.z; P.vx = P.vy = P.vz = 0; P.hp = 10;
    return 'ded';
  }
  return null;
}

// --- 掘る・置く -------------------------------------------------------------

const REACH = 5.2;

function lookingAt() {
  const d = lookVec(P.yaw, P.pitch);
  return raycast(P.x, eyeY(), P.z, d.x, d.y, d.z, REACH);
}

// 掘りつづける。dt ぶん すすめて、こわれたら true
function digTick(dt, hit) {
  if (!hit) { P.digY = -1; P.digT = 0; return false; }
  if (hit.x !== P.digX || hit.y !== P.digY || hit.z !== P.digZ) {
    P.digX = hit.x; P.digY = hit.y; P.digZ = hit.z; P.digT = 0;
    P.digNeed = P.creative ? 0.12 : blk(hit.id).hard;
  }
  if (P.digNeed === Infinity) return false;
  P.digT += dt;
  if (P.digT < P.digNeed) return false;
  const B = blk(hit.id);
  const dropKey = B.drop || B.key;
  setBlock(hit.x, hit.y, hit.z, 0);
  if (!P.creative) invAdd(ID[dropKey] || hit.id, 1);
  // 上に のっていた 花や たいまつは いっしょに 落ちる
  const above = getBlock(hit.x, hit.y + 1, hit.z);
  if (above && blk(above).cross) {
    setBlock(hit.x, hit.y + 1, hit.z, 0);
    if (!P.creative) invAdd(above, 1);
  }
  P.digT = 0; P.digY = -1;
  return true;
}

function placeAt(hit) {
  if (!hit) return false;
  const id = heldId();
  if (!id) return false;
  const x = hit.px, y = hit.py, z = hit.pz;
  if (y < 1 || y >= CY) return false;
  const cur = getBlock(x, y, z);
  if (cur !== 0 && !blk(cur).liquid) return false;
  // じぶんの からだの中には 置けない
  if (blk(id).solid) {
    const dx = Math.abs(P.x - (x + 0.5)), dz = Math.abs(P.z - (z + 0.5));
    if (dx < PW + 0.5 && dz < PW + 0.5 && y + 1 > P.y && y < P.y + PH) return false;
  }
  // 花・たいまつ は 何かの 上にしか 置けない
  if (blk(id).cross && !isSolid(getBlock(x, y - 1, z))) return false;
  setBlock(x, y, z, id);
  useHeld();
  return true;
}
