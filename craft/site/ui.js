// 画面・そうさ・メニュー・セーブ。
//
// 3D は WebGL の canvas、文字とボタンは その上に重ねた 2D の canvas。
// スマホは よこ向き で、左半分＝歩く、右半分＝見まわす／掘る／置く。

'use strict';

const worldCv = document.getElementById('world');
const hudCv = document.getElementById('hud');
const hx = hudCv.getContext('2d');

let W2 = 0, H2 = 0;        // 画面の大きさ（CSS ピクセル）
let glOK = false;
let scr = 'title';         // title / play / inv / menu / howto
let dayT = 0.42;           // 0..1 で 1 日。はじまりは 昼まえ
const DAY_LEN = 420;       // 1 日 = 7 分

const UI = { buttons: [], tab: 'craft', page: 0, msg: '', msgT: 0, hint: 4 };

// --- 大きさ -----------------------------------------------------------------

function layout() {
  W2 = window.innerWidth; H2 = window.innerHeight;
  // 3D は 見た目が あらくても わからないので すこし 小さく描いて 軽くする
  const dw = Math.min(1.5, window.devicePixelRatio || 1) * Q.res;
  worldCv.width = Math.max(2, Math.round(W2 * dw));
  worldCv.height = Math.max(2, Math.round(H2 * dw));
  const hd = Math.min(2, window.devicePixelRatio || 1);
  hudCv.width = Math.round(W2 * hd); hudCv.height = Math.round(H2 * hd);
  hx.setTransform(hd, 0, 0, hd, 0, 0);
  if (R.gl) R.gl.viewport(0, 0, worldCv.width, worldCv.height);
}
window.addEventListener('resize', () => setTimeout(layout, 60));
window.addEventListener('orientationchange', () => setTimeout(layout, 250));

// --- おもさの調整 -----------------------------------------------------------
//
// 前のゲームで「くそ遅くて遊べなかった」ので、はじめに軽めで動かして
// 余裕があれば きれいにする。重ければ 見える距離を へらす。

// おそさは ほとんど「何ピクセル ぬるか」で 決まる（JS は 1 コマ 1ms も
// かかっていない）ので、まず res を さげ、それでも だめなら 見える距離を へらす。
const Q_LEVELS = [
  { dist: 5, res: 1.00, fov: 1.22 },
  { dist: 4, res: 0.90, fov: 1.22 },
  { dist: 4, res: 0.75, fov: 1.22 },
  { dist: 3, res: 0.65, fov: 1.22 },
  { dist: 2, res: 0.55, fov: 1.22 },
];
let qLevel = 1;
const Q = Object.assign({}, Q_LEVELS[qLevel]);
let slowAvg = 16, qHold = 0;

// はかるのは「1 コマに かかった ぜんぶの 時間」。
// JS の中だけ はかっても、重いのは 絵を出す がわ なので 気づけない。
function tuneQuality(frameMs, dt) {
  if (frameMs > 400) return;            // タブを 見ていなかった ぶんは 数えない
  slowAvg += (frameMs - slowAvg) * 0.06;
  if (qHold > 0) { qHold -= dt; return; }
  if (slowAvg > 34 && qLevel < Q_LEVELS.length - 1) {
    qLevel++; Object.assign(Q, Q_LEVELS[qLevel]); qHold = 5; layout();
  } else if (slowAvg < 19 && qLevel > 0) {
    qLevel--; Object.assign(Q, Q_LEVELS[qLevel]); qHold = 5; layout();
  }
}

// --- セーブ -----------------------------------------------------------------

const SAVE_KEY = 'craft.v1';

