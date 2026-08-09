// リナパパの なんきょくダッシュ
//
// ★ 1983年の MSX の 名作「氷の 上を どこまでも 走る」ゲームが もと。
//   前から せまって くる 氷の あなを ジャンプで こえながら、
//   さかなを ひろって ゴールを めざす。
//
// ★ そうさ（気もちよさの ために）
//     ・左がわ … スティック。よこで よける／上で ダッシュ／下で ゆっくり
//     ・右がわ … どこを おしても ジャンプ
//   あなは 遠くから 大きく なって くる ので、見て から でも とべる。
//   とぶ タイミングは ちょっと 早くても だいじょうぶ（すこし 長めに うく）。

'use strict';

const GAME_VER = 1;
const HUD = 26;

const HZ = 158;              // ちへいせん
const ROADW = 680;           // 手前の 道の はば（画面の 大きさで のびる）
const PDZ = 4.6;             // カメラから パパまでの きょり
const DRAW = 150;            // どこまで 先を 描くか
const JUMP_T = 0.72;         // ういて いる 時間

const SP_BASE = 30, SP_DASH = 44, SP_SLOW = 17, SP_SNOW = 15;

const STAGES = [
  { len: 820, time: 44, gap: 46, amp: 0.18, seal: 1, name: '1めん' },
  { len: 950, time: 46, gap: 42, amp: 0.24, seal: 2, name: '2めん' },
  { len: 1080, time: 48, gap: 38, amp: 0.30, seal: 3, name: '3めん' },
  { len: 1200, time: 49, gap: 35, amp: 0.36, seal: 4, name: '4めん' },
  { len: 1320, time: 50, gap: 32, amp: 0.42, seal: 5, name: '5めん' },
  { len: 1450, time: 51, gap: 29, amp: 0.48, seal: 6, name: '6めん' },
  { len: 1580, time: 52, gap: 27, amp: 0.54, seal: 7, name: '7めん' },
  { len: 1750, time: 54, gap: 25, amp: 0.60, seal: 8, name: 'さいご' },
];

