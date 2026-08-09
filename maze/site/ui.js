// 画面・そうさ・メインループ。
//
// 絵は ぜんぶ 四角の あつまり（ドット絵）。曲線は つかわない。
// さいごに 走査線と ふちの 暗さを かさねて ブラウン管ふうに する。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800, VOY = 0, VOB = 0, DPR = 1, ROT = false;

// ★ たて長の 画面（スマホを たてに 持った とき）だと よこが せまく なりすぎて、
//   右がわの ボタンや 数字が 画面の 外に 出て しまう。
//   そこで「よこ VW_MIN 以上は かならず 入る」ように 縮尺を きめ、
//   あまった たての ぶんは 上下に 分けて まん中に よせる（レターボックス）。
//   よこ長の ときは これまでと まったく 同じ 見た目に なる。
const VW_MIN = 720;

const ui = { buttons: [] };

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

  // ★ この ゲームは よこ長の 絵づくり。たてに 持った スマホに そのまま
  //   入れると、まん中の ほそい ところにしか 出ず、絵も ボタンも 小さい。
  //   そこで たて長の ときは 中みを 90度 まわして 画面いっぱいに 使う。
  //   （スマホの 画面回転ロックが 入って いても 大きく あそべる）
  //   よこ長の ときは まわさず、これまでどおり。
  const sN = Math.min(H / VH, W / VW_MIN);      // まわさない ときの 縮尺
  const sR = Math.min(W / VH, H / VW_MIN);      // まわした ときの 縮尺
  ROT = sR > sN * 1.15;
  SC = ROT ? sR : sN;

  const long = ROT ? H : W;                     // ゲームの よこに あたる 画面の へん
  const short = ROT ? W : H;                    // ゲームの たてに あたる 画面の へん
  VW = long / SC;
  const extra = Math.max(0, short / SC - VH);
  VOY = extra / 2;
  VOB = extra - VOY;

  if (ROT) {
    // かそう(vx, vy) -> 画面(x, y):  x = W - (vy + VOY) * SC,  y = vx * SC
    ctx.setTransform(0, DPR * SC, -DPR * SC, 0, Math.round(DPR * (W - VOY * SC)), 0);
  } else {
    ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, Math.round(DPR * SC * VOY));
  }
  // 上の おび（ゲームをえらぶ）にも まわして いる ことを しらせる
  document.documentElement.setAttribute('data-game-rot', ROT ? '1' : '0');
}

// 画面の ざひょう -> かそう画面の ざひょう（まわして いる ときも 正しく）
function toV(px, py) {
  if (ROT) return { x: py / SC, y: (W - px) / SC - VOY };
  return { x: px / SC, y: py / SC - VOY };
}

// ゆびを うごかした むき（画面）を、ゲームの むきに なおす
function toVd(dx, dy) {
  return ROT ? { x: dy, y: -dx } : { x: dx, y: dy };
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

function fitFont(text, maxW, maxH, weight) {
  let fs = Math.round(maxH);
  for (let i = 0; i < 14; i++) {
    ctx.font = (weight || '') + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 6) break;
    fs = Math.max(6, Math.floor(fs * 0.9));
  }
  return fs;
}

function button(x, y, w, h, on) {
  const b = { x, y, w, h, on };
  ui.buttons.push(b); return b;
}

