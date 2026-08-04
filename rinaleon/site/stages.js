// ステージの背景と、りなのシルエット。
//
// 背景は「ゾーン」に分かれている。ゾーンごとに柄がちがうので、
// 自分が描いた模様に合う場所を選ぶのが、このゲームの肝になる。
//
// 背景は必ず幅・高さを受け取って描く。同じ関数を
//   ・画面いっぱい（遊ぶとき）
//   ・小さな見本（お絵かき画面のサムネイル）
//   ・48×60 の切り出し（擬態度の計算）
// の 3 とおりで使うため、拡大縮小しても同じ絵になる必要がある。
// 乱数は使わず、番号から決まる式で模様を置いている。

'use strict';

function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

function circle(c, x, y, r, col) {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}

// --- ゾーンの柄 -----------------------------------------------------------

const PATTERNS = {
  // レンガ
  brick(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#B25C46');
    const bw = S * 0.10, bh = S * 0.045;
    for (let row = 0; row * bh < H; row++) {
      const off = (row % 2) * bw / 2;
      for (let x = x0 - bw; x < x1 + bw; x += bw) {
        rect(c, x + off + bh * 0.14, row * bh + bh * 0.14,
             bw - bh * 0.28, bh - bh * 0.28, row % 3 === 1 ? '#C0664E' : '#A85340');
      }
    }
  },
  // 木の板
  wood(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#B08149');
    const pw = S * 0.05;
    for (let x = x0; x < x1; x += pw) {
      rect(c, x, 0, pw * 0.9, H, ((x / pw) | 0) % 2 ? '#A87A43' : '#BB8B50');
      c.strokeStyle = 'rgba(120,80,40,0.35)';
      c.lineWidth = Math.max(1, S * 0.004);
      for (let k = 1; k < 5; k++) {
        c.beginPath();
        c.moveTo(x + pw * 0.15, H * k / 5);
        c.bezierCurveTo(x + pw * 0.4, H * k / 5 + S * 0.02,
                        x + pw * 0.5, H * k / 5 - S * 0.02,
                        x + pw * 0.78, H * k / 5);
        c.stroke();
      }
    }
  },
  // 草と花
  flowers(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#6FAE55');
    const step = S * 0.038;
    let i = 0;
    for (let y = step; y < H; y += step) {
      for (let x = x0 + step * 0.5; x < x1; x += step, i++) {
        const ox = ((i * 37) % 11 - 5) * step * 0.06;
        const oy = ((i * 53) % 13 - 6) * step * 0.06;
        const col = ['#F4E06A', '#F2867F', '#FFFFFF', '#D79BEA'][i % 4];
        const r = step * (0.13 + (i % 3) * 0.03);
        circle(c, x + ox, y + oy, r, col);
        circle(c, x + ox, y + oy, r * 0.4, '#E8B94A');
      }
    }
  },
  // つた（葉っぱ）
  ivy(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#3E7A46');
    const step = S * 0.032;
    let i = 0;
    for (let y = 0; y < H; y += step) {
      for (let x = x0; x < x1; x += step, i++) {
        c.save();
        c.translate(x + ((i * 29) % 7) * step * 0.1, y + ((i * 17) % 7) * step * 0.1);
        c.rotate(((i * 41) % 10) * 0.31);
        c.fillStyle = ['#4E9455', '#5FA862', '#37703F'][i % 3];
        c.beginPath();
        c.ellipse(0, 0, step * 0.42, step * 0.22, 0, 0, 7);
        c.fill();
        c.restore();
      }
    }
  },
  // 水玉のカーテン
  dots(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#F2E4EE');
    const step = S * 0.05;
    let i = 0;
    for (let y = step * 0.5; y < H; y += step) {
      for (let x = x0 + step * 0.5; x < x1; x += step, i++) {
        const off = (((y / step) | 0) % 2) * step / 2;
        circle(c, x + off, y, step * 0.22, ['#E58AAE', '#8FC6E8', '#F0C36A'][i % 3]);
      }
    }
  },
  // 本だな
  shelf(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#6B4A33');
    const rows = 4, rh = H / rows;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      rect(c, x0, y + rh - S * 0.018, x1 - x0, S * 0.018, '#553A28');
      let x = x0 + S * 0.008;
      while (x < x1 - S * 0.01) {
        const bw = S * (0.014 + ((i * 23) % 5) * 0.004);
        const bh = rh * (0.62 + ((i * 31) % 5) * 0.055);
        rect(c, x, y + rh - S * 0.018 - bh, bw,
             bh, ['#C5504A', '#3F7FA8', '#E0A93F', '#5C9A5E', '#9A6FC0'][i % 5]);
        rect(c, x, y + rh - S * 0.018 - bh + bh * 0.12, bw, bh * 0.06,
             'rgba(255,255,255,0.55)');
        x += bw + S * 0.003;
        i++;
      }
    }
  },
  // 星空の窓
  night(c, x0, x1, H, S) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16204A'); g.addColorStop(1, '#33407A');
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, H);
    for (let i = 0; i < 90; i++) {
      const x = x0 + ((i * 97) % 100) / 100 * (x1 - x0);
      const y = ((i * 61) % 100) / 100 * H;
      circle(c, x, y, S * (0.003 + (i % 3) * 0.0015), 'rgba(255,255,255,0.9)');
    }
    circle(c, x0 + (x1 - x0) * 0.7, H * 0.2, S * 0.045, '#F4EEC0');
  },
  // 空と雲
  sky(c, x0, x1, H, S) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#79C4EC'); g.addColorStop(1, '#D3EEFB');
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, H);
    for (let i = 0; i < 7; i++) {
      const x = x0 + ((i * 53) % 100) / 100 * (x1 - x0);
      const y = H * (0.12 + ((i * 37) % 60) / 100);
      for (let k = 0; k < 4; k++) {
        circle(c, x + k * S * 0.028, y + ((k % 2) * S * 0.012),
               S * (0.028 + (k % 2) * 0.012), 'rgba(255,255,255,0.92)');
      }
    }
  },
  // しましま
  stripes(c, x0, x1, H, S) {
    const sw = S * 0.035;
    for (let x = x0 - sw; x < x1 + sw; x += sw) {
      rect(c, x, 0, sw, H, ((x / sw) | 0) % 2 ? '#E8E2D2' : '#C9BFA6');
    }
  },
  // タイル
  tile(c, x0, x1, H, S) {
    const t = S * 0.042;
    let i = 0;
    for (let y = 0; y < H; y += t) {
      for (let x = x0; x < x1; x += t, i++) {
        rect(c, x, y, t - S * 0.004, t - S * 0.004,
             ['#7FC7C0', '#93D2CB', '#69B5AE'][(i + ((y / t) | 0)) % 3]);
      }
    }
  },
  // だんボール
  cardboard(c, x0, x1, H, S) {
    rect(c, x0, 0, x1 - x0, H, '#C9A06A');
    c.strokeStyle = 'rgba(150,110,60,0.4)';
    c.lineWidth = Math.max(1, S * 0.004);
    for (let y = 0; y < H; y += S * 0.02) {
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    }
    rect(c, x0, H * 0.34, x1 - x0, S * 0.02, '#B08A57');
  },
};

