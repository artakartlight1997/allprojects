plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.momo"
    compileSdk = 35

    defaultConfig {
        // applicationId は Hello Android 時代から変えていない。変えると
        // 別アプリ扱いになり、古いアプリが端末に残ってしまうため。
        // 同じ ID + 同じ署名なので、インストールすると上書き更新される。
        applicationId = "com.example.helloandroid"
        minSdk = 24
        targetSdk = 35
        versionCode = 8
        versionName = "3.4"
    }

    // リポジトリに固定の debug keystore を置くことで、ビルドのたびに署名が
    // 変わらないようにしている。これがないと再インストール時に
    // 「署名が一致しません」で弾かれる。
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            // R8 で未使用コードを削る。Compose を丸ごと同梱すると 8MB を
            // 超えるが、実際に使っているのはごく一部なので大きく減る。
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // 配布は Play ストアを通さないサイドロードなので、debug と同じ鍵で
            // 署名する。鍵を変えると既存のインストールを上書きできなくなる。
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
}
