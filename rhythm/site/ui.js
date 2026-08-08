// 画面・そうさ・メインループ。よこ向き専用。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

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
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return null;
}

const RANK_NAME = ['もういちど', 'クリア！', 'ハイレベル！'];
const RANK_COL = ['#B0A8C0', '#7FE0A0', '#FFD166'];

// --- あそんでいる 画面 ----------------------------------------------------------

function drawPlay() {
  const st = RG.st;
  const b = beatNow();
  const v = { beat: b, notes: RG.notes, hitB: RG.hitB, missB: RG.missB,
              callB: RG.callB, poseI: RG.poseI, hitLane: RG.hitLane };
  st.draw.call(st, v);

  // 上の おび
  ctx.fillStyle = 'rgba(18,14,32,0.5)';
  ctx.fillRect(0, 0, W, H * 0.095);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  fitFont(st.name, W * 0.3, H * 0.045, 'bold ');
  ctx.fillText(st.name, H * 0.03, H * 0.048);

  // すすみぐあい
  const bw = W * 0.34, bx = W / 2 - bw / 2;
  const f = Math.max(0, Math.min(1, b / RG.endB));
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, bx, H * 0.03, bw, H * 0.036, H * 0.018); ctx.fill();
  ctx.fillStyle = st.col;
  rr(ctx, bx, H * 0.03, Math.max(4, bw * f), H * 0.036, H * 0.018); ctx.fill();

  ctx.textAlign = 'right';
  ctx.fillStyle = RG.combo >= 8 ? '#FFE066' : '#FFFFFF';
  fitFont(RG.combo > 1 ? RG.combo + ' れんぞく' : '', W * 0.24, H * 0.045, 'bold ');
  if (RG.combo > 1) ctx.fillText(RG.combo + ' れんぞく', W - H * 0.03, H * 0.048);
  ctx.textAlign = 'left';

  // カウント（はじめの 2小節）
  if (b < st.intro * 4) {
    const n = Math.floor(b) % 4 + 1;
    const u = b - Math.floor(b);
    ctx.globalAlpha = Math.max(0, 1 - u * 1.4);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(H * (0.24 + (1 - u) * 0.06)) + 'px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = H * 0.012;
    if (b >= 0) {
      ctx.strokeText(String(n), W / 2, H * 0.5);
      ctx.fillText(String(n), W / 2, H * 0.5);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    if (b > st.intro * 4 - 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      fitFont('画面を どこでも タップ！', W * 0.6, H * 0.055, 'bold ');
      ctx.fillText('画面を どこでも タップ！', W / 2, H * 0.82);
      ctx.textAlign = 'left';
    }
  }

  // 出てくる 文字
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  RG.pops.forEach((p, i) => {
    const t = b - p.b;
    ctx.globalAlpha = Math.max(0, 1 - t / 1.6);
    ctx.fillStyle = p.col;
    fitFont(p.text, W * 0.4, H * 0.07, 'bold ');
    ctx.strokeStyle = 'rgba(20,10,30,0.8)'; ctx.lineWidth = Math.max(5, H * 0.016);
    const y = H * 0.19 - t * H * 0.05 - i * H * 0.001;
    ctx.strokeText(p.text, W / 2, y);
    ctx.fillText(p.text, W / 2, y);
    ctx.globalAlpha = 1;
  });
  ctx.textAlign = 'left';

  drawButton(button(H * 0.03, H - H * 0.10, H * 0.26, H * 0.075, () => {
    stopStage(); RG.screen = 'select';
  }), 'やめる', 'rgba(255,255,255,0.8)');
}

// --- タイトル -----------------------------------------------------------------

