// ミニゲーム 7つ。「どんな え を 出すか」と「どの リズムか」を ここに 書く。
//
// リズムの 書きかた
//   1 小節（4拍）を 16 もじ で かく。1 もじ ＝ 16分音符。
//     '.' なにもない
//     'x' きみが タップ する ところ
//     'c' おてほん（じどうで 鳴る。まねっこ の 面で つかう）
//     'o' タップ しちゃ だめ な ところ（青おばけ）
//     'H' おしはじめ / 'R' はなす（ながおし。R が てんすうに なる）
//
// 見た目の しくみ は SCENES に、リズム は STAGES に わけて ある。
// リミックス は 小節ごとに ちがう SCENES を よぶ。

'use strict';

// --- あそぶ 画面で つかう 小さな どうぐ -------------------------------------------

// 0〜1 に おさめる
function cl01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
// ぽよんと はねる うごき
function pop01(u) { return u < 0 ? 0 : u > 1 ? 1 : 1 - Math.pow(1 - u, 3); }
// ビートに あわせた ゆれ（-1〜1）
function bob(b, mul) { return Math.sin(b * Math.PI * (mul || 1)); }

// 「たたく ばしょ」の わ。ここに 来たら たたく、が ひとめで わかる。
function targetRing(x, y, r, b, col) {
  const u = (b % 1 + 1) % 1;
  ctx.strokeStyle = col || 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(2, r * 0.09);
  cir(x, y, r); ctx.stroke();
  ctx.strokeStyle = col || 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, r * 0.14);
  cir(x, y, r * (1.35 - u * 0.35)); ctx.globalAlpha = 0.5 * (1 - u); ctx.stroke();
  ctx.globalAlpha = 1;
}

// 上に 出す 大きな もじ（「おてほん」など）
function banner(text, y, col, h) {
  const fs = h || H * 0.062;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(fs) + 'px system-ui, sans-serif';
  const w = ctx.measureText(text).width + fs * 1.2;
  ctx.fillStyle = 'rgba(20,14,34,0.55)';
  rr(ctx, W / 2 - w / 2, y - fs * 0.8, w, fs * 1.6, fs * 0.5); ctx.fill();
  ctx.fillStyle = col || '#FFF3C4';
  ctx.fillText(text, W / 2, y);
  ctx.textAlign = 'left';
}

// --- ① もじゃもじゃトマト（ひげ抜き から）------------------------------------------

const SC_MOJYA = {
  key: 'mojya',
  draw(v, ns) {
    const b = v.beat;
    // そら と はたけ
    ctx.fillStyle = skyGrad(0, H, '#BFE8FF', '#F2F8D8');
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFE066';
    cir(W * 0.86, H * 0.16, H * 0.09); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,150,0.35)';
    cir(W * 0.86, H * 0.16, H * 0.14); ctx.fill();
    drawCloud(W * 0.16, H * 0.16, H * 0.07, 0.9);
    drawCloud(W * 0.62, H * 0.11, H * 0.055, 0.75);
    ctx.fillStyle = '#8FD07A';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.62);
    ctx.quadraticCurveTo(W * 0.3, H * 0.5, W * 0.62, H * 0.62);
    ctx.quadraticCurveTo(W * 0.85, H * 0.7, W, H * 0.6);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8A5E38';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, H * (0.80 + i * 0.035), W, H * 0.012);

    const cx = W * 0.34, gy = H * 0.88, s = H * 0.48;
    const r = s * 0.5;

    // もじゃもじゃ を くみたてる
    const hairs = [];
    const flying = [];
    for (const n of ns) {
      if (n.k !== 'tap') continue;
      const app = n.b - 1;                     // 1拍まえに ピョコッと 出る
      if (n.res && n.jb !== undefined) {
        const t = b - n.jb;
        if (t >= 0 && t < 1.4 && n.res !== 'miss') flying.push({ n, t });
        continue;
      }
      if (b < app - 0.1 || b > n.b + 1.2) continue;
      const u = cl01((b - app) / 0.55);
      hairs.push({
        ang: n.ang, len: pop01(u), ph: b * 4 + n.i,
        ready: Math.abs(b - n.b) < 0.28,
      });
    }

    const beat4 = Math.abs(bob(b, 1));
    drawTomato(cx, gy, s, {
      hairs,
      wob: bob(b, 1) * 0.5,
      mood: b - v.missB < 0.9 ? 'sad' : (b - v.hitB < 0.5 ? 'happy' : 'idle'),
      open: b - v.hitB < 0.35 ? 0.5 : 0,
      look: 0.2,
    });

    // ぬけた もじゃもじゃ が とんでいく
    for (const f of flying) {
      const a = -Math.PI / 2 + f.n.ang;
      const bx = cx + Math.cos(a) * r * 1.5 + f.t * r * 0.7;
      const by = gy - r + Math.sin(a) * r * 1.4 - f.t * r * 1.5;
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2);
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(f.t * 6);
      drawHair(0, 0, r, { ang: 0, len: 0.8, ph: f.t * 10 });
      ctx.restore();
      if (f.t < 0.6) drawSpark(bx, by, r * 0.4, f.t / 0.6, '#FFF6B8');
      ctx.globalAlpha = 1;
    }

    // つぎに ぬく もじゃもじゃ を さがして、そこへ ピンセットを 持っていく。
    // 「どれを ねらうか」が ひとめで わかる ようにする ため。
    let tgt = null, td = 9e9;
    for (const n of ns) {
      if (n.k !== 'tap' || n.res) continue;
      const d = n.b - b;
      if (d < -0.4 || d > 2.4 || d >= td) continue;
      td = d; tgt = n;
    }
    let tx = cx + r * 1.1, ty = gy - r * 1.8;
    if (tgt) {
      const gl = pop01(cl01((b - (tgt.b - 1)) / 0.55));
      const tp = hairTip(cx, gy - r, r, { ang: tgt.ang, len: gl });
      tx = tp.x; ty = tp.y;
    }
    // りな と ピンセット
    const snap = cl01(1 - (b - v.hitB) * 3.5);
    const rx = W * 0.78, ry = H * 0.98, rs = H * 0.44;
    drawRina(rx, ry, rs, {
      arm: 0.6 + snap * 0.4, mood: 'happy', look: -0.5, jump: snap * 0.3,
    });
    // ピンセットは 「ゆびの かわり」。つぎに ぬく もじゃもじゃ の 上で ふわふわ する。
    const tang = 0.42 - snap * 0.12;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ell(tx + H * 0.02, ty + H * 0.03, H * 0.05, H * 0.014); ctx.fill();
    drawTweezers(tx, ty + beat4 * H * 0.008 - snap * H * 0.012, H * 0.16, tang, snap);
  },
  icon(x, y, s) {
    drawTomato(x, y + s * 0.8, s * 1.35, {
      hairs: [{ ang: -0.5, len: 0.7, ph: 1 }, { ang: 0.1, len: 0.9, ph: 2, ready: 1 },
              { ang: 0.6, len: 0.6, ph: 3 }],
      mood: 'happy', wob: 0.2,
    });
  },
};

