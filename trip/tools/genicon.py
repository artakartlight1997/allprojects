#!/usr/bin/env python3
"""りなの せかい旅行 の アイコン。雲の 上を とぶ 飛行機と りな。

★ iconlib の rect は (x0, y0, x1, y1) の かど どうし。はば・たかさ ではない。
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

SKY = (110, 198, 245)
SKY2 = (191, 233, 255)
CLOUD = (255, 255, 255)
BODY = (246, 248, 252)
LINE = (255, 143, 187)
WING = (216, 222, 234)
TAIL = (255, 143, 187)
GLASS = (90, 180, 232)
SKIN = (246, 205, 168)
HAIR = (107, 74, 56)
EYE = (46, 36, 56)
CHEEK = (255, 150, 180)
SUN = (255, 242, 180)

ic = Icon(SKY)
# 空の グラデーション（ざっくり 3だん）
ic.rect(0, 70, 192, 132, (150, 214, 250))
ic.rect(0, 132, 192, 192, SKY2)
# おひさま
ic.circle(158, 36, 20, SUN)
# したの 雲
for cx, cy, r in ((30, 168, 26), (66, 176, 22), (140, 172, 24), (176, 180, 20)):
    ic.circle(cx, cy, r, CLOUD)
ic.rect(0, 174, 192, 192, CLOUD)
# うしろの 雲
ic.circle(40, 60, 15, (255, 255, 255))
ic.circle(56, 64, 11, (255, 255, 255))

# ひこうき雲
ic.rect(6, 100, 52, 110, (255, 255, 255))

# しっぽ
ic.poly([(58, 104), (48, 62), (68, 62), (80, 104)], TAIL)
# うしろの はね
ic.poly([(62, 106), (40, 126), (72, 122)], (232, 112, 158))
# どうたい
ic.rrect(56, 88, 158, 122, 17, BODY)
ic.poly([(150, 88), (182, 105), (150, 122)], BODY)
# ピンクの ライン
ic.rect(58, 106, 156, 112, LINE)
# まえの はね
ic.poly([(108, 116), (86, 152), (120, 148), (134, 118)], WING)
# エンジン
ic.rrect(96, 126, 128, 142, 7, (154, 166, 188))
# まど（りな）
ic.circle(136, 104, 15, GLASS)
ic.circle(136, 106, 11, SKIN)
ic.circle(136, 99, 12, HAIR)
ic.rect(124, 92, 148, 100, HAIR)
ic.circle(132, 106, 2, EYE)
ic.circle(140, 106, 2, EYE)
ic.circle(129, 110, 3, CHEEK)
ic.circle(143, 110, 3, CHEEK)
# ほかの まど
for i in range(4):
    ic.circle(112 - i * 15, 102, 4, (154, 200, 232))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
