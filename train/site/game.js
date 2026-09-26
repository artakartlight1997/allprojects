// りなの モノレール運転士。
// 「電車でGO!」みたいに、レバーで スピードを かえて えきの「とまれ」の いちに ぴったり とめる。
// コースは 千葉都市モノレール 2号線の えきの じゅんばん（千城台 → 千葉）。
// きょり・せいげん そくど・じかんは ゲームの ための もので、ほんものとは ちがう。

'use strict';

const SAVE = 'monorailgo.v1';
const STATIONS = [
  ['千城台', 'ちしろだい'], ['千城台北', 'ちしろだいきた'], ['小倉台', 'おぐらだい'], ['桜木', 'さくらぎ'],
  ['都賀', 'つが'], ['みつわ台', 'みつわだい'], ['動物公園', 'どうぶつこうえん'], ['スポーツセンター', 'すぽーつせんたー'],
  ['穴川', 'あながわ'], ['天台', 'てんだい'], ['作草部', 'さくさべ'], ['千葉公園', 'ちばこうえん'], ['千葉', 'ちば'],
];
// 1くかん ごとの コース（len: きょり m、lim: せいげん そくど の くかん、curve: カーブ、wx: てんき）
const STAGES = [
  { len: 700,  max: 50, lims: [], curves: [], wx: 'sun', par: 88 },
  { len: 900,  max: 55, lims: [], curves: [[300, 600, 1]], wx: 'sun', par: 100 },
  { len: 1000, max: 60, lims: [[350, 650, 40]], curves: [[350, 650, -1]], wx: 'sun', par: 118 },
  { len: 1100, max: 60, lims: [[200, 450, 45]], curves: [[200, 450, 1], [700, 900, -1]], wx: 'cloud', par: 118 },
  { len: 1300, max: 65, lims: [[500, 800, 40]], curves: [[500, 800, -1]], wx: 'rain', par: 130 },
  { len: 1200, max: 65, lims: [[250, 500, 45], [800, 1000, 50]], curves: [[250, 500, 1], [800, 1000, 1]], wx: 'sun', par: 128 },
  { len: 1400, max: 65, lims: [[600, 950, 35]], curves: [[600, 950, -1]], wx: 'evening', par: 152 },
  { len: 1300, max: 65, lims: [[300, 550, 45], [850, 1100, 40]], curves: [[300, 550, -1], [850, 1100, 1]], wx: 'rain', par: 136 },
  { len: 1500, max: 65, lims: [[450, 800, 40], [1100, 1300, 50]], curves: [[450, 800, 1], [1100, 1300, -1]], wx: 'night', par: 156 },
  { len: 1200, max: 65, lims: [[200, 500, 35], [800, 1000, 45]], curves: [[200, 500, -1], [800, 1000, 1]], wx: 'fog', par: 144 },
  { len: 1600, max: 65, lims: [[400, 700, 45], [900, 1200, 35]], curves: [[400, 700, 1], [900, 1200, -1]], wx: 'night', par: 174 },
  { len: 1800, max: 65, lims: [[300, 600, 40], [900, 1150, 45], [1350, 1550, 35]], curves: [[300, 600, -1], [900, 1150, 1], [1350, 1550, -1]], wx: 'rain', par: 186 },
];
// レバー（上から P4 … N … B7 EB）
const NOTCH = ['P4', 'P3', 'P2', 'P1', 'N', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'EB'];
const NIDX = 4;   // N の いち
function accelOf(n, wet) {
  const k = NOTCH[n];
  if (k[0] === 'P') return [1.0, 1.8, 2.6, 3.4][+k[1] - 1];
  if (k === 'N') return -0.25;
  if (k === 'EB') return -6.5 * (wet ? 0.8 : 1);
  return -(0.7 + (+k[1] - 1) * 0.62) * (wet ? 0.82 : 1);   // km/h まいびょう
}

