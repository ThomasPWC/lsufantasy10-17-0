import { useEffect, useMemo, useState } from 'react'
import { useRecord } from '../hooks/useRecord'
import { saveBestResultIfBetter } from '../storage'
import { SLOT_DEFS, WEEKS, type DraftedPlayer, type Mode } from '../types'

interface Props {
  lineup: DraftedPlayer[]
  mode: Mode
  weeklyLine: number
  onPlayAgain: () => void
  onHome: () => void
}

const CONFETTI_COLORS = ['#34d399', '#fb923c', '#38bdf8', '#f472b6', '#fbbf24']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: `${(i * 137.5) % 100}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${(i % 20) * 0.15}s`,
        duration: `${2.2 + (i % 7) * 0.35}s`,
      })),
    [],
  )
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </>
  )
}

export default function ResultScreen({ lineup, mode, weeklyLine, onPlayAgain, onHome }: Props) {
  const record = useRecord(lineup, weeklyLine)
  const teamAvg = record.avg
  const [isNewBest, setIsNewBest] = useState(false)

  useEffect(() => {
    setIsNewBest(
      saveBestResultIfBetter({
        avg: Math.round(record.avg * 10) / 10,
        perfect: record.perfect,
        mode,
        date: new Date().toISOString(),
      }),
    )
  }, [record.avg, record.perfect, mode])

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-10">
      {record.perfect && <Confetti />}

      <div className="pop-in text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Final record
        </div>
        <div
          className={`mt-1 text-8xl font-black tracking-tight ${
            record.perfect ? 'text-turf' : 'text-slate-100'
          }`}
        >
          {record.wins}-{record.losses}
        </div>
        {record.perfect ? (
          <div className="mt-2 text-xl font-black text-turf">🏆 PERFECT SEASON 🏆</div>
        ) : (
          <div className="mt-2 text-sm text-slate-400">
            {weeklyLine - record.avg <= 5
              ? 'Agonizingly close.'
              : weeklyLine - record.avg <= 15
                ? 'Solid squad. Not a legend.'
                : 'Rough draft, coach.'}
          </div>
        )}
        {isNewBest && !record.perfect && (
          <div className="mt-2 inline-block rounded-full bg-flag/20 px-3 py-1 text-xs font-bold text-flag">
            New best average!
          </div>
        )}
        {mode === 'hard' && (
          <div className="mt-2 text-xs font-bold uppercase tracking-wide text-flag">Hard Mode</div>
        )}
      </div>

      <div className="mx-auto mt-6 w-fit rounded-2xl bg-field-soft px-6 py-3 text-center ring-1 ring-slate-700">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Team average
        </div>
        <div className="mt-0.5 text-3xl font-black text-slate-100">
          {teamAvg.toFixed(1)}
          <span className="ml-1 text-base font-bold text-slate-500">/wk</span>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Your starters
        </h3>
        <div className="space-y-1.5">
          {lineup.map((d, i) => (
            <div
              key={`${d.player.player_id}-${i}`}
              className="flex items-center gap-3 rounded-xl bg-field-soft px-3 py-2.5 ring-1 ring-slate-700"
            >
              <span className="w-11 shrink-0 rounded-md bg-slate-700/60 py-1 text-center text-[11px] font-bold text-slate-300">
                {SLOT_DEFS[i].label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">{d.player.name}</div>
                <div className="truncate text-xs text-slate-500">{d.teamName}</div>
              </div>
              <span className="shrink-0 text-sm font-bold text-turf">
                {(d.player.total_ppr / WEEKS).toFixed(1)}
                <span className="ml-1 font-normal text-slate-500">/wk</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={onPlayAgain}
          className="min-h-14 w-full rounded-2xl bg-turf-deep text-lg font-black text-white shadow-lg shadow-turf-deep/30 transition active:scale-[0.98]"
        >
          Play again
        </button>
        <button
          onClick={onHome}
          className="min-h-12 w-full rounded-2xl bg-field-soft font-bold text-slate-300 ring-1 ring-slate-600 transition active:scale-[0.98]"
        >
          Home
        </button>
      </div>
    </div>
  )
}
