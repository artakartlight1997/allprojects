// あそんだ きろくを こっそり ためる しくみ（管理人 だけが 見る）。
//
// ★ この サイトは GitHub Pages（サーバーなし）で、しかも リポジトリは
//   おおやけ。だから「どこかへ 送る」ことは できない（送り先の かぎを
//   置いたら だれでも 見えて しまう）。
//   そこで きろくは **その 端末の localStorage の 中だけ** に ためる。
//   見るのは /allprojects/stats/ の ページ（メニューには のせて いない）。
//   べつの 端末の ぶんは、その ページで 書き出して 貼りつけると 合体できる。
//
// ★ ゲームがわの プログラムには 1行も 手を 入れない。
//   ・ページを ひらいた／とじた の じかん
//   ・画面に 出て いた びょうすう（うらに 回って いた ぶんは 数えない）
//   ・その ゲームの セーブが 変わったか（ハイスコア・クリア数 など）
//   これだけで じゅうぶん 分かる。
//
// ★ プレイヤーには なにも 見せない。画面にも コンソールにも 出さない。

(function () {
  'use strict';

  if (window.__stats) return;
  window.__stats = true;

  var KEY = 'allprojects.stats.v1';
  var MAX_EV = 3000;          // のこす できごとの 数（ふるいものから 消す）
  var BEAT = 15000;           // 何ミリびょうごとに 書きこむか

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function store(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* いっぱいなら あきらめる */ }
  }

  // URL から ゲームの なまえ（id）を きめる
  function gameId() {
    var parts = location.pathname.replace(/\/index\.html$/, '').split('/').filter(Boolean);
    var i = parts.indexOf('allprojects');
    var id = (i >= 0 && parts.length > i + 1) ? parts[i + 1] : parts[parts.length - 1];
    if (!id || id === 'allprojects') id = 'menu';
    return id;
  }

  function ymd(t) {
    var d = new Date(t);
    var m = ('0' + (d.getMonth() + 1)).slice(-2), a = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + a;
  }

  // セーブの 中みから「数字の ところ」だけ 取り出す
  var NUMS = ['hi', 'best', 'open', 'plays', 'score', 'day', 'stage', 'lv', 'level',
              'coins', 'gold', 'star', 'stars', 'max', 'total', 'depth'];
  function digest(raw) {
    var o;
    try { o = JSON.parse(raw); } catch (e) { return null; }
    if (!o || typeof o !== 'object') return null;
    var d = null;
    for (var i = 0; i < NUMS.length; i++) {
      var k = NUMS[i];
      if (typeof o[k] === 'number' && isFinite(o[k])) { d = d || {}; d[k] = o[k]; }
    }
    var c = o.clear || o.cleared || o.done;
    if (Array.isArray(c)) { d = d || {}; d.clear = c.filter(Boolean).length; }
    else if (c && typeof c === 'object') {
      var n = 0;
      for (var kk in c) if (Object.prototype.hasOwnProperty.call(c, kk) && c[kk]) n++;
      d = d || {}; d.clear = n;
    }
    return d;
  }

  // いまの セーブ ぜんぶの「めじるし」を とる（じぶんの きろくは のぞく）。
  // ★ りなクラフトの ように 大きな セーブも あるので、中みを まるごと
  //   もって おくと もったいない。ながさと 前後だけの みじかい めじるしに する。
  //   変わった キーだけ、あとで 中みを 読みなおす。
  function fingerprint(v) {
    if (v == null) return '';
    if (v.length <= 160) return v;
    return v.length + '|' + v.slice(0, 64) + '|' + v.slice(-64);
  }
  function snapshot() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k === KEY) continue;
        out[k] = fingerprint(localStorage.getItem(k));
      }
    } catch (e) {}
    return out;
  }

  var ID = gameId();
  var TITLE = (document.title || ID).trim();
  var mark = Date.now();          // ここから あとの じかんを まだ 書きこんで いない
  var snapPrev = snapshot();
  var opened = false;

  function ensure(d) {
    d.v = 1;
    // ★ 端末ごとの id。あとで べつの 端末の きろくと 合体する とき、
    //   おなじ 端末の ぶんを 二重に 数えない ため の めじるし。
    if (!d.dev) d.dev = 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    d.games = d.games || {};
    d.ev = d.ev || [];
    var g = d.games[ID];
    if (!g) {
      g = d.games[ID] = { name: TITLE, plays: 0, sec: 0, first: 0, last: 0, days: {}, best: {} };
    }
    g.name = TITLE;
    return g;
  }

  function push(d, kind, extra) {
    var e = { t: Date.now(), id: ID, k: kind };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) e[k] = extra[k];
    d.ev.push(e);
    if (d.ev.length > MAX_EV) d.ev.splice(0, d.ev.length - MAX_EV);
  }

  // セーブの ちがいを さがす
  function diffSaves(d, g) {
    var cur = snapshot(), changed = [];
    for (var k in cur) {
      if (!Object.prototype.hasOwnProperty.call(cur, k)) continue;
      if (snapPrev[k] === cur[k]) continue;
      changed.push(k);
      var raw = null;
      try { raw = localStorage.getItem(k); } catch (e) {}
      var dg = digest(raw);
      if (dg) {
        for (var f in dg) {
          if (!Object.prototype.hasOwnProperty.call(dg, f)) continue;
          if (typeof g.best[f] !== 'number' || dg[f] > g.best[f]) g.best[f] = dg[f];
        }
        push(d, 'save', { key: k, d: dg });
      } else {
        push(d, 'save', { key: k });
      }
    }
    snapPrev = cur;
    return changed.length;
  }

  // いままでの ぶんを 書きこむ
  function flush(kind) {
    var t = Date.now();
    var sec = Math.max(0, Math.round((t - mark) / 1000));
    mark = t;
    if (!opened && kind !== 'open') return;
    var d = load();
    var g = ensure(d);
    if (kind === 'open') {
      opened = true;
      g.plays++;
      if (!g.first) g.first = t;
      g.last = t;
      push(d, 'open');
      sec = 0;
    }
    if (sec > 0) {
      // 1回の 書きこみで 1時間より 長いのは 数えない（ねかせっぱなし よけ）
      if (sec > 3600) sec = 3600;
      g.sec += sec;
      g.last = t;
      var day = ymd(t);
      g.days[day] = (g.days[day] || 0) + sec;
    }
    diffSaves(d, g);
    if (kind === 'end' && sec > 0) push(d, 'end', { s: sec });
    store(d);
  }

  // 画面に 出て いる あいだ だけ 数える
  function visible() { return document.visibilityState !== 'hidden'; }

  flush('open');

  var timer = setInterval(function () { if (visible()) flush('beat'); }, BEAT);

  document.addEventListener('visibilitychange', function () {
    if (visible()) { mark = Date.now(); }
    else { flush('end'); }
  });
  window.addEventListener('pagehide', function () { if (visible()) flush('end'); });
  window.addEventListener('beforeunload', function () { if (visible()) flush('end'); });

  // ほかから よべる ように（つかわなくても よい）
  window.statsNote = function (kind, extra) {
    try {
      var d = load(); ensure(d); push(d, String(kind).slice(0, 24), extra); store(d);
    } catch (e) {}
  };
  window.__statsStop = function () { clearInterval(timer); };
})();
