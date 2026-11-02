// Pure Meowdoku rules: no Phaser here so everything can be unit tested.
//
// A board is n x n stored flat (index = row * n + col). Values are 1..n (a cat breed each), 0 is empty.
// 4x4 uses 2x2 boxes, 6x6 uses boxes 2 rows tall and 3 wide, 9x9 uses 3x3 boxes.
export const boxDims = (n) => (n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3])
export const rowOf = (n, i) => Math.floor(i / n)
export const colOf = (n, i) => i % n
export const boxOf = (n, i) => {
  const [br, bc] = boxDims(n)
  return Math.floor(rowOf(n, i) / br) * (n / bc) + Math.floor(colOf(n, i) / bc)
}

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

const popcount = (m) => {
  let c = 0
  for (; m; m &= m - 1) c++
  return c
}

export const groupCells = (n, kind, k) => {
  const out = []
  for (let i = 0; i < n * n; i++) {
    if ((kind === 'row' ? rowOf(n, i) : kind === 'col' ? colOf(n, i) : boxOf(n, i)) === k) out.push(i)
  }
  return out
}

export const isPeer = (n, a, b) => a !== b && (rowOf(n, a) === rowOf(n, b) || colOf(n, a) === colOf(n, b) || boxOf(n, a) === boxOf(n, b))

// Bitmask of the values that may still go in cell i (bit v-1 = value v).
export function candidates(n, grid, i) {
  let used = 0
  for (let j = 0; j < n * n; j++) if (grid[j] && (j === i ? false : isPeer(n, i, j))) used |= 1 << (grid[j] - 1)
  return ((1 << n) - 1) & ~used
}

// Counts solutions (up to limit) by backtracking on the cell with the fewest options.
export function solveCount(n, grid, limit = 2, rnd = null) {
  const g = grid.slice()
  const rows = Array(n).fill(0)
  const cols = Array(n).fill(0)
  const boxes = Array(n).fill(0)
  const full = (1 << n) - 1
  const R = []
  const C = []
  const Bx = []
  for (let i = 0; i < n * n; i++) {
    R.push(rowOf(n, i))
    C.push(colOf(n, i))
    Bx.push(boxOf(n, i))
    if (g[i]) {
      const bit = 1 << (g[i] - 1)
      if ((rows[R[i]] | cols[C[i]] | boxes[Bx[i]]) & bit) return { count: 0, solution: null }
      rows[R[i]] |= bit
      cols[C[i]] |= bit
      boxes[Bx[i]] |= bit
    }
  }
  let count = 0
  let solution = null
  const rec = () => {
    let best = -1
    let bestMask = 0
    let bestCnt = 99
    for (let i = 0; i < n * n; i++) {
      if (g[i]) continue
      const m = full & ~(rows[R[i]] | cols[C[i]] | boxes[Bx[i]])
      const cnt = popcount(m)
      if (cnt === 0) return
      if (cnt < bestCnt) {
        best = i
        bestMask = m
        bestCnt = cnt
        if (cnt === 1) break
      }
    }
    if (best === -1) {
      count++
      solution ||= g.slice()
      return
    }
    const vals = []
    for (let v = 1; v <= n; v++) if (bestMask & (1 << (v - 1))) vals.push(v)
    if (rnd) shuffle(vals, rnd)
    for (const v of vals) {
      const bit = 1 << (v - 1)
      g[best] = v
      rows[R[best]] |= bit
      cols[C[best]] |= bit
      boxes[Bx[best]] |= bit
      rec()
      g[best] = 0
      rows[R[best]] &= ~bit
      cols[C[best]] &= ~bit
      boxes[Bx[best]] &= ~bit
      if (count >= limit) return
    }
  }
  rec()
  return { count, solution }
}

export const isValidSolution = (n, grid) => {
  if (grid.some((v) => v < 1 || v > n)) return false
  for (const kind of ['row', 'col', 'box']) {
    for (let k = 0; k < n; k++) {
      const seen = new Set(groupCells(n, kind, k).map((i) => grid[i]))
      if (seen.size !== n) return false
    }
  }
  return true
}

// Builds a full board, then blanks cells one by one while the answer stays unique.
export function generate({ size: n, givens, seed }) {
  const rnd = mulberry32(seed * 977 + 13)
  const sol = solveCount(n, Array(n * n).fill(0), 1, rnd).solution
  const grid = sol.slice()
  let filled = n * n
  for (const i of shuffle([...grid.keys()], rnd)) {
    if (filled <= givens) break
    const v = grid[i]
    grid[i] = 0
    if (solveCount(n, grid, 2).count === 1) filled--
    else grid[i] = v
  }
  return { n, sol, puzzle: grid, givens: filled, size: n }
}

// Which empty cell to help with: the selected one if possible, else the most constrained.
export function nextHint(n, grid, sel = -1) {
  if (sel >= 0 && grid[sel] === 0) return sel
  let best = -1
  let bestCnt = 99
  for (let i = 0; i < n * n; i++) {
    if (grid[i]) continue
    const c = popcount(candidates(n, grid, i))
    if (c < bestCnt) {
      best = i
      bestCnt = c
    }
  }
  return best
}

export function starsFor(mistakes, hints) {
  const penalty = mistakes + hints
  return penalty === 0 ? 3 : penalty <= 2 ? 2 : 1
}

// ---------- levels ----------

export const LEVELS_PER_WORLD = 12
export const TOTAL_LEVELS = 60
export const WORLDS = [
  { name: 'Kitten Nursery', color: 0xf472b6, bg: ['#5b2a6e', '#1d0b2b'], blurb: 'A 4×4 board. Each cat once per row, column and box.' },
  { name: 'Cozy Cottage', color: 0xfb923c, bg: ['#6b3b1d', '#241008'], blurb: 'Bigger 6×6 boards with wide 2×3 boxes.' },
  { name: 'Alley Cats', color: 0x34d399, bg: ['#0f4a45', '#04191a'], blurb: 'The full 9×9 board with nine different cats.' },
  { name: 'Whisker Heights', color: 0x60a5fa, bg: ['#1e3a74', '#08132b'], blurb: 'Fewer clues. Try pencilling in notes.' },
  { name: 'Grand Meowster', color: 0xc084fc, bg: ['#47206e', '#14082b'], blurb: 'The hardest boards in the cat kingdom.' },
]

const GIVENS = [
  (k) => 12 - Math.round(k * 0.45),
  (k) => 24 - Math.round(k * 0.8),
  (k) => 44 - Math.round(k * 0.7),
  (k) => 36 - Math.round(k * 0.55),
  (k) => 32 - Math.round(k * 0.6),
]

export function levelSpec(n) {
  const w = Math.floor((n - 1) / LEVELS_PER_WORLD)
  const k = (n - 1) % LEVELS_PER_WORLD
  return { size: w === 0 ? 4 : w === 1 ? 6 : 9, givens: GIVENS[w](k), seed: n * 11 + 5 }
}

const cache = new Map()
export function levelPuzzle(n) {
  if (!cache.has(n)) cache.set(n, generate(levelSpec(n)))
  return cache.get(n)
}

export const tagsOf = (spec) => `${spec.size}×${spec.size}`

export function rushSpec(solved, seed) {
  const s = solved < 3 ? { size: 4, givens: 10 } : solved < 7 ? { size: 6, givens: 20 } : { size: 9, givens: 40 }
  return { ...s, seed: seed + solved * 31 }
}
