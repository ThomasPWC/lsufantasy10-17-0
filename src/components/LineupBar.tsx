import { SLOT_DEFS, type DraftedPlayer, type Mode } from '../types'

function shortName(full: string): string {
  const parts = full.split(' ')
  if (parts.length < 2) return full
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

interface Props {
  slots: (DraftedPlayer | null)[]
  mode: Mode
}

export default function LineupBar({ slots, mode }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {SLOT_DEFS.map((def, i) => {
        const filled = slots[i]
        return (
          <div
            key={i}
            className={`rounded-lg px-0.5 py-1.5 text-center ${
              filled ? 'bg-turf-deep/30 ring-1 ring-turf/40' : 'bg-field-soft'
            }`}
          >
            <div className={`text-[10px] font-bold ${filled ? 'text-turf' : 'text-slate-400'}`}>
              {def.label}
            </div>
            {filled ? (
              <div className="mt-0.5 text-[9px] leading-tight text-slate-100">
                <div className="truncate font-semibold">{shortName(filled.player.name)}</div>
                <div className="text-slate-400">
                  '{String(filled.year).slice(2)}
                  {mode === 'normal' && (
                    <span className="ml-0.5 text-turf">{Math.round(filled.player.total_ppr)}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-0.5 text-[10px] text-slate-600">—</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
