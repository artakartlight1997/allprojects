// リナパパの はしごのぼり
//
// ★ むかしの「たるを よけながら はしごを のぼる」ゲームが もと。
//   いちばん 上で まって いる りなの ところまで のぼれば クリア。
//   ハンマーを とると しばらく たるを こわせる。
//
// ★ そうさ … 左 スティックで 走る／はしごを のぼる、右ボタンで ジャンプ。
//   ジャンプは 「ちょっと 遅れて おしても とぶ」（コヨーテ時間）ように して、
//   子どもでも たるを 気もちよく とびこせる ように した。

'use strict';

const GAME_VER = 1;
const HUD = 26;

// ばんめんは よこ 640 x たて 360 の せかいで 考えて、画面に あわせて のばす。
const WW = 640, WH = 360;

const STAGES = [
  { name: 'いえの まえ', rate: 1.70, sp: 76, fire: 0, hammer: true },
  { name: 'こうじげんば', rate: 1.55, sp: 82, fire: 0, hammer: true },
  { name: 'こうえん',     rate: 1.42, sp: 88, fire: 1, hammer: true },
  { name: 'ビルの なか',  rate: 1.30, sp: 94, fire: 1, hammer: true },
  { name: 'てっこつ',     rate: 1.20, sp: 99, fire: 1, hammer: true },
  { name: 'とうだい',     rate: 1.12, sp: 104, fire: 2, hammer: true },
  { name: 'たかい やま',  rate: 1.05, sp: 110, fire: 2, hammer: true },
  { name: 'そらの うえ',  rate: 0.98, sp: 116, fire: 2, hammer: true },
];

// ゆか（y は 下から の 高さ）と はしご
const FLOORS = [
  { y: 30,  x0: 20,  x1: 620 },
  { y: 96,  x0: 20,  x1: 560 },
  { y: 162, x0: 80,  x1: 620 },
  { y: 228, x0: 20,  x1: 560 },
  { y: 294, x0: 80,  x1: 620 },
  { y: 322, x0: 240, x1: 430 },
];
const LADDERS = [
  { x: 120, a: 0, b: 1 }, { x: 470, a: 0, b: 1 },
  { x: 200, a: 1, b: 2 }, { x: 520, a: 1, b: 2 },
  { x: 140, a: 2, b: 3 }, { x: 420, a: 2, b: 3 },
  { x: 240, a: 3, b: 4 }, { x: 500, a: 3, b: 4 },
  { x: 300, a: 4, b: 5 }, { x: 380, a: 4, b: 5 },
];

const SAVE_KEY = 'climb.save.v1';
const save = { open: 1, clear: [], hi: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = s.open;
  if (Array.isArray(s.clear)) save.clear = s.clear;
  if (typeof s.hi === 'number') save.hi = s.hi;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0, S: STAGES[0],
  me: null, barrels: [], fires: [], hammer: null,
  lives: 3, score: 0, over: false, win: false, spawn: 0, msg: '', msgT: 0, bonus: 0,
};

function box() {
  const top = HUD + 4, bot = 6;
  const s = Math.min((VH - top - bot) / WH, (VW - 20) / WW);
  return { s: s, x: (VW - WW * s) / 2, y: top };
}
function px(B, x) { return B.x + x * B.s; }
function py(B, y) { return B.y + (WH - y) * B.s; }

function floorAt(x, y) {
  // その ばしょの すぐ 下に ある ゆか
  let best = null;
  for (const f of FLOORS) {
    if (x < f.x0 - 6 || x > f.x1 + 6) continue;
    if (y + 0.5 < f.y) continue;
    if (!best || f.y > best.y) best = f;
  }
  return best;
}

// ★ 1コマの あいだに 「またいで しまった」ゆかを さがす。
//   まえは「いまの ばしょの すぐ 下」だけを 見て いた ので、
//   1コマの 落ちる きょりが 0.5 より 大きい と ゆかを すりぬけて
//   そのまま 下まで 落ちて いた（画面が 60コマ/びょう より おそい
//   スマホや、ひらいた ちょくごの 1コマ目で かならず 起きる）。
//   はじめから 落ちる、の げんいん は これ。
function landOn(x, y0, y1) {
  let best = null;
  for (const f of FLOORS) {
    if (x < f.x0 - 6 || x > f.x1 + 6) continue;
    if (y0 + 0.6 < f.y) continue;      // もとから 下に いた
    if (y1 > f.y) continue;            // まだ とどいて いない
    if (!best || f.y > best.y) best = f;
  }
  return best;
}
function ladderAt(x, y) {
  for (const L of LADDERS) {
    if (Math.abs(x - L.x) > 13) continue;
    const y0 = FLOORS[L.a].y, y1 = FLOORS[L.b].y;
    if (y >= y0 - 4 && y <= y1 + 12) return L;
  }
  return null;
}