// レトロな ボタン（角は 四角、下に かげ）
function drawButton(b, label, col, textCol) {
  ctx.fillStyle = PAL.dk;
  ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
  ctx.fillStyle = col || PAL.w;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(b.x, b.y, b.w, 2);
  ctx.fillStyle = textCol || PAL.k;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(label, b.w * 0.88, b.h * 0.46, 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function hitBtn(px, py) {
  const p = toV(px, py), x = p.x, y = p.y;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- ドット絵 ---------------------------------------------------------------------

// あおい（口が ひらく／とじる）。よこ 12 × たて 12。
function drawAoi(cx, cy, s, dx, dy, open) {
  const R = 6;
  ctx.save();
  ctx.translate(cx, cy);
  if (dx === 1) ctx.rotate(0);
  else if (dx === -1) ctx.rotate(Math.PI);
  else if (dy === 1) ctx.rotate(Math.PI / 2);
  else if (dy === -1) ctx.rotate(-Math.PI / 2);
  // まるい 体を ドットで
  const k = open ? 1 : 0;
  for (let j = -R; j < R; j++) {
    for (let i = -R; i < R; i++) {
      const x = i + 0.5, y = j + 0.5;
      if (x * x + y * y > R * R) continue;
      // 口（右むきに 三角の 切りかき）
      if (k && x > 0 && Math.abs(y) < x * 0.85) continue;
      ctx.fillStyle = PAL.y;
      ctx.fillRect(Math.round(i * s), Math.round(j * s), Math.ceil(s), Math.ceil(s));
    }
  }
  // 目（進む むきに 関係なく 上がわ）
  ctx.fillStyle = PAL.k;
  ctx.fillRect(Math.round(-1 * s), Math.round(-4 * s), Math.ceil(s), Math.ceil(s));
  ctx.restore();
  // ほっぺ（かわいく）
  ctx.fillStyle = 'rgba(240,72,72,0.55)';
  ctx.fillRect(Math.round(cx - 4 * s), Math.round(cy + 1 * s), Math.ceil(s), Math.ceil(s));
  ctx.fillRect(Math.round(cx + 3 * s), Math.round(cy + 1 * s), Math.ceil(s), Math.ceil(s));
}

const GH_BODY = [
  '..1111..',
  '.111111.',
  '11111111',
  '11111111',
  '11111111',
  '11111111',
  '11111111',
  '1.11.11.',
];
const GH_EYE = [
  '..22..22',
  '..2332.2',
  '..22..22',
];

function drawGhost(cx, cy, s, col, scared, blink, eaten, dx, dy) {
  const body = scared ? (blink ? PAL.w : PAL.b) : col;
  if (!eaten) {
    drawSpriteC(GH_BODY, cx, cy, s, { '1': body });
  }
  if (scared && !eaten) {
    // こわがって いる 顔
    ctx.fillStyle = PAL.w;
    ctx.fillRect(Math.round(cx - 3 * s), Math.round(cy - 2 * s), Math.ceil(s), Math.ceil(s));
    ctx.fillRect(Math.round(cx + 2 * s), Math.round(cy - 2 * s), Math.ceil(s), Math.ceil(s));
    for (let i = -3; i <= 2; i++) {
      ctx.fillRect(Math.round(cx + i * s), Math.round(cy + (i % 2 ? 1 : 2) * s),
                   Math.ceil(s), Math.ceil(s));
    }
    return;
  }
  // 目（進む むきを 見る）
  const ex = dx * 0.9, ey = dy * 0.9;
  for (const sg of [-1, 1]) {
    ctx.fillStyle = PAL.w;
    ctx.fillRect(Math.round(cx + sg * 2 * s - 1 * s), Math.round(cy - 2.5 * s),
                 Math.ceil(s * 2), Math.ceil(s * 2.4));
    ctx.fillStyle = PAL.b;
    ctx.fillRect(Math.round(cx + sg * 2 * s - 0.5 * s + ex * s), Math.round(cy - 2 * s + ey * s),
                 Math.ceil(s), Math.ceil(s));
  }
}

// --- めいろを 描く -----------------------------------------------------------------

// ★ めいろが 小さくて 見えない と 言われたので、
//   数字は ぜんぶ 上の ほそい おび（HUD_H）に まとめ、
//   下の おびは なくして、たての ほとんどを めいろに まわした。
//   スティックは 画面の どこでも きくので ばしょを あける ひつようも ない。
const HUD_H = 22;

function mazeBox() {
  const top = HUD_H + 4, bot = 6;
  const s = Math.min((VH - top - bot) / MH, (VW - 24) / MW);
  const c = Math.max(6, Math.floor(s));
  return { x: Math.round((VW - c * MW) / 2), y: top, c: c };
}

function drawMaze(B) {
  const c = B.c;
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const t = G.m[y][x];
      const px = B.x + x * c, py = B.y + y * c;
      if (t === '#') {
        // かべは ふちどりの ある 四角に する（ドット絵の かべらしく）
        ctx.fillStyle = G.M.wall;
        ctx.fillRect(px, py, c, c);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(px, py, c, 1);
        ctx.fillRect(px, py, 1, c);
      } else if (t === '-') {
        ctx.fillStyle = PAL.p;
        ctx.fillRect(px, py + Math.floor(c * 0.4), c, Math.max(2, Math.floor(c * 0.2)));
      }
      const d = G.dot[y][x];
      if (d === 1) {
        ctx.fillStyle = PAL.sk;
        const q = Math.max(2, Math.floor(c * 0.18));
        ctx.fillRect(px + (c - q) / 2, py + (c - q) / 2, q, q);
      } else if (d === 2) {
        const blink = (G.t * 6 | 0) % 2 === 0;
        ctx.fillStyle = blink ? PAL.w : PAL.y;
        const q = Math.max(4, Math.floor(c * 0.5));
        ctx.fillRect(Math.round(px + (c - q) / 2), Math.round(py + (c - q) / 2), q, q);
      }
    }
  }
}

// --- あそんでいる 画面 -----------------------------------------------------------

function drawPlay() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  const B = mazeBox();
  drawMaze(B);

  const s = B.c / 12;   // ドット絵 1ドットの 大きさ

  // おばけ
  for (const g of G.ghosts) {
    const fx = g.x + (g.out > 0 ? 0 : g.dx * g.p);
    const fy = g.y + (g.out > 0 ? 0 : g.dy * g.p);
    const cx = B.x + (fx + 0.5) * B.c, cy = B.y + (fy + 0.5) * B.c;
    const blink = G.fear > 0 && G.fear < 2 && ((G.t * 8 | 0) % 2 === 0);
    drawGhost(cx, cy, s, GHOSTS[g.i % GHOSTS.length].col,
              g.scared > 0, blink, g.eaten > 0, g.dx, g.dy);
    // トンネルの 反対がわにも 描く
    if (fx < 1) drawGhost(cx + MW * B.c, cy, s, GHOSTS[g.i % GHOSTS.length].col,
                          g.scared > 0, blink, g.eaten > 0, g.dx, g.dy);
    if (fx > MW - 2) drawGhost(cx - MW * B.c, cy, s, GHOSTS[g.i % GHOSTS.length].col,
                               g.scared > 0, blink, g.eaten > 0, g.dx, g.dy);
  }

  // あおい
  if (G.dead <= 0) {
    const m = G.me;
    const fx = m.sx + m.dx * m.p, fy = m.sy + m.dy * m.p;
    const cx = B.x + (fx + 0.5) * B.c, cy = B.y + (fy + 0.5) * B.c;
    const open = (m.mouth | 0) % 2 === 0;
    drawAoi(cx, cy, s, m.dx, m.dy, open);
    if (fx < 1) drawAoi(cx + MW * B.c, cy, s, m.dx, m.dy, open);
    if (fx > MW - 2) drawAoi(cx - MW * B.c, cy, s, m.dx, m.dy, open);
  } else {
    // やられた えんしゅつ（ちいさく なって 消える）
    const m = G.me;
    const cx = B.x + (m.sx + 0.5) * B.c, cy = B.y + (m.sy + 0.5) * B.c;
    const k = Math.max(0.05, G.dead / 1.6);
    drawAoi(cx, cy, s * k, 1, 0, true);
  }

  // 食べた てんすう
  if (G.eatPop) {
    const p = G.eatPop;
    drawNum(p.pt, B.x + (p.x + 0.5) * B.c, B.y + (p.y - 0.2) * B.c - p.t * 14,
            Math.max(1, B.c / 10), PAL.c, 'center');
  }

  drawHud(B);
  drawStick();

  if (G.ready > 0) {
    retroText('READY！', VW / 2, VH * 0.44, 30, PAL.y, PAL.dk, 'center');
  }
  if (G.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.66)';
    ctx.fillRect(0, 0, VW, VH);
    retroText(G.win ? 'クリア！' : 'ゲームオーバー', VW / 2, VH * 0.28,
              34, G.win ? PAL.y : PAL.r, PAL.dk, 'center');
    retroText('スコア', VW / 2, VH * 0.42, 16, PAL.w, PAL.dk, 'center');
    drawNum(G.score, VW / 2, VH * 0.48, 4, PAL.y, 'center');
    const bw = Math.min(170, VW * 0.24);
    const nx = G.stage + 1;
    if (G.win && nx < STAGES.length) {
      drawButton(button(VW / 2 - bw - 88, VH * 0.68, bw, 42, () => startStage(nx)), 'つぎの めん', PAL.y);
    }
    drawButton(button(VW / 2 - bw / 2, VH * 0.68, bw, 42, () => startStage(G.stage)), 'もういちど', PAL.c);
    drawButton(button(VW / 2 + 88, VH * 0.68, bw, 42, () => { bgmStop(); G.screen = 'title'; }),
               'めんを えらぶ', PAL.w);
  }
  crt();
}

