// りなの おえかきスタジオ
//
// ★ かち まけの ない どうぐ。すきなだけ 描いて、6まいまで のこせる。
//
// ★ 気もちよさの ために
//     ・線は「ゆびの 通った ところ」を まるく つないで 描く（かくかく しない）
//     ・「かがみ」を おすと 左右 そっくりに 描ける（もようが かんたんに 作れる）
//     ・「もどす」は 1本ずつ 消える ので 安心
//     ・絵は 線の ならびで のこす（画像に しない ので 小さくて 速い）

'use strict';

const GAME_VER = 1;
const HUD = 26;
const BAR = 118;           // 左の どうぐ ばこの はば
const MAXPT = 9000;        // これ いじょうは 描けない（保存が 大きく なりすぎる）

const PALETTE = [
  '#2A2830', '#FFFFFF', '#E8434A', '#FF7AA8', '#F0A03A', '#FFD24A',
  '#7ADC80', '#3AAE6A', '#5AC8E8', '#4A7AE8', '#B07AE8', '#8A5A3A',
];
const WIDTHS = [3, 8, 18];
const BGS = ['#FFFDF6', '#FFF0F6', '#EAF6FF', '#F0FAE8', '#2A2438'];
const STAMPS = ['star', 'flower', 'apple', 'cat', 'bear', 'cake'];

const SAVE_KEY = 'draw.save.v1';
const save = { slots: [null, null, null, null, null, null], made: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (Array.isArray(s.slots)) for (let i = 0; i < 6; i++) save.slots[i] = s.slots[i] || null;
  if (typeof s.made === 'number') save.made = s.made;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0,
  strokes: [], cur: null, col: '#E8434A', w: 1, bg: 0,
  mirror: false, tool: 'pen', stamp: 0,
  msg: '', msgT: 0, pts: 0, slot: -1,
};

function canvasBox() {
  return { x: BAR + 8, y: HUD + 6, w: VW - BAR - 18, h: VH - HUD - 14 };
}
function say(s) { G.msg = s; G.msgT = 1.6; }

// --- おえかき -----------------------------------------------------------------------

function countPts() {
  let n = 0;
  for (const s of G.strokes) n += s.p ? s.p.length / 2 : 2;
  return n;
}

function beginStroke(x, y) {
  if (G.pts > MAXPT) { say('もう いっぱい！ 「ぜんぶ 消す」か のこして ね'); return; }
  if (G.tool === 'stamp') {
    G.strokes.push({ k: STAMPS[G.stamp], x: x, y: y, s: 12 + G.w * 12, c: G.col, m: G.mirror });
    G.pts += 2;
    sfxTap();
    return;
  }
  G.cur = { c: G.tool === 'eraser' ? null : G.col, w: WIDTHS[G.w] * (G.tool === 'eraser' ? 2.2 : 1),
            m: G.mirror, p: [x, y] };
  G.strokes.push(G.cur);
}
function extendStroke(x, y) {
  if (!G.cur) return;
  const p = G.cur.p;
  const lx = p[p.length - 2], ly = p[p.length - 1];
  if (Math.hypot(x - lx, y - ly) < 2.2) return;
  p.push(x, y);
  G.pts++;
}
function endStroke() { G.cur = null; }

function undo() {
  if (!G.strokes.length) return;
  G.strokes.pop();
  G.pts = countPts();
  sfxJump();
}
function clearAll() {
  G.strokes = []; G.cur = null; G.pts = 0;
  say('まっさら に した');
  sfxNg();
}

function saveTo(i) {
  save.slots[i] = { bg: G.bg, s: G.strokes };
  save.made++;
  storeSave();
  G.slot = i;
  say((i + 1) + 'ばんに のこした！');
  sfxClear(false);
}
function loadFrom(i) {
  const d = save.slots[i];
  if (!d) { G.strokes = []; G.bg = 0; G.pts = 0; say('まだ なにも ない'); return; }
  G.bg = d.bg || 0;
  G.strokes = JSON.parse(JSON.stringify(d.s || []));
  G.cur = null;
  G.pts = countPts();
  G.slot = i;
  say((i + 1) + 'ばんを ひらいた');
  sfxGet();
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'draw') return;
  const B = canvasBox();
  const inside = (x, y) => x > B.x && x < B.x + B.w && y > B.y && y < B.y + B.h;
  if (IN.taps.length) {
    const t = IN.taps[IN.taps.length - 1];
    if (inside(t.x, t.y)) beginStroke(t.x, t.y);
  }
  if (IN.hold && G.cur) {
    if (inside(IN.x, IN.y)) extendStroke(IN.x, IN.y);
  }
  if (!IN.hold) endStroke();
}

