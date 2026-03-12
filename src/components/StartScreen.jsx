import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PILLARS,
  PLAN_TIERS,
  DIFFICULTIES,
  PERSONAS,
  scenarioMatchesFilters,
} from '../data/scenarioFilters'
import scenariosData from '../data/scenarios.json'
import { TEST_QUESTION_COUNT, TEST_TIMER_SECONDS, TEST_FILTERS } from '../data/testConfig'

const SCENARIO_COUNT_MIN = 1
const MODE_PRACTICE = 'practice'
const MODE_ASSESSMENT = 'assessment'
const TIMER_SEC_MIN = 1
const TIMER_SEC_MAX = 600
const LAST_TRANSCRIPT_KEY = 'osmosis_last_transcript'
const SESSION_SETTINGS_KEY = 'osmosis_session_settings'

const RESPONSE_TYPE = 'type'
const RESPONSE_VOICE = 'voice'

const DEFAULT_SETTINGS = {
  mode: MODE_PRACTICE,
  responseMode: RESPONSE_TYPE,
  scenarioCount: 10,
  timerSeconds: 60,
  pillar: [],
  planTier: [],
  difficulty: [],
  persona: [],
}

function FilterChip({ label, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#003063] focus:ring-offset-2 focus:ring-offset-white ${
        selected
          ? 'bg-[#003063] text-white shadow-md shadow-[0_4px_14px_rgba(0,48,99,0.25)]'
          : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 border border-slate-200 shadow-sm'
      }`}
    >
      {label}
    </button>
  )
}

function CollapsibleFilterSection({ title, description, options, selected, onToggle, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const count = selected.length
  const summary = count ? `${count} selected` : null

  return (
    <div className="text-left border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#003063] focus:ring-inset rounded-lg"
      >
        <span className="text-slate-700 font-medium text-sm">{title}</span>
        {summary && <span className="text-slate-500 text-xs mr-2">{summary}</span>}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              {description && (
                <p className="text-slate-500 text-xs mb-2">{description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {options.map(({ value, label }) => (
                  <FilterChip
                    key={value}
                    label={label}
                    selected={selected.includes(value)}
                    onToggle={() => onToggle(value)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NumberInput({ value, onChange, min, max, className = '' }) {
  const handleChange = (e) => {
    const v = e.target.value === '' ? min : Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min))
    onChange(v)
  }
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={handleChange}
      onBlur={(e) => { if (e.target.value === '') onChange(min) }}
      className={`w-16 px-2 py-1.5 rounded-lg text-sm text-slate-800 bg-white border border-slate-300 focus:border-[#003063] focus:ring-1 focus:ring-[#003063] focus:outline-none shadow-sm ${className}`}
    />
  )
}

function TimeOptionRow({ seconds, onSecondsChange }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-slate-600 text-sm">Time per question</span>
      <div className="flex items-center gap-1.5">
        <NumberInput
          value={seconds}
          onChange={onSecondsChange}
          min={TIMER_SEC_MIN}
          max={TIMER_SEC_MAX}
        />
        <span className="text-slate-600 text-sm">sec</span>
      </div>
    </div>
  )
}

