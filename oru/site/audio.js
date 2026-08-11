'use strict';
// 音。ファイルは 1つも つかわず、その場で 作る（WebAudio）。
// 音が 出せない ブラウザでも 落ちないように、ぜんぶ try で つつむ。

let AC = null;
let masterGain = null;
let bgmTimer = null;
let bgmKind = '';

function audioReady() {
  if (AC) {
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C();
    masterGain = AC.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(AC.destination);
  } catch (e) { AC = null; }
  return AC;
}

function tone(freq, dur, type, vol, slideTo, delay) {
  const ac = audioReady();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol === undefined ? 0.22 : vol), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(masterGain);
    o.start(t0); o.stop(t0 + dur + 0.03);
  } catch (e) {}
}

function noise(dur, vol, freq, delay) {
  const ac = audioReady();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + (delay || 0);
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, Math.max(1, n), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 900;
    const g = ac.createGain();
    g.gain.value = vol === undefined ? 0.2 : vol;
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start(t0);
  } catch (e) {}
}

// --- こうかおん -----------------------------------------------------------
function sfxCoin() { tone(1046, 0.07, 'square', 0.16); tone(1568, 0.12, 'square', 0.14, null, 0.06); }
function sfxGem() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.16, null, i * 0.05)); }
function sfxItem() { tone(660, 0.08, 'square', 0.16); tone(880, 0.1, 'square', 0.16, null, 0.07); }
function sfxLife() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.17, null, i * 0.08)); }
function sfxGrow() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.1, 'square', 0.18, null, i * 0.055)); }
function sfxStar() { [659, 880, 1109, 1319].forEach((f, i) => tone(f, 0.09, 'sawtooth', 0.13, null, i * 0.05)); }
function sfxJump() { tone(420, 0.14, 'square', 0.14, 760); }
function sfxSpring() { tone(300, 0.2, 'sine', 0.2, 1000); }
function sfxStomp() { tone(320, 0.09, 'square', 0.18, 120); noise(0.08, 0.12, 500); }
function sfxBump() { tone(150, 0.07, 'square', 0.16, 90); }
function sfxBreak() { noise(0.2, 0.24, 1600); tone(220, 0.12, 'square', 0.14, 90); }
function sfxShoot() { tone(880, 0.08, 'square', 0.13, 460); }
function sfxThrow() { tone(520, 0.12, 'triangle', 0.14, 900); }
function sfxHammer() { noise(0.12, 0.2, 320); tone(180, 0.12, 'square', 0.16, 80); }
function sfxFreeze() { [1400, 1800, 2200].forEach((f, i) => tone(f, 0.1, 'sine', 0.12, null, i * 0.04)); }
function sfxHurt() { tone(400, 0.22, 'sawtooth', 0.2, 120); }
function sfxDie() { [523, 440, 349, 262, 196].forEach((f, i) => tone(f, 0.18, 'square', 0.2, null, i * 0.12)); }
function sfxCheck() { [659, 880].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, null, i * 0.1)); }
function sfxPipe() { tone(600, 0.35, 'sine', 0.18, 120); }
function sfxEnemyShot() { tone(300, 0.1, 'sawtooth', 0.12, 180); }
function sfxBarrel() { noise(0.18, 0.16, 260); }
function sfxSlam() { noise(0.3, 0.28, 180); tone(90, 0.3, 'square', 0.2, 50); }
function sfxRing() { [700, 900, 1100].forEach((f, i) => tone(f, 0.12, 'sawtooth', 0.1, null, i * 0.03)); }
function sfxRain() { noise(0.25, 0.14, 1400); }
function sfxBeam() { tone(220, 0.45, 'sawtooth', 0.16, 1400); }
function sfxSpawn() { tone(260, 0.16, 'square', 0.14, 520); }
function sfxBossRoar() { tone(120, 0.4, 'sawtooth', 0.22, 60); noise(0.35, 0.16, 300); }
function sfxBossHit() { tone(520, 0.14, 'square', 0.2, 180); noise(0.12, 0.16, 700); }
function sfxWin() { [523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.2, null, i * 0.1)); }
function sfxClear() { [392, 523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, null, i * 0.11)); }

// --- ねこの こえ ----------------------------------------------------------
// 「にゃー」は 2つの おとを つなげて、「しゃー」は ノイズで つくる。
function sfxNya() {
  tone(760, 0.16, 'sawtooth', 0.16, 520);
  tone(520, 0.2, 'sawtooth', 0.14, 700, 0.14);
}
function sfxSha() {
  noise(0.32, 0.26, 3200);
  noise(0.22, 0.16, 1800, 0.05);
}
function sfxPunch() { noise(0.09, 0.2, 900); tone(300, 0.08, 'square', 0.14, 140); }
function sfxRino() { tone(880, 0.12, 'triangle', 0.16, 1200); tone(1200, 0.1, 'triangle', 0.14, 900, 0.1); }
function sfxCall() { tone(520, 0.12, 'triangle', 0.13, 660); tone(660, 0.14, 'triangle', 0.13, 560, 0.12); }
function sfxStun() { [900, 700, 520].forEach((f, i) => tone(f, 0.12, 'sine', 0.15, null, i * 0.07)); }
function sfxSleep() { [392, 330, 262].forEach((f, i) => tone(f, 0.6, 'sine', 0.12, null, i * 0.5)); }

// --- BGM ------------------------------------------------------------------
// たんじゅんな くりかえし。ステージ用と ボス用の 2しゅるい。
const BGM_STAGE = [
  [523, 0], [659, 1], [784, 2], [659, 3], [880, 4], [784, 5], [659, 6], [523, 7],
  [587, 8], [698, 9], [880, 10], [698, 11], [784, 12], [659, 13], [587, 14], [523, 15],
];
const BGM_BOSS = [
  [196, 0], [233, 1], [196, 2], [175, 3], [196, 4], [233, 5], [262, 6], [233, 7],
  [196, 8], [175, 9], [156, 10], [175, 11], [196, 12], [233, 13], [196, 14], [147, 15],
];

function bgmStop() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  bgmKind = '';
}

function bgmPlay(kind) {
  if (bgmKind === kind) return;
  bgmStop();
  bgmKind = kind;
  const notes = kind === 'BOSS' ? BGM_BOSS : BGM_STAGE;
  const step = kind === 'BOSS' ? 0.15 : 0.185;
  const loop = () => {
    if (!audioReady()) return;
    for (const [f, i] of notes) {
      tone(f, step * 0.8, kind === 'BOSS' ? 'sawtooth' : 'triangle', 0.055, null, i * step);
      if (i % 4 === 0) tone(f / 2, step * 1.5, 'sine', 0.05, null, i * step);
    }
  };
  loop();
  bgmTimer = setInterval(loop, notes.length * step * 1000);
}

function bgmStage() { bgmPlay('STAGE'); }
function bgmBoss() { bgmPlay('BOSS'); }