// --- ② ねこざむらい（忍者 から）-----------------------------------------------------

const SC_NINJA = {
  key: 'ninja',
  draw(v, ns) {
    const b = v.beat;
    ctx.fillStyle = skyGrad(0, H, '#20264A', '#4A3A6A');
    ctx.fillRect(0, 0, W, H);
    // 月
    ctx.fillStyle = 'rgba(255,246,200,0.25)';
    cir(W * 0.78, H * 0.2, H * 0.19); ctx.fill();
    ctx.fillStyle = '#FFF6C8';
    cir(W * 0.78, H * 0.2, H * 0.12); ctx.fill();
    // たけ
    for (let i = 0; i < 7; i++) {
      const bx = W * (0.05 + i * 0.15) + Math.sin(i * 2.3) * W * 0.02;
      ctx.fillStyle = i % 2 ? '#2E5A3E' : '#25503A';
      ctx.fillRect(bx, H * 0.1, W * 0.016, H * 0.72);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let j = 0; j < 5; j++) ctx.fillRect(bx, H * (0.16 + j * 0.14), W * 0.016, H * 0.012);
    }
    // ゆか
    ctx.fillStyle = '#3A2E48';
    ctx.fillRect(0, H * 0.8, W, H * 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 10; i++) ctx.fillRect(i * W * 0.1, H * 0.8, W * 0.004, H * 0.2);

    const cx = W * 0.22, gy = H * 0.9, s = H * 0.46;
    const hitY = gy - s * 1.02;                 // かたなを ふる 高さ
    const hitX = cx + s * 0.8;                  // ねこの すぐ まえ
    const slash = cl01(1 - (b - v.hitB) * 4);
    const hurt = b - v.missB < 0.8;

    // とんでくる もの
    ctx.save();
    for (const n of ns) {
      if (n.k !== 'tap') continue;
      const u = (b - (n.b - 2)) / 2;             // 2拍かけて とんでくる
      if (n.res && n.jb !== undefined) {
        const t = b - n.jb;
        if (t > 1.2) continue;
        if (n.res === 'miss') {
          // よけられずに ぽとん
          const px = hitX, py = hitY + t * t * H * 0.5;
          drawFlyItem(px, py, H * 0.11, n.item, t * 3);
          continue;
        }
        // 2つに われて とんでいく
        for (const sg of [-1, 1]) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - t / 1.2);
          ctx.translate(hitX + sg * t * W * 0.16, hitY - t * H * 0.1 + t * t * H * 0.5);
          ctx.rotate(sg * t * 3);
          drawFlyItem(0, 0, H * 0.11, n.item, 0, sg);
          ctx.restore();
        }
        continue;
      }
      if (u < -0.05 || u > 1.35) continue;
      const px = W * 1.06 + (hitX - W * 1.06) * u;
      const py = hitY - Math.sin(Math.min(1, u) * Math.PI) * H * 0.2;
      drawFlyItem(px, py, H * 0.11, n.item, -u * 5);
      // 「もうすぐ」の しるし
      if (u > 0.6) {
        ctx.globalAlpha = (u - 0.6) * 2;
        ctx.strokeStyle = '#FFE066'; ctx.lineWidth = Math.max(2, H * 0.006);
        cir(px, py, H * 0.14); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    drawNinjaCat(cx, gy, s, { slash, hurt, mood: hurt ? 'sad' : 'idle', look: 0.5 });

    // ここで きる、の しるし（ねこの まえに 出す）
    targetRing(hitX, hitY, H * 0.1, b, 'rgba(255,224,102,0.5)');

    // きった せん
    if (slash > 0.1) {
      ctx.save();
      ctx.globalAlpha = slash;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = H * 0.02 * slash;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hitX - H * 0.2, hitY + H * 0.16);
      ctx.lineTo(hitX + H * 0.2, hitY - H * 0.16);
      ctx.stroke();
      ctx.restore();
    }
  },
  icon(x, y, s) {
    drawNinjaCat(x - s * 0.1, y + s * 0.8, s * 1.15, { slash: 0.5, mood: 'idle', look: 0.4 });
  },
};

