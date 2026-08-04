#!/usr/bin/env python3
"""Levels.kt を生成し、到達可能性を検証する。

物理定数（Game.kt と一致させること）:
  GRAVITY = 44, JUMP_V = 17.5, MOVE_SPEED = 7.5
  ジャンプ到達高 = 17.5^2/(2*44) = 3.48 タイル
  滞空時間      = 2*17.5/44     = 0.795 s
  水平到達距離  = 0.795*7.5     = 5.96 タイル
  ジャンプ台    = 26.0          -> 到達高 7.68 タイル

安全マージンを見て「登れる高さ差 <= 3」「越えられる隙間 <= 4」を上限とする。
移動床・ジャンプ台がある列は補助ありとみなし、上限を緩める。

タイル:
  .  空    #  地面   =  足場   ?  ブロック   x  叩いた後   s  ダメージ床
  ^  ジャンプ台   F  もろい足場（乗ると崩れる）   T  とつぜんトゲ（近づくと出る）
エンティティ:
  @  開始  G  ゴール  C  中間地点
  w  ぷにまる  k  とげのすけ  p  ぱたぽん  j  ぴょんた  c  おいかけ  B  ボス
  D  どんぐり（真下を通ると落ちてくる）
  m  横移動床  v  縦移動床
  o  コイン  g  ジェム  h  ハート  *  スター
  d  ダッシュ  f  はね  b  バリア  M  マグネット
"""

import io
import os
import sys

H = 12
SOLID = set('#=?x^F')
ENEMIES = 'wkpjcBD'
GROUND_ENTITIES = 'wkjcB@GC'

# 開始地点から敵までの最低距離。敵は毎秒 2.3 タイル歩くので、これだけ
# 空けておけば開始直後の無敵時間（Game.kt の SPAWN_GRACE）が切れる前に
# ぶつかることはない。
START_CLEARANCE = 10

# 移動床の振れ幅。Game.kt の MOVER_AMP_X / MOVER_AMP_Y と一致させること。
MOVER_AMP_X = 3
MOVER_AMP_Y = 2


