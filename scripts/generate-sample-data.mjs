// Generates a SYNTHETIC league-history.json matching the handoff §4.2 schema,
// so the game is playable before the real ESPN export (league 390467) is dropped in.
// Deterministic (seeded RNG). Output is flagged with "sample": true, which the
// Home screen surfaces as a warning badge.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'league-history.json')

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(390467)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const FIRST = ['Jalen','Marcus','Deshawn','Tyler','Austin','Chris','Derek','Jordan','Cameron','Brandon','Malik','Trevor','Isaiah','Devin','Corey','Xavier','Nate','Reggie','Shane','Dante','Elijah','Grant','Hunter','Kobe','Lamar','Miles','Noah','Owen','Preston','Quentin','Rashad','Silas','Tremaine','Victor','Wes','Zane','Andre','Blake','Cole','Damien']
const LAST = ['Whitfield','Marsh','Okafor','Bell','Crowder','Vance','Hollis','Pruitt','Ramsey','Sloan','Tatum','Ussery','Vaughn','Wilkes','Yancey','Zeller','Ashford','Boone','Calloway','Draper','Eldridge','Foster','Grimes','Hayes','Irving','Jessup','Kendrick','Landry','Monroe','Nash','Overton','Pierce','Quarles','Rutledge','Sexton','Thorne','Upshaw','Vickers','Winslow','Alcott']

const OWNERS = ['Thomas','Mike','Dave','Steve','Kevin','Jason','Brian','Matt','Chris P.','Andy']
const TEAM_NAMES = [
  ['The Gridiron Gurus','Sack Attack','End Zone Elite','Blitzkrieg','Turf Burners','Hail Mary Heroes','Pigskin Pirates','Red Zone Raiders','Fourth Down Phantoms','Goal Line Giants'],
  ['Championship Chasers','The Juggernauts','Waiver Wire Wizards','Sunday Scaries','The Underdogs','Playoff Bound','Trophy Hunters','The Dynasty','Comeback Kids','League Villains'],
]

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
const POS_COUNTS = { QB: 2, RB: 5, WR: 5, TE: 2 }
// Tuned so a well-drafted lineup of stars averages near the 145 weekly line:
// winning records are reachable, 17-0 stays rare.
const POS_PROFILE = {
  QB: { mean: 17, spread: 8, starMean: 24, superMean: 28 },
  RB: { mean: 9, spread: 8, starMean: 18, superMean: 24 },
  WR: { mean: 9, spread: 8, starMean: 18, superMean: 24 },
  TE: { mean: 7, spread: 6, starMean: 12, superMean: 17 },
}

// Build a persistent player pool with multi-year careers so the same player_id
// can be rolled in different seasons (exercises the dedupe rule).
let nextId = 100000
const usedNames = new Set()
function makeName() {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`
    if (!usedNames.has(n)) {
      usedNames.add(n)
      return n
    }
  }
}
const pool = []
for (const [pos, perTeam] of Object.entries(POS_COUNTS)) {
  const needed = perTeam * OWNERS.length
  // Walk each season and top up the pool until every year has full coverage
  // (plus headroom so rosters differ year to year).
  for (const year of YEARS) {
    let active = pool.filter((p) => p.position === pos && p.start <= year && p.end >= year).length
    while (active < Math.ceil(needed * 1.3)) {
      const start = year - Math.floor(rand() * 3)
      const span = 3 + Math.floor(rand() * 8)
      const star = rand() < 0.2
      pool.push({
        player_id: nextId++,
        name: makeName(),
        position: pos,
        start,
        end: start + span,
        star,
        superstar: star && rand() < 0.35,
      })
      active++
    }
  }
}

function weeklyLog(player, year) {
  const p = POS_PROFILE[player.position]
  const mean = player.superstar ? p.superMean : player.star ? p.starMean : p.mean
  const gameWeeks = year >= 2021 ? 17 : 16 // pre-2021 seasons had 16 game-weeks
  const bye = 4 + Math.floor(rand() * 8)
  const dnpChance = player.star ? 0.02 : 0.05
  const weeks = []
  for (let w = 1; w <= 17; w++) {
    if (w > gameWeeks || w === bye || rand() < dnpChance) {
      weeks.push(0)
      continue
    }
    const v = mean + (rand() + rand() - 1) * p.spread
    weeks.push(Math.max(0, Math.round(v * 10) / 10))
  }
  return weeks
}

const seasons = {}
for (const year of YEARS) {
  const active = {}
  for (const pos of Object.keys(POS_COUNTS)) {
    active[pos] = shuffle(pool.filter((p) => p.position === pos && p.start <= year && p.end >= year))
  }
  const teams = OWNERS.map((owner, t) => {
    const roster = []
    for (const [pos, count] of Object.entries(POS_COUNTS)) {
      for (let i = 0; i < count; i++) {
        const player = active[pos].pop()
        if (!player) continue
        const weekly_ppr = weeklyLog(player, year)
        roster.push({
          name: player.name,
          position: player.position,
          total_ppr: Math.round(weekly_ppr.reduce((a, b) => a + b, 0) * 10) / 10,
          weekly_ppr,
          player_id: player.player_id,
        })
      }
    }
    return {
      team_id: t + 1,
      team_name: TEAM_NAMES[year % 2][t],
      owner,
      roster,
    }
  })
  seasons[String(year)] = { year, teams }
}

const out = { weekly_line: 145, sample: true, seasons }
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out))
const players = Object.values(seasons).reduce(
  (n, s) => n + s.teams.reduce((m, t) => m + t.roster.length, 0),
  0,
)
console.log(`Wrote ${OUT}: ${YEARS.length} seasons, ${OWNERS.length} teams/season, ${players} rostered players`)
