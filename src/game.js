// Pure Whisker Grid rules: no Phaser here so everything can be unit tested.
//
// An n x n board (flat, index = row * n + col) is split into n coloured regions.
// Place exactly one cat in every row, column and colour region, and no two cats may touch (even diagonally).
export const rowOf = (n, i) => Math.floor(i / n)
export const colOf = (n, i) => i % n

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = (arr, rnd) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const touching = (n, a, b) =>
  a !== b && Math.abs(rowOf(n, a) - rowOf(n, b)) <= 1 && Math.abs(colOf(n, a) - colOf(n, b)) <= 1

export const clashes = (n, region, a, b) =>
  a !== b && (rowOf(n, a) === rowOf(n, b) || colOf(n, a) === colOf(n, b) || region[a] === region[b] || touching(n, a, b))

// Count solutions (up to limit) for a region map.
export function solveCount(n, region, limit = 2) {
  let count = 0
  const go = (r, colMask, regMask, prev) => {
    if (count >= limit) return
    if (r === n) {
      count++
      return
    }
    for (let c = 0; c < n; c++) {
      if (colMask & (1 << c) || Math.abs(c - prev) <= 1) continue
      const g = region[r * n + c]
      if (regMask & (1 << g)) continue
      go(r + 1, colMask | (1 << c), regMask | (1 << g), c)
    }
  }
  go(0, 0, 0, -9)
  return count
}

function randomCats(n, rnd) {
  const cols = []
  const used = Array(n).fill(false)
  const go = (r) => {
    if (r === n) return true
    for (const c of shuffle([...Array(n).keys()], rnd)) {
      if (used[c] || (r > 0 && Math.abs(c - cols[r - 1]) <= 1)) continue
      used[c] = true
      cols[r] = c
      if (go(r + 1)) return true
      used[c] = false
    }
    return false
  }
  return go(0) ? cols : null
}

// Grow n contiguous regions outward from the cat cells.
function growRegions(n, cats, rnd) {
  const region = Array(n * n).fill(-1)
  const frontier = []
  cats.forEach((cell, k) => {
    region[cell] = k
    frontier.push(cell)
  })
  let left = n * n - n
  while (left > 0) {
    const f = Math.floor(rnd() * frontier.length)
    const cell = frontier[f]
    const r = rowOf(n, cell)
    const c = colOf(n, cell)
    const opts = []
    if (r > 0) opts.push(cell - n)
    if (r < n - 1) opts.push(cell + n)
    if (c > 0) opts.push(cell - 1)
    if (c < n - 1) opts.push(cell + 1)
    const free = opts.filter((x) => region[x] < 0)
    if (!free.length) {
      frontier.splice(f, 1)
      continue
    }
    const pick = free[Math.floor(rnd() * free.length)]
    region[pick] = region[cell]
    frontier.push(pick)
    left--
  }
  return region
}

// Deterministic for a seed, and always has exactly one solution.
export function generate({ size: n, seed }) {
  const rnd = mulberry32(seed)
  for (let attempt = 0; attempt < 200000; attempt++) {
    const cols = randomCats(n, rnd)
    if (!cols) continue
    const sol = cols.map((c, r) => r * n + c)
    const region = growRegions(n, sol, rnd)
    if (solveCount(n, region, 2) === 1) {
      // Number regions in reading order so the colours spread out nicely.
      const order = []
      region.forEach((g) => !order.includes(g) && order.push(g))
      const map = new Map(order.map((g, i) => [g, i]))
      return { n, size: n, region: region.map((g) => map.get(g)), sol }
    }
  }
  throw new Error('could not generate board')
}

// Cat cells that break a rule. cats is an array of cell indexes.
export function conflicts(n, region, cats) {
  const bad = new Set()
  for (let x = 0; x < cats.length; x++) {
    for (let y = x + 1; y < cats.length; y++) {
      if (clashes(n, region, cats[x], cats[y])) {
        bad.add(cats[x])
        bad.add(cats[y])
      }
    }
  }
  return bad
}

export const isSolved = (n, region, cats) => cats.length === n && conflicts(n, region, cats).size === 0

// The solution cell to show next: the first row whose solution cat is not placed yet.
export function nextHint(n, sol, cats) {
  const have = new Set(cats)
  for (let r = 0; r < n; r++) if (!have.has(sol[r])) return sol[r]
  return -1
}

// Cells that certainly hold no cat, picked at random from those not already crossed off.
export function mouseCells(n, sol, open, count, rnd = Math.random) {
  const solSet = new Set(sol)
  return shuffle(open.filter((i) => !solSet.has(i)), rnd).slice(0, count)
}

export function starsFor(mistakes, hints) {
  const penalty = mistakes + hints
  return penalty === 0 ? 3 : penalty <= 2 ? 2 : 1
}

// ---------- levels ----------

export const LEVELS_PER_WORLD = 12
export const TOTAL_LEVELS = 60
export const WORLDS = [
  { name: 'Kitten Corner', color: 0xf472b6, bg: ['#5b2a6e', '#1d0b2b'], blurb: 'Small boards with 4 and 5 colours.' },
  { name: 'Cozy Cottage', color: 0xfb923c, bg: ['#6b3b1d', '#241008'], blurb: 'Five and six colours. Look for tight regions.' },
  { name: 'Alley Cats', color: 0x34d399, bg: ['#0f4a45', '#04191a'], blurb: 'Six and seven colours. Cats may not touch!' },
  { name: 'Whisker Heights', color: 0x60a5fa, bg: ['#1e3a74', '#08132b'], blurb: 'Seven and eight colours of puzzling.' },
  { name: 'Grand Meowster', color: 0xc084fc, bg: ['#47206e', '#14082b'], blurb: 'The biggest boards, up to nine colours.' },
]

// More colours means a bigger board and a harder puzzle.
export const sizeFor = (level) => Math.min(9, 4 + Math.floor((level - 1) / 10))
export const levelSpec = (level) => ({ size: sizeFor(level), seed: level * 7919 + 13 })

const cache = new Map()
export function levelPuzzle(level) {
  if (!cache.has(level)) cache.set(level, generate(levelSpec(level)))
  return cache.get(level)
}

export const tagsOf = (spec) => `${spec.size} colors`

export function rushSpec(solved, seed) {
  return { size: Math.min(8, 4 + Math.floor(solved / 2)), seed: seed + solved * 31 }
}
