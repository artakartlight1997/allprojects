// まさきの モンスターカード。
// パックを あけて カードを あつめる ＋ 3まいで たたかう カードバトル。
//   ・パックの けんで 1パック（5まい）。さいごの 2まいは レアが でやすい
//   ・むりょうパックは 3じかんに 1回（ほんとうの じかんで たまる）
//   ・トレーナーに かつと けんが もらえる
// あつめた カードは のこる（つぎに ひらいても なくならない）。

'use strict';

const SAVE = 'monstercards.v1';
const FREE_MS = 3 * 60 * 60 * 1000;
const TYPES = {
  fire:  { name: 'ほのお', col: '#FF6A3A', bg: '#FFE0D0', icon: '🔥' },
  water: { name: 'みず', col: '#3A9AE8', bg: '#D8EEFF', icon: '💧' },
  leaf:  { name: 'くさ', col: '#4AB85A', bg: '#DDF6DA', icon: '🍃' },
  bolt:  { name: 'でんき', col: '#F0C020', bg: '#FFF6C8', icon: '⚡' },
  light: { name: 'ひかり', col: '#C88AF0', bg: '#F4E8FF', icon: '✨' },
};
// どれに つよいか（2ばい）
const STRONG = { fire: 'leaf', leaf: 'water', water: 'fire', bolt: 'water', light: null };

const NAMES = {
  fire:  ['ひのこ', 'メラっこ', 'ほむらいぬ', 'マグマうお', 'かざんがめ', 'マグマン', 'ほのおりゅう', 'サンドラ'],
  water: ['しずくん', 'ラッコン', 'セイウチくん', 'さかなっち', 'うずまきがめ', 'アクアン', 'うみりゅう', 'ネプチュー'],
  leaf:  ['はっぱん', 'もりねこ', 'はっぱじか', 'リーフィッシュ', 'こけがめ', 'きのこマン', 'もりりゅう', 'ガイアリーフ'],
  bolt:  ['ピリっこ', 'ボルねずみ', 'でんでんいぬ', 'でんきうなぎ', 'ビリがめ', 'サンダーン', 'らいりゅう', 'ゼウスター'],
  light: ['きらりん', 'つきうさ', 'ほしぎつね', 'にじくじら', 'ほしがめ', 'てんしっち', 'ひかりりゅう', 'ソラリオン'],
};
const RAR = [1, 1, 1, 2, 2, 3, 4, 5];       // 5 = ★
const SHAPE = ['blob', 'ears', 'beast', 'swim', 'shell', 'hero', 'dragon', 'legend'];

const CARDS = [];
for (const t in NAMES) NAMES[t].forEach((n, i) => {
  const r = RAR[i];
  CARDS.push({ id: CARDS.length, type: t, name: n, rar: r, shape: SHAPE[i],
    hp: 40 + r * 22 + (i % 3) * 6, atk: 12 + r * 7 + ((i + 1) % 3) * 2 });
});

const sv = store.get(SAVE, { own: {}, tickets: 5, lastFree: 0, beat: {}, packs: 0 });
if (!sv.lastFree) { sv.lastFree = Date.now() - FREE_MS; store.set(SAVE, sv); }
function save() { store.set(SAVE, sv); }
function owned(id) { return sv.own[id] || 0; }
function freeReady() { return Date.now() - sv.lastFree >= FREE_MS; }

const TRAINERS = [
  { name: 'ようちえんの こ', team: [0, 8, 16], tickets: 1, k: 0.8 },
  { name: 'となりの おにいさん', team: [1, 9, 25], tickets: 1, k: 0.95 },
  { name: 'つりびと', team: [11, 10, 12], tickets: 2, k: 1.05 },
  { name: 'もりの おねえさん', team: [19, 20, 18], tickets: 2, k: 1.15 },
  { name: 'ほのおの たつじん', team: [3, 4, 5], tickets: 2, k: 1.3 },
  { name: 'でんきやさん', team: [27, 28, 29], tickets: 3, k: 1.35 },
  { name: 'ひかりの まじょ', team: [35, 36, 37], tickets: 3, k: 1.4 },
  { name: 'チャンピオン', team: [6, 22, 38], tickets: 5, k: 1.2 },
];

