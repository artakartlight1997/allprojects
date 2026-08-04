package com.example.momo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.ceil

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { GameScreen() }
    }
}

/** 操作ボタンの大きさ。小さい端末向けにタイトル画面から変えられる。 */
private val BUTTON_SCALES = listOf(0.78f to "小", 1.0f to "中", 1.22f to "大")

@Composable
fun GameScreen() {
    val game = remember { Game() }
    val viewTilesX = remember { mutableFloatStateOf(20f) }
    var frame by remember { mutableIntStateOf(0) }
    var uiScale by remember { mutableFloatStateOf(1f) }

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

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF101018))
            .onSizeChanged { sz ->
                if (sz.height > 0) {
                    viewTilesX.floatValue = sz.width * VIEW_TILES_Y / sz.height
                }
            },
    ) {
        // 画面の高さに対する比率でボタンを決める。端末が小さくても
        // ゲーム画面に対する占有率が変わらないようにするため。
        val h = maxHeight
        val compact = h < 380.dp
        val moveBtn = (h * 0.185f * uiScale).coerceIn(46.dp, 84.dp)
        val jumpBtn = (h * 0.225f * uiScale).coerceIn(56.dp, 100.dp)
        val pad = (h * 0.045f).coerceIn(10.dp, 22.dp)

        Canvas(modifier = Modifier.fillMaxSize()) {
            frame.let { }   // 毎フレーム描き直すための購読
            drawGame(game)
        }

        // エンディング中は画面を邪魔しないよう HUD を出さない
        if (game.phase != Phase.ENDING) Hud(game, compact)

        when (game.phase) {
            Phase.PLAYING, Phase.DYING -> Controls(game, moveBtn, jumpBtn, pad)
            Phase.ENDING -> EndingOverlay(game)
            else -> Overlay(game, uiScale) { uiScale = it }
        }
    }
}

@Composable
private fun Hud(game: Game, compact: Boolean) {
    val fs = if (compact) 12.sp else 14.sp
    Column(
        modifier = Modifier.padding(
            horizontal = if (compact) 10.dp else 16.dp,
            vertical = if (compact) 5.dp else 8.dp,
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Badge("♥ ${game.lives}", Color(0xCCFF6B8A), fs)
            Spacer(Modifier.width(6.dp))
            Badge("● ${game.coinCount}", Color(0xCCFFC93D), fs)
            Spacer(Modifier.width(6.dp))
            Badge("${game.score}", Color(0xAA2B2B3A), fs)
            Spacer(Modifier.weight(1f))
            if (game.goalLocked) {
                Badge("ボスを たおせ!", Color(0xCCE0483F), fs)
                Spacer(Modifier.width(6.dp))
            }
            Badge(
                if (compact) "${game.levelIndex + 1}/${LEVELS.size}"
                else "${game.levelIndex + 1}/${LEVELS.size}  ${game.level.title}",
                Color(0xAA2B2B3A), fs,
            )
        }
        PowerUps(game, fs)
    }
}

/** 効果時間のあるアイテムを、残り秒数つきで表示する。 */
@Composable
private fun PowerUps(game: Game, fs: androidx.compose.ui.unit.TextUnit) {
    game.hudTick.let { }   // 残り時間を更新するための購読
    val p = game.player
    val items = buildList {
        if (p.starT > 0f) add(Triple("★", p.starT, Color(0xCCFFC93D)))
        if (p.dashT > 0f) add(Triple("⚡", p.dashT, Color(0xCC4FC3F7)))
        if (p.featherT > 0f) add(Triple("羽", p.featherT, Color(0xCC5FD8A0)))
        if (p.magnetT > 0f) add(Triple("磁", p.magnetT, Color(0xCCFF7A7A)))
    }
    if (items.isEmpty() && !p.hasShield) return
    Row(modifier = Modifier.padding(top = 5.dp)) {
        if (p.hasShield) {
            Badge("◎ バリア", Color(0xCC7FB5FF), fs)
            Spacer(Modifier.width(6.dp))
        }
        for ((label, remain, color) in items) {
            Badge("$label ${ceil(remain).toInt()}", color, fs)
            Spacer(Modifier.width(6.dp))
        }
    }
}

