// りなサバイバー 〜まものの よる〜
// こうげきは ぜんぶ じどう。うごいて よけて、まものが おとす ほしを あつめる。
// レベルが 上がったら 3つの 中から 1つ えらんで つよく なる。
// 3ぷん いきのこると ボスが でる。ボスを たおしたら クリア。全3ステージ。

'use strict';

const SAVE = 'rinasurvivor.v1';
const sv = store.get(SAVE, { clear: {}, bestT: {} });
const STAGE_T = 180;

const STAGES = [
  { name: 'ひるの はらっぱ', g1: '#8FD07A', g2: '#7CC066', en: ['slime', 'bat'], boss: 'kingslime', hard: 1 },
  { name: '夜の 小倉城', g1: '#3A4A6A', g2: '#34425E', en: ['bat', 'ghost', 'slime'], boss: 'bigghost', hard: 1.35 },
  { name: '皿倉山の てっぺん', g1: '#4A5A3A', g2: '#425234', en: ['golem', 'ghost', 'bat', 'oni'], boss: 'tengu', hard: 1.55 },
];
const EN = {
  slime:     { hp: 10, sp: 55, dmg: 6, r: 16, col: '#6EC6F5', xp: 1 },
  bat:       { hp: 7,  sp: 95, dmg: 5, r: 13, col: '#9A7AD8', xp: 1 },
  ghost:     { hp: 16, sp: 70, dmg: 8, r: 17, col: '#E8ECF8', xp: 2 },
  golem:     { hp: 45, sp: 40, dmg: 12, r: 22, col: '#8A94A8', xp: 4 },
  oni:       { hp: 30, sp: 75, dmg: 10, r: 19, col: '#E05A4A', xp: 3 },
  kingslime: { hp: 1400, sp: 60, dmg: 16, r: 60, col: '#4AA8E8', xp: 0, boss: 1 },
  bigghost:  { hp: 2600, sp: 75, dmg: 20, r: 62, col: '#D8DCF8', xp: 0, boss: 1 },
  tengu:     { hp: 4200, sp: 85, dmg: 26, r: 64, col: '#E0443A', xp: 0, boss: 1 },
};

// わざ（lv 1〜5）
const WEAPONS = {
  star:   { name: 'まほうの ほし', desc: 'ちかい てきに ほしを うつ', icon: '⭐' },
  heart:  { name: 'ハートの わ', desc: 'まわりを ハートが まわる', icon: '💗' },
  thunder:{ name: 'かみなり', desc: 'ときどき てきに かみなり', icon: '⚡' },
  boom:   { name: 'ブーメラン', desc: 'すすむ ほうへ なげて もどる', icon: '🪃' },
  aura:   { name: 'おひさま バリア', desc: 'ちかくの てきを じりじり', icon: '🌞' },
};
const PASSIVE = {
  speed: { name: 'はやい くつ', desc: 'うごきが はやく なる', icon: '👟' },
  magnet:{ name: 'じしゃく', desc: 'ほしを とおくから すいよせる', icon: '🧲' },
  maxhp: { name: 'げんき アップ', desc: 'HPが ふえて かいふく', icon: '🍙' },
  power: { name: 'ちから', desc: 'わざの いりょくが あがる', icon: '💪' },
  haste: { name: 'すばやい て', desc: 'わざが はやく でる', icon: '⏱' },
};

const V = { mode: 'title', st: 0 };

function startStage(i) {
  V.st = i; V.mode = 'play'; V.t = 0; V.kills = 0;
  V.p = { x: 0, y: 0, vx: 0, vy: 0, hp: 100, mhp: 100, inv: 0, face: 1, lv: 1, xp: 0, need: 6 };
  V.w = { star: 1 };          // もっている わざ
  V.pas = {};                 // もっている パッシブ
  V.cd = {};
  V.en = []; V.shots = []; V.gems = []; V.fx = []; V.bolts = []; V.booms = [];
  V.spawnT = 0; V.boss = null; V.stick = null; V.choice = null; V.result = null; V.dmgTexts = [];
}

function stat(k) {
  const lv = V.pas[k] || 0;
  return { speed: 1 + lv * 0.1, magnet: 60 + lv * 40, power: 1 + lv * 0.18, haste: 1 - lv * 0.08 }[k];
}