const C = { mode: 'title', pack: null, book: 0, pick: [], battle: null, msg: '' };

// --- パック ------------------------------------------------------------------------

function rollRar(slot) {
  const r = Math.random();
  if (slot < 3) return r < 0.7 ? 1 : r < 0.95 ? 2 : 3;
  if (slot === 3) return r < 0.6 ? 2 : r < 0.9 ? 3 : r < 0.98 ? 4 : 5;
  return r < 0.55 ? 3 : r < 0.9 ? 4 : 5;
}
function openPack(free) {
  if (free) { if (!freeReady()) return; sv.lastFree = Date.now(); }
  else { if (sv.tickets <= 0) return; sv.tickets--; }
  const cards = [];
  for (let s = 0; s < 5; s++) {
    const rar = rollRar(s);
    const pool = CARDS.filter((c) => c.rar === rar);
    const c = pick(pool);
    cards.push({ c, isNew: !owned(c.id) && !cards.some((x) => x.c.id === c.id) });
  }
  for (const x of cards) sv.own[x.c.id] = owned(x.c.id) + 1;
  sv.packs++;
  save();
  C.pack = { cards, stage: 'tear', t: 0, shown: 0 };
  C.mode = 'pack';
  noise(0.3, 0.2, 2500);
}

// --- バトル ------------------------------------------------------------------------

function mkFighter(id, side, k) { const c = CARDS[id]; k = k || 1; const hp = Math.round(c.hp * k); return { c, hp, max: hp, atk: Math.round(c.atk * k), side, hurt: 0 }; }
function startBattle(ti) {
  const T = TRAINERS[ti];
  const mine = C.pick.length === 3 ? C.pick : bestTeam();
  C.battle = { ti, me: mine.map((id) => mkFighter(id, 0)), foe: T.team.map((id) => mkFighter(id, 1, T.k)),
    sel: null, turn: 'me', log: [T.name + 'が しょうぶを しかけてきた！'], t: 0, anim: null, over: null };
  C.mode = 'battle';
}
function bestTeam() {
  return CARDS.filter((c) => owned(c.id)).sort((a, b) => (b.hp + b.atk * 3) - (a.hp + a.atk * 3)).slice(0, 3).map((c) => c.id);
}
function mult(a, d) { return STRONG[a.type] === d.type ? 2 : STRONG[d.type] === a.type ? 0.5 : 1; }
function attack(att, def) {
  const B = C.battle, m = mult(att.c, def.c);
  const dmg = Math.max(1, Math.round(att.atk * m * rnd(0.85, 1.15)));
  B.anim = { att, def, t: 0, dmg, m };
  B.log.push(att.c.name + 'の こうげき！' + (m > 1 ? ' こうかは ばつぐん！' : m < 1 ? ' いまひとつ…' : ''));
  if (B.log.length > 3) B.log.shift();
  tone(m > 1 ? 300 : 500, 0.15, 'square', 0.12, m > 1 ? 120 : 250);
}
function resolveAnim() {
  const B = C.battle, a = B.anim;
  a.def.hp = Math.max(0, a.def.hp - a.dmg); a.def.hurt = 0.4;
  if (a.def.hp <= 0) { B.log.push(a.def.c.name + 'は たおれた！'); if (B.log.length > 3) B.log.shift(); }
  B.anim = null;
  const meAlive = B.me.some((f) => f.hp > 0), foeAlive = B.foe.some((f) => f.hp > 0);
  if (!foeAlive || !meAlive) {
    B.over = foeAlive ? 'lose' : 'win';
    if (B.over === 'win') {
      const T = TRAINERS[B.ti];
      const first = !sv.beat[B.ti];
      const got = T.tickets + (first ? 2 : 0);
      sv.tickets += got; sv.beat[B.ti] = 1; save();
      B.reward = got;
      jingle([72, 76, 79, 84, 88], 0.1, 'square', 0.14);
    } else tone(300, 0.5, 'triangle', 0.14, 100);
    return;
  }
  if (B.turn === 'me') { B.turn = 'foe'; B.t = 0.7; }
  else B.turn = 'me';
}
function foeMove() {
  const B = C.battle;
  const att = B.foe.filter((f) => f.hp > 0);
  const tg = B.me.filter((f) => f.hp > 0);
  // いちばん ダメージが でる くみあわせを えらぶ（すこし ランダム）
  let best = null, bs = -1;
  for (const a of att) for (const d of tg) {
    const s = a.atk * mult(a.c, d.c) + (d.hp < a.atk * 1.5 ? 20 : 0) + Math.random() * 8;
    if (s > bs) { bs = s; best = [a, d]; }
  }
  attack(best[0], best[1]);
}

