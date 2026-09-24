// え（マス・人・まもの）。画像ファイルは つかわず、ぜんぶ コードで かく。

'use strict';

// 同じ マスでも 少しずつ ちがって 見える ように する ための たね
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// --- マス --------------------------------------------------------------------------

const THEME = {
  cave:   { floor: '#6E5C4A', floor2: '#62523F', wall: '#3A2E26', top: '#54443A', acc: '#8A7460' },
  tunnel: { floor: '#5E6C7C', floor2: '#556372', wall: '#1E3A58', top: '#2E5478', acc: '#7FC8F8' },
  mount:  { floor: '#5E7050', floor2: '#566848', wall: '#2A3A2A', top: '#3E5238', acc: '#9AC08A' },
  castle: { floor: '#5A4A5E', floor2: '#4E4052', wall: '#2A1E2E', top: '#46344A', acc: '#E04A6E' },
};

function grass(px, py, x, y, c1, c2) {
  fillR(px, py, TS, TS, c1);
  const h = hash2(x, y);
  ctx.fillStyle = c2;
  for (let i = 0; i < 3; i++) {
    const hx = px + ((h * 97 + i * 13) % 1) * (TS - 8) + 4;
    const hy = py + ((h * 53 + i * 29) % 1) * (TS - 8) + 4;
    ctx.fillRect(hx, hy, 2, 5); ctx.fillRect(hx + 3, hy + 1, 2, 4);
  }
}

function tree(cx, cy, r, c) {
  fillC(cx + 2, cy + r * 0.9, r * 0.8, 'rgba(0,0,0,0.18)');
  fillR(cx - r * 0.18, cy + r * 0.2, r * 0.36, r * 0.8, '#7A5234');
  fillC(cx, cy, r, c || '#3E9B4F');
  fillC(cx - r * 0.3, cy - r * 0.3, r * 0.45, 'rgba(255,255,255,0.18)');
}

function drawWorldTile(ch, x, y, px, py, t) {
  switch (ch) {
    case '~': {
      fillR(px, py, TS, TS, '#3A86D0');
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      const o = Math.sin(t * 2 + x * 0.7 + y * 0.9) * 4;
      ctx.beginPath();
      ctx.moveTo(px + 6 + o, py + 12); ctx.quadraticCurveTo(px + 12 + o, py + 8, px + 18 + o, py + 12);
      ctx.moveTo(px + 16 - o, py + 26); ctx.quadraticCurveTo(px + 22 - o, py + 22, px + 28 - o, py + 26);
      ctx.stroke();
      break;
    }
    case 'r': {
      fillR(px, py, TS, TS, '#4AA2E4');
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      const o = ((t * 18 + y * 9) % TS);
      ctx.beginPath(); ctx.moveTo(px + 10, py + o); ctx.lineTo(px + 10, py + o + 8);
      ctx.moveTo(px + 24, py + (o + 18) % TS); ctx.lineTo(px + 24, py + (o + 18) % TS + 8); ctx.stroke();
      break;
    }
    case '=':
      fillR(px, py, TS, TS, '#4AA2E4');
      fillR(px, py + 4, TS, TS - 8, '#B8864E');
      ctx.fillStyle = '#8A5E34';
      for (let i = 0; i < 5; i++) ctx.fillRect(px + i * 7.5, py + 4, 2, TS - 8);
      break;
    case ':':
      fillR(px, py, TS, TS, '#8FCB6E');
      fillR(px + 2, py + 2, TS - 4, TS - 4, '#DCC690');
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(px + 8 + hash2(x, y) * 14, py + 10, 4, 3);
      break;
    case 'T':
      grass(px, py, x, y, '#6EB85C', '#5AA24A');
      tree(px + 11, py + 13, 10, '#2E8A44');
      tree(px + 25, py + 22, 11, '#3E9B4F');
      break;
    case '^': {
      grass(px, py, x, y, '#7CC66A', '#6AB058');
      ctx.fillStyle = '#8A7A6A';
      ctx.beginPath(); ctx.moveTo(px + 1, py + TS - 2); ctx.lineTo(px + TS / 2, py + 3); ctx.lineTo(px + TS - 1, py + TS - 2); ctx.fill();
      ctx.fillStyle = '#6A5A4E';
      ctx.beginPath(); ctx.moveTo(px + TS / 2, py + 3); ctx.lineTo(px + TS - 1, py + TS - 2); ctx.lineTo(px + TS / 2 + 3, py + TS - 2); ctx.fill();
      ctx.fillStyle = '#F4F4F8';
      ctx.beginPath(); ctx.moveTo(px + TS / 2 - 6, py + 12); ctx.lineTo(px + TS / 2, py + 3); ctx.lineTo(px + TS / 2 + 6, py + 12); ctx.fill();
      break;
    }
    case 'h':
      grass(px, py, x, y, '#7CC66A', '#6AB058');
      ellipse(px + TS / 2, py + TS * 0.7, TS * 0.46, TS * 0.3); ctx.fillStyle = '#9AD47A'; ctx.fill();
      break;
    default:
      grass(px, py, x, y, '#7CC66A', '#68B056');
  }
  // まち・ダンジョンの しるし
  if ('ABCD1234'.indexOf(ch) >= 0) drawPlaceIcon(ch, px, py, t);
}

