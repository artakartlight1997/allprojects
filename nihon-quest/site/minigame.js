// ミニゲーム。止まった県の「地方」で種類が変わり、中身はその県のものになる。
//
//   北海道・東北   めいさんキャッチ   その県の名産だけを受け止める
//   関東・近畿     はやおしクイズ     その県の問題を 3 問つづけて
//   中部・中国     はしってゴール     短い横スクロール。地方の景色になる
//   四国・九州沖縄 きたからじゅんに   その地方の県を 北から順にタップ
//
// どれも 20 秒くらいで終わり、しっぱいしても損はしない（コインが減らない）。

'use strict';

const MINI_BY_REGION = {
  '北海道': 'catch', '東北': 'catch',
  '関東': 'quiz3', '近畿': 'quiz3',
  '中部': 'run', '中国': 'run',
  '四国': 'order', '九州・沖縄': 'order',
};

const MINI_TITLE = {
  catch: 'めいさん キャッチ',
  quiz3: 'はやおし クイズ',
  run: 'はしって ゴール',
  order: 'きたから じゅんに',
};

const mini = {
  kind: null, pref: null, onDone: null,
  t: 0, limit: 20, score: 0, over: false, overT: 0,
  items: [], basket: 0.5, aim: 0.5,
  q: null, qi: 0, qResult: 0, qResultT: 0,
  order: [], picked: [], wrongT: 0,
  run: null,
};

// 南北が MIN_NS 以上はなれた 4 県をえらぶ（must はかならず入れる）
const MIN_NS = 55;      // 量子化した単位。だいたい 50km

function pickSpreadNS(rnd, pool, must) {
  for (let tryN = 0; tryN < 60; tryN++) {
    const cand = shuffle(rnd, pool.filter(p => p.id !== must.id));
    const out = [must];
    for (const p of cand) {
      if (out.length >= 4) break;
      if (out.every(o => Math.abs(o.cy - p.cy) >= MIN_NS)) out.push(p);
    }
    if (out.length === 4) return out;
  }
  return null;
}

function miniStart(pref, onDone) {
  mini.kind = MINI_BY_REGION[pref.region] || 'catch';
  mini.pref = pref;
  mini.onDone = onDone;
  mini.t = 0; mini.score = 0; mini.over = false; mini.overT = 0;
  mini.items = []; mini.basket = 0.5; mini.aim = 0.5;
  mini.q = null; mini.qi = 0; mini.qResult = 0; mini.qResultT = 0;
  mini.picked = []; mini.wrongT = 0;
  mini.limit = 20;

  if (mini.kind === 'quiz3') {
    mini.limit = 30;
    nextMiniQuestion();
  } else if (mini.kind === 'order') {
    mini.limit = 25;
    // その地方から 4 県。北から順（地図の y が小さいほど北）。
    // 南北がほとんど同じ県どうしだと、どちらが北か分からず運になってしまうので、
    // じゅうぶん離れている組み合わせだけを使う。
    const rnd = mulberry32((Math.random() * 1e9) | 0);
    mini.order = pickSpreadNS(rnd, PREFS.filter(p => p.region === pref.region), pref)
              || pickSpreadNS(rnd, PREFS, pref);
    mini.answer = mini.order.slice().sort((a, b) => a.cy - b.cy).map(p => p.id);
    mini.order = shuffle(rnd, mini.order);
  } else if (mini.kind === 'run') {
    mini.limit = 24;
    mini.run = makeRun(pref);
  }
  game.screen = 'mini';
}

function miniFinish() {
  if (mini.over) return;
  mini.over = true;
  mini.overT = 0;
}

function miniClose() {
  const kind = mini.kind;
  let coins = 100, line = '';
  if (kind === 'catch') {
    coins = 100 + mini.score * 120;
    line = mini.pref.name + ' の名産を ' + mini.score + ' こ キャッチ！';
  } else if (kind === 'quiz3') {
    coins = 100 + mini.score * 500;
    line = '3問中 ' + mini.score + ' 問 せいかい！';
  } else if (kind === 'run') {
    coins = 100 + mini.score * 60;
    line = 'コインを ' + mini.score + ' まい あつめた！';
  } else {
    coins = 100 + mini.score * 400;
    line = mini.score === 4 ? 'ぜんぶ 北から順にならべた！'
                            : mini.score + ' つまで 合っていた';
  }
  const done = mini.onDone;
  mini.onDone = null;
  mini.kind = null;
  if (done) done(coins, MINI_TITLE[kind] + ' クリア', line);
}

// ---------------------------------------------------------------- キャッチ

// おじゃまは「よその県の名産」。まちがえて取ると、それを覚え直せる
function spawnCatchItem() {
  const good = Math.random() < 0.6;
  let text, ok;
  if (good) {
    text = mini.pref.famous[(Math.random() * 4) | 0];
    ok = true;
  } else {
    const others = PREFS.filter(p => p.id !== mini.pref.id
                                  && !p.famous.some(f => mini.pref.famous.includes(f)));
    const o = others[(Math.random() * others.length) | 0];
    text = o.famous[(Math.random() * 4) | 0];
    ok = false;
  }
  mini.items.push({ x: 0.08 + Math.random() * 0.84, y: -0.1, ok, text,
                    v: 0.24 + Math.random() * 0.16, hit: 0 });
}

