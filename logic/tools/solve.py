import itertools
exec(open('puz.py').read())
def clues(line):
    out=[];n=0
    for c in line:
        if c: n+=1
        elif n: out.append(n); n=0
    if n: out.append(n)
    return out or [0]
def placements(cl, L):
    if cl==[0]: return [[0]*L]
    res=[]
    def rec(i,pos,acc):
        if i==len(cl):
            res.append(acc+[0]*(L-len(acc))); return
        for s in range(pos, L-sum(cl[i:])-(len(cl)-i-1)+1):
            a=acc+[0]*(s-len(acc))+[1]*cl[i]
            if i<len(cl)-1: a=a+[0]
            rec(i+1,len(a),a)
    rec(0,0,[])
    return [r[:L] for r in res]
def solve(rows, cols):
    H,W=len(rows),len(cols)
    g=[[None]*W for _ in range(H)]
    rp=[placements(c,W) for c in rows]; cp=[placements(c,H) for c in cols]
    changed=True
    while changed:
        changed=False
        for y in range(H):
            rp[y]=[p for p in rp[y] if all(g[y][x] is None or g[y][x]==p[x] for x in range(W))]
            for x in range(W):
                v=set(p[x] for p in rp[y])
                if len(v)==1 and g[y][x] is None: g[y][x]=v.pop(); changed=True
        for x in range(W):
            cp[x]=[p for p in cp[x] if all(g[y][x] is None or g[y][x]==p[y] for y in range(H))]
            for y in range(H):
                v=set(p[y] for p in cp[x])
                if len(v)==1 and g[y][x] is None: g[y][x]=v.pop(); changed=True
    return all(c is not None for r in g for c in r)
for name,art in P:
    rows=[l for l in art.strip('\n').split('\n')]
    grid=[[0 if c=='.' else 1 for c in r] for r in rows]
    W=len(rows[0]); assert all(len(r)==W for r in rows), name
    rc=[clues(r) for r in grid]; cc=[clues([grid[y][x] for y in range(len(grid))]) for x in range(W)]
    print(name, len(grid),'x',W, 'OK' if solve(rc,cc) else 'NOT UNIQUE-BY-LOGIC')