function drawPlaceIcon(ch, px, py, t) {
  const cx = px + TS / 2, by = py + TS - 3;
  if (ch === 'A') {            // 小倉城
    fillR(cx - 13, by - 10, 26, 10, '#E8E4DA');
    fillR(cx - 10, by - 18, 20, 8, '#F4F0E8');
    ctx.fillStyle = '#3A3A4A';
    ctx.beginPath(); ctx.moveTo(cx - 16, by - 10); ctx.lineTo(cx, by - 16); ctx.lineTo(cx + 16, by - 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 13, by - 18); ctx.lineTo(cx, by - 27); ctx.lineTo(cx + 13, by - 18); ctx.fill();
  } else if (ch === 'B') {     // 市場
    for (let i = 0; i < 3; i++) {
      const c = ['#E04A6E', '#FFB020', '#4A8AE8'][i];
      fillR(px + 3 + i * 10, by - 12, 9, 12, '#E8DCC8');
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(px + 1 + i * 10, by - 12); ctx.lineTo(px + 7 + i * 10, by - 20); ctx.lineTo(px + 13 + i * 10, by - 12); ctx.fill();
    }
  } else if (ch === 'C') {     // 門司港（えき と ふね）
    fillR(cx - 13, by - 14, 26, 14, '#E8C890');
    fillR(cx - 9, by - 20, 18, 6, '#4A7A6A');
    fillR(cx - 3, by - 10, 6, 10, '#6A4A30');
  } else if (ch === 'D') {     // 八幡（えんとつ）
    fillR(cx - 13, by - 12, 26, 12, '#8A6A5A');
    fillR(cx + 4, by - 28, 5, 16, '#6A5A5A');
    fillR(cx - 8, by - 22, 5, 10, '#6A5A5A');
    ctx.fillStyle = 'rgba(220,220,230,0.6)';
    circ(cx + 7 + Math.sin(t * 2) * 2, by - 31, 4); ctx.fill();
  } else if (ch === '1') {     // どうくつ
    ellipse(cx, by - 8, 15, 12); ctx.fillStyle = '#6A5A4A'; ctx.fill();
    ellipse(cx, by - 5, 9, 9); ctx.fillStyle = '#1A1210'; ctx.fill();
  } else if (ch === '2') {     // トンネル
    fillR(cx - 15, by - 22, 30, 22, '#9AA0A8');
    ellipse(cx, by - 4, 10, 14); ctx.fillStyle = '#1A2230'; ctx.fill();
    fillR(cx - 15, by - 4, 30, 4, '#9AA0A8');
  } else if (ch === '3') {     // 皿倉山
    ctx.fillStyle = '#4A6A4A';
    ctx.beginPath(); ctx.moveTo(cx - 16, by); ctx.lineTo(cx, by - 26); ctx.lineTo(cx + 16, by); ctx.fill();
    fillR(cx, by - 32, 2, 12, '#5A4A3A');
    ctx.fillStyle = '#FF6FA8'; ctx.beginPath(); ctx.moveTo(cx + 2, by - 32); ctx.lineTo(cx + 12, by - 28); ctx.lineTo(cx + 2, by - 24); ctx.fill();
  } else if (ch === '4') {     // くろがね城
    fillR(cx - 14, by - 18, 28, 18, '#3A3448');
    for (let i = 0; i < 4; i++) fillR(cx - 14 + i * 8, by - 22, 5, 4, '#3A3448');
    fillR(cx - 4, by - 10, 8, 10, '#E04A2A');
    ctx.fillStyle = 'rgba(255,90,40,' + (0.4 + Math.sin(t * 4) * 0.2) + ')';
    circ(cx, by - 6, 9); ctx.fill();
  }
}

function drawTownTile(ch, x, y, px, py, t, tk) {
  const g1 = tk === 'yahata' ? '#A8B890' : '#9AD08A';
  switch (ch) {
    case '#':
      fillR(px, py, TS, TS, '#8A7A6A');
      ctx.fillStyle = '#9A8A78';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        ctx.fillRect(px + c * 18 + (r % 2) * 9 + 1, py + r * 12 + 1, 16, 10);
      }
      break;
    case ',': case 'E':
      fillR(px, py, TS, TS, '#DCCFB4');
      ctx.strokeStyle = 'rgba(120,100,70,0.25)'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TS / 2, TS / 2); ctx.strokeRect(px + TS / 2 + 0.5, py + TS / 2 + 0.5, TS / 2 - 1, TS / 2 - 1);
      break;
    case 'w': {
      fillR(px, py, TS, TS, '#4A9AE0');
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      const o = Math.sin(t * 2 + x + y) * 3;
      ctx.beginPath(); ctx.moveTo(px + 6 + o, py + 16); ctx.lineTo(px + 18 + o, py + 16); ctx.stroke();
      break;
    }
    case '=':
      fillR(px, py, TS, TS, '#4A9AE0');
      fillR(px + 2, py, TS - 4, TS, '#B8864E');
      ctx.fillStyle = '#8A5E34';
      for (let i = 0; i < 5; i++) ctx.fillRect(px + 2, py + i * 7.5, TS - 4, 2);
      break;
    case 't':
      grass(px, py, x, y, g1, '#86BE76');
      tree(px + TS / 2, py + TS / 2 - 2, 14);
      break;
    case 'f': {
      grass(px, py, x, y, g1, '#86BE76');
      const cs = ['#FF6FA8', '#FFE066', '#FFFFFF', '#B98FE0'];
      for (let i = 0; i < 4; i++) fillC(px + 8 + (i % 2) * 18, py + 9 + Math.floor(i / 2) * 16, 4, cs[(i + x + y) % 4]);
      break;
    }
    default:
      grass(px, py, x, y, g1, '#86BE76');
  }
}