@Composable
private fun Badge(text: String, color: Color, fs: androidx.compose.ui.unit.TextUnit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color)
            .padding(horizontal = 9.dp, vertical = 3.dp),
    ) {
        Text(text, color = Color.White, fontSize = fs, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Controls(game: Game, moveBtn: Dp, jumpBtn: Dp, pad: Dp) {
    game.hudTick.let { }   // りなの位置に追従して薄くするための購読

    // 画面下のほうにりながいると、そのままではボタンに隠れてしまう。
    // ステージ開始直後はカメラが左端で止まるので特に重なりやすい。
    // 重なる位置にいるあいだだけボタンを薄くする（押せることは変わらない）。
    val low = game.playerViewY > 0.62f
    val leftAlpha by animateFloatAsState(
        if (low && game.playerViewX < 0.34f) 0.2f else 1f,
        label = "leftPad",
    )
    val rightAlpha by animateFloatAsState(
        if (low && game.playerViewX > 0.74f) 0.2f else 1f,
        label = "jumpPad",
    )

    Box(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = pad, bottom = pad)
                .alpha(leftAlpha),
        ) {
            HoldButton("◀", { game.inputLeft = true }, { game.inputLeft = false }, moveBtn)
            Spacer(Modifier.width(pad * 0.6f))
            HoldButton("▶", { game.inputRight = true }, { game.inputRight = false }, moveBtn)
        }
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = pad, bottom = pad)
                .alpha(rightAlpha),
        ) {
            HoldButton("▲", { game.pressJump() }, { game.releaseJump() }, jumpBtn)
        }
    }
}

@Composable
private fun HoldButton(
    label: String,
    onDown: () -> Unit,
    onUp: () -> Unit,
    size: Dp,
) {
    // 押されたままボタンが画面から消えると「離した」イベントが届かないので、
    // 破棄されるときに必ず離した扱いにする。
    DisposableEffect(Unit) {
        onDispose { onUp() }
    }
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(Color(0x40FFFFFF))
            .border(2.dp, Color(0x8CFFFFFF), CircleShape)
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
        Text(
            label,
            color = Color.White,
            fontSize = (size.value / 3f).sp,
            fontWeight = FontWeight.Bold,
        )
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
private fun Overlay(game: Game, uiScale: Float, onUiScale: (Float) -> Unit) {
    val (title, body, button) = when (game.phase) {
        Phase.TITLE -> Triple(
            "りなの大冒険",
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
            Text(title, color = Color(0xFFFFE9F2), fontSize = 36.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.size(10.dp))
            Text(
                body,
                color = Color(0xFFE8E4F0),
                fontSize = 15.sp,
                lineHeight = 23.sp,
                textAlign = TextAlign.Center,
            )
            if (game.phase == Phase.TITLE) {
                Spacer(Modifier.size(14.dp))
                ButtonSizePicker(uiScale, onUiScale)
            }
            Spacer(Modifier.size(18.dp))
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

/** 画面が小さい端末向けに、操作ボタンの大きさを選べるようにする。 */
@Composable
private fun ButtonSizePicker(uiScale: Float, onUiScale: (Float) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("ボタンの大きさ", color = Color(0xFFB9A9C9), fontSize = 14.sp)
        Spacer(Modifier.width(10.dp))
        for ((scale, label) in BUTTON_SCALES) {
            val selected = uiScale == scale
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (selected) Color(0xFFFF8FBB) else Color(0x33FFFFFF))
                    .clickable { onUiScale(scale) }
                    .padding(horizontal = 16.dp, vertical = 6.dp),
            ) {
                Text(
                    label,
                    color = if (selected) Color(0xFF3A2430) else Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.width(8.dp))
        }
    }
}
