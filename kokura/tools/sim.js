// 小倉っ子クエスト の バランスしらべ。
//   node kokura/tools/sim.js
// ゲームを はじめから おわりまで じどうで すすめて、
// 「なんかい たたかえば レベルが たりるか」「ボスに かてるか」を 数える。
// ガード（タイミング）は 3かいに 1かい せいこう する ことに して いる。

'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = vm.createContext({ Math, console });
for (const f of ['maps.js', 'data.js', 'rules.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../site', f), 'utf8'), ctx, { filename: f });
}

const code = `
function alive(a) { return a.filter((x) => x.hp > 0); }
function simBattle(P, keys) {
  const foes = keys.map(makeFoe);
  let defUp = 0, charge = {};
  for (let turn = 1; turn <= 80; turn++) {
    const acts = [];
    for (const m of alive(P.party)) acts.push({ who: m, hero: 1, agi: hstat(m).agi * (0.7 + Math.random() * 0.6) });
    for (const f of foes) if (f.alive) {
      acts.push({ foe: f, agi: f.d.agi * (0.7 + Math.random() * 0.6) });
      if (f.d.two) acts.push({ foe: f, agi: f.d.agi * 0.5 });
    }
    acts.sort((a, b) => b.agi - a.agi);
    for (const a of acts) {
      const af = foes.filter((f) => f.alive);
      const ap = alive(P.party);
      if (!af.length || !ap.length) break;
      if (a.hero) {
        const m = a.who; if (m.hp <= 0) continue;
        const s = hstat(m), sp = learned(m);
        const low = ap.filter((x) => x.hp < hstat(x).mhp * 0.45).sort((x, y) => x.hp / hstat(x).mhp - y.hp / hstat(y).mhp);
        const dead = P.party.filter((x) => x.hp <= 0);
        const boss = af.some((f) => f.d.boss);
        const tgt = af.slice().sort((x, y) => x.hp - y.hp)[0];
        const cast = (k, t) => { m.mp -= SPELLS[k].mp; return k; };
        let done = false;
        const heal1 = (t, pow, sc, mag) => { t.hp = Math.min(hstat(t).mhp, t.hp + healAmt(pow, sc, mag)); };
        if (m.id === 'yui' || m.id === 'rina') {
          if (dead.length && sp.includes('revive') && m.mp >= 14) { cast('revive'); dead[0].hp = Math.round(hstat(dead[0]).mhp / 2); done = true; }
          else if (low.length >= 2 && sp.includes('healall') && m.mp >= 9) { cast('healall'); for (const x of ap) heal1(x, 34, 1.0, s.mag); done = true; }
          else if (low.length && sp.includes('heal') && m.mp >= 3 && (m.id === 'yui' || !P.party.some((x) => x.id === 'yui' && x.hp > 0) || low[0].hp < hstat(low[0]).mhp * 0.25)) {
            cast('heal'); heal1(low[0], 28, 1.3, s.mag); done = true;
          } else if (low.length && P.items.herb > 0 && low[0].hp < hstat(low[0]).mhp * 0.3) { P.items.herb--; heal1(low[0], 35, 0, 0); done = true; }
          else if (dead.length && P.items.phoenix > 0) { P.items.phoenix--; dead[0].hp = Math.round(hstat(dead[0]).mhp / 2); done = true; }
          else if (m.id === 'yui' && boss && sp.includes('guard') && defUp <= 0 && m.mp >= 4) { cast('guard'); defUp = 3; done = true; }
          else if (m.id === 'rina' && boss && sp.includes('brave') && m.mp >= 5) { cast('brave'); hit(tgt, physDmg(s.atk, tgt.d.def, 2.1)); done = true; }
        }
        if (!done && m.id === 'aoi') {
          if (af.length >= 2 && sp.includes('fireall') && m.mp >= 8) { cast('fireall'); for (const f of af) hit(f, spellDmg(SPELLS.fireall, s.mag)); done = true; }
          else if (sp.includes('thunder') && m.mp >= 11 && tgt.hp > 60) { cast('thunder'); hit(tgt, spellDmg(SPELLS.thunder, s.mag)); done = true; }
          else if (sp.includes('fire') && m.mp >= 3 && (tgt.hp > 15 || boss)) { cast('fire'); hit(tgt, spellDmg(SPELLS.fire, s.mag)); done = true; }
        }
        if (!done && m.id === 'masaki') {
          if (boss && !charge.masaki && Math.random() < 0.5) { charge.masaki = 1; done = true; }
          else if (af.length >= 2 && sp.includes('spin')) { for (const f of af) hit(f, physDmg(s.atk, f.d.def, 0.7)); done = true; }
        }
        if (!done) {
          const mult = charge[m.id] ? 2.5 : 1; charge[m.id] = 0;
          const crit = Math.random() < 0.06 ? 1.6 : 1;
          hit(tgt, physDmg(s.atk, tgt.d.def + tgt.defUp * 10, mult * crit));
        }
      } else {
        const f = a.foe; if (!f.alive) continue;
        const act = foeAct(f);
        const tgt = ap[Math.floor(Math.random() * ap.length)];
        const dmg = (t, mult) => {
          const d = physDmg(f.d.atk, hstat(t).def + (defUp > 0 ? 12 : 0), mult) * (Math.random() < 0.33 ? 0.5 : 1);
          t.hp = Math.max(0, Math.round(t.hp - d));
        };
        if (act.k === 'atk') dmg(tgt, 1);
        else if (act.k === 'multi') { dmg(tgt, 0.8); dmg(tgt, 0.8); }
        else if (act.k === 'all' || act.k === 'fire') { for (const t of ap) dmg(t, act.pow); }
        else if (act.k === 'heal') { const w = af.sort((x, y) => x.hp / x.mhp - y.hp / y.mhp)[0]; w.hp = Math.min(w.mhp, w.hp + act.pow); }
        else if (act.k === 'guard') f.defUp = 1;
      }
    }
    if (defUp > 0) defUp--;
    if (!foes.some((f) => f.alive)) {
      let xp = 0, g = 0;
      for (const f of foes) { xp += f.d.xp; g += f.d.g; }
      for (const m of alive(P.party)) gainXp(m, xp);
      P.gold += g;
      return { win: 1, turns: turn };
    }
    if (!alive(P.party).length) return { win: 0, turns: turn };
  }
  return { win: 0, turns: 80 };
  function hit(f, d) { f.hp -= d; if (f.hp <= 0) { f.hp = 0; f.alive = false; } }
}
function rest(P) { for (const m of P.party) { const s = hstat(m); m.hp = s.mhp; m.mp = s.mmp; } }
function shop(P, shops) {
  // いちばん つよい そうびを かえる だけ かう
  for (const sk of shops) {
    const S = SHOPS[sk];
    for (const e of (S.eq || []).slice().reverse()) {
      const E = EQUIP[e];
      for (const m of P.party) {
        if (E.who && E.who.indexOf(m.id) < 0) continue;
        const cur = EQUIP[m[E.slot]];
        const better = E.slot === 'wp' ? (E.atk + (E.mag || 0)) > (cur.atk + (cur.mag || 0)) : E.def > cur.def;
        if (better && P.gold >= E.price) { P.gold -= E.price; m[E.slot] = e; }
      }
    }
  }
  const want = { herb: 6, herb2: 4, water: 2, phoenix: 1 };
  for (const it in want) {
    if (!shops.some((sk) => (SHOPS[sk].items || []).includes(it))) continue;
    while ((P.items[it] || 0) < want[it] && P.gold >= ITEMS[it].price + 30) { P.gold -= ITEMS[it].price; P.items[it] = (P.items[it] || 0) + 1; }
  }
}
function grind(P, zone, lvTarget, max) {
  let n = 0;
  while (P.party[0].lv < lvTarget && n < max) {
    const r = simBattle(P, encounter(zone, P.party.length));
    n++;
    if (!r.win) { rest(P); P.gold = Math.floor(P.gold / 2); P.wipes++; }
    // 3かいに 1かい やどやへ（まちの ちかくで たたかう）
    if (n % 3 === 0) rest(P);
  }
  return n;
}
function dungeon(P, zone, n) {
  let wipes = 0;
  for (let i = 0; i < n; i++) {
    const r = simBattle(P, encounter(zone, P.party.length));
    if (!r.win) { wipes++; rest(P); }
  }
  return wipes;
}
function equipChest(P, e) {
  const E = EQUIP[e];
  for (const m of P.party) {
    if (E.who && E.who.indexOf(m.id) < 0) continue;
    const cur = EQUIP[m[E.slot]];
    const better = E.slot === 'wp' ? (E.atk + (E.mag || 0)) > (cur.atk + (cur.mag || 0)) : E.def > cur.def;
    if (better) { m[E.slot] = e; return; }
  }
}
function clone(P) { return JSON.parse(JSON.stringify(P)); }
function bossRate(P, key, trials) {
  let w = 0, turns = 0;
  for (let i = 0; i < trials; i++) { const Q = clone(P); const r = simBattle(Q, [key]); w += r.win; turns += r.turns; }
  return [Math.round(w / trials * 100), Math.round(turns / trials)];
}
function run(plan, log) {
  const P = { party: [newMember('rina', 1), newMember('yui', 1)], gold: 60, items: { herb: 3 }, wipes: 0 };
  const out = [];
  for (const st of plan) {
    if (st.join) P.party.push(newMember(st.join, P.party[0].lv - 1));
    if (st.shops) shop(P, st.shops);
    const n = grind(P, st.zone, st.lv, 200);
    if (st.shops) shop(P, st.shops);
    rest(P);
    let wipes = 0;
    if (st.dun) wipes = dungeon(P, st.dun, st.dn);
    for (const e of st.chest || []) equipChest(P, e);
    const [rate, turns] = bossRate(P, st.boss, 200);
    out.push({ stage: st.name, grind: n, lv: P.party.map((m) => m.id[0] + m.lv).join(' '), gold: P.gold, dunWipes: wipes, boss: st.boss, winRate: rate + '%', turns });
    // ボスは かつまで がんばる（まけたら レベルを 1 上げてから）
    let tries = 0;
    while (true) {
      rest(P);
      if (simBattle(P, [st.boss]).win) break;
      tries++;
      grind(P, st.zone, P.party[0].lv + 1, 60);
      if (tries > 20) break;
    }
    rest(P);
  }
  return out;
}
const plan = [
  { name: '小倉→大ガニ', zone: 'z1', lv: 4, join: 'masaki', shops: ['kokura_eq', 'tanga_eq', 'tanga_it'], dun: 'cave1', dn: 9, chest: ['leather'], boss: 'kani' },
  { name: '門司→大ダコ', zone: 'z2', lv: 9, join: 'aoi', shops: ['moji_eq', 'moji_it'], dun: 'tunnel', dn: 10, chest: ['bellrod'], boss: 'tako' },
  { name: '八幡→テング', zone: 'z3', lv: 13, shops: ['yahata_eq', 'yahata_it', 'moji_eq'], dun: 'mount', dn: 11, chest: ['steel'], boss: 'tengu' },
  { name: 'くろがね城→まおう', zone: 'castle', lv: 17, shops: ['yahata_eq', 'yahata_it'], dun: 'castle', dn: 14, chest: ['light'], boss: 'kurogane' },
];
const res = run(plan);
console.table(res);
`;
vm.runInContext(code, ctx);