function drawDungeonTile(ch, x, y, px, py, t, kind, opened) {
  const T = THEME[kind] || THEME.cave;
  if (ch === '#') {
    fillR(px, py, TS, TS, T.wall);
    // すぐ 下が ゆかなら かべの かおを かく（立体に 見える）
    fillR(px, py, TS, 6, T.top);
    if (kind === 'castle' && (x + y) % 5 === 0) fillR(px + 12, py + 8, 12, 18, T.acc);
    if (kind === 'tunnel' && (x * 3 + y) % 7 === 0) {
      fillRR(px + 8, py + 10, 20, 14, 4, '#2A6AA8');
      fillC(px + 14 + Math.sin(t + x) * 3, py + 17, 2, '#9AE0FF');
    }
    if (kind === 'mount' && hash2(x, y) < 0.3) tree(px + TS / 2, py + TS / 2, 11, '#2A5A34');
    return;
  }
  fillR(px, py, TS, TS, (x + y) % 2 ? T.floor : T.floor2);
  if (hash2(x, y) < 0.15) fillC(px + 10 + hash2(y, x) * 16, py + 12 + hash2(x + 1, y) * 12, 2.5, T.acc);
  if (ch === '<' || ch === '>') {
    for (let i = 0; i < 4; i++) {
      const w = ch === '<' ? TS - 8 - i * 5 : 12 + i * 5;
      fillR(px + (TS - w) / 2, py + 5 + i * 7, w, 6, i % 2 ? '#C8B8A0' : '#E8D8C0');
    }
    textO(ch === '<' ? '↑' : '↓', px + TS / 2, py + TS / 2, 16, '#FFE066');
  } else if (ch === 'c') {
    drawChest(px + TS / 2, py + TS / 2 + 3, opened);
  }
}

function drawChest(cx, cy, open) {
  fillRR(cx - 13, cy - 8, 26, 16, 3, '#A8642A');
  fillR(cx - 13, cy - 2, 26, 3, '#E8B040');
  if (open) {
    fillRR(cx - 13, cy - 16, 26, 8, 3, '#7A4A1E');
  } else {
    fillRR(cx - 13, cy - 14, 26, 8, 4, '#C07A34');
    fillR(cx - 3, cy - 6, 6, 7, '#FFE066');
  }
}

// まとまった たてもの（いえ・しろ・やたい・こうじょう・えき）
function drawBlock(ch, x0, y0, w, h, t, noShadow) {
  const px = x0 * TS, py = y0 * TS, W2 = w * TS, H2 = h * TS;
  if (!noShadow) fillRR(px + 4, py + 6, W2, H2, 6, 'rgba(0,0,0,0.2)');
  if (ch === 'H') {
    fillR(px + 2, py + H2 * 0.42, W2 - 4, H2 * 0.58 - 2, '#F2E6D0');
    ctx.fillStyle = '#C84A3A';
    ctx.beginPath(); ctx.moveTo(px - 4, py + H2 * 0.46); ctx.lineTo(px + W2 / 2, py - 2); ctx.lineTo(px + W2 + 4, py + H2 * 0.46); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.moveTo(px + W2 / 2, py - 2); ctx.lineTo(px + W2 + 4, py + H2 * 0.46); ctx.lineTo(px + W2 / 2, py + H2 * 0.46); ctx.fill();
    fillRR(px + W2 / 2 - 9, py + H2 - 26, 18, 24, 3, '#8A5A34');
    fillRR(px + 10, py + H2 * 0.58, 16, 14, 2, '#9AD0F0');
    fillRR(px + W2 - 26, py + H2 * 0.58, 16, 14, 2, '#9AD0F0');
  } else if (ch === 'K') {       // 小倉城（てんしゅかく）
    fillR(px + 10, py + H2 * 0.55, W2 - 20, H2 * 0.45, '#9A8A7A');        // いしがき
    ctx.fillStyle = '#8A7A6A';
    for (let i = 0; i < W2 - 20; i += 16) ctx.fillRect(px + 10 + i, py + H2 * 0.55 + ((i / 16) % 2) * 8, 14, 6);
    const cx = px + W2 / 2;
    const lv = [[0.62, 0.34], [0.5, 0.29], [0.38, 0.23], [0.26, 0.17]];
    for (let i = 0; i < lv.length; i++) {
      const [yy, ww] = lv[i];
      const bw = W2 * ww;
      fillR(cx - bw / 2, py + H2 * yy - H2 * 0.12, bw, H2 * 0.12, '#F6F2EA');
      ctx.fillStyle = '#3A3A4A';
      ctx.beginPath(); ctx.moveTo(cx - bw / 2 - 12, py + H2 * yy - H2 * 0.1); ctx.lineTo(cx, py + H2 * yy - H2 * 0.2);
      ctx.lineTo(cx + bw / 2 + 12, py + H2 * yy - H2 * 0.1); ctx.fill();
    }
    ctx.fillStyle = '#FFD24A';
    circ(cx - 14, py + H2 * 0.05, 3); ctx.fill(); circ(cx + 14, py + H2 * 0.05, 3); ctx.fill();
    fillRR(cx - 16, py + H2 - 34, 32, 34, 4, '#5A3A28');
  } else if (ch === 'M') {       // やたい
    fillR(px + 4, py + H2 * 0.45, W2 - 8, H2 * 0.55 - 4, '#E8D8C0');
    const cols = ['#E04A6E', '#FFFFFF'];
    for (let i = 0; i < w * 2; i++) {
      ctx.fillStyle = cols[i % 2];
      ctx.fillRect(px + i * TS / 2, py + 6, TS / 2, H2 * 0.36);
    }
    // しなもの
    const goods = ['#FF8A3A', '#8FD07A', '#FFE066', '#E04A4A', '#8AC8FF'];
    for (let i = 0; i < w * 2; i++) fillC(px + 10 + i * (W2 - 20) / (w * 2 - 1), py + H2 * 0.62, 7, goods[(i + x0) % 5]);
  } else if (ch === 'F') {       // こうじょう（えんとつ）
    fillR(px + 2, py + H2 * 0.4, W2 - 4, H2 * 0.6, '#9A6A5A');
    fillR(px + W2 * 0.55, py - 6, W2 * 0.22, H2 * 0.5, '#7A5A50');
    fillR(px + W2 * 0.55, py - 6, W2 * 0.22, 6, '#E8E0D0');
    ctx.fillStyle = 'rgba(230,230,240,0.55)';
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.4 + i / 3) % 1;
      circ(px + W2 * 0.66 + u * 20, py - 10 - u * 30, 6 + u * 8); ctx.fill();
    }
    for (let i = 0; i < 2; i++) fillR(px + 8 + i * 22, py + H2 * 0.55, 14, 12, '#FFE066');
  } else if (ch === 'R') {       // 門司港駅（レトロな えき）
    fillR(px + 4, py + H2 * 0.3, W2 - 8, H2 * 0.7 - 4, '#F0D8A8');
    ctx.fillStyle = '#4A7A6A';
    ctx.beginPath(); ctx.moveTo(px, py + H2 * 0.34); ctx.lineTo(px + W2 * 0.2, py + 6); ctx.lineTo(px + W2 * 0.8, py + 6); ctx.lineTo(px + W2, py + H2 * 0.34); ctx.fill();
    for (let i = 0; i < 5; i++) fillRR(px + 16 + i * (W2 - 44) / 4, py + H2 * 0.45, 12, 22, 5, '#5A7AA8');
    fillRR(px + W2 / 2 - 14, py + H2 - 36, 28, 34, 4, '#6A4A30');
    fillC(px + W2 / 2, py + H2 * 0.2, 9, '#FFFFFF');
    ctx.strokeStyle = '#3A3A4A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + W2 / 2, py + H2 * 0.2); ctx.lineTo(px + W2 / 2, py + H2 * 0.2 - 6);
    ctx.moveTo(px + W2 / 2, py + H2 * 0.2); ctx.lineTo(px + W2 / 2 + 5, py + H2 * 0.2); ctx.stroke();
  }
}

