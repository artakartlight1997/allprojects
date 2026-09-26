// きょうだい 5人の え（りな・ゆい・あおい・まさき・エイトくん）。どの ゲームでも おなじ 見た目に する。
//
//   drawKid(id, x, y, h, o)
//     x, y … あしもと。 h … せの たかさ（ピクセル）
//     o.dir  … 0=まえ 1=ひだり 2=みぎ 3=うしろ
//     o.pose … 'stand' 'walk' 'run' 'jump' 'wave' 'cheer' 'punch' 'kick' 'throw' 'sad' 'sit'
//     o.t    … じかん（うごきに つかう）
//
// ★ 女の子の かおの 下には 線を かかない（まえに「ひげ」に 見えて しまった ことが ある）。

'use strict';

const KIDS = {
  rina:   { name: 'りな',   body: '#FF6FA8', body2: '#FFC0D8', hair: '#5A3520', skin: '#FFE0C8', twin: 1, ribbon: '#FFE066', skirt: 1 },
  yui:    { name: 'ゆい',   body: '#8FD07A', body2: '#D8F4C8', hair: '#6A3A22', skin: '#FFE0C8', bob: 1, ribbon: '#FF6FA8', skirt: 1 },
  aoi:    { name: 'あおい', body: '#B98FE0', body2: '#E8D8FA', hair: '#3A2418', skin: '#FFE0C8', pony: 1, clip: '#7FD0FF', skirt: 1 },
  masaki: { name: 'まさき', body: '#4A8AE8', body2: '#C8DCFA', hair: '#2A1A10', skin: '#F4D0B0', short: 1, cap: '#E04A4A' },
  eito:   { name: 'エイト', body: '#3EC08A', body2: '#C8F0DC', hair: '#3A2418', skin: '#F6CDA8', short: 1, cap: '#E8506A' },
};

