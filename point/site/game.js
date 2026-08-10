// りなの えいごポインター
//
// ★ this / that / these / those / it / they / which / what を
//   「絵を 見れば 意味が わかる」ように おぼえる ゲーム。
//
// ★ かんがえかたは たった 2つ。
//     ちかい か とおい か … ちかい=this/these  とおい=that/those
//     1つ か 2つ いじょう か … 1つ=this/that/it  2つ=these/those/they
//   だから 画面は いつも「りなの すぐ前の 台（ちかい）」と
//   「むこうの 台（とおい）」の 2つだけ。ここに ものを 置いて 見せる。
//
// ★ which は「どれ？」。what は「なに？」。
//   which は えらぶ、what は 名まえを こたえる、と 絵で わける。
//
// ★ 音は パソコンや スマホの 読みあげ（speechSynthesis）を つかう。
//   音の ファイルは 1つも つかわない。つかえない 機械では だまって すすむ。

'use strict';

const GAME_VER = 1;
const HUD = 26;

// 色の 名まえ（which で つかう）
const COLORS = [
  { en: 'red', ja: 'あかい', hex: '#E8434A' },
  { en: 'blue', ja: 'あおい', hex: '#4A9BFF' },
  { en: 'green', ja: 'みどりの', hex: '#5AC86A' },
  { en: 'yellow', ja: 'きいろい', hex: '#FFD24A' },
  { en: 'pink', ja: 'ピンクの', hex: '#FF7AA8' },
  { en: 'white', ja: 'しろい', hex: '#FFFFFF' },
];
// 色を ぬっても おかしく ない もの
const PAINTABLE = ['ball', 'star', 'flower', 'umbrella', 'hat', 'car', 'book', 'cup', 'key'];

const LESSONS = [
  { key: 'this', name: 'this / that',
    about: 'ちかい 1つ は This、とおい 1つ は That' },
  { key: 'these', name: 'these / those',
    about: 'ちかい たくさん は These、とおい たくさん は Those' },
  { key: 'itthey', name: 'it / they',
    about: '1つ は It、2つ いじょう は They' },
  { key: 'which', name: 'which',
    about: 'Which は「どれ？」。えらぶ ときの ことば' },
  { key: 'what', name: 'what',
    about: 'What は「なに？」。名まえを きく ときの ことば' },
  { key: 'mix', name: 'まとめテスト',
    about: 'ぜんぶ まぜて 出る' },
];

const N_Q = 8;          // 1レッスンの もんだい数
const PASS = 6;         // クリアに ひつような せいかい数

