package com.example.momo

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.nativeCanvas
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

// --- 配色 ---------------------------------------------------------------
private val RINA_BODY = Color(0xFFFF9EC4)
private val RINA_DARK = Color(0xFFE979AC)
private val RINA_FOOT = Color(0xFFFFE0EC)
private val INK = Color(0xFF41303A)
private val WHITE = Color(0xFFFFFFFF)
private val CHEEK = Color(0xFFFF6F9C)

private val PUNI_BODY = Color(0xFF86DC64)
private val PUNI_DARK = Color(0xFF5FB841)
private val TOGE_BODY = Color(0xFFB289E8)
private val TOGE_DARK = Color(0xFF8A5FC9)
private val PATA_BODY = Color(0xFF7BD5F2)
private val PATA_DARK = Color(0xFF4FB2D6)
private val PYON_BODY = Color(0xFFFFC163)
private val PYON_DARK = Color(0xFFE0913A)
private val OIKA_BODY = Color(0xFFFF7F6B)
private val OIKA_DARK = Color(0xFFD9553F)
private val BOSS_BODY = Color(0xFF6E5BA6)
private val BOSS_DARK = Color(0xFF473772)

private val COIN_A = Color(0xFFFFD84D)
private val COIN_B = Color(0xFFFFF3B0)
private val COIN_C = Color(0xFFE0A81E)
private val GEM_A = Color(0xFF6BE3E0)
private val GEM_B = Color(0xFFB6FFFD)
private val HEART_A = Color(0xFFFF6B8A)
private val STAR_A = Color(0xFFFFE066)
private val DASH_A = Color(0xFF4FC3F7)
private val FEATHER_A = Color(0xFFB2F5C4)
private val SHIELD_A = Color(0xFF7FB5FF)
private val MAGNET_A = Color(0xFFFF7A7A)

private val popPaint = android.graphics.Paint().apply {
    isAntiAlias = true
    textAlign = android.graphics.Paint.Align.CENTER
    typeface = android.graphics.Typeface.DEFAULT_BOLD
}

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
    val hazard: Color,
    val hazardBase: Color,
)

private fun paletteOf(theme: Theme): Palette = when (theme) {
    Theme.GRASS -> Palette(
        Color(0xFF7EC8F5), Color(0xFFD6F0FF), Color(0xFF9AD98C), Color(0xFF6FC162),
        Color(0xFFB5793F), Color(0xFF8E5A2B), Color(0xFF6FC162), Color(0xFFCE9A5E),
        Color(0xFFFFFFFF), Color(0xFFD6DDE6), Color(0xFF9AA6B5),
    )
    Theme.MEADOW -> Palette(
        Color(0xFF8FD9F0), Color(0xFFFFF0D8), Color(0xFFC7E89B), Color(0xFF8FCF6E),
        Color(0xFFC08A54), Color(0xFF98673A), Color(0xFF8FCF6E), Color(0xFFDCA96D),
        Color(0xFFFFFFFF), Color(0xFFD6DDE6), Color(0xFF9AA6B5),
    )
    Theme.CAVE -> Palette(
        Color(0xFF241B3D), Color(0xFF48336B), Color(0xFF3A2B57), Color(0xFF2C2043),
        Color(0xFF6B5A8A), Color(0xFF4A3D63), Color(0xFF8E79B5), Color(0xFF7C6AA0),
        Color(0x66B79CFF), Color(0xFFD6DDE6), Color(0xFF9AA6B5),
    )
    Theme.WATER -> Palette(
        Color(0xFF1E6B8C), Color(0xFF7ED4E0), Color(0xFF3E9CB0), Color(0xFF2A7E96),
        Color(0xFF5E9CA8), Color(0xFF3F7484), Color(0xFF8FE3E8), Color(0xFF79C4CE),
        Color(0xFFDFF7FF), Color(0xFFB9EAF2), Color(0xFF6FA8B5),
    )
    Theme.SKY -> Palette(
        Color(0xFFFFA46B), Color(0xFFFFE3C4), Color(0xFFFFC48A), Color(0xFFFFB073),
        Color(0xFFE8E0F5), Color(0xFFC9BEE0), Color(0xFFFFFFFF), Color(0xFFEDE4FA),
        Color(0xFFFFFFFF), Color(0xFFD6DDE6), Color(0xFF9AA6B5),
    )
    Theme.SNOW -> Palette(
        Color(0xFF9FC8E8), Color(0xFFEAF6FF), Color(0xFFCFE4F2), Color(0xFFB4D4E8),
        Color(0xFFDCE9F2), Color(0xFFB9CEDE), Color(0xFFFFFFFF), Color(0xFFDDEAF5),
        Color(0xFFFFFFFF), Color(0xFFCFE8FF), Color(0xFF8FAEC4),
    )
    Theme.DESERT -> Palette(
        Color(0xFFF7C877), Color(0xFFFFF0CC), Color(0xFFE8B978), Color(0xFFD9A055),
        Color(0xFFD9A863), Color(0xFFB4813F), Color(0xFFE8C182), Color(0xFFCFA167),
        Color(0xFFFFF6E0), Color(0xFFE8DCC0), Color(0xFFB09A6E),
    )
    Theme.LAVA -> Palette(
        Color(0xFF3A1B22), Color(0xFF8C3A2E), Color(0xFF5E2A2A), Color(0xFF421F20),
        Color(0xFF6B4038), Color(0xFF4A2A26), Color(0xFF8F5240), Color(0xFF7A4536),
        Color(0x66FFB37A), Color(0xFFFF9E3D), Color(0xFFCF5320),
    )
    Theme.NIGHT -> Palette(
        Color(0xFF141A3A), Color(0xFF3A3A72), Color(0xFF232A55), Color(0xFF1A1F42),
        Color(0xFF4C4E85), Color(0xFF34365F), Color(0xFF7E80C4), Color(0xFF6567A8),
        Color(0x66C6C9FF), Color(0xFFD6DDE6), Color(0xFF9AA6B5),
    )
    Theme.CASTLE -> Palette(
        Color(0xFF2E2440), Color(0xFF6B4E7A), Color(0xFF453255), Color(0xFF33253F),
        Color(0xFF7A6A88), Color(0xFF574A63), Color(0xFF9C89AD), Color(0xFF8A7799),
        Color(0x66E0C8FF), Color(0xFFFF9E3D), Color(0xFFCF5320),
    )
}

// --- エントリポイント ----------------------------------------------------
fun DrawScope.drawGame(game: Game) {
    if (game.phase == Phase.ENDING) {
        drawEnding(game)
        return
    }
    val s = size.height / VIEW_TILES_Y
    val cam = game.cameraX
    val pal = paletteOf(game.level.theme)

    drawBackground(pal, cam, s, game.level.theme)
    drawTiles(game, pal, cam, s)
    drawCrumbleGhosts(game, cam, s)
    drawMovers(game, pal, cam, s)
    drawCheckpoints(game, cam, s)
    drawGoal(game, cam, s)
    drawPickups(game, cam, s)
    drawEnemies(game, cam, s)
    drawPlayer(game, cam, s)
    drawPops(game, cam, s)
}