// --- てき ----------------------------------------------------------------------------

function spawn(type, far) {
  const a = Math.random() * Math.PI * 2, d = (far || Math.hypot(VW, VH) / 2 + 60);
  const E = EN[type], S = STAGES[V.st];
  const hpMul = (1 + V.t / 150) * S.hard;
  V.en.push({ type, x: V.p.x + Math.cos(a) * d, y: V.p.y + Math.sin(a) * d, hp: E.boss ? E.hp : E.hp * hpMul, mhp: E.boss ? E.hp : E.hp * hpMul,
              r: E.r, sp: E.sp * (E.boss ? 1 : 1 + V.t / 400), dmg: E.dmg * (E.boss ? 1 : S.hard), hit: 0, kx: 0, ky: 0 });
  return V.en[V.en.length - 1];
}

function hurt(e, dmg, kx, ky) {
  dmg = Math.round(dmg * stat('power'));
  e.hp -= dmg; e.hit = 0.1;
  e.kx += (kx || 0); e.ky += (ky || 0);
  if (V.dmgTexts.length < 40) V.dmgTexts.push({ x: e.x, y: e.y - e.r, s: dmg, t: 0.5 });
  if (e.hp <= 0 && !e.dead) {
    e.dead = true; V.kills++;
    const E = EN[e.type];
    if (E.xp) V.gems.push({ x: e.x, y: e.y, v: E.xp });
    if (Math.random() < 0.012) V.gems.push({ x: e.x + 10, y: e.y, heal: 1 });
    if (V.fx.length < 120) for (let i = 0; i < 4; i++) V.fx.push({ x: e.x, y: e.y, vx: rnd(-90, 90), vy: rnd(-90, 90), t: 0.35, c: E.col });
    if (E.boss) bossDown();
    else if (V.t - (V.lastPop || 0) > 0.04) { V.lastPop = V.t; tone(700, 0.04, 'square', 0.04); }
  }
}

function bossDown() {
  V.result = { win: true };
  sv.clear[V.st] = 1; sv.bestT[V.st] = Math.max(sv.bestT[V.st] || 0, Math.round(V.t));
  store.set(SAVE, sv);
  jingle([72, 76, 79, 84, 88, 91], 0.1, 'square', 0.15);
}

// --- わざ ---------------------------------------------------------------------------

function nearest(max) {
  let best = null, bd = max || 1e9;
  for (const e of V.en) { if (e.dead) continue; const d = Math.hypot(e.x - V.p.x, e.y - V.p.y); if (d < bd) { bd = d; best = e; } }
  return best;
}

function weapons(dt) {
  const P = V.p, h = stat('haste');
  for (const k in V.w) {
    const lv = V.w[k];
    V.cd[k] = (V.cd[k] || 0) - dt;
    if (k === 'star' && V.cd[k] <= 0) {
      V.cd[k] = (0.75 - lv * 0.07) * h;
      const tg = nearest(520);
      if (tg) {
        const n = 1 + Math.floor(lv / 2);
        for (let i = 0; i < n; i++) {
          const a = Math.atan2(tg.y - P.y, tg.x - P.x) + (i - (n - 1) / 2) * 0.18;
          V.shots.push({ x: P.x, y: P.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, t: 1.1, dmg: 10 + lv * 3, pierce: lv >= 4 ? 2 : 1, kind: 'star' });
        }
        tone(1200, 0.03, 'square', 0.03);
      }
    } else if (k === 'heart') {
      // まわりを まわる（あたりは 下で しらべる）
    } else if (k === 'thunder' && V.cd[k] <= 0) {
      V.cd[k] = (2.2 - lv * 0.25) * h;
      const n = lv;
      const alive = V.en.filter((e) => !e.dead && Math.abs(e.x - P.x) < VW / 2 && Math.abs(e.y - P.y) < VH / 2);
      for (let i = 0; i < n && alive.length; i++) {
        const e = alive.splice(Math.floor(Math.random() * alive.length), 1)[0];
        V.bolts.push({ x: e.x, y: e.y, t: 0.25 });
        for (const o of V.en) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 50) hurt(o, 16 + lv * 6);
      }
      if (n) noise(0.15, 0.12, 3000);
    } else if (k === 'boom' && V.cd[k] <= 0) {
      V.cd[k] = (1.8 - lv * 0.15) * h;
      const n = lv >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(P.vy || 0, P.vx || P.face) + (i ? Math.PI : 0);
        V.booms.push({ x: P.x, y: P.y, a, t: 0, dmg: 12 + lv * 4, hitT: {} });
      }
    } else if (k === 'aura' && V.cd[k] <= 0) {
      const rad = 70 + lv * 14;
      for (const e of V.en) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < rad + e.r) hurt(e, 3 + lv * 1.5);
      V.cd[k] = 0.35 * h;
    }
  }
  // ハート（まわる）
  if (V.w.heart) {
    const lv = V.w.heart, n = 1 + lv, R = 70 + lv * 6;
    V.hearts = [];
    for (let i = 0; i < n; i++) {
      const a = V.t * 3.2 + i / n * Math.PI * 2;
      V.hearts.push([P.x + Math.cos(a) * R, P.y + Math.sin(a) * R]);
    }
    for (const e of V.en) {
      if (e.dead) continue;
      e.hh = (e.hh || 0) - dt;
      if (e.hh > 0) continue;
      for (const [hx, hy] of V.hearts) if (Math.hypot(e.x - hx, e.y - hy) < e.r + 14) { hurt(e, 8 + lv * 3, (e.x - P.x) * 0.5, (e.y - P.y) * 0.5); e.hh = 0.4; break; }
    }
  } else V.hearts = null;
}

