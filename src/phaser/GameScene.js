import Phaser from 'phaser'
import { W, H, CATS, background, button, text, fade } from './common.js'
import { ring, flashAt, popText, grains, hearts } from './fx.js'
import { audioState, sfx } from '../sound.js'
import { data, persist } from './save.js'
import {
  generate, rushSpec, levelPuzzle, nextHint, starsFor, isPeer, boxDims, groupCells, rowOf, colOf, boxOf,
  TOTAL_LEVELS, WORLDS, LEVELS_PER_WORLD,
} from '../game.js'

const BOARD_TOP = 140
const BOARD_H = 600
const RUSH_TIME = 120
const worldOf = (level) => Math.min(WORLDS.length - 1, Math.floor((level - 1) / LEVELS_PER_WORLD))

const INTROS = {
  1: 'Put each cat once in every row, column and box.',
  13: 'New: 6×6 boards with wide 2×3 boxes.',
  25: 'New: the full 9×9 board with nine cats!',
  37: 'Fewer clues now. Use notes (📝) to track guesses.',
  49: 'Grand Meowster: the toughest boards of all.',
}

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
    this.sel = -1
    this.hl = 0
    this.noteMode = false
    this.cells = []
    this.padBtns = []
    this.history = []
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
    this.mainText = text(this, W / 2 + 20, 56, '', 54, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(32)
    this.rightText = text(this, W - 24, 36, '', 20, '#fbcfe8', { align: 'right' }).setOrigin(1, 0.5).setDepth(32)
    this.rightText2 = text(this, W - 24, 70, '', 20, '#fbcfe8', { align: 'right' }).setOrigin(1, 0.5).setDepth(32)

    const y = 834
    const opts = { w: 98, h: 44, size: 15 }
    const x = (i) => 63 + i * 103
    button(this, x(0), y, '💡 Hint', () => this.hint(), { ...opts, color: 0xb45309 }).setDepth(32)
    button(this, x(1), y, '↶ Undo', () => this.undo(), { ...opts, color: 0x0369a1 }).setDepth(32)
    this.noteBtn = button(this, x(2), y, '📝 Off', () => this.toggleNotes(), { ...opts, color: 0x7c3aed }).setDepth(32)
    button(this, x(3), y, '⌫ Erase', () => this.erase(), { ...opts, color: 0xbe123c }).setDepth(32)
    this.soundBtn = button(this, x(4), y, audioState.muted ? '🔇' : '🔊', () => {
      audioState.muted = !audioState.muted
      data.muted = audioState.muted
      persist()
      this.soundBtn.setLabel(audioState.muted ? '🔇' : '🔊')
    }, { ...opts, color: 0x374151 }).setDepth(32)
    button(this, x(5), y, this.mode === 'puzzle' ? 'Levels' : 'Menu', () => this.leave(), { ...opts, color: 0x374151 }).setDepth(32)

    this.toast = text(this, W / 2, 400, '', 32, '#fde68a', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6, align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.input.on('pointerdown', (p) => this.onTap(p))

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
    this.grid = this.puzzle.puzzle.slice()
    this.given = this.puzzle.puzzle.map((v) => v > 0)
    this.notes = Array(this.n * this.n).fill(0)
    this.history = []
    this.mistakes = 0
    this.hints = 0
    this.sel = -1
    this.hl = 0
    this.noteMode = false
    this.noteBtn.setLabel('📝 Off')
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
    this.padCont?.destroy()
    const n = this.n
    const cs = Math.min(Math.floor(594 / n), 90)
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
    cont.add([this.gfx, this.lines])
    this.cells = []
    const cols = n === 4 ? 2 : 3
    const ns = ((cs - 6) / cols) * 0.95
    for (let i = 0; i < n * n; i++) {
      const lx = -half + colOf(n, i) * cs + cs / 2
      const ly = -half + rowOf(n, i) * cs + cs / 2
      const img = this.add.image(lx, ly, 'cat_0').setDisplaySize(cs * 0.84, cs * 0.87).setVisible(false)
      const notes = []
      for (let k = 0; k < n; k++) {
        const nx = lx + (((k % cols) - (cols - 1) / 2) * (cs - 6)) / cols
        const ny = ly + ((Math.floor(k / cols) - (Math.ceil(n / cols) - 1) / 2) * (cs - 6)) / Math.max(3, Math.ceil(n / cols)) * (n === 6 ? 1.2 : 1)
        notes.push(this.add.image(nx, ny, `cat_${k}`).setDisplaySize(ns * 0.8, ns * 0.82).setVisible(false).setAlpha(0.9))
      }
      cont.add([img, ...notes])
      this.cells.push({ img, notes, lx, ly })
    }
    this.lines.lineStyle(1, 0x7a4a6a, 0.45)
    for (let k = 1; k < n; k++) {
      this.lines.lineBetween(-half + k * cs, -half, -half + k * cs, half)
      this.lines.lineBetween(-half, -half + k * cs, half, -half + k * cs)
    }
    const [br, bc] = boxDims(n)
    this.lines.lineStyle(4, 0x3b0a52, 1)
    for (let r = 0; r < n; r += br) for (let c = 0; c < n; c += bc) this.lines.strokeRect(-half + c * cs, -half + r * cs, bc * cs, br * cs)
    this.lines.lineStyle(5, this.world.color, 1).strokeRoundedRect(-half - 3, -half - 3, n * cs + 6, n * cs + 6, 6)

    // Cat pad below the board.
    const pw = Math.min(70, Math.floor(610 / n))
    const pad = this.add.container(0, 0).setDepth(6).setScale(0)
    pad.setPosition(W / 2, 782)
    this.padCont = pad
    this.padBtns = []
    for (let v = 1; v <= n; v++) {
      const px = (v - 1 - (n - 1) / 2) * pw
      const g = this.add.graphics()
      g.fillStyle(0xfff4e8, 1).fillRoundedRect(-pw / 2 + 2, -31, pw - 4, 62, 12)
      g.lineStyle(3, CATS[v - 1] ? Phaser.Display.Color.HexStringToColor(CATS[v - 1].accent).color : 0xffffff, 1).strokeRoundedRect(-pw / 2 + 2, -31, pw - 4, 62, 12)
      const img = this.add.image(0, -3, `cat_${v - 1}`).setDisplaySize(pw - 12, (pw - 12) * 1.04)
      const badge = text(this, pw / 2 - 12, 20, '', 13, '#fff', { fontStyle: 'bold', backgroundColor: '#be185d', padding: { x: 4, y: 1 } }).setOrigin(0.5)
      const b = this.add.container(px, 0, [g, img, badge])
      b.setSize(pw - 4, 62).setInteractive({ useHandCursor: true })
      b.on('pointerdown', () => this.pickCat(v))
      pad.add(b)
      this.padBtns.push({ b, badge })
    }
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

  // ---------- drawing ----------

  paint() {
    const n = this.n
    const cs = this.cs
    const half = (n * cs) / 2
    const g = this.gfx
    g.clear()
    const selV = this.sel >= 0 ? this.grid[this.sel] : this.hl
    for (let i = 0; i < n * n; i++) {
      let col = this.given[i] ? 0xf9d8bd : 0xfff4e8
      if (this.sel >= 0 && isPeer(n, this.sel, i)) col = this.given[i] ? 0xf0c2d6 : 0xfbd5e5
      if (selV && this.grid[i] === selV) col = 0xbae6fd
      if (i === this.sel) col = 0xfde047
      if (i === this.flashBad) col = 0xfca5a5
      g.fillStyle(col, 1).fillRect(-half + colOf(n, i) * cs, -half + rowOf(n, i) * cs, cs, cs)
    }
  }

  renderCell(i) {
    const c = this.cells[i]
    const v = this.grid[i]
    c.img.setVisible(v > 0)
    if (v > 0) c.img.setTexture(`cat_${v - 1}`)
    c.notes.forEach((nt, k) => nt.setVisible(v === 0 && (this.notes[i] & (1 << k)) !== 0))
  }

  refreshAll() {
    for (let i = 0; i < this.n * this.n; i++) this.renderCell(i)
    this.paint()
    this.refreshPad()
    this.refreshHud()
  }

  refreshPad() {
    const counts = Array(this.n + 1).fill(0)
    this.grid.forEach((v) => v && counts[v]++)
    this.padBtns.forEach(({ b, badge }, k) => {
      const left = this.n - counts[k + 1]
      badge.setText(String(left)).setVisible(left > 0)
      b.setAlpha(left === 0 ? 0.3 : 1)
    })
  }

  refreshHud() {
    const empty = this.grid.filter((v) => v === 0).length
    if (this.mode === 'puzzle') {
      this.titleText.setText(`Level ${this.level}`)
      this.subText.setText(this.world.name)
      this.mainText.setText(`${empty}`)
      this.rightText.setText(`😿 ${this.mistakes}`).setY(36)
      this.rightText2.setText(`💡 ${this.hints}`)
    } else {
      this.titleText.setText('Rush')
      this.subText.setText(`Best ${data.bestRush}`)
      this.mainText.setText(`${Math.ceil(this.timeLeft)}s`)
      this.rightText.setText(`Solved ${this.rushSolved}`).setY(36)
      this.rightText2.setText(`😿 ${this.mistakes}`)
    }
  }

  // ---------- input ----------

  onTap(p) {
    if (this.busy || this.phase !== 'play') return
    const i = this.cellAt(p.worldX, p.worldY)
    if (i < 0) return
    sfx.select()
    this.sel = i === this.sel ? -1 : i
    this.hl = 0
    this.paint()
  }

  pickCat(v) {
    if (this.busy || this.phase !== 'play') return
    if (this.sel < 0) {
      this.hl = this.hl === v ? 0 : v
      sfx.select()
      this.paint()
      this.say('Pick a square first', '#fbcfe8')
      return
    }
    const i = this.sel
    if (this.given[i]) {
      sfx.wrong()
      return
    }
    if (this.noteMode) {
      if (this.grid[i]) return
      this.snap()
      this.notes[i] ^= 1 << (v - 1)
      sfx.click()
      this.renderCell(i)
      return
    }
    if (this.grid[i] === v) return
    if (v !== this.puzzle.sol[i]) {
      this.wrong(i, v)
      return
    }
    this.place(i, v)
  }

  snap() {
    this.history.push({ grid: this.grid.slice(), notes: this.notes.slice() })
    if (this.history.length > 200) this.history.shift()
  }

  wrong(i, v) {
    this.mistakes++
    if (this.mode === 'rush') this.timeLeft = Math.max(1, this.timeLeft - 3)
    sfx.wrong()
    const q = this.wxy(i)
    const ghost = this.add.image(q.x, q.y, `cat_${v - 1}`).setDisplaySize(this.cs * 0.84, this.cs * 0.87).setDepth(10).setTint(0xff6b6b)
    this.tweens.add({ targets: ghost, x: q.x + 6, duration: 50, yoyo: true, repeat: 3 })
    this.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 1.3, delay: 260, duration: 300, onComplete: () => ghost.destroy() })
    this.flashBad = i
    this.paint()
    this.time.delayedCall(350, () => {
      this.flashBad = -1
      this.paint()
    })
    popText(this, q.x, q.y - this.cs * 0.5, this.mode === 'rush' ? '-3s' : 'Hiss!', '#fca5a5', 24)
    this.refreshHud()
  }

  place(i, v, hinted = false) {
    this.snap()
    this.grid[i] = v
    this.notes[i] = 0
    const n = this.n
    for (let j = 0; j < n * n; j++) if (isPeer(n, i, j)) this.notes[j] &= ~(1 << (v - 1))
    for (let j = 0; j < n * n; j++) if (this.cells[j]) this.renderCell(j)
    this.paint()
    this.refreshPad()
    this.refreshHud()
    const c = this.cells[i].img
    c.setScale(c.scale * 0.2)
    this.tweens.add({ targets: c, scaleX: this.cs * 0.84 / c.width, scaleY: this.cs * 0.87 / c.height, duration: 260, ease: 'Back.Out' })
    const q = this.wxy(i)
    sfx.meow(v)
    ring(this, q.x, q.y, hinted ? 0xfde047 : 0xf9a8d4, this.cs * 0.8, 420, 4)
    hearts(this, q.x, q.y, hinted ? 5 : 3, this.cs * 0.25)
    const done = this.completedGroups(i)
    done.forEach((cells, k) => this.groupFx(cells, k))
    if (this.grid.every((x) => x > 0)) this.win()
  }

  completedGroups(i) {
    const n = this.n
    const out = []
    for (const [kind, k] of [['row', rowOf(n, i)], ['col', colOf(n, i)], ['box', boxOf(n, i)]]) {
      const cells = groupCells(n, kind, k)
      if (cells.every((j) => this.grid[j] > 0)) out.push(cells)
    }
    return out
  }

  groupFx(cells, k) {
    this.time.delayedCall(180 + k * 150, () => {
      sfx.purr()
      cells.forEach((j, idx) => {
        const img = this.cells[j].img
        this.time.delayedCall(idx * 45, () => {
          if (!img.active) return
          const base = img.scaleX
          this.tweens.add({ targets: img, scaleX: base * 1.22, scaleY: img.scaleY * 1.22, duration: 130, yoyo: true })
          const q = this.wxy(j)
          flashAt(this, q.x, q.y, this.cs * 1.4, 0xfbcfe8)
          if (idx % 2 === 0) hearts(this, q.x, q.y, 2, 10)
        })
      })
      const mid = this.wxy(cells[Math.floor(cells.length / 2)])
      popText(this, mid.x, mid.y - this.cs * 0.7, 'Purr-fect!', '#fde68a', 28)
    })
  }

  erase() {
    if (this.busy || this.phase !== 'play' || this.sel < 0 || this.given[this.sel]) return
    const i = this.sel
    if (!this.grid[i] && !this.notes[i]) return
    this.snap()
    this.grid[i] = 0
    this.notes[i] = 0
    sfx.click()
    this.renderCell(i)
    this.paint()
    this.refreshPad()
    this.refreshHud()
  }

  toggleNotes() {
    this.noteMode = !this.noteMode
    this.noteBtn.setLabel(this.noteMode ? '📝 On' : '📝 Off')
    sfx.click()
    this.say(this.noteMode ? 'Notes on' : 'Notes off', '#ddd6fe')
  }

  undo() {
    if (this.busy || this.phase !== 'play' || !this.history.length) return
    const s = this.history.pop()
    this.grid = s.grid
    this.notes = s.notes
    sfx.click()
    this.refreshAll()
  }

  hint() {
    if (this.busy || this.phase !== 'play') return
    const i = nextHint(this.n, this.grid, this.sel)
    if (i < 0) return
    this.sel = i
    this.hl = 0
    this.hints++
    if (this.mode === 'rush') this.timeLeft = Math.max(1, this.timeLeft - 5)
    sfx.hint()
    const q = this.wxy(i)
    flashAt(this, q.x, q.y, this.cs * 2.2, 0xfde047)
    this.place(i, this.puzzle.sol[i], true)
  }

  // ---------- helpers ----------

  async popIn() {
    sfx.whoosh()
    this.padCont.setScale(1).setAlpha(0)
    this.tweens.add({ targets: this.padCont, alpha: 1, duration: 400, delay: 200 })
    await this.tween({ targets: this.boardCont, scale: 1, duration: 340, ease: 'Back.Out' })
  }

  async intro() {
    const label = `Level ${this.level}`
    const sub = INTROS[this.level] ?? this.world.blurb
    sfx.whoosh()
    const cy = BOARD_TOP + BOARD_H / 2
    const band = this.add.rectangle(W / 2, cy, W, 190, 0x000000, 0.78).setDepth(40).setScale(1, 0)
    const l1 = this.add.rectangle(W / 2, cy - 95, W, 4, this.world.color).setDepth(41).setScale(0, 1)
    const l2 = this.add.rectangle(W / 2, cy + 95, W, 4, this.world.color).setDepth(41).setScale(0, 1)
    const t1 = text(this, -300, cy - 30, label, 64, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(42)
    const t2 = text(this, W + 400, cy + 40, sub, 21, '#fbcfe8', { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5).setDepth(42)
    await Promise.all([
      this.tween({ targets: band, scaleY: 1, duration: 220, ease: 'Back.Out' }),
      this.tween({ targets: [l1, l2], scaleX: 1, duration: 300 }),
      this.tween({ targets: t1, x: W / 2, duration: 420, ease: 'Back.Out' }),
      this.tween({ targets: t2, x: W / 2, duration: 520, ease: 'Cubic.Out' }),
    ])
    await this.delay(INTROS[this.level] ? 1600 : 800)
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
    this.sel = -1
    this.paint()
    await this.delay(500)
    sfx.win()
    const n = this.n
    for (let i = 0; i < n * n; i++) {
      this.time.delayedCall((rowOf(n, i) + colOf(n, i)) * 55, () => {
        const img = this.cells[i]?.img
        if (!img?.active) return
        this.tweens.add({ targets: img, angle: { from: -12, to: 12 }, duration: 140, yoyo: true, repeat: 2 })
        const q = this.wxy(i)
        if ((i + rowOf(n, i)) % 3 === 0) hearts(this, q.x, q.y, 2, 12)
      })
    }
    const mid = { x: this.cx, y: this.cy }
    ring(this, mid.x, mid.y, 0xfde68a, 420, 800, 6)
    flashAt(this, mid.x, mid.y, 700, 0xf9a8d4)
    grains(this, mid.x, mid.y, 0xfde68a, 30, 520)
    await this.delay(1500)

    if (this.mode === 'rush') {
      this.rushSolved++
      const bonus = 14 + this.n
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
    this.showPanel({ won: true, title: `Level ${this.level} Complete!`, stars, lines: [`😿 ${this.mistakes} mistakes · 💡 ${this.hints} hints`] })
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
