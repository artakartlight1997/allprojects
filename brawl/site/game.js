// エイトくんの ベルトスクロール。
// 「くにおくん」「ファイナルファイト」みたいな ベルトスクロール アクション。
// てまえ・おく にも うごける みちを すすみながら、いたずら まものを パンチと キックで おいはらう。
// たおした まものは ほしに なって きえる。4ステージ、さいごに おやぶんが いる。
//   ひだりの スティック（やじるしキー）… いどう
//   パンチ（Z）… 3かい つづけると ふっとばす　ジャンプ（X）… とんで いる ときに パンチで とびげり
//   ひっさつ（C）… ゲージが たまったら まわりを まとめて ふっとばす

'use strict';

const SAVE = 'eitobrawl.v1';
const FLOOR0 = 300, FLOOR1 = 500;
const STAGES = [
  { name: 'こうえん', sky: ['#9AD8FF', '#E8F8FF'], ground: '#9ADA7A', far: 'tree', len: 2600, waves: [['imp', 'imp'], ['imp', 'imp', 'bird'], ['imp', 'robo', 'imp']], boss: 'bigimp' },
  { name: 'しょうてんがい', sky: ['#FFC89A', '#FFF0D8'], ground: '#C8B8A8', far: 'shop', len: 2800, waves: [['imp', 'bird', 'imp'], ['robo', 'imp', 'imp', 'bird'], ['robo', 'robo', 'imp']], boss: 'bigrobo' },
  { name: 'こうじょう', sky: ['#8A9AB0', '#D0D8E0'], ground: '#8A8A98', far: 'factory', len: 3000, waves: [['robo', 'imp', 'bird', 'imp'], ['robo', 'robo', 'bird', 'bird'], ['robo', 'imp', 'robo', 'imp', 'bird']], boss: 'bigbird' },
  { name: 'まものの おしろ', sky: ['#2A1A4A', '#5A3A7A'], ground: '#6A5A7A', far: 'castle', len: 3200, waves: [['robo', 'robo', 'imp', 'bird'], ['imp', 'imp', 'robo', 'bird', 'bird'], ['robo', 'robo', 'robo', 'imp']], boss: 'king' },
];
const EN = {
  imp:     { name: 'いたずらっこ', hp: 26, spd: 90, atk: 7, reach: 50, col: '#FF7A6A', size: 0.8, xp: 1 },
  bird:    { name: 'いたずらカラス', hp: 18, spd: 150, atk: 6, reach: 46, col: '#4A4458', size: 0.7, fly: 1, xp: 1 },
  robo:    { name: 'いたずらロボ', hp: 50, spd: 60, atk: 11, reach: 58, col: '#9AA8C0', size: 1.0, xp: 2 },
  bigimp:  { name: 'おおいたずらっこ', hp: 170, spd: 80, atk: 12, reach: 70, col: '#E84A4A', size: 1.6, boss: 1, xp: 8 },
  bigrobo: { name: 'メガロボ', hp: 240, spd: 55, atk: 15, reach: 80, col: '#6A7A9A', size: 1.7, boss: 1, xp: 8 },
  bigbird: { name: 'カラスの おやぶん', hp: 220, spd: 120, atk: 13, reach: 70, col: '#2A2438', size: 1.5, fly: 1, boss: 1, xp: 8 },
  king:    { name: 'まもの キング', hp: 360, spd: 75, atk: 16, reach: 86, col: '#7A3AA8', size: 1.9, boss: 1, xp: 12 },
};

const sv = Object.assign({ clear: 0, best: {} }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0, stick: null };