private fun DrawScope.drawBackground(pal: Palette, cam: Float, s: Float, theme: Theme) {
    drawRect(
        brush = Brush.verticalGradient(listOf(pal.skyTop, pal.skyBottom)),
        topLeft = Offset.Zero,
        size = size,
    )

    val night = theme == Theme.NIGHT || theme == Theme.CAVE || theme == Theme.CASTLE
    if (night) {
        // 星
        for (i in 0 until 40) {
            val x = ((i * 137) % 100) / 100f * size.width
            val y = ((i * 89) % 60) / 100f * size.height
            drawCircle(WHITE.copy(alpha = 0.7f), s * 0.04f * (1 + (i % 3)), Offset(x, y))
        }
    }
    drawCircle(
        color = pal.cloud.copy(alpha = 0.35f),
        radius = s * 2.2f,
        center = Offset(size.width * 0.78f, size.height * 0.18f),
    )

    // 雲（弱い視差）
    val cloudShift = -cam * s * 0.15f
    for (i in 0 until 14) {
        val bx = i * 9f * s + cloudShift
        val span = size.width + 6 * s
        val x = ((bx % span) + span) % span - 3 * s
        val y = size.height * (0.10f + 0.07f * ((i * 7) % 5))
        val r = s * (0.55f + 0.12f * ((i * 3) % 4))
        drawCircle(pal.cloud.copy(alpha = 0.75f), r, Offset(x, y))
        drawCircle(pal.cloud.copy(alpha = 0.75f), r * 0.8f, Offset(x + r, y + r * 0.2f))
        drawCircle(pal.cloud.copy(alpha = 0.75f), r * 0.7f, Offset(x - r, y + r * 0.25f))
    }

    // 遠景の丘（強い視差）。画面に入る範囲だけを回す。
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
                    drawArc(
                        Color(0xFFB07714), 160f, 250f, false,
                        Offset(x + s * 0.32f, y + s * 0.22f), Size(s * 0.36f, s * 0.34f),
                        style = Stroke(width = s * 0.1f),
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
                    // テーマによってトゲにも溶岩にも見せる
                    val lava = game.level.theme == Theme.LAVA || game.level.theme == Theme.CASTLE
                    if (lava) {
                        drawRect(pal.hazardBase, Offset(x, y), Size(s, s))
                        val wob = sin(game.elapsed * 3f + tx) * s * 0.06f
                        drawRect(pal.hazard, Offset(x, y + s * 0.1f + wob), Size(s, s * 0.9f))
                        drawCircle(
                            WHITE.copy(alpha = 0.35f), s * 0.1f,
                            Offset(x + s * 0.3f, y + s * 0.35f + wob),
                        )
                    } else {
                        for (i in 0 until 3) {
                            val bx = x + s * i / 3f
                            val p = Path().apply {
                                moveTo(bx, y + s)
                                lineTo(bx + s / 6f, y + s * 0.18f)
                                lineTo(bx + s / 3f, y + s)
                                close()
                            }
                            drawPath(p, pal.hazard)
                        }
                        drawRect(pal.hazardBase, Offset(x, y + s * 0.86f), Size(s, s * 0.14f))
                    }
                }
                'F' -> {
                    // もろい足場。乗るとひび割れて震え、やがて落ちる。
                    val cr = game.crumbleAt(tx, ty)
                    val shake = if (cr?.state == 1) sin(game.elapsed * 60f) * s * 0.05f else 0f
                    drawRoundRect(
                        Color(0xFFB9A489), Offset(x + shake, y), Size(s, s * 0.6f),
                        CornerRadius(s * 0.14f, s * 0.14f),
                    )
                    drawRect(Color(0xFFD6C6AC), Offset(x + shake, y), Size(s, s * 0.16f))
                    val crack = Color(0xFF6E5F4B)
                    val lw = if (cr?.state == 1) s * 0.06f else s * 0.04f
                    drawLine(
                        crack, Offset(x + shake + s * 0.3f, y),
                        Offset(x + shake + s * 0.42f, y + s * 0.6f), strokeWidth = lw,
                    )
                    drawLine(
                        crack, Offset(x + shake + s * 0.72f, y),
                        Offset(x + shake + s * 0.6f, y + s * 0.6f), strokeWidth = lw,
                    )
                }
                'T' -> {
                    // とつぜんトゲ。近づくまでは地面に埋まっている。
                    val trap = game.trapAtTile(tx, ty)
                    val out = when (trap?.state) {
                        2 -> 1f
                        1 -> (trap.t / TRAP_WARN).coerceIn(0f, 1f) * 0.35f
                        else -> 0f
                    }
                    if (out > 0.02f) {
                        for (i in 0 until 3) {
                            val bx = x + s * i / 3f
                            val top = y + s * (1f - 0.82f * out)
                            val spike = Path().apply {
                                moveTo(bx, y + s)
                                lineTo(bx + s / 6f, top)
                                lineTo(bx + s / 3f, y + s)
                                close()
                            }
                            drawPath(spike, pal.hazard)
                        }
                    }
                    // 出ていないときも「あやしい継ぎ目」は見えている
                    drawRect(
                        pal.hazardBase.copy(alpha = 0.9f),
                        Offset(x, y + s * 0.88f), Size(s, s * 0.12f),
                    )
                    for (i in 0 until 3) {
                        drawCircle(
                            pal.hazard.copy(alpha = 0.55f), s * 0.035f,
                            Offset(x + s * (0.17f + i * 0.33f), y + s * 0.93f),
                        )
                    }
                }
                '^' -> {
                    // ジャンプ台
                    val squish = sin(game.elapsed * 4f + tx) * s * 0.03f
                    drawRect(Color(0xFF6E6E86), Offset(x + s * 0.2f, y + s * 0.6f), Size(s * 0.6f, s * 0.4f))
                    for (i in 0 until 3) {
                        drawRect(
                            Color(0xFF9C9CB8),
                            Offset(x + s * 0.18f, y + s * (0.62f + i * 0.12f)),
                            Size(s * 0.64f, s * 0.05f),
                        )
                    }
                    drawRoundRect(
                        Color(0xFF3ED17E), Offset(x + s * 0.02f, y + s * 0.28f + squish),
                        Size(s * 0.96f, s * 0.34f), CornerRadius(s * 0.17f, s * 0.17f),
                    )
                    drawRoundRect(
                        Color(0xFF8CF0B6), Offset(x + s * 0.1f, y + s * 0.32f + squish),
                        Size(s * 0.8f, s * 0.12f), CornerRadius(s * 0.06f, s * 0.06f),
                    )
                }
            }
        }
    }
}

/** 崩れて消えた足場は、戻ってくることが分かるよう薄い枠だけ残す。 */
private fun DrawScope.drawCrumbleGhosts(game: Game, cam: Float, s: Float) {
    for (c in game.crumbles) {
        if (c.state != 2) continue
        val x = (c.tx - cam) * s
        if (x < -s || x > size.width + s) continue
        val back = (c.t / CRUMBLE_BACK).coerceIn(0f, 1f)
        drawRoundRect(
            Color(0xFFD6C6AC).copy(alpha = 0.15f + back * 0.25f),
            Offset(x, c.ty * s), Size(s, s * 0.6f),
            CornerRadius(s * 0.14f, s * 0.14f),
            style = Stroke(width = s * 0.05f),
        )
    }
}

