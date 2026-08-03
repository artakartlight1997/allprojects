# Hello Android

Jetpack Compose の最小構成アプリ。実機テストの動線を確認するための雛形。

## 実機で動かす手順

1. このリポジトリに push すると GitHub Actions が自動でビルドする
   （`.github/workflows/android.yml`）
2. 数分後、リポジトリの **Releases** に `dev` というプレリリースが作られ、
   `hello-android.apk` が添付される
3. スマホのブラウザで Releases ページを開き、APK をタップしてダウンロード
4. 初回のみ「不明なアプリのインストール」を許可してインストール

修正後は 2〜4 を繰り返すだけ。PC は不要。

リリースの URL は毎回同じなので、ブックマークまたは QR で固定できる:
https://github.com/artakartlight1997/allprojects/releases/tag/dev

なお `dev` タグ自体は最初に作られたコミットを指したままになる。
実際にビルドされたコミットはリリースのタイトルと本文に記載される。

## 構成

| 項目 | 値 |
|---|---|
| 言語 / UI | Kotlin + Jetpack Compose |
| compileSdk / targetSdk | 35 |
| minSdk | 24 (Android 7.0 以上) |
| AGP / Kotlin / Gradle | 8.7.3 / 2.1.0 / 8.9 |

## debug.keystore について

`app/debug.keystore` をリポジトリに含めて署名を固定している。
これがないとビルドのたびに署名が変わり、再インストール時に
「アプリを更新できません（署名が一致しません）」で弾かれる。

debug ビルド専用の鍵なので、公開しても問題ない。
Google Play に出す段階になったら、release 用の鍵を別途作って
GitHub Secrets に置くこと（この鍵は絶対にコミットしない）。
