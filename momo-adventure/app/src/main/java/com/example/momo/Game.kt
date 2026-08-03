package com.example.momo

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlin.math.floor
import kotlin.math.sin

// --- 物理定数 -----------------------------------------------------------
// tools/genlevels.py の到達可能性チェックと同じ値にしておくこと。
const val GRAVITY = 44f
const val MOVE_SPEED = 7.5f
const val JUMP_VELOCITY = -17.5f
const val JUMP_CUT = -7f      // ボタンを離したときに残す上昇速度
const val MAX_FALL = 28f
const val STOMP_BOUNCE = -12f
const val STAR_TIME = 8f
const val HURT_TIME = 1.2f

// 開始・復活した直後の無敵時間。敵が近くまで歩いてきている状態で復活すると
// 何もできずに連続でやられてしまうため、点滅しながら少しだけ無敵にする。
// tools/genlevels.py の START_CLEARANCE とセットで効く。
const val SPAWN_GRACE = 1.6f

const val VIEW_TILES_Y = 12f  // 画面の高さ = ステージの高さ

fun isSolid(c: Char): Boolean = c == '#' || c == '=' || c == '?' || c == 'x'

enum class Phase { TITLE, PLAYING, DYING, LEVEL_CLEAR, GAME_OVER, ALL_CLEAR }

enum class EnemyKind { WALKER, SPIKY, FLYER }

enum class PickupKind { COIN, HEART, STAR }

class Player {
    var x = 0f
    var y = 0f
    var vx = 0f
    var vy = 0f
    var onGround = false
    var faceRight = true
    var starT = 0f
    var hurtT = 0f
    var animT = 0f

    companion object {
        const val W = 0.72f
        const val H = 0.92f
    }
}

class Enemy(val kind: EnemyKind, val homeX: Float, val homeY: Float) {
    var x = homeX
    var y = homeY
    var vx = if (kind == EnemyKind.SPIKY) -1.6f else -2.3f
    var vy = 0f
    var alive = true
    var squashT = 0f
    var t = 0f

    val w: Float get() = if (kind == EnemyKind.FLYER) 0.86f else 0.8f
    val h: Float get() = 0.8f
}

class Pickup(val kind: PickupKind, val x: Float, val y: Float) {
    var taken = false
    var t = 0f
}

/** 取得済みコインが上に飛んでいく演出。 */
class Pop(var x: Float, var y: Float, val kind: PickupKind) {
    var t = 0f
}

class Level(data: LevelData) {
    val title = data.title
    val theme = data.theme
    val height = data.rows.size
    val width = data.rows.maxOf { it.length }
    val tiles: Array<CharArray> =
        Array(height) { r -> data.rows[r].padEnd(width, '.').toCharArray() }

    var startX = 2f
    var startY = 9f
    var goalX = 0f
    var goalY = 0f
    val enemySpawns = mutableListOf<Triple<EnemyKind, Float, Float>>()
    val pickupSpawns = mutableListOf<Triple<PickupKind, Float, Float>>()

    init {
        for (row in 0 until height) {
            for (col in 0 until width) {
                val c = tiles[row][col]
                val fx = col.toFloat()
                when (c) {
                    '@' -> {
                        startX = fx
                        startY = row + 1f - Player.H
                    }
                    'G' -> {
                        goalX = fx
                        goalY = row + 1f
                    }
                    'w' -> enemySpawns += Triple(EnemyKind.WALKER, fx, row + 0.2f)
                    'k' -> enemySpawns += Triple(EnemyKind.SPIKY, fx, row + 0.2f)
                    'p' -> enemySpawns += Triple(EnemyKind.FLYER, fx, row + 0.2f)
                    'o' -> pickupSpawns += Triple(PickupKind.COIN, fx, row.toFloat())
                    'h' -> pickupSpawns += Triple(PickupKind.HEART, fx, row.toFloat())
                    '*' -> pickupSpawns += Triple(PickupKind.STAR, fx, row.toFloat())
                }
                if (c !in "#=?xs") tiles[row][col] = '.'
            }
        }
    }
}

class Game {
    // UI が読む値は state にしておく
    var phase by mutableStateOf(Phase.TITLE)
    var lives by mutableIntStateOf(3)
    var score by mutableIntStateOf(0)
    var coinCount by mutableIntStateOf(0)
    var levelIndex by mutableIntStateOf(0)

    var level = Level(LEVELS[0])
        private set

    val player = Player()
    val enemies = mutableListOf<Enemy>()
    val pickups = mutableListOf<Pickup>()
    val pops = mutableListOf<Pop>()

    var cameraX = 0f
        private set
    var elapsed = 0f
        private set
    private var phaseT = 0f

    // 入力
    var inputLeft = false
    var inputRight = false
    private var jumpHeld = false
    private var jumpQueued = false

    fun pressJump() {
        jumpHeld = true
        jumpQueued = true
    }

    fun releaseJump() {
        jumpHeld = false
    }

    fun startGame() {
        lives = 3
        score = 0
        coinCount = 0
        levelIndex = 0
        loadLevel(0)
        phase = Phase.PLAYING
    }

