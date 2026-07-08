import type { Mode } from './types'

export interface BestRecord {
  wins: number
  losses: number
  mode: Mode
  date: string
}

const BEST_KEY = 'league170.bestRecord'
const MODE_KEY = 'league170.hardMode'

export function getBestRecord(): BestRecord | null {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    return raw ? (JSON.parse(raw) as BestRecord) : null
  } catch {
    return null
  }
}

export function saveBestRecordIfBetter(record: BestRecord): boolean {
  const best = getBestRecord()
  if (best && best.wins >= record.wins) return false
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(record))
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
