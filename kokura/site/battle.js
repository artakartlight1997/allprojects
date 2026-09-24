// たたかい。ドラクエの ように コマンドを えらぶ ターンせい。
//
// ★ タイミング ガード
//   てきが こうげきして くる ときに わっかが ちぢんで くる。
//   わっかが かさなった しゅんかんに タップすると「ガード！」で ダメージが はんぶん。
//   なにも しなくても ふつうに すすむので、にがてな 子も こまらない。
//   （さいきんの RPG で はやって いる「タイミングで ふせぐ」しくみ）

'use strict';

let B = null;
const GUARD_T = 0.95;              // わっかが ちぢむ じかん
const GUARD_OK = [0.66, 0.97];     // この あいだに タップで ガード（わっかが かさなる 0.82 の まわり）

function startBattle(keys, opts) {
  opts = opts || {};
  const foes = keys.map(makeFoe);
  const n = foes.length;
  foes.forEach((f, i) => {
    f.s = f.d.boss ? 62 * (f.d.big || 1.6) : 54;
    f.x = VW / 2 + (i - (n - 1) / 2) * Math.min(230, (VW - 160) / Math.max(1, n));
    f.y = f.d.boss ? 236 : 248;
    f.flash = 0; f.fade = 1;
  });
  B = {
    foes, bossEnt: opts.boss || null, phase: 'run', who: 0, plans: [], seq: [], cur: null,
    log: [], pops: [], shake: 0, turn: 0, defUp: 0, charge: {}, sub: null, pick: null,
    guard: null, over: null, t: 0,
  };
  G.mode = 'battle';
  G.flash = 0.9;
  playBgm(B.bossEnt ? 'boss' : 'battle');
  noise(0.35, 0.12, 900);
  const names = {};
  for (const f of foes) names[f.d.name] = (names[f.d.name] || 0) + 1;
  for (const k in names) push({ say: k + (names[k] > 1 ? 'たち' : '') + 'が あらわれた！' });
  push({ fn: startTurn });
}

function push(step) { B.seq.push(step); }
function front(steps) { B.seq.unshift(...steps); }
function aliveP() { return S.party.filter((m) => m.hp > 0); }
function aliveF() { return B.foes.filter((f) => f.alive); }
function nm(m) { return HEROES[m.id].name; }
function log(s) { B.log.push(s); if (B.log.length > 3) B.log.shift(); }
function popAt(x, y, text2, col) { B.pops.push({ x, y, text: String(text2), col: col || '#FFFFFF', t: 0 }); }
function panelPos(m) {
  const i = S.party.indexOf(m), n = S.party.length, w = Math.min(210, (VW - 40) / n - 8);
  const x0 = VW / 2 - (n * (w + 8) - 8) / 2;
  return { x: x0 + i * (w + 8), y: 10, w, h: 86 };
}

// --- ターン ------------------------------------------------------------------------

function startTurn() {
  B.turn++;
  B.fast = false;
  for (const m of S.party) m.defending = false;
  B.plans = [];
  B.who = -1;
  nextCommander();
}
function nextCommander() {
  let i = B.who + 1;
  while (i < S.party.length && S.party[i].hp <= 0) i++;
  if (i >= S.party.length) { runTurn(); return; }
  B.who = i; B.sub = null; B.pick = null;
  B.phase = 'cmd';
}
function prevCommander() {
  let i = B.who - 1;
  while (i >= 0 && S.party[i].hp <= 0) i--;
  if (i < 0) return;
  B.plans = B.plans.filter((p) => S.party.indexOf(p.m) < i);
  B.who = i; B.sub = null; B.pick = null;
}
function plan(p) {
  p.m = S.party[B.who];
  B.plans.push(p);
  tone(900, 0.04, 'square', 0.05);
  nextCommander();
}

function runTurn() {
  B.phase = 'run';
  const acts = [];
  for (const p of B.plans) acts.push({ p, agi: hstat(p.m).agi * rnd(0.7, 1.3) + (p.k === 'def' ? 999 : 0) });
  for (const f of aliveF()) {
    acts.push({ f, agi: f.d.agi * rnd(0.7, 1.3) });
    if (f.d.two) acts.push({ f, agi: f.d.agi * rnd(0.3, 0.7) });
  }
  acts.sort((a, b) => b.agi - a.agi);
  for (const a of acts) push({ fn: () => (a.p ? heroAct(a.p) : foeTurn(a.f)) });
  push({ fn: () => { if (B.defUp > 0) B.defUp--; startTurn(); } });
}