    fun advance() {
        when (phase) {
            Phase.TITLE -> startGame()
            Phase.LEVEL_CLEAR -> {
                if (levelIndex + 1 >= LEVELS.size) {
                    phase = Phase.ALL_CLEAR
                } else {
                    levelIndex += 1
                    loadLevel(levelIndex)
                    phase = Phase.PLAYING
                }
            }
            Phase.GAME_OVER, Phase.ALL_CLEAR -> {
                phase = Phase.TITLE
                loadLevel(0)
            }
            else -> {}
        }
    }

    private fun loadLevel(index: Int) {
        level = Level(LEVELS[index])
        respawn()
    }

    private fun respawn() {
        player.x = level.startX
        player.y = level.startY
        player.vx = 0f
        player.vy = 0f
        player.starT = 0f
        player.hurtT = SPAWN_GRACE
        player.faceRight = true
        enemies.clear()
        for ((kind, ex, ey) in level.enemySpawns) enemies += Enemy(kind, ex, ey)
        pickups.clear()
        for ((kind, px, py) in level.pickupSpawns) pickups += Pickup(kind, px, py)
        pops.clear()
        cameraX = 0f
        phaseT = 0f
        jumpQueued = false
    }

    fun update(dt: Float, viewTilesX: Float) {
        elapsed += dt
        for (p in pops) p.t += dt
        pops.removeAll { it.t > 0.7f }
        for (p in pickups) p.t += dt

        when (phase) {
            Phase.PLAYING -> {
                updatePlayer(dt)
                updateEnemies(dt)
                collide()
                updateCamera(viewTilesX)
            }
            Phase.DYING -> {
                phaseT += dt
                player.vy = (player.vy + GRAVITY * dt).coerceAtMost(MAX_FALL)
                player.y += player.vy * dt
                if (phaseT > 1.4f) {
                    if (lives <= 0) phase = Phase.GAME_OVER else {
                        respawn()
                        phase = Phase.PLAYING
                    }
                }
            }
            else -> {
                player.animT += dt
            }
        }
        jumpQueued = false
    }

    // --- プレイヤー ------------------------------------------------------
    private fun updatePlayer(dt: Float) {
        val p = player
        p.animT += dt
        if (p.starT > 0f) p.starT -= dt
        if (p.hurtT > 0f) p.hurtT -= dt

        val dir = (if (inputRight) 1f else 0f) - (if (inputLeft) 1f else 0f)
        p.vx = dir * MOVE_SPEED
        if (dir > 0f) p.faceRight = true
        if (dir < 0f) p.faceRight = false

        if (jumpQueued && p.onGround) {
            p.vy = JUMP_VELOCITY
            p.onGround = false
        }
        if (!jumpHeld && p.vy < JUMP_CUT) p.vy = JUMP_CUT

        moveX(dt)
        moveY(dt)

        if (p.y > level.height + 2f) die()
    }

    private fun tileAt(tx: Int, ty: Int): Char {
        if (tx < 0 || tx >= level.width) return '#'   // 左右端は見えない壁
        if (ty < 0 || ty >= level.height) return '.'
        return level.tiles[ty][tx]
    }

    private fun moveX(dt: Float) {
        val p = player
        p.x += p.vx * dt
        val y0 = floor(p.y + 0.05f).toInt()
        val y1 = floor(p.y + Player.H - 0.05f).toInt()
        if (p.vx > 0f) {
            val tx = floor(p.x + Player.W).toInt()
            for (ty in y0..y1) {
                if (isSolid(tileAt(tx, ty))) {
                    p.x = tx - Player.W
                    p.vx = 0f
                    break
                }
            }
        } else if (p.vx < 0f) {
            val tx = floor(p.x).toInt()
            for (ty in y0..y1) {
                if (isSolid(tileAt(tx, ty))) {
                    p.x = (tx + 1).toFloat()
                    p.vx = 0f
                    break
                }
            }
        }
    }

    private fun moveY(dt: Float) {
        val p = player
        p.vy = (p.vy + GRAVITY * dt).coerceAtMost(MAX_FALL)
        p.y += p.vy * dt
        p.onGround = false
        val x0 = floor(p.x + 0.06f).toInt()
        val x1 = floor(p.x + Player.W - 0.06f).toInt()
        if (p.vy > 0f) {
            val ty = floor(p.y + Player.H).toInt()
            for (tx in x0..x1) {
                if (isSolid(tileAt(tx, ty))) {
                    p.y = ty - Player.H
                    p.vy = 0f
                    p.onGround = true
                    break
                }
            }
        } else if (p.vy < 0f) {
            val ty = floor(p.y).toInt()
            for (tx in x0..x1) {
                val c = tileAt(tx, ty)
                if (isSolid(c)) {
                    p.y = (ty + 1).toFloat()
                    p.vy = 0f
                    if (c == '?' && ty in 0 until level.height && tx in 0 until level.width) {
                        level.tiles[ty][tx] = 'x'
                        pops += Pop(tx + 0.5f, ty.toFloat(), PickupKind.COIN)
                        coinCount += 1
                        score += 100
                    }
                    break
                }
            }
        }
    }

