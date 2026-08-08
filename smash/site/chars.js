// たたかう キャラたち。かず（つよさ）と、絵の かきかた。
//
// スマブラと 同じで「たいりょく」ではなく **ダメージ％** で たたかう。
// ％が たかいほど 遠くまで ふっとぶ。ふっとんで 画面の 外に 出たら 1ストック へる。

'use strict';

const VH = 450;              // ゲームの 中の たての 大きさ

// weight … 重いほど ふっとびにくい（1.0 が ふつう）
// spd    … 走る はやさ  jump … ジャンプの つよさ
// atk    … こうげきの つよさの ばいりつ
// sp     … ひっさつの しゅるい
//            'shot' まえに たま  /  'dash' つっこむ  /  'up' 上に とぶ
//            'bomb' 下に たたきつけ  /  'tele' しゅんかん いどう  /  'beam' ふとい ビーム
//            'magic' まほうだまを まく  /  'clone' コピー

const CHARS = {
  masaki: {
    name: 'まさき', col: '#3E7ACF', hair: '#3A2A1E', skin: '#F2C9A8',
    weight: 1.00, spd: 235, jump: 585, atk: 1.00, sp: 'shot',
    slim: true, curly: true,
    about: '小学5年生。細めで 天パー。バランスが よくて つかいやすい',
  },
  kouta: {
    name: 'こうた', col: '#E85C5C', hair: '#241E18', skin: '#EFC49F',
    weight: 1.00, spd: 225, jump: 570, atk: 1.00, sp: 'dash',
    about: 'クラスの ともだち。まっすぐ つっこんでくる',
  },
  misaki: {
    name: 'みさき', col: '#F06AB0', hair: '#5A3A26', skin: '#F6CFAC',
    weight: 0.80, spd: 300, jump: 620, atk: 0.85, sp: 'up',
    pig: true, slim: true,
    about: 'すごく はやい。でも かるいので よく ふっとぶ',
  },
  gantetsu: {
    name: 'がんてつ', col: '#8A6A3A', hair: '#2A2018', skin: '#D8A87A',
    weight: 1.30, spd: 165, jump: 500, atk: 1.15, sp: 'bomb',
    big: true,
    about: '重くて つよい。上から たたきつけてくる',
  },
  pyon: {
    name: 'ぴょんきち', col: '#F0F0F0', hair: '#E0E0E0', skin: '#F8E0E8',
    weight: 0.85, spd: 245, jump: 700, atk: 0.90, sp: 'up',
    ears: true,
    about: 'うさぎ。ジャンプが とても たかい',
  },
  doctor: {
    name: 'ドクター', col: '#F0F4F8', hair: '#B0B8C0', skin: '#EFC49F',
    weight: 0.95, spd: 200, jump: 545, atk: 0.90, sp: 'shot',
    glasses: true, shotFast: true,
    about: '遠くから たまを うってくる。近づくのが たいへん',
  },
  ninja: {
    name: 'にんじゃ', col: '#3A3A50', hair: '#1A1A22', skin: '#E8C09C',
    weight: 0.90, spd: 275, jump: 600, atk: 1.05, sp: 'tele',
    mask: true, slim: true,
    about: 'しゅんかん いどう する。うしろに まわりこまれる',
  },
  robo: {
    name: 'ロボくん', col: '#9AA8B8', hair: '#6A7888', skin: '#C8D4E0',
    weight: 1.35, spd: 180, jump: 520, atk: 1.15, sp: 'beam',
    robot: true, big: true,
    about: 'ふとい ビームを うつ。ためている あいだが ねらいめ',
  },
  mahou: {
    name: 'まほうつかい', col: '#7A4AC0', hair: '#E8E0F0', skin: '#F0D0B8',
    weight: 0.90, spd: 205, jump: 560, atk: 1.00, sp: 'magic',
    hat: true,
    about: 'まほうだまを 3つ まく。ちらばるので よけにくい',
  },
  kage: {
    name: 'かげまさき', col: '#2A2A3A', hair: '#101018', skin: '#8A7A90',
    weight: 1.00, spd: 245, jump: 590, atk: 1.10, sp: 'clone',
    slim: true, curly: true, shadow: true,
    about: 'まさきの かげ。同じ うごきで やりかえしてくる',
  },
  king: {
    name: 'スマッシュキング', col: '#D8A020', hair: '#8A5A10', skin: '#E0B888',
    weight: 1.80, spd: 195, jump: 540, atk: 1.30, sp: 'beam',
    big: true, crown: true, boss: true,
    about: 'そらの おうさま。おおきくて 重くて つよい',
  },
};