// --- なかまの こうどう --------------------------------------------------------------

function pickFoe(i) {
  const af = aliveF();
  if (!af.length) return null;
  const f = B.foes[i];
  return f && f.alive ? f : af[0];
}

function hitFoe(f, dmg, crit) {
  f.hp = Math.max(0, f.hp - dmg);
  f.flash = 0.5; B.shake = crit ? 0.3 : 0.12;
  popAt(f.x, f.y - f.s * 0.6, dmg, crit ? '#FFE066' : '#FFFFFF');
  noise(0.12, 0.2, crit ? 2400 : 1400);
  tone(crit ? 180 : 240, 0.1, 'square', 0.12, 80);
  const out = [{ say: f.d.name + 'に ' + dmg + 'の ダメージ！' }];
  if (f.hp <= 0) {
    f.alive = false;
    out.push({ fn: () => { tone(600, 0.25, 'triangle', 0.12, 120); }, say: f.d.name + 'を やっつけた！' });
  }
  return out;
}

function heroAct(p) {
  const m = p.m;
  if (m.hp <= 0 || !aliveF().length) return;
  const s = hstat(m);
  const steps = [];
  if (p.k === 'atk') {
    const f = pickFoe(p.t);
    if (!f) return;
    const crit = Math.random() < 0.07;
    const mult = (B.charge[m.id] ? 2.5 : 1) * (crit ? 1.6 : 1);
    B.charge[m.id] = 0;
    steps.push({ say: nm(m) + 'の こうげき！', wait: 0.35 });
    if (crit) steps.push({ say: 'かいしんの いちげき！', wait: 0.3 });
    steps.push({ fn: () => front(hitFoe(f, physDmg(s.atk, f.d.def + f.defUp * 10, mult), crit)) });
  } else if (p.k === 'def') {
    m.defending = true;
    steps.push({ say: nm(m) + 'は みを まもっている。', wait: 0.3 });
  } else if (p.k === 'spell') {
    const sp = SPELLS[p.s];
    if (m.mp < sp.mp) { front([{ say: nm(m) + 'は ' + sp.name + 'を となえようとした。 しかし MPが たりない！' }]); return; }
    m.mp -= sp.mp;
    steps.push({ say: nm(m) + 'は ' + sp.name + (sp.kind === 'phys' || sp.kind === 'charge' ? '！' : 'を となえた！'), wait: 0.35 });
    if (sp.kind === 'dmg') {
      const targets = sp.tgt === 'enemies' ? aliveF() : [pickFoe(p.t)];
      steps.push({ fn: () => {
        B.spellFx = { t: 0, col: p.s === 'thunder' ? '#FFF6A0' : '#FF8A3A', targets };
        tone(p.s === 'thunder' ? 1600 : 500, 0.3, 'sawtooth', 0.08, p.s === 'thunder' ? 200 : 1400);
        const out = [{ wait: 0.3 }];
        for (const f of targets) if (f && f.alive) out.push(...hitFoe(f, spellDmg(sp, s.mag), false));
        front(out);
      } });
    } else if (sp.kind === 'phys') {
      const targets = sp.tgt === 'enemies' ? aliveF() : [pickFoe(p.t)];
      steps.push({ fn: () => {
        const out = [];
        for (const f of targets) if (f && f.alive) out.push(...hitFoe(f, physDmg(s.atk, f.d.def + f.defUp * 10, sp.mult), sp.mult > 1.5));
        front(out);
      } });
    } else if (sp.kind === 'heal') {
      const targets = sp.tgt === 'allies' ? aliveP() : [p.t];
      steps.push({ fn: () => {
        const out = [];
        tone(900, 0.3, 'sine', 0.1, 1800);
        for (const t of targets) {
          if (!t || t.hp <= 0) continue;
          const st = hstat(t), amt = Math.min(st.mhp - t.hp, healAmt(sp.pow, sp.sc, s.mag));
          t.hp += amt;
          const pp = panelPos(t);
          popAt(pp.x + pp.w / 2, pp.y + pp.h + 14, '+' + amt, '#7FE0A0');
          out.push({ say: nm(t) + 'の HPが ' + amt + ' かいふくした！', wait: 0.25 });
        }
        front(out);
      } });
    } else if (sp.kind === 'revive') {
      steps.push({ fn: () => {
        const t = p.t;
        if (!t || t.hp > 0) { front([{ say: 'しかし なにも おこらなかった。' }]); return; }
        t.hp = Math.round(hstat(t).mhp / 2);
        jingle([72, 79, 84], 0.08, 'triangle', 0.12);
        front([{ say: nm(t) + 'が いきかえった！' }]);
      } });
    } else if (sp.kind === 'defup') {
      steps.push({ fn: () => { B.defUp = 3; tone(700, 0.3, 'sine', 0.1, 1100); front([{ say: 'みんなの みのまもりが あがった！' }]); } });
    } else if (sp.kind === 'charge') {
      B.charge[m.id] = 1;
      steps.push({ say: nm(m) + 'は ちからを ためている……！' });
    }
  } else if (p.k === 'item') {
    const I = ITEMS[p.i];
    if (!S.items[p.i]) { front([{ say: I.name + 'は もう ない！' }]); return; }
    S.items[p.i]--;
    steps.push({ say: nm(m) + 'は ' + I.name + 'を つかった！', wait: 0.3 });
    steps.push({ fn: () => {
      const t = p.t, st = hstat(t);
      if (I.kind === 'heal') {
        if (t.hp <= 0) { front([{ say: 'しかし ' + nm(t) + 'は たおれている。' }]); return; }
        const amt = Math.min(st.mhp - t.hp, I.pow); t.hp += amt;
        const pp = panelPos(t); popAt(pp.x + pp.w / 2, pp.y + pp.h + 14, '+' + amt, '#7FE0A0');
        tone(900, 0.2, 'triangle', 0.1, 1500);
        front([{ say: nm(t) + 'の HPが ' + amt + ' かいふくした！' }]);
      } else if (I.kind === 'mp') {
        const amt = Math.min(st.mmp - t.mp, I.pow); t.mp += amt;
        front([{ say: nm(t) + 'の MPが ' + amt + ' かいふくした！' }]);
      } else if (I.kind === 'revive') {
        if (t.hp > 0) { front([{ say: 'しかし なにも おこらなかった。' }]); S.items[p.i]++; return; }
        t.hp = Math.round(st.mhp / 2);
        front([{ say: nm(t) + 'が いきかえった！' }]);
      }
    } });
  } else if (p.k === 'run') {
    steps.push({ say: 'みんなは にげだした！', wait: 0.3 });
    steps.push({ fn: () => {
      if (B.bossEnt) { front([{ say: 'しかし まわりこまれて しまった！' }]); return; }
      const pa = aliveP().reduce((a, m) => a + hstat(m).agi, 0) / Math.max(1, aliveP().length);
      const fa = aliveF().reduce((a, f) => a + f.d.agi, 0) / Math.max(1, aliveF().length);
      if (Math.random() < clamp(0.6 + (pa - fa) * 0.02, 0.3, 0.95)) {
        B.seq = [];
        front([{ fn: () => endBattle('run') }]);
      } else front([{ say: 'しかし まわりこまれて しまった！' }]);
    } });
  }
  front(steps);
}

