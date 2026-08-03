package com.example.momo

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

// --- 配色 ---------------------------------------------------------------
private val MOMO_BODY = Color(0xFFFF9EC4)
private val MOMO_DARK = Color(0xFFE979AC)
private val MOMO_FOOT = Color(0xFFFFE0EC)
private val INK = Color(0xFF41303A)
private val WHITE = Color(0xFFFFFFFF)
private val CHEEK = Color(0xFFFF6F9C)

private val PUNI_BODY = Color(0xFF86DC64)
private val PUNI_DARK = Color(0xFF5FB841)
private val TOGE_BODY = Color(0xFFB289E8)
private val TOGE_DARK = Color(0xFF8A5FC9)
private val PATA_BODY = Color(0xFF7BD5F2)
private val PATA_DARK = Color(0xFF4FB2D6)

private val COIN_A = Color(0xFFFFD84D)
private val COIN_B = Color(0xFFFFF3B0)
private val COIN_C = Color(0xFFE0A81E)
private val HEART_A = Color(0xFFFF6B8A)
private val STAR_A = Color(0xFFFFE066)

private class Palette(
    val skyTop: Color,
    val skyBottom: Color,
    val hillBack: Color,
    val hillFront: Color,
    val dirt: Color,
    val dirtDark: Color,
    val surface: Color,
    val platform: Color,
    val cloud: Color,
)

private fun paletteOf(theme: Theme): Palette = when (theme) {
    Theme.GRASS -> Palette(
        skyTop = Color(0xFF7EC8F5), skyBottom = Color(0xFFD6F0FF),
        hillBack = Color(0xFF9AD98C), hillFront = Color(0xFF6FC162),
        dirt = Color(0xFFB5793F), dirtDark = Color(0xFF8E5A2B),
        surface = Color(0xFF6FC162), platform = Color(0xFFCE9A5E),
        cloud = Color(0xFFFFFFFF),
    )
    Theme.CAVE -> Palette(
        skyTop = Color(0xFF241B3D), skyBottom = Color(0xFF48336B),
        hillBack = Color(0xFF3A2B57), hillFront = Color(0xFF2C2043),
        dirt = Color(0xFF6B5A8A), dirtDark = Color(0xFF4A3D63),
        surface = Color(0xFF8E79B5), platform = Color(0xFF7C6AA0),
        cloud = Color(0x66B79CFF),
    )
    Theme.SKY -> Palette(
        skyTop = Color(0xFFFFA46B), skyBottom = Color(0xFFFFE3C4),
        hillBack = Color(0xFFFFC48A), hillFront = Color(0xFFFFB073),
        dirt = Color(0xFFE8E0F5), dirtDark = Color(0xFFC9BEE0),
        surface = Color(0xFFFFFFFF), platform = Color(0xFFEDE4FA),
        cloud = Color(0xFFFFFFFF),
    )
}

// --- エントリポイント ----------------------------------------------------
fun DrawScope.drawGame(game: Game) {
    val s = size.height / VIEW_TILES_Y
    val cam = game.cameraX
    val pal = paletteOf(game.level.theme)

    drawBackground(pal, cam, s, game.elapsed)
    drawTiles(game, pal, cam, s)
    drawGoal(game, cam, s)
    drawPickups(game, cam, s)
    drawEnemies(game, cam, s)
    drawPlayer(game, cam, s)
    drawPops(game, cam, s)
}

