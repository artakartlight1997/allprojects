// 生きもの。村人・スライム・おばけ。
//
// セーブには 入れていない。プレイヤーの まわりに わいて、遠くに 行くと 消える。
// そうすると「つづきから」の 中身が ふえないし、
// 世界の どこかに 何百ひきも たまっていく こともない。
//
// 絵は はこを 何こか 組みあわせた だけ。毎コマ 世界の 座標で
// はこを 作りなおして 1つの バッファに まとめ、1回で 描く。
// （ブロックと 同じ シェーダを つかう。テクスチャも 同じ 1 まい）

'use strict';

const MOB = {
  villager: {
    name: '村人', hp: 6, speed: 1.5, w: 0.30, h: 1.8, eye: 1.5,
    friendly: true, say: ['やあ！', 'いい 天気だね', 'ここは いい 村だよ',
                          'ほらあなは あぶないよ', 'よく 来たね'],
  },
  slime: {
    name: 'スライム', hp: 4, speed: 2.5, w: 0.42, h: 0.9, eye: 0.7,
    dmg: 1, hop: true, sight: 15,
  },
  ghost: {
    name: 'おばけ', hp: 3, speed: 2.1, w: 0.36, h: 1.5, eye: 1.2,
    dmg: 1, fly: true, sight: 17, dark: true,
  },
};

const M = {
  list: [],
  spawnT: 0,
  hurtT: 0,        // プレイヤーが つづけて やられない ための まち時間
  buf: null,
  n: 0,
};

// --- わく・消える -------------------------------------------------------------

function mobCount(type) {
  let n = 0;
  for (const m of M.list) if (m.type === type && !m.dead) n++;
  return n;
}

// 立てる ところか（足もとが かたく、頭の ぶんが あいている）
function standOK(x, y, z) {
  if (y < 2 || y > CY - 3) return false;
  if (!isSolid(getBlock(x, y - 1, z))) return false;
  if (getBlock(x, y, z) !== 0 || getBlock(x, y + 1, z) !== 0) return false;
  return true;
}

function spawnMob(type, x, y, z) {
  const t = MOB[type];
  M.list.push({
    type, x: x + 0.5, y, z: z + 0.5, vx: 0, vy: 0, vz: 0,
    yaw: Math.random() * 6.283, hp: t.hp, dead: 0,
    wanderT: 0, tx: 0, tz: 0, onGround: false, hurt: 0, hop: 0,
    saidT: 0,
  });
}

function updateSpawns(dt) {
  M.spawnT -= dt;
  if (M.spawnT > 0) return;
  M.spawnT = 1.2;

  const px = Math.floor(P.x), py = Math.floor(P.y), pz = Math.floor(P.z);

  // 村人。村の 中に いるときだけ、8ひき まで。
  const st = structAt(px, pz);
  if (st && mobCount('villager') < 8) {
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * 6.283, d = 6 + Math.random() * (st.r - 8);
      const x = Math.round(st.x + Math.cos(a) * d), z = Math.round(st.z + Math.sin(a) * d);
      if (Math.hypot(x - P.x, z - P.z) < 6) continue;         // 目のまえには 出さない
      const y = st.y + 1;
      if (!standOK(x, y, z)) continue;
      spawnMob('villager', x, y, z);
      break;
    }
  }

  // 敵。ONにしていて、そうぞうモードで ないときだけ。
  if (!save.enemies || P.creative) return;
  const night = dayLight() < 0.45;
  const cap = night ? 8 : 5;
  if (mobCount('slime') + mobCount('ghost') >= cap) return;
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * 6.283, d = 16 + Math.random() * 18;
    const x = Math.round(P.x + Math.cos(a) * d), z = Math.round(P.z + Math.sin(a) * d);
    const surf = surfaceAt(x, z);
    // 地上（夜だけ）か、地下の くらい ところ
    const cands = [];
    if (night && standOK(x, surf + 1, z)) cands.push(surf + 1);
    for (let y = Math.max(6, py - 12); y < Math.min(CY - 3, py + 8); y++) {
      if (y >= surf - 2) continue;
      if (standOK(x, y, z)) cands.push(y);
    }
    if (!cands.length) continue;
    const y = cands[(Math.random() * cands.length) | 0];
    if (structAt(x, z)) continue;                             // 村や街の 中には 出さない
    const deep = y < surf - 4;
    // おばけは 地下が おおい。地上でも よるなら たまに 出る。
    const gh = Math.random() < (deep ? 0.55 : 0.25);
    spawnMob(gh ? 'ghost' : 'slime', x, y, z);
    break;
  }
}