function saveGame() {
  try {
    const ed = [];
    for (const [k, v] of W.edits) ed.push(k + ':' + v);
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed: W.seed, x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch,
      inv: P.inv.map((s) => (s ? [s.id, s.n] : 0)),
      slot: P.slot, creative: P.creative, fly: P.fly, hp: P.hp,
      t: dayT, ed: ed.join(';'),
    }));
    return true;
  } catch (e) { return false; }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function loadGame() {
  let o;
  try { o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { o = null; }
  if (!o) return false;
  W.edits.clear();
  resetWorld(o.seed | 0);
  if (o.ed) {
    for (const part of o.ed.split(';')) {
      if (!part) continue;
      const c = part.lastIndexOf(':');
      W.edits.set(part.slice(0, c), +part.slice(c + 1));
    }
  }
  // たいまつ・ひかりいし の場所を 覚えなおす
  for (const [k, id] of W.edits) {
    if (id && blk(id).light > 0 && !blk(id).liquid) {
      const p = k.split(',');
      addLight(+p[0], +p[1], +p[2], blk(id).light);
    }
  }
  P.x = o.x; P.y = o.y; P.z = o.z; P.yaw = o.yaw; P.pitch = o.pitch;
  P.vx = P.vy = P.vz = 0;
  P.inv = (o.inv || []).map((s) => (s ? { id: s[0], n: s[1] } : null));
  while (P.inv.length < 36) P.inv.push(null);
  P.slot = o.slot | 0; P.creative = !!o.creative; P.fly = !!o.fly;
  P.hp = o.hp === undefined ? 10 : o.hp;
  if (!P.fly) unstick();
  dayT = o.t === undefined ? 0.42 : o.t;
  return true;
}

function newGame(creative) {
  W.edits.clear();
  resetWorld((Math.random() * 2000000000) | 0);
  const s = spawnPoint();
  P.x = s.x; P.y = s.y; P.z = s.z;
  P.vx = P.vy = P.vz = 0; P.yaw = 0.6; P.pitch = 0.1;
  // 村の そばに 出たときは、村の ほうを むいて はじめる
  if (s.near) {
    P.yaw = Math.atan2(s.near.x - P.x, s.near.z - P.z);
    P.pitch = 0.05;
  }
  P.hp = 10; P.slot = 0; P.fly = false;
  P.creative = creative;
  dayT = 0.42;
  for (let i = 0; i < P.inv.length; i++) P.inv[i] = null;
  unstick();
  if (creative) fillCreative();
  else {
    // さいしょの おたすけ
    invAdd(ID.planks, 16); invAdd(ID.torch, 8);
  }
  UI.hint = 6;
  UI.msg = s.near ? 'むらが 目のまえに あるよ！' : '';
  UI.msgT = s.near ? 4 : 0;
}

let saveT = 0;
window.addEventListener('visibilitychange', () => {
  if (document.hidden && scr !== 'title') saveGame();
});
window.addEventListener('pagehide', () => { if (scr !== 'title') saveGame(); });

// --- そうさ -----------------------------------------------------------------

const inp = { mx: 0, mz: 0, up: false, down: false, run: false };
const tin = { mx: 0, mz: 0, run: false };   // ゆびで うごかしているぶん
const keys = {};
const touches = new Map();   // pointerId → { role, ... }
let stick = null;            // 歩く用のまるいやつ
let digging = false, placeTap = false;

function px(ev) {
  const r = hudCv.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

function hitButton(x, y) {
  for (let i = UI.buttons.length - 1; i >= 0; i--) {
    const b = UI.buttons[i];
    if (b.r !== undefined) {
      if (Math.hypot(x - b.x, y - b.y) <= b.r) return b;
    } else if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

hudCv.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  const p = px(ev);
  const b = hitButton(p.x, p.y);
  if (b) {
    touches.set(ev.pointerId, { role: 'btn', b });
    if (b.on) b.on();
    return;
  }
  if (scr !== 'play') return;
  if (p.x < W2 * 0.42) {
    // 左半分＝歩く
    stick = { id: ev.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
    touches.set(ev.pointerId, { role: 'move' });
  } else {
    touches.set(ev.pointerId, {
      role: 'look', lx: p.x, ly: p.y, sx: p.x, sy: p.y, t: 0, moved: false,
    });
  }
  hudCv.setPointerCapture && hudCv.setPointerCapture(ev.pointerId);
});

hudCv.addEventListener('pointermove', (ev) => {
  const t = touches.get(ev.pointerId);
  if (!t) return;
  const p = px(ev);
  if (t.role === 'move' && stick && stick.id === ev.pointerId) {
    stick.x = p.x; stick.y = p.y;
    const r = Math.min(H2 * 0.13, 90);
    let dx = (p.x - stick.ox) / r, dy = (p.y - stick.oy) / r;
    const L = Math.hypot(dx, dy);
    if (L > 1) { dx /= L; dy /= L; }
    tin.mx = dx; tin.mz = -dy;
    tin.run = L > 0.92;
  } else if (t.role === 'look') {
    const sens = 0.0042;
    P.yaw -= (p.x - t.lx) * sens;
    P.pitch -= (p.y - t.ly) * sens;
    P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch));
    t.lx = p.x; t.ly = p.y;
    if (Math.hypot(p.x - t.sx, p.y - t.sy) > H2 * 0.035) t.moved = true;
  }
});

function endTouch(ev) {
  const t = touches.get(ev.pointerId);
  if (!t) return;
  touches.delete(ev.pointerId);
  if (t.role === 'move') { stick = null; tin.mx = 0; tin.mz = 0; tin.run = false; }
  if (t.role === 'look') {
    if (!t.moved && t.t < 0.28) placeTap = true;      // ちょんと おす＝置く
    digging = false;
  }
}
hudCv.addEventListener('pointerup', endTouch);
hudCv.addEventListener('pointercancel', endTouch);
hudCv.addEventListener('contextmenu', (e) => e.preventDefault());

// パソコンの キーボードと マウス
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (scr === 'play') {
    if (e.code === 'KeyE') { scr = 'inv'; UI.page = 0; }
    else if (e.code === 'Escape') scr = 'menu';
    else if (e.code === 'KeyF') P.fly = !P.fly;
    else if (e.code.startsWith('Digit')) {
      const n = +e.code.slice(5); if (n >= 1 && n <= 9) P.slot = n - 1;
    }
  } else if (e.code === 'Escape' || e.code === 'KeyE') {
    if (scr === 'inv' || scr === 'menu' || scr === 'howto') scr = 'play';
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

hudCv.addEventListener('dblclick', () => {
  if (scr === 'play' && hudCv.requestPointerLock) hudCv.requestPointerLock();
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === hudCv) {
    P.yaw -= e.movementX * 0.0024;
    P.pitch -= e.movementY * 0.0024;
    P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch));
  }
});
document.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== hudCv) return;
  if (e.button === 0) digging = true;
  if (e.button === 2) placeTap = true;
});
document.addEventListener('mouseup', (e) => { if (e.button === 0) digging = false; });
window.addEventListener('wheel', (e) => {
  if (scr !== 'play') return;
  P.slot = (P.slot + (e.deltaY > 0 ? 1 : 8)) % 9;
});

// ゆび と キーボード を 合わせて 「こんどの 1 コマで どう動くか」に する
function readInput() {
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz += 1;
  if (keys.KeyS || keys.ArrowDown) mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  inp.mx = mx + tin.mx;
  inp.mz = mz + tin.mz;
  inp.run = tin.run || !!keys.ShiftLeft;
  inp.up = !!keys.Space;
  inp.down = !!keys.ShiftLeft;
}

// --- 3D を かく -------------------------------------------------------------

function dayLight() {
  // 0.5 が まひる、0 と 1 が まよなか
  const s = Math.sin(dayT * Math.PI * 2 - Math.PI / 2);
  return 0.22 + 0.78 * Math.max(0, Math.min(1, (s + 0.35) / 1.05));
}

function skyColor() {
  const d = dayLight();
  const dawn = Math.max(0, 1 - Math.abs(d - 0.55) * 5) * 0.6;   // 朝と夕方
  const r = 0.05 + d * 0.44 + dawn * 0.34;
  const g = 0.08 + d * 0.60 + dawn * 0.10;
  const b = 0.18 + d * 0.70 - dawn * 0.06;
  return [Math.min(1, r), Math.min(1, g), Math.min(1, b)];
}

const CUBE_LINES = new Float32Array(72);
function fillCubeLines(x, y, z) {
  const e = 0.003, a = -e, b = 1 + e;
  const c = [[a, a, a], [b, a, a], [b, a, b], [a, a, b],
             [a, b, a], [b, b, a], [b, b, b], [a, b, b]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
             [0, 4], [1, 5], [2, 6], [3, 7]];
  let i = 0;
  for (const [p, q] of E) {
    CUBE_LINES[i++] = x + c[p][0]; CUBE_LINES[i++] = y + c[p][1]; CUBE_LINES[i++] = z + c[p][2];
    CUBE_LINES[i++] = x + c[q][0]; CUBE_LINES[i++] = y + c[q][1]; CUBE_LINES[i++] = z + c[q][2];
  }
}

