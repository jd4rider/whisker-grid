import test from 'node:test'
import assert from 'node:assert/strict'
import {
  solveCount, isValidSolution, generate, levelPuzzle, levelSpec, rushSpec, nextHint, candidates, starsFor,
  boxOf, TOTAL_LEVELS, LEVELS_PER_WORLD, WORLDS,
} from './game.js'

test('box indexing for each board size', () => {
  assert.equal(boxOf(4, 15), 3)
  assert.equal(boxOf(6, 5), 1)
  assert.equal(boxOf(6, 18), 2)
  assert.equal(boxOf(9, 40), 4)
})

test('solver counts solutions and rejects conflicts', () => {
  const empty = Array(16).fill(0)
  assert.equal(solveCount(4, empty, 2).count, 2)
  const bad = empty.slice()
  bad[0] = 1
  bad[1] = 1
  assert.equal(solveCount(4, bad, 2).count, 0)
})

test('every level has a unique valid solution that matches its clues', () => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const p = levelPuzzle(n)
    assert.equal(isValidSolution(p.n, p.sol), true, `level ${n} solution invalid`)
    assert.equal(solveCount(p.n, p.puzzle, 2).count, 1, `level ${n} not unique`)
    p.puzzle.forEach((v, i) => v && assert.equal(v, p.sol[i]))
    assert.ok(p.puzzle.some((v) => v === 0))
  }
})

test('difficulty ramps up within a world and clues stay sensible', () => {
  for (let w = 0; w < WORLDS.length; w++) {
    const first = levelPuzzle(w * LEVELS_PER_WORLD + 1).givens
    const last = levelPuzzle((w + 1) * LEVELS_PER_WORLD).givens
    assert.ok(last <= first, `world ${w}`)
  }
  assert.equal(levelSpec(1).size, 4)
  assert.equal(levelSpec(13).size, 6)
  assert.equal(levelSpec(25).size, 9)
})

test('rush specs scale up and generate', () => {
  assert.deepEqual([0, 3, 7].map((s) => rushSpec(s, 1).size), [4, 6, 9])
  for (const s of [0, 4, 9]) assert.ok(generate(rushSpec(s, 42)))
})

test('hints pick an empty cell and candidates respect peers', () => {
  const p = levelPuzzle(30)
  const i = nextHint(p.n, p.puzzle, -1)
  assert.equal(p.puzzle[i], 0)
  assert.ok(candidates(p.n, p.puzzle, i) & (1 << (p.sol[i] - 1)))
  assert.equal(nextHint(p.n, p.puzzle, i), i)
})

test('stars', () => {
  assert.deepEqual([starsFor(0, 0), starsFor(1, 1), starsFor(3, 0)], [3, 2, 1])
})