// --- ひと ---------------------------------------------------------------------------
//  look … rina / yui / masaki / aoi / king / inn / shop / shop2 / oji / oba / boy / girl / soldier / banana
//  dir … 0=下 1=左 2=右 3=上 ／ step … 0 か 1（あし）

const LOOKS = {
  rina:    { body: '#FF6FA8', hair: '#5A3520', skin: '#FFE0C8', twin: 1, ribbon: '#FFE066' },
  yui:     { body: '#8FD07A', hair: '#6A3A22', skin: '#FFE0C8', bob: 1, ribbon: '#FF6FA8' },
  masaki:  { body: '#4A8AE8', hair: '#2A1A10', skin: '#F4D0B0', short: 1, cap: '#E04A4A' },
  aoi:     { body: '#B98FE0', hair: '#3A2418', skin: '#FFE0C8', pony: 1, hat: '#6A4AA8' },
  king:    { body: '#C8342A', hair: '#E8E8E8', skin: '#F4D0B0', crown: 1, robe: 1 },
  inn:     { body: '#F4F0E8', hair: '#6A4A30', skin: '#F4D0B0', apron: '#E88AA8' },
  shop:    { body: '#6A8AB8', hair: '#3A2A20', skin: '#F4D0B0', apron: '#5A4A3A', band: '#E04A4A' },
  shop2:   { body: '#E8A04A', hair: '#4A3020', skin: '#F4D0B0', apron: '#FFFFFF' },
  oji:     { body: '#8A7A5A', hair: '#D8D8D8', skin: '#F0C8A8', bald: 1 },
  oba:     { body: '#A8649A', hair: '#C8C8C8', skin: '#F0C8A8', bun: 1 },
  boy:     { body: '#E8C040', hair: '#3A2418', skin: '#FFE0C8', short: 1 },
  girl:    { body: '#6ACAC0', hair: '#5A3520', skin: '#FFE0C8', bob: 1, ribbon: '#FFFFFF' },
  soldier: { body: '#5A6A8A', hair: '#2A2A2A', skin: '#F4D0B0', helm: 1 },
  banana:  { body: '#FFFFFF', hair: '#2A1A10', skin: '#F4D0B0', short: 1, band: '#FFD24A', banana: 1 },
};

