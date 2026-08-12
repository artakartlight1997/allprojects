#!/usr/bin/env python3
"""りなの テニス の アイコン。ラケットと ボール。"""

import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (30, 74, 110)
COURT = (74, 154, 200)
LINE = (255, 255, 255)
BALL = (232, 244, 74)
GRIP = (255, 143, 187)
FRAME = (255, 224, 102)

ic = Icon(BG)

# コート
ic.rrect(22, 30, 170, 162, 8, COURT)
ic.rect(22, 30, 170, 34, LINE)
ic.rect(22, 158, 170, 162, LINE)
ic.rect(22, 30, 26, 162, LINE)
ic.rect(166, 30, 170, 162, LINE)
ic.rect(22, 94, 170, 98, (235, 245, 250))

# ラケット（ななめ）
cx, cy = 74, 108
for r in range(30, 37):
    for a in range(0, 360, 2):
        th = math.radians(a)
        ic.circle(cx + math.cos(th) * r * 0.78, cy + math.sin(th) * r, 2.6, FRAME)
ic.line(cx + 16, cy + 26, cx + 40, cy + 62, 9, GRIP)
# ガット
for i in range(-3, 4):
    ic.line(cx + i * 8, cy - 26, cx + i * 8, cy + 26, 1.6, (240, 250, 255))
    ic.line(cx - 22, cy + i * 8, cx + 22, cy + i * 8, 1.6, (240, 250, 255))

# ボール
ic.circle(140, 62, 22, BALL)
for a in (0.7, 3.85):
    for k in range(-14, 15):
        th = a + k * 0.05
        ic.circle(140 + math.cos(th) * 22, 62 + math.sin(th) * 22, 2.4, (250, 255, 255))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
