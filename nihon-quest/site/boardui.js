// すごろく画面とミニゲーム画面の絵。

'use strict';

const BOARD_COL = {
  none: '#e4e0d4',       // まだ だれのものでもない
  mine: '#ffb3c9',       // りなのカード
  rival: '#a8bde8',      // パパのカード
  goal: '#ffd166',
  pick: '#8fe0a8',       // 行ける県
};

const boardView = { x: 0, y: 0, s: 0 };

// りな・パパのコマ
function drawToken(ctx, x, y, r, who, bob) {
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(bob)) * r * 0.4);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.28, 0, 0, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fill();
  if (who === 'you') {
    ctx.fillStyle = '#ff7fa8';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3b32';
    ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.92, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffe3d0';
    ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.62, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#6f8ed0';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#3c4a63';
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffe3d0';
    ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2d3648'; ctx.lineWidth = Math.max(1.2, r * 0.11);
    ctx.beginPath(); ctx.arc(-r * 0.24, r * 0.08, r * 0.22, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.24, r * 0.08, r * 0.22, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = '#33262b';
  ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.1, r * 0.09, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.2, r * 0.1, r * 0.09, 0, 7); ctx.fill();
  ctx.restore();
}

function boardMapColors() {
  const opts = { base: BOARD_COL.none, fills: {} };
  for (const p of PREFS) {
    if (board.cards[p.id]) opts.fills[p.id] = BOARD_COL.mine;
    else if (board.rivalCards[p.id]) opts.fills[p.id] = BOARD_COL.rival;
    if (board.scope && !board.scope.includes(p.region)) opts.fills[p.id] = '#f0eee8';
  }
  if (board.goal) opts.fills[board.goal] = BOARD_COL.goal;
  if (board.phase === 'choose') {
    for (const id of board.choices) opts.fills[id] = BOARD_COL.pick;
    // もくてきちに届くときは、ひと目で分かるようにする
    if (board.choices.includes(board.goal)) opts.fills[board.goal] = '#ff9c3d';
  }
  return opts;
}

