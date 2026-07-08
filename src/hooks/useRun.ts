import { useCallback, useMemo, useState } from 'react'
import { SLOT_DEFS, type DraftedPlayer, type Player, type Team } from '../types'
import { getTeam, type LeagueIndex } from './useLeagueData'

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Pick a random element, avoiding `avoid` when there is more than one option. */
function randomOtherThan<T>(arr: T[], avoid: T): T {
  if (arr.length <= 1) return arr[0]
  const rest = arr.filter((x) => x !== avoid)
  return randomOf(rest)
}

export type RollKind = 'both' | 'year' | 'team'

export interface Run {
  slots: (DraftedPlayer | null)[]
  year: number
  team: Team | undefined
  rollKind: RollKind
  yearRerollsLeft: number
  teamRerollsLeft: number
  complete: boolean
  filledCount: number
  eligiblePlayers: Player[]
  openSlotIndicesFor: (player: Player) => number[]
  rollYear: () => void
  rollTeam: () => void
  draft: (player: Player, slotIndex: number) => void
  newRun: () => void
}

export const REROLLS_PER_RUN = 1 // one Year + one Team re-roll for the whole draft

export function useRun(index: LeagueIndex): Run {
  const rollRandom = useCallback((): { year: number; teamId: number; kind: RollKind } => {
    const year = randomOf(index.years)
    const season = index.seasonsByYear.get(year)!
    return { year, teamId: randomOf(season.teams).team_id, kind: 'both' }
  }, [index])

  const [slots, setSlots] = useState<(DraftedPlayer | null)[]>(() => SLOT_DEFS.map(() => null))
  const [roll, setRoll] = useState(rollRandom)
  const [rerolls, setRerolls] = useState({ year: REROLLS_PER_RUN, team: REROLLS_PER_RUN })

  const team = getTeam(index, roll.year, roll.teamId)

  const draftedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const s of slots) if (s) ids.add(s.player.player_id)
    return ids
  }, [slots])

  const openSlotIndicesFor = useCallback(
    (player: Player) =>
      SLOT_DEFS.flatMap((def, i) =>
        slots[i] === null && def.eligible.includes(player.position) ? [i] : [],
      ),
    [slots],
  )

  const eligiblePlayers = useMemo(() => {
    if (!team) return []
    return team.roster.filter(
      (p) => !draftedIds.has(p.player_id) && openSlotIndicesFor(p).length > 0,
    )
  }, [team, draftedIds, openSlotIndicesFor])

  // A re-roll is free when the current team has no draftable player for the
  // remaining slots — otherwise the pick could soft-lock with no budget left.
  const stuck = eligiblePlayers.length === 0

  // Re-roll YEAR: follow the same owner to a different season they played in.
  // Falls back to a fresh year+team roll for single-season owners.
  const rollYear = useCallback(() => {
    if (!stuck) {
      if (rerolls.year <= 0) return
      setRerolls((r) => ({ ...r, year: r.year - 1 }))
    }
    setRoll((prev) => {
      const owner = index.seasonsByYear
        .get(prev.year)!
        .teams.find((t) => t.team_id === prev.teamId)?.owner
      const otherYears = index.years.filter(
        (y) =>
          y !== prev.year && index.seasonsByYear.get(y)!.teams.some((t) => t.owner === owner),
      )
      if (owner && otherYears.length > 0) {
        const year = randomOf(otherYears)
        const teamId = index.seasonsByYear.get(year)!.teams.find((t) => t.owner === owner)!
          .team_id
        return { year, teamId, kind: 'year' as const }
      }
      const year = randomOtherThan(index.years, prev.year)
      const season = index.seasonsByYear.get(year)!
      return { year, teamId: randomOf(season.teams).team_id, kind: 'both' as const }
    })
  }, [index, stuck, rerolls.year])

  // Re-roll TEAM: same season, different team.
  const rollTeam = useCallback(() => {
    if (!stuck) {
      if (rerolls.team <= 0) return
      setRerolls((r) => ({ ...r, team: r.team - 1 }))
    }
    setRoll((prev) => {
      const season = index.seasonsByYear.get(prev.year)!
      const teamId = randomOtherThan(
        season.teams.map((t) => t.team_id),
        prev.teamId,
      )
      return { ...prev, teamId, kind: 'team' as const }
    })
  }, [index, stuck, rerolls.team])

  const draft = useCallback(
    (player: Player, slotIndex: number) => {
      if (!team || slots[slotIndex] !== null) return
      const next = [...slots]
      next[slotIndex] = {
        player,
        year: roll.year,
        teamName: team.team_name,
        owner: team.owner,
      }
      setSlots(next)
      if (next.some((s) => s === null)) setRoll(rollRandom())
    },
    [team, slots, roll.year, rollRandom],
  )

  const newRun = useCallback(() => {
    setSlots(SLOT_DEFS.map(() => null))
    setRerolls({ year: REROLLS_PER_RUN, team: REROLLS_PER_RUN })
    setRoll(rollRandom())
  }, [rollRandom])

  const filledCount = slots.filter(Boolean).length

  return {
    slots,
    year: roll.year,
    team,
    rollKind: roll.kind,
    yearRerollsLeft: rerolls.year,
    teamRerollsLeft: rerolls.team,
    complete: filledCount === SLOT_DEFS.length,
    filledCount,
    eligiblePlayers,
    openSlotIndicesFor,
    rollYear,
    rollTeam,
    draft,
    newRun,
  }
}
