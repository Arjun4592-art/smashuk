'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  classifyCommand,
  cleanSpokenQuery,
  extractWake,
} from '@/lib/pos/voice-parse'

/**
 * POS voice assistant.
 *
 *  - Tap the mic: listens once, fills the search box with what was said.
 *  - Hands-free mode (ON by default, can be switched off with the toggle and
 *    that choice is remembered per browser): keeps the microphone open and
 *    waits for "Hello Smash" or a sentence starting "search for ..."; then it
 *    listens for the command — in the same breath ("search for rackets",
 *    "Hello Smash, rackets") or after a short beep.
 *
 * Commands: any product / brand / category words (search), "clear",
 * "open camera", "stop listening" (turns Hello Smash off).
 *
 * It only ever FILLS the search box. It never submits it, because submit is
 * the barcode/SKU "add straight to the cart" path and a misheard word must not
 * put the wrong product in the basket.
 *
 * Built on the browser's own speech recognition (Chrome / Edge / Android
 * Chrome; Safari is partial). In Chrome the audio is sent to Google for
 * recognition — unlike Siri it is not processed on the device. Browsers also
 * ask for microphone permission the first time; until it is granted (or if the
 * browser wants a click first) the assistant starts on the first tap / key.
 */
const VOICE_LANG = 'en-GB'
const WAKE_STORAGE_KEY = 'pos.voice.wake'

interface Options {
  /** Put this text in the search box. */
  onQuery: (query: string) => void
  onClear: () => void
  onOpenCamera?: () => void
  /** Called when a voice interaction ends (used to return focus to the box). */
  onDone?: () => void
}