// --- カードを かく ------------------------------------------------------------------

function drawMonArt(c, x, y, s, t) {
  const T = TYPES[c.type], col = T.col;
  const lt = '#FFFFFF';
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 3 + c.id) * s * 0.03;
  ctx.translate(0, bob);
  const eye = (ex, ey, r) => { fillC(ex, ey, r, '#FFFFFF'); fillC(ex + r * 0.15, ey + r * 0.1, r * 0.55, '#2A2028'); fillC(ex - r * 0.1, ey - r * 0.2, r * 0.22, '#FFFFFF'); };
  switch (c.shape) {
    case 'blob':
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.4); ctx.quadraticCurveTo(-s * 0.55, -s * 0.5, 0, -s * 0.5); ctx.quadraticCurveTo(s * 0.55, -s * 0.5, s * 0.5, s * 0.4); ctx.closePath(); ctx.fill();
      eye(-s * 0.16, 0, s * 0.1); eye(s * 0.16, 0, s * 0.1); break;
    case 'ears':
      for (const sg of [-1, 1]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sg * s * 0.15, -s * 0.2); ctx.lineTo(sg * s * 0.4, -s * 0.62); ctx.lineTo(sg * s * 0.45, -s * 0.1); ctx.fill(); }
      fillC(0, 0, s * 0.42, col); fillC(0, s * 0.1, s * 0.25, lt); eye(-s * 0.15, -s * 0.05, s * 0.09); eye(s * 0.15, -s * 0.05, s * 0.09); break;
    case 'beast':
      ellipse(0, s * 0.1, s * 0.5, s * 0.34); ctx.fillStyle = col; ctx.fill();
      fillC(-s * 0.3, -s * 0.15, s * 0.28, col);
      for (const lx of [-0.3, -0.05, 0.2, 0.4]) fillR(lx * s, s * 0.3, s * 0.1, s * 0.18, col);
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(s * 0.45, 0); ctx.quadraticCurveTo(s * 0.7, -s * 0.2, s * 0.55, -s * 0.45); ctx.stroke();
      eye(-s * 0.36, -s * 0.2, s * 0.08); break;
    case 'swim':
      ellipse(0, 0, s * 0.48, s * 0.3); ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.4, 0); ctx.lineTo(s * 0.68, -s * 0.25); ctx.lineTo(s * 0.68, s * 0.25); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.28); ctx.lineTo(s * 0.12, -s * 0.5); ctx.lineTo(s * 0.2, -s * 0.26); ctx.fill();
      eye(-s * 0.25, -s * 0.05, s * 0.09); break;
    case 'shell':
      ellipse(0, s * 0.05, s * 0.5, s * 0.35); ctx.fillStyle = shadeT(col); ctx.fill();
      for (let i = -1; i <= 1; i++) { ellipse(i * s * 0.22, -s * 0.02, s * 0.12, s * 0.16); ctx.fillStyle = col; ctx.fill(); }
      fillC(-s * 0.5, s * 0.05, s * 0.18, col); eye(-s * 0.52, 0, s * 0.07); break;
    case 'hero':
      fillRR(-s * 0.25, -s * 0.05, s * 0.5, s * 0.5, s * 0.12, col);
      fillC(0, -s * 0.25, s * 0.25, col); fillC(0, -s * 0.22, s * 0.18, lt);
      eye(-s * 0.08, -s * 0.24, s * 0.06); eye(s * 0.08, -s * 0.24, s * 0.06);
      fillR(-s * 0.45, 0, s * 0.2, s * 0.08, col); fillR(s * 0.25, 0, s * 0.2, s * 0.08, col);
      break;
    case 'dragon': case 'legend': {
      const big = c.shape === 'legend';
      ctx.fillStyle = shadeT(col);
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.1, -s * 0.1); ctx.lineTo(sg * s * 0.62, -s * 0.5); ctx.lineTo(sg * s * 0.5, s * 0.05); ctx.fill(); }
      ellipse(0, s * 0.12, s * 0.32, s * 0.36); ctx.fillStyle = col; ctx.fill();
      fillC(0, -s * 0.3, s * 0.24, col);
      ctx.fillStyle = '#FFF4D8';
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.1, -s * 0.48); ctx.lineTo(sg * s * 0.18, -s * 0.68); ctx.lineTo(sg * s * 0.22, -s * 0.44); ctx.fill(); }
      eye(-s * 0.09, -s * 0.32, s * 0.07); eye(s * 0.09, -s * 0.32, s * 0.07);
      if (big) { ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 3; circ(0, -s * 0.05, s * 0.62 + Math.sin(t * 3) * 3); ctx.stroke(); }
      break;
    }
  }
  ctx.restore();
}
function shadeT(c) { return c + 'CC'; }

