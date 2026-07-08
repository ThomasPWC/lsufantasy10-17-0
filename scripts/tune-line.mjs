// 1. Finds the best feasible lineup: the 7-starter combination (QB, 2 RB, 2 WR,
//    TE, FLEX; dedupe by player_id) that maximizes the WORST week's total —
//    i.e. the highest line at which 17-0 is still possible.
// 2. Monte-Carlo simulates a strong player (per pick: look at N random
//    team-season rolls, draft the highest-season-total eligible player) and
//    reports the line where P(17-0) hits a target (default 2%).
//
// Usage: node scripts/tune-line.mjs [targetProbability] [--write]
//        --write updates weekly_line in src/data/league-history.json
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'league-history.json')
const data = JSON.parse(readFileSync(FILE, 'utf8'))
const TARGET = parseFloat(process.argv.find((a) => /^0?\.\d+$/.test(a)) ?? '0.02')
const WRITE = process.argv.includes('--write')
const WEEKS = 17
const SLOTS = [
  { label: 'QB', elig: ['QB'] },
  { label: 'RB', elig: ['RB'] },
  { label: 'RB', elig: ['RB'] },
  { label: 'WR', elig: ['WR'] },
  { label: 'WR', elig: ['WR'] },
  { label: 'TE', elig: ['TE'] },
  { label: 'FLEX', elig: ['RB', 'WR', 'TE'] },
]

// ---- pool: best entry per player_id (a player can appear in several seasons)
const byId = new Map()
const teamSeasons = []
for (const s of Object.values(data.seasons)) {
  for (const t of s.teams) {
    const roster = t.roster.map((p) => ({ ...p, year: s.year, team: t.team_name }))
    teamSeasons.push(roster)
    for (const p of roster) {
      const cur = byId.get(p.player_id)
      if (!cur || p.total_ppr > cur.total_ppr) byId.set(p.player_id, p)
    }
  }
}
const pool = [...byId.values()]
const byPos = {}
for (const pos of ['QB', 'RB', 'WR', 'TE']) {
  byPos[pos] = pool.filter((p) => p.position === pos).sort((a, b) => b.total_ppr - a.total_ppr)
}
const CAND = {
  QB: byPos.QB.slice(0, 40),
  RB: byPos.RB.slice(0, 120),
  WR: byPos.WR.slice(0, 120),
  TE: byPos.TE.slice(0, 60),
}

const minWeek = (lineup) => {
  let min = Infinity
  for (let w = 0; w < WEEKS; w++) {
    let sum = 0
    for (const p of lineup) sum += p.weekly_ppr[w] ?? 0
    if (sum < min) min = sum
  }
  return min
}
const sumTotal = (lineup) => lineup.reduce((s, p) => s + p.total_ppr, 0)

// ---- 1. maximin lineup via steepest-ascent hill climb with random restarts
let rngState = 20260708
const rand = () => {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff
  return rngState / 0x7fffffff
}
let best = null
for (let restart = 0; restart < 400; restart++) {
  // random init from candidates, respecting dedupe
  const used = new Set()
  const lineup = SLOTS.map((slot) => {
    for (;;) {
      const pos = slot.elig[Math.floor(rand() * slot.elig.length)]
      const p = CAND[pos][Math.floor(rand() * Math.min(CAND[pos].length, 60))]
      if (!used.has(p.player_id)) {
        used.add(p.player_id)
        return p
      }
    }
  })
  let improved = true
  while (improved) {
    improved = false
    const curMin = minWeek(lineup)
    const curSum = sumTotal(lineup)
    for (let i = 0; i < SLOTS.length; i++) {
      let bestSwap = null
      for (const pos of SLOTS[i].elig) {
        for (const cand of CAND[pos]) {
          if (lineup.some((p, j) => j !== i && p.player_id === cand.player_id)) continue
          if (cand.player_id === lineup[i].player_id) continue
          const trial = lineup.slice()
          trial[i] = cand
          const m = minWeek(trial)
          const s = sumTotal(trial)
          const [bm, bs] = bestSwap ? bestSwap : [curMin, curSum]
          if (m > bm || (m === bm && s > bs)) bestSwap = [m, s, cand]
        }
      }
      if (bestSwap && (bestSwap[0] > curMin || (bestSwap[0] === curMin && bestSwap[1] > sumTotal(lineup)))) {
        lineup[i] = bestSwap[2]
        improved = true
      }
    }
  }
  const m = minWeek(lineup)
  if (!best || m > best.min || (m === best.min && sumTotal(lineup) > sumTotal(best.lineup))) {
    best = { min: m, lineup: lineup.slice() }
  }
}