const sv = Object.assign({ best: {}, open: 1 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }

const G = { mode: 'title', t: 0 };

// --- はしる ---------------------------------------------------------------------------

function startStage(i) {
  const S = STAGES[i];
  G.mode = 'run';
  G.R = { i, S, pos: 0, v: 0, notch: NIDX + 2, time: 0, over: 0, ats: 0, msg: '', msgT: 0, done: null, stopT: 0,
    horn: 0, door: 0, said: {}, objs: makeObjs(S, i), wet: S.wx === 'rain', flash: 0 };
  sayR('しゅっぱつ しんこう！ レバーを 上に して すすもう', 3);
  jingle([72, 76, 79], 0.1, 'triangle', 0.1);
}
function sayR(s, t) { G.R.msg = s; G.R.msgT = t || 2.5; }
function limitAt(S, p) { for (const [a, b, l] of S.lims) if (p >= a - 30 && p <= b) return l; return S.max; }
function curveAt(S, p) { for (const [a, b, c] of S.curves) if (p >= a && p <= b) return c * Math.sin((p - a) / (b - a) * Math.PI); return 0; }

// まわりの もの（家・木・はしら・ひょうしき）を ならべる
function makeObjs(S, si) {
  const o = [];
  let seed = si * 7919 + 13;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let z = 0; z < S.len + 300; z += 18) {
    for (const side of [-1, 1]) {
      if (r() < 0.55) {
        const kind = r() < 0.35 ? 'tree' : r() < 0.5 ? 'sakura' : r() < 0.8 ? 'house' : 'mansion';
        o.push({ z: z + r() * 12, x: side * (14 + r() * 40), kind, c: ['#F2E6D0', '#E8D8F0', '#D8E8F8', '#F8E0D0', '#E0F0D8'][Math.floor(r() * 5)], h: 6 + r() * 10 });
      }
    }
  }
  for (let z = 30; z < S.len + 300; z += 30) o.push({ z, x: 0, kind: 'pillar' });
  for (const [a, b, l] of S.lims) { o.push({ z: a - 30, x: 5, kind: 'limit', l }); o.push({ z: b, x: 5, kind: 'limit', l: S.max }); }
  o.push({ z: S.len - 400, x: 5, kind: 'board', s: '400' });
  o.push({ z: S.len - 200, x: 5, kind: 'board', s: '200' });
  o.push({ z: S.len - 100, x: 5, kind: 'board', s: '100' });
  o.push({ z: S.len - 90, x: 0, kind: 'station', len: 110 });
  o.push({ z: S.len, x: 4.5, kind: 'stop' });
  return o;
}

function updateRun(dt) {
  const R = G.R, S = R.S;
  if (R.msgT > 0) R.msgT -= dt;
  if (R.horn > 0) R.horn -= dt;
  if (R.flash > 0) R.flash -= dt;
  if (R.done) { R.door = Math.min(1, R.door + dt * 0.8); return; }
  R.time += dt;
  let a = accelOf(R.notch, R.wet);
  if (R.ats > 0) { a = -6.5; R.ats -= dt; }
  // たかい スピードほど かそく しにくい
  if (a > 0) a *= Math.max(0.2, 1 - R.v / 80);
  R.v = Math.max(0, R.v + a * dt);
  R.pos += R.v / 3.6 * dt;
  const lim = limitAt(S, R.pos);
  if (R.v > lim + 1) {
    R.over += dt;
    if (!R.said['over' + lim]) { R.said['over' + lim] = 1; sayR('スピード いはん！ ' + lim + 'km/h まで だよ', 2.5); tone(900, 0.3, 'square', 0.08); }
    if (R.v > lim + 10 && R.ats <= 0) { R.ats = 1.5; R.flash = 0.3; sayR('ATS！ じどうで ブレーキが かかった！', 2.5); noise(0.4, 0.2, 800); }
  }
  const left = S.len - R.pos;
  if (left < 420 && !R.said.near) { R.said.near = 1; sayR('つぎは ' + STATIONS[R.i + 1][1] + '。 ブレーキの じゅんび！', 3); }
  // とまった？
  if (R.v === 0 && R.pos > 20) {
    R.stopT += dt;
    if (left < -5) finish(false, 'オーバーラン！ とまる いちを すぎちゃった');
    else if (Math.abs(left) <= 5 && R.stopT > 0.4) finish(true);
    else if (left > 5 && left < 60 && R.stopT > 0.6 && !R.said['short' + Math.round(R.pos / 10)]) { R.said['short' + Math.round(R.pos / 10)] = 1; sayR('まだ ' + Math.round(left) + 'm てまえ。 すこし すすもう', 2.5); }
  } else R.stopT = 0;
  if (left < -40) finish(false, 'オーバーラン！ とまる いちを すぎちゃった');
}

