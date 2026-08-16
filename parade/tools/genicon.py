#!/usr/bin/env python3
"""ゆいの なかまパレード の アイコン。ピンクの ゲートと、ならんだ なかま。

★ iconlib の rect は (x0, y0, x1, y1) の **かど どうし**。はば・たかさ ではない。
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', '..', 'momo-adventure', 'tools'))
from iconlib import Icon  # noqa: E402

SKY = (191, 233, 255)
GRASS = (168, 230, 161)
ROAD = (255, 242, 216)
GATE = (255, 143, 187)
GATE2 = (255, 194, 218)
POST = (255, 246, 232)
WHITE = (255, 255, 255)
EYE = (58, 46, 66)
CHEEK = (255, 160, 185)
HAIR = (107, 74, 56)
SKIN = (246, 205, 168)
DRESS = (255, 143, 187)
RIBBON = (255, 95, 158)

PAL = [(255, 179, 199), (255, 217, 160), (184, 228, 255), (217, 194, 255), (168, 236, 200)]
PAL_D = [(232, 138, 166), (232, 184, 120), (143, 196, 232), (180, 155, 232), (127, 204, 166)]

ic = Icon(SKY)

# 地めん と 道（おく行き）
ic.rect(0, 96, 192, 192, GRASS)
ic.poly([(60, 96), (132, 96), (178, 192), (14, 192)], ROAD)

# ゲート（おくに 2つ）
for x0, x1 in ((60, 94), (98, 132)):
    ic.rect(x0, 60, x1, 74, GATE)
    ic.rect(x0, 74, x1, 80, GATE2)
    ic.rect(x0, 60, x0 + 5, 96, POST)
    ic.rect(x1 - 5, 60, x1, 96, POST)
# 「＋」と「×」の しるし
ic.rect(71, 64, 84, 69, WHITE)
ic.rect(75, 60, 80, 73, WHITE)
for i in range(12):
    ic.rect(105 + i, 61 + i, 109 + i, 64 + i, WHITE)
    ic.rect(116 - i, 61 + i, 120 - i, 64 + i, WHITE)


def friend(cx, cy, r, i):
    col = PAL[i % len(PAL)]
    dark = PAL_D[i % len(PAL_D)]
    ic.circle(cx - int(r * 0.4), cy + int(r * 0.9), max(2, int(r * 0.24)), dark)
    ic.circle(cx + int(r * 0.4), cy + int(r * 0.9), max(2, int(r * 0.24)), dark)
    ic.circle(cx - int(r * 0.62), cy - int(r * 0.66), max(2, int(r * 0.36)), col)
    ic.circle(cx + int(r * 0.62), cy - int(r * 0.66), max(2, int(r * 0.36)), col)
    ic.circle(cx, cy, r, col)
    ic.circle(cx, cy + int(r * 0.24), int(r * 0.52), WHITE)
    ic.circle(cx - int(r * 0.32), cy - int(r * 0.12), max(2, int(r * 0.14)), EYE)
    ic.circle(cx + int(r * 0.32), cy - int(r * 0.12), max(2, int(r * 0.14)), EYE)
    if r > 9:
        ic.circle(cx - int(r * 0.58), cy + int(r * 0.16), int(r * 0.16), CHEEK)
        ic.circle(cx + int(r * 0.58), cy + int(r * 0.16), int(r * 0.16), CHEEK)


# おくの なかま（小さい）→ 手まえ（大きい）
for i, (cx, cy, r) in enumerate(((78, 100, 7), (114, 100, 7), (96, 105, 8),
                                 (68, 113, 10), (124, 113, 10), (96, 118, 11))):
    friend(cx, cy, r, i)
friend(42, 148, 16, 1)
friend(152, 148, 16, 3)

# ゆい（まん中 手まえ）
cx, cy = 97, 145
ic.ellipse(cx, 178, 22, 6, (150, 200, 150))
ic.poly([(cx - 12, cy + 6), (cx + 12, cy + 6), (cx + 24, cy + 32), (cx - 24, cy + 32)], DRESS)
ic.rect(cx - 24, cy + 27, cx + 24, cy + 32, WHITE)
ic.line(cx - 13, cy + 12, cx - 27, cy + 26, 6, SKIN)
ic.line(cx + 13, cy + 12, cx + 27, cy + 26, 6, SKIN)
# かみ（うしろ）
ic.circle(cx, cy - 8, 23, HAIR)
ic.rect(cx - 23, cy - 8, cx - 15, cy + 12, HAIR)
ic.rect(cx + 15, cy - 8, cx + 23, cy + 12, HAIR)
# かお
ic.circle(cx, cy - 2, 18, SKIN)
# まえがみ
ic.rect(cx - 19, cy - 20, cx + 19, cy - 11, HAIR)
# リボン
ic.circle(cx - 21, cy - 18, 6, RIBBON)
ic.circle(cx - 29, cy - 16, 6, RIBBON)
ic.circle(cx - 25, cy - 17, 3, (255, 210, 74))
# かお の パーツ
ic.circle(cx - 7, cy - 1, 3, EYE)
ic.circle(cx + 7, cy - 1, 3, EYE)
ic.circle(cx - 13, cy + 4, 4, CHEEK)
ic.circle(cx + 13, cy + 4, 4, CHEEK)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
print(ic.save(os.path.normpath(out)))
