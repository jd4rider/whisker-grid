import Phaser from 'phaser'
import { W, background, button, text, fade } from './common.js'
import { data } from './save.js'
import { WORLDS, LEVELS_PER_WORLD, TOTAL_LEVELS, PACKS, levelSpec, tagsOf } from '../game.js'

export default class LevelsScene extends Phaser.Scene {
  constructor() {
    super('levels')
  }

  init(d) {
    this.world = Phaser.Math.Clamp(d?.world ?? 0, 0, PACKS - 1)
  }

  create() {
    const w = WORLDS[this.world % WORLDS.length]
    background(this, w.bg)
    this.cameras.main.fadeIn(250, 4, 20, 36)
    text(this, W / 2, 70, w.name, 44, '#fff', { fontStyle: 'bold' }).setOrigin(0.5)
    text(this, W / 2, 112, `Pack ${this.world + 1}`, 17, '#fde68a', { align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5)
    text(this, W / 2, 140, `Levels ${this.world * LEVELS_PER_WORLD + 1}–${Math.min(TOTAL_LEVELS, (this.world + 1) * LEVELS_PER_WORLD)} of ${TOTAL_LEVELS}`, 15, '#ffffffaa').setOrigin(0.5)
    const stars = Object.values(data.stars).reduce((a, b) => a + b, 0)
    text(this, W - 24, 30, `${stars} ★`, 24, '#fde047', { fontStyle: 'bold' }).setOrigin(1, 0.5)
    button(this, 80, 36, '◀ Menu', () => fade(this, 'menu'), { w: 120, h: 42, size: 17, color: 0x374151 })

    const cols = 3
    const size = 132
    const gap = 22
    const left = (W - (cols * size + (cols - 1) * gap)) / 2
    for (let i = 0; i < LEVELS_PER_WORLD; i++) {
      const n = this.world * LEVELS_PER_WORLD + i + 1
      if (n > TOTAL_LEVELS) break
      const open = n <= data.unlocked
      const x = left + (i % cols) * (size + gap) + size / 2
      const y = 175 + Math.floor(i / cols) * (size + gap) + size / 2
      const box = this.add.container(x, y)
      const g = this.add.graphics()
      g.fillStyle(open ? w.color : 0x1f2f44, open ? 0.95 : 0.8).fillRoundedRect(-size / 2, -size / 2, size, size, 20)
      g.lineStyle(3, 0xffffff, open ? 0.6 : 0.15).strokeRoundedRect(-size / 2, -size / 2, size, size, 20)
      box.add(g)
      box.add(text(this, 0, -22, String(n), 44, open ? '#fff' : '#53657d', { fontStyle: 'bold' }).setOrigin(0.5))
      if (open) {
        const spec = levelSpec(n)
        box.add(text(this, 0, 14, tagsOf(spec), 18, '#ffffffcc').setOrigin(0.5))
        const got = data.stars[n] || 0
        for (let s = 0; s < 3; s++) box.add(text(this, (s - 1) * 28, 44, '★', 26, s < got ? '#fde047' : '#00000055').setOrigin(0.5))
        box.setSize(size, size).setInteractive({ useHandCursor: true })
        box.on('pointerdown', () => {
          this.tweens.add({ targets: box, scale: 0.94, duration: 70, yoyo: true })
          fade(this, 'game', { mode: 'puzzle', level: n })
        })
        if (n === data.unlocked && n <= TOTAL_LEVELS) this.tweens.add({ targets: box, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
      } else {
        box.add(text(this, 0, 30, '🔒', 28).setOrigin(0.5))
      }
    }

    const go = (d) => this.scene.restart({ world: Phaser.Math.Clamp(this.world + d, 0, PACKS - 1) })
    const nav = { w: 96, h: 48, size: 18, color: 0x075985 }
    const last = Math.floor((Math.min(data.unlocked, TOTAL_LEVELS) - 1) / LEVELS_PER_WORLD)
    if (this.world > 0) {
      button(this, 62, 810, '◀ Prev', () => go(-1), nav)
      if (this.world > 5) button(this, 168, 810, '−10', () => go(-10), { ...nav, w: 80, color: 0x0f4c75 })
    }
    if (this.world < PACKS - 1) {
      button(this, W - 62, 810, 'Next ▶', () => go(1), nav)
      if (this.world < PACKS - 6) button(this, W - 168, 810, '+10', () => go(10), { ...nav, w: 80, color: 0x0f4c75 })
    }
    if (this.world !== last) button(this, W / 2, 810, 'Current', () => this.scene.restart({ world: last }), { ...nav, w: 110, color: 0xc026d3 })
  }
}
