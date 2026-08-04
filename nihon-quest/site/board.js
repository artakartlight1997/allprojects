// すごろく「全国制覇」の中身。桃鉄のように日本地図をめぐる。
//
//   ・47都道府県が「マス」。となり合う県どうしが「道」でつながっている
//     （道は本物の県境から自動で作った。橋やトンネルの分だけ手で足してある）
//   ・サイコロを振って、出た目のぶんだけとなりをたどって進む
//   ・止まった県でクイズ。正解すると その県の「名産カード」がもらえる
//   ・カードを持っている県に止まると、その土地のミニゲーム
//   ・地方（九州・東北…）をぜんぶ集めると 地方制覇のボーナス
//   ・47枚ぜんぶで 全国制覇
//   ・パパがライバル。先に目的地に着いたほうがボーナス
//
// とちゅうでやめても localStorage に残るので、次に開くとつづきから。

'use strict';

const START_PREF = 13;          // 東京からスタート
const GOAL_BONUS = 3000;
const REGION_BONUS = 5000;
const CARD_COINS = 500;
const RIVAL_CORRECT = 0.45;     // パパの正解率。子どもが勝てるくらい弱くしてある
const DICE_MAX = 6;

// ライバル（パパ）は強すぎないほうが楽しい
const RIVAL_NAME = 'パパ';

const board = {
  active: false,
  scope: null,        // null=全国 / 地方名=その地方だけ
  pos: START_PREF,
  rivalPos: START_PREF,
  goal: null,
  turn: 1,
  who: 'you',         // 'you' | 'rival'
  coins: 0,
  rivalCoins: 0,
  cards: {},          // id -> true
  rivalCards: {},
  phase: 'ready',     // ready / choose / anim / land / message
  dice: 0,
  bonusDice: 0,       // 温泉などで次のサイコロに足す
  skip: 0,            // 1回休み
  rivalSkip: 0,
  choices: [],        // 行ける県 id
  path: [],           // 移動アニメの通り道
  animT: 0,
  msg: null,          // {title, lines[], color, then}
  landPref: null,
  log: [],
};

// ---------------------------------------------------------------- 道

const ADJ = {};
for (const p of PREFS) ADJ[p.id] = p.adj;

// ちょうど n 歩で行ける県。同じ道を行ったり来たりしてもよい（すごろくと同じ）
function reachableExactly(from, n, allowed) {
  let cur = new Set([from]);
  for (let step = 0; step < n; step++) {
    const next = new Set();
    for (const id of cur) {
      for (const a of ADJ[id]) {
        if (allowed && !allowed.has(a)) continue;
        next.add(a);
      }
    }
    cur = next;
    if (!cur.size) break;
  }
  cur.delete(from);
  return [...cur];
}

// from から to までの最短の歩数（パパの考えに使う）
function stepsBetween(from, to, allowed) {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from], d = 0;
  while (frontier.length) {
    d++;
    const next = [];
    for (const id of frontier) {
      for (const a of ADJ[id]) {
        if (allowed && !allowed.has(a)) continue;
        if (seen.has(a)) continue;
        if (a === to) return d;
        seen.add(a);
        next.push(a);
      }
    }
    frontier = next;
  }
  return 99;
}

// 移動して見せる道すじ（1歩ずつ）
function pathTo(from, to, steps, allowed) {
  // ちょうど steps 歩で to に着く道を 1 本さがす
  const dfs = (cur, left, acc) => {
    if (left === 0) return cur === to ? acc : null;
    if (stepsBetween(cur, to, allowed) > left) return null;
    const nb = ADJ[cur].filter(a => !allowed || allowed.has(a));
    // まっすぐ近づく道を先に試す
    nb.sort((a, b) => stepsBetween(a, to, allowed) - stepsBetween(b, to, allowed));
    for (const a of nb) {
      const r = dfs(a, left - 1, acc.concat([a]));
      if (r) return r;
    }
    return null;
  };
  return dfs(from, steps, []) || [to];
}

// ---------------------------------------------------------------- 開始・保存

// scope は「回る地方の名前の配列」。null なら日本一周。
// 北海道は 1 県しかないので、東北とまとめて 1 コースにしている。
function scopeSet(scope) {
  if (!scope) return null;
  return new Set(PREFS.filter(p => scope.includes(p.region)).map(p => p.id));
}

function boardTargets() {
  return board.scope ? PREFS.filter(p => board.scope.includes(p.region)) : PREFS;
}

function scopeLabel() {
  return board.scope ? board.scope.join('・') + 'めぐり' : '日本一周';
}

