// どのゲームからでも 1タップで メニューにもどれる おび。
//
// ★ ゲームの中に「やめる／メニューにもどる」ボタンがない、と言われたので
//   足した。ゲームごとに canvas の中へボタンを足すと、ゲームによって
//   場所がちがってぶつかるので、**キャンバスの外**に HTML のおびを置く。
//   こうすると 24 個ぜんぶのゲームで 同じ場所・同じ見た目になり、
//   ゲームのプログラムには 1行も手を入れなくてよい。
//
// ★ おびのぶんだけ body の上の余白をふやすので、キャンバスはその分だけ
//   低くなる。ゲームはどれも「画面の高さに合わせて拡大」なので、
//   低くなってもくずれない。入れたあとに resize を出して作り直させる。

(function () {
  'use strict';

  if (window.__gamebar) return;
  window.__gamebar = true;

  // ★ ボタンが 小さくて 押しにくい、と 言われたので 大きくした。
  //   よこ画面（せの ひくい 画面）では たての ばしょが おしいので、
  //   おびは そこそこの 高さに して、そのぶん **見えない 押せる はんい**を
  //   ボタンの まわりに ひろげて ある（::after）。見た目は じゃまに ならず、
  //   ゆびの あたる はんいだけ 44px ちかくに なる。
  var BAR = 38;          // おびの高さ
  var BAR_S = 34;        // 画面が低いとき（よこ持ちの スマホ）
  var GROW = 13;         // ボタンの まわりに ひろげる 見えない はんい

  var css = document.createElement('style');
  css.textContent = [
    '#gamebar{position:fixed;left:0;right:0;top:0;height:' + BAR + 'px;z-index:2147483000;',
    '  display:flex;align-items:center;gap:8px;padding:0 10px;box-sizing:border-box;',
    '  background:#1b1426;color:#f4ecf7;font:600 14px/1 system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;',
    '  padding-top:env(safe-area-inset-top);height:calc(' + BAR + 'px + env(safe-area-inset-top));',
    '  -webkit-user-select:none;user-select:none;touch-action:manipulation;}',
    '#gamebar a,#gamebar button{appearance:none;-webkit-appearance:none;border:0;cursor:pointer;',
    '  position:relative;display:inline-flex;align-items:center;justify-content:center;',
    '  font:inherit;color:#2a2440;background:#f4ecf7;border-radius:9px;padding:0 14px;',
    '  min-height:28px;text-decoration:none;white-space:nowrap;flex:0 0 auto;}',
    // 見えない 押せる はんい。ゆびが 少し ずれても 当たる。
    '#gamebar a::after,#gamebar button::after{content:"";position:absolute;',
    '  left:-' + GROW + 'px;right:-' + GROW + 'px;top:-' + GROW + 'px;bottom:-' + GROW + 'px;}',
    '#gamebar a:active,#gamebar button:active{filter:brightness(0.88);}',
    '#gamebar .gb-home{background:#ff8fbb;color:#3a2430;}',
    '#gamebar .gb-sp{flex:1 1 auto;min-width:4px;}',
    '#gamebar .gb-name{color:#b9a9c9;font-weight:400;overflow:hidden;text-overflow:ellipsis;',
    '  white-space:nowrap;min-width:0;flex:0 1 auto;}',
    '@media (max-height:430px){',
    '  #gamebar{height:calc(' + BAR_S + 'px + env(safe-area-inset-top));font-size:13px;gap:6px;}',
    '  #gamebar a,#gamebar button{padding:0 12px;border-radius:8px;min-height:26px;}',
    '}',
    // よこが せまい スマホでは 名まえを 消して、ボタンの ばしょを ゆずる
    '@media (max-width:560px){#gamebar .gb-name{display:none;}}',
  ].join('\n');
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.id = 'gamebar';

  var home = document.createElement('a');
  home.className = 'gb-home';
  home.href = '/allprojects/';
  home.textContent = '≡ ゲームをえらぶ';

  var name = document.createElement('span');
  name.className = 'gb-name';
  name.textContent = (document.title || '').trim();

  var sp = document.createElement('span');
  sp.className = 'gb-sp';

  var again = document.createElement('button');
  again.type = 'button';
  again.textContent = 'やりなおす';
  again.addEventListener('click', function () { location.reload(); });

  bar.appendChild(home);
  bar.appendChild(name);
  bar.appendChild(sp);
  bar.appendChild(again);

  // ★ よこ長の絵づくりのゲームは、たてに持ったスマホだと中みを 90度まわして
  //   画面いっぱいに使う（html の data-game-rot="1" で しらせてくる）。
  //   そのときこのおびだけ横のままだと 1つだけ ねている ことになるので、
  //   おびも いっしょに まわして 画面の右はしへ うつす。
  //   スマホを左にかたむけて持つと、おびはちゃんと「上」に来る。
  var lastRot = null;

  function barPx() {
    return (window.matchMedia && window.matchMedia('(max-height:430px)').matches) ? BAR_S : BAR;
  }

  function applyRot() {
    var rot = document.documentElement.getAttribute('data-game-rot') === '1';
    if (rot === lastRot) return;
    lastRot = rot;
    var h = barPx();
    if (rot) {
      bar.style.width = '100vh';
      bar.style.height = h + 'px';
      bar.style.right = 'auto';
      bar.style.paddingTop = '0';
      bar.style.transformOrigin = '0 0';
      bar.style.transform = 'translate(100vw, 0) rotate(90deg)';
      document.body.style.paddingTop = '0';
      document.body.style.paddingRight = h + 'px';
    } else {
      bar.style.width = '';
      bar.style.height = '';
      bar.style.right = '';
      bar.style.paddingTop = '';
      bar.style.transform = '';
      document.body.style.paddingRight = '';
      document.body.style.paddingTop = 'calc(' + h + 'px + env(safe-area-inset-top))';
    }
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);
  }

  function put() {
    if (!document.body) return;
    document.body.appendChild(bar);
    // おびのぶん、下へずらす
    var pad = 'calc(' + BAR + 'px + env(safe-area-inset-top))';
    if (window.matchMedia && window.matchMedia('(max-height:430px)').matches) {
      pad = 'calc(' + BAR_S + 'px + env(safe-area-inset-top))';
    }
    document.body.style.paddingTop = pad;
    // ★ position:fixed で 画面いっぱいに はっている ゲーム（りなクラフト）は
    //   body の 余白が きかない。その 入れものを 下へ ずらす。
    var fixed = document.querySelectorAll('body > *');
    for (var i = 0; i < fixed.length; i++) {
      var el = fixed[i];
      if (el === bar) continue;
      var cs = window.getComputedStyle(el);
      if (cs.position === 'fixed' && (cs.top === '0px' || cs.top === 'auto')) {
        el.style.top = pad;
      }
    }
    // ★ 余白を変えても resize は出ないので、自分で出してゲームに作り直させる
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 250);

    // ゲームが「まわしたよ」と しらせて きたら、おびも まわす
    applyRot();
    if (window.MutationObserver) {
      new MutationObserver(applyRot).observe(document.documentElement,
        { attributes: true, attributeFilter: ['data-game-rot'] });
    }
    window.addEventListener('orientationchange', function () { setTimeout(applyRot, 300); });
  }

  if (document.body) put();
  else document.addEventListener('DOMContentLoaded', put);
})();
