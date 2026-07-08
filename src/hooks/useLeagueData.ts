import { useMemo } from 'react'
import raw from '../data/league-history.json'
import type { LeagueData, Season, Team } from '../types'

const data = raw as unknown as LeagueData

export interface LeagueIndex {
  data: LeagueData
  years: number[]
  seasonsByYear: Map<number, Season>
  weeklyLine: number
}

export function useLeagueData(): LeagueIndex {
  return useMemo(() => {
    const seasonsByYear = new Map<number, Season>()
    for (const season of Object.values(data.seasons)) {
      seasonsByYear.set(season.year, season)
    }
    const years = [...seasonsByYear.keys()].sort((a, b) => a - b)
    return { data, years, seasonsByYear, weeklyLine: data.weekly_line }
  }, [])
}

export function getTeam(index: LeagueIndex, year: number, teamId: number): Team | undefined {
  return index.seasonsByYear.get(year)?.teams.find((t) => t.team_id === teamId)
}