function renderWorld(hit) {
  const gl = R.gl;
  const sky = skyColor();
  const head = getBlock(Math.floor(P.x), Math.floor(eyeY()), Math.floor(P.z));
  const inWater = head === ID.water;
  const inLava = head === ID.lava;
  // きりは「チャンクの はしっこ を かくす」ためだけの もの。
  // 近すぎると 昼間でも まっ白に なって 何も 見えない。
  const fogNear = inWater ? 0.5 : inLava ? 0.1 : Q.dist * CH * 0.82;
  const fogFar = inWater ? 15 : inLava ? 1.6 : Q.dist * CH * 1.12;
  const fog = inWater ? [0.10, 0.28, 0.52] : inLava ? [0.75, 0.24, 0.05] : sky;

  gl.viewport(0, 0, worldCv.width, worldCv.height);
  gl.clearColor(fog[0], fog[1], fog[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  m4perspective(R.proj, Q.fov, worldCv.width / worldCv.height, 0.06, 600);
  m4view(R.view, P.x, eyeY(), P.z, P.yaw, P.pitch);
  m4mul(R.mvp, R.proj, R.view);

  gl.useProgram(R.prog);
  gl.uniformMatrix4fv(R.loc.uMVP, false, R.mvp);
  gl.uniform3f(R.loc.uEye, P.x, eyeY(), P.z);
  gl.uniform1f(R.loc.uDay, dayLight());
  gl.uniform1f(R.loc.uFogNear, fogNear);
  gl.uniform1f(R.loc.uFogFar, fogFar);
  gl.uniform3f(R.loc.uFogCol, fog[0], fog[1], fog[2]);
  gl.uniform3f(R.loc.uTint, 1, 1, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, R.tex);
  gl.uniform1i(R.loc.uTex, 0);

  gl.enableVertexAttribArray(R.loc.aPos);
  gl.enableVertexAttribArray(R.loc.aUV);
  gl.enableVertexAttribArray(R.loc.aLit);

  // カメラの まえに ない チャンク・だん は とばす
  extractFrustum(R.mvp);
  const list = [];
  for (const [, c] of W.chunks) {
    if (!c.mesh || !c.mesh.bytes) continue;
    const bx = c.cx * CH, bz = c.cz * CH;
    if (!boxVisible(bx, 0, bz, bx + CH, CY, bz + CH)) continue;
    c._d = (c.cx * CH + 8 - P.x) * (c.cx * CH + 8 - P.x)
         + (c.cz * CH + 8 - P.z) * (c.cz * CH + 8 - P.z);
    list.push(c);
  }
  // 手前から 順に えがく。おくの ぶんが はやく すてられて 軽くなる
  list.sort((a, b) => a._d - b._d);
  R.drawn = 0; R.tris = 0;

  const bindChunk = (c) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, c.mesh.buf);
    gl.vertexAttribPointer(R.loc.aPos, 3, gl.SHORT, false, 16, 0);
    gl.vertexAttribPointer(R.loc.aUV, 2, gl.UNSIGNED_SHORT, true, 16, 6);
    gl.vertexAttribPointer(R.loc.aLit, 4, gl.UNSIGNED_BYTE, true, 16, 10);
    gl.uniform3f(R.loc.uOrg, c.cx * CH, 0, c.cz * CH);
  };
  const drawSecs = (c, secs) => {
    const bx = c.cx * CH, bz = c.cz * CH;
    let bound = false;
    for (let i = 0; i < secs.length; i++) {
      const s = secs[i];
      if (!s.n) continue;
      if (!boxVisible(bx, s.y0, bz, bx + CH, s.y1, bz + CH)) continue;
      if (!bound) { bindChunk(c); bound = true; }
      gl.drawArrays(gl.TRIANGLES, s.from, s.n);
      R.drawn++; R.tris += s.n / 3;
    }
  };

  // まず すけないもの
  gl.disable(gl.BLEND);
  gl.depthMask(true);
  gl.enable(gl.CULL_FACE);
  for (const c of list) drawSecs(c, c.mesh.secs);
  // つぎに 水・ガラス。うしろが すけるので あとから。
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);
  for (const c of list) drawSecs(c, c.mesh.asecs);
  gl.depthMask(true);
  gl.enable(gl.CULL_FACE);

  // 見ているブロックの わく
  if (hit) {
    fillCubeLines(hit.x, hit.y, hit.z);
    gl.useProgram(R.line);
    gl.uniformMatrix4fv(R.lineLoc.uMVP, false, R.mvp);
    gl.uniform4f(R.lineLoc.uCol, 0, 0, 0, 0.55);
    gl.bindBuffer(gl.ARRAY_BUFFER, R.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_LINES, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(R.lineLoc.aPos);
    gl.vertexAttribPointer(R.lineLoc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 24);
  }
  gl.disable(gl.BLEND);
}

// --- 2D の 部品 -------------------------------------------------------------

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

function fitFont(text, maxW, maxH, weight) {
  let fs = Math.round(maxH);
  for (let i = 0; i < 14; i++) {
    hx.font = (weight || '') + fs + 'px system-ui, sans-serif';
    if (hx.measureText(text).width <= maxW || fs <= 8) break;
    fs = Math.max(8, Math.floor(fs * 0.9));
  }
  return fs;
}

function btn(x, y, w, h, on, tag) {
  const b = { x, y, w, h, on, tag };
  UI.buttons.push(b); return b;
}
function cbtn(x, y, r, on, tag) {
  const b = { x, y, r, on, tag };
  UI.buttons.push(b); return b;
}

function drawBtn(b, label, col, textCol) {
  hx.fillStyle = col || 'rgba(255,255,255,0.92)';
  rr(hx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.26)); hx.fill();
  hx.strokeStyle = 'rgba(0,0,0,0.2)'; hx.lineWidth = 2; hx.stroke();
  hx.fillStyle = textCol || '#22304A';
  hx.textAlign = 'center'; hx.textBaseline = 'middle';
  fitFont(label, b.w * 0.88, b.h * 0.46, 'bold ');
  hx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
}

// ブロックの絵を 2D で 出す（持ちものバー・クラフト画面）
function drawItem(id, x, y, s) {
  if (!id || !ATLAS_CV) return;
  const B = blk(id);
  const t = B.top !== undefined ? B.top : B.side;
  const sx = (t % ATLAS_N) * TS, sy = ((t / ATLAS_N) | 0) * TS;
  const t2 = B.side, sx2 = (t2 % ATLAS_N) * TS, sy2 = ((t2 / ATLAS_N) | 0) * TS;
  hx.imageSmoothingEnabled = false;
  if (B.cross) {
    hx.drawImage(ATLAS_CV, sx2, sy2, TS, TS, x, y, s, s);
  } else {
    // ちょっとだけ 立体に 見せる（上の面＋横の面）
    hx.drawImage(ATLAS_CV, sx2, sy2, TS, TS, x, y + s * 0.28, s, s * 0.72);
    hx.save();
    hx.globalAlpha = 1;
    hx.drawImage(ATLAS_CV, sx, sy, TS, TS, x, y, s, s * 0.32);
    hx.fillStyle = 'rgba(255,255,255,0.16)';
    hx.fillRect(x, y, s, s * 0.32);
    hx.restore();
  }
  hx.imageSmoothingEnabled = true;
}