// --- てきの こうどう ----------------------------------------------------------------

function heroDef(t) { return hstat(t).def + (B.defUp > 0 ? 12 : 0); }
function hurtHero(t, dmg) {
  t.hp = Math.max(0, t.hp - dmg);
  const pp = panelPos(t);
  popAt(pp.x + pp.w / 2, pp.y + pp.h + 14, dmg, '#FF8A8A');
  B.shake = 0.18;
  noise(0.15, 0.2, 500);
  const out = [{ say: nm(t) + 'は ' + dmg + 'の ダメージを うけた！', wait: 0.2 }];
  if (t.hp <= 0) out.push({ say: nm(t) + 'は たおれて しまった……', fn: () => tone(200, 0.4, 'triangle', 0.12, 80) });
  return out;
}

function foeTurn(f) {
  if (!f.alive || !aliveP().length) return;
  const act = foeAct(f);
  const ap = aliveP();
  const tgt = ap[Math.floor(Math.random() * ap.length)];
  const steps = [];
  f.lunge = 0.4;
  if (act.k === 'atk' || act.k === 'multi') {
    const hits = act.k === 'multi' ? 2 : 1;
    steps.push({ say: f.d.name + (hits > 1 ? 'の れんぞく こうげき！' : 'の こうげき！'), wait: 0.1 });
    for (let h = 0; h < hits; h++) {
      steps.push({ guard: { foe: f, targets: [tgt] }, then: (ok) => {
        if (tgt.hp <= 0) return [];
        let d = physDmg(f.d.atk, heroDef(tgt), hits > 1 ? 0.8 : 1);
        if (tgt.defending) d = Math.max(1, Math.round(d / 2));
        if (ok) d = Math.max(1, Math.round(d / 2));
        return hurtHero(tgt, d);
      } });
    }
  } else if (act.k === 'all' || act.k === 'fire') {
    steps.push({ say: f.d.name + 'は ' + (act.say || 'あばれまわった！'), wait: 0.1 });
    steps.push({ guard: { foe: f, targets: ap }, then: (ok) => {
      const out = [];
      if (act.k === 'fire') B.spellFx = { t: 0, col: '#FF6A2A', party: 1 };
      for (const t of ap) {
        if (t.hp <= 0) continue;
        let d = physDmg(f.d.atk, heroDef(t), act.pow);
        if (t.defending) d = Math.max(1, Math.round(d / 2));
        if (ok) d = Math.max(1, Math.round(d / 2));
        out.push(...hurtHero(t, d));
      }
      return out;
    } });
  } else if (act.k === 'heal') {
    const w = aliveF().sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
    const amt = Math.min(w.mhp - w.hp, act.pow);
    steps.push({ say: f.d.name + 'は じゅもんを となえた！', wait: 0.3 });
    steps.push({ fn: () => { w.hp += amt; popAt(w.x, w.y - w.s * 0.6, '+' + amt, '#7FE0A0'); tone(900, 0.2, 'sine', 0.08, 1500); }, say: w.d.name + 'の キズが ' + amt + ' なおった！' });
  } else if (act.k === 'guard') {
    f.defUp = 1;
    steps.push({ say: f.d.name + 'は ぷくっと ふくらんで みを かためた！' });
  }
  front(steps);
}

