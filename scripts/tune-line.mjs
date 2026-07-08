// The game works off AVERAGES: a lineup goes 17-0 if its combined points per
// week (sum of season totals / 17) clears the line.
//
// 1. Prints the best possible lineup (max average) — the hard ceiling.
// 2. Monte-Carlo simulates a strong player under the real mechanics (2 re-rolls
//    per RUN; a re-roll replaces the rolled team) and reports the line where
//    P(17-0) hits a target (default 2%).
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

// ---- 1. best possible average (greedy max-sum is optimal for this structure)
const used = new Set()
const take = (arr) => {
  const p = arr.find((x) => !used.has(x.player_id))
  used.add(p.player_id)
  return p
}
const bestLineup = [
  ['QB', take(byPos.QB)],
  ['RB', take(byPos.RB)],
  ['RB', take(byPos.RB)],
  ['WR', take(byPos.WR)],
  ['WR', take(byPos.WR)],
  ['TE', take(byPos.TE)],
]
const flexPool = [...byPos.RB, ...byPos.WR, ...byPos.TE]
  .filter((p) => !used.has(p.player_id))
  .sort((a, b) => b.total_ppr - a.total_ppr)
bestLineup.push(['FLEX', flexPool[0]])
const maxAvg =
  bestLineup.reduce((s, [, p]) => s + p.total_ppr, 0) / WEEKS

console.log('=== Best possible lineup (max average) ===')
for (const [slot, p] of bestLineup) {
  console.log(
    `${slot.padEnd(4)} ${p.name.padEnd(24)} ${String(p.year)}  ${(p.total_ppr / WEEKS).toFixed(1).padStart(5)} /wk  (${p.team})`,
  )
}
console.log(`max average: ${maxAvg.toFixed(1)} /wk -> 17-0 is impossible above this line`)

// ---- 2. simulate strong play with a PER-RUN budget of 2 re-rolls total
// (1 Year + 1 Team). A re-roll REPLACES the rolled team. Strong play: burn a
// re-roll when the best available player is weak. Rolls that land on a team
// with nothing draftable are free.
let rngState = 20260708
const rand = () => {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff
  return rngState / 0x7fffffff
}
const RUN_BUDGET = 2
const REROLL_CUTOFF = 240 // re-roll if the best available season total is below this
const SIMS = 20000
const avgs = []
for (let sim = 0; sim < SIMS; sim++) {
  const slots = Array(SLOTS.length).fill(null)
  const usedIds = new Set()
  let budget = RUN_BUDGET
  for (let pick = 0; pick < SLOTS.length; pick++) {
    const look = () => {
      const roster = teamSeasons[Math.floor(rand() * teamSeasons.length)]
      let bestP = null
      let bestSlot = -1
      for (const p of roster) {
        if (usedIds.has(p.player_id)) continue
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
      return { bestP, bestSlot }
    }
    let cur = look()
    while (!cur.bestP) cur = look() // free re-roll when nothing is draftable
    while (budget > 0 && cur.bestP.total_ppr < REROLL_CUTOFF) {
      budget--
      cur = look()
      while (!cur.bestP) cur = look()
    }
    slots[cur.bestSlot] = cur.bestP
    usedIds.add(cur.bestP.player_id)
  }
  avgs.push(slots.reduce((s, p) => s + p.total_ppr, 0) / WEEKS)
}
avgs.sort((a, b) => a - b)
const q = (p) => avgs[Math.min(avgs.length - 1, Math.floor(p * avgs.length))]
console.log(`\n=== Strong-play simulation (${SIMS} runs, ${RUN_BUDGET} re-rolls/run, cutoff ${REROLL_CUTOFF}) ===`)
console.log(`median avg: ${q(0.5).toFixed(1)} | p90: ${q(0.9).toFixed(1)} | p98: ${q(0.98).toFixed(1)} | p99: ${q(0.99).toFixed(1)}`)

const pAt = (l) => avgs.filter((a) => a >= l).length / avgs.length
let line = Math.floor(maxAvg)
for (let l = Math.floor(q(0.5)); l <= Math.floor(maxAvg); l++) {
  if (Math.abs(pAt(l) - TARGET) < Math.abs(pAt(line) - TARGET)) line = l
}
for (let l = line - 2; l <= line + 2; l++) console.log(`  line ${l}: P(17-0) = ${(pAt(l) * 100).toFixed(2)}%`)
console.log(`\nline for P(17-0) ~= ${(TARGET * 100).toFixed(1)}%: ${line}  (simulated P = ${(pAt(line) * 100).toFixed(2)}%)`)

if (WRITE) {
  data.weekly_line = line
  writeFileSync(FILE, JSON.stringify(data))
  console.log(`weekly_line updated to ${line} in league-history.json`)
}