class Grid:
    def __init__(self, w):
        self.w = w
        self.g = [['.'] * w for _ in range(H)]
        self.assist = set()      # 移動床やジャンプ台で補助される列
        self.virtual = {}        # 移動床が作る足場 col -> [row]
        self.clobbered = []      # 仕掛けが敵やアイテムを消してしまった箇所

    # --- 地形 ---
    def ground(self, x0, x1, top):
        for x in range(x0, x1 + 1):
            for y in range(top, H):
                self.g[y][x] = '#'

    def plat(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            self.g[y][x] = '='

    def block(self, x, y):
        self.g[y][x] = '?'

    def hazard(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            self.g[y][x] = 's'

    def _claim(self, x, y, ch):
        """仕掛けを置く。敵やアイテムを消してしまっていたら記録する。"""
        old = self.g[y][x]
        if old in 'wkpjcBD@GCmvghd*fbM':
            self.clobbered.append((ch, x, y, old))
        self.g[y][x] = ch

    def crumble(self, x0, x1, y):
        """もろい足場。乗ると崩れて落ちる。"""
        for x in range(x0, x1 + 1):
            self._claim(x, y, 'F')

    def poptrap(self, x0, x1, y):
        """とつぜんトゲ。近づくまで地面に隠れている。"""
        for x in range(x0, x1 + 1):
            self._claim(x, y, 'T')

    def dropper(self, x, y):
        """どんぐり。真下を通ると落ちてくる。"""
        self._claim(x, y, 'D')

    def bounce(self, x, y):
        self.g[y][x] = '^'
        for c in range(max(0, x - 2), min(self.w, x + 3)):
            self.assist.add(c)

    # --- エンティティ ---
    def put(self, x, y, ch):
        self.g[y][x] = ch

    def mover(self, x, y, vertical=False):
        self.g[y][x] = 'v' if vertical else 'm'
        if vertical:
            cols = [x]
            self.virtual.setdefault(x, []).append(y + MOVER_AMP_Y)
        else:
            cols = range(max(0, x - MOVER_AMP_X), min(self.w, x + MOVER_AMP_X + 1))
            for c in cols:
                self.virtual.setdefault(c, []).append(y)
        for c in cols:
            self.assist.add(c)

    def coins(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            if self.g[y][x] == '.':
                self.g[y][x] = 'o'

    def arc(self, x0, x1, y, height=2):
        """山なりにコインを並べる。"""
        n = x1 - x0
        for i in range(n + 1):
            t = i / max(1, n)
            dy = int(round(height * (1 - (2 * t - 1) ** 2)))
            yy = y - dy
            if 0 <= yy < H and self.g[yy][x0 + i] == '.':
                self.g[yy][x0 + i] = 'o'

    def rows(self):
        return [''.join(r) for r in self.g]


def check(name, grid):
    errs = []
    rows = grid.rows()
    flat = ''.join(rows)

    if len(set(len(r) for r in rows)) != 1:
        errs.append('行の長さが不揃い')
    if flat.count('@') != 1:
        errs.append('開始地点が %d 個' % flat.count('@'))
    if flat.count('G') != 1:
        errs.append('ゴールが %d 個' % flat.count('G'))

    # 地上に置くものの足元が固いか
    for y in range(H):
        for x in range(grid.w):
            c = grid.g[y][x]
            if c in GROUND_ENTITIES:
                below = grid.g[y + 1][x] if y + 1 < H else '.'
                if below not in SOLID:
                    errs.append('%s (%d,%d) の足元が空中' % (c, x, y))

    for ch, x, y, old in grid.clobbered:
        errs.append('仕掛け %s (%d,%d) が %s を消している' % (ch, x, y, old))

    # とつぜんトゲは地面の上に置く
    for y in range(H):
        for x in range(grid.w):
            if grid.g[y][x] == 'T':
                below = grid.g[y + 1][x] if y + 1 < H else '.'
                if below not in SOLID:
                    errs.append('とつぜんトゲ (%d,%d) の足元が空中' % (x, y))

    # どんぐりは落ちた先に足場がないと、落下しただけで消えてしまう
    for y in range(H):
        for x in range(grid.w):
            if grid.g[y][x] == 'D':
                if not any(grid.g[yy][x] in SOLID for yy in range(y + 1, H)):
                    errs.append('どんぐり (%d,%d) の落下先に足場がない' % (x, y))

    # 開始地点のまわりに敵がいないか。敵は歩き出すので、近すぎると
    # プレイヤーが操作を始める前にぶつかって即死する。
    start = [(x, y) for y in range(H) for x in range(grid.w) if grid.g[y][x] == '@']
    if start:
        sx = start[0][0]
        for y in range(H):
            for x in range(grid.w):
                if grid.g[y][x] in ENEMIES and abs(x - sx) < START_CLEARANCE:
                    errs.append('敵 %s (%d,%d) が開始地点 x=%d に近すぎる（%d タイル）'
                                % (grid.g[y][x], x, y, sx, abs(x - sx)))

    # 足場の上面を列ごとに集めて到達可能性を検査する
    surf = {}
    for x in range(grid.w):
        for y in range(H):
            if grid.g[y][x] in SOLID and (y == 0 or grid.g[y - 1][x] not in SOLID):
                surf.setdefault(x, []).append(y)
    for x, ys in grid.virtual.items():
        for y in ys:
            surf.setdefault(x, []).append(y)

    cols = sorted(surf.keys())
    prev = None
    for x in cols:
        if prev is not None:
            gap = x - prev - 1
            assisted = (x in grid.assist) or (prev in grid.assist)
            max_gap = 7 if assisted else 4
            max_rise = 7 if assisted else 3
            if gap > max_gap:
                errs.append('x=%d と x=%d の間に %d タイルの隙間（跳べない）'
                            % (prev, x, gap))
            elif gap > 0:
                rise = min(surf[prev]) - min(surf[x])
                if rise > max_rise:
                    errs.append('x=%d -> x=%d で %d タイルの登り（届かない）'
                                % (prev, x, rise))
        prev = x

    counts = {c: flat.count(c) for c in ENEMIES}
    traps = flat.count('F') + flat.count('T') + flat.count('D')
    print('[%-10s] 幅=%3d 敵=%2d コイン=%3d アイテム=%2d 仕掛け=%2d %s' % (
        name, grid.w, sum(counts.values()), flat.count('o'),
        sum(flat.count(c) for c in 'ghd*fbM'), traps,
        'OK' if not errs else 'NG'))
    for e in errs:
        print('    ! ' + e)
    return not errs


# ============================================================ ステージ 1
def s1_grass():
    """基本操作。踏みつけとコイン。"""
    g = Grid(100)
    for a, b in [(0, 26), (30, 53), (57, 70), (74, 99)]:
        g.ground(a, b, 10)
    for a, b, y in [(12, 15, 7), (20, 22, 6), (36, 39, 7),
                    (44, 46, 6), (62, 65, 7), (80, 83, 7), (88, 90, 6)]:
        g.plat(a, b, y)
    for x, y in [(8, 7), (9, 7), (33, 7), (60, 7), (86, 7)]:
        g.block(x, y)

    g.coins(4, 7, 9)
    for a, b, y in [(12, 15, 6), (20, 22, 5), (36, 39, 6), (44, 46, 5),
                    (62, 65, 6), (80, 83, 6), (88, 90, 5)]:
        g.coins(a, b, y)
    for a, b in [(27, 29), (54, 56), (71, 73)]:
        g.arc(a, b, 8, 2)

    for x in (18, 40, 66, 78, 92):
        g.put(x, 9, 'w')
    g.put(49, 5, 'p')
    g.put(68, 4, 'p')
    g.put(45, 4, 'h')
    g.put(21, 5, 'g')
    g.put(58, 9, 'C')
    # --- 初見殺し ---
    g.poptrap(48, 49, 9)      # 何もない平地から急にトゲが出る
    g.dropper(24, 6)          # 走り抜ける通路の真上
    g.put(2, 9, '@')
    g.put(96, 9, 'G')
    return g


# ============================================================ ステージ 2
def s2_meadow():
    """ジャンプ台とダッシュシューズの導入。"""
    g = Grid(105)
    for a, b in [(0, 24), (28, 50), (54, 74), (78, 104)]:
        g.ground(a, b, 10)
    for x in (22, 46, 70):
        g.bounce(x, 9)
    for a, b, y in [(18, 26, 4), (42, 50, 3), (66, 74, 4), (90, 96, 6)]:
        g.plat(a, b, y)
    for x, y in [(12, 7), (13, 7), (36, 7), (60, 7)]:
        g.block(x, y)

    g.coins(4, 8, 9)
    for a, b, y in [(18, 26, 3), (42, 50, 2), (66, 74, 3), (90, 96, 5)]:
        g.coins(a, b, y)
    for a, b in [(25, 27), (51, 53), (75, 77)]:
        g.arc(a, b, 8, 2)

    for x in (16, 33, 58, 84, 98):
        g.put(x, 9, 'w')
    g.put(40, 6, 'p')
    g.put(64, 9, 'j')
    g.put(30, 9, 'd')
    g.put(46, 1, 'g')
    g.put(70, 2, 'h')
    g.put(56, 9, 'C')
    # --- 初見殺し ---
    g.crumble(46, 48, 3)      # ジャンプ台で上がった先の足場が崩れる
    g.dropper(36, 6)
    g.put(2, 9, '@')
    g.put(101, 9, 'G')
    return g


# ============================================================ ステージ 3
def s3_cave():
    """高低差とトゲ床。ぴょんたとバリアの導入。"""
    g = Grid(110)
    for a, b in [(0, 18), (22, 38), (42, 58), (62, 80), (84, 109)]:
        g.ground(a, b, 10)
    g.ground(29, 38, 8)
    g.ground(70, 80, 8)
    for a, b, y in [(8, 11, 7), (50, 53, 7), (64, 67, 7), (94, 97, 7), (100, 103, 6)]:
        g.plat(a, b, y)
    for x, y in [(14, 7), (15, 7), (25, 7), (56, 6), (88, 7)]:
        g.block(x, y)
    g.hazard(46, 48, 9)
    g.hazard(90, 91, 9)

    g.coins(8, 11, 6)
    for a, b, y in [(29, 33, 7), (50, 53, 6), (64, 67, 6),
                    (74, 79, 7), (94, 97, 6), (100, 103, 5)]:
        g.coins(a, b, y)
    for a, b in [(19, 21), (39, 41), (59, 61), (81, 83)]:
        g.arc(a, b, 8, 2)

    for x in (13, 26, 55, 86):
        g.put(x, 9, 'w')
    g.put(33, 7, 'w')
    g.put(76, 7, 'j')
    g.put(52, 6, 'k')
    g.put(72, 7, 'k')
    g.put(44, 5, 'p')
    g.put(60, 4, 'p')
    g.put(31, 6, '*')
    g.put(96, 5, 'h')
    g.put(24, 9, 'b')
    g.put(66, 6, 'g')
    g.put(63, 9, 'C')
    # --- 初見殺し ---
    g.poptrap(35, 36, 7)      # 高台の上
    g.dropper(50, 5)
    g.put(2, 9, '@')
    g.put(106, 9, 'G')
    return g


# ============================================================ ステージ 4
def s4_water():
    """横移動床とマグネットの導入。"""
    g = Grid(116)
    for a, b in [(0, 22), (34, 52), (64, 82), (95, 115)]:
        g.ground(a, b, 10)
    g.mover(28, 9)
    g.mover(58, 8)
    g.mover(88, 9)
    for a, b, y in [(10, 13, 7), (40, 44, 6), (70, 74, 6), (100, 104, 6)]:
        g.plat(a, b, y)
    for x, y in [(17, 7), (48, 7), (78, 7)]:
        g.block(x, y)

    g.coins(4, 8, 9)
    for a, b, y in [(10, 13, 6), (40, 44, 5), (70, 74, 5), (100, 104, 5)]:
        g.coins(a, b, y)
    for a, b in [(24, 32), (54, 62), (84, 92)]:
        g.arc(a, b, 7, 2)

    for x in (14, 38, 46, 70, 100):
        g.put(x, 9, 'w')
    g.put(20, 9, 'j')
    g.put(76, 9, 'c')
    g.put(30, 5, 'p')
    g.put(60, 4, 'p')
    g.put(50, 9, 'M')
    g.put(72, 5, 'f')
    g.put(42, 5, 'g')
    g.put(80, 9, 'h')
    g.put(49, 9, 'C')
    # --- 初見殺し ---
    g.crumble(42, 44, 6)
    g.poptrap(42, 43, 9)
    g.put(2, 9, '@')
    g.put(112, 9, 'G')
    return g


# ============================================================ ステージ 5
def s5_sky():
    """浮き足場だけの空中ステージ。はねで二段ジャンプ。"""
    g = Grid(125)
    g.ground(0, 10, 10)
    g.ground(112, 124, 10)
    chain = [(14, 17, 9), (21, 24, 8), (28, 31, 7), (35, 38, 7), (42, 45, 8),
             (49, 53, 9), (57, 60, 7), (64, 67, 6), (71, 74, 7), (78, 82, 8),
             (86, 89, 7), (93, 96, 6), (100, 104, 7), (107, 110, 8)]
    for a, b, y in chain:
        g.plat(a, b, y)
    g.block(6, 7)
    g.block(54, 6)

    g.coins(3, 6, 9)
    for a, b, y in chain:
        g.coins(a, b, y - 1)
    for a, b in [(18, 20), (32, 34), (46, 48), (61, 63), (75, 77), (90, 92), (105, 106)]:
        g.arc(a, b, 6, 2)
    g.coins(114, 118, 9)

    g.put(15, 8, 'w')
    g.put(29, 6, 'w')
    g.put(58, 6, 'w')
    g.put(79, 7, 'j')
    g.put(101, 6, 'c')
    g.put(36, 6, 'k')
    g.put(72, 6, 'k')
    for x, y in [(19, 5), (47, 4), (84, 4), (98, 3)]:
        g.put(x, y, 'p')
    g.put(65, 5, '*')
    g.put(87, 6, 'h')
    g.put(23, 7, 'f')
    g.put(44, 7, 'g')
    g.put(50, 8, 'C')
    # --- 初見殺し ---
    g.crumble(43, 45, 8)      # 空中の足場が崩れる。手前の 42 は残してある
    g.dropper(66, 3)
    g.put(2, 9, '@')
    g.put(120, 9, 'G')
    return g


# ============================================================ ステージ 6
def s6_snow():
    """おいかけが増える。ジャンプ台で高いところへ。"""
    g = Grid(118)
    for a, b in [(0, 20), (25, 44), (49, 68), (73, 92), (97, 117)]:
        g.ground(a, b, 10)
    g.ground(33, 44, 8)
    g.ground(80, 92, 7)
    for x in (16, 40, 64, 88, 110):
        g.bounce(x, 9 if x not in (40, 88) else (7 if x == 40 else 6))
    for a, b, y in [(12, 18, 4), (36, 44, 3), (60, 66, 4), (84, 90, 2), (104, 112, 5)]:
        g.plat(a, b, y)
    for x, y in [(8, 7), (28, 7), (54, 7), (76, 7), (100, 7)]:
        g.block(x, y)

    g.coins(3, 7, 9)
    for a, b, y in [(12, 18, 3), (36, 44, 2), (60, 66, 3), (84, 90, 1), (104, 112, 4)]:
        g.coins(a, b, y)
    for a, b in [(21, 24), (45, 48), (69, 72), (93, 96)]:
        g.arc(a, b, 8, 2)

    for x in (14, 30, 58, 76, 102):
        g.put(x, 9, 'w')
    g.put(38, 7, 'c')
    g.put(86, 6, 'c')
    g.put(52, 9, 'j')
    g.put(66, 9, 'k')
    g.put(108, 9, 'k')
    g.put(46, 5, 'p')
    g.put(94, 4, 'p')
    g.put(40, 1, 'g')
    g.put(62, 9, 'b')
    g.put(88, 0, 'h')
    g.put(26, 9, 'd')
    g.put(50, 9, 'C')
    # --- 初見殺し ---
    g.poptrap(54, 55, 9)
    g.dropper(30, 6)
    g.crumble(106, 108, 5)
    g.put(2, 9, '@')
    g.put(114, 9, 'G')
    return g


# ============================================================ ステージ 7
def s7_desert():
    """トゲ床が増え、足場が細かくなる。"""
    g = Grid(122)
    for a, b in [(0, 16), (20, 32), (36, 48), (52, 70), (74, 88), (92, 121)]:
        g.ground(a, b, 10)
    g.hazard(12, 14, 9)
    g.hazard(28, 30, 9)
    g.hazard(44, 46, 9)
    g.hazard(84, 87, 9)
    g.ground(60, 70, 8)
    for a, b, y in [(8, 10, 7), (24, 26, 6), (40, 42, 6), (56, 58, 7),
                    (78, 81, 6), (96, 99, 6), (104, 108, 5), (114, 118, 7)]:
        g.plat(a, b, y)
    for x, y in [(5, 7), (22, 7), (54, 6), (94, 7), (112, 6)]:
        g.block(x, y)
    g.mover(34, 8)
    g.mover(90, 7)

    g.coins(2, 6, 9)
    for a, b, y in [(24, 26, 5), (40, 42, 5), (56, 58, 6),
                    (78, 81, 5), (96, 99, 5), (104, 108, 4), (114, 118, 6)]:
        g.coins(a, b, y)
    for a, b in [(17, 19), (49, 51), (71, 73), (60, 70)]:
        g.arc(a, b, 7, 2)

    for x in (23, 38, 53, 76, 98):
        g.put(x, 9, 'w')
    g.put(64, 7, 'c')
    g.put(107, 4, 'w')
    g.put(26, 5, 'j')
    g.put(80, 5, 'k')
    g.put(118, 6, 'k')
    for x, y in [(33, 5), (50, 4), (72, 4), (110, 3)]:
        g.put(x, y, 'p')
    g.put(42, 5, 'b')
    g.put(58, 6, 'g')
    g.put(66, 7, 'h')
    g.put(100, 5, 'M')
    g.put(55, 9, 'C')
    # --- 初見殺し ---
    g.poptrap(67, 68, 7)
    g.crumble(114, 116, 7)    # ゴール手前
    g.put(2, 9, '@')
    g.put(119, 9, 'G')
    return g


# ============================================================ ステージ 8
def s8_lava():
    """溶岩の谷。移動床と細かい足場の連続。"""
    g = Grid(126)
    for a, b in [(0, 18), (30, 44), (56, 70), (82, 96), (108, 125)]:
        g.ground(a, b, 10)
    g.hazard(19, 29, 11)
    g.hazard(45, 55, 11)
    g.hazard(71, 81, 11)
    g.hazard(97, 107, 11)
    g.mover(24, 9)
    g.mover(50, 8)
    g.mover(76, 9)
    g.mover(102, 8)
    for a, b, y in [(10, 13, 7), (34, 38, 7), (60, 64, 6), (86, 90, 7), (112, 116, 6)]:
        g.plat(a, b, y)
    for x, y in [(6, 7), (42, 7), (68, 6), (94, 7)]:
        g.block(x, y)
    for x in (16, 92):
        g.bounce(x, 9)

    g.coins(2, 5, 9)
    for a, b, y in [(10, 13, 6), (34, 38, 6), (60, 64, 5), (86, 90, 6), (112, 116, 5)]:
        g.coins(a, b, y)
    for a, b in [(20, 28), (46, 54), (72, 80), (98, 106)]:
        g.arc(a, b, 7, 2)

    for x in (14, 32, 58, 88, 110):
        g.put(x, 9, 'w')
    g.put(40, 9, 'c')
    g.put(66, 9, 'c')
    g.put(36, 6, 'k')
    g.put(114, 5, 'k')
    g.put(62, 5, 'j')
    for x, y in [(26, 5), (52, 4), (78, 5), (104, 4)]:
        g.put(x, y, 'p')
    g.put(12, 6, 'b')
    g.put(38, 6, '*')
    g.put(64, 5, 'g')
    g.put(90, 6, 'h')
    g.put(84, 9, 'd')
    g.put(57, 9, 'C')
    # --- 初見殺し ---
    g.crumble(36, 38, 7)
    g.dropper(62, 4)
    g.poptrap(94, 95, 9)
    g.put(2, 9, '@')
    g.put(122, 9, 'G')
    return g


# ============================================================ ステージ 9
def s9_night():
    """縦移動床とジャンプ台の総合。いちばん難しい。"""
    g = Grid(130)
    g.ground(0, 14, 10)
    g.ground(58, 70, 10)
    g.ground(116, 129, 10)
    for a, b, y in [(19, 22, 8), (27, 30, 6), (35, 38, 5), (44, 47, 7), (52, 55, 8),
                    (75, 78, 8), (83, 86, 6), (91, 94, 5), (99, 102, 7), (107, 112, 8)]:
        g.plat(a, b, y)
    g.mover(24, 7, vertical=True)
    g.mover(41, 6)
    g.mover(80, 7, vertical=True)
    g.mover(96, 6)
    for x in (10, 64, 120):
        g.bounce(x, 9)
    for x, y in [(6, 7), (62, 7), (118, 7)]:
        g.block(x, y)

    g.coins(2, 5, 9)
    for a, b, y in [(19, 22, 7), (27, 30, 5), (35, 38, 4), (44, 47, 6), (52, 55, 7),
                    (75, 78, 7), (83, 86, 5), (91, 94, 4), (99, 102, 6), (107, 112, 7)]:
        g.coins(a, b, y)
    for a, b in [(15, 18), (31, 34), (48, 51), (71, 74), (87, 90), (103, 107)]:
        g.arc(a, b, 6, 2)
    g.coins(122, 127, 9)

    g.put(20, 7, 'w')
    g.put(45, 6, 'w')
    g.put(60, 9, 'j')
    g.put(76, 7, 'c')
    g.put(109, 7, 'c')
    g.put(36, 4, 'k')
    g.put(92, 4, 'k')
    for x, y in [(16, 4), (33, 3), (50, 4), (72, 3), (89, 3), (105, 4)]:
        g.put(x, y, 'p')
    g.put(28, 5, 'f')
    g.put(53, 7, 'b')
    g.put(66, 9, '*')
    g.put(84, 5, 'g')
    g.put(100, 6, 'h')
    g.put(68, 9, 'C')
    # --- 初見殺し ---
    g.crumble(36, 38, 5)      # 手前の 35 は残してある
    g.dropper(46, 3)
    g.poptrap(61, 62, 9)
    g.put(2, 9, '@')
    g.put(126, 9, 'G')
    return g


# ============================================================ ステージ 10
def s10_castle():
    """ボス戦。ボスを倒すまでゴールは開かない。"""
    g = Grid(78)
    for a, b in [(0, 20), (24, 40), (44, 77)]:
        g.ground(a, b, 10)
    for a, b, y in [(8, 11, 7), (16, 19, 6), (28, 32, 6), (50, 54, 7), (66, 70, 6)]:
        g.plat(a, b, y)
    for x, y in [(5, 7), (36, 7), (60, 6)]:
        g.block(x, y)
    g.hazard(41, 43, 11)
    g.bounce(46, 9)
    g.mover(22, 8)

    g.coins(2, 4, 9)
    for a, b, y in [(8, 11, 6), (16, 19, 5), (28, 32, 5), (50, 54, 6), (66, 70, 5)]:
        g.coins(a, b, y)
    for a, b in [(21, 23), (41, 43)]:
        g.arc(a, b, 7, 2)

    g.put(14, 9, 'w')
    g.put(30, 9, 'c')
    g.put(30, 5, 'k')
    g.put(26, 4, 'p')
    g.put(52, 6, 'h')
    g.put(48, 9, 'b')
    g.put(68, 5, 'g')
    g.put(38, 9, 'C')
    g.put(62, 9, 'B')       # ボス
    # --- 初見殺し ---
    g.poptrap(34, 35, 9)
    g.crumble(52, 54, 7)      # ボス戦の足場が崩れる
    g.put(2, 9, '@')
    g.put(74, 9, 'G')
    return g


LEVELS = [
    ('みどりの丘', 'GRASS', s1_grass()),
    ('はなのこみち', 'MEADOW', s2_meadow()),
    ('ひかりのどうくつ', 'CAVE', s3_cave()),
    ('ちかのみずうみ', 'WATER', s4_water()),
    ('そらのかけら', 'SKY', s5_sky()),
    ('こおりのさか', 'SNOW', s6_snow()),
    ('すなのいせき', 'DESERT', s7_desert()),
    ('ようがんの谷', 'LAVA', s8_lava()),
    ('よぞらのとう', 'NIGHT', s9_night()),
    ('おしろの決戦', 'CASTLE', s10_castle()),
]

ok = True
for name, theme, grid in LEVELS:
    ok = check(name, grid) and ok

if not ok:
    raise SystemExit('検証に失敗したので生成を中止')

out = [
    'package com.example.momo',
    '',
    '// このファイルは tools/genlevels.py が生成する。手で編集しないこと。',
    '',
    'enum class Theme { GRASS, MEADOW, CAVE, WATER, SKY, SNOW, DESERT, LAVA, NIGHT, CASTLE }',
    '',
    'class LevelData(val title: String, val theme: Theme, val rows: List<String>)',
    '',
    'val LEVELS: List<LevelData> = listOf(',
]
for name, theme, grid in LEVELS:
    out.append('    LevelData(')
    out.append('        "%s",' % name)
    out.append('        Theme.%s,' % theme)
    out.append('        listOf(')
    for r in grid.rows():
        out.append('            "%s",' % r)
    out.append('        ),')
    out.append('    ),')
out.append(')')
out.append('')

dest = sys.argv[1]
with io.open(dest, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('wrote %s (%d bytes)' % (dest, os.path.getsize(dest)))

# Web 版にも同じステージを渡す。マップの正解を 1 か所に保つため、
# Kotlin と JavaScript の両方をこのスクリプトから生成する。
if len(sys.argv) > 2:
    js = [
        '// このファイルは tools/genlevels.py が生成する。手で編集しないこと。',
        'const LEVELS = [',
    ]
    for name, theme, grid in LEVELS:
        js.append('  {')
        js.append('    title: "%s",' % name)
        js.append('    theme: "%s",' % theme)
        js.append('    rows: [')
        for r in grid.rows():
            js.append('      "%s",' % r)
        js.append('    ],')
        js.append('  },')
    js.append('];')
    js.append('')
    jsdest = sys.argv[2]
    with io.open(jsdest, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js))
    print('wrote %s (%d bytes)' % (jsdest, os.path.getsize(jsdest)))