function drawHud(B) {
  ctx.fillStyle = PAL.dk;
  ctx.fillRect(0, 0, VW, HUD_H);
  retroText('スコア', 8, 5, 12, PAL.gy, null);
  drawNum(G.score, 52, 6, 2, PAL.w, 'left');
  retroText('ハイ', 112, 5, 12, PAL.gy, null);
  drawNum(Math.max(save.hi, G.score), 142, 6, 2, PAL.y, 'left');
  retroText('のこり', 204, 5, 12, PAL.gy, null);
  drawNum(G.left, 246, 6, 2, PAL.sk, 'left');
  // のこりの あおい
  let lx = 300;
  for (let i = 0; i < G.lives - 1; i++) { drawAoi(lx + i * 16, HUD_H / 2, 0.9, 1, 0, true); }
  lx += Math.max(0, G.lives - 1) * 16 + 6;
  retroText(G.S.name + '　' + G.M.name, lx, 5, 12, PAL.c, null);

  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    retroText(G.msg, VW / 2, VH * 0.88, 15, PAL.y, PAL.dk, 'center');
    ctx.globalAlpha = 1;
  }
}

// 十字ボタン
// ★ スティックを「ゆびの ところに 出る」しくみに かえた。
//   まん中が きまって いると、ゆびを 置いた ばしょが すでに
//   「下」だったり して、上に 入れるのに ゆびを 大きく
//   もどさないと いけなかった（上に 行きづらい げんいん）。
//   さわった ところが その まま まん中に なるので、
//   どこを さわっても すぐ 上下左右に 入れられる。
//   画面の どこでも きく（ボタンの 上いがい）。ばんめんの ばしょを
//   けずらないので 絵も 大きく できる。
const STICK_TOUCH = 74;        // にぎりを 動かせる はんい（CSS ピクセル・半径）
const STICK_DEAD = 15;         // ここまでは むきなし（CSS ピクセル）
const STICK_false = false;   // 入れっぱなしで くりかえすか
const stick = { on: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, dir: '', rep: 0 };
// 1回でも さわったら、うっすらの めじるしは 消す（ばんめんを ふさがない ため）
let stickSeen = false;
const STICK_DIRS = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };

function stickR() { return STICK_TOUCH / SC; }

// さわって いない ときに うっすら 出す ばしょ（ここに ある よ、の めじるし）
function stickHome() {
  const r = stickR();
  return VOB >= 120 ? { x: VW / 2, y: VH + VOB / 2 } : { x: VW - r - 10, y: VH - r - 12 };
}

// いま すすんで いる むき（さわって いない ときの めじるし用）
function nowDir() {
  const x = G.me ? G.me.wx : 0, y = G.me ? G.me.wy : 0;
  return x < 0 ? 'l' : x > 0 ? 'r' : y < 0 ? 'u' : y > 0 ? 'd' : '';
}

function stickGrab(vx, vy) {
  stickSeen = true;
  stick.on = true;
  stick.cx = vx; stick.cy = vy;      // さわった ところが まん中
  stick.dx = 0; stick.dy = 0;
  stick.dir = ''; stick.rep = 0;
}

function stickMove(vx, vy) {
  const r = stickR(), dead = STICK_DEAD / SC;
  let ax = vx - stick.cx, ay = vy - stick.cy;
  const len = Math.hypot(ax, ay);
  if (len > r) {                      // はしまで 行ったら まん中も ついていく
    stick.cx += (len - r) * ax / len;
    stick.cy += (len - r) * ay / len;
    ax = vx - stick.cx; ay = vy - stick.cy;
  }
  stick.dx = ax; stick.dy = ay;
  if (Math.hypot(ax, ay) < dead) { stick.dir = ''; return; }
  const dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'r' : 'l') : (ay > 0 ? 'd' : 'u');
  if (dir !== stick.dir) {
    stick.dir = dir;
    stick.rep = 0.34;
    turn(STICK_DIRS[dir][0], STICK_DIRS[dir][1]);
  }
}

