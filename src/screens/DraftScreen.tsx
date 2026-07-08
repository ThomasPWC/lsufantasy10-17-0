import { useState } from 'react'
import LineupBar from '../components/LineupBar'
import PlayerCard from '../components/PlayerCard'
import { SLOT_DEFS, type Mode, type Player } from '../types'
import type { Run } from '../hooks/useRun'

interface Props {
  run: Run
  mode: Mode
  onBack: () => void
  onDrafted: () => void
}

export default function DraftScreen({ run, mode, onBack, onDrafted }: Props) {
  const [choosing, setChoosing] = useState<Player | null>(null)

  const commit = (player: Player, slotIndex: number) => {
    setChoosing(null)
    run.draft(player, slotIndex)
    onDrafted()
  }

  const handleTap = (player: Player) => {
    const open = run.openSlotIndicesFor(player)
    if (open.length === 0) return
    // Collapse duplicate labels (two open RB slots are interchangeable)
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

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-6 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="min-h-11 px-1 text-sm text-slate-500 active:text-slate-300">
          ← Back to roll
        </button>
        <span className="text-sm font-bold text-slate-400">
          {run.year} · {run.team?.owner}
        </span>
      </div>

      <div className="mt-3">
        <LineupBar slots={run.slots} mode={mode} />
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-100">
        {run.team?.team_name}
        <span className="ml-2 text-sm font-semibold text-slate-500">{run.year}</span>
      </h2>
      <p className="mb-3 mt-0.5 text-xs text-slate-500">
        Tap a player to draft them{mode === 'hard' && ' — points hidden in Hard Mode'}.
      </p>

      <div className="flex-1 space-y-2 overflow-y-auto pb-2">
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
