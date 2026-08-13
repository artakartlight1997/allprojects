#!/usr/bin/env python3
"""エイトくんの ぼうけん島 の アイコン。ぼうしの 男の子と フルーツ。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

SKY = (90, 200, 240)
SAND = (216, 176, 112)
GRASS = (62, 168, 94)
SKIN = (246, 205, 168)
SHIRT = (62, 192, 138)
CAP = (232, 80, 106)
PANT = (58, 74, 106)
RED = (255, 90, 90)
GOLD = (255, 210, 74)

ic = Icon(SKY)
ic.rect(0, 148, 192, 192, SAND)
ic.rect(0, 142, 192, 152, GRASS)

# やしの木
ic.rect(150, 60, 160, 148, (140, 96, 58))
for dx, dy in ((-1, -1), (1, -1), (-1, 0), (1, 0)):
    ic.ellipse(155 + dx * 26, 58 + dy * 12, 28, 12, GRASS)

# エイトくん
cx = 74
ic.line(cx - 10, 108, cx - 16, 146, 14, PANT)
ic.line(cx + 10, 108, cx + 18, 146, 14, PANT)
ic.rrect(cx - 22, 68, cx + 22, 114, 11, SHIRT)
ic.line(cx - 20, 78, cx - 44, 96, 12, SKIN)
ic.line(cx + 20, 78, cx + 44, 62, 12, SKIN)
ic.circle(cx, 46, 21, SKIN)
# キャップ
ic.poly([(cx - 23, 44), (cx + 23, 44), (cx + 20, 26), (cx - 20, 26)], CAP)
ic.rect(cx, 40, cx + 34, 47, CAP)
ic.circle(cx + 8, 50, 4, (42, 32, 40))

# フルーツ
ic.circle(40, 60, 20, RED)
ic.circle(33, 53, 7, (255, 255, 255))
ic.line(40, 40, 48, 26, 6, GRASS)

# きらきら
ic.star(120, 26, 10, GOLD)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