private fun DrawScope.drawMovers(game: Game, pal: Palette, cam: Float, s: Float) {
    for (m in game.movers) {
        val x = (m.x - cam) * s
        if (x < -3 * s || x > size.width + 3 * s) continue
        val y = m.y * s
        val w = Mover.W * s
        val h = Mover.H * s
        drawRoundRect(
            pal.dirtDark, Offset(x, y + h * 0.4f), Size(w, h),
            CornerRadius(s * 0.12f, s * 0.12f),
        )
        drawRoundRect(
            pal.platform, Offset(x, y), Size(w, h),
            CornerRadius(s * 0.12f, s * 0.12f),
        )
        drawRoundRect(
            pal.surface, Offset(x, y), Size(w, h * 0.45f),
            CornerRadius(s * 0.1f, s * 0.1f),
        )
        // 動く向きの目印
        val c = Color(0xFF5A5A70)
        drawCircle(c, s * 0.06f, Offset(x + s * 0.25f, y + h * 0.6f))
        drawCircle(c, s * 0.06f, Offset(x + w - s * 0.25f, y + h * 0.6f))
        val cx = x + w / 2f
        val cy = y + h * 0.55f
        if (m.vertical) {
            drawPath(triangle(cx, cy - s * 0.14f, s * 0.1f, up = true), c)
            drawPath(triangle(cx, cy + s * 0.14f, s * 0.1f, up = false), c)
        } else {
            drawPath(triangleH(cx - s * 0.18f, cy, s * 0.1f, right = false), c)
            drawPath(triangleH(cx + s * 0.18f, cy, s * 0.1f, right = true), c)
        }
    }
}

private fun triangle(cx: Float, cy: Float, r: Float, up: Boolean): Path = Path().apply {
    if (up) {
        moveTo(cx, cy - r); lineTo(cx - r, cy + r); lineTo(cx + r, cy + r)
    } else {
        moveTo(cx, cy + r); lineTo(cx - r, cy - r); lineTo(cx + r, cy - r)
    }
    close()
}

private fun triangleH(cx: Float, cy: Float, r: Float, right: Boolean): Path = Path().apply {
    if (right) {
        moveTo(cx + r, cy); lineTo(cx - r, cy - r); lineTo(cx - r, cy + r)
    } else {
        moveTo(cx - r, cy); lineTo(cx + r, cy - r); lineTo(cx + r, cy + r)
    }
    close()
}

private fun DrawScope.drawCheckpoints(game: Game, cam: Float, s: Float) {
    for (cp in game.checkpoints) {
        val x = (cp.x - cam) * s
        if (x < -2 * s || x > size.width + 2 * s) continue
        val base = cp.y * s
        val height = s * 3f
        drawRoundRect(
            Color(0xFFB9BFCB), Offset(x + s * 0.44f, base - height),
            Size(s * 0.12f, height), CornerRadius(s * 0.06f, s * 0.06f),
        )
        val flagColor = if (cp.active) Color(0xFF5FD8A0) else Color(0xFF9AA0AC)
        val wave = if (cp.active) sin(game.elapsed * 4f) * s * 0.1f else 0f
        val flag = Path().apply {
            moveTo(x + s * 0.54f, base - height + s * 0.12f)
            lineTo(x + s * 1.5f + wave, base - height + s * 0.6f)
            lineTo(x + s * 0.54f, base - height + s * 1.08f)
            close()
        }
        drawPath(flag, flagColor)
        if (cp.active) {
            val a = (sin(game.elapsed * 5f) * 0.5f + 0.5f) * 0.5f
            drawCircle(Color(0xFF5FD8A0).copy(alpha = a), s * 0.7f, Offset(x + s * 0.5f, base - height))
        }
    }
}

private fun DrawScope.drawGoal(game: Game, cam: Float, s: Float) {
    val level = game.level
    val x = (level.goalX - cam) * s
    val yBase = level.goalY * s
    val height = s * 4f
    val locked = game.goalLocked
    drawRoundRect(
        Color(0xFFBFC7D2), Offset(x + s * 0.42f, yBase - height),
        Size(s * 0.16f, height), CornerRadius(s * 0.08f, s * 0.08f),
    )
    drawCircle(
        if (locked) Color(0xFF7C8494) else Color(0xFFFFD84D),
        s * 0.2f, Offset(x + s * 0.5f, yBase - height),
    )
    val wave = if (locked) 0f else sin(game.elapsed * 3f) * s * 0.12f
    val flag = Path().apply {
        moveTo(x + s * 0.56f, yBase - height + s * 0.15f)
        lineTo(x + s * 2.0f + wave, yBase - height + s * 0.75f)
        lineTo(x + s * 0.56f, yBase - height + s * 1.35f)
        close()
    }
    drawPath(flag, if (locked) Color(0xFF6C7280) else Color(0xFFFF7BA8))
    drawRoundRect(
        Color(0xFF8C93A1), Offset(x + s * 0.2f, yBase - s * 0.3f),
        Size(s * 0.6f, s * 0.3f), CornerRadius(s * 0.08f, s * 0.08f),
    )
    if (locked) {
        // 鍵マーク
        val cx = x + s * 1.1f
        val cy = yBase - height + s * 0.75f
        drawArc(
            Color(0xFFE6E9EF), 180f, 180f, false,
            Offset(cx - s * 0.16f, cy - s * 0.3f), Size(s * 0.32f, s * 0.32f),
            style = Stroke(width = s * 0.08f),
        )
        drawRoundRect(
            Color(0xFFE6E9EF), Offset(cx - s * 0.22f, cy - s * 0.14f),
            Size(s * 0.44f, s * 0.36f), CornerRadius(s * 0.07f, s * 0.07f),
        )
    }
}

// --- アイテム -----------------------------------------------------------
private fun DrawScope.drawPickups(game: Game, cam: Float, s: Float) {
    for (pk in game.pickups) {
        if (pk.taken) continue
        val cx = (pk.x + 0.5f - cam) * s
        if (cx < -s || cx > size.width + s) continue
        val bob = sin(pk.t * 3f + pk.x) * s * 0.08f
        val cy = (pk.y + 0.5f) * s + bob
        drawPickupIcon(pk.kind, cx, cy, s * 0.34f, pk.t)
    }
}

