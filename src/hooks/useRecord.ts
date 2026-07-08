import { useMemo } from 'react'
import { WEEKS, type DraftedPlayer } from '../types'

export interface RecordResult {
  avg: number
  wins: number
  losses: number
  perfect: boolean
}

// The game works off averages: your lineup's combined points per week
// (season totals / 17) against the line. Clear it and you're 17-0; every
// LOSS_STEP points short costs one win, so a near miss is 16-1, not 0-17.
const LOSS_STEP = 2.5

export function computeRecord(lineup: DraftedPlayer[], weeklyLine: number): RecordResult {
  const avg = lineup.reduce((sum, d) => sum + d.player.total_ppr, 0) / WEEKS
  const perfect = avg >= weeklyLine
  const losses = perfect ? 0 : Math.min(17, Math.ceil((weeklyLine - avg) / LOSS_STEP))
  return { avg, wins: 17 - losses, losses, perfect }
}

export function useRecord(lineup: DraftedPlayer[], weeklyLine: number): RecordResult {
  return useMemo(() => computeRecord(lineup, weeklyLine), [lineup, weeklyLine])
}