// --- こうしん ------------------------------------------------------------------------

function update(dt) {
  if (V.mode !== 'play' || V.choice || V.result) return;
  const P = V.p, S = STAGES[V.st];
  V.t += dt;
  // うごく
  let dx = 0, dy = 0;
  if (V.stick && V.stick.on) { dx = V.stick.dx; dy = V.stick.dy; }
  if (KEYS.ArrowLeft) dx -= 1; if (KEYS.ArrowRight) dx += 1; if (KEYS.ArrowUp) dy -= 1; if (KEYS.ArrowDown) dy += 1;
  const l = Math.hypot(dx, dy);
  const sp = 190 * stat('speed');
  if (l > 0.1) { const k = Math.min(1, l) / l; P.vx = dx * k * sp; P.vy = dy * k * sp; if (dx) P.face = dx > 0 ? 1 : -1; } else { P.vx = 0; P.vy = 0; }
  P.x += P.vx * dt; P.y += P.vy * dt;
  if (P.inv > 0) P.inv -= dt;
  // てきを だす
  V.spawnT -= dt;
  if (V.t < STAGE_T) {
    const rate = 0.9 / (1 + V.t / 35) / S.hard;
    while (V.spawnT <= 0) {
      V.spawnT += rate;
      if (V.en.length < 260) spawn(pick(S.en));
      // ときどき むれ
      if (Math.random() < 0.02 && V.t > 30) for (let i = 0; i < 8; i++) spawn(pick(S.en));
    }
  } else if (!V.boss) {
    V.boss = spawn(S.boss, 420);
    for (const e of V.en) if (!EN[e.type].boss) { e.dead = true; V.fx.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: 0.3, c: '#FFFFFF' }); }
    noise(0.6, 0.3, 200); jingle([55, 58, 62], 0.2, 'sawtooth', 0.08);
  }
  // てきの うごき
  for (const e of V.en) {
    if (e.dead) continue;
    const ex = P.x - e.x, ey = P.y - e.y, d = Math.hypot(ex, ey) || 1;
    e.x += (ex / d * e.sp + e.kx) * dt; e.y += (ey / d * e.sp + e.ky) * dt;
    e.kx *= 0.85; e.ky *= 0.85;
    if (e.hit > 0) e.hit -= dt;
    if (d < e.r + 14 && P.inv <= 0) {
      P.hp -= e.dmg; P.inv = 0.6;
      tone(200, 0.12, 'square', 0.1, 100);
      if (P.hp <= 0) { P.hp = 0; V.result = { win: false }; sv.bestT[V.st] = Math.max(sv.bestT[V.st] || 0, Math.round(V.t)); store.set(SAVE, sv); tone(300, 0.6, 'triangle', 0.15, 80); return; }
    }
    // ずっと とおくの てきは ちかくに よびもどす
    if (d > 1400 && !EN[e.type].boss) { e.dead = true; }
  }
  // てき どうしが かさならない ように すこし おしあう（かず が おおいので あらく）
  for (let i = 0; i < V.en.length; i += 2) {
    const a = V.en[i], b = V.en[(i + 7) % V.en.length];
    if (!a || !b || a === b) continue;
    const ddx = b.x - a.x, ddy = b.y - a.y, dd = Math.hypot(ddx, ddy), rs = a.r + b.r;
    if (dd < rs && dd > 0) { const o = (rs - dd) / 2; a.x -= ddx / dd * o; a.y -= ddy / dd * o; b.x += ddx / dd * o; b.y += ddy / dd * o; }
  }
  weapons(dt);
  // たま
  for (const s of V.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
    for (const e of V.en) {
      if (e.dead || s.t <= 0) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + 8) { hurt(e, s.dmg, s.vx * 0.15, s.vy * 0.15); s.pierce--; if (s.pierce <= 0) s.t = 0; break; }
    }
  }
  V.shots = V.shots.filter((s) => s.t > 0);
  for (const b of V.booms) {
    b.t += dt;
    const out = b.t < 0.6 ? b.t / 0.6 : Math.max(0, 1 - (b.t - 0.6) / 0.6);
    const r = 240 * out;
    b.x = P.x + Math.cos(b.a) * r; b.y = P.y + Math.sin(b.a) * r;
    for (const e of V.en) {
      if (e.dead) continue;
      const key = V.en.indexOf(e);
      if ((b.hitT[key] || 0) > b.t) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 16) { hurt(e, b.dmg, Math.cos(b.a) * 80, Math.sin(b.a) * 80); b.hitT[key] = b.t + 0.3; }
    }
  }
  V.booms = V.booms.filter((b) => b.t < 1.2);
  for (const b of V.bolts) b.t -= dt;
  V.bolts = V.bolts.filter((b) => b.t > 0);
  V.en = V.en.filter((e) => !e.dead);
  // ほし（けいけんち）
  const mag = stat('magnet');
  for (const g of V.gems) {
    const d = Math.hypot(P.x - g.x, P.y - g.y);
    if (d < mag) { g.x += (P.x - g.x) / d * 420 * dt; g.y += (P.y - g.y) / d * 420 * dt; }
    if (d < 20) {
      g.got = true;
      if (g.heal) { P.hp = Math.min(P.mhp, P.hp + 30); tone(900, 0.15, 'sine', 0.1, 1400); }
      else { P.xp += g.v; if (Math.random() < 0.3) tone(1500 + Math.random() * 300, 0.03, 'sine', 0.04); }
    }
  }
  V.gems = V.gems.filter((g) => !g.got);
  if (V.gems.length > 400) V.gems.splice(0, V.gems.length - 400);
  if (P.xp >= P.need) levelUp();
  for (const f of V.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }
  V.fx = V.fx.filter((f) => f.t > 0);
  for (const d of V.dmgTexts) { d.t -= dt; d.y -= 30 * dt; }
  V.dmgTexts = V.dmgTexts.filter((d) => d.t > 0);
}

