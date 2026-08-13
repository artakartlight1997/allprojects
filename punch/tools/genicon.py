#!/usr/bin/env python3
"""エイトくんの チャンピオンロード の アイコン。青い グローブと チャンピオンベルト。"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

BG = (46, 32, 80)
RING = (90, 74, 134)
ROPE_A = (255, 111, 168)
ROPE_B = (248, 244, 255)
GLOVE = (58, 122, 216)
GLOVE_D = (36, 84, 160)
RED = (224, 48, 58)
GOLD = (255, 210, 74)
DARK = (26, 20, 46)

ic = Icon(BG)

# リングの ゆか
ic.poly([(28, 118), (164, 118), (192, 192), (0, 192)], RING)

# おくの ロープ
ic.rect(16, 84, 176, 90, ROPE_A)
ic.rect(16, 100, 176, 106, ROPE_B)

# 赤い グローブ（あいて・おく）
ic.circle(138, 92, 26, RED)
ic.circle(130, 84, 9, (255, 255, 255))
ic.rrect(126, 114, 150, 126, 5, (248, 240, 224))

# 青い グローブ（エイトくん・手まえ）
ic.circle(66, 116, 40, GLOVE)
ic.circle(52, 102, 14, (255, 255, 255))
ic.rrect(44, 150, 90, 170, 8, GLOVE_D)

# チャンピオンベルト
ic.rect(0, 24, 192, 46, DARK)
ic.rect(0, 30, 192, 40, (120, 96, 60))
ic.circle(96, 35, 20, GOLD)
ic.star(96, 35, 11, (255, 244, 200))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