function startStage(i) {
  const S = STAGES[i];
  G.mode = 'play';
  G.P = { si: i, S, hp: 100, x: 120, y: 420, z: 0, vz: 0, dir: 1, combo: 0, comboT: 0, atkT: 0, hurt: 0, sp: 0, spin: 0, camX: 0, lock: null,
    wave: 0, en: [], fx: [], items: [], crates: [], t: 0, over: 0, win: 0, go: 0, msg: 'ステージ ' + (i + 1) + '　' + S.name, msgT: 2.2, kills: 0 };
  // はこ（こわすと たべもの）
  for (let k = 0; k < 3; k++) G.P.crates.push({ x: 600 + k * 800, y: 340 + (k % 2) * 110, hp: 1 });
}
function waveX(P, w) { return 500 + w * ((P.S.len - 900) / (P.S.waves.length)); }
function spawnWave(P) {
  const list = P.wave < P.S.waves.length ? P.S.waves[P.wave] : [P.S.boss];
  P.lock = P.camX;
  list.forEach((k, j) => {
    const E = EN[k], side = j % 2 ? -1 : 1;
    P.en.push({ k, E, hp: E.hp, x: P.camX + (side > 0 ? VW + 60 + j * 70 : -60 - j * 50), y: FLOOR0 + 30 + Math.random() * (FLOOR1 - FLOOR0 - 60), z: E.fly ? 60 : 0,
      dir: -side, state: 'walk', t: Math.random(), wind: 0, stun: 0, kb: 0, down: 0 });
  });
  if (list.length === 1 && EN[list[0]].boss) { P.msg = EN[list[0]].name + ' が あらわれた！'; P.msgT = 2; jingle([60, 63, 67], 0.15, 'square', 0.12); }
}

// --- エイトくん -----------------------------------------------------------------------

function punch() {
  const P = G.P;
  if (!P || P.over || P.atkT > 0 || P.hurt > 0.2) return;
  if (P.z > 0) { P.atkT = 0.35; P.kick = 1; doHit(78, 34, 14, 260, true); return; }
  P.combo = P.comboT > 0 ? P.combo + 1 : 1;
  if (P.combo > 3) P.combo = 1;
  P.comboT = 0.55; P.atkT = P.combo === 3 ? 0.32 : 0.2; P.kick = P.combo === 3;
  doHit(P.combo === 3 ? 80 : 66, 32, P.combo === 3 ? 13 : 8, P.combo === 3 ? 320 : 40, P.combo === 3);
  tone(P.combo === 3 ? 260 : 380, 0.06, 'square', 0.07);
}
function jump() { const P = G.P; if (!P || P.over || P.z > 0 || P.hurt > 0.2) return; P.vz = 520; tone(500, 0.08, 'triangle', 0.07, 800); }
function special() {
  const P = G.P;
  if (!P || P.over || P.sp < 100) return;
  P.sp = 0; P.spin = 0.7; P.atkT = 0.7;
  doHit(150, 90, 24, 420, true, true);
  jingle([72, 79, 84, 91], 0.05, 'square', 0.12);
  P.fx.push({ kind: 'ring', x: P.x, y: P.y, t: 0 });
}
function doHit(range, depth, dmg, kb, knock, around) {
  const P = G.P;
  let hit = false;
  for (const e of P.en) {
    if (e.hp <= 0) continue;
    const dx = e.x - P.x, dy = e.y - P.y;
    const inFront = around ? Math.abs(dx) < range : (dx * P.dir > -10 && Math.abs(dx) < range + e.E.size * 20);
    if (!inFront || Math.abs(dy) > depth + e.E.size * 6) continue;
    if (e.z > 40 && P.z < 20 && !around) continue;    // そらの カラスは とびげり で
    e.hp -= dmg; hit = true;
    // おやぶんは ちいさな パンチでは ひるまない（3だんめ・とびげり・ひっさつ だけ）
    if (!e.E.boss || knock) { e.stun = 0.35; e.wind = 0; }
    if (knock) { e.kb = kb * Math.sign(dx || P.dir); e.down = e.E.boss ? 0.4 : 1.0; }
    P.sp = Math.min(100, P.sp + 9);
    P.fx.push({ kind: 'pow', x: (P.x + e.x) / 2, y: e.y - 60 * e.E.size - e.z, t: 0, s: dmg >= 13 ? 'ドカッ！' : 'ポカ' });
    if (e.hp <= 0) { P.kills++; P.fx.push({ kind: 'star', x: e.x, y: e.y - 40, t: 0 }); tone(880, 0.1, 'triangle', 0.1, 1400); }
  }
  for (const c of P.crates) {
    if (c.hp <= 0) continue;
    if (Math.abs(c.x - P.x) < range && Math.abs(c.y - P.y) < depth + 10 && (c.x - P.x) * P.dir > -10) {
      c.hp = 0; hit = true; noise(0.2, 0.1, 900);
      P.items.push({ x: c.x, y: c.y, k: pick(['onigiri', 'apple', 'cake']) });
    }
  }
  if (hit) noise(0.08, 0.12, 2000);
}