function drawBoard(dt) {
  const t = view.h;
  ctx.fillStyle = '#eef4f7';
  ctx.fillRect(0, 0, view.w, view.h);

  const s = Math.min(view.w * 0.55, view.h * 0.99);
  const mx = 0, my = (view.h - s) / 2;
  boardView.x = mx; boardView.y = my; boardView.s = s;

  drawJapanMap(ctx, mx, my, s, boardMapColors());

  const q = s / PREF_QUANT;
  const px = id => mx + PREF_BY_ID[id].cx * q;
  const py = id => my + PREF_BY_ID[id].cy * q;

  // 道（となり合う県を結ぶ線）。ぜんぶ薄く描いてから、
  // 今いる県から出ている道だけ濃くする。どこへ行けるかが分かりやすい
  const here = board.who === 'you' ? board.pos : board.rivalPos;
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? 'rgba(40,90,150,0.75)' : 'rgba(70,100,140,0.30)';
    ctx.lineWidth = Math.max(1, s * (pass ? 0.008 : 0.003));
    for (const p of PREFS) {
      for (const a of p.adj) {
        if (a < p.id) continue;
        const near = p.id === here || a === here;
        if (pass ? !near : near) continue;
        // 海をわたる道（沖縄への航路など）は点線にして、陸つづきと区別する
        const far = Math.hypot(px(a) - px(p.id), py(a) - py(p.id)) > s * 0.08;
        ctx.setLineDash(far ? [s * 0.012, s * 0.012] : []);
        ctx.beginPath();
        ctx.moveTo(px(p.id), py(p.id));
        ctx.lineTo(px(a), py(a));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  // マスの点
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeStyle = 'rgba(60,90,130,0.5)';
  ctx.lineWidth = Math.max(0.8, s * 0.002);
  for (const p of PREFS) {
    ctx.beginPath();
    ctx.arc(px(p.id), py(p.id), s * 0.008, 0, 7);
    ctx.fill(); ctx.stroke();
  }

  // 行ける県に光る丸
  if (board.phase === 'choose') {
    const g = Math.sin(game.t * 6) * 0.5 + 0.5;
    for (const id of board.choices) {
      const isGoal = id === board.goal;
      ctx.beginPath();
      ctx.arc(px(id), py(id), s * ((isGoal ? 0.028 : 0.020) + g * 0.006), 0, 7);
      ctx.fillStyle = isGoal ? 'rgba(230,120,20,' + (0.7 + g * 0.3) + ')'
                             : 'rgba(40,150,90,' + (0.55 + g * 0.35) + ')';
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, s * 0.004);
      ctx.stroke();
    }
    if (board.choices.includes(board.goal)) {
      ctx.strokeStyle = 'rgba(230,120,20,' + (0.4 + g * 0.5) + ')';
      ctx.lineWidth = Math.max(2, s * 0.008);
      ctx.beginPath();
      ctx.arc(px(board.goal), py(board.goal), s * (0.05 + g * 0.02), 0, 7);
      ctx.stroke();
    }
  }

  // もくてきちの旗
  if (board.goal) {
    const gx = px(board.goal), gy = py(board.goal);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = Math.max(1.5, s * 0.005);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - s * 0.06); ctx.stroke();
    ctx.fillStyle = '#e8503f';
    ctx.beginPath();
    ctx.moveTo(gx, gy - s * 0.06);
    ctx.lineTo(gx + s * 0.045, gy - s * 0.048);
    ctx.lineTo(gx, gy - s * 0.035);
    ctx.closePath(); ctx.fill();
  }

  // コマ（移動中は道すじにそって動く）
  const r = s * 0.024;
  const same = board.pos === board.rivalPos;
  let youX = px(board.pos) - (same ? r : 0), youY = py(board.pos);
  let rivX = px(board.rivalPos) + (same ? r : 0), rivY = py(board.rivalPos);
  if (board.phase === 'anim' && board.path.length) {
    board.animT += dt * 3.4;
    const i = Math.min(board.path.length - 1, Math.floor(board.animT));
    const f = Math.min(1, board.animT - i);
    const from = i === 0 ? (board.who === 'you' ? board.pos : board.rivalPos)
                         : board.path[i - 1];
    const to = board.path[i];
    const ax = px(from) + (px(to) - px(from)) * f;
    const ay = py(from) + (py(to) - py(from)) * f;
    if (board.who === 'you') { youX = ax; youY = ay; } else { rivX = ax; rivY = ay; }
    if (board.animT >= board.path.length) {
      board.phase = 'land';
      landOn(board.path[board.path.length - 1]);
    }
  }
  drawToken(ctx, rivX, rivY, r, 'rival', game.t * 3 + 1);
  drawToken(ctx, youX, youY, r, 'you',
            board.phase === 'anim' && board.who === 'you' ? game.t * 14 : game.t * 3);

  drawBoardPanel(dt);
  if (board.phase === 'message' && board.msg) drawBoardMsg();
}

