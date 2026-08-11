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
  // ★ 小さい ボタンは ゆびで 当てにくい、と 言われた。どれにも あたらなかった
  //   ときだけ、まわりを 少し ひろげて もう一度 さがす（見た目は そのまま）。
  const need = 40 / (typeof SC === 'number' && SC > 0 ? SC : 1);
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    const mx = Math.max(0, (need - b.w) / 2), my = Math.max(0, (need - b.h) / 2);
    if (!mx && !my) continue;
    if (px >= b.x - mx && px <= b.x + b.w + mx &&
        py >= b.y - my && py <= b.y + b.h + my) return b;
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
              callB: RG.callB, poseI: RG.poseI, hitLane: RG.hitLane,
              shoutB: RG.shoutB, holding: !!RG.holding };
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
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12,8,24,0.55)';
    const pw = W * 0.8, ph = H * 0.10;
    rr(ctx, W / 2 - pw / 2, H * 0.80, pw, ph, 12); ctx.fill();
    ctx.fillStyle = '#FFF3C4';
    fitFont(st.rule || st.desc, pw * 0.92, H * 0.05, 'bold ');
    ctx.fillText(st.rule || st.desc, W / 2, H * 0.80 + ph / 2);
    ctx.textAlign = 'left';
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
    stopStage(); openSelect(RG.st.gi);
  }), 'やめる', 'rgba(255,255,255,0.8)');

  if (RG.assist > 0) {
    ctx.fillStyle = 'rgba(255,224,138,0.85)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    fitFont('やさしく してるよ', W * 0.24, H * 0.038);
    ctx.fillText('やさしく してるよ', W - H * 0.03, H - H * 0.06);
    ctx.textAlign = 'left';
  }
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
    arm: 1.9 + Math.sin(t * 4) * 0.6, arm2: 1.9 - Math.sin(t * 4) * 0.6,
    face: 'h', squash: Math.abs(Math.sin(t * 2)) * 0.12,
  }));

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('りなりなリズム', W * 0.55, H * 0.15, 'bold ');
  ctx.fillText('りなりなリズム', H * 0.06, H * 0.07);
  ctx.fillStyle = '#FFE0EE';
  const sub = 'ビートに 合わせて タップ！ ミニゲーム ' + STAGES.length + 'こ・ワールド ' + WORLDS.length + 'つ';
  fitFont(sub, W * 0.5, H * 0.048);
  ctx.fillText(sub, H * 0.07, H * 0.245);
  ctx.fillStyle = '#FFF3C4';
  const done = clearedCount();
  fitFont('クリアした ミニゲーム ' + done + ' / ' + STAGES.length, W * 0.5, H * 0.042);
  ctx.fillText('クリアした ミニゲーム ' + done + ' / ' + STAGES.length, H * 0.07, H * 0.315);

  const bw = Math.min(W * 0.4, H * 0.9), bh = H * 0.13;
  const x = H * 0.06;
  let y = H * 0.4;
  const nx = nextStageIndex();
  drawButton(button(x, y, bw, bh, () => { enterFullscreen(); showRule(nx); }),
             done > 0 ? STAGES[nx].name + ' から' : 'はじめる', '#FFD166');
  y += bh * 1.14;
  drawButton(button(x, y, bw * 0.48, bh * 0.82, () => { openSelect(); }),
             'ミニゲーム', '#BFE4F0');
  drawButton(button(x + bw * 0.52, y, bw * 0.48, bh * 0.82, () => { RG.screen = 'howto'; }),
             'あそびかた', '#D8D4F0');
  y += bh * 0.96;
  drawButton(button(x, y, bw * 0.48, bh * 0.72, () => { sfxTest(); }),
             '♪ 音を ためす', '#FFE08A', '#3A2A08',
             soundOK() ? '音は 出せる じょうたい' : 'ここを おしてね');
  drawButton(button(x + bw * 0.52, y, bw * 0.48, bh * 0.72, () => { calStart(); }),
             'ずれ合わせ', '#FFB0D0', '#3A2030',
             save.lat >= 0 ? 'ずれ ' + Math.round(save.lat * 1000) + 'ミリびょう'
                           : 'やると 気もちいい');

  // 音が 出ない ときの あんない（スマホの 消音スイッチが いちばん 多い）
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const tip = '音が 出ないときは スマホの よこの スイッチ（消音）と 音りょうを たしかめてね';
  fitFont(tip, W * 0.62, H * 0.038);
  ctx.fillText(tip, H * 0.06, H - H * 0.085);
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
    '⑤ 「ねじまき ロボ」は おしっぱなし。音が 上がりきったら はなす',
    '⑥ 「リミックス」は ミニゲームが つぎつぎ 出てくる',
    '⑦ ぜんぶで ' + STAGES.length + '面。10面ずつ 5つの ワールドに 分かれている',
    'せいせき ハイレベル！ ＞ クリア！ ＞ もういちど。1つ クリアすると つぎが あく',
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

