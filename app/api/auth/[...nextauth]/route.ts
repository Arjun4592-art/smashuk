import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { medusaStore } from '@/lib/medusa';
import { deriveGoogleShadowPassword } from '@/lib/api/google-shadow';
export const {
  handlers,
  auth,
  signIn,
  signOut
} = NextAuth({
  providers: [Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!
  }), Credentials({
    name: 'credentials',
    credentials: {
      email: {
        label: 'Email',
        type: 'email'
      },
      password: {
        label: 'Password',
        type: 'password'
      }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      try {
        const loginResponse = await medusaStore.auth.login('customer', 'emailpass', {
          email: credentials.email as string,
          password: credentials.password as string
        });
        if (!loginResponse || typeof loginResponse !== 'string') return null;
        const {
          customer
        } = await medusaStore.store.customer.retrieve();
        return {
          id: customer.id,
          name: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || customer.email,
          email: customer.email ?? '',
          medusaToken: loginResponse
        };
      } catch {
        return null;
      }
    }
  })],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({
      token,
      user,
      account,
      profile
    }) {
      if (user) {
        token.id = user.id;
        token.role = 'customer';
        token.medusaToken = (user as any).medusaToken ?? null;
        token.provider = account?.provider ?? 'credentials';
      }
      if (account?.provider === 'google' && (profile as any)?.picture) {
        token.picture = (profile as any).picture as string;
      }
      if (account?.provider === 'google' && account.id_token) {
        const email = (token.email as string | undefined)?.toLowerCase();
        if (!email) {
          console.error('[nextauth] Google account has no email — cannot sync to Medusa');
          return token;
        }
        try {
          const shadowPassword = await deriveGoogleShadowPassword(email);
          let loginResponse: string | Record<string, unknown> | null = null;
          try {
            loginResponse = await medusaStore.auth.login('customer', 'emailpass', {
              email,
              password: shadowPassword
            });
          } catch {
            loginResponse = null;
          }
          let resolvedToken: string | null = null;
          if (typeof loginResponse === 'string') {
            resolvedToken = loginResponse;
          } else {
            const registerResponse = await medusaStore.auth.register('customer', 'emailpass', {
              email,
              password: shadowPassword
            });
            if (typeof registerResponse === 'string') {
              const {
                customer
              } = await medusaStore.store.customer.create({
                email,
                first_name: (token.name as string)?.split(' ')[0] ?? '',
                last_name: (token.name as string)?.split(' ').slice(1).join(' ') ?? '',
                metadata: token.picture ? {
                  avatar: token.picture as string
                } : undefined
              }, {}, {
                Authorization: `Bearer ${registerResponse}`
              });
              token.id = customer.id;
              const finalLogin = await medusaStore.auth.login('customer', 'emailpass', {
                email,
                password: shadowPassword
              });
              if (typeof finalLogin === 'string') resolvedToken = finalLogin;
            }
          }
          if (resolvedToken) {
            token.medusaToken = resolvedToken;
            if (token.picture) {
              try {
                await medusaStore.store.customer.update({
                  metadata: {
                    avatar: token.picture as string
                  }
                }, {}, {
                  Authorization: `Bearer ${resolvedToken}`
                });
              } catch (err) {
                console.error('[nextauth] Avatar sync failed:', err);
              }
            }
          }
        } catch (err) {
          console.error('[nextauth] Google → Medusa sync failed:', err);
        }
      }
      return token;
    },
    async session({
      session,
      token
    }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).medusaToken = token.medusaToken;
        (session.user as any).provider = token.provider;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET
});
export const {
  GET,
  POST
} = handlers;