function drawPerson(look, cx, by, dir, step, sc) {
  const L = LOOKS[look] || LOOKS.boy;
  sc = sc || 1;
  ctx.save();
  ctx.translate(cx, by);
  ctx.scale(sc, sc);
  ellipse(0, -1, 11, 4); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
  // あし
  const lg = step ? 3 : -3;
  ctx.fillStyle = '#4A3A4A';
  if (!L.robe) {
    ctx.fillRect(-6, -9 + (dir === 1 || dir === 2 ? 0 : 0), 5, 8 + (step ? 1 : 0));
    ctx.fillRect(1, -9, 5, 8 + (step ? 0 : 1));
  }
  // からだ
  fillRR(-9, -22, 18, 15 + (L.robe ? 7 : 0), 5, L.body);
  if (L.apron) fillRR(-6, -18, 12, 11, 3, L.apron);
  // うで
  ctx.fillStyle = L.skin;
  ctx.fillRect(-12, -20 + (step ? lg * 0.3 : 0), 4, 10);
  ctx.fillRect(8, -20 - (step ? lg * 0.3 : 0), 4, 10);
  if (L.banana) { ctx.fillStyle = '#FFD24A'; ellipse(13, -12, 6, 3, -0.5); ctx.fill(); }
  // あたま
  const hy = -32;
  if (L.twin) { fillC(-12, hy + 4, 5, L.hair); fillC(12, hy + 4, 5, L.hair); }
  if (L.pony && dir !== 0) fillC(dir === 1 ? 10 : dir === 2 ? -10 : 0, hy + 2, 5, L.hair);
  fillC(0, hy, 12, L.hair);
  if (dir !== 3) {
    ellipse(dir === 1 ? -2 : dir === 2 ? 2 : 0, hy + 2, 10, 9.5); ctx.fillStyle = L.skin; ctx.fill();
    // まえがみ
    ctx.fillStyle = L.hair;
    if (L.bald) { /* はげ */ } else {
      ctx.beginPath(); ctx.arc(0, hy - 1, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    }
    // め
    ctx.fillStyle = '#2A2028';
    const ex = dir === 1 ? -3 : dir === 2 ? 3 : 0;
    if (dir === 0) { fillC(-4, hy + 2, 1.8, '#2A2028'); fillC(4, hy + 2, 1.8, '#2A2028'); }
    else fillC(ex + (dir === 1 ? -3 : 3), hy + 2, 1.8, '#2A2028');
    fillC(dir === 0 ? -6 : ex + (dir === 1 ? -6 : 6), hy + 6, 2, 'rgba(255,120,150,0.45)');
    if (dir === 0) fillC(6, hy + 6, 2, 'rgba(255,120,150,0.45)');
  }
  if (L.ribbon) { fillC(-8, hy - 9, 3.2, L.ribbon); fillC(-3, hy - 10, 2.6, L.ribbon); }
  if (L.cap) { fillRR(-12, hy - 12, 24, 7, 3, L.cap); if (dir !== 3) fillR(dir === 1 ? -16 : dir === 2 ? 4 : -6, hy - 7, 12, 3, L.cap); }
  if (L.hat) {
    ctx.fillStyle = L.hat;
    ctx.beginPath(); ctx.moveTo(-14, hy - 6); ctx.lineTo(0, hy - 26); ctx.lineTo(14, hy - 6); ctx.fill();
    fillC(0, hy - 26, 2.5, '#FFE066');
  }
  if (L.crown) {
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath(); ctx.moveTo(-9, hy - 8); ctx.lineTo(-9, hy - 18); ctx.lineTo(-4, hy - 12); ctx.lineTo(0, hy - 19);
    ctx.lineTo(4, hy - 12); ctx.lineTo(9, hy - 18); ctx.lineTo(9, hy - 8); ctx.fill();
  }
  if (L.helm) { ctx.fillStyle = '#9AA8C0'; ctx.beginPath(); ctx.arc(0, hy - 2, 13, Math.PI, 0); ctx.fill(); }
  if (L.band) fillR(-12, hy - 6, 24, 3, L.band);
  if (L.bun) fillC(0, hy - 12, 5, L.hair);
  ctx.restore();
}

// --- まもの ------------------------------------------------------------------------
//  s … おおきさ（はば の はんぶん くらい）

function monEyes(x, y, s, angry) {
  for (const sg of [-1, 1]) {
    fillC(x + sg * s * 0.28, y, s * 0.16, '#FFFFFF');
    fillC(x + sg * s * 0.28, y + s * 0.03, s * 0.09, '#2A2028');
    fillC(x + sg * s * 0.28 - s * 0.03, y - s * 0.03, s * 0.035, '#FFFFFF');
    if (angry) {
      ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath(); ctx.moveTo(x + sg * s * 0.46, y - s * 0.2); ctx.lineTo(x + sg * s * 0.12, y - s * 0.12); ctx.stroke();
    }
  }
}
function monMouth(x, y, s, open) {
  ctx.strokeStyle = '#5A2038'; ctx.lineWidth = Math.max(2, s * 0.05); ctx.lineCap = 'round';
  ctx.beginPath();
  if (open) { ellipse(x, y + s * 0.04, s * 0.13, s * 0.09); ctx.fillStyle = '#7A2438'; ctx.fill(); }
  else { ctx.arc(x, y - s * 0.05, s * 0.14, 0.3, Math.PI - 0.3); ctx.stroke(); }
}
function shade(col, k) {
  const n = parseInt(col.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * k), 0, 255); g = clamp(Math.round(g * k), 0, 255); b = clamp(Math.round(b * k), 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawMon(art, cx, cy, s, col, t, boss) {
  const dk = shade(col, 0.7), lt = shade(col, 1.25);
  const bob = Math.sin(t * 3) * s * 0.04;
  ctx.save();
  ctx.translate(cx, cy + bob);
  ellipse(0, s * 0.95 - bob, s * 0.8, s * 0.16); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  const body = (rx, ry, y) => {
    const g = ctx.createRadialGradient(-rx * 0.35, y - ry * 0.4, rx * 0.1, 0, y, Math.max(rx, ry) * 1.1);
    g.addColorStop(0, lt); g.addColorStop(1, dk);
    ctx.fillStyle = g; ellipse(0, y, rx, ry); ctx.fill();
  };
  switch (art) {
    case 'slime': {
      const g = ctx.createRadialGradient(-s * 0.3, -s * 0.1, s * 0.1, 0, s * 0.3, s);
      g.addColorStop(0, lt); g.addColorStop(1, dk);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, s * 0.85);
      ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s * 0.75);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.2, s * 0.85, s * 0.85);
      ctx.closePath(); ctx.fill();
      fillC(-s * 0.35, -s * 0.2, s * 0.14, 'rgba(255,255,255,0.45)');
      monEyes(0, s * 0.15, s, boss); monMouth(0, s * 0.45, s, 0);
      break;
    }
    case 'bat': {
      const f = Math.sin(t * 10) * 0.35;
      ctx.fillStyle = dk;
      for (const sg of [-1, 1]) {
        ctx.save(); ctx.scale(sg, 1); ctx.rotate(f);
        ctx.beginPath(); ctx.moveTo(s * 0.3, 0); ctx.lineTo(s * 1.1, -s * 0.5); ctx.lineTo(s * 0.95, s * 0.05);
        ctx.lineTo(s * 0.75, -s * 0.05); ctx.lineTo(s * 0.6, s * 0.2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      body(s * 0.45, s * 0.42, 0);
      ctx.fillStyle = dk;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.15, -s * 0.35); ctx.lineTo(sg * s * 0.35, -s * 0.7); ctx.lineTo(sg * s * 0.38, -s * 0.25); ctx.fill(); }
      monEyes(0, -s * 0.05, s * 0.8, boss); monMouth(0, s * 0.18, s * 0.7, 1);
      break;
    }
    case 'bird': {
      body(s * 0.6, s * 0.55, s * 0.15);
      ctx.fillStyle = dk;
      ellipse(-s * 0.55, s * 0.1, s * 0.3, s * 0.18, -0.6 + Math.sin(t * 8) * 0.3); ctx.fill();
      ellipse(s * 0.55, s * 0.1, s * 0.3, s * 0.18, 0.6 - Math.sin(t * 8) * 0.3); ctx.fill();
      ctx.fillStyle = '#FFB020';
      ctx.beginPath(); ctx.moveTo(-s * 0.12, s * 0.1); ctx.lineTo(0, s * 0.35); ctx.lineTo(s * 0.12, s * 0.1); ctx.fill();
      monEyes(0, -s * 0.08, s * 0.8, 1);
      break;
    }
    case 'crab': case 'shell': {
      if (art === 'shell') {
        ctx.fillStyle = '#E8D0A8';
        ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.1); ctx.quadraticCurveTo(0, -s * 1.1, s * 0.6, s * 0.1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#B89060'; ctx.lineWidth = 3;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(s * 0.05, s * 0.1, s * 0.15 * i, Math.PI, 0); ctx.stroke(); }
      }
      body(s * 0.72, s * 0.45, s * 0.3);
      for (const sg of [-1, 1]) {
        ctx.strokeStyle = dk; ctx.lineWidth = s * 0.08;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sg * s * 0.5, s * 0.45 + i * s * 0.08); ctx.lineTo(sg * s * 0.95, s * 0.75 + i * s * 0.08); ctx.stroke(); }
        const cl = Math.sin(t * 5 + sg) * 0.2;
        ctx.save(); ctx.translate(sg * s * 0.85, -s * 0.05); ctx.rotate(sg * (0.3 + cl));
        ctx.fillStyle = col; ellipse(0, 0, s * 0.3, s * 0.22); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(sg * s * 0.05, 0); ctx.lineTo(sg * s * 0.32, -s * 0.05); ctx.lineTo(sg * s * 0.05, -s * 0.08); ctx.fill();
        ctx.restore();
      }
      for (const sg of [-1, 1]) { fillR(sg * s * 0.25 - 2, -s * 0.2, 4, s * 0.25, dk); }
      for (const sg of [-1, 1]) { fillC(sg * s * 0.25, -s * 0.22, s * 0.12, '#FFFFFF'); fillC(sg * s * 0.25, -s * 0.2, s * 0.06, '#2A2028'); }
      monMouth(0, s * 0.42, s * 0.8, 0);
      if (boss) { ctx.fillStyle = '#FFD24A'; star(0, -s * 0.45, s * 0.18); ctx.fill(); }
      break;
    }
    case 'beast': case 'bear': case 'fox': {
      const ear = art === 'fox';
      body(s * 0.62, s * 0.62, s * 0.2);
      ctx.fillStyle = col;
      for (const sg of [-1, 1]) {
        if (ear) { ctx.beginPath(); ctx.moveTo(sg * s * 0.2, -s * 0.3); ctx.lineTo(sg * s * 0.55, -s * 0.8); ctx.lineTo(sg * s * 0.6, -s * 0.2); ctx.fill(); }
        else { fillC(sg * s * 0.45, -s * 0.3, s * 0.18, col); fillC(sg * s * 0.45, -s * 0.3, s * 0.09, lt); }
      }
      ellipse(0, s * 0.3, s * 0.28, s * 0.2); ctx.fillStyle = lt; ctx.fill();
      fillC(0, s * 0.2, s * 0.07, '#2A2028');
      monEyes(0, 0, s * 0.85, art !== 'beast'); monMouth(0, s * 0.38, s * 0.7, art === 'bear');
      if (art === 'fox') {
        ctx.fillStyle = 'rgba(255,190,80,0.8)';
        for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1; fillC(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.4 - s * 0.2, s * 0.12, '#FFB84A'); }
      }
      break;
    }
    case 'star': {
      const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s);
      g.addColorStop(0, lt); g.addColorStop(1, dk);
      ctx.fillStyle = g; star(0, s * 0.1, s * 0.95, 5, 0.5, Math.sin(t) * 0.1); ctx.fill();
      monEyes(0, s * 0.05, s * 0.7, 0); monMouth(0, s * 0.3, s * 0.6, 1);
      break;
    }
    case 'slug': {
      body(s * 0.85, s * 0.4, s * 0.45);
      ctx.fillStyle = lt;
      for (let i = -2; i <= 2; i++) fillC(i * s * 0.28, s * 0.15, s * 0.1, '#FFE0F0');
      for (const sg of [-1, 1]) { ctx.strokeStyle = dk; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(sg * s * 0.2, s * 0.1); ctx.lineTo(sg * s * 0.35, -s * 0.35); ctx.stroke(); fillC(sg * s * 0.35, -s * 0.38, s * 0.07, '#FFE066'); }
      monEyes(0, s * 0.38, s * 0.7, 0); monMouth(0, s * 0.6, s * 0.5, 0);
      break;
    }
    case 'banana': {
      ctx.fillStyle = '#E8B820';
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.9);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.4, s * 0.3, s * 0.9);
      ctx.quadraticCurveTo(s * 0.1, s * 0.95, -s * 0.1, s * 0.75);
      ctx.quadraticCurveTo(s * 0.35, -s * 0.2, -s * 0.35, -s * 0.8);
      ctx.closePath(); ctx.fill();
      fillR(-s * 0.3, -s * 0.98, s * 0.14, s * 0.16, '#6A4A20');
      monEyes(s * 0.2, 0, s * 0.6, 1); monMouth(s * 0.22, s * 0.28, s * 0.55, 1);
      break;
    }
    case 'eel': {
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.34; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const x = -s * 0.8 + u * s * 1.4, y = s * 0.6 - u * s * 1.1 + Math.sin(u * 7 + t * 4) * s * 0.18;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      fillC(s * 0.62, -s * 0.52, s * 0.28, col);
      monEyes(s * 0.66, -s * 0.62, s * 0.55, 1); monMouth(s * 0.7, -s * 0.38, s * 0.5, 1);
      break;
    }
    case 'jelly': {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.7, Math.PI, 0); ctx.quadraticCurveTo(0, s * 0.2, -s * 0.7, -s * 0.1); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.07;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.18, s * 0.05);
        ctx.quadraticCurveTo(i * s * 0.18 + Math.sin(t * 4 + i) * s * 0.15, s * 0.45, i * s * 0.2, s * 0.85); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      monEyes(0, -s * 0.25, s * 0.75, 0); monMouth(0, -s * 0.02, s * 0.6, 0);
      break;
    }
    case 'fish': {
      const pf = 1 + Math.sin(t * 2) * 0.05;
      body(s * 0.75 * pf, s * 0.68 * pf, 0);
      ctx.fillStyle = dk;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.64);
        ctx.lineTo(Math.cos(a + 0.12) * s * 0.9, Math.sin(a + 0.12) * s * 0.84); ctx.lineTo(Math.cos(a + 0.24) * s * 0.7, Math.sin(a + 0.24) * s * 0.64); ctx.fill();
      }
      monEyes(0, -s * 0.12, s * 0.8, 1); monMouth(0, s * 0.25, s * 0.5, 1);
      break;
    }
    case 'octo': {
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const bx = -s * 0.7 + i * s * 0.2;
        ctx.beginPath(); ctx.moveTo(bx, s * 0.2);
        ctx.quadraticCurveTo(bx + Math.sin(t * 3 + i) * s * 0.3, s * 0.6, bx - s * 0.1 + Math.sin(t * 3 + i + 1) * s * 0.3, s * 0.95);
        ctx.stroke();
      }
      body(s * 0.72, s * 0.72, -s * 0.2);
      fillC(-s * 0.3, -s * 0.5, s * 0.14, 'rgba(255,255,255,0.35)');
      monEyes(0, -s * 0.1, s * 0.95, 1); monMouth(0, s * 0.22, s * 0.7, 1);
      if (boss) { fillRR(-s * 0.45, -s * 0.95, s * 0.9, s * 0.18, 6, '#FFFFFF'); fillR(-s * 0.45, -s * 0.9, s * 0.9, s * 0.06, '#E04A4A'); }
      break;
    }
    case 'golem': case 'robot': case 'knight': {
      const metal = art !== 'golem';
      fillRR(-s * 0.55, -s * 0.2, s * 1.1, s * 0.95, s * 0.15, col);
      fillRR(-s * 0.4, -s * 0.85, s * 0.8, s * 0.62, s * 0.14, lt);
      for (const sg of [-1, 1]) fillRR(sg * s * 0.62 - s * 0.14, -s * 0.1, s * 0.28, s * 0.7, s * 0.1, dk);
      if (art === 'robot') {
        fillRR(-s * 0.3, -s * 0.72, s * 0.6, s * 0.3, s * 0.08, '#1E2432');
        fillC(-s * 0.13, -s * 0.57, s * 0.07, '#FF5A5A'); fillC(s * 0.13, -s * 0.57, s * 0.07, '#FF5A5A');
        fillR(-2, -s * 1.05, 4, s * 0.2, dk); fillC(0, -s * 1.08, s * 0.07, '#FFE066');
      } else if (art === 'knight') {
        fillR(-s * 0.3, -s * 0.6, s * 0.6, s * 0.08, '#1E2432');
        ctx.fillStyle = '#E04A4A'; ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(s * 0.12, -s * 1.15); ctx.lineTo(-s * 0.05, -s * 1.1); ctx.fill();
        fillR(s * 0.62, -s * 0.9, s * 0.08, s * 1.3, '#C8D2E0');
      } else {
        monEyes(0, -s * 0.55, s * 0.7, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 4; i++) fillC(-s * 0.3 + i * s * 0.2, s * 0.2, s * 0.06, 'rgba(0,0,0,0.2)');
      }
      if (metal) fillR(-s * 0.4, s * 0.1, s * 0.8, s * 0.08, '#FFB020');
      break;
    }
    case 'oni': {
      body(s * 0.65, s * 0.7, s * 0.15);
      ctx.fillStyle = '#FFF4D8';
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.2, -s * 0.45); ctx.lineTo(sg * s * 0.3, -s * 0.85); ctx.lineTo(sg * s * 0.42, -s * 0.4); ctx.fill(); }
      fillRR(-s * 0.5, s * 0.45, s, s * 0.25, 6, '#FFD24A');
      ctx.fillStyle = '#2A2028'; for (let i = 0; i < 4; i++) fillC(-s * 0.36 + i * s * 0.24, s * 0.58, s * 0.05, '#2A2028');
      monEyes(0, -s * 0.1, s * 0.9, 1); monMouth(0, s * 0.22, s * 0.7, 1);
      fillR(s * 0.62, -s * 0.5, s * 0.12, s * 1.2, '#6A4A30');
      break;
    }
    case 'fairy': {
      ctx.fillStyle = 'rgba(200,240,255,0.7)';
      for (const sg of [-1, 1]) { ellipse(sg * s * 0.45, -s * 0.2, s * 0.4, s * 0.22, sg * (0.6 + Math.sin(t * 9) * 0.3)); ctx.fill(); }
      body(s * 0.42, s * 0.5, 0);
      ctx.fillStyle = 'rgba(255,255,200,0.4)'; circ(0, 0, s * 0.8 + Math.sin(t * 4) * s * 0.06); ctx.fill();
      monEyes(0, -s * 0.05, s * 0.65, 0); monMouth(0, s * 0.2, s * 0.5, 0);
      break;
    }
    case 'tengu': {
      body(s * 0.62, s * 0.7, s * 0.2);
      ctx.fillStyle = '#FFFFFF'; ellipse(0, -s * 0.6, s * 0.5, s * 0.18); ctx.fill();
      fillR(-s * 0.2, -s * 0.95, s * 0.4, s * 0.3, '#2A2028');
      ctx.fillStyle = shade(col, 0.85);
      ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.05); ctx.lineTo(s * 0.55, s * 0.05); ctx.lineTo(-s * 0.08, s * 0.15); ctx.fill();
      monEyes(0, -s * 0.22, s * 0.9, 1);
      ctx.fillStyle = '#3A6A3A';
      ctx.save(); ctx.translate(-s * 0.75, s * 0.1); ctx.rotate(Math.sin(t * 4) * 0.4);
      ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.25; ctx.lineTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55); } ctx.closePath(); ctx.fill();
      ctx.restore();
      fillR(-s * 0.4, s * 0.5, s * 0.8, s * 0.1, '#FFFFFF');
      break;
    }
    case 'maou': {
      // まおう くろがね：てつの よろいの 大男。むねに ようこうろ の ひかり
      ctx.fillStyle = 'rgba(255,80,30,0.25)'; circ(0, 0, s * 1.05 + Math.sin(t * 3) * s * 0.05); ctx.fill();
      fillRR(-s * 0.8, -s * 0.15, s * 1.6, s * 1.0, s * 0.2, '#3A3448');
      fillRR(-s * 0.95, -s * 0.3, s * 0.45, s * 0.35, s * 0.1, '#5A5068');
      fillRR(s * 0.5, -s * 0.3, s * 0.45, s * 0.35, s * 0.1, '#5A5068');
      const glow = 0.6 + Math.sin(t * 4) * 0.3;
      fillC(0, s * 0.3, s * 0.22, 'rgba(255,120,40,' + glow + ')');
      fillC(0, s * 0.3, s * 0.12, '#FFE066');
      fillRR(-s * 0.4, -s * 0.85, s * 0.8, s * 0.7, s * 0.16, '#4A4458');
      ctx.fillStyle = '#8A8098';
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.3, -s * 0.8); ctx.lineTo(sg * s * 0.6, -s * 1.25); ctx.lineTo(sg * s * 0.45, -s * 0.75); ctx.fill(); }
      fillRR(-s * 0.3, -s * 0.62, s * 0.6, s * 0.18, s * 0.06, '#1A1420');
      fillC(-s * 0.13, -s * 0.53, s * 0.06, '#FF4A2A'); fillC(s * 0.13, -s * 0.53, s * 0.06, '#FF4A2A');
      fillR(-s * 0.2, -s * 0.3, s * 0.4, s * 0.05, '#FFB020');
      break;
    }
    default:
      body(s * 0.6, s * 0.6, 0); monEyes(0, 0, s, 0); monMouth(0, s * 0.3, s, 0);
  }
  ctx.restore();
}

