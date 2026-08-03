package com.example.momo

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.sign
import kotlin.math.sin
import kotlin.math.sqrt

// --- 物理定数 -----------------------------------------------------------
// tools/genlevels.py の到達可能性チェックと同じ値にしておくこと。
const val GRAVITY = 44f
const val MOVE_SPEED = 7.5f
const val JUMP_VELOCITY = -17.5f
const val AIR_JUMP_VELOCITY = -15f
const val BOUNCE_VELOCITY = -26f
const val JUMP_CUT = -7f      // ボタンを離したときに残す上昇速度
const val MAX_FALL = 28f
const val STOMP_BOUNCE = -12f

// --- パワーアップ -------------------------------------------------------
const val STAR_TIME = 8f
const val DASH_TIME = 10f
const val DASH_MULTIPLIER = 1.45f
const val FEATHER_TIME = 14f
const val MAGNET_TIME = 10f
const val MAGNET_RANGE = 4.5f
const val HURT_TIME = 1.2f

// 開始・復活した直後の無敵時間。敵が近くまで歩いてきている状態で復活すると
// 何もできずに連続でやられてしまうため、点滅しながら少しだけ無敵にする。
// tools/genlevels.py の START_CLEARANCE とセットで効く。
const val SPAWN_GRACE = 1.6f

// --- 移動床 -------------------------------------------------------------
// 振れ幅は tools/genlevels.py の MOVER_AMP_X / MOVER_AMP_Y と一致させること。
const val MOVER_AMP_X = 3f
const val MOVER_AMP_Y = 2f
const val MOVER_OMEGA = 0.9f

const val BOSS_HP = 3
const val CLEAR_TIME_LIMIT = 90f   // これより早くクリアするとタイムボーナス

const val VIEW_TILES_Y = 12f  // 画面の高さ = ステージの高さ

fun isSolid(c: Char): Boolean =
    c == '#' || c == '=' || c == '?' || c == 'x' || c == '^'

enum class Phase { TITLE, PLAYING, DYING, LEVEL_CLEAR, GAME_OVER, ENDING, ALL_CLEAR }

enum class EnemyKind { WALKER, SPIKY, FLYER, JUMPER, CHASER, BOSS }

enum class PickupKind { COIN, GEM, HEART, STAR, DASH, FEATHER, SHIELD, MAGNET }

class Player {
    var x = 0f
    var y = 0f
    var vx = 0f
    var vy = 0f
    var onGround = false
    var faceRight = true
    var starT = 0f
    var dashT = 0f
    var featherT = 0f
    var magnetT = 0f
    var hasShield = false
    var hurtT = 0f
    var animT = 0f
    var airJumps = 0

    val invincible: Boolean get() = starT > 0f || hurtT > 0f

    companion object {
        const val W = 0.72f
        const val H = 0.92f
    }
}

class Enemy(val kind: EnemyKind, val homeX: Float, val homeY: Float) {
    var x = homeX
    var y = homeY
    var vx = when (kind) {
        EnemyKind.SPIKY -> -1.6f
        EnemyKind.CHASER -> -2.0f
        EnemyKind.BOSS -> -2.2f
        else -> -2.3f
    }
    var vy = 0f
    var alive = true
    var squashT = 0f
    var t = 0f
    var hp = if (kind == EnemyKind.BOSS) BOSS_HP else 1
    var invulnT = 0f
    var actionT = 0f

    // ボスが足場から落ちると倒せなくなり、ゴールが永久に開かない。
    // 出現時に足場の広さを調べて、その範囲から出られないようにする。
    var minX = Float.NEGATIVE_INFINITY
    var maxX = Float.POSITIVE_INFINITY

    val w: Float
        get() = when (kind) {
            EnemyKind.BOSS -> 1.7f
            EnemyKind.FLYER -> 0.86f
            else -> 0.8f
        }
    val h: Float
        get() = when (kind) {
            EnemyKind.BOSS -> 1.5f
            else -> 0.8f
        }