// --- うごき -------------------------------------------------------------------

function mobHits(m, x, y, z) {
  const t = MOB[m.type];
  const x0 = Math.floor(x - t.w), x1 = Math.floor(x + t.w);
  const y0 = Math.floor(y), y1 = Math.floor(y + t.h - 0.001);
  const z0 = Math.floor(z - t.w), z1 = Math.floor(z + t.w);
  for (let yy = y0; yy <= y1; yy++) {
    for (let zz = z0; zz <= z1; zz++) {
      for (let xx = x0; xx <= x1; xx++) {
        if (isSolid(getBlock(xx, yy, zz))) return true;
      }
    }
  }
  return false;
}

function updateMobs(dt) {
  updateSpawns(dt);
  if (M.hurtT > 0) M.hurtT -= dt;

  for (let i = M.list.length - 1; i >= 0; i--) {
    const m = M.list[i];
    const t = MOB[m.type];
    if (m.dead) {
      m.dead += dt;
      if (m.dead > 0.45) M.list.splice(i, 1);
      continue;
    }
    const dx = P.x - m.x, dz = P.z - m.z, dy = P.y - m.y;
    const far = Math.hypot(dx, dz);
    if (far > 74 || Math.abs(dy) > 42) { M.list.splice(i, 1); continue; }
    if (m.hurt > 0) m.hurt -= dt;

    // どこへ 行くか きめる
    let wantX = 0, wantZ = 0;
    const chase = !t.friendly && far < t.sight && Math.abs(dy) < 6;
    if (chase) {
      m.yaw = Math.atan2(dx, dz);
      wantX = dx / (far || 1); wantZ = dz / (far || 1);
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 1.5 + Math.random() * 3;
        if (Math.random() < 0.3) { m.tx = 0; m.tz = 0; }       // ときどき 立ちどまる
        else {
          const a = Math.random() * 6.283;
          m.tx = Math.cos(a); m.tz = Math.sin(a);
          m.yaw = Math.atan2(m.tx, m.tz);
        }
      }
      wantX = m.tx; wantZ = m.tz;
    }

    const spd = t.speed * (m.type === 'slime' && m.onGround ? 1 : 1);
    if (t.fly) {
      // おばけは ふわふわ 浮かぶ
      m.vx += (wantX * spd - m.vx) * Math.min(1, dt * 3);
      m.vz += (wantZ * spd - m.vz) * Math.min(1, dt * 3);
      const wantY = chase ? Math.max(-1, Math.min(1, dy + 0.6)) : Math.sin(game_t() * 1.3 + m.yaw) * 0.6;
      m.vy += (wantY - m.vy) * Math.min(1, dt * 2);
    } else {
      m.vx += (wantX * spd - m.vx) * Math.min(1, dt * (m.onGround ? 10 : 2));
      m.vz += (wantZ * spd - m.vz) * Math.min(1, dt * (m.onGround ? 10 : 2));
      m.vy -= 26 * dt;
      if (m.vy < -40) m.vy = -40;
      // スライムは ぴょんぴょん はねる
      if (t.hop && m.onGround) {
        m.hop -= dt;
        if (m.hop <= 0 && (chase || Math.random() < 0.4)) { m.vy = 6.2; m.hop = 0.7; }
      }
      // 目のまえが かべなら ジャンプ（1 ブロックは のぼれる）
      if (m.onGround && !t.hop) {
        const fx = m.x + Math.sin(m.yaw) * 0.6, fz = m.z + Math.cos(m.yaw) * 0.6;
        if (mobHits(m, fx, m.y, fz) && !mobHits(m, fx, m.y + 1.05, fz)) m.vy = 7.4;
      }
    }

    // ぶつかりながら すすむ
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(m.vx), Math.abs(m.vy),
                                                 Math.abs(m.vz)) * dt / 0.4));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      let nx = m.x + m.vx * sdt;
      if (mobHits(m, nx, m.y, m.z)) { m.vx = 0; nx = m.x; m.wanderT = 0; }
      m.x = nx;
      let nz = m.z + m.vz * sdt;
      if (mobHits(m, m.x, m.y, nz)) { m.vz = 0; nz = m.z; m.wanderT = 0; }
      m.z = nz;
      const ny = m.y + m.vy * sdt;
      if (mobHits(m, m.x, ny, m.z)) {
        if (m.vy < 0) {
          let g = Math.floor(ny) + 1;
          for (let k = 0; k < 4 && mobHits(m, m.x, g, m.z); k++) g++;
          m.y = g;
        }
        m.vy = 0;
      } else m.y = ny;
    }
    m.onGround = t.fly ? false : mobHits(m, m.x, m.y - 0.06, m.z) && m.vy <= 0.0001;
    if (m.y < -6) { M.list.splice(i, 1); continue; }

    // さわられたら いたい
    if (!t.friendly && !P.creative && far < 1.1 && Math.abs(m.y - P.y) < 2) {
      if (M.hurtT <= 0) {
        M.hurtT = 0.9;
        P.hp = Math.max(0, P.hp - t.dmg);
        P.hurtFlash = 0.4;
        // すこし はじきとばす
        P.vx += dx / (far || 1) * 5;
        P.vz += dz / (far || 1) * 5;
        P.vy = 4;
      }
    }
    // 村人は ちかづくと しゃべる
    if (t.friendly && far < 3.2) {
      m.saidT -= dt;
      if (m.saidT <= 0) {
        m.saidT = 9 + Math.random() * 8;
        say(t.say[(Math.random() * t.say.length) | 0]);
      }
    }
  }
}

