'use client';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
type Surface = 'website' | 'dashboard' | 'pos';
interface Props {
  surface: Surface;
  children: React.ReactNode;
}
export default function AuthProvider({
  surface,
  children
}: Props) {
  const syncFromServer = useAuthStore(s => s.syncFromServer);
  const markAuthChecked = useAuthStore(s => s.markAuthChecked);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hydrateWishlist = useWishlistStore(s => s.hydrateFromServer);
  const verified = useRef(false);
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (verified.current) return;
    verified.current = true;
    async function verifySession() {
      try {
        const res = await fetch(`/api/auth/me?surface=${surface}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          markAuthChecked();
          return;
        }
        const {
          user
        } = await res.json();
        if (surface === 'pos' && !user && wasAuthenticated.current) {
          toast.error('Signed out — this account was logged in on another device.');
        }
        syncFromServer(user ?? null);
        wasAuthenticated.current = Boolean(user);
        if (surface === 'website' && user) {
          hydrateWishlist();
        }
      } catch {
        markAuthChecked();
      }
    }
    verifySession();
    if (surface === 'pos') {
      const interval = setInterval(verifySession, 20000);
      return () => clearInterval(interval);
    }
  }, [surface, syncFromServer, markAuthChecked, hydrateWishlist]);
  return <>{children}</>;
}
