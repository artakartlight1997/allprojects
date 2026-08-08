// 画面・そうさ・メインループ。よこ向き専用。
//
// かくのは ぜんぶ「ゲームの 中の 大きさ」（たて VH＝450）で 書いて、
// さいごに 画面の 大きさへ まとめて のばす。どの スマホでも 同じ 見た目に なる。
// よこの 0 は「ステージの まん中」。かくときに 画面の まん中を たす。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1;

const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  SC = H / VH;
  G.VW = W / SC;
  G.cx = G.VW / 2;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

function drawButton(b, label, col, textCol, sub) {
  ctx.fillStyle = col || '#FFFFFF';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.26)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#2A2440';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.36 : 0.46), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(42,36,64,0.7)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.8);
  }
  ctx.textAlign = 'left';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- ステージ ------------------------------------------------------------------

function drawStage(t) {
  const st = STAGES[G.si], g = G.gim, VW = G.VW, cx = G.cx;
  const sk = ctx.createLinearGradient(0, 0, 0, VH);
  sk.addColorStop(0, st.sky[0]); sk.addColorStop(1, st.sky[1]);
  ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, VH);

  if (st.stars) {
    for (let i = 0; i < 44; i++) {
      const x = (i * 137.5) % VW, y = (i * 97) % VH;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.5 * Math.abs(Math.sin(i + t))) + ')';
      ctx.fillRect(x, y, 2.4, 2.4);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const x = ((i * 230 + t * 8) % (VW + 260)) - 130;
      const y = 40 + (i * 67) % 150;
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      for (const [dx, dy, r] of [[-34, 6, 22], [0, -6, 30], [36, 4, 20]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill();
      }
    }
  }

  // ようがん
  if (st.gim === 'lava') {
    ctx.fillStyle = '#E04A20';
    ctx.beginPath();
    ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 24) {
      ctx.lineTo(x, g.lava + Math.sin(x * 0.05 + t * 4) * 7);
    }
    ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,80,0.55)';
    ctx.fillRect(0, g.lava - 4, VW, 6);
    if (g.phase === 'warn') {
      ctx.fillStyle = 'rgba(255,60,40,' + (0.25 + Math.abs(Math.sin(t * 14)) * 0.4) + ')';
      ctx.fillRect(0, VH - 190, VW, 190);
      warnText('ようがんが 来る！ 上へ！', t);
    }
  }

  // あしば
  for (const p of G.plats) {
    if (!p.on) {
      ctx.globalAlpha = 0.25;
    }
    const x = cx + p.x, y = p.y;
    const sh = (p.thru && p.fall > 0.5 && p.on) ? Math.sin(t * 40) * 2.5 : 0;
    if (p.thru) {
      ctx.fillStyle = st.gim === 'lowg' ? '#7A8AC0' : '#B07A4A';
      rr(ctx, x + sh, y, p.w, p.h, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      rr(ctx, x + sh, y, p.w, 4, 2); ctx.fill();
    } else {
      // でんきの ゆか は 光る
      const idx = G.plats.filter((q) => !q.thru).indexOf(p);
      const zap = st.gim === 'elec' && idx === g.val &&
                  (g.phase === 'act' || (g.phase === 'warn' && Math.floor(t * 12) % 2 === 0));
      ctx.fillStyle = zap ? '#FFE066' : (st.gim === 'lowg' ? '#5A6A9A' : '#6A5A46');
      rr(ctx, x, y, p.w, p.h + 34, 5); ctx.fill();
      ctx.fillStyle = zap ? '#FFF6C0' : (st.gim === 'lava' ? '#8A5030'
                    : st.gim === 'lowg' ? '#8FA0D0' : '#5FA84A');
      rr(ctx, x, y, p.w, 9, 4); ctx.fill();
      if (st.gim === 'belt') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let k = 0; k < p.w / 26; k++) {
          const bx = x + ((k * 26 + t * 115) % p.w);
          ctx.fillRect(bx, y + 2, 12, 5);
        }
      }
      if (zap) {
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
        for (let k = 0; k < 5; k++) {
          const bx = x + p.w * (k + 0.5) / 5;
          ctx.beginPath();
          ctx.moveTo(bx, y - 2);
          ctx.lineTo(bx + 7, y - 16); ctx.lineTo(bx - 4, y - 14); ctx.lineTo(bx + 4, y - 30);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // きり。こくなると あしばも きえる。
  if (st.gim === 'fog') {
    const dense = g.phase === 'act'
      ? Math.min(1, g.t / 0.5) * Math.min(1, (1.8 - g.t) / 0.5 + 0.4) : 0.25;
    for (let i = 0; i < 7; i++) {
      const y = 60 + i * 58;
      const x = ((t * (18 + i * 5) + i * 190) % (VW + 320)) - 160;
      ctx.fillStyle = 'rgba(226,236,232,' + (0.10 + dense * 0.30) + ')';
      for (const [dx, dy, r] of [[-70, 8, 44], [0, -10, 58], [76, 6, 40]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill();
      }
    }
    if (g.phase === 'act') {
      ctx.fillStyle = 'rgba(214,228,222,' + dense * 0.34 + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  // かぜ
  if (st.gim === 'wind') {
    if (g.phase === 'warn') warnText(g.val > 0 ? 'つよい かぜ →' : '← つよい かぜ', t);
    if (g.phase === 'act') {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const y = 40 + i * 42;
        const x = ((t * 620 * g.val + i * 130) % (VW + 200) + VW + 200) % (VW + 200) - 100;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + g.val * 60, y); ctx.stroke();
      }
    }
  }

  // かみなり
  if (st.gim === 'king') {
    if (g.phase === 'warn') {
      const x = cx + g.val;
      ctx.strokeStyle = 'rgba(255,220,80,' + (0.4 + Math.abs(Math.sin(t * 16)) * 0.5) + ')';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke();
      ctx.setLineDash([]);
      warnText('かみなりが 落ちる！', t);
    } else if (g.phase === 'act') {
      const x = cx + g.val;
      ctx.strokeStyle = '#FFF6C0'; ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 18, 140); ctx.lineTo(x - 14, 190);
      ctx.lineTo(x + 10, VH); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 5; ctx.stroke();
    }
  }
}

function warnText(s, t) {
  ctx.fillStyle = 'rgba(20,10,20,0.55)';
  const w = G.VW * 0.44, x = G.cx - w / 2;
  rr(ctx, x, 54, w, 40, 10); ctx.fill();
  ctx.fillStyle = Math.floor(t * 8) % 2 ? '#FFE066' : '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(s, w * 0.9, 24, 'bold ');
  ctx.fillText(s, G.cx, 74);
  ctx.textAlign = 'left';
}

// --- あそんでいる 画面 ----------------------------------------------------------

function drawPlay(t) {
  const cx = G.cx, VW = G.VW;
  const sx = G.shake > 0 ? Math.sin(t * 70) * G.shake * 12 : 0;
  ctx.save();
  ctx.translate(sx, 0);
  drawStage(t);

  // たま
  for (const s of G.shots) {
    ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(cx + s.x, s.y, s.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(cx + s.x - 3, s.y - 3, 3.4, 0, 7); ctx.fill();
  }

  // ファイター
  for (const f of G.fighters) {
    if (f.stocks <= 0 || f.respawnT > 0) continue;
    const c = CHARS[f.char];
    // ビーム
    if (f.spT > 0 && f.spKind === 'beam' && f.spT < 0.36) {
      const gy = f.y - charH(c) * 0.55;
      const gr = ctx.createLinearGradient(cx + f.x, gy, cx + f.x + f.face * 200, gy);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(cx + f.x, gy - 16, f.face * 200, 32);
    }
    const fx = { x: cx + f.x, y: f.y, face: f.face, vx: f.vx, vy: f.vy,
                 onGround: f.onGround, atk: f.atk, hitstun: f.hitstun, inv: f.inv,
                 char: f.char, squash: f.squash, respawnT: f.respawnT };
    drawFighter(ctx, fx, t);
    // ためている しるし
    if (f.charging && f.chargeT > 0.16) {
      ctx.strokeStyle = '#FFD166'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + f.x, f.y - charH(c) * 0.6, 26 + f.chargeT * 10,
              -1.5, -1.5 + f.chargeT * 6.283);
      ctx.stroke();
    }
    // だれか わかる ように 上に しるし
    if (f.player) {
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      const ay = f.y - charH(c) - 16;
      ctx.moveTo(cx + f.x, ay + 10); ctx.lineTo(cx + f.x - 8, ay);
      ctx.lineTo(cx + f.x + 8, ay); ctx.closePath(); ctx.fill();
    }
  }

  // つぶ
  for (const p of G.puffs) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(cx + p.x, p.y, 6 * (1 - p.t / p.life) + 1, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 出る 文字
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.5);
    ctx.fillStyle = p.col;
    fitFont(p.text, p.big ? 420 : 200, p.big ? 30 : 22, 'bold ');
    ctx.strokeStyle = 'rgba(20,10,30,0.75)'; ctx.lineWidth = 5;
    const y = p.y - p.t * (p.big ? 48 : 32);
    ctx.strokeText(p.text, cx + p.x, y); ctx.fillText(p.text, cx + p.x, y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

  // 画面の 外に いる 人の しるし
  for (const f of G.fighters) {
    if (f.stocks <= 0 || f.respawnT > 0) continue;
    const px = cx + f.x;
    if (px > -20 && px < VW + 20 && f.y > -20 && f.y < VH + 20) continue;
    const ax = Math.max(18, Math.min(VW - 18, px));
    const ay = Math.max(18, Math.min(VH - 18, f.y));
    ctx.fillStyle = f.player ? '#FFE066' : '#FF8080';
    ctx.beginPath(); ctx.arc(ax, ay, 13, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A2430';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', ax, ay);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  if (!ui.hidePad) { drawHUD(t); drawPad(); }
}

function drawHUD(t) {
  const VW = G.VW;
  const n = G.fighters.length;
  // そうさボタンと かさならない ように、まん中の あいている ぶんに おさめる
  const k = padScale();
  const free = VW - (36 + 130 * k) - 252 * k;
  const cw = Math.max(96, Math.min(190, free / n, (VW - 40) / n));
  const y = VH - 62;
  for (let i = 0; i < n; i++) {
    const f = G.fighters[i];
    const x = VW / 2 - (cw * n) / 2 + i * cw;
    ctx.fillStyle = f.stocks > 0 ? 'rgba(20,16,34,0.55)' : 'rgba(20,16,34,0.25)';
    rr(ctx, x + 4, y, cw - 8, 54, 10); ctx.fill();
    if (f.player) {
      ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 2; ctx.stroke();
    }
    drawFace(ctx, f.char, x + 26, y + 24, 16);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    fitFont(CHARS[f.char].name, cw - 60, 13, 'bold ');
    ctx.fillText(CHARS[f.char].name, x + 48, y + 13);
    // ダメージ％。たかいほど 赤くなる
    const d = Math.min(200, f.dmg);
    const col = d < 40 ? '#FFFFFF' : d < 90 ? '#FFD166' : d < 140 ? '#FF9C5A' : '#FF5A5A';
    ctx.fillStyle = f.stocks > 0 ? col : 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(Math.round(f.dmg) + '%', x + 48, y + 34);
    // ストック
    for (let k = 0; k < 4; k++) {
      if (k >= Math.max(0, f.stocks)) break;
      ctx.fillStyle = f.player ? '#FFE066' : '#FF8FA8';
      ctx.beginPath(); ctx.arc(x + cw - 20 - k * 13, y + 42, 5, 0, 7); ctx.fill();
    }
    ctx.textAlign = 'left';
  }

  // のこり時間。すくなくなると 赤く なって ドキドキする。
  {
    const s = Math.max(0, Math.ceil(G.timeL));
    const hot = s <= 10;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(20,16,34,0.5)';
    rr(ctx, VW / 2 - 32, 8, 64, 26, 9); ctx.fill();
    ctx.fillStyle = hot ? (Math.floor(G.t * 6) % 2 ? '#FF6A6A' : '#FFD0D0') : '#EAF0FF';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(String(s), VW / 2, 22);
    ctx.textAlign = 'left';
  }

  // はじめの あんない
  if (G.t < 3.4) {
    ctx.globalAlpha = Math.min(1, (3.4 - G.t) / 1.2);
    ctx.fillStyle = 'rgba(12,8,24,0.6)';
    const pw = VW * 0.74, ph = 40;
    rr(ctx, VW / 2 - pw / 2, 40, pw, ph, 10); ctx.fill();
    ctx.fillStyle = '#FFF3C4';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(stageRule(G.si), pw * 0.94, 20, 'bold ');
    ctx.fillText(stageRule(G.si), VW / 2, 60);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.assist > 0) {
    ctx.fillStyle = 'rgba(255,224,138,0.85)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('やさしく してるよ', VW / 2, VH - 8);
    ctx.textAlign = 'left';
  }

  drawButton(button(10, 8, 74, 28, () => { bgmStop(); G.screen = 'select'; }),
             'やめる', 'rgba(255,255,255,0.8)');
}

// --- そうさボタン ---------------------------------------------------------------

// そうさボタンの 大きさ。よこが せまい 画面（iPad など）では 小さくして、
// ステージの 上に かぶさりすぎない ようにする。
function padScale() { return Math.max(0.62, Math.min(1, G.VW / 820)); }

function padPos() {
  const VW = G.VW, k = padScale();
  return {
    stick: { x: 36 + 60 * k, y: VH - 130 * k, r: 60 * k },
    jump: { x: VW - 186 * k, y: VH - 192 * k, r: 38 * k },
    atk: { x: VW - 84 * k, y: VH - 132 * k, r: 47 * k },
    sp: { x: VW - 182 * k, y: VH - 84 * k, r: 38 * k },
  };
}

function drawPad() {
  const p = padPos();
  // スティック
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(p.stick.x, p.stick.y, p.stick.r, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.beginPath(); ctx.arc(p.stick.x, p.stick.y, p.stick.r, 0, 7); ctx.fill();
  const kx = p.stick.x + IN.sx * p.stick.r * 0.6, ky = p.stick.y + IN.sy * p.stick.r * 0.6;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(kx, ky, p.stick.r * 0.4, 0, 7); ctx.fill();
  // あんないは はじめの うちだけ。ずっと 出していると じゃまに なる。
  if (G.t < 8) {
    ctx.globalAlpha = Math.min(1, (8 - G.t) / 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold ' + Math.round(12 * padScale()) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←→ うごく / ↓ おりる', p.stick.x, p.stick.y + p.stick.r + 14 * padScale());
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const bs = [[p.jump, 'ジャンプ', '#7FD0F0', IN.jumpHold],
              [p.atk, 'こうげき', '#FF8FA8', IN.atkHold],
              [p.sp, 'ひっさつ', '#FFD166', IN.spHold]];
  for (const [b, lab, col, on] of bs) {
    // そらの 色が あかるい ステージでも 見えるように、こい わくを つける
    ctx.fillStyle = on ? col : 'rgba(255,255,255,0.62)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (on ? 0.94 : 1), 0, 7); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(0,0,0,0.3)' : col; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#2A2430';
    fitFont(lab, b.r * 1.7, b.r * 0.42, 'bold ');
    ctx.fillText(lab, b.x, b.y);
  }
  ctx.textAlign = 'left';
}

// --- タイトル -----------------------------------------------------------------

function drawTitle(t) {
  const VW = G.VW;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1E2A5A'); g.addColorStop(1, '#C05070');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 30; i++) {
    const x = ((i * 173 + t * 24) % (VW + 80)) - 40;
    const y = (i * 91) % VH;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4), 0, 7); ctx.fill();
  }
  // まさきが パンチ
  const f1 = { char: 'masaki', x: VW * 0.66, y: VH * 0.82, face: 1, vx: 0, vy: 0,
               onGround: true, atk: { kind: 'smash', t: 0.2, dur: 0.56 }, hitstun: 0,
               inv: 0, squash: 0, respawnT: 0 };
  const f2 = { char: 'kouta', x: VW * 0.85, y: VH * 0.82, face: -1, vx: 0, vy: 0,
               onGround: false, atk: null, hitstun: 1, inv: 0, squash: 0, respawnT: 0 };
  drawFighter(ctx, f2, t);
  drawFighter(ctx, f1, t);

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(20,20,50,0.6)'; ctx.lineWidth = 7;
  const fs = fitFont('まさきの スマッシュバトル', VW * 0.58, 54, 'bold ');
  ctx.strokeText('まさきの スマッシュバトル', 28, 24);
  ctx.fillText('まさきの スマッシュバトル', 28, 24);
  ctx.fillStyle = '#FFE0EE';
  fitFont('ダメージを ためて 画面の 外へ ふっとばせ！ 全10ステージ', VW * 0.55, 19);
  ctx.fillText('ダメージを ためて 画面の 外へ ふっとばせ！ 全10ステージ', 30, 24 + fs + 8);
  const done = clearedCount();
  ctx.fillStyle = '#FFF3C4';
  fitFont('かった ステージ ' + done + ' / ' + STAGES.length, VW * 0.4, 18);
  ctx.fillText('かった ステージ ' + done + ' / ' + STAGES.length, 30, 24 + fs + 32);

  const bw = Math.min(VW * 0.38, 320), bh = 56;
  let y = VH * 0.44;
  const nx = Math.min(STAGES.length - 1, done);
  drawButton(button(28, y, bw, bh, () => { enterFullscreen(); showRule(nx); }),
             done > 0 ? (nx + 1) + 'ステージ から' : 'はじめる', '#FFD166');
  y += bh + 10;
  drawButton(button(28, y, bw * 0.48, 40, () => { G.screen = 'select'; }),
             'ステージ', '#BFE4F0');
  drawButton(button(28 + bw * 0.52, y, bw * 0.48, 40, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D8F4');
  y += 48;
  drawButton(button(28, y, bw * 0.48, 36, () => { sfxTest(); }), '♪ 音を ためす', '#FFE08A',
             '#3A2A08', soundOK() ? '音は 出せる' : 'ここを おしてね');
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  fitFont('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', VW * 0.6, 14);
  ctx.fillText('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', 28, VH - 24);
  drawHubButton();
}

function drawHowto() {
  const VW = G.VW;
  ctx.fillStyle = '#161C34'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#8FD6FF';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 18);
  const lines = [
    '① 左の まるで うごく。↓ で あしばを すりぬけて おりる',
    '② 「ジャンプ」は 空中で もう2回 とべる（3だんジャンプ）。落ちても もどれる',
    '③ 「こうげき」を チョンと おす＝はやい パンチ',
    '　 おしっぱなし → はなす＝**スマッシュ**。ためるほど 遠くへ ふっとばせる',
    '④ 「ひっさつ」は キャラごとに ちがう。↑を おしながら なら 上へ ジャンプ（もどる とき用）',
    '⑤ たいりょくは ない。**ダメージ％** が たまるほど 遠くへ ふっとぶ',
    '⑥ 画面の 外に 出たら 1ストック へる。さきに 0 に なった ほうの まけ',
    '⑦ ステージには しかけが ある。赤い しるしが 出たら にげる',
    '⑧ 90びょうで 時間切れ。そのときは ストックの おおい ほうの かち',
    'パソコン: ←→ うごく / ↑ か スペース ジャンプ / Z こうげき / X ひっさつ',
  ];
  ctx.fillStyle = '#D8E4F4';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 18);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 70 + i * 36);
  });
  drawButton(button(VW - 124, 18, 104, 38, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- ステージえらび ------------------------------------------------------------

function drawSelect() {
  const VW = G.VW;
  ctx.fillStyle = '#141A30'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('ステージを えらぶ', 20, 14);

  const cols = 5, gx = 20, gy = 58, gap = 9;
  const cw = (VW - gx * 2 - gap * (cols - 1)) / cols;
  const chh = Math.min(160, (VH - gy - 24 - gap) / 2);
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const x = gx + (i % cols) * (cw + gap), y = gy + ((i / cols) | 0) * (chh + gap);
    const open = stageOpen(i);
    const won = save.clear['s' + i] || 0;
    ctx.fillStyle = open ? (st.gim === 'king' ? '#C0407A' : '#2E5AA8') : 'rgba(255,255,255,0.07)';
    rr(ctx, x, y, cw, chh, 10); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = open ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    ctx.font = 'bold ' + Math.round(chh * 0.22) + 'px system-ui, sans-serif';
    ctx.fillText(open ? String(i + 1) : '?', x + cw / 2, y + chh * 0.16);
    if (open) {
      drawFace(ctx, st.foes[0], x + cw / 2, y + chh * 0.45, chh * 0.17);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      fitFont(st.name, cw * 0.94, chh * 0.115);
      ctx.fillText(st.name, x + cw / 2, y + chh * 0.72);
      ctx.fillStyle = won ? '#FFE066' : 'rgba(255,255,255,0.45)';
      fitFont(won ? 'かった！' : CHARS[st.foes[0]].name, cw * 0.9, chh * 0.11, 'bold ');
      ctx.fillText(won ? 'かった！' : CHARS[st.foes[0]].name, x + cw / 2, y + chh * 0.88);
      button(x, y, cw, chh, ((k) => () => { enterFullscreen(); showRule(k); })(i));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      fitFont('まえに かつと あく', cw * 0.9, chh * 0.11);
      ctx.fillText('まえに かつと あく', x + cw / 2, y + chh * 0.55);
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(VW - 124, 14, 104, 36, () => { G.screen = 'title'; }), 'もどる', '#D8D4F0');
}

// --- はじめる まえ -------------------------------------------------------------

function showRule(i) {
  audioStart();
  G.pending = Math.max(0, Math.min(STAGES.length - 1, i));
  G.screen = 'rule';
}

function drawRule(t) {
  const VW = G.VW, st = STAGES[G.pending];
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = 'rgba(10,12,30,0.5)'; ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  fitFont((G.pending + 1) + ' ステージ', VW * 0.3, 20, 'bold ');
  ctx.fillText((G.pending + 1) + ' ステージ', VW / 2, 18);
  ctx.fillStyle = '#FFFFFF';
  fitFont(st.name, VW * 0.7, 44, 'bold ');
  ctx.fillText(st.name, VW / 2, 42);

  // あいて。2人 いる ステージも あるので、まとめて ならべる。
  const foe = CHARS[st.foes[0]];
  st.foes.forEach((k, i) => {
    drawFace(ctx, k, VW / 2 - 130 - (st.foes.length - 1 - i * 2) * 34, 150,
             st.foes.length > 1 ? 28 : 34);
  });
  drawFace(ctx, 'masaki', VW / 2 + 130, 150, 34);
  ctx.fillStyle = '#FFE066';
  ctx.textBaseline = 'middle';
  fitFont('VS', 60, 30, 'bold ');
  ctx.fillText('VS', VW / 2, 150);
  if (st.foes.length > 1) {
    ctx.fillStyle = '#FF9CB8';
    fitFont(st.foes.length + '人 あいて！', 150, 17, 'bold ');
    ctx.fillText(st.foes.length + '人 あいて！', VW / 2 - 130, 196);
  }

  const pw = VW * 0.8, ph = 76;
  ctx.fillStyle = 'rgba(10,8,22,0.62)';
  rr(ctx, VW / 2 - pw / 2, 202, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = '#8FD6FF'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FFF3C4';
  const line = st.foes.length > 1
    ? st.foes.map((k) => CHARS[k].name).join(' と ') + ' が 2人で かかってくる！'
    : foe.name + '：' + foe.about;
  fitFont(line, pw * 0.92, 19, 'bold ');
  ctx.fillText(line, VW / 2, 226);
  const gt = GIM_TEXT[st.gim];
  ctx.fillStyle = gt ? '#FFB0B0' : 'rgba(220,235,250,0.8)';
  fitFont(gt || 'しかけは なし。まずは たたかいかたに なれよう', pw * 0.92, 19);
  ctx.fillText(gt || 'しかけは なし。まずは たたかいかたに なれよう', VW / 2, 256);

  ctx.textAlign = 'left';
  const bw = Math.min(VW * 0.3, 240);
  drawButton(button(VW / 2 - bw / 2, VH - 106, bw, 50, () => { startStage(G.pending); }),
             'たたかう！', '#FFD166');
  drawButton(button(18, 16, 96, 36, () => { G.screen = 'select'; }), 'もどる', '#D8D4F0');
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitFont('画面を さわっても はじまるよ', VW * 0.5, 15);
  ctx.fillText('画面を さわっても はじまるよ', VW / 2, VH - 44);
  ctx.textAlign = 'left';
}

// --- けっか -------------------------------------------------------------------

function drawResult(t) {
  const VW = G.VW;
  // うしろの ステージは のこすが、そうさボタンや ダメージ表示までは 出さない
  // （けっかを 読む じゃまに なる）。
  const keepPad = ui.hidePad;
  ui.hidePad = true;
  drawPlay(t);
  ui.hidePad = keepPad;
  ctx.fillStyle = G.win ? 'rgba(14,34,54,0.90)' : 'rgba(50,14,28,0.90)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#A8F0FF' : '#FFB0B0';
  fitFont(G.win ? 'かった！' : 'まけちゃった…', VW * 0.7, 52, 'bold ');
  ctx.fillText(G.win ? 'かった！' : 'まけちゃった…', VW / 2, 34);

  const me = G.fighters[0];
  ctx.fillStyle = '#FFFFFF';
  fitFont(STAGES[G.si].name, VW * 0.5, 22);
  ctx.fillText(STAGES[G.si].name, VW / 2, 96);
  drawFace(ctx, G.win ? 'masaki' : STAGES[G.si].foes[0], VW / 2, 152, 30);

  const rows = [['のこりストック', Math.max(0, me.stocks), '#FFE066'],
                ['じぶんの ダメージ', Math.round(me.dmg) + '%', '#FF9CC0']];
  rows.forEach((r, i) => {
    ctx.textAlign = 'right'; ctx.fillStyle = '#D8E4F4';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(r[0], VW / 2 - 12, 206 + i * 30);
    ctx.textAlign = 'left'; ctx.fillStyle = r[2];
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(String(r[1]), VW / 2 + 12, 205 + i * 30);
  });

  ctx.textAlign = 'center';
  let note = 'もう一度 やってみよう';
  let ncol = '#9CB0C8';
  if (G.win) note = 'つぎの ステージが あいたよ';
  else if (G.justOpened) { note = 'つぎの ステージも あけたよ。とばしても いいよ'; ncol = '#7FE0A0'; }
  else if (assistLevel() > 0) { note = 'つぎは ストックが ふえて あいてが よわくなるよ'; ncol = '#FFE08A'; }
  ctx.fillStyle = ncol;
  fitFont(note, VW * 0.7, 18);
  ctx.fillText(note, VW / 2, 282);
  ctx.textAlign = 'left';

  const bw = Math.min(VW * 0.24, 190), bh = 46;
  const nx = G.si + 1;
  const canNext = nx < STAGES.length && (G.win || stageOpen(nx));
  drawButton(button(VW / 2 - bw * 1.6, VH - 74, bw, bh, () => { startStage(G.si); }),
             'もう一度', '#FFD166');
  drawButton(button(VW / 2 - bw * 0.5, VH - 74, bw, bh, () => { G.screen = 'select'; }),
             'えらぶ', '#D8D4F0');
  if (canNext) {
    drawButton(button(VW / 2 + bw * 0.6, VH - 74, bw, bh, () => { showRule(nx); }),
               'つぎへ →', '#7FE0A0');
  }
}

// --- ほかの ゲームへ ------------------------------------------------------------

function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}
function drawHubButton() {
  const mw = Math.min(G.VW * 0.3, 186), mh = 36;
  drawButton(button(G.VW - mw - 16, 14, mw, mh, gotoHub),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.88)', '#33304A');
}

function enterFullscreen() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f) { try { f.call(e); } catch (err) {} }
  const so = window.screen && window.screen.orientation;
  if (so && so.lock) {
    try { const r = so.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (err) {}
  }
}

// --- そうさ -------------------------------------------------------------------

const IN = { sx: 0, sy: 0, jumpHold: false, atkHold: false, spHold: false,
             jumpEdge: false, atkEdge: false, spEdge: false, stickId: -1, btn: {} };

function vpos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / SC, y: (ev.clientY - r.top) / SC };
}

function padHit(v) {
  const p = padPos();
  for (const k of ['jump', 'atk', 'sp']) {
    const b = p[k];
    if (Math.hypot(v.x - b.x, v.y - b.y) < b.r + 10) return k;
  }
  return null;
}

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  audioStart();
  const v = vpos(ev);
  const b = hitBtn(ev.clientX - canvas.getBoundingClientRect().left,
                   ev.clientY - canvas.getBoundingClientRect().top);
  if (b) { if (b.on) b.on(); return; }
  if (G.screen === 'rule') { startStage(G.pending); return; }
  if (G.screen !== 'play') return;
  const k = padHit(v);
  if (k) {
    IN.btn[ev.pointerId] = k;
    if (k === 'jump') { IN.jumpHold = true; IN.jumpEdge = true; }
    if (k === 'atk') { IN.atkHold = true; IN.atkEdge = true; }
    if (k === 'sp') { IN.spHold = true; IN.spEdge = true; }
    return;
  }
  if (v.x < G.VW * 0.5) {
    IN.stickId = ev.pointerId;
    IN.ox = v.x; IN.oy = v.y;
    IN.sx = 0; IN.sy = 0;
  }
});