private fun DrawScope.drawBackground(pal: Palette, cam: Float, s: Float, time: Float) {
    drawRect(
        brush = Brush.verticalGradient(listOf(pal.skyTop, pal.skyBottom)),
        topLeft = Offset.Zero,
        size = size,
    )

    // 太陽 / 光源
    drawCircle(
        color = pal.cloud.copy(alpha = 0.35f),
        radius = s * 2.2f,
        center = Offset(size.width * 0.78f, size.height * 0.18f),
    )

    // 雲（弱い視差）
    val cloudShift = -cam * s * 0.15f
    for (i in 0 until 14) {
        val bx = i * 9f * s + cloudShift
        val x = ((bx % (size.width + 6 * s)) + size.width + 6 * s) % (size.width + 6 * s) - 3 * s
        val y = size.height * (0.10f + 0.07f * ((i * 7) % 5))
        val r = s * (0.55f + 0.12f * ((i * 3) % 4))
        drawCircle(pal.cloud.copy(alpha = 0.75f), r, Offset(x, y))
        drawCircle(pal.cloud.copy(alpha = 0.75f), r * 0.8f, Offset(x + r, y + r * 0.2f))
        drawCircle(pal.cloud.copy(alpha = 0.75f), r * 0.7f, Offset(x - r, y + r * 0.25f))
    }

    // 遠景の丘（強い視差）。ステージ後半でも描画回数が増えないよう、
    // 画面に入る範囲のインデックスだけを回す。
    val hillShift = -cam * s * 0.4f
    for (layer in 0 until 2) {
        val color = if (layer == 0) pal.hillBack else pal.hillFront
        val baseY = size.height * (if (layer == 0) 0.72f else 0.82f)
        val r = s * (if (layer == 0) 3.4f else 2.6f)
        val step = r * 1.5f
        val shift = hillShift * (if (layer == 0) 0.6f else 1f)
        val firstI = floor((-shift - step) / step).toInt()
        val lastI = ceil((size.width - shift + step) / step).toInt()
        for (i in firstI..lastI) {
            drawCircle(color, r, Offset(i * step + shift, baseY + r * 0.55f))
        }
        drawRect(color, Offset(0f, baseY + r * 0.5f), Size(size.width, size.height))
    }
}

private fun DrawScope.drawTiles(game: Game, pal: Palette, cam: Float, s: Float) {
    val level = game.level
    val first = floor(cam).toInt().coerceAtLeast(0)
    val last = (cam + size.width / s + 2f).toInt().coerceAtMost(level.width - 1)
    for (ty in 0 until level.height) {
        for (tx in first..last) {
            val c = level.tiles[ty][tx]
            if (c == '.') continue
            val x = (tx - cam) * s
            val y = ty * s
            when (c) {
                '#' -> {
                    val open = ty == 0 || level.tiles[ty - 1][tx] != '#'
                    drawRect(pal.dirt, Offset(x, y), Size(s, s))
                    drawRect(pal.dirtDark, Offset(x, y + s * 0.82f), Size(s, s * 0.18f))
                    if (open) {
                        drawRect(pal.surface, Offset(x, y), Size(s, s * 0.3f))
                        drawCircle(pal.surface, s * 0.16f, Offset(x + s * 0.25f, y + s * 0.3f))
                        drawCircle(pal.surface, s * 0.13f, Offset(x + s * 0.7f, y + s * 0.31f))
                    } else {
                        drawCircle(
                            pal.dirtDark.copy(alpha = 0.5f), s * 0.09f,
                            Offset(x + s * 0.3f, y + s * 0.4f),
                        )
                    }
                }
                '=' -> {
                    drawRoundRect(
                        pal.platform, Offset(x, y), Size(s, s * 0.62f),
                        CornerRadius(s * 0.18f, s * 0.18f),
                    )
                    drawRect(pal.surface, Offset(x, y), Size(s, s * 0.2f))
                }
                '?' -> {
                    drawRoundRect(
                        Color(0xFFF6C445), Offset(x + s * 0.03f, y + s * 0.03f),
                        Size(s * 0.94f, s * 0.94f), CornerRadius(s * 0.16f, s * 0.16f),
                    )
                    drawRoundRect(
                        Color(0xFFFFE08A), Offset(x + s * 0.14f, y + s * 0.14f),
                        Size(s * 0.72f, s * 0.72f), CornerRadius(s * 0.12f, s * 0.12f),
                    )
                    // 「?」の代わりに丸と点
                    drawArc(
                        Color(0xFFB07714), startAngle = 160f, sweepAngle = 250f, useCenter = false,
                        topLeft = Offset(x + s * 0.32f, y + s * 0.22f),
                        size = Size(s * 0.36f, s * 0.34f),
                        style = androidx.compose.ui.graphics.drawscope.Stroke(width = s * 0.1f),
                    )
                    drawCircle(Color(0xFFB07714), s * 0.06f, Offset(x + s * 0.5f, y + s * 0.72f))
                }
                'x' -> {
                    drawRoundRect(
                        Color(0xFF9A7B52), Offset(x + s * 0.03f, y + s * 0.03f),
                        Size(s * 0.94f, s * 0.94f), CornerRadius(s * 0.16f, s * 0.16f),
                    )
                    drawRoundRect(
                        Color(0xFF7E6342), Offset(x + s * 0.16f, y + s * 0.16f),
                        Size(s * 0.68f, s * 0.68f), CornerRadius(s * 0.1f, s * 0.1f),
                    )
                }
                's' -> {
                    val n = 3
                    for (i in 0 until n) {
                        val bx = x + s * i / n
                        val p = Path().apply {
                            moveTo(bx, y + s)
                            lineTo(bx + s / (n * 2f), y + s * 0.18f)
                            lineTo(bx + s / n, y + s)
                            close()
                        }
                        drawPath(p, Color(0xFFD6DDE6))
                    }
                    drawRect(Color(0xFF9AA6B5), Offset(x, y + s * 0.86f), Size(s, s * 0.14f))
                }
            }
        }
    }
}