function drawCard(c, x, y, w, t, opt) {
  opt = opt || {};
  const h = w * 1.4, T = TYPES[c.type];
  if (opt.back) {
    fillRR(x, y, w, h, w * 0.08, '#3A2A8A');
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 3; rr(x + 5, y + 5, w - 10, h - 10, w * 0.06); ctx.stroke();
    textO('M', x + w / 2, y + h / 2, w * 0.4, '#FFE066', '#1A1040');
    return;
  }
  const rare = c.rar >= 4;
  fillRR(x, y, w, h, w * 0.08, rare ? '#FFE066' : T.col);
  fillRR(x + w * 0.05, y + w * 0.05, w * 0.9, h - w * 0.1, w * 0.06, T.bg);
  if (rare) {
    // キラキラ
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    const u = (t * 0.4 + c.id * 0.1) % 1;
    g.addColorStop(Math.max(0, u - 0.15), 'rgba(255,255,255,0)'); g.addColorStop(u, 'rgba(255,255,255,0.55)'); g.addColorStop(Math.min(1, u + 0.15), 'rgba(255,255,255,0)');
    ctx.fillStyle = g; rr(x + w * 0.05, y + w * 0.05, w * 0.9, h - w * 0.1, w * 0.06); ctx.fill();
  }
  text(c.name, x + w / 2, y + w * 0.15, w * 0.12, '#2A2440', 'center', true, w * 0.8);
  fillRR(x + w * 0.1, y + w * 0.26, w * 0.8, w * 0.6, w * 0.04, 'rgba(255,255,255,0.7)');
  drawMonArt(c, x + w / 2, y + w * 0.6, w * 0.48, t);
  text(T.icon, x + w * 0.19, y + w * 0.35, w * 0.12, '#5A4A6A', 'center');
  text('HP ' + (opt.hp || c.hp), x + w / 2, y + w * 0.97, w * 0.11, '#E8283A', 'center', true, w * 0.8);
  text('こうげき ' + (opt.atk || c.atk), x + w / 2, y + w * 1.11, w * 0.1, '#2A2440', 'center', true, w * 0.8);
  const rs = c.rar === 5 ? '★' : '◆'.repeat(c.rar);
  text(rs, x + w / 2, y + h - w * 0.11, w * 0.1, c.rar === 5 ? '#E8A020' : '#8A7AB0', 'center');
  if (opt.dim) { fillRR(x, y, w, h, w * 0.08, 'rgba(20,10,40,0.55)'); }
}

// --- がめん --------------------------------------------------------------------------

