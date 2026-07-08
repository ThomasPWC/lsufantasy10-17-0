// LOCAL-ONLY helper to pull real league history from ESPN into
// src/data/league-history.json (handoff §4.2 schema, weekly PPR included).
//
// Run on your own machine — cookies never enter the repo or the app bundle:
//   1. Copy scripts/.espn-cookies.example.json to scripts/.espn-cookies.json
//      (gitignored) and paste your espn_s2 + SWID cookie values.
//   2. node scripts/fetch-espn.mjs 2015 2024
//
// NOTE: ESPN's private API changes shape occasionally, especially for pre-2018
// seasons served by the leagueHistory endpoint. Spot-check the output totals
// against the league site before trusting a season.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LEAGUE_ID = 390467
const WEEKS = 17
const SKILL = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE' } // ESPN defaultPositionId
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'data', 'league-history.json')

const [startYear, endYear] = process.argv.slice(2).map(Number)
if (!startYear || !endYear) {
  console.error('Usage: node scripts/fetch-espn.mjs <startYear> <endYear>')
  process.exit(1)
}

let cookies
try {
  cookies = JSON.parse(readFileSync(join(ROOT, 'scripts', '.espn-cookies.json'), 'utf8'))
} catch {
  console.error('Missing scripts/.espn-cookies.json — copy the .example file and fill in espn_s2 + SWID.')
  process.exit(1)
}
const COOKIE = `espn_s2=${cookies.espn_s2}; SWID=${cookies.SWID}`

async function espn(year, params) {
  const current = year >= new Date().getFullYear() - 1
  const base = current
    ? `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${LEAGUE_ID}`
    : `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${LEAGUE_ID}?seasonId=${year}`
  const url = `${base}${current ? '?' : '&'}${params}`
  const res = await fetch(url, { headers: { Cookie: COOKIE, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${url}`)
  const json = await res.json()
  return Array.isArray(json) ? json[0] : json
}

function actualWeekly(player) {
  // statSourceId 0 = actual, statSplitTypeId 1 = single scoring period
  const weekly = Array(WEEKS).fill(0)
  for (const s of player.stats ?? []) {
    if (s.statSourceId === 0 && s.statSplitTypeId === 1 && s.scoringPeriodId >= 1 && s.scoringPeriodId <= WEEKS) {
      weekly[s.scoringPeriodId - 1] = Math.round((s.appliedTotal ?? 0) * 10) / 10
    }
  }
  return weekly
}

const seasons = {}
for (let year = startYear; year <= endYear; year++) {
  process.stdout.write(`Season ${year}... `)
  let league
  try {
    league = await espn(year, 'view=mTeam&view=mRoster')
  } catch (e) {
    console.log(`skipped (${e.message})`)
    continue
  }
  // first names only (privacy for a public repo); last initial on collision
  const firsts = (league.members ?? []).map((m) => (m.firstName ?? m.displayName ?? '').trim().split(/\s+/)[0])
  const memberById = new Map(
    (league.members ?? []).map((m, i) => {
      const first = firsts[i] || 'Unknown'
      const dupe = firsts.filter((f) => f === first).length > 1
      return [m.id, dupe && m.lastName ? `${first} ${m.lastName[0]}.` : first]
    }),
  )
  const playersByTeam = new Map() // team_id -> Map(player_id -> player entry)
  for (const t of league.teams ?? []) playersByTeam.set(t.id, new Map())

  // Weekly snapshots are needed to collect per-week stats; the draft pool is
  // then restricted to the END-OF-SEASON roster (final-week membership).
  const finalIds = new Map() // team_id -> Set(player_id) at the last week seen
  for (let week = 1; week <= WEEKS; week++) {
    let snap
    try {
      snap = await espn(year, `view=mRoster&scoringPeriodId=${week}`)
    } catch {
      continue
    }
    for (const t of snap.teams ?? []) {
      const bucket = playersByTeam.get(t.id)
      if (!bucket) continue
      finalIds.set(t.id, new Set((t.roster?.entries ?? []).map((e) => e.playerPoolEntry?.player?.id)))
      for (const entry of t.roster?.entries ?? []) {
        const p = entry.playerPoolEntry?.player
        if (!p || !SKILL[p.defaultPositionId]) continue
        const existing = bucket.get(p.id)
        const weekly = actualWeekly(p)
        if (existing) {
          // later snapshots can carry more complete stat arrays — merge max
          for (let i = 0; i < WEEKS; i++) existing.weekly_ppr[i] = Math.max(existing.weekly_ppr[i], weekly[i])
        } else {
          bucket.set(p.id, {
            name: p.fullName,
            position: SKILL[p.defaultPositionId],
            weekly_ppr: weekly,
            player_id: p.id,
          })
        }
      }
    }
  }

  const teams = (league.teams ?? []).map((t) => ({
    team_id: t.id,
    team_name: t.name ?? `${t.location ?? ''} ${t.nickname ?? ''}`.trim(),
    owner: memberById.get(t.owners?.[0]) ?? 'Unknown',
    roster: [...playersByTeam.get(t.id).values()]
      .filter((p) => finalIds.get(t.id)?.has(p.player_id))
      .map((p) => ({
        ...p,
        total_ppr: Math.round(p.weekly_ppr.reduce((a, b) => a + b, 0) * 10) / 10,
      })),
  }))
  seasons[String(year)] = { year, teams }
  console.log(`${teams.length} teams, ${teams.reduce((n, t) => n + t.roster.length, 0)} players`)
}

writeFileSync(OUT, JSON.stringify({ weekly_line: 129, seasons }))
console.log(`Wrote ${OUT} — re-run scripts/tune-line.mjs 0.02 --write to recalibrate the line`)