function getSR(): any {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function chime() {
  try {
    const w = window as any
    const AC = w.AudioContext || w.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
    osc.onended = () => {
      try {
        ctx.close()
      } catch {}
    }
  } catch {}
}

export function usePosVoiceAssistant(opts: Options) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false) // capturing a command
  const [wakeOn, setWakeOnState] = useState(false) // Hello Smash enabled
  const [wakeListening, setWakeListening] = useState(false) // mic open, waiting

  const recRef = useRef<any>(null)
  const modeRef = useRef<'idle' | 'wake' | 'command'>('idle')
  const wakeOnRef = useRef(false)
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const quickEnds = useRef(0)
  // Browsers sometimes refuse to open the microphone before the person has
  // clicked / pressed something. If that happens we retry once on the first tap.
  const gestureRetried = useRef(false)
  const gestureCleanup = useRef<(() => void) | null>(null)
  // Functions call each other through this ref so they never go stale.
  const fns = useRef<Record<string, (...args: any[]) => any>>({})

  const clearRestart = () => {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current)
      restartTimer.current = null
    }
  }
  const stopRec = () => {
    const r = recRef.current
    recRef.current = null
    if (r) {
      r.onstart = r.onresult = r.onerror = r.onend = null
      try {
        r.abort()
      } catch {}
    }
  }

  fns.current.setWakeOn = (on: boolean, persist = true) => {
    wakeOnRef.current = on
    setWakeOnState(on)
    if (persist) {
      try {
        window.localStorage.setItem(WAKE_STORAGE_KEY, on ? '1' : '0')
      } catch {}
    }
    if (!on && gestureCleanup.current) {
      gestureCleanup.current()
    }
    if (on) {
      quickEnds.current = 0
      fns.current.startWake()
    } else if (modeRef.current === 'wake') {
      clearRestart()
      stopRec()
      modeRef.current = 'idle'
      setWakeListening(false)
    }
  }

  fns.current.armGestureRetry = () => {
    if (gestureCleanup.current) return
    const go = () => {
      if (gestureCleanup.current) gestureCleanup.current()
      gestureRetried.current = true
      if (wakeOnRef.current) fns.current.startWake()
    }
    window.addEventListener('pointerdown', go, true)
    window.addEventListener('keydown', go, true)
    gestureCleanup.current = () => {
      window.removeEventListener('pointerdown', go, true)
      window.removeEventListener('keydown', go, true)
      gestureCleanup.current = null
    }
  }

  fns.current.runCommand = (cleaned: string) => {
    const kind = classifyCommand(cleaned)
    if (kind === 'stop-wake') {
      fns.current.setWakeOn(false)
      toast('Hello Smash is off')
    } else if (kind === 'clear') {
      optsRef.current.onClear()
    } else if (kind === 'camera') {
      optsRef.current.onOpenCamera?.()
    } else {
      optsRef.current.onQuery(cleaned)
      toast(`Searching: "${cleaned}"`, { id: 'voice-heard', duration: 1800 })
    }
  }

  fns.current.startWake = () => {
    if (!wakeOnRef.current || modeRef.current === 'command') return
    if (typeof document !== 'undefined' && document.hidden) return
    const SR = getSR()
    if (!SR) return
    clearRestart()
    stopRec()
    const rec = new SR()
    rec.lang = VOICE_LANG
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    const startedAt = Date.now()
    let handled = false
    let pending: ReturnType<typeof setTimeout> | null = null
    let lastRemainder = ''
    const hit = (remainder: string) => {
      if (handled) return
      handled = true
      if (pending) {
        clearTimeout(pending)
        pending = null
      }
      fns.current.onWake(remainder)
    }
    rec.onstart = () => {
      modeRef.current = 'wake'
      setWakeListening(true)
    }
    rec.onresult = (e: any) => {
      if (handled) return
      const res = e.results[e.results.length - 1]
      if (!res) return
      const wake = extractWake(String(res[0]?.transcript ?? ''))
      if (!wake.matched) return
      lastRemainder = wake.remainder
      if (res.isFinal) hit(lastRemainder)
      // Still talking ("Hello Smash, rackets"): give the rest a moment to arrive.
      else if (!pending) pending = setTimeout(() => hit(lastRemainder), 1300)
    }
    rec.onerror = (e: any) => {
      const code = e?.error
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        handled = true
        if (!gestureRetried.current) {
          // Probably just "no click yet" — wait for the first tap / key and retry.
          stopRec()
          setWakeListening(false)
          modeRef.current = 'idle'
          fns.current.armGestureRetry()
        } else {
          fns.current.setWakeOn(false)
          toast.error('Microphone is blocked', {
            description:
              'Allow microphone access for this site in the browser settings, then turn Hello Smash on again.',
          })
        }
      } else if (code === 'network') {
        toast.error('Hello Smash needs an internet connection', {
          id: 'voice-net',
        })
      }
    }
    rec.onend = () => {
      if (pending) {
        clearTimeout(pending)
        pending = null
      }
      if (handled || recRef.current !== rec) return
      recRef.current = null
      setWakeListening(false)
      modeRef.current = 'idle'
      if (!wakeOnRef.current) return
      // The browser ends continuous listening every so often — just reopen it.
      // If it keeps ending straight away something is wrong: back off, then stop.
      quickEnds.current =
        Date.now() - startedAt < 1500 ? quickEnds.current + 1 : 0
      if (quickEnds.current > 8) {
        fns.current.setWakeOn(false, false)
        toast.error(
          'Hands-free voice stopped — tap the Hello Smash button to retry',
        )
        return
      }
      const delay = Math.min(5000, 250 * 2 ** quickEnds.current)
      restartTimer.current = setTimeout(() => fns.current.startWake(), delay)
    }
    recRef.current = rec
    try {
      rec.start()
    } catch {
      recRef.current = null
      setWakeListening(false)
      restartTimer.current = setTimeout(() => fns.current.startWake(), 1000)
    }
  }

  fns.current.onWake = (remainder: string) => {
    stopRec()
    setWakeListening(false)
    modeRef.current = 'idle'
    chime()
    const cleaned = cleanSpokenQuery(remainder)
    if (cleaned) {
      fns.current.runCommand(cleaned)
      optsRef.current.onDone?.()
      restartTimer.current = setTimeout(() => fns.current.startWake(), 400)
    } else {
      fns.current.startCommand()
    }
  }

  fns.current.startCommand = () => {
    const SR = getSR()
    if (!SR) return
    clearRestart()
    stopRec()
    modeRef.current = 'command'
    setWakeListening(false)
    // Short pause so the microphone is really free after closing the wake listener.
    setTimeout(() => {
      if (modeRef.current !== 'command' || recRef.current) return
      const rec = new SR()
      rec.lang = VOICE_LANG
      rec.continuous = false
      rec.interimResults = true
      rec.maxAlternatives = 1
      let heard = ''
      rec.onstart = () => setListening(true)
      rec.onresult = (e: any) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript
        }
        heard = text
        const cleaned = cleanSpokenQuery(text)
        // Live preview while still talking (commands like "clear" wait for the end).
        if (cleaned && classifyCommand(cleaned) === 'search') {
          optsRef.current.onQuery(cleaned)
        }
      }
      rec.onerror = (e: any) => {
        const code = e?.error
        if (code === 'no-speech') {
          toast("Didn't catch that — tap the mic and try again", {
            duration: 2000,
          })
        } else if (code === 'not-allowed' || code === 'service-not-allowed') {
          toast.error('Microphone is blocked', {
            description:
              'Allow microphone access for this site in the browser settings, then try again.',
          })
        } else if (code === 'network') {
          toast.error('Voice search needs an internet connection')
        } else if (code !== 'aborted') {
          toast.error('Voice search failed — try again')
        }
      }
      rec.onend = () => {
        if (recRef.current === rec) recRef.current = null
        setListening(false)
        modeRef.current = 'idle'
        const cleaned = cleanSpokenQuery(heard)
        if (cleaned) fns.current.runCommand(cleaned)
        // Hand focus back to the search box so a barcode scanner keeps working.
        optsRef.current.onDone?.()
        if (wakeOnRef.current) {
          restartTimer.current = setTimeout(() => fns.current.startWake(), 400)
        }
      }
      recRef.current = rec
      try {
        rec.start()
      } catch {
        recRef.current = null
        setListening(false)
        modeRef.current = 'idle'
      }
    }, 120)
  }

  useEffect(() => {
    const ok = Boolean(getSR())
    setSupported(ok)
    // ON by default; only stays off if the person switched it off themselves.
    let enabled = true
    try {
      enabled = window.localStorage.getItem(WAKE_STORAGE_KEY) !== '0'
    } catch {}
    if (ok && enabled) fns.current.setWakeOn(true, false)
    // A background tab must not keep the microphone open.
    const onVisibility = () => {
      if (document.hidden) {
        if (modeRef.current === 'wake') {
          clearRestart()
          stopRec()
          modeRef.current = 'idle'
          setWakeListening(false)
        }
      } else if (wakeOnRef.current) {
        fns.current.startWake()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (gestureCleanup.current) gestureCleanup.current()
      clearRestart()
      stopRec()
      modeRef.current = 'idle'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startListening = useCallback(() => fns.current.startCommand(), [])
  const stopListening = useCallback(() => {
    const r = recRef.current
    if (modeRef.current === 'command' && r) {
      try {
        r.stop()
      } catch {}
    }
  }, [])
  const setWakeOn = useCallback((on: boolean) => fns.current.setWakeOn(on), [])

  return {
    supported,
    listening,
    wakeOn,
    wakeListening,
    startListening,
    stopListening,
    setWakeOn,
  }
}