function header(title) {
  ctx.fillStyle = grad(0, VH, '#3A2A7A', '#1A1040'); ctx.fillRect(0, 0, VW, VH);
  text(title, VW / 2, 40, 28, '#FFFFFF', 'center');
  btn(14, 14, 110, 48, 'もどる', () => { C.mode = 'title'; }, { col: '#D8D0F0', size: 18 });
  text('🎫 ' + sv.tickets, VW - 20, 38, 24, '#FFE066', 'right');
}

function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#3A2A7A', '#1A1040'); ctx.fillRect(0, 0, VW, VH);
  const show = [6, 14, 30, 39, 22];
  show.forEach((id, i) => {
    ctx.save(); ctx.translate(VW / 2 + (i - 2) * 150, 270 + Math.abs(i - 2) * 20); ctx.rotate((i - 2) * 0.12);
    drawCard(CARDS[id], -60, -84, 120, t); ctx.restore();
  });
  text('まさきの', VW / 2, 40, 24, '#FFFFFF', 'center');
  textO('モンスターカード', VW / 2, 96, 56, '#FFE066', '#1A1040');
  const have = CARDS.filter((c) => owned(c.id)).length;
  btn(VW / 2 - 330, 410, 200, 90, 'パックを あける', () => { C.mode = 'shop'; }, { col: '#FFE066', sub: '🎫 ' + sv.tickets + (freeReady() ? '・むりょう あり！' : '') });
  btn(VW / 2 - 100, 410, 200, 90, 'ずかん', () => { C.mode = 'book'; }, { col: '#D8F0FF', sub: have + ' / ' + CARDS.length });
  btn(VW / 2 + 130, 410, 200, 90, 'バトル', () => { C.mode = 'trainers'; C.pick = bestTeam(); }, { col: '#FFC0D0', off: have < 3, sub: have < 3 ? '3まい いるよ' : 'けんを もらおう' });
}

function drawShop(t) {
  header('パックを あける');
  // パック
  const px = VW / 2 - 90, py = 90;
  ctx.save(); ctx.translate(px + 90, py + 150); ctx.rotate(Math.sin(t * 2) * 0.03);
  fillRR(-90, -130, 180, 260, 16, '#E8508A');
  fillRR(-80, -120, 160, 240, 12, '#FF8FB8');
  for (let i = 0; i < 3; i++) drawMonArt(CARDS[[6, 22, 38][i]], -40 + i * 40, -10 + (i % 2) * 20, 60, t);
  textO('モンスター パック', 0, 90, 20, '#FFFFFF', '#8A1A4A');
  ctx.restore();
  const free = freeReady();
  btn(VW / 2 - 300, 420, 260, 80, free ? 'むりょうで あける！' : 'むりょう まで', () => openPack(true),
      { off: !free, col: '#9AF0B8', sub: free ? '3じかんに 1回' : fmtLeft(FREE_MS - (Date.now() - sv.lastFree)) });
  btn(VW / 2 + 40, 420, 260, 80, 'けんで あける', () => openPack(false), { off: sv.tickets <= 0, col: '#FFE066', sub: '🎫 1まい つかう（のこり ' + sv.tickets + '）' });
  text('バトルで かつと けんが もらえるよ', VW / 2, 520, 18, '#C8B8E0', 'center');
}