canvas.addEventListener('pointermove', (ev) => {
  if (ev.pointerId !== IN.stickId) return;
  const v = vpos(ev);
  const dx = (v.x - IN.ox) / 46, dy = (v.y - IN.oy) / 46;
  const L = Math.hypot(dx, dy);
  IN.sx = L > 1 ? dx / L : dx;
  IN.sy = L > 1 ? dy / L : dy;
});

function ptrUp(ev) {
  if (ev.pointerId === IN.stickId) { IN.stickId = -1; IN.sx = 0; IN.sy = 0; }
  const k = IN.btn[ev.pointerId];
  if (k) {
    delete IN.btn[ev.pointerId];
    if (k === 'jump') IN.jumpHold = false;
    if (k === 'atk') IN.atkHold = false;
    if (k === 'sp') IN.spHold = false;
  }
}
canvas.addEventListener('pointerup', ptrUp);
canvas.addEventListener('pointercancel', ptrUp);
window.addEventListener('blur', () => {
  IN.stickId = -1; IN.sx = 0; IN.sy = 0;
  IN.jumpHold = IN.atkHold = IN.spHold = false; IN.btn = {};
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const keys = {};
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyZ', 'KeyX',
       'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Enter'].indexOf(k) < 0) return;
  e.preventDefault();
  audioStart();
  if (e.repeat) return;
  keys[k] = true;
  if (G.screen === 'rule') { startStage(G.pending); return; }
  if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') { IN.jumpHold = true; IN.jumpEdge = true; }
  if (k === 'KeyZ') { IN.atkHold = true; IN.atkEdge = true; }
  if (k === 'KeyX') { IN.spHold = true; IN.spEdge = true; }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (['Space', 'ArrowUp', 'KeyW'].indexOf(e.code) >= 0) IN.jumpHold = false;
  if (e.code === 'KeyZ') IN.atkHold = false;
  if (e.code === 'KeyX') IN.spHold = false;
});