// --- ③ ぺんぎんタップ（タップダンス から）-------------------------------------------

const SC_TAP = {
  key: 'tap',
  draw(v, ns) {
    const b = v.beat;
    ctx.fillStyle = skyGrad(0, H, '#3A1E4A', '#1A1030');
    ctx.fillRect(0, 0, W, H);
    // スポットライト
    for (const sg of [-1, 1]) {
      const g = ctx.createRadialGradient(W / 2 + sg * W * 0.18, H * 0.1, H * 0.02,
                                         W / 2 + sg * W * 0.18, H * 0.9, H * 0.75);
      g.addColorStop(0, 'rgba(255,240,190,0.35)');
      g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(W / 2 + sg * W * 0.18, 0);
      ctx.lineTo(W / 2 + sg * W * 0.18 - W * 0.3, H);
      ctx.lineTo(W / 2 + sg * W * 0.18 + W * 0.3, H);
      ctx.closePath(); ctx.fill();
    }
    // まく
    ctx.fillStyle = '#7A1E3A';
    for (const sg of [0, 1]) {
      ctx.save();
      if (sg) ctx.translate(W, 0), ctx.scale(-1, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(W * 0.22, 0);
      ctx.quadraticCurveTo(W * 0.14, H * 0.5, W * 0.2, H);
      ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(W * (0.04 + i * 0.045), 0);
        ctx.quadraticCurveTo(W * (0.02 + i * 0.045), H * 0.5, W * (0.05 + i * 0.045), H);
        ctx.lineTo(W * (0.07 + i * 0.045), H);
        ctx.quadraticCurveTo(W * (0.05 + i * 0.045), H * 0.5, W * (0.07 + i * 0.045), 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#7A1E3A';
      ctx.restore();
    }
    // ゆか
    ctx.fillStyle = '#6B4A2E';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 12; i++) ctx.fillRect(i * W / 12, H * 0.78, W * 0.005, H * 0.22);

    // つぎに 何が くるか（おてほん か きみのばん か）
    let nextCall = 9e9, nextYou = 9e9;
    for (const n of ns) {
      if (n.k === 'call' && n.b > b - 0.2 && n.b < nextCall) nextCall = n.b;
      if (n.k === 'tap' && !n.res && n.b > b - 0.2 && n.b < nextYou) nextYou = n.b;
    }
    const yourTurn = nextYou < nextCall;

    const gy = H * 0.94, s = H * 0.42;
    // ステップの アニメ を 音符から 作る
    const stepOf = (kind) => {
      let st = 0, dir = 1;
      for (const n of ns) {
        if (n.k !== kind) continue;
        if (n.k === 'tap' && n.res === 'miss') continue;
        const t = b - n.b;
        if (t > -0.55 && t < 0.45) {
          const u = cl01((t + 0.55) / 1.0);
          st = Math.max(st, Math.sin(u * Math.PI));
          dir = (n.i % 2) ? -1 : 1;
        }
      }
      return { st, dir };
    };
    const tc = stepOf('call'), ty = stepOf('tap');

    drawPenguin(W * 0.3, gy, s, {
      teacher: 1, step: tc.st, dir: tc.dir, arm: tc.st * 0.6,
      mood: yourTurn ? 'idle' : 'happy',
    });
    drawPenguin(W * 0.68, gy, s, {
      step: ty.st, dir: ty.dir, arm: ty.st * 0.6,
      mood: b - v.missB < 0.8 ? 'sad' : (b - v.hitB < 0.5 ? 'happy' : 'idle'),
    });

    // ステップの ほこり
    const dust = (x, st) => {
      if (st < 0.2) return;
      ctx.fillStyle = 'rgba(255,255,255,' + (st * 0.4) + ')';
      for (let i = -1; i <= 1; i += 2) {
        ell(x + i * H * 0.06 * st, gy - H * 0.01, H * 0.05 * st, H * 0.02 * st); ctx.fill();
      }
    };
    dust(W * 0.3, tc.st); dust(W * 0.68, ty.st);

    banner(yourTurn ? 'きみの ばん！' : 'おてほん を みてね', H * 0.16,
           yourTurn ? '#FFE066' : '#B8E8FF');

    // リズムの ますめ（4つの ランプ）
    const bx = W / 2 - H * 0.2, by = H * 0.23;
    for (let i = 0; i < 4; i++) {
      const on = Math.floor(b) % 4 === i;
      ctx.fillStyle = on ? '#FFE066' : 'rgba(255,255,255,0.2)';
      cir(bx + i * H * 0.13, by, H * (on ? 0.032 : 0.024)); ctx.fill();
    }
  },
  icon(x, y, s) {
    drawPenguin(x - s * 0.42, y + s * 0.8, s * 1.1, { teacher: 1, step: 0.6, dir: 1 });
    drawPenguin(x + s * 0.46, y + s * 0.8, s * 1.05, { step: 0.3, dir: -1, mood: 'happy' });
  },
};

// --- ④ かえるコーラス（ながおし）----------------------------------------------------

const SC_FROG = {
  key: 'frog',
  draw(v, ns) {
    const b = v.beat;
    ctx.fillStyle = skyGrad(0, H, '#141B3E', '#2E4A5E');
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 137) % 100) / 100 * W, sy = ((i * 61) % 60) / 100 * H;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(b * 1.5 + i));
      ctx.fillStyle = '#FFF6C8';
      cir(sx, sy, H * 0.005); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,246,200,0.18)';
    cir(W * 0.14, H * 0.19, H * 0.12); ctx.fill();
    ctx.fillStyle = '#FFF6C8';
    cir(W * 0.14, H * 0.19, H * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(220,210,170,0.5)';
    cir(W * 0.16, H * 0.17, H * 0.02); ctx.fill();
    cir(W * 0.12, H * 0.22, H * 0.014); ctx.fill();
    // いけ
    ctx.fillStyle = '#1E3A52';
    ctx.fillRect(0, H * 0.62, W, H * 0.38);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = H * 0.006;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const yy = H * (0.68 + i * 0.07);
      ctx.moveTo(0, yy);
      for (let x = 0; x <= W; x += W / 12) {
        ctx.lineTo(x, yy + Math.sin(x / W * 8 + b * 2 + i) * H * 0.008);
      }
      ctx.stroke();
    }
    // はす の は
    for (const p of [[0.18, 0.86, 0.16], [0.5, 0.92, 0.2], [0.82, 0.84, 0.15]]) {
      ctx.fillStyle = '#2E7B4A';
      ell(W * p[0], H * p[1], W * p[2], W * p[2] * 0.3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.moveTo(W * p[0], H * p[1]);
      ctx.lineTo(W * p[0] + W * p[2] * 0.9, H * p[1] - W * p[2] * 0.1);
      ctx.stroke();
    }

    // ながおし ちゅうの 音符
    let cur = null;
    for (const n of ns) {
      if (n.k !== 'hold' || n.res) continue;
      if (b >= n.hb - 1.6 && b <= n.b + 0.6) { cur = n; break; }
    }
    const holding = v.holding && v.holding.k === 'hold' ? v.holding : null;
    const puff = holding ? cl01((b - holding.hb) / Math.max(0.5, holding.b - holding.hb)) : 0;

    // わきの かえる（じどうで うたう）
    for (const sg of [-1, 1]) {
      drawFrog(W * (0.42 + sg * 0.26), H * 0.82, H * 0.26,
               { puff: Math.max(0, bob(b, 1) * (sg > 0 ? 1 : -1)) * 0.5, mood: 'idle' });
    }
    // まんなか＝きみ
    drawFrog(W * 0.42, H * 0.96, H * 0.42, {
      puff: puff,
      mood: puff > 0.1 ? 'shut' : (b - v.missB < 0.8 ? 'sad' : 'idle'),
    });

    // 音の ぼう。上の せんまで のばして、ちょうどで はなす。
    const gx = W * 0.78, gy0 = H * 0.72, gy1 = H * 0.28;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(ctx, gx - H * 0.045, gy1, H * 0.09, gy0 - gy1, H * 0.045); ctx.fill();
    // ゴールの おび
    ctx.fillStyle = 'rgba(255,224,102,0.5)';
    rr(ctx, gx - H * 0.07, gy1 - H * 0.018, H * 0.14, H * 0.036, H * 0.018); ctx.fill();
    if (holding) {
      const hh = (gy0 - gy1) * puff;
      ctx.fillStyle = puff > 0.9 ? '#FFE066' : '#7FE0A0';
      rr(ctx, gx - H * 0.045, gy0 - hh, H * 0.09, hh, H * 0.045); ctx.fill();
      drawNote(gx, gy0 - hh - H * 0.05, H * 0.05, '#FFF6B8', bob(b, 4) * 0.2);
    }
    ctx.fillStyle = '#FFF3C4';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(H * 0.036) + 'px system-ui, sans-serif';
    ctx.fillText('はなす', gx, gy1 - H * 0.06);
    ctx.textAlign = 'left';

    // つぎの ながおし の あんない
    if (cur && !holding) {
      const t = cur.hb - b;
      if (t < 1.6 && t > -0.4) {
        banner(t > 0.25 ? 'つぎ… おす じゅんび' : 'いま おす！', H * 0.14,
               t > 0.25 ? '#B8E8FF' : '#FFE066');
      }
    } else if (holding) {
      const left = holding.b - b;
      banner(left < 0.5 ? 'はなす！' : 'おしたまま…', H * 0.14,
             left < 0.5 ? '#FFE066' : '#B8E8FF');
    }
  },
  icon(x, y, s) {
    drawFrog(x - s * 0.95, y + s * 0.55, s * 0.95, { puff: 0.2 });
    drawFrog(x + s * 0.95, y + s * 0.55, s * 0.95, { puff: 0.2 });
    drawFrog(x, y + s * 0.8, s * 1.5, { puff: 0.8, mood: 'shut' });
  },
};