function drawPack(t, dt) {
  const P = C.pack;
  ctx.fillStyle = grad(0, VH, '#2A1A5A', '#0E0820'); ctx.fillRect(0, 0, VW, VH);
  P.t += dt;
  if (P.stage === 'tear') {
    const u = Math.min(1, P.t / 0.9);
    ctx.save(); ctx.translate(VW / 2, VH / 2);
    fillRR(-90, -130 + u * 10, 180, 260, 16, '#E8508A');
    fillRR(-90, -130 - u * 60, 180, 40, 10, '#C83A6A');
    ctx.restore();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; fillC(VW / 2 + Math.cos(a) * u * 200, VH / 2 + Math.sin(a) * u * 200, 4, 'rgba(255,230,120,' + (1 - u) + ')'); }
    if (P.t > 1) { P.stage = 'show'; P.t = 0; }
    textO('ビリビリ…', VW / 2, 70, 30, '#FFFFFF');
    return;
  }
  // 1まいずつ めくる
  const w = Math.min(150, (VW - 80) / 5 - 14);
  P.cards.forEach((x, i) => {
    const cx = VW / 2 - (5 * (w + 14) - 14) / 2 + i * (w + 14), cy = 120;
    const open = i < P.shown;
    drawCard(x.c, cx, cy, w, t, { back: !open });
    if (open && x.isNew) textO('NEW!', cx + w / 2, cy - 14, 20, '#FF6FA8', '#FFFFFF');
    if (open && x.c.rar >= 4) { ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3; for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57; star(cx + w / 2 + Math.cos(a) * w * 0.7, cy + w * 0.7 + Math.sin(a) * w * 0.8, 8); ctx.fillStyle = '#FFE066'; ctx.fill(); } ctx.globalAlpha = 1; }
  });
  if (P.shown < 5) {
    textO('タップで めくる！', VW / 2, VH - 70, 28, '#FFE066');
    if (P.auto && P.t > 0.35) { P.t = 0; flipNext(); }
  } else {
    btn(VW / 2 - 230, VH - 110, 220, 70, 'もう1パック', () => { C.mode = 'shop'; }, { col: '#FFE066' });
    btn(VW / 2 + 10, VH - 110, 220, 70, 'ずかんを 見る', () => { C.mode = 'book'; }, { col: '#D8F0FF' });
  }
}
function flipNext() {
  const P = C.pack;
  if (P.shown >= 5) return;
  const c = P.cards[P.shown].c;
  P.shown++;
  if (c.rar >= 4) jingle([79, 84, 88, 91], 0.07, 'square', 0.14);
  else tone(700 + c.rar * 100, 0.08, 'triangle', 0.1);
}

function drawBook(t) {
  header('ずかん（' + CARDS.filter((c) => owned(c.id)).length + ' / ' + CARDS.length + '）');
  const types = Object.keys(TYPES);
  types.forEach((ty, i) => btn(140 + i * ((VW - 300) / 5), 72, (VW - 300) / 5 - 8, 40, TYPES[ty].icon + TYPES[ty].name, () => { C.book = i; },
    { col: C.book === i ? TYPES[ty].col : '#F4F0FF', size: 16 }));
  const list = CARDS.filter((c) => c.type === types[C.book]);
  const w = Math.min(104, (VW - 60) / 8 - 10);
  list.forEach((c, i) => {
    const x = VW / 2 - (8 * (w + 10) - 10) / 2 + i * (w + 10), y = 150;
    if (owned(c.id)) { drawCard(c, x, y, w, t); text('×' + owned(c.id), x + w / 2, y + w * 1.4 + 16, 16, '#FFFFFF', 'center'); }
    else { fillRR(x, y, w, w * 1.4, 8, 'rgba(255,255,255,0.1)'); text('？', x + w / 2, y + w * 0.7, 40, 'rgba(255,255,255,0.4)', 'center'); }
  });
  text('◆ ふつう　◆◆ すこし レア　◆◆◆ レア　◆◆◆◆ ちょうレア　★ でんせつ', VW / 2, 400, 16, '#C8B8E0', 'center', false, VW - 40);
  text('つよい：🔥→🍃→💧→🔥　⚡→💧　（✨は ふつう）', VW / 2, 430, 18, '#FFE0B0', 'center', false, VW - 40);
}