// --- すすめる ----------------------------------------------------------------------

function checkEnd() {
  if (B.over) return true;
  if (!aliveF().length) { B.seq = []; B.over = 'win'; winSteps(); return true; }
  if (!aliveP().length) { B.seq = []; B.over = 'lose'; push({ say: 'みんな たおれて しまった……', wait: 1.2 }); push({ fn: () => endBattle('lose') }); return true; }
  return false;
}

function winSteps() {
  let xp = 0, g = 0;
  for (const f of B.foes) { xp += f.d.xp; g += f.d.g; }
  jingle([72, 76, 79, 84, 79, 84], 0.11, 'square', 0.12);
  playBgm(null);
  push({ say: B.bossEnt ? B.foes[0].d.name + 'を たおした！' : 'まものたちを やっつけた！', wait: 0.4 });
  if (xp) push({ say: 'みんなは ' + xp + 'ポイントの けいけんちを かくとく！' });
  if (g) push({ fn: () => { S.gold += g; }, say: g + 'ゴールドを てにいれた！' });
  push({ fn: () => {
    const out = [];
    for (const m of aliveP()) {
      for (const u of gainXp(m, xp)) {
        out.push({ fn: () => jingle([72, 76, 79, 84], 0.09, 'square', 0.12), say: nm(m) + 'は レベル ' + u.lv + 'に あがった！', wait: 0.4 });
        for (const k of u.learn) out.push({ say: nm(m) + 'は ' + SPELLS[k].name + 'を おぼえた！', wait: 0.3 });
      }
    }
    front(out);
  } });
  if (B.bossEnt) {
    const key = B.bossEnt.key;
    if (BACHI[key]) push({ fn: () => jingle([79, 84, 88, 91], 0.12, 'square', 0.14), say: BACHI[key] + 'を てにいれた！' });
  }
  push({ fn: () => endBattle('win') });
}

