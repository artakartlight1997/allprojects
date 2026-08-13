#!/usr/bin/env python3
"""エイトくんの そうこばん の アイコン。にもつと ○（ゴール）。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (58, 46, 88)
FLOOR_A = (62, 53, 96)
FLOOR_B = (69, 59, 105)
WALL = (106, 90, 146)
BOX = (200, 144, 80)
BOX_D = (122, 82, 48)
BOX_HI = (240, 184, 96)
GOLD = (255, 210, 74)
SKIN = (246, 205, 168)
SHIRT = (62, 192, 138)
CAP = (232, 80, 106)
PANT = (58, 74, 106)

ic = Icon(BG)

# ゆかの ます目
T = 48
for gy in range(4):
    for gx in range(4):
        col = FLOOR_A if (gx + gy) % 2 else FLOOR_B
        ic.rect(gx * T, gy * T, gx * T + T, gy * T + T, col)

# かべ（上の れつ）
for gx in range(4):
    ic.rrect(gx * T + 2, 2, gx * T + T - 2, T - 2, 7, WALL)

# ○（ゴール）
for cx, cy in ((T // 2 + T * 2, T // 2 + T * 1), (T // 2 + T * 3, T // 2 + T * 3)):
    ic.circle(cx, cy, 13, GOLD)
    ic.circle(cx, cy, 8, FLOOR_A)

# にもつ
bx, by = T * 2, T * 2
ic.rrect(bx + 4, by + 5, bx + T - 4, by + T - 3, 7, BOX_D)
ic.rrect(bx + 4, by + 3, bx + T - 4, by + T - 5, 7, BOX)
ic.rect(bx + 4, by + 3, bx + T - 4, by + 14, BOX_HI)
ic.line(bx + T // 2, by + 4, bx + T // 2, by + T - 6, 5, BOX_D)
ic.line(bx + 5, by + T // 2 - 1, bx + T - 5, by + T // 2 - 1, 5, BOX_D)

# エイトくん（にもつの 左）
cx = 42
ic.line(cx - 7, 138, cx - 9, 168, 10, PANT)
ic.line(cx + 7, 138, cx + 9, 168, 10, PANT)
ic.rrect(cx - 16, 108, cx + 16, 142, 9, SHIRT)
ic.line(cx + 14, 116, cx + 34, 122, 9, SKIN)
ic.circle(cx, 94, 16, SKIN)
ic.poly([(cx - 17, 92), (cx + 17, 92), (cx + 15, 78), (cx - 15, 78)], CAP)
ic.rect(cx, 88, cx + 26, 94, CAP)
ic.circle(cx + 6, 97, 3, (42, 32, 40))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