const SAVE_KEY = 'point.save.v1';
const save = { open: 1, clear: {}, best: {}, total: 0, right: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(LESSONS.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (typeof s.total === 'number') save.total = s.total;
  if (typeof s.right === 'number') save.right = s.right;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, lesson: 0,
  qs: [], qi: 0, q: null, picked: -1, right: 0, showT: 0,
  done: false, shakeT: 0, popT: 0,
};

// --- 読みあげ -----------------------------------------------------------------------

let voiceOK = true;
function speak(text) {
  if (!voiceOK) return;
  try {
    const S = window.speechSynthesis;
    if (!S) { voiceOK = false; return; }
    S.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.82;
    u.pitch = 1.15;
    S.speak(u);
  } catch (e) { voiceOK = false; }
}

// --- もんだい を つくる --------------------------------------------------------------

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function pickItems(n, notKey) {
  const bag = ITEMS.filter((it) => it.key !== notKey);
  shuffle(bag);
  return bag.slice(0, n);
}

// 場面：{ near: [ {item,col,n} ], far: [ ... ], mark: 'near'|'far'|index }
function qThisThat() {
  const near = Math.random() < 0.5;
  const it = pick(ITEMS);
  const q = {
    kind: 'word',
    scene: { near: near ? [{ item: it, n: 1 }] : [], far: near ? [] : [{ item: it, n: 1 }], mark: near ? 'near' : 'far' },
    text: ['____', 'is', it.a, it.en + '.'],
    ja: (near ? 'これは' : 'あれは') + ' ' + it.ja + ' です。',
    choices: ['This', 'That'],
    ans: near ? 0 : 1,
    why: near ? 'ちかく に ある 1つ だから This' : 'とおく に ある 1つ だから That',
    say: (near ? 'This' : 'That') + ' is ' + it.a + ' ' + it.en + '.',
  };
  return q;
}
function qTheseThose() {
  const near = Math.random() < 0.5;
  const it = pick(ITEMS);
  const n = 2 + Math.floor(Math.random() * 2);
  return {
    kind: 'word',
    scene: { near: near ? [{ item: it, n: n }] : [], far: near ? [] : [{ item: it, n: n }], mark: near ? 'near' : 'far' },
    text: ['____', 'are', it.ens + '.'],
    ja: (near ? 'これらは' : 'あれらは') + ' ' + it.ja + ' です。',
    choices: ['These', 'Those'],
    ans: near ? 0 : 1,
    why: near ? 'ちかく に ある 2つ いじょう だから These' : 'とおく に ある 2つ いじょう だから Those',
    say: (near ? 'These' : 'Those') + ' are ' + it.ens + '.',
  };
}
function qItThey() {
  const one = Math.random() < 0.5;
  const it = pick(ITEMS);
  const n = one ? 1 : 2 + Math.floor(Math.random() * 2);
  const near = Math.random() < 0.5;
  return {
    kind: 'word',
    scene: { near: near ? [{ item: it, n: n }] : [], far: near ? [] : [{ item: it, n: n }], mark: near ? 'near' : 'far' },
    text: one ? ['____', 'is', it.a, it.en + '.'] : ['____', 'are', it.ens + '.'],
    ja: (one ? 'それは' : 'それらは') + ' ' + it.ja + ' です。',
    choices: ['It', 'They'],
    ans: one ? 0 : 1,
    why: one ? '1つ だから It' : '2つ いじょう だから They',
    say: (one ? 'It is ' + it.a + ' ' + it.en : 'They are ' + it.ens) + '.',
  };
}
function qWhich() {
  const byColor = Math.random() < 0.5;
  if (byColor) {
    const key = pick(PAINTABLE);
    const it = ITEM_BY[key];
    const cs = shuffle(COLORS.slice()).slice(0, 3);
    const ans = Math.floor(Math.random() * 3);
    return {
      kind: 'tap',
      scene: { near: cs.map((c) => ({ item: it, n: 1, col: c.hex })), far: [], mark: -1 },
      text: ['Which', 'one', 'is', cs[ans].en + '?'],
      ja: 'どれが ' + cs[ans].ja + ' ' + it.ja + '？',
      ans: ans,
      why: 'Which は「どれ？」。ならんだ 中から えらぶ ときに つかう',
      say: 'Which one is ' + cs[ans].en + '?',
      after: 'This one is ' + cs[ans].en + '.',
    };
  }
  const its = pickItems(3);
  const ans = Math.floor(Math.random() * 3);
  return {
    kind: 'tap',
    scene: { near: its.map((i) => ({ item: i, n: 1 })), far: [], mark: -1 },
    text: ['Which', 'one', 'is', its[ans].a, its[ans].en + '?'],
    ja: 'どれが ' + its[ans].ja + '？',
    ans: ans,
    why: 'Which は「どれ？」。ならんだ 中から えらぶ ときに つかう',
    say: 'Which one is ' + its[ans].a + ' ' + its[ans].en + '?',
    after: 'This one is ' + its[ans].a + ' ' + its[ans].en + '.',
  };
}
function qWhat() {
  const near = Math.random() < 0.5;
  const one = Math.random() < 0.6;
  const it = pick(ITEMS);
  const n = one ? 1 : 2 + Math.floor(Math.random() * 2);
  const others = pickItems(2, it.key);
  const words = shuffle([it, others[0], others[1]]);
  const ans = words.indexOf(it);
  const head = one ? (near ? 'What is this?' : 'What is that?')
                   : (near ? 'What are these?' : 'What are those?');
  return {
    kind: 'word',
    scene: { near: near ? [{ item: it, n: n }] : [], far: near ? [] : [{ item: it, n: n }], mark: near ? 'near' : 'far' },
    head: head,
    text: one ? ['It', 'is', '____'] : ['They', 'are', '____'],
    ja: head + ' … ' + (one ? 'それは なに？' : 'それらは なに？'),
    choices: words.map((w) => (one ? w.a + ' ' + w.en : w.ens)),
    ans: ans,
    why: 'What は「なに？」。名まえを こたえる。' + (one ? '1つ なら It is 〜' : '2つ いじょう なら They are 〜'),
    say: head + ' ' + (one ? 'It is ' + it.a + ' ' + it.en : 'They are ' + it.ens) + '.',
  };
}

const MAKERS = { this: qThisThat, these: qTheseThose, itthey: qItThey, which: qWhich, what: qWhat };

function makeQuestions(key) {
  const list = [];
  if (key === 'mix') {
    const keys = ['this', 'these', 'itthey', 'which', 'what'];
    for (let i = 0; i < N_Q; i++) list.push(MAKERS[keys[i % keys.length]]());
    return shuffle(list);
  }
  for (let i = 0; i < N_Q; i++) list.push(MAKERS[key]());
  return list;
}

// --- ながれ -------------------------------------------------------------------------

function startLesson(n) {
  G.lesson = n;
  G.qs = makeQuestions(LESSONS[n].key);
  G.qi = 0; G.right = 0; G.done = false;
  G.screen = 'play';
  setQ();
}
function setQ() {
  G.q = G.qs[G.qi];
  G.picked = -1; G.showT = 0; G.shakeT = 0; G.popT = 0;
  audioStart();
  speak(G.q.head ? G.q.say : G.q.say);
}
function answer(i) {
  if (G.picked >= 0) return;
  G.picked = i;
  save.total++;
  const ok = i === G.q.ans;
  if (ok) {
    G.right++; save.right++; G.popT = 0.8;
    sfxGet();
    speak(G.q.after || G.q.say);
  } else {
    G.shakeT = 0.5;
    sfxNg();
  }
  storeSave();
}
function nextQ() {
  G.qi++;
  if (G.qi >= G.qs.length) {
    G.done = true;
    const key = 'l' + G.lesson;
    if (!save.best[key] || G.right > save.best[key]) save.best[key] = G.right;
    if (G.right >= PASS) {
      save.clear[G.lesson] = true;
      if (G.lesson + 1 >= save.open) save.open = Math.min(LESSONS.length, G.lesson + 2);
    }
    storeSave();
    if (G.right >= PASS) sfxClear(G.right === N_Q); else sfxOver();
    return;
  }
  setQ();
}

function update(dt) {
  G.t += dt;
  if (G.shakeT > 0) G.shakeT -= dt;
  if (G.popT > 0) G.popT -= dt;
  if (G.picked >= 0) G.showT += dt;
}

// --- 絵 -----------------------------------------------------------------------------

function sceneBox() {
  const w = Math.min(VW * 0.60, VW - 300);
  return { x: 8, y: HUD + 6, w: w, h: VH - HUD - 16 };
}
function panelBox() {
  const s = sceneBox();
  return { x: s.x + s.w + 12, y: HUD + 6, w: VW - (s.x + s.w) - 24, h: VH - HUD - 16 };
}

function drawRoom(B) {
  ctx.fillStyle = '#EDE3D2';
  rr(B.x, B.y, B.w, B.h, 12); ctx.fill();
  ctx.save();
  rr(B.x, B.y, B.w, B.h, 12); ctx.clip();
  // かべ
  const g = ctx.createLinearGradient(0, B.y, 0, B.y + B.h * 0.62);
  g.addColorStop(0, '#CFE4F2'); g.addColorStop(1, '#EAF4FA');
  ctx.fillStyle = g;
  ctx.fillRect(B.x, B.y, B.w, B.h * 0.62);
  // ゆか
  ctx.fillStyle = '#D8B98A';
  ctx.fillRect(B.x, B.y + B.h * 0.62, B.w, B.h * 0.38);
  ctx.strokeStyle = 'rgba(140,100,60,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i <= 8; i++) {
    const px = B.x + B.w * (i / 8);
    ctx.beginPath();
    ctx.moveTo(B.x + B.w / 2 + (px - B.x - B.w / 2) * 0.42, B.y + B.h * 0.62);
    ctx.lineTo(px, B.y + B.h);
    ctx.stroke();
  }
  // まど
  ctx.fillStyle = '#BFE4F4';
  rr(B.x + B.w * 0.72, B.y + B.h * 0.08, B.w * 0.2, B.h * 0.22, 6); ctx.fill();
  ctx.strokeStyle = '#FFF'; ctx.lineWidth = 4;
  rr(B.x + B.w * 0.72, B.y + B.h * 0.08, B.w * 0.2, B.h * 0.22, 6); ctx.stroke();
  ctx.restore();
}

