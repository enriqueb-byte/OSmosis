import { useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import scenariosData from './data/scenarios.json'
import StartScreen from './components/StartScreen'
import ScenarioCard from './components/ScenarioCard'
import SessionSummary from './components/SessionSummary'

const SCENARIO_COUNT = 10
const TIMER_SECONDS = 60

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function App() {
  const [phase, setPhase] = useState('start') // 'start' | 'scenarios' | 'summary'
  const [sessionResponses, setSessionResponses] = useState([]) // { scenarioId, query, response }[]

  const sessionScenarios = useMemo(() => {
    if (phase === 'start') return []
    return shuffle(scenariosData).slice(0, SCENARIO_COUNT)
  }, [phase])

  const startSession = useCallback(() => {
    setSessionResponses([])
    setPhase('scenarios')
  }, [])

  const handleScenarioSubmit = useCallback((scenarioId, query, response) => {
    setSessionResponses((prev) => [...prev, { scenarioId, query, response }])
  }, [])

  const handleScenarioNext = useCallback((index) => {
    if (index >= sessionScenarios.length - 1) {
      setPhase('summary')
    }
  }, [sessionScenarios.length])

  const currentScenarioIndex = sessionResponses.length
  const currentScenario = sessionScenarios[currentScenarioIndex]
  const sessionComplete = phase === 'summary'

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {phase === 'start' && (
          <StartScreen key="start" onStart={startSession} />
        )}
        {phase === 'scenarios' && currentScenario && (
          <ScenarioCard
            key={currentScenario.id}
            scenario={currentScenario}
            index={currentScenarioIndex}
            total={sessionScenarios.length}
            timerSeconds={TIMER_SECONDS}
            onSubmit={(response) => {
              handleScenarioSubmit(currentScenario.id, currentScenario.query, response)
              handleScenarioNext(currentScenarioIndex)
            }}
          />
        )}
        {phase === 'summary' && (
          <SessionSummary
            key="summary"
            responses={sessionResponses}
            sessionComplete={sessionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