function drawBoardPanel(dt) {
  const t = view.h;
  const x0 = boardView.x + boardView.s + t * 0.01;
  const w = view.w - x0 - t * 0.03;

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#26374f';
  fitFont('りなの全国制覇', w, t * 0.075, 'bold ');
  ctx.fillText('りなの全国制覇', x0, t * 0.03);

  ctx.fillStyle = '#5f7185';
  ctx.font = Math.round(t * 0.034) + 'px system-ui, sans-serif';
  ctx.fillText(scopeLabel() + '　' + board.turn + 'ターン目', x0, t * 0.125);

  // カードの数くらべ
  const rowY = t * 0.19;
  const bar = (i, label, cards, coins, col) => {
    const y = rowY + i * t * 0.115;
    ctx.fillStyle = col;
    rr(ctx, x0, y, w, t * 0.1, t * 0.02); ctx.fill();
    ctx.fillStyle = '#20293a';
    ctx.font = 'bold ' + Math.round(t * 0.04) + 'px system-ui, sans-serif';
    ctx.fillText(label, x0 + w * 0.04, y + t * 0.012);
    ctx.font = Math.round(t * 0.033) + 'px system-ui, sans-serif';
    ctx.fillText('カード ' + cards + '/' + boardTotal() +
                 '　コイン ' + coins.toLocaleString(), x0 + w * 0.04, y + t * 0.058);
  };
  bar(0, 'りな', cardCount('you'), board.coins, BOARD_COL.mine);
  bar(1, 'パパ', cardCount('rival'), board.rivalCoins, BOARD_COL.rival);

  // もくてきち
  const gy = rowY + t * 0.245;
  ctx.fillStyle = '#fff3d4';
  rr(ctx, x0, gy, w, t * 0.115, t * 0.02); ctx.fill();
  ctx.fillStyle = '#8a6a20';
  ctx.font = Math.round(t * 0.032) + 'px system-ui, sans-serif';
  ctx.fillText('もくてきち（先に着いたら +' + GOAL_BONUS + '）', x0 + w * 0.04, gy + t * 0.012);
  ctx.fillStyle = '#20293a';
  const gname = board.goal ? PREF_BY_ID[board.goal].name : '-';
  fitFont(gname, w * 0.9, t * 0.05, 'bold ');
  ctx.fillText(gname, x0 + w * 0.04, gy + t * 0.052);

  // サイコロと案内
  const by = gy + t * 0.145;
  const bh = t * 0.14;
  if (board.phase === 'ready' && board.who === 'you') {
    drawButton(button(x0, by, w * 0.62, bh, rollDice), 'サイコロを ふる', '#ffd166');
  } else if (board.phase === 'choose') {
    ctx.fillStyle = '#26374f';
    ctx.font = 'bold ' + Math.round(t * 0.052) + 'px system-ui, sans-serif';
    ctx.fillText('サイコロ ' + board.dice + '！', x0, by + t * 0.01);
    ctx.font = Math.round(t * 0.034) + 'px system-ui, sans-serif';
    const canGoal = board.choices.includes(board.goal);
    ctx.fillStyle = canGoal ? '#c0691a' : '#5f7185';
    ctx.fillText(canGoal ? 'オレンジ＝もくてきち！ いまなら着けるよ'
                         : 'みどりの県を タップしてね', x0, by + t * 0.075);
  } else if (board.who === 'rival') {
    ctx.fillStyle = '#4a5f80';
    ctx.font = 'bold ' + Math.round(t * 0.046) + 'px system-ui, sans-serif';
    ctx.fillText('パパの ばん…' + (board.dice ? ' ' + board.dice : ''), x0, by + t * 0.03);
  }

  // サイコロの目
  if (board.dice) {
    const ds = t * 0.13, dx = x0 + w - ds, dy = by;
    ctx.fillStyle = '#fff';
    rr(ctx, dx, dy, ds, ds, ds * 0.22); ctx.fill();
    ctx.strokeStyle = '#c8ccd6'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e8503f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(ds * 0.62) + 'px system-ui, sans-serif';
    ctx.fillText(String(board.dice), dx + ds / 2, dy + ds / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  const qh = t * 0.09;
  drawButton(button(x0, view.h - qh - t * 0.03, w * 0.46, qh, () => {
    saveBoard(); game.screen = 'title';
  }), 'ちゅうだん', '#dfe4ec');
  drawButton(button(x0 + w * 0.5, view.h - qh - t * 0.03, w * 0.5, qh, () => {
    game.screen = 'book';
  }), 'スタンプ帳', '#bfe8c8');
}

function drawBoardMsg() {
  const t = view.h, m = board.msg;
  ctx.fillStyle = 'rgba(10,16,30,0.55)';
  ctx.fillRect(0, 0, view.w, view.h);
  const w = Math.min(view.w * 0.8, t * 1.7), h = t * 0.62;
  const x = (view.w - w) / 2, y = (view.h - h) / 2;
  ctx.fillStyle = '#fdfbf4';
  rr(ctx, x, y, w, h, t * 0.04); ctx.fill();
  ctx.fillStyle = m.color;
  rr(ctx, x, y, w, t * 0.14, t * 0.04); ctx.fill();
  ctx.fillRect(x, y + t * 0.09, w, t * 0.05);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  fitFont(m.title, w * 0.9, t * 0.06, 'bold ');
  ctx.fillText(m.title, x + w / 2, y + t * 0.07);

  ctx.fillStyle = '#28374d';
  m.lines.forEach((s, i) => {
    fitFont(s, w * 0.88, t * 0.042);
    ctx.fillText(s, x + w / 2, y + t * 0.22 + i * t * 0.062);
  });

  const bw = w * 0.42, bh = t * 0.1;
  drawButton(button(x + (w - bw) / 2, y + h - bh - t * 0.035, bw, bh, () => {
    const then = m.then; board.msg = null; then();
  }), 'つぎへ', '#ffd166');
}

// ---------------------------------------------------------------- 全国制覇

function drawConquer() {
  const t = view.h;
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, '#1d2b52'); g.addColorStop(1, '#e0743f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  // 花火
  for (let i = 0; i < 7; i++) {
    const ph = game.t * 0.7 + i * 1.3;
    const k = ph % 2.2 / 2.2;
    const cx = (i * 173 % Math.max(1, view.w - 80)) + 40;
    const cy = view.h * (0.12 + (i % 3) * 0.12);
    ctx.globalAlpha = Math.max(0, 1 - k) * 0.85;
    ctx.strokeStyle = ['#ffd166', '#ff8fa0', '#8fd0ff', '#c8ff9f'][i % 4];
    ctx.lineWidth = 2.5;
    for (let a = 0; a < 12; a++) {
      const an = a / 12 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(an) * k * 40, cy + Math.sin(an) * k * 40);
      ctx.lineTo(cx + Math.cos(an) * k * 66, cy + Math.sin(an) * k * 66);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const ms = Math.min(view.w * 0.4, view.h * 0.8);
  drawJapanMap(ctx, view.w * 0.05, (view.h - ms) / 2, ms, { base: BOARD_COL.mine });

  const lx = view.w * 0.05 + ms + t * 0.05;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  fitFont('ぜんこく せいは！', view.w - lx - t * 0.04, t * 0.1, 'bold ');
  ctx.fillText('ぜんこく せいは！', lx, t * 0.12);
  ctx.fillStyle = '#ffe9a8';
  const lines = ['47 都道府県 ぜんぶの カードを あつめた！',
                 'コイン ' + board.coins.toLocaleString() + ' まい',
                 'せいはした回数 ' + save.conquered + ' 回',
                 'おぼえた県 ' + masteryTotal() + ' / 47'];
  lines.forEach((s, i) => {
    fitFont(s, view.w - lx - t * 0.04, t * 0.045);
    ctx.fillText(s, lx, t * 0.3 + i * t * 0.065);
  });
  const bw = t * 0.5, bh = t * 0.12;
  drawButton(button(lx, t * 0.75, bw, bh, () => { game.screen = 'title'; }),
             'タイトルへ', '#ffd166');
}

// ---------------------------------------------------------------- ミニゲーム

function drawMiniFrame(title, sub) {
  const t = view.h;
  ctx.fillStyle = 'rgba(12,20,36,0.55)';
  ctx.fillRect(0, 0, view.w, t * 0.11);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.round(t * 0.045) + 'px system-ui, sans-serif';
  ctx.fillText(title, t * 0.03, t * 0.055);
  ctx.font = Math.round(t * 0.032) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#cfe0f5';
  ctx.textAlign = 'right';
  ctx.fillText(sub, view.w - view.w * 0.3 - t * 0.05, t * 0.057);
  ctx.textAlign = 'left';

  // のこり時間
  const bw = view.w * 0.26, bx = view.w - bw - t * 0.03;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  rr(ctx, bx, t * 0.037, bw, t * 0.035, t * 0.018); ctx.fill();
  const left = Math.max(0, 1 - mini.t / mini.limit);
  ctx.fillStyle = left > 0.3 ? '#8fe0a8' : '#ff9c7a';
  rr(ctx, bx, t * 0.037, Math.max(2, bw * left), t * 0.035, t * 0.018); ctx.fill();
}

function drawMiniOver() {
  const t = view.h;
  ctx.fillStyle = 'rgba(10,16,30,0.6)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.round(t * 0.1) + 'px system-ui, sans-serif';
  ctx.fillText('おわり！', view.w / 2, view.h * 0.45);
  ctx.font = Math.round(t * 0.05) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('スコア ' + mini.score, view.w / 2, view.h * 0.58);
}

function drawMini(dt) {
  const t = view.h;
  if (mini.kind === 'catch') drawCatch();
  else if (mini.kind === 'quiz3') drawQuiz3();
  else if (mini.kind === 'run') drawRun();
  else if (mini.kind === 'order') drawOrder();
  if (mini.over) drawMiniOver();
}

function drawCatch() {
  const t = view.h;
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, '#8fd0ef'); g.addColorStop(1, '#dff2ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = '#9ed17f';
  ctx.fillRect(0, view.h * 0.92, view.w, view.h * 0.08);

  for (const it of mini.items) {
    const x = it.x * view.w, y = it.y * view.h;
    const r = t * 0.045;
    ctx.globalAlpha = it.hit ? Math.max(0, it.hit / 0.4) : 1;
    ctx.fillStyle = it.ok ? '#ffd166' : '#c8ccd6';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = it.ok ? '#e0a63a' : '#98a2b3';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#26374f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(it.text, view.w * 0.19, t * 0.032, 'bold ');
    ctx.fillText(it.text, x, y + r * 1.5);
    if (it.hit && it.msg) {
      ctx.fillStyle = it.ok ? '#2f9c56' : '#d0483f';
      ctx.font = 'bold ' + Math.round(t * 0.07) + 'px system-ui, sans-serif';
      ctx.fillText(it.msg, x, y - r * 1.4);
    }
    ctx.globalAlpha = 1;
  }

  // かご
  const bx = mini.basket * view.w, by = view.h * 0.88;
  ctx.fillStyle = '#c8874a';
  rr(ctx, bx - view.w * 0.075, by, view.w * 0.15, t * 0.1, t * 0.02); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(bx - view.w * 0.075, by, view.w * 0.15, 4);
  drawRina(ctx, bx, by - t * 0.02, t * 0.075, 1, game.t * 4, {});

  drawMiniFrame(mini.pref.name + ' の めいさんキャッチ',
                'とった ' + mini.score + ' こ');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20,40,60,0.6)';
  ctx.font = Math.round(t * 0.035) + 'px system-ui, sans-serif';
  ctx.fillText('ゆびで かごを うごかそう。' + mini.pref.name + ' の名産だけ とってね',
               view.w / 2, view.h * 0.16);
}

function drawQuiz3() {
  const t = view.h;
  ctx.fillStyle = '#f6f2e6';
  ctx.fillRect(0, 0, view.w, view.h);
  drawMiniFrame(mini.pref.name + ' はやおしクイズ',
                (mini.qi + 1) + ' 問目 / 3　せいかい ' + mini.score);
  const q = mini.q;
  if (!q) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#22304a';
  fitFont(q.prompt, view.w * 0.9, t * 0.07, 'bold ');
  ctx.fillText(q.prompt, view.w / 2, t * 0.16);

  const mediaW = q.media ? view.w * 0.3 : 0;
  const top = t * 0.3, bottom = view.h - t * 0.04;
  if (q.media) {
    const mh = bottom - top;
    const size = Math.min(mediaW, mh) * 0.95;
    if (q.media.type === 'shape') {
      drawPrefShape(ctx, PREF_BY_ID[q.media.id], t * 0.03 + mediaW / 2,
                    (top + bottom) / 2, size, '#4f7dc0', '#22304a', 2.5);
    } else {
      drawJapanMap(ctx, t * 0.03 + (mediaW - size) / 2, (top + bottom) / 2 - size / 2,
                   size, { hi: q.media.hi, marks: q.media.marks, base: '#dfe8d6' });
    }
  }
  const cx0 = t * 0.03 + mediaW + (q.media ? t * 0.03 : 0);
  const cw = view.w - cx0 - t * 0.03;
  const gap = t * 0.015;
  const ch = (bottom - top - gap) / 2;
  for (let i = 0; i < 4; i++) {
    const bx = cx0 + (i % 2) * (cw / 2);
    const by = top + ((i / 2) | 0) * (ch + gap);
    const bw = cw / 2 - gap;
    let col = '#fff';
    if (mini.qResult) {
      if (i === q.answer) col = '#a8e6b4';
      else col = '#eceff4';
    } else {
      const idx = i;
      ui.buttons.push({ x: bx, y: by, w: bw, h: ch, on: () => miniAnswer(idx) });
    }
    ctx.fillStyle = col;
    rr(ctx, bx, by, bw, ch, t * 0.022); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#22304a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (q.choiceKind === 'shape') {
      drawPrefShape(ctx, PREF_BY_ID[q.choices[i]], bx + bw / 2, by + ch / 2,
                    Math.min(bw, ch) * 0.72, '#4f7dc0', '#22304a', 2);
    } else if (q.choiceKind === 'mark') {
      ctx.fillStyle = MARK_COLORS[i];
      ctx.beginPath(); ctx.arc(bx + bw / 2, by + ch / 2, ch * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(ch * 0.4) + 'px system-ui, sans-serif';
      ctx.fillText(String(i + 1), bx + bw / 2, by + ch / 2);
    } else {
      fitFont(q.choices[i], bw * 0.88, ch * 0.44, 'bold ');
      ctx.fillText(q.choices[i], bx + bw / 2, by + ch / 2);
    }
  }
  if (mini.qResult) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = mini.qResult === 1 ? 'rgba(60,160,100,0.95)' : 'rgba(70,95,140,0.95)';
    const bw2 = view.w * 0.5, bh2 = t * 0.16;
    rr(ctx, (view.w - bw2) / 2, view.h * 0.42, bw2, bh2, t * 0.03); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(t * 0.06) + 'px system-ui, sans-serif';
    ctx.fillText(mini.qResult === 1 ? 'せいかい！' : 'ざんねん',
                 view.w / 2, view.h * 0.42 + bh2 * 0.35);
    ctx.font = Math.round(t * 0.034) + 'px system-ui, sans-serif';
    fitFont(answerNote(q), bw2 * 0.92, t * 0.034);
    ctx.fillText(answerNote(q), view.w / 2, view.h * 0.42 + bh2 * 0.72);
  }
}

function drawRun() {
  const t = view.h, r = mini.run;
  // 2段ジャンプでかなり高くまで上がるので、たてに余裕をとる
  const tile = view.h / 8.5;
  const camX = r.x - 3.5;
  const groundY = view.h * 0.80;

  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, '#7fc2ea'); g.addColorStop(1, '#dff0ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 260 - camX * tile * 0.3) % (view.w + 260)) - 60;
    ctx.beginPath(); ctx.ellipse(cx, view.h * 0.2, 60, 22, 0, 0, 7); ctx.fill();
  }

  for (let c = Math.max(0, Math.floor(camX) - 1); c < r.len; c++) {
    const x = (c - camX) * tile;
    if (x > view.w) break;
    if (r.gap[c]) continue;
    ctx.fillStyle = r.theme.soil;
    ctx.fillRect(x, groundY, tile + 1, view.h - groundY);
    ctx.fillStyle = r.theme.ground;
    ctx.fillRect(x, groundY, tile + 1, tile * 0.3);
  }
  // ゴール
  const gx = (r.len - 3 - camX) * tile;
  if (gx < view.w + 60) {
    ctx.fillStyle = '#8a5fc4';
    ctx.fillRect(gx, groundY - tile * 2.4, tile * 0.14, tile * 2.4);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(gx + tile * 0.14, groundY - tile * 2.4);
    ctx.lineTo(gx + tile * 1.2, groundY - tile * 2.1);
    ctx.lineTo(gx + tile * 0.14, groundY - tile * 1.7);
    ctx.closePath(); ctx.fill();
  }
  for (const c of r.coin) {
    if (c.got) continue;
    const x = (c.x - camX) * tile, y = groundY - c.y * tile - tile * 0.3;
    if (x < -40 || x > view.w + 40) continue;
    ctx.fillStyle = '#f6c728';
    ctx.beginPath();
    ctx.ellipse(x, y, tile * 0.2 * Math.abs(Math.sin(game.t * 3 + c.x)), tile * 0.22, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#fff0a8'; ctx.lineWidth = 2; ctx.stroke();
  }
  // 高く跳んでも画面から消えないようにする
  const ry = Math.max(tile * 0.9, groundY + r.y * tile - tile * 0.55);
  drawRina(ctx, (r.x - camX) * tile, ry, tile * 0.62, 1, game.t * 8, {});

  drawMiniFrame(mini.pref.region + ' を はしってゴール',
                'コイン ' + mini.score);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20,40,60,0.6)';
  ctx.font = Math.round(t * 0.035) + 'px system-ui, sans-serif';
  ctx.fillText('画面を タップで ジャンプ（2回まで）', view.w / 2, view.h * 0.17);
}

