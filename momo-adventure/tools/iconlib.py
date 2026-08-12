#!/usr/bin/env python3
"""アイコン（192x192 の png）を 作る ための 小さな どうぐ。

画像ファイルを 1まいも つかわない ほうしんなので、アイコンだけは
png が いる（PWA の きまり）。それも コードで 描いて 書き出す。
Pillow などの ライブラリは 入れずに、zlib だけで png を 組み立てる。

つかいかた:
    from iconlib import Icon
    ic = Icon((58, 42, 92))
    ic.circle(96, 96, 60, (255, 143, 187))
    ic.save('../site/icon.png')
"""

import math
import struct
import zlib

W = 192


class Icon(object):
    def __init__(self, bg, size=W):
        self.w = size
        self.px = [[bg for _ in range(size)] for _ in range(size)]

    # --- かたち -------------------------------------------------------------
    def put(self, x, y, col):
        if 0 <= x < self.w and 0 <= y < self.w:
            self.px[y][x] = col

    def circle(self, cx, cy, r, col):
        for y in range(max(0, int(cy - r) - 1), min(self.w, int(cy + r) + 2)):
            for x in range(max(0, int(cx - r) - 1), min(self.w, int(cx + r) + 2)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    self.px[y][x] = col

    def ellipse(self, cx, cy, rx, ry, col):
        for y in range(max(0, int(cy - ry) - 1), min(self.w, int(cy + ry) + 2)):
            for x in range(max(0, int(cx - rx) - 1), min(self.w, int(cx + rx) + 2)):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.px[y][x] = col

    def rect(self, x0, y0, x1, y1, col):
        for y in range(max(0, int(y0)), min(self.w, int(y1))):
            for x in range(max(0, int(x0)), min(self.w, int(x1))):
                self.px[y][x] = col

    def rrect(self, x0, y0, x1, y1, r, col):
        for y in range(max(0, int(y0)), min(self.w, int(y1))):
            for x in range(max(0, int(x0)), min(self.w, int(x1))):
                dx = max(x0 + r - x, 0, x - (x1 - r))
                dy = max(y0 + r - y, 0, y - (y1 - r))
                if dx * dx + dy * dy <= r * r:
                    self.px[y][x] = col

    def line(self, x0, y0, x1, y1, wd, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n
            self.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, wd / 2, col)

    def poly(self, pts, col):
        ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(self.w, int(max(ys)) + 1)):
            xs = []
            for i in range(len(pts)):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % len(pts)]
                if (y0 <= y < y1) or (y1 <= y < y0):
                    xs.append(x0 + (x1 - x0) * (y - y0) / (y1 - y0))
            xs.sort()
            for k in range(0, len(xs) - 1, 2):
                for x in range(max(0, int(xs[k])), min(self.w, int(xs[k + 1]) + 1)):
                    self.px[y][x] = col

    def star(self, cx, cy, r, col, rot=-math.pi / 2, n=5, inner=0.45):
        pts = []
        for i in range(n * 2):
            rr = r if i % 2 == 0 else r * inner
            a = rot + i * math.pi / n
            pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
        self.poly(pts, col)

    def arrow(self, cx, cy, r, col, turn=0):
        """→ の かたち。turn は 90度 きざみ（0=右 1=下 2=左 3=上）。"""
        base = [(1.0, 0.0), (0.1, -0.86), (0.1, -0.34), (-0.9, -0.34),
                (-0.9, 0.34), (0.1, 0.34), (0.1, 0.86)]
        a = turn * math.pi / 2
        ca, sa = math.cos(a), math.sin(a)
        pts = [(cx + (px * ca - py * sa) * r, cy + (px * sa + py * ca) * r)
               for px, py in base]
        self.poly(pts, col)

    # --- 書き出し -----------------------------------------------------------
    def save(self, path):
        raw = b''
        for row in self.px:
            raw += b'\x00' + bytes(bytearray([c for p in row for c in p]))
        comp = zlib.compress(raw, 9)

        def chunk(tag, data):
            c = tag + data
            return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

        png = (b'\x89PNG\r\n\x1a\n'
               + chunk(b'IHDR', struct.pack('>IIBBBBB', self.w, self.w, 8, 2, 0, 0, 0))
               + chunk(b'IDAT', comp)
               + chunk(b'IEND', b''))
        with open(path, 'wb') as f:
            f.write(png)
        return path