// --- ステージ -------------------------------------------------------------
//
// zones は左から順に [幅の割合, 柄の名前]。合計が 1 になるようにする。

const STAGES = [
  { name: 'おうちのかべ', hint: 'レンガ・木のドア・つた',
    zones: [[0.4, 'brick'], [0.27, 'wood'], [0.33, 'ivy']], floor: '#8A7A5E' },
  { name: 'はなばたけ', hint: '花ばたけ・しましま・空',
    zones: [[0.38, 'flowers'], [0.24, 'stripes'], [0.38, 'sky']], floor: '#6E9A52' },
  { name: 'よるのおへや', hint: '水玉・本だな・星空',
    zones: [[0.34, 'dots'], [0.32, 'shelf'], [0.34, 'night']], floor: '#4A3F58' },
  { name: 'そうこ', hint: 'だんボール・タイル・木',
    zones: [[0.36, 'cardboard'], [0.3, 'tile'], [0.34, 'wood']], floor: '#6E6A62' },
];

const FLOOR_RATIO = 0.14;   // 画面の下このぶんが床

function drawStageBg(c, W, H, stage) {
  const wallH = H * (1 - FLOOR_RATIO);
  // 模様の大きさは「幅」だけで決める。こうすると小さく描いた見本が
  // 本番のちょうど縮小版になり、見本どおりに塗れば本番でも合う。
  const S = W;
  let x = 0;
  c.save();
  c.beginPath(); c.rect(0, 0, W, wallH); c.clip();
  for (const [ratio, name] of stage.zones) {
    const w = W * ratio;
    PATTERNS[name](c, x, x + w, wallH, S);
    x += w;
  }
  c.restore();
  // 床
  rect(c, 0, wallH, W, H - wallH, stage.floor);
  rect(c, 0, wallH, W, Math.max(2, H * 0.006), 'rgba(0,0,0,0.18)');
}

