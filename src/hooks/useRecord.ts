import { useMemo } from 'react'
import { WEEKS, type DraftedPlayer } from '../types'

export interface WeekResult {
  week: number
  score: number
  win: boolean
}

export interface RecordResult {
  weeks: WeekResult[]
  wins: number
  losses: number
  perfect: boolean
}

export function computeRecord(lineup: DraftedPlayer[], weeklyLine: number): RecordResult {
  const weeks: WeekResult[] = []
  for (let w = 0; w < WEEKS; w++) {
    const score = lineup.reduce((sum, d) => sum + (d.player.weekly_ppr[w] ?? 0), 0)
    weeks.push({ week: w + 1, score, win: score >= weeklyLine })
  }
  const wins = weeks.filter((x) => x.win).length
  return { weeks, wins, losses: WEEKS - wins, perfect: wins === WEEKS }
}

export function useRecord(lineup: DraftedPlayer[], weeklyLine: number): RecordResult {
  return useMemo(() => computeRecord(lineup, weeklyLine), [lineup, weeklyLine])
}