function say(m) { UI.msg = m; UI.msgT = 2.2; }

// --- タイトル ---------------------------------------------------------------

// ほかの ゲームを えらぶ 入口（ゲームランド）へ もどる。
// タイトル画面の 右上に 小さく 出す。全画面で 遊んでいると
// ブラウザの「もどる」が 見えないので、ここから 帰れるようにしておく。
function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}

function drawHubButton() {
  // 右はしには ブロックを ならべた かざりが あるので、その ぶん 左に よける
  const mw = Math.min(W2 * 0.30, H2 * 0.60), mh = H2 * 0.085;
  drawBtn(btn(W2 - mw - H2 * 0.17, H2 * 0.03, mw, mh, gotoHub),
       '≡ ゲームをえらぶ', 'rgba(255,255,255,0.86)', '#33304A');
}

function drawTitle() {
  const g = hx.createLinearGradient(0, 0, 0, H2);
  g.addColorStop(0, '#4E86C6'); g.addColorStop(0.55, '#8FC6E8');
  g.addColorStop(1, '#6B9A4A');
  hx.fillStyle = g; hx.fillRect(0, 0, W2, H2);

  // ブロックを ならべた かざり
  const s = H2 * 0.1;
  const deco = [ID.grass, ID.log, ID.diamond_ore, ID.gold_ore, ID.cobble,
                ID.planks, ID.leaves, ID.brick];
  for (let i = 0; i < deco.length; i++) {
    drawItem(deco[i], W2 - s * 1.35, H2 * 0.06 + i * s * 1.06, s);
  }

  hx.textAlign = 'left'; hx.textBaseline = 'top';
  hx.fillStyle = '#FFFFFF';
  fitFont('りなクラフト', W2 * 0.62, H2 * 0.13, 'bold ');
  hx.fillText('りなクラフト', H2 * 0.07, H2 * 0.07);
  hx.fillStyle = '#EAF4FF';
  fitFont('ほって つんで、じぶんの せかいを つくる', W2 * 0.6, H2 * 0.05);
  hx.fillText('ほって つんで、じぶんの せかいを つくる', H2 * 0.075, H2 * 0.215);
  hx.fillStyle = 'rgba(255,255,255,0.85)';
  const sub2 = 'ブロック ' + (BLOCKS.length - 1) + 'しゅるい・クラフト・ほらあな・よるとひる';
  fitFont(sub2, W2 * 0.6, H2 * 0.042);
  hx.fillText(sub2, H2 * 0.075, H2 * 0.285);

  const bw = Math.min(W2 * 0.46, H2 * 1.05), bh = H2 * 0.145;
  const x = H2 * 0.07;
  let y = H2 * 0.37;
  if (hasSave()) {
    drawBtn(btn(x, y, bw, bh, () => {
      if (loadGame()) { scr = 'play'; enterFull(); } else say('つづきが よめませんでした');
    }), 'つづきから', '#FFD166');
    y += bh * 1.16;
  }
  drawBtn(btn(x, y, bw * 0.49, bh, () => {
    newGame(false); scr = 'play'; enterFull();
  }), 'あたらしく', '#A8E0A8');
  drawBtn(btn(x + bw * 0.51, y, bw * 0.49, bh, () => {
    newGame(true); scr = 'play'; enterFull();
  }), 'そうぞうモード', '#C6B0F0');
  y += bh * 1.16;
  drawBtn(btn(x, y, bw * 0.49, bh * 0.82, () => { scr = 'howto'; }),
          'あそびかた', '#D8E4F2');
  if (hasSave()) {
    drawBtn(btn(x + bw * 0.51, y, bw * 0.49, bh * 0.82, () => { UI.askDel = true; }),
            'きろくを けす', '#F0B8B8');
  }
  hx.textAlign = 'left'; hx.textBaseline = 'top';
  hx.fillStyle = 'rgba(255,255,255,0.6)';
  const tip = hasSave() ? 'つづきからで、まえの せかいに もどれる'
                        : 'そうぞうモードは ぜんぶの ブロックが つかえて 空も とべる';
  fitFont(tip, W2 * 0.55, H2 * 0.038);
  hx.fillText(tip, x, y + bh * 0.95);

  if (UI.askDel) {
    hx.fillStyle = 'rgba(10,16,24,0.78)'; hx.fillRect(0, 0, W2, H2);
    hx.fillStyle = '#FFFFFF'; hx.textAlign = 'center'; hx.textBaseline = 'middle';
    fitFont('いままでの せかいを けしますか？', W2 * 0.8, H2 * 0.09, 'bold ');
    hx.fillText('いままでの せかいを けしますか？', W2 / 2, H2 * 0.36);
    const kw = Math.min(W2 * 0.3, H2 * 0.6), kh = H2 * 0.13;
    drawBtn(btn(W2 / 2 - kw - H2 * 0.02, H2 * 0.52, kw, kh, () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      UI.askDel = false;
    }), 'けす', '#F09090');
    drawBtn(btn(W2 / 2 + H2 * 0.02, H2 * 0.52, kw, kh, () => { UI.askDel = false; }),
            'やめる', '#D8E4F2');
  }
  drawHubButton();
}

