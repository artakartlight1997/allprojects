#!/usr/bin/env python3
"""ゆいの ダンスフリーズ の アイコン。おんぷと 「とまれ」の こおり。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (58, 30, 82)
ICE = (138, 232, 255)
SKIN = (246, 205, 168)
HAIR = (90, 68, 54)
DRESS = (255, 184, 74)
GOLD = (255, 210, 74)
PINK = (255, 143, 187)

ic = Icon(BG)

# うしろの ひかり
ic.poly([(96, 0), (150, 192), (42, 192)], (98, 52, 126))

# ゆい（とまって いる ポーズ）
cx = 96
ic.line(cx - 12, 118, cx - 30, 158, 13, SKIN)
ic.line(cx + 12, 118, cx + 30, 158, 13, SKIN)
ic.poly([(cx - 22, 100), (cx + 22, 100), (cx + 36, 132), (cx - 36, 132)], DRESS)
ic.rrect(cx - 21, 70, cx + 21, 106, 10, DRESS)
ic.line(cx - 18, 78, cx - 52, 66, 12, SKIN)
ic.line(cx + 18, 78, cx + 52, 66, 12, SKIN)
ic.circle(cx - 52, 66, 8, (255, 224, 196))
ic.circle(cx + 52, 66, 8, (255, 224, 196))
ic.circle(cx, 48, 22, SKIN)
ic.poly([(cx - 24, 44), (cx + 24, 44), (cx + 22, 26), (cx - 22, 26)], HAIR)
ic.circle(cx, 22, 10, HAIR)
ic.circle(cx - 8, 50, 3.4, (42, 32, 40))
ic.circle(cx + 8, 50, 3.4, (42, 32, 40))

# こおりの きらきら（とまった しるし）
for a in range(6):
    import math
    ang = a * math.pi / 3 + 0.3
    ic.line(cx + math.cos(ang) * 62, 96 + math.sin(ang) * 62,
            cx + math.cos(ang) * 80, 96 + math.sin(ang) * 80, 7, ICE)

# おんぷ（音は とまった しるしに ばつ）
ic.circle(30, 150, 13, GOLD)
ic.rect(40, 108, 46, 152, GOLD)
ic.circle(166, 40, 12, PINK)
ic.rect(174, 4, 180, 44, PINK)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