private fun DrawScope.drawPickupIcon(
    kind: PickupKind, cx: Float, cy: Float, r: Float, t: Float,
) {
    when (kind) {
        PickupKind.COIN -> drawCoin(cx, cy, r * 0.88f, t)
        PickupKind.GEM -> drawGem(cx, cy, r, t)
        PickupKind.HEART -> drawHeart(cx, cy, r)
        PickupKind.STAR -> drawStar(cx, cy, r * 1.1f, t)
        PickupKind.DASH -> {
            drawBadge(cx, cy, r, DASH_A, t)
            val p = Path().apply {
                moveTo(cx + r * 0.14f, cy - r * 0.52f)
                lineTo(cx - r * 0.34f, cy + r * 0.08f)
                lineTo(cx - r * 0.02f, cy + r * 0.08f)
                lineTo(cx - r * 0.14f, cy + r * 0.55f)
                lineTo(cx + r * 0.36f, cy - r * 0.1f)
                lineTo(cx + r * 0.03f, cy - r * 0.1f)
                close()
            }
            drawPath(p, WHITE)
        }
        PickupKind.FEATHER -> {
            drawBadge(cx, cy, r, FEATHER_A, t)
            drawOval(
                WHITE, Offset(cx - r * 0.3f, cy - r * 0.55f), Size(r * 0.6f, r * 0.95f),
            )
            drawLine(
                Color(0xFF6BAF88), Offset(cx, cy - r * 0.5f), Offset(cx, cy + r * 0.55f),
                strokeWidth = r * 0.1f,
            )
        }
        PickupKind.SHIELD -> {
            drawCircle(SHIELD_A.copy(alpha = 0.45f), r, Offset(cx, cy))
            drawCircle(WHITE.copy(alpha = 0.9f), r, Offset(cx, cy), style = Stroke(width = r * 0.16f))
            drawCircle(WHITE.copy(alpha = 0.6f), r * 0.24f, Offset(cx - r * 0.3f, cy - r * 0.34f))
        }
        PickupKind.MAGNET -> {
            drawBadge(cx, cy, r, MAGNET_A, t)
            drawArc(
                WHITE, 180f, 180f, false,
                Offset(cx - r * 0.44f, cy - r * 0.3f), Size(r * 0.88f, r * 0.88f),
                style = Stroke(width = r * 0.26f),
            )
            drawRect(WHITE, Offset(cx - r * 0.44f, cy + r * 0.14f), Size(r * 0.26f, r * 0.3f))
            drawRect(WHITE, Offset(cx + r * 0.18f, cy + r * 0.14f), Size(r * 0.26f, r * 0.3f))
        }
    }
}

private fun DrawScope.drawBadge(cx: Float, cy: Float, r: Float, color: Color, t: Float) {
    val glow = (sin(t * 4f) * 0.5f + 0.5f) * 0.3f
    drawCircle(color.copy(alpha = 0.35f + glow), r * 1.28f, Offset(cx, cy))
    drawCircle(color, r, Offset(cx, cy))
    drawCircle(WHITE.copy(alpha = 0.4f), r * 0.3f, Offset(cx - r * 0.34f, cy - r * 0.38f))
}

private fun DrawScope.drawCoin(cx: Float, cy: Float, r: Float, t: Float) {
    val squeeze = abs(cos(t * 3.2f)).coerceAtLeast(0.18f)
    scale(squeeze, 1f, Offset(cx, cy)) {
        drawCircle(COIN_C, r, Offset(cx, cy))
        drawCircle(COIN_A, r * 0.84f, Offset(cx, cy))
        drawCircle(COIN_B, r * 0.34f, Offset(cx - r * 0.22f, cy - r * 0.24f))
    }
}

private fun DrawScope.drawGem(cx: Float, cy: Float, r: Float, t: Float) {
    val squeeze = (0.7f + abs(cos(t * 2.2f)) * 0.3f)
    scale(squeeze, 1f, Offset(cx, cy)) {
        val p = Path().apply {
            moveTo(cx, cy - r)
            lineTo(cx + r * 0.78f, cy - r * 0.15f)
            lineTo(cx, cy + r)
            lineTo(cx - r * 0.78f, cy - r * 0.15f)
            close()
        }
        drawPath(p, GEM_A)
        val hi = Path().apply {
            moveTo(cx, cy - r)
            lineTo(cx + r * 0.3f, cy - r * 0.2f)
            lineTo(cx, cy + r * 0.15f)
            lineTo(cx - r * 0.3f, cy - r * 0.2f)
            close()
        }
        drawPath(hi, GEM_B)
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
        val a = 1f - pop.t / 0.8f
        if (a <= 0f) continue
        val cx = (pop.x - cam) * s
        val cy = (pop.y + 0.5f) * s - pop.t * s * 2.2f
        if (pop.kind != null) {
            drawPickupIcon(pop.kind, cx, cy, s * 0.3f * a, pop.t)
        }
        val text = pop.text
        if (text != null) {
            popPaint.textSize = s * 0.42f
            popPaint.color = android.graphics.Color.WHITE
            popPaint.alpha = (255 * a).toInt().coerceIn(0, 255)
            popPaint.setShadowLayer(s * 0.12f, 0f, 0f, android.graphics.Color.BLACK)
            drawContext.canvas.nativeCanvas.drawText(
                text, cx, cy - s * 0.5f, popPaint,
            )
        }
    }
}

// --- 敵 ------------------------------------------------------------------
private fun DrawScope.drawEnemies(game: Game, cam: Float, s: Float) {
    for (e in game.enemies) {
        val x = (e.x - cam) * s
        if (x < -3 * s || x > size.width + 3 * s) continue
        val y = e.y * s
        val w = e.w * s
        val h = e.h * s
        if (!e.alive) {
            val k = (1f - e.squashT / 0.7f).coerceIn(0f, 1f)
            drawOval(
                bodyColor(e.kind).copy(alpha = k),
                Offset(x - w * 0.1f, y + h * 0.66f),
                Size(w * 1.2f, h * 0.34f * k),
            )
            continue
        }
        // ダメージ直後は点滅する
        if (e.invulnT > 0f && sin(e.t * 40f) < 0f) continue
        when (e.kind) {
            EnemyKind.WALKER -> drawWalker(x, y, w, h, e.t, e.vx > 0f)
            EnemyKind.SPIKY -> drawSpiky(x, y, w, h, e.t)
            EnemyKind.FLYER -> drawFlyer(x, y, w, h, e.t, e.vx > 0f)
            EnemyKind.JUMPER -> drawJumper(x, y, w, h, e.t, e.vy != 0f)
            EnemyKind.CHASER -> drawChaser(x, y, w, h, e.t, e.vx > 0f)
            EnemyKind.DROPPER -> drawDropper(x, y, w, h, e.t, !e.dropped)
            EnemyKind.BOSS -> drawBoss(x, y, w, h, e.t, e.vx > 0f, e.hp)
        }
    }
}

private val DON_BODY = Color(0xFFD9A566)
private val DON_CAP = Color(0xFF7A5334)