// --- ⑤ ロボこうば（うら拍）----------------------------------------------------------

const SC_ROBO = {
  key: 'robo',
  draw(v, ns) {
    const b = v.beat;
    ctx.fillStyle = skyGrad(0, H, '#2A3244', '#48506A');
    ctx.fillRect(0, 0, W, H);
    // はぐるま
    for (const g of [[0.12, 0.22, 0.11], [0.26, 0.13, 0.07], [0.88, 0.24, 0.09]]) {
      const gx = W * g[0], gy = H * g[1], gr = H * g[2];
      ctx.save();
      ctx.translate(gx, gy); ctx.rotate(b * 0.4 * (g[0] > 0.5 ? -1 : 1));
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 4);
        rr(ctx, -gr * 0.16, -gr * 1.2, gr * 0.32, gr * 0.4, gr * 0.06); ctx.fill();
        ctx.restore();
      }
      cir(0, 0, gr); ctx.fill();
      ctx.fillStyle = '#2A3244'; cir(0, 0, gr * 0.42); ctx.fill();
      ctx.restore();
    }
    // ゆか
    ctx.fillStyle = '#1E2432';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);

    const beltY = H * 0.76, hitY = beltY - H * 0.02;
    // ハンマーが おりてくる ところ に かなとこ を おく。
    // ロボの 大きさ から ぎゃくに ばしょを 決めると、ハンマーと かなとこ が ぴたり あう。
    const rs = H * 0.42;
    const anvilX = W * 0.55;
    const roboX = anvilX - rs * 0.75, roboY = hitY + rs * 0.33;

    // けむり（うしろ）
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 4; i++) {
      const t = (b * 0.3 + i * 0.25) % 1;
      cir(W * 0.06 + t * W * 0.05, H * 0.5 - t * H * 0.4, H * 0.03 + t * H * 0.05); ctx.fill();
    }

    // おてほん の プレス機（じどうで ドン と おりる）
    let cs = 0;
    for (const n of ns) {
      if (n.k !== 'call') continue;
      const t = b - n.b;
      if (t > -0.4 && t < 0.5) cs = Math.max(cs, 1 - Math.abs(t) * 2);
    }
    const pressX = W * 0.16;
    ctx.fillStyle = '#4A5468';
    rr(ctx, pressX - H * 0.17, H * 0.2, H * 0.34, H * 0.07, H * 0.02); ctx.fill();
    ctx.fillStyle = '#5E6A84';
    ctx.fillRect(pressX - H * 0.05, H * 0.26, H * 0.1, H * 0.16 + cs * H * 0.2);
    ctx.fillStyle = '#C0392B';
    rr(ctx, pressX - H * 0.13, H * 0.4 + cs * H * 0.2, H * 0.26, H * 0.1, H * 0.03); ctx.fill();
    if (cs > 0.5) drawSpark(pressX, H * 0.56, H * 0.06, (cs - 0.5) * 2, '#FFB020');
    // プレス機の あし
    ctx.fillStyle = '#3A4152';
    for (const sg of [-1, 1]) {
      ctx.fillRect(pressX + sg * H * 0.15 - H * 0.02, H * 0.24, H * 0.04, H * 0.52);
    }

    // ロボ（ベルトの うしろに 立つ）
    const swing = cl01(1 - (b - v.hitB) * 4.5);
    drawRobo(roboX, roboY, rs, {
      swing: swing, lamp: Math.floor(cl01(v.combo / 8) * 3),
      mood: b - v.missB < 0.8 ? 'sad' : (v.combo >= 6 ? 'happy' : 'idle'),
    });

    // ベルト（まえがわ）
    ctx.fillStyle = '#3A4152';
    rr(ctx, -H * 0.02, beltY, W + H * 0.04, H * 0.09, H * 0.045); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = H * 0.008;
    for (let i = 0; i < 16; i++) {
      const bx = ((i * W / 16) + (b * W * 0.06) % (W / 16)) % (W + W / 16) - W / 16;
      ctx.beginPath(); ctx.moveTo(bx, beltY); ctx.lineTo(bx, beltY + H * 0.09); ctx.stroke();
    }
    // かなとこ
    ctx.fillStyle = '#8A94A8';
    rr(ctx, anvilX - H * 0.11, hitY - H * 0.02, H * 0.22, H * 0.06, H * 0.02); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    rr(ctx, anvilX - H * 0.09, hitY - H * 0.015, H * 0.18, H * 0.014, H * 0.007); ctx.fill();

    // ながれてくる ぶひん
    for (const n of ns) {
      if (n.k !== 'tap') continue;
      const u = (b - (n.b - 2)) / 2;
      if (n.res && n.jb !== undefined) {
        const t = b - n.jb;
        if (t > 1) continue;
        if (n.res === 'miss') {
          drawPart(anvilX + t * W * 0.2, hitY - H * 0.03, H * 0.06, n.item, 0);
        } else {
          // ぺちゃんこ に なって ぴかっと ひかる
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - t);
          ctx.translate(anvilX, hitY - H * 0.02);
          ctx.scale(1 + t, Math.max(0.15, 1 - t * 1.4));
          drawPart(0, 0, H * 0.07, n.item, 1);
          ctx.restore();
          if (t < 0.5) drawSpark(anvilX, hitY - H * 0.04, H * 0.06, t / 0.5, '#FFE066');
        }
        continue;
      }
      if (u < -0.05 || u > 1.3) continue;
      const px = -W * 0.06 + (anvilX + W * 0.06) * u;
      drawPart(px, hitY - H * 0.035, H * 0.06, n.item, u > 0.85 ? (u - 0.85) * 6 : 0);
    }

    targetRing(anvilX, hitY - H * 0.04, H * 0.075, b, 'rgba(255,224,102,0.45)');

    // 「ドン（じどう）→ タン（きみ）」の あんない
    banner('ドン → タン！ うらびょうしで たたく', H * 0.14, '#FFF3C4', H * 0.045);
  },
  icon(x, y, s) {
    drawRobo(x - s * 0.1, y + s * 0.8, s * 1.0, { swing: 0.7, mood: 'happy', lamp: 3 });
  },
};