function drawTitle(t) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2B1B54'); g.addColorStop(1, '#D8558C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // うしろの おんぷ
  for (let i = 0; i < 12; i++) {
    const x = ((i * 137 + t * 22) % (W + 80)) - 40;
    const y = H * (0.18 + ((i * 37) % 70) / 100);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(x, y, H * 0.022, H * 0.017, -0.4, 0, 7); ctx.fill();
    ctx.fillRect(x + H * 0.018, y - H * 0.07, H * 0.007, H * 0.07);
    ctx.globalAlpha = 1;
  }
  chibi(W * 0.78, H * 0.86, H * 0.34, Object.assign({}, RINA, {
    arm: -1.2 + Math.sin(t * 4) * 0.5, arm2: -1.2 - Math.sin(t * 4) * 0.5,
    face: 'h', squash: Math.abs(Math.sin(t * 2)) * 0.12,
  }));

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('りなのリズムスター', W * 0.55, H * 0.15, 'bold ');
  ctx.fillText('りなのリズムスター', H * 0.06, H * 0.07);
  ctx.fillStyle = '#FFE0EE';
  fitFont('ビートに 合わせて タップ！ ぜんぶで 6つ', W * 0.5, H * 0.048);
  ctx.fillText('ビートに 合わせて タップ！ ぜんぶで 6つ', H * 0.07, H * 0.245);
  ctx.fillStyle = '#FFF3C4';
  const done = clearedCount();
  fitFont('クリアした ミニゲーム ' + done + ' / ' + STAGES.length, W * 0.5, H * 0.042);
  ctx.fillText('クリアした ミニゲーム ' + done + ' / ' + STAGES.length, H * 0.07, H * 0.315);

  const bw = Math.min(W * 0.4, H * 0.9), bh = H * 0.13;
  const x = H * 0.06;
  let y = H * 0.4;
  const nx = Math.min(STAGES.length - 1, done);
  drawButton(button(x, y, bw, bh, () => { enterFullscreen(); startStage(nx); }),
             done > 0 ? STAGES[nx].name + ' から' : 'はじめる', '#FFD166');
  y += bh * 1.14;
  drawButton(button(x, y, bw * 0.48, bh * 0.82, () => { RG.screen = 'select'; }),
             'ミニゲーム', '#BFE4F0');
  drawButton(button(x + bw * 0.52, y, bw * 0.48, bh * 0.82, () => { RG.screen = 'howto'; }),
             'あそびかた', '#D8D4F0');
  y += bh * 0.96;
  drawButton(button(x, y, bw, bh * 0.72, () => { calStart(); }),
             '♪ ずれ合わせ', '#FFB0D0', '#3A2030',
             save.lat >= 0 ? 'いまの ずれ ' + Math.round(save.lat * 1000) + 'ミリびょう'
                           : 'さいしょに やると 気もちいい');
  drawHubButton();
}

