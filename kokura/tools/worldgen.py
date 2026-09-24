import math, random
random.seed(7)
W,H=44,32
m=[['.' for x in range(W)] for y in range(H)]
def put(x,y,c):
    if 0<=x<W and 0<=y<H: m[y][x]=c
def rect(x0,y0,x1,y1,c):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): put(x,y,c)
def blob(cx,cy,rx,ry,c,rough=0.0):
    for y in range(H):
        for x in range(W):
            d=((x-cx)/rx)**2+((y-cy)/ry)**2
            if d<1+rough*(random.random()-0.5): put(x,y,c)
# 海：上（関門海峡）と 左はし
for x in range(W):
    coast = 3 + int(round(1.2*math.sin(x*0.45)+0.8*math.sin(x*0.17)))
    for y in range(coast): put(x,y,'~')
for y in range(H):
    for x in range(0, 2 + (1 if y%5==0 else 0)): put(x,y,'~')
# 門司の 半島（右上に 張り出す 陸）
rect(33,1,41,6,'.')
rect(42,0,43,31,'~')
put(33,0,'~'); put(41,0,'~')
# 下と 右の 山なみ（外に 出られない）
for x in range(W):
    for y in range(29, H): put(x,y,'^')
for y in range(8,H):
    for x in range(40,42): put(x,y,'^')
# むらさき川（南から 北の 海へ）
for y in range(3,H):
    x = 23 + (1 if 18<=y<=24 else 0)
    put(x,y,'r'); put(x+1,y,'r')
# 小倉の 橋
put(23,14,'='); put(24,14,'=')
# 西の 山なみ（八幡への 道は 1本だけ）
for y in range(3,29):
    for x in range(15,18): put(x,y,'^')
rect(15,14,17,14,':')
put(18,14,'b')          # 通せんぼ（大ダコを たおすまで）
# 北（門司）と 南（小倉）を 山の かべで わける。とおれるのは 'a' の 1マスだけ
rect(25,9,39,10,'^')
rect(31,9,31,10,':')
put(31,9,'a')            # 通せんぼ（大ガニを たおすまで）
blob(36,6,1.8,1.2,'^')
# 森と 丘
for (cx,cy,rx,ry) in [(20,22,3,2.2),(29,20,3,2.5),(34,17,2.5,2),(8,18,3,2.5),(11,9,2.5,2),(37,4,1.6,1),(6,26,3,1.5)]:
    blob(cx,cy,rx,ry,'T',0.3)
for (cx,cy,rx,ry) in [(27,26,2.5,1.5),(12,22,2,1.5)]:
    blob(cx,cy,rx,ry,'h',0.3)
# 西の かべを もういちど（森で あなが あかない ように）
for y in range(3,29):
    for x in range(15,18): put(x,y,'^')
rect(15,14,17,14,':')
# 皿倉山（南西の 山。入口は ふもと）
blob(8,25,4.5,3.2,'^',0.2)
# 道
for x in range(18,23): put(x,14,':')
for x in range(25,28): put(x,14,':')
for y in range(11,14): put(27,y,':')
for x in range(27,32): put(x,11,':')
for y in range(3,9): put(31,y,':')
for x in range(32,37): put(x,3,':')
for x in range(9,15): put(x,14,':')
for y in range(10,14): put(9,y,':')
# まちと ダンジョン
places={'A':(20,13),'B':(27,15),'C':(37,3),'D':(9,13),'1':(26,24),'2':(40,2),'3':(8,21),'4':(5,7)}
for c,(x,y) in places.items(): put(x,y,c)
put(8,22,'.'); put(8,20,'.')
rect(4,6,6,8,'.'); put(5,7,'4')
rect(4,5,6,5,'^')
# 川の 河口の 上は 海（川を まわりこめない ように）
rect(19,0,30,2,'~')
put(18,14,'b')          # 通せんぼ（大ダコを たおすまで）
# 城の まわりは 岩で かこみ、入口だけ あける
rows=[''.join(r) for r in m]
open('world.txt','w').write('\n'.join(rows))
print('\n'.join(rows))
