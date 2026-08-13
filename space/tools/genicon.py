#!/usr/bin/env python3
"""エイトくんの うちゅう要塞 の アイコン。じぶんの 船と オプションと たま。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (10, 16, 48)
DEEP = (30, 26, 94)
HULL = (232, 236, 244)
GLASS = (74, 160, 224)
FLAME = (255, 154, 58)
GOLD = (255, 210, 74)
OPT = (200, 168, 240)
FOE = (122, 232, 200)

ic = Icon(BG)
ic.poly([(0, 0), (192, 0), (192, 90), (0, 130)], DEEP)

# ほし
for i, (x, y, r) in enumerate([(24, 24, 3), (60, 12, 2), (150, 30, 3), (176, 70, 2),
                               (36, 96, 2), (120, 150, 3), (168, 166, 2), (88, 40, 2)]):
    ic.circle(x, y, r, (255, 255, 255))

# じぶんの 船
ic.poly([(150, 96), (60, 66), (40, 84), (40, 108), (60, 126)], HULL)
ic.poly([(112, 96), (78, 80), (78, 112)], GLASS)
ic.circle(104, 96, 7, GOLD)
ic.poly([(40, 88), (12, 82), (12, 110), (40, 104)], FLAME)

# たま
ic.rrect(154, 92, 182, 100, 4, (223, 246, 255))

# オプション（うしろに ついてくる まる）
ic.circle(30, 132, 9, OPT)
ic.circle(30, 132, 4, (255, 255, 255))
ic.circle(14, 154, 8, OPT)

# てき
ic.circle(160, 148, 15, FOE)
ic.circle(152, 148, 7, (30, 90, 86))

# カプセル P
ic.rrect(96, 148, 130, 172, 9, GOLD)
ic.rect(104, 152, 110, 168, (58, 42, 16))
ic.rect(104, 152, 122, 158, (58, 42, 16))
ic.rect(104, 160, 122, 166, (58, 42, 16))
ic.rect(116, 152, 122, 166, (58, 42, 16))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
