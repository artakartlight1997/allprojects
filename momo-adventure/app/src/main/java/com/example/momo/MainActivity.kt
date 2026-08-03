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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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

        Hud(game)

        if (game.phase == Phase.PLAYING || game.phase == Phase.DYING) {
            Controls(game)
        } else {
            Overlay(game)
        }
    }
}

@Composable
private fun Hud(game: Game) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Badge("♥ ${game.lives}", Color(0xCCFF6B8A))
        Spacer(Modifier.width(10.dp))
        Badge("● ${game.coinCount}", Color(0xCCFFC93D))
        Spacer(Modifier.width(10.dp))
        Badge("${game.score}", Color(0xAA2B2B3A))
        Spacer(Modifier.weight(1f))
        Badge("${game.levelIndex + 1}-${LEVELS.size}  ${game.level.title}", Color(0xAA2B2B3A))
    }
}

@Composable
private fun Badge(text: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(color)
            .padding(horizontal = 12.dp, vertical = 5.dp),
    ) {
        Text(text, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
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

@Composable
private fun Overlay(game: Game) {
    val (title, body, button) = when (game.phase) {
        Phase.TITLE -> Triple(
            "モモの大冒険",
            "◀ ▶ で歩いて、▲ でジャンプ。\n敵は上から踏むとやっつけられます。\nぜんぶで ${LEVELS.size} ステージ！",
            "はじめる",
        )
        Phase.LEVEL_CLEAR -> Triple(
            "ステージ ${game.levelIndex + 1} クリア！",
            "コイン ${game.coinCount} まい / スコア ${game.score}",
            if (game.levelIndex + 1 >= LEVELS.size) "けっか" else "つぎのステージへ",
        )
        Phase.GAME_OVER -> Triple(
            "ゲームオーバー",
            "スコア ${game.score}\nもういちど挑戦しよう！",
            "タイトルへ",
        )
        Phase.ALL_CLEAR -> Triple(
            "ぜんステージ クリア！",
            "おめでとう！\nコイン ${game.coinCount} まい / スコア ${game.score}",
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
                fontSize = 40.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.size(14.dp))
            Text(
                body,
                color = Color(0xFFE8E4F0),
                fontSize = 17.sp,
                lineHeight = 26.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Spacer(Modifier.size(26.dp))
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
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp),
                )
            }
        }
    }
}
