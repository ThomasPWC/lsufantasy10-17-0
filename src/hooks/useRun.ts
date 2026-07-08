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

export interface Run {
  slots: (DraftedPlayer | null)[]
  year: number
  team: Team | undefined
  complete: boolean
  filledCount: number
  eligiblePlayers: Player[]
  openSlotIndicesFor: (player: Player) => number[]
  rollYear: () => void
  rollTeam: () => void
  draft: (player: Player, slotIndex: number) => void
  newRun: () => void
}

export function useRun(index: LeagueIndex): Run {
  const rollRandom = useCallback(() => {
    const year = randomOf(index.years)
    const season = index.seasonsByYear.get(year)!
    return { year, teamId: randomOf(season.teams).team_id }
  }, [index])

  const [slots, setSlots] = useState<(DraftedPlayer | null)[]>(() => SLOT_DEFS.map(() => null))
  const [roll, setRoll] = useState(rollRandom)

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

  const rollYear = useCallback(() => {
    setRoll((prev) => {
      const year = randomOtherThan(index.years, prev.year)
      const season = index.seasonsByYear.get(year)!
      return { year, teamId: randomOf(season.teams).team_id }
    })
  }, [index])

  const rollTeam = useCallback(() => {
    setRoll((prev) => {
      const season = index.seasonsByYear.get(prev.year)!
      const teamId = randomOtherThan(
        season.teams.map((t) => t.team_id),
        prev.teamId,
      )
      return { ...prev, teamId }
    })
  }, [index])

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
    setRoll(rollRandom())
  }, [rollRandom])

  const filledCount = slots.filter(Boolean).length

  return {
    slots,
    year: roll.year,
    team,
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
