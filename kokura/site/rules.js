// たたかいの きまり（がめんを つかわない 計算 だけ）。
// sim.js（バランスの しらべ）からも そのまま よぶので、ここに ctx などを 書かない。

'use strict';

// なかまの つよさ（そうび こみ）
function hstat(m) {
  const H = HEROES[m.id];
  const f = (k) => Math.round(H[k][0] + H[k][1] * m.lv);
  const wp = EQUIP[m.wp] || {}, ar = EQUIP[m.ar] || {};
  return {
    mhp: f('hp'), mmp: f('mp'),
    atk: f('atk') + (wp.atk || 0),
    def: f('def') + (ar.def || 0),
    agi: f('agi'),
    mag: f('mag') + (wp.mag || 0),
  };
}

// おぼえて いる じゅもん
function learned(m) {
  const out = [];
  const L = HEROES[m.id].learn;
  for (const lv in L) if (m.lv >= +lv) out.push(L[lv]);
  return out;
}

function newMember(id, lv) {
  const m = { id: id, lv: Math.max(1, lv), xp: 0, hp: 1, mp: 0, wp: HEROES[id].wp, ar: 'cloth' };
  const s = hstat(m);
  m.hp = s.mhp; m.mp = s.mmp;
  return m;
}

// ぶつりの ダメージ
function physDmg(atk, def, mult) {
  const base = (atk - def * 0.5) * 0.6;
  const r = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.round(Math.max(base, atk * 0.08) * r * (mult || 1)));
}
function spellDmg(sp, mag) {
  return Math.max(1, Math.round((sp.pow + mag * sp.sc) * (0.9 + Math.random() * 0.2)));
}
function healAmt(pow, sc, mag) {
  return Math.round((pow + (mag || 0) * (sc || 0)) * (0.9 + Math.random() * 0.2));
}

function makeFoe(key) {
  const d = MONS[key];
  const hp = d.boss ? d.hp : Math.round(d.hp * (0.9 + Math.random() * 0.2));
  return { key: key, d: d, hp: hp, mhp: hp, alive: true, defUp: 0 };
}

function foeAct(foe) {
  const acts = foe.d.acts || [{ w: 1, k: 'atk' }];
  let tot = 0;
  for (const a of acts) tot += a.w;
  let r = Math.random() * tot;
  for (const a of acts) { r -= a.w; if (r <= 0) return a; }
  return acts[0];
}

// 1回の たたかいに でる まもの
function encounter(zone, partySize) {
  const z = ZONES[zone];
  const n = 1 + Math.floor(Math.random() * Math.min(z.max, 1 + partySize));
  const out = [];
  for (let i = 0; i < n; i++) out.push(z.mons[Math.floor(Math.random() * z.mons.length)]);
  return out;
}

// けいけんちを もらう。レベルが 上がった ぶんの じょうほうを かえす。
function gainXp(m, xp) {
  const ups = [];
  m.xp += xp;
  while (m.xp >= needXp(m.lv) && m.lv < 40) {
    m.xp -= needXp(m.lv);
    const before = hstat(m), had = learned(m);
    m.lv++;
    const after = hstat(m);
    m.hp += after.mhp - before.mhp;
    m.mp += after.mmp - before.mmp;
    const now = learned(m).filter((s) => had.indexOf(s) < 0);
    ups.push({ lv: m.lv, learn: now, d: after });
  }
  return ups;
}
