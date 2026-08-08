// ブロックくずしの きまり。
//
// ★ ふつうの ブロックくずしは、さいごの 1こが なかなか 当たらなくて
//   たいくつに なる。そこで
//     ・ばくだん ブロック（まわりも いっしょに こわれる）
//     ・アイテム（ラケットが 広く / たまが ふえる / レーザー）
//   を 入れて、さいごの ほうほど 早く 終わるように した。
//
// ★ 4・8・12めん には **リナパパ**が 出てくる。メガネの ちょいぽちゃ。
//   ラケットと ブロックの あいだを ふらふら して、ケーキを おとしてくる。
//   ケーキが ラケットに 当たると しばらく ラケットが 小さく なる。

'use strict';

const SAVE_KEY = 'block.v1';

// seen … 一度でも会ったボス。会うまでは選ぶ画面で「？」にする。
const save = { clear: [], best: {}, fails: {}, plays: 0, seen: {} };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (o.seen && typeof o.seen === 'object') save.seen = o.seen;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function opened(i) {
  if (i === 0) return true;
  if (save.clear[i - 1]) return true;
  return (save.fails['s' + (i - 1)] || 0) >= 3;
}
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function padMul() { return [1, 1.18, 1.36, 1.6][assistLevel(G.stage)]; }
function spdMul() { return [1, 0.94, 0.88, 0.82][assistLevel(G.stage)]; }
function extraLife() { return assistLevel(G.stage); }

// --- ばしょ ---------------------------------------------------------------------------

const TOPBAR = 34;
const BRICK_H = 21;
const BRICK_TOP = 48;

function fld() {
  const vw = typeof VW === 'number' ? VW : 800;
  const w = Math.min(vw - 24, 700);
  return { x0: (vw - w) / 2, x1: (vw + w) / 2, w, vw };
}
function brickW() { return fld().w / COLS; }
function brickBox(c, r) {
  const F = fld();
  const bw = F.w / COLS;
  return { x: F.x0 + c * bw, y: BRICK_TOP + r * BRICK_H, w: bw, h: BRICK_H };
}

const PAD_Y = VH - 30;
const PAD_H = 13;

// --- じょうたい -----------------------------------------------------------------------

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  bricks: [],       // { c, r, k, hp }
  balls: [],        // { x, y, vx, vy, r }
  items: [],        // { k, x, y }
  shots: [],        // レーザー
  papa: null,
  papaPend: 0,      // まだ出ていないボスの体力（0なら出ない面）
  intro: 0,         // ボス登場のえんしゅつの残り時間
  cakes: [],
  puffs: [],
  px: 0, padW: 86, padT: 0,   // padT … 小さく なって いる のこり時間
  wide: 0, slow: 0, laser: 0, laserCd: 0,
  stuck: true,      // たまが ラケットに くっついて いる
  life: 3, maxlife: 3,
  score: 0, combo: 0,
  spd: 250,
  t: 0,
  noHit: 0, rush: 1,     // しばらく ブロックに 当たらないと たまが 早く なる
  over: false, win: false, endT: 0,
  shake: 0,
  msg: '', msgT: 0,
};

function say(s) { G.msg = s; G.msgT = 2.2; }

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.bricks = [];
  for (let r = 0; r < G.S.map.length; r++) {
    const row = G.S.map[r];
    for (let c = 0; c < COLS; c++) {
      const ch = row[c] || '.';
      if (ch === '.' || !BRICK[ch]) continue;
      G.bricks.push({ c, r, k: ch, hp: BRICK[ch].hp, hit: 0 });
    }
  }
  const F = fld();
  G.px = (F.x0 + F.x1) / 2;
  G.padW = Math.round(86 * padMul());
  G.padT = 0;
  G.wide = 0; G.slow = 0; G.laser = 0; G.laserCd = 0;
  G.balls = []; G.items = []; G.shots = []; G.cakes = []; G.puffs = [];
  G.stuck = true;
  G.maxlife = 3 + extraLife();
  G.life = G.maxlife;
  G.score = 0; G.combo = 0;
  G.spd = G.S.spd * spdMul();
  G.t = 0;
  G.noHit = 0; G.rush = 1;
  G.over = false; G.win = false; G.endT = 0;
  G.shake = 0;
  G.msg = ''; G.msgT = 0;
  // ★ ボスは **はじめから 出さない**。ブロックが 半分 こわれた ころに
  //   えんしゅつ付きで 出てくる。はじめから いると おどろきが ない。
  G.papa = null;
  G.papaPend = G.S.papa || 0;
  G.intro = 0;
  G.half = Math.ceil(breakable() * 0.5);
  newBall();
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