// --- ⑥ おばけドア（たたく／たたかない）----------------------------------------------

const SC_OBAKE = {
  key: 'obake',
  doorX(i) { return W * (0.16 + i * 0.17); },
  draw(v, ns) {
    const b = v.beat;
    ctx.fillStyle = skyGrad(0, H, '#2A1B44', '#4A2E5E');
    ctx.fillRect(0, 0, W, H);
    // かべ
    ctx.fillStyle = '#3E2A56';
    ctx.fillRect(0, H * 0.2, W, H * 0.62);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 14; i++) ctx.fillRect(i * W / 14, H * 0.2, W * 0.004, H * 0.62);
    // ゆか
    ctx.fillStyle = '#2A1B3A';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    // ろうそく
    for (const cx0 of [W * 0.07, W * 0.93]) {
      ctx.fillStyle = '#F0E8D8';
      rr(ctx, cx0 - H * 0.014, H * 0.3, H * 0.028, H * 0.12, H * 0.01); ctx.fill();
      const fl = 1 + Math.sin(b * 6 + cx0) * 0.2;
      ctx.fillStyle = 'rgba(255,190,80,0.9)';
      ell(cx0, H * 0.285, H * 0.014 * fl, H * 0.03 * fl); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,180,0.7)';
      ell(cx0, H * 0.29, H * 0.007 * fl, H * 0.016 * fl); ctx.fill();
    }

    // ドア 5まい
    const dy = H * 0.78, dw = W * 0.13, dh = H * 0.44;
    for (let i = 0; i < 5; i++) {
      const x = this.doorX(i);
      ctx.fillStyle = '#5A3A2A';
      rr(ctx, x - dw / 2, dy - dh, dw, dh, dw * 0.16); ctx.fill();
      ctx.fillStyle = '#6B4835';
      rr(ctx, x - dw * 0.38, dy - dh * 0.92, dw * 0.76, dh * 0.84, dw * 0.1); ctx.fill();
      ctx.fillStyle = '#2A1B3A';
      rr(ctx, x - dw * 0.3, dy - dh * 0.86, dw * 0.6, dh * 0.4, dw * 0.08); ctx.fill();
      ctx.fillStyle = '#FFD166';
      cir(x + dw * 0.28, dy - dh * 0.38, dw * 0.06); ctx.fill();
    }

    // おばけ
    for (const n of ns) {
      if (n.k !== 'tap' && n.k !== 'skip') continue;
      const app = n.b - 1;
      const x = this.doorX(n.lane), yy = dy - dh * 0.56;
      if (n.res && n.jb !== undefined) {
        const t = b - n.jb;
        if (t > 1.2) continue;
        if (n.k === 'skip' && n.res !== 'miss') {
          // 青は そのまま ドアに もどる
          drawGhost(x, yy + t * H * 0.5, H * 0.23, { good: 0, t: b, mood: 'wink',
                                                    alpha: Math.max(0, 1 - t) });
          continue;
        }
        if (n.res === 'miss') {
          drawGhost(x, yy - t * H * 0.1, H * 0.23,
                    { good: n.k === 'tap', t: b, mood: 'sad', alpha: Math.max(0, 1 - t / 1.2) });
          continue;
        }
        // つかまえた ピンクおばけ は あめに かわる
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 1.2);
        ctx.translate(x, yy - t * H * 0.22);
        ctx.rotate(t * 4);
        ctx.fillStyle = '#FF6FA8'; cir(0, 0, H * 0.05); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(0, 0, H * 0.05, 0.4, 1.6); ctx.lineTo(0, 0); ctx.fill();
        ctx.restore();
        if (t < 0.6) drawSpark(x, yy, H * 0.06, t / 0.6, '#FFC8E0');
        ctx.globalAlpha = 1;
        continue;
      }
      if (b < app - 0.1 || b > n.b + 0.9) continue;
      const pop = pop01((b - app) / 0.45);
      drawGhost(x, yy, H * 0.23, {
        good: n.k === 'tap', t: b, pop,
        mood: Math.abs(b - n.b) < 0.25 ? 'wow' : (n.k === 'tap' ? 'idle' : 'wink'),
      });
    }

    // パンチグローブ（たたいた ところに とんでいく）
    const ext = cl01(1 - (b - v.hitB) * 3.5);
    if (ext > 0.02) {
      const lane = v.hitLane === undefined ? 2 : v.hitLane;
      drawGlove(this.doorX(lane), dy - dh * 0.56, H * 0.15, ext);
    }

    banner('ピンク＝たたく　あお＝たたかない', H * 0.14, '#FFF3C4', H * 0.05);
  },
  icon(x, y, s) {
    drawGhost(x - s * 0.55, y + s * 0.05, s * 0.72, { good: 1, t: 0 });
    drawGhost(x + s * 0.6, y + s * 0.1, s * 0.6, { good: 0, t: 1 });
  },
};