function finish(ok, why) {
  const R = G.R, S = R.S;
  const err = Math.abs(S.len - R.pos);
  if (!ok) { R.done = { ok: false, why }; tone(220, 0.6, 'square', 0.1, 110); return; }
  let pts = 0, stop;
  if (err <= 0.5) { pts += 100; stop = 'ぴったり！'; } else if (err <= 1) { pts += 80; stop = 'すごく おしい！'; } else if (err <= 3) { pts += 50; stop = 'いいかんじ'; } else { pts += 20; stop = 'とまれた'; }
  const late = R.time - S.par;
  let tp = late <= 0 ? 60 : Math.max(0, 60 - Math.round(late * 3));
  const sp = Math.max(0, 40 - Math.round(R.over * 8));
  pts += tp + sp;
  const stars = pts >= 170 ? 3 : pts >= 120 ? 2 : 1;
  R.done = { ok: true, err, stop, pts, tp, sp, late, stars };
  const b = sv.best[R.i] || { pts: 0, stars: 0 };
  sv.best[R.i] = { pts: Math.max(b.pts, pts), stars: Math.max(b.stars, stars) };
  sv.open = Math.max(sv.open, Math.min(STAGES.length, R.i + 2));
  save();
  jingle(stars === 3 ? [72, 76, 79, 84, 88] : [72, 76, 79], 0.1, 'square', 0.13);
}

// --- え -------------------------------------------------------------------------------

const SKY = {
  sun: ['#7EC8F8', '#D8F0FF'], cloud: ['#A8C0D8', '#E0E8F0'], rain: ['#6A7A90', '#A8B4C4'],
  evening: ['#F08A5A', '#FFD8A8'], night: ['#0E1838', '#2A3A6A'], fog: ['#C8D0D8', '#E8ECF0'],
};