const SAVE_KEY = 'dash.save.v1';
const save = { open: 1, clear: {}, best: {}, fish: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(STAGES.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (typeof s.fish === 'number') save.fish = s.fish;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  pz: 0, x: 0, sp: SP_BASE, curve: 0, curveT: 0,
  air: 0, stun: 0, obj: [], sparks: [],
  time: 0, fish: 0, score: 0, over: false, won: false, ready: 0,
  msg: '', msgT: 0, best: 0,
};

// --- とおくの けしきの けいさん -----------------------------------------------------

function proj(dz, xo) {
  const d = Math.max(0.2, dz);
  const s = 1 / (d * 0.055 + 1);
  const w = Math.min(ROADW, VW * 0.86) * s;
  const y = HZ + (VH - HZ) * s;
  const x = VW / 2 + xo * 0.5 * w + G.curve * d * d * 0.12 * s;
  return { x: x, y: y, s: s, w: w };
}
function curveAt(z) {
  const S = STAGES[G.stage];
  return (Math.sin(z * 0.0115) + Math.sin(z * 0.0041) * 0.7) * S.amp;
}

// --- めん を つくる -----------------------------------------------------------------

function buildStage(n) {
  const S = STAGES[n];
  G.obj = [];
  let z = 70;
  while (z < S.len - 60) {
    z += S.gap * (0.7 + Math.random() * 0.7);
    const r = Math.random();
    if (r < 0.44) {
      // 氷の あな（2つ ならぶ ことも ある）
      const cx = (Math.random() * 2 - 1) * 0.62;
      G.obj.push({ z: z, x: cx, k: 'hole' });
      if (Math.random() < 0.28) G.obj.push({ z: z + 3, x: clamp(cx + (Math.random() < 0.5 ? -0.8 : 0.8), -0.7, 0.7), k: 'hole' });
    } else if (r < 0.70) {
      G.obj.push({ z: z, x: (Math.random() * 2 - 1) * 0.72, k: 'fish' });
    } else if (r < 0.86) {
      G.obj.push({ z: z, x: (Math.random() * 2 - 1) * 0.66, k: 'rock' });
    } else {
      G.obj.push({ z: z, x: (Math.random() < 0.5 ? -1 : 1) * (1.06 + Math.random() * 0.2), k: 'flag' });
    }
  }
  // アザラシ（よこに ゆっくり 動く）
  for (let i = 0; i < S.seal; i++) {
    const zz = 140 + Math.random() * (S.len - 220);
    G.obj.push({ z: zz, x: 0, k: 'seal', ph: Math.random() * 6, sw: 0.55 + Math.random() * 0.3 });
  }
  // ゴールの はた
  G.obj.push({ z: S.len, x: -1.08, k: 'goalpost' });
  G.obj.push({ z: S.len, x: 1.08, k: 'goalpost' });
  G.obj.sort((a, b) => a.z - b.z);

  G.pz = 0; G.x = 0; G.sp = SP_BASE; G.curve = 0;
  G.air = 0; G.stun = 0; G.sparks = [];
  G.time = S.time; G.fish = 0; G.score = 0;
  G.over = false; G.won = false; G.ready = 1.2;
  G.best = save.best[n] || 0;
}

function startStage(n) {
  G.stage = n;
  buildStage(n);
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(n + 2); bgmHeat(0.3);
}

function say(s) { G.msg = s; G.msgT = 1.1; }

// --- まいコマ -----------------------------------------------------------------------

function control(dt) {
  let dir = 0, want = SP_BASE;
  if (IN.hold) {
    dir = Math.abs(IN.ax) > 0.16 ? IN.ax : 0;
    if (IN.ay < -0.35) want = SP_DASH;
    else if (IN.ay > 0.40) want = SP_SLOW;
  }
  if (KEYS.ArrowLeft) dir = -1;
  if (KEYS.ArrowRight) dir = 1;
  if (KEYS.ArrowUp) want = SP_DASH;
  if (KEYS.ArrowDown) want = SP_SLOW;

  if (G.stun > 0) { want = SP_SLOW; dir = 0; }
  const off = Math.abs(G.x) > 1;
  if (off) want = Math.min(want, SP_SNOW);

  G.sp += clamp(want - G.sp, -46 * dt, 22 * dt);
  G.x += dir * 1.55 * dt;
  // カーブで そとへ もって いかれる
  G.x -= G.curve * G.sp * 0.013 * dt;
  G.x = clamp(G.x, -1.45, 1.45);

  if ((IN.fireTap || (KEYS.Space && !G.ks)) && G.air <= 0 && G.stun <= 0) {
    G.air = JUMP_T;
    sfxJump();
  }
  G.ks = KEYS.Space;
}

function hitStun(msg) {
  G.stun = 1.05;
  G.sp = SP_SLOW;
  say(msg);
  sfxNg();
  for (let i = 0; i < 14; i++) {
    G.sparks.push({ x: 0, y: 0, vx: (Math.random() * 2 - 1) * 140, vy: -Math.random() * 180 - 40, t: 0.6 });
  }
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (let i = G.sparks.length - 1; i >= 0; i--) {
    const s = G.sparks[i];
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 420 * dt;
    if (s.t <= 0) G.sparks.splice(i, 1);
  }
  if (G.screen !== 'play' || G.over || G.won) return;
  if (G.ready > 0) { G.ready -= dt; return; }

  control(dt);
  if (G.air > 0) G.air -= dt;
  if (G.stun > 0) G.stun -= dt;

  const S = STAGES[G.stage];
  G.pz += G.sp * dt;
  G.curve += (curveAt(G.pz + 40) - G.curve) * Math.min(1, dt * 2.4);
  G.time -= dt;
  bgmHeat(clamp(G.sp / SP_DASH, 0, 1));

  for (const o of G.obj) {
    if (o.k === 'seal') o.x = Math.sin(G.t * 0.9 + o.ph) * o.sw;
    if (o.done || o.z > G.pz) continue;
    o.done = true;
    const d = Math.abs(o.x - G.x);
    if (o.k === 'hole') {
      if (d < 0.34 && G.air <= 0) hitStun('あなに おちた！');
    } else if (o.k === 'rock') {
      if (d < 0.24 && G.air <= 0) hitStun('こおりに ぶつかった！');
    } else if (o.k === 'seal') {
      if (d < 0.28 && G.air <= 0) hitStun('アザラシに ぶつかった！');
    } else if (o.k === 'fish') {
      if (d < 0.34) {
        G.fish++; save.fish++; G.score += 100; G.time += 0.7;
        sfxGet(); o.got = true;
      }
    }
  }

  if (G.pz >= S.len) {
    G.won = true;
    G.score += 1000 + Math.round(G.time * 40) + G.fish * 50;
    save.clear[G.stage] = true;
    if (G.score > (save.best[G.stage] || 0)) save.best[G.stage] = G.score;
    if (G.stage + 1 >= save.open) save.open = Math.min(STAGES.length, G.stage + 2);
    storeSave();
    bgmStop(); sfxClear(true);
    return;
  }
  if (G.time <= 0) {
    G.time = 0; G.over = true;
    bgmStop(); sfxOver(); storeSave();
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawSky() {
  const g = ctx.createLinearGradient(0, -VOY, 0, HZ + 40);
  g.addColorStop(0, '#1E4E86');
  g.addColorStop(0.6, '#4E92C8');
  g.addColorStop(1, '#BFE4F4');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HZ + VOY + 44);
  // おひさま
  ctx.fillStyle = 'rgba(255,240,190,0.9)';
  circle(VW * 0.78, 62, 22); ctx.fill();
  // 山（カーブで すこし 動く）
  const sh = -G.curve * 70;
  ctx.fillStyle = '#9EC6DE';
  ctx.beginPath();
  ctx.moveTo(-VW, HZ + 2);
  for (let i = -2; i <= 12; i++) {
    const bx = VW * (i / 10) + sh;
    ctx.lineTo(bx, HZ + 2);
    ctx.lineTo(bx + VW * 0.05, HZ - 42 - (i % 3) * 16);
    ctx.lineTo(bx + VW * 0.10, HZ + 2);
  }
  ctx.lineTo(VW * 2, HZ + 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#EAF6FF';
  ctx.beginPath();
  for (let i = -2; i <= 12; i++) {
    const bx = VW * (i / 10) + sh;
    const top = HZ - 42 - (i % 3) * 16;
    ctx.moveTo(bx + VW * 0.05, top);
    ctx.lineTo(bx + VW * 0.072, top + 16);
    ctx.lineTo(bx + VW * 0.028, top + 16);
    ctx.closePath();
  }
  ctx.fill();
}

function drawRoad() {
  // 雪原
  ctx.fillStyle = '#CFE6F2';
  ctx.fillRect(-VW, HZ, VW * 3, VH - HZ + VOB + 8);
  const step = 2.2;
  for (let d = DRAW; d > 0.1; d -= step) {
    const a = proj(d, 0), b = proj(Math.max(0.2, d - step), 0);
    const band = Math.floor((G.pz + d) / 7) % 2;
    // まわりの 雪
    ctx.fillStyle = band ? '#E8F4FB' : '#DCEEF8';
    ctx.beginPath();
    ctx.moveTo(-VW, a.y); ctx.lineTo(VW * 2, a.y);
    ctx.lineTo(VW * 2, b.y); ctx.lineTo(-VW, b.y);
    ctx.closePath(); ctx.fill();
    // 氷の 道
    ctx.fillStyle = band ? '#B4DCF0' : '#A8D4EC';
    ctx.beginPath();
    ctx.moveTo(a.x - a.w / 2, a.y); ctx.lineTo(a.x + a.w / 2, a.y);
    ctx.lineTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x - b.w / 2, b.y);
    ctx.closePath(); ctx.fill();
    // ふちの 線
    ctx.fillStyle = band ? '#F2FAFF' : '#6FA8CC';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a.x + sg * a.w / 2, a.y);
      ctx.lineTo(a.x + sg * (a.w / 2 + a.w * 0.035), a.y);
      ctx.lineTo(b.x + sg * (b.w / 2 + b.w * 0.035), b.y);
      ctx.lineTo(b.x + sg * b.w / 2, b.y);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawFish(x, y, s, col) {
  ctx.fillStyle = col || '#6FC8E8';
  ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.9, y);
  ctx.lineTo(x - s * 1.6, y - s * 0.55);
  ctx.lineTo(x - s * 1.6, y + s * 0.55);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFF';
  circle(x + s * 0.4, y - s * 0.16, s * 0.2); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x + s * 0.45, y - s * 0.16, s * 0.1); ctx.fill();
}

function drawSeal(x, y, s, t) {
  const bob = Math.sin(t * 4) * s * 0.08;
  ctx.fillStyle = '#7F8CA0';
  ctx.beginPath(); ctx.ellipse(x, y - s * 0.4 + bob, s * 1.1, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  circle(x + s * 0.75, y - s * 0.85 + bob, s * 0.5); ctx.fill();
  ctx.fillStyle = '#9DA9BC';
  ctx.beginPath(); ctx.ellipse(x - s * 0.2, y - s * 0.28 + bob, s * 0.72, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x + s * 0.9, y - s * 0.95 + bob, s * 0.1); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  circle(x + s * 1.05, y - s * 0.72 + bob, s * 0.13); ctx.fill();
}

function drawObjects() {
  const list = [];
  for (const o of G.obj) {
    const dz = o.z - G.pz + PDZ;
    if (dz < 1.2 || dz > DRAW) continue;
    if (o.k === 'fish' && o.got) continue;
    list.push(o);
  }
  list.sort((a, b) => b.z - a.z);
  for (const o of list) {
    const dz = o.z - G.pz + PDZ;
    const p = proj(dz, o.x);
    const s = p.s;
    if (o.k === 'hole') {
      ctx.fillStyle = 'rgba(20,45,70,0.92)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.w * 0.19, p.w * 0.062, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(120,190,225,0.9)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - p.w * 0.012, p.w * 0.19, p.w * 0.055, 0, Math.PI, Math.PI * 2); ctx.fill();
    } else if (o.k === 'rock') {
      const r = 34 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.9, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8FD0EC';
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.8, p.y);
      ctx.lineTo(p.x - r * 0.3, p.y - r * 1.3);
      ctx.lineTo(p.x + r * 0.25, p.y - r * 0.9);
      ctx.lineTo(p.x + r * 0.8, p.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.3, p.y - r * 1.3);
      ctx.lineTo(p.x + r * 0.25, p.y - r * 0.9);
      ctx.lineTo(p.x, p.y - r * 0.5);
      ctx.closePath(); ctx.fill();
    } else if (o.k === 'fish') {
      drawFish(p.x, p.y - 22 * s + Math.sin(G.t * 5 + o.z) * 5 * s, 20 * s);
    } else if (o.k === 'seal') {
      drawSeal(p.x, p.y, 30 * s, G.t + o.ph);
    } else if (o.k === 'flag' || o.k === 'goalpost') {
      const h = (o.k === 'goalpost' ? 120 : 70) * s;
      ctx.fillStyle = '#7A5A3A';
      ctx.fillRect(p.x - 2.5 * s, p.y - h, 5 * s, h);
      ctx.fillStyle = o.k === 'goalpost' ? '#FFD24A' : '#FF6FA8';
      ctx.beginPath();
      ctx.moveTo(p.x + 2 * s, p.y - h);
      ctx.lineTo(p.x + 42 * s, p.y - h + 12 * s);
      ctx.lineTo(p.x + 2 * s, p.y - h + 24 * s);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawMe() {
  const p = proj(PDZ, G.x);
  const hop = G.air > 0 ? Math.sin((1 - G.air / JUMP_T) * Math.PI) : 0;
  const y = p.y - hop * 74;
  const s = 34;
  // かげ
  ctx.fillStyle = 'rgba(30,60,90,' + (0.28 - hop * 0.16) + ')';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 4, s * 0.62 * (1 - hop * 0.25), s * 0.2 * (1 - hop * 0.25), 0, 0, Math.PI * 2);
  ctx.fill();
  // 雪けむり
  if (Math.abs(G.x) > 1 || G.stun > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 5; i++) {
      const a = G.t * 9 + i;
      circle(p.x + Math.sin(a) * 22, p.y - 4 + Math.cos(a * 1.3) * 6, 7 + (i % 3) * 3);
      ctx.fill();
    }
  }
  drawPapa(p.x, y - s * 0.9, s, {
    dir: 1, walk: G.stun > 0 ? 0 : G.pz * 0.32, shirt: '#E8543A',
    face: G.stun > 0 ? 'oops' : 'happy',
  });
  // マフラー（首の ところ。顔に かからない ように）
  ctx.fillStyle = '#FFD24A';
  const fl = Math.sin(G.t * 12) * 6;
  ctx.beginPath();
  ctx.moveTo(p.x - s * 0.42, y - s * 0.98);
  ctx.lineTo(p.x - s * 1.30, y - s * 1.18 + fl);
  ctx.lineTo(p.x - s * 1.25, y - s * 0.88 + fl);
  ctx.lineTo(p.x - s * 0.42, y - s * 0.78);
  ctx.closePath(); ctx.fill();
  rr(p.x - s * 0.50, y - s * 1.06, s * 1.00, s * 0.22, s * 0.10); ctx.fill();

  for (const sp of G.sparks) {
    ctx.globalAlpha = clamp(sp.t / 0.6, 0, 1);
    ctx.fillStyle = '#FFF';
    circle(p.x + sp.x, p.y + sp.y, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPlay() {
  const S = STAGES[G.stage];
  drawSky();
  drawRoad();
  drawObjects();
  drawMe();

  drawStick();
  drawFire('ジャンプ', '#FFD24A');
  drawHud();

  if (G.ready > 0) bigText(S.name + '　よーい！', VW / 2, VH * 0.42, 34, '#FFD24A');
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2.4);
    bigText(G.msg, VW / 2, HUD + 44, 24, '#FFF2C0');
    ctx.globalAlpha = 1;
  }
  if (G.won) {
    const last = G.stage >= STAGES.length - 1;
    drawResult(true, last ? 'ぜんぶ ゴール！' : 'ゴール！',
      ['スコア ' + G.score + '　さかな ' + G.fish + 'ひき',
       'のこり時間 ' + G.time.toFixed(1) + 'びょう'],
      last ? [{ label: 'タイトルへ', on: () => { G.screen = 'title'; } }]
           : [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
              { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
  if (G.over) {
    drawResult(false, '時間ぎれ…',
      ['すすんだ きょり ' + Math.round(G.pz) + ' / ' + S.len,
       'さかな ' + G.fish + 'ひき'],
      [{ label: 'もういちど', on: () => startStage(G.stage) },
       { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  const S = STAGES[G.stage];
  ctx.fillStyle = 'rgba(0,0,0,0.40)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = G.time < 8 ? '#FF8A8A' : '#FFD24A';
  ctx.fillText('のこり ' + G.time.toFixed(1), 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#E8F4FF';
  ctx.fillText('さかな ' + G.fish, 108, HUD / 2);
  ctx.fillText('スコア ' + G.score, 180, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText(S.name, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // すすみぐあいの バー
  const bx = 262, bw = Math.max(80, VW - bx - 74);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(bx, HUD / 2 - 4, bw, 8, 4); ctx.fill();
  ctx.fillStyle = '#7ADCB0';
  rr(bx, HUD / 2 - 4, bw * clamp(G.pz / S.len, 0, 1), 8, 4); ctx.fill();
}

function drawTitle() {
  drawSky();
  ctx.fillStyle = '#DCEEF8';
  ctx.fillRect(-VW, HZ, VW * 3, VH - HZ + VOB + 8);
  bigText('リナパパの', VW / 2, 40, 22, '#FFF2C0');
  bigText('なんきょくダッシュ', VW / 2, 78,
          fitSize('なんきょくダッシュ', VW * 0.62, 44), '#FFD24A');
  bigText('氷の あなを ジャンプで こえて ゴールへ！ さかなも ひろおう', VW / 2, 116, 16, '#0E3050', null);
  bigText('左で よける・上で ダッシュ／右を おすと ジャンプ', VW / 2, 140, 15, '#20496E', null);
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 166,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 36, () => sfxTest()), '♪ おと', '#8AD8F0');
  bigText('これまでに ' + save.fish + 'ひき ひろった', VW / 2, VH - 18, 14, '#0E3050', null);
  drawFish(VW * 0.12, VH - 60, 22);
  drawSeal(VW * 0.88, VH - 44, 24, G.t);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(20,50,80,0.55)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  drawSky();
  ctx.fillStyle = '#DCEEF8';
  ctx.fillRect(-VW, HZ, VW * 3, VH - HZ + VOB + 8);
  bigText('あそびかた', VW / 2, 40, 28, '#FFD24A');
  const lines = [
    '① パパは かってに 走る。左の スティックで よこに よける',
    '② スティックを 上に すると ダッシュ、下に すると ゆっくり',
    '③ 右がわを おすと ジャンプ。氷の あなは とんで こえる',
    '④ さかなを ひろうと てんすう と 時間が すこし ふえる',
    '⑤ 道の そとは 雪。すごく おそく なるので 気をつけて',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 90 + i * 34, fitSize(s, VW * 0.88, 17), '#12354F', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 62, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
