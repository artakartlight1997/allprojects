// WebGL まわり。行列の計算と、絵を出すためのシェーダ。
//
// ライブラリは使っていない。読みこむものが増えるとスマホで待たされるので、
// 必要なぶんだけ手で書いてある。

'use strict';

// --- 4x4 行列 --------------------------------------------------------------
//
// WebGL は「たてに並べる」順（column-major）なので それに合わせる。

function m4() { return new Float32Array(16); }

function m4identity(o) {
  o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0;
  o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
  o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0;
  o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
  return o;
}

function m4perspective(o, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
  o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
  o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
  o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
  return o;
}

function m4mul(o, a, b) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return o;
}

// カメラの行列。目の位置と、よこ向き(yaw)・たて向き(pitch)から作る。
function m4view(o, ex, ey, ez, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  // 右・上・前 の3方向。
  // 右 = 前×上。ここを さかさに していて、行列が 鏡うつし に なっていた。
  // すると 三角形の 表と裏が ぜんぶ 入れかわって、
  // 世界を「内がわから」見ている ような 絵に なる
  //（上を むいた 面が 消えて、下の 面が 見えてしまう）。
  const rx = -cy, ry = 0, rz = sy;
  const ux = sy * sp, uy = cp, uz = cy * sp;
  const fx = sy * cp, fy = -sp, fz = cy * cp;   // 見ている方向
  o[0] = rx; o[4] = ry; o[8] = rz;
  o[1] = ux; o[5] = uy; o[9] = uz;
  o[2] = -fx; o[6] = -fy; o[10] = -fz;
  o[3] = 0; o[7] = 0; o[11] = 0;
  o[12] = -(rx * ex + ry * ey + rz * ez);
  o[13] = -(ux * ex + uy * ey + uz * ez);
  o[14] = fx * ex + fy * ey + fz * ez;
  o[15] = 1;
  return o;
}

// 見ている方向のベクトル（当たり判定で使う）
function lookVec(yaw, pitch) {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
}

// --- シェーダ ---------------------------------------------------------------
//
// aL … 面のむき と かどの暗さ（ずっと変わらない）
// aS … 空からの明るさ（夜になると uDay で いっしょに暗くなる）
// aB … たいまつの明るさ（夜でも暗くならない）
// この3つに分けてあるので、夜になっても地形を作りなおさなくていい。

const VERT_SRC = [
  'attribute vec3 aPos;',      // チャンクの中の いち。1/16 ブロック たんい
  'attribute vec2 aUV;',
  'attribute vec4 aLit;',      // x=面の暗さ y=空 z=たいまつ w=すけぐあい
  'uniform mat4 uMVP;',
  'uniform vec3 uOrg;',        // このチャンクの かどの いち
  'uniform vec3 uEye;',
  'uniform float uDay;',
  'uniform float uFogNear;',
  'uniform float uFogFar;',
  'varying vec2 vUV;',
  'varying float vL;',
  'varying float vFog;',
  'varying float vA;',
  'void main() {',
  '  vec3 wp = uOrg + aPos * 0.0625;',
  '  gl_Position = uMVP * vec4(wp, 1.0);',
  '  vUV = aUV;',
  '  vA = aLit.w;',
  '  float sky = aLit.y * uDay;',
  '  vL = aLit.x * clamp(max(sky, aLit.z) + 0.06, 0.0, 1.0);',
  '  float d = distance(wp, uEye);',
  '  vFog = clamp((d - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);',
  '}',
].join('\n');

const FRAG_SRC = [
  'precision mediump float;',
  'uniform sampler2D uTex;',
  'uniform vec3 uFogCol;',
  'uniform vec3 uTint;',
  'varying vec2 vUV;',
  'varying float vL;',
  'varying float vFog;',
  'varying float vA;',
  'void main() {',
  '  vec4 c = texture2D(uTex, vUV);',
  '  if (c.a < 0.5) discard;',
  '  vec3 rgb = c.rgb * vL * uTint;',
  '  rgb = mix(rgb, uFogCol, vFog);',
  '  gl_FragColor = vec4(rgb, vA);',
  '}',
].join('\n');

