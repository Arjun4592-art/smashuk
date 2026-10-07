export const WALKIN_EMAIL = 'sales@smashuk.co'

const LEGACY_WALKIN_RE = /^walkin@/i

export const isSyntheticEmail = (email?: string) =>
  !email ||
  email.trim().toLowerCase() === WALKIN_EMAIL ||
  LEGACY_WALKIN_RE.test(email) ||
  /^pos-/i.test(email)