// --- はじめる まえの「あそびかた」---------------------------------------------

function drawRule(t) {
  const st = STAGES[RG.pending];
  ctx.fillStyle = '#1A1430'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.30, 10, W / 2, H * 0.30, H * 1.1);
  g.addColorStop(0, st.col + 'AA');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  fitFont('あそびかた', W * 0.3, H * 0.045, 'bold ');
  ctx.fillText('あそびかた', W / 2, H * 0.07);
  ctx.fillStyle = '#FFFFFF';
  fitFont(st.name, W * 0.7, H * 0.115, 'bold ');
  ctx.fillText(st.name, W / 2, H * 0.14);

  // ルールの ふだ
  const pw = W * 0.82, ph = H * 0.20;
  ctx.fillStyle = 'rgba(12,8,24,0.62)';
  rr(ctx, W / 2 - pw / 2, H * 0.31, pw, ph, 16); ctx.fill();
  ctx.strokeStyle = st.col; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FFF3C4';
  ctx.textBaseline = 'middle';
  fitFont(st.rule || st.desc, pw * 0.9, H * 0.058, 'bold ');
  ctx.fillText(st.rule || st.desc, W / 2, H * 0.31 + ph * 0.38);
  ctx.fillStyle = 'rgba(220,214,240,0.85)';
  const sub = st.key === 'neji' ? 'ゆびを はなす ところで てんすうが つくよ'
            : 'たたく ところは かならず 曲の 音に なっている。耳で おぼえよう';
  fitFont(sub, pw * 0.9, H * 0.042);
  ctx.fillText(sub, W / 2, H * 0.31 + ph * 0.75);

  // ビートに 合わせて はずむ まる（1・2・3・4 の かんじを 見せる）
  const bt = (t * 2) % 1;
  for (let i = 0; i < 4; i++) {
    const on = Math.floor(t * 2) % 4 === i;
    const r = H * (on ? 0.028 + (1 - bt) * 0.012 : 0.020);
    ctx.fillStyle = on ? st.col : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(W / 2 + (i - 1.5) * H * 0.09, H * 0.60, r, 0, 7); ctx.fill();
  }

  ctx.textAlign = 'left';
  const bw2 = Math.min(W * 0.34, H * 0.7), bh2 = H * 0.13;
  drawButton(button(W / 2 - bw2 / 2, H * 0.70, bw2, bh2,
                    () => { startStage(RG.pending); }), 'はじめる！', '#FFD166');
  drawButton(button(H * 0.04, H * 0.04, H * 0.32, H * 0.09,
                    () => { openSelect(RG.pending); }), 'もどる', '#D8D4F0');
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitFont('画面を さわっても はじまるよ', W * 0.5, H * 0.04);
  ctx.fillText('画面を さわっても はじまるよ', W / 2, H * 0.87);
  ctx.textAlign = 'left';
}