// わく（見ているブロックを囲む線）用。テクスチャなし。
const LINE_VERT = [
  'attribute vec3 aPos;',
  'uniform mat4 uMVP;',
  'void main() { gl_Position = uMVP * vec4(aPos, 1.0); }',
].join('\n');

const LINE_FRAG = [
  'precision mediump float;',
  'uniform vec4 uCol;',
  'void main() { gl_FragColor = uCol; }',
].join('\n');

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

// --- 起動 -------------------------------------------------------------------

const R = {
  gl: null, prog: null, line: null,
  loc: {}, lineLoc: {},
  tex: null, mvp: m4(), view: m4(), proj: m4(),
  lineBuf: null,
};

function initGL(canvas) {
  const opt = { alpha: false, antialias: false, depth: true,
                powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl', opt) || canvas.getContext('experimental-webgl', opt);
  if (!gl) return null;
  R.gl = gl;
  R.prog = program(gl, VERT_SRC, FRAG_SRC);
  R.line = program(gl, LINE_VERT, LINE_FRAG);
  for (const n of ['aPos', 'aUV', 'aLit']) R.loc[n] = gl.getAttribLocation(R.prog, n);
  for (const n of ['uMVP', 'uTex', 'uEye', 'uDay', 'uFogNear', 'uFogFar',
                   'uFogCol', 'uTint', 'uOrg']) {
    R.loc[n] = gl.getUniformLocation(R.prog, n);
  }
  R.lineLoc.aPos = gl.getAttribLocation(R.line, 'aPos');
  R.lineLoc.uMVP = gl.getUniformLocation(R.line, 'uMVP');
  R.lineLoc.uCol = gl.getUniformLocation(R.line, 'uCol');

  R.tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, R.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas());
  // ドット絵をぼかさない。マイクラっぽい見ためはこれで決まる。
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  R.lineBuf = gl.createBuffer();
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  return gl;
}

// --- 見えていない ところを とばす -------------------------------------------
//
// カメラの まえに ある 6 まいの 板（視錐台）を 行列から とりだして、
// チャンクの 箱が その外に あれば えがかない。
// 後ろの ぶんまで えがくと むだに 重い。

const FR = new Float32Array(24);

function extractFrustum(m) {
  // 行 i = m[i], m[4+i], m[8+i], m[12+i]
  const row = (i) => [m[i], m[4 + i], m[8 + i], m[12 + i]];
  const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
  const planes = [
    [r3[0] + r0[0], r3[1] + r0[1], r3[2] + r0[2], r3[3] + r0[3]],   // 左
    [r3[0] - r0[0], r3[1] - r0[1], r3[2] - r0[2], r3[3] - r0[3]],   // 右
    [r3[0] + r1[0], r3[1] + r1[1], r3[2] + r1[2], r3[3] + r1[3]],   // 下
    [r3[0] - r1[0], r3[1] - r1[1], r3[2] - r1[2], r3[3] - r1[3]],   // 上
    [r3[0] + r2[0], r3[1] + r2[1], r3[2] + r2[2], r3[3] + r2[3]],   // 手前
    [r3[0] - r2[0], r3[1] - r2[1], r3[2] - r2[2], r3[3] - r2[3]],   // おく
  ];
  for (let i = 0; i < 6; i++) {
    const p = planes[i];
    const L = Math.hypot(p[0], p[1], p[2]) || 1;
    FR[i * 4] = p[0] / L; FR[i * 4 + 1] = p[1] / L;
    FR[i * 4 + 2] = p[2] / L; FR[i * 4 + 3] = p[3] / L;
  }
}

// 箱が すこしでも 見えていれば true
function boxVisible(x0, y0, z0, x1, y1, z1) {
  for (let i = 0; i < 6; i++) {
    const a = FR[i * 4], b = FR[i * 4 + 1], c = FR[i * 4 + 2], d = FR[i * 4 + 3];
    // 板から いちばん 遠い かど が 外なら、箱ぜんぶが 外
    const px = a > 0 ? x1 : x0, py = b > 0 ? y1 : y0, pz = c > 0 ? z1 : z0;
    if (a * px + b * py + c * pz + d < 0) return false;
  }
  return true;
}
