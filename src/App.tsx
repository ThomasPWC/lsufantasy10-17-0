import { useEffect, useState } from 'react'
import { useLeagueData } from './hooks/useLeagueData'
import { useRun } from './hooks/useRun'
import { getBestRecord, getHardModePref, setHardModePref, type BestRecord } from './storage'
import HomeScreen from './screens/HomeScreen'
import RollScreen from './screens/RollScreen'
import DraftScreen from './screens/DraftScreen'
import ResultScreen from './screens/ResultScreen'
import { type DraftedPlayer, type Mode, type Screen } from './types'

export default function App() {
  const index = useLeagueData()
  const run = useRun(index)
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<Mode>(() => (getHardModePref() ? 'hard' : 'normal'))
  const [best, setBest] = useState<BestRecord | null>(() => getBestRecord())

  useEffect(() => {
    setHardModePref(mode === 'hard')
  }, [mode])

  const start = () => {
    run.newRun()
    setScreen('roll')
  }

  const handleDrafted = () => {
    // run state updates on next render; complete when this was the 7th pick
    if (run.filledCount + 1 === run.slots.length) {
      setScreen('results')
    } else {
      setScreen('roll')
    }
  }

  const goHome = () => {
    setBest(getBestRecord())
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
          weeklyLine={index.weeklyLine}
          onStart={start}
        />
      )}
      {screen === 'roll' && (
        <RollScreen run={run} mode={mode} onDraft={() => setScreen('draft')} onQuit={goHome} />
      )}
      {screen === 'draft' && (
        <DraftScreen run={run} mode={mode} onBack={() => setScreen('roll')} onDrafted={handleDrafted} />
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