// --- ミニゲームえらび -----------------------------------------------------------
//
// 50面 を 1画面に ならべると 字が つぶれるので、10面ずつ ワールドで ページに 分ける。

// 長い 名前は 2行に する（1行だと 字が ちいさくなりすぎる）
function cardName(name, cx, cy, maxW, maxH) {
  const one = fitFont(name, maxW, maxH, 'bold ');
  const sp = name.lastIndexOf(' ', Math.ceil(name.length / 2) + 1);
  if (one >= maxH * 0.72 || name.length <= 6) {
    ctx.fillText(name, cx, cy);
    return;
  }
  const cut = sp > 1 ? sp : Math.ceil(name.length / 2);
  const a = name.slice(0, cut).trim(), b = name.slice(cut).trim();
  const fs = Math.min(fitFont(a, maxW, maxH * 0.66, 'bold '),
                      fitFont(b, maxW, maxH * 0.66, 'bold '));
  ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
  ctx.fillText(a, cx, cy - fs * 0.56);
  ctx.fillText(b, cx, cy + fs * 0.56);
}

// えらぶ 画面へ。見せる ページは「つぎに やる 面」の ワールド。
function openSelect(i) {
  RG.world = worldOf(i === undefined ? nextStageIndex() : i);
  RG.screen = 'select';
}

