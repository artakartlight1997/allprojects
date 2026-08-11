#!/usr/bin/env python3
"""rina2/site/levels.js を作り、到達できるかを たしかめる。

物理（game.js と 合わせること）:
  GRAVITY 46 / JUMP_V 17.8 / MOVE_SPEED 7.6
  ジャンプ到達高 = 17.8^2 / (2*46) = 3.44 タイル
  たいくう時間   = 2*17.8/46      = 0.774 秒
  よこの とどく距離 = 0.774*7.6   = 5.88 タイル
  ばね 26.5 -> 7.63 タイル

安全マージンを見て「登れる高さ 3」「とべる すきま 4」を上限に する。
はしご・ばね・移動床・水の ある ところは その かぎりではない（BFS で 見る）。

タイル:
  .空  #じめん  =あしば  ?コインブロック  !アイテムブロック  Xたたいた後
  Nレンガ（大きいと こわせる）  ^ばね  Fくずれる足場  Tかくれトゲ
  sトゲ/ようがん  Hはしご  >ベルト右  <ベルト左  Dどかん  Oどかん入口  W水
しるし（読みこみ時に 空になる）:
  @スタート  Gゴール  Cチェックポイント  Bボス
  wぷにまる kとげのすけ pぱたぽん jぴょんた cおいかけ Sスライム dどんぐり
  yたるおじ zおばけ eさかな rロボ
  oコイン gジェム hのこり+1 *スター fはね Mじしゃく
  1ケーキ 2ハートだま 3こおりだま 4ブーメラン 5ハンマー
  mよこ移動床 vたて移動床
"""

import json
import os
import random
import sys

SOLID = set('#=?!XN^FDO><')
FREE_WALK = set('.oghH*fM12345wkpjcSdyzerCB@G')   # 通れる（歩ける）
HAZARD = set('sT')
ENEMY_CHARS = set('wkpjcSdyzerE')
MARKS = set('@GCBwkpjcSdyzeroghH*fM12345mv')

WARN = []
H = 13
GY = 11          # じめんの 上の 面（この行から 下が '#'）
STAND = GY - 1   # じめんに 立つ ときの 行

