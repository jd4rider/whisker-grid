import Phaser from 'phaser'
import { W, H, background, button, text, fade } from './common.js'
import { ring, flashAt, popText, grains, hearts } from './fx.js'
import { audioState, sfx } from '../sound.js'
import { data, persist } from './save.js'
import {
  generate, rushSpec, levelPuzzle, nextHint, starsFor, conflicts, isSolved, mouseCells, clashes, sizeFor, rowOf, colOf,
  TOTAL_LEVELS, WORLDS, LEVELS_PER_WORLD,
} from '../game.js'

const BOARD_TOP = 140
const BOARD_H = 660
const RUSH_TIME = 120
const DOUBLE_MS = 340
const POWER = { hint: 3, reveal: 1, mouse: 3 }
const COLORS = [0xf9a8d4, 0xfdba74, 0xfde047, 0x86efac, 0x67e8f9, 0x93c5fd, 0xc4b5fd, 0xd6a77a, 0xcbd5e1]
const EMPTY = 0
const CROSS = 1
const MOUSE = 2
const CAT = 3
const worldOf = (level) => Math.min(WORLDS.length - 1, Math.floor((level - 1) / LEVELS_PER_WORLD))

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game')
  }

  init(cfg = {}) {
    this.mode = cfg.mode ?? 'puzzle'
    this.level = cfg.level ?? 1
    this.worldIndex = this.mode === 'puzzle' ? worldOf(this.level) : 0
    this.rushSolved = 0
    this.rushSeed = Math.floor(Math.random() * 1e9)
    this.busy = true
    this.phase = 'intro'
    this.panel = null
    this.cells = []
    this.history = []
    this.drag = null
    this.lastTap = { i: -1, t: 0, prev: 0 }
    this.glow = -1
  }

  create() {
    const world = WORLDS[this.worldIndex]
    this.world = world
    background(this, world.bg, 0xf9a8d4)
    this.cameras.main.fadeIn(250, 4, 20, 36)

    this.add.rectangle(W / 2, 62, W, 124, 0x12041d, 0.94).setDepth(30)
    this.add.rectangle(W / 2, 124, W, 3, world.color, 0.9).setDepth(31)
    this.titleText = text(this, 24, 22, '', 30, '#fff', { fontStyle: 'bold' }).setDepth(32)
    this.subText = text(this, 24, 66, '', 18, '#f9a8d4').setDepth(32)
    this.mainText = text(this, W / 2 + 20, 56, '', 50, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(32)
    this.rightText = text(this, W - 24, 36, '', 20, '#fbcfe8', { align: 'right' }).setOrigin(1, 0.5).setDepth(32)
    this.rightText2 = text(this, W - 24, 70, '', 20, '#fbcfe8', { align: 'right' }).setOrigin(1, 0.5).setDepth(32)

    const y = 834
    const opts = { w: 98, h: 44, size: 15 }
    const x = (i) => 63 + i * 103
    this.hintBtn = button(this, x(0), y, '', () => this.power('hint'), { ...opts, color: 0xb45309 }).setDepth(32)
    this.revealBtn = button(this, x(1), y, '', () => this.power('reveal'), { ...opts, color: 0xbe185d }).setDepth(32)
    this.mouseBtn = button(this, x(2), y, '', () => this.power('mouse'), { ...opts, color: 0x7c3aed }).setDepth(32)
    button(this, x(3), y, '↶ Undo', () => this.undo(), { ...opts, color: 0x0369a1 }).setDepth(32)
    this.soundBtn = button(this, x(4), y, audioState.muted ? '🔇' : '🔊', () => {
      audioState.muted = !audioState.muted
      data.muted = audioState.muted
      persist()
      this.soundBtn.setLabel(audioState.muted ? '🔇' : '🔊')
    }, { ...opts, color: 0x374151 }).setDepth(32)
    button(this, x(5), y, this.mode === 'puzzle' ? 'Levels' : 'Menu', () => this.leave(), { ...opts, color: 0x374151 }).setDepth(32)

    this.toast = text(this, W / 2, 400, '', 30, '#fde68a', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6, align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.input.on('pointerdown', (p) => this.onDown(p))
    this.input.on('pointermove', (p) => this.onMove(p))
    this.input.on('pointerup', () => (this.drag = null))
    this.input.on('pointerupoutside', () => (this.drag = null))

    if (this.mode === 'rush') {
      this.timeLeft = RUSH_TIME
      this.timer = this.time.addEvent({ delay: 100, loop: true, callback: () => this.tick() })
    }
    this.begin(false)
  }

  // ---------- lifecycle ----------

  async begin(withWipe) {
    this.busy = true
    this.phase = 'intro'
    if (withWipe) await this.wipe(true)
    this.puzzle = this.mode === 'puzzle' ? levelPuzzle(this.level) : generate(rushSpec(this.rushSolved, this.rushSeed))
    this.n = this.puzzle.n
    this.region = this.puzzle.region
    this.st = Array(this.n * this.n).fill(EMPTY)
    this.history = []
    this.mistakes = 0
    this.hints = 0
    this.uses = { ...POWER }
    this.glow = -1
    this.drag = null
    this.panel?.destroy()
    this.panel = null
    this.buildBoard()
    this.refreshAll()
    if (withWipe) await this.wipe(false)
    if (this.mode === 'puzzle') await this.intro()
    await this.popIn()
    this.phase = 'play'
    this.busy = false
  }

  buildBoard() {
    this.boardCont?.destroy()
    const n = this.n
    const cs = Math.min(Math.floor(594 / n), 110)
    this.cs = cs
    this.left = (W - n * cs) / 2
    this.top = BOARD_TOP + (BOARD_H - n * cs) / 2
    const half = (n * cs) / 2
    this.cx = W / 2
    this.cy = this.top + half
    const cont = this.add.container(this.cx, this.cy).setDepth(2).setScale(0)
    this.boardCont = cont
    this.gfx = this.add.graphics()
    this.lines = this.add.graphics()
    this.marks = this.add.graphics()
    cont.add([this.gfx, this.marks, this.lines])
    this.cells = []
    for (let i = 0; i < n * n; i++) {
      const lx = -half + colOf(n, i) * cs + cs / 2
      const ly = -half + rowOf(n, i) * cs + cs / 2
      const img = this.add.image(lx, ly, `cat_${this.region[i]}`).setDisplaySize(cs * 0.84, cs * 0.87).setVisible(false)
      const mouse = this.add.text(lx, ly, '🐭', { fontSize: `${Math.floor(cs * 0.55)}px` }).setOrigin(0.5).setVisible(false)
      cont.add([img, mouse])
      this.cells.push({ img, mouse, lx, ly })
    }
    // Thin lines inside a colour, thick walls between colours.
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c
        const x0 = -half + c * cs
        const y0 = -half + r * cs
        if (c < n - 1) {
          const wall = this.region[i] !== this.region[i + 1]
          this.lines.lineStyle(wall ? 4 : 1, wall ? 0x2a0a3d : 0x000000, wall ? 1 : 0.18).lineBetween(x0 + cs, y0, x0 + cs, y0 + cs)
        }
        if (r < n - 1) {
          const wall = this.region[i] !== this.region[i + n]
          this.lines.lineStyle(wall ? 4 : 1, wall ? 0x2a0a3d : 0x000000, wall ? 1 : 0.18).lineBetween(x0, y0 + cs, x0 + cs, y0 + cs)
        }
      }
    }
    this.lines.lineStyle(5, this.world.color, 1).strokeRoundedRect(-half - 3, -half - 3, n * cs + 6, n * cs + 6, 6)
  }

  cellAt(x, y) {
    const n = this.n
    const c = Math.floor((x - this.left) / this.cs)
    const r = Math.floor((y - this.top) / this.cs)
    return c < 0 || r < 0 || c >= n || r >= n ? -1 : r * n + c
  }

  wxy(i) {
    return { x: this.cx + this.cells[i].lx, y: this.cy + this.cells[i].ly }
  }

  catList() {
    const out = []
    this.st.forEach((v, i) => v === CAT && out.push(i))
    return out
  }

  // ---------- drawing ----------

  paint() {
    const n = this.n
    const cs = this.cs
    const half = (n * cs) / 2
    this.gfx.clear()
    this.marks.clear()
    const bad = conflicts(n, this.region, this.catList())
    for (let i = 0; i < n * n; i++) {
      const x = -half + colOf(n, i) * cs
      const y = -half + rowOf(n, i) * cs
      this.gfx.fillStyle(COLORS[this.region[i]], 1).fillRect(x, y, cs, cs)
      if (bad.has(i)) this.gfx.fillStyle(0xef4444, 0.55).fillRect(x, y, cs, cs)
      if (i === this.glow) this.gfx.fillStyle(0xffffff, 0.75).fillRect(x, y, cs, cs)
      if (this.st[i] === CROSS) {
        const m = cs * 0.28
        this.marks.lineStyle(Math.max(3, cs * 0.06), 0x3b0a52, 0.55)
        this.marks.lineBetween(x + m, y + m, x + cs - m, y + cs - m).lineBetween(x + cs - m, y + m, x + m, y + cs - m)
      }
    }
  }

  renderCell(i) {
    const c = this.cells[i]
    c.img.setVisible(this.st[i] === CAT)
    c.mouse.setVisible(this.st[i] === MOUSE)
  }

  refreshAll() {
    for (let i = 0; i < this.n * this.n; i++) this.renderCell(i)
    this.paint()
    this.refreshHud()
  }

  refreshHud() {
    this.hintBtn.setLabel(`💡 ${this.uses.hint}`)
    this.revealBtn.setLabel(`🐱 ${this.uses.reveal}`)
    this.mouseBtn.setLabel(`🐭 ${this.uses.mouse}`)
    const cats = this.catList().length
    if (this.mode === 'puzzle') {
      this.titleText.setText(`Level ${this.level}`)
      this.subText.setText(`${this.n} colors · ${this.world.name}`)
      this.mainText.setText(`🐱 ${cats}/${this.n}`)
      this.rightText.setText(`😿 ${this.mistakes}`).setY(36)
      this.rightText2.setText(`💡 ${this.hints}`)
    } else {
      this.titleText.setText('Rush')
      this.subText.setText(`${this.n} colors · Best ${data.bestRush}`)
      this.mainText.setText(`${Math.ceil(this.timeLeft)}s`)
      this.rightText.setText(`Solved ${this.rushSolved}`).setY(36)
      this.rightText2.setText(`🐱 ${cats}/${this.n}`)
    }
  }

  // ---------- input: tap = cross, drag = cross many, double tap = cat ----------

  snap() {
    this.history.push(this.st.slice())
    if (this.history.length > 200) this.history.shift()
  }

  onDown(p) {
    if (this.busy || this.phase !== 'play') return
    const i = this.cellAt(p.worldX, p.worldY)
    if (i < 0) return
    const prev = this.st[i]
    const now = this.time.now
    if (this.lastTap.i === i && now - this.lastTap.t < DOUBLE_MS) {
      const was = this.lastTap.prev
      this.lastTap = { i: -1, t: 0, prev: 0 }
      this.st = this.history.pop() ?? this.st
      this.drag = null
      this.toggleCat(i, was)
      return
    }
    this.lastTap = { i, t: now, prev }
    this.snap()
    if (prev === CAT) {
      this.drag = { mode: 'none', last: i }
      return
    }
    const mode = prev === EMPTY ? 'cross' : 'clear'
    this.drag = { mode, last: i }
    this.st[i] = mode === 'cross' ? CROSS : EMPTY
    sfx.select()
    this.renderCell(i)
    this.paint()
  }

  onMove(p) {
    if (!this.drag || this.drag.mode === 'none' || this.busy || this.phase !== 'play') return
    const i = this.cellAt(p.worldX, p.worldY)
    if (i < 0 || i === this.drag.last) return
    this.drag.last = i
    this.lastTap = { i: -1, t: 0, prev: 0 }
    if (this.drag.mode === 'cross' && this.st[i] === EMPTY) this.st[i] = CROSS
    else if (this.drag.mode === 'clear' && (this.st[i] === CROSS || this.st[i] === MOUSE)) this.st[i] = EMPTY
    else return
    sfx.click()
    this.renderCell(i)
    this.paint()
  }

  // Double tap: put a cat in the square, or lift the cat that is already there.
  toggleCat(i, prev = this.st[i]) {
    if (this.busy || this.phase !== 'play') return
    this.snap()
    if (prev === CAT) {
      this.st[i] = EMPTY
      sfx.click()
      this.renderCell(i)
      this.paint()
      this.refreshHud()
      return
    }
    this.st[i] = CAT
    this.afterPlace(i, false)
  }

  afterPlace(i, free) {
    const n = this.n
    const cats = this.catList()
    const bad = conflicts(n, this.region, cats)
    this.renderCell(i)
    this.paint()
    this.refreshHud()
    const c = this.cells[i].img
    c.setScale(0.2)
    this.tweens.add({ targets: c, scaleX: (this.cs * 0.84) / c.width, scaleY: (this.cs * 0.87) / c.height, duration: 260, ease: 'Back.Out' })
    const q = this.wxy(i)
    if (bad.has(i) && !free) {
      this.mistakes++
      if (this.mode === 'rush') this.timeLeft = Math.max(1, this.timeLeft - 3)
      sfx.wrong()
      popText(this, q.x, q.y - this.cs * 0.5, this.mode === 'rush' ? 'Hiss! -3s' : 'Hiss!', '#fca5a5', 24)
      this.refreshHud()
      return
    }
    sfx.meow(this.region[i] + 1)
    ring(this, q.x, q.y, free ? 0xfde047 : 0xf9a8d4, this.cs * 0.8, 420, 4)
    hearts(this, q.x, q.y, free ? 5 : 3, this.cs * 0.25)
    if (isSolved(n, this.region, cats)) this.win()
  }

  undo() {
    if (this.busy || this.phase !== 'play' || !this.history.length) return
    this.st = this.history.pop()
    this.lastTap = { i: -1, t: 0, prev: 0 }
    sfx.click()
    this.refreshAll()
  }

  // ---------- power-ups ----------

  power(kind) {
    if (this.busy || this.phase !== 'play') return
    if (this.uses[kind] <= 0) {
      this.say('None left this level', '#fca5a5')
      return
    }
    const n = this.n
    const target = nextHint(n, this.puzzle.sol, this.catList())
    if (target < 0) return
    const cost = { hint: 3, reveal: 5, mouse: 2 }[kind]
    this.uses[kind]--
    this.hints++
    if (this.mode === 'rush') this.timeLeft = Math.max(1, this.timeLeft - cost)
    sfx.hint()
    if (kind === 'hint') {
      const q = this.wxy(target)
      this.glow = target
      this.paint()
      flashAt(this, q.x, q.y, this.cs * 2.4, 0xfde047)
      ring(this, q.x, q.y, 0xfde047, this.cs, 600, 5)
      this.say('A cat belongs here!', '#fde68a')
      this.time.delayedCall(2200, () => {
        this.glow = -1
        if (this.phase === 'play') this.paint()
      })
    } else if (kind === 'reveal') {
      this.snap()
      // Lift any cat that would clash with the revealed one.
      this.catList().forEach((j) => clashes(n, this.region, j, target) && (this.st[j] = EMPTY))
      this.st.forEach((_, j) => j !== target && clashes(n, this.region, j, target) && this.st[j] === CAT && (this.st[j] = EMPTY))
      this.st[target] = CAT
      for (let j = 0; j < n * n; j++) this.renderCell(j)
      const q = this.wxy(target)
      flashAt(this, q.x, q.y, this.cs * 2.2, 0xfde047)
      this.afterPlace(target, true)
    } else {
      this.snap()
      const open = []
      this.st.forEach((v, j) => (v === EMPTY || v === CROSS) && open.push(j))
      const picks = mouseCells(n, this.puzzle.sol, open, 4)
      picks.forEach((j, k) => {
        this.st[j] = MOUSE
        this.time.delayedCall(k * 120, () => {
          if (!this.cells[j]?.mouse.active) return
          this.renderCell(j)
          const q = this.wxy(j)
          const m = this.cells[j].mouse
          m.setScale(0)
          this.tweens.add({ targets: m, scale: 1, duration: 260, ease: 'Back.Out' })
          ring(this, q.x, q.y, 0xc4b5fd, this.cs * 0.7, 360, 3)
        })
      })
      this.paint()
      this.say('Squeak! No cats here', '#ddd6fe')
    }
    this.refreshHud()
  }

  // ---------- helpers ----------

  async popIn() {
    sfx.whoosh()
    await this.tween({ targets: this.boardCont, scale: 1, duration: 340, ease: 'Back.Out' })
  }

  async intro() {
    const label = `Level ${this.level}`
    const first = this.level === 1 || sizeFor(this.level) !== sizeFor(this.level - 1)
    const sub = this.level === 1
      ? 'One cat per color, row and column.\nCats can’t touch — not even diagonally!\nTap to cross out, drag to cross many, double tap for a cat.'
      : first ? `New: ${sizeFor(this.level)} colors on a ${sizeFor(this.level)}×${sizeFor(this.level)} board!` : this.world.blurb
    sfx.whoosh()
    const cy = BOARD_TOP + BOARD_H / 2
    const band = this.add.rectangle(W / 2, cy, W, 220, 0x000000, 0.78).setDepth(40).setScale(1, 0)
    const l1 = this.add.rectangle(W / 2, cy - 110, W, 4, this.world.color).setDepth(41).setScale(0, 1)
    const l2 = this.add.rectangle(W / 2, cy + 110, W, 4, this.world.color).setDepth(41).setScale(0, 1)
    const t1 = text(this, -300, cy - 50, label, 64, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(42)
    const t2 = text(this, W + 400, cy + 35, sub, 20, '#fbcfe8', { align: 'center', wordWrap: { width: 540 }, lineSpacing: 6 }).setOrigin(0.5).setDepth(42)
    await Promise.all([
      this.tween({ targets: band, scaleY: 1, duration: 220, ease: 'Back.Out' }),
      this.tween({ targets: [l1, l2], scaleX: 1, duration: 300 }),
      this.tween({ targets: t1, x: W / 2, duration: 420, ease: 'Back.Out' }),
      this.tween({ targets: t2, x: W / 2, duration: 520, ease: 'Cubic.Out' }),
    ])
    await this.delay(this.level === 1 ? 2600 : first ? 1600 : 800)
    await Promise.all([
      this.tween({ targets: t1, x: W + 400, duration: 300, ease: 'Cubic.In' }),
      this.tween({ targets: t2, x: -400, duration: 300, ease: 'Cubic.In' }),
      this.tween({ targets: band, scaleY: 0, duration: 260, delay: 120 }),
      this.tween({ targets: [l1, l2], scaleX: 0, duration: 260, delay: 120 }),
    ])
    ;[band, l1, l2, t1, t2].forEach((o) => o.destroy())
  }

  // A pink curtain of paw prints sweeps up between levels.
  async wipe(closing) {
    sfx.whoosh()
    if (closing) {
      const wave = this.add.container(0, H + 80).setDepth(60)
      wave.add(this.add.rectangle(0, 0, W, H + 240, 0xdb2777).setOrigin(0, 0))
      for (let i = 0; i < 9; i++) wave.add(this.add.image(35 + i * 70, Phaser.Math.Between(-30, 10), 'paw').setScale(1.1).setTint(0xfbcfe8).setAngle(Phaser.Math.Between(-25, 25)))
      for (let i = 0; i < 6; i++) wave.add(this.add.image(60 + i * 100, 150 + (i % 2) * 90, 'paw').setScale(0.9).setTint(0xf472b6).setAngle(Phaser.Math.Between(-25, 25)))
      this.wave = wave
      await this.tween({ targets: wave, y: -60, duration: 520, ease: 'Cubic.InOut' })
    } else {
      await this.tween({ targets: this.wave, y: -H - 300, duration: 560, ease: 'Cubic.InOut' })
      this.wave.destroy()
      this.wave = null
    }
  }

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }))
  }

  delay(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve))
  }

  say(msg, color = '#fde68a') {
    this.tweens.killTweensOf(this.toast)
    this.toast.setText(msg).setColor(color).setAlpha(1).setScale(0.6).setY(BOARD_TOP + 330)
    this.tweens.add({ targets: this.toast, scale: 1, duration: 150 })
    this.tweens.add({ targets: this.toast, y: BOARD_TOP + 280, alpha: 0, delay: 900, duration: 500 })
  }

  tick() {
    if (this.phase !== 'play') return
    this.timeLeft = Math.max(0, this.timeLeft - 0.1)
    this.refreshHud()
    if (this.timeLeft <= 0) this.finishRush()
  }

  // ---------- endings ----------

  async win() {
    this.busy = true
    this.phase = 'won'
    this.glow = -1
    this.paint()
    await this.delay(400)
    sfx.win()
    const n = this.n
    for (let i = 0; i < n * n; i++) {
      if (this.st[i] !== CAT) continue
      this.time.delayedCall(rowOf(n, i) * 110, () => {
        const img = this.cells[i]?.img
        if (!img?.active) return
        this.tweens.add({ targets: img, angle: { from: -14, to: 14 }, duration: 140, yoyo: true, repeat: 3 })
        const q = this.wxy(i)
        flashAt(this, q.x, q.y, this.cs * 1.6, 0xfbcfe8)
        hearts(this, q.x, q.y, 4, 14)
        sfx.purr()
      })
    }
    ring(this, this.cx, this.cy, 0xfde68a, 420, 800, 6)
    grains(this, this.cx, this.cy, 0xfde68a, 30, 520)
    await this.delay(1700)

    if (this.mode === 'rush') {
      this.rushSolved++
      const bonus = 10 + n * 2
      this.timeLeft = Math.min(RUSH_TIME + 30, this.timeLeft + bonus)
      popText(this, W / 2, 400, `+${bonus}s`, '#86efac', 46)
      sfx.coin()
      await this.delay(450)
      if (this.phase !== 'won') return
      this.begin(false)
      return
    }
    const stars = starsFor(this.mistakes, this.hints)
    data.stars[this.level] = Math.max(data.stars[this.level] || 0, stars)
    data.unlocked = Math.min(TOTAL_LEVELS, Math.max(data.unlocked, this.level + 1))
    persist()
    this.showPanel({ won: true, title: `Level ${this.level} Complete!`, stars, lines: [`😿 ${this.mistakes} mistakes · 💡 ${this.hints} power-ups`] })
  }

  finishRush() {
    if (this.phase === 'over') return
    this.phase = 'over'
    this.busy = true
    sfx.lose()
    const record = this.rushSolved > data.bestRush
    if (record) {
      data.bestRush = this.rushSolved
      persist()
    }
    this.showPanel({ won: false, title: "Time's up!", lines: [`Boards solved: ${this.rushSolved}`, record ? '🏆 New best!' : `Best ${data.bestRush}`] })
  }

  leave() {
    fade(this, this.mode === 'puzzle' ? 'levels' : 'menu', { world: this.worldIndex })
  }

  showPanel({ won, title, stars, lines = [] }) {
    const p = this.add.container(0, 0).setDepth(70)
    this.panel = p
    p.add(this.add.rectangle(W / 2, H / 2, W, H, 0x12041d, 0.82).setInteractive())
    const card = this.add.graphics()
    card.fillStyle(0x2a0a3d, 1).fillRoundedRect(60, 170, W - 120, 500, 24)
    card.lineStyle(3, won ? 0xf472b6 : 0xfb7185, 0.9).strokeRoundedRect(60, 170, W - 120, 500, 24)
    p.add(card)
    p.add(text(this, W / 2, 225, title, 36, won ? '#fde68a' : '#fda4af', { fontStyle: 'bold' }).setOrigin(0.5))
    if (won) {
      const cat = this.add.image(W / 2, 285, `cat_${(this.level - 1) % 9}`).setDisplaySize(70, 73)
      p.add(cat)
      this.tweens.add({ targets: cat, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1 })
    }
    if (stars) {
      for (let i = 0; i < 3; i++) {
        const s = text(this, W / 2 + (i - 1) * 90, 365, '★', 80, i < stars ? '#fde047' : '#4a2663').setOrigin(0.5).setScale(0)
        p.add(s)
        this.tweens.add({ targets: s, scale: 1, duration: 400, delay: 300 + i * 260, ease: 'Back.Out', onStart: () => i < stars && sfx.coin() })
      }
    }
    p.add(text(this, W / 2, stars ? 425 : 320, lines.join('\n'), 24, '#f9a8d4', { align: 'center', lineSpacing: 10 }).setOrigin(0.5, 0))
    const add = (label, y, fn, color) => p.add(button(this, W / 2, y, label, fn, { w: 280, h: 52, color }))
    if (this.mode === 'puzzle') {
      const more = won && this.level < TOTAL_LEVELS
      if (more) add('Next level ▶', 510, () => this.next(), 0xc026d3)
      add('Replay', more ? 570 : 510, () => this.begin(true), 0x86198f)
      add('Levels', more ? 630 : 570, () => this.leave(), 0x374151)
    } else {
      add('Play again', 500, () => fade(this, 'game', { mode: 'rush' }), 0xc026d3)
      add('Menu', 560, () => this.leave(), 0x374151)
    }
    p.setAlpha(0)
    this.tweens.add({ targets: p, alpha: 1, duration: 300 })
  }

  next() {
    const level = this.level + 1
    if (worldOf(level) !== this.worldIndex) fade(this, 'game', { mode: 'puzzle', level })
    else {
      this.level = level
      this.begin(true)
    }
  }
}