function updatePlay(dt) {
  const P = G.P, S = P.S;
  P.t += dt;
  if (P.msgT > 0) P.msgT -= dt;
  for (const f of P.fx) f.t += dt;
  P.fx = P.fx.filter((f) => f.t < (f.kind === 'star' ? 0.8 : 0.5));
  if (P.over) { P.over += dt; return; }
  // いどう
  let mx = 0, my = 0;
  if (KEYS.ArrowLeft) mx -= 1; if (KEYS.ArrowRight) mx += 1; if (KEYS.ArrowUp) my -= 1; if (KEYS.ArrowDown) my += 1;
  if (G.stick) { mx = G.stick.dx; my = G.stick.dy; }
  if (P.atkT > 0) { P.atkT -= dt; mx *= 0.15; my *= 0.15; }
  if (P.hurt > 0) { P.hurt -= dt; mx = my = 0; }
  if (P.comboT > 0) P.comboT -= dt;
  if (P.spin > 0) P.spin -= dt;
  if (mx) P.dir = mx > 0 ? 1 : -1;
  P.moving = Math.hypot(mx, my) > 0.1;
  P.x += mx * 230 * dt; P.y += my * 150 * dt;
  P.y = clamp(P.y, FLOOR0 + 10, FLOOR1);
  const leftLim = P.lock !== null ? P.lock + 30 : P.camX + 30, rightLim = P.lock !== null ? P.lock + VW - 30 : S.len;
  P.x = clamp(P.x, leftLim, rightLim);
  if (P.z > 0 || P.vz > 0) { P.vz -= 1500 * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z === 0) P.vz = 0; }
  // カメラ
  if (P.lock === null) P.camX = clamp(Math.max(P.camX, P.x - VW * 0.45), 0, S.len - VW);
  // つぎの なみ
  const alive = P.en.filter((e) => e.hp > 0);
  if (P.lock === null) {
    const nextX = P.wave < S.waves.length ? waveX(P, P.wave) : S.len - VW;
    if (P.camX >= Math.min(nextX, S.len - VW) - 1 && P.wave <= S.waves.length && !P.bossDone) spawnWave(P);
  } else if (!alive.length) {
    P.lock = null; P.en = [];
    if (P.wave >= S.waves.length) { stageClear(); return; }
    P.wave++; P.go = 2.5;
  }
  if (P.go > 0) P.go -= dt;
  // まもの
  for (const e of P.en) {
    if (e.hp <= 0) continue;
    e.t += dt;
    if (e.kb) { e.x += e.kb * dt; e.kb *= Math.exp(-5 * dt); if (Math.abs(e.kb) < 10) e.kb = 0; }
    // がめんに はいったら、なみの あいだは がめんの 中に とどまる（とどかない ところへ いかない）
    if (P.lock !== null) { if (e.x > P.lock + 30 && e.x < P.lock + VW - 30) e.entered = 1; if (e.entered) e.x = clamp(e.x, P.lock + 30, P.lock + VW - 30); }
    if (e.down > 0) { e.down -= dt; continue; }
    if (e.stun > 0) { e.stun -= dt; continue; }
    const dx = P.x - e.x, dy = P.y - e.y, E = e.E;
    e.dir = dx > 0 ? 1 : -1;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0) {
        // こうげき！
        if (Math.abs(dx) < E.reach + 14 && Math.abs(dy) < 30 + E.size * 8 && P.z < 40 && P.spin <= 0) {
          P.hp -= E.atk; P.hurt = 0.45; P.x -= Math.sign(dx) * -30; P.combo = 0;
          P.fx.push({ kind: 'pow', x: P.x, y: P.y - 90, t: 0, s: 'いてっ' }); tone(180, 0.15, 'square', 0.09);
          if (P.hp <= 0) { P.hp = 0; P.over = 0.01; P.win = 0; tone(200, 0.6, 'triangle', 0.1, 90); }
        }
        e.rest = 0.8 + Math.random() * 0.8;
      }
      continue;
    }
    if (e.rest > 0) { e.rest -= dt; continue; }
    if (Math.abs(dx) < E.reach && Math.abs(dy) < 20) { e.wind = E.boss ? 0.6 - P.si * 0.04 : 0.7; continue; }
    // ちかづく（すこし ずらして かこむ）
    const ty = P.y + Math.sin(e.t + e.x) * 20, tx = P.x - Math.sign(dx) * (E.reach - 10);
    e.x += clamp(tx - e.x, -1, 1) * E.spd * dt * (Math.abs(tx - e.x) > 4 ? 1 : 0);
    e.y += clamp(ty - e.y, -1, 1) * E.spd * 0.7 * dt;
    e.y = clamp(e.y, FLOOR0 + 10, FLOOR1);
  }
  // たべもの
  for (const it of P.items) if (!it.got && Math.abs(it.x - P.x) < 40 && Math.abs(it.y - P.y) < 26) { it.got = 1; P.hp = Math.min(100, P.hp + 30); P.fx.push({ kind: 'pow', x: it.x, y: it.y - 40, t: 0, s: 'げんき +30' }); jingle([79, 84], 0.06, 'triangle', 0.1); }
}
function stageClear() {
  const P = G.P;
  P.over = 0.01; P.win = 1;
  sv.clear = Math.max(sv.clear, P.si + 1);
  const t = Math.round(P.t);
  if (!sv.best[P.si] || t < sv.best[P.si]) sv.best[P.si] = t;
  save();
  jingle([72, 76, 79, 84, 88, 91], 0.1, 'square', 0.14);
}