export default function StartScreen({ maxQuestions = 50, onStart }) {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [savedTranscripts, setSavedTranscripts] = useState([])
  const [savedTranscriptsOpen, setSavedTranscriptsOpen] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [pillar, setPillar] = useState(DEFAULT_SETTINGS.pillar)
  const [planTier, setPlanTier] = useState(DEFAULT_SETTINGS.planTier)
  const [difficulty, setDifficulty] = useState(DEFAULT_SETTINGS.difficulty)
  const [persona, setPersona] = useState(DEFAULT_SETTINGS.persona)
  const [scenarioCount, setScenarioCount] = useState(DEFAULT_SETTINGS.scenarioCount)
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_SETTINGS.timerSeconds)
  const [mode, setMode] = useState(DEFAULT_SETTINGS.mode)
  const [responseMode, setResponseMode] = useState(DEFAULT_SETTINGS.responseMode)

  useEffect(() => {
    if (scenarioCount > maxQuestions) {
      setScenarioCount((c) => Math.max(SCENARIO_COUNT_MIN, Math.min(maxQuestions, c)))
    }
  }, [maxQuestions, scenarioCount])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_SETTINGS_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s && typeof s === 'object') {
          if (Array.isArray(s.pillar)) setPillar(s.pillar)
          if (Array.isArray(s.planTier)) setPlanTier(s.planTier)
          if (Array.isArray(s.difficulty)) setDifficulty(s.difficulty)
          if (Array.isArray(s.persona)) setPersona(s.persona)
          if (typeof s.scenarioCount === 'number' && s.scenarioCount >= SCENARIO_COUNT_MIN) {
            setScenarioCount(Math.min(maxQuestions, s.scenarioCount))
          }
          if (typeof s.timerSeconds === 'number' && s.timerSeconds >= TIMER_SEC_MIN && s.timerSeconds <= TIMER_SEC_MAX) {
            setTimerSeconds(s.timerSeconds)
          }
          if (s.mode === MODE_PRACTICE || s.mode === MODE_ASSESSMENT) setMode(s.mode)
          else if (s.mode === 'test') setMode(MODE_ASSESSMENT)
          if (s.responseMode === RESPONSE_TYPE || s.responseMode === RESPONSE_VOICE) setResponseMode(s.responseMode)
        }
      }
    } catch (_) {}
  }, [maxQuestions])

  const handleResetToDefaults = useCallback(() => {
    setMode(DEFAULT_SETTINGS.mode)
    setResponseMode(DEFAULT_SETTINGS.responseMode)
    setPillar(DEFAULT_SETTINGS.pillar)
    setPlanTier(DEFAULT_SETTINGS.planTier)
    setDifficulty(DEFAULT_SETTINGS.difficulty)
    setPersona(DEFAULT_SETTINGS.persona)
    setScenarioCount(DEFAULT_SETTINGS.scenarioCount)
    setTimerSeconds(DEFAULT_SETTINGS.timerSeconds)
    try {
      localStorage.removeItem(SESSION_SETTINGS_KEY)
    } catch (_) {}
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_TRANSCRIPT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed)
        ? parsed.filter((e) => e?.transcript && typeof e.transcript === 'string')
        : parsed?.transcript
          ? [{ transcript: parsed.transcript, date: parsed.date }]
          : []
      setSavedTranscripts(list.slice(0, 3))
    } catch (_) {}
  }, [])

  const toggle = useCallback((setter, value) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }, [])

  const effectiveTimerSeconds = Math.max(TIMER_SEC_MIN, Math.min(TIMER_SEC_MAX, timerSeconds))

  const filteredScenarioCount = useMemo(() => {
    const hasFilters = pillar.length || planTier.length || difficulty.length || persona.length
    if (!hasFilters) return scenariosData.length
    return scenariosData.filter((s) =>
      scenarioMatchesFilters(s, { pillar, tier: planTier, difficulty, persona })
    ).length
  }, [pillar, planTier, difficulty, persona])

  const showFilterWarning = mode === MODE_PRACTICE && scenarioCount > filteredScenarioCount

  const handleStart = useCallback(() => {
    if (mode === MODE_ASSESSMENT) {
      onStart(TEST_FILTERS, {
        scenarioCount: TEST_QUESTION_COUNT,
        timerSeconds: TEST_TIMER_SECONDS,
        responseMode,
        sessionMode: 'assessment',
      })
      return
    }
    try {
      localStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify({
        mode,
        responseMode,
        scenarioCount,
        timerSeconds,
        pillar: [...pillar],
        planTier: [...planTier],
        difficulty: [...difficulty],
        persona: [...persona],
      }))
    } catch (_) {}
    const hasAny = pillar.length || planTier.length || difficulty.length || persona.length
    const count = Math.max(SCENARIO_COUNT_MIN, Math.min(maxQuestions, scenarioCount))
    onStart(
      hasAny
        ? {
            pillar: [...pillar],
            tier: [...planTier],
            difficulty: [...difficulty],
            persona: [...persona],
          }
        : null,
      { scenarioCount: count, timerSeconds: effectiveTimerSeconds, responseMode, sessionMode: 'practice' }
    )
  }, [mode, responseMode, onStart, pillar, planTier, difficulty, persona, scenarioCount, effectiveTimerSeconds, maxQuestions])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-xl"
    >
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8 text-left relative">
        {/* Gear: top right */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#003063] focus:ring-offset-2 focus:ring-offset-white"
            title="Settings"
            aria-label="Settings"
            aria-expanded={settingsOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <AnimatePresence>
            {settingsOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden="true"
                  onClick={() => setSettingsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-20 w-72 rounded-xl border border-slate-200 bg-white shadow-lg py-2"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Settings</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleResetToDefaults()
                      setSettingsOpen(false)
                    }}
                    className="w-full px-3 py-2.5 text-left text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                  >
                    Reset to defaults
                  </button>
                  {savedTranscripts.length > 0 && (
                    <div className="border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSavedTranscriptsOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span>Saved transcripts ({savedTranscripts.length})</span>
                        <motion.span
                          animate={{ rotate: savedTranscriptsOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-slate-400"
                        >
                          ▼
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {savedTranscriptsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                          >
                            <div className="px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
                              {savedTranscripts.map((item, i) => (
                                <div
                                  key={item.date ?? i}
                                  className="flex items-center justify-between gap-2 py-1.5"
                                >
                                  <span className="text-slate-500 text-xs truncate">
                                    {item.date ? new Date(item.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Saved'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.transcript)
                                      setCopiedIndex(i)
                                      setTimeout(() => setCopiedIndex(null), 2000)
                                    }}
                                    className="shrink-0 py-1.5 px-3 rounded-lg bg-[#003063] text-white text-xs font-medium hover:bg-[#002550] transition-colors"
                                  >
                                    {copiedIndex === i ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center -mb-2">
          <img
            src="/call-gym-logo.png"
            alt="The Call Gym"
            className="h-24 w-auto md:h-28 block"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="font-sans text-2xl md:text-3xl font-semibold text-slate-800 text-center">
            The Call Gym
          </h1>
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#003063] focus:ring-offset-1 focus:ring-offset-white text-sm font-medium"
            title="How it works"
            aria-label="How it works"
          >
            ?
          </button>
        </div>
        <p className="text-slate-600 text-sm md:text-base mb-5 text-center">
          Put in reps. Fail forward. Nail Kick-Offs
        </p>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-5 text-left">
          {/* Style + Response on one line, centered */}
          <div className="flex justify-center flex-wrap items-center gap-x-4 gap-y-2 py-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Style:</span>
              <FilterChip
                label="Practice"
                selected={mode === MODE_PRACTICE}
                onToggle={() => setMode(MODE_PRACTICE)}
              />
              <FilterChip
                label="Assessment"
                selected={mode === MODE_ASSESSMENT}
                onToggle={() => setMode(MODE_ASSESSMENT)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Response:</span>
              <FilterChip
                label="Type"
                selected={responseMode === RESPONSE_TYPE}
                onToggle={() => setResponseMode(RESPONSE_TYPE)}
              />
              <FilterChip
                label="Voice"
                selected={responseMode === RESPONSE_VOICE}
                onToggle={() => setResponseMode(RESPONSE_VOICE)}
              />
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-4">
            {mode === MODE_ASSESSMENT ? (
              <p className="text-slate-500 text-sm text-left">
                Fixed: {TEST_QUESTION_COUNT} questions, {TEST_TIMER_SECONDS} sec each, all topics
              </p>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-3">Session</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-sm">Questions</span>
                    <NumberInput
                      value={scenarioCount}
                      onChange={setScenarioCount}
                      min={SCENARIO_COUNT_MIN}
                      max={maxQuestions}
                    />
                  </div>
                  <TimeOptionRow
                    seconds={timerSeconds}
                    onSecondsChange={setTimerSeconds}
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2">
                  <CollapsibleFilterSection
                    title="Topics"
                    description="Which areas do you want to practice?"
                    options={PILLARS}
                    selected={pillar}
                    onToggle={(v) => toggle(setPillar, v)}
                  />
                  <CollapsibleFilterSection
                    title="Plan"
                    description="Which plan levels do you want to practice?"
                    options={PLAN_TIERS}
                    selected={planTier}
                    onToggle={(v) => toggle(setPlanTier, v)}
                  />
                  <CollapsibleFilterSection
                    title="Difficulty"
                    description="Which difficulty levels do you want to practice?"
                    options={DIFFICULTIES}
                    selected={difficulty}
                    onToggle={(v) => toggle(setDifficulty, v)}
                  />
                  <CollapsibleFilterSection
                    title="Customer type"
                    description="Which customer types do you want to see in your scenarios?"
                    options={PERSONAS}
                    selected={persona}
                    onToggle={(v) => toggle(setPersona, v)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {showFilterWarning && (
          <p className="mb-5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Only {filteredScenarioCount} scenario{filteredScenarioCount !== 1 ? 's' : ''} match your current filters. To get more questions, select more options in the filter sections above or lower the number of questions.
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full py-3 px-6 rounded-xl bg-[#003063] text-white font-medium shadow-lg shadow-[0_4px_20px_rgba(0,48,99,0.3)] hover:bg-[#002550] transition-colors"
        >
          {mode === MODE_ASSESSMENT ? 'Start assessment' : 'Start session'}
        </motion.button>
      </div>

      {/* How it works modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 flex items-center justify-center p-4 bg-slate-900/40"
            onClick={() => setShowHowItWorks(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="rounded-2xl bg-white border border-slate-200 shadow-xl p-6 max-w-sm w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-slate-800 font-medium mb-3">How it works</p>
              <div className="text-slate-600 text-sm leading-relaxed space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                <p>
                  <strong>Scenarios.</strong> Questions are generated from Gemini, trained on Jobber content.
                </p>
                <p>
                  <strong>Your session.</strong> You answer on the fly in timed scenarios. Each session produces a single output for Gemini to review, score, and provide further insights.
                </p>
                <p>
                  <strong>Why use it.</strong> Develop your knowledge base in a real-time, dynamic environment. Practice under time pressure, get scored and guided, and build confidence for support and sales conversations.
                </p>
                <p>
                  <strong>Feedback.</strong> It's a gift, please provide your hot take on this tool @Enrique on Slack.
                </p>
              </div>
              <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(false)}
                  className="py-2.5 px-4 rounded-lg bg-[#003063] text-white text-sm font-medium hover:bg-[#002550] transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
