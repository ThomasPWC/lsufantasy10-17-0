import { useEffect, useState } from 'react'
import LineupBar from '../components/LineupBar'
import PlayerCard from '../components/PlayerCard'
import { SLOT_DEFS, type Mode, type Player } from '../types'
import type { Run } from '../hooks/useRun'
import type { LeagueIndex } from '../hooks/useLeagueData'

interface Props {
  index: LeagueIndex
  run: Run
  mode: Mode
  onDrafted: () => void
  onQuit: () => void
}

const SPIN_TICKS = 11
const TICK_MS = 70

export default function PlayScreen({ index, run, mode, onDrafted, onQuit }: Props) {
  const [choosing, setChoosing] = useState<Player | null>(null)
  const [spinning, setSpinning] = useState(true)
  const [flash, setFlash] = useState<{ year: number; name: string; owner: string } | null>(null)

  // re-spin whenever the rolled team changes (re-rolls and post-pick auto-rolls);
  // only the dimension that was re-rolled cycles during the animation
  const spinKey = `${run.year}-${run.team?.team_id}-${run.filledCount}`
  useEffect(() => {
    setSpinning(true)
    setChoosing(null)
    const kind = run.rollKind
    const heldYear = run.year
    const heldOwner = run.team?.owner
    const ownerYears =
      kind === 'year'
        ? index.years.filter((y) =>
            index.seasonsByYear.get(y)!.teams.some((t) => t.owner === heldOwner),
          )
        : []
    let tick = 0
    const iv = setInterval(() => {
      tick++
      if (kind === 'team') {
        const season = index.seasonsByYear.get(heldYear)!
        const team = season.teams[Math.floor(Math.random() * season.teams.length)]
        setFlash({ year: heldYear, name: team.team_name, owner: team.owner })
      } else if (kind === 'year' && ownerYears.length > 0) {
        const year = ownerYears[Math.floor(Math.random() * ownerYears.length)]
        const team = index.seasonsByYear.get(year)!.teams.find((t) => t.owner === heldOwner)!
        setFlash({ year, name: team.team_name, owner: heldOwner! })
      } else {
        const year = index.years[Math.floor(Math.random() * index.years.length)]
        const season = index.seasonsByYear.get(year)!
        const team = season.teams[Math.floor(Math.random() * season.teams.length)]
        setFlash({ year, name: team.team_name, owner: team.owner })
      }
      if (tick >= SPIN_TICKS) {
        clearInterval(iv)
        setSpinning(false)
      }
    }, TICK_MS)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

  const shown =
    spinning && flash
      ? flash
      : { year: run.year, name: run.team?.team_name ?? '—', owner: run.team?.owner ?? '' }

  const commit = (player: Player, slotIndex: number) => {
    setChoosing(null)
    run.draft(player, slotIndex)
    onDrafted()
  }

  const handleTap = (player: Player) => {
    const open = run.openSlotIndicesFor(player)
    if (open.length === 0) return
    const byLabel = new Map<string, number>()
    for (const i of open) {
      if (!byLabel.has(SLOT_DEFS[i].label)) byLabel.set(SLOT_DEFS[i].label, i)
    }
    if (byLabel.size === 1) {
      commit(player, open[0])
    } else {
      setChoosing(player)
    }
  }

  const choiceSlots = choosing
    ? [...new Map(run.openSlotIndicesFor(choosing).map((i) => [SLOT_DEFS[i].label, i])).entries()]
    : []

  const sorted = [...run.eligiblePlayers].sort((a, b) => b.total_ppr - a.total_ppr)
  const stuck = !spinning && sorted.length === 0 // free re-roll when nothing is draftable

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-6 pt-6">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onQuit}
          className="min-h-11 shrink-0 pr-2 text-sm text-slate-500 active:text-slate-300"
        >
          ✕
        </button>
        <span className="text-sm font-bold text-slate-400">
          Pick {run.filledCount + 1} / {SLOT_DEFS.length}
        </span>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={run.rollYear}
            disabled={spinning || (run.yearRerollsLeft <= 0 && !stuck)}
            className="min-h-11 rounded-xl bg-field-soft px-3 text-sm font-bold text-slate-200 ring-1 ring-slate-600 transition active:scale-[0.96] disabled:opacity-40"
          >
            🎲 Year{' '}
            <span className="text-xs font-normal text-slate-500">
              ×{stuck ? '∞' : run.yearRerollsLeft}
            </span>
          </button>
          <button
            onClick={run.rollTeam}
            disabled={spinning || (run.teamRerollsLeft <= 0 && !stuck)}
            className="min-h-11 rounded-xl bg-field-soft px-3 text-sm font-bold text-slate-200 ring-1 ring-slate-600 transition active:scale-[0.96] disabled:opacity-40"
          >
            🎲 Team{' '}
            <span className="text-xs font-normal text-slate-500">
              ×{stuck ? '∞' : run.teamRerollsLeft}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-3">
        <LineupBar slots={run.slots} mode={mode} />
      </div>

      <div className="mt-4 text-center">
        <div
          key={`${shown.year}-${shown.name}`}
          className={spinning ? 'reel' : 'pop-in'}
        >
          <span className="text-4xl font-black tracking-tight text-slate-100">{shown.year}</span>
          <div className="mt-0.5 truncate px-2 text-xl font-black leading-tight text-turf">
            {shown.name}
          </div>
          <div className="text-xs text-slate-400">{shown.owner}</div>
        </div>
        <div className="mt-1.5 text-[10px] text-slate-600">
          🎲 Year = same owner, new season · 🎲 Team = same season, new team · one of each per
          pick
        </div>
      </div>

      <div
        className={`mt-4 flex-1 space-y-2 overflow-y-auto pb-2 transition-opacity duration-200 ${
          spinning ? 'pointer-events-none opacity-25' : 'opacity-100'
        }`}
      >
        {!spinning && sorted.length === 0 && (
          <div className="rounded-xl bg-field-soft p-4 text-center text-sm font-semibold text-flag ring-1 ring-slate-700">
            No draftable players for your open slots — re-roll!
          </div>
        )}
        {sorted.map((p) => (
          <PlayerCard key={p.player_id} player={p} mode={mode} onTap={() => handleTap(p)} />
        ))}
      </div>

      {choosing && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/60"
          onClick={() => setChoosing(null)}
        >
          <div
            className="pop-in w-full rounded-t-3xl bg-field-soft p-5 pb-8 ring-1 ring-slate-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600" />
            <div className="text-center font-bold text-slate-100">
              Which slot for {choosing.name}?
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {choiceSlots.map(([label, slotIndex]) => (
                <button
                  key={label}
                  onClick={() => commit(choosing, slotIndex)}
                  className="min-h-14 rounded-2xl bg-turf-deep font-black text-white transition active:scale-[0.98]"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setChoosing(null)}
              className="mt-3 min-h-11 w-full text-sm font-semibold text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