function spawnPapa() {
  const F = fld();
  G.papa = { x: (F.x0 + F.x1) / 2, y: VH * 0.56, vx: 105, r: 34,
             hp: G.papaPend, max: G.papaPend, cd: 2.6, hit: 0, t: 0 };
  G.papaPend = 0;
  G.intro = 2.4;
  save.seen.papa = true;
  storeSave();
  sfxPapa();
  bgmHeat(1);
}

function newBall() {
  G.stuck = true;
  G.balls = [{ x: G.px, y: PAD_Y - 12, vx: 0, vy: 0, r: 7 }];
}

function launch() {
  if (!G.stuck || G.over) return;
  G.stuck = false;
  const b = G.balls[0];
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  b.vx = Math.cos(a) * G.spd;
  b.vy = Math.sin(a) * G.spd;
  sfxBounce(false);
}

function padWidth() {
  let w = G.padW * (G.wide > 0 ? 1.55 : 1);
  if (G.padT > 0) w *= 0.6;
  return w;
}

function setPad(x) {
  const F = fld();
  const hw = padWidth() / 2;
  G.px = Math.max(F.x0 + hw, Math.min(F.x1 - hw, x));
  if (G.stuck && G.balls[0]) { G.balls[0].x = G.px; G.balls[0].y = PAD_Y - 12; }
}

// --- アイテム -------------------------------------------------------------------------

const ITEMS = {
  wide:  { col: '#8FD6FF', txt: 'W', name: 'ラケットが広く' },
  multi: { col: '#FFD166', txt: 'M', name: '玉が3つ' },
  slow:  { col: '#A8F0B0', txt: 'S', name: '玉がゆっくり' },
  laser: { col: '#FF8FA0', txt: 'L', name: 'レーザー' },
  life:  { col: '#FF6B7A', txt: '♥', name: '玉が1つ増える' },
};
const ITEM_KEYS = ['wide', 'multi', 'slow', 'laser', 'life'];

function dropItem(x, y, sure) {
  if (!sure && Math.random() > 0.16) return;
  const r = Math.random();
  const k = sure ? ITEM_KEYS[(Math.random() * 4) | 0]
                 : (r < 0.30 ? 'wide' : r < 0.55 ? 'multi' : r < 0.75 ? 'slow' : r < 0.94 ? 'laser' : 'life');
  G.items.push({ k, x, y, r: 12 });
}

function takeItem(k) {
  if (k === 'wide') G.wide = 12;
  else if (k === 'slow') G.slow = 10;
  else if (k === 'laser') { G.laser = 10; G.laserCd = 0; }
  else if (k === 'life') { G.life = Math.min(G.maxlife + 2, G.life + 1); }
  else if (k === 'multi') {
    const src = G.balls.slice(0, 3);
    for (const b of src) {
      for (const d of [-0.4, 0.4]) {
        const a = Math.atan2(b.vy, b.vx) + d;
        const sp = Math.hypot(b.vx, b.vy) || G.spd;
        G.balls.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 });
      }
    }
  }
  say(ITEMS[k].name + '！');
  G.score += 200;
  sfxItem();
}

// --- ブロック -------------------------------------------------------------------------

function brickAt(c, r) {
  for (const b of G.bricks) if (b.c === c && b.r === r) return b;
  return null;
}

function breakable() {
  return G.bricks.filter((b) => b.k !== 's').length;
}

function killBrick(b, chain) {
  const i = G.bricks.indexOf(b);
  if (i < 0) return;
  G.bricks.splice(i, 1);
  const box = brickBox(b.c, b.r);
  G.combo++;
  G.score += Math.round(BRICK[b.k].pt * (1 + Math.min(10, G.combo) * 0.06));
  puff(box.x + box.w / 2, box.y + box.h / 2, BRICK[b.k].col, 8);
  if (b.k === '?') dropItem(box.x + box.w / 2, box.y, true);
  else dropItem(box.x + box.w / 2, box.y, false);
  if (b.k === 'b' && !chain) {
    sfxBomb();
    G.shake = 1;
    // ★ まわり 8つを まきぞえ（はがね だけは のこる）
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        const o = brickAt(b.c + dc, b.r + dr);
        if (o && o.k !== 's') killBrick(o, true);
      }
    }
  } else if (!chain) {
    sfxBrick(G.combo);
  }
}

