import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import geminiPreambleRaw from '../data/gemini-preamble.md?raw'

const LAST_TRANSCRIPT_KEY = 'osmosis_last_transcript'
const MAX_SAVED_TRANSCRIPTS = 3

// Vite may give string or { default: string }; use a fallback if missing
const getPreamble = () => {
  const text = typeof geminiPreambleRaw === 'string' ? geminiPreambleRaw : (geminiPreambleRaw?.default ?? '')
  const trimmed = (text || '').trim()
  return trimmed || 'You are scoring an OSmosis practice session (Jobber field-service drill). Review the scenario Q&As below and produce a short scorecard. Reply only with the scorecard in markdown.'
}

/**
 * Builds a self-contained transcript: preamble (prompts Gemini with Jobber context + instructions), then Q&As.
 * User pastes once into Gemini and gets a scorecard back.
 */
function buildMarkdownTranscript(responses) {
  const now = new Date()
  const preamble = getPreamble()
  const meta = [
    'format: OSmosis Transcript',
    'version: 1',
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
    '# OSmosis Session Transcript',
    '',
    '## Instructions for the scorer (e.g. Gemini)',
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

export default function SessionSummary({ responses, sessionComplete, onBackToStart }) {
  const [copied, setCopied] = useState(false)

  const md = buildMarkdownTranscript(responses)

  useEffect(() => {
    if (responses.length > 0 && sessionComplete) {
      try {
        const transcript = buildMarkdownTranscript(responses)
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
  }, [responses, sessionComplete])

  const copyTranscript = useCallback(() => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
          {responses.length} scenarios answered · Copy and paste into Gemini for a scorecard
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

        <motion.button
          animate={sessionComplete ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, repeatDelay: 2, duration: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyTranscript}
          className="mt-6 w-full py-3 px-6 rounded-xl bg-[#003063] text-white font-medium shadow-lg shadow-[0_4px_20px_rgba(0,48,99,0.3)] hover:bg-[#002550] transition-colors"
        >
          {copied ? 'Copied to clipboard' : 'Copy transcript'}
        </motion.button>
        {onBackToStart && (
          <button
            type="button"
            onClick={onBackToStart}
            className="mt-3 w-full py-2.5 px-6 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Return to home
          </button>
        )}
        <p className="mt-3 text-slate-500 text-xs text-center">
          Transcript is also saved locally so you can recover it from the start screen if you leave by accident.
        </p>
      </div>
    </motion.div>
  )
}