/** どんぐり。落ちてくるまでは宙にぶら下がっている。 */
private fun DrawScope.drawDropper(
    x: Float, y: Float, w: Float, h: Float, t: Float, hanging: Boolean,
) {
    val cx = x + w / 2f
    if (hanging) {
        // ぶら下がっている糸。見上げないと気づかない。
        drawLine(
            Color(0x99FFFFFF), Offset(cx, y - h * 1.4f), Offset(cx, y + h * 0.1f),
            strokeWidth = w * 0.04f,
        )
    }
    val sway = if (hanging) sin(t * 2.2f) * w * 0.05f else 0f
    val cxs = cx + sway
    drawOval(DON_BODY, Offset(cxs - w * 0.36f, y + h * 0.22f), Size(w * 0.72f, h * 0.74f))
    drawArc(
        DON_CAP, 180f, 180f, true,
        Offset(cxs - w * 0.42f, y + h * 0.02f), Size(w * 0.84f, h * 0.5f),
    )
    drawRoundRect(
        DON_CAP, Offset(cxs - w * 0.05f, y - h * 0.1f), Size(w * 0.1f, h * 0.16f),
        CornerRadius(w * 0.05f, w * 0.05f),
    )
    val eyeY = y + h * 0.52f
    if (hanging) {
        eyes(cxs, eyeY, w, 0.14f, 0.12f, 0f)
        drawArc(
            INK, 20f, 140f, false,
            Offset(cxs - w * 0.08f, y + h * 0.62f), Size(w * 0.16f, h * 0.1f),
            style = Stroke(width = w * 0.04f),
        )
    } else {
        // 落下中はあわてた顔
        drawCircle(WHITE, w * 0.14f, Offset(cxs - w * 0.15f, eyeY))
        drawCircle(WHITE, w * 0.14f, Offset(cxs + w * 0.15f, eyeY))
        drawCircle(INK, w * 0.05f, Offset(cxs - w * 0.15f, eyeY))
        drawCircle(INK, w * 0.05f, Offset(cxs + w * 0.15f, eyeY))
        drawOval(INK, Offset(cxs - w * 0.07f, y + h * 0.66f), Size(w * 0.14f, h * 0.14f))
    }
}

private fun bodyColor(kind: EnemyKind): Color = when (kind) {
    EnemyKind.WALKER -> PUNI_BODY
    EnemyKind.SPIKY -> TOGE_BODY
    EnemyKind.FLYER -> PATA_BODY
    EnemyKind.JUMPER -> PYON_BODY
    EnemyKind.CHASER -> OIKA_BODY
    EnemyKind.DROPPER -> DON_BODY
    EnemyKind.BOSS -> BOSS_BODY
}

private fun DrawScope.eyes(
    cx: Float, cy: Float, w: Float, spread: Float, size: Float, look: Float,
) {
    drawCircle(WHITE, w * size, Offset(cx - w * spread + look, cy))
    drawCircle(WHITE, w * size, Offset(cx + w * spread + look, cy))
    drawCircle(INK, w * size * 0.5f, Offset(cx - w * spread * 0.85f + look, cy + w * 0.01f))
    drawCircle(INK, w * size * 0.5f, Offset(cx + w * spread * 1.15f + look, cy + w * 0.01f))
}

private fun DrawScope.drawWalker(x: Float, y: Float, w: Float, h: Float, t: Float, right: Boolean) {
    val cx = x + w / 2f
    val squash = 1f + sin(t * 8f) * 0.06f
    val bodyR = w * 0.46f
    val step = sin(t * 8f) * w * 0.12f
    drawOval(PUNI_DARK, Offset(cx - w * 0.36f + step, y + h * 0.78f), Size(w * 0.3f, h * 0.24f))
    drawOval(PUNI_DARK, Offset(cx + w * 0.06f - step, y + h * 0.78f), Size(w * 0.3f, h * 0.24f))
    scale(1f / squash, squash, Offset(cx, y + h)) {
        drawCircle(PUNI_BODY, bodyR, Offset(cx, y + h * 0.48f))
        drawArc(
            PUNI_DARK, 0f, 180f, true,
            Offset(cx - bodyR, y + h * 0.48f - bodyR * 0.1f), Size(bodyR * 2f, bodyR * 1.1f),
        )
    }
    eyes(cx, y + h * 0.4f, w, 0.17f, 0.15f, if (right) w * 0.06f else -w * 0.06f)
    drawArc(
        INK, 20f, 140f, false,
        Offset(cx - w * 0.12f, y + h * 0.5f), Size(w * 0.24f, h * 0.14f),
        style = Stroke(width = w * 0.045f),
    )
}

private fun DrawScope.drawSpiky(x: Float, y: Float, w: Float, h: Float, t: Float) {
    val cx = x + w / 2f
    val cy = y + h * 0.52f
    val r = w * 0.4f
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
    eyes(cx, cy - h * 0.04f, w, 0.15f, 0.14f, 0f)
    val lw = w * 0.055f
    drawLine(INK, Offset(cx - w * 0.28f, cy - h * 0.2f), Offset(cx - w * 0.04f, cy - h * 0.11f), strokeWidth = lw)
    drawLine(INK, Offset(cx + w * 0.28f, cy - h * 0.2f), Offset(cx + w * 0.04f, cy - h * 0.11f), strokeWidth = lw)
    drawArc(
        INK, 200f, 140f, false,
        Offset(cx - w * 0.1f, cy + h * 0.16f), Size(w * 0.2f, h * 0.12f),
        style = Stroke(width = w * 0.04f),
    )
    if (sin(t * 6f) > 0.9f) {
        drawCircle(WHITE.copy(alpha = 0.3f), r * 0.3f, Offset(cx - r * 0.4f, cy - r * 0.45f))
    }
}

private fun DrawScope.drawFlyer(x: Float, y: Float, w: Float, h: Float, t: Float, right: Boolean) {
    val cx = x + w / 2f
    val cy = y + h * 0.5f
    val r = w * 0.36f
    val flap = abs(sin(t * 9f))
    for (side in listOf(-1f, 1f)) {
        drawOval(
            PATA_DARK.copy(alpha = 0.9f),
            Offset(cx + side * r * 0.55f - r * 0.7f * (if (side < 0) 1f else 0f), cy - r * 0.5f),
            Size(r * 0.7f, r * (0.5f + flap * 0.9f)),
        )
    }
    drawCircle(PATA_BODY, r, Offset(cx, cy))
    drawCircle(WHITE.copy(alpha = 0.35f), r * 0.55f, Offset(cx - r * 0.25f, cy - r * 0.3f))
    eyes(cx, cy - h * 0.02f, w, 0.13f, 0.13f, if (right) w * 0.04f else -w * 0.04f)
    val bp = Path().apply {
        val bx = cx + (if (right) r * 0.85f else -r * 0.85f)
        moveTo(bx, cy + h * 0.02f)
        lineTo(bx + (if (right) r * 0.45f else -r * 0.45f), cy + h * 0.09f)
        lineTo(bx, cy + h * 0.16f)
        close()
    }
    drawPath(bp, Color(0xFFFFC24D))
}