// --- え -------------------------------------------------------------------------------

function drawBg(P, t) {
  const S = P.S;
  ctx.fillStyle = grad(0, FLOOR0, S.sky[0], S.sky[1]); ctx.fillRect(0, 0, VW, FLOOR0);
  // とおくの けしき（ゆっくり うごく）
  const off = -(P.camX * 0.4) % 240;
  for (let i = -1; i < VW / 240 + 2; i++) {
    const x = off + i * 240;
    if (S.far === 'tree') { fillR(x + 60, 180, 14, 110, '#7A5234'); fillC(x + 67, 170, 50, '#4AA05A'); fillC(x + 180, 230, 30, '#6AC06A'); }
    else if (S.far === 'shop') { fillR(x + 10, 140, 200, 150, ['#F2E6D0', '#E8D8F0', '#D8E8F8'][((i % 3) + 3) % 3]); fillR(x + 10, 180, 200, 20, ['#E04A6E', '#4A8AE8', '#FFB020'][((i % 3) + 3) % 3]); fillR(x + 40, 210, 140, 70, '#8AC8F0'); }
    else if (S.far === 'factory') { fillR(x + 20, 150, 180, 140, '#6A6A7A'); fillR(x + 140, 80, 24, 80, '#5A5A6A'); fillC(x + 152 + Math.sin(t) * 4, 70, 14, 'rgba(230,230,240,0.6)'); for (let k = 0; k < 3; k++) fillR(x + 40 + k * 50, 190, 30, 20, '#FFE890'); }
    else { fillR(x + 30, 120, 160, 170, '#3A2A5A'); for (let k = 0; k < 4; k++) fillR(x + 30 + k * 44, 104, 28, 18, '#3A2A5A'); fillR(x + 90, 220, 40, 70, '#1A1030'); fillC(x + 110, 160, 10, 'rgba(255,200,80,0.7)'); }
  }
  // みち
  fillR(0, FLOOR0 - 10, VW, VH - FLOOR0 + 10, S.ground);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let x = -(P.camX % 80); x < VW; x += 80) ctx.fillRect(x, FLOOR0 - 10, 3, VH);
  fillR(0, FLOOR0 - 14, VW, 6, 'rgba(0,0,0,0.12)');
}
function drawEnemy(e, sx, t) {
  const E = e.E, s = E.size, y = e.y - e.z - (E.fly ? 40 + Math.sin(t * 6 + e.x) * 8 : 0);
  ellipse(sx, e.y, 26 * s, 7 * s); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
  ctx.save(); ctx.translate(sx, y);
  if (e.down > 0 && !E.boss) ctx.rotate(e.dir * -1.2);
  ctx.scale(e.dir, 1);
  if (e.stun > 0 && Math.floor(t * 30) % 2) ctx.globalAlpha = 0.6;
  const flash = e.wind > 0 && Math.floor(t * 12) % 2;
  if (e.k === 'bird' || e.k === 'bigbird') {
    fillC(0, -30 * s, 26 * s, E.col);
    ctx.fillStyle = E.col; ctx.beginPath(); ctx.moveTo(-10 * s, -34 * s); ctx.lineTo(-50 * s, -60 * s + Math.sin(t * 14) * 14 * s); ctx.lineTo(-20 * s, -20 * s); ctx.fill();
    ctx.fillStyle = '#FFB020'; ctx.beginPath(); ctx.moveTo(22 * s, -34 * s); ctx.lineTo(38 * s, -28 * s); ctx.lineTo(22 * s, -24 * s); ctx.fill();
    fillC(12 * s, -38 * s, 6 * s, '#FFFFFF'); fillC(14 * s, -38 * s, 3 * s, '#2A2028');
  } else if (e.k === 'robo' || e.k === 'bigrobo') {
    fillRR(-22 * s, -70 * s, 44 * s, 40 * s, 8 * s, E.col);
    fillRR(-18 * s, -64 * s, 36 * s, 16 * s, 5 * s, '#1E2432'); fillC(-7 * s, -56 * s, 4 * s, '#FF5A5A'); fillC(9 * s, -56 * s, 4 * s, '#FF5A5A');
    fillRR(-26 * s, -32 * s, 52 * s, 32 * s, 8 * s, shadeHex(E.col, 0.85));
    fillR(-2 * s, -84 * s, 4 * s, 14 * s, '#6A6A7A'); fillC(0, -86 * s, 4 * s, '#FFE066');
    fillRR(20 * s, -30 * s + (flash ? -10 : 0), 16 * s, 10 * s, 4 * s, '#6A6A7A');
  } else {
    // いたずらっこ おに（つの つき）
    fillRR(-20 * s, -40 * s, 40 * s, 40 * s, 12 * s, E.col);
    fillC(0, -54 * s, 22 * s, E.col);
    ctx.fillStyle = '#FFF4D8'; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 8 * s, -72 * s); ctx.lineTo(sg * 12 * s, -86 * s); ctx.lineTo(sg * 16 * s, -70 * s); ctx.fill(); }
    fillC(6 * s, -56 * s, 5 * s, '#FFFFFF'); fillC(8 * s, -56 * s, 2.5 * s, '#2A2028');
    fillRR(16 * s, -34 * s + (flash ? -8 : 0), 14 * s, 10 * s, 4 * s, shadeHex(E.col, 0.8));
    if (e.k === 'king') { ctx.fillStyle = '#FFD24A'; ctx.beginPath(); ctx.moveTo(-16 * s, -72 * s); ctx.lineTo(-16 * s, -88 * s); ctx.lineTo(-6 * s, -80 * s); ctx.lineTo(0, -92 * s); ctx.lineTo(6 * s, -80 * s); ctx.lineTo(16 * s, -88 * s); ctx.lineTo(16 * s, -72 * s); ctx.fill(); }
  }
  if (flash) { ctx.globalAlpha = 0.5; fillC(20 * s, -40 * s, 16 * s, '#FFFFFF'); }
  ctx.restore();
  if (E.boss || e.hp < E.hp) { fillRR(sx - 30, y - 100 * s - 10, 60, 6, 3, 'rgba(0,0,0,0.3)'); fillRR(sx - 30, y - 100 * s - 10, 60 * Math.max(0, e.hp) / E.hp, 6, 3, '#FF6A6A'); }
}
function shadeHex(c, k) { const n = parseInt(c.slice(1), 16); return 'rgb(' + Math.round(((n >> 16) & 255) * k) + ',' + Math.round(((n >> 8) & 255) * k) + ',' + Math.round((n & 255) * k) + ')'; }
function drawItem(it, sx) {
  if (it.k === 'onigiri') { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(sx, it.y - 30); ctx.lineTo(sx + 16, it.y - 4); ctx.lineTo(sx - 16, it.y - 4); ctx.fill(); fillR(sx - 8, it.y - 14, 16, 10, '#2A3A2A'); }
  else if (it.k === 'apple') { fillC(sx, it.y - 14, 12, '#E84A4A'); fillR(sx - 1, it.y - 30, 3, 6, '#6A4A30'); }
  else { fillRR(sx - 14, it.y - 22, 28, 18, 4, '#FFF0C0'); fillR(sx - 14, it.y - 22, 28, 6, '#FF8FB8'); fillC(sx, it.y - 26, 5, '#E84A4A'); }
}