// いま 見ている 生きもの（なぐる ため）
function mobLookedAt() {
  const d = lookVec(P.yaw, P.pitch);
  const ex = P.x, ey = eyeY(), ez = P.z;
  let best = null, bestT = 4.2;
  for (const m of M.list) {
    if (m.dead) continue;
    const t = MOB[m.type];
    // かんたんな 球で あたり判定
    const cx = m.x - ex, cy = m.y + t.h * 0.5 - ey, cz = m.z - ez;
    const along = cx * d.x + cy * d.y + cz * d.z;
    if (along < 0 || along > bestT) continue;
    const ox = cx - d.x * along, oy = cy - d.y * along, oz = cz - d.z * along;
    // あたる はんいは 生きものの 大きさから 決める。
    // 一律に せまくすると、スライムの ような 背の ひくい ものが
    // ほとんど なぐれなくなる（ゆびで あそぶには つらい）。
    // ゆびで ねらうのは 正かくには できないので、たてには とくに 甘くする。
    // きびしくすると、スライムの ような 背の ひくい ものは
    // まっすぐ 見ても あたらない（目の 高さより 1.2 ブロック 下に いるため）。
    const rad = Math.max(t.w * 1.7, t.h * 0.55) + 0.45;
    if (ox * ox + oy * oy * 0.55 + oz * oz > rad * rad) continue;
    best = m; bestT = along;
  }
  return best;
}

