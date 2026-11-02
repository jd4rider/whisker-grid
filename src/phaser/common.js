
export const W = 640
export const H = 860
export const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

// Nine cat breeds, one per value. Each is drawn once into a texture named cat_<value-1>.
export const CATS = [
  { name: 'Ginger', fur: '#f59e0b', dark: '#b45309', eye: '#84cc16', pat: 'stripes', accent: '#ef4444', line: '#fff7ed' },
  { name: 'Grey', fur: '#9ca3af', dark: '#4b5563', eye: '#fbbf24', pat: 'stripes', accent: '#3b82f6', line: '#f3f4f6' },
  { name: 'Shadow', fur: '#27272a', dark: '#09090b', eye: '#facc15', pat: 'none', accent: '#22c55e', line: '#a1a1aa' },
  { name: 'Snowy', fur: '#f8fafc', dark: '#cbd5e1', eye: '#38bdf8', pat: 'none', accent: '#ec4899', line: '#94a3b8' },
  { name: 'Calico', fur: '#fff7ed', dark: '#f59e0b', eye: '#16a34a', pat: 'calico', accent: '#a855f7', line: '#a8a29e' },
  { name: 'Siamese', fur: '#fde7c8', dark: '#78350f', eye: '#60a5fa', pat: 'points', accent: '#14b8a6', line: '#a8a29e' },
  { name: 'Tuxedo', fur: '#1f2937', dark: '#f8fafc', eye: '#4ade80', pat: 'tux', accent: '#f97316', line: '#e5e7eb' },
  { name: 'Cocoa', fur: '#92400e', dark: '#451a03', eye: '#fcd34d', pat: 'spots', accent: '#e11d48', line: '#fde68a' },
  { name: 'Lilac', fur: '#a5b4fc', dark: '#6366f1', eye: '#fde047', pat: 'stripes', accent: '#84cc16', line: '#eef2ff' },
]

function canvas(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return
  const t = scene.textures.createCanvas(key, w, h)
  draw(t.getContext(), w, h)
  t.refresh()
}