function updateCatch(dt) {
  if (Math.random() < dt * 1.7) spawnCatchItem();
  mini.basket += (mini.aim - mini.basket) * Math.min(1, dt * 9);
  for (const it of mini.items) {
    it.y += it.v * dt;
    if (it.hit) { it.hit -= dt; continue; }
    if (it.y > 0.80 && it.y < 0.94 && Math.abs(it.x - mini.basket) < 0.09) {
      it.hit = 0.4;
      if (it.ok) { mini.score++; it.msg = '＋'; }
      else { mini.score = Math.max(0, mini.score - 1); it.msg = '×'; }
    }
  }
  mini.items = mini.items.filter(it => it.y < 1.15 && (it.hit === 0 || it.hit > 0));
}

// ---------------------------------------------------------------- はやおしクイズ

function nextMiniQuestion() {
  const rnd = mulberry32((Math.random() * 1e9) | 0);
  mini.q = makeQuestion(rnd, mini.pref.region, new Set(), mini.pref);
  mini.qResult = 0;
}

function miniAnswer(i) {
  if (mini.kind !== 'quiz3' || !mini.q || mini.qResult) return;
  const ok = i === mini.q.answer;
  mini.qResult = ok ? 1 : 2;
  mini.qResultT = 0;
  recordAnswer(mini.q.target.id, ok);
  if (ok) mini.score++;
}

function updateQuiz3(dt) {
  if (mini.qResult) {
    mini.qResultT += dt;
    if (mini.qResultT > 1.6) {
      mini.qi++;
      if (mini.qi >= 3) { miniFinish(); return; }
      nextMiniQuestion();
    }
  }
}

// ---------------------------------------------------------------- はしってゴール

// 短い一本道。自動で右に走るので、タップでジャンプするだけ。
function makeRun(pref) {
  const rnd = mulberry32((Math.random() * 1e9) | 0);
  const len = 46;
  const gap = new Array(len).fill(false);
  const coin = [];
  let x = 6;
  while (x < len - 5) {
    const step = 3 + ((rnd() * 4) | 0);
    x += step;
    if (x >= len - 5) break;
    gap[x] = true;
    if (rnd() < 0.5 && x + 1 < len - 5) gap[x + 1] = true;
    coin.push({ x: x + 0.5, y: 2.6, got: false });
    x += 2;
  }
  for (let i = 4; i < len - 4; i += 2) {
    if (!gap[i] && rnd() < 0.5) coin.push({ x: i + 0.5, y: 1.2, got: false });
  }
  return { len, gap, coin, x: 2, y: 0, vy: 0, ground: true, done: false,
           theme: THEMES[pref.region] || THEMES['関東'], dbl: false };
}

const RUN_SPEED = 6.2, RUN_G = 40, RUN_JUMP = -15.5;

function runJump() {
  const r = mini.run;
  if (!r || r.done) return;
  if (r.ground) { r.vy = RUN_JUMP; r.ground = false; r.dbl = false; }
  else if (!r.dbl) { r.vy = RUN_JUMP * 0.7; r.dbl = true; }    // 2段ジャンプありでやさしく
}

function updateRun(dt) {
  const r = mini.run;
  if (r.done) return;
  r.x += RUN_SPEED * dt;
  r.vy += RUN_G * dt;
  r.y += r.vy * dt;
  const col = Math.floor(r.x);
  const overGap = r.x > 0 && col < r.len && r.gap[col];
  if (r.y >= 0 && !overGap) { r.y = 0; r.vy = 0; r.ground = true; r.dbl = false; }
  else r.ground = false;
  if (r.y > 4) {                       // 落ちたら 1 つ手前からやり直し（ミスにしない）
    let back = col;
    while (back > 0 && r.gap[back]) back--;
    r.x = Math.max(1, back - 0.5); r.y = 0; r.vy = 0; r.ground = true;
  }
  // りなの足もとが地面から -r.y、体のまんなかはその 0.5 上
  const headY = -r.y + 0.5;
  for (const c of r.coin) {
    if (!c.got && Math.abs(c.x - r.x) < 0.7 && Math.abs(c.y - headY) < 1.0) {
      c.got = true; mini.score++;
    }
  }
  if (r.x >= r.len - 3) { r.done = true; mini.score += 3; miniFinish(); }
}

// ---------------------------------------------------------------- きたからじゅんに

function orderPick(id) {
  if (mini.kind !== 'order' || mini.picked.includes(id)) return;
  const idx = mini.picked.length;
  if (mini.answer[idx] === id) {
    mini.picked.push(id);
    mini.score = mini.picked.length;
    if (mini.picked.length >= 4) miniFinish();
  } else {
    mini.wrongT = 0.5;
  }
}

// ---------------------------------------------------------------- まとめ

function miniUpdate(dt) {
  if (mini.over) {
    mini.overT += dt;
    if (mini.overT > 1.4) miniClose();
    return;
  }
  mini.t += dt;
  if (mini.wrongT > 0) mini.wrongT -= dt;
  if (mini.kind === 'catch') updateCatch(dt);
  else if (mini.kind === 'quiz3') updateQuiz3(dt);
  else if (mini.kind === 'run') updateRun(dt);
  if (mini.t >= mini.limit) miniFinish();
}