function hitMob(m) {
  const t = MOB[m.type];
  m.hp -= 2;
  m.hurt = 0.25;
  const dx = m.x - P.x, dz = m.z - P.z, d = Math.hypot(dx, dz) || 1;
  m.vx += dx / d * 7; m.vz += dz / d * 7; m.vy = 5;
  if (m.hp <= 0) {
    m.dead = 0.001;
    if (t.friendly) say('村人を おこらせちゃった…');
    else {
      say(t.name + 'を たおした！');
      if (!P.creative && Math.random() < 0.6) {
        invAdd(m.type === 'slime' ? ID.tallgrass : ID.coal_ore, 1);
      }
    }
  } else if (t.friendly) {
    // 村人は にげる
    m.tx = dx / d; m.tz = dz / d; m.wanderT = 3;
  }
}

function clearMobs() { M.list.length = 0; M.spawnT = 0; }

// --- 絵 -----------------------------------------------------------------------
//
// はこ 1つ ＝ 6 めん。世界の 座標で 作って、まとめて 1回で 描く。

let MB = new ArrayBuffer(1 << 16);
let MB16 = new Int16Array(MB), MBU16 = new Uint16Array(MB), MBU8 = new Uint8Array(MB);
let MBN = 0;
let mobOrgX = 0, mobOrgZ = 0;

// l=面のむき（かたむき）、sky=空の 明るさ、bl=たいまつの 明るさ。
// ブロックと 同じ 分けかたに しておかないと、
// シェーダの 中で もう一度 夜の ぶんが かかって まっ黒に なる。
function mv(x, y, z, u, v, l, sky, bl) {
  if (MBN + 16 > MB.byteLength) {
    const nb = new ArrayBuffer(MB.byteLength * 2);
    new Uint8Array(nb).set(new Uint8Array(MB));
    MB = nb; MB16 = new Int16Array(MB); MBU16 = new Uint16Array(MB); MBU8 = new Uint8Array(MB);
  }
  const i = MBN >> 1;
  MB16[i] = ((x - mobOrgX) * 16) | 0;
  MB16[i + 1] = (y * 16) | 0;
  MB16[i + 2] = ((z - mobOrgZ) * 16) | 0;
  MBU16[i + 3] = (u * 65535) | 0;
  MBU16[i + 4] = (v * 65535) | 0;
  MBU8[MBN + 10] = (l * 255) | 0;
  MBU8[MBN + 11] = (sky * 255) | 0;
  MBU8[MBN + 12] = (bl * 255) | 0;
  MBU8[MBN + 13] = 255;
  MBN += 16;
}

// 中心 (cx,cy,cz)、大きさ (w,h,d)、yaw だけ まわして 置く
function mobBox(cx, cy, cz, w, h, d, yaw, tile, lit) {
  const sky = lit.sky, bl = lit.blk;
  const uv = uvOf(tile);
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const P8 = [];
  for (let i = 0; i < 8; i++) {
    const lx = (i & 1) ? hw : -hw;
    const ly = (i & 2) ? hh : -hh;
    const lz = (i & 4) ? hd : -hd;
    P8.push([cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c]);
  }
  // めんごとの かど（外から 見て 反時計まわり）と 明るさ
  const F = [
    [[0, 4, 6, 2], 0.72], [[5, 1, 3, 7], 0.72],      // -x  +x
    [[4, 5, 7, 6], 0.88], [[1, 0, 2, 3], 0.88],      // +z  -z
    [[2, 6, 7, 3], 1.00], [[4, 0, 1, 5], 0.55],      // 上 下
  ];
  for (const [idx, br] of F) {
    const l = br;
    const uu = [[0, 1], [1, 1], [1, 0], [0, 0]];
    const q = [];
    for (let k = 0; k < 4; k++) {
      q.push([P8[idx[k]], uv[0] + (uv[2] - uv[0]) * uu[k][0],
              uv[1] + (uv[3] - uv[1]) * uu[k][1]]);
    }
    for (const k of [0, 1, 2, 0, 2, 3]) {
      mv(q[k][0][0], q[k][0][1], q[k][0][2], q[k][1], q[k][2], l, sky, bl);
    }
  }
}