function drawHowto() {
  hx.fillStyle = '#1B2733'; hx.fillRect(0, 0, W2, H2);
  hx.textAlign = 'left'; hx.textBaseline = 'top';
  hx.fillStyle = '#8FD3E8';
  hx.font = 'bold ' + Math.round(H2 * 0.075) + 'px system-ui, sans-serif';
  hx.fillText('あそびかた', H2 * 0.05, H2 * 0.05);
  const lines = [
    '① 画面の 左がわを ゆびで うごかす と 歩く',
    '② 画面の 右がわを なぞる と 見まわす',
    '③ 右がわを ちょんと おす → ブロックを おく',
    '④ 右がわを おしっぱなし → ブロックを ほる（ひびが 入る）',
    '⑤ 下の バーで 持つものを えらぶ。「もちもの」で 中身ぜんぶ',
    '⑥ 「クラフト」で 木 → いた、いた → さぎょうだい …と 作れる',
    '⑦ 夜は くらい。たいまつを おくと あかるい',
    '⑧ ふかく ほると せきたん・てつ・きん・ダイヤ が 出てくる',
    '⑨ そうぞうモードは ぜんぶの ブロックが つかえて 空も とべる',
    '⑩ ときどき ひとりでに セーブされる。タイトルの「つづきから」で もどれる',
    'パソコン: WASD 歩く / ダブルクリックで 見まわす / 左おす=ほる 右おす=おく',
  ];
  hx.fillStyle = '#D8E6F0';
  const step = Math.min(H2 * 0.075, (H2 * 0.74) / lines.length);
  lines.forEach((t, i) => {
    fitFont(t, W2 * 0.92, Math.min(H2 * 0.042, step * 0.7));
    hx.fillText(t, H2 * 0.05, H2 * 0.16 + i * step);
  });
  drawBtn(btn(W2 - H2 * 0.45, H2 * 0.05, H2 * 0.4, H2 * 0.11,
              () => { scr = 'title'; }), 'もどる', '#FFD166');
}

// --- あそんでいるときの 画面 -------------------------------------------------

function drawHUD(hit) {
  const s = Math.min(H2 * 0.115, W2 * 0.072);
  const n = 9;
  const bw = s * n, bx = (W2 - bw) / 2, by = H2 - s - H2 * 0.03;

  // まんなかの ＋
  if (!UI.hideCross) {
    hx.strokeStyle = 'rgba(255,255,255,0.85)'; hx.lineWidth = 2;
    const c = H2 * 0.022;
    hx.beginPath();
    hx.moveTo(W2 / 2 - c, H2 / 2); hx.lineTo(W2 / 2 + c, H2 / 2);
    hx.moveTo(W2 / 2, H2 / 2 - c); hx.lineTo(W2 / 2, H2 / 2 + c);
    hx.stroke();
  }

  // ほっているときの ひび
  if (P.digY >= 0 && P.digT > 0 && P.digNeed !== Infinity) {
    const f = Math.min(1, P.digT / P.digNeed);
    hx.strokeStyle = 'rgba(255,255,255,0.9)'; hx.lineWidth = 3;
    hx.beginPath();
    hx.arc(W2 / 2, H2 / 2, H2 * 0.05, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
    hx.stroke();
  }

  // 持ちものバー
  hx.fillStyle = 'rgba(10,16,24,0.55)';
  rr(hx, bx - 4, by - 4, bw + 8, s + 8, 8); hx.fill();
  for (let i = 0; i < n; i++) {
    const x = bx + i * s;
    hx.fillStyle = i === P.slot ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.10)';
    hx.fillRect(x + 2, by + 2, s - 4, s - 4);
    hx.strokeStyle = i === P.slot ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    hx.lineWidth = i === P.slot ? 3 : 1;
    hx.strokeRect(x + 2, by + 2, s - 4, s - 4);
    const it = P.inv[i];
    if (it) {
      drawItem(it.id, x + s * 0.14, by + s * 0.14, s * 0.72);
      if (!P.creative) {
        hx.fillStyle = '#FFFFFF'; hx.textAlign = 'right'; hx.textBaseline = 'bottom';
        hx.font = 'bold ' + Math.round(s * 0.3) + 'px system-ui, sans-serif';
        hx.strokeStyle = 'rgba(0,0,0,0.8)'; hx.lineWidth = 3;
        hx.strokeText(it.n, x + s - 5, by + s - 4);
        hx.fillText(it.n, x + s - 5, by + s - 4);
      }
    }
    btn(x, by, s, s, ((k) => () => { P.slot = k; })(i), 'slot');
  }
  // 持っているものの 名前
  const hid = heldId();
  if (hid) {
    hx.fillStyle = 'rgba(255,255,255,0.92)';
    hx.textAlign = 'center'; hx.textBaseline = 'bottom';
    fitFont(blk(hid).name, W2 * 0.5, H2 * 0.038, 'bold ');
    hx.strokeStyle = 'rgba(0,0,0,0.6)'; hx.lineWidth = 4;
    hx.strokeText(blk(hid).name, W2 / 2, by - 8);
    hx.fillText(blk(hid).name, W2 / 2, by - 8);
  }

  // 元気（ようがんで へる）
  if (!P.creative) {
    const hs = H2 * 0.035;
    for (let i = 0; i < 10; i++) {
      const x = bx + i * hs * 1.05, y = by - H2 * 0.075;
      hx.fillStyle = i < P.hp ? '#E05A5A' : 'rgba(0,0,0,0.35)';
      hx.beginPath();
      hx.arc(x + hs * 0.3, y + hs * 0.35, hs * 0.28, 0, 7);
      hx.arc(x + hs * 0.7, y + hs * 0.35, hs * 0.28, 0, 7);
      hx.moveTo(x + hs, y + hs * 0.45);
      hx.lineTo(x + hs * 0.5, y + hs); hx.lineTo(x, y + hs * 0.45);
      hx.fill();
    }
  }

  // 右下の ボタン
  const R1 = H2 * 0.085;
  const jx = W2 - R1 - H2 * 0.05, jy = H2 - R1 * 2.6;
  roundBtn(cbtn(jx, jy, R1, () => { inp.up = true; }, 'jump'), P.fly ? '↑' : 'ジャンプ');
  if (P.fly) {
    roundBtn(cbtn(jx - R1 * 2.2, jy, R1 * 0.82, () => { inp.down = true; }, 'down'), '↓');
  }
  if (P.creative) {
    roundBtn(cbtn(jx, jy - R1 * 2.3, R1 * 0.78, () => { P.fly = !P.fly; }, 'fly'),
             P.fly ? 'とぶ中' : 'とぶ');
  }
  // 左上・右上
  const tb = H2 * 0.075;
  drawBtn(btn(H2 * 0.03, H2 * 0.03, tb * 1.9, tb, () => { scr = 'menu'; }),
          'メニュー', 'rgba(20,30,42,0.65)', '#FFFFFF');
  drawBtn(btn(W2 - tb * 2.1 - H2 * 0.03, H2 * 0.03, tb * 2.1, tb,
              () => { scr = 'inv'; UI.page = 0; UI.tab = P.creative ? 'all' : 'craft'; }),
          'もちもの', 'rgba(20,30,42,0.65)', '#FFFFFF');

  // 歩く まる
  if (stick) {
    const r = Math.min(H2 * 0.13, 90);
    hx.strokeStyle = 'rgba(255,255,255,0.35)'; hx.lineWidth = 3;
    hx.beginPath(); hx.arc(stick.ox, stick.oy, r, 0, 7); hx.stroke();
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
    const L = Math.min(r, Math.hypot(dx, dy)) || 0;
    const a = Math.atan2(dy, dx);
    hx.fillStyle = 'rgba(255,255,255,0.5)';
    hx.beginPath();
    hx.arc(stick.ox + Math.cos(a) * L, stick.oy + Math.sin(a) * L, r * 0.36, 0, 7);
    hx.fill();
  } else if (UI.hint > 0) {
    hx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, UI.hint * 0.2) + ')';
    hx.textAlign = 'center'; hx.textBaseline = 'middle';
    fitFont('ここを うごかすと あるく', W2 * 0.34, H2 * 0.04, 'bold ');
    hx.fillText('ここを うごかすと あるく', W2 * 0.21, H2 * 0.6);
    fitFont('ちょん＝おく / おしっぱ＝ほる', W2 * 0.4, H2 * 0.04, 'bold ');
    hx.fillText('ちょん＝おく / おしっぱ＝ほる', W2 * 0.7, H2 * 0.72);
  }

  // おしらせ
  if (UI.msgT > 0) {
    hx.globalAlpha = Math.min(1, UI.msgT);
    hx.fillStyle = 'rgba(10,16,24,0.7)';
    const tw = W2 * 0.5;
    rr(hx, W2 / 2 - tw / 2, H2 * 0.13, tw, H2 * 0.075, 10); hx.fill();
    hx.fillStyle = '#FFF3C4'; hx.textAlign = 'center'; hx.textBaseline = 'middle';
    fitFont(UI.msg, tw * 0.9, H2 * 0.04, 'bold ');
    hx.fillText(UI.msg, W2 / 2, H2 * 0.1675);
    hx.globalAlpha = 1;
  }
}