// --- ⑦ リミックス の しかい（りな）--------------------------------------------------

const SCENES = {};
for (const s of [SC_MOJYA, SC_NINJA, SC_TAP, SC_FROG, SC_ROBO, SC_OBAKE]) SCENES[s.key] = s;

// --- リズム（面ごと の たたく ところ）----------------------------------------------

const STAGES = [
  {
    key: 'mojya', name: 'もじゃもじゃトマト', from: 'ひげ抜き から',
    col: '#F2453D', scene: 'mojya', hit: 'weed',
    bpm: 112, drum: 'basic', root: 64, prog: [0, 0, 5, 7], intro: 2,
    rule: 'ピョコッと 出た もじゃもじゃを ちょうどで ぬく！',
    how: ['もじゃもじゃが 出てから 1拍で ぬく',
          '2つ ならんだ ときは トン・トンと つづけて'],
    pats: [
      'x...x...x...x...',
      'x...x...x...x...',
      'x...x...x.x.x...',
      'x...x...x...x...',
      'x.x.x...x...x...',
      'x...x.x.x...x...',
      'x...x...x.x.x.x.',
      'x...x...x...x...',
      'x.x.x...x.x.x...',
      'x...x.......x...',
    ],
  },
  {
    key: 'ninja', name: 'ねこざむらい', from: '忍者 から',
    col: '#7A6FD0', scene: 'ninja', hit: 'slice',
    bpm: 126, drum: 'wa', root: 62, prog: [0, 0, 3, 5], min: [0, 1, 2, 3], intro: 2,
    rule: 'とんできた ものを かたなで スパッと きる！',
    how: ['ねこの まえに 来た しゅんかんに タップ',
          '2つ つづけて とんでくる ことも ある'],
    pats: [
      'x.......x.......',
      'x.......x...x...',
      'x.......x.......',
      'x...x...x.x.....',
      'x.......x.......',
      'x.x.....x...x...',
      'x...x...x.x.....',
      'x.......x.x.x...',
      'x...x...x...x...',
      'x.......x.......',
    ],
  },
  {
    key: 'tap', name: 'ぺんぎんタップ', from: 'タップダンス から',
    col: '#FFB020', scene: 'tap', hit: 'stomp',
    bpm: 120, drum: 'swing', root: 65, prog: [0, 5, 7, 5], intro: 2,
    rule: 'せんせいの ステップを おぼえて、そのまま まねる！',
    how: ['さきに せんせいが おどる（おてほん）',
          'つぎの 1小節で 同じ リズムを タップ'],
    pats: [
      'c...c...c...c...',
      'x...x...x...x...',
      'c...c.c.c.......',
      'x...x.x.x.......',
      'c...c...c.c.....',
      'x...x...x.x.....',
      'c.c.c...c...c...',
      'x.x.x...x...x...',
      'c...c.c.c...c.c.',
      'x...x.x.x...x.x.',
      'c.c.c.c.c...c...',
      'x.x.x.x.x...x...',
    ],
  },
  {
    key: 'frog', name: 'かえるコーラス', from: 'コーラスメン から',
    col: '#4FAE5E', scene: 'frog', hit: 'ribbit',
    bpm: 100, drum: 'night', root: 60, prog: [0, 5, 7, 0], intro: 2,
    rule: 'おしっぱなしで うたって、ちょうどで はなす！',
    how: ['ゆびを おいたまま のばす（ぼうが のびる）',
          '上の せんに ついた しゅんかんに はなす'],
    hold: 1,
    pats: [
      'H......R........',
      'H..........R....',
      'H......R....H..R',
      'H..............R',
      'H......R...H...R',
      'H..........R....',
      'H..R...H......R.',
      'H..............R',
    ],
  },
  {
    key: 'robo', name: 'ロボこうば', from: 'もちつき から',
    col: '#7FC8F8', scene: 'robo', hit: 'stamp',
    bpm: 128, drum: 'funk', root: 63, prog: [0, 0, 5, 3], min: [0, 1, 3], intro: 2,
    rule: 'プレスの あとの「うら」で ハンマーを おろす！',
    how: ['ドン（じどう）→ タン（きみ）の くりかえし',
          '「と」の ところ。あわてず 半拍 まってから'],
    pats: [
      'c.x.c.x.c.x.c.x.',
      'c.x.c.x.c.x.c.x.',
      'c.x.c.x.c...c.x.',
      'c.x.c.x.c.x.x.x.',
      'c.x.c.x.c.x.c.x.',
      'c...c.x.c.x.c.x.',
      'c.x.x.x.c.x.c.x.',
      'c.x.c.x.c.x.c...',
    ],
  },
  {
    key: 'obake', name: 'おばけドア', from: 'みならい忍者 から',
    col: '#E86A9C', scene: 'obake', hit: 'ghost',
    bpm: 118, drum: 'disco', root: 61, prog: [0, 3, 5, 3], min: [0, 1, 2, 3], intro: 2,
    rule: 'ピンクは たたく。あおは じっと がまん！',
    how: ['ピンクおばけ＝ちょうどで タップ',
          'あおおばけ＝ぜったいに タップ しない'],
    pats: [
      'x...x...x...o...',
      'x...o...x...x...',
      'x...x...o...x...',
      'x.x.o...x...x...',
      'o...x...x.x.o...',
      'x...x...o...x.x.',
      'x.x.x...o...o...',
      'x...o...x.x.x...',
      'o...x.x.o...x...',
      'x...x...x...x...',
    ],
  },
  {
    key: 'remix', name: 'オールスター リミックス', from: 'ぜんぶ まざる',
    col: '#FFD166', scene: 'mojya', hit: 'pop',
    bpm: 124, drum: 'drive', root: 64, prog: [0, 5, 3, 7], intro: 2,
    rule: 'ぜんぶ まざって 出てくる！ 画面を よく見て。',
    how: ['2小節ごとに ゲームが かわる',
          'さいごは はやくなる。おちついて'],
    remix: 1,
    pats: [
      { p: 'x...x...x...x...', g: 'mojya' },
      { p: 'x...x...x.x.x...', g: 'mojya' },
      { p: 'x.......x.......', g: 'ninja' },
      { p: 'x...x...x.x.....', g: 'ninja' },
      { p: 'c...c.c.c.......', g: 'tap' },
      { p: 'x...x.x.x.......', g: 'tap' },
      { p: 'H......R........', g: 'frog' },
      { p: 'H..........R....', g: 'frog' },
      { p: 'c.x.c.x.c.x.c.x.', g: 'robo' },
      { p: 'c.x.c.x.c...c.x.', g: 'robo' },
      { p: 'x...o...x...x...', g: 'obake' },
      { p: 'x...x...o...x...', g: 'obake' },
      { p: 'x...x.x.x...x...', g: 'mojya' },
      { p: 'x.......x.x.....', g: 'ninja' },
      { p: 'x...x...x...x...', g: 'obake' },
      { p: 'x...x...x...x...', g: 'mojya' },
    ],
  },
];

const STAGE_BY = {};
for (const st of STAGES) STAGE_BY[st.key] = st;

// 音符 1つ ずつに 見た目の じょうほう を つける
function initNote(st, n, i) {
  n.i = i;
  n.ang = ((i * 5) % 9 - 4) * 0.22;              // もじゃもじゃ の むき
  n.item = i % 4;                                 // とんでくる ものの しゅるい
  n.lane = (i * 3 + (i >> 2)) % 5;                // おばけの ドア
  if (n.g === 'ninja') n.item = ['onigiri', 'fish', 'pot', 'maki'][i % 4];
  if (n.g === 'robo') n.item = i % 3;
}