# ---------------------------------------------------------------- ボス表
# shape: BLOB ROBO DRAGON GHOST FISH UFO KING WITCH PAINT BOOK
BOSSES = [
    # name, shape, col, col2, move, attacks, hint
    ('ぬいぐるみキング', 'BLOB', '#B98FE0', '#8A64B0', 'GROUND', ['ARC'],
     'ジャンプして 上から ふもう！'),
    ('おおきい カブトムシ', 'BLOB', '#7ADC80', '#4FA85A', 'PACE', ['ARC', 'SPAWN'],
     'いったり きたり。すきを 見て ふもう'),
    ('そうじきロボ', 'ROBO', '#8AD8F0', '#4A8AA0', 'GROUND', ['SPREAD'],
     'たまを よけて 上から ふもう'),
    ('おんぷおばけ', 'GHOST', '#C8A8F0', '#8A64B0', 'FLY', ['ARC', 'WAVE'],
     'ふわふわ とぶ。下に きたら ふもう'),
    ('とびばこキング', 'KING', '#FFC46A', '#C88A30', 'HOP', ['SLAM'],
     'とびはねる。着地の 波に きをつけて'),
    ('おおきな カニ', 'BLOB', '#FF8A6A', '#C85A3A', 'PACE', ['SPREAD', 'ARC'],
     'よこに はしる。上から ふもう'),
    ('ふかうみの タコ', 'BLOB', '#C86AA8', '#96407A', 'FLY', ['RING'],
     'ぐるっと たまを まく。すきまを ぬけて'),
    ('サメの おうさま', 'FISH', '#8AB8D8', '#4A7CA0', 'FLY', ['DASH', 'SPREAD'],
     'つっこんでくる。よけてから ふもう'),
    ('ケーキだいおう', 'KING', '#FF9AC0', '#D06A96', 'HOP', ['RAIN', 'SLAM'],
     '上から おかしが ふってくる！'),
    ('もりの まじょ', 'WITCH', '#8A64C8', '#5A3E90', 'FLY', ['ARC', 'SPAWN'],
     'こぶんを 出す。まとめて ふもう'),
    ('くもドラゴン', 'DRAGON', '#9AC8F0', '#5A8AC0', 'FLY', ['SPREAD', 'DASH'],
     'そらを とぶ。足場に のって ねらおう'),
    ('ペンキおばけ', 'PAINT', '#FF6FA8', '#FFD24A', 'GROUND', ['RING', 'ARC'],
     'ペンキを まきちらす。すきまを ねらえ'),
    ('がくぶちおばけ', 'GHOST', '#E8E0FF', '#9A8AC8', 'FLY', ['RAIN', 'WAVE'],
     'くらいので 足もとに きをつけて'),
    ('クレヨンりゅう', 'DRAGON', '#FF8A3A', '#C85A20', 'GROUND', ['SPREAD', 'SLAM'],
     'ふとい たまを 3ぽん うつ'),
    ('こうじょうロボ', 'ROBO', '#B9C4D6', '#7C8AA0', 'PACE', ['BEAM', 'SPAWN'],
     'ビームを ためる。しゃがまず よこに にげて'),
    ('たるだいおう', 'KING', '#C8813C', '#8A5626', 'GROUND', ['RAIN', 'SLAM', 'SPAWN'],
     'たるを なげてくる。はしごで にげよう'),
    ('ロケットロボ', 'ROBO', '#FF7A5A', '#C04A2A', 'HOP', ['BEAM', 'SPREAD'],
     'とんで ビーム。足が 軽いので おちついて'),
    ('UFOきち', 'UFO', '#8AF0D8', '#3EA890', 'FLY', ['RING', 'RAIN'],
     'まるく たまを まく。すきまを ぬけて'),
    ('ムーンドラゴン', 'DRAGON', '#C8C8E8', '#8A8AB0', 'FLY', ['DASH', 'RING'],
     '月では ふわっと とべる。上を とろう'),
    ('ブラックホールおばけ', 'GHOST', '#C88AFF', '#7A3AA8', 'FLY', ['RAIN', 'RING', 'DASH'],
     'くらやみ。光の 中で たたかおう'),
    ('ゆめの おうじょ', 'WITCH', '#FFB0E8', '#C86AA8', 'FLY', ['SPAWN', 'RAIN', 'ARC'],
     'こぶんが いっぱい。ぶきで ちらそう'),
    ('かがみの りな', 'KING', '#FF9EC4', '#E979AC', 'HOP', ['DASH', 'SPREAD', 'SLAM'],
     'りなと 同じ うごき。よく 見て！'),
    ('ようがんドラゴン', 'DRAGON', '#FF6A3A', '#B03A18', 'GROUND', ['BEAM', 'RAIN', 'SLAM'],
     'ようがんに 落ちないように！'),
    ('そらの しはいしゃ', 'UFO', '#FFD24A', '#C89A20', 'FLY', ['RING', 'BEAM', 'DASH'],
     '画面が 進む。おいていかれないで'),
    ('まおう ダークキング', 'KING', '#6E5BA6', '#3A2A60', 'GROUND',
     ['ARC', 'RING', 'RAIN', 'BEAM', 'SLAM', 'SPAWN'],
     'さいごの てき。ぜんぶ 出してくる！'),
]

WEAPON_CYCLE = ['HEART', 'ICE', 'BOOM', 'HAMMER']

