import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import callGymPreambleRaw from '../data/CallGymGPT-preamble.md?raw'

const LAST_TRANSCRIPT_KEY = 'osmosis_last_transcript'
const MAX_SAVED_TRANSCRIPTS = 3

// Vite may give string or { default: string }; use a fallback if missing
const getPreamble = () => {
  const text = typeof callGymPreambleRaw === 'string' ? callGymPreambleRaw : (callGymPreambleRaw?.default ?? '')
  const trimmed = (text || '').trim()
  return trimmed || 'You are scoring a Call Gym practice session (Jobber field-service drill). Review the scenario Q&As below and produce a short scorecard. Reply only with the scorecard in markdown.'
}

/**
 * Builds a self-contained transcript: preamble (instructions for CallGymGPT scoring), then Q&As.
 * User pastes once into CallGymGPT (ChatGPT) and gets a scorecard back.
 */
function buildMarkdownTranscript(responses, sessionMode = 'practice') {
  const now = new Date()
  const preamble = getPreamble()
  const meta = [
    'format: Call Gym Transcript',
    'version: 1',
    `session_mode: ${sessionMode}`,
    `session_date: ${now.toISOString().slice(0, 19)}Z`,
    `scenario_count: ${responses.length}`,
  ].join('\n')

  const sections = responses.map((r, i) => [
    `## Scenario ${i + 1}: ${r.scenarioId}`,
    '',
    '### Query',
    '',
    r.query.trim(),
    '',
    '### Response',
    '',
    r.response.trim(),
    '',
    '---',
    '',
  ].join('\n'))

  return [
    '# Call Gym Session Transcript',
    '',
    '## Instructions for the scorer (e.g. CallGymGPT)',
    '',
    preamble,
    '',
    '---',
    '',
    '## Session metadata',
    '',
    '```',
    meta,
    '```',
    '',
    '## Scenario Q&As (score these)',
    '',
    sections.join(''),
  ].join('\n').trimEnd() + '\n'
}

export default function SessionSummary({ responses, sessionComplete, sessionMode = 'practice', timerSeconds = 60, onBackToStart }) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [showFullScripts, setShowFullScripts] = useState(false)

  const md = buildMarkdownTranscript(responses, sessionMode)

  useEffect(() => {
    if (responses.length > 0 && sessionComplete) {
      try {
        const transcript = buildMarkdownTranscript(responses, sessionMode)
        const entry = { transcript, date: new Date().toISOString() }
        const raw = localStorage.getItem(LAST_TRANSCRIPT_KEY)
        let list = []
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            list = Array.isArray(parsed) ? parsed : (parsed?.transcript ? [parsed] : [])
          } catch (_) {}
        }
        list = [entry, ...list].slice(0, MAX_SAVED_TRANSCRIPTS)
        localStorage.setItem(LAST_TRANSCRIPT_KEY, JSON.stringify(list))
      } catch (_) {}
    }
  }, [responses, sessionComplete, sessionMode])

  const CHATGPT_URL = 'https://chatgpt.com/g/g-69b45f13ba708191be76244157051114-call-gym'

  const copyAndOpenChatGPT = useCallback(() => {
    setCopyFailed(false)
    window.open(CHATGPT_URL, '_blank', 'noopener,noreferrer')
    function onCopySuccess() {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    function onCopyFailure() {
      setCopyFailed(true)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(md).then(onCopySuccess).catch(() => {
        try {
          const el = document.createElement('textarea')
          el.value = md
          el.setAttribute('readonly', '')
          el.style.position = 'fixed'
          el.style.opacity = '0'
          document.body.appendChild(el)
          el.select()
          const ok = document.execCommand('copy')
          document.body.removeChild(el)
          if (ok) onCopySuccess()
          else onCopyFailure()
        } catch (_) {
          onCopyFailure()
        }
      })
    } else {
      try {
        const el = document.createElement('textarea')
        el.value = md
        el.setAttribute('readonly', '')
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(el)
        if (ok) onCopySuccess()
        else onCopyFailure()
      } catch (_) {
        onCopyFailure()
      }
    }
  }, [md])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl"
    >
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8">
        <h2 className="font-sans text-xl font-semibold text-slate-800 mb-1">
          Session complete
        </h2>
        <p className="text-slate-600 text-sm mb-6">
          {responses.length} scenarios answered
          {timerSeconds > 0 ? ` · ${timerSeconds} seconds per question` : ' · No time limit'}
        </p>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {responses.map((r, i) => (
            <div
              key={`${r.scenarioId}-${i}`}
              className="font-mono text-xs text-slate-500 border-b border-slate-200 pb-3 last:border-0"
            >
              <span className="text-[#003063] font-medium">{r.scenarioId}</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-600 line-clamp-1">{r.query}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={copyAndOpenChatGPT}
            className="w-full py-3 px-4 rounded-xl bg-[#003063] text-white font-medium shadow-lg shadow-[0_4px_20px_rgba(0,48,99,0.3)] hover:bg-[#002550] transition-colors text-sm"
          >
            {copied ? 'Copied! Opening ChatGPT…' : 'Copy and open ChatGPT'}
          </button>
          <p className="text-slate-500 text-xs">
            If ChatGPT didn&apos;t open, paste at chatgpt.com
          </p>
          {copyFailed && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
              <p className="font-medium mb-1">Copy failed (e.g. clipboard not allowed)</p>
              <p className="mb-2">Select and copy the transcript below, then paste into ChatGPT.</p>
              <textarea
                readOnly
                value={md}
                className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-mono resize-y"
                aria-label="Transcript to copy manually"
              />
            </div>
          )}
          <div className="flex gap-3">
            {onBackToStart && (
              <button
                type="button"
                onClick={onBackToStart}
                className="flex-1 min-w-0 py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Home
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFullScripts((v) => !v)}
              className="flex-1 min-w-0 py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
            >
              {showFullScripts ? 'Hide scripts' : 'View full scripts'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFullScripts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 max-h-[60vh] overflow-y-auto space-y-4">
                {responses.map((r, i) => (
                  <div
                    key={`${r.scenarioId}-${i}`}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#003063] font-semibold text-sm">{r.scenarioId}</span>
                      <span className="text-slate-400 text-xs">Scenario {i + 1}</span>
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">Question</p>
                    <p className="text-slate-800 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{r.query}</p>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">Your response</p>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{r.response}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-3 text-slate-500 text-xs text-center">
          Transcript is also saved locally so you can recover it from the start screen if you leave by accident.
        </p>
      </div>
    </motion.div>
  )
}