// ブロック ぜんぶを 1だん 下げる（下げすぎない ように 止める）
function dropBricks() {
  if (!G.bricks.length) return;
  let low = 0;
  for (const b of G.bricks) low = Math.max(low, b.r);
  if (BRICK_TOP + (low + 2) * BRICK_H <= PAD_Y - 70) {
    for (const b of G.bricks) b.r++;
    say('ブロックが下がってきた！');
    sfxHard();
    return;
  }
  // ★ もう 下げられない ところまで きたら、いちばん 下の ブロックが
  //   じぶんから くずれる。すみっこに 1こだけ のこって いつまでも
  //   当たらない、で 終わらなく なるのを ふせぐ ため。
  const cand = G.bricks.filter((b) => b.k !== 's' && b.r === low);
  const t = cand.length ? cand[0] : G.bricks.find((b) => b.k !== 's');
  if (t) { killBrick(t, false); say('ブロックがひとりでに くずれた'); }
}

function hitBrick(b) {
  // ★ はがねは 当たっても すすまない。ここで 時間を もどすと、
  //   はがねの あいだで はねつづける かぎり ブロックが 下がって こない。
  if (b.k === 's') { sfxHard(); return; }
  G.noHit = 0; G.rush = 1;
  b.hp--;
  b.hit = 1;
  if (b.hp <= 0) killBrick(b, false);
  else { sfxHard(); G.score += 30; }
}

function puff(x, y, col, n) {
  for (let i = 0; i < (n || 8); i++) {
    const a = Math.random() * 7, s = 40 + Math.random() * 130;
    G.puffs.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.35 + Math.random() * 0.4, col });
  }
}

// --- 1コマ ----------------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.shake = Math.max(0, G.shake - dt * 3);
  G.msgT = Math.max(0, G.msgT - dt);
  for (const p of G.puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
  G.puffs = G.puffs.filter((p) => p.t < p.life);
  for (const b of G.bricks) b.hit = Math.max(0, b.hit - dt * 5);

  if (G.over) {
    G.endT += dt;
    if (G.endT > 1.6) { bgmStop(); G.screen = 'result'; }
    return;
  }

  G.t += dt;
  G.wide = Math.max(0, G.wide - dt);
  G.slow = Math.max(0, G.slow - dt);
  G.laser = Math.max(0, G.laser - dt);
  G.padT = Math.max(0, G.padT - dt);

  // レーザー
  if (G.laser > 0) {
    G.laserCd -= dt;
    if (G.laserCd <= 0) {
      G.laserCd = 0.26;
      G.shots.push({ x: G.px - padWidth() / 2 + 6, y: PAD_Y - 8, vy: -430 });
      G.shots.push({ x: G.px + padWidth() / 2 - 6, y: PAD_Y - 8, vy: -430 });
      sfxLaser();
    }
  }
  for (const s of G.shots) s.y += s.vy * dt;
  G.shots = G.shots.filter((s) => {
    if (s.y < BRICK_TOP - 10) return false;
    const b = brickHitAt(s.x, s.y);
    if (b) { hitBrick(b); return false; }
    if (G.papa && Math.hypot(s.x - G.papa.x, s.y - G.papa.y) < G.papa.r) { hurtPapa(1); return false; }
    return true;
  });

  // ★ ボス登場。ブロックが半分こわれたら出てくる。
  if (G.papaPend && !G.papa && breakable() <= G.half) spawnPapa();
  // えんしゅつ中は たまも止まって、名前が出るのを待つ
  if (G.intro > 0) {
    G.intro -= dt;
    if (G.intro <= 0) say('リナパパ が あらわれた！');
    return;
  }

  if (G.stuck) {
    G.balls[0].x = G.px; G.balls[0].y = PAD_Y - 12;
  } else {
    // ★ ブロックに 当たらない 時間が つづいたら たまを 早くして むきも
    //   少し ずらす。「もう こわせる ブロックが 見えて いるのに
    //   いつまでも 終わらない」を なくす ため。
    const was = Math.floor(G.noHit / 3);
    G.noHit += dt;
    if (Math.floor(G.noHit / 3) !== was) {
      for (const b of G.balls) {
        const sp = Math.hypot(b.vx, b.vy) || G.spd;
        const an = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 0.5;
        b.vx = Math.cos(an) * sp; b.vy = Math.sin(an) * sp;
      }
    }
    G.rush = 1 + Math.min(0.9, Math.floor(G.noHit / 3) * 0.12);
    // ★ それでも 6びょう 当たらない ときは、ブロックの ほうが **下がってくる**。
    //   高い ところに 1こ だけ のこって いつまでも 終わらない、を なくす。
    if (G.noHit >= 6) { dropBricks(); G.noHit = 0; G.rush = 1; }
    stepBalls(dt);
  }

  // アイテム
  for (const it of G.items) it.y += 130 * dt;
  for (let i = G.items.length - 1; i >= 0; i--) {
    const it = G.items[i];
    if (it.y > VH + 20) { G.items.splice(i, 1); continue; }
    if (it.y > PAD_Y - 10 && it.y < PAD_Y + PAD_H + 10 && Math.abs(it.x - G.px) < padWidth() / 2 + 10) {
      takeItem(it.k);
      G.items.splice(i, 1);
    }
  }

  if (G.papa) updatePapa(dt);

  // クリア
  if (breakable() === 0 && (!G.papa || G.papa.hp <= 0)) finish(true);
}

