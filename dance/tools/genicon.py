#!/usr/bin/env python3
"""りなの ダンスステージ の アイコン。4つの やじるしパネル。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (58, 42, 92)
PANEL = (42, 30, 68)
PINK = (255, 111, 168)
BLUE = (90, 216, 240)
GREEN = (154, 232, 106)
GOLD = (255, 210, 74)

ic = Icon(BG)

# ステージの ゆか
ic.rrect(10, 108, 182, 182, 16, (74, 56, 112))

# 4つの やじるしパネル（← ↓ ↑ →）
cols = [PINK, BLUE, GREEN, GOLD]
turns = [2, 1, 3, 0]
for i in range(4):
    x0 = 14 + i * 42
    ic.rrect(x0, 112, x0 + 38, 150, 8, PANEL)
    ic.arrow(x0 + 19, 131, 14, cols[i], turns[i])

# 上で おどる 子（あたま・からだ・うで）
ic.circle(96, 46, 24, (246, 205, 168))
ic.poly([(72, 40), (120, 40), (118, 20), (74, 20)], (74, 58, 68))
ic.circle(74, 44, 10, (74, 58, 68))
ic.circle(118, 44, 10, (74, 58, 68))
ic.circle(88, 48, 4, (42, 32, 40))
ic.circle(104, 48, 4, (42, 32, 40))
ic.rrect(80, 68, 112, 100, 10, PINK)
ic.line(80, 74, 52, 52, 11, (246, 205, 168))
ic.line(112, 74, 140, 52, 11, (246, 205, 168))

# きらきら
ic.star(30, 34, 11, GOLD)
ic.star(164, 30, 9, BLUE)
ic.star(160, 86, 7, PINK)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
