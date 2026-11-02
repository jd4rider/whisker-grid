import Phaser from 'phaser'
import { W, H, background, button, text, fade } from './common.js'
import { data } from './save.js'
import { TOTAL_LEVELS, WORLDS } from '../game.js'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu')
  }

  create() {
    background(this, ['#5b2a6e', '#1d0b2b'], 0xf9a8d4)
    this.cameras.main.fadeIn(300, 4, 20, 36)

    // A row of bobbing cats across the top.
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 70
      const cat = this.add.image(x, 110, `cat_${i}`).setDisplaySize(62, 64)
      this.tweens.add({ targets: cat, y: 96, angle: { from: -6, to: 6 }, duration: 900 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 120 })
    }
    this.add.particles(W / 2, 330, 'heart', {
      x: { min: -240, max: 240 }, speedY: { min: -60, max: -25 }, lifespan: 2600, frequency: 420,
      scale: { start: 0.7, end: 0.2 }, alpha: { start: 0.7, end: 0 }, tint: [0xf472b6, 0xfda4af, 0xfde68a],
    })

    const title = text(this, W / 2, 250, 'Whisker Grid', 68, '#fde68a', { fontStyle: 'bold', stroke: '#3b0a52', strokeThickness: 10 }).setOrigin(0.5)
    this.tweens.add({ targets: title, scale: 1.04, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    text(this, W / 2, 335, 'The colourful cat puzzle', 24, '#fbcfe8').setOrigin(0.5)
    text(this, W / 2, 380, 'One cat per color, row and column. No touching!', 17, '#e9d5ff').setOrigin(0.5)

    const stars = Object.values(data.stars).reduce((a, b) => a + b, 0)
    const done = Object.keys(data.stars).length
    button(this, W / 2, 485, '🐾  Journey', () => fade(this, 'levels', { world: Math.floor((Math.min(data.unlocked, TOTAL_LEVELS) - 1) / 12) }), { w: 400, h: 62, size: 28, color: 0xc026d3 })
    text(this, W / 2, 530, `${done}/${TOTAL_LEVELS} levels · ${stars}★`, 16, '#f5d0fe').setOrigin(0.5)
    button(this, W / 2, 600, '⏱  Rush', () => fade(this, 'game', { mode: 'rush' }), { w: 400, h: 62, size: 28, color: 0xea580c })
    text(this, W / 2, 645, data.bestRush ? `Best ${data.bestRush} boards in 2 minutes` : '2 minutes: solve as many boards as you can', 16, '#fdba74').setOrigin(0.5)

    WORLDS.forEach((w, i) => this.add.circle(W / 2 + (i - 2) * 34, 710, 10, w.color))
    text(this, W / 2, 755, 'Tap to cross · drag to cross many · double tap for a cat', 17, '#fbcfe8').setOrigin(0.5)
    text(this, W / 2, H - 55, '4 to 9 colors  ·  power-ups  ·  mouse hints', 14, '#c4b5fd').setOrigin(0.5)
  }
}