const _mlBuf = [];
function mobLight(m) {
  const mx = Math.floor(m.x), my = Math.floor(m.y + 1), mz = Math.floor(m.z);
  const sky = skyLightAt(mx, my, mz);
  // ちかくの たいまつ・ひかりいし
  let blk = 0;
  const near = lightsNear(Math.floor(m.x / CH), Math.floor(m.z / CH), _mlBuf);
  for (let i = 0; i < near.length; i++) {
    const L = near[i];
    const d = Math.abs(L.x - mx) + Math.abs(L.y - my) + Math.abs(L.z - mz);
    const v = L.v * (1 - d / 9);
    if (v > blk) blk = v;
  }
  return { sky, blk: Math.max(0.12, blk) };   // まっ黒には しない
}

function buildMobMesh() {
  MBN = 0;
  mobOrgX = Math.round(P.x); mobOrgZ = Math.round(P.z);
  for (const m of M.list) {
    const t = MOB[m.type];
    if (Math.abs(m.x - P.x) > 68 || Math.abs(m.z - P.z) > 68) continue;
    const lit = mobLight(m);
    if (m.hurt > 0) { lit.sky = 1; lit.blk = 1; }   // なぐられた しゅんかん 光る
    const squash = m.dead ? Math.max(0.1, 1 - m.dead / 0.45) : 1;
    const y = m.y;
    if (m.type === 'villager') {
      mobBox(m.x, y + 1.35 * squash, m.z, 0.5, 0.5, 0.5, m.yaw, TILE.vil_face, lit);
      mobBox(m.x, y + 0.78 * squash, m.z, 0.55, 0.72, 0.34, m.yaw, TILE.vil_body, lit);
      const sw = Math.sin(game_t() * 5 + m.x) * 0.18 * (Math.hypot(m.vx, m.vz) > 0.4 ? 1 : 0);
      for (const sgn of [-1, 1]) {
        const ax = m.x + Math.cos(m.yaw) * sgn * 0.36;
        const az = m.z - Math.sin(m.yaw) * sgn * 0.36;
        mobBox(ax, y + 0.78 * squash, az, 0.18, 0.66, 0.18, m.yaw, TILE.vil_body, lit);
        mobBox(m.x + Math.cos(m.yaw) * sgn * 0.14 + Math.sin(m.yaw) * sw * sgn,
               y + 0.2 * squash,
               m.z - Math.sin(m.yaw) * sgn * 0.14 + Math.cos(m.yaw) * sw * sgn,
               0.2, 0.42, 0.2, m.yaw, TILE.vil_leg, lit);
      }
    } else if (m.type === 'slime') {
      const b = m.onGround ? 1 : 0.85;
      mobBox(m.x, y + 0.42 * squash, m.z, 0.84 * b, 0.8 * squash / b, 0.84 * b,
             m.yaw, TILE.slime_skin, lit);
      mobBox(m.x, y + 0.2 * squash, m.z, 0.5, 0.2, 0.5, m.yaw, TILE.slime_skin, lit);
    } else {
      const bob = Math.sin(game_t() * 2 + m.x) * 0.12;
      mobBox(m.x, y + 0.9 + bob, m.z, 0.62, 0.7, 0.5, m.yaw, TILE.ghost_skin, lit);
      mobBox(m.x, y + 0.35 + bob, m.z, 0.5, 0.44, 0.4, m.yaw, TILE.ghost_skin, lit);
    }
  }
  M.n = MBN / 16;
  return M.n;
}

function drawMobs() {
  if (!buildMobMesh()) return;
  const gl = R.gl;
  if (!M.buf) M.buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, M.buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(MB, 0, MBN), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(R.loc.aPos, 3, gl.SHORT, false, 16, 0);
  gl.vertexAttribPointer(R.loc.aUV, 2, gl.UNSIGNED_SHORT, true, 16, 6);
  gl.vertexAttribPointer(R.loc.aLit, 4, gl.UNSIGNED_BYTE, true, 16, 10);
  gl.uniform3f(R.loc.uOrg, mobOrgX, 0, mobOrgZ);
  gl.drawArrays(gl.TRIANGLES, 0, M.n);
}
