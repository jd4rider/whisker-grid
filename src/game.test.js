import test from 'node:test'
import assert from 'node:assert/strict'
import {
  solveCount, hardness, generate, levelPuzzle, levelSpec, rushSpec, nextHint, mouseCells, conflicts, isSolved, starsFor, touching,
  TOTAL_LEVELS,
} from './game.js'

test('touching includes diagonals', () => {
  assert.ok(touching(5, 0, 6))
  assert.ok(!touching(5, 0, 7))
})

test('conflicts flag shared rows, columns, regions and neighbours', () => {
  const region = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3]
  assert.equal(conflicts(4, region, [0, 5]).size, 2)
  assert.equal(conflicts(4, region, [0, 4]).size, 2)
  assert.equal(conflicts(4, region, [1, 4 * 2 + 2]).size, 0)
})

test('every journey level has exactly one solution and grows harder', () => {
  let last = 0
  for (let l = 1; l <= TOTAL_LEVELS; l += 47) {
    const p = levelPuzzle(l)
    assert.equal(solveCount(p.n, p.region, 3), 1)
    assert.ok(isSolved(p.n, p.region, p.sol))
    assert.equal(new Set(p.region).size, p.n)
    assert.ok(p.n >= last)
    last = p.n
  }
  assert.equal(levelSpec(1).size, 4)
  assert.equal(levelSpec(TOTAL_LEVELS).size, 9)
  assert.ok(levelSpec(TOTAL_LEVELS).picks > levelSpec(1).picks)
})

test('generation is deterministic and rush scales with progress', () => {
  assert.deepEqual(generate({ size: 6, seed: 5 }), generate({ size: 6, seed: 5 }))
  assert.ok(rushSpec(8, 1).size > rushSpec(0, 1).size)
})

test('hint and mouse never reveal a wrong answer', () => {
  const p = levelPuzzle(15)
  assert.equal(nextHint(p.n, p.sol, []), p.sol[0])
  assert.equal(nextHint(p.n, p.sol, p.sol), -1)
  const open = [...Array(p.n * p.n).keys()]
  const mice = mouseCells(p.n, p.sol, open, 4)
  assert.equal(mice.length, 4)
  assert.ok(mice.every((i) => !p.sol.includes(i)))
})

test('picking among several boards never lowers hardness', () => {
  const one = generate({ size: 7, seed: 9 })
  const best = generate({ size: 7, seed: 9, picks: 4 })
  assert.ok(hardness(7, best.region) >= hardness(7, one.region))
  assert.equal(solveCount(7, best.region, 3), 1)
})

test('stars', () => {
  assert.equal(starsFor(0, 0), 3)
  assert.equal(starsFor(1, 1), 2)
  assert.equal(starsFor(3, 0), 1)
})
