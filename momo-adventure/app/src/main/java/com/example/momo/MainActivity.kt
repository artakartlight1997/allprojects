package com.example.momo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.ceil

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { GameScreen() }
    }
}

@Composable
fun GameScreen() {
    val game = remember { Game() }
    val viewTilesX = remember { mutableFloatStateOf(20f) }
    var frame by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        var last = 0L
        while (true) {
            withFrameNanos { now ->
                val dt = if (last == 0L) 0f
                else ((now - last) / 1_000_000_000f).coerceIn(0f, 0.05f)
                last = now
                game.update(dt, viewTilesX.floatValue)
                frame++
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF101018))
            .onSizeChanged { sz ->
                if (sz.height > 0) {
                    viewTilesX.floatValue = sz.width * VIEW_TILES_Y / sz.height
                }
            },
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            frame.let { }   // 毎フレーム描き直すための購読
            drawGame(game)
        }

        // エンディング中は画面を邪魔しないよう HUD を出さない
        if (game.phase != Phase.ENDING) Hud(game)

        when (game.phase) {
            Phase.PLAYING, Phase.DYING -> Controls(game)
            Phase.ENDING -> EndingOverlay(game)
            else -> Overlay(game)
        }
    }
}

@Composable
private fun Hud(game: Game) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Badge("♥ ${game.lives}", Color(0xCCFF6B8A))
            Spacer(Modifier.width(8.dp))
            Badge("● ${game.coinCount}", Color(0xCCFFC93D))
            Spacer(Modifier.width(8.dp))
            Badge("${game.score}", Color(0xAA2B2B3A))
            Spacer(Modifier.weight(1f))
            if (game.goalLocked) {
                Badge("ボスを たおせ!", Color(0xCCE0483F))
                Spacer(Modifier.width(8.dp))
            }
            Badge(
                "${game.levelIndex + 1}/${LEVELS.size}  ${game.level.title}",
                Color(0xAA2B2B3A),
            )
        }
        PowerUps(game)
    }
}

/** 効果時間のあるアイテムを、残り秒数つきで表示する。 */
@Composable
private fun PowerUps(game: Game) {
    game.hudTick.let { }   // 残り時間を更新するための購読
    val p = game.player
    val items = buildList {
        if (p.starT > 0f) add(Triple("★ 無敵", p.starT, Color(0xCCFFC93D)))
        if (p.dashT > 0f) add(Triple("⚡ ダッシュ", p.dashT, Color(0xCC4FC3F7)))
        if (p.featherT > 0f) add(Triple("羽 二段ジャンプ", p.featherT, Color(0xCC5FD8A0)))
        if (p.magnetT > 0f) add(Triple("磁 マグネット", p.magnetT, Color(0xCCFF7A7A)))
    }
    if (items.isEmpty() && !p.hasShield) return
    Row(modifier = Modifier.padding(top = 6.dp)) {
        if (p.hasShield) {
            Badge("◎ バリア", Color(0xCC7FB5FF))
            Spacer(Modifier.width(8.dp))
        }
        for ((label, remain, color) in items) {
            Badge("$label ${ceil(remain).toInt()}", color)
            Spacer(Modifier.width(8.dp))
        }
    }
}

@Composable
private fun Badge(text: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(13.dp))
            .background(color)
            .padding(horizontal = 11.dp, vertical = 4.dp),
    ) {
        Text(text, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Controls(game: Game) {
    Box(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 22.dp, bottom = 22.dp),
        ) {
            HoldButton("◀", { game.inputLeft = true }, { game.inputLeft = false })
            Spacer(Modifier.width(14.dp))
            HoldButton("▶", { game.inputRight = true }, { game.inputRight = false })
        }
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 26.dp, bottom = 22.dp),
        ) {
            HoldButton("▲", { game.pressJump() }, { game.releaseJump() }, size = 96)
        }
    }
}

@Composable
private fun HoldButton(
    label: String,
    onDown: () -> Unit,
    onUp: () -> Unit,
    size: Int = 82,
) {
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(Color(0x4DFFFFFF))
            .border(2.dp, Color(0x99FFFFFF), CircleShape)
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        awaitFirstDown(requireUnconsumed = false)
                        onDown()
                        while (true) {
                            val event = awaitPointerEvent()
                            if (event.changes.none { it.pressed }) break
                        }
                        onUp()
                    }
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Color.White, fontSize = (size / 3).sp, fontWeight = FontWeight.Bold)
    }
}

/**
 * エンディング中は暗幕を出さず、スタッフロールをそのまま見せる。
 * 見飽きた人のために少し経ってから先へ進むボタンだけ出す。
 */
@Composable
private fun EndingOverlay(game: Game) {
    game.hudTick.let { }
    if (game.endingT < 4f) return
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(end = 24.dp, bottom = 20.dp),
        contentAlignment = Alignment.BottomEnd,
    ) {
        Button(
            onClick = { game.advance() },
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xCCFF8FBB),
                contentColor = Color(0xFF3A2430),
            ),
            shape = RoundedCornerShape(24.dp),
        ) {
            Text(
                "けっかを みる",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp),
            )
        }
    }
}

@Composable
private fun Overlay(game: Game) {
    val (title, body, button) = when (game.phase) {
        Phase.TITLE -> Triple(
            "モモの大冒険",
            "◀ ▶ で歩いて、▲ でジャンプ（長押しで高く跳ぶ）\n" +
                "敵は上から踏むとやっつけられる。紫のトゲだけは踏めない！\n" +
                "ぜんぶで ${LEVELS.size} ステージ。最後はボスが待っている",
            "ぼうけんを はじめる",
        )
        Phase.LEVEL_CLEAR -> Triple(
            "ステージ ${game.levelIndex + 1} クリア！",
            "コイン ${game.coinCount} まい / スコア ${game.score}\n" +
                if (game.lastBonus > 0) "タイムボーナス +${game.lastBonus}" else "つぎはもっと速く！",
            if (game.levelIndex + 1 >= LEVELS.size) "けっかを みる" else "つぎのステージへ",
        )
        Phase.GAME_OVER -> Triple(
            "ゲームオーバー",
            "スコア ${game.score}\nもういちど挑戦しよう！",
            "タイトルへ",
        )
        Phase.ALL_CLEAR -> Triple(
            "ぼうけんの きろく",
            "ぜん ${LEVELS.size} ステージ クリア！\n" +
                "あつめたコイン ${game.coinCount} まい\n" +
                "さいしゅうスコア ${game.score}\n" +
                "クリアタイム ${(game.totalTime / 60f).toInt()}分" +
                "${(game.totalTime % 60f).toInt()}秒",
            "タイトルへ",
        )
        else -> Triple("", "", "")
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xAA000000)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                title,
                color = Color(0xFFFFE9F2),
                fontSize = 38.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.size(12.dp))
            Text(
                body,
                color = Color(0xFFE8E4F0),
                fontSize = 16.sp,
                lineHeight = 25.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.size(22.dp))
            Button(
                onClick = { game.advance() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFF8FBB),
                    contentColor = Color(0xFF3A2430),
                ),
                shape = RoundedCornerShape(28.dp),
            ) {
                Text(
                    button,
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp),
                )
            }
        }
    }
}