function drawTrainers(t) {
  header('だれと たたかう？');
  // じぶんの チーム
  text('じぶんの 3まい', 30, 84, 18, '#FFE0B0', 'left', false, 250);
  C.pick.forEach((id, i) => drawCard(CARDS[id], 30 + i * 84, 100, 76, t));
  btn(30, 222, 240, 44, 'チームを えらぶ', () => { C.mode = 'team'; }, { col: '#D8F0FF', size: 18 });
  const bw = Math.min(290, (VW - 320) / 2 - 10);
  TRAINERS.forEach((T, i) => {
    const x = 300 + (i % 2) * (bw + 10), y = 80 + Math.floor(i / 2) * 104;
    const op = i === 0 || sv.beat[i - 1];
    btn(x, y, bw, 94, '', () => { if (op) startBattle(i); }, { col: op ? (sv.beat[i] ? '#E0FFE8' : '#FFFFFF') : 'rgba(120,110,140,0.4)' });
    text((i + 1) + '. ' + (op ? T.name : '？？？'), x + 14, y + 24, 19, '#2A2440', 'left', true, bw - 20);
    if (op) T.team.forEach((id, k) => { const c = CARDS[id]; fillC(x + 30 + k * 34, y + 62, 14, TYPES[c.type].col); text(TYPES[c.type].icon, x + 30 + k * 34, y + 62, 13, '#FFFFFF', 'center'); });
    text(sv.beat[i] ? 'かった！ 🎫+' + T.tickets : '🎫 +' + (T.tickets + 2), x + bw - 12, y + 62, 16, sv.beat[i] ? '#2A8A4A' : '#8A5A2A', 'right');
  });
}

function drawTeam(t) {
  header('3まい えらんでね');
  const have = CARDS.filter((c) => owned(c.id));
  // ぜんぶ がめんに はいる おおきさ に する
  let w = 76, cols = 1;
  for (; w > 40; w -= 2) { cols = Math.floor((VW - 40) / (w + 8)); if (80 + Math.ceil(have.length / cols) * (w * 1.4 + 10) < VH - 76) break; }
  have.forEach((c, i) => {
    const x = 20 + (i % cols) * (w + 8), y = 80 + Math.floor(i / cols) * (w * 1.4 + 10);
    const on = C.pick.indexOf(c.id) >= 0;
    drawCard(c, x, y, w, t, { dim: !on && C.pick.length >= 3 });
    const b = btn(x, y, w, w * 1.4, '', () => {
      const k = C.pick.indexOf(c.id);
      if (k >= 0) C.pick.splice(k, 1); else if (C.pick.length < 3) C.pick.push(c.id);
    }, { flat: 1, col: 'rgba(0,0,0,0)' });
    void b;
    if (on) { ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4; rr(x - 2, y - 2, w + 4, w * 1.4 + 4, 8); ctx.stroke(); textO(String(C.pick.indexOf(c.id) + 1), x + w - 10, y + 10, 20, '#FFE066'); }
  });
  btn(VW - 200, VH - 70, 180, 56, 'けってい', () => { if (C.pick.length === 3) C.mode = 'trainers'; }, { off: C.pick.length !== 3, col: '#FFE066' });
}

