# R8 の追加ルール。
#
# このアプリはリフレクション・シリアライズ・JNI を一切使っておらず、
# エントリポイントは AndroidManifest.xml に書かれた MainActivity だけ。
# Compose や AndroidX の各ライブラリは必要な keep ルールを自前で同梱して
# いるため、ここで足すべきものは基本的にない。
#
# クラッシュ時のスタックトレースを読めるようにするため、行番号だけ残す。
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