function startStage(i) {
  G.stage = i; G.S = STAGES[i];
  G.screen = 'play'; G.over = false; G.win = false;
  G.lives = 3; G.score = 0;
  resetRound();
  bgmStart(i + 1);
}
function resetRound() {
  G.me = { x: 60, y: FLOORS[0].y, vy: 0, dir: 1, onGround: true, onLadder: null,
           jump: 0, coyote: 0, dead: 0, walk: 0, hammer: 0 };
  G.barrels = []; G.fires = [];
  G.spawn = 1.2; G.bonus = 5000;
  G.hammer = G.S.hammer ? { x: 300, y: FLOORS[2].y + 14, got: false } : null;
  for (let i = 0; i < G.S.fire; i++) {
    G.fires.push({ x: 200 + i * 160, y: FLOORS[1 + (i % 3)].y, dir: i % 2 ? 1 : -1, t: 0 });
  }
  G.msg = ''; G.msgT = 0;
}

function say(s) { G.msg = s; G.msgT = 1.4; }

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'play' || G.over) return;

  const S = G.S, me = G.me;
  G.bonus = Math.max(0, G.bonus - dt * 90);

  if (me.dead > 0) {
    me.dead -= dt;
    if (me.dead <= 0) {
      G.lives--;
      if (G.lives <= 0) { endGame(false); return; }
      resetLite();
    }
    return;
  }

  // --- そうさ ---
  const dir = IN.dir || keyDir() || '';
  const ax = (dir === 'l' ? -1 : dir === 'r' ? 1 : 0);
  const ay = (dir === 'u' ? -1 : dir === 'd' ? 1 : 0);

  const L = ladderAt(me.x, me.y);
  if (me.onLadder) {
    // はしごの 上下
    if (ay !== 0) { me.y -= ay * 62 * dt; me.walk += dt; }
    me.x += (me.onLadder.x - me.x) * Math.min(1, dt * 14);
    const top = FLOORS[me.onLadder.b].y, bot = FLOORS[me.onLadder.a].y;
    if (me.y >= top) { me.y = top; me.onLadder = null; me.onGround = true; me.vy = 0; }
    if (me.y <= bot) { me.y = bot; me.onLadder = null; me.onGround = true; me.vy = 0; }
    if (ax !== 0 && Math.abs(me.y - bot) < 3) { me.onLadder = null; me.onGround = true; }
  } else {
    if (ax !== 0) { me.x += ax * 108 * dt; me.dir = ax; me.walk += dt; }
    // はしごに 入る
    if (L && ay !== 0) {
      const goUp = ay < 0 && Math.abs(me.y - FLOORS[L.a].y) < 6;
      const goDn = ay > 0 && Math.abs(me.y - FLOORS[L.b].y) < 6;
      if ((goUp || goDn) && me.onGround) { me.onLadder = L; me.vy = 0; me.onGround = false; }
    }
    // ジャンプ（コヨーテ時間つき）
    if (me.onGround) me.coyote = 0.12; else me.coyote -= dt;
    if ((IN.fireTap || KEYS.Space) && me.coyote > 0 && me.vy <= 0.1) {
      me.vy = 168; me.onGround = false; me.coyote = 0; sfxJump();
    }
    const prevY = me.y;
    me.vy -= 520 * dt;
    me.y += me.vy * dt;
    const f = me.vy <= 0 ? landOn(me.x, prevY, me.y) : null;
    if (f) { me.y = f.y; me.vy = 0; me.onGround = true; }
    else if (me.y < -20) { me.dead = 1.1; sfxDead(); }
    else me.onGround = false;
  }
  me.x = clamp(me.x, 14, WW - 14);
  if (me.hammer > 0) me.hammer -= dt;

  // --- たる ---
  G.spawn -= dt;
  if (G.spawn <= 0) {
    G.spawn = S.rate * (0.75 + Math.random() * 0.5);
    // ★ たるは 上から 2ばんめの ゆかから ころがす。
    //   いちばん 上（ゴールの ゆか）に たるを 出すと、さいごの はしごを
    //   のぼって いる とちゅうに 上から 落ちて きて よけようが なかった。
    G.barrels.push({ x: FLOORS[4].x0 + 10, y: FLOORS[4].y, vx: S.sp, vy: 0, fl: 4, spin: 0 });
    sfxTap();
  }
  for (const b of G.barrels) {
    b.spin += dt * 6;
    if (b.fl >= 0) {
      b.x += b.vx * dt;
      const f = FLOORS[b.fl];
      // はしごを 下りるか、はしまで 行ったら 落ちる
      let drop = false;
      if (b.x < f.x0 + 4 || b.x > f.x1 - 4) drop = true;
      else {
        // ★ はしごを 下りるかは、その はしごに さしかかった とき 1回だけ きめる。
        //   まいコマ さいころを ふると ほとんど かならず 下りて しまって いた。
        let onLad = null;
        for (const Ld of LADDERS) {
          if (Ld.b !== b.fl) continue;
          if (Math.abs(b.x - Ld.x) < 5) { onLad = Ld; break; }
        }
        if (onLad) {
          if (b.ladAt !== onLad.x) {
            b.ladAt = onLad.x;
            if (Math.random() < 0.32) { drop = true; b.x = onLad.x; }
          }
        } else b.ladAt = null;
      }
      if (drop) { b.fl = -1; b.vy = 0; }
    } else {
      const pY = b.y;
      b.vy -= 520 * dt;
      b.y += b.vy * dt;
      const f = landOn(b.x, pY, b.y);
      if (f) {
        b.y = f.y; b.vy = 0;
        b.fl = FLOORS.indexOf(f);
        b.vx = (b.x < WW / 2) ? Math.abs(b.vx) : -Math.abs(b.vx);
        if (b.fl === 0) b.vx = Math.abs(b.vx);
      } else if (b.y < -30) b.gone = true;
    }
    if (b.fl === 0 && (b.x > FLOORS[0].x1 - 6 || b.x < FLOORS[0].x0 + 6)) b.gone = true;

    // あたり
    // ★ たては「同じ ゆかに いる ときだけ」当たる ように せまく する。
    //   まえは 上の ゆかを ころがる たるが、はしごの とちゅうの パパに
    //   当たって いて、よけようが なかった。
    // ★ はしごを のぼって いる とちゅうに 落ちて くる たるは 当たらない。
    //   よけようが ないので、そこだけ あんぜんに して ある。
    const dx = Math.abs(b.x - me.x), dy = Math.abs(b.y - me.y);
    const safe = me.onLadder && b.fl < 0;
    if (!safe && dx < 13 && dy < 13 && me.dead <= 0) {
      if (me.hammer > 0) { b.gone = true; G.score += 300; sfxHit(); say('こわした！'); }
      else { me.dead = 1.1; sfxDead(); }
    } else if (!b.gone && me.dead <= 0 && b.fl >= 0 && Math.abs(b.y - me.y) < 26 &&
               dx < 26 && !b.jumped && me.vy > 20) {
      b.jumped = true; G.score += 100; sfxGet();
    }
  }
  G.barrels = G.barrels.filter((b) => !b.gone);

  // --- ひ（うごく じゃま） ---
  for (const f of G.fires) {
    f.t += dt;
    f.x += f.dir * 42 * dt;
    const fl = FLOORS.find((q) => Math.abs(q.y - f.y) < 2);
    if (fl && (f.x < fl.x0 + 12 || f.x > fl.x1 - 12)) f.dir *= -1;
    if (Math.abs(f.x - me.x) < 13 && Math.abs(f.y - me.y) < 13 && me.dead <= 0) { me.dead = 1.1; sfxDead(); }
  }

  // --- ハンマー ---
  if (G.hammer && !G.hammer.got &&
      Math.abs(G.hammer.x - me.x) < 16 && Math.abs(G.hammer.y - me.y) < 22) {
    G.hammer.got = true; me.hammer = 6.5; G.score += 200; sfxGet(); say('ハンマー！');
  }

  // --- ゴール ---
  if (me.y >= FLOORS[5].y - 2 && Math.abs(me.x - 335) < 40) endGame(true);
}