function tableFar(B) { return { y: B.y + B.h * 0.50, cx: B.x + B.w * 0.62, w: B.w * 0.44 }; }
function tableNear(B) { return { y: B.y + B.h * 0.86, cx: B.x + B.w * 0.56, w: B.w * 0.80 }; }

function drawTable(t, h, col) {
  ctx.fillStyle = col;
  rr(t.cx - t.w / 2, t.y, t.w, h, h * 0.3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  rr(t.cx - t.w / 2 + t.w * 0.08, t.y + h, t.w * 0.06, h * 1.6, 2); ctx.fill();
  rr(t.cx + t.w / 2 - t.w * 0.14, t.y + h, t.w * 0.06, h * 1.6, 2); ctx.fill();
}

// もののならび（タップの あたり判定にも つかう）
function slots(B, where, groups) {
  const t = where === 'near' ? tableNear(B) : tableFar(B);
  const s = where === 'near' ? B.w * 0.075 : B.w * 0.042;
  const out = [];
  let total = 0;
  for (const g of groups) total += g.n;
  const gap = Math.min(s * 2.5, (t.w - s * 2) / Math.max(1, total));
  let x = t.cx - (total - 1) * gap / 2;
  for (let gi = 0; gi < groups.length; gi++) {
    for (let k = 0; k < groups[gi].n; k++) {
      out.push({ x: x, y: t.y - s * 1.05, s: s, gi: gi, g: groups[gi] });
      x += gap;
    }
  }
  return out;
}

function drawScene(B) {
  const q = G.q;
  drawRoom(B);
  const tf = tableFar(B), tn = tableNear(B);
  drawTable(tf, B.h * 0.035, '#B98A5A');
  const far = slots(B, 'far', q.scene.far);
  for (const o of far) {
    ctx.save(); ctx.globalAlpha = 0.96;
    o.g.item.draw(o.x, o.y, o.s, o.g.col);
    ctx.restore();
  }
  drawTable(tn, B.h * 0.05, '#C89A62');
  const near = slots(B, 'near', q.scene.near);
  for (const o of near) o.g.item.draw(o.x, o.y, o.s, o.g.col);

  // りな（ちかい/とおい を ゆびさす）
  const rs = B.h * 0.11;
  const rx = B.x + B.w * 0.11, ry = B.y + B.h * 0.74;
  const pointing = q.scene.mark === 'near' || q.scene.mark === 'far';
  drawRinaBody(rx, ry, rs, {
    arm: pointing ? 1 : 0, dir: 1,
    mood: G.picked >= 0 ? (G.picked === q.ans ? 'happy' : 'sad') : 'normal',
  });

  // どこを 見て いるか の しるし
  if (pointing) {
    const list = q.scene.mark === 'near' ? near : far;
    if (list.length) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ss = 0;
      for (const o of list) {
        x0 = Math.min(x0, o.x - o.s); x1 = Math.max(x1, o.x + o.s);
        y0 = Math.min(y0, o.y - o.s); y1 = Math.max(y1, o.y + o.s);
        ss = o.s;
      }
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -G.t * 22;
      ctx.strokeStyle = q.scene.mark === 'near' ? '#FF6FA8' : '#4A9BFF';
      ctx.lineWidth = 3;
      rr(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20, 14); ctx.stroke();
      ctx.restore();
      const lab = q.scene.mark === 'near' ? 'ちかい' : 'とおい';
      const cx = (x0 + x1) / 2;
      ctx.fillStyle = q.scene.mark === 'near' ? '#FF6FA8' : '#4A9BFF';
      const tw = 54;
      rr(cx - tw / 2, y0 - 34, tw, 20, 8); ctx.fill();
      bigText(lab, cx, y0 - 24, 13, '#FFF', null);
    }
  }

  // which は もの を タップ
  if (q.kind === 'tap' && G.picked < 0) {
    for (const o of near) {
      const b = button(o.x - o.s * 1.15, o.y - o.s * 1.15, o.s * 2.3, o.s * 2.3, () => answer(o.gi));
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(G.t * 3 + o.gi);
      ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = 3;
      rr(b.x, b.y, b.w, b.h, 14); ctx.stroke();
      ctx.restore();
    }
  }
  if (q.kind === 'tap' && G.picked >= 0) {
    for (const o of near) {
      if (o.gi !== q.ans && o.gi !== G.picked) continue;
      ctx.strokeStyle = o.gi === q.ans ? '#3ABE6A' : '#E8546A';
      ctx.lineWidth = 4;
      rr(o.x - o.s * 1.15, o.y - o.s * 1.15, o.s * 2.3, o.s * 2.3, 14); ctx.stroke();
    }
  }
}