private fun DrawScope.drawGoal(game: Game, cam: Float, s: Float) {
    val level = game.level
    val x = (level.goalX - cam) * s
    val yBase = level.goalY * s
    val height = s * 4f
    drawRoundRect(
        Color(0xFFBFC7D2), Offset(x + s * 0.42f, yBase - height),
        Size(s * 0.16f, height), CornerRadius(s * 0.08f, s * 0.08f),
    )
    drawCircle(Color(0xFFFFD84D), s * 0.2f, Offset(x + s * 0.5f, yBase - height))
    val wave = sin(game.elapsed * 3f) * s * 0.12f
    val flag = Path().apply {
        moveTo(x + s * 0.56f, yBase - height + s * 0.15f)
        lineTo(x + s * 2.0f + wave, yBase - height + s * 0.75f)
        lineTo(x + s * 0.56f, yBase - height + s * 1.35f)
        close()
    }
    drawPath(flag, Color(0xFFFF7BA8))
    drawRoundRect(
        Color(0xFF8C93A1), Offset(x + s * 0.2f, yBase - s * 0.3f),
        Size(s * 0.6f, s * 0.3f), CornerRadius(s * 0.08f, s * 0.08f),
    )
}

// --- アイテム -----------------------------------------------------------
private fun DrawScope.drawPickups(game: Game, cam: Float, s: Float) {
    for (pk in game.pickups) {
        if (pk.taken) continue
        val cx = (pk.x + 0.5f - cam) * s
        if (cx < -s || cx > size.width + s) continue
        val bob = sin(pk.t * 3f + pk.x) * s * 0.08f
        val cy = (pk.y + 0.5f) * s + bob
        when (pk.kind) {
            PickupKind.COIN -> drawCoin(cx, cy, s * 0.3f, pk.t)
            PickupKind.HEART -> drawHeart(cx, cy, s * 0.34f)
            PickupKind.STAR -> drawStar(cx, cy, s * 0.38f, pk.t)
        }
    }
}

private fun DrawScope.drawCoin(cx: Float, cy: Float, r: Float, t: Float) {
    val squeeze = abs(cos(t * 3.2f)).coerceAtLeast(0.18f)
    scale(squeeze, 1f, Offset(cx, cy)) {
        drawCircle(COIN_C, r, Offset(cx, cy))
        drawCircle(COIN_A, r * 0.84f, Offset(cx, cy))
        drawCircle(COIN_B, r * 0.34f, Offset(cx - r * 0.22f, cy - r * 0.24f))
    }
}

private fun DrawScope.drawHeart(cx: Float, cy: Float, r: Float) {
    drawCircle(HEART_A, r * 0.52f, Offset(cx - r * 0.42f, cy - r * 0.28f))
    drawCircle(HEART_A, r * 0.52f, Offset(cx + r * 0.42f, cy - r * 0.28f))
    val p = Path().apply {
        moveTo(cx - r * 0.9f, cy - r * 0.16f)
        lineTo(cx, cy + r * 0.92f)
        lineTo(cx + r * 0.9f, cy - r * 0.16f)
        close()
    }
    drawPath(p, HEART_A)
    drawCircle(WHITE.copy(alpha = 0.75f), r * 0.16f, Offset(cx - r * 0.42f, cy - r * 0.4f))
}