function boardStart(scope) {
  const allowed = scopeSet(scope);
  board.active = true;
  board.scope = scope ? (Array.isArray(scope) ? scope : [scope]) : null;
  board.pos = allowed && !allowed.has(START_PREF)
    ? [...allowed][0] : START_PREF;
  board.rivalPos = board.pos;
  board.turn = 1;
  board.who = 'you';
  board.coins = 0; board.rivalCoins = 0;
  board.cards = {}; board.rivalCards = {};
  board.bonusDice = 0; board.skip = 0; board.rivalSkip = 0;
  board.phase = 'ready';
  board.dice = 0; board.choices = []; board.path = []; board.msg = null;
  board.log = [];
  newGoal();
  saveBoard();
}

function saveBoard() {
  save.board = board.active ? {
    scope: board.scope, pos: board.pos, rivalPos: board.rivalPos,
    goal: board.goal, turn: board.turn, coins: board.coins,
    rivalCoins: board.rivalCoins, cards: board.cards, rivalCards: board.rivalCards,
    bonusDice: board.bonusDice, skip: board.skip, rivalSkip: board.rivalSkip,
  } : null;
  storeSave();
}

function boardResume() {
  const b = save.board;
  if (!b) return false;
  Object.assign(board, b, {
    active: true, who: 'you', phase: 'ready', dice: 0,
    choices: [], path: [], msg: null, log: [],
  });
  // 古い記録では scope が文字列だったので、配列に直す
  if (typeof board.scope === 'string') board.scope = [board.scope];
  if (!board.goal) newGoal();
  return true;
}

function newGoal() {
  const pool = boardTargets().filter(p => p.id !== board.pos && !board.cards[p.id]);
  const from = pool.length ? pool : boardTargets().filter(p => p.id !== board.pos);
  // 近すぎない所を目的地にする
  const far = from.filter(p => stepsBetween(board.pos, p.id, scopeSet(board.scope)) >= 3);
  const list = far.length ? far : from;
  board.goal = list[(Math.random() * list.length) | 0].id;
}

// ---------------------------------------------------------------- ターン

function cardCount(which) {
  const src = which === 'rival' ? board.rivalCards : board.cards;
  return boardTargets().filter(p => src[p.id]).length;
}

function boardTotal() { return boardTargets().length; }

function regionDone(region, cards) {
  return PREFS.filter(p => p.region === region).every(p => cards[p.id]);
}

function rollDice() {
  if (board.phase !== 'ready') return;
  const base = 1 + ((Math.random() * DICE_MAX) | 0);
  board.dice = base + board.bonusDice;
  board.bonusDice = 0;
  const allowed = scopeSet(board.scope);
  board.choices = reachableExactly(
    board.who === 'you' ? board.pos : board.rivalPos, board.dice, allowed);
  board.phase = board.who === 'you' ? 'choose' : 'anim';
  if (board.who === 'rival') rivalChoose();
}

function chooseDest(id) {
  if (board.phase !== 'choose' || !board.choices.includes(id)) return;
  const allowed = scopeSet(board.scope);
  board.path = pathTo(board.pos, id, board.dice, allowed);
  board.animT = 0;
  board.phase = 'anim';
}

function rivalChoose() {
  const allowed = scopeSet(board.scope);
  let best = board.choices[0], bestScore = 1e9;
  for (const id of board.choices) {
    let sc = stepsBetween(id, board.goal, allowed) * 10;
    if (id === board.goal) sc = -100;
    if (!board.rivalCards[id]) sc -= 3;      // まだのカードは少しうれしい
    if (sc < bestScore) { bestScore = sc; best = id; }
  }
  board.path = pathTo(board.rivalPos, best, board.dice, allowed);
  board.animT = 0;
}

// 移動アニメが終わったら呼ばれる
function landOn(id) {
  const pref = PREF_BY_ID[id];
  if (board.who === 'you') board.pos = id; else board.rivalPos = id;
  board.landPref = pref;

  if (id === board.goal) { arriveGoal(); return; }

  if (board.who === 'rival') {
    // パパの番。カードがなければ挑戦して、たまに取る
    if (!board.rivalCards[id] && Math.random() < RIVAL_CORRECT) {
      board.rivalCards[id] = true;
      board.rivalCoins += CARD_COINS;
      showMsg(RIVAL_NAME + ' が ' + pref.name + ' のカードをゲット',
              ['「' + pref.famous[0] + '」のカードだ！'], '#7a90c8', endTurn);
    } else {
      board.rivalCoins += 200;
      showMsg(RIVAL_NAME + ' は ' + pref.name + ' へ',
              ['ざんねん、カードは とれなかった'], '#7a90c8', endTurn);
    }
    saveBoard();
    return;
  }

  // 自分の番
  const ev = Math.random();
  if (!board.cards[id]) {
    openBoardQuiz(pref);                     // カードをかけてクイズ
  } else if (ev < 0.72) {
    startMinigame(pref);                     // 持っている県ならミニゲーム
  } else {
    randomEvent(pref);
  }
}