function drawPanel(P) {
  const q = G.q;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(P.x, P.y, P.w, P.h, 12); ctx.fill();

  let y = P.y + 26;
  if (q.head) {
    const fs = fitSize(q.head, P.w - 20, 24);
    bigText(q.head, P.x + P.w / 2, y, fs, '#FFE9A8');
    y += 30;
  }
  // えいごの ぶん
  const words = q.text.slice();
  if (G.picked >= 0 && q.choices) {
    for (let i = 0; i < words.length; i++) if (words[i] === '____') words[i] = q.choices[G.picked];
  }
  const line = words.join(' ');
  const fs = fitSize(line, P.w - 18, 28);
  const shake = G.shakeT > 0 ? Math.sin(G.t * 50) * 5 : 0;
  bigText(line, P.x + P.w / 2 + shake, y + 10,
          fs, G.picked < 0 ? '#FFFFFF' : (G.picked === q.ans ? '#8CF0A8' : '#FF9AA8'));
  y += 34;
  bigText(q.ja, P.x + P.w / 2, y, fitSize(q.ja, P.w - 16, 15), '#CFE0FF', null);
  y += 22;

  // 🔊
  const sw = 96;
  drawButton(button(P.x + P.w / 2 - sw / 2, y, sw, 30, () => speak(q.say)), '♪ もういちど', '#8AD8F0');
  y += 42;

  if (q.choices) {
    const bh = Math.min(48, (P.h - (y - P.y) - 74) / q.choices.length - 8);
    for (let i = 0; i < q.choices.length; i++) {
      const by = y + i * (bh + 8);
      let col = '#FFD24A';
      if (G.picked >= 0) {
        if (i === q.ans) col = '#5ADC80';
        else if (i === G.picked) col = '#FF7A8A';
        else col = 'rgba(255,255,255,0.22)';
      }
      const b = button(P.x + 10, by, P.w - 20, bh, G.picked < 0 ? () => answer(i) : null);
      drawButton(b, q.choices[i], col, G.picked >= 0 && i !== q.ans && i !== G.picked ? '#DDD' : '#241C34');
    }
    y += q.choices.length * (bh + 8);
  } else {
    bigText('絵を タップ してね', P.x + P.w / 2, y + 10, 16, '#FFE9A8', null);
    y += 30;
  }

  if (G.picked >= 0) {
    const okk = G.picked === q.ans;
    bigText(okk ? 'せいかい！' : 'おしい！', P.x + P.w / 2, P.h + P.y - 66, 22,
            okk ? '#8CF0A8' : '#FF9AA8');
    const w2 = fitSize(q.why, P.w - 16, 14);
    bigText(q.why, P.x + P.w / 2, P.h + P.y - 42, w2, '#E8E0FF', null);
    const nb = Math.min(160, P.w - 24);
    drawButton(button(P.x + P.w / 2 - nb / 2, P.y + P.h - 32, nb, 28,
                      () => nextQ()), G.qi + 1 >= G.qs.length ? 'けっか' : 'つぎへ', '#8AD8F0');
  }
}