function stepBalls(dt) {
  const F = fld();
  const mul = (G.slow > 0 ? 0.72 : 1) * G.rush;
  // ★ 1コマで 大きく うごくと ブロックを すりぬける。小わけに する。
  const steps = Math.max(1, Math.ceil((G.spd * mul * dt) / 6));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    for (const b of G.balls) {
      b.x += b.vx * mul * h;
      b.y += b.vy * mul * h;
      if (b.x - b.r < F.x0) { b.x = F.x0 + b.r; b.vx = Math.abs(b.vx); sfxBounce(false); }
      if (b.x + b.r > F.x1) { b.x = F.x1 - b.r; b.vx = -Math.abs(b.vx); sfxBounce(false); }
      if (b.y - b.r < TOPBAR) { b.y = TOPBAR + b.r; b.vy = Math.abs(b.vy); sfxBounce(false); }
      // ラケット
      if (b.vy > 0 && b.y + b.r >= PAD_Y && b.y - b.r <= PAD_Y + PAD_H) {
        const hw = padWidth() / 2;
        if (b.x > G.px - hw - b.r && b.x < G.px + hw + b.r) {
          b.y = PAD_Y - b.r;
          // ★ 当たった ところで はねる むきが かわる。
          //   まん中は まっすぐ、はしほど よこへ。
          let f = Math.max(-1, Math.min(1, (b.x - G.px) / hw));
          // ★ まん中で うけると まっすぐ 上下に なり、おなじ ところを
          //   いつまでも いったり きたり して ブロックに 当たらなく なる。
          //   すこしだけ かならず ななめに する。
          if (Math.abs(f) < 0.15) f = (f < 0 ? -1 : 1) * 0.15;
          f += (Math.random() - 0.5) * 0.08;
          const a = -Math.PI / 2 + f * 1.05;
          const sp = Math.hypot(b.vx, b.vy) || G.spd;
          b.vx = Math.cos(a) * sp;
          b.vy = Math.sin(a) * sp;
          G.combo = 0;
          sfxBounce(true);
        }
      }
      // ブロック
      const br = brickHitBall(b);
      if (br) hitBrick(br);
      // リナパパ
      if (G.papa && G.papa.hp > 0) {
        const p = G.papa;
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < p.r + b.r) {
          const a = Math.atan2(b.y - p.y, b.x - p.x);
          const sp = Math.hypot(b.vx, b.vy) || G.spd;
          b.x = p.x + Math.cos(a) * (p.r + b.r + 1);
          b.y = p.y + Math.sin(a) * (p.r + b.r + 1);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
          hurtPapa(1);
        }
      }
    }
    // 下に おちた たま
    for (let i = G.balls.length - 1; i >= 0; i--) {
      if (G.balls[i].y - G.balls[i].r > VH) G.balls.splice(i, 1);
    }
    if (!G.balls.length) { loseBall(); return; }
  }
}

