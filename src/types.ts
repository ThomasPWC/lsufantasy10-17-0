export type Position = 'QB' | 'RB' | 'WR' | 'TE'

export interface Player {
  name: string
  position: Position
  total_ppr: number
  weekly_ppr: number[]
  player_id: number
}

export interface Team {
  team_id: number
  team_name: string
  owner: string
  roster: Player[]
}

export interface Season {
  year: number
  teams: Team[]
}

export interface LeagueData {
  weekly_line: number
  sample?: boolean
  seasons: Record<string, Season>
}

export interface SlotDef {
  label: string
  eligible: Position[]
}

export const SLOT_DEFS: SlotDef[] = [
  { label: 'QB', eligible: ['QB'] },
  { label: 'RB', eligible: ['RB'] },
  { label: 'RB', eligible: ['RB'] },
  { label: 'WR', eligible: ['WR'] },
  { label: 'WR', eligible: ['WR'] },
  { label: 'TE', eligible: ['TE'] },
  { label: 'FLEX', eligible: ['RB', 'WR', 'TE'] },
]

export const WEEKS = 17

export interface DraftedPlayer {
  player: Player
  year: number
  teamName: string
  owner: string
}

export type Mode = 'normal' | 'hard'

export type Screen = 'home' | 'roll' | 'draft' | 'results'