function resetLite() {
  G.me.x = 60; G.me.y = FLOORS[0].y; G.me.vy = 0; G.me.onLadder = null;
  G.me.onGround = true; G.me.dead = 0; G.me.hammer = 0;
  G.barrels = []; G.spawn = 1.4;
}

function endGame(win) {
  G.over = true; G.win = win;
  bgmStop();
  if (win) {
    G.score += Math.round(G.bonus) + G.lives * 300;
    save.clear[G.stage] = true;
    save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
    sfxClear(G.lives === 3);
  } else sfxOver();
  if (G.score > save.hi) save.hi = G.score;
  storeSave();
}

// --- 絵 ---------------------------------------------------------------------------

function drawPlay() {
  const B = box();
  bgGrad('#2A1E52', '#120C26');

  // ほし
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.3 * Math.abs(Math.sin(G.t + i))) + ')';
    ctx.fillRect(px(B, (i * 37) % WW), py(B, (i * 53) % WH), 2, 2);
  }

  // はしご
  for (const L of LADDERS) {
    const y0 = py(B, FLOORS[L.a].y), y1 = py(B, FLOORS[L.b].y);
    ctx.strokeStyle = '#C8A860'; ctx.lineWidth = Math.max(2, B.s * 2.4);
    ctx.beginPath();
    ctx.moveTo(px(B, L.x - 9), y0); ctx.lineTo(px(B, L.x - 9), y1);
    ctx.moveTo(px(B, L.x + 9), y0); ctx.lineTo(px(B, L.x + 9), y1);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, B.s * 2);
    const n = Math.max(2, Math.round((y0 - y1) / (B.s * 12)));
    for (let i = 0; i <= n; i++) {
      const y = y1 + (y0 - y1) * (i / n);
      ctx.beginPath(); ctx.moveTo(px(B, L.x - 9), y); ctx.lineTo(px(B, L.x + 9), y); ctx.stroke();
    }
  }

  // ゆか
  for (const f of FLOORS) {
    const x0 = px(B, f.x0), x1 = px(B, f.x1), y = py(B, f.y);
    ctx.fillStyle = '#E06A8A';
    ctx.fillRect(x0, y, x1 - x0, Math.max(3, B.s * 7));
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x0, y, x1 - x0, Math.max(1.5, B.s * 2));
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = x0; x < x1; x += Math.max(8, B.s * 18)) ctx.fillRect(x, y, 2, Math.max(3, B.s * 7));
  }

  // ハンマー
  if (G.hammer && !G.hammer.got) {
    const x = px(B, G.hammer.x), y = py(B, G.hammer.y);
    ctx.fillStyle = '#B0783A';
    ctx.fillRect(x - B.s * 1.5, y - B.s * 16, B.s * 3, B.s * 16);
    ctx.fillStyle = '#D8D8E0';
    rr(x - B.s * 8, y - B.s * 24, B.s * 16, B.s * 10, B.s * 2); ctx.fill();
  }

  // ゴール（りな）
  const gx = px(B, 335), gy = py(B, FLOORS[5].y);
  ctx.save();
  ctx.translate(gx, gy - B.s * 15 + Math.sin(G.t * 3) * B.s * 2);
  const s = B.s * 12;
  ctx.fillStyle = '#4A2B1E'; circle(0, 0, s * 1.1); ctx.fill();
  circle(-s * 1.0, s * 0.3, s * 0.42); ctx.fill();
  circle(s * 1.0, s * 0.3, s * 0.42); ctx.fill();
  ctx.fillStyle = '#FFE0C8'; circle(0, 0, s); ctx.fill();
  ctx.fillStyle = '#4A2B1E';
  ctx.beginPath(); ctx.arc(0, -s * 0.14, s * 0.99, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(-s * 0.36, s * 0.12, s * 0.16); ctx.fill();
  circle(s * 0.36, s * 0.12, s * 0.16); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  circle(-s * 0.62, s * 0.32, s * 0.15); ctx.fill();
  circle(s * 0.62, s * 0.32, s * 0.15); ctx.fill();
  ctx.fillStyle = '#FF6FA8'; circle(s * 0.9, -s * 0.75, s * 0.22); ctx.fill();
  ctx.restore();
  bigText('たすけて！', gx, gy - B.s * 34, Math.round(B.s * 11), '#FFD24A');

  // たる
  for (const b of G.barrels) {
    const x = px(B, b.x), y = py(B, b.y) - B.s * 9;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(b.spin * (b.vx >= 0 ? 1 : -1));
    ctx.fillStyle = '#C87A3A';
    rr(-B.s * 10, -B.s * 8, B.s * 20, B.s * 16, B.s * 5); ctx.fill();
    ctx.fillStyle = '#8A4E22';
    ctx.fillRect(-B.s * 10, -B.s * 3, B.s * 20, B.s * 2);
    ctx.fillRect(-B.s * 10, B.s * 2, B.s * 20, B.s * 2);
    ctx.fillStyle = '#FFF';
    circle(-B.s * 3.4, -B.s * 1.4, B.s * 2.4); ctx.fill();
    circle(B.s * 3.4, -B.s * 1.4, B.s * 2.4); ctx.fill();
    ctx.fillStyle = '#2A2028';
    circle(-B.s * 3.4, -B.s * 1.0, B.s * 1.2); ctx.fill();
    circle(B.s * 3.4, -B.s * 1.0, B.s * 1.2); ctx.fill();
    ctx.restore();
  }

  // ひ
  for (const f of G.fires) {
    const x = px(B, f.x), y = py(B, f.y) - B.s * 10;
    drawBlob(x, y, B.s * 9, '#FF8A4A', { t: f.t, look: f.dir });
  }

  // パパ
  if (G.me.dead <= 0 || Math.floor(G.t * 12) % 2 === 0) {
    const x = px(B, G.me.x), y = py(B, G.me.y);
    drawPapa(x, y - B.s * 13, B.s * 15,
             { dir: G.me.dir, walk: G.me.walk, shirt: G.me.hammer > 0 ? '#FF6FA8' : '#4AA0E0',
               face: G.me.dead > 0 ? 'oops' : 'happy' });
    if (G.me.hammer > 0) {
      ctx.save();
      ctx.translate(x + G.me.dir * B.s * 14, y - B.s * 30);
      ctx.rotate(Math.sin(G.t * 14) * 0.7);
      ctx.fillStyle = '#B0783A'; ctx.fillRect(-B.s * 1.4, 0, B.s * 2.8, B.s * 12);
      ctx.fillStyle = '#D8D8E0'; rr(-B.s * 7, -B.s * 8, B.s * 14, B.s * 9, B.s * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawHud();
  drawStick();
  drawFire('ジャンプ', '#8AE0FF');

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH * 0.28, 28, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    drawResult(G.win, G.win ? 'たすけた！' : 'ゲームオーバー',
      ['スコア ' + G.score, G.win ? 'ボーナス ' + Math.round(G.bonus) : 'もう すこし！'],
      resultButtons());
  }
}

function resultButtons() {
  const btns = [];
  const nx = G.stage + 1;
  if (G.win && nx < STAGES.length) btns.push({ label: 'つぎの めん', on: () => startStage(nx) });
  btns.push({ label: 'もういちど', on: () => startStage(G.stage), col: '#8AD8F0' });
  btns.push({ label: 'めんを えらぶ', on: () => { G.screen = 'title'; }, col: '#C8BCE8' });
  return btns;
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A'; ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#C8BCE8';
  ctx.fillText('ボーナス ' + Math.round(G.bonus), 132, HUD / 2);
  ctx.fillText(G.S.name, 250, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('パパ ' + G.lives, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#3A2A66', '#140E28');
  bigText('リナパパの', VW / 2, 46, 24, '#BFE6FF');
  bigText('はしごのぼり', VW / 2, 84, fitSize('はしごのぼり', VW * 0.6, 48), '#FFD24A');
  bigText('たるを よけて いちばん 上の りなを たすけよう', VW / 2, 122, 16, '#E8DFFF', null);

  drawPapa(VW * 0.11, 152, 28, { dir: 1, walk: G.t, shirt: '#4AA0E0' });
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 168,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 36, () => sfxTest()), '♪ おと', '#C8BCE8');
  bigText('ハイスコア ' + save.hi, VW / 2, VH - 20, 15, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#2A2050', '#120C22');
  bigText('あそびかた', VW / 2, 42, 28, '#FFD24A');
  const lines = [
    '① 左がわを さわると スティック。よこで 走り、はしごの ところで 上下',
    '② 右がわを おすと ジャンプ。たるを とびこえると てんすう',
    '③ ハンマーを とると しばらく たるを こわせる',
    '④ いちばん 上の りなの ところまで のぼれば クリア',
    '⑤ 早く つくほど ボーナスが 大きい',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 96 + i * 34, fitSize(s, VW * 0.86, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 66, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
