import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import geminiPreambleRaw from '../data/gemini-preamble.md?raw'

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

export default function SessionSummary({ responses, sessionComplete }) {
  const [copied, setCopied] = useState(false)

  const copyTranscript = useCallback(() => {
    const md = buildMarkdownTranscript(responses)
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [responses])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl"
    >
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl p-6 md:p-8">
        <h2 className="font-sans text-xl font-semibold text-zinc-100 mb-1">
          Session complete
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          {responses.length} scenarios answered · Copy and paste into Gemini for a scorecard
        </p>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {responses.map((r, i) => (
            <div
              key={`${r.scenarioId}-${i}`}
              className="font-mono text-xs text-zinc-500 border-b border-zinc-800/80 pb-3 last:border-0"
            >
              <span className="text-indigo-400">{r.scenarioId}</span>
              <span className="text-zinc-600 mx-2">·</span>
              <span className="text-zinc-400 line-clamp-1">{r.query}</span>
            </div>
          ))}
        </div>

        <motion.button
          animate={sessionComplete ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, repeatDelay: 2, duration: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyTranscript}
          className="mt-6 w-full py-3 px-6 rounded-xl bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
        >
          {copied ? 'Copied to clipboard' : 'Copy transcript'}
        </motion.button>
      </div>
    </motion.div>
  )
}
