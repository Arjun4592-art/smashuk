/**
 * Pure helpers for the POS voice assistant (no React, no browser APIs), so the
 * wording rules can be tested on their own.
 */

// "Hello Smash" — plus the ways speech engines commonly mishear it.
const WAKE_RE =
  /\b(?:hello|hey|hi|okay|ok)[\s,]+(?:smash|smush|smesh|smashed|smatch|smarsh)\b[\s,.!?]*/i
// Saying "search for ..." / "search ..." at the start of a sentence works too,
// so no wake word is needed for the most common case.
const SEARCH_TRIGGER_RE = /^\s*(?:please\s+)?search(?:\s+for)?\b[\s,.!?]*/i
const STOP_WAKE_RE = /^(stop listening|go to sleep|turn off|switch off|sleep)$/i
const CLEAR_RE = /^(clear|clear search|clear it|reset|cancel|never mind)$/i
const CAMERA_RE = /^(open (the )?camera|camera|scan with camera|use camera)$/i

/**
 * Finds the wake phrase ("Hello Smash", or a sentence starting "search for")
 * in what was heard; `remainder` is whatever followed it.
 */
export function extractWake(text: string): {
  matched: boolean
  remainder: string
} {
  const m = WAKE_RE.exec(text)
  if (m) {
    return {
      matched: true,
      remainder: text.slice(m.index + m[0].length).trim(),
    }
  }
  const s = SEARCH_TRIGGER_RE.exec(text)
  if (s) {
    return { matched: true, remainder: text.slice(s[0].length).trim() }
  }
  return { matched: false, remainder: '' }
}

export type VoiceCommand = 'stop-wake' | 'clear' | 'camera' | 'search'

export function classifyCommand(cleaned: string): VoiceCommand {
  const t = cleaned.trim()
  if (STOP_WAKE_RE.test(t)) return 'stop-wake'
  if (CLEAR_RE.test(t)) return 'clear'
  if (CAMERA_RE.test(t)) return 'camera'
  return 'search'
}

/**
 * Turns what the browser heard into a search string:
 *  - drops lead-in words ("show me all", "search for", "do you have", ...)
 *  - drops trailing "please" / "thanks" and the full stop some engines add
 *  - joins spoken digits ("1 2 3 4" -> "1234") so SKUs / barcodes can be read out
 */
export function cleanSpokenQuery(raw: string): string {
  let t = raw
    .trim()
    .replace(/[.,!?]+$/g, '')
    .replace(/\s+/g, ' ')
  const lead =
    /^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:search\s+for|search|look\s+for|look\s+up|find\s+me|find|show\s+me|show|get\s+me|get|i\s+(?:need|want)|do\s+you\s+have|have\s+you\s+got|got\s+any|any|all\s+the|all|the)\s+/i
  for (let i = 0; i < 3; i++) {
    const next = t.replace(lead, '')
    if (next === t) break
    t = next
  }
  t = t.replace(/\s+(?:please|thanks|thank\s+you)$/i, '')
  const parts = t.split(' ')
  if (parts.length > 1 && parts.every((w) => /^\d$/.test(w))) {
    t = parts.join('')
  }
  return t.trim()
}
