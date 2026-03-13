import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import scenariosData from './data/scenarios.json'
import { scenarioMatchesFilters } from './data/scenarioFilters'
import StartScreen from './components/StartScreen'
import ScenarioCard from './components/ScenarioCard'
import SessionSummary from './components/SessionSummary'

const DEFAULT_SCENARIO_COUNT = 10
const DEFAULT_TIMER_SECONDS = 60
const BUFFER_SECONDS = 3
const RECENT_BLACKLIST_KEY = 'callgym_recent_scenario_ids'
const LAST_FILTERS_KEY = 'callgym_last_filters'
const RECENT_BLACKLIST_SIZE = 50
const SpeechRecognitionAPI = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

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
  const [sessionFilters, setSessionFilters] = useState(null)
  const [sessionScenarioCount, setSessionScenarioCount] = useState(DEFAULT_SCENARIO_COUNT)
  const [sessionTimerSeconds, setSessionTimerSeconds] = useState(DEFAULT_TIMER_SECONDS)
  const [sessionResponseMode, setSessionResponseMode] = useState('type')
  const [sessionMode, setSessionMode] = useState('practice')

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [bufferCountdown, setBufferCountdown] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [sessionLiveTranscript, setSessionLiveTranscript] = useState('')
  const [sessionScenariosList, setSessionScenariosList] = useState([])
  const recognitionRef = useRef(null)
  const recognitionRestartTimeoutRef = useRef(null)
  const prevQuestionIndexRef = useRef(null)
  const initialBufferRef = useRef(false)
  const sessionScenariosRef = useRef([])

  const sessionScenarios = phase === 'start' ? [] : sessionScenariosList

  useEffect(() => {
    if (prevQuestionIndexRef.current !== currentQuestionIndex) {
      prevQuestionIndexRef.current = currentQuestionIndex
      setSessionLiveTranscript(sessionResponses[currentQuestionIndex]?.response ?? '')
    }
  }, [currentQuestionIndex, sessionResponses])

  useEffect(() => {
    if (phase !== 'scenarios' || sessionResponseMode !== 'voice' || !SpeechRecognitionAPI) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (_) {}
        recognitionRef.current = null
      }
      return
    }
    const Recognition = SpeechRecognitionAPI

    function createRecognition() {
      const rec = new Recognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (event) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript
        }
        if (final) {
          setSessionLiveTranscript((prev) => (prev ? `${prev} ${final}` : final).trim())
        }
      }
      rec.onerror = () => {}
      rec.onend = () => {
        if (recognitionRef.current !== rec) return
        const delays = [100, 300, 800, 2000]
        let attempt = 0
        const tryStart = (current = rec) => {
          if (recognitionRef.current !== rec) return
          try {
            current.start()
          } catch (_) {
            attempt += 1
            if (attempt < delays.length) {
              recognitionRestartTimeoutRef.current = setTimeout(() => tryStart(current), delays[attempt - 1])
            } else {
              const fresh = createRecognition()
              recognitionRef.current = fresh
              try { fresh.start() } catch (__) {}
            }
          }
        }
        recognitionRestartTimeoutRef.current = setTimeout(() => tryStart(), delays[0])
      }
      return rec
    }

    const recognition = createRecognition()
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (_) {}
    return () => {
      if (recognitionRestartTimeoutRef.current) clearTimeout(recognitionRestartTimeoutRef.current)
      recognitionRestartTimeoutRef.current = null
      const current = recognitionRef.current
      if (current) {
        try { current.stop() } catch (_) {}
        recognitionRef.current = null
      }
    }
  }, [phase, sessionResponseMode])

  const startSession = useCallback((filters = null, options = {}) => {
    const raw = Array.isArray(scenariosData) ? scenariosData : (scenariosData?.default ?? [])
    const count = Math.max(1, options.scenarioCount ?? DEFAULT_SCENARIO_COUNT)

    // Clear recent blacklist when filters change so fresh pool per filter set
    try {
      const filtersJson = JSON.stringify(filters)
      const lastFiltersJson = localStorage.getItem(LAST_FILTERS_KEY)
      if (lastFiltersJson !== filtersJson) {
        localStorage.removeItem(RECENT_BLACKLIST_KEY)
        localStorage.setItem(LAST_FILTERS_KEY, filtersJson)
      }
    } catch (_) {}

    let pool = filters && Array.isArray(raw)
      ? raw.filter((s) => scenarioMatchesFilters(s, filters))
      : raw
    if (!Array.isArray(pool) || pool.length === 0) pool = raw

    let recentIds = []
    try {
      const stored = localStorage.getItem(RECENT_BLACKLIST_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        recentIds = Array.isArray(parsed) ? parsed : []
      }
    } catch (_) {}

    let poolExcludingRecent = Array.isArray(pool)
      ? pool.filter((s) => !recentIds.includes(s.id))
      : pool
    if (!Array.isArray(poolExcludingRecent) || poolExcludingRecent.length < count) {
      poolExcludingRecent = pool
    }
    const list = Array.isArray(poolExcludingRecent)
      ? shuffle([...poolExcludingRecent]).slice(0, count)
      : []
    sessionScenariosRef.current = list
    setSessionScenariosList(list)
    setSessionResponses([])
    setCurrentQuestionIndex(0)
    initialBufferRef.current = false
    setBufferCountdown(null)
    setSessionLiveTranscript('')
    setSessionFilters(filters)
    setSessionScenarioCount(count)
    setSessionTimerSeconds(options.timerSeconds ?? DEFAULT_TIMER_SECONDS)
    setSessionResponseMode(options.responseMode ?? 'type')
    setSessionMode(options.sessionMode ?? 'practice')
    setPhase('scenarios')
  }, [])

  const handleScenarioSubmit = useCallback((scenarioId, query, response, index) => {
    const entry = { scenarioId, query, response: response.trim() || '[No response]' }
    setSessionResponses((prev) => {
      if (index < prev.length) {
        const next = [...prev]
        next[index] = entry
        return next
      }
      return [...prev, entry]
    })
    if (index >= sessionScenarios.length - 1) {
      try {
        const idsThisSession = (sessionScenariosRef.current || []).map((s) => s.id)
        if (idsThisSession.length > 0) {
          const stored = localStorage.getItem(RECENT_BLACKLIST_KEY)
          const recent = stored ? (JSON.parse(stored) || []) : []
          const merged = [...recent, ...idsThisSession].slice(-RECENT_BLACKLIST_SIZE)
          localStorage.setItem(RECENT_BLACKLIST_KEY, JSON.stringify(merged))
        }
      } catch (_) {}
      setPhase('summary')
    } else {
      setSessionLiveTranscript('')
      setBufferCountdown(BUFFER_SECONDS)
    }
  }, [sessionScenarios.length])

  const handleExitClick = useCallback(() => setShowExitConfirm(true), [])
  const handleExitConfirm = useCallback(() => {
    setSessionResponses([])
    setCurrentQuestionIndex(0)
    setPhase('start')
    setShowExitConfirm(false)
  }, [])
  const handleExitCancel = useCallback(() => setShowExitConfirm(false), [])

  useEffect(() => {
    if (bufferCountdown == null || bufferCountdown <= 0) return
    const id = setInterval(() => {
      setBufferCountdown((prev) => {
        if (prev == null || prev <= 0) return prev
        if (prev === 1) {
          if (initialBufferRef.current) {
            initialBufferRef.current = false
          } else {
            setCurrentQuestionIndex((i) => i + 1)
          }
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [bufferCountdown])

  const currentScenario = sessionScenarios[currentQuestionIndex]
  const previousResponse = sessionResponses[currentQuestionIndex]?.response ?? ''
  const sessionComplete = phase === 'summary'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {phase === 'start' && (
          <StartScreen key="start" maxQuestions={scenariosData.length} onStart={startSession} />
        )}
        {phase === 'scenarios' && showExitConfirm && (
          <motion.div
            key="exit-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-10 flex items-center justify-center p-4 bg-slate-900/40"
            onClick={handleExitCancel}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="rounded-2xl bg-white border border-slate-200 shadow-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-slate-800 font-medium mb-1">Exit session?</p>
              <p className="text-slate-600 text-sm mb-6">
                Your progress will be lost and you’ll return to the home screen.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleExitCancel}
                  className="py-2.5 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExitConfirm}
                  className="py-2.5 px-4 rounded-lg bg-[#003063] text-white text-sm font-medium hover:bg-[#002550] transition-colors"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {phase === 'scenarios' && (
          <motion.div
            key="scenarios"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            {bufferCountdown != null ? (
              <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-8 md:p-12 flex flex-col items-center justify-center mx-auto">
                <p className="text-slate-600 text-sm md:text-base mb-4">{initialBufferRef.current ? 'First question in' : 'Next question in'}</p>
                <p className="text-4xl md:text-5xl font-semibold tabular-nums text-[#003063]" aria-live="polite">
                  {bufferCountdown}
                </p>
              </div>
            ) : currentScenario ? (
              <ScenarioCard
                key={`${currentScenario.id}-${currentQuestionIndex}`}
                scenario={currentScenario}
                index={currentQuestionIndex}
                total={sessionScenarios.length}
                timerSeconds={sessionTimerSeconds}
                responseMode={sessionResponseMode}
                initialResponse={previousResponse}
                liveTranscript={sessionResponseMode === 'voice' ? sessionLiveTranscript : undefined}
                setLiveTranscript={sessionResponseMode === 'voice' ? setSessionLiveTranscript : undefined}
                onExit={handleExitClick}
                onSubmit={(response) => {
                  handleScenarioSubmit(currentScenario.id, currentScenario.query, response, currentQuestionIndex)
                }}
              />
            ) : (
              <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl p-8 text-center mx-auto">
                <p className="text-slate-600 mb-4">{sessionScenarios.length === 0 ? 'No scenarios match your filters.' : 'Something went wrong loading the question.'}</p>
                <button
                  type="button"
                  onClick={() => setPhase('start')}
                  className="py-2.5 px-4 rounded-lg bg-[#003063] text-white text-sm font-medium"
                >
                  Back to start
                </button>
              </div>
            )}
          </motion.div>
        )}
        {phase === 'summary' && (
          <SessionSummary
            key="summary"
            responses={sessionResponses}
            sessionComplete={sessionComplete}
            sessionMode={sessionMode}
            timerSeconds={sessionTimerSeconds}
            onBackToStart={() => setPhase('start')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
