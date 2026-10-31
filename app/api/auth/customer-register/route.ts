import { NextRequest, NextResponse } from 'next/server'
import { setSurfaceCookies } from '@/lib/api/auth-cookie'
import { sendMail, notifyOwner } from '@/lib/email'
import { welcomeEmail, adminWelcomeEmail } from '@/lib/email-templates'
import {
  getClientIp,
  rateLimitAll,
  tooManyRequests,
} from '@/lib/api/rate-limit'
import { isGenuineEmail } from '@/lib/api/email-verify'
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout'
import { verifyTurnstile } from '@/lib/api/turnstile'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
// Medusa's backend rejects direct calls to its public register endpoint when
// STOREFRONT_SHARED_SECRET is set (see backend/src/api/middleware.ts), so a
// bot can't skip this route's checks by POSTing straight to the API. Only
// this server knows the secret.
const STOREFRONT_SECRET = process.env.STOREFRONT_SHARED_SECRET
const STORE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY,
  ...(STOREFRONT_SECRET ? { 'x-storefront-secret': STOREFRONT_SECRET } : {}),
}

// ── Anti-spam knobs ───────────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const MAX_PER_IP_PER_HOUR = 3
const MAX_PER_IP_PER_DAY = 8
// A human needs a few seconds to fill four fields; scripts post instantly.
const MIN_FILL_MS = 3_000
// Names that contain links / markup are the signature of spam signups.
const SPAMMY_NAME = /https?:|www\.|\.[a-z]{2,}\/|[<>@]|\b(?:bit\.ly|t\.me)\b/i

const GENERIC_FAIL = 'Registration failed. Please try again.'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    const limit = rateLimitAll([
      { key: `register:h:${ip}`, max: MAX_PER_IP_PER_HOUR, windowMs: HOUR },
      { key: `register:d:${ip}`, max: MAX_PER_IP_PER_DAY, windowMs: DAY },
    ])
    if (limit.limited) return tooManyRequests(limit.retryAfterSec)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 400 })
    }
    const { name, email, password, hp_url, elapsedMs, turnstileToken } = body

    // 1. Honeypot: the field is hidden from people, so only bots fill it.
    if (typeof hp_url === 'string' && hp_url.trim() !== '') {
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 400 })
    }
    // 2. Too-fast submit. elapsedMs is measured in the browser (time since
    //    the form appeared), so clock differences don't matter.
    if (typeof elapsedMs !== 'number' || !(elapsedMs >= MIN_FILL_MS)) {
      return NextResponse.json(
        { error: 'Please refresh the page and try again.' },
        { status: 400 },
      )
    }
    // 3. CAPTCHA (only enforced once the Turnstile keys are configured).
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json(
        { error: 'Please complete the human verification and try again.' },
        { status: 400 },
      )
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: 'Name, email and password required.' },
        { status: 400 },
      )
    }
    const cleanName = name.trim().replace(/\s+/g, ' ')
    if (
      cleanName.length < 2 ||
      cleanName.length > 80 ||
      SPAMMY_NAME.test(cleanName)
    ) {
      return NextResponse.json(
        { error: 'Please enter your real name.' },
        { status: 400 },
      )
    }
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail.length > 254) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 },
      )
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters.' },
        { status: 400 },
      )
    }

    const emailCheck = await isGenuineEmail(cleanEmail)
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.reason }, { status: 400 })
    }

    const regRes = await fetchWithTimeout(
      `${MEDUSA_URL}/auth/customer/emailpass/register`,
      {
        method: 'POST',
        headers: STORE_HEADERS,
        body: JSON.stringify({ email: cleanEmail, password }),
        timeoutMs: 10_000,
      },
    )
    const regData = await regRes.json().catch(() => ({}))
    if (!regRes.ok) {
      const msg = regData?.message ?? regData?.error ?? 'Registration failed.'
      if (
        regRes.status === 409 ||
        String(msg).toLowerCase().includes('exist')
      ) {
        return NextResponse.json(
          { error: 'This email is already registered. Please login.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: msg }, { status: regRes.status })
    }
    const registrationToken = regData.token as string
    if (!registrationToken) {
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 500 })
    }

    const [firstName, ...rest] = cleanName.split(' ')
    const createCustomerRes = await fetchWithTimeout(
      `${MEDUSA_URL}/store/customers`,
      {
        method: 'POST',
        headers: {
          ...STORE_HEADERS,
          Authorization: `Bearer ${registrationToken}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          first_name: firstName,
          last_name: rest.join(' ') || '',
        }),
        timeoutMs: 10_000,
      },
    )
    const createCustomerData = await createCustomerRes.json().catch(() => ({}))
    if (!createCustomerRes.ok) {
      const msg =
        createCustomerData?.message ?? 'Could not create customer profile.'
      return NextResponse.json(
        { error: msg },
        { status: createCustomerRes.status },
      )
    }

    try {
      const newCustomer = createCustomerData.customer ?? {
        first_name: firstName,
        last_name: rest.join(' ') || '',
        email: cleanEmail,
      }
      const { subject, html, text, resendTemplate } = welcomeEmail(newCustomer)
      sendMail({ to: cleanEmail, subject, html, text, resendTemplate }).catch(
        () => {},
      )
      const adminEmail = adminWelcomeEmail(newCustomer)
      notifyOwner({
        subject: adminEmail.subject,
        html: adminEmail.html,
        text: adminEmail.text,
        resendTemplate: adminEmail.resendTemplate,
        customerEmail: cleanEmail,
      }).catch(() => {})
    } catch (welcomeErr) {
      console.error('[customer-register] welcome email failed:', welcomeErr)
    }

    const loginRes = await fetchWithTimeout(
      `${MEDUSA_URL}/auth/customer/emailpass`,
      {
        method: 'POST',
        headers: STORE_HEADERS,
        body: JSON.stringify({ email: cleanEmail, password }),
        timeoutMs: 10_000,
      },
    )
    const loginData = await loginRes.json().catch(() => ({}))
    if (!loginRes.ok || !loginData.token) {
      return NextResponse.json(
        {
          error:
            'Registration successful but login failed. Please login manually.',
        },
        { status: 201 },
      )
    }
    const token = loginData.token as string
    const customer = createCustomerData.customer
    const user = {
      id: customer?.id ?? cleanEmail,
      name:
        `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim() ||
        cleanName,
      email: cleanEmail,
      role: 'customer' as const,
      createdAt: customer?.created_at ?? new Date().toISOString(),
    }
    const response = NextResponse.json({ user }, { status: 201 })
    setSurfaceCookies(
      response.cookies,
      'website',
      { isAuthenticated: true, role: 'customer' },
      token,
      'lax',
    )
    return response
  } catch (err: any) {
    console.error('[customer-register]', err)
    return NextResponse.json({ error: GENERIC_FAIL }, { status: 500 })
  }
}