function roundBtn(b, label) {
  hx.fillStyle = 'rgba(20,30,42,0.55)';
  hx.beginPath(); hx.arc(b.x, b.y, b.r, 0, 7); hx.fill();
  hx.strokeStyle = 'rgba(255,255,255,0.55)'; hx.lineWidth = 2; hx.stroke();
  hx.fillStyle = '#FFFFFF'; hx.textAlign = 'center'; hx.textBaseline = 'middle';
  fitFont(label, b.r * 1.7, b.r * 0.55, 'bold ');
  hx.fillText(label, b.x, b.y);
}

// --- もちもの・クラフト -----------------------------------------------------

function drawInv() {
  hx.fillStyle = 'rgba(12,20,28,0.90)'; hx.fillRect(0, 0, W2, H2);
  const pad = H2 * 0.03;
  const cs = Math.min(W2 * 0.048, H2 * 0.105);   // ますの大きさ

  hx.textAlign = 'left'; hx.textBaseline = 'top';
  hx.fillStyle = '#FFFFFF';
  hx.font = 'bold ' + Math.round(H2 * 0.055) + 'px system-ui, sans-serif';
  hx.fillText('もちもの', pad, pad);

  // 4 だん × 9 の ます。下の 1 だんが 持ちものバー
  const gx = pad, gy = pad + H2 * 0.09;
  for (let i = 0; i < 36; i++) {
    const r = (i / 9) | 0, c = i % 9;
    const x = gx + c * cs, y = gy + r * cs + (r === 3 ? cs * 0.35 : 0);
    const isBar = r === 3;
    const idx = isBar ? c : 9 + (r * 9 + c);
    hx.fillStyle = (isBar && c === P.slot) ? 'rgba(255,255,255,0.28)'
                                           : 'rgba(255,255,255,0.10)';
    hx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
    hx.strokeStyle = (isBar && c === P.slot) ? '#FFFFFF' : 'rgba(255,255,255,0.25)';
    hx.lineWidth = (isBar && c === P.slot) ? 3 : 1;
    hx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
    const it = P.inv[idx];
    if (it) {
      drawItem(it.id, x + cs * 0.14, y + cs * 0.14, cs * 0.72);
      if (!P.creative) {
        hx.fillStyle = '#FFFFFF'; hx.textAlign = 'right'; hx.textBaseline = 'bottom';
        hx.font = 'bold ' + Math.round(cs * 0.3) + 'px system-ui, sans-serif';
        hx.strokeStyle = 'rgba(0,0,0,0.8)'; hx.lineWidth = 3;
        hx.strokeText(it.n, x + cs - 5, y + cs - 4);
        hx.fillText(it.n, x + cs - 5, y + cs - 4);
        hx.textAlign = 'left'; hx.textBaseline = 'top';
      }
    }
    btn(x, y, cs, cs, ((k, bar, cc) => () => {
      if (bar) { P.slot = cc; return; }
      // おした ものを 持ちものバーの えらんでいる ところに 入れかえる
      const t = P.inv[k]; P.inv[k] = P.inv[P.slot]; P.inv[P.slot] = t;
    })(idx, isBar, c), 'cell');
  }
  hx.fillStyle = 'rgba(200,220,235,0.75)';
  hx.font = Math.round(H2 * 0.032) + 'px system-ui, sans-serif';
  hx.fillText('うえの ますを おすと、下の バーに 入れかわる', gx, gy + cs * 4.5);

  // 右がわ： クラフト／ぜんぶ
  const rx = gx + cs * 9 + pad * 1.4;
  const rw = W2 - rx - pad;
  const tabs = P.creative ? [['all', 'ブロック ぜんぶ'], ['craft', 'クラフト']]
                          : [['craft', 'クラフト'], ['all', 'ずかん']];
  const tw = Math.min(rw / tabs.length - 6, H2 * 0.55), th = H2 * 0.085;
  tabs.forEach(([k, label], i) => {
    const x = rx + i * (tw + 6);
    const on = UI.tab === k;
    hx.fillStyle = on ? '#FFD166' : 'rgba(255,255,255,0.14)';
    rr(hx, x, pad, tw, th, 8); hx.fill();
    hx.fillStyle = on ? '#2A2010' : '#D8E4F0';
    hx.textAlign = 'center'; hx.textBaseline = 'middle';
    fitFont(label, tw * 0.9, th * 0.44, 'bold ');
    hx.fillText(label, x + tw / 2, pad + th / 2);
    btn(x, pad, tw, th, ((kk) => () => { UI.tab = kk; UI.page = 0; })(k), 'tab');
  });
  hx.textAlign = 'left'; hx.textBaseline = 'top';

  const listY = pad + th + H2 * 0.03;
  const listH = H2 - listY - H2 * 0.16;
  if (UI.tab === 'craft') drawCraft(rx, listY, rw, listH);
  else drawAll(rx, listY, rw, listH);

  drawBtn(btn(pad, H2 - H2 * 0.13 - pad * 0.5, Math.min(H2 * 0.42, cs * 4), H2 * 0.115,
              () => { scr = 'play'; }), 'とじる', '#FFD166');
}