// --- 絵 -----------------------------------------------------------------------------

function paintStrokes(B, strokes, bg) {
  ctx.save();
  rr(B.x, B.y, B.w, B.h, 10); ctx.clip();
  ctx.fillStyle = BGS[bg || 0];
  ctx.fillRect(B.x, B.y, B.w, B.h);
  const mx = B.x + B.w / 2;
  for (const s of strokes) {
    const reps = s.m ? [1, -1] : [1];
    for (const r of reps) {
      if (s.k) {
        const it = ITEM_BY[s.k];
        if (!it) continue;
        const x = r === 1 ? s.x : mx * 2 - s.x;
        it.draw(x, s.y, s.s, s.c);
        continue;
      }
      if (!s.p || s.p.length < 2) continue;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = s.w;
      ctx.strokeStyle = s.c || BGS[bg || 0];
      ctx.beginPath();
      for (let i = 0; i < s.p.length; i += 2) {
        const x = r === 1 ? s.p[i] : mx * 2 - s.p[i];
        if (i === 0) ctx.moveTo(x, s.p[i + 1]); else ctx.lineTo(x, s.p[i + 1]);
      }
      if (s.p.length === 2) {
        const x = r === 1 ? s.p[0] : mx * 2 - s.p[0];
        ctx.moveTo(x, s.p[1]); ctx.lineTo(x + 0.1, s.p[1]);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTool() {
  const B = canvasBox();
  bgGrad('#F4F0E8', '#DCD4C8');
  // キャンバス
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rr(B.x + 3, B.y + 4, B.w, B.h, 10); ctx.fill();
  paintStrokes(B, G.strokes, G.bg);
  ctx.strokeStyle = '#8A7A66'; ctx.lineWidth = 3;
  rr(B.x, B.y, B.w, B.h, 10); ctx.stroke();
  if (G.mirror) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(120,110,150,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(B.x + B.w / 2, B.y); ctx.lineTo(B.x + B.w / 2, B.y + B.h);
    ctx.stroke();
    ctx.restore();
  }

  // どうぐ ばこ
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  rr(6, HUD + 6, BAR - 4, VH - HUD - 14, 10); ctx.fill();
  let y = HUD + 12;
  // 色
  const cs = 24;
  for (let i = 0; i < PALETTE.length; i++) {
    const x = 12 + (i % 4) * (cs + 4);
    const cy = y + Math.floor(i / 4) * (cs + 4);
    const b = button(x, cy, cs, cs, () => { G.col = PALETTE[i]; G.tool = G.tool === 'eraser' ? 'pen' : G.tool; });
    ctx.fillStyle = PALETTE[i];
    rr(b.x, b.y, cs, cs, 5); ctx.fill();
    ctx.strokeStyle = G.col === PALETTE[i] && G.tool !== 'eraser' ? '#FF3A6A' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = G.col === PALETTE[i] ? 3 : 1;
    rr(b.x, b.y, cs, cs, 5); ctx.stroke();
  }
  y += 3 * (cs + 4) + 6;
  // ふとさ
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * 34;
    const b = button(x, y, 30, 30, () => { G.w = i; G.tool = G.tool === 'stamp' ? 'pen' : G.tool; });
    ctx.fillStyle = G.w === i ? '#FFD24A' : 'rgba(0,0,0,0.08)';
    rr(b.x, b.y, 30, 30, 7); ctx.fill();
    ctx.fillStyle = '#3A3038';
    circle(b.x + 15, b.y + 15, WIDTHS[i] / 2 + 1); ctx.fill();
  }
  y += 36;
  // ペン / けしゴム / スタンプ / かがみ
  const tools = [['ペン', 'pen'], ['けす', 'eraser'], ['スタンプ', 'stamp']];
  for (let i = 0; i < tools.length; i++) {
    const b = button(12, y + i * 30, BAR - 24, 26, () => { G.tool = tools[i][1]; });
    drawButton(b, tools[i][0], G.tool === tools[i][1] ? '#FFD24A' : '#E8E0D0');
  }
  y += 3 * 30 + 2;
  drawButton(button(12, y, BAR - 24, 26, () => { G.mirror = !G.mirror; }),
             G.mirror ? 'かがみ ON' : 'かがみ OFF', G.mirror ? '#8AD8F0' : '#E8E0D0');
  y += 30;
  // スタンプ えらび
  if (G.tool === 'stamp') {
    for (let i = 0; i < STAMPS.length; i++) {
      const x = 12 + (i % 3) * 34, sy = y + Math.floor(i / 3) * 34;
      const b = button(x, sy, 30, 30, () => { G.stamp = i; });
      ctx.fillStyle = G.stamp === i ? '#FFD24A' : 'rgba(0,0,0,0.06)';
      rr(b.x, b.y, 30, 30, 7); ctx.fill();
      ITEM_BY[STAMPS[i]].draw(b.x + 15, b.y + 15, 10, G.col);
    }
    y += 70;
  }
  // かみの 色
  for (let i = 0; i < BGS.length; i++) {
    const x = 12 + i * 21;
    const b = button(x, y, 18, 18, () => { G.bg = i; });
    ctx.fillStyle = BGS[i];
    rr(b.x, b.y, 18, 18, 4); ctx.fill();
    ctx.strokeStyle = G.bg === i ? '#FF3A6A' : 'rgba(0,0,0,0.3)';
    ctx.lineWidth = G.bg === i ? 3 : 1;
    rr(b.x, b.y, 18, 18, 4); ctx.stroke();
  }
  y += 24;
  drawButton(button(12, y, (BAR - 28) / 2, 26, () => undo()), 'もどす', '#C8D8F0');
  drawButton(button(12 + (BAR - 28) / 2 + 4, y, (BAR - 28) / 2, 26, () => clearAll()), '消す', '#F0C8C8');
  y += 30;
  drawButton(button(12, y, BAR - 24, 26, () => { G.screen = 'album'; }), 'アルバム', '#D8C8F0');

  drawHud();
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, B.x + B.w / 2, B.y + 18, 17, '#5A4A3A');
    ctx.globalAlpha = 1;
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(60,50,44,0.9)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText('りなの おえかき', 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#F0E8DC';
  ctx.fillText('線 ' + G.strokes.length + '　のこり ' + Math.max(0, MAXPT - G.pts), 128, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(VW - 96, 2, 86, HUD - 4, () => { G.screen = 'title'; }), 'メニュー', 'rgba(255,255,255,0.85)');
}

function drawAlbum() {
  bgGrad('#F4F0E8', '#DCD4C8');
  bigText('アルバム（6まい）', VW / 2, 34, 24, '#5A4A3A');
  bigText('えらぶと ひらく。「ここに のこす」で いまの 絵を 入れる', VW / 2, 58, 14, '#7A6A5A', null);
  const cols = 3, cw = Math.min(190, (VW - 60) / cols), chh = cw * 0.62;
  for (let i = 0; i < 6; i++) {
    const x = (VW - (cols * cw + (cols - 1) * 12)) / 2 + (i % cols) * (cw + 12);
    const y = 78 + Math.floor(i / cols) * (chh + 46);
    const B = { x: x, y: y, w: cw, h: chh };
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    rr(x + 2, y + 3, cw, chh, 8); ctx.fill();
    const d = save.slots[i];
    if (d) {
      // 小さく 描く（キャンバスの ばしょを その場で うつす）
      ctx.save();
      rr(x, y, cw, chh, 8); ctx.clip();
      ctx.fillStyle = BGS[d.bg || 0]; ctx.fillRect(x, y, cw, chh);
      const src = canvasBox();
      const k = Math.min(cw / src.w, chh / src.h);
      ctx.translate(x + (cw - src.w * k) / 2, y + (chh - src.h * k) / 2);
      ctx.scale(k, k);
      ctx.translate(-src.x, -src.y);
      paintStrokes(src, d.s || [], d.bg || 0);
      ctx.restore();
    } else {
      ctx.fillStyle = '#FFFDF6';
      rr(x, y, cw, chh, 8); ctx.fill();
      bigText('から', x + cw / 2, y + chh / 2, 16, '#C8BCA8', null);
    }
    ctx.strokeStyle = G.slot === i ? '#FF3A6A' : '#8A7A66';
    ctx.lineWidth = G.slot === i ? 3 : 2;
    rr(x, y, cw, chh, 8); ctx.stroke();
    drawButton(button(x, y + chh + 4, cw / 2 - 3, 26, () => { loadFrom(i); G.screen = 'draw'; }), 'ひらく', '#C8D8F0');
    drawButton(button(x + cw / 2 + 3, y + chh + 4, cw / 2 - 3, 26, () => saveTo(i)), 'のこす', '#FFD24A');
  }
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 36, bw, 30, () => { G.screen = 'draw'; }), 'おえかきに もどる', '#8AD8F0');
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH - 54, 16, '#5A4A3A');
    ctx.globalAlpha = 1;
  }
}