function levelUp() {
  const P = V.p;
  P.xp -= P.need; P.lv++;
  P.need = Math.round(4 + P.lv * 3 + Math.pow(P.lv, 1.3));
  // 3つ えらぶ
  const opts = [];
  for (const k in WEAPONS) if ((V.w[k] || 0) < 5 && (V.w[k] || Object.keys(V.w).length < 4)) opts.push({ kind: 'w', k });
  for (const k in PASSIVE) if ((V.pas[k] || 0) < 5) opts.push({ kind: 'p', k });
  shuffle(opts);
  V.choice = opts.slice(0, 3);
  if (!V.choice.length) { V.choice = null; P.hp = P.mhp; }
  jingle([72, 79, 84], 0.08, 'square', 0.12);
}
function choose(o) {
  if (o.kind === 'w') V.w[o.k] = (V.w[o.k] || 0) + 1;
  else {
    V.pas[o.k] = (V.pas[o.k] || 0) + 1;
    if (o.k === 'maxhp') { V.p.mhp += 20; V.p.hp = Math.min(V.p.mhp, V.p.hp + 40); }
  }
  V.choice = null;
  tone(1000, 0.1, 'triangle', 0.12, 1500);
}

// --- かく ----------------------------------------------------------------------------

function drawEnemy(e, x, y, t) {
  const E = EN[e.type], r = e.r;
  const col = e.hit > 0 ? '#FFFFFF' : E.col;
  ellipse(x, y + r * 0.85, r * 0.8, r * 0.22); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
  if (e.type === 'bat') {
    const f = Math.sin(t * 14 + x) * 0.5;
    ctx.fillStyle = col;
    for (const sg of [-1, 1]) { ctx.save(); ctx.translate(x, y); ctx.scale(sg, 1); ctx.rotate(f); ctx.beginPath(); ctx.moveTo(r * 0.3, 0); ctx.lineTo(r * 1.5, -r * 0.6); ctx.lineTo(r * 1.1, r * 0.3); ctx.fill(); ctx.restore(); }
    fillC(x, y, r * 0.75, col);
  } else if (e.type === 'ghost' || e.type === 'bigghost') {
    ctx.fillStyle = col; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
    for (let i = 0; i <= 4; i++) ctx.lineTo(x + r - i * r / 2, y + r * 0.7 + (i % 2 ? -r * 0.25 : 0) + Math.sin(t * 5 + i) * 2);
    ctx.fill(); ctx.globalAlpha = 1;
  } else if (e.type === 'golem') {
    fillRR(x - r, y - r, r * 2, r * 2, r * 0.4, col);
    fillRR(x - r * 0.7, y - r * 0.8, r * 1.4, r * 0.5, 4, 'rgba(255,255,255,0.2)');
  } else if (e.type === 'oni' || e.type === 'tengu') {
    fillC(x, y, r, col);
    ctx.fillStyle = '#FFF4D8';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sg * r * 0.3, y - r * 0.7); ctx.lineTo(x + sg * r * 0.45, y - r * 1.35); ctx.lineTo(x + sg * r * 0.65, y - r * 0.6); ctx.fill(); }
    if (e.type === 'tengu') { ctx.fillStyle = '#C0342A'; ctx.beginPath(); ctx.moveTo(x - r * 0.1, y); ctx.lineTo(x + r * 0.6 * ((V.p ? V.p.x : x + 1) > x ? 1 : -1) * 1.4, y + r * 0.1); ctx.lineTo(x - r * 0.1, y + r * 0.25); ctx.fill(); }
  } else {
    // スライム
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.8); ctx.quadraticCurveTo(x - r, y - r * 0.9, x, y - r); ctx.quadraticCurveTo(x + r, y - r * 0.9, x + r, y + r * 0.8); ctx.closePath(); ctx.fill();
    if (e.type === 'kingslime') { ctx.fillStyle = '#FFD24A'; star(x, y - r * 1.05, r * 0.35); ctx.fill(); }
  }
  const lk = (V.p ? V.p.x : x + 1) > x ? 1 : -1;
  fillC(x - r * 0.3 + lk * r * 0.08, y - r * 0.15, r * 0.2, '#FFFFFF'); fillC(x + r * 0.3 + lk * r * 0.08, y - r * 0.15, r * 0.2, '#FFFFFF');
  fillC(x - r * 0.3 + lk * r * 0.14, y - r * 0.12, r * 0.1, '#2A2028'); fillC(x + r * 0.3 + lk * r * 0.14, y - r * 0.12, r * 0.1, '#2A2028');
}