function drawPlay() {
  bgGrad('#31406E', '#141A30');
  const B = sceneBox(), P = panelBox();
  drawScene(B);
  drawPanel(P);
  drawHud();
  if (G.popT > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(G.popT * 1.6, 0, 1);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + G.t;
      const r = (0.8 - G.popT) * 90 + 20;
      ctx.fillStyle = ['#FFD24A', '#FF7AA8', '#8AD8F0'][i % 3];
      circle(B.x + B.w / 2 + Math.cos(a) * r, B.y + B.h * 0.5 + Math.sin(a) * r, 7);
      ctx.fill();
    }
    ctx.restore();
  }
  if (G.done) {
    const okk = G.right >= PASS;
    const last = G.lesson >= LESSONS.length - 1;
    drawResult(okk, okk ? 'よくできました！' : 'もうすこし！',
      [G.right + ' / ' + N_Q + ' もん せいかい',
       okk ? (last ? 'ぜんぶ おわり！ えいごマスター！' : 'つぎの レッスンが ひらいたよ')
           : (PASS + 'もん いじょうで つぎに すすめる')],
      okk && !last
        ? [{ label: 'つぎへ', on: () => startLesson(G.lesson + 1) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startLesson(G.lesson) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }],
      '#8CF0A8');
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(LESSONS[G.lesson].name, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#DCE8FF';
  ctx.fillText('もんだい ' + Math.min(G.qi + 1, N_Q) + ' / ' + N_Q, 150, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('せいかい ' + G.right, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // ○ の ならび
  for (let i = 0; i < N_Q; i++) {
    const x = 250 + i * 14;
    ctx.fillStyle = i < G.qi ? '#5ADC80' : (i === G.qi ? '#FFD24A' : 'rgba(255,255,255,0.25)');
    circle(x, HUD / 2, 4.5); ctx.fill();
  }
}

function drawTitle() {
  bgGrad('#31406E', '#141A30');
  bigText('りなの', VW / 2, 38, 20, '#FFC0DC');
  bigText('えいごポインター', VW / 2, 74, fitSize('えいごポインター', VW * 0.6, 42), '#FFD24A');
  bigText('this / that / these / those / it / they / which / what', VW / 2, 112,
          fitSize('this / that / these / those / it / they / which / what', VW * 0.9, 17), '#DDE8FF', null);
  bigText('絵を 見ながら、ちかい？ とおい？ 1つ？ たくさん？ で えらぶ', VW / 2, 136, 15, '#B8C8F0', null);

  const cols = VW > 820 ? 3 : 2;
  const cw = Math.min(230, (VW - 60 - (cols - 1) * 12) / cols), ch = 54;
  let by = 162;
  for (let i = 0; i < LESSONS.length; i++) {
    const x = (VW - (cols * cw + (cols - 1) * 12)) / 2 + (i % cols) * (cw + 12);
    const y = by + Math.floor(i / cols) * (ch + 10);
    const ok = i < save.open;
    const b = button(x, y, cw, ch, ok ? () => startLesson(i) : null);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    rr(b.x + 3, b.y + 3, cw, ch, 10); ctx.fill();
    ctx.fillStyle = ok ? (save.clear[i] ? '#FFD24A' : '#5A6AA6') : '#2A3050';
    rr(b.x, b.y, cw, ch, 10); ctx.fill();
    bigText(ok ? LESSONS[i].name : '？？？', b.x + cw / 2, b.y + 18,
            fitSize(LESSONS[i].name, cw - 16, 19), ok ? (save.clear[i] ? '#2A2038' : '#FFF') : '#5A6488', null);
    if (ok) {
      bigText(LESSONS[i].about, b.x + cw / 2, b.y + 39,
              fitSize(LESSONS[i].about, cw - 14, 12),
              save.clear[i] ? 'rgba(42,32,56,0.85)' : 'rgba(255,255,255,0.75)', null);
      const bs = save.best['l' + i];
      if (bs !== undefined) bigText(bs + '/' + N_Q, b.x + cw - 20, b.y + 12, 12,
                                    save.clear[i] ? '#2A2038' : '#FFD24A', null);
    }
  }
  by += Math.ceil(LESSONS.length / cols) * (ch + 10) + 6;
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, by, sw, 34, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, by, sw, 34, () => { audioStart(); speak('Hello! This is a cat. That is a dog.'); }),
             '♪ こえテスト', '#C8BCE8');
  bigText('これまでに ' + save.right + ' / ' + save.total + ' もん せいかい',
          VW / 2, VH - 16, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#31406E', '#141A30');
  bigText('あそびかた', VW / 2, 36, 26, '#FFD24A');
  const lines = [
    '① 絵を 見る。りなの すぐ前の 台は「ちかい」、むこうの 台は「とおい」',
    '② ちかい 1つ = This／とおい 1つ = That',
    '③ ちかい たくさん = These／とおい たくさん = Those',
    '④ 1つ = It／2つ いじょう = They（もう 何の話か わかって いる とき）',
    '⑤ Which =「どれ？」えらぶ。What =「なに？」名まえを こたえる',
    '⑥ 8もん中 6もん せいかいで つぎの レッスンが ひらく',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 76 + i * 30, fitSize(s, VW * 0.9, 16), '#F0EAFF', null));
  // みほん
  const y = 76 + lines.length * 30 + 14;
  const s = 26;
  ITEM_BY.cat.draw(VW * 0.3, y + s, s);
  bigText('This is a cat.', VW * 0.3, y + s * 2.3, 15, '#FFE9A8', null);
  ITEM_BY.apple.draw(VW * 0.5 - s * 1.2, y + s, s * 0.8);
  ITEM_BY.apple.draw(VW * 0.5, y + s, s * 0.8);
  ITEM_BY.apple.draw(VW * 0.5 + s * 1.2, y + s, s * 0.8);
  bigText('These are apples.', VW * 0.5, y + s * 2.3, 15, '#FFE9A8', null);
  ITEM_BY.car.draw(VW * 0.7, y + s, s * 0.72);
  bigText('That is a car.', VW * 0.7, y + s * 2.3, 15, '#FFE9A8', null);
  const bw = Math.min(170, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 40, bw, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
