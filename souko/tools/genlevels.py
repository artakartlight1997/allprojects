#!/usr/bin/env python3
"""エイトくんの そうこばん の めんを 作る。

★ 手で 30めん 作ると「じつは 解けない めん」が まぎれこむ。
   そこで **かならず 解ける 作りかた** を つかう:

   1. まず **解けた かたち**（にもつが ぜんぶ ○の上）を 作る
   2. そこから **時間を まきもどす**（にもつを ひっぱる）
   3. まきもどし 終わった かたちが、そのまま 問題に なる

   まきもどしの 1手は かならず 押す 1手の 逆なので、
   できた めんは 100% 解ける。

   そのあと **本物の 解きプログラム**（押した かずで 幅ゆうせん さがし）で
   さいたんの 手数を 数え、みじかすぎる めんは すてる。
   この 手数は ゲームの「もくひょう」に つかう。

つかいかた:  python3 genlevels.py     → ../site/levels.js
"""

import json
import os
import random
import time
from collections import deque

WALL, FLOOR = '#', ' '
DIRS = [(0, -1), (0, 1), (-1, 0), (1, 0)]

# めんの 大きさ・にもつの かず・めざす さいたん手数（おす かず）・さがす 時間
#
# ★ ここの 数字は かんで きめたのでは なく、じっさいに 何百めんも 作らせて
#   「この 大きさ・この はこの かずだと どこまで むずかしく できるか」を
#   はかってから きめた。3こなら 12おし、4こなら 14おし あたりが 天じょう。
def plan():
    out = []
    for i in range(6):
        out.append((7, 6, 2, 4 + i // 2, 12, 5))
    for i in range(8):
        out.append((8, 7, 3, 7 + i // 2, 16, 6))
    for i in range(8):
        out.append((9, 8, 4, 9 + (i * 5) // 8, 20, 12))
    for i in range(8):
        out.append((10, 8, 5, 10 + (i * 6) // 8, 24, 20))
    return out


PLAN = plan()

NAMES = [
    'はじめの そうこ', 'ふたつの はこ', 'かどっこ', 'まっすぐ おす', 'とおりみち',
    'ちいさな へや', 'みっつ ならべて', 'いきどまり ちゅうい', 'じゅうじろ', 'ぐるっと まわる',
    'はしら の あいだ', 'ふたつの へや', 'ながい ろうか', 'せまい みち',
    'よっつの はこ', 'まんなかの かべ', 'にのじ の へや', 'ぐるぐる どうろ',
    'かどが おおい', 'ひろい ゆか', 'たてよこ どっち', 'かべぎわ ちゅうい',
    'いつつの はこ', 'おおきな そうこ', 'めいろ そうこ', 'じゅんばん が だいじ',
    'おくの へや', 'ぜんぶ うごかす', 'さいごの ひとつ', 'そうこばん の おう',
]


# --- へやを ほる -------------------------------------------------------------
def carve(w, h, rnd, want):
    """かべだらけの ところを ランダムに ほって、つながった ゆかを 作る。"""
    g = [[WALL] * w for _ in range(h)]
    x, y = rnd.randrange(1, w - 1), rnd.randrange(1, h - 1)
    g[y][x] = FLOOR
    n = 1
    tries = 0
    while n < want and tries < want * 60:
        tries += 1
        dx, dy = rnd.choice(DIRS)
        nx, ny = x + dx, y + dy
        if not (1 <= nx < w - 1 and 1 <= ny < h - 1):
            continue
        x, y = nx, ny
        if g[y][x] == WALL:
            g[y][x] = FLOOR
            n += 1
    return g


def floors(g):
    return [(x, y) for y in range(len(g)) for x in range(len(g[0])) if g[y][x] == FLOOR]


# --- まきもどし（にもつを ひっぱる） ----------------------------------------
def reverse_walk(g, goals, rnd, steps, want_pulls):
    """解けた かたちから、ひっぱりながら ランダムに あるく。

    ★ ひっぱった かずが want_pulls に なったら やめる。
      こう すると「さいたん手数は かならず want_pulls 以下」に なるので、
      あとの 解きプログラムが ふかく もぐらずに すみ、とても 速く なる。
    """
    boxes = set(goals)
    cands = []
    for (bx, by) in boxes:
        for dx, dy in DIRS:
            p = (bx + dx, by + dy)
            if free(g, p) and p not in boxes:
                cands.append(p)
    if not cands:
        return None
    px, py = rnd.choice(cands)

    pulls = 0
    for _ in range(steps):
        opts = []
        # ひっぱる: じぶんの となりに にもつ、はんたいがわが あいて いる
        for dx, dy in DIRS:
            b = (px + dx, py + dy)
            back = (px - dx, py - dy)
            if b in boxes and free(g, back) and back not in boxes:
                opts.append(('pull', dx, dy))
        # ただ あるく
        for dx, dy in DIRS:
            p = (px + dx, py + dy)
            if free(g, p) and p not in boxes:
                opts.append(('walk', dx, dy))
        if not opts:
            break
        pulls_opt = [o for o in opts if o[0] == 'pull']
        # ★ ひっぱりを ゆうせん しないと、ただ あるくだけで 問題に ならない
        if pulls_opt and rnd.random() < 0.72:
            kind, dx, dy = rnd.choice(pulls_opt)
        else:
            kind, dx, dy = rnd.choice(opts)
        if kind == 'pull':
            b = (px + dx, py + dy)
            boxes.discard(b)
            boxes.add((px, py))
            px, py = px - dx, py - dy
            pulls += 1
            if pulls >= want_pulls:
                break
        else:
            px, py = px + dx, py + dy
    if pulls < 4:
        return None
    return (px, py), boxes


def free(g, p):
    x, y = p
    return 0 <= y < len(g) and 0 <= x < len(g[0]) and g[y][x] == FLOOR


# --- 解きプログラム（おした かずで 幅ゆうせん さがし） ----------------------
def dead_squares(g, goals):
    """にもつを 置いたら 二度と 動かせなく なる ます（すみっこ など）。"""
    dead = set()
    for p in floors(g):
        if p in goals:
            continue
        x, y = p
        up = not free(g, (x, y - 1))
        dn = not free(g, (x, y + 1))
        lf = not free(g, (x - 1, y))
        rt = not free(g, (x + 1, y))
        if (up or dn) and (lf or rt):
            dead.add(p)
    return dead


def reach(g, start, boxes):
    """にもつを 動かさずに 行ける ところ。いちばん 小さい ますを 代表に する。"""
    seen = {start}
    q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in DIRS:
            p = (x + dx, y + dy)
            if p in seen or p in boxes or not free(g, p):
                continue
            seen.add(p)
            q.append(p)
    return seen


def solve(g, player, boxes, goals, cap=99, limit=200000):
    """さいたんの「おした かず」を かえす。解けなければ None。

    ★ cap より 手数が ふかく なったら さっさと あきらめる。
      こうしないと「はんいに 入らない めん」を 1つ すてる のに
      さがしきる ぶんの 時間が まるまる かかって、いつまでも 終わらない。
    """
    dead = dead_squares(g, goals)
    if any(b in dead for b in boxes):
        return None
    start_r = reach(g, player, boxes)
    start = (min(start_r), frozenset(boxes))
    if set(boxes) == goals:
        return 0
    seen = {start}
    q = deque([(start[0], start[1], 0)])
    n = 0
    while q:
        prep, bs, d = q.popleft()
        if d >= cap:
            return None
        n += 1
        if n > limit:
            return None
        r = reach(g, prep, bs)
        for b in bs:
            bx, by = b
            for dx, dy in DIRS:
                stand = (bx - dx, by - dy)
                dest = (bx + dx, by + dy)
                if stand not in r:
                    continue
                if not free(g, dest) or dest in bs or dest in dead:
                    continue
                nb = frozenset((bs - {b}) | {dest})
                if nb == goals:
                    return d + 1
                key = (min(reach(g, b, nb)), nb)
                if key in seen:
                    continue
                seen.add(key)
                q.append((key[0], nb, d + 1))
    return None


# --- めんを 1つ 作る ---------------------------------------------------------
def make(idx, w, h, nbox, lo, hi, seed, tries):
    rnd = random.Random(seed)
    for _ in range(tries):
        want = int((w - 2) * (h - 2) * rnd.uniform(0.36, 0.56))
        g = carve(w, h, rnd, max(nbox * 5 + 6, want))
        fl = floors(g)
        if len(fl) < nbox * 5 + 5:
            continue
        # ○（ゴール）は すみっこ すぎない ところに
        ok = [p for p in fl if sum(1 for d in DIRS if free(g, (p[0] + d[0], p[1] + d[1]))) >= 2]
        if len(ok) < nbox + 2:
            continue
        goals = set(rnd.sample(ok, nbox))
        r = reverse_walk(g, goals, rnd, 260 + idx * 12, hi)
        if not r:
            continue
        player, boxes = r
        if boxes == goals:
            continue
        d = solve(g, player, boxes, goals, cap=hi + 1)
        if d is None or d < lo or d > hi:
            continue
        return render(g, player, boxes, goals), d
    return None, None


def render(g, player, boxes, goals):
    """使って いない かべを けずって、まわりを かべで かこむ。"""
    h, w = len(g), len(g[0])
    used = set(floors(g))
    xs = [p[0] for p in used]
    ys = [p[1] for p in used]
    x0, x1, y0, y1 = min(xs) - 1, max(xs) + 1, min(ys) - 1, max(ys) + 1
    rows = []
    for y in range(y0, y1 + 1):
        row = ''
        for x in range(x0, x1 + 1):
            p = (x, y)
            if p not in used:
                row += '#'
            elif p == player:
                row += '+' if p in goals else '@'
            elif p in boxes:
                row += '*' if p in goals else '$'
            elif p in goals:
                row += '.'
            else:
                row += ' '
        rows.append(row)
    return rows


def main():
    out = []
    seed = 20260813
    for i, (w, h, nbox, lo, hi, budget) in enumerate(PLAN):
        # ★ 「はんいに 入った さいしょの めん」では やさしすぎる ものが
        #   まざる。決めた 時間の あいだ 作りつづけて、いちばん 手数の
        #   多い ものを えらぶ。
        t0 = time.time()
        bestRows, bestD = None, -1
        t = 0
        while time.time() - t0 < budget or bestRows is None:
            t += 1
            if t > 4000:
                break
            rows, d = make(i, w, h, nbox, 1, hi, seed + i * 977 + t * 31, 3)
            if rows and d > bestD:
                bestRows, bestD = rows, d
            if bestD >= hi:
                break
        if not bestRows:
            raise SystemExit('めん %d が 作れなかった' % (i + 1))
        out.append({'name': NAMES[i], 'rows': bestRows, 'best': bestD})
        print('%2d %-18s %2dx%-2d はこ%d おす%2d %s (%.0fs)' %
              (i + 1, NAMES[i], len(bestRows[0]), len(bestRows), nbox, bestD,
               'OK' if bestD >= lo else 'ちょっと やさしい', time.time() - t0), flush=True)

    dst = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', 'site', 'levels.js'))
    with open(dst, 'w', encoding='utf-8') as f:
        f.write('// tools/genlevels.py が 作った ファイル。手で 直さない こと。\n')
        f.write('// # かべ / スペース ゆか / . ○ / $ にもつ / * ○の上の にもつ\n')
        f.write('// / @ エイトくん / + ○の上の エイトくん\n')
        f.write("// best は 解きプログラムが 数えた **さいたんの おす かず**。\n")
        f.write("'use strict';\n")
        f.write('const LEVELS = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')
    print(dst)


if __name__ == '__main__':
    main()