function giveCard(pref) {
  board.cards[pref.id] = true;
  board.coins += CARD_COINS;
  const lines = ['「' + pref.famous[0] + '」の カードを手に入れた！',
                 '名産カード ' + cardCount('you') + ' / ' + boardTotal() + ' まい'];
  // 地方をそろえたらボーナス
  if (regionDone(pref.region, board.cards)) {
    board.coins += REGION_BONUS;
    lines.push('★ ' + pref.region + '地方 せいは！ +' + REGION_BONUS);
  }
  saveBoard();
  return lines;
}

function arriveGoal() {
  const pref = PREF_BY_ID[board.goal];
  const mine = board.who === 'you';
  const lines = [];
  if (mine) {
    board.coins += GOAL_BONUS;
    lines.push('もくてきちに 1ばんのり！ +' + GOAL_BONUS);
    if (!board.cards[pref.id]) lines.push(...giveCard(pref));
  } else {
    board.rivalCoins += GOAL_BONUS;
    if (!board.rivalCards[pref.id]) board.rivalCards[pref.id] = true;
    lines.push(RIVAL_NAME + ' に 先をこされた…');
  }
  newGoal();
  lines.push('つぎの もくてきち: ' + PREF_BY_ID[board.goal].name);
  saveBoard();
  showMsg(mine ? 'もくてきち とうちゃく！' : RIVAL_NAME + ' がとうちゃく',
          lines, mine ? '#e0a63a' : '#7a90c8', afterLand);
}

const BOARD_EVENTS = [
  { t: 'おんせん', line: 'ゆっくり つかった。つぎのサイコロ +2',
    go: () => { board.bonusDice += 2; } },
  { t: 'たからばこ', line: 'コインを 1200 まい 見つけた！',
    go: () => { board.coins += 1200; } },
  { t: 'めいぶつを買った', line: 'おみやげ代 400 まい…',
    go: () => { board.coins = Math.max(0, board.coins - 400); } },
  { t: 'しんかんせん', line: 'ひとっとび！ べつの県へ',
    go: () => {
      const pool = boardTargets().filter(p => p.id !== board.pos);
      board.pos = pool[(Math.random() * pool.length) | 0].id;
    } },
  { t: 'まいご', line: 'みちに まよった。1回 おやすみ',
    go: () => { board.skip = 1; } },
];

function randomEvent(pref) {
  const e = BOARD_EVENTS[(Math.random() * BOARD_EVENTS.length) | 0];
  e.go();
  saveBoard();
  showMsg(pref.name + '：' + e.t, [e.line], '#5b8f6e', afterLand);
}

// ---------------------------------------------------------------- クイズ・ミニゲーム

function openBoardQuiz(pref) {
  const rnd = mulberry32((Math.random() * 1e9) | 0);
  const q = makeQuestion(rnd, pref.region, new Set(), pref);
  game.quiz = {
    q, mode: 'board', picked: -1, answered: false, t: 0, resultT: 0,
    reward: null, time: QUIZ_TIME, timeUp: false,
  };
  game.screen = 'quiz';
}

// クイズが終わったあと（board モード）
function boardQuizDone(ok) {
  const pref = board.landPref;
  if (ok) {
    showMsg('せいかい！ ' + pref.name + ' のカード', giveCard(pref), '#4fa06a', afterLand);
  } else {
    board.coins += 100;
    showMsg('ざんねん', ['カードは とれなかった。またチャレンジしよう'],
            '#6b7a92', afterLand);
  }
}

function startMinigame(pref) {
  miniStart(pref, (coins, title, line) => {
    board.coins += coins;
    saveBoard();
    showMsg(title, [line, 'コイン +' + coins], '#4a7fb5', afterLand);
  });
}

// ---------------------------------------------------------------- 画面つなぎ

function showMsg(title, lines, color, then) {
  board.msg = { title, lines, color, then: then || endTurn };
  board.phase = 'message';
  game.screen = 'board';
}

function afterLand() {
  if (cardCount('you') >= boardTotal()) { conquer(); return; }
  endTurn();
}

function conquer() {
  save.conquered++;
  save.coins += board.coins;
  board.active = false;
  save.board = null;
  storeSave();
  game.screen = 'conquer';
}

function endTurn() {
  board.msg = null;
  board.dice = 0;
  board.choices = [];
  board.path = [];
  if (board.who === 'you') {
    board.who = 'rival';
    if (board.rivalSkip > 0) { board.rivalSkip--; board.who = 'you'; board.turn++; }
  } else {
    board.who = 'you';
    board.turn++;
    if (board.skip > 0) { board.skip--; board.who = 'rival'; }
  }
  board.phase = 'ready';
  game.screen = 'board';
  saveBoard();
  if (board.who === 'rival') setTimeout(() => { if (board.phase === 'ready') rollDice(); }, 700);
}