function drawOrder() {
  const t = view.h;
  ctx.fillStyle = '#f2f6ee';
  ctx.fillRect(0, 0, view.w, view.h);
  drawMiniFrame('きたから じゅんに タップ', mini.picked.length + ' / 4');

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = mini.wrongT > 0 ? '#d0483f' : '#3a4a63';
  ctx.font = 'bold ' + Math.round(t * 0.05) + 'px system-ui, sans-serif';
  ctx.fillText(mini.wrongT > 0 ? 'ちがうよ！ もっと 北の県から'
                               : '北（上）にある県から じゅんに タップしてね',
               view.w / 2, t * 0.15);

  const n = mini.order.length;
  const cw = view.w / n;
  for (let i = 0; i < n; i++) {
    const p = mini.order[i];
    const x = i * cw, y = t * 0.26, w = cw * 0.9, h = view.h - t * 0.32;
    const bx = x + (cw - w) / 2;
    const idx = mini.picked.indexOf(p.id);
    ctx.fillStyle = idx >= 0 ? '#a8e6b4' : '#fff';
    rr(ctx, bx, y, w, h, t * 0.03); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();
    if (idx < 0) {
      const id = p.id;
      ui.buttons.push({ x: bx, y, w, h, on: () => orderPick(id) });
    }
    drawPrefShape(ctx, p, bx + w / 2, y + h * 0.42, Math.min(w, h) * 0.55,
                  idx >= 0 ? '#4a9c68' : '#8fb6e0', '#3a4560', 2);
    ctx.fillStyle = '#22304a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    fitFont(p.name, w * 0.9, t * 0.042, 'bold ');
    ctx.fillText(p.name, bx + w / 2, y + h - t * 0.02);
    if (idx >= 0) {
      ctx.fillStyle = '#2f7a4e';
      ctx.textBaseline = 'top';
      ctx.font = 'bold ' + Math.round(t * 0.06) + 'px system-ui, sans-serif';
      ctx.fillText(String(idx + 1), bx + w / 2, y + t * 0.02);
    }
  }
}
