#!/usr/bin/env python3
"""エイトくんの どうくつ探検 の アイコン。どうくつを とぶ ふねと クリスタル。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (26, 16, 48)
ROCK = (74, 58, 98)
EDGE = (138, 106, 207)
SHIP = (232, 236, 244)
GLASS = (74, 160, 224)
SKIN = (246, 205, 168)
CAP = (232, 80, 106)
FLAME = (255, 154, 58)
FLAME2 = (255, 210, 74)
CRY = (138, 224, 240)

ic = Icon(BG)

# 天じょうの いわ
ic.poly([(0, 0), (192, 0), (192, 44), (150, 58), (108, 40), (62, 62), (0, 46)], ROCK)
# ゆかの いわ
ic.poly([(0, 192), (192, 192), (192, 132), (146, 146), (96, 124), (44, 150), (0, 130)], ROCK)
# へりの ひかり
for pts in (((0, 46), (62, 62), (108, 40), (150, 58), (192, 44)),
            ((0, 130), (44, 150), (96, 124), (146, 146), (192, 132))):
    for i in range(len(pts) - 1):
        ic.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 5, EDGE)

# ふんしゃの ほのお
ic.poly([(86, 118), (96, 154), (106, 118)], FLAME)
ic.poly([(90, 116), (96, 138), (102, 116)], FLAME2)

# ふね
ic.poly([(96, 56), (124, 116), (110, 122), (82, 122), (68, 116)], SHIP)
ic.circle(96, 84, 17, GLASS)
ic.circle(96, 86, 11, SKIN)
ic.poly([(84, 82), (108, 82), (105, 72), (87, 72)], CAP)
ic.circle(92, 88, 3, (42, 32, 40))
ic.circle(100, 88, 3, (42, 32, 40))
ic.line(80, 116, 68, 132, 5, (138, 148, 172))
ic.line(112, 116, 124, 132, 5, (138, 148, 172))

# クリスタル
for cx, cy in ((36, 92), (158, 100)):
    ic.poly([(cx, cy - 18), (cx + 12, cy), (cx, cy + 18), (cx - 12, cy)], CRY)
    ic.poly([(cx, cy - 18), (cx + 12, cy), (cx, cy)], (220, 250, 255))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