    /** 上から踏んで倒せるか。 */
    val stompable: Boolean get() = kind != EnemyKind.SPIKY
}

class Pickup(val kind: PickupKind, var x: Float, var y: Float) {
    var taken = false
    var t = 0f
}

class Checkpoint(val x: Float, val y: Float) {
    var active = false
}

/** 往復する足場。乗ると一緒に運ばれる。 */
class Mover(val homeX: Float, val homeY: Float, val vertical: Boolean) {
    var x = homeX - (W - 1f) / 2f
    var y = homeY
    var prevX = x
    var prevY = y
    var t = 0f

    companion object {
        const val W = 2.4f
        const val H = 0.45f
    }
}

/** 取得や撃破のときに飛び散る演出。 */
class Pop(var x: Float, var y: Float, val kind: PickupKind?, val text: String? = null) {
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
    var hasBoss = false
        private set

    val enemySpawns = mutableListOf<Triple<EnemyKind, Float, Float>>()
    val pickupSpawns = mutableListOf<Triple<PickupKind, Float, Float>>()
    val checkpointSpawns = mutableListOf<Pair<Float, Float>>()
    val moverSpawns = mutableListOf<Triple<Float, Float, Boolean>>()

    init {
        for (row in 0 until height) {
            for (col in 0 until width) {
                val c = tiles[row][col]
                val fx = col.toFloat()
                val enemyY = row + 0.2f
                when (c) {
                    '@' -> {
                        startX = fx
                        startY = row + 1f - Player.H
                    }
                    'G' -> {
                        goalX = fx
                        goalY = row + 1f
                    }
                    'C' -> checkpointSpawns += Pair(fx, row + 1f)
                    'w' -> enemySpawns += Triple(EnemyKind.WALKER, fx, enemyY)
                    'k' -> enemySpawns += Triple(EnemyKind.SPIKY, fx, enemyY)
                    'p' -> enemySpawns += Triple(EnemyKind.FLYER, fx, enemyY)
                    'j' -> enemySpawns += Triple(EnemyKind.JUMPER, fx, enemyY)
                    'c' -> enemySpawns += Triple(EnemyKind.CHASER, fx, enemyY)
                    'B' -> {
                        enemySpawns += Triple(EnemyKind.BOSS, fx, row + 1f - 1.5f)
                        hasBoss = true
                    }
                    'm' -> moverSpawns += Triple(fx, row.toFloat(), false)
                    'v' -> moverSpawns += Triple(fx, row.toFloat(), true)
                    'o' -> pickupSpawns += Triple(PickupKind.COIN, fx, row.toFloat())
                    'g' -> pickupSpawns += Triple(PickupKind.GEM, fx, row.toFloat())
                    'h' -> pickupSpawns += Triple(PickupKind.HEART, fx, row.toFloat())
                    '*' -> pickupSpawns += Triple(PickupKind.STAR, fx, row.toFloat())
                    'd' -> pickupSpawns += Triple(PickupKind.DASH, fx, row.toFloat())
                    'f' -> pickupSpawns += Triple(PickupKind.FEATHER, fx, row.toFloat())
                    'b' -> pickupSpawns += Triple(PickupKind.SHIELD, fx, row.toFloat())
                    'M' -> pickupSpawns += Triple(PickupKind.MAGNET, fx, row.toFloat())
                }
                if (c !in "#=?xs^") tiles[row][col] = '.'
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
    var lastBonus by mutableIntStateOf(0)
    /** HUD を毎フレーム更新するためのカウンタ。 */
    var hudTick by mutableIntStateOf(0)

    var level = Level(LEVELS[0])
        private set

    val player = Player()
    val enemies = mutableListOf<Enemy>()
    val pickups = mutableListOf<Pickup>()
    val checkpoints = mutableListOf<Checkpoint>()
    val movers = mutableListOf<Mover>()
    val pops = mutableListOf<Pop>()

    var cameraX = 0f
        private set
    var elapsed = 0f
        private set
    var stageTime = 0f
        private set
    var combo = 0
        private set
    /** エンディングの経過秒。スタッフロールの進み具合に使う。 */
    var endingT = 0f
        private set
    var totalTime = 0f
        private set

    private var phaseT = 0f
    private var hudFrame = 0
    private var bossRemaining = 0
    private var spawnX = 2f
    private var spawnY = 9f

    val bossAlive: Boolean get() = bossRemaining > 0
    val goalLocked: Boolean get() = level.hasBoss && bossAlive

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
        totalTime = 0f
        loadLevel(0)
        phase = Phase.PLAYING
    }

    fun advance() {
        when (phase) {
            Phase.TITLE -> startGame()
            Phase.LEVEL_CLEAR -> {
                if (levelIndex + 1 >= LEVELS.size) {
                    endingT = 0f
                    phase = Phase.ENDING
                } else {
                    levelIndex += 1
                    loadLevel(levelIndex)
                    phase = Phase.PLAYING
                }
            }
            Phase.ENDING -> phase = Phase.ALL_CLEAR
            Phase.GAME_OVER, Phase.ALL_CLEAR -> {
                phase = Phase.TITLE
                levelIndex = 0
                loadLevel(0)
            }
            else -> {}
        }
    }

    private fun loadLevel(index: Int) {
        level = Level(LEVELS[index])
        spawnX = level.startX
        spawnY = level.startY
        stageTime = 0f
        checkpoints.clear()
        for ((cx, cy) in level.checkpointSpawns) checkpoints += Checkpoint(cx, cy)
        pickups.clear()
        for ((kind, px, py) in level.pickupSpawns) pickups += Pickup(kind, px, py)
        movers.clear()
        for ((mx, my, vertical) in level.moverSpawns) movers += Mover(mx, my, vertical)
        player.hasShield = false
        player.dashT = 0f
        player.featherT = 0f
        player.magnetT = 0f
        respawn()
    }

    private fun respawn() {
        player.x = spawnX
        player.y = spawnY
        player.vx = 0f
        player.vy = 0f
        player.starT = 0f
        player.hurtT = SPAWN_GRACE
        player.faceRight = true
        player.airJumps = 0
        combo = 0
        enemies.clear()
        bossRemaining = 0
        for ((kind, ex, ey) in level.enemySpawns) {
            val e = Enemy(kind, ex, ey)
            enemies += e
            if (kind == EnemyKind.BOSS) {
                bossRemaining += 1
                computeArena(e)
            }
        }
        pops.clear()
        cameraX = 0f
        phaseT = 0f
        jumpQueued = false
    }

    fun update(dt: Float, viewTilesX: Float) {
        elapsed += dt
        for (p in pops) p.t += dt
        pops.removeAll { it.t > 0.8f }
        for (p in pickups) p.t += dt

        when (phase) {
            Phase.PLAYING -> {
                stageTime += dt
                updateMovers(dt)
                updatePlayer(dt)
                updateEnemies(dt)
                collide()
                updateCamera(viewTilesX)
            }
            Phase.DYING -> {
                phaseT += dt
                player.animT += dt
                player.vy = (player.vy + GRAVITY * dt).coerceAtMost(MAX_FALL)
                player.y += player.vy * dt
                if (phaseT > 1.4f) {
                    if (lives <= 0) phase = Phase.GAME_OVER else {
                        respawn()
                        phase = Phase.PLAYING
                    }
                }
            }
            Phase.ENDING -> {
                endingT += dt
                player.animT += dt
            }
            else -> {
                player.animT += dt
                updateMovers(dt)
            }
        }
        jumpQueued = false
        // HUD の再構成は毎フレームだと無駄が多いので間引く。
        hudFrame += 1
        if (hudFrame % 6 == 0) hudTick += 1
    }

    // --- 移動床 ----------------------------------------------------------
    private fun updateMovers(dt: Float) {
        for (m in movers) {
            m.prevX = m.x
            m.prevY = m.y
            m.t += dt
            val offset = sin(m.t * MOVER_OMEGA)
            if (m.vertical) {
                m.y = m.homeY + offset * MOVER_AMP_Y
            } else {
                m.x = m.homeX - (Mover.W - 1f) / 2f + offset * MOVER_AMP_X
            }
        }
    }

    // --- プレイヤー ------------------------------------------------------
    private fun updatePlayer(dt: Float) {
        val p = player
        p.animT += dt
        if (p.starT > 0f) p.starT -= dt
        if (p.hurtT > 0f) p.hurtT -= dt
        if (p.dashT > 0f) p.dashT -= dt
        if (p.featherT > 0f) p.featherT -= dt
        if (p.magnetT > 0f) p.magnetT -= dt

        val dir = (if (inputRight) 1f else 0f) - (if (inputLeft) 1f else 0f)
        val speed = if (p.dashT > 0f) MOVE_SPEED * DASH_MULTIPLIER else MOVE_SPEED
        p.vx = dir * speed
        if (dir > 0f) p.faceRight = true
        if (dir < 0f) p.faceRight = false

        if (jumpQueued) {
            if (p.onGround) {
                p.vy = JUMP_VELOCITY
                p.onGround = false
            } else if (p.featherT > 0f && p.airJumps < 1) {
                p.vy = AIR_JUMP_VELOCITY
                p.airJumps += 1
                pops += Pop(p.x + Player.W / 2f, p.y + Player.H, PickupKind.FEATHER)
            }
        }
        if (!jumpHeld && p.vy < JUMP_CUT) p.vy = JUMP_CUT

        moveX(dt)
        moveY(dt)
        rideMovers()

        if (p.onGround) {
            p.airJumps = 0
            combo = 0
        }
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
                val c = tileAt(tx, ty)
                if (isSolid(c)) {
                    p.y = ty - Player.H
                    if (c == '^') {
                        // ジャンプ台。着地したら高く打ち上げる。
                        p.vy = BOUNCE_VELOCITY
                        p.airJumps = 0
                        pops += Pop(tx + 0.5f, ty.toFloat(), null, "ぽよん")
                    } else {
                        p.vy = 0f
                        p.onGround = true
                    }
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

    /** 移動床は上面だけ当たる。乗っているあいだは一緒に運ばれる。 */
    private fun rideMovers() {
        val p = player
        if (p.vy < -0.5f) return
        val feet = p.y + Player.H
        for (m in movers) {
            if (p.x + Player.W <= m.x || p.x >= m.x + Mover.W) continue
            if (feet < m.y - 0.3f || feet > m.y + 0.7f) continue
            p.y = m.y - Player.H
            p.vy = 0f
            p.onGround = true
            p.x += m.x - m.prevX
            break
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
            if (e.invulnT > 0f) e.invulnT -= dt
            // 画面から遠い敵は動かさない
            if (e.kind != EnemyKind.BOSS && (e.x < cameraX - 6f || e.x > cameraX + 34f)) continue
            when (e.kind) {
                EnemyKind.FLYER -> {
                    e.x = e.homeX + sin(e.t * 1.1f) * 3.2f
                    e.y = e.homeY + sin(e.t * 2.4f) * 1.1f
                    e.vx = if (sin(e.t * 1.1f + 0.1f) > sin(e.t * 1.1f)) 1f else -1f
                }
                EnemyKind.JUMPER -> {
                    e.actionT += dt
                    if (e.actionT > 1.7f && e.vy == 0f) {
                        e.vy = -14f
                        e.actionT = 0f
                    }
                    e.x += e.vx * 0.35f * dt
                    walkCollide(e, dt, turnAtLedge = true)
                }
                EnemyKind.CHASER -> {
                    val dx = player.x - e.x
                    if (abs(dx) < 8f && abs(player.y - e.y) < 3f) {
                        e.vx = sign(dx) * 3.4f
                    } else if (abs(e.vx) > 2.1f) {
                        e.vx = sign(e.vx) * 2.0f
                    }
                    e.x += e.vx * dt
                    walkCollide(e, dt, turnAtLedge = true)
                }
                EnemyKind.BOSS -> updateBoss(e, dt)
                else -> {
                    e.x += e.vx * dt
                    walkCollide(e, dt, turnAtLedge = true)
                }
            }
        }
        enemies.removeAll { !it.alive && it.squashT > 0.7f }
    }

    /** 歩く敵の壁・段差・落下処理。 */
    private fun walkCollide(e: Enemy, dt: Float, turnAtLedge: Boolean) {
        val ty0 = floor(e.y + 0.05f).toInt()
        val ty1 = floor(e.y + e.h - 0.05f).toInt()
        val aheadX = if (e.vx > 0f) floor(e.x + e.w).toInt() else floor(e.x).toInt()
        var turn = false
        for (ty in ty0..ty1) if (isSolid(tileAt(aheadX, ty))) turn = true
        if (turnAtLedge && e.vy == 0f) {
            val footY = floor(e.y + e.h + 0.2f).toInt()
            if (!isSolid(tileAt(aheadX, footY))) turn = true
        }
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

    /** ボスの足場（地続きになっている範囲）を調べる。 */
    private fun computeArena(e: Enemy) {
        val footRow = floor(e.homeY + e.h + 0.2f).toInt()
        var left = floor(e.homeX).toInt()
        while (left - 1 >= 0 && isSolid(tileAt(left - 1, footRow))) left -= 1
        var right = floor(e.homeX + e.w).toInt()
        while (right + 1 < level.width && isSolid(tileAt(right + 1, footRow))) right += 1
        e.minX = left.toFloat()
        e.maxX = (right + 1f - e.w).coerceAtLeast(e.minX)
    }

    private fun updateBoss(e: Enemy, dt: Float) {
        e.actionT += dt
        val dx = player.x - e.x
        // 残り HP が減るほど速くなる
        val speed = 2.0f + (BOSS_HP - e.hp) * 0.9f
        e.vx = sign(dx) * speed
        if (e.actionT > 2.4f && e.vy == 0f) {
            e.vy = -15f
            e.actionT = 0f
        }
        e.x += e.vx * dt
        walkCollide(e, dt, turnAtLedge = false)
        e.x = e.x.coerceIn(e.minX, e.maxX)
    }

    // --- 当たり判定 ------------------------------------------------------
    private fun overlaps(
        ax: Float, ay: Float, aw: Float, ah: Float,
        bx: Float, by: Float, bw: Float, bh: Float,
    ): Boolean = ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

    private fun collide() {
        val p = player
        val pcx = p.x + Player.W / 2f
        val pcy = p.y + Player.H / 2f

        // マグネット: 近くのコインを引き寄せる
        if (p.magnetT > 0f) {
            for (pk in pickups) {
                if (pk.taken || (pk.kind != PickupKind.COIN && pk.kind != PickupKind.GEM)) continue
                val dx = pcx - (pk.x + 0.5f)
                val dy = pcy - (pk.y + 0.5f)
                val d = sqrt(dx * dx + dy * dy)
                if (d < MAGNET_RANGE && d > 0.01f) {
                    val pull = 9f * (1f - d / MAGNET_RANGE) * 0.016f
                    pk.x += dx / d * pull * 3f
                    pk.y += dy / d * pull * 3f
                }
            }
        }

        for (pk in pickups) {
            if (pk.taken) continue
            if (!overlaps(p.x, p.y, Player.W, Player.H, pk.x + 0.1f, pk.y + 0.1f, 0.8f, 0.8f)) continue
            pk.taken = true
            pops += Pop(pk.x + 0.5f, pk.y, pk.kind)
            when (pk.kind) {
                PickupKind.COIN -> {
                    coinCount += 1
                    score += 100
                }
                PickupKind.GEM -> {
                    score += 500
                }
                PickupKind.HEART -> {
                    lives += 1
                    score += 200
                }
                PickupKind.STAR -> {
                    p.starT = STAR_TIME
                    score += 300
                }
                PickupKind.DASH -> {
                    p.dashT = DASH_TIME
                    score += 300
                }
                PickupKind.FEATHER -> {
                    p.featherT = FEATHER_TIME
                    score += 300
                }
                PickupKind.SHIELD -> {
                    p.hasShield = true
                    score += 300
                }
                PickupKind.MAGNET -> {
                    p.magnetT = MAGNET_TIME
                    score += 300
                }
            }
        }
        pickups.removeAll { it.taken }

        for (cp in checkpoints) {
            if (cp.active) continue
            if (overlaps(p.x, p.y, Player.W, Player.H, cp.x, cp.y - 3f, 1f, 3f)) {
                cp.active = true
                spawnX = cp.x
                spawnY = cp.y - Player.H
                score += 100
                pops += Pop(cp.x + 0.5f, cp.y - 3f, null, "チェックポイント!")
            }
        }

        for (e in enemies) {
            if (!e.alive) continue
            // 点滅中（ダメージ直後）の敵とはやり取りしない。踏んでも当たっても無効。
            if (e.invulnT > 0f) continue
            if (!overlaps(p.x, p.y, Player.W, Player.H, e.x, e.y, e.w, e.h)) continue
            val stomping = p.vy > 1f && (p.y + Player.H) < e.y + e.h * 0.7f
            when {
                p.starT > 0f -> hitEnemy(e, bounce = false)
                e.stompable && stomping -> hitEnemy(e, bounce = true)
                else -> hurt()
            }
        }

        // ダメージ床（トゲ・溶岩）
        val tx0 = floor(p.x + 0.1f).toInt()
        val tx1 = floor(p.x + Player.W - 0.1f).toInt()
        val ty = floor(p.y + Player.H - 0.1f).toInt()
        for (tx in tx0..tx1) if (tileAt(tx, ty) == 's') hurt()

        // ゴール（ボスがいるステージはボスを倒すまで開かない）
        if (!goalLocked &&
            overlaps(p.x, p.y, Player.W, Player.H, level.goalX, level.goalY - 4f, 1f, 4f)
        ) {
            clearStage()
        }
    }

    private fun hitEnemy(e: Enemy, bounce: Boolean) {
        if (e.invulnT > 0f) return
        if (bounce) player.vy = STOMP_BOUNCE
        e.hp -= 1
        if (e.hp > 0) {
            e.invulnT = 1.2f
            score += 300
            pops += Pop(e.x + e.w / 2f, e.y, null, "のこり ${e.hp}")
            return
        }
        e.alive = false
        e.squashT = 0f
        if (e.kind == EnemyKind.BOSS) {
            bossRemaining -= 1
            score += 3000
            pops += Pop(e.x + e.w / 2f, e.y, null, "ボス撃破!")
        } else {
            combo += 1
            val gained = 200 * combo.coerceAtMost(5)
            score += gained
            pops += Pop(e.x + e.w / 2f, e.y, null, if (combo > 1) "${gained} コンボ!" else "$gained")
        }
    }

    private fun hurt() {
        val p = player
        if (p.hurtT > 0f || p.starT > 0f) return
        if (p.hasShield) {
            // バリアが 1 回だけ肩代わりする
            p.hasShield = false
            p.hurtT = HURT_TIME
            p.vy = -8f
            pops += Pop(p.x + Player.W / 2f, p.y, PickupKind.SHIELD, "セーフ!")
            return
        }
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

    private fun clearStage() {
        val timeBonus = ((CLEAR_TIME_LIMIT - stageTime).coerceAtLeast(0f) * 10f).toInt()
        totalTime += stageTime
        lastBonus = timeBonus
        score += 1000 + timeBonus
        phase = Phase.LEVEL_CLEAR
    }

    private fun updateCamera(viewTilesX: Float) {
        val target = player.x + Player.W / 2f - viewTilesX / 2f
        val maxX = (level.width - viewTilesX).coerceAtLeast(0f)
        cameraX = target.coerceIn(0f, maxX)
    }
}