function brickHitAt(x, y) {
  const F = fld();
  const bw = F.w / COLS;
  const c = Math.floor((x - F.x0) / bw);
  const r = Math.floor((y - BRICK_TOP) / BRICK_H);
  if (c < 0 || c >= COLS || r < 0) return null;
  return brickAt(c, r);
}

// たまと ブロックの あたり。あたった むきに はねかえす。
function brickHitBall(b) {
  const F = fld();
  const bw = F.w / COLS;
  const c0 = Math.floor((b.x - b.r - F.x0) / bw), c1 = Math.floor((b.x + b.r - F.x0) / bw);
  const r0 = Math.floor((b.y - b.r - BRICK_TOP) / BRICK_H), r1 = Math.floor((b.y + b.r - BRICK_TOP) / BRICK_H);
  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) {
      const br = brickAt(c, r);
      if (!br) continue;
      const box = brickBox(c, r);
      // どちらの めんに 当たったか（めりこみの あさい ほう）
      const ox = (b.x < box.x + box.w / 2) ? (box.x - (b.x + b.r)) : (box.x + box.w - (b.x - b.r));
      const oy = (b.y < box.y + box.h / 2) ? (box.y - (b.y + b.r)) : (box.y + box.h - (b.y - b.r));
      if (Math.abs(ox) < Math.abs(oy)) { b.x += ox; b.vx = -b.vx; }
      else { b.y += oy; b.vy = -b.vy; }
      return br;
    }
  }
  return null;
}

function hurtPapa(n) {
  const p = G.papa;
  if (!p || p.hp <= 0) return;
  G.noHit = 0; G.rush = 1;
  p.hp -= n;
  p.hit = 1;
  G.score += 200;
  if (p.hp <= 0) {
    G.score += 3000;
    puff(p.x, p.y, '#FFD166', 30);
    sfxPapaDown();
    say('リナパパ を たおした！');
    G.shake = 1;
  } else {
    sfxHard();
  }
}

function updatePapa(dt) {
  const p = G.papa;
  p.hit = Math.max(0, p.hit - dt * 5);
  if (p.hp <= 0) return;
  const F = fld();
  p.t += dt;
  p.x += p.vx * dt;
  if (p.x < F.x0 + p.r) { p.x = F.x0 + p.r; p.vx = Math.abs(p.vx); }
  if (p.x > F.x1 - p.r) { p.x = F.x1 - p.r; p.vx = -Math.abs(p.vx); }
  p.y = VH * 0.56 + Math.sin(p.t * 1.3) * 26;
  // ケーキを おとす
  p.cd -= dt;
  if (p.cd <= 0) {
    p.cd = 2.4 - (1 - p.hp / p.max) * 1.0;
    G.cakes.push({ x: p.x, y: p.y + p.r, vy: 130, r: 11 });
  }
  for (let i = G.cakes.length - 1; i >= 0; i--) {
    const c = G.cakes[i];
    c.y += c.vy * dt;
    if (c.y > VH + 20) { G.cakes.splice(i, 1); continue; }
    if (c.y > PAD_Y - 8 && Math.abs(c.x - G.px) < padWidth() / 2 + 8) {
      G.cakes.splice(i, 1);
      G.padT = 5;
      G.shake = 1;
      say('ケーキ！ ラケットが小さくなった');
      sfxLose();
    }
  }
}

function loseBall() {
  G.life--;
  G.combo = 0;
  G.wide = 0; G.slow = 0; G.laser = 0;
  G.shake = 1;
  sfxLose();
  if (G.life <= 0) { finish(false); return; }
  newBall();
  say('残り ' + G.life);
}

function finish(win) {
  if (G.over) return;
  G.over = true;
  G.win = win;
  G.endT = 0;
  const key = 's' + G.stage;
  if (win) {
    G.score += G.life * 500;
    save.clear[G.stage] = true;
    save.best[key] = Math.max(save.best[key] || 0, G.score);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxEnd(win);
}
