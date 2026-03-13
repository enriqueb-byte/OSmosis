import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SpeechRecognitionAPI = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export default function ScenarioCard({
  scenario,
  index,
  total,
  timerSeconds,
  responseMode = 'type',
  initialResponse = '',
  liveTranscript,
  setLiveTranscript,
  onExit,
  onSubmit,
}) {
  const unlimited = timerSeconds <= 0
  const [secondsLeft, setSecondsLeft] = useState(unlimited ? 1 : timerSeconds)
  const [response, setResponse] = useState(initialResponse)
  const [isListening, setIsListening] = useState(false)
  const [activeMicLabel, setActiveMicLabel] = useState(null)
  const submitted = useRef(false)
  const recognitionRef = useRef(null)
  const restartTimeoutRef = useRef(null)
  const answerRef = useRef(null)
  const isVoice = responseMode === 'voice'
  const sessionVoice = isVoice && liveTranscript !== undefined && setLiveTranscript
  const displayValue = sessionVoice ? liveTranscript : response
  const setDisplayValue = sessionVoice ? setLiveTranscript : setResponse

  const isLowTime = !unlimited && secondsLeft <= 15
  const countdownDisplay = unlimited ? null : `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
  const useCircleProgress = total <= 12
  const segmentCount = 10
  const filledSegments = useCircleProgress ? 0 : Math.min(segmentCount, Math.ceil(((index + 1) / total) * segmentCount))

  const submit = useCallback(() => {
    if (submitted.current) return
    submitted.current = true
    const value = sessionVoice ? liveTranscript : response
    onSubmit((value || '').trim() || '[No response]')
  }, [sessionVoice, liveTranscript, response, onSubmit])

  useEffect(() => {
    if (unlimited) return
    if (secondsLeft <= 0) {
      if (!submitted.current) {
        submitted.current = true
        const value = sessionVoice ? liveTranscript : response
        onSubmit((value || '').trim() || '[No response — time expired]')
      }
      return
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [unlimited, secondsLeft, sessionVoice, liveTranscript, response, onSubmit])

  useEffect(() => {
    setSecondsLeft(unlimited ? 1 : timerSeconds)
    if (!sessionVoice) setResponse(initialResponse)
    submitted.current = false
    setIsListening(false)
  }, [scenario.id, timerSeconds, unlimited, initialResponse, sessionVoice])

  // Focus answer area when question changes (keyboard/screen reader)
  useEffect(() => {
    const t = setTimeout(() => answerRef.current?.focus({ preventScroll: true }), 100)
    return () => clearTimeout(t)
  }, [scenario.id])

  useEffect(() => {
    if (sessionVoice || !isVoice || !SpeechRecognitionAPI || !isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (_) {}
        recognitionRef.current = null
      }
      return
    }
    const Recognition = SpeechRecognitionAPI
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) final += transcript
        else interim += transcript
      }
      if (final) {
        setResponse((prev) => (prev ? `${prev} ${final}` : final).trim())
      }
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'aborted') setIsListening(false)
    }
    recognition.onend = () => {
      // Keep listening regardless of silence: restart every time the browser ends the session.
      if (recognitionRef.current !== recognition) return
      const delays = [100, 300, 800]
      let attempt = 0
      const tryStart = () => {
        if (recognitionRef.current !== recognition) return
        try {
          recognition.start()
        } catch (_) {
          attempt += 1
          if (attempt < delays.length) {
            restartTimeoutRef.current = setTimeout(tryStart, delays[attempt - 1])
          } else {
            setIsListening(false)
          }
        }
      }
      restartTimeoutRef.current = setTimeout(tryStart, delays[0])
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (_) {
      setIsListening(false)
    }
    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
      try { recognition.stop() } catch (_) {}
      recognitionRef.current = null
    }
  }, [isVoice, isListening])

  // Detect current microphone when in voice mode (and when user starts listening, so switching mics is reflected)
  const refreshActiveMic = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setActiveMicLabel(null)
      return
    }
    setActiveMicLabel(null)
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const track = stream.getAudioTracks()[0]
        if (!track) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const deviceId = track.getSettings().deviceId
        stream.getTracks().forEach((t) => t.stop())
        if (!deviceId) {
          setActiveMicLabel(track.label || 'Default microphone')
          return
        }
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            const audio = devices.find((d) => d.kind === 'audioinput' && d.deviceId === deviceId)
            setActiveMicLabel(audio?.label || track.label || 'Default microphone')
          })
          .catch(() => setActiveMicLabel(track.label || 'Default microphone'))
      })
      .catch(() => setActiveMicLabel('(microphone access denied)'))
  }, [])

  useEffect(() => {
    if (!isVoice || !SpeechRecognitionAPI) return
    refreshActiveMic()
  }, [isVoice, refreshActiveMic])

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    refreshActiveMic()
    setIsListening((prev) => !prev)
  }, [refreshActiveMic])

  return (
    <motion.div
      key={scenario.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-2xl"
    >
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Session progress — how far through the practice + exit */}
        <div className="px-6 pt-4 pb-1 md:px-8">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
              Question {index + 1} of {total}
              <span className="text-slate-400 tabular-nums">
                {Math.round(((index + 1) / total) * 100)}%
              </span>
            </span>
            <div className="flex items-center gap-3">
              {countdownDisplay != null && (
                <>
                  <span className={`tabular-nums font-semibold text-sm min-h-[44px] min-w-[44px] flex items-center justify-center ${isLowTime ? 'text-rose-600' : 'text-slate-600'}`} aria-label={`${secondsLeft} seconds left`}>
                    {countdownDisplay}
                  </span>
                  <span className="sr-only" aria-live="polite" aria-atomic="true">
                    {[30, 15, 10, 5, 4, 3, 2, 1].includes(secondsLeft) ? `${secondsLeft} seconds left` : ''}
                  </span>
                </>
              )}
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  aria-label="Exit session"
                  className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#003063] focus:ring-offset-1 text-xl leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          {useCircleProgress ? (
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total} aria-label={`Question ${index + 1} of ${total}`}>
              {Array.from({ length: index + 1 }, (_, i) => {
                const isCurrent = i === index
                return (
                  <span
                    key={i}
                    className={`inline-block rounded-full shrink-0 transition-colors ${
                      isCurrent ? 'bg-[#003063] ring-2 ring-[#003063] ring-offset-2 ring-offset-white' : 'bg-[#003063]'
                    }`}
                    style={{ width: 8, height: 8 }}
                    aria-hidden
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex gap-0.5 h-2" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total} aria-label={`Question ${index + 1} of ${total}`}>
              {Array.from({ length: segmentCount }, (_, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-sm min-w-0 ${i < filledSegments ? 'bg-[#003063]' : 'bg-slate-200'}`}
                  aria-hidden
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 md:p-8">
          {/* Query */}
          <p className="font-sans text-slate-800 text-base md:text-lg leading-relaxed mb-6">
            {scenario.query}
          </p>

          {/* Voice: session-level listening or per-question mic button */}
          {isVoice && (
            <div className="mb-3">
              {SpeechRecognitionAPI ? (
                <>
                  {sessionVoice ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                        </span>
                        <span className="text-rose-800 font-medium text-sm">Listening for entire session — speak your answer; you can also type or edit below.</span>
                      </div>
                      {activeMicLabel && (
                        <p className="text-slate-500 text-xs px-1" aria-live="polite">
                          Microphone: {activeMicLabel}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#003063] focus:ring-offset-2 ${
                            isListening
                              ? 'bg-rose-500 border-rose-600 text-white hover:bg-rose-600'
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                          }`}
                          title={isListening ? 'Stop listening' : 'Start voice input'}
                          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                          </svg>
                        </button>
                        <span className="text-slate-500 text-sm">Speak your answer; you can also type or edit below.</span>
                      </div>
                      {activeMicLabel && (
                        <p className="text-slate-500 text-xs mt-1 px-1" aria-live="polite">
                          Microphone: {activeMicLabel}
                        </p>
                      )}
                      <AnimatePresence>
                        {isListening && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200"
                          >
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                            </span>
                            <span className="text-rose-800 font-medium text-sm">Listening…</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </>
              ) : (
                <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Voice input is not supported in this browser. Use the text area below or try Chrome/Edge.
                </p>
              )}
            </div>
          )}

          {/* Borderless text area for bullet-point responses */}
          <textarea
            ref={answerRef}
            className="answer-input font-sans text-slate-700 text-sm md:text-base min-h-[120px] py-2"
            placeholder={isVoice ? "• Speak and/or type your bullet points…" : "• Your bullet points here..."}
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            aria-label="Your answer"
          />

          <div className="flex justify-end mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={submit}
              className="min-h-[44px] py-2.5 px-5 rounded-lg bg-[#003063] text-white text-sm md:text-base font-medium shadow-md shadow-[0_4px_14px_rgba(0,48,99,0.25)] hover:bg-[#002550] transition-colors"
            >
              Next question
            </motion.button>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
