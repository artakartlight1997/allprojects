# モモの大冒険

Jetpack Compose だけで作った横スクロールアクションゲーム。
画像アセットは一切使わず、キャラも背景もすべて図形で描画している。

## 遊びかた

| 操作 | 動作 |
|---|---|
| ◀ ▶ | 歩く |
| ▲ | ジャンプ（長押しで高く跳ぶ） |

- 敵は**上から踏む**とやっつけられる。ただし **とげのすけ** は踏めない
- 触られると 1 ミス。落下も 1 ミス
- スターを取ると一定時間無敵になり、どの敵にも触れるだけで倒せる
- ゴールの旗に触れるとステージクリア

## 登場キャラ

| | 名前 | 説明 |
|---|---|---|
| 主人公 | モモ | ピンクのまるい子 |
| 敵 | ぷにまる | 緑のスライム。歩き回る。踏める |
| 敵 | とげのすけ | 紫のトゲ。**踏めない**ので避ける |
| 敵 | ぱたぽん | 水色の飛行タイプ。空中を漂う。踏める |
| アイテム | コイン | 100点 |
| アイテム | ハート | 残機 +1 |
| アイテム | スター | 8秒間無敵 |

## ステージ

1. **みどりの丘** — 基本操作を覚えるステージ
2. **ひかりのどうくつ** — 高低差とトゲ。スターが置いてある
3. **そらのかけら** — 足場が浮いている。落ちたら 1 ミス

## 実機で動かす手順

1. このリポジトリに push すると GitHub Actions が自動でビルドする
   （`.github/workflows/android.yml`）
2. 数分後、**Releases** の `dev` プレリリースに APK が添付される
3. スマホのブラウザで開き、`momo-adventure.apk` をタップしてインストール

固定リンク: https://github.com/artakartlight1997/allprojects/releases/tag/dev

`hello-android.apk` は以前のダウンロード URL を壊さないための同名コピー。
中身は `momo-adventure.apk` と同一なのでどちらを入れても同じ。

## ステージデータについて

`app/src/main/java/com/example/momo/Levels.kt` は
`tools/genlevels.py` が生成する。**手で編集しないこと。**

```
python3 tools/genlevels.py app/src/main/java/com/example/momo/Levels.kt
```

このスクリプトはマップを組み立てるだけでなく、
「跳び越せない隙間がないか」「登れない段差がないか」「敵が空中に湧かないか」
を物理定数から計算して検証する。ジャンプ性能（`Game.kt` の `GRAVITY` /
`JUMP_VELOCITY` / `MOVE_SPEED`）を変えたときは、スクリプト冒頭の
コメントの数値も合わせて更新すること。

## 構成

| 項目 | 値 |
|---|---|
| 言語 / UI | Kotlin + Jetpack Compose (Canvas) |
| 画面 | 横向き固定・フルスクリーン |
| compileSdk / targetSdk | 35 |
| minSdk | 24 (Android 7.0 以上) |
| AGP / Kotlin / Gradle | 8.7.3 / 2.1.0 / 8.9 |

`applicationId` は `com.example.helloandroid` のまま変えていない。
変えると別アプリ扱いになり、以前入れた Hello Android が端末に残るため。
同じ ID・同じ署名なので、インストールすると上書き更新される。

## debug.keystore について

`app/debug.keystore` をリポジトリに含めて署名を固定している。
これがないとビルドのたびに署名が変わり、再インストール時に
「アプリを更新できません（署名が一致しません）」で弾かれる。

debug ビルド専用の鍵なので、公開しても問題ない。
Google Play に出す段階になったら、release 用の鍵を別途作って
GitHub Secrets に置くこと（この鍵は絶対にコミットしない）。
