import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ScenarioCard({
  scenario,
  index,
  total,
  timerSeconds,
  onSubmit,
}) {
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds)
  const [response, setResponse] = useState('')
  const submitted = useRef(false)

  const progress = (secondsLeft / timerSeconds) * 100
  const isLowTime = secondsLeft <= 15

  const submit = useCallback(() => {
    if (submitted.current) return
    submitted.current = true
    onSubmit(response.trim() || '[No response]')
  }, [response, onSubmit])

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!submitted.current) {
        submitted.current = true
        onSubmit(response.trim() || '[No response — time expired]')
      }
      return
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [secondsLeft, response, onSubmit])

  useEffect(() => {
    setSecondsLeft(timerSeconds)
    setResponse('')
    submitted.current = false
  }, [scenario.id, timerSeconds])

  return (
    <motion.div
      key={scenario.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-2xl"
    >
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl overflow-hidden">
        {/* Timer bar — slim, glowing, shrinks over 60s */}
        <div className="h-1 bg-zinc-800/80 overflow-hidden">
          <motion.div
            className={`h-full ${isLowTime ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </div>

        <div className="p-6 md:p-8">
          {/* Metadata — monospace */}
          <div className="font-mono text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1 mb-4">
            <span>ID: {scenario.id}</span>
            <span>Topic: {scenario.topic}</span>
            <span>Level: {scenario.complexity}</span>
            <span>
              {index + 1} / {total}
            </span>
          </div>

          {/* Query — Inter, clear */}
          <p className="font-sans text-zinc-100 text-base md:text-lg leading-relaxed mb-6">
            {scenario.query}
          </p>

          {/* Borderless text area for bullet-point responses */}
          <textarea
            className="answer-input font-sans text-zinc-200 text-sm md:text-base min-h-[120px] py-2"
            placeholder="• Your bullet points here..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) e.preventDefault()
            }}
          />

          <div className="flex justify-end mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={submit}
              className="py-2.5 px-5 rounded-lg bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20"
            >
              Submit &amp; next
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