function drawRina(x, y, t) {
  const P = V.p;
  const blink = P.inv > 0 && Math.floor(P.inv * 20) % 2;
  if (blink) ctx.globalAlpha = 0.4;
  ellipse(x, y + 18, 14, 5); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  const step = (P.vx || P.vy) ? Math.sin(t * 16) * 3 : 0;
  fillR(x - 6, y + 4, 5, 12 + step, '#4A3A4A'); fillR(x + 1, y + 4, 5, 12 - step, '#4A3A4A');
  fillRR(x - 10, y - 10, 20, 17, 6, '#FF6FA8');
  fillC(x - 12, y - 21, 5, '#5A3520'); fillC(x + 12, y - 21, 5, '#5A3520');
  fillC(x, y - 22, 12, '#5A3520');
  fillC(x + P.face * 1.5, y - 20, 10, '#FFE0C8');
  ctx.fillStyle = '#5A3520'; ctx.beginPath(); ctx.arc(x, y - 23, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  fillC(x - 4 + P.face * 2, y - 19, 1.8, '#2A2028'); fillC(x + 4 + P.face * 2, y - 19, 1.8, '#2A2028');
  fillC(x - 7, y - 32, 3, '#FFE066');
  ctx.globalAlpha = 1;
}

function drawPlay(t) {
  const S = STAGES[V.st], P = V.p;
  const cx = P.x - VW / 2, cy = P.y - VH / 2;
  // じめん（タイル）
  fillR(0, 0, VW, VH, S.g1);
  const ts = 80;
  ctx.fillStyle = S.g2;
  for (let x = Math.floor(cx / ts) * ts; x < cx + VW; x += ts) for (let y = Math.floor(cy / ts) * ts; y < cy + VH; y += ts) {
    if (((x / ts) + (y / ts)) % 2 === 0) ctx.fillRect(x - cx, y - cy, ts, ts);
  }
  ctx.save(); ctx.translate(-cx, -cy);
  if (V.w.aura) { const rad = 70 + V.w.aura * 14; ctx.fillStyle = 'rgba(255,220,100,' + (0.14 + Math.sin(t * 6) * 0.05) + ')'; circ(P.x, P.y, rad); ctx.fill(); }
  for (const g of V.gems) {
    if (g.heal) { text('🍙', g.x, g.y, 18, '#FFFFFF', 'center'); continue; }
    ctx.fillStyle = g.v >= 3 ? '#FF8FC8' : g.v >= 2 ? '#7FE0F0' : '#FFE066';
    star(g.x, g.y, 7, 4, 0.5, t * 2); ctx.fill();
  }
  for (const e of V.en) { if (Math.abs(e.x - P.x) < VW / 2 + 80 && Math.abs(e.y - P.y) < VH / 2 + 80) drawEnemy(e, e.x, e.y, t); }
  drawRina(P.x, P.y, t);
  for (const s of V.shots) { ctx.fillStyle = '#FFF6A0'; star(s.x, s.y, 9, 5, 0.45, t * 8); ctx.fill(); }
  if (V.hearts) for (const [hx, hy] of V.hearts) text('💗', hx, hy, 22, '#FFFFFF', 'center');
  for (const b of V.booms) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.t * 18); ctx.fillStyle = '#E8A040'; ctx.fillRect(-16, -4, 32, 8); ctx.fillRect(-4, -16, 8, 32); ctx.restore(); }
  for (const b of V.bolts) {
    ctx.strokeStyle = 'rgba(255,250,160,' + b.t * 4 + ')'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(b.x, b.y - 260); for (let i = 1; i <= 6; i++) ctx.lineTo(b.x + (i % 2 ? 14 : -14), b.y - 260 + i * 43); ctx.stroke();
    fillC(b.x, b.y, 40 * b.t * 4, 'rgba(255,250,160,0.4)');
  }
  for (const f of V.fx) { ctx.globalAlpha = f.t * 3; fillC(f.x, f.y, 4, f.c); }
  ctx.globalAlpha = 1;
  for (const d of V.dmgTexts) { ctx.globalAlpha = d.t * 2; text(d.s, d.x, d.y, 14, '#FFFFFF', 'center'); ctx.globalAlpha = 1; }
  ctx.restore();
  // うえの じょうほう
  fillR(0, 0, VW, 8, 'rgba(0,0,0,0.4)');
  fillR(0, 0, VW * clamp(P.xp / P.need, 0, 1), 8, '#7FE0F0');
  fillRR(10, 16, 250, 44, 12, 'rgba(0,0,0,0.45)');
  text('Lv ' + P.lv, 22, 38, 20, '#FFFFFF');
  fillRR(86, 30, 160, 16, 8, 'rgba(255,255,255,0.25)');
  fillRR(86, 30, 160 * P.hp / P.mhp, 16, 8, P.hp < P.mhp * 0.3 ? '#FF5A5A' : '#7FE0A0');
  const left = Math.max(0, STAGE_T - V.t);
  const tt = V.boss ? 'ボス！' : Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
  fillRR(VW / 2 - 70, 16, 140, 44, 12, 'rgba(0,0,0,0.45)');
  text(tt, VW / 2, 38, 26, V.boss ? '#FF8A8A' : '#FFFFFF', 'center');
  fillRR(VW - 180, 16, 170, 44, 12, 'rgba(0,0,0,0.45)');
  text('たおした ' + V.kills, VW - 95, 38, 18, '#FFFFFF', 'center');
  // わざ いちらん
  let ix = 12;
  for (const k in V.w) { fillRR(ix, 68, 40, 40, 8, 'rgba(0,0,0,0.4)'); text(WEAPONS[k].icon, ix + 20, 86, 20, '#FFFFFF', 'center'); text(V.w[k], ix + 33, 101, 11, '#FFE066', 'center'); ix += 44; }
  for (const k in V.pas) { fillRR(ix, 68, 40, 40, 8, 'rgba(0,0,0,0.25)'); text(PASSIVE[k].icon, ix + 20, 86, 20, '#FFFFFF', 'center'); text(V.pas[k], ix + 33, 101, 11, '#FFE066', 'center'); ix += 44; }
  if (V.boss && !V.boss.dead) {
    fillRR(VW / 2 - 220, 70, 440, 18, 9, 'rgba(0,0,0,0.5)');
    fillRR(VW / 2 - 220, 70, 440 * Math.max(0, V.boss.hp / V.boss.mhp), 18, 9, '#FF5A8A');
  }
  if (V.stick && V.stick.on) {
    ctx.globalAlpha = 0.45; fillC(V.stick.x, V.stick.y, 56, '#FFFFFF'); fillC(V.stick.x + V.stick.dx * 44, V.stick.y + V.stick.dy * 44, 26, '#FF8FC0'); ctx.globalAlpha = 1;
  } else if (V.t < 5) textO('画面を おさえて ひっぱると うごく。こうげきは じどう！', VW / 2, VH - 36, 20, '#FFFFFF');
  btn(VW - 120, VH - 60, 110, 46, 'やめる', () => { V.mode = 'select'; }, { col: 'rgba(255,255,255,0.85)', size: 17 });
  if (V.choice) drawChoice();
  if (V.result) drawResult();
}

