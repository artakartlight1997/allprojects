#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""47都道府県のデータ（形・位置・県庁所在地・名物）から site/data.js を作る。

形のもとになるのは国土数値情報由来の GeoJSON。
  https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson
13MB あるのでリポジトリには入れない。実行時に無ければ取りに行く。

出力する data.js には次の 2 つの座標が入る。

  outline  全国地図用。47 都道府県が同じ座標系に並ぶ。
           「どこにあるか」クイズと、スタンプ帳の地図で使う。
  （シルエットは outline を都道府県ごとに正規化して作るので持たない）

遠くの離島は地図が間延びするので落としている（小笠原諸島・南鳥島・
沖ノ鳥島・奄美群島・先島諸島）。沖縄は日本の地図でよくあるように
左上の枠の中へ移動している。

使いかた:
  python3 tools/genprefdata.py site/data.js
"""

import json
import math
import os
import sys
import urllib.request

GEOJSON_URL = ("https://raw.githubusercontent.com/dataofjapan/land/"
               "master/japan.geojson")

# ---------------------------------------------------------------- 投影と切り取り

# 緯度 1 度と経度 1 度では長さが違う。日本のまんなかあたりの緯度で補正する。
LAT_MID = 37.5
LON_SCALE = math.cos(math.radians(LAT_MID))

# 本土側で残す範囲。ここから外れた輪はまるごと捨てる。
MAIN_CLIP = dict(lat0=30.5, lat1=46.2, lon0=128.0, lon1=146.5)
# 沖縄で残す範囲。沖縄本島と近くの島だけ。
OKI_CLIP = dict(lat0=25.8, lat1=27.1, lon0=126.5, lon1=128.6)

OKINAWA_ID = 47
# 沖縄の枠を置く場所（投影後の座標。左上の海のあいている所）
OKI_INSET_ANCHOR = (0.055, 0.09)   # 地図の幅・高さに対する割合
OKI_INSET_SCALE = 0.95             # 少しだけ小さく描く

# 輪をどこまで残すか
MIN_RING_AREA_RATIO = 0.004   # いちばん大きい輪に対する面積比
MAX_RINGS = 10
RDP_EPS = 0.0035              # 度。だいたい 300m

QUANT = 2000                  # 座標を 0..QUANT の整数にする


def fetch_geojson(path):
    if os.path.exists(path):
        return json.load(open(path, encoding="utf-8"))
    sys.stderr.write("geojson を取得中 (13MB)...\n")
    with urllib.request.urlopen(GEOJSON_URL, timeout=180) as r:
        raw = r.read()
    open(path, "wb").write(raw)
    return json.loads(raw.decode("utf-8"))


def ring_area(ring):
    s = 0.0
    for i in range(len(ring)):
        x0, y0 = ring[i]
        x1, y1 = ring[(i + 1) % len(ring)]
        s += x0 * y1 - x1 * y0
    return abs(s) * 0.5


def inside(ring, clip):
    """輪の重心がだいたい範囲に入っているか。"""
    lon = sum(p[0] for p in ring) / len(ring)
    lat = sum(p[1] for p in ring) / len(ring)
    return (clip["lon0"] <= lon <= clip["lon1"]
            and clip["lat0"] <= lat <= clip["lat1"])


def rdp(pts, eps):
    """Ramer-Douglas-Peucker。点を減らしても形が崩れないように。"""
    if len(pts) < 3:
        return pts[:]
    ax, ay = pts[0]
    bx, by = pts[-1]
    dx, dy = bx - ax, by - ay
    den = math.hypot(dx, dy)
    far, fi = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        if den < 1e-12:
            d = math.hypot(px - ax, py - ay)
        else:
            d = abs(dy * px - dx * py + bx * ay - by * ax) / den
        if d > far:
            far, fi = d, i
    if far <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:fi + 1], eps)[:-1] + rdp(pts[fi:], eps)


def simplify_ring(ring, eps):
    # 閉じた輪なので、いちばん遠い 2 点で切ってから 2 本を簡略化する
    ring = ring[:-1] if ring[0] == ring[-1] else ring[:]
    if len(ring) < 4:
        return ring
    n = len(ring)
    half = n // 2
    a = rdp(ring[:half + 1], eps)
    b = rdp(ring[half:] + [ring[0]], eps)
    out = a[:-1] + b[:-1]
    return out if len(out) >= 3 else ring


def rings_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    out = []
    for poly in geom["coordinates"]:
        out.append(poly[0])          # 穴（湖など）は使わない
    return out


# ---------------------------------------------------------------- 都道府県の知識
#
# name        表示名
# kana        よみ（ふりがな。低学年でも読めるように）
# capital     県庁所在地（市の名前。「市」は付けない）
# capkana     そのよみ
# region      地方
# famous      有名なもの・名産（4 つ）
# memo        まめちしき（1 行）
#
# ※ 東京都の都庁は新宿区にある。ふつうの地図では「東京」と書くので
#    ここでも「東京」にしている。

REGIONS = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州・沖縄"]

PREF = {
 1: ("北海道", "ほっかいどう", "札幌", "さっぽろ", "北海道",
     ["じゃがいも", "カニ", "ラベンダー", "さっぽろ雪まつり"],
     "日本でいちばん広い。面積は日本ぜんたいの約5分の1"),
 2: ("青森県", "あおもりけん", "青森", "あおもり", "東北",
     ["りんご", "ねぶた祭", "にんにく", "大間のマグロ"],
     "りんごの生産量が日本一。全国の半分以上をつくっている"),
 3: ("岩手県", "いわてけん", "盛岡", "もりおか", "東北",
     ["わんこそば", "南部鉄器", "中尊寺金色堂", "前沢牛"],
     "本州でいちばん広い県。北海道の次に大きい"),
 4: ("宮城県", "みやぎけん", "仙台", "せんだい", "東北",
     ["牛タン", "ずんだもち", "松島", "仙台七夕まつり"],
     "松島は日本三景のひとつ。島が260もうかんでいる"),
 5: ("秋田県", "あきたけん", "秋田", "あきた", "東北",
     ["きりたんぽ", "なまはげ", "秋田犬", "竿燈まつり"],
     "田んぼの割合が日本一。お米づくりがさかん"),
 6: ("山形県", "やまがたけん", "山形", "やまがた", "東北",
     ["さくらんぼ", "米沢牛", "花笠まつり", "蔵王の樹氷"],
     "さくらんぼの生産量が日本一。全国のおよそ7割"),
 7: ("福島県", "ふくしまけん", "福島", "ふくしま", "東北",
     ["もも", "赤べこ", "喜多方ラーメン", "鶴ヶ城"],
     "都道府県で3番目に広い。海・山・盆地がそろっている"),
 8: ("茨城県", "いばらきけん", "水戸", "みと", "関東",
     ["納豆", "メロン", "干しいも", "偕楽園"],
     "メロンと干しいもの生産量が日本一"),
 9: ("栃木県", "とちぎけん", "宇都宮", "うつのみや", "関東",
     ["いちご", "餃子", "日光東照宮", "かんぴょう"],
     "いちごの生産量が日本一。「とちおとめ」が有名"),
 10: ("群馬県", "ぐんまけん", "前橋", "まえばし", "関東",
      ["こんにゃく", "草津温泉", "だるま", "下仁田ねぎ"],
      "こんにゃくいもの生産量が日本一。形がツルにたとえられる"),
 11: ("埼玉県", "さいたまけん", "さいたま", "さいたま", "関東",
      ["草加せんべい", "川越の蔵造り", "深谷ねぎ", "秩父夜祭"],
      "海に面していない県のひとつ。川越は「小江戸」とよばれる"),
 12: ("千葉県", "ちばけん", "千葉", "ちば", "関東",
      ["落花生", "しょうゆ", "成田空港", "びわ"],
      "落花生の生産量が日本一。海に大きくつき出た形"),
 13: ("東京都", "とうきょうと", "東京", "とうきょう", "関東",
      ["東京スカイツリー", "浅草寺", "東京タワー", "江戸前ずし"],
      "日本の首都。人口がいちばん多い"),
 14: ("神奈川県", "かながわけん", "横浜", "よこはま", "関東",
      ["中華街", "鎌倉の大仏", "シウマイ", "箱根の温泉"],
      "人口は東京の次に多い。横浜港は日本を代表する港"),
 15: ("新潟県", "にいがたけん", "新潟", "にいがた", "中部",
      ["コシヒカリ", "日本酒", "笹だんご", "佐渡島"],
      "お米の生産量が日本一。雪がとても多い"),
 16: ("富山県", "とやまけん", "富山", "とやま", "中部",
      ["ホタルイカ", "ますのすし", "白えび", "立山連峰"],
      "富山湾のホタルイカは春の名物。海と3000m級の山が近い"),
 17: ("石川県", "いしかわけん", "金沢", "かなざわ", "中部",
      ["金箔", "兼六園", "輪島塗", "加賀友禅"],
      "金箔の生産量は全国のほぼすべて。能登半島がつき出ている"),
 18: ("福井県", "ふくいけん", "福井", "ふくい", "中部",
      ["越前がに", "めがねフレーム", "東尋坊", "恐竜博物館"],
      "めがねフレームの生産量が日本一。恐竜の化石もたくさん出る"),
 19: ("山梨県", "やまなしけん", "甲府", "こうふ", "中部",
      ["ぶどう", "もも", "富士山", "ほうとう"],
      "ぶどうとももの生産量が日本一。海に面していない"),
 20: ("長野県", "ながのけん", "長野", "ながの", "中部",
      ["レタス", "信州そば", "善光寺", "りんご"],
      "レタスの生産量が日本一。8つの県ととなり合っている"),
 21: ("岐阜県", "ぎふけん", "岐阜", "ぎふ", "中部",
      ["白川郷", "鵜飼", "美濃和紙", "飛騨牛"],
      "白川郷の合掌造りは世界遺産。海に面していない"),
 22: ("静岡県", "しずおかけん", "静岡", "しずおか", "中部",
      ["お茶", "みかん", "うなぎ", "富士山"],
      "お茶の生産量が日本一。富士山は山梨県とまたがっている"),
 23: ("愛知県", "あいちけん", "名古屋", "なごや", "中部",
      ["みそカツ", "ひつまぶし", "名古屋城", "自動車"],
      "自動車の生産が日本一。ものづくりの県"),
 24: ("三重県", "みえけん", "津", "つ", "近畿",
      ["伊勢神宮", "真珠", "松阪牛", "伊勢えび"],
      "県庁所在地の「津」は日本でいちばん短い市の名前"),
 25: ("滋賀県", "しがけん", "大津", "おおつ", "近畿",
      ["琵琶湖", "近江牛", "信楽焼のたぬき", "彦根城"],
      "琵琶湖は日本でいちばん大きい湖。県の6分の1をしめる"),
 26: ("京都府", "きょうとふ", "京都", "きょうと", "近畿",
      ["金閣寺", "八ツ橋", "抹茶", "祇園祭"],
      "1000年以上みやこだった。世界遺産がとても多い"),
 27: ("大阪府", "おおさかふ", "大阪", "おおさか", "近畿",
      ["たこ焼き", "お好み焼き", "通天閣", "大阪城"],
      "面積は下から2番目に小さいのに、人口は3番目に多い"),
 28: ("兵庫県", "ひょうごけん", "神戸", "こうべ", "近畿",
      ["神戸牛", "明石焼", "姫路城", "淡路島のたまねぎ"],
      "日本海と瀬戸内海の両方に面している。姫路城は世界遺産"),
 29: ("奈良県", "ならけん", "奈良", "なら", "近畿",
      ["東大寺の大仏", "奈良公園のシカ", "法隆寺", "柿の葉ずし"],
      "法隆寺は世界でいちばん古い木造の建物といわれる"),
 30: ("和歌山県", "わかやまけん", "和歌山", "わかやま", "近畿",
      ["みかん", "梅干し", "高野山", "パンダ"],
      "梅とみかんの生産量が日本一"),
 31: ("鳥取県", "とっとりけん", "鳥取", "とっとり", "中国",
      ["鳥取砂丘", "二十世紀梨", "松葉がに", "らっきょう"],
      "人口が日本でいちばん少ない。鳥取砂丘は日本最大級"),
 32: ("島根県", "しまねけん", "松江", "まつえ", "中国",
      ["出雲大社", "しじみ", "石見銀山", "出雲そば"],
      "宍道湖のしじみは日本一。出雲大社には神様が集まるとされる"),
 33: ("岡山県", "おかやまけん", "岡山", "おかやま", "中国",
      ["白桃", "マスカット", "桃太郎", "倉敷美観地区"],
      "雨の少ない「晴れの国」。マスカットの生産量が日本一"),
 34: ("広島県", "ひろしまけん", "広島", "ひろしま", "中国",
      ["かき", "もみじ饅頭", "お好み焼き", "厳島神社"],
      "かきの生産量が日本一。厳島神社と原爆ドームが世界遺産"),
 35: ("山口県", "やまぐちけん", "山口", "やまぐち", "中国",
      ["ふぐ", "秋吉台", "錦帯橋", "萩焼"],
      "本州のいちばん西。ふぐの水あげが日本一"),
 36: ("徳島県", "とくしまけん", "徳島", "とくしま", "四国",
      ["阿波おどり", "すだち", "鳴門の渦潮", "藍染め"],
      "すだちの生産量は全国のほぼすべて"),
 37: ("香川県", "かがわけん", "高松", "たかまつ", "四国",
      ["さぬきうどん", "オリーブ", "金刀比羅宮", "瀬戸大橋"],
      "日本でいちばん小さい県。オリーブの生産量は日本一"),
 38: ("愛媛県", "えひめけん", "松山", "まつやま", "四国",
      ["みかん", "道後温泉", "タオル", "砥部焼"],
      "道後温泉は日本最古といわれる温泉。かんきつ類がさかん"),
 39: ("高知県", "こうちけん", "高知", "こうち", "四国",
      ["かつおのたたき", "坂本龍馬", "よさこい祭り", "ゆず"],
      "ゆずの生産量が日本一。森林の割合も日本一"),
 40: ("福岡県", "ふくおかけん", "福岡", "ふくおか", "九州・沖縄",
      ["明太子", "とんこつラーメン", "博多人形", "あまおう"],
      "九州でいちばん人口が多い。いちご「あまおう」の産地"),
 41: ("佐賀県", "さがけん", "佐賀", "さが", "九州・沖縄",
      ["有田焼", "佐賀牛", "呼子のイカ", "バルーンフェスタ"],
      "有田焼は400年つづく焼き物。のりの生産量が日本一"),
 42: ("長崎県", "ながさきけん", "長崎", "ながさき", "九州・沖縄",
      ["カステラ", "ちゃんぽん", "グラバー園", "びわ"],
      "島の数が日本一。海岸線の長さは北海道の次に長い"),
 43: ("熊本県", "くまもとけん", "熊本", "くまもと", "九州・沖縄",
      ["阿蘇山", "くまモン", "い草（たたみ）", "馬刺し"],
      "い草の生産量は全国のほぼすべて。阿蘇山のカルデラは世界最大級"),
 44: ("大分県", "おおいたけん", "大分", "おおいた", "九州・沖縄",
      ["別府温泉", "湯布院", "かぼす", "とり天"],
      "温泉のわく量と源泉の数が日本一"),
 45: ("宮崎県", "みやざきけん", "宮崎", "みやざき", "九州・沖縄",
      ["マンゴー", "地鶏の炭火焼", "高千穂峡", "ピーマン"],
      "日照時間が長い。きゅうりとピーマンの生産がさかん"),
 46: ("鹿児島県", "かごしまけん", "鹿児島", "かごしま", "九州・沖縄",
      ["桜島", "さつまいも", "黒豚", "屋久島"],
      "さつまいもの生産量が日本一。屋久島は世界遺産"),
 47: ("沖縄県", "おきなわけん", "那覇", "なは", "九州・沖縄",
      ["シーサー", "首里城", "ゴーヤーチャンプルー", "美ら海"],
      "一年中あたたかい。日本でいちばん西と南にある県"),
}


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "site/data.js"
    cache = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "japan.geojson")
    gj = fetch_geojson(cache)

    # ---- 輪を集める
    feats = {}
    for f in gj["features"]:
        pid = f["properties"]["id"]
        clip = OKI_CLIP if pid == OKINAWA_ID else MAIN_CLIP
        rings = [r for r in rings_of(f["geometry"]) if inside(r, clip)]
        if not rings:
            sys.exit("id=%d の輪が全部落ちた" % pid)
        rings.sort(key=ring_area, reverse=True)
        big = ring_area(rings[0])
        rings = [r for r in rings[:MAX_RINGS]
                 if ring_area(r) >= big * MIN_RING_AREA_RATIO]
        feats[pid] = [simplify_ring(r, RDP_EPS) for r in rings]

    # ---- 投影（経度は緯度ぶんちぢめる。南が下になるよう緯度は反転）
    proj = {}
    for pid, rings in feats.items():
        proj[pid] = [[(x * LON_SCALE, -y) for x, y in r] for r in rings]

    # ---- 本土の枠を求める（沖縄は別あつかい）
    xs, ys = [], []
    for pid, rings in proj.items():
        if pid == OKINAWA_ID:
            continue
        for r in rings:
            for x, y in r:
                xs.append(x)
                ys.append(y)
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    w, h = maxx - minx, maxy - miny
    # たて・よこを同じ倍率でちぢめないと日本の形がゆがむ
    span = max(w, h)
    padx = (span - w) / 2
    pady = (span - h) / 2

    def norm(x, y):
        return ((x - minx + padx) / span, (y - miny + pady) / span)

    # ---- 沖縄を左上の枠へ移す
    oxs = [p[0] for r in proj[OKINAWA_ID] for p in r]
    oys = [p[1] for r in proj[OKINAWA_ID] for p in r]
    ocx, ocy = (min(oxs) + max(oxs)) / 2, (min(oys) + max(oys)) / 2
    tx, ty = OKI_INSET_ANCHOR

    def norm_oki(x, y):
        nx = (x - ocx) / span * OKI_INSET_SCALE + tx
        ny = (y - ocy) / span * OKI_INSET_SCALE + ty
        return (nx, ny)

    # ---- 量子化して書き出す
    prefs = []
    for pid in range(1, 48):
        name, kana, cap, capkana, region, famous, memo = PREF[pid]
        fn = norm_oki if pid == OKINAWA_ID else norm
        rings = []
        for r in proj[pid]:
            pts = []
            for x, y in r:
                nx, ny = fn(x, y)
                pts.append(max(0, min(QUANT, round(nx * QUANT))))
                pts.append(max(0, min(QUANT, round(ny * QUANT))))
            rings.append(pts)
        # ラベルを置く点。いちばん大きい輪の重心
        big = rings[0]
        cx = sum(big[0::2]) / (len(big) // 2)
        cy = sum(big[1::2]) / (len(big) // 2)
        prefs.append(dict(id=pid, name=name, kana=kana, cap=cap,
                          capKana=capkana, region=region, famous=famous,
                          memo=memo, cx=round(cx), cy=round(cy), rings=rings))

    npts = sum(len(r) // 2 for p in prefs for r in p["rings"])
    lines = []
    lines.append("// 自動生成: tools/genprefdata.py")
    lines.append("// 手で編集しないこと。")
    lines.append("//")
    lines.append("// rings は 0..%d に量子化した [x,y,x,y,...]。" % QUANT)
    lines.append("// 全都道府県が同じ座標系。沖縄だけ左上の枠へ移してある。")
    lines.append("// もとデータ: dataofjapan/land (japan.geojson)")
    lines.append("const PREF_QUANT = %d;" % QUANT)
    lines.append("const OKINAWA_INSET = %s;" % json.dumps(
        dict(x=OKI_INSET_ANCHOR[0], y=OKI_INSET_ANCHOR[1]), ensure_ascii=False))
    lines.append("const REGIONS = %s;" % json.dumps(REGIONS, ensure_ascii=False))
    lines.append("const PREFS = [")
    for p in prefs:
        head = dict(p)
        rings = head.pop("rings")
        lines.append("{" + ",".join(
            "%s:%s" % (k, json.dumps(v, ensure_ascii=False))
            for k, v in head.items()) + ",rings:[" +
            ",".join("[" + ",".join(str(v) for v in r) + "]" for r in rings) +
            "]},")
    lines.append("];")
    text = "\n".join(lines) + "\n"

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    open(out_path, "w", encoding="utf-8").write(text)
    print("wrote %s (%d bytes, %d 都道府県, %d 点)"
          % (out_path, len(text.encode("utf-8")), len(prefs), npts))

    # 目で見なくても分かる程度の検査
    for p in prefs:
        if not p["rings"]:
            sys.exit("%s に輪がない" % p["name"])
        if len(p["famous"]) != 4:
            sys.exit("%s の名物が4つでない" % p["name"])
    caps = [p["cap"] for p in prefs]
    if len(set(caps)) != 47:
        sys.exit("県庁所在地に重複がある")
    print("地方ごとの数:", {r: sum(1 for p in prefs if p["region"] == r)
                            for r in REGIONS})


if __name__ == "__main__":
    main()