private fun DrawScope.drawJumper(x: Float, y: Float, w: Float, h: Float, t: Float, air: Boolean) {
    val cx = x + w / 2f
    val stretch = if (air) 1.16f else 1f + sin(t * 6f) * 0.05f
    // バネの足
    val coilTop = y + h * 0.66f
    for (i in 0 until 3) {
        drawArc(
            PYON_DARK, 0f, 180f, false,
            Offset(cx - w * 0.24f, coilTop + h * 0.1f * i), Size(w * 0.48f, h * 0.16f),
            style = Stroke(width = w * 0.07f),
        )
    }
    scale(1f / stretch, stretch, Offset(cx, y + h)) {
        val p = Path().apply {
            moveTo(cx, y + h * 0.02f)
            cubicTo(
                cx + w * 0.52f, y + h * 0.22f,
                cx + w * 0.46f, y + h * 0.72f,
                cx, y + h * 0.72f,
            )
            cubicTo(
                cx - w * 0.46f, y + h * 0.72f,
                cx - w * 0.52f, y + h * 0.22f,
                cx, y + h * 0.02f,
            )
            close()
        }
        drawPath(p, PYON_BODY)
        drawOval(
            WHITE.copy(alpha = 0.4f),
            Offset(cx - w * 0.2f, y + h * 0.42f), Size(w * 0.4f, h * 0.22f),
        )
    }
    eyes(cx, y + h * 0.36f, w, 0.15f, 0.14f, 0f)
    drawArc(
        INK, 20f, 140f, false,
        Offset(cx - w * 0.1f, y + h * 0.46f), Size(w * 0.2f, h * 0.12f),
        style = Stroke(width = w * 0.04f),
    )
}

private fun DrawScope.drawChaser(x: Float, y: Float, w: Float, h: Float, t: Float, right: Boolean) {
    val cx = x + w / 2f
    val cy = y + h * 0.5f
    val r = w * 0.42f
    // 走っている勢いの線
    for (i in 0 until 3) {
        val off = (if (right) -1f else 1f) * (r * (1.2f + i * 0.35f))
        drawLine(
            OIKA_DARK.copy(alpha = 0.35f),
            Offset(cx + off, cy - h * 0.16f + i * h * 0.16f),
            Offset(cx + off - (if (right) -1f else 1f) * r * 0.5f, cy - h * 0.16f + i * h * 0.16f),
            strokeWidth = h * 0.05f,
        )
    }
    val step = sin(t * 16f) * w * 0.14f
    drawOval(OIKA_DARK, Offset(cx - w * 0.34f + step, y + h * 0.76f), Size(w * 0.28f, h * 0.26f))
    drawOval(OIKA_DARK, Offset(cx + w * 0.06f - step, y + h * 0.76f), Size(w * 0.28f, h * 0.26f))
    drawCircle(OIKA_BODY, r, Offset(cx, cy))
    // つり上がった眉でやる気を出す
    val lw = w * 0.06f
    drawLine(INK, Offset(cx - w * 0.3f, cy - h * 0.3f), Offset(cx - w * 0.06f, cy - h * 0.18f), strokeWidth = lw)
    drawLine(INK, Offset(cx + w * 0.3f, cy - h * 0.3f), Offset(cx + w * 0.06f, cy - h * 0.18f), strokeWidth = lw)
    eyes(cx, cy - h * 0.02f, w, 0.15f, 0.14f, if (right) w * 0.05f else -w * 0.05f)
    drawArc(
        INK, 200f, 140f, false,
        Offset(cx - w * 0.12f, cy + h * 0.18f), Size(w * 0.24f, h * 0.13f),
        style = Stroke(width = w * 0.045f),
    )
}

private fun DrawScope.drawBoss(
    x: Float, y: Float, w: Float, h: Float, t: Float, right: Boolean, hp: Int,
) {
    val cx = x + w / 2f
    val cy = y + h * 0.54f
    val r = w * 0.4f
    val breathe = 1f + sin(t * 3f) * 0.04f
    // 足
    val step = sin(t * 7f) * w * 0.08f
    drawOval(BOSS_DARK, Offset(cx - w * 0.32f + step, y + h * 0.82f), Size(w * 0.26f, h * 0.2f))
    drawOval(BOSS_DARK, Offset(cx + w * 0.06f - step, y + h * 0.82f), Size(w * 0.26f, h * 0.2f))
    scale(breathe, breathe, Offset(cx, y + h)) {
        drawCircle(BOSS_BODY, r, Offset(cx, cy))
        drawCircle(BOSS_DARK.copy(alpha = 0.4f), r * 0.7f, Offset(cx, cy + r * 0.25f))
        // 角
        for (side in listOf(-1f, 1f)) {
            val p = Path().apply {
                moveTo(cx + side * r * 0.62f, cy - r * 0.6f)
                lineTo(cx + side * r * 1.05f, cy - r * 1.4f)
                lineTo(cx + side * r * 0.24f, cy - r * 0.95f)
                close()
            }
            drawPath(p, BOSS_DARK)
        }
        // 王冠
        val crown = Path().apply {
            moveTo(cx - r * 0.5f, cy - r * 0.82f)
            lineTo(cx - r * 0.5f, cy - r * 1.3f)
            lineTo(cx - r * 0.22f, cy - r * 1.02f)
            lineTo(cx, cy - r * 1.45f)
            lineTo(cx + r * 0.22f, cy - r * 1.02f)
            lineTo(cx + r * 0.5f, cy - r * 1.3f)
            lineTo(cx + r * 0.5f, cy - r * 0.82f)
            close()
        }
        drawPath(crown, Color(0xFFFFD34D))
    }
    eyes(cx, cy - h * 0.04f, w, 0.13f, 0.11f, if (right) w * 0.03f else -w * 0.03f)
    // きばのある口
    drawArc(
        INK, 200f, 140f, true,
        Offset(cx - w * 0.16f, cy + h * 0.1f), Size(w * 0.32f, h * 0.18f),
    )
    for (i in 0 until 3) {
        val fx = cx - w * 0.11f + i * w * 0.11f
        drawPath(triangle(fx, cy + h * 0.15f, w * 0.035f, up = false), WHITE)
    }
    // 残り HP
    for (i in 0 until BOSS_HP) {
        val on = i < hp
        drawCircle(
            if (on) Color(0xFFFF6B8A) else Color(0x55FFFFFF),
            w * 0.055f,
            Offset(cx - w * 0.12f + i * w * 0.12f, y - h * 0.16f),
        )
    }
}

// --- 主人公 りな ---------------------------------------------------------

