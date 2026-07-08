import { useState } from 'react'
import type { BestRecord } from '../storage'
import type { Mode } from '../types'

interface Props {
  mode: Mode
  onModeChange: (mode: Mode) => void
  best: BestRecord | null
  isSample: boolean
  weeklyLine: number
  onStart: () => void
}

export default function HomeScreen({ mode, onModeChange, best, isSample, weeklyLine, onStart }: Props) {
  const [showHow, setShowHow] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-14">
      <div className="flex-1">
        <h1 className="text-center text-5xl font-black tracking-tight text-slate-100">
          League <span className="text-turf">17-0</span>
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Draft from your league's history. Clear {weeklyLine} every week.
        </p>

        {isSample && (
          <p className="mt-3 text-center text-xs font-semibold text-flag">
            ⚠ Sample data — drop your real league-history.json into src/data/
          </p>
        )}

        {best && (
          <div className="mx-auto mt-6 w-fit rounded-full bg-field-soft px-5 py-2 ring-1 ring-turf/40">
            <span className="text-xs uppercase tracking-wide text-slate-400">Best record </span>
            <span className="ml-1 font-black text-turf">
              {best.wins}-{best.losses}
            </span>
            {best.mode === 'hard' && <span className="ml-1.5 text-xs text-flag">HARD</span>}
          </div>
        )}

        <div className="mt-10">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mode
          </div>
          <div className="mx-auto flex w-full max-w-xs rounded-xl bg-field-soft p-1 ring-1 ring-slate-700">
            <button
              onClick={() => onModeChange('normal')}
              className={`min-h-11 flex-1 rounded-lg text-sm font-bold transition ${
                mode === 'normal' ? 'bg-turf-deep text-white' : 'text-slate-400'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => onModeChange('hard')}
              className={`min-h-11 flex-1 rounded-lg text-sm font-bold transition ${
                mode === 'hard' ? 'bg-flag text-field' : 'text-slate-400'
              }`}
            >
              Hard Mode
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            {mode === 'hard'
              ? 'Player points hidden — draft blind.'
              : 'Season PPR totals shown while drafting.'}
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setShowHow((v) => !v)}
            className="mx-auto block min-h-11 text-sm font-semibold text-slate-400 underline-offset-4 active:underline"
          >
            How to play {showHow ? '▲' : '▼'}
          </button>
          {showHow && (
            <ol className="pop-in mx-auto mt-3 max-w-sm list-decimal space-y-2 rounded-xl bg-field-soft p-4 pl-8 text-sm text-slate-300 ring-1 ring-slate-700">
              <li>Roll a random year and team from league history. Re-roll as much as you want.</li>
              <li>Draft one player from that team's real roster into an open slot.</li>
              <li>Fill all 7 slots: QB, 2 RB, 2 WR, TE, FLEX. No drafting the same player twice.</li>
              <li>
                Your lineup replays its seasons week by week. Score {weeklyLine}+ PPR in a week to
                win it.
              </li>
              <li>
                Go <span className="font-bold text-turf">17-0</span> to achieve perfection.
              </li>
            </ol>
          )}
        </div>
      </div>

      <button
        onClick={onStart}
        className="mt-8 min-h-14 w-full rounded-2xl bg-turf-deep text-lg font-black text-white shadow-lg shadow-turf-deep/30 transition active:scale-[0.98]"
      >
        Start Run
      </button>
    </div>
  )
}