function drawBattle(t, dt) {
  const B = C.battle;
  ctx.fillStyle = grad(0, VH, '#4A6AA8', '#2A3A6A'); ctx.fillRect(0, 0, VW, VH);
  ellipse(VW / 2, VH * 0.52, VW * 0.48, 40); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  const w = 104;
  const pos = (side, i) => ({ x: VW / 2 - 1.5 * (w + 24) + 12 + i * (w + 24), y: side ? 18 : VH - w * 1.4 - 70 });
  const drawSide = (arr, side) => arr.forEach((f, i) => {
    const p = pos(side, i);
    let ox = 0, oy = 0;
    if (B.anim && B.anim.att === f) { const u = Math.sin(Math.min(1, B.anim.t / 0.45) * Math.PI); oy = (side ? 1 : -1) * u * 60; }
    if (f.hurt > 0) { ox = Math.sin(f.hurt * 60) * 6; f.hurt -= dt; }
    ctx.globalAlpha = f.hp > 0 ? 1 : 0.3;
    drawCard(f.c, p.x + ox, p.y + oy, w, t, { hp: f.max, atk: f.atk });
    ctx.globalAlpha = 1;
    fillRR(p.x, p.y + w * 1.4 + 4, w, 12, 6, 'rgba(0,0,0,0.4)');
    fillRR(p.x, p.y + w * 1.4 + 4, w * f.hp / f.max, 12, 6, f.hp < f.max * 0.3 ? '#FF6A6A' : '#7FE0A0');
    text(f.hp + '/' + f.max, p.x + w / 2, p.y + w * 1.4 + 26, 14, '#FFFFFF', 'center');
    if (!side && B.sel === f) { ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 5; rr(p.x - 4, p.y - 4, w + 8, w * 1.4 + 8, 10); ctx.stroke(); }
    if (side && B.sel && f.hp > 0 && B.turn === 'me' && !B.anim) {
      const m = mult(B.sel.c, f.c);
      textO(m > 1 ? 'ばつぐん！' : m < 1 ? 'いまひとつ' : '', p.x + w / 2, p.y + w * 0.62, 20, m > 1 ? '#FFE066' : '#C8C8D8');
    }
    f._p = p;
  });
  drawSide(B.foe, 1); drawSide(B.me, 0);
  // じょうほう
  fillRR(14, 208, VW - 28, 106, 12, 'rgba(0,0,0,0.4)');
  B.log.forEach((l, i) => text(l, 30, 234 + i * 30, 17, '#FFFFFF', 'left', false, VW - 300));
  text(TRAINERS[B.ti].name, VW - 30, 240, 20, '#FFE0B0', 'right', true, 230);
  if (!B.over) text(B.turn === 'me' ? (B.sel ? 'あいてを タップ！' : 'じぶんの カードを タップ') : 'あいての ばん…', VW - 30, 282, 18, '#FFFFFF', 'right', true, 230);
  // うごき
  if (B.anim) { B.anim.t += dt; if (B.anim.t > 0.45 && !B.anim.hit) { B.anim.hit = 1; noise(0.12, 0.2, 1200); } if (B.anim.t > 0.7) resolveAnim(); }
  else if (!B.over && B.turn === 'foe') { B.t -= dt; if (B.t <= 0) foeMove(); }
  btn(VW - 130, VH - 60, 116, 46, 'にげる', () => { C.mode = 'trainers'; }, { col: '#D8D0F0', size: 17 });
  if (B.over) {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.55)');
    textO(B.over === 'win' ? 'かった！' : 'まけちゃった…', VW / 2, 190, 60, B.over === 'win' ? '#FFE066' : '#FFB0B0');
    if (B.over === 'win') text('パックの けん 🎫 +' + B.reward, VW / 2, 260, 28, '#FFFFFF', 'center');
    else text('タイプの あいしょうを かんがえて チームを かえてみよう', VW / 2, 260, 20, '#FFFFFF', 'center');
    btn(VW / 2 - 230, 310, 220, 70, 'パックへ', () => { C.mode = 'shop'; }, { col: '#FFE066' });
    btn(VW / 2 + 10, 310, 220, 70, 'トレーナー', () => { C.mode = 'trainers'; }, { col: '#D8D0F0' });
  }
}

function battleTap(x, y) {
  const B = C.battle;
  if (!B || B.over || B.turn !== 'me' || B.anim) return;
  for (const f of B.me) if (f.hp > 0 && f._p && inBox(x, y, { x: f._p.x, y: f._p.y, w: 104, h: 146 })) { B.sel = f; tone(800, 0.04, 'square', 0.06); return; }
  if (B.sel) for (const f of B.foe) if (f.hp > 0 && f._p && inBox(x, y, { x: f._p.x, y: f._p.y, w: 104, h: 146 })) { attack(B.sel, f); B.sel = null; return; }
}

let _lt = 0;
startGame({
  bg: '#1A1040',
  draw(t) {
    const dt = Math.min(0.05, t - _lt); _lt = t;
    if (C.mode === 'title') drawTitle(t);
    else if (C.mode === 'shop') drawShop(t);
    else if (C.mode === 'pack') drawPack(t, dt);
    else if (C.mode === 'book') drawBook(t);
    else if (C.mode === 'trainers') drawTrainers(t);
    else if (C.mode === 'team') drawTeam(t);
    else if (C.mode === 'battle') drawBattle(t, dt);
  },
  down(x, y) {
    if (C.mode === 'pack' && C.pack.stage === 'show') { if (C.pack.shown < 5) flipNext(); }
    else if (C.mode === 'battle') battleTap(x, y);
  },
});