function drawSelect() {
  ctx.fillStyle = '#241E3E'; ctx.fillRect(0, 0, W, H);
  const w = Math.max(0, Math.min(WORLDS.length - 1, RG.world || 0));
  const wd = WORLDS[w];

  // ワールドの おび
  ctx.fillStyle = wd.col + '33';
  rr(ctx, H * 0.04, H * 0.035, W - H * 0.08, H * 0.10, 12); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  fitFont(wd.name, W * 0.36, H * 0.055, 'bold ');
  ctx.fillText(wd.name, W * 0.44, H * 0.085);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const doneW = countCleared(wd.from, wd.to);
  const cnt = 'クリア ' + doneW + '/10   ぜんぶで ' + clearedCount() + '/' + STAGES.length;
  fitFont(cnt, W * 0.24, H * 0.034);
  ctx.fillText(cnt, W * 0.79, H * 0.085);

  // ← → で ワールドを かえる
  if (w > 0) {
    drawButton(button(H * 0.05, H * 0.045, H * 0.09, H * 0.08,
                      () => { RG.world = w - 1; }), '←', '#D8D4F0');
  }
  if (w < WORLDS.length - 1) {
    drawButton(button(W - H * 0.14, H * 0.045, H * 0.09, H * 0.08,
                      () => { RG.world = w + 1; }), '→', '#D8D4F0');
  }

  const cols = 5, rows = 2;
  const gapx = H * 0.024, gapy = H * 0.030;
  const cw = (W - H * 0.08 - gapx * (cols - 1)) / cols;
  const chh = Math.min(H * 0.30, (H * 0.60 - gapy * (rows - 1)) / rows);
  const gx = H * 0.04, gy = H * 0.175;
  for (let k = wd.from; k <= wd.to; k++) {
    const j = k - wd.from;
    const st = STAGES[k];
    const x = gx + (j % cols) * (cw + gapx), y = gy + ((j / cols) | 0) * (chh + gapy);
    const open = stageOpen(k);
    const rk = save.rank[st.key];
    ctx.fillStyle = open ? st.col : 'rgba(255,255,255,0.08)';
    rr(ctx, x, y, cw, chh, 14); ctx.fill();
    // ばんごう
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = open ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)';
    fitFont(String(k + 1), cw * 0.3, chh * 0.19, 'bold ');
    ctx.fillText(String(k + 1), x + cw * 0.07, y + chh * 0.07);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = open ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.32)';
    if (open) cardName(st.name, x + cw / 2, y + chh * 0.46, cw * 0.86, chh * 0.26);
    else {
      fitFont('？？？', cw * 0.7, chh * 0.26, 'bold ');
      ctx.fillText('？？？', x + cw / 2, y + chh * 0.46);
    }
    if (open) {
      if (rk !== undefined) {
        ctx.fillStyle = rk === 2 ? '#7A4A00' : 'rgba(0,0,0,0.6)';
        fitFont(RANK_NAME[rk], cw * 0.86, chh * 0.17, 'bold ');
        ctx.fillText(RANK_NAME[rk], x + cw / 2, y + chh * 0.80);
      }
      button(x, y, cw, chh, ((n) => () => { enterFullscreen(); showRule(n); })(k));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      fitFont('前を クリアすると あく', cw * 0.9, chh * 0.14);
      ctx.fillText('前を クリアすると あく', x + cw / 2, y + chh * 0.80);
    }
  }

  // ワールドの まる（いま どこか）
  const dy = gy + rows * chh + (rows - 1) * gapy + H * 0.045;
  for (let i = 0; i < WORLDS.length; i++) {
    const cx = W / 2 + (i - (WORLDS.length - 1) / 2) * H * 0.055;
    ctx.fillStyle = i === w ? WORLDS[i].col : 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(cx, dy, H * (i === w ? 0.014 : 0.010), 0, 7); ctx.fill();
    button(cx - H * 0.026, dy - H * 0.026, H * 0.052, H * 0.052,
           ((n) => () => { RG.world = n; })(i));
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(W - H * 0.40, H - H * 0.115, H * 0.34, H * 0.085,
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
  let note = 'あと すこし！ もう一度 やってみよう';
  let ncol = '#9C94B8';
  if (RG.rank >= 1) note = 'つぎの ミニゲームが あいたよ';
  else if (RG.justOpened) { note = 'つぎの ミニゲームも あけたよ。とばしても いいよ'; ncol = '#7FE0A0'; }
  else if (assistLevel() > 0) { note = 'つぎは すこし やさしくするね'; ncol = '#FFE08A'; }
  ctx.fillStyle = ncol;
  fitFont(note, W * 0.7, H * 0.042);
  ctx.fillText(note, W / 2, H * 0.75);
  ctx.textAlign = 'left';

  const bw = Math.min(W * 0.26, H * 0.55), bh = H * 0.12;
  const nx = RG.st.gi + 1;
  const canNext = nx < STAGES.length && (RG.rank >= 1 || stageOpen(nx));
  drawButton(button(W / 2 - bw * 1.55, H * 0.83, bw, bh,
                    () => { startStage(RG.st.gi); }), 'もう一度', '#FFD166');
  drawButton(button(W / 2 - bw * 0.5, H * 0.83, bw, bh,
                    () => { openSelect(RG.st.gi); }), 'えらぶ', '#D8D4F0');
  if (canNext) {
    drawButton(button(W / 2 + bw * 0.55, H * 0.83, bw, bh,
                      () => { showRule(nx); }), 'つぎへ →', '#7FE0A0');
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
function upHandler(ev) {
  if (RG.screen === 'play') rRelease();
}
canvas.addEventListener('pointerup', upHandler);
canvas.addEventListener('pointercancel', upHandler);
window.addEventListener('blur', () => { if (RG.holding) rRelease(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ほかの アプリに 行くと 画面の コマ送りが 止まるが、曲は 鳴りつづける。
// もどってきたら もう ぐちゃぐちゃ なので、いったん やめる。
document.addEventListener('visibilitychange', () => {
  if (document.hidden && RG.screen === 'play') { stopStage(); openSelect(RG.st ? RG.st.gi : 0); }
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
window.addEventListener('keyup', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
    e.preventDefault();
    if (RG.screen === 'play') rRelease();
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
  else if (RG.screen === 'rule') drawRule(tsec);
  else if (RG.screen === 'cal') drawCal();
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