// パーティ の かお（たたかいの ステータスに 出す）
function drawFace(id, cx, cy, r, dead) {
  const L = LOOKS[id];
  ctx.save();
  if (dead) ctx.globalAlpha = 0.45;
  fillC(cx, cy, r, L.hair);
  fillC(cx, cy + r * 0.12, r * 0.84, L.skin);
  ctx.fillStyle = L.hair;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.05, r, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
  if (dead) {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 2;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sg * r * 0.35 - 3, cy + r * 0.1 - 3); ctx.lineTo(cx + sg * r * 0.35 + 3, cy + r * 0.1 + 3); ctx.moveTo(cx + sg * r * 0.35 + 3, cy + r * 0.1 - 3); ctx.lineTo(cx + sg * r * 0.35 - 3, cy + r * 0.1 + 3); ctx.stroke(); }
  } else {
    fillC(cx - r * 0.35, cy + r * 0.12, r * 0.13, '#2A2028');
    fillC(cx + r * 0.35, cy + r * 0.12, r * 0.13, '#2A2028');
    fillC(cx - r * 0.55, cy + r * 0.42, r * 0.14, 'rgba(255,120,150,0.5)');
    fillC(cx + r * 0.55, cy + r * 0.42, r * 0.14, 'rgba(255,120,150,0.5)');
  }
  if (L.ribbon) fillC(cx - r * 0.7, cy - r * 0.75, r * 0.25, L.ribbon);
  if (L.cap) fillRR(cx - r, cy - r * 1.05, r * 2, r * 0.5, 4, L.cap);
  if (L.hat) { ctx.fillStyle = L.hat; ctx.beginPath(); ctx.moveTo(cx - r * 1.1, cy - r * 0.6); ctx.lineTo(cx, cy - r * 1.9); ctx.lineTo(cx + r * 1.1, cy - r * 0.6); ctx.fill(); }
  ctx.restore();
}
