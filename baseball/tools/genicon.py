#!/usr/bin/env python3
"""あおいの ホームランきょうそう の アイコン。バットと ボール。"""

import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

SKY = (42, 74, 134)
GRASS = (62, 138, 78)
DIRT = (176, 138, 90)
WHITE = (255, 255, 255)
BAT = (192, 138, 74)
RED = (224, 90, 90)
GOLD = (255, 210, 74)

ic = Icon(SKY)
ic.rect(0, 96, 192, 192, GRASS)
ic.ellipse(96, 168, 74, 26, DIRT)

# バット（ななめ）
ic.line(52, 158, 128, 62, 17, BAT)
ic.line(46, 166, 60, 150, 13, (110, 74, 40))

# ボール（バットの さきで あたって いる）
ic.circle(140, 52, 26, WHITE)
for a in (0.6, 3.75):
    for k in range(-16, 17):
        th = a + k * 0.045
        ic.circle(140 + math.cos(th) * 26, 52 + math.sin(th) * 26, 2.6, RED)

# インパクトの きらきら
for i in range(8):
    th = i * math.pi / 4
    ic.line(140 + math.cos(th) * 32, 52 + math.sin(th) * 32,
            140 + math.cos(th) * 46, 52 + math.sin(th) * 46, 6, GOLD)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