function drawHowto() {
  ctx.fillStyle = '#1E1A32'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFB0D0';
  ctx.font = 'bold ' + Math.round(H * 0.075) + 'px system-ui, sans-serif';
  ctx.fillText('あそびかた', H * 0.05, H * 0.05);
  const lines = [
    '① 曲に 合わせて 画面を タップ！ どこを さわっても いい',
    '② ちょうどの ときに たたけると「ピッタリ！」',
    '　 すこし ずれると「はやい」「おそい」、はずすと「ミス…」',
    '③ たたく ところは かならず 曲の 音に なっている。耳で おぼえよう',
    '④ 「まねっこ たいこ」は パパの リズムを 1小節 おぼえて まねる',
    '⑤ さいごの「リミックス」は ぜんぶが つぎつぎ 出てくる',
    '⑥ せいせき ハイレベル！ ＞ クリア！ ＞ もういちど',
    '⑦ 1つ クリアすると つぎの ミニゲームが あく',
    '★ 音が ずれて 感じるときは タイトルの「ずれ合わせ」',
    'パソコン: スペースキー か やじるしキー でも たたける',
  ];
  ctx.fillStyle = '#D8D4EC';
  const step = Math.min(H * 0.072, (H * 0.70) / lines.length);
  lines.forEach((s, i) => {
    fitFont(s, W * 0.92, Math.min(H * 0.042, step * 0.7));
    ctx.fillText(s, H * 0.05, H * 0.16 + i * step);
  });
  drawButton(button(W - H * 0.45, H * 0.05, H * 0.4, H * 0.1,
                    () => { RG.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- ミニゲームえらび -----------------------------------------------------------

function drawSelect() {
  ctx.fillStyle = '#241E3E'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.06) + 'px system-ui, sans-serif';
  ctx.fillText('ミニゲームを えらぶ', H * 0.04, H * 0.04);

  const cols = 3, rows = 2;
  const gapx = H * 0.03;
  const cw = (W - H * 0.08 - gapx * (cols - 1)) / cols;
  const chh = Math.min(H * 0.30, (H * 0.60) / rows);
  const gx = H * 0.04, gy = H * 0.17;
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const x = gx + (i % cols) * (cw + gapx), y = gy + ((i / cols) | 0) * (chh + H * 0.04);
    const open = stageOpen(i);
    const rk = save.rank[st.key];
    ctx.fillStyle = open ? st.col : 'rgba(255,255,255,0.08)';
    rr(ctx, x, y, cw, chh, 14); ctx.fill();
    ctx.fillStyle = open ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(open ? st.name : '？？？', cw * 0.9, chh * 0.24, 'bold ');
    ctx.fillText(open ? st.name : '？？？', x + cw / 2, y + chh * 0.3);
    if (open) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      fitFont(st.desc, cw * 0.92, chh * 0.15);
      ctx.fillText(st.desc, x + cw / 2, y + chh * 0.55);
      if (rk !== undefined) {
        ctx.fillStyle = rk === 2 ? '#7A4A00' : 'rgba(0,0,0,0.6)';
        fitFont(RANK_NAME[rk], cw * 0.8, chh * 0.17, 'bold ');
        ctx.fillText(RANK_NAME[rk], x + cw / 2, y + chh * 0.78);
      }
      button(x, y, cw, chh, ((k) => () => { enterFullscreen(); startStage(k); })(i));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      fitFont('前を クリアすると あくよ', cw * 0.9, chh * 0.15);
      ctx.fillText('前を クリアすると あくよ', x + cw / 2, y + chh * 0.58);
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(W - H * 0.42, H * 0.04, H * 0.36, H * 0.09,
                    () => { RG.screen = 'title'; }), 'もどる', '#D8D4F0');
}

// --- せいせき -----------------------------------------------------------------

function drawResult() {
  const st = RG.st;
  ctx.fillStyle = '#1A1430'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, H);
  g.addColorStop(0, RG.rank === 2 ? 'rgba(255,209,102,0.35)' : 'rgba(120,110,190,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#CFC8E8';
  fitFont(st.name, W * 0.5, H * 0.05, 'bold ');
  ctx.fillText(st.name, W / 2, H * 0.07);
  ctx.fillStyle = RANK_COL[RG.rank];
  fitFont(RANK_NAME[RG.rank], W * 0.7, H * 0.16, 'bold ');
  ctx.fillText(RANK_NAME[RG.rank], W / 2, H * 0.14);

  const rows = [
    ['ピッタリ', RG.perfect, '#FFE066'],
    ['ちょっと ずれ', RG.good, '#A8E0FF'],
    ['ミス', RG.miss, '#FF9C9C'],
    ['さいこう れんぞく', RG.maxCombo, '#C0F0C0'],
  ];
  const ry = H * 0.40, rh = H * 0.075;
  rows.forEach((r, i) => {
    ctx.textAlign = 'right'; ctx.fillStyle = '#D8D4EC';
    fitFont(r[0], W * 0.24, H * 0.045);
    ctx.fillText(r[0], W * 0.5 - H * 0.02, ry + i * rh);
    ctx.textAlign = 'left'; ctx.fillStyle = r[2];
    ctx.font = 'bold ' + Math.round(H * 0.05) + 'px system-ui, sans-serif';
    ctx.fillText(String(r[1]), W * 0.5 + H * 0.02, ry + i * rh);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9C94B8';
  fitFont(RG.rank >= 1 ? 'つぎの ミニゲームが あいたよ' : 'あと すこし！ もう一度 やってみよう',
          W * 0.6, H * 0.042);
  ctx.fillText(RG.rank >= 1 ? 'つぎの ミニゲームが あいたよ' : 'あと すこし！ もう一度 やってみよう',
               W / 2, H * 0.75);
  ctx.textAlign = 'left';

  const bw = Math.min(W * 0.26, H * 0.55), bh = H * 0.12;
  const nx = RG.st.gi + 1;
  const canNext = RG.rank >= 1 && nx < STAGES.length;
  drawButton(button(W / 2 - bw * 1.55, H * 0.83, bw, bh,
                    () => { startStage(RG.st.gi); }), 'もう一度', '#FFD166');
  drawButton(button(W / 2 - bw * 0.5, H * 0.83, bw, bh,
                    () => { RG.screen = 'select'; }), 'えらぶ', '#D8D4F0');
  if (canNext) {
    drawButton(button(W / 2 + bw * 0.55, H * 0.83, bw, bh,
                      () => { startStage(nx); }), 'つぎへ →', '#7FE0A0');
  }
}

// --- ずれ合わせ ----------------------------------------------------------------

function drawCal() {
  calPump();
  ctx.fillStyle = '#161230'; ctx.fillRect(0, 0, W, H);
  const c = RG.cal;
  const spb = 0.5;
  const beat = c ? (anow() - c.t0) / spb : 0;
  const u = beat - Math.floor(beat);
  const pulse = Math.max(0, 1 - u * 2.2);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFB0D0';
  fitFont('ずれ合わせ', W * 0.5, H * 0.09, 'bold ');
  ctx.fillText('ずれ合わせ', W / 2, H * 0.06);
  ctx.fillStyle = '#D8D4EC';
  fitFont('「コッ、コッ」に 合わせて 8回 タップしてね', W * 0.7, H * 0.05);
  ctx.fillText('「コッ、コッ」に 合わせて 8回 タップしてね', W / 2, H * 0.19);

  // まる が ふくらむ
  ctx.fillStyle = 'rgba(255,209,102,' + (0.25 + pulse * 0.6) + ')';
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.52, H * (0.10 + pulse * 0.06), 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W / 2, H * 0.52, H * 0.17, 0, 7); ctx.stroke();

  const n = calCount();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText(n + ' / 8', W / 2, H * 0.72);
  if (n >= 8) {
    ctx.fillStyle = '#7FE0A0';
    fitFont('できた！ ずれは ' + Math.round(save.lat * 1000) + ' ミリびょう',
            W * 0.7, H * 0.055, 'bold ');
    ctx.fillText('できた！ ずれは ' + Math.round(save.lat * 1000) + ' ミリびょう',
                 W / 2, H * 0.82);
  }
  ctx.textAlign = 'left';

  drawButton(button(H * 0.04, H * 0.04, H * 0.34, H * 0.09, () => {
    RG.cal = null; RG.screen = 'title';
  }), 'もどる', '#D8D4F0');
  drawButton(button(W - H * 0.42, H * 0.04, H * 0.38, H * 0.09, () => {
    save.lat = -1; storeSave(); calStart();
  }), 'やりなおす', '#FFC0C0');
}

// --- ほかの ゲームへ ------------------------------------------------------------

function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}
function drawHubButton() {
  const mw = Math.min(W * 0.30, H * 0.60), mh = H * 0.085;
  drawButton(button(W - mw - H * 0.03, H * 0.03, mw, mh, gotoHub),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.86)', '#33304A');
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

function pos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  audioStart();
  const p = pos(ev);
  const b = hitBtn(p.x, p.y);
  if (b) { if (b.on) b.on(); return; }
  if (RG.screen === 'play') rTap();
  else if (RG.screen === 'cal') calTap();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ほかの アプリに 行くと 画面の コマ送りが 止まるが、曲は 鳴りつづける。
// もどってきたら もう ぐちゃぐちゃ なので、いったん やめる。
document.addEventListener('visibilitychange', () => {
  if (document.hidden && RG.screen === 'play') { stopStage(); RG.screen = 'select'; }
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(k)) {
    e.preventDefault();
    audioStart();
    if (RG.screen === 'play') rTap();
    else if (RG.screen === 'cal') calTap();
  }
});

// --- たて画面 -----------------------------------------------------------------

function drawRotate() {
  ctx.fillStyle = '#1E1A32'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#C8B8E0';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
  ctx.textAlign = 'left';
}

// --- ループ -------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (RG.screen === 'play') {
    updatePlay();
    if (RG.screen === 'play') drawPlay();
    else drawResult();
  } else if (RG.screen === 'result') drawResult();
  else if (RG.screen === 'select') drawSelect();
  else if (RG.screen === 'howto') drawHowto();
  else if (RG.screen === 'cal') drawCal();
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