function drawCraft(x, y, w, h) {
  const rowH = Math.min(H2 * 0.115, h / 5);
  const per = Math.max(1, Math.floor(h / rowH));
  const pages = Math.ceil(RECIPES.length / per);
  UI.page = Math.max(0, Math.min(pages - 1, UI.page));
  const from = UI.page * per;
  for (let i = from; i < Math.min(RECIPES.length, from + per); i++) {
    const rc = RECIPES[i];
    const ry = y + (i - from) * rowH;
    const outId = ID[rc.out];
    let can = true;
    for (const [k, cnt] of rc.need) if (invCount(ID[k]) < cnt) can = false;
    if (P.creative) can = true;
    hx.fillStyle = can ? 'rgba(120,200,140,0.22)' : 'rgba(255,255,255,0.07)';
    rr(hx, x, ry + 2, w, rowH - 6, 8); hx.fill();
    hx.strokeStyle = can ? 'rgba(140,230,160,0.8)' : 'rgba(255,255,255,0.12)';
    hx.lineWidth = can ? 2 : 1; hx.stroke();

    const isz = rowH * 0.66;
    drawItem(outId, x + 8, ry + rowH * 0.16, isz);
    hx.fillStyle = can ? '#FFFFFF' : 'rgba(220,230,240,0.5)';
    hx.textAlign = 'left'; hx.textBaseline = 'middle';
    fitFont(blk(outId).name + (rc.n > 1 ? ' ×' + rc.n : ''), w * 0.44, rowH * 0.34, 'bold ');
    hx.fillText(blk(outId).name + (rc.n > 1 ? ' ×' + rc.n : ''),
                x + isz + 16, ry + rowH * 0.34);
    // ざいりょう
    let mx2 = x + isz + 16;
    const msz = rowH * 0.36;
    for (const [k, cnt] of rc.need) {
      drawItem(ID[k], mx2, ry + rowH * 0.5, msz);
      hx.fillStyle = (P.creative || invCount(ID[k]) >= cnt) ? '#C8F0C8' : '#F0A8A8';
      hx.font = 'bold ' + Math.round(rowH * 0.26) + 'px system-ui, sans-serif';
      hx.fillText('×' + cnt, mx2 + msz + 2, ry + rowH * 0.68);
      mx2 += msz + hx.measureText('×' + cnt).width + 12;
    }
    if (can) {
      btn(x, ry, w, rowH - 4, ((r) => () => {
        if (!P.creative) {
          for (const [k, cnt] of r.need) if (invCount(ID[k]) < cnt) return;
          for (const [k, cnt] of r.need) invTake(ID[k], cnt);
        }
        invAdd(ID[r.out], r.n);
        say(blk(ID[r.out]).name + ' が できた！');
      })(rc), 'craft');
    }
  }
  pager(x, y + h + H2 * 0.01, w, pages);
}

function drawAll(x, y, w, h) {
  const cs = Math.min(W2 * 0.05, H2 * 0.105);
  const cols = Math.max(1, Math.floor(w / cs));
  const rows = Math.max(1, Math.floor(h / cs));
  const per = cols * rows;
  const list = [];
  for (let i = 1; i < BLOCKS.length; i++) {
    if (BLOCKS[i].hard === Infinity && BLOCKS[i].key !== 'water') continue;
    list.push(i);
  }
  const pages = Math.ceil(list.length / per);
  UI.page = Math.max(0, Math.min(pages - 1, UI.page));
  for (let i = UI.page * per; i < Math.min(list.length, (UI.page + 1) * per); i++) {
    const k = i - UI.page * per;
    const cx2 = x + (k % cols) * cs, cy2 = y + ((k / cols) | 0) * cs;
    const id = list[i];
    const own = P.creative ? 1 : invCount(id);
    hx.fillStyle = 'rgba(255,255,255,0.09)';
    hx.fillRect(cx2 + 2, cy2 + 2, cs - 4, cs - 4);
    hx.save();
    if (!own) hx.globalAlpha = 0.28;
    drawItem(id, cx2 + cs * 0.13, cy2 + cs * 0.13, cs * 0.74);
    hx.restore();
    if (P.creative) {
      btn(cx2, cy2, cs, cs, ((bid) => () => {
        P.inv[P.slot] = { id: bid, n: STACK };
        say(blk(bid).name + ' を もった');
      })(id), 'give');
    }
  }
  pager(x, y + h + H2 * 0.01, w, pages);
}

function pager(x, y, w, pages) {
  if (pages <= 1) return;
  const bw = Math.min(w * 0.28, H2 * 0.28), bh = H2 * 0.095;
  drawBtn(btn(x, y, bw, bh, () => { UI.page = Math.max(0, UI.page - 1); }), '◀', '#D8E4F2');
  drawBtn(btn(x + w - bw, y, bw, bh, () => {
    UI.page = Math.min(pages - 1, UI.page + 1);
  }), '▶', '#D8E4F2');
  hx.fillStyle = '#FFFFFF'; hx.textAlign = 'center'; hx.textBaseline = 'middle';
  hx.font = 'bold ' + Math.round(bh * 0.4) + 'px system-ui, sans-serif';
  hx.fillText((UI.page + 1) + ' / ' + pages, x + w / 2, y + bh / 2);
}

// --- メニュー ---------------------------------------------------------------

