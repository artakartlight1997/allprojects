// まさきの ことばあて。
// ひらがな 4もじの ことばを 6回 までに あてる（Wordle と おなじ あそび かた）。
//   みどり … もじも ばしょも あってる
//   きいろ … その もじは はいってる けど ばしょが ちがう
//   はいいろ … その もじは はいって いない
// 「きょうの もんだい」は 1日 1もん（だれが やっても おなじ こたえ）。とちゅうで とじても つづきから。
// 「れんしゅう」は なんかいでも。

'use strict';

const SAVE = 'kotobaate.v1';
const LEN = 4, TRIES = 6;
const CAT_ICON = { 'たべもの': '🍙', 'いきもの': '🦁', 'うみ・かわの いきもの': '🐟', 'もの・おもちゃ': '🧸', 'しぜん・はな': '🌻' };
const LIST = [];
for (const c in WORDS) for (const w of WORDS[c].split(' ')) LIST.push({ w, c });

// きまった じゅんばんに まぜる（まいにち の もんだい よう）
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const DAILY = (() => { const r = seeded(20260924), a = LIST.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
function dayNo() { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 86400000); }
function dailyWord(n) { return DAILY[((n % DAILY.length) + DAILY.length) % DAILY.length]; }

const sv = Object.assign({ daily: null, practice: null, stats: { played: 0, wins: 0, streak: 0, best: 0, last: -1, dist: [0, 0, 0, 0, 0, 0] }, pwins: 0 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }

// キーボード（五十音ひょう。あ の れつ が いちばん みぎ）
const COLS = [
  'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
  'はひふへほ', 'まみむめも', 'や ゆ よ', 'らりるれろ', 'わをんー ',
];
const DAKU = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
const HANDA = { ば: 'ぱ', び: 'ぴ', ぶ: 'ぷ', べ: 'ぺ', ぼ: 'ぽ' };
const SMALL = { つ: 'っ', や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' };

const G = { mode: 'title', game: null, input: '', shake: 0, msg: '', msgT: 0, flip: null, over: 0, confetti: [] };

// --- ゲームの しんこう -------------------------------------------------------------

function newGame(kind) {
  if (kind === 'daily') {
    const n = dayNo();
    if (!sv.daily || sv.daily.day !== n) sv.daily = { day: n, guesses: [], done: 0, win: 0, hint: -1 };
    G.game = sv.daily; G.ans = dailyWord(n);
  } else {
    if (!sv.practice || sv.practice.done) {
      let a; do a = pick(LIST); while (sv.practice && a.w === sv.practice.w);
      sv.practice = { w: a.w, c: a.c, guesses: [], done: 0, win: 0, hint: -1 };
    }
    G.game = sv.practice; G.ans = { w: sv.practice.w, c: sv.practice.c };
  }
  G.kind = kind; G.input = ''; G.flip = null; G.over = G.game.done ? 1 : 0; G.confetti = [];
  G.mode = 'play';
  save();
}

// こたえと くらべる：2 = みどり、1 = きいろ、0 = はいいろ
function score(guess, ans) {
  const g = [...guess], a = [...ans], res = [0, 0, 0, 0], left = {};
  for (let i = 0; i < LEN; i++) { if (g[i] === a[i]) res[i] = 2; else left[a[i]] = (left[a[i]] || 0) + 1; }
  for (let i = 0; i < LEN; i++) if (res[i] !== 2 && left[g[i]]) { res[i] = 1; left[g[i]]--; }
  return res;
}
function keyState() {
  const st = {};
  for (const gs of G.game.guesses) { const r = score(gs, G.ans.w); [...gs].forEach((ch, i) => { st[ch] = Math.max(st[ch] === undefined ? -1 : st[ch], r[i]); }); }
  return st;
}
function say(s) { G.msg = s; G.msgT = 2; }

function typeKana(ch) {
  if (!canType()) return;
  if ([...G.input].length >= LEN) return;
  G.input += ch;
  tone(600 + [...G.input].length * 60, 0.05, 'triangle', 0.08);
}
function modLast(kind) {
  if (!canType() || !G.input) return;
  const a = [...G.input], c = a[a.length - 1];
  let n = c;
  if (kind === 'daku') {
    // か → が → か、は → ば → ぱ → は
    const back = {};
    for (const k in DAKU) back[DAKU[k]] = k;
    const hb = {}; for (const k in HANDA) hb[HANDA[k]] = k;
    if (DAKU[c]) n = DAKU[c];
    else if (HANDA[c]) n = HANDA[c];
    else if (hb[c]) n = back[hb[c]];
    else if (back[c]) n = back[c];
  } else {
    const back = {}; for (const k in SMALL) back[SMALL[k]] = k;
    n = SMALL[c] || back[c] || c;
  }
  if (n === c) { tone(200, 0.06, 'square', 0.05); return; }
  a[a.length - 1] = n; G.input = a.join('');
  tone(900, 0.05, 'triangle', 0.08);
}
function backspace() { if (!canType() || !G.input) return; G.input = [...G.input].slice(0, -1).join(''); tone(300, 0.05, 'triangle', 0.06); }
function canType() { return G.mode === 'play' && !G.flip && !G.game.done; }

function enter() {
  if (!canType()) return;
  const n = [...G.input].length;
  if (n < LEN) { G.shake = 0.4; say(LEN + 'もじ いれてね'); tone(180, 0.15, 'square', 0.08); return; }
  if (/^[ーっゃゅょ]/.test(G.input)) { G.shake = 0.4; say('その もじから は はじまらないよ'); return; }
  const g = G.input;
  G.game.guesses.push(g); G.input = '';
  G.flip = { row: G.game.guesses.length - 1, t: 0, res: score(g, G.ans.w) };
  save();
}
function finishFlip() {
  const r = G.flip.res, gm = G.game;
  G.flip = null;
  const win = r.every((x) => x === 2);
  if (win || gm.guesses.length >= TRIES) {
    gm.done = 1; gm.win = win ? 1 : 0;
    if (G.kind === 'daily') {
      const s = sv.stats;
      s.played++;
      if (win) { s.wins++; s.dist[gm.guesses.length - 1]++; s.streak = s.last === gm.day - 1 ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak); }
      else s.streak = 0;
      s.last = win ? gm.day : -1;
    } else if (win) sv.pwins++;
    save();
    if (win) {
      jingle([72, 76, 79, 84, 88, 91], 0.08, 'square', 0.14);
      for (let i = 0; i < 80; i++) G.confetti.push({ x: rnd(0, VW), y: rnd(-200, 0), vx: rnd(-40, 40), vy: rnd(80, 200), c: pick(['#FF6A8A', '#FFE066', '#6AD0FF', '#8AE08A', '#C88AF0']), r: rnd(0, 6) });
    } else tone(260, 0.6, 'triangle', 0.12, 130);
    G.over = 0.01;
  }
}
function useHint() {
  const gm = G.game;
  if (gm.done || gm.hint >= 0) return;
  // まだ みどりに なって いない ばしょを 1つ おしえる
  const green = new Set();
  for (const gs of gm.guesses) score(gs, G.ans.w).forEach((x, i) => { if (x === 2) green.add(i); });
  const cand = [0, 1, 2, 3].filter((i) => !green.has(i));
  if (!cand.length) return;
  gm.hint = pick(cand);
  save();
  jingle([84, 88], 0.08, 'triangle', 0.1);
}

// --- え -----------------------------------------------------------------------------

const COL = { 2: '#4CB86A', 1: '#E8B830', 0: '#8A9098' };

function tile(x, y, s, ch, state, flipU) {
  // flipU：0〜1 で くるっと まわる
  let sy = 1, st = state;
  if (flipU !== undefined) { sy = Math.abs(Math.cos(flipU * Math.PI)); if (flipU < 0.5) st = -1; }
  ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.scale(1, Math.max(0.02, sy));
  const bg = st === -1 || st === undefined ? '#FFFFFF' : COL[st];
  fillRR(-s / 2, -s / 2, s, s, s * 0.14, bg);
  ctx.strokeStyle = st === -1 || st === undefined ? (ch ? '#5A6A70' : '#C8D0D4') : 'rgba(0,0,0,0.12)'; ctx.lineWidth = 3;
  rr(-s / 2, -s / 2, s, s, s * 0.14); ctx.stroke();
  if (ch) text(ch, 0, 2, s * 0.58, st === -1 || st === undefined ? '#2A3438' : '#FFFFFF', 'center', true);
  ctx.restore();
}

function layout() {
  const ts = Math.min(60, Math.floor((VH - 150) / TRIES) - 8);
  const bw = LEN * (ts + 8) - 8;
  const kx0 = Math.max(bw + 70, VW * 0.36);
  return { ts, bx: 30 + (kx0 - 40 - bw) / 2, by: 100, kx0 };
}

function drawPlay(t, dt) {
  const gm = G.game, L = layout();
  ctx.fillStyle = grad(0, VH, '#E6F4EE', '#CDE8DC'); ctx.fillRect(0, 0, VW, VH);
  btn(12, 12, 96, 44, 'もどる', () => { G.mode = 'title'; }, { col: '#FFFFFF', size: 17 });
  text(G.kind === 'daily' ? 'きょうの もんだい' : 'れんしゅう', 120, 34, 20, '#2A5A4A', 'left', true);
  // ヒント（カテゴリ）
  fillRR(L.bx - 10, 62, L.ts * 4 + 44, 32, 16, '#FFFFFF');
  text('ヒント：' + CAT_ICON[G.ans.c] + ' ' + G.ans.c, L.bx + L.ts * 2 + 12, 78, 16, '#2A5A4A', 'center', true, L.ts * 4 + 30);
  // ばん
  const sh = G.shake > 0 ? Math.sin(G.shake * 60) * 8 : 0;
  for (let r = 0; r < TRIES; r++) {
    const y = L.by + r * (L.ts + 8);
    const g = gm.guesses[r];
    const cur = r === gm.guesses.length && !gm.done;
    const res = g ? score(g, G.ans.w) : null;
    for (let i = 0; i < LEN; i++) {
      const x = L.bx + i * (L.ts + 8) + (cur ? sh : 0);
      if (g) {
        let u;
        if (G.flip && G.flip.row === r) { u = clamp((G.flip.t - i * 0.3) / 0.35, 0, 1); if (u >= 1) u = undefined; }
        tile(x, y, L.ts, [...g][i], res[i], u);
      } else if (cur) {
        const ch = [...G.input][i];
        if (!ch && gm.hint === i) { ctx.globalAlpha = 0.35; tile(x, y, L.ts, [...G.ans.w][i], 2); ctx.globalAlpha = 1; }
        else tile(x, y, L.ts, ch);
      } else tile(x, y, L.ts, '');
    }
  }
  if (G.flip) { G.flip.t += dt; if (G.flip.t > 0.3 * (LEN - 1) + 0.4) finishFlip(); }
  if (G.shake > 0) G.shake -= dt;
  // キーボード
  drawKeys(L, t);
  if (G.msgT > 0) { G.msgT -= dt; ctx.globalAlpha = Math.min(1, G.msgT * 2); fillRR(L.bx - 20, VH / 2 - 26, L.ts * 4 + 64, 52, 14, 'rgba(30,40,40,0.85)'); text(G.msg, L.bx + L.ts * 2 + 12, VH / 2, 18, '#FFFFFF', 'center', true, L.ts * 4 + 50); ctx.globalAlpha = 1; }
  if (gm.done) drawResult(t, dt);
}

function drawKeys(L, t) {
  const st = keyState();
  const x0 = L.kx0, x1 = VW - 16;
  const cols = COLS.length + 1;
  const kw = Math.min(64, (x1 - x0 - (cols - 1) * 5) / cols), kh = Math.min(62, kw * 1.05);
  const y0 = 30;
  // みぎから あ か さ …
  COLS.forEach((col, ci) => {
    const x = x1 - (ci + 1) * (kw + 5) + 5;
    [...col].forEach((ch, ri) => {
      if (ch === ' ') return;
      const y = y0 + ri * (kh + 6);
      const s = st[ch];
      btn(x, y, kw, kh, ch, () => typeKana(ch), { col: s === undefined ? '#FFFFFF' : s === 2 ? COL[2] : s === 1 ? COL[1] : '#B8BEC4', tc: s === undefined ? '#2A3438' : '#FFFFFF', size: Math.min(30, kw * 0.55), flat: 0 });
    });
  });
  // ひだりはしの れつ：゛゜ と 小さい もじ
  const xs = x1 - (COLS.length + 1) * (kw + 5) + 5;
  btn(xs, y0, kw, kh * 2 + 6, '゛゜', () => modLast('daku'), { col: '#DDEFFF', size: Math.min(30, kw * 0.6) });
  btn(xs, y0 + 2 * (kh + 6), kw, kh * 2 + 6, '小', () => modLast('small'), { col: '#DDEFFF', size: Math.min(30, kw * 0.6) });
  // した：けす・ヒント・こたえる
  const yb = y0 + 5 * (kh + 6) + 8, bw = x1 - xs;
  btn(xs, yb, bw * 0.26, 64, 'けす', backspace, { col: '#FFD8D8', size: 22 });
  btn(xs + bw * 0.28, yb, bw * 0.26, 64, 'ヒント', useHint, { col: '#FFF2B0', size: 20, off: G.game.hint >= 0 || G.game.done, sub: G.game.hint >= 0 ? 'つかった' : '1回だけ' });
  btn(xs + bw * 0.56, yb, bw * 0.44, 64, 'こたえる！', enter, { col: '#8AE0A8', size: 24, off: [...G.input].length < LEN });
}

function drawResult(t, dt) {
  const gm = G.game;
  G.over = Math.min(1, G.over + dt * 1.5);
  for (const c of G.confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 4; if (c.y > VH + 20) c.y = -10; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); fillR(-5, -3, 10, 6, c.c); ctx.restore(); }
  if (G.over < 0.6 && !G.closed) return;
  if (G.closed) {
    btn(VW / 2 - 100, VH - 70, 200, 56, 'けっかを 見る', () => { G.closed = 0; }, { col: '#FFE066', size: 20 });
    return;
  }
  fillR(0, 0, VW, VH, 'rgba(20,40,30,0.55)');
  const w = Math.min(560, VW - 40), x = VW / 2 - w / 2;
  fillRR(x, 50, w, 440, 24, '#FFFFFF');
  textO(gm.win ? 'せいかい！' : 'ざんねん…', VW / 2, 100, 44, gm.win ? '#FFB020' : '#8A9AB0', '#FFFFFF');
  text('こたえ', VW / 2, 150, 18, '#6A7A80', 'center');
  [...G.ans.w].forEach((ch, i) => tile(VW / 2 - 2 * 68 + i * 68 + 4, 166, 60, ch, 2));
  text(CAT_ICON[G.ans.c] + ' ' + G.ans.c, VW / 2, 250, 20, '#2A5A4A', 'center', true);
  if (gm.win) text(gm.guesses.length + '回め で あたり！', VW / 2, 282, 20, '#2A3438', 'center');
  if (G.kind === 'daily') {
    const s = sv.stats;
    const it = [['あそんだ', s.played], ['かち', s.wins], ['れんぞく', s.streak], ['さいこう', s.best]];
    it.forEach(([l, v], i) => { const cx = VW / 2 + (i - 1.5) * 110; text(String(v), cx, 318, 28, '#2A5A4A', 'center', true); text(l, cx, 346, 14, '#6A7A80', 'center'); });
    text('つぎの もんだいは あした！', VW / 2, 378, 16, '#6A7A80', 'center');
    btn(VW / 2 - 230, 404, 220, 66, 'れんしゅう する', () => newGame('practice'), { col: '#FFE066', size: 20 });
    btn(VW / 2 + 10, 404, 220, 66, 'ばんを 見る', () => { G.closed = 1; }, { col: '#DDEFFF', size: 20 });
  } else {
    text('れんしゅうで あてた かず：' + sv.pwins, VW / 2, 330, 18, '#2A3438', 'center');
    btn(VW / 2 - 230, 390, 220, 70, 'つぎの もんだい', () => newGame('practice'), { col: '#FFE066', size: 22 });
    btn(VW / 2 + 10, 390, 220, 70, 'ばんを 見る', () => { G.closed = 1; }, { col: '#DDEFFF', size: 20 });
  }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#3A6A5A', '#1E3A32'); ctx.fillRect(0, 0, VW, VH);
  text('まさきの', VW / 2, 50, 26, '#E6F4EE', 'center', true);
  const demo = ['ひ', 'ま', 'わ', 'り'], sts = [2, 1, 0, 2];
  demo.forEach((ch, i) => { const u = clamp((t * 0.8 % 4) - i * 0.25, 0, 1); tile(VW / 2 - 2 * 84 + i * 84 + 6, 84, 72, ch, sts[i], u >= 1 ? undefined : u); });
  textO('ことばあて', VW / 2, 200, 54, '#FFE066', '#1E3A32');
  // いろの せつめい
  const ex = [[2, 'みどり：もじも ばしょも あってる'], [1, 'きいろ：もじは ある けど ばしょが ちがう'], [0, 'はいいろ：その もじは ない']];
  ex.forEach(([s, l], i) => { fillRR(VW / 2 - 230, 246 + i * 36, 28, 28, 6, COL[s]); text(l, VW / 2 - 190, 260 + i * 36, 17, '#E6F4EE', 'left', false, 420); });
  const today = sv.daily && sv.daily.day === dayNo() ? sv.daily : null;
  btn(VW / 2 - 290, 380, 280, 100, 'きょうの もんだい', () => newGame('daily'), { col: '#FFE066', sub: today ? (today.done ? (today.win ? 'クリア！ もういちど 見る' : 'また あした') : 'つづきから（' + today.guesses.length + '回め）') : '1日 1もん' });
  btn(VW / 2 + 10, 380, 280, 100, 'れんしゅう', () => newGame('practice'), { col: '#8AE0A8', sub: sv.practice && !sv.practice.done && sv.practice.guesses.length ? 'つづきから' : 'なんかいでも' });
  text('れんぞく ' + sv.stats.streak + '日 ・ さいこう ' + sv.stats.best + '日', VW / 2, 510, 16, '#A8C8BC', 'center');
}

let _lt = 0;
startGame({
  bg: '#1E3A32',
  draw(t) {
    const dt = Math.min(0.05, t - _lt); _lt = t;
    if (G.mode === 'title') drawTitle(t);
    else drawPlay(t, dt);
  },
  key(code, down) {
    if (!down || G.mode !== 'play') return;
    if (code === 'Enter') enter();
    else if (code === 'Backspace') backspace();
  },
});
// パソコンの キーボード から ひらがなを うつ（IME で へんかん した もじ も うけとる）
window.addEventListener('keydown', (e) => {
  if (G.mode !== 'play' || e.isComposing) return;
  if (e.key && e.key.length === 1 && /[ぁ-んー]/.test(e.key)) typeKana(e.key);
});