console.log('=== Best feasible lineup (maximizes the worst week) ===')
best.lineup.forEach((p, i) =>
  console.log(
    `${SLOTS[i].label.padEnd(4)} ${p.name.padEnd(24)} ${String(p.year)}  ${p.total_ppr.toFixed(1).padStart(6)} total  (${p.team})`,
  ),
)
const weekly = Array.from({ length: WEEKS }, (_, w) =>
  best.lineup.reduce((s, p) => s + (p.weekly_ppr[w] ?? 0), 0),
)
console.log('weekly:', weekly.map((x) => x.toFixed(0)).join(' '))
console.log(`worst week: ${best.min.toFixed(1)}  -> 17-0 is impossible above this line`)

// ---- 2. simulate strong play: ROLLS looks per pick, greedy by season total
const ROLLS = 25
const SIMS = 20000
const mins = []
for (let sim = 0; sim < SIMS; sim++) {
  const slots = Array(SLOTS.length).fill(null)
  const used = new Set()
  for (let pick = 0; pick < SLOTS.length; pick++) {
    let bestP = null
    let bestSlot = -1
    for (let r = 0; r < ROLLS; r++) {
      const roster = teamSeasons[Math.floor(rand() * teamSeasons.length)]
      for (const p of roster) {
        if (used.has(p.player_id)) continue
        let slotIdx = -1
        for (let i = 0; i < SLOTS.length; i++) {
          if (slots[i] === null && SLOTS[i].elig.includes(p.position)) {
            slotIdx = i
            break
          }
        }
        if (slotIdx === -1) continue
        if (!bestP || p.total_ppr > bestP.total_ppr) {
          bestP = p
          bestSlot = slotIdx
        }
      }
    }
    slots[bestSlot] = bestP
    used.add(bestP.player_id)
  }
  mins.push(minWeek(slots))
}
mins.sort((a, b) => a - b)
const q = (p) => mins[Math.min(mins.length - 1, Math.floor(p * mins.length))]
console.log(`\n=== Strong-play simulation (${SIMS} runs, ${ROLLS} rolls/pick, greedy by total) ===`)
console.log(`median worst-week: ${q(0.5).toFixed(1)} | p90: ${q(0.9).toFixed(1)} | p98: ${q(0.98).toFixed(1)} | p99: ${q(0.99).toFixed(1)}`)
const pAt = (l) => mins.filter((m) => m >= l).length / mins.length
let line = Math.floor(best.min)
for (let l = Math.floor(q(0.5)); l <= Math.floor(best.min); l++) {
  if (Math.abs(pAt(l) - TARGET) < Math.abs(pAt(line) - TARGET)) line = l
}
for (let l = line - 2; l <= line + 2; l++) console.log(`  line ${l}: P(17-0) = ${(pAt(l) * 100).toFixed(2)}%`)
console.log(`\nline for P(17-0) ~= ${(TARGET * 100).toFixed(1)}%: ${line}  (simulated P = ${(pAt(line) * 100).toFixed(2)}%)`)

if (WRITE) {
  data.weekly_line = line
  writeFileSync(FILE, JSON.stringify(data))
  console.log(`weekly_line updated to ${line} in league-history.json`)
}