function drawKid(id, x, y, h, o) {
  const K = KIDS[id] || KIDS.rina;
  o = o || {};
  const dir = o.dir || 0, pose = o.pose || 'stand', t = o.t || 0;
  const s = h / 100;                     // 100 = せの たかさ
  ctx.save();
  ctx.translate(x, y);
  if (dir === 1) ctx.scale(-1, 1);       // ひだりむきは みぎむきの かがみ
  const side = dir === 1 || dir === 2;
  // かげ
  ellipse(0, 0, 26 * s, 6 * s); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
  let bob = 0, legA = 0, armL = 0, armR = 0;
  if (pose === 'walk') { legA = Math.sin(t * 10) * 0.5; bob = Math.abs(Math.sin(t * 10)) * 2 * s; armL = -legA; armR = legA; }
  if (pose === 'run') { legA = Math.sin(t * 16) * 0.9; bob = Math.abs(Math.sin(t * 16)) * 4 * s; armL = -legA * 1.2; armR = legA * 1.2; }
  if (pose === 'jump') { legA = 0.5; armL = -2.4; armR = -2.4; }
  if (pose === 'wave') { armR = -2.6 + Math.sin(t * 10) * 0.4; }
  if (pose === 'cheer') { armL = -2.7; armR = -2.7; bob = Math.abs(Math.sin(t * 8)) * 5 * s; }
  if (pose === 'punch') { armR = -1.57; }
  if (pose === 'throw') { armR = -2.2 + Math.sin(t * 6) * 0.6; }
  if (pose === 'sad') { bob = -2 * s; }
  ctx.translate(0, -bob);
  // あし
  const legW = 9 * s, legH = 26 * s, hipY = -30 * s;
  ctx.fillStyle = '#4A3A4A';
  for (const [sg, a] of [[-1, legA], [1, -legA]]) {
    ctx.save(); ctx.translate(sg * 7 * s, hipY);
    if (pose === 'kick' && sg === 1) ctx.rotate(-1.3); else ctx.rotate(a * 0.6);
    fillRR(-legW / 2, 0, legW, legH, 4 * s, K.skin);
    fillRR(-legW / 2 - 1 * s, legH - 7 * s, legW + 5 * s, 8 * s, 3 * s, '#5A4A5A');
    ctx.restore();
  }
  if (pose === 'sit') { /* すわり（あしを まえに） */ }
  // うで
  const arm = (sg, a) => {
    ctx.save(); ctx.translate(sg * 16 * s, -60 * s); ctx.rotate(-sg * 0.32 + a);
    fillRR(-4 * s, 0, 8 * s, 24 * s, 4 * s, K.body);
    fillC(0, 25 * s, 5 * s, K.skin);
    ctx.restore();
  };
  if (side) arm(-1, -armL);
  // からだ
  const bodyTop = -64 * s;
  fillRR(-16 * s, bodyTop, 32 * s, 34 * s, 10 * s, K.body);
  if (K.skirt) {
    ctx.fillStyle = K.body;
    ctx.beginPath(); ctx.moveTo(-16 * s, -36 * s); ctx.lineTo(-22 * s, -24 * s); ctx.lineTo(22 * s, -24 * s); ctx.lineTo(16 * s, -36 * s); ctx.fill();
    fillR(-21 * s, -27 * s, 42 * s, 3 * s, K.body2);
  }
  if (dir !== 3) fillRR(-8 * s, bodyTop + 4 * s, 16 * s, 10 * s, 4 * s, K.body2);   // えり
  if (!side) arm(-1, -armL);
  arm(1, armR);
  // あたま
  const hy = -86 * s, hr = 24 * s;
  if (K.twin) { fillC(-24 * s, hy + 6 * s, 9 * s, K.hair); fillC(24 * s, hy + 6 * s, 9 * s, K.hair); fillC(-24 * s, hy - 3 * s, 4 * s, K.ribbon); fillC(24 * s, hy - 3 * s, 4 * s, K.ribbon); }
  // ポニーテール：まえむき では あたまの よこ うしろに だけ 見せる（あごの 下には ぜったい かかない）
  if (K.pony) {
    if (side || dir === 3) { fillC(-22 * s, hy - 2 * s, 9 * s, K.hair); ellipse(-28 * s, hy + 12 * s, 7 * s, 13 * s, 0.4); ctx.fillStyle = K.hair; ctx.fill(); }
    else { fillC(22 * s, hy - 16 * s, 8 * s, K.hair); ellipse(30 * s, hy - 4 * s, 6 * s, 11 * s, -0.5); ctx.fillStyle = K.hair; ctx.fill(); }
  }
  fillC(0, hy, hr, K.hair);
  if (dir !== 3) {
    ellipse(side ? 4 * s : 0, hy + 4 * s, hr * 0.86, hr * 0.8); ctx.fillStyle = K.skin; ctx.fill();
    // まえがみ
    ctx.fillStyle = K.hair;
    ctx.beginPath(); ctx.arc(0, hy - 2 * s, hr, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    if (K.bob) { fillR(-hr, hy - 4 * s, 7 * s, 22 * s, K.hair); fillR(hr - 7 * s, hy - 4 * s, 7 * s, 22 * s, K.hair); }
    // め
    const ex = side ? 9 * s : 0;
    const blink = (t % 3.2) < 0.12;
    const eyes = side ? [ex] : [-9 * s, 9 * s];
    for (const e of eyes) {
      if (blink || pose === 'cheer') {
        ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(e, hy + 6 * s, 3.5 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else {
        fillC(e, hy + 5 * s, 4 * s, '#2A2028');
        fillC(e - 1.2 * s, hy + 3.6 * s, 1.5 * s, '#FFFFFF');
      }
    }
    // ほっぺ
    for (const e of (side ? [ex + 5 * s] : [-15 * s, 15 * s])) fillC(e, hy + 13 * s, 4 * s, 'rgba(255,120,150,0.4)');
    // くち（ちいさく。女の子の あごの 下には なにも かかない）
    ctx.strokeStyle = '#8A3A4A'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    if (pose === 'sad') ctx.arc(side ? ex : 0, hy + 19 * s, 4 * s, Math.PI * 1.15, Math.PI * 1.85);
    else if (pose === 'cheer' || pose === 'jump') { ctx.arc(side ? ex : 0, hy + 13 * s, 4.5 * s, 0.1, Math.PI - 0.1); ctx.fillStyle = '#C84A5A'; ctx.fill(); }
    else ctx.arc(side ? ex : 0, hy + 12 * s, 4 * s, 0.35, Math.PI - 0.35);
    ctx.stroke();
  }
  if (K.ribbon && !K.twin) { fillC(-14 * s, hy - 18 * s, 6 * s, K.ribbon); fillC(-6 * s, hy - 20 * s, 5 * s, K.ribbon); }
  if (K.clip) fillRR(10 * s, hy - 16 * s, 10 * s, 5 * s, 2 * s, K.clip);
  if (K.cap) {
    ctx.fillStyle = K.cap;
    ctx.beginPath(); ctx.arc(0, hy - 3 * s, hr + 1 * s, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    if (dir !== 3) fillRR(side ? 0 : -14 * s, hy - 8 * s, side ? 30 * s : 28 * s, 6 * s, 3 * s, K.cap);
  }
  ctx.restore();
}

// かおだけ（ボタンや スコア ひょうじ よう）
function drawKidFace(id, x, y, r) {
  const K = KIDS[id] || KIDS.rina;
  fillRR(x - r * 0.9, y + r * 0.72, r * 1.8, r * 0.55, r * 0.26, K.body);   // かた（ふくの いろで だれか わかる）
  if (K.twin) { fillC(x - r * 1.0, y + r * 0.2, r * 0.38, K.hair); fillC(x + r * 1.0, y + r * 0.2, r * 0.38, K.hair); }
  fillC(x, y, r, K.hair);
  ellipse(x, y + r * 0.16, r * 0.86, r * 0.8); ctx.fillStyle = K.skin; ctx.fill();
  ctx.fillStyle = K.hair; ctx.beginPath(); ctx.arc(x, y - r * 0.08, r, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  fillC(x - r * 0.36, y + r * 0.2, r * 0.15, '#2A2028'); fillC(x + r * 0.36, y + r * 0.2, r * 0.15, '#2A2028');
  fillC(x - r * 0.6, y + r * 0.5, r * 0.16, 'rgba(255,120,150,0.45)'); fillC(x + r * 0.6, y + r * 0.5, r * 0.16, 'rgba(255,120,150,0.45)');
  if (K.ribbon) fillC(x - r * 0.62, y - r * 0.78, r * 0.24, K.ribbon);
  if (K.clip) fillRR(x + r * 0.4, y - r * 0.7, r * 0.42, r * 0.2, r * 0.08, K.clip);
  if (K.cap) { ctx.fillStyle = K.cap; ctx.beginPath(); ctx.arc(x, y - r * 0.12, r * 1.04, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); fillRR(x - r * 0.6, y - r * 0.34, r * 1.2, r * 0.24, r * 0.1, K.cap); }
}
