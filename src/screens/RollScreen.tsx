import LineupBar from '../components/LineupBar'
import { SLOT_DEFS, type Mode } from '../types'
import type { Run } from '../hooks/useRun'

interface Props {
  run: Run
  mode: Mode
  onDraft: () => void
  onQuit: () => void
}

export default function RollScreen({ run, mode, onDraft, onQuit }: Props) {
  const pickNumber = run.filledCount + 1
  const eligible = run.eligiblePlayers.length

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={onQuit} className="min-h-11 px-1 text-sm text-slate-500 active:text-slate-300">
          ✕ Quit
        </button>
        <span className="text-sm font-bold text-slate-400">
          Pick {pickNumber} / {SLOT_DEFS.length}
        </span>
      </div>

      <div className="mt-4">
        <LineupBar slots={run.slots} mode={mode} />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div key={`${run.year}-${run.team?.team_id}`} className="pop-in text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Rolled year
          </div>
          <div className="mt-1 text-7xl font-black tracking-tight text-slate-100">{run.year}</div>

          <div className="mt-8 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Rolled team
          </div>
          <div className="mt-1 px-2 text-3xl font-black leading-tight text-turf">
            {run.team?.team_name ?? '—'}
          </div>
          <div className="mt-1 text-sm text-slate-400">{run.team?.owner}</div>

          <div className="mt-6 text-xs text-slate-500">
            {eligible > 0 ? (
              <>
                <span className="font-bold text-slate-300">{eligible}</span> draftable player
                {eligible === 1 ? '' : 's'} for your open slots
              </>
            ) : (
              <span className="font-semibold text-flag">
                No draftable players for your open slots — re-roll!
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={run.rollYear}
            className="min-h-13 rounded-2xl bg-field-soft py-3.5 font-bold text-slate-200 ring-1 ring-slate-600 transition active:scale-[0.98]"
          >
            🎲 Re-roll Year
          </button>
          <button
            onClick={run.rollTeam}
            className="min-h-13 rounded-2xl bg-field-soft py-3.5 font-bold text-slate-200 ring-1 ring-slate-600 transition active:scale-[0.98]"
          >
            🎲 Re-roll Team
          </button>
        </div>
        <button
          onClick={onDraft}
          disabled={eligible === 0}
          className="min-h-14 w-full rounded-2xl bg-turf-deep text-lg font-black text-white shadow-lg shadow-turf-deep/30 transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          Draft from this team
        </button>
      </div>
    </div>
  )
}