private fun DrawScope.drawStar(cx: Float, cy: Float, r: Float, t: Float) {
    rotate(t * 90f, Offset(cx, cy)) {
        val p = Path()
        for (i in 0 until 10) {
            val rr = if (i % 2 == 0) r else r * 0.45f
            val a = (-90f + i * 36f) * (Math.PI / 180.0).toFloat()
            val px = cx + cos(a) * rr
            val py = cy + sin(a) * rr
            if (i == 0) p.moveTo(px, py) else p.lineTo(px, py)
        }
        p.close()
        drawPath(p, STAR_A)
    }
    drawCircle(WHITE.copy(alpha = 0.85f), r * 0.14f, Offset(cx - r * 0.16f, cy - r * 0.18f))
}

private fun DrawScope.drawPops(game: Game, cam: Float, s: Float) {
    for (pop in game.pops) {
        val a = 1f - pop.t / 0.7f
        if (a <= 0f) continue
        val cx = (pop.x - cam) * s
        val cy = (pop.y + 0.5f) * s - pop.t * s * 2.4f
        when (pop.kind) {
            PickupKind.COIN -> drawCoin(cx, cy, s * 0.26f * a, 0f)
            PickupKind.HEART -> drawHeart(cx, cy, s * 0.3f * a)
            PickupKind.STAR -> drawStar(cx, cy, s * 0.32f * a, pop.t)
        }
    }
}

// --- 敵 ------------------------------------------------------------------
private fun DrawScope.drawEnemies(game: Game, cam: Float, s: Float) {
    for (e in game.enemies) {
        val x = (e.x - cam) * s
        if (x < -2 * s || x > size.width + 2 * s) continue
        val y = e.y * s
        val w = e.w * s
        val h = e.h * s
        if (!e.alive) {
            val k = (1f - e.squashT / 0.6f).coerceIn(0f, 1f)
            val body = when (e.kind) {
                EnemyKind.WALKER -> PUNI_BODY
                EnemyKind.SPIKY -> TOGE_BODY
                EnemyKind.FLYER -> PATA_BODY
            }
            drawOval(
                body.copy(alpha = k),
                Offset(x - w * 0.1f, y + h * 0.66f),
                Size(w * 1.2f, h * 0.34f * k),
            )
            continue
        }
        when (e.kind) {
            EnemyKind.WALKER -> drawWalker(x, y, w, h, e.t, e.vx > 0f)
            EnemyKind.SPIKY -> drawSpiky(x, y, w, h, e.t)
            EnemyKind.FLYER -> drawFlyer(x, y, w, h, e.t, e.vx > 0f)
        }
    }
}

private fun DrawScope.drawWalker(x: Float, y: Float, w: Float, h: Float, t: Float, right: Boolean) {
    val cx = x + w / 2f
    val squash = 1f + sin(t * 8f) * 0.06f
    val bodyR = w * 0.46f
    // 足
    val step = sin(t * 8f) * w * 0.12f
    drawOval(PUNI_DARK, Offset(cx - w * 0.36f + step, y + h * 0.78f), Size(w * 0.3f, h * 0.24f))
    drawOval(PUNI_DARK, Offset(cx + w * 0.06f - step, y + h * 0.78f), Size(w * 0.3f, h * 0.24f))
    // 体
    scale(1f / squash, squash, Offset(cx, y + h)) {
        drawCircle(PUNI_BODY, bodyR, Offset(cx, y + h * 0.48f))
        drawArc(
            PUNI_DARK, startAngle = 0f, sweepAngle = 180f, useCenter = true,
            topLeft = Offset(cx - bodyR, y + h * 0.48f - bodyR * 0.1f),
            size = Size(bodyR * 2f, bodyR * 1.1f),
        )
    }
    // 目
    val ex = if (right) w * 0.06f else -w * 0.06f
    drawCircle(WHITE, w * 0.15f, Offset(cx - w * 0.17f + ex, y + h * 0.4f))
    drawCircle(WHITE, w * 0.15f, Offset(cx + w * 0.17f + ex, y + h * 0.4f))
    drawCircle(INK, w * 0.075f, Offset(cx - w * 0.15f + ex, y + h * 0.41f))
    drawCircle(INK, w * 0.075f, Offset(cx + w * 0.19f + ex, y + h * 0.41f))
    // 口
    drawArc(
        INK, startAngle = 20f, sweepAngle = 140f, useCenter = false,
        topLeft = Offset(cx - w * 0.12f, y + h * 0.5f), size = Size(w * 0.24f, h * 0.14f),
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = w * 0.045f),
    )
}