/** りなの見た目そのもの。ゲーム中とエンディングの両方から使う。 */
private fun DrawScope.rinaSprite(
    x: Float, y: Float, w: Float, h: Float,
    faceRight: Boolean, stepPhase: Float, stretch: Float,
    body: Color, dark: Color,
) {
    val cx = x + w / 2f
    drawOval(
        RINA_FOOT,
        Offset(cx - w * 0.4f + stepPhase * w * 0.14f, y + h * 0.8f), Size(w * 0.34f, h * 0.2f),
    )
    drawOval(
        RINA_FOOT,
        Offset(cx + w * 0.06f - stepPhase * w * 0.14f, y + h * 0.8f), Size(w * 0.34f, h * 0.2f),
    )
    scale(1f / stretch, stretch, Offset(cx, y + h)) {
        drawCircle(body, w * 0.19f, Offset(cx - w * 0.32f, y + h * 0.15f))
        drawCircle(body, w * 0.19f, Offset(cx + w * 0.32f, y + h * 0.15f))
        drawCircle(dark.copy(alpha = 0.55f), w * 0.1f, Offset(cx - w * 0.32f, y + h * 0.16f))
        drawCircle(dark.copy(alpha = 0.55f), w * 0.1f, Offset(cx + w * 0.32f, y + h * 0.16f))
        drawRoundRect(
            body, Offset(cx - w * 0.46f, y + h * 0.16f), Size(w * 0.92f, h * 0.68f),
            CornerRadius(w * 0.42f, h * 0.36f),
        )
        drawOval(
            WHITE.copy(alpha = 0.55f),
            Offset(cx - w * 0.24f, y + h * 0.48f), Size(w * 0.48f, h * 0.3f),
        )
        drawCircle(CHEEK.copy(alpha = 0.55f), w * 0.11f, Offset(cx - w * 0.31f, y + h * 0.45f))
        drawCircle(CHEEK.copy(alpha = 0.55f), w * 0.11f, Offset(cx + w * 0.31f, y + h * 0.45f))
        val ex = if (faceRight) w * 0.05f else -w * 0.05f
        drawCircle(WHITE, w * 0.16f, Offset(cx - w * 0.17f + ex, y + h * 0.36f))
        drawCircle(WHITE, w * 0.16f, Offset(cx + w * 0.17f + ex, y + h * 0.36f))
        drawCircle(INK, w * 0.085f, Offset(cx - w * 0.15f + ex, y + h * 0.375f))
        drawCircle(INK, w * 0.085f, Offset(cx + w * 0.19f + ex, y + h * 0.375f))
        drawCircle(WHITE, w * 0.03f, Offset(cx - w * 0.17f + ex, y + h * 0.35f))
        drawCircle(WHITE, w * 0.03f, Offset(cx + w * 0.17f + ex, y + h * 0.35f))
        drawArc(
            INK, 15f, 150f, false,
            Offset(cx - w * 0.1f + ex, y + h * 0.45f), Size(w * 0.2f, h * 0.12f),
            style = Stroke(width = w * 0.04f),
        )
    }
}

private fun DrawScope.drawPlayer(game: Game, cam: Float, s: Float) {
    val p = game.player
    val x = (p.x - cam) * s
    val y = p.y * s
    val w = Player.W * s
    val h = Player.H * s
    val cx = x + w / 2f

    val star = p.starT > 0f
    val body = if (star) {
        val k = (sin(p.animT * 18f) * 0.5f + 0.5f)
        Color(1f, 0.55f + 0.35f * k, 0.35f + 0.55f * (1f - k), 1f)
    } else RINA_BODY
    val dark = if (star) body.copy(alpha = 0.65f) else RINA_DARK

    // ダッシュ中は残像
    if (p.dashT > 0f && abs(p.vx) > 0.1f) {
        for (i in 1..3) {
            val off = (if (p.faceRight) -1f else 1f) * w * 0.35f * i
            drawRoundRect(
                body.copy(alpha = 0.16f / i),
                Offset(cx - w * 0.46f + off, y + h * 0.16f), Size(w * 0.92f, h * 0.68f),
                CornerRadius(w * 0.42f, h * 0.36f),
            )
        }
    }

    if (p.hurtT > 0f && !star && sin(p.animT * 40f) < 0f) return

    val moving = (game.phase == Phase.PLAYING) && (game.inputLeft || game.inputRight) && p.onGround
    val stepPhase = if (moving) sin(p.animT * 13f) else 0f
    val air = !p.onGround
    val stretch = if (air) (1f + (p.vy / 60f)).coerceIn(0.86f, 1.16f) else
        1f + sin(p.animT * 13f) * 0.03f

    // はね（二段ジャンプ可）のときは背中に羽
    if (p.featherT > 0f) {
        val flap = abs(sin(p.animT * (if (air) 14f else 5f)))
        for (side in listOf(-1f, 1f)) {
            drawOval(
                Color(0xFFEFFFF4).copy(alpha = 0.95f),
                Offset(cx + side * w * 0.42f - (if (side < 0) w * 0.32f else 0f), y + h * 0.2f),
                Size(w * 0.32f, h * (0.28f + flap * 0.3f)),
            )
        }
    }

    rinaSprite(x, y, w, h, p.faceRight, stepPhase, stretch, body, dark)

    if (star) {
        val a = (sin(p.animT * 12f) * 0.5f + 0.5f) * 0.5f
        drawCircle(STAR_A.copy(alpha = a), w * 0.8f, Offset(cx, y + h * 0.5f))
    }
    if (p.hasShield) {
        val a = 0.35f + (sin(p.animT * 5f) * 0.5f + 0.5f) * 0.25f
        drawCircle(SHIELD_A.copy(alpha = a * 0.5f), w * 0.95f, Offset(cx, y + h * 0.5f))
        drawCircle(
            SHIELD_A.copy(alpha = a + 0.3f), w * 0.95f, Offset(cx, y + h * 0.5f),
            style = Stroke(width = w * 0.07f),
        )
    }
    if (p.magnetT > 0f) {
        val a = (sin(p.animT * 6f) * 0.5f + 0.5f) * 0.25f
        drawCircle(
            MAGNET_A.copy(alpha = a), MAGNET_RANGE * s, Offset(cx, y + h * 0.5f),
            style = Stroke(width = s * 0.06f),
        )
    }
}

// --- エンディング --------------------------------------------------------

private val creditPaint = android.graphics.Paint().apply {
    isAntiAlias = true
    textAlign = android.graphics.Paint.Align.CENTER
    typeface = android.graphics.Typeface.DEFAULT_BOLD
}

private val CONFETTI = listOf(
    Color(0xFFFFD84D), Color(0xFF7BD5F2), Color(0xFFFF9EC4),
    Color(0xFF86DC64), Color(0xFFB289E8),
)

/** スタッフロールの行。見出しは "■" で始める。 */
private fun creditLines(game: Game): List<String> {
    val minutes = (game.totalTime / 60f).toInt()
    val seconds = (game.totalTime % 60f).toInt()
    return listOf(
        "■ りなの大冒険",
        "",
        "■ とうじょうキャラクター",
        "りな",
        "ぷにまる    とげのすけ    ぱたぽん",
        "ぴょんた    おいかけ",
        "おうさま",
        "",
        "■ ぼうけんしたステージ",
    ) + LEVELS.map { it.title } + listOf(
        "",
        "■ きろく",
        "あつめたコイン    ${game.coinCount} まい",
        "さいしゅうスコア    ${game.score}",
        "クリアタイム    ${minutes}分${seconds}秒",
        "",
        "■ おわりに",
        "さいごまであそんでくれて",
        "ほんとうにありがとう！",
        "",
        "また あそびにきてね",
    )
}

