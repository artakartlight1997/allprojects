#!/usr/bin/env python3
"""あおいの まねっこダンス の アイコン。せんせいと あおいが 同じ ポーズ。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (46, 36, 80)
FLOOR = (106, 74, 134)
SKIN = (246, 205, 168)
HAIR = (74, 58, 68)
PINK = (255, 143, 187)
BLUE = (138, 216, 240)
GOLD = (255, 210, 74)

ic = Icon(BG)
ic.rect(0, 132, 192, 192, FLOOR)


def kid(cx, col, hair):
    # あし
    ic.line(cx - 8, 116, cx - 16, 152, 11, SKIN)
    ic.line(cx + 8, 116, cx + 16, 152, 11, SKIN)
    # スカート と からだ
    ic.poly([(cx - 20, 104), (cx + 20, 104), (cx + 30, 132), (cx - 30, 132)], col)
    ic.rrect(cx - 19, 74, cx + 19, 110, 9, col)
    # うで（バンザイ）
    ic.line(cx - 17, 82, cx - 42, 50, 11, SKIN)
    ic.line(cx + 17, 82, cx + 42, 50, 11, SKIN)
    # あたま
    ic.circle(cx, 52, 22, SKIN)
    ic.poly([(cx - 24, 48), (cx + 24, 48), (cx + 22, 30), (cx - 22, 30)], hair)
    ic.circle(cx - 22, 50, 9, hair)
    ic.circle(cx + 22, 50, 9, hair)
    ic.circle(cx - 8, 54, 3.6, (42, 32, 40))
    ic.circle(cx + 8, 54, 3.6, (42, 32, 40))


kid(52, PINK, HAIR)
kid(140, BLUE, (106, 74, 58))

# まねっこの しるし（=）
ic.rrect(90, 84, 102, 90, 3, GOLD)
ic.rrect(90, 96, 102, 102, 3, GOLD)

# おんぷ みたいな きらきら
ic.star(24, 26, 10, GOLD)
ic.star(168, 24, 8, BLUE)
ic.star(170, 116, 7, PINK)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
