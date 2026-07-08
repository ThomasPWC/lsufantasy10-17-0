import { WEEKS, type Mode, type Player } from '../types'

const POS_COLORS: Record<string, string> = {
  QB: 'bg-rose-500/20 text-rose-300',
  RB: 'bg-sky-500/20 text-sky-300',
  WR: 'bg-violet-500/20 text-violet-300',
  TE: 'bg-amber-500/20 text-amber-300',
}

interface Props {
  player: Player
  mode: Mode
  onTap: () => void
}

export default function PlayerCard({ player, mode, onTap }: Props) {
  return (
    <button
      onClick={onTap}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-field-soft px-4 py-3 text-left ring-1 ring-slate-700 transition active:scale-[0.98] active:ring-turf"
    >
      <span
        className={`w-10 shrink-0 rounded-md py-1 text-center text-xs font-bold ${POS_COLORS[player.position]}`}
      >
        {player.position}
      </span>
      <span className="flex-1 truncate font-semibold text-slate-100">{player.name}</span>
      {mode === 'normal' ? (
        <span className="shrink-0 text-sm font-bold text-turf">
          {(player.total_ppr / WEEKS).toFixed(1)}
          <span className="ml-1 font-normal text-slate-500">/wk</span>
        </span>
      ) : (
        <span className="shrink-0 text-sm text-slate-600">???</span>
      )}
    </button>
  )
}