let prevUp = false;
function readInput() {
  let mx = IN.sx, my = IN.sy;
  if (keys.ArrowLeft || keys.KeyA) mx = -1;
  if (keys.ArrowRight || keys.KeyD) mx = 1;
  if (keys.ArrowDown || keys.KeyS) my = 1;
  if (keys.ArrowUp || keys.KeyW) my = -1;
  // スティックを 上に はじいても ジャンプ できる（そっちで おぼえる 子も いる）
  const upNow = my < -0.62;
  const upEdge = upNow && !prevUp;
  prevUp = upNow;
  const cmd = {
    mx: Math.abs(mx) > 0.28 ? Math.sign(mx) : 0,
    my,
    jump: IN.jumpEdge || upEdge,
    down: my > 0.5,
    // 地上は「おしっぱなし → はなす」で スマッシュ。空中は おした しゅんかんに こうげき。
    atk: IN.atkEdge,
    atkHold: IN.atkHold,
    sp: IN.spEdge,
  };
  IN.jumpEdge = false; IN.spEdge = false; IN.atkEdge = false;
  return cmd;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'select'; }
});

// --- たて画面 -----------------------------------------------------------------

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#161C34'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#A8C0E0';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

// --- ループ -------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.045, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') {
    update(dt, readInput());
    if (G.screen === 'play') drawPlay(tsec);
    else drawResult(tsec);
  } else if (G.screen === 'clear' || G.screen === 'over') drawResult(tsec);
  else if (G.screen === 'select') drawSelect();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'rule') drawRule(tsec);
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