function drawRun(t) {
  const R = G.R, S = R.S;
  const HY = 190, F = 380;                       // ちへいせん と しゃしんの つよさ
  const cx = VW / 2, camY = 9;                  // うんてんせきの たかさ（じめん から）
  const sky = SKY[S.wx];
  ctx.fillStyle = grad(0, HY, sky[0], sky[1]); ctx.fillRect(0, 0, VW, HY);
  if (S.wx === 'night') for (let i = 0; i < 40; i++) fillC((i * 97) % VW, (i * 41) % HY, 1.3, '#FFF6C8');
  const gcol = S.wx === 'night' ? '#1E2A2A' : S.wx === 'evening' ? '#8AA060' : '#8FCB6E';
  ctx.fillStyle = grad(HY, VH, S.wx === 'night' ? '#0E1A1A' : '#A8D890', gcol); ctx.fillRect(0, HY, VW, VH - HY);
  // カーブ：まえの ほうが よこに ずれる
  const bend = (z) => { let s = 0; for (let k = 0; k < z; k += 20) s += curveAt(S, R.pos + k) * 0.0009 * Math.min(20, z - k) * (z - k); return s; };
  const proj = (x, y, z) => { const zz = Math.max(1, z); return { x: cx + (x + bend(zz)) * F / zz, y: HY + (camY - y) * F / zz, s: F / zz }; };
  // したの みち（どうろ）
  ctx.fillStyle = S.wx === 'night' ? '#2A2A30' : '#9A9AA4';
  ctx.beginPath();
  const pts = [];
  for (let z = 6; z <= 600; z *= 1.25) pts.push([proj(-5, 0, z), proj(5, 0, z)]);
  ctx.moveTo(pts[0][0].x, pts[0][0].y);
  for (const p of pts) ctx.lineTo(p[0].x, p[0].y);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][1].x, pts[i][1].y);
  ctx.fill();
  // まわりの もの（とおい じゅん）
  const vis = R.objs.filter((o) => o.z - R.pos > 3 && o.z - R.pos < 650).sort((a, b) => b.z - a.z);
  for (const o of vis) drawObj(o, o.z - R.pos, proj, t, S);
  // うえの レール（ぶらさがって はしる）
  ctx.fillStyle = '#C8D0DA';
  ctx.beginPath();
  const bp = [];
  for (let z = 14; z <= 650; z *= 1.2) bp.push([proj(-0.45, 12.5, z), proj(0.45, 12.5, z), proj(0.45, 11.6, z)]);
  ctx.moveTo(bp[0][0].x, bp[0][0].y);
  for (const p of bp) ctx.lineTo(p[0].x, p[0].y);
  for (let i = bp.length - 1; i >= 0; i--) ctx.lineTo(bp[i][1].x, bp[i][1].y);
  ctx.fill();
  ctx.fillStyle = '#9AA2AE';
  ctx.beginPath(); ctx.moveTo(bp[0][1].x, bp[0][1].y);
  for (const p of bp) ctx.lineTo(p[1].x, p[1].y);
  for (let i = bp.length - 1; i >= 0; i--) ctx.lineTo(bp[i][2].x, bp[i][2].y);
  ctx.fill();
  // てんき
  if (S.wx === 'rain') { ctx.strokeStyle = 'rgba(220,230,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 70; i++) { const x = (i * 131 + t * 300) % VW, y = (i * 71 + t * 900) % 360; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); } ctx.stroke(); }
  if (S.wx === 'fog') { ctx.fillStyle = 'rgba(235,238,242,0.55)'; ctx.fillRect(0, 0, VW, 380); }
  if (S.wx === 'night') { const g = ctx.createRadialGradient(cx, HY + 40, 20, cx, HY + 40, 300); g.addColorStop(0, 'rgba(255,240,180,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 380); }
  // まどわく
  fillR(0, 0, VW, 14, '#2A3448'); fillR(0, 0, 18, 380, '#2A3448'); fillR(VW - 18, 0, 18, 380, '#2A3448');
  if (S.wx === 'rain') { ctx.strokeStyle = 'rgba(40,50,70,0.8)'; ctx.lineWidth = 5; const a = Math.sin(t * 3) * 0.9; ctx.beginPath(); ctx.moveTo(VW * 0.3, 380); ctx.lineTo(VW * 0.3 + Math.sin(a) * 260, 380 - Math.cos(a) * 260); ctx.stroke(); }
  drawCab(t);
  if (R.flash > 0) fillR(0, 0, VW, VH, 'rgba(255,60,60,' + R.flash + ')');
  if (R.done) drawResult(t);
}

function drawObj(o, z, proj, t, S) {
  const night = S.wx === 'night';
  if (o.kind === 'pillar') {
    if (z < 10) return;
    // はしらは よこに たって いて、うでで レールを つって いる
    const a = proj(-5, 0, z), b = proj(-5, 13, z), c = proj(0.6, 13, z), w = Math.max(1, 1.1 * a.s);
    const col = night ? '#4A5260' : '#B8C0CC';
    fillR(a.x - w / 2, b.y, w, a.y - b.y, col);
    fillR(b.x - w / 2, b.y, c.x - b.x + w / 2, Math.max(1, 0.8 * a.s), col);
  } else if (o.kind === 'tree' || o.kind === 'sakura') {
    const a = proj(o.x, 0, z), r = 3.5 * a.s;
    if (a.x < -r * 2 || a.x > VW + r * 2) return;
    fillR(a.x - r * 0.15, a.y - r * 1.4, r * 0.3, r * 1.4, '#7A5234');
    fillC(a.x, a.y - r * 1.8, r, o.kind === 'sakura' ? (night ? '#8A6070' : '#FFB8D0') : (night ? '#1E3A24' : '#3E9B4F'));
  } else if (o.kind === 'house' || o.kind === 'mansion') {
    const a = proj(o.x, 0, z), s = a.s;
    const w = (o.kind === 'mansion' ? 12 : 8) * s, h = (o.kind === 'mansion' ? o.h + 10 : 6) * s;
    if (a.x + w < 0 || a.x - w > VW) return;
    fillR(a.x - w / 2, a.y - h, w, h, night ? '#3A4050' : o.c);
    if (o.kind === 'house') { ctx.fillStyle = night ? '#402A2A' : '#C84A3A'; ctx.beginPath(); ctx.moveTo(a.x - w * 0.6, a.y - h); ctx.lineTo(a.x, a.y - h - w * 0.45); ctx.lineTo(a.x + w * 0.6, a.y - h); ctx.fill(); }
    else if (s > 1.2) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) fillR(a.x - w * 0.38 + c * w * 0.28, a.y - h + h * 0.12 + r * h * 0.22, w * 0.16, h * 0.1, night ? '#FFE890' : '#8AC8F0');
  } else if (o.kind === 'limit' || o.kind === 'board') {
    const a = proj(o.x, 6, z), r = Math.max(2, 1.2 * a.s);
    if (o.kind === 'limit') { fillC(a.x, a.y, r, '#FFFFFF'); ctx.strokeStyle = '#E04A4A'; ctx.lineWidth = r * 0.2; circ(a.x, a.y, r * 0.9); ctx.stroke(); if (r > 6) text(o.l, a.x, a.y, r, '#2A2A3A', 'center'); }
    else { fillR(a.x - r, a.y - r * 0.7, r * 2, r * 1.4, '#FFE066'); if (r > 6) text(o.s, a.x, a.y, r * 0.8, '#2A2A3A', 'center'); }
  } else if (o.kind === 'station') {
    // ホーム：りょうがわに やねと ホーム
    for (const side of [-1, 1]) {
      const p0 = proj(side * 4, 3, z), p1 = proj(side * 4, 3, z + o.len), q0 = proj(side * 9, 3, z), q1 = proj(side * 9, 3, z + o.len);
      ctx.fillStyle = night ? '#4A4A58' : '#D8D4CC';
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(q1.x, q1.y); ctx.lineTo(q0.x, q0.y); ctx.fill();
      const r0 = proj(side * 4, 7, z), r1 = proj(side * 4, 7, z + o.len), s0 = proj(side * 9, 7.5, z), s1 = proj(side * 9, 7.5, z + o.len);
      ctx.fillStyle = night ? '#5A6070' : '#E8ECF0';
      ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s0.x, s0.y); ctx.fill();
      // えきの なまえ
      const n = proj(side * 6, 5.5, z + 20);
      if (n.s > 3) { const w = 6 * n.s; fillRR(n.x - w / 2, n.y - n.s, w, n.s * 2, 3, '#2A3A6A'); text(STATIONS[G.R.i + 1][1], n.x, n.y, n.s * 0.9, '#FFFFFF', 'center', true, w - 4); }
    }
  } else if (o.kind === 'stop') {
    const a = proj(o.x, 4, z), r = Math.max(2, 1.6 * a.s);
    fillR(a.x - r * 0.1, a.y, r * 0.2, r * 3, '#6A6A7A');
    fillRR(a.x - r, a.y - r, r * 2, r * 1.6, r * 0.2, '#FFFFFF');
    ctx.strokeStyle = '#E04A4A'; ctx.lineWidth = Math.max(1, r * 0.15); rr(a.x - r, a.y - r, r * 2, r * 1.6, r * 0.2); ctx.stroke();
    if (r > 5) text('とまれ', a.x, a.y - r * 0.2, r * 0.55, '#E04A4A', 'center', true);
  }
}

