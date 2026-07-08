import { useEffect, useState } from 'react'
import { useLeagueData } from './hooks/useLeagueData'
import { useRun } from './hooks/useRun'
import { getBestResult, getHardModePref, setHardModePref, type BestResult } from './storage'
import HomeScreen from './screens/HomeScreen'
import PlayScreen from './screens/PlayScreen'
import ResultScreen from './screens/ResultScreen'
import { type DraftedPlayer, type Mode } from './types'

type Screen = 'home' | 'play' | 'results'

export default function App() {
  const index = useLeagueData()
  const run = useRun(index)
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<Mode>(() => (getHardModePref() ? 'hard' : 'normal'))
  const [best, setBest] = useState<BestResult | null>(() => getBestResult())

  useEffect(() => {
    setHardModePref(mode === 'hard')
  }, [mode])

  const start = () => {
    run.newRun()
    setScreen('play')
  }

  const handleDrafted = () => {
    // run state updates on next render; complete when this was the 7th pick
    if (run.filledCount + 1 === run.slots.length) setScreen('results')
  }

  const goHome = () => {
    setBest(getBestResult())
    setScreen('home')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      {screen === 'home' && (
        <HomeScreen
          mode={mode}
          onModeChange={setMode}
          best={best}
          isSample={index.data.sample === true}
          onStart={start}
        />
      )}
      {screen === 'play' && (
        <PlayScreen index={index} run={run} mode={mode} onDrafted={handleDrafted} onQuit={goHome} />
      )}
      {screen === 'results' && (
        <ResultScreen
          lineup={run.slots.filter((s): s is DraftedPlayer => s !== null)}
          mode={mode}
          weeklyLine={index.weeklyLine}
          onPlayAgain={start}
          onHome={goHome}
        />
      )}
    </div>
  )
}
