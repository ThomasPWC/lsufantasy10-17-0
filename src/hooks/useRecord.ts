import { useMemo } from 'react'
import { WEEKS, type DraftedPlayer } from '../types'

export interface RecordResult {
  avg: number
  wins: number
  losses: number
  perfect: boolean
}

// The game works off averages: your lineup's combined points per week
// (season totals / 17) must clear the line — do that and you're 17-0.
export function computeRecord(lineup: DraftedPlayer[], weeklyLine: number): RecordResult {
  const avg = lineup.reduce((sum, d) => sum + d.player.total_ppr, 0) / WEEKS
  const perfect = avg >= weeklyLine
  return { avg, wins: perfect ? 17 : 0, losses: perfect ? 0 : 17, perfect }
}

export function useRecord(lineup: DraftedPlayer[], weeklyLine: number): RecordResult {
  return useMemo(() => computeRecord(lineup, weeklyLine), [lineup, weeklyLine])
}
