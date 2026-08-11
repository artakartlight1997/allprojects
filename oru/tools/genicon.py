#!/usr/bin/env python3
"""アイコン（192x192 の png）を 作る。おる（グレーの ペルシャねこ）。"""

import os
import struct
import zlib

W = 192
BG = (58, 42, 92)
PINK = (171, 171, 184)
PINK_D = (139, 139, 153)
WHITE = (255, 255, 255)
INK = (65, 48, 58)
CHEEK = (255, 154, 184)
GOLD = (255, 216, 77)

px = [[BG for _ in range(W)] for _ in range(W)]


def circle(cx, cy, r, col):
    for y in range(max(0, int(cy - r) - 1), min(W, int(cy + r) + 2)):
        for x in range(max(0, int(cx - r) - 1), min(W, int(cx + r) + 2)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                px[y][x] = col


def rrect(x0, y0, x1, y1, r, col):
    for y in range(max(0, y0), min(W, y1)):
        for x in range(max(0, x0), min(W, x1)):
            dx = max(x0 + r - x, 0, x - (x1 - r))
            dy = max(y0 + r - y, 0, y - (y1 - r))
            if dx * dx + dy * dy <= r * r:
                px[y][x] = col


def star(cx, cy, r, col):
    import math
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        a = math.radians(-90 + i * 36)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    for y in range(max(0, int(cy - r)), min(W, int(cy + r) + 1)):
        xs = []
        n = len(pts)
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(max(0, int(xs[i])), min(W, int(xs[i + 1]) + 1)):
                px[y][x] = col


# そらの グラデーション
for y in range(W):
    k = y / (W - 1)
    px[y] = [(int(58 + 60 * k), int(42 + 30 * k), int(92 + 40 * k))] * W

# チュール
for yy in range(28, 66):
    for xx in range(140, 160):
        px[yy][xx] = (255, 154, 90)
for yy in range(24, 30):
    for xx in range(137, 163):
        px[yy][xx] = (224, 106, 42)
for yy in range(64, 70):
    for xx in range(137, 163):
        px[yy][xx] = (224, 106, 42)
# みみ（とがった ねこみみ）
def tri(pts, col):
    ys = [p[1] for p in pts]
    for y in range(max(0, int(min(ys))), min(W, int(max(ys)) + 1)):
        xs = []
        n = len(pts)
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(max(0, int(xs[i])), min(W, int(xs[i + 1]) + 1)):
                px[y][x] = col
tri([(46, 74), (56, 26), (86, 62)], PINK_D)
tri([(146, 74), (136, 26), (106, 62)], PINK_D)
tri([(56, 70), (62, 40), (80, 62)], CHEEK)
tri([(136, 70), (130, 40), (112, 62)], CHEEK)
# からだ
rrect(40, 58, 152, 168, 46, PINK)
# ほっぺ
circle(56, 118, 13, CHEEK)
circle(136, 118, 13, CHEEK)
# め
circle(74, 100, 19, WHITE)
circle(118, 100, 19, WHITE)
circle(77, 103, 10, INK)
circle(121, 103, 10, INK)
circle(72, 96, 4, WHITE)
circle(116, 96, 4, WHITE)
# はな と くち
tri([(88, 126), (104, 126), (96, 138)], CHEEK)
for x in range(78, 96):
    yy = 146 + int(((x - 88) ** 2) * -0.06)
    for d in range(3):
        px[yy + d][x] = INK
for x in range(96, 114):
    yy = 146 + int(((x - 104) ** 2) * -0.06)
    for d in range(3):
        px[yy + d][x] = INK
# 下半身は 毛が ない（つるん）
for yy in range(150, 176):
    for xx in range(52, 140):
        if (xx - 96) ** 2 / (44 ** 2) + (yy - 152) ** 2 / (26 ** 2) <= 1:
            px[yy][xx] = (230, 198, 198)

raw = b''.join(b'\x00' + bytes(v for p in row for v in p) for row in px)


def chunk(tag, data):
    c = struct.pack('>I', len(data)) + tag + data
    return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)


png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', W, W, 8, 2, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(raw, 9))
       + chunk(b'IEND', b''))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'icon.png')
with open(out, 'wb') as f:
    f.write(png)
print('wrote', out, len(png), 'bytes')