function drawCat(ctx, c) {
  const OUT = '#1f1147'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(48 + s * 35, 46)
    ctx.lineTo(48 + s * 31, 5)
    ctx.lineTo(48 + s * 8, 24)
    ctx.closePath()
    ctx.fillStyle = c.pat === 'points' ? c.dark : c.fur
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = OUT
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(48 + s * 30, 38)
    ctx.lineTo(48 + s * 28, 16)
    ctx.lineTo(48 + s * 14, 28)
    ctx.closePath()
    ctx.fillStyle = '#fda4af'
    ctx.fill()
  }
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(48, 58, 38, 32, 0, 0, Math.PI * 2)
  ctx.fillStyle = c.fur
  ctx.fill()
  ctx.clip()
  ctx.strokeStyle = c.dark
  ctx.fillStyle = c.dark
  ctx.lineWidth = 4
  if (c.pat === 'stripes') {
    ;[[48, 24, 48, 40], [36, 26, 38, 39], [60, 26, 58, 39]].forEach(([a, b, x, y]) => ctx.beginPath() || ctx.moveTo(a, b) || ctx.lineTo(x, y) || ctx.stroke())
    for (const s of [-1, 1]) {
      ;[[12, 52, 25, 55], [10, 64, 24, 62]].forEach(([a, b, x, y]) => ctx.beginPath() || ctx.moveTo(48 + s * (48 - a), b) || ctx.lineTo(48 + s * (48 - x), y) || ctx.stroke())
    }
  } else if (c.pat === 'calico') {
    ctx.beginPath()
    ctx.arc(26, 38, 17, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3f3f46'
    ctx.beginPath()
    ctx.arc(74, 42, 15, 0, Math.PI * 2)
    ctx.fill()
  } else if (c.pat === 'points') {
    const g = ctx.createRadialGradient(48, 72, 2, 48, 72, 26)
    g.addColorStop(0, 'rgba(120,53,15,0.85)')
    g.addColorStop(1, 'rgba(120,53,15,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 40, 96, 60)
  } else if (c.pat === 'tux') {
    ctx.fillStyle = c.dark
    ctx.beginPath()
    ctx.ellipse(48, 74, 20, 15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(48, 46, 6, 17, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (c.pat === 'spots') {
    ;[[28, 44, 6], [68, 40, 5], [62, 54, 4], [22, 58, 4]].forEach(([x, y, r]) => ctx.beginPath() || ctx.arc(x, y, r, 0, Math.PI * 2) || ctx.fill())
  }
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(48, 58, 38, 32, 0, 0, Math.PI * 2)
  ctx.lineWidth = 3.5
  ctx.strokeStyle = OUT
  ctx.stroke()
  for (const s of [-1, 1]) {
    ctx.fillStyle = c.eye
    ctx.beginPath()
    ctx.ellipse(48 + s * 17, 56, 8.5, 10.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0b0620'
    ctx.beginPath()
    ctx.ellipse(48 + s * 17, 57, 3.4, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(48 + s * 17 - 2.5, 52, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#f472b6'
  ctx.strokeStyle = OUT
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(43, 68)
  ctx.lineTo(53, 68)
  ctx.lineTo(48, 74)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = c.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(48, 74)
  ctx.lineTo(48, 77)
  ctx.moveTo(48, 77)
  ctx.quadraticCurveTo(43, 83, 38, 77)
  ctx.moveTo(48, 77)
  ctx.quadraticCurveTo(53, 83, 58, 77)
  ctx.stroke()
  ctx.lineWidth = 1.6
  ctx.globalAlpha = 0.85
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(48 + s * 28, 71)
    ctx.lineTo(48 + s * 47, 66)
    ctx.moveTo(48 + s * 28, 76)
    ctx.lineTo(48 + s * 47, 80)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = c.accent
  ctx.strokeStyle = OUT
  ctx.lineWidth = 2
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(48, 90)
    ctx.lineTo(48 + s * 13, 84)
    ctx.lineTo(48 + s * 13, 96)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(48, 90, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

export function makeTextures(scene) {
  CATS.forEach((c, i) => canvas(scene, `cat_${i}`, 96, 100, (ctx) => drawCat(ctx, c)))
  canvas(scene, 'heart', 32, 32, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(16, 28)
    ctx.bezierCurveTo(-6, 14, 6, -2, 16, 9)
    ctx.bezierCurveTo(26, -2, 38, 14, 16, 28)
    ctx.fill()
  })
  canvas(scene, 'paw', 64, 64, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(32, 42, 16, 13, 0, 0, Math.PI * 2)
    ctx.fill()
    ;[[12, 26, 7, 9], [24, 14, 7, 9], [40, 14, 7, 9], [52, 26, 7, 9]].forEach(([x, y, rx, ry]) => ctx.beginPath() || ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2) || ctx.fill())
  })
  canvas(scene, 'spark', 16, 16, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(8, 8, 8, 0, Math.PI * 2)
    ctx.fill()
  })
  canvas(scene, 'glow', 128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  })
}

export function background(scene, [c1, c2], tint = 0x7dd3fc) {
  const key = `bg${c1}${c2}`
  canvas(scene, key, 64, H, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, H)
  })
  scene.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(-100)
  scene.add
    .particles(0, 0, 'spark', {
      x: { min: 0, max: W },
      y: H + 10,
      speedY: { min: -60, max: -20 },
      speedX: { min: -10, max: 10 },
      lifespan: 9000,
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 0.35, end: 0 },
      frequency: 240,
      tint,
    })
    .setDepth(-90)
}

export function button(scene, x, y, label, fn, { w = 200, h = 54, size = 22, color = 0x0284c7, textColor = '#fff' } = {}) {
  const box = scene.add.container(x, y)
  const bg = scene.add.graphics()
  const draw = (fill, alpha) => {
    bg.clear()
    bg.fillStyle(fill, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 14)
    bg.lineStyle(2, 0xffffff, 0.3).strokeRoundedRect(-w / 2, -h / 2, w, h, 14)
  }
  draw(color, 0.92)
  const t = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: textColor }).setOrigin(0.5)
  box.add([bg, t])
  box.setSize(w, h).setInteractive({ useHandCursor: true })
  box.on('pointerover', () => draw(color, 1))
  box.on('pointerout', () => draw(color, 0.92))
  box.on('pointerdown', () => {
    scene.tweens.add({ targets: box, scale: 0.94, duration: 70, yoyo: true })
    fn()
  })
  box.setLabel = (s) => t.setText(s)
  return box
}

export const text = (scene, x, y, str, size = 22, color = '#fff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra })

export function fade(scene, to, data) {
  scene.input.enabled = false
  scene.cameras.main.fadeOut(220, 4, 20, 36)
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(to, data))
}