private fun DrawScope.drawSpiky(x: Float, y: Float, w: Float, h: Float, t: Float) {
    val cx = x + w / 2f
    val cy = y + h * 0.52f
    val r = w * 0.4f
    // トゲ
    for (i in 0 until 8) {
        val a = (i * 45f - 90f) * (Math.PI / 180.0).toFloat()
        val p = Path().apply {
            moveTo(cx + cos(a - 0.28f) * r, cy + sin(a - 0.28f) * r)
            lineTo(cx + cos(a) * r * 1.52f, cy + sin(a) * r * 1.52f)
            lineTo(cx + cos(a + 0.28f) * r, cy + sin(a + 0.28f) * r)
            close()
        }
        drawPath(p, TOGE_DARK)
    }
    drawCircle(TOGE_BODY, r, Offset(cx, cy))
    drawCircle(TOGE_DARK.copy(alpha = 0.35f), r * 0.72f, Offset(cx, cy + r * 0.2f))
    // 目（つり目）
    drawCircle(WHITE, w * 0.14f, Offset(cx - w * 0.15f, cy - h * 0.04f))
    drawCircle(WHITE, w * 0.14f, Offset(cx + w * 0.15f, cy - h * 0.04f))
    drawCircle(INK, w * 0.07f, Offset(cx - w * 0.13f, cy - h * 0.02f))
    drawCircle(INK, w * 0.07f, Offset(cx + w * 0.17f, cy - h * 0.02f))
    val blink = w * 0.055f
    drawLine(
        INK, Offset(cx - w * 0.28f, cy - h * 0.2f), Offset(cx - w * 0.04f, cy - h * 0.11f),
        strokeWidth = blink,
    )
    drawLine(
        INK, Offset(cx + w * 0.28f, cy - h * 0.2f), Offset(cx + w * 0.04f, cy - h * 0.11f),
        strokeWidth = blink,
    )
    // 口
    drawArc(
        INK, startAngle = 200f, sweepAngle = 140f, useCenter = false,
        topLeft = Offset(cx - w * 0.1f, cy + h * 0.16f), size = Size(w * 0.2f, h * 0.12f),
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = w * 0.04f),
    )
    // ゆれ
    if (sin(t * 6f) > 0.9f) {
        drawCircle(WHITE.copy(alpha = 0.3f), r * 0.3f, Offset(cx - r * 0.4f, cy - r * 0.45f))
    }
}

private fun DrawScope.drawFlyer(x: Float, y: Float, w: Float, h: Float, t: Float, right: Boolean) {
    val cx = x + w / 2f
    val cy = y + h * 0.5f
    val r = w * 0.36f
    val flap = abs(sin(t * 9f))
    // 羽
    for (side in listOf(-1f, 1f)) {
        drawOval(
            PATA_DARK.copy(alpha = 0.9f),
            Offset(cx + side * r * (0.55f) - r * 0.7f * (if (side < 0) 1f else 0f), cy - r * 0.5f),
            Size(r * 0.7f, r * (0.5f + flap * 0.9f)),
        )
    }
    drawCircle(PATA_BODY, r, Offset(cx, cy))
    drawCircle(WHITE.copy(alpha = 0.35f), r * 0.55f, Offset(cx - r * 0.25f, cy - r * 0.3f))
    val ex = if (right) w * 0.04f else -w * 0.04f
    drawCircle(WHITE, w * 0.13f, Offset(cx - w * 0.13f + ex, cy - h * 0.02f))
    drawCircle(WHITE, w * 0.13f, Offset(cx + w * 0.13f + ex, cy - h * 0.02f))
    drawCircle(INK, w * 0.065f, Offset(cx - w * 0.11f + ex, cy))
    drawCircle(INK, w * 0.065f, Offset(cx + w * 0.15f + ex, cy))
    // くちばし
    val bp = Path().apply {
        val bx = cx + (if (right) r * 0.85f else -r * 0.85f)
        moveTo(bx, cy + h * 0.02f)
        lineTo(bx + (if (right) r * 0.45f else -r * 0.45f), cy + h * 0.09f)
        lineTo(bx, cy + h * 0.16f)
        close()
    }
    drawPath(bp, Color(0xFFFFC24D))
}