    // --- 敵 --------------------------------------------------------------
    private fun updateEnemies(dt: Float) {
        for (e in enemies) {
            if (!e.alive) {
                e.squashT += dt
                continue
            }
            e.t += dt
            // 画面から遠い敵は動かさない（無駄な計算と、遠くでの落下を防ぐ）
            if (e.x < cameraX - 6f || e.x > cameraX + 32f) continue
            when (e.kind) {
                EnemyKind.FLYER -> {
                    e.x = e.homeX + sin(e.t * 1.1f) * 3.2f
                    e.y = e.homeY + sin(e.t * 2.4f) * 1.1f
                    e.vx = if (sin(e.t * 1.1f + 0.1f) > sin(e.t * 1.1f)) 1f else -1f
                }
                else -> {
                    e.x += e.vx * dt
                    val ty0 = floor(e.y + 0.05f).toInt()
                    val ty1 = floor(e.y + e.h - 0.05f).toInt()
                    val aheadX =
                        if (e.vx > 0f) floor(e.x + e.w).toInt() else floor(e.x).toInt()
                    var turn = false
                    for (ty in ty0..ty1) if (isSolid(tileAt(aheadX, ty))) turn = true
                    // 足場の端でも折り返す（落ちないように）
                    val footY = floor(e.y + e.h + 0.2f).toInt()
                    if (!isSolid(tileAt(aheadX, footY))) turn = true
                    if (turn) {
                        e.vx = -e.vx
                        e.x += e.vx * dt
                    }
                    e.vy = (e.vy + GRAVITY * dt).coerceAtMost(MAX_FALL)
                    e.y += e.vy * dt
                    val tx0 = floor(e.x + 0.06f).toInt()
                    val tx1 = floor(e.x + e.w - 0.06f).toInt()
                    if (e.vy > 0f) {
                        val ty = floor(e.y + e.h).toInt()
                        for (tx in tx0..tx1) {
                            if (isSolid(tileAt(tx, ty))) {
                                e.y = ty - e.h
                                e.vy = 0f
                                break
                            }
                        }
                    }
                }
            }
        }
        enemies.removeAll { !it.alive && it.squashT > 0.6f }
    }

    // --- 当たり判定 ------------------------------------------------------
    private fun overlaps(
        ax: Float, ay: Float, aw: Float, ah: Float,
        bx: Float, by: Float, bw: Float, bh: Float,
    ): Boolean = ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

    private fun collide() {
        val p = player

        for (pk in pickups) {
            if (pk.taken) continue
            if (overlaps(p.x, p.y, Player.W, Player.H, pk.x + 0.1f, pk.y + 0.1f, 0.8f, 0.8f)) {
                pk.taken = true
                pops += Pop(pk.x + 0.5f, pk.y, pk.kind)
                when (pk.kind) {
                    PickupKind.COIN -> {
                        coinCount += 1
                        score += 100
                    }
                    PickupKind.HEART -> {
                        lives += 1
                        score += 200
                    }
                    PickupKind.STAR -> {
                        p.starT = STAR_TIME
                        score += 500
                    }
                }
            }
        }
        pickups.removeAll { it.taken }

        for (e in enemies) {
            if (!e.alive) continue
            if (!overlaps(p.x, p.y, Player.W, Player.H, e.x, e.y, e.w, e.h)) continue
            val stomping = p.vy > 1f && (p.y + Player.H) < e.y + e.h * 0.7f
            when {
                p.starT > 0f -> {
                    defeat(e)
                    score += 200
                }
                e.kind != EnemyKind.SPIKY && stomping -> {
                    defeat(e)
                    p.vy = STOMP_BOUNCE
                    score += 200
                }
                else -> hurt()
            }
        }

        // トゲタイル
        val tx0 = floor(p.x + 0.1f).toInt()
        val tx1 = floor(p.x + Player.W - 0.1f).toInt()
        val ty = floor(p.y + Player.H - 0.1f).toInt()
        for (tx in tx0..tx1) if (tileAt(tx, ty) == 's') hurt()

        // ゴール
        if (overlaps(p.x, p.y, Player.W, Player.H, level.goalX, level.goalY - 4f, 1f, 4f)) {
            score += 1000
            phase = Phase.LEVEL_CLEAR
        }
    }

    private fun defeat(e: Enemy) {
        e.alive = false
        e.squashT = 0f
    }

    private fun hurt() {
        if (player.hurtT > 0f || player.starT > 0f) return
        die()
    }

    private fun die() {
        if (phase != Phase.PLAYING) return
        lives -= 1
        player.vy = -12f
        player.hurtT = HURT_TIME
        phaseT = 0f
        phase = Phase.DYING
    }

    private fun updateCamera(viewTilesX: Float) {
        val target = player.x + Player.W / 2f - viewTilesX / 2f
        val maxX = (level.width - viewTilesX).coerceAtLeast(0f)
        cameraX = target.coerceIn(0f, maxX)
    }
}
