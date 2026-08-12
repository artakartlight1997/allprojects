#!/usr/bin/env python3
"""まさきの PKサッカー の アイコン。ゴールと ボールと キーパー。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

GRASS = (58, 130, 72)
GRASS_D = (46, 110, 62)
WHITE = (255, 255, 255)
INK = (42, 42, 50)
ORANGE = (255, 138, 58)
SKIN = (246, 205, 168)
GOLD = (255, 210, 74)

ic = Icon(GRASS)
for i in range(0, 192, 32):
    ic.rect(0, i, 192, i + 16, GRASS_D)

# ゴール（ポストと ネット）
ic.rect(20, 34, 172, 40, WHITE)
ic.rect(20, 34, 26, 118, WHITE)
ic.rect(166, 34, 172, 118, WHITE)
for x in range(30, 168, 14):
    ic.rect(x, 40, x + 2, 116, (210, 230, 214))
for y in range(46, 116, 14):
    ic.rect(26, y, 166, y + 2, (210, 230, 214))

# キーパー（とんで いる）
ic.line(70, 74, 44, 58, 13, SKIN)
ic.line(118, 74, 146, 60, 13, SKIN)
ic.rrect(78, 66, 114, 108, 10, ORANGE)
ic.line(84, 106, 66, 128, 13, SKIN)
ic.line(106, 106, 126, 128, 13, SKIN)
ic.circle(96, 54, 17, SKIN)
ic.poly([(80, 50), (112, 50), (110, 36), (82, 36)], (58, 46, 38))
ic.circle(44, 58, 9, GOLD)
ic.circle(146, 60, 9, GOLD)

# ボール
ic.circle(150, 150, 26, WHITE)
ic.circle(150, 150, 8, INK)
import math
for i in range(5):
    a = i * 2 * math.pi / 5 + 0.5
    ic.circle(150 + math.cos(a) * 15, 150 + math.sin(a) * 15, 6, INK)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