# ---------------------------------------------------------------- ステージ表
# feats: 使ってよい しかけ
BASIC = ['flat', 'pit', 'steps', 'blocks', 'plats']
STAGES = [
    ('おうちの リビング', 'HOUSE', BASIC, {}),
    ('おうちの おにわ', 'GARDEN', BASIC + ['springs', 'flyers'], {}),
    ('がっこうの ろうか', 'SCHOOL', BASIC + ['ladder', 'blocks'], {}),
    ('がっこうの おんがくしつ', 'MUSIC', BASIC + ['springs', 'crumble'], {}),
    ('がっこうの たいいくかん', 'GYM', BASIC + ['mover', 'springs', 'flyers'], {}),
    ('うみの あさせ', 'SEA', BASIC + ['water', 'flyers'], {}),
    ('かいてい どうくつ', 'DEEP', ['flat', 'water', 'plats', 'water', 'blocks'], {}),
    ('さんごの おしろ', 'CORAL', BASIC + ['water', 'spikes', 'mover'], {}),
    ('おかしの くに', 'CANDY', BASIC + ['springs', 'crumble', 'flyers'], {}),
    ('まほうの もり', 'FOREST', BASIC + ['ghosts', 'trap', 'ladder'], {}),
    ('くもの しろ', 'CLOUD', ['flat', 'plats', 'mover', 'crumble', 'flyers'], {}),
    ('えのぐの せかい', 'PAINT', BASIC + ['conveyor', 'springs'], {}),
    ('びじゅつかんの よる', 'MUSEUM', BASIC + ['ghosts', 'trap'], {'dark': True}),
    ('らくがき ワールド', 'CRAYON', BASIC + ['blocks', 'springs', 'ladder'], {}),
    ('きかいの こうじょう', 'FACTORY', BASIC + ['conveyor', 'robos', 'spikes'], {}),
    ('たるの やぐら', 'DKTOWER', ['flat', 'ladder', 'barrels', 'plats', 'ladder'], {}),
    ('ロケット きち', 'ROCKET', BASIC + ['robos', 'mover'], {'grav': 0.8}),
    ('うちゅう ステーション', 'STATION', BASIC + ['robos', 'plats', 'spikes'], {'grav': 0.6}),
    ('げっめん クレーター', 'MOON', BASIC + ['plats', 'flyers'], {'grav': 0.45}),
    ('ブラックホール', 'HOLE', BASIC + ['ghosts', 'plats'], {'grav': 0.5, 'dark': True}),
    ('ゆめの くに', 'DREAM', BASIC + ['springs', 'ghosts', 'mover'], {}),
    ('かがみの めいろ', 'MIRROR', BASIC + ['ghosts', 'crumble', 'ladder'], {'dark': True}),
    ('ドラゴンの すみか', 'DRAGON', BASIC + ['spikes', 'mover', 'crumble'], {}),
    ('そらの とう', 'SKYTOWER', ['flat', 'plats', 'mover', 'springs'], {'scroll': 2.7}),
    ('さいごの おしろ', 'CASTLE',
     BASIC + ['spikes', 'ladder', 'crumble', 'mover', 'robos', 'ghosts'], {}),
]