function drawMenu() {
  hx.fillStyle = 'rgba(10,16,24,0.82)'; hx.fillRect(0, 0, W2, H2);
  hx.fillStyle = '#FFFFFF'; hx.textAlign = 'center'; hx.textBaseline = 'top';
  fitFont('メニュー', W2 * 0.6, H2 * 0.1, 'bold ');
  hx.fillText('メニュー', W2 / 2, H2 * 0.07);

  hx.fillStyle = '#BFD6E8';
  fitFont('たね ' + W.seed + '　いま ' + posText(), W2 * 0.8, H2 * 0.04);
  hx.fillText('たね ' + W.seed + '　いま ' + posText(), W2 / 2, H2 * 0.2);

  const bw = Math.min(W2 * 0.42, H2 * 0.9), bh = H2 * 0.115;
  let y = H2 * 0.29;
  drawBtn(btn(W2 / 2 - bw / 2, y, bw, bh, () => { scr = 'play'; }), 'つづける', '#FFD166');
  y += bh * 1.22;
  drawBtn(btn(W2 / 2 - bw / 2, y, bw, bh, () => {
    say(saveGame() ? 'セーブしました' : 'セーブできませんでした');
  }), 'セーブする', '#A8E0A8');
  y += bh * 1.22;
  drawBtn(btn(W2 / 2 - bw / 2, y, bw * 0.48, bh, () => {
    P.creative = !P.creative;
    if (P.creative) fillCreative(); else P.fly = false;
    say(P.creative ? 'そうぞうモード' : 'ふつうモード');
  }), P.creative ? 'ふつうに する' : 'そうぞうに する', '#C6B0F0');
  drawBtn(btn(W2 / 2 + bw * 0.02, y, bw * 0.48, bh, () => {
    saveGame(); scr = 'title'; UI.askDel = false;
  }), 'タイトルへ', '#D8E4F2');
  y += bh * 1.22;
  hx.fillStyle = 'rgba(200,220,235,0.7)';
  fitFont('えがく はんい ' + Q.dist + '　' + Math.round(1000 / Math.max(1, slowAvg)) + ' コマ/びょう',
          W2 * 0.7, H2 * 0.035);
  hx.fillText('えがく はんい ' + Q.dist + '　' +
              Math.round(1000 / Math.max(1, slowAvg)) + ' コマ/びょう', W2 / 2, y + H2 * 0.02);
}

function posText() {
  return 'X' + Math.round(P.x) + ' Y' + Math.round(P.y) + ' Z' + Math.round(P.z);
}

// --- 全画面 -----------------------------------------------------------------

function enterFull() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f) { try { f.call(e); } catch (err) {} }
  const so = window.screen && window.screen.orientation;
  if (so && so.lock) {
    try { const r = so.lock('landscape'); if (r && r.catch) r.catch(() => {}); }
    catch (err) {}
  }
}

// --- たてむき ---------------------------------------------------------------

function drawRotate() {
  hx.fillStyle = '#16242E'; hx.fillRect(0, 0, W2, H2);
  hx.fillStyle = '#FFFFFF'; hx.textAlign = 'center'; hx.textBaseline = 'middle';
  hx.font = 'bold ' + Math.round(W2 * 0.075) + 'px system-ui, sans-serif';
  hx.fillText('よこ向きにしてね', W2 / 2, H2 * 0.45);
  hx.font = Math.round(W2 * 0.045) + 'px system-ui, sans-serif';
  hx.fillStyle = '#9FC8D8';
  hx.fillText('スマホをたおすと あそべます', W2 / 2, H2 * 0.56);
}

// --- ループ -----------------------------------------------------------------

let last = 0, lastChunkX = 1e9, lastChunkZ = 1e9, chunkT = 0;
let holdT = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) || 16;
  const dt = Math.min(0.05, raw / 1000);
  last = now;
  hx.setTransform(1, 0, 0, 1, 0, 0);
  hx.clearRect(0, 0, hudCv.width, hudCv.height);
  const hd = Math.min(2, window.devicePixelRatio || 1);
  hx.setTransform(hd, 0, 0, hd, 0, 0);
  UI.buttons.length = 0;

  if (W2 < H2 * 1.15) { drawRotate(); return; }
  if (!glOK) { drawNoGL(); return; }

  if (scr === 'title') { drawTitle(); return; }
  if (scr === 'howto') { drawHowto(); return; }

  // 遊んでいるとき
  if (scr === 'play') {
    readInput();
    // ボタンを おしっぱなしにしている ぶん
    for (const [, t] of touches) {
      if (t.role === 'btn' && t.b && t.b.tag === 'jump') inp.up = true;
      if (t.role === 'btn' && t.b && t.b.tag === 'down') inp.down = true;
      if (t.role === 'look') {
        t.t += dt;
        if (!t.moved && t.t > 0.28) digging = true;
      }
    }
    movePlayer(dt, inp);
    dayT = (dayT + dt / DAY_LEN) % 1;
    if (UI.hint > 0) UI.hint -= dt;
  } else {
    inp.mx = 0; inp.mz = 0; inp.up = false; inp.down = false;
  }

  const hit = lookingAt();
  if (scr === 'play') {
    if (digging) digTick(dt, hit);
    else { P.digY = -1; P.digT = 0; }
    if (placeTap) {
      placeTap = false;
      if (hit && !placeAt(hit) && heldId() === 0) say('もつものが ありません');
    }
  }

  // チャンクの 出し入れ
  chunkT += dt;
  const pcx = Math.floor(P.x / CH), pcz = Math.floor(P.z / CH);
  if (pcx !== lastChunkX || pcz !== lastChunkZ || chunkT > 0.4) {
    lastChunkX = pcx; lastChunkZ = pcz; chunkT = 0;
    updateChunks(P.x, P.z, Q.dist);
  }
  buildSome(W.built < 30 ? 14 : 7);

  renderWorld(scr === 'play' ? hit : null);

  if (UI.msgT > 0) UI.msgT -= dt;
  if (scr === 'play') drawHUD(hit);
  else if (scr === 'inv') drawInv();
  else if (scr === 'menu') drawMenu();

  // ときどき ひとりでに セーブ
  saveT += dt;
  if (saveT > 20 && scr === 'play') { saveT = 0; saveGame(); }

  tuneQuality(raw, dt);
}

function drawNoGL() {
  hx.fillStyle = '#16242E'; hx.fillRect(0, 0, W2, H2);
  hx.fillStyle = '#FFFFFF'; hx.textAlign = 'center'; hx.textBaseline = 'middle';
  fitFont('3D が うごきません', W2 * 0.8, H2 * 0.1, 'bold ');
  hx.fillText('3D が うごきません', W2 / 2, H2 * 0.42);
  hx.fillStyle = '#9FC8D8';
  fitFont('ブラウザを あたらしくすると あそべるかも', W2 * 0.8, H2 * 0.05);
  hx.fillText('ブラウザを あたらしくすると あそべるかも', W2 / 2, H2 * 0.55);
}

layout();
try {
  glOK = !!initGL(worldCv);
} catch (e) {
  glOK = false;
  console.error(e);
}
requestAnimationFrame(frame);