function stickRelease() {
  stick.on = false; stick.id = null; stick.dir = ''; stick.dx = 0; stick.dy = 0;
}

// 入れっぱなしの ときの くりかえし（カエルの ジャンプ用）
function stickTick(dt) {
  if (!STICK_false || !stick.on || !stick.dir) return;
  stick.rep -= dt;
  if (stick.rep <= 0) {
    stick.rep = 0.19;
    turn(STICK_DIRS[stick.dir][0], STICK_DIRS[stick.dir][1]);
  }
}

function drawStick() {
  if (!stick.on && stickSeen) return;   // ゆびを おいた ときだけ 出す
  const r = stickR();
  const home = stickHome();
  const cx = stick.on ? stick.cx : home.x, cy = stick.on ? stick.cy : home.y;
  const a = stick.on ? 1 : 0.42;                 // さわって いない ときは うすく
  const lit = stick.dir || (stick.on ? '' : nowDir());
  ctx.save();
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,10,10,0.22)'; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.strokeStyle = 'rgba(248,248,248,0.34)'; ctx.stroke();
  const s = r * 0.13;
  for (const [k, ax, ay] of [['u', 0, -1], ['d', 0, 1], ['l', -1, 0], ['r', 1, 0]]) {
    const tx = cx + ax * r * 0.90, ty = cy + ay * r * 0.90;
    const bx = cx + ax * r * 0.68, by = cy + ay * r * 0.68;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx - ay * s, by + ax * s);
    ctx.lineTo(bx + ay * s, by - ax * s);
    ctx.closePath();
    ctx.fillStyle = lit === k ? PAL.y : 'rgba(248,248,248,0.42)';
    ctx.fill();
  }
  const kx = cx + stick.dx, ky = cy + stick.dy;
  ctx.beginPath(); ctx.arc(kx, ky, r * 0.40, 0, Math.PI * 2);
  ctx.fillStyle = stick.on ? PAL.y : 'rgba(248,248,248,0.66)'; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(kx - r * 0.11, ky - r * 0.13, r * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
  ctx.restore();
}

// --- タイトル --------------------------------------------------------------------

function drawTitle() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  // うしろで あおいと おばけが 走る（下の あいた ところ）
  const y0 = VH - 112;
  const px = ((G.t * 90) % (VW + 260)) - 130;
  drawAoi(px, y0, 2.2, 1, 0, ((G.t * 8) | 0) % 2 === 0);
  for (let i = 0; i < 4; i++) {
    drawGhost(px - 46 - i * 40, y0, 2.2, GHOSTS[i].col, false, false, false, 1, 0);
  }

  retroText('あおいの', 24, 16, 22, PAL.c, PAL.dk);
  retroText('パクパクめいろ', 24, 42, 40, PAL.y, PAL.dk);
  retroText('おかしを ぜんぶ 食べよう！', 26, 128, 15, PAL.w, null);

  const cols = VW > 700 ? 5 : 4;
  const cw = Math.min(120, (VW - 48 - (cols - 1) * 8) / cols), ch = 46;
  const y = 156;
  for (let i = 0; i < STAGES.length; i++) {
    const x = 24 + (i % cols) * (cw + 8), yy = y + Math.floor(i / cols) * (ch + 8);
    const open = i < save.open;
    const b = button(x, yy, cw, ch, open ? () => startStage(i) : null);
    ctx.fillStyle = PAL.dk;
    ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
    ctx.fillStyle = open ? (save.clear[i] ? PAL.g : PAL.b) : '#1A1A2E';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = open ? PAL.w : PAL.gy;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(open ? STAGES[i].name : '？？', cw - 10, 15, 'bold ');
    ctx.fillText(open ? STAGES[i].name : '？？', b.x + cw / 2, b.y + 16);
    if (open) {
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = save.clear[i] ? PAL.k : PAL.c;
      ctx.fillText(MAZES[STAGES[i].maze].name, b.x + cw / 2, b.y + 33);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  retroText('ハイスコア', 24, VH - 54, 13, PAL.gy, null);
  drawNum(save.hi, 100, VH - 55, 3, PAL.y, 'left');

  drawButton(button(VW - 232, VH - 42, 108, 30, () => { G.screen = 'howto'; }), 'あそびかた', PAL.c);
  drawButton(button(VW - 116, VH - 42, 100, 30, () => { sfxTest(); }), '♪ おと', PAL.w);
  retroText('v' + GAME_VER, 24, VH - 22, 12, PAL.gy, null);
  crt();
}

function drawHowto() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  retroText('あそびかた', 24, 14, 26, PAL.y, PAL.dk);
  const lines = [
    '① 画面の どこでも ゆびを おいて、その まま 上下左右に すべらせる',
    'さわった ところが スティックの まん中。すぐ 上にも 入れられる。パソコンは 矢印キー',
    '② めいろの おかしを ぜんぶ 食べると クリア',
    '③ おばけに つかまると 1機 へる。3機 なくなると おしまい',
  ].concat(TIPS);
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.72, 15);
    ctx.fillStyle = PAL.w;
    ctx.fillText(s, 24, 56 + i * 26);
  });
  for (let i = 0; i < 4; i++) {
    drawGhost(VW - 70, 90 + i * 56, 2.6, GHOSTS[i].col, false, false, false, 0, 1);
    ctx.fillStyle = PAL.gy;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(GHOSTS[i].name, VW - 70, 90 + i * 56 + 22);
    ctx.textAlign = 'left';
  }
  drawButton(button(VW - 250, 12, 100, 30, () => { G.screen = 'title'; }), 'もどる', PAL.y);
  crt();
}