function drawTitle() {
  bgGrad('#F4F0E8', '#D8CCBC');
  bigText('りなの', VW / 2, 40, 20, '#B07A90');
  bigText('おえかきスタジオ', VW / 2, 78, fitSize('おえかきスタジオ', VW * 0.6, 44), '#E8546A');
  bigText('すきな 色と ふとさで じゆうに 描こう。かがみ・スタンプも あるよ', VW / 2, 118, 16, '#6A5A4A', null);
  bigText('6まいまで のこせる。かち まけは ない ので、のんびり どうぞ', VW / 2, 142, 15, '#7A6A5A', null);
  // みほん
  const B = { x: VW * 0.28, y: 166, w: VW * 0.44, h: 120 };
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  rr(B.x + 2, B.y + 3, B.w, B.h, 8); ctx.fill();
  paintStrokes(B, demoArt(B), 0);
  ctx.strokeStyle = '#8A7A66'; ctx.lineWidth = 2;
  rr(B.x, B.y, B.w, B.h, 8); ctx.stroke();
  const bw = Math.min(240, VW * 0.3);
  drawButton(button(VW / 2 - bw / 2, 300, bw, 46, () => { G.screen = 'draw'; audioStart(); }), 'はじめる', '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, 356, sw, 32, () => { G.screen = 'album'; }), 'アルバム', '#C8BCE8');
  drawButton(button(VW / 2 + 8, 356, sw, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  bigText('これまでに ' + save.made + 'まい のこした', VW / 2, VH - 16, 14, '#7A6A5A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(90,74,58,0.5)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

let demoCache = null;
function demoArt(B) {
  if (demoCache) return demoCache;
  const out = [];
  const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
  for (let k = 0; k < 5; k++) {
    const p = [];
    for (let i = 0; i <= 20; i++) {
      const a = i / 20 * Math.PI * 2;
      const r = 18 + k * 7 + Math.sin(a * 5 + k) * 6;
      p.push(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 0.9);
    }
    out.push({ c: PALETTE[2 + k * 2], w: 4, p: p, m: false });
  }
  out.push({ k: 'star', x: cx - B.w * 0.36, y: cy - 26, s: 16, c: '#FFD24A' });
  out.push({ k: 'flower', x: cx + B.w * 0.36, y: cy + 20, s: 16, c: '#FF7AA8' });
  demoCache = out;
  return out;
}

function drawHowto() {
  bgGrad('#F4F0E8', '#D8CCBC');
  bigText('あそびかた', VW / 2, 38, 26, '#E8546A');
  const lines = [
    '① 左の 色と ふとさを えらんで、右の かみを なぞる',
    '②「けす」で 消しゴム、「スタンプ」で 絵はんこ',
    '③「かがみ」を ON に すると、左右 そっくりの もように なる',
    '④「もどす」は 線 1本ずつ、「消す」は ぜんぶ',
    '⑤「アルバム」で 6まいまで のこせる。あとで ひらける',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 84 + i * 32, fitSize(s, VW * 0.88, 17), '#5A4A3A', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'album') drawAlbum();
  else drawTool();
}

arcadeStart({ update: update, draw: draw, zone: 'all' });
