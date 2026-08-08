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

  var BAR = 26;          // おびの高さ
  var BAR_S = 21;        // 画面が低いとき

  var css = document.createElement('style');
  css.textContent = [
    '#gamebar{position:fixed;left:0;right:0;top:0;height:' + BAR + 'px;z-index:2147483000;',
    '  display:flex;align-items:center;gap:8px;padding:0 8px;box-sizing:border-box;',
    '  background:#1b1426;color:#f4ecf7;font:600 13px/1 system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;',
    '  padding-top:env(safe-area-inset-top);height:calc(' + BAR + 'px + env(safe-area-inset-top));',
    '  -webkit-user-select:none;user-select:none;touch-action:manipulation;}',
    '#gamebar a,#gamebar button{appearance:none;-webkit-appearance:none;border:0;cursor:pointer;',
    '  font:inherit;color:#2a2440;background:#f4ecf7;border-radius:8px;padding:4px 10px;',
    '  text-decoration:none;white-space:nowrap;}',
    '#gamebar .gb-home{background:#ff8fbb;color:#3a2430;}',
    '#gamebar .gb-sp{flex:1 1 auto;}',
    '#gamebar .gb-name{color:#b9a9c9;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '@media (max-height:430px){',
    '  #gamebar{height:calc(' + BAR_S + 'px + env(safe-area-inset-top));font-size:11.5px;gap:6px;}',
    '  #gamebar a,#gamebar button{padding:3px 8px;border-radius:6px;}',
    '}',
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
  }

  if (document.body) put();
  else document.addEventListener('DOMContentLoaded', put);
})();