// --- 主人公 モモ ---------------------------------------------------------
private fun DrawScope.drawPlayer(game: Game, cam: Float, s: Float) {
    val p = game.player
    val x = (p.x - cam) * s
    val y = p.y * s
    val w = Player.W * s
    val h = Player.H * s
    val cx = x + w / 2f

    // 無敵中は色が虹色に変わる。ダメージ直後は点滅。
    val star = p.starT > 0f
    val body = if (star) {
        val k = (sin(p.animT * 18f) * 0.5f + 0.5f)
        Color(1f, 0.55f + 0.35f * k, 0.35f + 0.55f * (1f - k), 1f)
    } else MOMO_BODY
    val dark = if (star) body.copy(alpha = 0.65f) else MOMO_DARK
    if (p.hurtT > 0f && !star && sin(p.animT * 40f) < 0f) return

    val moving = (game.phase == Phase.PLAYING) && (game.inputLeft || game.inputRight) && p.onGround
    val stepPhase = if (moving) sin(p.animT * 13f) else 0f
    val air = !p.onGround
    val stretch = if (air) (1f + (p.vy / 60f)).coerceIn(0.86f, 1.16f) else
        1f + sin(p.animT * 13f) * 0.03f

    // 足
    drawOval(
        MOMO_FOOT,
        Offset(cx - w * 0.4f + stepPhase * w * 0.14f, y + h * 0.8f),
        Size(w * 0.34f, h * 0.2f),
    )
    drawOval(
        MOMO_FOOT,
        Offset(cx + w * 0.06f - stepPhase * w * 0.14f, y + h * 0.8f),
        Size(w * 0.34f, h * 0.2f),
    )

    scale(1f / stretch, stretch, Offset(cx, y + h)) {
        // 耳
        drawCircle(body, w * 0.19f, Offset(cx - w * 0.32f, y + h * 0.15f))
        drawCircle(body, w * 0.19f, Offset(cx + w * 0.32f, y + h * 0.15f))
        drawCircle(dark.copy(alpha = 0.55f), w * 0.1f, Offset(cx - w * 0.32f, y + h * 0.16f))
        drawCircle(dark.copy(alpha = 0.55f), w * 0.1f, Offset(cx + w * 0.32f, y + h * 0.16f))
        // 体
        drawRoundRect(
            body, Offset(cx - w * 0.46f, y + h * 0.16f), Size(w * 0.92f, h * 0.68f),
            CornerRadius(w * 0.42f, h * 0.36f),
        )
        // おなかの模様
        drawOval(
            WHITE.copy(alpha = 0.55f),
            Offset(cx - w * 0.24f, y + h * 0.48f), Size(w * 0.48f, h * 0.3f),
        )
        // ほっぺ
        drawCircle(CHEEK.copy(alpha = 0.55f), w * 0.11f, Offset(cx - w * 0.31f, y + h * 0.45f))
        drawCircle(CHEEK.copy(alpha = 0.55f), w * 0.11f, Offset(cx + w * 0.31f, y + h * 0.45f))
        // 目
        val ex = if (p.faceRight) w * 0.05f else -w * 0.05f
        drawCircle(WHITE, w * 0.16f, Offset(cx - w * 0.17f + ex, y + h * 0.36f))
        drawCircle(WHITE, w * 0.16f, Offset(cx + w * 0.17f + ex, y + h * 0.36f))
        drawCircle(INK, w * 0.085f, Offset(cx - w * 0.15f + ex, y + h * 0.375f))
        drawCircle(INK, w * 0.085f, Offset(cx + w * 0.19f + ex, y + h * 0.375f))
        drawCircle(WHITE, w * 0.03f, Offset(cx - w * 0.17f + ex, y + h * 0.35f))
        drawCircle(WHITE, w * 0.03f, Offset(cx + w * 0.17f + ex, y + h * 0.35f))
        // 口
        drawArc(
            INK, startAngle = 15f, sweepAngle = 150f, useCenter = false,
            topLeft = Offset(cx - w * 0.1f + ex, y + h * 0.45f),
            size = Size(w * 0.2f, h * 0.12f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = w * 0.04f),
        )
    }

    if (star) {
        val a = (sin(p.animT * 12f) * 0.5f + 0.5f) * 0.5f
        drawCircle(STAR_A.copy(alpha = a), w * 0.8f, Offset(cx, y + h * 0.5f))
    }
}