function endBattle(kind) {
  const bossEnt = B.bossEnt;
  if (kind === 'lose') {
    B = null;
    G.mode = 'field';
    const town = S.lastTown || 'kokura';
    S.gold = Math.floor(S.gold / 2);
    for (const m of S.party) { const s = hstat(m); m.hp = s.mhp; m.mp = s.mmp; }
    G.fade = 0.001;
    G.fadeMsg = 'めのまえが まっくらに なった……';
    G.fadeTo = () => enterMap(town, MAPS[town].start[0], MAPS[town].start[1] - 1, 3);
    G.afterFade = () => say(['……きがつくと ' + MAPS[town].name + 'に いた。', 'みんな げんきに なったけど、おかねが はんぶんに なって しまった。']);
    return;
  }
  B = null;
  G.mode = 'field';
  if (bossEnt) {
    S.flags[BOSSFLAG[bossEnt.key]] = 1;
    G.ents = G.ents.filter((e) => e !== bossEnt);
    if (bossEnt.key === 'kurogane') { saveGame(); G.fade = 0.001; G.fadeMsg = null; G.fadeTo = () => startEnding(); return; }
    const n = ['boss1', 'boss2', 'boss3'].filter((f) => S.flags[f]).length;
    const next = { kani: 'これで 北の 門司港へ いけるように なった！', tako: 'これで 西の 八幡へ いけるように なった！', tengu: '3本の ばちが そろった！ くろがね城の とびらが ひらく！' }[bossEnt.key];
    say(['（' + n + '本めの ばちを てにいれた）', next]);
  }
  playBgm(MAPS[G.map].bgm);
  saveGame();
}

function battleUpdate(dt) {
  if (!B) return;
  B.t += dt;
  for (const f of B.foes) { if (f.flash > 0) f.flash -= dt; if (!f.alive && f.fade > 0) f.fade -= dt * 1.6; if (f.lunge > 0) f.lunge -= dt; }
  for (const p of B.pops) p.t += dt;
  B.pops = B.pops.filter((p) => p.t < 1.1);
  if (B.shake > 0) B.shake -= dt;
  if (B.spellFx) { B.spellFx.t += dt; if (B.spellFx.t > 0.6) B.spellFx = null; }
  if (B.phase === 'cmd') return;
  // いまの ステップ
  if (!B.cur) {
    if (!B.seq.length) return;
    if (checkEnd() && !B.seq.length) return;
    B.cur = B.seq.shift();
    B.cur.t = 0;
    const c = B.cur;
    if (c.fn) c.fn();
    if (!B) return;
    if (c.say) log(c.say);
    if (c.guard) { B.guard = { t: 0, ok: false, tried: false, targets: c.guard.targets, foe: c.guard.foe }; c.guard.foe.lunge = GUARD_T; }
    c.dur = c.guard ? GUARD_T : c.say ? 0.62 + (c.wait || 0) : (c.wait || 0);
  }
  const c = B.cur;
  c.t += dt * (B.fast ? 2.2 : 1);
  if (c.guard) B.guard.t = c.t;
  if (c.t >= c.dur) {
    B.cur = null;
    if (c.guard) {
      const ok = B.guard.ok;
      if (ok) { popAt(VW / 2, VH * 0.3, 'ガード！', '#7FE0F0'); tone(1800, 0.08, 'square', 0.1); noise(0.06, 0.15, 5000); S.flags.guards = (S.flags.guards || 0) + 1; }
      B.guard = null;
      front(c.then(ok));
    }
    if (B && !B.over && (!aliveF().length || !aliveP().length)) checkEnd();
  }
}

// --- そうさ ------------------------------------------------------------------------

function battleTap(x, y) {
  if (!B) return;
  if (B.guard) {
    if (!B.guard.tried) {
      B.guard.tried = true;
      const t = B.guard.t / GUARD_T;
      if (t >= GUARD_OK[0] && t <= GUARD_OK[1]) B.guard.ok = true;
      else { popAt(VW / 2, VH * 0.3, t < GUARD_OK[0] ? 'はやい！' : 'おそい！', '#FFB0B0'); }
    }
    return;
  }
  if (B.phase === 'run') { B.fast = true; if (B.cur && B.cur.say && !B.cur.guard) B.cur.t = Math.max(B.cur.t, B.cur.dur - 0.12); return; }
  if (B.phase === 'cmd' && B.sub && B.sub.pick) {
    // てきや なかまを タップ して えらぶ
    if (B.sub.pick === 'foe') {
      for (const f of B.foes) {
        if (f.alive && Math.abs(x - f.x) < f.s * 0.9 && Math.abs(y - f.y) < f.s) { B.sub.done(B.foes.indexOf(f)); return; }
      }
    } else {
      for (const m of S.party) {
        const pp = panelPos(m);
        if (inBox(x, y, pp)) { B.sub.done(m); return; }
      }
    }
  }
}
function battleKey(code) {
  if (!B) return;
  if (code === 'Space' || code === 'Enter') battleTap(-100, -100);
}

