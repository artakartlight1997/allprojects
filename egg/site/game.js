// 育てる ところ。時間が すすむと おなかが へり、うんちが 出て、いつか 大人に なる。
//
// ★ この ゲームは 勝ち負けが ない かわりに、
//   「どんな お世話を したか」が そのまま 大人の すがたに なる。
//   だから 世話の 記録（care / bad / どのボタンを 何回 おしたか）を ずっと 数えている。

'use strict';

const SAVE_KEY = 'yui-egg-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      zukan: o.zukan || {},        // 会えた 大人の すがた
      plays: o.plays || 0,         // 育てた 回数
      best: o.best || 0,           // いちばん 長く 育てた 日数
      pet: o.pet || null,          // 続きから 育てる ための とちゅう保存
    };
  } catch (e) {
    return { zukan: {}, plays: 0, best: 0, pet: null };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',      // title / howto / zukan / play / result
  t: 0,
  pet: null,
  msg: '', msgT: 0,
  heart: [],            // ハートや 汗の つぶ
  play: null,           // ミニゲーム「どっちの 手？」
  shake: 0,
  bornT: 0,             // たまごが われる えんしゅつ
  evoT: 0,              // 進化の えんしゅつ
  result: null,
};

function newPet(name) {
  return {
    name: name || 'たまご',
    stage: 0,           // 0=たまご 1=あかちゃん 2=こども 3=おとな
    form: null,
    age: 0,             // 日
    hunger: 70, fun: 70, clean: 100, energy: 80,
    sick: false, sickT: 0,
    asleep: false,
    poop: [],
    cry: 0,             // 0の ものさしが あった 時間
    care: 0, bad: 0,    // お世話の 良し悪しを 数える
    use: { food: 0, play: 0, bath: 0, sleep: 0, med: 0 },
    // ★ 「すすんで した お世話」だけを 別に かぞえる。
    //   うんちが 出たから おふろ、おなかが 空いたから ごはん、は
    //   だれでも やるので「好きな お世話」には 入れない。
    love: { food: 0, play: 0, bath: 0 },
    over: 0,            // ごはんの あげすぎ 回数
    tap: 0,             // たまごを たたいた 回数
    checkT: 0,
    alive: true,
  };
}

function startRun(cont) {
  G.pet = cont && save.pet ? save.pet : newPet();
  if (!cont || !save.pet) { save.plays++; storeSave(); }
  G.screen = 'play';
  G.msg = ''; G.msgT = 0;
  G.heart.length = 0;
  G.play = null;
  G.bornT = 0; G.evoT = 0;
  G.result = null;
  bgmStart(G.pet.stage);
}

function say(s) { G.msg = s; G.msgT = 2.4; }

function puff(kind, n) {
  for (let i = 0; i < (n || 5); i++) {
    G.heart.push({
      k: kind,
      x: (Math.random() - 0.5) * 70,
      y: -20 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 40,
      vy: -40 - Math.random() * 40,
      t: 0, life: 0.9 + Math.random() * 0.5,
    });
  }
}

// --- ものさし -------------------------------------------------------------------

function clamp100(v) { return Math.max(0, Math.min(100, v)); }

function petLevel(p) {
  // 4つの ものさしの へいきん。かおの ひょうじょうに つかう
  return (p.hunger + p.fun + p.clean + p.energy) / 4;
}

// --- お世話 ---------------------------------------------------------------------

function actFood(kind) {
  const p = G.pet;
  if (!p || p.stage === 0 || !p.alive || p.asleep) { say('ねている よ'); return; }
  const f = FOODS.find((x) => x.k === kind) || FOODS[0];
  p.use.food++;
  if (p.hunger > 55) p.love.food++;      // おなかが 空いて いないのに あげた
  if (p.hunger > 88) {
    // ★ おなかいっぱいなのに 食べさせると おなかを こわす。
    //   「たくさん あげれば いい」わけでは ない、を つたえたい。
    p.over++;
    p.sick = true; p.sickT = 0;
    p.fun = clamp100(p.fun - 10);
    say('おなかが いっぱい！ 食べすぎ だよ…');
    puff('sweat', 4);
    sfxNg();
    return;
  }
  p.hunger = clamp100(p.hunger + f.gain);
  p.fun = clamp100(p.fun + f.fun);
  say(f.name + 'を 食べた！');
  puff('heart', 4);
  sfxEat();
}

function actBath() {
  const p = G.pet;
  if (!p || p.stage === 0 || !p.alive || p.asleep) { say('ねている よ'); return; }
  p.use.bath++;
  // うんちの そうじ ではなく「きれいに して あげたくて」入れた ぶん
  if (p.poop.length === 0 || p.clean > 55) p.love.bath++;
  p.poop.length = 0;
  p.clean = 100;
  p.fun = clamp100(p.fun + 6);
  say('ピカピカに なった！');
  puff('bub', 8);
  sfxBath();
}