// その x にある柄の名前（ヒント表示に使う）
function zoneAt(stage, W, x) {
  let acc = 0;
  for (const [ratio, name] of stage.zones) {
    acc += W * ratio;
    if (x < acc) return name;
  }
  return stage.zones[stage.zones.length - 1][1];
}

const ZONE_LABEL = {
  brick: 'レンガ', wood: '木のいた', flowers: 'はなばたけ', ivy: 'つた',
  dots: 'みずたま', shelf: '本だな', night: 'ほしぞら', sky: 'そら',
  stripes: 'しましま', tile: 'タイル', cardboard: 'だんボール',
};

// --- りなのかたち ---------------------------------------------------------
//
// ポーズごとに輪郭がちがう。丸まると小さくなって隠れやすいが、
// 手足が出ているポーズのほうが「物のふり」をしやすいこともある。

const POSES = ['たつ', 'まるまる', 'ばんざい'];

// 幅 w・高さ h の箱の中にりなの形を描く（塗りつぶしはしない）
function rinaPath(c, w, h, pose) {
  const cx = w / 2;
  c.beginPath();
  if (pose === 1) {
    // まるまる。ほぼ球
    c.arc(cx, h * 0.62, Math.min(w, h) * 0.36, 0, 7);
    c.moveTo(cx + w * 0.3, h * 0.35);
    c.arc(cx, h * 0.35, w * 0.26, 0, 7);          // 頭
  } else if (pose === 2) {
    // ばんざい
    c.moveTo(cx - w * 0.2, h);
    c.lineTo(cx - w * 0.2, h * 0.55);
    c.lineTo(cx - w * 0.46, h * 0.16);
    c.lineTo(cx - w * 0.32, h * 0.1);
    c.lineTo(cx - w * 0.1, h * 0.44);
    c.lineTo(cx + w * 0.1, h * 0.44);
    c.lineTo(cx + w * 0.32, h * 0.1);
    c.lineTo(cx + w * 0.46, h * 0.16);
    c.lineTo(cx + w * 0.2, h * 0.55);
    c.lineTo(cx + w * 0.2, h);
    c.closePath();
    c.moveTo(cx + w * 0.24, h * 0.3);
    c.arc(cx, h * 0.3, w * 0.24, 0, 7);
  } else {
    // たつ
    c.moveTo(cx - w * 0.22, h);
    c.lineTo(cx - w * 0.22, h * 0.5);
    c.lineTo(cx - w * 0.34, h * 0.5);
    c.lineTo(cx - w * 0.34, h * 0.86);
    c.lineTo(cx - w * 0.44, h * 0.86);
    c.lineTo(cx - w * 0.44, h * 0.44);
    c.lineTo(cx - w * 0.2, h * 0.38);
    c.lineTo(cx + w * 0.2, h * 0.38);
    c.lineTo(cx + w * 0.44, h * 0.44);
    c.lineTo(cx + w * 0.44, h * 0.86);
    c.lineTo(cx + w * 0.34, h * 0.86);
    c.lineTo(cx + w * 0.34, h * 0.5);
    c.lineTo(cx + w * 0.22, h * 0.5);
    c.lineTo(cx + w * 0.22, h);
    c.closePath();
    c.moveTo(cx + w * 0.26, h * 0.24);
    c.arc(cx, h * 0.24, w * 0.26, 0, 7);
  }
}

// 目だけは塗りつぶせない（塗ると前が見えないので）。かわいさ担当でもある。
function drawRinaEyes(c, x, y, w, h, pose, blink) {
  const cx = x + w / 2;
  const ey = y + h * (pose === 1 ? 0.35 : pose === 2 ? 0.3 : 0.24);
  const er = w * 0.055;
  for (const s of [-1, 1]) {
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.ellipse(cx + s * w * 0.1, ey, er, er * (blink ? 0.15 : 1), 0, 0, 7); c.fill();
    if (!blink) {
      c.fillStyle = '#2B2230';
      c.beginPath(); c.arc(cx + s * w * 0.1, ey, er * 0.55, 0, 7); c.fill();
    }
  }
}