function drawChoice() {
  fillR(0, 0, VW, VH, 'rgba(10,10,30,0.6)');
  textO('レベル アップ！ 1つ えらんでね', VW / 2, 110, 34, '#FFE066');
  const n = V.choice.length, bw = Math.min(260, (VW - 80) / n - 16);
  V.choice.forEach((o, i) => {
    const x = VW / 2 - (n * (bw + 16) - 16) / 2 + i * (bw + 16), y = 160;
    const D = o.kind === 'w' ? WEAPONS[o.k] : PASSIVE[o.k];
    const lv = (o.kind === 'w' ? V.w[o.k] : V.pas[o.k]) || 0;
    btn(x, y, bw, 250, '', () => choose(o), { col: o.kind === 'w' ? '#FFF4D8' : '#E0F4FF' });
    text(D.icon, x + bw / 2, y + 60, 50, '#FFFFFF', 'center');
    text(D.name, x + bw / 2, y + 124, 22, '#2A2440', 'center', true, bw - 16);
    text(lv ? 'Lv ' + lv + ' → ' + (lv + 1) : 'あたらしい！', x + bw / 2, y + 160, 18, lv ? '#8A5A2A' : '#E8508A', 'center');
    wrap(D.desc, bw - 30, 16).forEach((ln, j) => text(ln, x + bw / 2, y + 196 + j * 22, 16, '#5A4A6A', 'center', false));
  });
}