class Grid:
    def __init__(self, w, h=H):
        self.w = w
        self.h = h
        self.g = [['.'] * w for _ in range(h)]

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = c

    def at(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.g[y][x]
        return '#' if (x < 0 or x >= self.w) else '.'

    def ground(self, x0, x1, top=GY):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            for y in range(top, self.h):
                self.g[y][x] = '#'

    def carve(self, x0, x1, top=GY):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            for y in range(top, self.h):
                self.g[y][x] = '.'

    def plat(self, x0, x1, y, ch='='):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            self.g[y][x] = ch

    def free(self, x, y):
        return self.at(x, y) == '.'

    def coins(self, x0, x1, y):
        for x in range(max(0, x0), min(self.w, x1 + 1)):
            if self.free(x, y):
                self.g[y][x] = 'o'

    def arc(self, x0, x1, y, height=2):
        n = max(1, x1 - x0)
        for i in range(n + 1):
            t = i / n
            dy = int(round(height * (1 - (2 * t - 1) ** 2)))
            yy = y - dy
            if self.free(x0 + i, yy):
                self.g[yy][x0 + i] = 'o'

    def rows(self):
        return [''.join(r) for r in self.g]


# ---------------------------------------------------------------- しかけ
def c_flat(g, x0, w, rng, d):
    g.coins(x0 + 2, x0 + 2 + rng.randint(2, 4), STAND)
    if rng.random() < 0.75:
        g.put(x0 + w - 4, STAND, rng.choice('wwwjc' if d > 1 else 'ww'))
    if rng.random() < 0.4:
        g.put(x0 + 3, GY - 4, '?')


def c_pit(g, x0, w, rng, d):
    gap = 2 if d < 2 else rng.randint(2, 3)
    px = x0 + (w - gap) // 2
    g.carve(px, px + gap - 1)
    g.arc(px - 1, px + gap, STAND - 1, 2)
    # 穴の 上に 足場を 置くと、まっすぐ 跳んだ ときに 頭を ぶつけて
    # そのまま 穴に 落ちる。かわりに 穴の 中に 足がかりの 島を 置く。
    if gap >= 3 and rng.random() < 0.6:
        g.plat(px + gap // 2, px + gap // 2, GY - 1)
    if rng.random() < 0.6:
        g.put(x0 + w - 3, STAND, 'w')


def c_steps(g, x0, w, rng, d):
    up = rng.random() < 0.5
    steps = 3
    for i in range(steps):
        top = GY - 1 - i if up else GY - 3 + i
        top = max(GY - 3, min(GY - 1, top))
        g.ground(x0 + 2 + i * 3, x0 + 4 + i * 3, top)
        g.coins(x0 + 2 + i * 3, x0 + 4 + i * 3, top - 1)
    if rng.random() < 0.7:
        g.put(x0 + w - 3, STAND, rng.choice('wjS'))


def c_blocks(g, x0, w, rng, d):
    y = GY - 4
    n = rng.randint(3, 5)
    for i in range(n):
        x = x0 + 3 + i
        g.put(x, y, 'N' if i % 2 else '?')
    g.coins(x0 + 3, x0 + 2 + n, y - 1)
    if rng.random() < 0.6:
        g.put(x0 + w - 4, STAND, rng.choice('wkc'))


def c_plats(g, x0, w, rng, d):
    g.plat(x0 + 2, x0 + 5, GY - 3)
    g.coins(x0 + 2, x0 + 5, GY - 4)
    g.plat(x0 + 8, x0 + 11, GY - 6)
    g.coins(x0 + 8, x0 + 11, GY - 7)
    if rng.random() < 0.5:
        g.put(x0 + 9, GY - 7, 'g')
    elif rng.random() < 0.5:
        g.put(x0 + 9, GY - 7, rng.choice('fM'))
    if rng.random() < 0.6:
        g.put(x0 + w - 3, STAND, rng.choice('wp'))


def c_springs(g, x0, w, rng, d):
    g.put(x0 + 4, STAND, '^')
    g.arc(x0 + 3, x0 + 9, GY - 5, 3)
    g.plat(x0 + 8, x0 + 11, GY - 7)
    g.coins(x0 + 8, x0 + 11, GY - 8)
    if rng.random() < 0.5:
        g.put(x0 + 10, GY - 8, 'h')
    else:
        g.put(x0 + 10, GY - 8, rng.choice('*fM'))


def c_crumble(g, x0, w, rng, d):
    gap = 3
    px = x0 + 4
    g.carve(px, px + gap - 1)
    g.plat(px, px + gap - 1, GY - 2, 'F')
    g.coins(px, px + gap - 1, GY - 3)


def c_mover(g, x0, w, rng, d):
    # 穴は 4マスまで。ジャンプで 5.8マス とべるので、移動床は
    # 「あると らく」くらいに して、乗れないと 進めない ように しない。
    gap = 3
    px = x0 + 4
    g.carve(px, px + gap - 1)
    g.put(px + gap // 2, GY - 3, 'm')
    g.arc(px, px + gap - 1, GY - 4, 2)


def c_spikes(g, x0, w, rng, d):
    sx = x0 + 4
    n = rng.randint(2, 3)
    for x in range(sx, sx + n):
        g.put(x, STAND, 's')
    g.plat(sx - 2, sx + n + 1, GY - 3)
    g.coins(sx - 2, sx + n + 1, GY - 4)


def c_ladder(g, x0, w, rng, d):
    # ドンキーコングの はしご。上の 足場は はしごでしか 行けない。
    top = GY - 6
    g.plat(x0 + 3, x0 + w - 3, top)
    lx = x0 + 4
    for y in range(top - 1, GY):
        g.put(lx, y, 'H')
    g.coins(x0 + 5, x0 + w - 4, top - 1)
    if rng.random() < 0.6:
        g.put(x0 + w - 5, top - 1, rng.choice('wS'))
    g.put(x0 + w - 4, top - 1, 'g')


def c_barrels(g, x0, w, rng, d):
    top = GY - 6
    g.plat(x0 + 2, x0 + w - 2, top)
    lx = x0 + 3
    for y in range(top - 1, GY):
        g.put(lx, y, 'H')
    g.put(x0 + w - 4, top - 1, 'y')
    g.coins(x0 + 5, x0 + w - 6, top - 1)
    g.coins(x0 + 2, x0 + 5, STAND)


def c_conveyor(g, x0, w, rng, d):
    ch = '>' if rng.random() < 0.6 else '<'
    for x in range(x0 + 3, x0 + w - 3):
        g.put(x, GY, ch)
    g.coins(x0 + 4, x0 + w - 5, STAND)
    if rng.random() < 0.6:
        g.put(x0 + w - 4, STAND, 'k')


def c_water(g, x0, w, rng, d):
    # 水の中に 置く しるしは E（さかな）と Q（コイン）。
    # ふつうの e/o に すると、しるしを 消した ところが 水では なくなり、
    # およいで いる とちゅうで あなに 落ちる。
    x1 = x0 + w - 3
    for x in range(x0 + 3, x1):
        for y in range(GY - 4, GY):
            g.put(x, y, 'W')
    for i in range(2):
        ex = x0 + 5 + i * 6
        if ex < x1 - 1:
            g.put(ex, GY - 2, 'E')
    for x in range(x0 + 4, x1 - 1):
        if g.at(x, GY - 3) == 'W':
            g.put(x, GY - 3, 'Q')


def c_flyers(g, x0, w, rng, d):
    g.put(x0 + 4, GY - 6, 'p')
    if d > 1:
        g.put(x0 + 9, GY - 5, 'p')
    g.arc(x0 + 2, x0 + w - 3, GY - 3, 3)


def c_ghosts(g, x0, w, rng, d):
    g.put(x0 + 5, GY - 4, 'z')
    if d > 2:
        g.put(x0 + 10, GY - 5, 'z')
    g.coins(x0 + 3, x0 + w - 4, STAND)


def c_robos(g, x0, w, rng, d):
    g.plat(x0 + 4, x0 + 7, GY - 3)
    g.put(x0 + 5, GY - 4, 'r')
    g.coins(x0 + 8, x0 + w - 3, STAND)


def c_trap(g, x0, w, rng, d):
    for x in range(x0 + 5, x0 + 8):
        g.put(x, STAND, 'T')
    g.put(x0 + 10, GY - 6, 'd')
    g.coins(x0 + 2, x0 + 4, STAND)


CHUNKS = {
    'flat': (c_flat, 12), 'pit': (c_pit, 14), 'steps': (c_steps, 14),
    'blocks': (c_blocks, 13), 'plats': (c_plats, 15), 'springs': (c_springs, 14),
    'crumble': (c_crumble, 13), 'mover': (c_mover, 14), 'spikes': (c_spikes, 13),
    'ladder': (c_ladder, 15), 'barrels': (c_barrels, 16), 'conveyor': (c_conveyor, 14),
    'water': (c_water, 16), 'flyers': (c_flyers, 14), 'ghosts': (c_ghosts, 14),
    'robos': (c_robos, 14), 'trap': (c_trap, 14),
}


# ---------------------------------------------------------------- 組みたて
def build_main(idx, title, theme, feats, rng):
    d = 1 + idx // 8              # むずかしさ 1..4
    n_chunks = 7 + min(5, idx // 4)
    # その ステージの「めだま」の しかけは かならず 1回は 出す。
    # ランダムだけに すると、ベルトコンベアの ように 一度も 出ない しかけが できる。
    specials = [f for f in feats if f not in BASIC]
    picks = list(dict.fromkeys(specials))[:n_chunks]
    while len(picks) < n_chunks:
        picks.append(rng.choice(feats))
    rng.shuffle(picks)
    widths = [CHUNKS[p][1] for p in picks]
    intro = 14
    arena = 26
    tail = 10
    total = intro + sum(widths) + 6 + arena + tail
    g = Grid(total)
    g.ground(0, total - 1)

    x = intro
    for p, w in zip(picks, widths):
        CHUNKS[p][0](g, x, w, rng, d)
        x += w

    # ボスの前の 休けい所。ここに アイテムブロックを 置く
    rest = x
    g.put(rest + 2, GY - 4, '!')
    g.put(rest + 4, GY - 4, '!')
    g.put(rest + 3, STAND, 'C')
    x += 6

    # ボス広場。ゆかを 1だん 高くして、ボスが 外に 出ないようにする
    ax = x
    g.plat(ax, ax + arena - 1, GY - 1, '#')
    for xx in range(ax, ax + arena):
        for yy in range(GY - 1, H):
            g.g[yy][xx] = '#'
    g.put(ax + arena - 8, GY - 2, 'B')
    x += arena

    # とちゅうの チェックポイント。死んでも 最初まで もどらないように。
    for frac in (0.33, 0.62):
        want = int((intro + sum(widths)) * frac) + 6
        for off in range(0, 14):
            for x in (want + off, want - off):
                if not (intro <= x < rest - 2):
                    continue
                if g.at(x, GY) == '#' and all(g.at(x + k, y) == '.'
                                              for k in (-1, 0, 1) for y in range(GY - 3, GY)):
                    g.put(x, STAND, 'C')
                    break
            else:
                continue
            break

    # ゴール
    g.put(total - 5, STAND, 'G')

    # スタート
    g.put(2, STAND, '@')
    g.coins(4, 8, STAND)
    g.put(6, GY - 4, '!')

    return g, ax, total


def build_sub(idx, rng, weapon):
    """どかんの さきの ちか。コインと アイテムが ある へや。"""
    w = 44
    g = Grid(w)
    g.ground(0, w - 1)
    # 天井
    for x in range(w):
        g.g[0][x] = '#'
        g.g[1][x] = '#'
    # 入口の どかん（左）と 出口の どかん（右）
    g.put(2, GY, 'O'); g.put(3, GY, 'O')
    g.put(2, GY + 1, 'D'); g.put(3, GY + 1, 'D')
    g.put(w - 4, GY, 'O'); g.put(w - 3, GY, 'O')
    g.put(w - 4, GY + 1, 'D'); g.put(w - 3, GY + 1, 'D')
    # コインの へや。だんだんに して、上まで のぼれるように する。
    g.plat(9, 13, GY - 3)
    g.plat(17, 21, GY - 5)
    g.plat(26, 30, GY - 3)
    g.coins(6, w - 7, STAND)
    g.coins(9, 13, GY - 4)
    g.coins(17, 21, GY - 6)
    g.coins(26, 30, GY - 4)
    g.put(19, GY - 6, 'g')
    g.put(11, GY - 4, 'h')
    g.put(28, GY - 4, '*')
    g.put(16, STAND, 'w')
    g.put(34, STAND, 'w')
    return g, 2, w - 4


def add_pipes(g, sub_entry_col, rng):
    """本すじの どかんを 2つ 置いて、その 列を かえす。"""
    # 入口は まえの ほう、出口は うしろの ほう
    cand_in = [x for x in range(20, int(g.w * 0.45))
               if all(g.at(x + k, GY) == '#' for k in range(2))
               and all(g.at(x + k, y) == '.' for k in range(2) for y in range(GY - 3, GY))]
    cand_out = [x for x in range(int(g.w * 0.5), int(g.w * 0.72))
                if all(g.at(x + k, GY) == '#' for k in range(2))
                and all(g.at(x + k, y) == '.' for k in range(2) for y in range(GY - 3, GY))]
    if not cand_in or not cand_out:
        return None
    xin = rng.choice(cand_in)
    xout = rng.choice(cand_out)
    if abs(xin - xout) < 12:
        return None
    for k in range(2):
        g.put(xin + k, GY, 'O')
        g.put(xin + k, GY + 1, 'D')
        g.put(xout + k, GY, 'O')
        g.put(xout + k, GY + 1, 'D')
    return xin, xout


# ---------------------------------------------------------------- けんさ
def stand_cells(rows, h, w):
    cells = set()
    for y in range(h - 1):
        for x in range(w):
            if rows[y][x] in SOLID:
                continue
            if rows[y + 1][x] in SOLID:
                cells.add((x, y))
    return cells


def reachable(rows, start, h, w):
    """歩き・ジャンプ・はしご・水 で 行ける ところを ひろう。"""
    solid = [[rows[y][x] in SOLID for x in range(w)] for y in range(h)]
    # 移動床。ゆれる はんいを「立てる ばしょ」として あつかう。
    virtual = set()
    for y in range(h):
        for x in range(w):
            if rows[y][x] == 'm':
                for xx in range(x - 3, x + 5):
                    if 0 <= xx < w and y - 1 >= 0:
                        virtual.add((xx, y - 1))
            elif rows[y][x] == 'v':
                for yy in range(y - 2, y + 3):
                    for xx in range(x - 1, x + 2):
                        if 0 <= xx < w and 0 <= yy - 1:
                            virtual.add((xx, yy - 1))
    water = [[rows[y][x] in 'WQE' for x in range(w)] for y in range(h)]
    ladder = [[rows[y][x] == 'H' for x in range(w)] for y in range(h)]
    spring = [[rows[y][x] == '^' for x in range(w)] for y in range(h)]

    def free(x, y):
        return 0 <= x < w and 0 <= y < h and not solid[y][x]

    def supported(x, y):
        if not free(x, y):
            return False
        if water[y][x] or ladder[y][x]:
            return True
        if (x, y) in virtual:
            return True
        return (y + 1 >= h) or solid[y + 1][x]

    seen = set()
    stack = [start]
    seen.add(start)
    while stack:
        x, y = stack.pop()
        nxt = []
        # 水・はしごの 中は 4ほうこうに 動ける
        if water[y][x] or ladder[y][x]:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if free(x + dx, y + dy):
                    nxt.append((x + dx, y + dy))
        # よこ歩き（同じ 高さ）
        for dx in (-1, 1):
            if free(x + dx, y) and supported(x + dx, y):
                nxt.append((x + dx, y))
        # おちる
        if free(x, y + 1) and not supported(x, y):
            nxt.append((x, y + 1))
        yy = y
        while free(x, yy + 1) and not (water[yy + 1][x] or ladder[yy + 1][x]):
            yy += 1
            nxt.append((x, yy))
            if supported(x, yy):
                break
        # ジャンプ（ばねの 上なら 高く）
        if supported(x, y):
            up = 7 if (y + 1 < h and spring[y + 1][x]) else 3
            span = 5 if up > 3 else 4
            for dy in range(-up, 4):
                for dx in range(-span, span + 1):
                    tx, ty = x + dx, y + dy
                    if not free(tx, ty) or not supported(tx, ty):
                        continue
                    if abs(dx) + max(0, -dy) > span + up:
                        continue
                    # 頭の 上が ふさがっていたら 高くは とべない
                    if dy < 0 and not free(x, y - 1):
                        continue
                    nxt.append((tx, ty))
        for c in nxt:
            if c not in seen and free(c[0], c[1]):
                seen.add(c)
                stack.append(c)
    return seen


def check_area(name, rows, need_goal, start_hint=None):
    errs = []
    h = len(rows)
    w = len(rows[0])
    if len(set(len(r) for r in rows)) != 1:
        errs.append('行の長さが ふぞろい')
        return errs
    flat = ''.join(rows)
    if need_goal:
        if flat.count('@') != 1:
            errs.append('スタートが %d こ' % flat.count('@'))
        if flat.count('G') != 1:
            errs.append('ゴールが %d こ' % flat.count('G'))
        if flat.count('B') != 1:
            errs.append('ボスが %d たい' % flat.count('B'))

    # 地上に 置くものの 足もとが かたいか
    for y in range(h):
        for x in range(w):
            c = rows[y][x]
            if c in 'wkjcSyrCB@G':
                below = rows[y + 1][x] if y + 1 < h else '.'
                if below not in SOLID:
                    errs.append('%s (%d,%d) の 足もとが 空中' % (c, x, y))

    # スタートの まわりに 敵が いないか
    if need_goal:
        sx = flat.index('@') % w
        for y in range(h):
            for x in range(w):
                if rows[y][x] in ENEMY_CHARS and abs(x - sx) < 10:
                    errs.append('敵 %s (%d,%d) が スタートに 近すぎる' % (rows[y][x], x, y))

    # 到達できるか
    if start_hint is not None:
        start = start_hint
    else:
        i = flat.index('@')
        start = (i % w, i // w)
    seen = reachable(rows, start, h, w)
    if need_goal:
        i = flat.index('G')
        gx, gy = i % w, i // w
        if (gx, gy) not in seen:
            errs.append('ゴール (%d,%d) に たどりつけない' % (gx, gy))
        i = flat.index('B')
        bx, by = i % w, i // w
        if (bx, by) not in seen:
            errs.append('ボス (%d,%d) の ところに 行けない' % (bx, by))
    # アイテムは 空中に あっても、とんで さわれれば よい。
    # ブロックは 下から たたければ よい。
    springs = set()
    for y in range(h):
        for x in range(w):
            if rows[y][x] == '^':
                springs.add(x)

    def item_ok(cx, cy):
        assisted = any(abs(sx - cx) <= 6 for sx in springs)
        rise = 7 if assisted else 4
        span = 6 if assisted else 5
        for (x, y) in seen:
            if abs(x - cx) <= span and -7 <= (y - cy) <= rise:
                return True
        return False

    def block_ok(cx, cy):
        for (x, y) in seen:
            if abs(x - cx) <= 1 and 1 <= (y - cy) <= 4:
                return True
        return False

    bad = []
    coins = []
    for y in range(h):
        for x in range(w):
            c = rows[y][x]
            if c == 'o' or c == 'Q':
                if not item_ok(x, y):
                    coins.append((x, y))
            elif c in 'g*fMh' and not item_ok(x, y):
                bad.append((c, x, y))
            elif c in '?!' and not block_ok(x, y):
                bad.append((c, x, y))
    if bad:
        errs.append('とどかない アイテム／ブロックが %d こ 例:%s' % (len(bad), bad[:4]))
    # コインは 取れなくても 先には 進めるので、多すぎる ときだけ やりなおす
    if len(coins) > 10:
        errs.append('とどかない コインが %d こ 例:%s' % (len(coins), coins[:4]))
    elif coins:
        WARN.append('コイン %d こは とりにくい' % len(coins))
    return errs


# ---------------------------------------------------------------- 出力
def build_all(seed=20260811):
    levels = []
    problems = 0
    for i, (title, theme, feats, opt) in enumerate(STAGES):
        rng = random.Random(seed + i * 977)
        name, shape, col, col2, move, attacks, hint = BOSSES[i]
        weapon = WEAPON_CYCLE[i % len(WEAPON_CYCLE)]
        hp = 3 + i // 3
        bw = 2.6 + (i / 24) * 0.6
        bh = 2.4 + (i / 24) * 0.6
        if i == 24:
            bw, bh, hp = 3.4, 3.2, 12
        boss = {
            'name': name, 'shape': shape, 'col': col, 'col2': col2,
            'hp': hp, 'w': round(bw, 2), 'h': round(bh, 2),
            'move': move, 'speed': round(1.7 + i * 0.045, 2),
            'gap': round(max(2.0, 3.0 - i * 0.04), 2),
            'attacks': attacks, 'hard': i >= 16, 'weapon': weapon, 'hint': hint,
        }

        for attempt in range(60):
            r2 = random.Random(seed + i * 977 + attempt * 13)
            g, ax, total = build_main(i, title, theme, feats, r2)
            pipes = add_pipes(g, 0, r2)
            if not pipes:
                continue
            rows = g.rows()
            errs = check_area('%02d main' % (i + 1), rows, True)
            if not errs:
                break
        if errs:
            problems += 1
            print('[%02d %s] NG' % (i + 1, title))
            for e in errs[:8]:
                print('    ! ' + e)
        else:
            print('[%02d %-16s] 幅=%3d しかけOK  ボス=%s' % (i + 1, title, total, name))

        sub, sub_in, sub_out = build_sub(i, random.Random(seed + i * 31), weapon)
        sub_rows = sub.rows()
        serrs = check_area('%02d sub' % (i + 1), sub_rows, False, start_hint=(sub_in, GY - 1))
        if serrs:
            problems += 1
            print('[%02d %s] ちか NG' % (i + 1, title))
            for e in serrs[:6]:
                print('    ! ' + e)

        xin, xout = pipes
        areas = [
            {'rows': rows, 'title': title, 'theme': theme},
            {'rows': sub_rows, 'title': 'ちかの へや', 'theme': 'CAVE_SUB', 'dark': False},
        ]
        if opt.get('grav') is not None:
            areas[0]['grav'] = opt['grav']
        if opt.get('dark'):
            areas[0]['dark'] = True
        if opt.get('scroll'):
            areas[0]['scroll'] = opt['scroll']
        warps = [
            {'a': 0, 'x': xin, 'y': GY, 'to': {'a': 1, 'x': sub_in, 'y': GY}},
            {'a': 1, 'x': sub_out, 'y': GY, 'to': {'a': 0, 'x': xout, 'y': GY}},
        ]
        levels.append({
            'title': title, 'theme': theme, 'boss': boss,
            'areas': areas, 'warps': warps,
        })
    return levels, problems


def emit(levels, path):
    out = ['// このファイルは rina2/tools/genlevels.py が 作る。手で なおさないこと。',
           'const LEVELS = [']
    for lv in levels:
        out.append('  {')
        out.append('    title: %s, theme: %s,' % (json.dumps(lv['title'], ensure_ascii=False),
                                                  json.dumps(lv['theme'])))
        out.append('    boss: %s,' % json.dumps(lv['boss'], ensure_ascii=False))
        out.append('    areas: [')
        for a in lv['areas']:
            extra = ''
            for k in ('grav', 'dark', 'scroll'):
                if k in a:
                    extra += ' %s: %s,' % (k, json.dumps(a[k]))
            out.append('      { title: %s, theme: %s,%s rows: [' % (
                json.dumps(a['title'], ensure_ascii=False), json.dumps(a['theme']), extra))
            for r in a['rows']:
                out.append('        %s,' % json.dumps(r))
            out.append('      ] },')
        out.append('    ],')
        out.append('    warps: %s,' % json.dumps(lv['warps']))
        out.append('  },')
    out.append('];')
    out.append('')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))


if __name__ == '__main__':
    lv, bad = build_all()
    here = os.path.dirname(os.path.abspath(__file__))
    emit(lv, os.path.join(here, '..', 'site', 'levels.js'))
    print('ステージ %d 本、こまった ところ %d' % (len(lv), bad))
    sys.exit(1 if bad else 0)