function actSleep() {
  const p = G.pet;
  if (!p || p.stage === 0 || !p.alive) return;
  p.asleep = !p.asleep;
  if (p.asleep) { p.use.sleep++; say('おやすみ…'); sfxSleep(); }
  else { say('おはよう！'); sfxOk(); }
}

function actMed() {
  const p = G.pet;
  if (!p || p.stage === 0 || !p.alive) return;
  if (!p.sick) { say('げんきだよ。おくすりは いらない'); return; }
  p.use.med++;
  p.sick = false; p.sickT = 0;
  p.fun = clamp100(p.fun - 4);
  say('おくすりを のんだ。よく なった！');
  puff('heart', 3);
  sfxOk();
}

// あそぶ ＝「どっちの 手に あると 思う？」を 3回
function actPlay() {
  const p = G.pet;
  if (!p || p.stage === 0 || !p.alive || p.asleep) { say('ねている よ'); return; }
  p.use.play++;
  p.love.play++;
  G.play = { round: 0, hit: 0, answer: (Math.random() < 0.5 ? 0 : 1), show: -1, t: 0 };
  say(PLAY_SAY[0]);
  sfxTap();
}

function playPick(side) {
  const g = G.play;
  if (!g || g.show >= 0) return;
  g.show = g.answer;
  g.pick = side;
  g.t = 0;
  if (side === g.answer) { g.hit++; sfxOk(); } else { sfxNg(); }
}

function playStep(dt) {
  const g = G.play;
  if (!g) return;
  g.t += dt;
  if (g.show < 0 || g.t < 0.9) return;
  g.round++;
  if (g.round >= 3) {
    const p = G.pet;
    const gain = 12 + g.hit * 12;
    p.fun = clamp100(p.fun + gain);
    p.energy = clamp100(p.energy - 6);
    say('3回中 ' + g.hit + '回 あたり！ きげんが ' + gain + ' あがった');
    puff('heart', 2 + g.hit * 2);
    if (g.hit >= 2) sfxGet();
    G.play = null;
    return;
  }
  g.answer = Math.random() < 0.5 ? 0 : 1;
  g.show = -1; g.pick = undefined; g.t = 0;
  say(PLAY_SAY[g.round]);
}

// うんちを おすと きれいに なる
function pokePoop(i) {
  const p = G.pet;
  if (!p || !p.poop[i]) return;
  p.poop.splice(i, 1);
  p.clean = clamp100(p.clean + 12);
  puff('bub', 3);
  sfxPop();
}

// たまごを たたくと はやく われる
function pokeEgg() {
  const p = G.pet;
  if (!p || p.stage !== 0) return;
  p.tap++;
  G.shake = 0.25;
  sfxTap();
  if (p.tap >= 8) hatch();
}

function hatch() {
  const p = G.pet;
  p.stage = 1;
  p.name = 'あかちゃん';
  G.bornT = 1.6;
  say('たまごが われた！ あかちゃんだ！');
  puff('heart', 10);
  sfxHatch();
  bgmStart(1);
}

// --- 大人の すがたを きめる -----------------------------------------------------

function decideForm(p) {
  const total = Math.max(1, p.care + p.bad);
  const good = p.care / total;
  const u = p.use;

  // ★ どの お世話が「とくに 多かったか」を みる。
  //   ごはんは おなかが へれば だれでも あげるので、
  //   ただ 回数を くらべると いつも ごはんが 1位に なって しまう。
  //   だから ごはんは「あそび＋おふろより ずっと 多い」ときだけ かぞえる。
  //   1回の 育ては 3分ほど なので、おせる 回数は ぜんぶで 20回くらい。
  //   その 数に 合わせた しきい値に して ある。
  const L = p.love || { food: 0, play: 0, bath: 0 };
  let like = 'any';
  if (p.over >= 2) like = 'food';
  else if (L.food >= 3 && L.food >= L.play && L.food >= L.bath) like = 'food';
  else if (L.play >= 3 && L.play > L.bath) like = 'play';
  else if (L.bath >= 3 && L.bath > L.play) like = 'bath';

  // ★ レア（ユニコーン・ドラゴン）は「ほとんど 泣かせない」だけでは なく、
  //   ごはん・あそび・おふろ を ぜんぶ して いる ことも 条件に する。
  //   1つの ボタンだけ おして いても レアに なるのは つまらない。
  const allRound = u.food >= 1 && u.play >= 1 && u.bath >= 1;
  let tier = (good >= 0.9 && p.over === 0 && allRound) ? 3 : good >= 0.45 ? 2 : 1;
  if (p.over >= 3) { tier = 1; like = 'food'; }           // 食べさせすぎ
  if (tier === 1 && like !== 'food') like = 'any';        // ほったらかし
  if (tier === 3 && like !== 'play') like = 'any';        // レアは 2しゅるいだけ

  const same = FORMS.filter((f) => f.tier === tier && f.like === like);
  if (same.length) return same[0];
  const any = FORMS.filter((f) => f.tier === tier && f.like === 'any');
  if (any.length) return any[0];
  return FORMS.filter((f) => f.tier === tier)[0] || FORM_OF.cat;
}