function drawResult() {
  fillR(0, 0, VW, VH, 'rgba(10,10,30,0.6)');
  const w = V.result.win;
  textO(w ? 'クリア！ ボスを たおした！' : 'やられちゃった…', VW / 2, 150, 44, w ? '#FFE066' : '#FFB0B0');
  const tt = Math.floor(V.t / 60) + 'ふん ' + Math.floor(V.t % 60) + 'びょう';
  text('いきのこった じかん ' + tt + '　たおした かず ' + V.kills, VW / 2, 220, 22, '#FFFFFF', 'center');
  text('レベル ' + V.p.lv, VW / 2, 256, 22, '#FFFFFF', 'center');
  btn(VW / 2 - 230, 310, 220, 70, 'もういちど', () => startStage(V.st));
  if (w && V.st + 1 < STAGES.length) btn(VW / 2 + 10, 310, 220, 70, 'つぎの ステージ', () => startStage(V.st + 1), { col: '#9AF0B8' });
  else btn(VW / 2 + 10, 310, 220, 70, 'ステージを えらぶ', () => { V.mode = 'select'; }, { col: '#D8D0F0' });
}

function drawSelect(t) {
  ctx.fillStyle = grad(0, VH, '#1A2A4A', '#0E141E'); ctx.fillRect(0, 0, VW, VH);
  text('ステージを えらんでね', VW / 2, 48, 30, '#FFFFFF', 'center');
  btn(14, 14, 110, 48, 'もどる', () => { V.mode = 'title'; }, { col: '#D8D0F0', size: 18 });
  const bw = Math.min(260, (VW - 80) / 3 - 16);
  STAGES.forEach((S, i) => {
    const x = VW / 2 - (3 * (bw + 16) - 16) / 2 + i * (bw + 16), y = 100;
    const op = i === 0 || sv.clear[i - 1];
    btn(x, y, bw, 320, '', () => { if (op) startStage(i); }, { col: op ? S.g1 : 'rgba(120,120,140,0.4)' });
    if (op) drawEnemy({ type: S.boss, r: 50, hit: 0 }, x + bw / 2, y + 110, t);
    text(op ? S.name : '？？？', x + bw / 2, y + 210, 22, '#FFFFFF', 'center', true, bw - 16);
    text('つよさ ' + '★'.repeat(i + 1), x + bw / 2, y + 246, 17, '#FFFFFF', 'center');
    if (sv.clear[i]) text('クリア！', x + bw / 2, y + 284, 22, '#FFE066', 'center');
    else if (sv.bestT[i]) text('さいこう ' + sv.bestT[i] + 'びょう', x + bw / 2, y + 284, 17, '#FFFFFF', 'center');
    if (!op) text('🔒', x + bw / 2, y + 110, 44, '#FFFFFF', 'center');
  });
  text('3ぷん いきのこると ボスが でるよ', VW / 2, 470, 20, '#C8D8FF', 'center');
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#1A2A4A', '#0E141E'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2 + t * 0.3, r = 220 + Math.sin(t + i) * 20;
    drawEnemy({ type: ['slime', 'bat', 'ghost'][i % 3], r: 15, hit: 0 }, VW / 2 + Math.cos(a) * r * 1.6, 330 + Math.sin(a) * r * 0.5, t);
  }
  V.p = V.p || { x: 0, y: 0, vx: 0, vy: 0, inv: 0, face: 1 };
  ctx.save(); ctx.translate(VW / 2, 330); ctx.scale(2, 2); drawRina(0, 0, t); ctx.restore();
  textO('りなサバイバー', VW / 2, 90, 64, '#FFE066', '#3A1A0A');
  text('〜 まものの よる 〜', VW / 2, 150, 24, '#FFFFFF', 'center');
  btn(VW / 2 - 150, 420, 300, 76, 'あそぶ', () => { fullScreen(); V.mode = 'select'; }, { col: '#FFE066' });
}

startGame({
  bg: '#0E141E',
  update,
  draw(t) { if (V.mode === 'title') drawTitle(t); else if (V.mode === 'select') drawSelect(t); else drawPlay(t); },
  down(x, y) { if (V.mode === 'play' && !V.choice && !V.result) V.stick = { on: true, x, y, dx: 0, dy: 0 }; },
  move(x, y, drag) {
    if (!V.stick || !V.stick.on || !drag) return;
    const dx = x - V.stick.x, dy = y - V.stick.y, l = Math.hypot(dx, dy);
    const k = l > 50 ? 1 / l : 1 / 50;
    V.stick.dx = dx * k; V.stick.dy = dy * k;
  },
  up() { if (V.stick) V.stick.on = false; },
});