// --- 絵 -----------------------------------------------------------------------
//
// よこ向きの ちびキャラ。せは 46px（大きい 子は 58px）。

function charH(c) { return c.big ? 58 : 46; }
function charW(c) { return (c.big ? 30 : (c.slim ? 19 : 23)); }

// f … { x, y（足もと）, face, vx, vy, onGround, atk, hitstun, dmg, inv }
function drawFighter(ctx, f, t) {
  const c = CHARS[f.char];
  const h = charH(c), w = charW(c);
  if (f.inv > 0 && Math.floor(f.inv * 16) % 2 === 0 && f.respawnT <= 0) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 2, w * 0.6, 4, 0, 0, 7); ctx.fill();
  ctx.scale(f.face, 1);

  const run = f.onGround && Math.abs(f.vx) > 30 ? Math.sin(t * 16) : 0;
  const air = !f.onGround;
  const sq = f.squash || 0;
  ctx.scale(1 + sq * 0.2, 1 - sq * 0.2);

  // あし
  ctx.fillStyle = '#2E3A50';
  const lg = h * 0.30;
  if (air) {
    ctx.save(); ctx.translate(-w * 0.22, -lg); ctx.rotate(-0.5);
    rr(ctx, -w * 0.2, 0, w * 0.34, lg, 3); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(w * 0.20, -lg); ctx.rotate(0.4);
    rr(ctx, -w * 0.14, 0, w * 0.34, lg, 3); ctx.fill(); ctx.restore();
  } else {
    rr(ctx, -w * 0.40 + run * w * 0.22, -lg, w * 0.34, lg, 3); ctx.fill();
    rr(ctx, w * 0.06 - run * w * 0.22, -lg, w * 0.34, lg, 3); ctx.fill();
  }

  // からだ
  const by = -lg - h * 0.34;
  ctx.fillStyle = c.col;
  rr(ctx, -w * 0.5, by, w, h * 0.36, c.robot ? 3 : w * 0.28); ctx.fill();
  if (c.robot) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, -w * 0.3, by + h * 0.08, w * 0.6, h * 0.1, 2); ctx.fill();
  }

  // うで（こうげき中は 前に のばす）
  ctx.strokeStyle = c.skin; ctx.lineWidth = h * 0.11; ctx.lineCap = 'round';
  const a = f.atk;
  let ax = w * 0.30, ay = by + h * 0.12;
  if (a && a.t < a.dur) {
    const u = a.t / a.dur;
    const reach = a.kind === 'smash' ? w * 1.5 : a.kind === 'air' ? w * 1.0 : w * 1.1;
    const ex = w * 0.3 + reach * Math.sin(Math.min(1, u * 2.2) * Math.PI * 0.5);
    ctx.beginPath(); ctx.moveTo(w * 0.2, ay); ctx.lineTo(ex, ay + (a.kind === 'air' ? 6 : 0));
    ctx.stroke();
    // こうげきの きらめき
    ctx.strokeStyle = a.kind === 'smash' ? 'rgba(255,210,90,0.85)' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = a.kind === 'smash' ? 7 : 4;
    ctx.beginPath();
    ctx.arc(ex, ay, a.kind === 'smash' ? 17 : 11, -1.1, 1.1);
    ctx.stroke();
    ctx.strokeStyle = c.skin; ctx.lineWidth = h * 0.11;
  } else {
    ctx.beginPath(); ctx.moveTo(w * 0.2, by + h * 0.1);
    ctx.lineTo(ax, ay + (air ? -8 : 8 + run * 5)); ctx.stroke();
  }

  // あたま
  const hy = by - h * 0.20;
  ctx.fillStyle = c.skin;
  if (c.robot) { rr(ctx, -w * 0.44, hy - h * 0.22, w * 0.88, h * 0.44, 4); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, hy, h * 0.22, 0, 7); ctx.fill(); }

  // かみ
  ctx.fillStyle = c.hair;
  if (c.ears) {
    ctx.beginPath(); ctx.ellipse(-w * 0.16, hy - h * 0.42, w * 0.13, h * 0.24, -0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.12, hy - h * 0.44, w * 0.13, h * 0.24, 0.15, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, hy - h * 0.06, h * 0.22, Math.PI, 0); ctx.fill();
  } else if (c.hat) {
    ctx.beginPath(); ctx.arc(0, hy - h * 0.04, h * 0.23, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#4A2A8A';
    ctx.beginPath();
    ctx.moveTo(-h * 0.34, hy - h * 0.20); ctx.lineTo(h * 0.30, hy - h * 0.20);
    ctx.lineTo(-h * 0.06, hy - h * 0.72); ctx.closePath(); ctx.fill();
  } else if (c.robot) {
    rr(ctx, -w * 0.46, hy - h * 0.26, w * 0.92, h * 0.12, 3); ctx.fill();
    ctx.fillRect(-2, hy - h * 0.42, 4, h * 0.18);
    ctx.beginPath(); ctx.arc(0, hy - h * 0.44, 4, 0, 7); ctx.fill();
  } else if (c.curly) {
    // 天パー。まるを いくつも かさねる
    for (let i = -3; i <= 3; i++) {
      const px = i * h * 0.075;
      const py = hy - h * 0.16 - Math.cos(i * 0.6) * h * 0.07 + Math.sin(i * 2.1) * h * 0.02;
      ctx.beginPath(); ctx.arc(px, py, h * 0.088, 0, 7); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, hy - h * 0.03, h * 0.22, Math.PI * 1.05, Math.PI * 2.0); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, hy - h * 0.04, h * 0.23, Math.PI, 0); ctx.fill();
    if (c.pig) {
      ctx.beginPath(); ctx.arc(-h * 0.22, hy + h * 0.02, h * 0.08, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(h * 0.22, hy + h * 0.02, h * 0.08, 0, 7); ctx.fill();
    }
  }
  if (c.crown) {
    ctx.fillStyle = '#FFD166';
    ctx.beginPath();
    ctx.moveTo(-h * 0.20, hy - h * 0.24); ctx.lineTo(h * 0.20, hy - h * 0.24);
    ctx.lineTo(h * 0.20, hy - h * 0.44); ctx.lineTo(h * 0.10, hy - h * 0.34);
    ctx.lineTo(0, hy - h * 0.48); ctx.lineTo(-h * 0.10, hy - h * 0.34);
    ctx.lineTo(-h * 0.20, hy - h * 0.44); ctx.closePath(); ctx.fill();
  }
  if (c.mask) {
    ctx.fillStyle = '#22222E';
    rr(ctx, -h * 0.24, hy - h * 0.02, h * 0.48, h * 0.14, 2); ctx.fill();
  }

  // かお
  ctx.fillStyle = c.shadow ? '#FF6A6A' : '#2A2430';
  ctx.beginPath(); ctx.arc(h * 0.09, hy + h * 0.01, h * 0.035, 0, 7); ctx.fill();
  if (c.glasses) {
    ctx.strokeStyle = '#3A4A5A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(h * 0.09, hy + h * 0.01, h * 0.075, 0, 7); ctx.stroke();
  }
  if (f.hitstun > 0) {
    ctx.strokeStyle = '#2A2430'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h * 0.02, hy + h * 0.12); ctx.lineTo(h * 0.16, hy + h * 0.12); ctx.stroke();
  }
  ctx.restore();
}

// 小さい かおアイコン（HUD 用）
function drawFace(ctx, key, x, y, r) {
  const c = CHARS[key];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c.col;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.62, 0, 7); ctx.fill();
  ctx.fillStyle = c.hair;
  if (c.curly) {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.arc(i * r * 0.26, -r * 0.42 - Math.cos(i * 0.7) * r * 0.1,
                               r * 0.24, 0, 7); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.62, Math.PI, 0); ctx.fill();
  }
  ctx.fillStyle = '#2A2430';
  ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.06, r * 0.1, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.2, r * 0.06, r * 0.1, 0, 7); ctx.fill();
  ctx.restore();
}
