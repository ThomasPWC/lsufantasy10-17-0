import type { Mode } from './types'

export interface BestResult {
  avg: number
  wins: number
  losses: number
  perfect: boolean
  mode: Mode
  date: string
}

const BEST_KEY = 'league170.bestResult'
const MODE_KEY = 'league170.hardMode'

export function getBestResult(): BestResult | null {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    return raw ? (JSON.parse(raw) as BestResult) : null
  } catch {
    return null
  }
}

export function saveBestResultIfBetter(result: BestResult): boolean {
  const best = getBestResult()
  if (best && best.avg >= result.avg) return false
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(result))
  } catch {
    /* storage unavailable */
  }
  return true
}

export function getHardModePref(): boolean {
  try {
    return localStorage.getItem(MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function setHardModePref(on: boolean): void {
  try {
    localStorage.setItem(MODE_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}