// うんてんせき（メーター・レバー・りな）
function leverRect() { return { x: VW - 170, y: 392, w: 150, h: 140 }; }
function drawCab(t) {
  const R = G.R, S = R.S;
  ctx.fillStyle = grad(380, VH, '#3A4458', '#1E2432'); ctx.fillRect(0, 380, VW, VH - 380);
  // スピードメーター
  const mx = 92, my = 470, mr = 62;
  fillC(mx, my, mr + 6, '#10141E'); fillC(mx, my, mr, '#F4F4F0');
  const a0 = Math.PI * 0.75, span = Math.PI * 1.5, vmax = 80;
  const lim = limitAt(S, R.pos);
  ctx.strokeStyle = '#E04A4A'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(mx, my, mr - 6, a0 + span * lim / vmax, a0 + span); ctx.stroke();
  for (let v = 0; v <= vmax; v += 10) { const a = a0 + span * v / vmax; ctx.strokeStyle = '#2A2A3A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * (mr - 14), my + Math.sin(a) * (mr - 14)); ctx.lineTo(mx + Math.cos(a) * (mr - 4), my + Math.sin(a) * (mr - 4)); ctx.stroke(); if (v % 20 === 0) text(v, mx + Math.cos(a) * (mr - 26), my + Math.sin(a) * (mr - 26), 11, '#2A2A3A', 'center'); }
  const na = a0 + span * Math.min(R.v, vmax) / vmax;
  ctx.strokeStyle = '#E04A4A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(na) * (mr - 10), my + Math.sin(na) * (mr - 10)); ctx.stroke();
  fillC(mx, my, 6, '#2A2A3A');
  text(Math.floor(R.v), mx, my + 30, 20, '#2A2A3A', 'center');
  text('km/h', mx, my + 48, 11, '#6A6A7A', 'center');
  // じょうほう
  const left = S.len - R.pos;
  const L = leverRect();
  const ix = 172, iw = clamp(L.x - 120 - ix - 10, 200, 250);
  fillRR(ix, 392, iw, 138, 12, '#10141E');
  text('つぎは ' + STATIONS[R.i + 1][0], ix + 14, 412, 17, '#FFE066', 'left', true, iw - 28);
  text('のこり', ix + 14, 446, 15, '#A8B4C8', 'left', false);
  text(left > 0 ? (left < 100 ? left.toFixed(1) : Math.round(left)) + ' m' : 'すぎた ' + Math.abs(left).toFixed(1) + ' m', ix + iw - 14, 446, 26, left < 0 ? '#FF8A8A' : '#7FE0A0', 'right');
  const tl = S.par - R.time;
  text('じかん', ix + 14, 480, 15, '#A8B4C8', 'left', false);
  text((tl >= 0 ? 'あと ' : 'おくれ ') + Math.abs(Math.ceil(tl)) + ' びょう', ix + iw - 14, 480, 20, tl >= 0 ? '#FFFFFF' : '#FF8A8A', 'right');
  text('せいげん ' + lim + ' km/h', ix + 14, 512, 15, R.v > lim + 1 ? '#FF8A8A' : '#A8B4C8', 'left', true);
  // りな
  const rx0 = ix + iw + 8, rx1 = L.x - 118;
  if (rx1 - rx0 > 110) {
    ctx.save(); ctx.beginPath(); ctx.rect(rx0, 380, rx1 - rx0, VH - 380); ctx.clip();
    drawKid('rina', (rx0 + rx1) / 2, VH + 60, 190, { t, pose: R.done && R.done.ok ? 'cheer' : 'stand' });
    ctx.restore();
  }
  if (R.msgT > 0) {
    const bw = Math.min(460, VW - 520);
    fillRR(VW / 2 - bw / 2, 300, bw, 60, 14, 'rgba(255,255,255,0.94)');
    
    text(R.msg, VW / 2, 330, 17, '#2A2440', 'center', true, bw - 24);
  }
  // けいてき
  btn(VW - 124, 24, 100, 44, 'けいてき', () => { G.R.horn = 0.6; tone(330, 0.6, 'square', 0.08); tone(415, 0.6, 'square', 0.06); }, { col: '#FFE066', size: 16 });
  // レバー
  fillRR(L.x - 8, L.y - 4, L.w + 16, L.h + 8, 12, '#10141E');
  const n = NOTCH.length, rowH = L.h / n;
  for (let i = 0; i < n; i++) {
    const k = NOTCH[i];
    const col = k[0] === 'P' ? '#6AC8FF' : k === 'N' ? '#FFFFFF' : k === 'EB' ? '#FF5A5A' : '#FFB84A';
    text(k, L.x + 22, L.y + rowH * (i + 0.5), 10, i === R.notch ? col : 'rgba(255,255,255,0.4)', 'center');
  }
  const hy = L.y + rowH * (R.notch + 0.5);
  fillRR(L.x + 40, L.y + 4, 10, L.h - 8, 5, '#3A4458');
  fillRR(L.x + 34, hy - 10, L.w - 44, 20, 8, NOTCH[R.notch][0] === 'P' ? '#6AC8FF' : NOTCH[R.notch] === 'N' ? '#E8E8F0' : '#FFB84A');
  text(NOTCH[R.notch], L.x + L.w / 2 + 16, hy, 14, '#10141E', 'center');
  btn(L.x - 110, L.y, 96, 64, '▲ すすむ', () => setNotch(R.notch - 1), { col: '#9AD8FF', size: 16 });
  btn(L.x - 110, L.y + 72, 96, 64, '▼ とめる', () => setNotch(R.notch + 1), { col: '#FFC88A', size: 16 });
  btn(14, 14, 90, 40, 'やめる', () => { G.mode = 'title'; }, { col: 'rgba(255,255,255,0.85)', size: 15 });
}
function setNotch(n) {
  const R = G.R;
  if (!R || R.done) return;
  n = clamp(n, 0, NOTCH.length - 1);
  if (n !== R.notch) { R.notch = n; tone(n < NIDX ? 900 : n === NIDX ? 700 : 500, 0.05, 'square', 0.06); }
}

function drawResult(t) {
  const d = G.R.done;
  fillR(0, 0, VW, VH, 'rgba(0,0,0,0.45)');
  const w = 520, x = VW / 2 - w / 2;
  fillRR(x, 60, w, 400, 20, '#FFFFFF');
  if (!d.ok) {
    textO('ざんねん…', VW / 2, 130, 44, '#8A9AB0', '#FFFFFF');
    text(d.why, VW / 2, 200, 19, '#2A2440', 'center', true, w - 40);
    text('「とまれ」の まえで ブレーキを つよく しよう', VW / 2, 240, 17, '#6A6A7A', 'center', false, w - 40);
    btn(x + 40, 360, 210, 70, 'もういちど', () => startStage(G.R.i), { col: '#FFE066' });
    btn(x + 270, 360, 210, 70, 'えきを えらぶ', () => { G.mode = 'title'; }, { col: '#D8E8FF' });
    return;
  }
  textO(STATIONS[G.R.i + 1][0] + ' に とうちゃく！', VW / 2, 110, 34, '#FFB020', '#FFFFFF', 'center', w - 30);
  for (let i = 0; i < 3; i++) { star(VW / 2 - 60 + i * 60, 170, 24); ctx.fillStyle = i < d.stars ? '#FFD24A' : '#E0E0E8'; ctx.fill(); }
  const rows = [['とめた いち', d.stop + '（ずれ ' + d.err.toFixed(1) + 'm）'], ['じかん', d.late <= 0 ? 'ぴったり まにあった +' + d.tp : Math.ceil(d.late) + 'びょう おくれ +' + d.tp], ['スピード', d.sp >= 40 ? 'まもれた +' + d.sp : 'いはん あり +' + d.sp], ['てんすう', d.pts + ' てん']];
  rows.forEach((r, i) => { text(r[0], x + 40, 226 + i * 30, 17, '#6A6A7A', 'left', false); text(r[1], x + w - 40, 226 + i * 30, 18, '#2A2440', 'right', true, 300); });
  if (G.R.i + 1 < STAGES.length) btn(x + 40, 360, 210, 70, 'つぎの えきへ', () => startStage(G.R.i + 1), { col: '#9AF0B8' });
  else text('千葉えきまで ぜんぶ はしった！', x + 145, 395, 17, '#2A8A4A', 'center', true, 200);
  btn(x + 270, 360, 210, 70, 'もういちど', () => startStage(G.R.i), { col: '#FFE066' });
  void t;
}

// --- タイトル（ろせんず） -----------------------------------------------------------

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#7EC8F8', '#E8F6FF'); ctx.fillRect(0, 0, VW, VH);
  // レールと モノレール
  fillR(0, 118, VW, 10, '#C8D0DA');
  const mx = ((t * 120) % (VW + 300)) - 200;
  fillR(mx + 40, 128, 6, 10, '#6A7280'); fillR(mx + 150, 128, 6, 10, '#6A7280');
  fillRR(mx, 136, 200, 50, 14, '#FFFFFF'); fillR(mx, 168, 200, 6, '#3A7AD8');
  for (let i = 0; i < 5; i++) fillRR(mx + 14 + i * 36, 144, 28, 18, 4, '#2A3A5A');
  textO('りなの モノレール運転士', VW / 2, 50, 44, '#FFFFFF', '#2A4A7A');
  text('えきの「とまれ」に ぴったり とめよう', VW / 2, 92, 18, '#2A4A7A', 'center');
  // ろせんず
  const n = STATIONS.length, x0 = 60, x1 = VW - 70, y = 262;
  fillRR(x0 - 10, y - 5, x1 - x0 + 20, 10, 5, '#3A7AD8');
  STATIONS.forEach((s, i) => {
    const x = x0 + (x1 - x0) * i / (n - 1);
    fillC(x, y, 12, '#FFFFFF'); ctx.strokeStyle = '#3A7AD8'; ctx.lineWidth = 4; circ(x, y, 12); ctx.stroke();
    ctx.save(); ctx.translate(x, y + 24); ctx.rotate(0.6);
    text(s[0], 0, 0, 12, i === 2 ? '#E04A7A' : '#2A2440', 'left', true);
    ctx.restore();
  });
  // くかん ボタン
  STAGES.forEach((S, i) => {
    const xa = x0 + (x1 - x0) * i / (n - 1), xb = x0 + (x1 - x0) * (i + 1) / (n - 1);
    const open = i < sv.open;
    const b = sv.best[i];
    btn(xa + 4, y - 70, xb - xa - 8, 50, open ? String(i + 1) : '🔒', () => { if (open) startStage(i); }, { col: open ? (b ? '#9AF0B8' : '#FFE066') : 'rgba(150,160,180,0.6)', size: 18, off: !open });
    if (b) for (let k = 0; k < 3; k++) { star(xa + (xb - xa) / 2 - 12 + k * 12, y - 84, 6); ctx.fillStyle = k < b.stars ? '#FFB020' : 'rgba(255,255,255,0.8)'; ctx.fill(); }
  });
  drawKid('rina', 100, VH - 22, 140, { t, pose: 'wave', dir: 0 });
  fillRR(180, VH - 150, VW - 200, 116, 16, 'rgba(255,255,255,0.85)');
  const tips = ['▲ すすむ（P）で スピード アップ、▼ とめる（B）で ブレーキ。', '「のこり ○m」を 見ながら ブレーキを つよく したり よわく したり。',
    'えきの「とまれ」の いちで スピード 0 に なれば とうちゃく！', 'せいげん そくどを まもって、じかんにも まにあうと ★3つ。'];
  tips.forEach((s, i) => text(s, 196, VH - 130 + i * 26, 15, '#2A2440', 'left', false, VW - 230));
  text('えきの じゅんばんは 千葉都市モノレール 2号線。きょりや じかんは ゲームの ための もの だよ', VW / 2, VH - 10, 12, '#4A5A7A', 'center', false, VW - 40);
}

startGame({
  bg: '#2A4A7A',
  update(dt) { G.t += dt; if (G.mode === 'run') updateRun(dt); },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawRun(t); },
  down(x, y) {
    if (G.mode !== 'run') return;
    const L = leverRect();
    if (inBox(x, y, { x: L.x - 8, y: L.y - 4, w: L.w + 16, h: L.h + 8 })) { G.drag = true; setNotch(Math.floor((y - L.y) / (L.h / NOTCH.length))); }
  },
  move(x, y, drag) { if (drag && G.drag && G.mode === 'run') { const L = leverRect(); setNotch(Math.floor((y - L.y) / (L.h / NOTCH.length))); } },
  up() { G.drag = false; },
  key(code, down) {
    if (!down || G.mode !== 'run') return;
    if (code === 'ArrowUp' || code === 'KeyA') setNotch(G.R.notch - 1);
    if (code === 'ArrowDown' || code === 'KeyZ') setNotch(G.R.notch + 1);
    if (code === 'Space') { G.R.horn = 0.6; tone(330, 0.6, 'square', 0.08); }
  },
});