fun DrawScope.drawEnding(game: Game) {
    val s = size.height / VIEW_TILES_Y
    val t = game.endingT
    val groundY = size.height * 0.78f

    // 夕暮れの空
    drawRect(
        brush = Brush.verticalGradient(
            listOf(
                Color(0xFF2C1E4A), Color(0xFF6B3A6E),
                Color(0xFFE8735C), Color(0xFFFFC98A),
            ),
        ),
        topLeft = Offset.Zero, size = size,
    )
    for (i in 0 until 50) {
        val x = ((i * 137) % 100) / 100f * size.width
        val y = ((i * 71) % 45) / 100f * size.height
        val twinkle = sin(t * 2f + i) * 0.5f + 0.5f
        drawCircle(
            WHITE.copy(alpha = 0.2f + twinkle * 0.5f),
            s * 0.035f * (1 + i % 2), Offset(x, y),
        )
    }

    // 沈んでいく夕日
    val sunY = size.height * (0.5f + 0.12f * (t / 25f).coerceAtMost(1f))
    drawCircle(Color(0xFFFFF0CC).copy(alpha = 0.3f), s * 3.6f, Offset(size.width * 0.5f, sunY))
    drawCircle(Color(0xFFFFD9A0), s * 2.3f, Offset(size.width * 0.5f, sunY))

    // 遠景
    for (layer in 0 until 2) {
        val c = if (layer == 0) Color(0xFF6B4A78) else Color(0xFF3E2C51)
        val r = s * (if (layer == 0) 3.2f else 2.4f)
        val step = r * 1.4f
        val baseY = groundY - (if (layer == 0) s * 0.9f else 0f)
        val offset = if (layer == 0) s * 0.7f else 0f
        var i = -1
        while (i * step + offset < size.width + step) {
            drawCircle(c, r, Offset(i * step + offset, baseY + r * 0.6f))
            i += 1
        }
        drawRect(c, Offset(0f, baseY + r * 0.55f), Size(size.width, size.height))
    }
    drawRect(Color(0xFF2A1F3D), Offset(0f, groundY), Size(size.width, size.height - groundY))
    drawRect(Color(0xFF4A3770), Offset(0f, groundY), Size(size.width, s * 0.2f))

    // 花火
    for (f in 0 until 3) {
        val phase = (t + f * 1.4f) % 3.4f
        if (phase > 1.7f) continue
        val k = phase / 1.7f
        val fx = size.width * (0.18f + 0.32f * f)
        val fy = size.height * (0.16f + 0.09f * (f % 2))
        val rad = s * 3.4f * k
        val col = CONFETTI[f]
        for (i in 0 until 14) {
            val a = i * (360f / 14f) * (Math.PI / 180.0).toFloat()
            drawCircle(
                col.copy(alpha = (1f - k) * 0.9f), s * 0.085f,
                Offset(fx + cos(a) * rad, fy + sin(a) * rad * 0.85f),
            )
        }
    }

    // 紙吹雪
    for (i in 0 until 55) {
        val speed = 1.2f + ((i * 37) % 60) / 60f
        val span = size.height + s * 3f
        val y = ((t * speed * s * 1.6f + i * s * 1.9f) % span) - s
        val x = ((i * 73) % 100) / 100f * size.width + sin(t * 1.6f + i) * s * 0.6f
        rotate(t * 140f + i * 31f, Offset(x, y)) {
            drawRect(
                CONFETTI[i % CONFETTI.size].copy(alpha = 0.85f),
                Offset(x - s * 0.09f, y - s * 0.05f), Size(s * 0.18f, s * 0.1f),
            )
        }
    }

    // りなと仲間たちの行進
    val span = size.width + s * 9f
    val paradeSpeed = s * 1.7f
    val followers = listOf(
        EnemyKind.WALKER, EnemyKind.JUMPER, EnemyKind.FLYER,
        EnemyKind.CHASER, EnemyKind.SPIKY, EnemyKind.BOSS,
    )
    for ((i, kind) in followers.withIndex()) {
        val raw = t * paradeSpeed - (i + 1) * s * 2.7f
        val x = ((raw % span) + span) % span - s * 4.5f
        val w = if (kind == EnemyKind.BOSS) s * 1.7f else s * 0.8f
        val h = if (kind == EnemyKind.BOSS) s * 1.5f else s * 0.8f
        val y = groundY - h + s * 0.1f
        when (kind) {
            EnemyKind.WALKER -> drawWalker(x, y, w, h, t * 1.4f, true)
            EnemyKind.JUMPER -> drawJumper(x, y, w, h, t * 1.4f, false)
            EnemyKind.CHASER -> drawChaser(x, y, w, h, t * 1.4f, true)
            EnemyKind.SPIKY -> drawSpiky(x, y, w, h, t * 1.4f)
            EnemyKind.BOSS -> drawBoss(x, y, w, h, t * 1.4f, true, BOSS_HP)
            EnemyKind.FLYER -> drawFlyer(
                x, groundY - h - s * 1.7f + sin(t * 2.4f) * s * 0.35f, w, h, t * 1.4f, true,
            )
        }
    }
    val rinaRaw = t * paradeSpeed
    val rinaX = ((rinaRaw % span) + span) % span - s * 4.5f
    rinaSprite(
        rinaX, groundY - s * 0.92f + s * 0.1f, s * 0.72f, s * 0.92f,
        true, sin(t * 13f), 1f, RINA_BODY, RINA_DARK,
    )

    // スタッフロール
    val lines = creditLines(game)
    val lineH = s * 0.7f
    val scroll = ((t - 1.5f).coerceAtLeast(0f)) * s * 1.15f
    val fadeTop = size.height * 0.2f
    for ((i, line) in lines.withIndex()) {
        if (line.isEmpty()) continue
        val y = groundY + s * 1.6f + i * lineH - scroll
        if (y < fadeTop - lineH || y > size.height + lineH) continue
        val alpha = ((y - fadeTop) / (s * 1.6f)).coerceIn(0f, 1f)
        val heading = line.startsWith("■")
        creditPaint.textSize = if (heading) s * 0.52f else s * 0.44f
        creditPaint.color =
            if (heading) android.graphics.Color.rgb(255, 226, 150)
            else android.graphics.Color.WHITE
        creditPaint.alpha = (255 * alpha).toInt().coerceIn(0, 255)
        creditPaint.setShadowLayer(s * 0.16f, 0f, 0f, android.graphics.Color.BLACK)
        drawContext.canvas.nativeCanvas.drawText(
            if (heading) line.removePrefix("■ ") else line,
            size.width * 0.5f, y, creditPaint,
        )
    }

    // 「おしまい」
    val titleAlpha = ((t - 1f) / 1.5f).coerceIn(0f, 1f)
    if (titleAlpha > 0f) {
        val bounce = 1f + sin(t * 2f) * 0.03f
        creditPaint.textSize = s * 1.05f * bounce
        creditPaint.color = android.graphics.Color.rgb(255, 240, 245)
        creditPaint.alpha = (255 * titleAlpha).toInt().coerceIn(0, 255)
        creditPaint.setShadowLayer(s * 0.24f, 0f, s * 0.04f, android.graphics.Color.BLACK)
        drawContext.canvas.nativeCanvas.drawText(
            "おしまい", size.width * 0.5f, size.height * 0.145f, creditPaint,
        )
    }
}
