// app/api/auth/[...nextauth]/route.ts
//
// NextAuth v5 — Google OAuth + Email/Password
// Customer login syncs with the Medusa store

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { medusaStore } from '@/lib/medusa'
import { deriveGoogleShadowPassword } from '@/lib/api/google-shadow'

// ARCHITECTURE NOTE: Medusa's `auth-google` provider only supports its own
// full authorization-code REDIRECT flow — confirmed live: passing the
// id_token NextAuth already obtained gets ignored, and Medusa responds with
// a `{ location: 'https://accounts.google.com/...' }` telling the client to
// redirect to Google *again*. That's incompatible with this app's
// architecture, where NextAuth is the single source of truth for the OAuth
// dance and Medusa is just where the resulting customer record should live.
//
// Workaround: once NextAuth has verified the person's Google identity
// (email, name, picture), create/log them into Medusa as a normal
// `emailpass` customer under the hood, using a password nobody ever sees —
// deterministically derived from their email + NEXTAUTH_SECRET, so every
// login recomputes the same value without storing a password anywhere.
// Medusa never needs its `auth-google` provider configured for this at all.
//
// Uses the globally available Web Crypto API (`crypto.subtle`) instead of
// importing Node's `crypto` module — works the same in both the Node and
// Edge runtimes with no extra import.
// (moved to lib/api/google-shadow.ts so /api/auth/me can reuse it to retry
// the sync on a later request if it failed during the original OAuth
// callback — see the comment there for why that retry matters)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ── Google OAuth ──────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email / Password ──────────────────────────────────────────
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const loginResponse = await medusaStore.auth.login(
            'customer',
            'emailpass',
            {
              email: credentials.email as string,
              password: credentials.password as string,
            },
          )
          if (!loginResponse || typeof loginResponse !== 'string') return null

          const { customer } = await medusaStore.store.customer.retrieve()

          return {
            id: customer.id,
            name:
              `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
              customer.email,
            email: customer.email ?? '',
            medusaToken: loginResponse,
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    async signIn() {
      // Google customer create/link happens in the jwt() callback below,
      // since it needs to run exactly once and persist the resulting token
      // onto the NextAuth JWT. Always allow the NextAuth sign-in itself to
      // proceed — a Medusa sync failure shouldn't lock the person out.
      return true
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.role = 'customer'
        token.medusaToken = (user as any).medusaToken ?? null
        token.provider = account?.provider ?? 'credentials'
      }

      // Google's profile payload includes `picture` — capture it here (only
      // present on the first jwt() call right after OAuth) so it survives
      // on the token for later session()/website-session calls even after
      // the Medusa sync below.
      if (account?.provider === 'google' && (profile as any)?.picture) {
        token.picture = (profile as any).picture as string
      }

      // Store/create the Medusa customer + token after Google login.
      // Only needs to run once, right after the OAuth redirect (account is
      // only present on that first jwt() call, not on subsequent refreshes).
      if (account?.provider === 'google' && account.id_token) {
        const email = (token.email as string | undefined)?.toLowerCase()
        if (!email) {
          console.error(
            '[nextauth] Google account has no email — cannot sync to Medusa',
          )
          return token
        }

        try {
          const shadowPassword = await deriveGoogleShadowPassword(email)

          // BUG FIX: unlike Google's provider (which resolves with a
          // non-string value when there's no existing identity), Medusa's
          // `emailpass` login() actually THROWS (401 "Invalid email or
          // password") when the identity doesn't exist yet — it doesn't
          // resolve at all. The previous version only checked `typeof
          // loginResponse === 'string'` after an await that had already
          // thrown by then, so the whole block jumped straight to the
          // outer catch and never reached the register() fallback below.
          // Give login() its own try/catch so a "doesn't exist yet" 401
          // falls through to registration instead of aborting the sync.
          let loginResponse: string | Record<string, unknown> | null = null
          try {
            loginResponse = await medusaStore.auth.login(
              'customer',
              'emailpass',
              {
                email,
                password: shadowPassword,
              },
            )
          } catch {
            // No shadow identity yet — expected on a first-time Google
            // sign-in, fall through to registration below.
            loginResponse = null
          }

          let resolvedToken: string | null = null

          if (typeof loginResponse === 'string') {
            resolvedToken = loginResponse
          } else {
            // No shadow emailpass identity for this email yet — first-time
            // Google sign-in. register() + customer.create() is the correct
            // two-step flow for `emailpass` (unlike `google`, which doesn't
            // support it at all — see the note above this block).
            const registerResponse = await medusaStore.auth.register(
              'customer',
              'emailpass',
              {
                email,
                password: shadowPassword,
              },
            )

            if (typeof registerResponse === 'string') {
              const { customer } = await medusaStore.store.customer.create(
                {
                  email,
                  first_name: (token.name as string)?.split(' ')[0] ?? '',
                  last_name:
                    (token.name as string)?.split(' ').slice(1).join(' ') ?? '',
                  metadata: token.picture
                    ? { avatar: token.picture as string }
                    : undefined,
                },
                {},
                { Authorization: `Bearer ${registerResponse}` },
              )
              token.id = customer.id

              const finalLogin = await medusaStore.auth.login(
                'customer',
                'emailpass',
                {
                  email,
                  password: shadowPassword,
                },
              )
              if (typeof finalLogin === 'string') resolvedToken = finalLogin
            }
          }

          if (resolvedToken) {
            token.medusaToken = resolvedToken

            // Keep the stored avatar in sync with the current Google
            // picture for returning customers too (their photo can change,
            // and older accounts may predate this being captured at all).
            if (token.picture) {
              try {
                await medusaStore.store.customer.update(
                  { metadata: { avatar: token.picture as string } },
                  {},
                  { Authorization: `Bearer ${resolvedToken}` },
                )
              } catch (err) {
                console.error('[nextauth] Avatar sync failed:', err)
              }
            }
          }
        } catch (err) {
          console.error('[nextauth] Google → Medusa sync failed:', err)
          // Allow NextAuth login even on error so the person isn't locked out —
          // website-session route will retry the /store/customers/me lookup.
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).medusaToken = token.medusaToken
        ;(session.user as any).provider = token.provider
        if (token.picture) session.user.image = token.picture as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
})

export const { GET, POST } = handlers
