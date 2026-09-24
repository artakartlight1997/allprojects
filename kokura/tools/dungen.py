import random, json
def gen(seed, W, H, nrooms, rmin, rmax, end, nchest, horiz=False):
    rnd = random.Random(seed)
    for attempt in range(500):
        m = [['#']*W for _ in range(H)]
        rooms = []
        tries = 0
        while len(rooms) < nrooms and tries < 3000:
            tries += 1
            w = rnd.randint(rmin, rmax); h = rnd.randint(rmin, max(rmin, rmax-1))
            x = rnd.randint(1, W-w-2); y = rnd.randint(1, H-h-2)
            if any(x < r[0]+r[2]+1 and x+w+1 > r[0] and y < r[1]+r[3]+1 and y+h+1 > r[1] for r in rooms):
                continue
            rooms.append((x,y,w,h))
        if len(rooms) < nrooms: continue
        rooms.sort(key=(lambda r: r[0]) if horiz else (lambda r: (r[0]+r[1]*0.6)))
        for (x,y,w,h) in rooms:
            for yy in range(y,y+h):
                for xx in range(x,x+w): m[yy][xx]='.'
        cen = [(x+w//2, y+h//2) for (x,y,w,h) in rooms]
        def carve(a,b):
            (x0,y0),(x1,y1)=a,b
            if rnd.random()<0.5:
                for xx in range(min(x0,x1),max(x0,x1)+1): m[y0][xx]='.'
                for yy in range(min(y0,y1),max(y0,y1)+1): m[yy][x1]='.'
            else:
                for yy in range(min(y0,y1),max(y0,y1)+1): m[yy][x0]='.'
                for xx in range(min(x0,x1),max(x0,x1)+1): m[y1][xx]='.'
        for i in range(len(cen)-1): carve(cen[i],cen[i+1])
        # すこし わき道（行き止まりの へやに 宝ばこ）
        for _ in range(2):
            i = rnd.randrange(len(cen)); j = rnd.randrange(len(cen))
            if abs(i-j) > 2: carve(cen[i], cen[j])
        # スタートから いちばん とおい へやに ボス / 下りかいだん
        sx,sy = cen[0]
        dist = {(sx,sy):0}; q=[(sx,sy)]
        while q:
            x,y=q.pop(0)
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx,ny=x+dx,y+dy
                if m[ny][nx]!='#' and (nx,ny) not in dist:
                    dist[(nx,ny)]=dist[(x,y)]+1; q.append((nx,ny))
        far = max(range(1,len(cen)), key=lambda i: dist.get(cen[i],0))
        if dist.get(cen[far],0) < (W+H)*0.8: continue
        m[sy][sx] = '<'
        fx,fy = cen[far]
        m[fy][fx] = end
        others = [i for i in range(1,len(cen)) if i != far]
        rnd.shuffle(others)
        cnt = 0
        for i in others:
            x,y,w,h = rooms[i]
            # へやの すみに 宝ばこ
            cx,cy = x+w-1, y
            if m[cy][cx]=='.' and cnt < nchest:
                m[cy][cx]='c'; cnt += 1
        if cnt < nchest: continue
        return [''.join(r) for r in m]
    raise Exception('fail')
out = {
 'cave1':   gen(11, 30, 20, 7, 3, 6, 'B', 3),
 'tunnel':  gen(22, 44, 13, 8, 3, 5, 'B', 3, horiz=True),
 'mount':   gen(33, 32, 22, 9, 3, 6, 'B', 4),
 'castle1': gen(44, 34, 22, 9, 3, 6, '>', 3),
 'castle2': gen(55, 26, 18, 6, 4, 6, 'B', 2),
}
for k,v in out.items():
    print(k); print('\n'.join(v)); print()
json.dump(out, open('dungeons.json','w'), ensure_ascii=False)
