#!/usr/bin/env python3
"""Levels.kt を生成し、到達可能性を簡易検証する。

物理定数（Game.kt と一致させること）:
  GRAVITY = 44, JUMP_V = 17.5, MOVE_SPEED = 7.5
  ジャンプ到達高 = 17.5^2/(2*44) = 3.48 タイル
  滞空時間      = 2*17.5/44     = 0.795 s
  水平到達距離  = 0.795*7.5     = 5.96 タイル
安全マージンを見て「登れる高さ差 <= 3」「越えられる隙間 <= 4」を上限とする。
"""

H = 12
SOLID = set('#=?x')

# 開始地点から敵までの最低距離。敵は毎秒 2.3 タイル歩くので、これだけ
# 空けておけば復活直後の無敵時間（Game.kt の SPAWN_GRACE）が切れる前に
# ぶつかることはない。
START_CLEARANCE = 10

class Grid:
    def __init__(self, w):
        self.w = w
        self.g = [['.'] * w for _ in range(H)]

    def ground(self, x0, x1, top):
        for x in range(x0, x1 + 1):
            for y in range(top, H):
                self.g[y][x] = '#'

    def plat(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            self.g[y][x] = '='

    def block(self, x, y):
        self.g[y][x] = '?'

    def spike(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            self.g[y][x] = 's'

    def coins(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            if self.g[y][x] == '.':
                self.g[y][x] = 'o'

    def put(self, x, y, ch):
        self.g[y][x] = ch

    def rows(self):
        return [''.join(r) for r in self.g]


def check(name, grid):
    errs = []
    rows = grid.rows()
    if len(set(len(r) for r in rows)) != 1:
        errs.append('行の長さが不揃い')
    flat = ''.join(rows)
    if flat.count('@') != 1:
        errs.append('プレイヤー開始地点が %d 個' % flat.count('@'))
    if flat.count('G') != 1:
        errs.append('ゴールが %d 個' % flat.count('G'))
    # 地上敵・ゴール・開始地点の足元が固いか
    for y in range(H):
        for x in range(grid.w):
            c = grid.g[y][x]
            if c in 'wk@G':
                below = grid.g[y + 1][x] if y + 1 < H else '.'
                if below not in SOLID:
                    errs.append('%s (%d,%d) の足元が空中' % (c, x, y))

    # 開始地点のまわりに敵がいないか。敵は歩き出すので、近すぎると
    # プレイヤーが操作を始める前にぶつかって即死する。
    start = [(x, y) for y in range(H) for x in range(grid.w) if grid.g[y][x] == '@']
    if start:
        sx, sy = start[0]
        for y in range(H):
            for x in range(grid.w):
                if grid.g[y][x] in 'wkp' and abs(x - sx) < START_CLEARANCE:
                    errs.append('敵 %s (%d,%d) が開始地点 x=%d に近すぎる（%d タイル）'
                                % (grid.g[y][x], x, y, sx, abs(x - sx)))
    # 固いタイルの「上面」を列ごとに集めて到達可能性をざっくり検査
    surf = {}
    for x in range(grid.w):
        for y in range(H):
            if grid.g[y][x] in SOLID and (y == 0 or grid.g[y - 1][x] not in SOLID):
                surf.setdefault(x, []).append(y)
    cols = sorted(surf.keys())
    # 連続する足場列の間隔と高低差
    prev = None
    for x in cols:
        if prev is not None:
            gap = x - prev - 1
            if gap > 4:
                errs.append('x=%d と x=%d の間に %d タイルの隙間（跳べない）' % (prev, x, gap))
            elif gap > 0:
                rise = min(surf[x]) - min(surf[prev])
                if rise < -3:
                    errs.append('x=%d -> x=%d で %d タイルの登り（届かない）' % (prev, x, -rise))
        prev = x
    print('[%s] 幅=%d 敵=%d コイン=%d %s' % (
        name, grid.w,
        flat.count('w') + flat.count('k') + flat.count('p'),
        flat.count('o'),
        'OK' if not errs else 'NG'))
    for e in errs:
        print('    ! ' + e)
    return not errs


# ---------------------------------------------------------------- ステージ1
def level1():
    g = Grid(100)
    g.ground(0, 26, 10)
    g.ground(30, 53, 10)
    g.ground(57, 70, 10)
    g.ground(74, 99, 10)

    g.plat(12, 15, 7)
    g.plat(20, 22, 6)
    g.plat(36, 39, 7)
    g.plat(44, 46, 6)
    g.plat(62, 65, 7)
    g.plat(80, 83, 7)
    g.plat(88, 90, 6)

    g.block(8, 7); g.block(9, 7)
    g.block(33, 7)
    g.block(60, 7)
    g.block(86, 7)

    g.coins(4, 7, 9)
    g.coins(12, 15, 6)
    g.coins(20, 22, 5)
    g.coins(27, 29, 8)
    g.coins(36, 39, 6)
    g.coins(44, 46, 5)
    g.coins(54, 56, 8)
    g.coins(62, 65, 6)
    g.coins(71, 73, 8)
    g.coins(80, 83, 6)
    g.coins(88, 90, 5)

    for x in (18, 40, 66, 78, 92):
        g.put(x, 9, 'w')
    g.put(49, 5, 'p')
    g.put(68, 4, 'p')
    g.put(45, 4, 'h')

    g.put(2, 9, '@')
    g.put(96, 9, 'G')
    return g


# ---------------------------------------------------------------- ステージ2
def level2():
    g = Grid(110)
    g.ground(0, 18, 10)
    g.ground(22, 38, 10)
    g.ground(29, 38, 8)      # 高台
    g.ground(42, 58, 10)
    g.ground(62, 80, 10)
    g.ground(70, 80, 8)      # 高台
    g.ground(84, 109, 10)

    g.plat(8, 11, 7)
    g.plat(50, 53, 7)
    g.plat(64, 67, 7)
    g.plat(94, 97, 7)
    g.plat(100, 103, 6)

    g.block(14, 7); g.block(15, 7)
    g.block(25, 7)
    g.block(56, 6)
    g.block(88, 7)

    g.spike(46, 48, 9)
    g.spike(90, 91, 9)

    g.coins(8, 11, 6)
    g.coins(19, 21, 8)
    g.coins(29, 33, 7)
    g.coins(39, 41, 8)
    g.coins(50, 53, 6)
    g.coins(59, 61, 8)
    g.coins(64, 67, 6)
    g.coins(74, 79, 7)
    g.coins(81, 83, 8)
    g.coins(94, 97, 6)
    g.coins(100, 103, 5)

    for x in (13, 26, 55, 86):
        g.put(x, 9, 'w')
    g.put(33, 7, 'w')
    g.put(76, 7, 'w')
    g.put(52, 6, 'k')
    g.put(72, 7, 'k')
    g.put(44, 5, 'p')
    g.put(60, 4, 'p')
    g.put(31, 6, '*')
    g.put(96, 5, 'h')

    g.put(2, 9, '@')
    g.put(106, 9, 'G')
    return g


# ---------------------------------------------------------------- ステージ3
def level3():
    g = Grid(120)
    g.ground(0, 10, 10)
    g.ground(108, 119, 10)

    chain = [(14, 17, 9), (21, 24, 8), (28, 31, 7), (35, 38, 7), (42, 45, 8),
             (49, 53, 9), (57, 60, 7), (64, 67, 6), (71, 74, 7), (78, 82, 8),
             (86, 89, 7), (93, 96, 6), (100, 104, 7)]
    for x0, x1, y in chain:
        g.plat(x0, x1, y)

    g.block(6, 7)
    g.block(54, 6)

    g.coins(3, 6, 9)
    for x0, x1, y in chain:
        g.coins(x0, x1, y - 1)
    g.coins(18, 20, 7)
    g.coins(32, 34, 5)
    g.coins(46, 48, 6)
    g.coins(61, 63, 5)
    g.coins(75, 77, 5)
    g.coins(90, 92, 5)
    g.coins(110, 113, 9)

    g.put(15, 8, 'w')
    g.put(29, 6, 'w')
    g.put(58, 6, 'w')
    g.put(79, 7, 'w')
    g.put(101, 6, 'w')
    g.put(36, 6, 'k')
    g.put(72, 6, 'k')
    g.put(19, 5, 'p')
    g.put(47, 4, 'p')
    g.put(84, 4, 'p')
    g.put(98, 3, 'p')
    g.put(65, 5, '*')
    g.put(87, 6, 'h')

    g.put(2, 9, '@')
    g.put(115, 9, 'G')
    return g


LEVELS = [
    ('みどりの丘', 'GRASS', level1()),
    ('ひかりのどうくつ', 'CAVE', level2()),
    ('そらのかけら', 'SKY', level3()),
]

ok = True
for name, theme, g in LEVELS:
    ok = check(name, g) and ok

if not ok:
    raise SystemExit('検証に失敗したので生成を中止')

out = []
out.append('package com.example.momo')
out.append('')
out.append('// このファイルは tools/genlevels.py が生成する。手で編集しないこと。')
out.append('')
out.append('enum class Theme { GRASS, CAVE, SKY }')
out.append('')
out.append('class LevelData(val title: String, val theme: Theme, val rows: List<String>)')
out.append('')
out.append('val LEVELS: List<LevelData> = listOf(')
for name, theme, g in LEVELS:
    out.append('    LevelData(')
    out.append('        "%s",' % name)
    out.append('        Theme.%s,' % theme)
    out.append('        listOf(')
    for r in g.rows():
        out.append('            "%s",' % r)
    out.append('        ),')
    out.append('    ),')
out.append(')')
out.append('')

import io, os, sys
dest = sys.argv[1]
with io.open(dest, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('wrote', dest, os.path.getsize(dest), 'bytes')