function grow() {
  const p = G.pet;
  if (p.stage === 1) {
    p.stage = 2; p.name = 'こども';
    G.evoT = 1.4;
    say('大きく なった！ こどもに なったよ');
    sfxLevel();
    return;
  }
  if (p.stage === 2) {
    p.stage = 3;
    const f = decideForm(p);
    p.form = f.k;
    p.name = f.name;
    G.evoT = 1.8;
    save.zukan[f.k] = (save.zukan[f.k] || 0) + 1;
    save.best = Math.max(save.best, Math.floor(p.age));
    storeSave();
    say(f.name + 'に なった！');
    sfxLevel();
  }
}

function farewell() {
  const p = G.pet;
  p.alive = false;
  save.pet = null;
  save.best = Math.max(save.best, Math.floor(p.age));
  storeSave();
  G.result = { win: false, form: null, days: p.age };
  G.screen = 'result';
  bgmStop();
  sfxOver();
}

function finishAdult() {
  const p = G.pet;
  save.pet = null;
  storeSave();
  G.result = { win: true, form: p.form, days: p.age };
  G.screen = 'result';
  bgmStop();
  sfxClear(p.bad === 0);
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.bornT > 0) G.bornT -= dt;
  if (G.evoT > 0) G.evoT -= dt;

  for (let i = G.heart.length - 1; i >= 0; i--) {
    const h = G.heart[i];
    h.t += dt;
    h.x += h.vx * dt; h.y += h.vy * dt;
    h.vy += 30 * dt;
    if (h.t > h.life) G.heart.splice(i, 1);
  }

  if (G.screen !== 'play') { bgmPump(); return; }
  const p = G.pet;
  if (!p) { bgmPump(); return; }

  if (G.play) { playStep(dt); bgmPump(); return; }   // ミニゲーム中は 時間を 止める

  if (p.stage === 0) {
    // たまごは 時間でも われる（たたかなくても いい）
    p.age += dt / DAY;
    if (p.age > 0.25) hatch();
    bgmPump();
    return;
  }
  if (!p.alive) { bgmPump(); return; }

  p.age += dt / DAY;

  // ものさしが へる
  if (p.asleep) {
    p.energy = clamp100(p.energy + 9 * dt);
    p.hunger = clamp100(p.hunger - DROP.hunger * 0.4 * dt);
    p.fun = clamp100(p.fun - DROP.fun * 0.3 * dt);
    if (p.energy >= 100) { p.asleep = false; say('ぐっすり ねた！ おはよう'); sfxOk(); }
  } else {
    p.hunger = clamp100(p.hunger - DROP.hunger * dt);
    p.fun = clamp100(p.fun - DROP.fun * dt);
    p.energy = clamp100(p.energy - DROP.energy * dt);
    p.clean = clamp100(p.clean - (DROP.clean + p.poop.length * 0.55) * dt);
  }
  if (p.sick) {
    p.sickT += dt;
    p.fun = clamp100(p.fun - 0.6 * dt);
    p.energy = clamp100(p.energy - 0.5 * dt);
  }

  // うんち（おなかが へって いく とちゅうで たまに 出る）
  if (!p.asleep && p.poop.length < 4 && Math.random() < dt * 0.075) {
    p.poop.push({ x: (Math.random() - 0.5) * 200, y: 40 + Math.random() * 30 });
    sfxPoop();
  }

  // 5びょうごとに 「いい 世話が できて いるか」を 数える
  p.checkT += dt;
  if (p.checkT >= 5) {
    p.checkT -= 5;
    const ok = p.hunger > 35 && p.fun > 35 && p.clean > 35 && p.energy > 25 && !p.sick;
    if (ok) p.care++; else p.bad++;
    save.pet = p;
    storeSave();
  }

  // ★ お別れに なるのは「おなかが 0」と「びょうきを ずっと 放っておいた」ときだけ。
  //   きげんや きれいが 0でも すぐ お別れには しない。
  //   （ぜんぶで お別れに すると、少し 手を ぬいた だけで 終わってしまい、
  //     「あまり 世話を しなかった すがた」に 会えなく なる）
  const bad = p.hunger <= 0 || p.sickT > 60;
  if (bad) p.cry += dt; else p.cry = Math.max(0, p.cry - dt * 0.5);
  if (p.cry > 35) { farewell(); return; }

  // 大きく なる
  if (p.stage === 1 && p.age >= AGE_CHILD) grow();
  else if (p.stage === 2 && p.age >= AGE_ADULT) grow();
  else if (p.stage === 3 && G.evoT <= 0) finishAdult();

  bgmHeat(p.cry > 5 ? 1 : 0);
  bgmPump();
}