function drawPlay(t) {
  const P = G.P;
  drawBg(P, t);
  const list = [];
  for (const c of P.crates) if (c.hp > 0) list.push({ y: c.y, f: () => { const sx = c.x - P.camX; fillRR(sx - 26, c.y - 46, 52, 46, 4, '#B8864E'); ctx.strokeStyle = '#8A5A34'; ctx.lineWidth = 3; ctx.strokeRect(sx - 26, c.y - 46, 52, 46); ctx.beginPath(); ctx.moveTo(sx - 26, c.y - 46); ctx.lineTo(sx + 26, c.y); ctx.stroke(); } });
  for (const it of P.items) if (!it.got) list.push({ y: it.y, f: () => drawItem(it, it.x - P.camX) });
  for (const e of P.en) if (e.hp > 0) list.push({ y: e.y, f: () => drawEnemy(e, e.x - P.camX, t) });
  list.push({ y: P.y, f: () => {
    const sx = P.x - P.camX;
    if (P.spin > 0) { ctx.save(); ctx.translate(sx, P.y - 50); ctx.rotate(t * 30); fillC(0, 0, 80, 'rgba(255,230,100,0.25)'); ctx.restore(); }
    if (P.hurt > 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.5;
    const pose = P.z > 0 ? (P.atkT > 0 ? 'kick' : 'jump') : P.atkT > 0 ? (P.kick ? 'kick' : 'punch') : P.hurt > 0 ? 'sad' : P.moving ? 'run' : 'stand';
    ellipse(sx, P.y, 26, 7); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    drawKid('eito', sx, P.y - P.z, 120, { t: P.t, pose, dir: P.dir > 0 ? 2 : 1 });
    ctx.globalAlpha = 1;
  } });
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.f();
  for (const f of P.fx) {
    const sx = f.x - P.camX, a = 1 - f.t / (f.kind === 'star' ? 0.8 : 0.5);
    ctx.globalAlpha = Math.max(0, a);
    if (f.kind === 'pow') textO(f.s, sx, f.y - f.t * 30, 22, '#FFE066', '#E04A2A');
    else if (f.kind === 'star') for (let k = 0; k < 6; k++) { const an = k / 6 * 6.28; star(sx + Math.cos(an) * f.t * 90, f.y + Math.sin(an) * f.t * 60, 10); ctx.fillStyle = '#FFE066'; ctx.fill(); }
    else if (f.kind === 'ring') { ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 6; circ(sx, f.y - 40, 40 + f.t * 300); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // HUD
  drawKidFace('eito', 34, 32, 20);
  fillRR(62, 18, 200, 16, 8, 'rgba(0,0,0,0.35)'); fillRR(62, 18, 200 * P.hp / 100, 16, 8, P.hp < 30 ? '#FF6A6A' : '#7FE0A0');
  fillRR(62, 38, 200, 10, 5, 'rgba(0,0,0,0.35)'); fillRR(62, 38, 200 * P.sp / 100, 10, 5, P.sp >= 100 ? '#FFE066' : '#9AB8FF');
  text(P.sp >= 100 ? 'ひっさつ OK！' : 'ひっさつ', 270, 43, 12, P.sp >= 100 ? '#FFE066' : '#FFFFFF', 'left');
  const hx = Math.max(VW / 2, 480);
  text('ステージ ' + (P.si + 1) + '　' + P.S.name, hx, 26, 18, '#FFFFFF', 'center', true, 240);
  fillRR(hx - 100, 40, 200, 8, 4, 'rgba(0,0,0,0.3)'); fillRR(hx - 100, 40, 200 * Math.min(1, P.camX / (P.S.len - VW)), 8, 4, '#FFE066');
  btn(VW - 100, 12, 88, 38, 'やめる', () => { G.mode = 'title'; }, { col: 'rgba(255,255,255,0.8)', size: 14 });
  if (P.go > 0 && Math.floor(P.go * 3) % 2) textO('GO →', VW - 130, 160, 44, '#FFE066', '#E04A2A');
  if (P.msgT > 0) { ctx.globalAlpha = Math.min(1, P.msgT * 2); textO(P.msg, VW / 2, 120, 34, '#FFFFFF', '#2A2440', 'center', VW - 40); ctx.globalAlpha = 1; }
  // タッチ そうさ
  const st = stickBase();
  ctx.globalAlpha = 0.45; fillC(st.x, st.y, 64, '#FFFFFF'); ctx.globalAlpha = 0.8;
  fillC(st.x + (G.stick ? G.stick.dx * 40 : 0), st.y + (G.stick ? G.stick.dy * 40 : 0), 28, '#E8F0FF'); ctx.globalAlpha = 1;
  btn(VW - 250, VH - 96, 110, 84, 'パンチ', punch, { col: 'rgba(255,224,102,0.75)', size: 20 });
  btn(VW - 130, VH - 96, 110, 84, 'ジャンプ', jump, { col: 'rgba(154,216,255,0.75)', size: 18 });
  btn(VW - 250, VH - 150, 230, 46, 'ひっさつ', special, { col: P.sp >= 100 ? '#FF8AA8' : 'rgba(200,200,210,0.6)', off: P.sp < 100, size: 16 });
  if (P.over > 0.8) {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.5)');
    fillRR(VW / 2 - 250, 110, 500, 320, 20, '#FFFFFF');
    textO(P.win ? 'ステージ クリア！' : 'まけちゃった…', VW / 2, 170, 42, P.win ? '#3EC08A' : '#8A9AB0', '#FFFFFF');
    text('おいはらった まもの ' + P.kills + 'ひき　じかん ' + Math.round(P.t) + 'びょう', VW / 2, 222, 18, '#2A2440', 'center');
    drawKid('eito', VW / 2 + 180, 410, 110, { t, pose: P.win ? 'cheer' : 'sad' });
    if (P.win && P.si + 1 < STAGES.length) btn(VW / 2 - 210, 270, 200, 70, 'つぎへ', () => startStage(P.si + 1), { col: '#9AF0B8' });
    else if (P.win) text('ぜんぶ クリア！ まちに へいわが もどった！', VW / 2 - 40, 300, 18, '#E04A7A', 'center');
    btn(VW / 2 - 210, 350, 200, 60, 'もういちど', () => startStage(P.si), { col: '#FFE066', size: 20 });
    btn(VW / 2 + 0, 350, 130, 60, 'タイトル', () => { G.mode = 'title'; }, { col: '#D8E8FF', size: 18 });
  }
}
function stickBase() { return { x: 110, y: VH - 110 }; }

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#3EC08A', '#1E6A4A'); ctx.fillRect(0, 0, VW, VH);
  textO('エイトくんの ベルトスクロール', VW / 2, 60, 42, '#FFFFFF', '#1E4A3A');
  text('いたずら まものを おいはらって、まちを まもれ！', VW / 2, 110, 19, '#DDF8E8', 'center');
  drawKid('eito', VW / 2 - 230, 420, 190, { t, pose: Math.floor(t) % 2 ? 'punch' : 'kick', dir: 2 });
  drawEnemy({ E: EN.imp, k: 'imp', dir: -1, z: 0, y: 410, x: 0, stun: 0, wind: 0, down: 0, hp: EN.imp.hp }, VW / 2 - 60, t);
  STAGES.forEach((S, i) => {
    const open = i <= sv.clear;
    const x = VW / 2 + 20 + (i % 2) * 190, y = 150 + Math.floor(i / 2) * 150;
    btn(x, y, 175, 130, (i + 1) + '. ' + (open ? S.name : '？？？'), () => { if (open) { fullScreen(); startStage(i); } }, { col: open ? (i < sv.clear ? '#9AF0B8' : '#FFFFFF') : 'rgba(150,170,160,0.6)', off: !open, size: 17, sub: i < sv.clear ? 'クリア ' + sv.best[i] + 'びょう' : open ? 'しゅつじん！' : '🔒' });
  });
  const tips = 'スティックで いどう・パンチ 3かいで ふっとばし・ジャンプ中に パンチで とびげり';
  text(tips, VW / 2, VH - 26, 15, '#DDF8E8', 'center', false, VW - 40);
}

startGame({
  bg: '#1E6A4A',
  update(dt) { G.t += dt; if (G.mode === 'play') updatePlay(Math.min(dt, 1 / 30)); },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawPlay(t); },
  down(x, y) { if (G.mode === 'play' && x < VW / 2) { G.stickOn = true; setStick(x, y); } },
  move(x, y, drag) { if (G.mode === 'play' && G.stickOn && drag) setStick(x, y); },
  up() { G.stickOn = false; G.stick = null; },
  key(code, down) {
    if (!down || G.mode !== 'play') return;
    if (code === 'KeyZ' || code === 'Space') punch();
    if (code === 'KeyX') jump();
    if (code === 'KeyC') special();
  },
});
function setStick(x, y) {
  const b = stickBase(), dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy);
  const k = d > 40 ? 40 / d : 1;
  G.stick = { dx: dx * k / 40, dy: dy * k / 40 };
}