// --- そうさ ----------------------------------------------------------------------

// ゆび 1本ずつ おぼえて おく。
// スティックを にぎった ゆびは、はなすまで ずっと おいかける。
const touchAt = {};

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
  return b;
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const x = t.clientX - r.left, y = t.clientY - r.top;
    audioStart();
    const b = hitBtn(x, y);
    if (b && b.on) { b.on(); touchAt[t.identifier] = { btn: true }; continue; }
    if (stick.on) { touchAt[t.identifier] = {}; continue; }   // すでに 1本 にぎって いる
    const v = toV(x, y);
    stickGrab(v.x, v.y);
    stick.id = t.identifier;
    touchAt[t.identifier] = { stick: true };
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (stick.id !== t.identifier) continue;
    const v = toV(t.clientX - r.left, t.clientY - r.top);
    stickMove(v.x, v.y);
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    delete touchAt[t.identifier];
    if (stick.id === t.identifier) stickRelease();
  }
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    delete touchAt[t.identifier];
    if (stick.id === t.identifier) stickRelease();
  }
});
// パソコン（マウス）でも おなじ ように つかめる
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  audioStart();
  const b = hitBtn(x, y);
  if (b && b.on) { b.on(); return; }
  const v = toV(x, y);
  stickGrab(v.x, v.y);
  stick.id = 'm';
});
canvas.addEventListener('mousemove', (e) => {
  if (stick.id !== 'm') return;
  const r = canvas.getBoundingClientRect();
  const v = toV(e.clientX - r.left, e.clientY - r.top);
  stickMove(v.x, v.y);
});
window.addEventListener('mouseup', () => { if (stick.id === 'm') stickRelease(); });
window.addEventListener('keydown', (e) => {
  audioStart();
  if (e.code === 'ArrowLeft') { e.preventDefault(); turn(-1, 0); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); turn(1, 0); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); turn(0, -1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); turn(0, 1); }
});


// たて長の ときだけ、下の あいた ところに あんないを 出す
function portraitTip() {
  if (ROT) return;               // まわして いる ときは 画面いっぱいなので いらない
  if (VOY < 26) return;
  if (VOB >= 120 && G.screen === 'play') return;   // そこは スティックの ばしょ
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('よこ向きに すると 大きく なるよ', VW / 2, VH + Math.min(VOY * 0.55, 26));
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- メインループ ----------------------------------------------------------------

let last = 0;

function frame(ms) {
  const now = ms / 1000;
  let dt = last ? now - last : 0;
  last = now;
  dt = Math.min(0.05, dt);

  update(dt);
  stickTick(dt);

  // レターボックスの すきまを 消す（スティックを そこに 描く ため）
  if (VOB > 0) {
    ctx.fillStyle = PAL.k;
    ctx.fillRect(0, -VOY - 2, VW, VOY + 4);
    ctx.fillRect(0, VH - 2, VW, VOB + 4);
  }

  ui.buttons = [];
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();

  portraitTip();
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