// コマンドの ボタン（下の だんの 右がわ。3れつ × 2だん）
const CMD_W = 372;
function cmdSlot(i) {
  const x = VW - CMD_W - 16, y = VH - 144;
  const w = (CMD_W - 16) / 3;
  return { x: x + 8 + (i % 3) * (w + 2), y: y + 8 + Math.floor(i / 3) * 62, w: w - 2, h: 56 };
}
function slotBtn(i, label, on, o) { const r = cmdSlot(i); return btn(r.x, r.y, r.w, r.h, label, on, Object.assign({ size: 20 }, o || {})); }
function drawCommands() {
  const m = S.party[B.who];
  const x = VW - CMD_W - 16, y = VH - 144;
  fillRR(x, y - 34, CMD_W, 34 + 136, 12, 'rgba(10,8,30,0.92)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; rr(x + 4, y - 30, CMD_W - 8, 162, 10); ctx.stroke();
  const sub = B.sub;
  const title = !sub ? nm(m) + ' は どうする？' : sub.list === 'spell' ? 'どの じゅもん？（MP ' + m.mp + '）'
    : sub.list === 'item' ? 'どの どうぐ？' : sub.pick === 'foe' ? 'どの てき？ てきを タップ！' : 'だれに？';
  text(title, x + 18, y - 14, 18, sub && sub.pick ? '#FFE066' : HEROES[m.id].col, 'left', true, CMD_W - 36);
  if (!sub) {
    const sp = learned(m);
    const hasItem = Object.keys(ITEMS).some((k) => S.items[k] > 0 && ITEMS[k].battle !== 0);
    slotBtn(0, 'たたかう', () => chooseFoe((i) => plan({ k: 'atk', t: i })), { col: '#FFE066' });
    slotBtn(1, 'じゅもん', () => { B.sub = { list: 'spell' }; }, { off: !sp.length, col: '#F4F0FF' });
    slotBtn(2, 'どうぐ', () => { B.sub = { list: 'item' }; }, { off: !hasItem, col: '#F4F0FF' });
    slotBtn(3, 'ぼうぎょ', () => plan({ k: 'def' }), { col: '#F4F0FF' });
    if (B.who === aliveFirst()) slotBtn(4, 'にげる', () => { B.plans = []; B.who = -1; plan0Run(); }, { col: '#F4F0FF' });
    else slotBtn(4, 'もどる', prevCommander, { col: '#D8D0F0' });
  } else if (sub.list === 'spell') {
    learned(m).slice(0, 5).forEach((k, i) => {
      const sp = SPELLS[k];
      slotBtn(i, sp.name, () => {
        if (m.mp < sp.mp) { popAt(VW / 2, VH * 0.35, 'MPが たりない', '#FFB0B0'); return; }
        if (sp.tgt === 'enemy') chooseFoe((t) => plan({ k: 'spell', s: k, t }));
        else if (sp.tgt === 'ally' || sp.tgt === 'dead') chooseAlly((t) => plan({ k: 'spell', s: k, t }), sp.tgt === 'dead');
        else plan({ k: 'spell', s: k });
      }, { off: m.mp < sp.mp, col: '#F4F0FF', size: 16, sub: 'MP ' + sp.mp });
    });
    slotBtn(5, 'とじる', () => { B.sub = null; }, { col: '#D8D0F0' });
  } else if (sub.list === 'item') {
    Object.keys(ITEMS).filter((k) => S.items[k] > 0 && ITEMS[k].battle !== 0).slice(0, 5).forEach((k, i) => {
      slotBtn(i, ITEMS[k].name, () => chooseAlly((t) => plan({ k: 'item', i: k, t }), ITEMS[k].kind === 'revive'),
              { col: '#F4F0FF', size: 15, sub: '× ' + S.items[k] });
    });
    slotBtn(5, 'とじる', () => { B.sub = null; }, { col: '#D8D0F0' });
  } else if (sub.pick) {
    if (sub.pick === 'ally') {
      S.party.forEach((t, i) => {
        if (sub.dead ? t.hp > 0 : t.hp <= 0) return;
        slotBtn(i, nm(t), () => sub.done(t), { col: '#9AF0B8', size: 18 });
      });
    }
    slotBtn(5, 'やめる', () => { B.sub = null; }, { col: '#D8D0F0' });
  }
}
function aliveFirst() { return S.party.findIndex((m) => m.hp > 0); }
function plan0Run() { B.plans = [{ k: 'run', m: S.party[aliveFirst()] }]; runTurnRun(); }
function runTurnRun() {
  B.phase = 'run';
  push({ fn: () => heroAct(B.plans[0]) });
  push({ fn: () => { if (!B || B.over) return; const out = []; for (const f of aliveF()) { out.push({ fn: () => foeTurn(f) }); if (f.d.two) out.push({ fn: () => foeTurn(f) }); } out.push({ fn: startTurn }); front(out); } });
}
function chooseFoe(done) {
  const af = aliveF();
  if (af.length === 1) { done(B.foes.indexOf(af[0])); return; }
  B.sub = { pick: 'foe', done: (i) => { B.sub = null; done(i); } };
}
function chooseAlly(done, dead) {
  B.sub = { pick: 'ally', dead, done: (t) => { B.sub = null; done(t); } };
}

// --- かく ----------------------------------------------------------------------------

function battleBg(t) {
  const k = mapKind();
  let c0 = '#6AB8F0', c1 = '#B8E890', ground = '#7CC66A';
  if (k === 'cave') { c0 = '#2A1E1A'; c1 = '#4A3A30'; ground = '#5A4A3A'; }
  else if (k === 'tunnel') { c0 = '#0E2A48'; c1 = '#1E4A70'; ground = '#3A5A6A'; }
  else if (k === 'mount') { c0 = '#0E1030'; c1 = '#2A3A5A'; ground = '#3A4A3A'; }
  else if (k === 'castle') { c0 = '#2A0E1A'; c1 = '#4A1E2A'; ground = '#3A2A3A'; }
  else if (k === 'world') {
    const z = worldZone(G.px, G.py);
    if (z === 'z2') { c0 = '#5AA8E8'; c1 = '#A8D8F0'; ground = '#D8C890'; }
    if (z === 'z3') { c0 = '#E88A5A'; c1 = '#F0C890'; ground = '#8AA870'; }
  }
  ctx.fillStyle = grad(0, VH, c0, c1); ctx.fillRect(0, 0, VW, VH);
  ellipse(VW / 2, VH * 0.62, VW * 0.55, VH * 0.13); ctx.fillStyle = ground; ctx.fill();
  if (k === 'mount') for (let i = 0; i < 30; i++) fillC((i * 131) % VW, (i * 53) % (VH * 0.4) + 110, 1.4, '#FFF6C8');
  if (k === 'tunnel') for (let i = 0; i < 8; i++) { const u = (t * 0.2 + i / 8) % 1; fillC((i * 157) % VW, VH * (0.9 - u * 0.7), 4, 'rgba(180,230,255,0.4)'); }
}

function drawBattle(t) {
  const sx = B.shake > 0 ? rnd(-6, 6) : 0;
  ctx.save(); ctx.translate(sx, 0);
  battleBg(t);
  // てき
  for (const f of B.foes) {
    if (!f.alive && f.fade <= 0) continue;
    ctx.save();
    ctx.globalAlpha = f.alive ? 1 : Math.max(0, f.fade);
    const ly = f.lunge > 0 ? Math.sin((1 - f.lunge / GUARD_T) * Math.PI) * 18 : 0;
    const hx = f.flash > 0 ? Math.sin(f.flash * 60) * 6 : 0;
    drawMon(f.d.art, f.x + hx, f.y + ly, f.s, f.d.col, t, f.d.boss);
    if (f.flash > 0.25) { ctx.globalAlpha = 0.5; fillC(f.x, f.y, f.s, '#FFFFFF'); }
    ctx.restore();
    // なまえ と HP（ボスは バー）
    if (f.alive) {
      const ny = Math.min(f.y + f.s * 1.08, VH - 196);
      textO(f.d.name, f.x, ny, 17, '#FFFFFF');
      const bw = Math.min(160, f.s * 1.6);
      fillRR(f.x - bw / 2, ny + 13, bw, 7, 3, 'rgba(0,0,0,0.5)');
      fillRR(f.x - bw / 2, ny + 13, bw * f.hp / f.mhp, 7, 3, f.hp / f.mhp < 0.3 ? '#FF6A6A' : '#FFD24A');
    }
    if (B.phase === 'cmd' && B.sub && B.sub.pick === 'foe' && f.alive) {
      ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4;
      ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.4;
      circ(f.x, f.y, f.s * 0.95); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  if (B.spellFx) {
    const fx = B.spellFx;
    ctx.globalAlpha = 1 - fx.t / 0.6;
    if (fx.party) { fillR(0, 0, VW, 120, fx.col); }
    else for (const f of fx.targets) if (f) { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + fx.t * 6; fillC(f.x + Math.cos(a) * f.s * fx.t * 1.4, f.y + Math.sin(a) * f.s * fx.t * 1.4, 10, fx.col); } }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // なかまの パネル
  for (const m of S.party) {
    const s = hstat(m), pp = panelPos(m);
    const on = B.phase === 'cmd' && S.party[B.who] === m;
    fillRR(pp.x, pp.y, pp.w, pp.h, 10, on ? 'rgba(80,60,140,0.95)' : 'rgba(10,8,30,0.85)');
    ctx.strokeStyle = on ? '#FFE066' : m.hp > 0 && m.hp < s.mhp * 0.3 ? '#FF8A5A' : '#FFFFFF';
    ctx.lineWidth = on ? 4 : 2; rr(pp.x + 2, pp.y + 2, pp.w - 4, pp.h - 4, 9); ctx.stroke();
    drawFace(m.id, pp.x + 26, pp.y + 30, 17, m.hp <= 0);
    text(nm(m), pp.x + 50, pp.y + 22, 19, m.hp <= 0 ? '#8A8098' : '#FFFFFF', 'left', true, pp.w - 56);
    text('Lv' + m.lv, pp.x + 10, pp.y + 66, 14, '#C8B8E0');
    text('HP ' + m.hp, pp.x + 50, pp.y + 48, 17, m.hp < s.mhp * 0.3 ? '#FF8A8A' : '#FFFFFF', 'left', true);
    if (s.mmp) text('MP ' + m.mp, pp.x + 50, pp.y + 70, 15, '#9AD0FF', 'left', true);
    if (m.defending) text('🛡', pp.x + pp.w - 18, pp.y + 66, 16, '#FFFFFF', 'center');
    if (B.charge[m.id]) text('💪', pp.x + pp.w - 18, pp.y + 44, 16, '#FFFFFF', 'center');
    if (B.phase === 'cmd' && B.sub && B.sub.pick === 'ally') {
      ctx.strokeStyle = '#9AF0B8'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.4;
      rr(pp.x - 3, pp.y - 3, pp.w + 6, pp.h + 6, 12); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  // ガードの わっか
  if (B.guard) {
    const u = B.guard.t / GUARD_T;
    for (const m of B.guard.targets) {
      const pp = panelPos(m);
      const cx = pp.x + pp.w / 2, cy = pp.y + pp.h / 2;
      const r = u < 0.82 ? 44 + (0.82 - u) / 0.82 * 140 : Math.max(20, 44 - (u - 0.82) * 150);
      const inWin = u >= GUARD_OK[0] && u <= GUARD_OK[1];
      ctx.strokeStyle = inWin ? '#FFE066' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = inWin ? 7 : 4;
      circ(cx, cy, r); ctx.stroke();
      ctx.strokeStyle = 'rgba(127,224,240,0.7)'; ctx.lineWidth = 3; circ(cx, cy, 44); ctx.stroke();
    }
    const tip = (S.flags.guards || 0) < 3;
    if (tip || (u >= GUARD_OK[0] && u <= GUARD_OK[1])) {
      textO(u >= GUARD_OK[0] && u <= GUARD_OK[1] ? 'いまだ！ タップで ガード！' : 'わっかが かさなったら タップ！', VW / 2, VH * 0.25, 26,
            u >= GUARD_OK[0] && u <= GUARD_OK[1] ? '#FFE066' : '#FFFFFF');
    }
  }
  // ポップ
  for (const p of B.pops) {
    ctx.globalAlpha = clamp(1.2 - p.t, 0, 1);
    textO(p.text, p.x, p.y - p.t * 40, 30, p.col);
    ctx.globalAlpha = 1;
  }
  // メッセージ
  const mw = B.phase === 'cmd' ? VW - CMD_W - 52 : VW - 40;
  fillRR(20, VH - 150, mw, 136, 12, 'rgba(10,8,30,0.9)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; rr(24, VH - 146, mw - 8, 128, 10); ctx.stroke();
  B.log.forEach((l, i) => text(l, 44, VH - 118 + i * 38, 22, '#FFFFFF', 'left', false, mw - 50));
  if (B.phase === 'cmd') drawCommands();
}
